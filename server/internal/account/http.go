package account

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/vesviet-team/vietnam-accounting-api/internal/httpx"
)

// ErrNotFound is returned by stores when the requested entity does not
// exist (or does not belong to the caller).
var ErrNotFound = errors.New("account: not found")

// decodeStrict decodes a small JSON body; malformed input answers 400.
func decodeStrict(w http.ResponseWriter, r *http.Request, v any, limit int64) error {
	err := json.NewDecoder(http.MaxBytesReader(w, r.Body, limit)).Decode(v)
	if err != nil {
		httpx.OAuthError(w, http.StatusBadRequest, "invalid_request", "malformed JSON body")
		return err
	}
	return nil
}
