export type AccountingRegime = 'CIRCULAR_133' | 'CIRCULAR_200';

export type AccountCategory =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'REVENUE_DEDUCTION'
  | 'COST_OF_GOODS'
  | 'EXPENSE'
  | 'OTHER_INCOME_EXPENSE'
  | 'BUSINESS_RESULT';

export type NormalBalance = 'DEBIT' | 'CREDIT' | 'ZERO' | 'BOTH';

export interface AccountItem {
  code: string;
  nameVi: string;
  nameEn?: string;
  category: AccountCategory;
  regimes: AccountingRegime[];
  isProhibitedIn133?: boolean;
  prohibitionNote?: string;
  substituteIn133?: string;
  normalBalance: NormalBalance;
  description: string;
  parentCode?: string;
  level?: 1 | 2; // Level 1 = 3 digits, Level 2 = 4 digits or more
}

export interface CategoryInfo {
  category: AccountCategory;
  nameVi: string;
  accountClasses: string; // e.g. "Loại 1 & 2"
  colorClass: string;
}

export const CATEGORY_METADATA: Record<AccountCategory, CategoryInfo> = {
  ASSET: {
    category: 'ASSET',
    nameVi: 'Tài sản',
    accountClasses: 'Loại 1 & Loại 2',
    colorClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
  },
  LIABILITY: {
    category: 'LIABILITY',
    nameVi: 'Nợ phải trả',
    accountClasses: 'Loại 3',
    colorClass: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
  },
  EQUITY: {
    category: 'EQUITY',
    nameVi: 'Vốn chủ sở hữu',
    accountClasses: 'Loại 4',
    colorClass: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
  },
  REVENUE: {
    category: 'REVENUE',
    nameVi: 'Doanh thu',
    accountClasses: 'Loại 5',
    colorClass: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
  },
  REVENUE_DEDUCTION: {
    category: 'REVENUE_DEDUCTION',
    nameVi: 'Giảm trừ doanh thu',
    accountClasses: 'TK 521 (TT 200)',
    colorClass: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
  },
  COST_OF_GOODS: {
    category: 'COST_OF_GOODS',
    nameVi: 'Giá vốn hàng bán',
    accountClasses: 'TK 632',
    colorClass: 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
  },
  EXPENSE: {
    category: 'EXPENSE',
    nameVi: 'Chi phí hoạt động & SXKD',
    accountClasses: 'Loại 6',
    colorClass: 'text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700',
  },
  OTHER_INCOME_EXPENSE: {
    category: 'OTHER_INCOME_EXPENSE',
    nameVi: 'Thu nhập & Chi phí khác',
    accountClasses: 'Loại 7 & Loại 8',
    colorClass: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
  },
  BUSINESS_RESULT: {
    category: 'BUSINESS_RESULT',
    nameVi: 'Xác định kết quả kinh doanh',
    accountClasses: 'Loại 9 (TK 911)',
    colorClass: 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
  },
};
