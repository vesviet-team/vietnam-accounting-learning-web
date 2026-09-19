import { DailyLesson } from '@/types/curriculum';

export const MODULE_5_LESSONS: DailyLesson[] = [
  {
    day: 13,
    moduleNumber: 5,
    moduleTitleVi: 'Khối 5: Kế Toán Tiền Lương & Các Khoản Trích Theo Lương',
    dayTitleVi: 'Ngày 13: Kế Toán Tiền Lương & Các Khoản Phải Trả Người Lao Động (TK 334)',
    estimatedMinutes: 19,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c13-1',
        titleVi: 'Kết Cấu & Nội Dung Phản Ánh Của Tài Khoản 334',
        summaryVi: 'TK 334 phản ánh toàn bộ các khoản tiền lương, tiền công, phụ cấp và các khoản phải trả cho người lao động.',
        contentVi: 'Tài khoản 334 thuộc Loại 3 (Nợ phải trả). Bên Có: Các khoản tiền lương, tiền thưởng, phụ cấp phải trả cho người lao động phát sinh trong kỳ (tính vào chi phí doanh nghiệp); Bên Nợ: Các khoản đã thanh toán cho người lao động (bằng tiền mặt, tiền gửi), các khoản trích trừ vào lương (bảo hiểm 10.5%, thuế TNCN, tạm ứng); Số dư cuối kỳ thường nằm bên CÓ phản ánh số tiền lương còn nợ nhân viên.',
        keyTakeawayVi: 'Tính lương tháng nào hạch toán vào chi phí tháng đó (Có TK 334) theo đúng nguyên tắc cơ sở dồn tích.',
      },
      {
        id: 'c13-2',
        titleVi: 'Bút Toán Phân Bổ Chi Phí Tiền Lương Theo Bộ Phận',
        summaryVi: 'Lương bộ phận nào hạch toán vào chi phí bộ phận đó: 622/154 (Sản xuất), 641/6421 (Bán hàng), 642/6422 (Quản lý).',
        contentVi: 'Cuối tháng, dựa trên Bảng thanh toán tiền lương và Bảng chấm công: (1) Lương công nhân trực tiếp sản xuất: Nợ TK 622 (TT 200) hoặc Nợ TK 1542 (TT 133) / Có TK 334; (2) Lương nhân viên bán hàng: Nợ TK 641 (TT 200) hoặc Nợ TK 6421 (TT 133) / Có TK 334; (3) Lương nhân viên văn phòng quản lý: Nợ TK 642 (TT 200) hoặc Nợ TK 6422 (TT 133) / Có TK 334.',
        journalExamples: [
          {
            descriptionVi: 'Tính tiền lương phải trả tháng 9 cho toàn bộ nhân viên công ty (Tổng quỹ lương 120.000.000đ)',
            entries: [
              { debitCredit: 'DEBIT', accountCode: '622', accountNameVi: 'Chi phí nhân công trực tiếp', amount: 60000000 },
              { debitCredit: 'DEBIT', accountCode: '641', accountNameVi: 'Chi phí bán hàng', amount: 30000000 },
              { debitCredit: 'DEBIT', accountCode: '642', accountNameVi: 'Chi phí quản lý doanh nghiệp', amount: 30000000 },
              { debitCredit: 'CREDIT', accountCode: '334', accountNameVi: 'Phải trả người lao động', amount: 120000000 },
            ],
            statutoryNoteVi: 'Trong Thông tư 133, Nợ 622 thay bằng Nợ 1542; Nợ 641 thay bằng Nợ 6421.',
          },
        ],
        keyTakeawayVi: 'Phân bổ chi phí tiền lương đúng bộ phận quyết định tính chính xác của giá thành sản phẩm và lãi lỗ kinh doanh.',
      },
      {
        id: 'c13-3',
        titleVi: 'Hồ Sơ Hợp Lý Hóa Chi Phí Lương Khi Quyết Toán Thuế TNDN',
        summaryVi: 'Hợp đồng lao động, bảng chấm công, bảng tính lương có ký nhận và chứng từ chi trả ngân hàng.',
        contentVi: 'Theo Điều 4 Thông tư 96/2015/TT-BTC, để chi phí tiền lương được tính vào chi phí được trừ khi quyết toán thuế TNDN, doanh nghiệp bắt buộc phải có: Hợp đồng lao động hợp pháp; Quy chế tài chính hoặc Quy chế lương thưởng; Bảng chấm công hàng ngày; Bảng tính và thanh toán tiền lương; Chứng từ thanh toán lương (UNC chuyển khoản ngân hàng hoặc Phiếu chi có chữ ký người nhận); và hồ sơ đóng bảo hiểm xã hội hợp lệ.',
        keyTakeawayVi: 'Tiền lương hạch toán trên sổ nhưng đến hạn nộp hồ sơ quyết toán năm thực tế chưa chi trả sẽ bị loại trừ chi phí thuế.',
      },
    ],
  },
  {
    day: 14,
    moduleNumber: 5,
    moduleTitleVi: 'Khối 5: Kế Toán Tiền Lương & Các Khoản Trích Theo Lương',
    dayTitleVi: 'Ngày 14: Tỷ Lệ Trích Bảo Hiểm Bắt Buộc (TK 338 - DN 23.5%, NLĐ 10.5%) & KPCĐ 2%',
    estimatedMinutes: 20,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c14-1',
        titleVi: 'Bảng Tỷ Lệ Trích Bảo Hiểm Bắt Buộc Chuẩn Luật Hiện Hành (Tổng Cộng 34%)',
        summaryVi: 'Doanh nghiệp chịu 23.5% tính vào chi phí SXKD; Người lao động chịu 10.5% trừ trực tiếp vào lương.',
        contentVi: 'Tỷ lệ trích các khoản theo lương áp dụng thống nhất: (1) Doanh nghiệp chịu 23.5%: BHXH (17.5%), BHYT (3%), BHTN (1%), Kinh phí công đoàn (2%); tính thẳng vào chi phí Nợ 622, 641, 642 (TT 200) hoặc Nợ 154, 642 (TT 133); (2) Người lao động chịu 10.5%: BHXH (8%), BHYT (1.5%), BHTN (1%); kế toán khấu trừ trực tiếp vào lương Nợ 334. Cả hai phần đều nộp vào tài khoản cơ quan BHXH qua TK 338.',
        keyTakeawayVi: 'Tỷ lệ 34%: 23.5% tính vào chi phí công ty, 10.5% khấu trừ từ tiền lương của nhân viên.',
      },
      {
        id: 'c14-2',
        titleVi: 'Các Tiểu Khoản Chi Tiết Của Tài Khoản 338 (Phải Trả, Phải Nộp Khác)',
        summaryVi: 'TK 3382 (KPCĐ), TK 3383 (BHXH), TK 3384 (BHYT), TK 3386 (BHTN).',
        contentVi: 'Kế toán tiền lương theo dõi chi tiết nghĩa vụ bảo hiểm trên các tiểu khoản: TK 3382 (Kinh phí công đoàn - nộp cho Liên đoàn Lao động quận/huyện); TK 3383 (Bảo hiểm xã hội); TK 3384 (Bảo hiểm y tế); TK 3386 (Bảo hiểm thất nghiệp). Khi trích: Ghi CÓ TK 338 (3382, 3383, 3384, 3386); Khi lập Ủy nhiệm chi nộp tiền cho cơ quan BHXH: Ghi NỢ TK 338 / CÓ TK 112.',
        detailedTAccounts: [
          {
            accountCode: '338',
            accountNameVi: 'Phải trả, phải nộp khác (Bảo hiểm bắt buộc)',
            accountClass: 3,
            normalBalance: 'CREDIT',
            openingBalance: { side: 'CREDIT', amount: 0 },
            entries: [
              { id: 'bh1', description: 'Trích BHXH, BHYT, BHTN, KPCĐ tính vào chi phí DN (23.5%)', amount: 23500000, side: 'CREDIT', counterAccountCode: '642' },
              { id: 'bh2', description: 'Trích BHXH, BHYT, BHTN trừ lương nhân viên (10.5%)', amount: 10500000, side: 'CREDIT', counterAccountCode: '334' },
              { id: 'bh3', description: 'Chuyển khoản UNC nộp toàn bộ bảo hiểm cho BHXH', amount: 34000000, side: 'DEBIT', counterAccountCode: '112' },
            ],
            explanationVi: 'Số dư cuối kỳ = 0 + 23.500.000 + 10.500.000 - 34.000.000 = 0 VNĐ. Đã thanh toán trọn vẹn nghĩa vụ bảo hiểm.',
          },
        ],
        keyTakeawayVi: 'Số trích Có 338 hàng tháng bằng tổng 34% quỹ lương đóng bảo hiểm; khi nộp ghi Nợ 338 / Có 112.',
      },
      {
        id: 'c14-3',
        titleVi: 'Mức Trần Đóng Bảo Hiểm Xã Hội & Bảo Hiểm Thất Nghiệp',
        summaryVi: 'Mức trần đóng BHXH/BHYT bằng 20 lần mức lương cơ sở; mức trần BHTN bằng 20 lần mức lương tối thiểu vùng.',
        contentVi: 'Tiền lương tháng đóng BHXH không phải là vô hạn. Pháp luật quy định mức lương đóng tối đa: (1) Với BHXH, BHYT: Tối đa bằng 20 lần mức lương cơ sở; (2) Với BHTN: Tối đa bằng 20 lần mức lương tối thiểu vùng. Nếu người lao động có mức lương ký hợp đồng 60 triệu đồng, phần vượt trên mức trần tối đa sẽ không phải trích đóng bảo hiểm.',
        keyTakeawayVi: 'Người có thu nhập cao được khống chế mức trần đóng bảo hiểm, phần thu nhập vượt trần chỉ chịu thuế TNCN.',
      },
    ],
  },
  {
    day: 15,
    moduleNumber: 5,
    moduleTitleVi: 'Khối 5: Kế Toán Tiền Lương & Các Khoản Trích Theo Lương',
    dayTitleVi: 'Ngày 15: Khấu Trừ Thuế TNCN (TK 3335), Tính Lương Gross-to-Net & Thanh Toán Lương',
    estimatedMinutes: 20,
    isMilestoneDay: true,
    concepts: [
      {
        id: 'c15-1',
        titleVi: 'Công Thức Tính Lương Gross Sang Net & Các Khoản Giảm Trừ',
        summaryVi: 'Lương Net = Lương Gross - Bảo hiểm bắt buộc (10.5%) - Thuế TNCN (nếu có).',
        contentVi: 'Thu nhập chịu thuế = Tổng thu nhập trừ các khoản phụ cấp miễn thuế (ăn trưa trong định mức, đồng phục, phụ cấp điện thoại theo quy chế). Thu nhập tính thuế = Thu nhập chịu thuế trừ các khoản giảm trừ (Bảo hiểm 10.5%, Giảm trừ bản thân 11 triệu/tháng, Giảm trừ người phụ thuộc 4.4 triệu/người/tháng, đóng góp từ thiện). Áp dụng Biểu thuế lũy tiến từng phần (từ 5% đến 35%) để tính thuế TNCN.',
        keyTakeawayVi: 'Lương Net là số tiền thực tế đổ vào tài khoản ATM của người lao động sau khi trừ bảo hiểm và thuế TNCN.',
      },
      {
        id: 'c15-2',
        titleVi: 'Kế Toán Khấu Trừ Thuế TNCN Tại Nguồn (TK 3335)',
        summaryVi: 'Khấu trừ thuế TNCN ghi Nợ TK 334 / Có TK 3335; khi nộp thuế vào ngân sách ghi Nợ TK 3335 / Có TK 112.',
        contentVi: 'Doanh nghiệp có trách nhiệm khấu trừ thuế TNCN tại nguồn trước khi chi trả thu nhập cho người lao động: Bút toán khấu trừ: Ghi NỢ TK 334 / CÓ TK 3335. Định kỳ hàng tháng hoặc hàng quý, doanh nghiệp lập Tờ khai thuế TNCN Mẫu 05/KK-TNCN và nộp tiền thuế vào Kho bạc Nhà nước: Ghi NỢ TK 3335 / CÓ TK 112.',
        journalExamples: [
          {
            descriptionVi: 'Khấu trừ thuế TNCN tháng 9 của người lao động số tiền 4.200.000đ và chuyển khoản trả lương Net 85.300.000đ',
            entries: [
              { debitCredit: 'DEBIT', accountCode: '334', accountNameVi: 'Phải trả người lao động', amount: 4200000 },
              { debitCredit: 'CREDIT', accountCode: '3335', accountNameVi: 'Thuế thu nhập cá nhân', amount: 4200000 },
              { debitCredit: 'DEBIT', accountCode: '334', accountNameVi: 'Phải trả người lao động', amount: 85300000 },
              { debitCredit: 'CREDIT', accountCode: '112', accountNameVi: 'Tiền gửi ngân hàng', amount: 85300000 },
            ],
            statutoryNoteVi: 'Thanh toán tiền lương qua ngân hàng (Nợ 334 / Có 112) là bằng chứng thanh toán an toàn và minh bạch nhất.',
          },
        ],
        keyTakeawayVi: 'Khấu trừ thuế TNCN làm giảm nghĩa vụ nợ lương người lao động (Nợ 334) và tăng nghĩa vụ nộp thuế (Có 3335).',
      },
      {
        id: 'c15-3',
        titleVi: 'Quy Trình Chi Trả Lương & Quyết Toán Thuế TNCN Cuối Năm',
        summaryVi: 'Lập UNC chuyển khoản lương theo danh sách bảng kê ngân hàng và cấp chứng từ khấu trừ thuế TNCN.',
        contentVi: 'Ngày trả lương, kế toán gửi Bảng lương chi tiết và Danh sách chi lương kèm UNC sang ngân hàng để thực hiện ủy nhiệm chi lô (Batch payroll transfer). Cuối năm tài chính, doanh nghiệp thực hiện quyết toán thuế TNCN thay cho người lao động có ủy quyền quyết toán theo Mẫu 05/QTT-TNCN và cấp chứng từ khấu trừ thuế TNCN điện tử cho người lao động không ủy quyền.',
        keyTakeawayVi: 'Quyết toán thuế TNCN cuối năm giúp hoàn thuế nếu nộp thừa hoặc thu thêm thuế nếu nộp thiếu trong năm.',
      },
    ],
  },
];
