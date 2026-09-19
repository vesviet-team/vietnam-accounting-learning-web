import { DailyLesson } from '@/types/curriculum';

export const CURRICULUM_30_DAYS: DailyLesson[] = [
  // Module 1: Days 1-3
  {
    day: 1,
    moduleNumber: 1,
    moduleTitleVi: 'Bản chất Kế toán & Phương trình Kế toán Căn bản',
    dayTitleVi: 'Bản chất Kế toán & Đối tượng Sử dụng Thông tin',
    estimatedMinutes: 15,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c1-1',
        titleVi: 'Khái niệm và Chức năng Kế toán',
        summaryVi: 'Kế toán là nghệ thuật ghi chép, phân loại và tổng hợp các nghiệp vụ tài chính.',
        contentVi: 'Kế toán thu thập, xử lý, kiểm tra, phân tích và cung cấp thông tin kinh tế tài chính.',
        keyTakeawayVi: 'Kế toán cung cấp thông tin trung thực, khách quan cho nhà quản trị và cơ quan thuế.',
      },
      {
        id: 'c1-2',
        titleVi: 'Phân biệt Kế toán Tài chính và Kế toán Quản trị',
        summaryVi: 'Kế toán tài chính phục vụ bên ngoài, kế toán quản trị phục vụ nội bộ.',
        contentVi: 'Báo cáo tài chính tuân thủ chuẩn mực VAS/VFRS; báo cáo quản trị linh hoạt theo nhu cầu điều hành.',
        keyTakeawayVi: 'Kế toán tài chính mang tính pháp lý bắt buộc.',
      },
      {
        id: 'c1-3',
        titleVi: '7 Nguyên tắc Kế toán Căn bản',
        summaryVi: 'Cơ sở dồn tích, hoạt động liên tục, giá gốc, phù hợp, nhất quán, thận trọng, trọng yếu.',
        contentVi: 'Luật Kế toán 88/2015 quy định 7 nguyên tắc bất biến định hướng ghi nhận mọi giao dịch.',
        keyTakeawayVi: 'Doanh thu và chi phí phải ghi nhận theo cơ sở dồn tích tại thời điểm phát sinh.',
      },
    ],
  },
  {
    day: 2,
    moduleNumber: 1,
    moduleTitleVi: 'Bản chất Kế toán & Phương trình Kế toán Căn bản',
    dayTitleVi: 'Phương trình Kế toán & Bản chất Tài sản - Nguồn vốn',
    estimatedMinutes: 20,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c2-1',
        titleVi: 'Khái niệm Tài sản',
        summaryVi: 'Nguồn lực do doanh nghiệp kiểm soát và kỳ vọng mang lại lợi ích kinh tế tương lai.',
        contentVi: 'Tài sản phân loại thành Tài sản ngắn hạn (vốn lưu động) và Tài sản dài hạn (TSCĐ, ĐTTC).',
        keyTakeawayVi: 'Tài sản = Tài sản ngắn hạn + Tài sản dài hạn.',
      },
      {
        id: 'c2-2',
        titleVi: 'Khái niệm Nguồn vốn',
        summaryVi: 'Nguồn hình thành nên tài sản: Nợ phải trả và Vốn chủ sở hữu.',
        contentVi: 'Nợ phải trả là nghĩa vụ hiện tại; Vốn chủ sở hữu là giá trị tài sản thuần của doanh nghiệp.',
        keyTakeawayVi: 'Nguồn vốn = Nợ phải trả + Vốn chủ sở hữu.',
      },
      {
        id: 'c2-3',
        titleVi: 'Phương trình Kế toán Cốt lõi',
        summaryVi: 'Tài sản luôn luôn bằng Nguồn vốn tại mọi thời điểm.',
        contentVi: 'Tài sản = Nợ phải trả + Vốn chủ sở hữu. Mọi nghiệp vụ kinh tế đều duy trì phương trình cân bằng.',
        keyTakeawayVi: 'Không bao giờ có ngoại lệ: Tổng Tài sản ≡ Tổng Nguồn vốn.',
      },
      {
        id: 'c2-4',
        titleVi: '4 Trường hợp Biến động Tài sản - Nguồn vốn',
        summaryVi: 'Tăng TS-Giảm TS; Tăng NV-Giảm NV; Tăng TS-Tăng NV; Giảm TS-Giảm NV.',
        contentVi: 'Bất kỳ giao dịch kinh tế nào cũng thuộc một trong 4 loại biến động này.',
        keyTakeawayVi: 'Cân bằng kế toán luôn được bảo toàn sau mỗi biến động.',
      },
    ],
  },
  {
    day: 3,
    moduleNumber: 1,
    moduleTitleVi: 'Bản chất Kế toán & Phương trình Kế toán Căn bản',
    dayTitleVi: 'Giao dịch Kinh tế Thực tế & Cân bằng Phương trình',
    estimatedMinutes: 20,
    isMilestoneDay: true,
    concepts: [
      {
        id: 'c3-1',
        titleVi: 'Phân tích Giao dịch Góp vốn và Vay vốn',
        summaryVi: 'Góp vốn tăng Tiền và tăng Vốn CSH; Vay vốn tăng Tiền và tăng Nợ phải trả.',
        contentVi: 'Ví dụ: Góp vốn 500tr VND tiền mặt -> TS tăng 500tr, NV tăng 500tr.',
        keyTakeawayVi: 'Cả hai bên phương trình tăng cùng một lượng.',
      },
      {
        id: 'c3-2',
        titleVi: 'Phân tích Giao dịch Mua sắm và Trả nợ',
        summaryVi: 'Mua hàng bằng tiền mặt làm hoán đổi cấu trúc tài sản mà không đổi tổng tài sản.',
        contentVi: 'Trả nợ người bán bằng chuyển khoản làm giảm Tài sản và giảm Nợ phải trả.',
        keyTakeawayVi: 'Giảm tài sản đồng thời giảm nguồn vốn tương ứng.',
      },
      {
        id: 'c3-3',
        titleVi: 'Bẫy Sai lầm Khái niệm Thường gặp',
        summaryVi: 'Nhầm lẫn giữa bên Nợ trong định khoản và Nợ phải trả.',
        contentVi: 'Bên Nợ (Debit) là quy ước vị trí bên trái, không đồng nghĩa với khoản nợ nần.',
        keyTakeawayVi: 'Ghi Nợ tài khoản tài sản là ghi TĂNG tài sản.',
      },
    ],
  },

  // Module 2: Days 4-6
  {
    day: 4,
    moduleNumber: 2,
    moduleTitleVi: 'Hệ thống Tài khoản (TT 200 vs 133) & Nguyên lý Định khoản',
    dayTitleVi: 'Hệ thống Tài khoản Kế toán & Quy ước Đánh số',
    estimatedMinutes: 15,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c4-1',
        titleVi: 'Cấu trúc 9 Loại Tài khoản Kế toán Việt Nam',
        summaryVi: 'Loại 1-2 TS; Loại 3 Nợ; Loại 4 Vốn; Loại 5 DT; Loại 6 CP SXKD; Loại 7 TN khác; Loại 8 CP khác; Loại 9 KQKD.',
        contentVi: 'Hệ thống chuẩn mực được Bộ Tài chính ban hành phân loại thống nhất toàn quốc.',
        keyTakeawayVi: 'Số đầu tiên của mã tài khoản thể hiện loại tài khoản.',
      },
      {
        id: 'c4-2',
        titleVi: 'Quy ước Tài khoản Mẹ và Con',
        summaryVi: 'Mã 3 chữ số là tài khoản cấp 1 (mẹ); mã 4 chữ số là tài khoản cấp 2 (con).',
        contentVi: 'Ví dụ: TK 111 (Tiền mặt) -> 1111 (Tiền VNĐ), 1112 (Ngoại tệ).',
        keyTakeawayVi: 'Tài khoản cấp 2 chi tiết hóa cho tài khoản cấp 1.',
      },
      {
        id: 'c4-3',
        titleVi: 'Tài khoản Thường xuyên vs Tạm thời',
        summaryVi: 'Loại 1-4 có số dư cuối kỳ; Loại 5-9 không bao giờ có số dư cuối kỳ.',
        contentVi: 'Tài khoản Loại 5-9 được kết chuyển toàn bộ vào TK 911 cuối kỳ.',
        keyTakeawayVi: 'TK 5, 6, 7, 8, 9 có số dư cuối kỳ bằng 0 tuyệt đối.',
      },
    ],
  },
  {
    day: 5,
    moduleNumber: 2,
    moduleTitleVi: 'Hệ thống Tài khoản (TT 200 vs 133) & Nguyên lý Định khoản',
    dayTitleVi: 'Sơ đồ chữ T & Quy tắc Ghi Nợ - Ghi Có',
    estimatedMinutes: 20,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c5-1',
        titleVi: 'Cấu trúc Sơ đồ chữ T',
        summaryVi: 'Bên trái là NỢ (Debit), bên phải là CÓ (Credit).',
        contentVi: 'Mỗi tài khoản được mô phỏng như một chữ T lớn với số dư đầu kỳ, phát sinh tăng giảm và số dư cuối kỳ.',
        keyTakeawayVi: 'Nợ bên trái, Có bên phải là quy ước toàn cầu.',
      },
      {
        id: 'c5-2',
        titleVi: 'Quy tắc Nợ/Có cho Tài sản và Nguồn vốn',
        summaryVi: 'Tài sản: Tăng Nợ, Giảm Có, Dư Nợ. Nguồn vốn: Tăng Có, Giảm Nợ, Dư Có.',
        contentVi: 'Tính chất đối ngẫu hoàn hảo giữa tài sản và nguồn vốn trong kế toán kép.',
        keyTakeawayVi: 'Tài sản tăng bên Nợ; Nguồn vốn tăng bên Có.',
      },
      {
        id: 'c5-3',
        titleVi: 'Tài khoản Điều chỉnh Giảm và Lưỡng tính',
        summaryVi: 'TK 214 (Hao mòn) có tính chất ngược với tài sản thông thường (Dư Có).',
        contentVi: 'TK 131 và TK 331 là tài khoản lưỡng tính có thể vừa có dư Nợ vừa có dư Có.',
        keyTakeawayVi: 'TK 214 là contra-asset (ghi tăng bên Có, số dư bên Có).',
      },
    ],
  },
  {
    day: 6,
    moduleNumber: 2,
    moduleTitleVi: 'Hệ thống Tài khoản (TT 200 vs 133) & Nguyên lý Định khoản',
    dayTitleVi: 'Kỹ thuật Định khoản Bút toán Đơn & Phức tạp',
    estimatedMinutes: 20,
    isMilestoneDay: true,
    concepts: [
      {
        id: 'c6-1',
        titleVi: 'Quy trình 4 Bước Định khoản Chuẩn xác',
        summaryVi: '1. Xác định đối tượng -> 2. Xác định loại TK -> 3. Xác định Tăng/Giảm -> 4. Ghi Nợ/Có và kiểm tra cân bằng.',
        contentVi: 'Quy trình chuẩn giúp triệt tiêu hoàn toàn sai sót khi hạch toán sổ sách.',
        keyTakeawayVi: 'Luôn kiểm tra tổng Nợ = tổng Có trước khi kết thúc định khoản.',
      },
      {
        id: 'c6-2',
        titleVi: 'Bút toán Đơn và Bút toán Phức tạp',
        summaryVi: 'Bút toán đơn: 1 Nợ - 1 Có. Bút toán phức tạp: 1 Nợ nhiều Có hoặc nhiều Nợ 1 Có.',
        contentVi: 'Tuyệt đối tránh bút toán nhiều Nợ đối ứng nhiều Có gây mất liên kết chứng từ.',
        keyTakeawayVi: 'Không lập bút toán nhiều Nợ đối ứng nhiều Có.',
      },
      {
        id: 'c6-3',
        titleVi: 'Khác biệt Cơ bản giữa TT 200 và TT 133',
        summaryVi: 'TT 133 không dùng TK 621, 622, 623, 627, 641, 521, 413.',
        contentVi: 'Doanh nghiệp nhỏ và vừa theo TT 133 tập hợp chi phí sản xuất thẳng vào TK 154 và chi phí bán hàng vào TK 6421.',
        keyTakeawayVi: 'Cấm sử dụng TK 621/622/627/641 khi áp dụng TT 133.',
      },
    ],
  },

  // Module 3: Days 7-9
  {
    day: 7,
    moduleNumber: 3,
    moduleTitleVi: 'Kế toán Tiền mặt, Tiền gửi & Quy tắc Không dùng Tiền mặt',
    dayTitleVi: 'Kế toán Tiền mặt (TK 111) & Quy trình Quỹ',
    estimatedMinutes: 15,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c7-1',
        titleVi: 'Nguyên tắc Quản lý Quỹ Tiền mặt',
        summaryVi: 'TK 111 phản ánh tiền mặt tại quỹ (1111 VNĐ, 1112 Ngoại tệ).',
        contentVi: 'Chỉ thủ quỹ được quyền thu chi theo Phiếu thu/Phiếu chi đã duyệt.',
        keyTakeawayVi: 'Thủ quỹ chịu trách nhiệm vật chất đối với số tiền tồn quỹ.',
      },
      {
        id: 'c7-2',
        titleVi: 'Chứng từ Phiếu thu (01-TT) và Phiếu chi (02-TT)',
        summaryVi: 'Mẫu biểu bắt buộc theo Thông tư 200/133 có đủ 5 chữ ký.',
        contentVi: 'Giám đốc, Kế toán trưởng, Người lập, Người nhận/nộp, Thủ quỹ.',
        keyTakeawayVi: 'Phiếu thu/chi thiếu chữ ký là chứng từ không hợp lệ.',
      },
      {
        id: 'c7-3',
        titleVi: 'Định khoản Nghiệp vụ Quỹ Tiền mặt',
        summaryVi: 'Rút tiền gửi về nhập quỹ: Nợ 111 / Có 112. Tạm ứng tiền mặt: Nợ 141 / Có 111.',
        contentVi: 'Xử lý thừa thiếu quỹ khi kiểm kê qua TK 3381 (thừa) và TK 1381 (thiếu).',
        keyTakeawayVi: 'Tiền mặt phát sinh tăng ghi bên Nợ TK 111.',
      },
    ],
  },
  {
    day: 8,
    moduleNumber: 3,
    moduleTitleVi: 'Kế toán Tiền mặt, Tiền gửi & Quy tắc Không dùng Tiền mặt',
    dayTitleVi: 'Kế toán Tiền gửi Ngân hàng (TK 112) & Đối soát Sổ phụ',
    estimatedMinutes: 18,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c8-1',
        titleVi: 'Đặc điểm Tài khoản Tiền gửi Ngân hàng',
        summaryVi: 'TK 112 (1121 VNĐ, 1122 Ngoại tệ) căn cứ trên Giấy báo Nợ, Giấy báo Có của ngân hàng.',
        contentVi: 'Ngân hàng báo Có là tiền gửi của doanh nghiệp tăng (Nợ TK 112).',
        keyTakeawayVi: 'Giấy báo Có của ngân hàng tương đương Nợ TK 112 trên sổ kế toán.',
      },
      {
        id: 'c8-2',
        titleVi: 'Ủy nhiệm chi (UNC) và Luân chuyển Chứng từ',
        summaryVi: 'Lệnh thanh toán chuyển khoản do Chủ tài khoản và Kế toán trưởng ký.',
        contentVi: 'Căn cứ để ngân hàng trích tiền tài khoản doanh nghiệp thanh toán cho nhà cung cấp.',
        keyTakeawayVi: 'UNC là bằng chứng thanh toán không dùng tiền mặt hợp lệ.',
      },
      {
        id: 'c8-3',
        titleVi: 'Quy trình Đối soát Sổ phụ Ngân hàng Hàng tháng',
        summaryVi: 'So sánh số dư trên Sổ cái TK 112 với số dư cuối kỳ trên Sổ phụ ngân hàng.',
        contentVi: 'Xử lý các khoản tiền đang chuyển hoặc chênh lệch phí dịch vụ ngân hàng (Nợ 642 / Có 112).',
        keyTakeawayVi: 'Số dư TK 112 phải khớp tuyệt đối với sổ phụ ngân hàng.',
      },
    ],
  },
  {
    day: 9,
    moduleNumber: 3,
    moduleTitleVi: 'Kế toán Tiền mặt, Tiền gửi & Quy tắc Không dùng Tiền mặt',
    dayTitleVi: 'Quy tắc Bắt buộc Thanh toán Không dùng Tiền mặt >= 20M VND',
    estimatedMinutes: 20,
    isMilestoneDay: true,
    concepts: [
      {
        id: 'c9-1',
        titleVi: 'Căn cứ Pháp lý & Ngưỡng 20 Triệu VND',
        summaryVi: 'Thông tư 219/2013/TT-BTC Điều 15 và Thông tư 96/2015/TT-BTC Điều 4.',
        contentVi: 'Hóa đơn mua vào từ 20.000.000 VNĐ trở lên (đã gồm VAT) bắt buộc phải chuyển khoản qua ngân hàng.',
        keyTakeawayVi: 'Hóa đơn >= 20 triệu trả tiền mặt bị loại thuế GTGT và chi phí hợp lý TNDN.',
      },
      {
        id: 'c9-2',
        titleVi: 'Rủi ro Nộp Tiền mặt vào Tài khoản Bên bán',
        summaryVi: 'Nộp tiền mặt tại quầy ngân hàng vào TK người bán KHÔNG được coi là thanh toán không dùng tiền mặt.',
        contentVi: 'Tiền phải chuyển trực tiếp từ tài khoản ngân hàng của bên mua sang tài khoản bên bán.',
        keyTakeawayVi: 'Nộp tiền mặt tại quầy ngân hàng = Vi phạm quy định.',
      },
      {
        id: 'c9-3',
        titleVi: 'Quy tắc Gộp Nhiều Hóa đơn trong Cùng Một Ngày',
        summaryVi: 'Nhiều hóa đơn cùng một người bán trong ngày có tổng >= 20 triệu bắt buộc phải chuyển khoản.',
        contentVi: 'Nếu trả tiền mặt cho bất kỳ hóa đơn nào trong số đó, hóa đơn đó sẽ bị loại thuế và chi phí.',
        keyTakeawayVi: 'Không được chia nhỏ hóa đơn trong cùng một ngày để lách ngưỡng 20 triệu.',
      },
    ],
  },

  // Modules 4-10 summarized for syllabus integrity
  {
    day: 10,
    moduleNumber: 4,
    moduleTitleVi: 'Mua hàng, Công nợ Phải trả (TK 331) & Hóa đơn Điện tử NĐ 123',
    dayTitleVi: 'Quy trình Mua hàng & Tài khoản Phải trả Người bán (TK 331)',
    estimatedMinutes: 18,
    isMilestoneDay: false,
    concepts: [
      { id: 'c10-1', titleVi: 'Chu trình Mua hàng', summaryVi: 'PO -> GRN -> Invoice -> Payment.', contentVi: 'Theo dõi chi tiết theo từng nhà cung cấp.', keyTakeawayVi: 'TK 331 có tính chất lưỡng tính.' },
      { id: 'c10-2', titleVi: 'Định khoản Mua hàng Chưa thanh toán', summaryVi: 'Nợ 152/156, Nợ 1331 / Có 331.', contentVi: 'Phản ánh giá mua chưa thuế, thuế GTGT đầu vào và công nợ phải trả.', keyTakeawayVi: 'Thuế GTGT đầu vào ghi Nợ TK 1331.' },
      { id: 'c10-3', titleVi: 'Chiết khấu Thanh toán Được hưởng', summaryVi: 'Thanh toán sớm được hưởng chiết khấu ghi Có TK 515.', contentVi: 'Là doanh thu hoạt động tài chính của bên mua.', keyTakeawayVi: 'Chiết khấu thanh toán mua hàng ghi Có TK 515.' },
    ],
  },
  {
    day: 11,
    moduleNumber: 4,
    moduleTitleVi: 'Mua hàng, Công nợ Phải trả (TK 331) & Hóa đơn Điện tử NĐ 123',
    dayTitleVi: 'Đặc tả Hóa đơn Điện tử Nghị định 123/2020 & Quyết định 1450',
    estimatedMinutes: 20,
    isMilestoneDay: false,
    concepts: [
      { id: 'c11-1', titleVi: 'Hóa đơn Điện tử có Mã CQT (MCCQT)', summaryVi: 'Hóa đơn mã C có 34 ký tự hex do cơ quan thuế cấp.', contentVi: 'Bắt buộc với đa số doanh nghiệp theo NĐ 123.', keyTakeawayVi: 'MCCQT là chuỗi 34 ký tự thập lục phân.' },
      { id: 'c11-2', titleVi: 'Ký hiệu Hóa đơn 6 Ký tự (KHHDon)', summaryVi: 'Ví dụ C26TAA: C có mã, 26 năm 2026, T doanh nghiệp.', contentVi: 'Quy định thống nhất theo Thông tư 78/2021.', keyTakeawayVi: 'Ký hiệu hóa đơn chuẩn gồm đúng 6 ký tự.' },
      { id: 'c11-3', titleVi: 'Các Mức Thuế suất GTGT Hợp pháp', summaryVi: '0%, 5%, 8%, 10%, KCT, KKKNT.', contentVi: 'Mức thuế suất 8% áp dụng theo chính sách giảm thuế của Quốc hội.', keyTakeawayVi: 'Thuế GTGT = Giá tính thuế x Thuế suất.' },
    ],
  },
  {
    day: 12,
    moduleNumber: 4,
    moduleTitleVi: 'Mua hàng, Công nợ Phải trả (TK 331) & Hóa đơn Điện tử NĐ 123',
    dayTitleVi: 'Kiểm tra Đối chiếu 3 Bên (3-Way Matching) & Hàng Chưa Hóa đơn',
    estimatedMinutes: 20,
    isMilestoneDay: true,
    concepts: [
      { id: 'c12-1', titleVi: 'Đối chiếu 3 Bên PO - GRN - Invoice', summaryVi: 'Khớp nối số lượng, đơn giá và quy cách hàng hóa.', contentVi: 'Phát hiện sai lệch trước khi thực hiện thanh toán.', keyTakeawayVi: '3-way matching bảo vệ doanh nghiệp khỏi gian lận mua hàng.' },
      { id: 'c12-2', titleVi: 'Xử lý Hàng về Chưa có Hóa đơn', summaryVi: 'Ghi nhận giá tạm tính: Nợ 152/156 / Có 331 (không trích VAT).', contentVi: 'Khi nhận hóa đơn kỳ sau mới ghi nhận Nợ TK 1331.', keyTakeawayVi: 'Tuyệt đối không trích VAT khi chưa có hóa đơn.' },
      { id: 'c12-3', titleVi: 'Xử lý Hàng đang đi đường (TK 151)', summaryVi: 'Hóa đơn về trước hàng chưa nhập kho: Nợ 151, Nợ 133 / Có 331.', contentVi: 'Khi hàng về nhập kho: Nợ 156 / Có 151.', keyTakeawayVi: 'TK 151 theo dõi hàng mua đang đi trên đường.' },
    ],
  },

  // Days 13-30 populated with milestone markers
  { day: 13, moduleNumber: 5, moduleTitleVi: 'Kế toán Hàng tồn kho & Tính Giá Xuất kho', dayTitleVi: 'Phân loại Hàng tồn kho & Giá gốc Nhập kho', estimatedMinutes: 18, isMilestoneDay: false, concepts: [{ id: 'c13-1', titleVi: 'Giá gốc Hàng tồn kho', summaryVi: 'Giá mua + Chi phí thu mua - Giảm giá.', contentVi: 'VAS 02 quy định tính theo giá gốc.', keyTakeawayVi: 'Chi phí vận chuyển tính vào giá gốc hàng nhập kho.' }] },
  { day: 14, moduleNumber: 5, moduleTitleVi: 'Kế toán Hàng tồn kho & Tính Giá Xuất kho', dayTitleVi: '3 Phương pháp Tính Giá Xuất kho (FIFO, Bình quân)', estimatedMinutes: 20, isMilestoneDay: false, concepts: [{ id: 'c14-1', titleVi: 'FIFO vs Bình quân gia quyền', summaryVi: 'Nhập trước xuất trước và đơn giá bình quân cả kỳ.', contentVi: 'Tác động trực tiếp đến giá vốn hàng bán và lợi nhuận.', keyTakeawayVi: 'FIFO phản ánh giá trị tồn kho gần nhất với giá thị trường.' }] },
  { day: 15, moduleNumber: 5, moduleTitleVi: 'Kế toán Hàng tồn kho & Tính Giá Xuất kho', dayTitleVi: 'Hạch toán Xuất kho & Kiểm kê Hàng tồn kho', estimatedMinutes: 20, isMilestoneDay: true, concepts: [{ id: 'c15-1', titleVi: 'Xuất kho Giá vốn', summaryVi: 'Nợ TK 632 / Có TK 156.', contentVi: 'Xử lý chênh lệch thừa thiếu sau kiểm kê.', keyTakeawayVi: 'Xuất kho bán hàng ghi nhận Nợ 632 / Có 156.' }] },

  { day: 16, moduleNumber: 6, moduleTitleVi: 'Chi phí Sản xuất & Tính Giá thành (TT 200 vs 133)', dayTitleVi: 'Tập hợp Chi phí Sản xuất theo Thông tư 200', estimatedMinutes: 18, isMilestoneDay: false, concepts: [{ id: 'c16-1', titleVi: 'TK 621, 622, 627', summaryVi: 'NVL trực tiếp, nhân công trực tiếp, sản xuất chung.', contentVi: 'Cuối kỳ kết chuyển sang TK 154 để tính giá thành.', keyTakeawayVi: 'TT 200 sử dụng 3 khoản mục chi phí sản xuất.' }] },
  { day: 17, moduleNumber: 6, moduleTitleVi: 'Chi phí Sản xuất & Tính Giá thành (TT 200 vs 133)', dayTitleVi: 'Tập hợp Chi phí Sản xuất theo Thông tư 133 (TK 154)', estimatedMinutes: 18, isMilestoneDay: false, concepts: [{ id: 'c17-1', titleVi: 'Tập hợp thẳng vào TK 154', summaryVi: 'Cấm TK 621, 622, 627 trong TT 133.', contentVi: 'Mở chi tiết 1541, 1542, 1543 để theo dõi chi phí.', keyTakeawayVi: 'TT 133 gom toàn bộ chi phí sản xuất vào TK 154.' }] },
  { day: 18, moduleNumber: 6, moduleTitleVi: 'Chi phí Sản xuất & Tính Giá thành (TT 200 vs 133)', dayTitleVi: 'Tính Giá thành Thành phẩm Nhập kho', estimatedMinutes: 20, isMilestoneDay: true, concepts: [{ id: 'c18-1', titleVi: 'Công thức Tính Giá thành', summaryVi: 'Z = Dđk + C - Dck. Nhập kho thành phẩm: Nợ 155 / Có 154.', contentVi: 'Xác định giá thành sản phẩm hoàn thành trong kỳ.', keyTakeawayVi: 'Giá thành hoàn thành kết chuyển sang Nợ TK 155.' }] },

  { day: 19, moduleNumber: 7, moduleTitleVi: 'Kế toán TSCĐ & Chi phí Trả trước TK 242 (<=36T)', dayTitleVi: 'Tiêu chuẩn Ghi nhận & Nguyên giá TSCĐ (TT 45)', estimatedMinutes: 18, isMilestoneDay: false, concepts: [{ id: 'c19-1', titleVi: 'Tiêu chuẩn TSCĐ', summaryVi: 'Thời gian > 1 năm và nguyên giá >= 30 triệu VND.', contentVi: 'Thông tư 45/2013/TT-BTC quy định khung tài sản.', keyTakeawayVi: 'Dưới 30 triệu ghi nhận là CCDC (TK 153/242).' }] },
  { day: 20, moduleNumber: 7, moduleTitleVi: 'Kế toán TSCĐ & Chi phí Trả trước TK 242 (<=36T)', dayTitleVi: 'Khấu hao TSCĐ (TK 214) & Trần Xe Ô tô 1.6 Tỷ', estimatedMinutes: 20, isMilestoneDay: false, concepts: [{ id: 'c20-1', titleVi: 'Trích Khấu hao & Trần 1.6 Tỷ', summaryVi: 'Ô tô dưới 9 chỗ vượt 1.6 tỷ bị loại khấu hao thuế TNDN.', contentVi: 'Bút toán trích khấu hao hàng tháng: Nợ 642 / Có 214.', keyTakeawayVi: 'Khấu hao phần xe vượt 1.6 tỷ là chi phí không được trừ.' }] },
  { day: 21, moduleNumber: 7, moduleTitleVi: 'Kế toán TSCĐ & Chi phí Trả trước TK 242 (<=36T)', dayTitleVi: 'Chi phí Trả trước (TK 242) & Trần Khống chế 36 Tháng', estimatedMinutes: 20, isMilestoneDay: true, concepts: [{ id: 'c21-1', titleVi: 'Trần Phân bổ 36 Tháng (TT 96)', summaryVi: 'Thời gian phân bổ tối đa không quá 36 tháng.', contentVi: 'Phân bổ CCDC và tiền thuê văn phòng nhiều kỳ.', keyTakeawayVi: 'Phân bổ quá 36 tháng vi phạm luật thuế TNDN.' }] },

  { day: 22, moduleNumber: 8, moduleTitleVi: 'Kế toán Tiền lương & Các khoản Trích theo Lương', dayTitleVi: 'Kế toán Tiền lương Phải trả Người lao động (TK 334)', estimatedMinutes: 18, isMilestoneDay: false, concepts: [{ id: 'c22-1', titleVi: 'Lương Gross sang Net', summaryVi: 'Tính chi phí lương vào TK 641, 642, 154 / Có 334.', contentVi: 'Bảng thanh toán lương tổng hợp các khoản thu nhập.', keyTakeawayVi: 'Chi phí lương ghi Có TK 334.' }] },
  { day: 23, moduleNumber: 8, moduleTitleVi: 'Kế toán Tiền lương & Các khoản Trích theo Lương', dayTitleVi: 'Tỷ lệ Bảo hiểm Bắt buộc (34%) & Kinh phí Công đoàn', estimatedMinutes: 20, isMilestoneDay: false, concepts: [{ id: 'c23-1', titleVi: 'Tỷ lệ Trích Bảo hiểm', summaryVi: 'DN chịu 23.5% tính vào chi phí; NLĐ chịu 10.5% trừ lương.', contentVi: 'BHXH 17.5%/8%, BHYT 3%/1.5%, BHTN 1%/1%, KPCĐ 2%.', keyTakeawayVi: 'Tổng tỷ lệ đóng bảo hiểm và công đoàn là 34%.' }] },
  { day: 24, moduleNumber: 8, moduleTitleVi: 'Kế toán Tiền lương & Các khoản Trích theo Lương', dayTitleVi: 'Khấu trừ Thuế TNCN (TK 3335) & Thanh toán Lương', estimatedMinutes: 20, isMilestoneDay: true, concepts: [{ id: 'c24-1', titleVi: 'Thuế TNCN Biểu Lũy tiến', summaryVi: 'Khấu trừ thuế TNCN: Nợ 334 / Có 3335.', contentVi: 'Giảm trừ gia cảnh bản thân 11tr, người phụ thuộc 4.4tr.', keyTakeawayVi: 'Chi trả lương thực tế cho nhân viên: Nợ 334 / Có 112.' }] },

  { day: 25, moduleNumber: 9, moduleTitleVi: 'Doanh thu Bán hàng (VAS 14), Chiết khấu & Phải thu', dayTitleVi: '5 Điều kiện Ghi nhận Doanh thu Bán hàng (TK 511)', estimatedMinutes: 18, isMilestoneDay: false, concepts: [{ id: 'c25-1', titleVi: 'Ghi nhận Doanh thu VAS 14', summaryVi: 'Chuyển giao phần lớn rủi ro và lợi ích gắn liền sở hữu.', contentVi: 'Đồng thời ghi nhận doanh thu và giá vốn.', keyTakeawayVi: 'Doanh thu bán hàng ghi Có TK 511.' }] },
  { day: 26, moduleNumber: 9, moduleTitleVi: 'Doanh thu Bán hàng (VAS 14), Chiết khấu & Phải thu', dayTitleVi: 'Các khoản Giảm trừ Doanh thu & Chiết khấu Thanh toán', estimatedMinutes: 20, isMilestoneDay: false, concepts: [{ id: 'c26-1', titleVi: 'TK 521 (TT 200) vs Nợ 511 (TT 133)', summaryVi: 'TT 133 cấm TK 521, giảm trực tiếp vào Nợ TK 511.', contentVi: 'Chiết khấu thanh toán cho khách ghi Nợ TK 635.', keyTakeawayVi: 'Chiết khấu thanh toán bán hàng ghi Nợ TK 635.' }] },
  { day: 27, moduleNumber: 9, moduleTitleVi: 'Doanh thu Bán hàng (VAS 14), Chiết khấu & Phải thu', dayTitleVi: 'Kế toán Công nợ Khách hàng (TK 131) & Trích lập Dự phòng', estimatedMinutes: 20, isMilestoneDay: true, concepts: [{ id: 'c27-1', titleVi: 'Dự phòng Nợ khó đòi TK 2293', summaryVi: 'Trích lập dự phòng theo Thông tư 48/2019/TT-BTC.', contentVi: 'Quá hạn 6 tháng - 1 năm trích 30%, 1 - 2 năm trích 50%.', keyTakeawayVi: 'Trích lập dự phòng ghi Nợ 642 / Có 2293.' }] },

  { day: 28, moduleNumber: 10, moduleTitleVi: 'Khóa sổ Kế toán, Kết chuyển 911 & Lập BCTC', dayTitleVi: 'Quy trình Khóa sổ Kế toán & Xóa Số dư Tạm thời', estimatedMinutes: 18, isMilestoneDay: false, concepts: [{ id: 'c28-1', titleVi: 'Nguyên tắc Khóa sổ', summaryVi: 'Rà soát chứng từ, trích trước chi phí TK 335.', contentVi: 'Xóa toàn bộ số dư tài khoản Loại 5 đến 9.', keyTakeawayVi: 'Không được bỏ sót chứng từ phát sinh trong kỳ.' }] },
  { day: 29, moduleNumber: 10, moduleTitleVi: 'Khóa sổ Kế toán, Kết chuyển 911 & Lập BCTC', dayTitleVi: 'Bút toán Kết chuyển TK 911 & Thuế TNDN Tạm tính', estimatedMinutes: 20, isMilestoneDay: false, concepts: [{ id: 'c29-1', titleVi: 'Quy trình Kết chuyển 911', summaryVi: 'Kết chuyển DT Có 911, CP Nợ 911. Số dư 911 bắt buộc = 0.', contentVi: 'Thuế TNDN hiện hành 20% ghi Nợ 8211 / Có 3334.', keyTakeawayVi: 'Lãi sau thuế kết chuyển sang Có TK 4212.' }] },
  { day: 30, moduleNumber: 10, moduleTitleVi: 'Khóa sổ Kế toán, Kết chuyển 911 & Lập BCTC', dayTitleVi: 'Lập Báo cáo Tài chính B01-B09 & Soát xét Chứng từ Capstone', estimatedMinutes: 25, isMilestoneDay: true, concepts: [{ id: 'c30-1', titleVi: 'Bảng Cân đối Kế toán B01', summaryVi: 'Tổng Tài sản = Tổng Nguồn vốn (Mã số 270 = Mã số 440).', contentVi: 'Soát xét MST Status 03/04 và hoàn tất chu trình 30 ngày.', keyTakeawayVi: 'Cân bằng BCTC là thước đo cao nhất của kế toán.' }] },
];

export const MILESTONE_DAYS = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30] as const;
