# vietnam-accounting-api (`server/`)

> **Vị trí trong monorepo:** Go backend này nằm trong `server/` của repo `vesviet-team/vietnam-accounting-learning-web` (đã consolidation từ repo riêng `vesviet-team/vietnam-accounting-api` — repo cũ chỉ còn ở dạng archive). Module path Go giữ nguyên `github.com/vesviet-team/vietnam-accounting-api` để zero-risk với import sẵn có; image build từ context `./server` vẫn push lên `ghcr.io/vesviet-team/vietnam-accounting-api` (giữ nguyên image name + GitOps write-back path trong `apps/vietnam-accounting/api.yaml`).

OAuth 2.1 authorization server + backup-to-cloud API cho ứng dụng học kế toán **hoa.tanhdev.com**.

Go service single-binary: HTTP :8080, Postgres (pgx), migrations nhúng trong binary (`embed.FS`) — không cần công cụ migrate bên ngoài khi deploy.

## Kiến trúc

```
cmd/server/          wiring + graceful shutdown
internal/config/     env parse + validate (fail-fast, không panic)
internal/db/         pgx pool + embedded migrator (schema_migrations)
internal/auth/       OAuth 2.1 AS core: authorize (login+consent form),
                     PKCE S256, token endpoint, refresh rotation + reuse
                     detection, RFC 7009 revoke, logout / logout-all, JWT RS256, JWKS
internal/user/       register + email/password (argon2id, constant-time), /me
internal/backup/     backup-to-cloud: opaque JSON blob, LWW theo revision
internal/middleware/ request-id, logging (không log secret), recover, CORS, rate-limit per-IP
migrations/          SQL migration (embed vào binary)
```

Mỗi package tách lớp: handler HTTP → service → interface `Store` (impl pgx; tests dùng in-memory mock, **không cần Postgres thật** để `go test ./...`).

## Contract endpoints

| Endpoint | Method | Auth | Mô tả |
|---|---|---|---|
| `/healthz` | GET | none | 200 `ok` |
| `/oauth2/auth` | GET | none | Authorization endpoint: validate request (PKCE S256 bắt buộc, `plain` bị từ chối), render HTML login + consent form |
| `/oauth2/auth` | POST | CSRF cookie | Đăng nhập (email/password) → issue authorization code (single-use, TTL 10 phút) → redirect `code` + `state` |
| `/oauth2/token` | POST | client_id | Grant `authorization_code` (PKCE S256) và `refresh_token` (rotation + reuse detection → revoke cả family). Access token RS256 TTL 15 phút, refresh TTL 30 ngày (lưu SHA-256 hash trong DB, không plaintext) |
| `/oauth2/jwks` | GET | none | Public key set (RSA, `kid` = SHA-256(modulus) 8 byte đầu) |
| `/oauth2/revoke` | POST | client_id | RFC 7009: nhận `token` (refresh hoặc access), luôn trả 200 |
| `/oauth2/logout` | POST | Bearer / refresh_token | Thu hồi session hiện tại (theo `sid` claim) |
| `/oauth2/logout-all` | POST | Bearer / refresh_token | Revoke mọi session của user (family revocation) |
| `/me` | GET | Bearer | Profile từ access token: `{id, email, display_name, scope}` |
| `/auth/register` | POST | none (rate-limited) | Đăng ký email/password |
| `/sync/backup` | PUT | Bearer | Body `{payload, revision, device_id}`. `payload` là JSON opaque (client có thể tự mã hóa). `revision` bigint monotonic: ≤ revision hiện có → **409** kèm revision hiện tại; lớn hơn → ghi, trả `{revision, updated_at}` |
| `/sync/backup` | GET | Bearer | Trả latest: `{payload, revision, device_id, updated_at}`; 404 nếu chưa có |

OAuth scopes: `read`, `write` (subset check). Issuer: `https://hoa.tanhdev.com`. Client first-party duy nhất cấu hình qua env (`OAUTH_CLIENT_ID` / `OAUTH_CLIENT_REDIRECT_URI`) — khớp discovery metadata `public/.well-known/oauth-authorization-server` của frontend.

Refresh rotation model: mỗi lần refresh tạo session row mới (link `rotated_from` về session cũ) rồi revoke session cũ. Token cũ bị dùng lại → hash lookup ra session đã revoked → **revoke toàn bộ family** (recursive CTE: ancestors + descendants).

## Env

| Biến | Bắt buộc | Default | Ghi chú |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Postgres; thiếu → exit với error rõ (không panic) |
| `JWT_SIGNING_KEY` | ✅ | — | PEM RSA private key (RS256); chấp nhận `\n`-escaped |
| `OAUTH_ISSUER` | | `https://hoa.tanhdev.com` | |
| `PORT` | | `8080` | |
| `OAUTH_CLIENT_ID` | ✅ | — | Client tĩnh P0 |
| `OAUTH_CLIENT_REDIRECT_URI` | ✅ | — | Phải khớp redirect đăng ký |

Xem `.env.example` (chỉ placeholder). `.env` không được commit (CI có secret scan).

## Schema (migrations/0001_init.sql)

- `users(id uuid v7 PK, email citext UNIQUE NULLABLE, display_name, password_hash, created_at, disabled_at)`
- `identities(id PK, user_id FK, type CHECK IN ('email_password'), created_at)`
- `oauth_sessions(id PK, user_id FK, device_id, refresh_hash, rotated_from FK→oauth_sessions, scope, revoked_at NULLABLE, created_at, last_used_at, expires_at)`
- `authorization_codes(code_hash PK, client_id, user_id FK, redirect_uri, scope, code_challenge, code_challenge_method CHECK ('S256'), expires_at, used_at NULLABLE)`
- `backup_blobs(user_id PK FK, payload jsonb, revision bigint, device_id, updated_at)`

## Chạy local

```bash
# 1. Cần Postgres (dùng compose cho tiện):
cp .env.example .env   # điền JWT_SIGNING_KEY thực (lệnh gen có trong .env.example)
docker compose up -d postgres

# 2. Chạy service (migrations tự chạy khi start):
go run ./cmd/server

# 3. Kiểm tra:
curl http://localhost:8080/healthz   # -> ok
```

E2E manual full-stack (api + postgres): `docker compose up --build`.

## Security notes

- Password: argon2id (m=64 MiB, t=3, p=CPU), salt 16 byte random; verify constant-time; dummy-hash khi email không tồn tại để chống timing oracle.
- Authorization code: single-use atomic (`UPDATE ... WHERE used_at IS NULL AND expires_at > now()`), TTL 10 phút, hash SHA-256, PKCE S256 bắt buộc.
- Refresh token: 32 byte random, chỉ lưu SHA-256 hash; rotation + reuse detection (family revocation).
- Cookie CSRF (login form): HttpOnly, Secure, SameSite=Strict, double-submit constant-time.
- CORS: chỉ `https://hoa.tanhdev.com`. Rate-limit in-memory per-IP cho `/oauth2/token` (30/phút) và `/me` (120/phút).
- Logging: chỉ metadata (method/path/status/duration/IP/request-id) — **không bao giờ** log token, password, code, cookie. Error responses không leak internals.
- JWT: RS256 only (alg confusion bị từ chối), `iss` + `exp` bắt buộc, TTL 15 phút.
- Image: distroless, non-root, static binary.

## CI/CD (golden path)

`.github/workflows/ci-cd.yml`: **lint** (gofmt check + `go vet` + secret scan) → **test** (`go test ./...`, không cần DB) → **build** (multi-stage distroless, push `ghcr.io/vesviet-team/vietnam-accounting-api:{short-sha}` + `:latest`) → **gitops write-back** (sed update tag trong `gitops/apps/vietnam-accounting/api.yaml` của repo `vesviet-team/gitops`, commit + push có retry — dùng secret `GITOPS_PUSH_TOKEN`).

## Test

```bash
go test ./... -count=1
```

58 unit test, toàn bộ chạy không cần Postgres (mock store / in-memory). Bao gồm: vector chính thức PKCE từ RFC 7636 Appendix B, refresh rotation + reuse (family revoked), auth code single-use + expiry, backup LWW (409/stored/latest), argon2id round-trip, migrator order/skip, middleware (recover/rate-limit/CORS), JWT round-trip + expiry + wrong issuer + JWKS.
