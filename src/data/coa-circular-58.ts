import { AccountItem } from '@/types/coa';

/**
 * CHẾ ĐỘ KẾ TOÁN DOANH NGHIỆP SIÊU NHỎ THEO THÔNG TƯ 58/2026/TT-BTC
 * - Ban hành ngày 25/05/2026 bởi Bộ Tài chính (Thứ trưởng Tạ Anh Tuấn ký), hiệu lực từ 01/07/2026,
 *   áp dụng cho năm tài chính 2026; thay thế Thông tư 132/2018/TT-BTC về chế độ kế toán doanh nghiệp siêu nhỏ.
 *
 * ĐẶC THÙ QUAN TRỌNG (nguồn MISA AMIS & EasyBooks, đối chiếu công bố nguyên tắc từ Công báo Chính phủ):
 * - TT 58/2026 BÃI BỎ HOÀN TOÀN hệ thống tài khoản Nợ/Có của TT 200/TT 133: kế toán DN siêu nhỏ
 *   ghi chép trực tiếp nghiệp vụ phát sinh vào các Sổ chi tiết theo mẫu (không hạch toán kép).
 * - Hệ thống 11 mẫu sổ đơn giản hóa, "may đo" theo 4 phương pháp nộp thuế:
 *   S1-DNSN (Sổ doanh thu bán hàng hóa, dịch vụ), S2a/S2b/S2c/S2d-DNSN, S3a/S3b-DNSN, S4a/S4b/S4c/S4d-DNSN.
 *   Nhóm nộp thuế theo % doanh thu (cả GTGT và TNDN) chỉ cần 1 sổ duy nhất: S1-DNSN.
 * - BCTC chỉ còn 2 mẫu: B01-DNSN (Tình hình tài chính) và B02-DNSN (Kết quả kinh doanh);
 *   nhóm nộp thuế theo % doanh thu không bắt buộc nộp BCTC.
 * - Chứng từ nội bộ đơn giản hóa, tự thiết kế được: Phiếu thu 01-TT, Phiếu chi 02-TT,
 *   Phiếu nhập kho 01-VT, Phiếu xuất kho 02-VT; bảng kê thu mua không có hóa đơn (tùy phương pháp nộp thuế).
 * - Nhân sự kế toán: không bắt buộc Kế toán trưởng, chỉ cần "người phụ trách kế toán";
 *   ĐƯỢC PHÉP bố trí người thân trong gia đình (cha/mẹ đẻ, vợ/chồng, con, anh chị em ruột) của người
 *   đại diện theo pháp luật/Giám đốc làm kế toán — khác TT 132 (cấm người thân lãnh đạo làm kế toán);
 *   hoặc thuê dịch vụ kế toán bên ngoài.
 *
 * VỀ DATASET NÀY (độ tin cậy - LƯU Ý):
 * - Vì TT 58/2026 không ban hành danh mục tài khoản, dataset này là dataset TỐI GIẢN mang tính
 *   ĐỐI CHIẾU/CHUYỂN ĐỔI: mỗi entry phản ánh một đối tượng theo dõi cốt lõi bắt buộc của chế độ TT 58
 *   (tiền, công nợ, hàng tồn kho, TSCĐ, nghĩa vụ thuế, vốn chủ sở hữu, doanh thu, chi phí),
 *   mã số kế thừa từ hệ thống tài khoản của TT 132/2018 được dùng trong bảng hướng dẫn chuyển đổi
 *   số dư cũ sang sổ mới (TK 1111/1112 tiền, 1311/1318 công nợ phải thu, 3311/3312/3318 công nợ phải trả,
 *   1313 GTGT, 1521/1524/1526 hàng tồn kho, 211 TSCĐ, 33134/33138 thuế TNDN/thuế khác, 4111/4118 VCSH —
 *   theo hướng dẫn chuyển đổi từ TT 132 trên MISA AMIS).
 * - Tên/mã mẫu sổ (S*-DNSN) lấy từ EasyBooks (nguồn trung gian, đăng 23/6/2026); độ tin cậy TRUNG BÌNH,
 *   cần đối chiếu văn bản gốc TT 58/2026 khi có bản đầy đủ trên Công báo/vbpl.vn.
 *
 * Nguồn tham khảo:
 * - Công báo Chính phủ số 323: https://congbao.chinhphu.vn/van-ban/thong-tu-so-58-2026-tt-btc-469663/65508.htm
 *   (siêu dữ liệu: ban hành 25/05/2026, hiệu lực 01/07/2026, ký bởi Thứ trưởng Tạ Anh Tuấn)
 * - Cẩm nang TT 58 (MISA AMIS): https://amis.misa.vn/274819/che-do-ke-toan-doanh-nghiep-sieu-nho-theo-thong-tu-58
 *   (bãi bỏ hệ thống tài khoản, bảng chuyển đổi từ TT 132, người thân làm kế toán, 2 mẫu BCTC)
 * - Mẫu sổ kế toán TT 58 (EasyBooks): https://easybooks.vn/mau-so-sach-ke-toan-theo-thong-tu-58-2026-tt-btc
 *   (danh mục 11 mẫu sổ S1–S4d DNSN theo 4 phương pháp nộp thuế)
 * - Toàn văn: https://luatvietnam.vn/doanh-nghiep/thong-tu-58-2026-tt-btc-huong-dan-che-do-ke-toan-cho-doanh-nghiep-sieu-nho-435647-d1.html
 */

export interface Circular58Highlight {
  id: string;
  titleVi: string;
  effectiveDate: string;
  replacedCircular: string;
  summaryVi: string;
  statutoryBasis: string;
}

export const CIRCULAR_58_KEY_HIGHLIGHTS: Circular58Highlight[] = [
  {
    id: 'tt58-no-account-system',
    titleVi: 'Bãi bỏ hoàn toàn hệ thống tài khoản Nợ/Có — ghi sổ trực tiếp',
    effectiveDate: '01/07/2026',
    replacedCircular: 'Thông tư 132/2018/TT-BTC',
    summaryVi:
      'Kế toán DN siêu nhỏ không hạch toán kép theo hệ thống tài khoản mà ghi chép trực tiếp nghiệp vụ phát sinh vào các Sổ chi tiết theo mẫu; số dư cũ từ TT 132 chuyển đổi sang sổ mới theo bảng đối chiếu.',
    statutoryBasis: 'Thông tư 58/2026/TT-BTC (ban hành 25/05/2026, hiệu lực 01/07/2026)',
  },
  {
    id: 'tt58-family-accountant',
    titleVi: 'Được bố trí người thân trong gia đình làm kế toán',
    effectiveDate: '01/07/2026',
    replacedCircular: 'Thông tư 132/2018/TT-BTC',
    summaryVi:
      'DN siêu nhỏ không bắt buộc có Kế toán trưởng, chỉ cần người "Phụ trách kế toán" có toàn quyền ký; được phép bố trí cha/mẹ đẻ, vợ/chồng, con, anh chị em ruột của người đại diện theo pháp luật/Giám đốc làm kế toán (TT 132 cấm), hoặc thuê dịch vụ kế toán bên ngoài.',
    statutoryBasis: 'Thông tư 58/2026/TT-BTC — Quy định về tổ chức công tác kế toán',
  },
  {
    id: 'tt58-simplified-ledgers',
    titleVi: '11 mẫu sổ đơn giản hóa "may đo" theo 4 phương pháp nộp thuế',
    effectiveDate: '01/07/2026',
    replacedCircular: 'Thông tư 132/2018/TT-BTC',
    summaryVi:
      'S1/S2a/S2b/S2c/S2d/S3a/S3b/S4a/S4b/S4c/S4d-DNSN. Nhóm nộp thuế theo % doanh thu (cả GTGT và TNDN) chỉ cần 1 quyển sổ duy nhất S1-DNSN; sổ tự chọn S4a (công nợ), S4b (TSCĐ), S4c (thuế khác), S4d (vốn chủ sở hữu). Được tự thiết kế, sửa đổi biểu mẫu.',
    statutoryBasis: 'Thông tư 58/2026/TT-BTC — Hệ thống mẫu sổ kế toán DN siêu nhỏ',
  },
  {
    id: 'tt58-two-bctc-forms',
    titleVi: 'BCTC chỉ còn 2 mẫu: B01-DNSN & B02-DNSN',
    effectiveDate: '01/07/2026',
    replacedCircular: 'Thông tư 132/2018/TT-BTC',
    summaryVi:
      'B01-DNSN (Báo cáo tình hình tài chính) và B02-DNSN (Báo cáo kết quả kinh doanh); nhóm nộp thuế theo % doanh thu không bắt buộc nộp BCTC. Chứng từ nội bộ tự chọn: Phiếu thu 01-TT, Phiếu chi 02-TT, Phiếu nhập/xuất kho 01-VT/02-VT.',
    statutoryBasis: 'Thông tư 58/2026/TT-BTC — Hệ thống mẫu báo cáo tài chính DN siêu nhỏ',
  },
];

/**
 * Dataset TỐI GIẢN theo Thông tư 58/2026/TT-BTC (DN siêu nhỏ).
 * Mã số giữ định danh TK của TT 132/2018 dùng trong bảng chuyển đổi sang sổ TT 58 — xem comment đầu file.
 */
export const COA_CIRCULAR_58: AccountItem[] = [
  // ==================== ĐỐI TƯỢNG THEO DÕI: TIỀN (Sổ chi tiết tiền S2d-DNSN) ====================
  {
    code: '111',
    nameVi: 'Tiền (theo dõi qua Sổ chi tiết tiền S2d-DNSN)',
    category: 'ASSET',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'DEBIT',
    description:
      'TT 58 bãi bỏ hệ thống tài khoản: tiền mặt, tiền gửi ngân hàng và tiền đang chuyển ghi chép trực tiếp vào Sổ chi tiết tiền (S2d-DNSN). Mã 111 kế thừa từ TK 111 của TT 132/2018 dùng trong bảng chuyển đổi số dư sang sổ mới.',
    level: 1,
  },
  {
    code: '1111',
    nameVi: 'Tiền Việt Nam (đối chiếu Sổ chi tiết tiền S2d-DNSN)',
    category: 'ASSET',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'DEBIT',
    description:
      'Tiền đồng Việt Nam tại quỹ và ngân hàng khi chuyển đổi số dư từ TT 132/2018 sang sổ chi tiết tiền của TT 58.',
    parentCode: '111',
    level: 2,
  },
  {
    code: '1112',
    nameVi: 'Ngoại tệ (đối chiếu Sổ chi tiết tiền S2d-DNSN)',
    category: 'ASSET',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'DEBIT',
    description:
      'Ngoại tệ quy đổi ra VNĐ khi chuyển đổi số dư từ TT 132/2018 sang sổ chi tiết tiền của TT 58.',
    parentCode: '111',
    level: 2,
  },

  // ==================== CÔNG NỢ PHẢI THU (Sổ chi tiết thanh toán công nợ S4a-DNSN) ====================
  {
    code: '131',
    nameVi: 'Phải thu khách hàng (Sổ chi tiết thanh toán công nợ S4a-DNSN)',
    category: 'ASSET',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'BOTH',
    description:
      'Các khoản phải thu và ứng trước của khách hàng theo dõi trên Sổ chi tiết thanh toán công nợ (S4a-DNSN, tự chọn). Mã kế thừa từ TK 1311/1318 của TT 132/2018 trong bảng chuyển đổi.',
    level: 1,
  },

  // ==================== NGHĨA VỤ THUẾ GTGT (Sổ theo dõi nghĩa vụ thuế GTGT S3b-DNSN) ====================
  {
    code: '133',
    nameVi: 'Thuế GTGT được khấu trừ (Sổ theo dõi nghĩa vụ thuế GTGT S3b-DNSN)',
    category: 'ASSET',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'DEBIT',
    description:
      'Chỉ áp dụng nhóm nộp thuế GTGT theo phương pháp khấu trừ: thuế GTGT đầu vào theo dõi trên Sổ theo dõi nghĩa vụ thuế GTGT (S3b-DNSN). Nhóm nộp thuế GTGT theo % doanh thu không sử dụng. Mã kế thừa từ TK 1313 của TT 132/2018.',
    level: 1,
  },

  // ==================== HÀNG TỒN KHO (Sổ chi tiết vật liệu, dụng cụ, sản phẩm, hàng hóa S2c-DNSN) ====================
  {
    code: '152',
    nameVi: 'Hàng tồn kho (Sổ chi tiết vật liệu, dụng cụ, sản phẩm, hàng hóa S2c-DNSN)',
    category: 'ASSET',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'DEBIT',
    description:
      'Vật liệu, dụng cụ, công cụ, sản phẩm dở dang, thành phẩm, hàng hóa ghi chép trực tiếp vào Sổ chi tiết vật liệu, dụng cụ, sản phẩm, hàng hóa (S2c-DNSN, bắt buộc với nhóm kê khai). Mã kế thừa từ TK 1521/1524/1526 của TT 132/2018.',
    level: 1,
  },

  // ==================== TÀI SẢN CỐ ĐỊNH (Sổ tài sản cố định S4b-DNSN) ====================
  {
    code: '211',
    nameVi: 'Tài sản cố định hữu hình (Sổ tài sản cố định S4b-DNSN)',
    category: 'ASSET',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'DEBIT',
    description:
      'TSCĐ hữu hình và khấu hao theo dõi trên Sổ tài sản cố định (S4b-DNSN, tự chọn). Mã kế thừa từ TK 211 của TT 132/2018 trong bảng chuyển đổi sang sổ TT 58.',
    level: 1,
  },

  // ==================== CÔNG NỢ PHẢI TRẢ (Sổ chi tiết thanh toán công nợ S4a-DNSN) ====================
  {
    code: '331',
    nameVi: 'Phải trả người bán (Sổ chi tiết thanh toán công nợ S4a-DNSN)',
    category: 'LIABILITY',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'CREDIT',
    description:
      'Các khoản phải trả người bán và ứng trước cho người bán theo dõi trên Sổ chi tiết thanh toán công nợ (S4a-DNSN). Mã kế thừa từ TK 3311/3312/3318 của TT 132/2018.',
    level: 1,
  },

  // ==================== NGHĨA VỤ THUẾ KHÁC (Sổ theo dõi nghĩa vụ thuế khác S4c-DNSN) ====================
  {
    code: '333',
    nameVi: 'Thuế và các khoản phải nộp Nhà nước (Sổ theo dõi nghĩa vụ thuế khác S4c-DNSN)',
    category: 'LIABILITY',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'CREDIT',
    description:
      'Thuế TNDN (chuyển từ TK 33134 TT 132), thuế khác và các khoản phải nộp Ngân sách theo dõi trên Sổ theo dõi nghĩa vụ thuế khác (S4c-DNSN). Mã kế thừa từ TK 33134/33138 của TT 132/2018.',
    level: 1,
  },

  // ==================== VỐN CHỦ SỞ HỮU (Sổ theo dõi vốn chủ sở hữu S4d-DNSN) ====================
  {
    code: '411',
    nameVi: 'Vốn đầu tư của chủ sở hữu (Sổ theo dõi vốn chủ sở hữu S4d-DNSN)',
    category: 'EQUITY',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'CREDIT',
    description:
      'Vốn góp, thặng dư vốn và các nguồn vốn chủ sở hữu khác theo dõi trên Sổ theo dõi vốn chủ sở hữu (S4d-DNSN, tự chọn). Mã kế thừa từ TK 4111/4118 của TT 132/2018.',
    level: 1,
  },

  // ==================== DOANH THU (S1/S2a/S3a-DNSN tùy phương pháp nộp thuế) ====================
  {
    code: '511',
    nameVi: 'Doanh thu bán hàng hóa, dịch vụ (Sổ doanh thu S1/S2a/S3a-DNSN)',
    category: 'REVENUE',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'CREDIT',
    description:
      'Doanh thu bán hàng hóa, dịch vụ ghi trực tiếp vào Sổ doanh thu theo nhóm nộp thuế: S1-DNSN (GTGT & TNDN theo % doanh thu), S2a-DNSN (GTGT theo % doanh thu), S3a-DNSN (GTGT khấu trừ). Giảm trừ doanh thu ghi giảm trực tiếp, không có TK 521 riêng.',
    level: 1,
  },

  // ==================== CHI PHÍ (Sổ chi tiết doanh thu, chi phí S2b-DNSN) ====================
  {
    code: '632',
    nameVi: 'Giá vốn hàng bán (Sổ chi tiết doanh thu, chi phí S2b-DNSN)',
    category: 'COST_OF_GOODS',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'ZERO',
    description:
      'Giá vốn hàng bán xác định cuối kỳ, ghi chi tiết chi phí vào Sổ chi tiết doanh thu, chi phí (S2b-DNSN). DN siêu nhỏ không tập hợp chi phí SX qua TK 621/622/627 mà hạch toán trực tiếp.',
    level: 1,
  },
  {
    code: '642',
    nameVi: 'Chi phí quản lý kinh doanh (Sổ chi tiết doanh thu, chi phí S2b-DNSN)',
    category: 'EXPENSE',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'DEBIT',
    description:
      'Chi phí quản lý kinh doanh và chi phí bán hàng phát sinh trong kỳ, ghi chi tiết vào Sổ chi tiết doanh thu, chi phí (S2b-DNSN) — bắt buộc với nhóm tính TNDN theo thu nhập chịu thuế.',
    level: 1,
  },

  // ==================== KẾT QUẢ KINH DOANH (B02-DNSN) ====================
  {
    code: '911',
    nameVi: 'Xác định kết quả kinh doanh (đối chiếu Báo cáo kết quả kinh doanh B02-DNSN)',
    category: 'BUSINESS_RESULT',
    regimes: ['CIRCULAR_58'],
    normalBalance: 'ZERO',
    description:
      'Kết quả kinh doanh thuần được xác định trực tiếp trên Báo cáo kết quả kinh doanh mẫu B02-DNSN (mẫu BCTC thứ hai của TT 58; nhóm nộp thuế theo % doanh thu không bắt buộc nộp BCTC).',
    level: 1,
  },
];
