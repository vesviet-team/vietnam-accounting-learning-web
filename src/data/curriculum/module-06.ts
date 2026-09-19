import { DailyLesson } from '@/types/curriculum';

export const MODULE_6_LESSONS: DailyLesson[] = [
  {
    day: 16,
    moduleNumber: 6,
    moduleTitleVi: 'Khối 6: Doanh Thu Bán Hàng, Hóa Đơn NĐ 123 & Các Khoản Giảm Trừ',
    dayTitleVi: 'Ngày 16: 5 Điều Kiện Ghi Nhận Doanh Thu Theo VAS 14 & Quy Tắc Giao Hàng Thành Công',
    estimatedMinutes: 20,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c16-1',
        titleVi: '5 Tiêu Chuẩn Đồng Thời Ghi Nhận Doanh Thu Bán Hàng Theo VAS 14',
        summaryVi: 'Doanh nghiệp chỉ ghi nhận doanh thu bán hàng khi thỏa mãn đồng thời cả 5 điều kiện của Chuẩn mực VAS 14.',
        contentVi: 'Theo Chuẩn mực Kế toán Việt Nam số 14 (VAS 14 - Doanh thu và thu nhập khác), doanh thu bán hàng được ghi nhận khi: (1) Doanh nghiệp đã chuyển giao phần lớn rủi ro và lợi ích gắn liền với quyền sở hữu sản phẩm cho người mua; (2) Doanh nghiệp không còn nắm giữ quyền quản lý như người sở hữu hoặc quyền kiểm soát hàng hóa; (3) Doanh thu được xác định tương đối chắc chắn; (4) Doanh nghiệp đã thu được hoặc sẽ thu được lợi ích kinh tế từ giao dịch; (5) Xác định được chi phí liên quan đến giao dịch bán hàng.',
        keyTakeawayVi: 'Nếu hàng hóa chưa chuyển giao rủi ro cho người mua thì dù đã thu tiền trước cũng chưa được ghi nhận doanh thu.',
      },
      {
        id: 'c16-2',
        titleVi: 'Quy Tắc Bất Biến Về Trạng Thái Giao Hàng Trong Thương Mại Điện Tử & Bán Lẻ',
        summaryVi: 'Hàng đang vận chuyển (In Transit) tuyệt đối cấm ghi nhận doanh thu; phải theo dõi qua TK 157 (Hàng gửi đi bán).',
        contentVi: 'Trong thương mại điện tử hoặc bán buôn giao hàng tận nơi: Khi xuất kho giao cho đơn vị chuyển phát nhanh (GHN, Viettel Post, Shopee Xpress) nhưng người mua chưa nhận: Kế toán xuất kho ghi Nợ TK 157 (Hàng gửi đi bán) / Có TK 156. Tuyệt đối không ghi nhận doanh thu TK 511 tại thời điểm này. Chỉ khi nhận được thông báo giao hàng thành công (Delivered/Completed) có chữ ký nhận hoặc xác nhận của sàn TMĐT thì mới được ghi nhận Doanh thu và Giá vốn.',
        keyTakeawayVi: 'Nghiêm cấm ghi nhận doanh thu sớm khi hàng còn đang trên đường vận chuyển (In Transit).',
      },
      {
        id: 'c16-3',
        titleVi: 'Nhận Tiền Ứng Trước Của Khách Hàng Nhưng Chưa Giao Hàng',
        summaryVi: 'Tiền khách ứng trước phản ánh vào bên Có TK 131 hoặc TK 3387 (Doanh thu chưa thực hiện), không phải doanh thu.',
        contentVi: 'Khi khách hàng chuyển khoản đặt cọc hoặc trả trước 100% tiền mua hàng mà doanh nghiệp chưa bàn giao hàng hóa hoặc chưa hoàn thành dịch vụ: Ghi Nợ TK 112 / Có TK 131 (Dư Có TK 131 - Người mua trả tiền trước). Khoản tiền này bản chất là một món nợ phải trả của doanh nghiệp đối với khách hàng, tuyệt đối không được ghi vào Có TK 511.',
        keyTakeawayVi: 'Thu tiền trước mà chưa giao hàng là một khoản nợ phải trả, không được coi là doanh thu trong kỳ.',
      },
    ],
  },
  {
    day: 17,
    moduleNumber: 6,
    moduleTitleVi: 'Khối 6: Doanh Thu Bán Hàng, Hóa Đơn NĐ 123 & Các Khoản Giảm Trừ',
    dayTitleVi: 'Ngày 17: Cặp Bút Toán Doanh Thu - Giá Vốn & Kế Toán Phải Thu Khách Hàng (TK 131)',
    estimatedMinutes: 20,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c17-1',
        titleVi: 'Cặp Bút Toán Song Song Bắt Buộc Khi Bán Hàng Hoàn Thành',
        summaryVi: 'Luôn luôn hạch toán đồng thời: Bút toán 1 ghi nhận Doanh thu (511) và Bút toán 2 ghi nhận Giá vốn (632).',
        contentVi: 'Khi giao hàng thành công và xuất Hóa đơn GTGT, kế toán thực hiện đồng thời 2 bút toán: (1) Bút toán Doanh thu và thuế đầu ra: Ghi Nợ TK 131, 111, 112 (Tổng giá thanh toán) / Có TK 5111 (Doanh thu bán hàng chưa thuế) / Có TK 33311 (Thuế GTGT đầu ra phải nộp); (2) Bút toán Giá vốn hàng bán: Ghi Nợ TK 632 (Giá vốn hàng bán) / Có TK 156 (hoặc Có TK 157 nếu xuất từ hàng gửi bán).',
        journalExamples: [
          {
            descriptionVi: 'Xuất kho bán lô hàng điện gia dụng: Giá vốn 70.000.000đ; Giá bán chưa thuế 100.000.000đ, VAT 10% chưa thu tiền',
            entries: [
              { debitCredit: 'DEBIT', accountCode: '131', accountNameVi: 'Phải thu của khách hàng', amount: 110000000 },
              { debitCredit: 'CREDIT', accountCode: '5111', accountNameVi: 'Doanh thu bán hàng hóa', amount: 100000000 },
              { debitCredit: 'CREDIT', accountCode: '33311', accountNameVi: 'Thuế GTGT đầu ra', amount: 10000000 },
              { debitCredit: 'DEBIT', accountCode: '632', accountNameVi: 'Giá vốn hàng bán', amount: 70000000 },
              { debitCredit: 'CREDIT', accountCode: '156', accountNameVi: 'Hàng hóa', amount: 70000000 },
            ],
            statutoryNoteVi: 'Lợi nhuận gộp từ giao dịch bán hàng = 100tr doanh thu thuần - 70tr giá vốn = 30.000.000 VNĐ.',
          },
        ],
        keyTakeawayVi: 'Doanh thu đi liền với giá vốn; không ghi nhận giá vốn là vi phạm nguyên tắc phù hợp (Matching principle).',
      },
      {
        id: 'c17-2',
        titleVi: 'Đặc Tính Lưỡng Tính Của Tài Khoản 131 & Quy Tắc Cấm Bù Trừ Trên BCTC',
        summaryVi: 'Dư Nợ TK 131 là Tài sản (tiền khách còn nợ); Dư Có TK 131 là Nợ phải trả (khách trả trước tiền).',
        contentVi: 'TK 131 là tài khoản công nợ lưỡng tính. Số dư Nợ phản ánh số tiền khách hàng còn nợ doanh nghiệp (trình bày trên phần Tài sản ngắn hạn). Số dư Có phản ánh số tiền khách hàng đặt cọc ứng trước tiền nhưng chưa nhận hàng (trình bày trên phần Nợ phải trả). CẤM BÙ TRỪ: Nếu Khách hàng X còn nợ 100 triệu và Khách hàng Y ứng trước 40 triệu, kế toán bắt buộc phải phản ánh đủ 100 triệu bên Tài sản và 40 triệu bên Nợ phải trả trên Bảng CĐKT.',
        detailedTAccounts: [
          {
            accountCode: '131',
            accountNameVi: 'Phải thu của khách hàng',
            accountClass: 1,
            normalBalance: 'BOTH',
            openingBalance: { side: 'DEBIT', amount: 40000000 },
            entries: [
              { id: 'dt1', description: 'Bán hàng cho Công ty Sao Mai (HĐ 0001245)', amount: 110000000, side: 'DEBIT', counterAccountCode: '511' },
              { id: 'dt2', description: 'Công ty Sao Mai chuyển khoản thanh toán một phần', amount: 80000000, side: 'CREDIT', counterAccountCode: '112' },
              { id: 'dt3', description: 'Khách hàng An Phát chuyển khoản ứng trước tiền mua hàng', amount: 25000000, side: 'CREDIT', counterAccountCode: '112' },
            ],
            explanationVi: 'Số dư cuối kỳ chi tiết: Công ty Sao Mai còn nợ 70.000.000đ (Dư Nợ); Khách hàng An Phát ứng trước 25.000.000đ (Dư Có). Phải trình bày độc lập cả 2 phía trên Bảng CĐKT.',
          },
        ],
        keyTakeawayVi: 'Tài khoản 131 lưỡng tính không được bù trừ giữa các khách hàng khác nhau khi lập Báo cáo tài chính.',
      },
      {
        id: 'c17-3',
        titleVi: 'Quản Trị Rủi Ro Công Nợ Khách Hàng Quá Hạn & Đối Chiếu Định Kỳ',
        summaryVi: 'Kế toán công nợ bắt buộc phải lập biên bản đối chiếu công nợ định kỳ và phân loại tuổi nợ để theo dõi thu hồi.',
        contentVi: 'Theo nguyên tắc Thận trọng, kế toán phải theo dõi công nợ chi tiết cho từng khách hàng, từng hợp đồng và từng hóa đơn. Định kỳ hàng tháng hoặc cuối quý, kế toán gửi Biên bản đối chiếu công nợ có xác nhận của hai bên. Nếu khách hàng chậm trả nợ quá hạn từ 6 tháng trở lên, kế toán phân loại tuổi nợ để làm căn cứ trích lập dự phòng nợ phải thu khó đòi (TK 2293) vào chi phí quản lý doanh nghiệp (TK 642).',
        keyTakeawayVi: 'Đối chiếu công nợ định kỳ và lập hồ sơ nhắc nợ là căn cứ pháp lý bắt buộc để được trích lập dự phòng nợ khó đòi hợp pháp.',
      },
    ],
  },
  {
    day: 18,
    moduleNumber: 6,
    moduleTitleVi: 'Khối 6: Doanh Thu Bán Hàng, Hóa Đơn NĐ 123 & Các Khoản Giảm Trừ',
    dayTitleVi: 'Ngày 18: Giảm Trừ Doanh Thu (TT 200 dùng TK 521 vs TT 133 Nợ 511) & HĐĐT NĐ 123',
    estimatedMinutes: 20,
    isMilestoneDay: true,
    concepts: [
      {
        id: 'c18-1',
        titleVi: 'Phân Biệt Chiết Khấu Thương Mại, Giảm Giá Hàng Bán & Hàng Bán Bị Trả Lại',
        summaryVi: 'Các khoản giảm trừ làm suy giảm doanh thu thực tế mà doanh nghiệp được hưởng từ việc bán hàng.',
        contentVi: 'Có 3 khoản giảm trừ doanh thu: (1) Chiết khấu thương mại (Trade discount): Giảm giá do khách hàng mua số lượng lớn; (2) Giảm giá hàng bán (Sales allowance): Giảm giá do hàng kém phẩm chất, sai quy cách; (3) Hàng bán bị trả lại (Sales returns): Khách hàng trả lại hàng do lỗi kỹ thuật hoặc vi phạm hợp đồng.',
        keyTakeawayVi: 'Chiết khấu thương mại làm giảm trừ trực tiếp doanh thu bán hàng; khác hoàn toàn với chiết khấu thanh toán (TK 635).',
      },
      {
        id: 'c18-2',
        titleVi: 'Khác Biệt Cốt Lõi: TK 521 Trong Thông Tư 200 vs Ghi Trực Tiếp Nợ TK 511 Trong Thông Tư 133',
        summaryVi: 'TT 200 sử dụng tài khoản riêng TK 521; TT 133 không có TK 521, ghi thẳng giảm trừ vào Nợ TK 511.',
        contentVi: 'Trong Thông tư 200: Khoản giảm trừ ghi Nợ TK 521 (5211 - CKTM, 5212 - Hàng bán trả lại, 5213 - Giảm giá), Nợ TK 33311 / Có TK 131, 111. Cuối kỳ kết chuyển: Nợ TK 511 / Có TK 521 để xác định Doanh thu thuần. Trong Thông tư 133: TUYỆT ĐỐI KHÔNG CÓ TK 521! Mọi khoản chiết khấu, giảm giá, hàng trả lại đều được ghi trực tiếp giảm trừ doanh thu: Ghi NỢ TK 511, NỢ TK 33311 / CÓ TK 131, 111.',
        keyTakeawayVi: 'Doanh nghiệp áp dụng Thông tư 133 không được phép mở và sử dụng tài khoản 521.',
      },
      {
        id: 'c18-3',
        titleVi: 'Đặc Tả Hóa Đơn Điện Tử Theo Nghị Định 123/2020 & Quyết Định 1450/QĐ-TCT',
        summaryVi: 'Hóa đơn GTGT điện tử gồm ký hiệu 6 ký tự (KHHDon), số hóa đơn 8 chữ số, mã CQT 34 ký tự hexa (MCCQT).',
        contentVi: 'Theo Nghị định 123/2020/NĐ-CP và Quyết định 1450/QĐ-TCT của Tổng cục Thuế, Hóa đơn điện tử có mã của cơ quan thuế phải tuân thủ chuẩn XML nghiêm ngặt: Mã ký hiệu hóa đơn 6 ký tự dạng `C26TAA` (C = có mã CQT, 26 = năm 2026, T = doanh nghiệp, AA = ký hiệu riêng); Số hóa đơn 8 chữ số từ 00000001 đến 99999999; Mã MCCQT gồm đúng 34 ký tự thập lục phân (Hexadecimal) do hệ thống CQT cấp tự động sau khi ký số thành công.',
        vouchers: [
          {
            type: 'E_INVOICE_ND123',
            titleVi: 'Hóa đơn GTGT điện tử theo Nghị định 123 & Quyết định 1450',
            templateCode: '1',
            symbol: 'C26TAA',
            invoiceNumber: '00001245',
            mccqt: '0037A2F8B1E9C40526D80A12BC34EF5678',
            invoiceDate: '2026-09-18',
            seller: {
              name: 'CÔNG TY TNHH PHÂN PHỐI ĐIỆN MÁY VIỆT TRẦN',
              taxCode: '0108992345',
              address: 'Tầng 5 Tòa nhà Diamond, Số 36 Hoàng Cầu, Đống Đa, Hà Nội',
              status: 'ACTIVE',
            },
            buyer: {
              name: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ BÁCH KHOA',
              taxCode: '0106778899',
              address: 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội',
            },
            items: [
              { name: 'Máy chiếu tương tác thông minh 4K SmartPro', unit: 'Bộ', quantity: 2, unitPrice: 25000000, amount: 50000000, vatRate: 10, vatAmount: 5000000 },
              { name: 'Màn chiếu điện điều khiển từ xa 120 inch', unit: 'Chiếc', quantity: 2, unitPrice: 3000000, amount: 6000000, vatRate: 10, vatAmount: 600000 },
            ],
            subtotalPretax: 56000000,
            totalVat: 5600000,
            totalPayment: 61600000,
            currency: 'VND',
            legalNoteVi: 'Hóa đơn có mã của cơ quan thuế (MCCQT 34 ký tự). Giá trị trên 20 triệu đồng bắt buộc phải thanh toán bằng UNC ngân hàng.',
            xmlPayload: `<?xml version="1.0" encoding="UTF-8"?>
<HDon xmlns="http://laphoadon.gdt.gov.vn/2020/01">
  <DLHDon Id="HD00001245">
    <TTChung>
      <PBan>2.0.0</PBan>
      <THDon>Hóa đơn giá trị gia tăng</THDon>
      <KHMSHDon>1</KHMSHDon>
      <KHHDon>C26TAA</KHHDon>
      <SHDon>00001245</SHDon>
      <NLap>2026-09-18</NLap>
      <DVTTe>VND</DVTTe>
      <TGia>1.0</TGia>
      <MCCQT>0037A2F8B1E9C40526D80A12BC34EF5678</MCCQT>
    </TTChung>
    <NDHDon>
      <NBan>
        <Ten>CÔNG TY TNHH PHÂN PHỐI ĐIỆN MÁY VIỆT TRẦN</Ten>
        <MST>0108992345</MST>
        <DChi>Tầng 5 Tòa nhà Diamond, Số 36 Hoàng Cầu, Đống Đa, Hà Nội</DChi>
      </NBan>
      <NMua>
        <Ten>CÔNG TY CỔ PHẦN CÔNG NGHỆ BÁCH KHOA</Ten>
        <MST>0106778899</MST>
        <DChi>Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội</DChi>
      </NMua>
      <TToan>
        <TgTCThue>56000000</TgTCThue>
        <TgTThue>5600000</TgTThue>
        <TgTTTBSo>61600000</TgTTTBSo>
        <TgTTTBChu>Sáu mươi mốt triệu sáu trăm nghìn đồng chẵn</TgTTTBChu>
      </TToan>
    </NDHDon>
  </DLHDon>
</HDon>`,
          },
        ],
        keyTakeawayVi: 'Hóa đơn C26TAA hợp lệ bắt buộc phải có mã MCCQT 34 ký tự được Tổng cục Thuế ký cấp.',
      },
    ],
  },
];
