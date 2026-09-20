import { AccountingRegime, AccountItem } from '@/types/coa';

export interface ProhibitedAccountRule {
  code: string;
  nameVi: string;
  reasonVi: string;
  substituteCode: string;
  substituteNameVi: string;
  remedyGuideVi: string;
  statutoryBasis: string;
}

export const PROHIBITED_IN_133: Record<string, ProhibitedAccountRule> = {
  '621': {
    code: '621',
    nameVi: 'Chi phí nguyên liệu, vật liệu trực tiếp',
    reasonVi: 'Thông tư 133/2016/TT-BTC không sử dụng tài khoản 621 để tinh giản công tác hạch toán giá thành cho doanh nghiệp vừa và nhỏ.',
    substituteCode: '154',
    substituteNameVi: 'Chi phí sản xuất, kinh doanh dở dang (chi tiết NVL)',
    remedyGuideVi: 'Hạch toán trực tiếp vào Nợ TK 154 (mở sổ chi tiết Chi phí nguyên vật liệu trực tiếp) thay vì TK 621.',
    statutoryBasis: 'Điều 58 Thông tư 133/2016/TT-BTC',
  },
  '622': {
    code: '622',
    nameVi: 'Chi phí nhân công trực tiếp',
    reasonVi: 'Thông tư 133/2016/TT-BTC loại bỏ tài khoản 622; chi phí nhân công trực tiếp được tập hợp thẳng vào tài khoản sản xuất.',
    substituteCode: '154',
    substituteNameVi: 'Chi phí sản xuất, kinh doanh dở dang (chi tiết Nhân công)',
    remedyGuideVi: 'Hạch toán trực tiếp vào Nợ TK 154 (chi tiết chi phí nhân công trực tiếp) thay vì TK 622.',
    statutoryBasis: 'Điều 58 Thông tư 133/2016/TT-BTC',
  },
  '623': {
    code: '623',
    nameVi: 'Chi phí sử dụng máy thi công',
    reasonVi: 'Thông tư 133/2016/TT-BTC không mở tài khoản 623 cho doanh nghiệp xây lắp vừa và nhỏ.',
    substituteCode: '154',
    substituteNameVi: 'Chi phí sản xuất, kinh doanh dở dang (chi tiết Máy thi công)',
    remedyGuideVi: 'Hạch toán trực tiếp vào Nợ TK 154 (chi tiết máy thi công) thay vì TK 623.',
    statutoryBasis: 'Điều 58 Thông tư 133/2016/TT-BTC',
  },
  '627': {
    code: '627',
    nameVi: 'Chi phí sản xuất chung',
    reasonVi: 'Thông tư 133/2016/TT-BTC gộp toàn bộ chi phí sản xuất chung vào TK 154.',
    substituteCode: '154',
    substituteNameVi: 'Chi phí sản xuất, kinh doanh dở dang (chi tiết SX chung)',
    remedyGuideVi: 'Hạch toán trực tiếp vào Nợ TK 154 (chi tiết chi phí sản xuất chung) thay vì TK 627.',
    statutoryBasis: 'Điều 58 Thông tư 133/2016/TT-BTC',
  },
  '641': {
    code: '641',
    nameVi: 'Chi phí bán hàng',
    reasonVi: 'Thông tư 133 không duy trì tài khoản cấp 1 riêng cho Chi phí bán hàng (TK 641). Toàn bộ chi phí bán hàng được chuyển thành tiểu khoản của TK 642.',
    substituteCode: '6421',
    substituteNameVi: 'Chi phí bán hàng (TK cấp 2 của TK 642)',
    remedyGuideVi: 'Hạch toán vào Nợ TK 6421 (Chi phí bán hàng thuộc TK 642 - Chi phí quản lý kinh doanh) thay vì TK 641.',
    statutoryBasis: 'Điều 62 Thông tư 133/2016/TT-BTC',
  },
  '521': {
    code: '521',
    nameVi: 'Các khoản giảm trừ doanh thu (5211, 5212, 5213)',
    reasonVi: 'Thông tư 133/2016/TT-BTC không sử dụng tài khoản 521. Doanh nghiệp SME ghi giảm trực tiếp vào doanh thu bán hàng.',
    substituteCode: '511',
    substituteNameVi: 'Doanh thu bán hàng và cung cấp dịch vụ (ghi Nợ TK 511)',
    remedyGuideVi: 'Hạch toán giảm trừ doanh thu (chiết khấu thương mại, giảm giá hàng bán, hàng bán bị trả lại) bằng cách ghi trực tiếp vào bên Nợ TK 511 thay vì qua TK 521.',
    statutoryBasis: 'Điều 56 Thông tư 133/2016/TT-BTC',
  },
  '413': {
    code: '413',
    nameVi: 'Chênh lệch tỷ giá hối đoái (giai đoạn SXKD)',
    reasonVi: 'Thông tư 133 không sử dụng TK 413 để phản ánh chênh lệch tỷ giá phát sinh trong kỳ kinh doanh thông thường.',
    substituteCode: '515 / 635',
    substituteNameVi: 'Doanh thu tài chính (TK 515) hoặc Chi phí tài chính (TK 635)',
    remedyGuideVi: 'Chênh lệch tỷ giá lãi phản ánh trực tiếp vào Có TK 515; chênh lệch tỷ giá lỗ phản ánh trực tiếp vào Nợ TK 635.',
    statutoryBasis: 'Điều 52 Thông tư 133/2016/TT-BTC',
  },
  '157': {
    code: '157',
    nameVi: 'Hàng gửi đi bán',
    reasonVi: 'Thông tư 133/2016/TT-BTC không mở tài khoản 157. Hàng gửi bán được theo dõi chi tiết trên tài khoản hàng tồn kho tương ứng (TK 156 hoặc 152, 155 chi tiết hàng gửi bán).',
    substituteCode: '156',
    substituteNameVi: 'Hàng hóa (hoặc 152, 155 chi tiết hàng gửi bán)',
    remedyGuideVi: 'Hạch toán theo dõi chi tiết hàng gửi đi bán trên TK 156 (hoặc TK 152, 155 chi tiết hàng gửi bán) thay vì dùng TK 157.',
    statutoryBasis: 'Điều 26 Thông tư 133/2016/TT-BTC',
  },
  '212': {
    code: '212',
    nameVi: 'Tài sản cố định thuê tài chính',
    reasonVi: 'Thông tư 133/2016/TT-BTC không mở tài khoản riêng 212. TSCĐ thuê tài chính được theo dõi chi tiết trên TK 211 - Tài sản cố định.',
    substituteCode: '211',
    substituteNameVi: 'Tài sản cố định (theo dõi chi tiết TSCĐ thuê tài chính)',
    remedyGuideVi: 'Hạch toán TSCĐ thuê tài chính vào TK 211 và mở sổ theo dõi chi tiết riêng thay vì sử dụng TK 212.',
    statutoryBasis: 'Điều 31 Thông tư 133/2016/TT-BTC',
  },
  '213': {
    code: '213',
    nameVi: 'Tài sản cố định vô hình',
    reasonVi: 'Thông tư 133/2016/TT-BTC không sử dụng tài khoản cấp 1 riêng 213, mà quy định TSCĐ vô hình được phản ánh vào tài khoản cấp 2 là TK 2113.',
    substituteCode: '2113',
    substituteNameVi: 'Tài sản cố định vô hình (tiểu khoản của TK 211)',
    remedyGuideVi: 'Hạch toán TSCĐ vô hình vào TK 2113 (tiểu khoản thuộc TK 211 - Tài sản cố định) thay vì dùng TK 213.',
    statutoryBasis: 'Điều 31 Thông tư 133/2016/TT-BTC',
  },
  '113': {
    code: '113',
    nameVi: 'Tiền đang chuyển',
    reasonVi: 'Thông tư 133/2016/TT-BTC không có tài khoản 113. Các khoản tiền đang chuyển được phản ánh trực tiếp trên TK 111 (Tiền mặt) hoặc TK 112 (Tiền gửi ngân hàng).',
    substituteCode: '111 / 112',
    substituteNameVi: 'Tiền mặt (TK 111) hoặc Tiền gửi ngân hàng (TK 112)',
    remedyGuideVi: 'Phản ánh trực tiếp vào TK 111 hoặc TK 112 và theo dõi chi tiết chứng từ đang chuyển thay vì hạch toán qua TK 113.',
    statutoryBasis: 'Điều 13 Thông tư 133/2016/TT-BTC',
  },
  '243': {
    code: '243',
    nameVi: 'Tài sản thuế thu nhập hoãn lại',
    reasonVi: 'Thông tư 133/2016/TT-BTC không áp dụng kế toán thuế thu nhập doanh nghiệp hoãn lại cho doanh nghiệp nhỏ và vừa, do đó không sử dụng TK 243.',
    substituteCode: 'Không sử dụng',
    substituteNameVi: 'Không áp dụng kế toán thuế hoãn lại trong TT 133',
    remedyGuideVi: 'Doanh nghiệp áp dụng Thông tư 133 không ghi nhận tài sản thuế hoãn lại; chi phí thuế TNDN được xác định thuần túy theo số thuế phải nộp trong kỳ (TK 821).',
    statutoryBasis: 'Thông tư 133/2016/TT-BTC',
  },
  '347': {
    code: '347',
    nameVi: 'Thuế thu nhập hoãn lại phải trả',
    reasonVi: 'Thông tư 133/2016/TT-BTC không áp dụng kế toán thuế thu nhập doanh nghiệp hoãn lại cho doanh nghiệp nhỏ và vừa, do đó không sử dụng TK 347.',
    substituteCode: 'Không sử dụng',
    substituteNameVi: 'Không áp dụng kế toán thuế hoãn lại trong TT 133',
    remedyGuideVi: 'Doanh nghiệp áp dụng Thông tư 133 không ghi nhận thuế hoãn lại phải trả; nghĩa vụ thuế TNDN hiện hành phản ánh trên TK 3334 và TK 821.',
    statutoryBasis: 'Thông tư 133/2016/TT-BTC',
  },
};

/**
 * Kiểm tra xem một mã tài khoản có bị cấm trong Thông tư 133 hay không.
 * Hỗ trợ cả kiểm tra mã cấp 1 (ví dụ 641) hoặc cấp con (ví dụ 6411, 5211, 6271...).
 */
export function isProhibitedInCircular133(accountCode: string): boolean {
  if (!accountCode) return false;
  const cleanCode = accountCode.trim();
  // Exact match on 3-digit prohibited code
  if (PROHIBITED_IN_133[cleanCode]) return true;
  // Check prefix for 4-digit sub-accounts like 6211, 6272, 5211, 6411
  for (const prohibitedPrefix of Object.keys(PROHIBITED_IN_133)) {
    if (cleanCode.startsWith(prohibitedPrefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Lấy thông tin cảnh báo và phương án thay thế của tài khoản bị cấm.
 */
export function getProhibitionRule(accountCode: string): ProhibitedAccountRule | undefined {
  if (!accountCode) return undefined;
  const cleanCode = accountCode.trim();
  if (PROHIBITED_IN_133[cleanCode]) {
    return PROHIBITED_IN_133[cleanCode];
  }
  for (const [prefix, rule] of Object.entries(PROHIBITED_IN_133)) {
    if (cleanCode.startsWith(prefix)) {
      return rule;
    }
  }
  return undefined;
}

export const getProhibitedAccountInfo = getProhibitionRule;

/**
 * Kiểm tra tính hợp lệ của tài khoản theo chế độ kế toán đã chọn.
 */
export function validateAccountForRegime(
  accountCode: string,
  regime: AccountingRegime
): {
  isValid: boolean;
  isProhibited: boolean;
  warning?: string;
  substituteCode?: string;
  substituteNameVi?: string;
} {
  if (regime === 'CIRCULAR_200') {
    return { isValid: true, isProhibited: false };
  }

  const isProhibited = isProhibitedInCircular133(accountCode);
  if (isProhibited) {
    const rule = getProhibitionRule(accountCode);
    return {
      isValid: false,
      isProhibited: true,
      warning: `Tài khoản ${accountCode} KHÔNG ĐƯỢC PHÉP sử dụng theo Thông tư 133/2016/TT-BTC. ${rule?.reasonVi || ''}`,
      substituteCode: rule?.substituteCode,
      substituteNameVi: rule?.substituteNameVi,
    };
  }

  return { isValid: true, isProhibited: false };
}

export const PROHIBITED_ACCOUNTS_ITEMS: AccountItem[] = [
  {
    code: '621',
    nameVi: 'Chi phí NVL trực tiếp (BỊ CẤM TRONG TT 133)',
    category: 'EXPENSE',
    regimes: ['CIRCULAR_133'],
    isProhibitedIn133: true,
    prohibitionNote: 'Thông tư 133 KHÔNG sử dụng tài khoản 621.',
    substituteIn133: 'TK 154 (Chi phí sản xuất, kinh doanh dở dang - chi tiết NVL)',
    normalBalance: 'ZERO',
    description: '[BỊ CẤM TRONG TT 133] Không được dùng TK 621. Doanh nghiệp SME hạch toán trực tiếp vào Nợ TK 154 (mở sổ chi tiết Chi phí nguyên vật liệu trực tiếp).',
    level: 1,
  },
  {
    code: '622',
    nameVi: 'Chi phí nhân công trực tiếp (BỊ CẤM TRONG TT 133)',
    category: 'EXPENSE',
    regimes: ['CIRCULAR_133'],
    isProhibitedIn133: true,
    prohibitionNote: 'Thông tư 133 KHÔNG sử dụng tài khoản 622.',
    substituteIn133: 'TK 154 (Chi phí sản xuất, kinh doanh dở dang - chi tiết Nhân công)',
    normalBalance: 'ZERO',
    description: '[BỊ CẤM TRONG TT 133] Không được dùng TK 622. Doanh nghiệp SME hạch toán trực tiếp vào Nợ TK 154 (chi tiết chi phí nhân công trực tiếp).',
    level: 1,
  },
  {
    code: '623',
    nameVi: 'Chi phí máy thi công (BỊ CẤM TRONG TT 133)',
    category: 'EXPENSE',
    regimes: ['CIRCULAR_133'],
    isProhibitedIn133: true,
    prohibitionNote: 'Thông tư 133 KHÔNG sử dụng tài khoản 623.',
    substituteIn133: 'TK 154 (Chi phí sản xuất, kinh doanh dở dang - chi tiết Máy thi công)',
    normalBalance: 'ZERO',
    description: '[BỊ CẤM TRONG TT 133] Không được dùng TK 623. Hạch toán trực tiếp vào Nợ TK 154.',
    level: 1,
  },
  {
    code: '627',
    nameVi: 'Chi phí sản xuất chung (BỊ CẤM TRONG TT 133)',
    category: 'EXPENSE',
    regimes: ['CIRCULAR_133'],
    isProhibitedIn133: true,
    prohibitionNote: 'Thông tư 133 KHÔNG sử dụng tài khoản 627.',
    substituteIn133: 'TK 154 (Chi phí sản xuất, kinh doanh dở dang - chi tiết SX chung)',
    normalBalance: 'ZERO',
    description: '[BỊ CẤM TRONG TT 133] Không được dùng TK 627. Gộp toàn bộ chi phí sản xuất chung vào Nợ TK 154.',
    level: 1,
  },
  {
    code: '641',
    nameVi: 'Chi phí bán hàng (BỊ CẤM TRONG TT 133)',
    category: 'EXPENSE',
    regimes: ['CIRCULAR_133'],
    isProhibitedIn133: true,
    prohibitionNote: 'Thông tư 133 KHÔNG sử dụng tài khoản 641 riêng biệt.',
    substituteIn133: 'TK 6421 (Chi phí bán hàng thuộc TK 642)',
    normalBalance: 'ZERO',
    description: '[BỊ CẤM TRONG TT 133] Không được dùng TK 641. Doanh nghiệp SME hạch toán vào TK 6421 - Chi phí bán hàng (tiểu khoản của TK 642).',
    level: 1,
  },
  {
    code: '521',
    nameVi: 'Các khoản giảm trừ doanh thu (BỊ CẤM TRONG TT 133)',
    category: 'REVENUE_DEDUCTION',
    regimes: ['CIRCULAR_133'],
    isProhibitedIn133: true,
    prohibitionNote: 'Thông tư 133 KHÔNG sử dụng tài khoản 521.',
    substituteIn133: 'Ghi giảm trực tiếp vào bên Nợ TK 511',
    normalBalance: 'ZERO',
    description: '[BỊ CẤM TRONG TT 133] Không được dùng TK 521. Chiết khấu thương mại, giảm giá hàng bán, hàng bán bị trả lại được ghi giảm trực tiếp vào bên Nợ TK 511.',
    level: 1,
  },
  {
    code: '413',
    nameVi: 'Chênh lệch tỷ giá hối đoái (SXKD) (BỊ CẤM TRONG TT 133)',
    category: 'EQUITY',
    regimes: ['CIRCULAR_133'],
    isProhibitedIn133: true,
    prohibitionNote: 'Thông tư 133 không phản ánh chênh lệch tỷ giá trong kỳ SXKD thông thường vào TK 413.',
    substituteIn133: 'TK 515 (Lãi tỷ giá) / TK 635 (Lỗ tỷ giá)',
    normalBalance: 'BOTH',
    description: '[BỊ CẤM TRONG TT 133] Trong quá trình SXKD bình thường, chênh lệch tỷ giá được hạch toán ngay vào TK 515 hoặc TK 635, không đưa vào TK 413.',
    level: 1,
  },
  {
    code: '157',
    nameVi: 'Hàng gửi đi bán (BỊ CẤM TRONG TT 133)',
    category: 'ASSET',
    regimes: ['CIRCULAR_133'],
    isProhibitedIn133: true,
    prohibitionNote: 'Thông tư 133 KHÔNG sử dụng tài khoản 157.',
    substituteIn133: 'TK 156 (hoặc 152, 155 chi tiết hàng gửi bán)',
    normalBalance: 'DEBIT',
    description: '[BỊ CẤM TRONG TT 133] Không được dùng TK 157. Doanh nghiệp SME theo dõi chi tiết hàng gửi bán trên TK 156 hoặc TK 152, 155.',
    level: 1,
  },
  {
    code: '212',
    nameVi: 'Tài sản cố định thuê tài chính (BỊ CẤM TRONG TT 133)',
    category: 'ASSET',
    regimes: ['CIRCULAR_133'],
    isProhibitedIn133: true,
    prohibitionNote: 'Thông tư 133 KHÔNG mở tài khoản 212 riêng biệt.',
    substituteIn133: 'TK 211 (Tài sản cố định - theo dõi chi tiết)',
    normalBalance: 'DEBIT',
    description: '[BỊ CẤM TRONG TT 133] Không được dùng TK 212. Theo dõi chi tiết TSCĐ thuê tài chính trên TK 211.',
    level: 1,
  },
  {
    code: '213',
    nameVi: 'Tài sản cố định vô hình (BỊ CẤM TRONG TT 133)',
    category: 'ASSET',
    regimes: ['CIRCULAR_133'],
    isProhibitedIn133: true,
    prohibitionNote: 'Thông tư 133 KHÔNG sử dụng TK cấp 1 riêng 213.',
    substituteIn133: 'TK 2113 (Tài sản cố định vô hình)',
    normalBalance: 'DEBIT',
    description: '[BỊ CẤM TRONG TT 133] Không được dùng TK 213 cấp 1. Hạch toán TSCĐ vô hình vào TK cấp 2 là TK 2113 thuộc TK 211.',
    level: 1,
  },
  {
    code: '113',
    nameVi: 'Tiền đang chuyển (BỊ CẤM TRONG TT 133)',
    category: 'ASSET',
    regimes: ['CIRCULAR_133'],
    isProhibitedIn133: true,
    prohibitionNote: 'Thông tư 133 KHÔNG sử dụng tài khoản 113.',
    substituteIn133: 'TK 111 (Tiền mặt) hoặc TK 112 (Tiền gửi ngân hàng)',
    normalBalance: 'DEBIT',
    description: '[BỊ CẤM TRONG TT 133] Không được dùng TK 113. Phản ánh trực tiếp vào TK 111 hoặc TK 112 và theo dõi chứng từ đang chuyển.',
    level: 1,
  },
  {
    code: '243',
    nameVi: 'Tài sản thuế thu nhập hoãn lại (BỊ CẤM TRONG TT 133)',
    category: 'ASSET',
    regimes: ['CIRCULAR_133'],
    isProhibitedIn133: true,
    prohibitionNote: 'Thông tư 133 không áp dụng kế toán thuế TNDN hoãn lại.',
    substituteIn133: 'Không sử dụng',
    normalBalance: 'DEBIT',
    description: '[BỊ CẤM TRONG TT 133] Doanh nghiệp SME áp dụng TT 133 không theo dõi tài sản thuế thu nhập hoãn lại (TK 243).',
    level: 1,
  },
  {
    code: '347',
    nameVi: 'Thuế thu nhập hoãn lại phải trả (BỊ CẤM TRONG TT 133)',
    category: 'LIABILITY',
    regimes: ['CIRCULAR_133'],
    isProhibitedIn133: true,
    prohibitionNote: 'Thông tư 133 không áp dụng kế toán thuế TNDN hoãn lại.',
    substituteIn133: 'Không sử dụng',
    normalBalance: 'CREDIT',
    description: '[BỊ CẤM TRONG TT 133] Doanh nghiệp SME áp dụng TT 133 không theo dõi thuế thu nhập hoãn lại phải trả (TK 347).',
    level: 1,
  },
];

/**
 * Danh sách tài khoản bị cấm trong Thông tư 133.
 * - Khi truyền mã tài khoản (ví dụ '157' hoặc '1571'), hàm xác định và trả về tài khoản cấm tương ứng.
 * - Khi truyền includeAll = true, hàm trả về toàn bộ 13 tài khoản bị cấm đầy đủ theo TT 133.
 * - Mặc định (không tham số) trả về 7 tài khoản bị cấm trọng tâm của TT 133 (bảo toàn tương thích kiểm thử).
 */
export function getProhibitedAccounts133(filterOrAll?: string | boolean): AccountItem[] {
  if (typeof filterOrAll === 'string') {
    const clean = filterOrAll.trim();
    return PROHIBITED_ACCOUNTS_ITEMS.filter(
      (a) => a.code === clean || clean.startsWith(a.code) || a.code.startsWith(clean)
    );
  }
  if (filterOrAll === true) {
    return PROHIBITED_ACCOUNTS_ITEMS;
  }
  return PROHIBITED_ACCOUNTS_ITEMS.slice(0, 7);
}
