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
];

export function getProhibitedAccounts133(): AccountItem[] {
  return PROHIBITED_ACCOUNTS_ITEMS;
}
