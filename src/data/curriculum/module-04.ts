import { DailyLesson } from '@/types/curriculum';

export const MODULE_4_LESSONS: DailyLesson[] = [
  {
    day: 10,
    moduleNumber: 4,
    moduleTitleVi: 'Khối 4: Tài Sản Cố Định, Khấu Hao & Quy Định Xe Ô Tô 1.6 Tỷ',
    dayTitleVi: 'Ngày 10: Tiêu Chuẩn Ghi Nhận & Xác Định Nguyên Giá Tài Sản Cố Định (TK 211)',
    estimatedMinutes: 19,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c10-1',
        titleVi: '3 Điều Kiện Bắt Buộc Ghi Nhận Tài Sản Cố Định Hữu Hình',
        summaryVi: 'Chắc chắn thu được lợi ích kinh tế, thời gian sử dụng > 1 năm, và nguyên giá >= 30.000.000 VNĐ.',
        contentVi: 'Theo Điều 3 Thông tư 45/2013/TT-BTC, một tư liệu lao động phải thỏa mãn đồng thời cả 3 điều kiện mới được coi là Tài sản cố định hữu hình (TK 211): (1) Chắc chắn thu được lợi ích kinh tế trong tương lai từ việc sử dụng tài sản đó; (2) Có thời gian sử dụng trên 01 năm trở lên; (3) Nguyên giá tài sản phải được xác định một cách tin cậy và có giá trị từ 30.000.000 đồng (Ba mươi triệu đồng) trở lên. Những tài sản không đủ 3 điều kiện trên được phân loại là Công cụ, dụng cụ (TK 153).',
        keyTakeawayVi: 'Nếu giá trị dưới 30 triệu đồng hoặc thời gian dùng dưới 1 năm, tuyệt đối không hạch toán vào TK 211 mà đưa vào TK 153/242.',
      },
      {
        id: 'c10-2',
        titleVi: 'Công Thức Tính Nguyên Giá TSCĐ Mua Mới',
        summaryVi: 'Nguyên giá = Giá mua chưa VAT + Chi phí vận chuyển, lắp đặt, chạy thử - Chiết khấu mua hàng.',
        contentVi: 'Nguyên giá TSCĐ mua mới (Historical Cost) bao gồm: Giá mua ghi trên hóa đơn (không có thuế GTGT nếu DN nộp thuế theo phương pháp khấu trừ), các khoản thuế không hoàn lại (thuế nhập khẩu, thuế tiêu thụ đặc biệt nếu có), cộng các chi phí liên quan trực tiếp tính đến thời điểm đưa tài sản vào trạng thái sẵn sàng sử dụng (chi phí vận chuyển, bốc dỡ, chi phí lắp đặt, chạy thử, lệ phí trước bạ xe ô tô).',
        journalExamples: [
          {
            descriptionVi: 'Mua máy tiện CNC giá chưa thuế 150.000.000đ, VAT 10%, chi phí vận chuyển chạy thử 5.000.000đ (chưa VAT 10%)',
            entries: [
              { debitCredit: 'DEBIT', accountCode: '211', accountNameVi: 'Tài sản cố định hữu hình', amount: 155000000 },
              { debitCredit: 'DEBIT', accountCode: '1332', accountNameVi: 'Thuế GTGT đầu vào của TSCĐ', amount: 15500000 },
              { debitCredit: 'CREDIT', accountCode: '331', accountNameVi: 'Phải trả cho người bán', amount: 170500000 },
            ],
            statutoryNoteVi: 'Nguyên giá máy tiện CNC = 150tr + 5tr = 155.000.000 VNĐ. Thuế GTGT đầu vào TSCĐ dùng TK 1332.',
          },
        ],
        keyTakeawayVi: 'Toàn bộ chi phí đưa tài sản vào trạng thái sẵn sàng sử dụng đều được cộng gộp vào nguyên giá TK 211.',
      },
      {
        id: 'c10-3',
        titleVi: 'Sự Khác Biệt Giữa TK 1331 (Hàng Hóa) & TK 1332 (Tài Sản Cố Định)',
        summaryVi: 'Thuế GTGT mua nguyên vật liệu, hàng hóa dùng TK 1331; mua sắm TSCĐ hữu hình/vô hình bắt buộc dùng TK 1332.',
        contentVi: 'Trong hệ thống tài khoản Thông tư 200, tài khoản thuế GTGT đầu vào được chia làm 2 tiểu khoản: TK 1331 (Thuế GTGT đầu vào của hàng hóa, dịch vụ) và TK 1332 (Thuế GTGT đầu vào của tài sản cố định). Việc tách bạch này giúp doanh nghiệp giải trình hồ sơ hoàn thuế GTGT dự án đầu tư và đối soát số liệu với Tờ khai thuế GTGT Mẫu 01/GTGT.',
        keyTakeawayVi: 'Luôn luôn hạch toán thuế GTGT khi mua sắm máy móc, phương tiện vận tải vào tiểu khoản TK 1332.',
      },
    ],
  },
  {
    day: 11,
    moduleNumber: 4,
    moduleTitleVi: 'Khối 4: Tài Sản Cố Định, Khấu Hao & Quy Định Xe Ô Tô 1.6 Tỷ',
    dayTitleVi: 'Ngày 11: Kế Toán Khấu Hao TSCĐ (TK 214 - Contra Asset), Khung TT 45 & Trần Ô Tô 1.6 Tỷ',
    estimatedMinutes: 20,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c11-1',
        titleVi: 'Bản Chất Tài Khoản Hao Mòn TSCĐ (TK 214) - Tài Khoản Điều Chỉnh Giảm (Contra Asset)',
        summaryVi: 'TK 214 thuộc Loại 2 (Tài sản) nhưng có kết cấu ngược: Tăng bên Có, Giảm bên Nợ, Số dư cuối kỳ bên Có.',
        contentVi: 'TK 214 là tài khoản điều chỉnh giảm tài sản (Contra-asset account). Nó phản ánh giá trị hao mòn lũy kế của toàn bộ tài sản cố định trong doanh nghiệp. Khi trích khấu hao hàng tháng: Ghi CÓ TK 214 (Tăng hao mòn). Khi thanh lý nhượng bán tài sản: Ghi NỢ TK 214 (Giảm hao mòn lũy kế). Trên Bảng cân đối kế toán, chỉ tiêu Hao mòn lũy kế (Mã số 223) được ghi bằng SỐ ÂM (trong ngoặc đơn) bên cột Tài sản để làm giảm giá trị còn lại của TSCĐ.',
        detailedTAccounts: [
          {
            accountCode: '214',
            accountNameVi: 'Hao mòn tài sản cố định',
            accountClass: 2,
            normalBalance: 'CREDIT',
            isContra: true,
            contraTarget: 'Tài sản cố định (TK 211)',
            openingBalance: { side: 'CREDIT', amount: 60000000 },
            entries: [
              { id: 'kh1', description: 'Trích khấu hao máy tiện tháng 9 (phân xưởng)', amount: 2500000, side: 'CREDIT', counterAccountCode: '627' },
              { id: 'kh2', description: 'Trích khấu hao xe ô tô tháng 9 (quản lý)', amount: 15000000, side: 'CREDIT', counterAccountCode: '642' },
              { id: 'kh3', description: 'Xóa sổ hao mòn máy in thanh lý', amount: 18000000, side: 'DEBIT', counterAccountCode: '211' },
            ],
            explanationVi: 'Số dư cuối kỳ = 60.000.000 + 2.500.000 + 15.000.000 - 18.000.000 = 59.500.000 VNĐ (Dư Có). Trình bày số âm (-59.500.000đ) trên BCTC.',
          },
        ],
        keyTakeawayVi: 'TK 214 mang số dư CÓ; được trình bày là số âm bên phần Tài sản của Bảng CĐKT.',
      },
      {
        id: 'c11-2',
        titleVi: 'Khung Thời Gian Khấu Hao Theo Phụ Lục 1 Thông Tư 45/2013',
        summaryVi: 'Doanh nghiệp bắt buộc đăng ký thời gian trích khấu hao nằm trong khung quy định của Bộ Tài chính.',
        contentVi: 'Thông tư 45/2013/TT-BTC quy định khung trích khấu hao: Máy móc thiết bị động lực (6 - 15 năm); Máy móc công tác chế biến (3 - 20 năm); Phương tiện vận tải đường bộ (6 - 10 năm); Thiết bị truyền dẫn (4 - 10 năm); Thiết bị, dụng cụ quản lý máy tính, văn phòng (3 - 8 năm). Mức trích khấu hao tháng = Nguyên giá / (Số năm đăng ký x 12).',
        keyTakeawayVi: 'Trích khấu hao nhanh hơn khung tối thiểu hoặc chậm hơn khung tối đa mà không được Bộ Tài chính chấp thuận sẽ bị loại chi phí thuế.',
      },
      {
        id: 'c11-3',
        titleVi: 'Quy Định Khống Chế Thuế Đối Với Xe Ô Tô Chở Người Dưới 9 Chỗ Vượt 1.6 Tỷ',
        summaryVi: 'Phần nguyên giá vượt trên 1,6 tỷ đồng không được khấu trừ thuế GTGT và không được tính vào chi phí được trừ thuế TNDN.',
        contentVi: 'Theo Thông tư 151/2014/TT-BTC và Thông tư 96/2015/TT-BTC: Doanh nghiệp không kinh doanh vận tải hành khách, du lịch, khách sạn khi mua xe ô tô chở người từ 9 chỗ ngồi trở xuống có nguyên giá vượt trên 1,6 tỷ đồng (chưa VAT): (1) Thuế GTGT đầu vào chỉ được khấu trừ tối đa 160 triệu đồng (tương ứng 1,6 tỷ x 10%), phần thuế GTGT thừa được cộng vào nguyên giá xe; (2) Phần chi phí trích khấu hao tương ứng với nguyên giá vượt trên 1,6 tỷ đồng là chi phí không được trừ khi tính thuế TNDN, bắt buộc phải loại trừ qua Chỉ tiêu B4 trên Tờ khai Quyết toán TNDN hàng năm.',
        keyTakeawayVi: 'Xe ô tô dưới 9 chỗ vượt 1.6 tỷ: Phần khấu hao vượt trần là chi phí kế toán hợp pháp nhưng bị loại bỏ khi tính thuế TNDN.',
      },
    ],
  },
  {
    day: 12,
    moduleNumber: 4,
    moduleTitleVi: 'Khối 4: Tài Sản Cố Định, Khấu Hao & Quy Định Xe Ô Tô 1.6 Tỷ',
    dayTitleVi: 'Ngày 12: Nâng Cấp, Sửa Chữa Lớn & Nhượng Bán Thanh Lý TSCĐ (TK 711, 811)',
    estimatedMinutes: 20,
    isMilestoneDay: true,
    concepts: [
      {
        id: 'c12-1',
        titleVi: 'Phân Biệt Nâng Cấp Tăng Nguyên Giá vs Sửa Chữa Duy Tu Phân Bổ Qua TK 242',
        summaryVi: 'Sửa chữa bảo dưỡng định kỳ đưa vào chi phí trong kỳ hoặc TK 242; nâng cấp kéo dài tuổi thọ mới được tăng TK 211.',
        contentVi: 'Nếu hoạt động nâng cấp, cải tạo làm tăng công suất hoặc kéo dài thời gian sử dụng hữu ích của TSCĐ: Tập hợp chi phí qua TK 2413 (Sửa chữa lớn TSCĐ), khi hoàn thành nghiệm thu bàn giao ghi tăng nguyên giá Nợ TK 211 / Có TK 2413. Nếu chỉ là sửa chữa phục hồi năng lực ban đầu (thay dầu, bảo dưỡng): phân bổ qua TK 242 hoặc hạch toán thẳng vào chi phí sản xuất kinh doanh.',
        keyTakeawayVi: 'Chỉ ghi tăng nguyên giá TK 211 khi việc cải tạo thực sự làm tăng hiệu quả kinh tế hoặc kéo dài tuổi thọ của tài sản.',
      },
      {
        id: 'c12-2',
        titleVi: 'Kế Toán Nghiệp Vụ Thanh Lý, Nhượng Bán Tài Sản Cố Định',
        summaryVi: 'Xóa sổ giá trị còn lại vào Chi phí khác (TK 811) và ghi nhận tiền thu thanh lý vào Thu nhập khác (TK 711).',
        contentVi: 'Khi thanh lý nhượng bán TSCĐ, kế toán ghi 2 bút toán độc lập: (1) Bút toán xóa sổ TSCĐ: Nợ TK 214 (Hao mòn lũy kế đã trích), Nợ TK 811 (Giá trị còn lại chưa khấu hao hết) / Có TK 211 (Nguyên giá); (2) Bút toán thu tiền bán tài sản hoặc phụ tùng thu hồi: Nợ TK 111, 112, 131 / Có TK 711 (Thu nhập khác), Có TK 33311 (Thuế GTGT đầu ra). Chi phí liên quan đến thanh lý (tháo dỡ, vận chuyển) ghi Nợ TK 811 / Có 111, 112.',
        journalExamples: [
          {
            descriptionVi: 'Thanh lý xe tải: Nguyên giá 300 triệu, đã trích hao mòn 250 triệu, bán thu tiền chuyển khoản 70 triệu chưa VAT 10%',
            entries: [
              { debitCredit: 'DEBIT', accountCode: '214', accountNameVi: 'Hao mòn tài sản cố định', amount: 250000000 },
              { debitCredit: 'DEBIT', accountCode: '811', accountNameVi: 'Chi phí khác (Giá trị còn lại)', amount: 50000000 },
              { debitCredit: 'CREDIT', accountCode: '211', accountNameVi: 'Tài sản cố định hữu hình', amount: 300000000 },
              { debitCredit: 'DEBIT', accountCode: '112', accountNameVi: 'Tiền gửi ngân hàng', amount: 77000000 },
              { debitCredit: 'CREDIT', accountCode: '711', accountNameVi: 'Thu nhập khác (Thu thanh lý)', amount: 70000000 },
              { debitCredit: 'CREDIT', accountCode: '33311', accountNameVi: 'Thuế GTGT đầu ra', amount: 7000000 },
            ],
            statutoryNoteVi: 'Giá trị còn lại 50 triệu hạch toán vào TK 811; tiền bán được 70 triệu hạch toán vào TK 711.',
          },
        ],
        keyTakeawayVi: 'Xóa sổ TSCĐ dùng TK 811 (cho giá trị còn lại); thu hồi tiền thanh lý dùng TK 711.',
      },
      {
        id: 'c12-3',
        titleVi: 'Hồ Sơ Pháp Lý Đầy Đủ Cho Nghiệp Vụ Thanh Lý Tài Sản Cố Định',
        summaryVi: 'Biên bản họp hội đồng thanh lý, quyết định thanh lý, biên bản kiểm kê và hóa đơn GTGT xuất bán.',
        contentVi: 'Để cơ quan thuế công nhận khoản giá trị còn lại hạch toán vào TK 811 là chi phí được trừ, doanh nghiệp bắt buộc phải có đầy đủ bộ hồ sơ: Quyết định thành lập Hội đồng thanh lý TSCĐ; Biên bản đánh giá hiện trạng tài sản (hư hỏng, lạc hậu kỹ thuật); Quyết định thanh lý của Giám đốc; Biên bản thanh lý TSCĐ (Mẫu 02-TSCĐ); Hợp đồng mua bán và Hóa đơn điện tử xuất giao cho bên mua.',
        keyTakeawayVi: 'Thanh lý TSCĐ thiếu Biên bản thanh lý và Hóa đơn điện tử sẽ bị gạt toàn bộ chi phí TK 811 khi quyết toán thuế.',
      },
    ],
  },
];
