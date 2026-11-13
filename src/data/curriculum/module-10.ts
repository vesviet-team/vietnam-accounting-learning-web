import { DailyLesson } from '@/types/curriculum';

export const MODULE_10_LESSONS: DailyLesson[] = [
  {
    day: 28,
    moduleNumber: 10,
    moduleTitleVi: 'Khối 10: Lập Bộ Báo Cáo Tài Chính & Tổng Duyệt Chu Trình Kế Toán',
    dayTitleVi: 'Ngày 28: Bảng Cân Đối Kế Toán (B01-DN) & Cân Bằng Bất Biến (Mã 270 = Mã 440)',
    estimatedMinutes: 20,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c28-1',
        titleVi: 'Cấu Trúc & Bản Chất Của Bảng Cân Đối Kế Toán (Mẫu B01-DN / B01a-DNN)',
        summaryVi: 'Bảng CĐKT phản ánh toàn bộ giá trị tài sản và nguồn hình thành tài sản tại một thời điểm nhất định (báo cáo thời điểm).',
        contentVi: 'Bảng cân đối kế toán là bức ảnh chụp toàn cảnh tình hình tài chính của doanh nghiệp vào ngày cuối cùng của kỳ kế toán (thường là ngày 31/12). Bảng gồm 2 phần đối xứng: Phần TÀI SẢN (A. Tài sản ngắn hạn + B. Tài sản dài hạn); Phần NGUỒN VỐN (C. Nợ phải trả + D. Vốn chủ sở hữu). Số liệu lấy từ số dư cuối kỳ của các tài khoản từ Loại 1 đến Loại 4 trên Bảng cân đối số phát sinh tài khoản.',
        keyTakeawayVi: 'Bảng cân đối kế toán là báo cáo thời điểm; mọi số liệu đều phản ánh trạng thái đóng băng tại ngày khóa sổ.',
      },
      {
        id: 'c28-2',
        titleVi: 'Phương Trình Cân Bằng Toán Học Bất Biến: Mã Số 270 Bằng Mã Số 440',
        summaryVi: 'TỔNG CỘNG TÀI SẢN (Mã 270) BẮT BUỘC PHẢI BẰNG TỔNG CỘNG NGUỒN VỐN (Mã 440).',
        contentVi: 'Tính cân bằng của Bảng CĐKT là nguyên lý toán học tối cao: Mã số 270 (Tổng cộng Tài sản = Mã 100 + Mã 200) PHẢI BẰNG TUYỆT ĐỐI Mã số 440 (Tổng cộng Nguồn vốn = Mã 300 + Mã 400). Nếu Mã 270 lệch so với Mã 440 dù chỉ 1 đồng, Bảng CĐKT hoàn toàn vô giá trị và bị cơ quan thuế từ chối tiếp nhận trên cổng thuế điện tử.',
        keyTakeawayVi: 'Mã số 270 = Mã số 440 là điều kiện tiên quyết kiểm tra tính hợp lệ của báo cáo tài chính.',
      },
      {
        id: 'c28-3',
        titleVi: 'Kỹ Thuật Xử Lý Các Chỉ Tiêu Ghi Âm Trên Bảng Cân Đối Kế Toán',
        summaryVi: 'Hao mòn TSCĐ (Mã 223), Dự phòng giảm giá (Mã 229) và Cổ phiếu quỹ (Mã 419) được ghi bằng số âm trong ngoặc đơn.',
        contentVi: 'Một số chỉ tiêu đặc thù làm giảm quy mô tài sản hoặc nguồn vốn được ghi bằng số âm: (1) Hao mòn lũy kế TSCĐ (Mã 223 - lấy từ số dư Có TK 214): ghi số âm để trừ bớt khỏi nguyên giá; (2) Dự phòng giảm giá hàng tồn kho (Mã 149 - lấy từ Có TK 2294): ghi số âm bên Tài sản ngắn hạn; (3) Cổ phiếu quỹ (Mã 419 - lấy từ Dư Nợ TK 419): ghi số âm bên Vốn chủ sở hữu; (4) Lợi nhuận sau thuế chưa phân phối nếu lỗ lũy kế (Mã 421): ghi số âm bên Vốn chủ sở hữu.',
        keyTakeawayVi: 'Các tài khoản điều chỉnh giảm (Contra accounts) luôn được trình bày bằng số âm để hoàn trả giá trị thuần.',
      },
    ],
  },
  {
    day: 29,
    moduleNumber: 10,
    moduleTitleVi: 'Khối 10: Lập Bộ Báo Cáo Tài Chính & Tổng Duyệt Chu Trình Kế Toán',
    dayTitleVi: 'Ngày 29: Báo Cáo Kết Quả Kinh Doanh (B02) & Báo Cáo Lưu Chuyển Tiền Tệ (B03)',
    estimatedMinutes: 20,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c29-1',
        titleVi: 'Báo Cáo Kết Quả Hoạt Động Kinh Doanh (Mẫu B02-DN / B02-DNN)',
        summaryVi: 'Báo cáo thời kỳ phản ánh hiệu quả kinh doanh từ Doanh thu thuần đến Lợi nhuận sau thuế của doanh nghiệp.',
        contentVi: 'Báo cáo KQKD trình bày lũy kế từ đầu kỳ đến cuối kỳ: (1) Doanh thu bán hàng và CCDV (Mã 01); (2) Các khoản giảm trừ doanh thu (Mã 02); (3) Doanh thu thuần (Mã 10 = Mã 01 - Mã 02); (4) Giá vốn hàng bán (Mã 11); (5) Lợi nhuận gộp (Mã 20 = Mã 10 - Mã 11); (6) Doanh thu tài chính (Mã 21) & Chi phí tài chính (Mã 22); (7) Chi phí bán hàng (Mã 25) & Quản lý (Mã 26); (8) Lợi nhuận thuần từ HĐKD (Mã 30); (9) Lợi nhuận khác (Mã 40); (10) Tổng lợi nhuận trước thuế (Mã 50); (11) Chi phí thuế TNDN (Mã 51); (12) Lợi nhuận sau thuế (Mã 60).',
        keyTakeawayVi: 'Mã số 60 (Lợi nhuận sau thuế) trên Báo cáo KQKD phải khớp chính xác với phát sinh chuyển vào TK 4212 trên Sổ Cái.',
      },
      {
        id: 'c29-2',
        titleVi: 'Báo Cáo Lưu Chuyển Tiền Tệ (Mẫu B03-DN) & 3 Dòng Tiền Hoạt Động',
        summaryVi: 'Dòng tiền từ hoạt động kinh doanh (CFO), hoạt động đầu tư (CFI) và hoạt động tài chính (CFF).',
        contentVi: 'Báo cáo LCTT giải thích dòng tiền thực tế vào và ra khỏi doanh nghiệp qua 3 luồng: (1) Lưu chuyển tiền từ hoạt động kinh doanh: Thu tiền bán hàng, chi trả tiền mua nguyên vật liệu, trả lương nhân viên, nộp thuế; (2) Lưu chuyển tiền từ hoạt động đầu tư: Mua sắm/bán tài sản cố định, cho vay thu nợ, đầu tư góp vốn; (3) Lưu chuyển tiền từ hoạt động tài chính: Nhận vốn góp chủ sở hữu, đi vay nợ ngân hàng, trả nợ gốc vay, chia cổ tức. Mối liên hệ: Lưu chuyển tiền thuần trong kỳ (Mã 50) + Tiền đầu kỳ (Mã 60) = Tiền cuối kỳ (Mã 70).',
        keyTakeawayVi: 'Một doanh nghiệp có lãi trên B02 vẫn có thể phá sản nếu dòng tiền kinh doanh (B03) bị âm kéo dài do chôn vốn công nợ.',
      },
      {
        id: 'c29-4',
        titleVi: 'TK 82112 - Thuế TNDN Bổ Sung Theo Thuế Tối Thiểu Toàn Cầu (TT 99/2025/TT-BTC & NĐ 236/2025/NĐ-CP)',
        summaryVi: 'TT 99/2025/TT-BTC hệ thống hóa tài khoản mới TK 82112; NĐ 236/2025/NĐ-CP (hiệu lực 15/10/2025) hướng dẫn NQ 107/2023/QH15 về thuế tối thiểu toàn cầu QDMTT 15% áp dụng từ năm tài chính 2024.',
        contentVi: 'Từ Thông tư 99/2025/TT-BTC (hiệu lực 01/01/2026), Hệ thống tài khoản kế toán được cập nhật thêm tiểu khoản 82112 - "Chi phí thuế TNDN bổ sung theo thuế tối thiểu toàn cầu", nằm trong cấu trúc TK 821 (Chi phí thuế thu nhập doanh nghiệp) bên cạnh TK 8211 (chi phí thuế hiện hành) và TK 8212 (chi phí thuế thu nhập hoãn lại). Căn cứ pháp lý về thuế là Nghị định 236/2025/NĐ-CP (hiệu lực từ 15/10/2025) hướng dẫn Nghị quyết 107/2023/QH15 của Quốc hội: tập đoàn doanh nghiệp đa quốc gia có doanh thu hợp nhất ≥ 750 triệu EUR (khoảng 2 năm tài chính trở lên trong 4 năm liền trước) thuộc nghĩa vụ nộp THUẾ TỐI THIỂU TOÀN CẦU (QDMTT) với mức thuế suất hiệu dụng tối thiểu 15% trên từng cơ sở kinh doanh tại Việt Nam, áp dụng từ NĂM TÀI CHÍNH 2024. Khi phần thuế suất hiệu dụng của thành viên tại Việt Nam dưới 15%, doanh nghiệp tính thêm chi phí thuế bổ sung: Ghi Nợ TK 82112 / Có TK 3334, sau đó kết chuyển Nợ TK 911 / Có TK 82112 cùng với chi phí thuế TNDN hiện hành 8211 khi khóa sổ để xác định kết quả kinh doanh và trình bày tại chỉ tiêu chi phí thuế TNDN (Mã 51) trên Báo cáo KQKD. Doanh nghiệp không thuộc tập đoàn ≥ 750 triệu EUR không phát sinh nghĩa vụ này.',
        keyTakeawayVi: 'TK 82112 (TT 99/2025/TT-BTC) phản ánh chi phí thuế TNDN bổ sung theo thuế tối thiểu toàn cầu 15% (NĐ 236/2025/NĐ-CP hướng dẫn NQ 107/2023/QH15, áp dụng từ năm tài chính 2024) cho tập đoàn có doanh thu hợp nhất từ 750 triệu EUR.',
      },
      {
        id: 'c29-3',
        titleVi: 'Khác Biệt Về Nghĩa Vụ Nộp BCTC Giữa Thông Tư 200 & Thông Tư 133',
        summaryVi: 'Doanh nghiệp áp dụng TT 200 bắt buộc phải nộp Báo cáo LCTT; doanh nghiệp SME theo TT 133 được khuyến khích nhưng không bắt buộc.',
        contentVi: 'Theo quy định của Bộ Tài chính: Đối với doanh nghiệp áp dụng Thông tư 200/2014, Báo cáo lưu chuyển tiền tệ (Mẫu B03-DN) là BẮT BUỘC trong bộ Báo cáo tài chính năm nộp cho cơ quan thuế. Đối với doanh nghiệp SME áp dụng Thông tư 133/2016, Mẫu B03b-DNN là báo cáo KHÔNG BẮT BUỘC mà chỉ mang tính khuyến khích lập để phục vụ quản trị doanh nghiệp.',
        keyTakeawayVi: 'Nắm rõ chế độ kế toán đang áp dụng giúp doanh nghiệp SME tránh lập thừa hoặc thiếu các báo cáo bắt buộc.',
      },
    ],
  },
  {
    day: 30,
    moduleNumber: 10,
    moduleTitleVi: 'Khối 10: Lập Bộ Báo Cáo Tài Chính & Tổng Duyệt Chu Trình Kế Toán',
    dayTitleVi: 'Ngày 30: Bản Thuyết Minh BCTC (B09), Kiểm Soát Rủi Ro Thuế & Tổng Kết Chu Trình',
    estimatedMinutes: 20,
    isMilestoneDay: true,
    concepts: [
      {
        id: 'c30-1',
        titleVi: 'Bản Thuyết Minh Báo Cáo Tài Chính (Mẫu B09-DN / B09-DNN)',
        summaryVi: 'Giải trình chi tiết chính sách kế toán áp dụng, biến động tài sản, chi tiết công nợ và các sự kiện sau ngày khóa sổ.',
        contentVi: 'Bản thuyết minh BCTC là bộ phận không thể tách rời của bộ BCTC. Nó làm rõ các chính sách kế toán mà doanh nghiệp áp dụng: Kỳ kế toán, đồng tiền hạch toán (VND), chế độ kế toán (TT 200 hay TT 133), phương pháp tính giá trị hàng tồn kho (FIFO hay Bình quân), phương pháp trích khấu hao TSCĐ, và giải trình chi tiết số liệu của từng khoản mục trên Bảng CĐKT và Báo cáo KQKD.',
        keyTakeawayVi: 'Thuyết minh BCTC giúp người đọc hiểu rõ bản chất số liệu tài chính và chính sách kế toán mà doanh nghiệp tuân thủ.',
      },
      {
        id: 'c30-2',
        titleVi: 'Kiểm Soát Rủi Ro Thuế: Nhận Diện Doanh Nghiệp Có Trạng Thái MST 03 & 04',
        summaryVi: 'Tra cứu rủi ro nhà cung cấp ngừng hoạt động (03) hoặc bỏ trốn (04) để loại trừ hóa đơn bất hợp pháp.',
        contentVi: 'Trước khi nộp BCTC và quyết toán thuế năm, kế toán rà soát toàn bộ nhà cung cấp trên cổng `tracuunnt.gdt.gov.vn`: (1) Trạng thái 00: Đang hoạt động bình thường; (2) Trạng thái 03: NNT ngừng hoạt động nhưng chưa hoàn thành thủ tục đóng MST; (3) Trạng thái 04: NNT không hoạt động tại địa chỉ đã đăng ký (Doanh nghiệp bỏ trốn / Ma). Hóa đơn phát sinh sau ngày doanh nghiệp bị cơ quan thuế thông báo trạng thái 04 sẽ bị hủy bỏ giá trị khấu trừ thuế GTGT và bị loại chi phí TNDN!',
        keyTakeawayVi: 'Rà soát trạng thái mã số thuế của toàn bộ nhà cung cấp là khâu kiểm soát sống còn trước khi nộp BCTC.',
      },
      {
        id: 'c30-4',
        titleVi: 'Chứng Chỉ Kế Toán Trưởng Theo Thông Tư 101/2026/TT-BTC (Hiệu Lực 01/01/2027)',
        summaryVi: 'Thông tư 101/2026 quy định chương trình bồi dưỡng 152-180 giờ, thay thế TT 12/2016 & TT 15/2017. Kế toán trưởng bắt buộc phải có chứng chỉ mới từ 01/01/2027.',
        contentVi: 'Theo Thông tư 101/2026/TT-BTC (ban hành ngày 15/07/2026, Công báo), từ 01/01/2027, kế toán trưởng doanh nghiệp bắt buộc phải có Chứng chỉ Kế toán trưởng mới sau khi hoàn thành chương trình bồi dưỡng: (1) Chương trình 152 giờ: Dành cho người đã có chứng chỉ kế toán trưởng theo TT 12/2016 hoặc TT 15/2017 (học cập nhật kiến thức mới); (2) Chương trình 180 giờ: Dành cho người chưa từng có chứng chỉ kế toán trưởng (học chương trình đầy đủ). Nội dung bồi dưỡng bao gồm: Chế độ kế toán mới (TT 99/2025), Pháp luật thuế cập nhật (Luật TNDN 67/2025, Luật TNCN 109/2025, Luật GTGT 48/2024, Luật QL thuế 108/2025), Hóa đơn điện tử (NĐ 254/2026), Thuế tối thiểu toàn cầu (NĐ 236/2025), Kế toán số hóa & Chứng từ điện tử, Kiểm soát nội bộ & Tuân thủ pháp lý. Doanh nghiệp phải lập kế hoạch đào tạo để kế toán trưởng hoàn thành trước 31/12/2026. Không có chứng chỉ mới từ 01/01/2027 sẽ bị xem là không đáp ứng tiêu chuẩn nhân sự kế toán theo Luật Kế toán 88/2015.',
        keyTakeawayVi: 'Từ 01/01/2027: Kế toán trưởng BẮT BUỘC phải có chứng chỉ mới TT 101/2026 (152h cập nhật hoặc 180h đầy đủ). Doanh nghiệp cần chủ động xếp lịch đào tạo ngay Q3-2026.',
      },
    ],
  },
];
