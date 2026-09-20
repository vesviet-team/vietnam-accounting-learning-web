/**
 * Pedagogical Scenarios for COGS & Cost Accounting Workbench (DOK 1-3)
 * Compliant with:
 * - VAS 02 / IAS 2 (Inventories) & VFRS Roadmap Decision 345/QD-BTC
 * - Circular 200/2014/TT-BTC & Circular 99/2025/TT-BTC (replacing TT 200 from 2026)
 * - Circular 133/2016/TT-BTC (SME Accounting Regime)
 * - Decrees 123/2020/ND-CP & 70/2025/ND-CP (E-Invoices & Internal Dispatch Note Form 03/XKNB)
 * - Circular 96/2015/TT-BTC & Circular 78/2014/TT-BTC (CIT Deductible Expenses & Schedule B4)
 */

import {
  CostingMethod,
  InventoryLot,
  StockTransaction,
  ManufacturingCostInput,
} from '@/types/cogs';

export interface CogsScenario {
  id: string;
  code: string;
  titleVi: string;
  shortDescriptionVi: string;
  fullStoryVi: string;
  dokLevel: 1 | 2 | 3;
  dokLevelKey: 'DOK_1' | 'DOK_2' | 'DOK_3';
  industryVi: string;
  regulatoryBasisVi: string;
  learningObjectivesVi: string[];
  recommendedMethod?: CostingMethod;
  initialLots: InventoryLot[];
  transactions: StockTransaction[];
  manufacturingInput?: ManufacturingCostInput;
  assumedRevenue?: number;
  expectedOutcomeVi?: {
    cogsAnalysis?: string;
    taxImplication?: string;
    financialRatios?: string;
  };
}

export const COGS_SCENARIOS: CogsScenario[] = [
  {
    id: 'scen-cogs-01',
    code: 'SCEN-COGS-01',
    titleVi: 'Thương Mại Phân Phối Tiêu Dùng — So Sánh 3 Phương Pháp Xuất Kho',
    shortDescriptionVi:
      'Luyện tập cơ bản: Xuất kho thương mại qua 3 phương pháp (FIFO, BQ cả kỳ, BQ liên hoàn) và quan sát độ lệch giá vốn hàng bán.',
    fullStoryVi:
      'Công ty TNHH Thương Mại & Phân Phối Tiêu Dùng Hà Nội chuyên kinh doanh mặt hàng sữa hộp dinh dưỡng. ' +
      'Trong tháng 01/2026, doanh nghiệp phát sinh 2 đợt nhập hàng với mức giá nhập tăng dần và 2 đợt xuất bán thương phẩm, ' +
      'cùng 1 đợt xuất hàng gửi đại lý bán đúng giá hưởng hoa hồng. ' +
      'Học viên được yêu cầu thực hành tính toán giá vốn xuất kho theo 3 phương pháp được phép theo VAS 02 và TT 200/TT 99, ' +
      'đồng thời kiểm tra tính cân đối bất biến của Thẻ kho điện tử (Tồn ĐK + Nhập = Xuất + Tồn CK).',
    dokLevel: 1,
    dokLevelKey: 'DOK_1',
    industryVi: 'Thương mại bán buôn & bán lẻ hàng tiêu dùng',
    regulatoryBasisVi: 'VAS 02 Đoạn 13-16; Thông tư 200/2014/TT-BTC & Thông tư 99/2025/TT-BTC',
    learningObjectivesVi: [
      'Nắm vững công thức tính đơn giá xuất kho theo FIFO, Bình quân cả kỳ và Bình quân liên hoàn.',
      'Phân biệt chứng từ xuất bán thông thường (TK đối ứng 632) và xuất gửi đại lý/vận chuyển nội bộ (TK đối ứng 157).',
      'Kiểm chứng định luật bảo toàn giá trị tồn kho trong mọi tình huống giao dịch.',
    ],
    recommendedMethod: 'FIFO',
    initialLots: [
      {
        id: 'lot-cogs-01-init',
        date: '2026-01-01',
        voucherCode: 'SDDK-01',
        quantity: 1_000,
        unitPrice: 50_000,
        remainingQuantity: 1_000,
      },
    ],
    transactions: [
      {
        id: 'tx-cogs-01-1',
        date: '2026-01-05',
        voucherCode: 'PNK-001',
        voucherType: 'PNK',
        description: 'Nhập kho mua 2.000 hộp sữa từ Nhà sản xuất Vinamilk',
        quantity: 2_000,
        unitPrice: 52_000,
        targetAccount: '156',
      },
      {
        id: 'tx-cogs-01-2',
        date: '2026-01-10',
        voucherCode: 'PXK-001',
        voucherType: 'PXK',
        description: 'Xuất bán 1.500 hộp sữa cho Siêu thị Big C Thăng Long',
        quantity: 1_500,
        targetAccount: '632',
      },
      {
        id: 'tx-cogs-01-3',
        date: '2026-01-16',
        voucherCode: 'PNK-002',
        voucherType: 'PNK',
        description: 'Nhập kho mua 1.000 hộp sữa đợt 2 (giá nhập tăng theo chính sách hãng)',
        quantity: 1_000,
        unitPrice: 55_000,
        targetAccount: '156',
      },
      {
        id: 'tx-cogs-01-4',
        date: '2026-01-20',
        voucherCode: 'PXK-002',
        voucherType: 'PXK',
        description: 'Xuất bán 1.800 hộp sữa cho Chuỗi cửa hàng WinMart',
        quantity: 1_800,
        targetAccount: '632',
      },
      {
        id: 'tx-cogs-01-5',
        date: '2026-01-25',
        voucherCode: 'XKNB-001',
        voucherType: 'XKNB_03',
        description: 'Xuất gửi 200 hộp sữa đại lý Quận Cầu Giấy (Phiếu Mẫu 03/XKNB)',
        quantity: 200,
        targetAccount: '157',
      },
    ],
    manufacturingInput: {
      regime: 'CIRCULAR_200',
      beginningWip: 0,
      actualDirectMaterial: 0,
      actualDirectLabor: 0,
      actualOverhead: 0,
      normalDirectMaterial: 0,
      normalDirectLabor: 0,
      finishedUnits: 0,
      endingWipUnits: 0,
      wipMethod: 'DIRECT_MATERIAL',
      completionPercentage: 0,
    },
    assumedRevenue: 250_000_000,
    expectedOutcomeVi: {
      cogsAnalysis:
        'Trong xu hướng giá mua vào tăng (50k -> 52k -> 55k), phương pháp FIFO cho Giá vốn (TK 632) thấp nhất, Tồn kho (TK 156) cao nhất.',
      taxImplication:
        'FIFO cho Lợi nhuận gộp cao nhất, kéo theo Thuế TNDN tạm tính 20% cao hơn so với Bình quân cả kỳ.',
      financialRatios:
        'FIFO nâng cao hệ số thanh toán hiện hành (Current Ratio) trên Bảng cân đối kế toán B01-DN.',
    },
  },
  {
    id: 'scen-cogs-02',
    code: 'SCEN-COGS-02',
    titleVi: 'Thép Thăng Long — Chu Kỳ Sốt Giá & Hồ Sơ Vay Vốn Ngân Hàng',
    shortDescriptionVi:
      'Tư duy chiến lược DOK 3: Lựa chọn phương pháp xuất kho giữa tối ưu hóa BCTC để giải ngân 20 tỷ VietinBank (FIFO) và tối ưu dòng tiền thuế TNDN (Bình quân).',
    fullStoryVi:
      'Công ty Cổ phần Thép Thăng Long kinh doanh và gia công phôi thép xây dựng CB240T. ' +
      'Bước sang Quý 1/2026, thị trường phôi thép thế giới biến động mạnh do giá quặng sắt tăng vọt. ' +
      'Doanh nghiệp thực hiện 4 đợt nhập hàng với đơn giá tăng phi mã: 12.000.000 đ/tấn (tồn đầu) -> 13.500.000 đ -> 14.500.000 đ -> 16.000.000 đ/tấn. ' +
      'Đồng thời, doanh nghiệp xuất bán 3 đợt quy mô lớn cho các đại công trình trọng điểm. ' +
      'Hội đồng Quản trị đang chuẩn bị hồ sơ vay vốn trung và dài hạn 20 tỷ VNĐ tại VietinBank. ' +
      'Ngân hàng yêu cầu Hệ số thanh toán hiện hành (Current Ratio) CR >= 1.5 và Tỷ suất sinh lời trên vốn chủ sở hữu (ROE) đạt yêu cầu thẩm định. ' +
      'Kế toán trưởng đứng trước bài toán chiến lược: ' +
      '1. Chọn FIFO để tối đa hóa tài sản tồn kho (Mã 140 B01-DN) và tối đa hóa Lợi nhuận gộp (Mã 20 B02-DN), phục vụ làm đẹp BCTC vay vốn. ' +
      '2. Chọn Bình quân gia quyền liên hoàn để đẩy giá vốn vào TK 632 cao hơn, từ đó giảm áp lực nộp thuế TNDN 20%, bảo toàn thanh khoản tiền mặt.',
    dokLevel: 3,
    dokLevelKey: 'DOK_3',
    industryVi: 'Thương mại & Gia công Kim khí / Thép công nghiệp',
    regulatoryBasisVi:
      'VAS 02 Đoạn 13-18; Thông tư 200/2014 & TT 99/2025; Quy chuẩn Thẩm định tín dụng Ngân hàng Nhà nước',
    learningObjectivesVi: [
      'Phân tích tác động trực tiếp của phương pháp xuất kho lên BCTC (B01-DN & B02-DN) trong thời kỳ giá hàng hóa tăng nhanh (lạm phát chi phí đẩy).',
      'Đánh giá sự đánh đổi (trade-off) kinh điển: Làm đẹp BCTC vay vốn ngân hàng (FIFO) vs Tiết kiệm dòng tiền nộp thuế TNDN (Bình quân gia quyền).',
      'Xây dựng lập luận bảo vệ phương pháp tính giá trước Ban Tổng Giám đốc và Ban Thẩm định Tín dụng Ngân hàng.',
    ],
    recommendedMethod: 'FIFO',
    initialLots: [
      {
        id: 'lot-steel-init',
        date: '2026-01-01',
        voucherCode: 'SDDK-THEP',
        quantity: 50,
        unitPrice: 12_000_000,
        remainingQuantity: 50,
      },
    ],
    transactions: [
      {
        id: 'tx-steel-1',
        date: '2026-01-05',
        voucherCode: 'PNK-010',
        voucherType: 'PNK',
        description: 'Nhập kho 100 tấn phôi thép từ Thép Hòa Phát (Hóa đơn 0012893)',
        quantity: 100,
        unitPrice: 13_500_000,
        targetAccount: '156',
      },
      {
        id: 'tx-steel-2',
        date: '2026-01-12',
        voucherCode: 'PXK-010',
        voucherType: 'PXK',
        description: 'Xuất bán 80 tấn thép xây dựng cho Dự án Cầu Nhật Tân mở rộng',
        quantity: 80,
        targetAccount: '632',
      },
      {
        id: 'tx-steel-3',
        date: '2026-01-18',
        voucherCode: 'PNK-011',
        voucherType: 'PNK',
        description: 'Nhập kho 120 tấn thép từ Thép Pomina (giá phôi leo thang đợt 2)',
        quantity: 120,
        unitPrice: 14_500_000,
        targetAccount: '156',
      },
      {
        id: 'tx-steel-4',
        date: '2026-01-22',
        voucherCode: 'PXK-011',
        voucherType: 'PXK',
        description: 'Xuất bán 110 tấn phôi thép cho Khu đô thị Vinhomes Smart City',
        quantity: 110,
        targetAccount: '632',
      },
      {
        id: 'tx-steel-5',
        date: '2026-01-26',
        voucherCode: 'PNK-012',
        voucherType: 'PNK',
        description: 'Nhập kho 80 tấn phôi đợt 3 chạm đỉnh sốt giá thế giới',
        quantity: 80,
        unitPrice: 16_000_000,
        targetAccount: '156',
      },
      {
        id: 'tx-steel-6',
        date: '2026-01-29',
        voucherCode: 'PXK-012',
        voucherType: 'PXK',
        description: 'Xuất bán 90 tấn giao gấp cho Tổng thầu Coteccons',
        quantity: 90,
        targetAccount: '632',
      },
    ],
    manufacturingInput: {
      regime: 'CIRCULAR_200',
      beginningWip: 50_000_000,
      actualDirectMaterial: 1_200_000_000,
      normalDirectMaterial: 1_200_000_000,
      actualDirectLabor: 150_000_000,
      normalDirectLabor: 150_000_000,
      actualOverhead: 120_000_000,
      finishedUnits: 300,
      endingWipUnits: 30,
      wipMethod: 'EQUIVALENT_UNITS',
      completionPercentage: 60,
    },
    assumedRevenue: 5_400_000_000, // 280 tấn xuất bán @ trung bình ~19.3M/tấn
    expectedOutcomeVi: {
      cogsAnalysis:
        'FIFO đưa lô tồn 12M và nhập 13.5M vào giá vốn trước -> Giá vốn TK 632 thấp nhất (~3.82 tỷ). Bình quân liên hoàn cho giá vốn cao hơn (~4.01 tỷ), chênh lệch gần 190 triệu VNĐ.',
      taxImplication:
        'Nếu chọn FIFO: Lợi nhuận trước thuế cao hơn 190M -> Thuế TNDN 20% phải nộp thêm 38M VNĐ. Nếu chọn Bình quân: tiết kiệm 38M VNĐ thuế nộp ngay.',
      financialRatios:
        'Với FIFO, Tồn kho cuối kỳ (Mã 140) đạt đỉnh 1.28 tỷ VNĐ (giữ lại lô giá cao 16M), giúp Tài sản ngắn hạn tăng mạnh, đưa Current Ratio CR vượt ngưỡng 1.5, đủ điều kiện phê duyệt hồ sơ tín dụng 20 tỷ VietinBank.',
    },
  },
  {
    id: 'scen-cogs-03',
    code: 'SCEN-COGS-03',
    titleVi: 'May Xuất Khẩu Thăng Long — Xử Lý Vải Hỏng Vượt Định Mức & Kê Khai Thuế B4',
    shortDescriptionVi:
      'Xử lý chuyên sâu DOK 3: Áp dụng chuẩn mực VAS 02 Đoạn 11 bóc tách 300M vải hỏng vượt định mức khỏi giá thành Z sang Nợ 632 và xử phạt thuế TNDN Chỉ tiêu B4.',
    fullStoryVi:
      'Công ty Cổ phần May Xuất Khẩu Thăng Long ký kết hợp đồng gia công 10.000 áo jacket phao xuất khẩu sang thị trường EU. ' +
      'Theo bảng định mức kinh tế kỹ thuật đăng ký ban đầu, mức tiêu hao vải Kaki chống thấm là 1,8 mét/áo. ' +
      'Tổng lượng vải định mức cho toàn bộ lô hàng là 18.000 mét với đơn giá 100.000 đ/mét (tương đương 1.800.000.000 đ). ' +
      'Tuy nhiên, trong quá trình cắt rập trên dây chuyền tự động, công nhân vận hành thiết lập sai cữ dao, ' +
      'dẫn tới lượng vải thực tế tiêu hao lên tới 2,1 mét/áo (tổng tiêu hao thực tế 21.000 mét, thành tiền 2.100.000.000 đ, ' +
      'vượt định mức 3.000 mét vải tương ứng 300.000.000 đ). ' +
      'Lô hàng hoàn thành 10.000 sản phẩm nhập kho thành phẩm. Chi phí nhân công trực tiếp 600.000.000 đ và sản xuất chung 300.000.000 đ đều nằm trong định mức. ' +
      'Kế toán trưởng phải xử lý đúng chuẩn mực VAS 02 Đoạn 11 và IAS 2 Đoạn 16: ' +
      'Không được vốn hóa 300M chi phí vượt định mức vào giá thành thành phẩm Z (TK 155), mà phải ghi nhận thẳng vào Chi phí giá vốn trong kỳ (Nợ 632 / Có 621). ' +
      'Đồng thời, theo Điều 4 Thông tư 96/2015/TT-BTC, phần chi phí NVL vượt định mức này là chi phí không được trừ khi quyết toán thuế TNDN, ' +
      'bắt buộc phải kê khai điều chỉnh tăng thu nhập chịu thuế tại Chỉ tiêu B4 trên Tờ khai 03/TNDN, làm phát sinh tiền thuế TNDN bổ sung 20% = 60.000.000 đ.',
    dokLevel: 3,
    dokLevelKey: 'DOK_3',
    industryVi: 'Sản xuất & May mặc dệt may xuất khẩu',
    regulatoryBasisVi:
      'VAS 02 Đoạn 11; IAS 2 Đoạn 16; Thông tư 96/2015/TT-BTC Điều 4; Tờ khai Quyết toán Thuế TNDN Mẫu 03/TNDN Chỉ tiêu B4',
    learningObjectivesVi: [
      'Nắm vững nguyên tắc không vốn hóa hao hụt bất thường vượt định mức kỹ thuật vào giá thành sản phẩm Z theo VAS 02 / IAS 2.',
      'Thực hành lập bút toán kép bóc tách Nợ 632 / Có 621 (hoặc Có 154 trong TT 133) đối với 300M chi phí bất thường.',
      'Thực hiện quyết toán thuế TNDN: Điền Chỉ tiêu B4 trên Tờ khai 03/TNDN và tính chính xác khoản phạt/tăng thuế 20% (60M VNĐ).',
    ],
    recommendedMethod: 'FIFO',
    initialLots: [
      {
        id: 'lot-fabric-init',
        date: '2026-01-01',
        voucherCode: 'SDDK-VAI',
        quantity: 5_000,
        unitPrice: 100_000,
        remainingQuantity: 5_000,
      },
    ],
    transactions: [
      {
        id: 'tx-fabric-1',
        date: '2026-01-04',
        voucherCode: 'PNK-020',
        voucherType: 'PNK',
        description: 'Nhập kho 20.000 mét vải Kaki xuất khẩu từ Dệt May Hà Nam',
        quantity: 20_000,
        unitPrice: 100_000,
        targetAccount: '156',
      },
      {
        id: 'tx-fabric-2',
        date: '2026-01-08',
        voucherCode: 'PXK-020',
        voucherType: 'PXK',
        description: 'Xuất kho 21.000 mét vải Kaki đưa vào phân xưởng may áo Jacket',
        quantity: 21_000,
        targetAccount: '632',
      },
    ],
    manufacturingInput: {
      regime: 'CIRCULAR_200',
      beginningWip: 0,
      actualDirectMaterial: 2_100_000_000,
      normalDirectMaterial: 1_800_000_000,
      actualDirectLabor: 600_000_000,
      normalDirectLabor: 600_000_000,
      actualOverhead: 300_000_000,
      finishedUnits: 10_000,
      endingWipUnits: 0,
      wipMethod: 'DIRECT_MATERIAL',
      completionPercentage: 0,
    },
    assumedRevenue: 3_500_000_000,
    expectedOutcomeVi: {
      cogsAnalysis:
        'Giá thành hợp lý Z = 1.8B (NVL định mức) + 0.6B (NC) + 0.3B (SXC) = 2.700.000.000 đ (z = 270.000 đ/áo). Chi phí vượt định mức 300.000.000 đ bóc tách ghi Nợ 632.',
      taxImplication:
        'Chi phí 300.000.000 đ bị loại khỏi chi phí được trừ khi quyết toán thuế TNDN, ghi nhận vào Chỉ tiêu B4 Tờ khai 03/TNDN. Thuế TNDN phát sinh tăng thêm = 300M x 20% = 60.000.000 đ.',
      financialRatios:
        'Tránh việc thổi phồng giá trị thành phẩm tồn kho TK 155, đảm bảo Báo cáo B01 phản ánh trung thực và hợp lý theo chuẩn mực kế toán Việt Nam.',
    },
  },
  {
    id: 'scen-cogs-04',
    code: 'SCEN-COGS-04',
    titleVi: 'Điều Chuyển Nội Bộ Mẫu 03/XKNB & Rào Chắn Xuất Âm Kho — Chuỗi Siêu Thị',
    shortDescriptionVi:
      'Thực hành quy chuẩn Mẫu 03/XKNB theo NĐ 123 & NĐ 70 (Nợ 157 / Có 156) và kiểm thử rào chắn an toàn ngăn chặn xuất âm kho trong quản trị chuỗi bán lẻ.',
    fullStoryVi:
      'Công ty Cổ phần Bán Lẻ Siêu Thị MartVina vận hành kho tổng logistics tại KCN Quang Minh và 15 siêu thị vệ tinh tại Hà Nội. ' +
      'Doanh nghiệp áp dụng quy chế điều chuyển hàng hóa nội bộ bằng Phiếu xuất kho kiêm vận chuyển nội bộ điện tử (Mẫu 03/XKNB) ' +
      'theo Nghị định 123/2020/NĐ-CP và Nghị định 70/2025/NĐ-CP. ' +
      'Tài khoản đối ứng khi xuất điều chuyển là Nợ 157 (Hàng gửi bán / hàng chuyển đi) và Có 156 (theo Thông tư 200/TT 99) ' +
      'thay vì ghi nhận vào Giá vốn hàng bán Nợ 632 như nghiệp vụ xuất bán thương mại. ' +
      'Bên cạnh đó, hệ thống tích hợp rào chắn chống xuất âm kho nghiêm ngặt: ' +
      'Nếu nhân viên logistics sơ suất nhập lệnh xuất điều chuyển hoặc xuất bán vượt quá số lượng hàng thực tế khả dụng trên sổ sách, ' +
      'hệ thống sẽ lập tức chặn giao dịch và báo động vi phạm Luật Kế toán 88/2015.',
    dokLevel: 2,
    dokLevelKey: 'DOK_2',
    industryVi: 'Chuỗi cung ứng & Bán lẻ đa kênh (Omnichannel Retail)',
    regulatoryBasisVi:
      'Nghị định 123/2020/NĐ-CP Điều 8; Nghị định 70/2025/NĐ-CP; Thông tư 200/2014 Điều 26; Luật Kế toán 88/2015',
    learningObjectivesVi: [
      'Phân biệt bản chất pháp lý giữa Phiếu xuất kho bán hàng (PXK - Nợ 632) và Phiếu XK kiêm VCNB (Mẫu 03/XKNB - Nợ 157).',
      'Hiểu rõ sự khác biệt trong hạch toán điều chuyển kho giữa Thông tư 200/99 (dùng TK 157) và Thông tư 133 (theo dõi chi tiết TK 156 do cấm TK 157).',
      'Quan sát cơ chế kích hoạt rào chắn xuất âm kho tự động khi số lượng xuất vượt tồn khả dụng.',
    ],
    recommendedMethod: 'MOVING_WEIGHTED_AVERAGE',
    initialLots: [
      {
        id: 'lot-retail-init',
        date: '2026-01-01',
        voucherCode: 'SDDK-MART',
        quantity: 500,
        unitPrice: 300_000,
        remainingQuantity: 500,
      },
    ],
    transactions: [
      {
        id: 'tx-retail-1',
        date: '2026-01-04',
        voucherCode: 'PNK-MART-01',
        voucherType: 'PNK',
        description: 'Nhập kho 1.000 thùng dầu ăn thực vật từ Nhà máy Cái Lân',
        quantity: 1_000,
        unitPrice: 315_000,
        targetAccount: '156',
      },
      {
        id: 'tx-retail-2',
        date: '2026-01-08',
        voucherCode: 'XKNB-03-001',
        voucherType: 'XKNB_03',
        description: 'Điều chuyển 400 thùng dầu ăn sang Siêu thị MartVina Cầu Giấy (Mẫu 03/XKNB)',
        quantity: 400,
        targetAccount: '157',
      },
      {
        id: 'tx-retail-3',
        date: '2026-01-14',
        voucherCode: 'PXK-MART-01',
        voucherType: 'PXK',
        description: 'Xuất bán buôn 600 thùng dầu ăn cho Nhà hàng Sen Tây Hồ',
        quantity: 600,
        targetAccount: '632',
      },
      {
        id: 'tx-retail-4',
        date: '2026-01-19',
        voucherCode: 'XKNB-03-002',
        voucherType: 'XKNB_03',
        description: 'Điều chuyển 300 thùng dầu ăn sang Siêu thị MartVina Hà Đông (Mẫu 03/XKNB)',
        quantity: 300,
        targetAccount: '157',
      },
      {
        id: 'tx-retail-5',
        date: '2026-01-24',
        voucherCode: 'PXK-MART-02',
        voucherType: 'PXK',
        description: 'Xuất bán lẻ tại quầy kho tổng 150 thùng dầu ăn',
        quantity: 150,
        targetAccount: '632',
      },
    ],
    manufacturingInput: {
      regime: 'CIRCULAR_200',
      beginningWip: 0,
      actualDirectMaterial: 0,
      actualDirectLabor: 0,
      actualOverhead: 0,
      normalDirectMaterial: 0,
      normalDirectLabor: 0,
      finishedUnits: 0,
      endingWipUnits: 0,
      wipMethod: 'DIRECT_MATERIAL',
      completionPercentage: 0,
    },
    assumedRevenue: 450_000_000,
    expectedOutcomeVi: {
      cogsAnalysis:
        'Các nghiệp vụ XKNB Mẫu 03 kết chuyển sang TK 157 (không qua TK 632), do đó không làm tăng giá vốn hàng bán trong kỳ cho tới khi chi nhánh tiêu thụ thực tế.',
      taxImplication:
        'Điều chuyển nội bộ qua Mẫu 03/XKNB không phát sinh nghĩa vụ thuế GTGT đầu ra và thuế TNDN tại thời điểm xuất kho.',
      financialRatios:
        'Hàng tồn kho vẫn nằm trên Mã 140 BCTC B01-DN (phân bổ giữa TK 156 và TK 157), bảo toàn tài sản lưu động của công ty mẹ.',
    },
  },
];

export function getCogsScenarioById(id: string): CogsScenario | undefined {
  return COGS_SCENARIOS.find((scen) => scen.id === id);
}

export function getDefaultCogsScenario(): CogsScenario {
  return COGS_SCENARIOS[0];
}
