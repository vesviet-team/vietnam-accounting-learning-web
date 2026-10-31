import { AccountItem } from '@/types/coa';
import { COA_CIRCULAR_200 } from './coa-circular-200';

export interface Circular99Highlight {
  id: string;
  titleVi: string;
  effectiveDate: string;
  replacedCircular: string;
  summaryVi: string;
  statutoryBasis: string;
}

export const CIRCULAR_99_KEY_HIGHLIGHTS: Circular99Highlight[] = [
  {
    id: 'tt99-b01-rename',
    titleVi: 'Đổi tên B01-DN thành "Báo cáo tình hình tài chính"',
    effectiveDate: '01/01/2026',
    replacedCircular: 'Thông tư 200/2014/TT-BTC',
    summaryVi:
      'Mẫu B01-DN chính thức đổi tên từ "Bảng cân đối kế toán" thành "Báo cáo tình hình tài chính" (Statement of Financial Position), tiệm cận chuẩn mực báo cáo tài chính quốc tế IFRS/IAS 1.',
    statutoryBasis: 'Thông tư 99/2025/TT-BTC (ban hành ngày 27/10/2025, hiệu lực 01/01/2026)',
  },
  {
    id: 'tt99-coa-autonomy',
    titleVi: 'Trao quyền chủ động mở tài khoản cấp 2, cấp 3 theo quản trị nội bộ',
    effectiveDate: '01/01/2026',
    replacedCircular: 'Thông tư 200/2014/TT-BTC',
    summaryVi:
      'Doanh nghiệp được chủ động thiết kế, mở thêm các tài khoản chi tiết cấp 2, cấp 3 và ban hành Quy chế hạch toán nội bộ phù hợp với đặc thù mô hình sản xuất kinh doanh và ERP số hóa.',
    statutoryBasis: 'Thông tư 99/2025/TT-BTC Chương II - Hệ thống Tài khoản Kế toán',
  },
  {
    id: 'tt99-functional-currency',
    titleVi: 'Chuẩn hóa Đơn vị tiền tệ trong kế toán & Chuyển đổi sang VND',
    effectiveDate: '01/01/2026',
    replacedCircular: 'Thông tư 200/2014/TT-BTC',
    summaryVi:
      'Làm rõ tiêu chí xác định đơn vị tiền tệ trong kế toán khi doanh nghiệp thu - chi chủ yếu bằng ngoại tệ, nhưng bắt buộc trình bày Báo cáo tài chính pháp lý nộp cơ quan nhà nước bằng Đồng Việt Nam (VND).',
    statutoryBasis: 'Thông tư 99/2025/TT-BTC Chương I - Quy định chung về đơn vị tiền tệ',
  },
  {
    id: 'tt99-digital-internal-control',
    titleVi: 'Số hóa Chứng từ điện tử, Chữ ký số & Kiểm soát nội bộ bắt buộc',
    effectiveDate: '01/01/2026',
    replacedCircular: 'Thông tư 200/2014/TT-BTC',
    summaryVi:
      'Tích hợp khung pháp lý cho chứng từ điện tử, chữ ký số trong toàn bộ chu trình kế toán và bổ sung quy định bắt buộc về thiết lập hệ thống kiểm soát nội bộ, phân tách nhiệm vụ lập - duyệt - ghi sổ.',
    statutoryBasis: 'Thông tư 99/2025/TT-BTC Quy định về Chứng từ, Sổ kế toán & Kiểm soát nội bộ',
  },
];

const CIRCULAR_99_SPECIFIC_NOTES: Record<string, string> = {
  '111':
    'Theo TT 99/2025/TT-BTC (hiệu lực 01/01/2026): Tăng cường kiểm soát nội bộ quỹ tiền mặt và đối chiếu chứng từ điện tử; kết hợp quy định thanh toán không dùng tiền mặt từ 5 triệu đồng theo Luật Thuế GTGT 48/2024/QH15.',
  '112':
    'Theo TT 99/2025/TT-BTC: Tích hợp đối chiếu sao kê ngân hàng điện tử (ERP/Open Banking) và theo dõi chặt chẽ nguyên tệ - tỷ giá giao dịch thực tế.',
  '211':
    'Theo TT 99/2025/TT-BTC: Trình bày trên Báo cáo tình hình tài chính (Mẫu B01-DN mới) theo nguyên giá và giá trị hao mòn lũy kế.',
  '411':
    'Theo TT 99/2025/TT-BTC: Phản ánh vốn đầu tư của chủ sở hữu trên Báo cáo tình hình tài chính, phân định rõ vốn góp thực tế và thặng dư vốn.',
  '413':
    'Theo TT 99/2025/TT-BTC: Chuẩn hóa xử lý chênh lệch tỷ giá hối đoái khi đánh giá lại các khoản mục tiền tệ có gốc ngoại tệ cuối kỳ và khi chuyển đổi BCTC từ đồng tiền kế toán sang VND.',
  '511':
    'Theo TT 99/2025/TT-BTC: Ghi nhận doanh thu bán hàng và cung cấp dịch vụ đồng bộ với thời điểm lập hóa đơn điện tử theo Nghị định 123/2020/NĐ-CP và Nghị định 70/2025/NĐ-CP.',
  '642':
    'Theo TT 99/2025/TT-BTC: Doanh nghiệp chủ động mở tiểu khoản chi phí quản lý doanh nghiệp theo trung tâm chi phí (Cost Center) phục vụ quản trị nội bộ.',
  '911':
    'Theo TT 99/2025/TT-BTC: Tài khoản trung gian kết chuyển toàn bộ doanh thu, thu nhập và chi phí để xác định Lợi nhuận sau thuế trong kỳ; số dư cuối kỳ bắt buộc bằng 0.',
};

/**
 * Hệ thống Tài khoản Kế toán theo Thông tư 99/2025/TT-BTC
 * Ban hành ngày 27/10/2025 của Bộ Tài chính, có hiệu lực từ 01/01/2026 (thay thế Thông tư 200/2014/TT-BTC).
 */
export const COA_CIRCULAR_99: AccountItem[] = COA_CIRCULAR_200.map((account) => {
  const extraNote = CIRCULAR_99_SPECIFIC_NOTES[account.code];
  const regimes: AccountItem['regimes'] = account.regimes.includes('CIRCULAR_99')
    ? account.regimes
    : [...account.regimes, 'CIRCULAR_99'];

  return {
    ...account,
    regimes,
    description: extraNote
      ? `${account.description} [${extraNote}]`
      : `${account.description} (Áp dụng tiếp nối theo Thông tư 99/2025/TT-BTC từ 01/01/2026).`,
  };
});
