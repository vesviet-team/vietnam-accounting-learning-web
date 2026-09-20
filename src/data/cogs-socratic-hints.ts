/**
 * Socratic Pedagogical Hint Database for COGS & Cost Accounting Workbench
 * 3-tier graduated hint ladder:
 * - Level 1: Định Vị & Câu Hỏi Gợi Mở (Positioning & Reflective Socratic Questions - No spoilers)
 * - Level 2: Cơ Sở Pháp Lý & Nguyên Tắc Hạch Toán (Legal Framework & Accounting Principles - VAS 02, IAS 2, TT 200/99, CIT Law)
 * - Level 3: Hướng Dẫn Kỹ Thuật & Mẫu Định Khoản / Đáp Án Tham Chiếu (Technical Guidance & Journal Entries)
 */

export interface CogsSocraticHint {
  level: 1 | 2 | 3;
  titleVi: string;
  subtitleVi: string;
  badgeVi: string;
  contentVi: string;
  keyQuestionsVi?: string[];
  legalBasisVi?: string[];
  accountingPrinciplesVi?: string[];
  technicalGuidanceVi?: string;
  sampleJournalEntriesVi?: Array<{
    debitAccount: string;
    creditAccount: string;
    amount?: number | string;
    descriptionVi: string;
  }>;
  taxGuidanceVi?: string;
}

export interface CogsScenarioHints {
  scenarioId: string;
  scenarioTitleVi: string;
  hints: [CogsSocraticHint, CogsSocraticHint, CogsSocraticHint];
}

export const COGS_SOCRATIC_HINTS: Record<string, CogsScenarioHints> = {
  'scen-cogs-01': {
    scenarioId: 'scen-cogs-01',
    scenarioTitleVi: 'Thương Mại Phân Phối Tiêu Dùng — So Sánh 3 Phương Pháp Xuất Kho',
    hints: [
      {
        level: 1,
        titleVi: 'Nấc 1: Định Vị Luồng Hàng & Câu Hỏi Gợi Mở',
        subtitleVi: 'Quan sát các đợt biến động giá và cơ chế xuất kho mà không tiết lộ số liệu kết quả.',
        badgeVi: 'Nấc 1: Định Vị',
        contentVi:
          'Trong hoạt động thương mại tiêu dùng, đơn giá các lô hàng nhập kho thường có xu hướng thay đổi qua từng thời điểm. ' +
          'Hãy định vị dòng luân chuyển của vật chất và giá trị thông qua các câu hỏi tư duy:',
        keyQuestionsVi: [
          'Khi giá mua hàng nhập kho tăng dần (50.000 đ -> 52.000 đ -> 55.000 đ), phương pháp xuất kho nào sẽ lấy đơn giá của các lô nhập sớm nhất để tính vào giá vốn?',
          'Phương pháp Bình quân cả kỳ dự trữ có tính được ngay giá vốn tại thời điểm xuất kho giữa kỳ không, hay phải đợi đến cuối tháng khi đã chốt toàn bộ số liệu nhập?',
          'Nghiệp vụ xuất 200 hộp sữa gửi đại lý (Mẫu 03/XKNB) đã làm phát sinh doanh thu hay chuyển giao rủi ro cho người mua chưa? Tài khoản đối ứng có phải là TK 632 không?',
          'Tổng giá trị hàng có sẵn để xuất (Tồn đầu + Nhập trong kỳ) có luôn bằng Tổng giá trị xuất + Tồn cuối kỳ trong mọi phương pháp không?',
        ],
      },
      {
        level: 2,
        titleVi: 'Nấc 2: Cơ Sở Pháp Lý & Nguyên Tắc Hạch Toán',
        subtitleVi: 'Khung pháp lý VAS 02, IAS 2, Thông tư 200 & Thông tư 99/2025/TT-BTC.',
        badgeVi: 'Nấc 2: Bản Chất Pháp Lý',
        contentVi:
          'Phương pháp tính giá trị hàng tồn kho xuất kho phải tuân thủ nghiêm ngặt chuẩn mực kế toán và chế độ tài chính hiện hành:',
        legalBasisVi: [
          'Chuẩn mực Kế toán Việt Nam VAS 02 (Hàng tồn kho) Đoạn 13-16: Quy định các phương pháp tính giá trị hàng tồn kho (FIFO, Bình quân gia quyền, Thực tế đích danh). Phương pháp LIFO bị bãi bỏ.',
          'Thông tư 200/2014/TT-BTC & Thông tư 99/2025/TT-BTC (áp dụng từ 01/01/2026): Hướng dẫn tài khoản 156 (Hàng hóa), 157 (Hàng gửi đi bán), 632 (Giá vốn hàng bán).',
          'Nghị định 123/2020/NĐ-CP & Nghị định 70/2025/NĐ-CP: Quy định về Phiếu xuất kho kiêm vận chuyển nội bộ điện tử (Mẫu 03/XKNB).',
        ],
        accountingPrinciplesVi: [
          'Xuất bán hàng hóa tiêu thụ ra ngoài: Nợ TK 632 / Có TK 156 (Ghi nhận giá vốn tương ứng doanh thu thực tế).',
          'Xuất hàng gửi đại lý bán đúng giá hưởng hoa hồng: Nợ TK 157 / Có TK 156. Chưa ghi nhận doanh thu và giá vốn vì hàng chưa tiêu thụ.',
          'Công thức Bình quân cả kỳ: Đơn giá BQ = (Giá trị tồn ĐK + Tổng giá trị nhập trong kỳ) / (Số lượng tồn ĐK + Tổng số lượng nhập trong kỳ).',
          'Công thức Bình quân liên hoàn: Sau mỗi lần nhập kho, tính lại đơn giá BQ = Giá trị tồn trước xuất / Số lượng tồn trước xuất.',
        ],
      },
      {
        level: 3,
        titleVi: 'Nấc 3: Hướng Dẫn Kỹ Thuật & Mẫu Định Khoản',
        subtitleVi: 'Chi tiết từng dòng thẻ kho và đối chiếu kết quả 3 phương pháp.',
        badgeVi: 'Nấc 3: Kỹ Thuật & Mẫu',
        contentVi:
          'Dưới đây là kỹ thuật định khoản chi tiết và đối chiếu đáp án tham chiếu cho từng nghiệp vụ trong tình huống:',
        technicalGuidanceVi:
          '1. Tổng nguồn hàng: 1.000 hộp (50k) + 2.000 hộp (52k) + 1.000 hộp (55k) = 4.000 hộp, tổng giá trị = 209.000.000 đ.\n' +
          '2. Tổng xuất trong kỳ = 1.500 (bán) + 1.800 (bán) + 200 (gửi đại lý) = 3.500 hộp. Tồn cuối kỳ = 500 hộp.\n' +
          '3. Đơn giá BQ cả kỳ = 209.000.000 đ / 4.000 hộp = 52.250 đ/hộp.\n' +
          '4. Theo FIFO: Xuất 1.500 đợt 1 gồm 1.000 x 50k + 500 x 52k = 76.000.000 đ. Xuất 1.800 đợt 2 gồm 1.500 x 52k + 300 x 55k = 94.500.000 đ. Tồn cuối kỳ = 500 hộp x 55k = 27.500.000 đ.',
        sampleJournalEntriesVi: [
          {
            debitAccount: '632',
            creditAccount: '156',
            amount: 'Theo phương pháp chọn (FIFO: 76M / BQ: 78.375M)',
            descriptionVi: 'Xuất bán 1.500 hộp sữa theo PXK-001',
          },
          {
            debitAccount: '632',
            creditAccount: '156',
            amount: 'Theo phương pháp chọn (FIFO: 94.5M / BQ: 94.05M)',
            descriptionVi: 'Xuất bán 1.800 hộp sữa theo PXK-002',
          },
          {
            debitAccount: '157',
            creditAccount: '156',
            amount: 'Theo phương pháp chọn (FIFO: 11M / BQ: 10.45M)',
            descriptionVi: 'Xuất gửi 200 hộp sữa cho đại lý theo Mẫu 03/XKNB',
          },
        ],
        taxGuidanceVi:
          'Hàng gửi đại lý (TK 157) chưa phải kê khai tính thuế TNDN và thuế GTGT đầu ra cho đến khi đại lý lập Bảng kê bán hàng xác nhận đã tiêu thụ.',
      },
    ],
  },

  'scen-cogs-02': {
    scenarioId: 'scen-cogs-02',
    scenarioTitleVi: 'Thép Thăng Long — Chu Kỳ Sốt Giá & Hồ Sơ Vay Vốn Ngân Hàng',
    hints: [
      {
        level: 1,
        titleVi: 'Nấc 1: Định Vị Chiến Lược BCTC & Câu Hỏi Gợi Mở',
        subtitleVi: 'Tư duy phản biện về mục tiêu tài chính của doanh nghiệp trước Hội đồng Tín dụng ngân hàng.',
        badgeVi: 'Nấc 1: Định Vị',
        contentVi:
          'Khi giá thép leo thang qua 4 đợt nhập (12M -> 13.5M -> 14.5M -> 16M), phương pháp tính giá không chỉ là bài toán kỹ thuật mà là quyết định chiến lược quản trị:',
        keyQuestionsVi: [
          'Trong chu kỳ giá tăng liên tục, phương pháp FIFO giữ lại các lô giá cao nhất (16M) trong kho hay đẩy ra giá vốn trước?',
          'Tài sản ngắn hạn và Lợi nhuận trước thuế sẽ cao nhất theo phương pháp nào?',
          'Để thỏa mãn điều kiện giải ngân 20 tỷ của VietinBank (Hệ số thanh toán hiện hành CR >= 1.5, ROE cao), Ban Giám đốc nên lựa chọn phương pháp nào?',
          'Nếu chọn phương pháp đó, doanh nghiệp phải đánh đổi điều gì về mặt thuế TNDN và dòng tiền mặt phải nộp vào ngân sách nhà nước?',
        ],
      },
      {
        level: 2,
        titleVi: 'Nấc 2: Cơ Sở Pháp Lý & Nguyên Tắc Thẩm Định Tín Dụng',
        subtitleVi: 'Khung pháp lý VAS 02, IAS 2, Luật Thuế TNDN và Nguyên tắc Nhất quán kế toán.',
        badgeVi: 'Nấc 2: Bản Chất Pháp Lý',
        contentVi:
          'Việc lựa chọn và thay đổi chính sách kế toán hàng tồn kho phải tuân thủ các nguyên tắc chuẩn mực:',
        legalBasisVi: [
          'VAS 02 Đoạn 13-18 & IAS 2 Đoạn 25: Doanh nghiệp phải áp dụng nhất quán một phương pháp tính giá tồn kho cho các hàng tồn kho có cùng tính chất và công dụng.',
          'VAS 01 (Chuẩn mực chung) — Nguyên tắc Nhất quán (Consistency): Chính sách kế toán đã chọn phải được áp dụng thống nhất ít nhất trong một niên độ kế toán.',
          'Luật Thuế TNDN số 14/2008/QH12 & Thông tư 96/2015/TT-BTC: Thuế suất phổ thông 20%. Thuế TNDN = (Doanh thu - Chi phí được trừ) x 20%.',
          'Quy chuẩn Thẩm định Tín dụng Ngân hàng Thương mại: Chỉ tiêu CR = Tài sản ngắn hạn / Nợ ngắn hạn >= 1.5; Biên lợi nhuận gộp phản ánh sức khỏe tài chính.',
        ],
        accountingPrinciplesVi: [
          'Chiến lược FIFO (Tối ưu BCTC): Giá vốn TK 632 thấp nhất -> Lợi nhuận gộp cao nhất -> Giá trị tồn kho Mã 140 B01 cao nhất (phản ánh sát giá thị trường) -> Tăng uy tín xếp hạng tín dụng.',
          'Chiến lược Bình quân (Tối ưu Thuế): Giá vốn TK 632 cao hơn FIFO -> Lợi nhuận trước thuế thấp hơn -> Số thuế TNDN 20% phải nộp ít hơn ngay trong kỳ -> Giữ lại tiền mặt lưu động.',
          'Nguyên tắc Thuyết minh: Bất kỳ sự thay đổi phương pháp tính giá nào cũng phải được thuyết minh chi tiết trên Thuyết minh BCTC (Mẫu B09-DN).',
        ],
      },
      {
        level: 3,
        titleVi: 'Nấc 3: Kỹ Thuật Lập Luận Hồ Sơ Tín Dụng & Số Liệu Tham Chiếu',
        subtitleVi: 'Bảng đối chiếu 4 chỉ tiêu then chốt và cơ cấu bút toán hạch toán.',
        badgeVi: 'Nấc 3: Kỹ Thuật & Mẫu',
        contentVi:
          'Số liệu phân tích định lượng giữa các phương pháp trên tập dữ liệu Thép Thăng Long:',
        technicalGuidanceVi:
          '1. Tổng nguồn phôi thép: 50 tấn (12M) + 100 tấn (13.5M) + 120 tấn (14.5M) + 80 tấn (16M) = 350 tấn. Tổng tiền = 4.970.000.000 đ.\n' +
          '2. Tổng xuất bán 3 đợt = 80 + 110 + 90 = 280 tấn. Tồn kho cuối kỳ = 70 tấn.\n' +
          '3. Kết quả FIFO:\n' +
          '   - Giá vốn TK 632 = 50x12M + 100x13.5M + 120x14.5M + 10x16M = 3.850.000.000 đ.\n' +
          '   - Tồn kho cuối kỳ TK 156 = 70 tấn x 16.000.000 đ = 1.120.000.000 đ.\n' +
          '   - Doanh thu giả định 5.400.000.000 đ -> Lợi nhuận gộp = 1.550.000.000 đ.\n' +
          '   - Thuế TNDN 20% = 310.000.000 đ. LNST = 1.240.000.000 đ.\n' +
          '4. Kết quả BQ cả kỳ:\n' +
          '   - Đơn giá BQ = 4.970.000.000 đ / 350 tấn = 14.200.000 đ/tấn.\n' +
          '   - Giá vốn TK 632 = 280 tấn x 14.2M = 3.976.000.000 đ (cao hơn FIFO 126M VNĐ).\n' +
          '   - Lợi nhuận gộp = 1.424.000.000 đ -> Thuế TNDN 20% = 284.800.000 đ (tiết kiệm 25.2M VNĐ tiền mặt thuế).',
        sampleJournalEntriesVi: [
          {
            debitAccount: '632',
            creditAccount: '156',
            amount: '3.850.000.000 đ (FIFO) hoặc 3.976.000.000 đ (BQ cả kỳ)',
            descriptionVi: 'Tổng kết chuyển giá vốn xuất bán 280 tấn phôi thép trong kỳ',
          },
          {
            debitAccount: '8211',
            creditAccount: '3334',
            amount: '310.000.000 đ (FIFO) hoặc 284.800.000 đ (BQ)',
            descriptionVi: 'Trích chi phí thuế TNDN hiện hành tạm tính 20%',
          },
        ],
        taxGuidanceVi:
          'Để giải ngân 20 tỷ VietinBank, doanh nghiệp nên duy trì phương pháp FIFO để bảo đảm CR > 1.5 và ROE vượt trội. Khoản thuế TNDN nộp thêm hoàn toàn xứng đáng với hạn mức tín dụng 20 tỷ được cấp.',
      },
    ],
  },

  'scen-cogs-03': {
    scenarioId: 'scen-cogs-03',
    scenarioTitleVi: 'May Xuất Khẩu Thăng Long — Xử Lý Vải Hỏng Vượt Định Mức & Kê Khai Thuế B4',
    hints: [
      {
        level: 1,
        titleVi: 'Nấc 1: Định Vị Chi Phí Bất Thường & Câu Hỏi Gợi Mở',
        subtitleVi: 'Phát hiện sự sai lệch kỹ thuật và ranh giới giữa chi phí sản phẩm (Z) và chi phí thời kỳ.',
        badgeVi: 'Nấc 1: Định Vị',
        contentVi:
          'Khi công nhân vận hành cắt rập sai cữ dao làm tiêu hao 2,1 mét/áo thay vì định mức 1,8 mét/áo, hãy suy ngẫm về nguyên tắc ghi nhận giá thành:',
        keyQuestionsVi: [
          'Phần hao hụt 3.000 mét vải (thành tiền 300.000.000 đ) do lỗi công nhân cắt sai là hao hụt tự nhiên bình thường hay là tổn thất bất thường?',
          'Nếu kế toán cố tình tính 300M này vào giá thành thành phẩm nhập kho (Nợ 155), giá thành đơn vị z của áo jacket sẽ bị đẩy lên cao. Liệu sản phẩm có bán được trên thị trường quốc tế không?',
          'Theo Chuẩn mực Kế toán VAS 02 Đoạn 11, chi phí vượt định mức này phải ghi vào đâu?',
          'Về mặt thuế, cơ quan thuế có cho phép doanh nghiệp trừ 300M tổn thất do lỗi chủ quan này khi tính thuế TNDN không?',
        ],
      },
      {
        level: 2,
        titleVi: 'Nấc 2: Cơ Sở Pháp Lý VAS 02 Đoạn 11 & Luật Thuế TNDN',
        subtitleVi: 'VAS 02, IAS 2 Đoạn 16, Thông tư 96/2015/TT-BTC Điều 4 & Chỉ tiêu B4 Tờ khai 03/TNDN.',
        badgeVi: 'Nấc 2: Bản Chất Pháp Lý',
        contentVi:
          'Quy định pháp luật bắt buộc phải bóc tách chi phí vượt định mức ra khỏi giá thành thành phẩm:',
        legalBasisVi: [
          'VAS 02 Đoạn 11 & IAS 2 Đoạn 16(a): "Chi phí nguyên vật liệu, chi phí nhân công và chi phí sản xuất khác vượt mức bình thường không được tính vào giá thành hàng tồn kho mà phải kết chuyển thẳng vào chi phí sản xuất kinh doanh trong kỳ (Nợ TK 632)".',
          'Thông tư 96/2015/TT-BTC Điều 4 (sửa đổi Điều 6 Thông tư 78/2014/TT-BTC): Phần chi phí nguyên vật liệu vượt mức tiêu hao hợp lý do doanh nghiệp tự xây dựng là CHI PHÍ KHÔNG ĐƯỢC TRỪ khi xác định thu nhập chịu thuế TNDN.',
          'Mẫu 03/TNDN (Tờ khai quyết toán thuế TNDN): Chỉ tiêu B4 — Các khoản chi không được trừ khi xác định thu nhập chịu thuế.',
        ],
        accountingPrinciplesVi: [
          'Chế độ TT 200/99: Chi phí hợp lý đưa vào Z: Nợ 154 / Có 621 (1.8 tỷ), Có 622 (600M), Có 627 (300M). Thành phẩm hoàn thành: Nợ 155 / Có 154 = 2.7 tỷ (z = 270.000 đ/áo).',
          'Chi phí vượt định mức: Hạch toán thẳng Nợ 632 / Có 621 = 300.000.000 đ. Tuyệt đối không qua TK 154 và TK 155.',
          'Chế độ TT 133: Tập hợp chi phí thực tế Nợ 1541: 2.1 tỷ. Bóc tách chi phí vượt định mức: Nợ 632 / Có 1541 = 300.000.000 đ. Nhập kho thành phẩm: Nợ 155 / Có 154 = 2.7 tỷ.',
          'Quyết toán thuế TNDN: Kê khai 300.000.000 đ vào Chỉ tiêu B4. Thuế TNDN nộp thêm = 300M x 20% = 60.000.000 đ.',
        ],
      },
      {
        level: 3,
        titleVi: 'Nấc 3: Mẫu Bút Toán Định Khoản & Hướng Dẫn Kê Khai Chỉ Tiêu B4',
        subtitleVi: 'Chuỗi bút toán kép hoàn chỉnh và phụ biểu giải trình thuế TNDN.',
        badgeVi: 'Nấc 3: Kỹ Thuật & Mẫu',
        contentVi:
          'Toàn bộ chuỗi bút toán định khoản chuẩn xác và biểu mẫu kê khai thuế cho trường hợp May Xuất Khẩu Thăng Long:',
        technicalGuidanceVi:
          '1. Tập hợp chi phí sản xuất thực tế:\n' +
          '   - Chi phí NVL trực tiếp (TK 621): 2.100.000.000 đ\n' +
          '   - Chi phí Nhân công trực tiếp (TK 622): 600.000.000 đ\n' +
          '   - Chi phí Sản xuất chung (TK 627): 300.000.000 đ\n' +
          '2. Bóc tách chi phí vải vượt định mức:\n' +
          '   - Định mức: 10.000 áo x 1,8m x 100k = 1.800.000.000 đ\n' +
          '   - Hao hụt bất thường: 3.000m x 100k = 300.000.000 đ -> Ghi nhận Nợ 632 / Có 621\n' +
          '3. Kết chuyển chi phí hợp lý vào TK 154: Nợ 154 = 1.8B + 0.6B + 0.3B = 2.700.000.000 đ\n' +
          '4. Nhập kho 10.000 áo Jacket hoàn thành: Nợ 155 / Có 154 = 2.700.000.000 đ (z = 270.000 đ/áo)\n' +
          '5. Kê khai thuế TNDN: Ghi 300.000.000 đ vào Chỉ tiêu B4 Tờ khai 03/TNDN. Tăng thuế TNDN 20% = 60.000.000 đ.',
        sampleJournalEntriesVi: [
          {
            debitAccount: '154',
            creditAccount: '621',
            amount: 1_800_000_000,
            descriptionVi: 'Kết chuyển chi phí NVL trực tiếp trong định mức vào giá thành',
          },
          {
            debitAccount: '154',
            creditAccount: '622',
            amount: 600_000_000,
            descriptionVi: 'Kết chuyển chi phí nhân công trực tiếp vào giá thành',
          },
          {
            debitAccount: '154',
            creditAccount: '627',
            amount: 300_000_000,
            descriptionVi: 'Kết chuyển chi phí sản xuất chung vào giá thành',
          },
          {
            debitAccount: '632',
            creditAccount: '621',
            amount: 300_000_000,
            descriptionVi: 'Bóc tách chi phí vải vượt định mức kỹ thuật ghi thẳng vào giá vốn (VAS 02 p11)',
          },
          {
            debitAccount: '155',
            creditAccount: '154',
            amount: 2_700_000_000,
            descriptionVi: 'Nhập kho 10.000 áo jacket hoàn thành (đơn giá thành phẩm z = 270.000 đ/áo)',
          },
        ],
        taxGuidanceVi:
          'Khi cơ quan thuế kiểm tra quyết toán, kế toán phải xuất trình Bảng định mức kỹ thuật ban đầu, Biên bản kiểm kê xác định nguyên nhân hỏng rập cắt và Phụ biểu B4 để chứng minh đã chủ động loại 300M ra khỏi chi phí hợp lý.',
      },
    ],
  },

  'scen-cogs-04': {
    scenarioId: 'scen-cogs-04',
    scenarioTitleVi: 'Điều Chuyển Nội Bộ Mẫu 03/XKNB & Rào Chắn Xuất Âm Kho — Chuỗi Siêu Thị',
    hints: [
      {
        level: 1,
        titleVi: 'Nấc 1: Bản Chất Nghiệp Vụ Điều Chuyển & Cảnh Báo Âm Kho',
        subtitleVi: 'Nhận diện sự khác nhau giữa bán hàng ra bên ngoài và luân chuyển tài sản trong nội bộ doanh nghiệp.',
        badgeVi: 'Nấc 1: Định Vị',
        contentVi:
          'Trong quản trị logistics chuỗi bán lẻ đa điểm, việc điều chuyển hàng giữa các kho chi nhánh diễn ra hàng ngày:',
        keyQuestionsVi: [
          'Khi xuất hàng từ Kho tổng sang Siêu thị Cầu Giấy, quyền sở hữu hàng hóa đã thay đổi chưa? Công ty đã thu được tiền hoặc quyền đòi tiền chưa?',
          'Tại sao Phiếu xuất kho kiêm vận chuyển nội bộ điện tử (Mẫu 03/XKNB) lại hạch toán Nợ 157 chứ không hạch toán Nợ 632?',
          'Nếu một giao dịch xuất bán yêu cầu xuất 800 thùng dầu ăn nhưng sổ sách chỉ còn 200 thùng, hệ thống sẽ phản ứng như thế nào?',
          'Hành vi cố tình cho phép xuất âm kho vi phạm điều khoản nào của Luật Kế toán Việt Nam?',
        ],
      },
      {
        level: 2,
        titleVi: 'Nấc 2: Cơ Sở Pháp Lý Nghị Định 123/2020 & Luật Kế Toán 88/2015',
        subtitleVi: 'Nghị định 123, Nghị định 70/2025, Thông tư 200 và Luật Kế toán 88/2015.',
        badgeVi: 'Nấc 2: Bản Chất Pháp Lý',
        contentVi:
          'Quy định pháp lý về luân chuyển nội bộ và yêu cầu tính trung thực của sổ kế toán:',
        legalBasisVi: [
          'Nghị định 123/2020/NĐ-CP Điều 8 & Nghị định 70/2025/NĐ-CP: Bắt buộc sử dụng Phiếu xuất kho kiêm vận chuyển nội bộ điện tử (Mẫu 03/XKNB) có mã của cơ quan thuế khi lưu thông hàng hóa trên đường.',
          'Thông tư 200/2014/TT-BTC Điều 27: Tài khoản 157 (Hàng gửi đi bán) dùng để phản ánh hàng hóa gửi đại lý hoặc chuyển giao giữa các đơn vị trực thuộc không hạch toán phụ thuộc.',
          'Thông tư 133/2016/TT-BTC: Không sử dụng TK 157. Các doanh nghiệp vừa và nhỏ theo dõi hàng gửi bán và điều chuyển chi tiết ngay trên TK 156 (hoặc sổ chi tiết địa điểm kho).',
          'Luật Kế toán 88/2015/QH13 Điều 13: Nghiêm cấm hành vi để ngoài sổ kế toán hoặc phản ánh sai lệch tình trạng tài sản (xuất âm kho tạo số dư âm bất hợp pháp).',
        ],
        accountingPrinciplesVi: [
          'Xuất điều chuyển kho: Nợ TK 157 / Có TK 156 (Chưa phát sinh doanh thu và chưa kết chuyển giá vốn TK 632).',
          'Khi chi nhánh bán được lẻ cho khách hàng: Chi nhánh gửi Bảng kê tiêu thụ, lúc này trụ sở chính mới ghi nhận Doanh thu Nợ 111, 112, 131 / Có 511, 3331 và kết chuyển Giá vốn Nợ 632 / Có 157.',
          'Rào chắn xuất âm: Tại mọi thời điểm giao dịch, điều kiện tiên quyết: Số lượng xuất <= Tồn đầu + Lũy kế nhập trước đó. Nếu vi phạm, hệ thống từ chối thực thi.',
        ],
      },
      {
        level: 3,
        titleVi: 'Nấc 3: Kỹ Thuật Hạch Toán Đối Ứng & Xử Lý Sự Cố Âm Kho',
        subtitleVi: 'Mẫu định khoản điều chuyển kho và quy trình khắc phục cảnh báo xuất âm.',
        badgeVi: 'Nấc 3: Kỹ Thuật & Mẫu',
        contentVi:
          'Kỹ thuật định khoản chi tiết cho các nghiệp vụ chuỗi siêu thị MartVina:',
        technicalGuidanceVi:
          '1. Nhập kho ban đầu: Nợ 156 / Có 331: 1.000 thùng x 315k = 315.000.000 đ.\n' +
          '2. Xuất điều chuyển CN Cầu Giấy (Mẫu 03/XKNB): 400 thùng theo đơn giá bình quân liên hoàn -> Nợ 157 / Có 156.\n' +
          '3. Xuất bán buôn Kho tổng: 600 thùng -> Nợ 632 / Có 156.\n' +
          '4. Xuất điều chuyển CN Hà Đông (Mẫu 03/XKNB): 300 thùng -> Nợ 157 / Có 156.\n' +
          '5. Xử lý rào chắn âm kho: Khi nhân viên logistics nhập lệnh xuất vượt số dư khả dụng, giao diện sẽ bôi đỏ cảnh báo và khóa nút lưu cho đến khi số lượng được điều chỉnh hợp lệ.',
        sampleJournalEntriesVi: [
          {
            debitAccount: '157',
            creditAccount: '156',
            amount: 'Theo đơn giá bình quân tại ngày xuất',
            descriptionVi: 'Xuất điều chuyển sang Siêu thị Cầu Giấy theo Phiếu XK kiêm VCNB điện tử Mẫu 03/XKNB',
          },
          {
            debitAccount: '632',
            creditAccount: '156',
            amount: 'Theo đơn giá bình quân tại ngày xuất',
            descriptionVi: 'Xuất bán buôn tại Kho tổng theo PXK-MART-01',
          },
          {
            debitAccount: '157',
            creditAccount: '156',
            amount: 'Theo đơn giá bình quân tại ngày xuất',
            descriptionVi: 'Xuất điều chuyển sang Siêu thị Hà Đông theo Phiếu XK kiêm VCNB điện tử Mẫu 03/XKNB',
          },
        ],
        taxGuidanceVi:
          'Theo Nghị định 123, Phiếu 03/XKNB điện tử hợp lệ phải được truyền dữ liệu về cơ quan thuế. Khi quản lý thị trường kiểm tra trên đường, tài xế chỉ cần xuất trình mã tra cứu hóa đơn điện tử.',
      },
    ],
  },
};

export function getCogsHintsForScenario(scenarioId: string): CogsScenarioHints | undefined {
  return COGS_SOCRATIC_HINTS[scenarioId];
}
