package auth

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"html/template"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/vesviet-team/vietnam-accounting-api/internal/httpx"
	"github.com/vesviet-team/vietnam-accounting-api/internal/user"
)

// csrfCookie is the double-submit CSRF cookie for the login/consent form.
// HttpOnly + Secure + SameSite=Strict.
const csrfCookie = "va_csrf"

// userAuthenticator is the part of the user service the login form needs.
type userAuthenticator interface {
	Authenticate(ctx context.Context, email, password string) (*user.User, error)
}

// AuthorizeHandler serves GET/POST /oauth2/auth.
type AuthorizeHandler struct {
	ClientID        string
	RedirectURI     string
	Issuer          string
	Users           userAuthenticator
	Store           Store
	InsecureCookies bool
	loginFormTmpl   *template.Template
}

// authorizeParams is the validated OAuth authorize request carried through
// the login form as hidden fields.
type authorizeParams struct {
	ClientID            string
	RedirectURI         string
	Scope               string
	State               string
	CodeChallenge       string
	CodeChallengeMethod string
}

type loginFormData struct {
	Params    authorizeParams
	CSRFToken string
	Error     string
	Issuer    string
	ScopeList []string
}

func NewAuthorizeHandler(clientID, redirectURI, issuer string, users userAuthenticator, store Store) *AuthorizeHandler {
	return &AuthorizeHandler{
		ClientID:      clientID,
		RedirectURI:   redirectURI,
		Issuer:        issuer,
		Users:         users,
		Store:         store,
		loginFormTmpl: template.Must(template.New("login").Parse(loginFormHTML)),
	}
}

// Authorize GET /oauth2/auth: validates the request and renders the
// login + consent form. First-party client only (client_id and redirect_uri
// must match the static configuration).
func (h *AuthorizeHandler) Authorize(w http.ResponseWriter, r *http.Request) {
	p, err := h.parseAuthorizeRequest(r, r.URL.Query())
	if err != nil {
		if isClientMismatch(err) {
			// redirect_uri is not trusted yet: must not redirect.
			httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "unknown client_id or redirect_uri")
			return
		}
		h.redirectError(w, r, p, err)
		return
	}

	token := ""
	if c, err := r.Cookie(csrfCookie); err == nil && len(c.Value) == 64 {
		token = c.Value
	} else {
		b := make([]byte, 32)
		if _, err := rand.Read(b); err != nil {
			httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
			return
		}
		token = hex.EncodeToString(b)
	}
	http.SetCookie(w, &http.Cookie{
		Name:     csrfCookie,
		Value:    token,
		Path:     "/oauth2/auth",
		HttpOnly: true,
		Secure:   !h.InsecureCookies,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   600,
	})

	data := loginFormData{
		Params:    p,
		CSRFToken: token,
		Issuer:    h.Issuer,
		ScopeList: strings.Fields(p.Scope),
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = h.loginFormTmpl.Execute(w, data)
}

// AuthorizeSubmit POST /oauth2/auth: verifies CSRF, authenticates the user,
// then issues a single-use 10-minute authorization code and redirects back
// to the client with code + state. The login screen doubles as the consent
// screen (requested scopes are displayed before granting).
func (h *AuthorizeHandler) AuthorizeSubmit(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "malformed form")
		return
	}
	p, err := h.parseAuthorizeRequest(r, r.PostForm)
	if err != nil {
		if isClientMismatch(err) {
			httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "unknown client_id or redirect_uri")
			return
		}
		h.renderFormError(w, r, p, err)
		return
	}

	// CSRF: double-submit cookie vs form field, constant-time compare.
	c, err := r.Cookie(csrfCookie)
	if err != nil || subtle.ConstantTimeCompare([]byte(c.Value), []byte(r.PostForm.Get("csrf_token"))) != 1 {
		h.renderFormError(w, r, p, errCSRF)
		return
	}

	u, err := h.Users.Authenticate(r.Context(), r.PostForm.Get("email"), r.PostForm.Get("password"))
	if err != nil {
		h.renderFormError(w, r, p, errLogin)
		return
	}

	code, err := randomToken(32)
	if err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	ac := AuthCode{
		CodeHash:            hashToken(code),
		ClientID:            p.ClientID,
		UserID:              u.ID,
		RedirectURI:         p.RedirectURI,
		Scope:               p.Scope,
		CodeChallenge:       p.CodeChallenge,
		CodeChallengeMethod: p.CodeChallengeMethod,
		ExpiresAt:           timeNow().Add(AuthCodeTTL),
	}
	if err := h.Store.CreateAuthCode(r.Context(), ac); err != nil {
		// Internal detail stays in server logs only (handler-agnostic
		// logging happens upstream); client gets a generic error.
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}

	redirect, err := url.Parse(p.RedirectURI)
	if err != nil {
		httpx.OAuthError(w, http.StatusInternalServerError, "server_error", "")
		return
	}
	q := redirect.Query()
	q.Set("code", code)
	if p.State != "" {
		q.Set("state", p.State)
	}
	redirect.RawQuery = q.Encode()
	w.Header().Set("Cache-Control", "no-store")
	http.Redirect(w, r, redirect.String(), http.StatusFound)
}

var (
	errClientMismatch = errors.New("unknown client_id or redirect_uri")
	errBadRequest     = errors.New("invalid authorization request")
	errCSRF           = errors.New("invalid or expired form session, please try again")
	errLogin          = errors.New("email hoặc mật khẩu không đúng")
)

func isClientMismatch(err error) bool { return errors.Is(err, errClientMismatch) }

// parseAuthorizeRequest validates an OAuth authorization request from q
// (query for GET, post form for POST).
func (h *AuthorizeHandler) parseAuthorizeRequest(r *http.Request, q url.Values) (authorizeParams, error) {
	p := authorizeParams{
		ClientID:            q.Get("client_id"),
		RedirectURI:         q.Get("redirect_uri"),
		Scope:               q.Get("scope"),
		State:               q.Get("state"),
		CodeChallenge:       q.Get("code_challenge"),
		CodeChallengeMethod: q.Get("code_challenge_method"),
	}
	if p.ClientID != h.ClientID || p.RedirectURI != h.RedirectURI {
		return p, errClientMismatch
	}
	if q.Get("response_type") != "code" {
		return p, errors.Join(errBadRequest, errUnsupportedResponseType)
	}
	if p.CodeChallenge == "" || p.CodeChallengeMethod != "S256" {
		// OAuth 2.1: PKCE with S256 is mandatory; plain is rejected.
		return p, errors.Join(errBadRequest, errPKCERequired)
	}
	if p.Scope == "" {
		p.Scope = "read"
	}
	for _, s := range strings.Fields(p.Scope) {
		if s != "read" && s != "write" {
			return p, errors.Join(errBadRequest, errInvalidScope)
		}
	}
	if len(p.State) > 256 || len(p.CodeChallenge) > 128 {
		return p, errBadRequest
	}
	return p, nil
}

// redirectError sends an error redirect to the (already validated) client
// redirect_uri, echoing state.
func (h *AuthorizeHandler) redirectError(w http.ResponseWriter, r *http.Request, p authorizeParams, err error) {
	if p.RedirectURI != h.RedirectURI || p.ClientID != h.ClientID {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "invalid authorization request")
		return
	}
	u, _ := url.Parse(p.RedirectURI)
	q := u.Query()
	q.Set("error", oauthErrorCode(err))
	if st := p.State; st != "" {
		q.Set("state", st)
	}
	u.RawQuery = q.Encode()
	http.Redirect(w, r, u.String(), http.StatusFound)
}

var (
	errUnsupportedResponseType = errors.New("response_type must be code")
	errPKCERequired            = errors.New("code_challenge with method S256 is required")
	errInvalidScope            = errors.New("scope must be a subset of read write")
)

func oauthErrorCode(err error) string {
	switch {
	case errors.Is(err, errUnsupportedResponseType):
		return "unsupported_response_type"
	case errors.Is(err, errPKCERequired):
		return "invalid_request"
	case errors.Is(err, errInvalidScope):
		return "invalid_scope"
	default:
		return "invalid_request"
	}
}

// renderFormError re-renders the login form with a user-visible error
// (no internals leaked). For POST failures the params come back from the
// submitted form.
func (h *AuthorizeHandler) renderFormError(w http.ResponseWriter, r *http.Request, p authorizeParams, formErr error) {
	csrf := ""
	if c, err := r.Cookie(csrfCookie); err == nil && len(c.Value) == 64 {
		csrf = c.Value
	} else {
		b := make([]byte, 32)
		_, _ = rand.Read(b)
		csrf = hex.EncodeToString(b)
		http.SetCookie(w, &http.Cookie{
			Name: csrfCookie, Value: csrf, Path: "/oauth2/auth",
			HttpOnly: true, Secure: !h.InsecureCookies, SameSite: http.SameSiteStrictMode, MaxAge: 600,
		})
	}
	data := loginFormData{
		Params:    p,
		CSRFToken: csrf,
		Error:     formErr.Error(),
		Issuer:    h.Issuer,
		ScopeList: strings.Fields(p.Scope),
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusUnauthorized)
	_ = h.loginFormTmpl.Execute(w, data)
}

// timeNow is overridable in tests.
var timeNow = time.Now

const loginFormHTML = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Đăng nhập — hoa.tanhdev.com</title>
<style>
  body{font-family:system-ui,sans-serif;background:#f6f7fb;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
  .card{background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);padding:32px;width:100%;max-width:360px}
  h1{font-size:1.25rem;margin:0 0 4px}
  .issuer{color:#666;font-size:.85rem;margin-bottom:20px}
  label{display:block;font-size:.85rem;margin:12px 0 4px}
  input[type=email],input[type=password]{width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:8px}
  button{width:100%;margin-top:20px;padding:12px;background:#2563eb;color:#fff;border:0;border-radius:8px;font-size:1rem;cursor:pointer}
  .consent{background:#f0f4ff;border-radius:8px;padding:12px;font-size:.85rem;margin-top:16px}
  .consent ul{margin:8px 0 0;padding-left:18px}
  .error{color:#b91c1c;background:#fef2f2;border-radius:8px;padding:10px;font-size:.85rem;margin-top:12px}
</style>
</head>
<body>
<div class="card">
  <h1>Đăng nhập &amp; cấp quyền</h1>
  <div class="issuer">Ứng dụng first-party — {{.Issuer}}</div>
  {{if .Error}}<div class="error">{{.Error}}</div>{{end}}
  <form method="post" action="/oauth2/auth">
    <input type="hidden" name="client_id" value="{{.Params.ClientID}}">
    <input type="hidden" name="redirect_uri" value="{{.Params.RedirectURI}}">
    <input type="hidden" name="response_type" value="code">
    <input type="hidden" name="scope" value="{{.Params.Scope}}">
    <input type="hidden" name="state" value="{{.Params.State}}">
    <input type="hidden" name="code_challenge" value="{{.Params.CodeChallenge}}">
    <input type="hidden" name="code_challenge_method" value="{{.Params.CodeChallengeMethod}}">
    <input type="hidden" name="csrf_token" value="{{.CSRFToken}}">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required autocomplete="username" autofocus>
    <label for="password">Mật khẩu</label>
    <input id="password" name="password" type="password" required autocomplete="current-password">
    <div class="consent">
      Ứng dụng xin cấp quyền:
      <ul>
        {{range .ScopeList}}<li><code>{{.}}</code></li>{{end}}
      </ul>
      Đăng nhập đồng nghĩa với việc chấp thuận các quyền trên cho thiết bị này.
    </div>
    <button type="submit">Đăng nhập &amp; cấp quyền</button>
  </form>
</div>
</body>
</html>`
