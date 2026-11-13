# Báo cáo: Index & Đánh giá Codebase + Deep Research Văn bản pháp luật mới (13/11/2026)

> Tổng hợp từ 3 agent chạy song song: (1) index/đánh giá codebase, (2) nghiên cứu văn bản kế toán, (3) nghiên cứu văn bản thuế/hóa đơn.

---

## PHẦN 1 — INDEX CODEBASE

### Kiến trúc (React 18 + TS 5.7 + Vite 6 + Vitest 3 + Tailwind 3, PWA offline-first, không backend)

| Lớp | Nội dung chính |
|---|---|
| `src/types/` | `coa.ts` (regime union: TT133/TT200/TT99, 9 nhóm TK), `voucher.ts` (6 loại chứng từ, EInvoiceData, XML QĐ 1450), `curriculum.ts`, `assessment.ts`, `cogs.ts`, `storage.ts`, `workbench.ts` |
| `src/data/` | COA tĩnh: TT200 (154 TK, 1.491 dòng), TT133 (57 TK), TT99 (**suy dẫn runtime từ TT200** + 8 ghi chú đặc thù); `prohibited-accounts.ts` (13 TK cấm dưới TT133); curriculum 10 module/30 ngày; 10 milestone test; 7 voucher case; 463 dòng kịch bản COGS; Socratic hints |
| `src/engine/` | `cogs-engine.ts` (736 dòng, FIFO/BQ liên hoàn, cấm LIFO), `grading-engine.ts` (DOK, đậu ≥70%), `gating-engine.ts`, `streak-engine.ts` (múi giờ VN) |
| `src/services/` | `financial-statements/` (B01/B02/B03 engine, bất biến 270≡440, Mã70≡110); `tax/tax-guardrails.ts` (ngưỡng 20M + 5M Luật 48/2024, MST 00/03/04, CIT Schedule B4, FCT TT 103/2014); `storage/` (IndexedDB + LocalStorage fallback, backup JSON) |
| `src/components/` | `coa/`, `curriculum/`, `workbench/` (Journalizer, VoucherInspector, FinancialStatementsView, CogsWorkbench...), `assessment/`, `layout/` (WebMCP agent discovery) |

### Quy định đã mã hóa
TT 99/2025 (regime CIRCULAR_99, derive từ TT200) · TT 200/2014 · TT 133/2016 · Luật GTGT 48/2024 (ngưỡng 5tr) · TT 219/2013 + 96/2015 + 78/2014 (20M, B4) · NĐ 123/2020 + NĐ 70/2025 (HĐĐT) · QĐ 1450/QĐ-TCT (XML, MST status) · VAS 02/14/24 · TT 103/2014 (FCT).

### Đánh giá
- **Mạnh:** tách lớp sạch (types→data→engine pure→services→components); mọi quy tắc có `statutoryBasis` truy vết được; test theo tier kiểm invariant kế toán thật (~664 ca it trong 40 file); offline-first hoàn chỉnh.
- **Yếu/rủi ro:** dữ liệu 100% hardcoded trong bundle (~823 kB); **TT99 là derive-map, không phải dataset độc lập**; không có state management tập trung (prop drilling `currentRegime`); i18n viết cứng tiếng Việt trong key; số test trong `reports/` cũ tự tuyên bố 976 không khớp thực tế; `balance-sheet-engine` chỉ có `'TT200' | 'TT133'`, chưa có `'TT99'`.

---

## PHẦN 2 — VĂN BẢN PHÁP LUẬT MỚI NHẤT (đến 13/11/2026)

### A. Kế toán

| Văn bản | Hiệu lực | Điểm chính |
|---|---|---|
| **TT 99/2025/TT-BTC** (27/10/2025) | 01/01/2026 | Thay TT 200/2014 + 75/2015 + 53/2016 + 195/2012. **KHÔNG thay TT 133** — DNNVV được chọn tiếp dùng. 71 TK cấp 1 (bỏ 142/144/223, thêm 215, 2295, 2414, 332, 82112 thuế tối thiểu toàn cầu); B01-DN đổi tên "Báo cáo tình hình tài chính"; DN tự thiết kế biểu mẫu + bắt buộc Quy chế hạch toán nội bộ + audit trail; chuyển đổi "hồi tố đơn giản" qua TK 421 |
| **TT 152/2025/TT-BTC** | 01/01/2026 | Kế toán hộ/cá nhân kinh doanh |
| **TT 58/2026/TT-BTC** (25/5/2026) | 01/07/2026 | Chế độ kế toán **DN siêu nhỏ** (được bố trí người thân trong gia đình làm kế toán) |
| **QĐ 1293/QĐ-BTC** | 01/07/2026 | Bãi bỏ 9 TTHC kế toán, kiểm toán |
| **TT 101/2026/TT-BTC** (15/7/2026) | 01/01/2027 | Bồi dưỡng kế toán trưởng: 152/180 giờ, thay TT 12/2016 + 15/2017 |
| NĐ 174/2016 (sửa bởi 151/2018) | Vẫn hiệu lực | **Chưa có nghị định thay thế**; dự thảo sửa NĐ 174+41/2018+17/2012 (đăng 31/7/2026) chưa ban hành |
| Dự thảo TT thay TT 133 | Chưa ban hành | Hệ thống TK giảm còn ~22 TK |

### B. Thuế & Hóa đơn

| Văn bản | Hiệu lực | Điểm chính |
|---|---|---|
| **NĐ 254/2026/NĐ-CP** (30/6/2026) | **01/07/2026** | **Thay NĐ 123/2020 + NĐ 70/2025** (cả hai đã hết hiệu lực!). 3 nhóm HĐĐT: có mã CQT / không có mã / khởi tạo từ máy tính tiền; hộ KD doanh thu >1 tỷ bắt buộc HĐĐT; 8 trường hợp không bắt buộc lập hóa đơn; miễn chứng từ khấu trừ TNCN với chuyển nhượng CP, tài sản số, vàng miếng; khái niệm "giao tử" |
| **TT 32/2025/TT-BTC** | 01/06/2025 | Thay TT 78/2021 về hóa đơn, chứng từ |
| **Luật QL thuế 108/2025/QH15** | 01/07/2026 | Thay Luật 38/2019; phân nhóm NNT theo rủi ro |
| **NĐ 174/2025/NĐ-CP** | 01/07/2025–31/12/2026 | Giảm 2% GTGT (10%→8%), còn hiệu lực **suốt năm 2026** |
| **NĐ 181/2025 + NĐ 359/2025 + NĐ 144/2026** | 01/07/2025 / 01/01/2026 / 20/06/2026 | Hướng dẫn Luật GTGT 48/2024; khấu trừ vẫn yêu cầu chuyển khoản ≥5 triệu |
| **Luật Thuế TNCN 109/2025/QH15 + NĐ 253/2026** | 01/07/2026 | Giảm trừ gia cảnh mới **15,5tr/tháng (bản thân), 6,2tr/tháng (phụ thuộc)**; 21 khoản miễn thuế; thuế suất 2% trên giá chuyển nhượng BĐS |
| **Luật Thuế TNDN 67/2025/QH15 + NĐ 320/2025** | 01/10/2025 / kỳ 2025 | Ưu đãi chuyển sang chi phí tăng thêm (R&D); sửa chuyển lãi, chuyển giá |
| **NĐ 236/2025/NĐ-CP** | 15/10/2025 | Thuế tối thiểu toàn cầu 15% (QDMTT/IIR/UTPR) — liên quan TK 82112 TT99 |
| **NĐ 117/2025 + NĐ 68/2026** | 01/07/2025 / 2026 | Sàn TMĐT khấu trừ, khai nộp thay thuế hộ/cá nhân; cổng thuế điện tử TMĐT |

### ⚠️ Phát hiện quan trọng nhất
**App đang tham chiếu NĐ 70/2025 ở `src/types/voucher.ts`, `voucher-cases.ts`, `cogs-scenarios.ts` — NĐ 70/2025 đã HẾT hiệu lực từ 01/07/2026, được thay bởi NĐ 254/2026/NĐ-CP.** Đây là nợ pháp lý (compliance debt) cần cập nhật.

---

## PHẦN 3 — KHOẢNG TRỐNG & ĐIỂM CẮP NHẬP ĐỀ XUẤT (ưu tiên)

1. **[P0] Cập nhật tham chiếu HĐĐT**: NĐ 70/2025 → **NĐ 254/2026/NĐ-CP** trong `src/types/voucher.ts`, `src/data/voucher-cases.ts`, `src/data/cogs-scenarios.ts`, `tax-guardrails.ts`.
2. **[P0] BCTC theo TT99**: thêm `'TT99'` vào `BalanceSheetReport.circular`; rà mã chỉ tiêu mới (mã 150 Tài sản sinh học ngắn hạn, bỏ nhóm mã 12x...); đổi tên B01-DN đã có highlight nhưng engine chưa theo.
3. **[P1] Dataset COA TT99 độc lập**: thay derive-map bằng 71 TK cấp 1 thật của TT 99/2025 trong `src/data/coa-circular-99.ts`; bổ sung TK 215, 2295, 2414, 332, 82112; bỏ 142/144/223.
4. **[P1] Thuế TNCN mới**: giảm trừ 15,5/6,2 triệu theo Luật 109/2025 + NĐ 253/2026 — hiện bài học chỉ nhắc TK 3335, chưa có engine/câu hỏi.
5. **[P2] Chế độ mới `CIRCULAR_58`** (DN siêu nhỏ, TT 58/2026) — extension point sạch nhất là `AccountingRegime` union + `coa-service.ts`.
6. **[P2] Thêm khối nội dung**: thuế tối thiểu toàn cầu (TK 82112), TMĐT (NĐ 117/2025, NĐ 68/2026), gia hạn giảm 2% đến hết 2026 (NĐ 174/2025) vào curriculum/milestone (đã có sẵn `statutoryReference` cho từng câu).
7. **[P3] Theo dõi dự thảo**: Nghị định sửa NĐ 174/2016, TT thay TT 133 (~22 TK), Luật sửa đổi Luật Kế toán.

---

## Sources (chính)
- [TT 99/2025/TT-BTC — Công báo](https://congbao.chinhphu.vn/van-ban/thong-tu-so-99-2025-tt-btc-46529.htm) · [vbpl.vn](https://vbpl.vn/van-ban/chi-tiet/thong-tu-so-99-2025-tt-btc-huong-dan-che-do-ke-toan-doanh-nghiep--187356) · [Mẫu B01-DN (PDF)](https://cdn.thuvienphapluat.vn/uploads/mst/images/MinhThu/b01-dn.pdf)
- [NĐ 254/2026/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=218689) · [NĐ 70/2025 hết hiệu lực 01/7/2026](https://luatvietnam.vn/tin-van-ban-moi/nghi-dinh-123-2020-nd-cp-va-nghi-dinh-70-2025-nd-cp-ve-hoa-don-chinh-thuc-het-hieu-luc-tu-01-7-2026-186-110076-article.html)
- [NĐ 174/2025 giảm 2% GTGT](https://vanban.chinhphu.vn/?pageid=27160&docid=214310) · [NĐ 181/2025](https://vanban.chinhphu.vn/?pageid=27160&docid=214336) · [NĐ 144/2026](https://thuvienphapluat.vn/phap-luat-doanh-nghiep/bai-viet/nghi-dinh-144-2026-nd-cp-bo-sung-cac-doi-tuong-khong-chiu-thue-gtgt-20826.html)
- [Luật TNCN 109/2025/QH15 (PDF)](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/luat109-2025.pdf) · [NĐ 253/2026](https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Nghi-dinh-253-2026-ND-CP-huong-dan-Luat-Thue-thu-nhap-ca-nhan-699193.aspx)
- [NĐ 320/2025 (TNDN)](https://vanban.chinhphu.vn/?pageid=27160&docid=216219) · [NĐ 236/2025 (thuế tối thiểu toàn cầu)](https://thuvienphapluat.vn/van-ban/Doanh-nghiep/Nghi-dinh-236-2025-ND-CP-huong-dan-Nghi-quyet-107-2023-QH15-thue-thu-nhap-doanh-nghiep-bo-sung-631519.aspx)
- [NĐ 117/2025 (TMĐT)](https://vanban.chinhphu.vn/?pageid=27160&docid=213883) · [NĐ 68/2026 (hộ kinh doanh)](https://thuvienphapluat.vn/van-ban/Doanh-nghiep/Nghi-dinh-68-2026-ND-CP-chinh-sach-thue-va-quan-ly-thue-doi-voi-ho-kinh-doanh-ca-nhan-kinh-doanh-685358.aspx)
- [TT 58/2026 (DN siêu nhỏ)](https://thuvienphapluat.vn/van-ban/Doanh-nghiep/Thong-tu-58-2026-TT-BTC-huong-dan-Che-do-ke-toan-cho-doanh-nghiep-sieu-nho-707080.aspx) · [TT 101/2026 (kế toán trưởng)](https://congbao.chinhphu.vn/van-ban/thong-tu-so-101-2026-tt-btc-470123.htm)
- [Dự thảo sửa NĐ 174/2016 (baochinhphu 31/7/2026)](https://baochinhphu.vn/de-xuat-cat-giam-don-gian-hoa-tthc-dieu-kien-kinh-doanh-linh-vuc-ke-toan-kiem-toan-doc-lap-102260731172912073.htm) · [Dự thảo TT thay TT 133](https://www.meinvoice.vn/tin-tuc/52063/du-thao-thong-tu-thay-the-thong-tu-133)
