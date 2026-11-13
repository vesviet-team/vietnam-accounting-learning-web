/**
 * VOUCHER AUDIT CASES & GROUND TRUTH SPECIFICATIONS
 * Vietnam Accounting 30-Day Learning Platform
 *
 * Ground truth challenges covering:
 * 1. Supplier tax codes: Status 00 (Active) vs Status 03 (Suspended) vs Status 04 (Runaway)
 * 2. Cash payment threshold breach >= 20M VND (Circular 219/2013 & Circular 96/2015)
 * 3. Missing mandatory signatures on internal vouchers (Law on Accounting 88/2015)
 * 4. VAT arithmetic discrepancies (Decree 254/2026)
 * 5. Decision 1450 MCCQT format verification
 */

export interface VoucherAuditCaseData {
  id: string;
  titleVi: string;
  categoryVi: string;
  voucherType: 'VAT_INVOICE' | 'PAYMENT_VOUCHER' | 'RECEIPT_VOUCHER' | 'BANK_ORDER';
  scenarioDescriptionVi: string;
  totalAmount: number;
  pretaxAmount?: number;
  vatAmount?: number;
  taxRate?: '0%' | '5%' | '8%' | '10%' | 'KCT' | 'KKKNT';
  paymentMethod: 'CASH' | 'BANK_TRANSFER';

  // E-Invoice specifics
  invoiceSymbol?: string;
  invoiceNumber?: string;
  mccqt?: string;
  issueDate?: string;
  sellerNameVi?: string;
  sellerTaxCode?: string;
  buyerNameVi?: string;
  buyerTaxCode?: string;
  items?: Array<{
    stt: string;
    itemNameVi: string;
    unitVi: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;

  // Internal vouchers specifics (Phiếu chi / Phiếu thu)
  voucherCode?: string;
  receiverOrPayerNameVi?: string;
  reasonVi?: string;
  attachedDocsVi?: string;
  signers?: {
    director: boolean;
    chiefAccountant: boolean;
    cashierOrStorekeeper: boolean;
    preparer: boolean;
    receiverOrPayer: boolean;
  };

  // Defects / Ground truth
  hasTaxCodeIssue: boolean;
  vendorTaxStatus: '00' | '03' | '04'; // 00 Active, 03 Suspended, 04 Runaway
  violates20mCashRule: boolean;
  hasArithmeticError: boolean;
  missingSignature: boolean;
  invalidMccqt?: boolean;

  // Statutory basis and consequences
  statutoryBasis: string;
  vatConsequenceVi: string;
  citConsequenceVi: string;
  remedyActionVi: string;
}

export const VOUCHER_AUDIT_CASES: VoucherAuditCaseData[] = [
  {
    id: 'case-01-valid-cash',
    titleVi: 'Hóa đơn Mua Văn phòng phẩm 15 Triệu Thanh toán Tiền mặt',
    categoryVi: 'Hóa đơn hợp lệ',
    voucherType: 'VAT_INVOICE',
    scenarioDescriptionVi:
      'Mua văn phòng phẩm trị giá 15.000.000 VNĐ (đã bao gồm VAT 10%) thanh toán bằng tiền mặt kèm Phiếu chi hợp lệ và đầy đủ chữ ký.',
    totalAmount: 15000000,
    pretaxAmount: 13636364,
    vatAmount: 1363636,
    taxRate: '10%',
    paymentMethod: 'CASH',
    invoiceSymbol: 'C26TAA',
    invoiceNumber: '00001245',
    mccqt: '00C26TAA1234567890ABCDEF1234567890',
    issueDate: '15/03/2026',
    sellerNameVi: 'CÔNG TY TNHH VĂN PHÒNG PHẨM Á ĐÔNG',
    sellerTaxCode: '0101234567',
    buyerNameVi: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ THƯƠNG MẠI VIỆT',
    buyerTaxCode: '0315887229',
    items: [
      {
        stt: '01',
        itemNameVi: 'Giấy in Double A A4 70gsm & Văn phòng phẩm tổng hợp',
        unitVi: 'Gói/Bộ',
        quantity: 100,
        unitPrice: 136364,
        amount: 13636364,
      },
    ],
    signers: {
      director: true,
      chiefAccountant: true,
      cashierOrStorekeeper: true,
      preparer: true,
      receiverOrPayer: true,
    },
    hasTaxCodeIssue: false,
    vendorTaxStatus: '00',
    violates20mCashRule: false,
    hasArithmeticError: false,
    missingSignature: false,
    invalidMccqt: false,
    statutoryBasis: 'Khoản 1 Điều 15 Thông tư 219/2013/TT-BTC & Điều 4 Thông tư 96/2015/TT-BTC',
    vatConsequenceVi: 'Được khấu trừ toàn bộ 1.363.636 VNĐ thuế GTGT đầu vào.',
    citConsequenceVi: 'Được tính trọn vẹn 13.636.364 VNĐ vào chi phí được trừ khi tính thuế TNDN.',
    remedyActionVi: 'Chứng từ hoàn toàn chuẩn mực, lưu trữ theo hồ sơ thanh toán tiền mặt.',
  },
  {
    id: 'case-02-cash-20m-violation',
    titleVi: 'Hóa đơn Điện Máy Đúng 20 Triệu Thanh toán Tiền mặt Vi phạm Luật',
    categoryVi: 'Vi phạm ngưỡng thanh toán',
    voucherType: 'VAT_INVOICE',
    scenarioDescriptionVi:
      'Mua thiết bị máy in văn phòng trị giá đúng 20.000.000 VNĐ (đã bao gồm thuế GTGT 8%) thanh toán bằng Tiền mặt (TM) trực tiếp tại quầy.',
    totalAmount: 20000000,
    pretaxAmount: 18518519,
    vatAmount: 1481481,
    taxRate: '8%',
    paymentMethod: 'CASH',
    invoiceSymbol: 'C26TCC',
    invoiceNumber: '00008912',
    mccqt: '00C26TCC9876543210FEDCBA0987654321',
    issueDate: '20/04/2026',
    sellerNameVi: 'CÔNG TY TNHH THIẾT BỊ MÁY VĂN PHÒNG SAO MAI',
    sellerTaxCode: '0108889999',
    buyerNameVi: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ THƯƠNG MẠI VIỆT',
    buyerTaxCode: '0315887229',
    items: [
      {
        stt: '01',
        itemNameVi: 'Máy in Laser đa chức năng HP LaserJet Enterprise',
        unitVi: 'Chiếc',
        quantity: 1,
        unitPrice: 18518519,
        amount: 18518519,
      },
    ],
    signers: {
      director: true,
      chiefAccountant: true,
      cashierOrStorekeeper: true,
      preparer: true,
      receiverOrPayer: true,
    },
    hasTaxCodeIssue: false,
    vendorTaxStatus: '00',
    violates20mCashRule: true,
    hasArithmeticError: false,
    missingSignature: false,
    invalidMccqt: false,
    statutoryBasis:
      'Điều 15 Thông tư 219/2013/TT-BTC (sửa đổi bởi TT 173/2016) & Điều 4 Thông tư 96/2015/TT-BTC',
    vatConsequenceVi:
      'BỊ LOẠI TOÀN BỘ 1.481.481 VNĐ thuế GTGT đầu vào; không được kê khai khấu trừ.',
    citConsequenceVi:
      'BỊ LOẠI 18.518.519 VNĐ khỏi chi phí được trừ, phải điều chỉnh tăng thu nhập chịu thuế tại Chỉ tiêu B4 trên Tờ khai QTT TNDN.',
    remedyActionVi:
      'Cần thương lượng ngay với bên bán để thu hồi tiền mặt và thực hiện chuyển khoản lại từ tài khoản ngân hàng của công ty sang tài khoản đăng ký thuế của bên bán.',
  },
  {
    id: 'case-03-status-03-suspended',
    titleVi: 'Hóa đơn Mua Hàng từ Doanh nghiệp Đang Tạm Ngừng Kinh Doanh (Status 03)',
    categoryVi: 'Rủi ro pháp nhân người bán',
    voucherType: 'VAT_INVOICE',
    scenarioDescriptionVi:
      'Hóa đơn mua vật liệu xây dựng 33.000.000 VNĐ xuất ngày 05/05/2026, tuy nhiên tra cứu trên Cổng thông tin Tổng cục Thuế cho thấy nhà cung cấp đang ở Trạng thái MST 03 (NNT tạm ngừng kinh doanh có thời hạn).',
    totalAmount: 33000000,
    pretaxAmount: 30000000,
    vatAmount: 3000000,
    taxRate: '10%',
    paymentMethod: 'BANK_TRANSFER',
    invoiceSymbol: 'C26TEE',
    invoiceNumber: '00000999',
    mccqt: '00C26TEE33333333333333333333333333',
    issueDate: '05/05/2026',
    sellerNameVi: 'CÔNG TY TNHH ĐẦU TƯ XÂY DỰNG MINH PHÁT',
    sellerTaxCode: '0109998888',
    buyerNameVi: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ THƯƠNG MẠI VIỆT',
    buyerTaxCode: '0315887229',
    items: [
      {
        stt: '01',
        itemNameVi: 'Thép xây dựng Hòa Phát phi 18',
        unitVi: 'Tấn',
        quantity: 2,
        unitPrice: 15000000,
        amount: 30000000,
      },
    ],
    signers: {
      director: true,
      chiefAccountant: true,
      cashierOrStorekeeper: true,
      preparer: true,
      receiverOrPayer: true,
    },
    hasTaxCodeIssue: true,
    vendorTaxStatus: '03',
    violates20mCashRule: false,
    hasArithmeticError: false,
    missingSignature: false,
    invalidMccqt: false,
    statutoryBasis:
      'Khoản 2 Điều 4 Nghị định 125/2020/NĐ-CP & Luật Quản lý thuế số 38/2019/QH14',
    vatConsequenceVi:
      'Hóa đơn xuất trong thời gian tạm ngừng là hóa đơn bất hợp pháp; không được khấu trừ 3.000.000 VNĐ thuế GTGT.',
    citConsequenceVi:
      'Toàn bộ 30.000.000 VNĐ bị loại khỏi chi phí hợp lý khi xác định thu nhập chịu thuế TNDN.',
    remedyActionVi:
      'Lập biên bản xác minh thực tế giao nhận hàng hóa, yêu cầu người bán giải trình với Cơ quan Thuế hoặc thay thế chứng từ hợp lệ.',
  },
  {
    id: 'case-04-status-04-runaway',
    titleVi: 'Hóa đơn Phát sinh từ Doanh nghiệp Bỏ Địa chỉ Kinh Doanh (Status 04)',
    categoryVi: 'Rủi ro pháp nhân người bán',
    voucherType: 'VAT_INVOICE',
    scenarioDescriptionVi:
      'Hóa đơn tiếp khách ăn uống dịch vụ 88.000.000 VNĐ chuyển khoản qua ngân hàng, nhưng nhà hàng đã bị Cơ quan Thuế đóng mã số thuế với Trạng thái MST 04 (NNT không hoạt động tại địa chỉ đã đăng ký).',
    totalAmount: 88000000,
    pretaxAmount: 80000000,
    vatAmount: 8000000,
    taxRate: '10%',
    paymentMethod: 'BANK_TRANSFER',
    invoiceSymbol: 'C26TFF',
    invoiceNumber: '00004444',
    mccqt: '00C26TFF44444444444444444444444444',
    issueDate: '10/06/2026',
    sellerNameVi: 'CÔNG TY CP DỊCH VỤ ẨM THỰC HOÀNG GIA',
    sellerTaxCode: '0104445555',
    buyerNameVi: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ THƯƠNG MẠI VIỆT',
    buyerTaxCode: '0315887229',
    items: [
      {
        stt: '01',
        itemNameVi: 'Chi phí tiệc hội nghị khách hàng quý II/2026',
        unitVi: 'Bàn',
        quantity: 10,
        unitPrice: 8000000,
        amount: 80000000,
      },
    ],
    signers: {
      director: true,
      chiefAccountant: true,
      cashierOrStorekeeper: true,
      preparer: true,
      receiverOrPayer: true,
    },
    hasTaxCodeIssue: true,
    vendorTaxStatus: '04',
    violates20mCashRule: false,
    hasArithmeticError: false,
    missingSignature: false,
    invalidMccqt: false,
    statutoryBasis:
      'Công văn số 11797/BTC-TCT & Thông tư 219/2013/TT-BTC về rủi ro doanh nghiệp bỏ trốn',
    vatConsequenceVi:
      'Hóa đơn không có giá trị pháp lý; kiên quyết không khấu trừ 8.000.000 VNĐ thuế GTGT.',
    citConsequenceVi:
      'Loại 80.000.000 VNĐ khỏi chi phí được trừ TNDN và có nguy cơ bị xử phạt hành vi sử dụng hóa đơn bất hợp pháp.',
    remedyActionVi:
      'Dừng ngay việc thanh toán nếu chưa chuyển tiền; nếu đã chuyển tiền, phải chuẩn bị hồ sơ chứng minh hàng hóa/dịch vụ có thật theo yêu cầu của cơ quan thanh tra thuế.',
  },
  {
    id: 'case-05-arithmetic-discrepancy',
    titleVi: 'Hóa đơn Sai lệch Số học Giữa Tiền Hàng, Tiền Thuế & Tổng Thanh toán',
    categoryVi: 'Sai phạm tính toán số học',
    voucherType: 'VAT_INVOICE',
    scenarioDescriptionVi:
      'Hóa đơn mua phần mềm bản quyền: Tiền hàng trước thuế 10.000.000 VNĐ, thuế GTGT 10% (1.000.000 VNĐ), nhưng dòng Tổng tiền thanh toán lại ghi 12.000.000 VNĐ (lệch 1.000.000 VNĐ do lỗi hệ thống).',
    totalAmount: 12000000,
    pretaxAmount: 10000000,
    vatAmount: 1000000,
    taxRate: '10%',
    paymentMethod: 'CASH',
    invoiceSymbol: 'C26THH',
    invoiceNumber: '00005555',
    mccqt: '00C26THH55555555555555555555555555',
    issueDate: '12/07/2026',
    sellerNameVi: 'CÔNG TY TNHH PHẦN MỀM CÔNG NGHỆ SỐ',
    sellerTaxCode: '0103334444',
    buyerNameVi: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ THƯƠNG MẠI VIỆT',
    buyerTaxCode: '0315887229',
    items: [
      {
        stt: '01',
        itemNameVi: 'Bản quyền phần mềm kế toán doanh nghiệp (1 năm)',
        unitVi: 'Gói',
        quantity: 1,
        unitPrice: 10000000,
        amount: 10000000,
      },
    ],
    signers: {
      director: true,
      chiefAccountant: true,
      cashierOrStorekeeper: true,
      preparer: true,
      receiverOrPayer: true,
    },
    hasTaxCodeIssue: false,
    vendorTaxStatus: '00',
    violates20mCashRule: false,
    hasArithmeticError: true,
    missingSignature: false,
    invalidMccqt: false,
    statutoryBasis: 'Nghị định 254/2026/NĐ-CP về nguyên tắc số học trên hóa đơn điện tử',
    vatConsequenceVi:
      'Hóa đơn sai tiêu thức số tiền và tiền thuế không đủ điều kiện khấu trừ thuế GTGT hợp lệ.',
    citConsequenceVi:
      'Chi phí kế toán không khớp đúng với hóa đơn và chứng từ thanh toán thực tế.',
    remedyActionVi:
      'Yêu cầu người bán lập Hóa đơn điện tử điều chỉnh hoặc lập Hóa đơn thay thế theo quy định tại Nghị định 254/2026/NĐ-CP.',
  },
  {
    id: 'case-06-missing-director-signature',
    titleVi: 'Phiếu Chi Tiền Mặt 5 Triệu Thiếu Chữ Ký Phê Duyệt Của Giám Đốc',
    categoryVi: 'Thiếu chữ ký phê duyệt',
    voucherType: 'PAYMENT_VOUCHER',
    voucherCode: 'PC-2026-088',
    scenarioDescriptionVi:
      'Phiếu chi tiền mặt số 088 xuất quỹ 5.000.000 VNĐ thanh toán tiền bảo trì máy móc. Chứng từ đã có chữ ký Kế toán trưởng, Thủ quỹ và Người nhận, nhưng thiếu hoàn toàn chữ ký phê duyệt của Giám đốc.',
    totalAmount: 5000000,
    paymentMethod: 'CASH',
    receiverOrPayerNameVi: 'Trần Văn Mạnh (Kỹ thuật viên sửa chữa)',
    reasonVi: 'Chi phí bảo trì, bảo dưỡng hệ thống điều hòa văn phòng',
    attachedDocsVi: 'Hóa đơn bán lẻ & Biên bản nghiệm thu kỹ thuật',
    signers: {
      director: false, // MISSING!
      chiefAccountant: true,
      cashierOrStorekeeper: true,
      preparer: true,
      receiverOrPayer: true,
    },
    hasTaxCodeIssue: false,
    vendorTaxStatus: '00',
    violates20mCashRule: false,
    hasArithmeticError: false,
    missingSignature: true,
    invalidMccqt: false,
    statutoryBasis:
      'Điều 19 Luật Kế toán số 88/2015/QH13 & Mẫu 02-TT ban hành theo TT 200/2014 và TT 133/2016',
    vatConsequenceVi: 'Không áp dụng khấu trừ thuế trực tiếp trên Phiếu chi nội bộ.',
    citConsequenceVi:
      'Khoản chi không có sự phê duyệt hợp lệ của Thủ trưởng đơn vị hoặc người được ủy quyền sẽ bị coi là chi sai thẩm quyền và không được tính vào chi phí hợp lý.',
    remedyActionVi:
      'Trình ngay Giám đốc hoặc người đại diện theo pháp luật được ủy quyền ký duyệt trước khi quyết toán quỹ tiền mặt cuối tháng.',
  },
  {
    id: 'case-07-valid-bank-55m',
    titleVi: 'Hóa đơn Mua Hàng 55 Triệu Thanh toán Qua Ngân hàng (Ủy nhiệm chi)',
    categoryVi: 'Hóa đơn hợp lệ',
    voucherType: 'VAT_INVOICE',
    scenarioDescriptionVi:
      'Mua lô hàng hóa thương mại 55.000.000 VNĐ (gồm 50.000.000 VNĐ tiền hàng + 5.000.000 VNĐ VAT 10%) đã được thanh toán qua Ủy nhiệm chi từ tài khoản ngân hàng doanh nghiệp.',
    totalAmount: 55000000,
    pretaxAmount: 50000000,
    vatAmount: 5000000,
    taxRate: '10%',
    paymentMethod: 'BANK_TRANSFER',
    invoiceSymbol: 'C26TDD',
    invoiceNumber: '00015678',
    mccqt: '00C26TDD112233445566778899AABBCCDD',
    issueDate: '18/08/2026',
    sellerNameVi: 'CÔNG TY TNHH PHÂN PHỐI QUỐC TẾ HÀ NỘI',
    sellerTaxCode: '0311223344',
    buyerNameVi: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ THƯƠNG MẠI VIỆT',
    buyerTaxCode: '0315887229',
    items: [
      {
        stt: '01',
        itemNameVi: 'Lô linh kiện điện tử bo mạch công nghiệp',
        unitVi: 'Bộ',
        quantity: 50,
        unitPrice: 1000000,
        amount: 50000000,
      },
    ],
    signers: {
      director: true,
      chiefAccountant: true,
      cashierOrStorekeeper: true,
      preparer: true,
      receiverOrPayer: true,
    },
    hasTaxCodeIssue: false,
    vendorTaxStatus: '00',
    violates20mCashRule: false,
    hasArithmeticError: false,
    missingSignature: false,
    invalidMccqt: false,
    statutoryBasis:
      'Nghị định 254/2026/NĐ-CP & Khoản 1 Điều 15 Thông tư 219/2013/TT-BTC (có UNC hợp lệ)',
    vatConsequenceVi: 'Được khấu trừ đầy đủ 5.000.000 VNĐ thuế GTGT đầu vào.',
    citConsequenceVi: 'Được tính 50.000.000 VNĐ vào chi phí được trừ khi tính thuế TNDN.',
    remedyActionVi: 'Hồ sơ đầy đủ điều kiện pháp lý, kẹp UNC cùng hóa đơn để lưu trữ.',
  },
  // =========================================================================
  // R&D ADDITIONAL DEDUCTION CASES (Law 67/2025 + ND 320/2025)
  // =========================================================================
  {
    id: 'case-08-rd-most-approved',
    titleVi: 'Dự Án R&D Được Bộ KHCN Phê Duyệt - Khấu Trừ 200% (Luật 67/2025)',
    categoryVi: 'Khấu trừ thêm R&D',
    voucherType: 'VAT_INVOICE',
    scenarioDescriptionVi:
      'Doanh nghiệp thực hiện dự án R&D "Phát triển vật liệu sinh học mới" được Bộ KHCN phê duyệt (Quyết định 123/QD-KHCN). Tổng chi phí R&D hợp lý phát sinh năm 2026 là 5.000.000.000 VNĐ (nhân sự 3 tỷ, vật liệu 1 tỷ, khấu hao thiết bị 500 triệu, thuê ngoài 500 triệu). Theo Luật 67/2025 Điều 14 và ND 320/2025 Điều 8: Khấu trừ thêm 100% (tổng 200%).',
    totalAmount: 5_000_000_000,
    pretaxAmount: 5_000_000_000,
    vatAmount: 0,
    taxRate: 'KCT',
    paymentMethod: 'BANK_TRANSFER',
    sellerNameVi: 'CÔNG TY TNHH NGHIÊN CỨU VÀ PHÁT TRIỂN VIỆT',
    sellerTaxCode: '0109999999',
    buyerNameVi: 'CÔNG TY CỔ PHẦN DƯỢC PHẨM BẢO CHÂU',
    buyerTaxCode: '0108888888',
    hasTaxCodeIssue: false,
    vendorTaxStatus: '00',
    violates20mCashRule: false,
    hasArithmeticError: false,
    missingSignature: false,
    invalidMccqt: false,
    statutoryBasis: 'Luật Thuế TNDN 67/2025/QH15 Điều 14 & Nghị định 320/2025/NĐ-CP Điều 8',
    vatConsequenceVi: 'Chi phí R&D 5 tỷ được khấu trừ 200% = 10 tỷ giảm thu nhập chịu thuế TNDN.',
    citConsequenceVi: 'Khấu trừ thêm 100% (5 tỷ) được điền vào Chỉ tiêu B4 Tờ khai QTT TNDN (giảm thu nhập chịu thuế).',
    remedyActionVi: 'Giữ hồ sơ Quyết định phê duyệt Bộ KHCN, báo cáo tài chính dự án, sổ chi tiết chi phí R&D để thanh tra.',
  },
  {
    id: 'case-09-rd-other-qualifying',
    titleVi: 'Chi Phí R&D Đủ Điều Kiện Khác - Khấu Trừ 150% (Luật 67/2025)',
    categoryVi: 'Khấu trừ thêm R&D',
    voucherType: 'VAT_INVOICE',
    scenarioDescriptionVi:
      'Doanh nghiệp chi 2.000.000.000 VNĐ cho hoạt động R&D nội bộ "Cải tiến quy trình sản xuất sạch" đủ điều kiện theo Điều 8 ND 320/2025 (có nhân sự R&D, thiết bị, vật liệu) nhưng KHÔNG được Bộ KHCN phê duyệt. Áp dụng khấu trừ 150% (thêm 50%).',
    totalAmount: 2_000_000_000,
    pretaxAmount: 2_000_000_000,
    vatAmount: 0,
    taxRate: 'KCT',
    paymentMethod: 'BANK_TRANSFER',
    sellerNameVi: 'CÔNG TY TNHH CÔNG NGHỆ XANH',
    sellerTaxCode: '0107777777',
    buyerNameVi: 'CÔNG TY CỔ PHẦN SẢN XUẤT THỰC PHẨM AN PHÁT',
    buyerTaxCode: '0106666666',
    hasTaxCodeIssue: false,
    vendorTaxStatus: '00',
    violates20mCashRule: false,
    hasArithmeticError: false,
    missingSignature: false,
    invalidMccqt: false,
    statutoryBasis: 'Luật Thuế TNDN 67/2025/QH15 Điều 14 & Nghị định 320/2025/NĐ-CP Điều 8-9',
    vatConsequenceVi: 'Chi phí R&D 2 tỷ được khấu trừ 150% = 3 tỷ giảm thu nhập chịu thuế TNDN.',
    citConsequenceVi: 'Khấu trừ thêm 50% (1 tỷ) được điền vào Chỉ tiêu B4 Tờ khai QTT TNDN.',
    remedyActionVi: 'Giữ sổ chi tiết chi phí R&D, danh sách nhân sự R&D, hóa đơn mua vật liệu/thiết bị R&D để chứng minh đủ điều kiện.',
  },
  // =========================================================================
  // E-COMMERCE TAX CASES (ND 117/2025 + ND 68/2026)
  // =========================================================================
  {
    id: 'case-10-ecommerce-platform-withheld',
    titleVi: 'Hóa Đơn TMĐT - Sàn Khấu Trừ Nộp Thay Thuế GTGT & TNCN (ND 117/2025)',
    categoryVi: 'Thuế TMĐT',
    voucherType: 'VAT_INVOICE',
    scenarioDescriptionVi:
      'Hộ kinh doanh Nguyễn Văn A bán hàng trên Shopee doanh thu gộp 100.000.000 VNĐ. Sàn Shopee khấu trừ phí 10% (10.000.000 VNĐ), khấu trừ thuế GTGT 8% (7.200.000 VNĐ) và thuế TNCN 0.5% (450.000 VNĐ), chuyển khoản cho hộ 82.350.000 VNĐ. Theo ND 117/2025, sàn TMĐT chịu trách nhiệm khấu trừ, kê khai, nộp thay thuế cho hộ kinh doanh.',
    totalAmount: 100_000_000,
    pretaxAmount: 92_592_593,
    vatAmount: 7_200_000,
    taxRate: '8%',
    paymentMethod: 'BANK_TRANSFER',
    invoiceSymbol: 'SHP',
    invoiceNumber: 'SHP00123456',
    mccqt: '00SHOPEE0000000000000000000000123456',
    issueDate: '2026-09-15',
    sellerNameVi: 'Shopee Vietnam (Sàn TMĐT)',
    sellerTaxCode: '0106668888',
    buyerNameVi: 'Hộ kinh doanh Nguyễn Văn A',
    buyerTaxCode: '0123456789',
    hasTaxCodeIssue: false,
    vendorTaxStatus: '00',
    violates20mCashRule: false,
    hasArithmeticError: false,
    missingSignature: false,
    invalidMccqt: false,
    statutoryBasis: 'Nghị định 117/2025/NĐ-CP (hiệu lực 01/07/2025) & Nghị định 68/2026/NĐ-CP (sửa đổi, hiệu lực 01/07/2026)',
    vatConsequenceVi: 'Sàn Shopee khấu trừ 7.200.000 VNĐ thuế GTGT và nộp thay cho hộ kinh doanh qua Cổng thuế điện tử TMĐT.',
    citConsequenceVi: 'Hộ kinh doanh KHÔNG tự kê khai thuế GTGT/TNCN phần doanh thu đã được sàn nộp thay. Chỉ kê khai bổ sung phần doanh thu ngoài sàn (nếu có).',
    remedyActionVi: 'Hộ kinh doanh đối chiếu dữ liệu trên Cổng thuế điện tử TMĐT (thuedientu.gdt.gov.vn/TMDT), kê khai bổ sung doanh thu phát sinh ngoài sàn.',
  },
  {
    id: 'case-11-ecommerce-reconciliation',
    titleVi: 'Đối Chiếu Doanh Thu Hộ Kinh Doanh Với Dữ Liệu Sàn TMĐT (ND 117/2025)',
    categoryVi: 'Thuế TMĐT',
    voucherType: 'VAT_INVOICE',
    scenarioDescriptionVi:
      'Hộ kinh doanh B déclaration thuế cuối năm: Doanh thu tự khai báo 110.000.000 VNĐ. Dữ liệu sàn TMĐT (Lazada) báo cáo doanh thu đã nộp thay thuế 100.000.000 VNĐ. Chênh lệch 10.000.000 VNĐ (10%) vượt ngưỡng 5%. Theo ND 117/2025, hộ kinh doanh phải đối chiếu và kê khai bổ sung phần chênh lệch.',
    totalAmount: 10_000_000,
    pretaxAmount: 10_000_000,
    vatAmount: 0,
    taxRate: 'KCT',
    paymentMethod: 'BANK_TRANSFER',
    sellerNameVi: 'Hộ kinh doanh Trần Thị B',
    sellerTaxCode: '0123456789',
    buyerNameVi: 'Cổng Thuế Điện Tử TMĐT',
    buyerTaxCode: '0000000000',
    hasTaxCodeIssue: false,
    vendorTaxStatus: '00',
    violates20mCashRule: false,
    hasArithmeticError: false,
    missingSignature: false,
    invalidMccqt: false,
    statutoryBasis: 'Nghị định 117/2025/NĐ-CP Điều 10-12 & Nghị định 68/2026/NĐ-CP',
    vatConsequenceVi: 'Phần chênh lệch 10 triệu VNĐ (doanh thu ngoài sàn) phải tự kê khai bổ sung thuế GTGT/TNCN.',
    citConsequenceVi: 'Kê khai bổ sung thu nhập chịu thuế TNCN cho phần doanh thu 10 triệu VNĐ phát sinh ngoài sàn TMĐT.',
    remedyActionVi: 'Đối chiếu số liệu sàn với sổ sách, xác định nguồn gốc chênh lệch (doanh thu ngoài sàn, sai sót sàn, hoặc quên kê khai), kê khai bổ sung trên cổng thuế điện tử.',
  },
];
