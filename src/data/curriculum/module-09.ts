import { DailyLesson } from '@/types/curriculum';

export const MODULE_9_LESSONS: DailyLesson[] = [
  {
    day: 25,
    moduleNumber: 9,
    moduleTitleVi: 'Khối 9: Bút Toán Khóa Sổ & Xác Định Kết Quả Kinh Doanh (TK 911)',
    dayTitleVi: 'Ngày 25: Trình Tự Khóa Sổ Kế Toán, Trích Trước Chi Phí (TK 335) & Bút Toán Điều Chỉnh',
    estimatedMinutes: 20,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c25-1',
        titleVi: 'Ý Nghĩa & 6 Bước Của Quy Trình Khóa Sổ Kế Toán Kỳ Kế Toán',
        summaryVi: 'Khóa sổ là thao tác chốt số liệu kế toán sau khi đã rà soát, đối chiếu và thực hiện các bút toán điều chỉnh.',
        contentVi: 'Quy trình khóa sổ kế toán cuối tháng/cuối năm gồm 6 bước chặt chẽ: (1) Kiểm kê quỹ tiền mặt, đối chiếu số dư tiền gửi ngân hàng với Sổ phụ; (2) Đối chiếu công nợ khách hàng (131) và công nợ nhà cung cấp (331); (3) Kiểm kê kho, rà soát chênh lệch hàng tồn kho; (4) Thực hiện các bút toán điều chỉnh (khấu hao 214, phân bổ 242, trích trước 335, dự phòng 229); (5) Đánh giá lại số dư ngoại tệ cuối kỳ; (6) Kết chuyển doanh thu chi phí vào TK 911 và khóa sổ cái.',
        keyTakeawayVi: 'Khóa sổ là bước chuyển cốt tử bảo đảm toàn bộ doanh thu và chi phí trong kỳ được phản ánh đầy đủ và chính xác.',
      },
      {
        id: 'c25-2',
        titleVi: 'Kế Toán Chi Phí Trích Trước (TK 335) & Tránh Vi Phạm Cut-Off',
        summaryVi: 'TK 335 phản ánh các khoản chi phí thực tế chưa phát sinh hóa đơn nhưng chắc chắn phải trả cho dịch vụ đã sử dụng.',
        contentVi: 'Theo nguyên tắc dồn tích, nếu chi phí phát sinh trong tháng này nhưng hóa đơn tháng sau mới về (ví dụ: tiền điện nước tháng 12 đến tháng 1 mới có hóa đơn, tiền lãi vay trả sau, trích trước chi phí sửa chữa lớn theo kế hoạch): Kế toán trích trước ghi Nợ TK 642, 635 / Có TK 335. Sang tháng sau khi nhận hóa đơn chính thức: ghi Nợ TK 335, Nợ TK 133 / Có TK 112, 331.',
        journalExamples: [
          {
            descriptionVi: 'Trích trước tiền lãi vay ngân hàng tháng 9 chưa đến kỳ thanh toán số tiền 15.000.000đ',
            entries: [
              { debitCredit: 'DEBIT', accountCode: '635', accountNameVi: 'Chi phí tài chính (Lãi vay)', amount: 15000000 },
              { debitCredit: 'CREDIT', accountCode: '335', accountNameVi: 'Chi phí phải trả (Trích trước)', amount: 15000000 },
            ],
            statutoryNoteVi: 'Đảm bảo chi phí lãi vay của tháng 9 được ghi nhận đúng vào kết quả kinh doanh tháng 9.',
          },
        ],
        keyTakeawayVi: 'Trích trước chi phí qua TK 335 giúp ghi nhận đúng kỳ kinh doanh, không bị dồn chi phí sang kỳ sau.',
      },
      {
        id: 'c25-3',
        titleVi: 'Trích Lập Các Khoản Dự Phòng Giảm Giá & Nợ Phải Thu Khó Đòi (TK 229)',
        summaryVi: 'TK 229 là tài khoản điều chỉnh giảm tài sản (Contra-asset) phản ánh nguyên tắc Thận trọng (Prudence).',
        contentVi: 'Cuối niên độ kế toán, nếu giá thị trường của hàng tồn kho giảm xuống dưới giá gốc: trích lập dự phòng giảm giá hàng tồn kho Nợ 632 / Có 2294. Nếu công nợ khách hàng quá hạn thanh toán từ 6 tháng trở lên có nguy cơ mất vốn: trích lập dự phòng nợ phải thu khó đòi Nợ 642 / Có 2293. TK 229 có số dư CÓ và được trình bày là số âm bên cột Tài sản trên Bảng cân đối kế toán.',
        keyTakeawayVi: 'Trích lập dự phòng TK 229 bảo vệ doanh nghiệp không thổi phồng giá trị tài sản trên Báo cáo tài chính.',
      },
    ],
  },
  {
    day: 26,
    moduleNumber: 9,
    moduleTitleVi: 'Khối 9: Bút Toán Khóa Sổ & Xác Định Kết Quả Kinh Doanh (TK 911)',
    dayTitleVi: 'Ngày 26: Kỹ Thuật Kết Chuyển Doanh Thu & Chi Phí Vào TK 911 (Nguyên Tắc Dư Bằng 0)',
    estimatedMinutes: 20,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c26-1',
        titleVi: 'Bản Chất Tài Khoản 911 (Xác Định Kết Quả Kinh Doanh) - Tài Khoản Không Có Số Dư',
        summaryVi: 'TK 911 là trung tâm điều hòa kết chuyển tập hợp toàn bộ doanh thu và chi phí để xác định lãi hoặc lỗ trong kỳ.',
        contentVi: 'Tài khoản 911 không có số dư đầu kỳ và không bao giờ có số dư cuối kỳ. Bên Có TK 911: Tập hợp các khoản Doanh thu thuần (511), Doanh thu tài chính (515) và Thu nhập khác (711). Bên Nợ TK 911: Tập hợp các khoản Chi phí giá vốn (632), Chi phí tài chính (635), Chi phí bán hàng (641/6421), Chi phí quản lý (642/6422), Chi phí khác (811) và Chi phí thuế TNDN (8211).',
        keyTakeawayVi: 'Quy tắc vàng: Số dư cuối kỳ của Tài khoản 911 bắt buộc phải bằng 0.00 VNĐ tuyệt đối.',
      },
      {
        id: 'c26-2',
        titleVi: 'Trình Tự Bút Toán Kết Chuyển Doanh Thu & Chi Phí',
        summaryVi: 'Bước 1 kết chuyển Doanh thu sang Có 911; Bước 2 kết chuyển Chi phí sang Nợ 911.',
        contentVi: 'Chuỗi bút toán kết chuyển chuẩn mực: (1) Kết chuyển Doanh thu & Thu nhập: Ghi Nợ TK 511, Nợ TK 515, Nợ TK 711 / Có TK 911; (2) Kết chuyển Chi phí SXKD & Chi phí khác: Ghi Nợ TK 911 / Có TK 632, Có TK 635, Có TK 641 (hoặc 6421), Có TK 642 (hoặc 6422), Có TK 811; (3) So sánh phát sinh Có 911 và phát sinh Nợ 911 để tính Lợi nhuận kế toán trước thuế.',
        journalExamples: [
          {
            descriptionVi: 'Kết chuyển toàn bộ doanh thu và chi phí tháng 9 vào TK 911 để xác định kết quả kinh doanh',
            entries: [
              { debitCredit: 'DEBIT', accountCode: '511', accountNameVi: 'Doanh thu bán hàng và cung cấp dịch vụ', amount: 500000000 },
              { debitCredit: 'DEBIT', accountCode: '515', accountNameVi: 'Doanh thu hoạt động tài chính', amount: 10000000 },
              { debitCredit: 'CREDIT', accountCode: '911', accountNameVi: 'Xác định kết quả kinh doanh', amount: 510000000 },
              { debitCredit: 'DEBIT', accountCode: '911', accountNameVi: 'Xác định kết quả kinh doanh', amount: 410000000 },
              { debitCredit: 'CREDIT', accountCode: '632', accountNameVi: 'Giá vốn hàng bán', amount: 300000000 },
              { debitCredit: 'CREDIT', accountCode: '635', accountNameVi: 'Chi phí tài chính', amount: 20000000 },
              { debitCredit: 'CREDIT', accountCode: '641', accountNameVi: 'Chi phí bán hàng', amount: 40000000 },
              { debitCredit: 'CREDIT', accountCode: '642', accountNameVi: 'Chi phí quản lý doanh nghiệp', amount: 50000000 },
            ],
            statutoryNoteVi: 'Chênh lệch bên Có 911 lớn hơn bên Nợ 911 là 100.000.000đ (Lợi nhuận kế toán trước thuế).',
          },
        ],
        keyTakeawayVi: 'Kết chuyển xong thì toàn bộ tài khoản Loại 5, 6, 7, 8 đều có số dư cuối kỳ bằng 0.',
      },
      {
        id: 'c26-3',
        titleVi: 'Sơ Đồ Chữ T Minh Họa Dòng Chảy Về Tài Khoản 911',
        summaryVi: 'Trực quan hóa sự hội tụ của doanh thu và chi phí tại tâm điểm Tài khoản 911.',
        contentVi: 'Sơ đồ chữ T của TK 911 thể hiện trực quan cán cân lãi lỗ. Tổng phát sinh Có (Doanh thu) đối kháng với Tổng phát sinh Nợ (Chi phí). Khi kết chuyển lãi sang TK 4212, kế toán ghi Nợ TK 911 để cân bằng số phát sinh hai bên, trả số dư TK 911 về đúng 0 VNĐ.',
        detailedTAccounts: [
          {
            accountCode: '911',
            accountNameVi: 'Xác định kết quả kinh doanh',
            accountClass: 9,
            normalBalance: 'ZERO',
            openingBalance: { side: 'DEBIT', amount: 0 },
            entries: [
              { id: 'kc1', description: 'Kết chuyển doanh thu bán hàng (Nợ 511)', amount: 500000000, side: 'CREDIT', counterAccountCode: '511' },
              { id: 'kc2', description: 'Kết chuyển doanh thu tài chính (Nợ 515)', amount: 10000000, side: 'CREDIT', counterAccountCode: '515' },
              { id: 'kc3', description: 'Kết chuyển giá vốn hàng bán (Có 632)', amount: 300000000, side: 'DEBIT', counterAccountCode: '632' },
              { id: 'kc4', description: 'Kết chuyển chi phí tài chính (Có 635)', amount: 20000000, side: 'DEBIT', counterAccountCode: '635' },
              { id: 'kc5', description: 'Kết chuyển chi phí bán hàng (Có 641)', amount: 40000000, side: 'DEBIT', counterAccountCode: '641' },
              { id: 'kc6', description: 'Kết chuyển chi phí quản lý (Có 642)', amount: 50000000, side: 'DEBIT', counterAccountCode: '642' },
              { id: 'kc7', description: 'Kết chuyển chi phí thuế TNDN (Có 8211)', amount: 20000000, side: 'DEBIT', counterAccountCode: '8211' },
              { id: 'kc8', description: 'Kết chuyển lãi sau thuế sang Có TK 4212', amount: 80000000, side: 'DEBIT', counterAccountCode: '4212' },
            ],
            explanationVi: 'Tổng phát sinh Nợ (510.000.000đ) = Tổng phát sinh Có (510.000.000đ). Số dư cuối kỳ = 0 VNĐ tuyệt đối.',
          },
        ],
        keyTakeawayVi: 'Nếu sau khi khóa sổ TK 911 còn bất kỳ số dư nào, đó là bằng chứng của sai sót hạch toán.',
      },
    ],
  },
  {
    day: 27,
    moduleNumber: 9,
    moduleTitleVi: 'Khối 9: Bút Toán Khóa Sổ & Xác Định Kết Quả Kinh Doanh (TK 911)',
    dayTitleVi: 'Ngày 27: Chi Phí Thuế TNDN (TK 8211/3334) & Phân Phối Lợi Nhuận Sau Thuế (TK 421)',
    estimatedMinutes: 20,
    isMilestoneDay: true,
    concepts: [
      {
        id: 'c27-1',
        titleVi: 'Cách Tính Chi Phí Thuế Thu Nhập Doanh Nghiệp Hiện Hành (TK 8211)',
        summaryVi: 'Thuế TNDN = (Lợi nhuận kế toán trước thuế + Chi phí không được trừ B4 - Thu nhập miễn thuế) x Thuế suất 20%.',
        contentVi: 'Thuế TNDN không tính đơn thuần trên Lợi nhuận kế toán mà tính trên Thu nhập tính thuế: Thu nhập tính thuế = Lợi nhuận kế toán trước thuế + Các khoản điều chỉnh tăng (Chỉ tiêu B4: Chi phí không có hóa đơn hợp lệ, trích khấu hao xe vượt 1.6 tỷ, phân bổ TK 242 vượt 36 tháng, lãi vay vượt 30% EBITDA) - Các khoản thu nhập miễn thuế (cổ tức được chia). Thuế suất phổ thông hiện hành là 20%. Bút toán trích thuế: Nợ TK 8211 (Chi phí thuế TNDN hiện hành) / Có TK 3334 (Thuế TNDN phải nộp).',
        keyTakeawayVi: 'Thuế TNDN hạch toán vào chi phí Nợ 8211, sau đó kết chuyển Nợ 911 / Có 8211 trước khi tính lãi thuần.',
      },
      {
        id: 'c27-2',
        titleVi: 'Bút Toán Kết Chuyển Lợi Nhuận Hoặc Lỗ Sau Thuế Sang Tài Khoản 4212',
        summaryVi: 'Nếu có Lãi ghi Nợ 911 / Có 4212; Nếu bị Lỗ ghi Nợ 4212 / Có 911.',
        contentVi: 'Sau khi đã trừ chi phí thuế TNDN (TK 8211): (1) Nếu doanh nghiệp kinh doanh CÓ LÃI (Tổng doanh thu > Tổng chi phí): Ghi NỢ TK 911 / CÓ TK 4212 (Lợi nhuận sau thuế chưa phân phối năm nay); (2) Nếu doanh nghiệp kinh doanh BỊ LỖ (Tổng chi phí > Tổng doanh thu): Ghi NỢ TK 4212 / CÓ TK 911. Lưu ý: TK 421 thuộc Loại 4 (Vốn CSH), nếu doanh nghiệp bị lỗ thì TK 421 có SỐ DƯ NỢ (ghi âm bên Nguồn vốn trên Bảng CĐKT).',
        detailedTAccounts: [
          {
            accountCode: '4212',
            accountNameVi: 'Lợi nhuận sau thuế chưa phân phối năm nay',
            accountClass: 4,
            normalBalance: 'CREDIT',
            openingBalance: { side: 'CREDIT', amount: 0 },
            entries: [
              { id: 'ln1', description: 'Kết chuyển lãi ròng sau thuế tháng 9 từ TK 911', amount: 80000000, side: 'CREDIT', counterAccountCode: '911' },
            ],
            explanationVi: 'Số dư cuối kỳ = 80.000.000 VNĐ (Dư Có). Phản ánh lợi nhuận thuần tích lũy của năm tài chính.',
          },
        ],
        keyTakeawayVi: 'TK 4212 phản ánh lợi nhuận sau thuế của năm tài chính hiện hành; sang năm sau sẽ chuyển sang TK 4211.',
      },
      {
        id: 'c27-3',
        titleVi: 'Tạm Nộp Thuế TNDN Theo Quý & Nguyên Tắc Khống Chế 80%',
        summaryVi: 'Tổng số thuế TNDN đã tạm nộp của 4 quý không được thấp hơn 80% số thuế TNDN phải nộp theo quyết toán năm.',
        contentVi: 'Theo Nghị định 126/2020/NĐ-CP (sửa đổi bởi Nghị định 91/2022/NĐ-CP): Doanh nghiệp tự xác định số thuế TNDN tạm nộp hàng quý (chậm nhất vào ngày 30 của tháng đầu quý sau). Tổng số thuế TNDN đã tạm nộp của 04 quý không được thấp hơn 80% số thuế TNDN phải nộp theo tờ khai quyết toán năm. Nếu nộp thiếu quá 20%, doanh nghiệp sẽ bị tính tiền chậm nộp 0.03%/ngày trên số tiền nộp thiếu.',
        keyTakeawayVi: 'Kiểm soát hạn mức tạm nộp 4 quý đạt tối thiểu 80% để tránh bị cơ quan thuế tính tiền chậm nộp.',
      },
    ],
  },
];
