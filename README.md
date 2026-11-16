# Vietnam Accounting Learning Web

Nền tảng học tập và thực hành kế toán doanh nghiệp Việt Nam theo lộ trình **30 ngày — 10 học phần — 100 khái niệm**, kết hợp bàn thực hành định khoản kép, tính giá vốn & giá thành (VAS 02), kiểm toán chứng từ thuế GTGT/TNDN và lập Báo cáo Tài chính (B01-DN, B02-DN, B03-DN).

---

## 1. Kiến Trúc Monorepo

| Thành phần | Thư mục | Công nghệ chính | Vai trò |
|---|---|---|---|
| **Frontend SPA** | `src/` | React 18, TypeScript 5.7 (`strict`), Vite 6, Tailwind CSS | Giao diện học tập, Offline-first (IndexedDB + `localStorage` fallback + Service Worker), Pure Domain Engines |
| **Test Suite (Frontend)** | `tests/` | Vitest 3, React Testing Library, `fake-indexeddb` | Kiểm thử 4 tầng: Unit, E2E, Stress, Adversarial |
| **Backend API** | `server/` | Go 1.23, PostgreSQL (`pgx`), Argon2id, OAuth 2.1 PKCE S256, RS256 JWKS | Xác thực OAuth 2.1 và đồng bộ dữ liệu đám mây đa thiết bị |
| **Báo cáo & Tài liệu** | `reports/`, `public/` | Markdown, JSON-LD, WebMCP (`llms.txt`, `auth.md`) | Hồ sơ kiểm toán và tài liệu chuẩn hóa |

---

## 2. Chế Độ Kế Toán & Nghiệp Vụ Hỗ Trợ

- **Thông tư 200/2014/TT-BTC** (156 tài khoản — bổ sung đầy đủ TK cấp 2 như `2147`, `2292`).
- **Thông tư 133/2016/TT-BTC** (57 tài khoản DNNVV + rào chắn chặn 13 tài khoản cấm `621, 622, 623, 627, 641, 521, 413, 157, 212, 213, 113, 243, 347` kèm gợi ý thay thế).
- **Thông tư 99/2025/TT-BTC** & **Thông tư 58/2026/TT-BTC** (đón đầu chuẩn mực mới và chế độ doanh nghiệp siêu nhỏ).
- **Chính sách thuế & VAS**: Cấm LIFO theo VAS 02, bóc tách chi phí vượt định mức sang TK 632 & Chỉ tiêu B4 (`03/TNDN`), kiểm tra ngưỡng thanh toán không dùng tiền mặt, rủi ro MST trạng thái `03`/`04`, thuế sàn TMĐT và khấu trừ R&D.

---

## 3. Cài Đặt & Chạy Cục Bộ (Local Development)

### Frontend (`d:\myproject\vietnam-accounting-learning-web`)

```bash
npm install
npm run dev
```

Mặc định ứng dụng chạy tại `http://localhost:5173`.

### Backend (`server/`)

Xem hướng dẫn chi tiết tại [`server/README.md`](server/README.md):

```bash
cd server
cp .env.example .env   # Cấu hình JWT_SIGNING_KEY và biến môi trường
docker compose up -d postgres
go run ./cmd/server
```

### Khởi chạy toàn bộ stack bằng Docker Compose

- Chỉ chạy Frontend Web (mặc định cho deploy):
  ```bash
  docker compose up -d --build
  ```
- Chạy Fullstack (`web` + `api` + `postgres`, yêu cầu đã tạo `server/.env`):
  ```bash
  docker compose --profile fullstack up -d --build
  ```

---

## 4. Kiểm Tra Chất Lượng, Build & Test

```bash
# Kiểm tra TypeScript (strict)
npx tsc --noEmit

# Chạy ESLint
npm run lint

# Đóng gói production
npm run build

# Chạy toàn bộ test Frontend (Vitest)
npm test

# Xuất báo cáo độ bao phủ test (Coverage)
npm run test:coverage

# Chạy toàn bộ test Backend (Go)
cd server && go test -count=1 ./...
```
