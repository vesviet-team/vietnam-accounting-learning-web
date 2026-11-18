import { AccountItem, AccountingRegime, AccountCategory } from '@/types/coa';
import type { Circular99Highlight } from './coa-circular-99';
import type { Circular58Highlight } from './coa-circular-58';
import { COA_CIRCULAR_200 } from './coa-circular-200';
import { isProhibitedInCircular133, getProhibitionRule } from './prohibited-accounts';

/**
 * COA Service — dataset loading per accounting regime.
 *
 * Code-splitting (P2): chỉ dataset chế độ MẶC ĐỊNH (TT 200) được import tĩnh để
 * giữ nguyên UX khởi động. Các dataset còn lại (TT 133, TT 99, TT 58) được tải
 * bằng dynamic import() theo chế độ được chọn và cache lại trong module.
 *
 * API đồng bộ (getAccountsByRegime / findAccountByCode / searchAccounts) đọc từ
 * cache: với CIRCULAR_200 luôn có sẵn; với các chế độ khác trả về [] (kèm cảnh
 * báo console) cho đến khi ensureAccountsLoaded() hoàn tất. Consumer đồng bộ
 * (Journalizer) đăng ký ensureAccountsLoaded trong effect để nhận re-render.
 */

export interface CoaRegimeBundle {
  accounts: AccountItem[];
  circular99Highlights?: Circular99Highlight[];
  circular58Highlights?: Circular58Highlight[];
}

type RegimeLoader = () => Promise<{
  COA_CIRCULAR_133?: AccountItem[];
  COA_CIRCULAR_99?: AccountItem[];
  COA_CIRCULAR_58?: AccountItem[];
  CIRCULAR_99_KEY_HIGHLIGHTS?: Circular99Highlight[];
  CIRCULAR_58_KEY_HIGHLIGHTS?: Circular58Highlight[];
}>;

const REGIME_LOADERS: Record<Exclude<AccountingRegime, 'CIRCULAR_200'>, RegimeLoader> = {
  CIRCULAR_133: () => import('./coa-circular-133'),
  CIRCULAR_99: () => import('./coa-circular-99'),
  CIRCULAR_58: () => import('./coa-circular-58'),
};

const ACCOUNTS_CACHE: Partial<Record<AccountingRegime, AccountItem[]>> = {
  CIRCULAR_200: COA_CIRCULAR_200,
};
let circular99Highlights: Circular99Highlight[] | null = null;
let circular58Highlights: Circular58Highlight[] | null = null;

const IN_FLIGHT: Partial<Record<AccountingRegime, Promise<AccountItem[]>>> = {};

/** Tải (và cache) dataset của một chế độ kế toán bằng dynamic import theo regime. */
export async function ensureAccountsLoaded(regime: AccountingRegime): Promise<AccountItem[]> {
  if (regime === 'CIRCULAR_200') return COA_CIRCULAR_200;
  const cached = ACCOUNTS_CACHE[regime];
  if (cached) return cached;

  if (!IN_FLIGHT[regime]) {
    IN_FLIGHT[regime] = REGIME_LOADERS[regime]().then((mod) => {
      const accounts =
        mod.COA_CIRCULAR_133 ?? mod.COA_CIRCULAR_99 ?? mod.COA_CIRCULAR_58 ?? [];
      ACCOUNTS_CACHE[regime] = accounts;
      if (mod.CIRCULAR_99_KEY_HIGHLIGHTS) circular99Highlights = mod.CIRCULAR_99_KEY_HIGHLIGHTS;
      if (mod.CIRCULAR_58_KEY_HIGHLIGHTS) circular58Highlights = mod.CIRCULAR_58_KEY_HIGHLIGHTS;
      return accounts;
    });
  }
  return IN_FLIGHT[regime]!;
}

/** Tiền tải toàn bộ dataset (phục vụ test và các consumer cần API đồng bộ cho mọi regime). */
export async function ensureAllRegimesLoaded(): Promise<void> {
  await Promise.all([
    ensureAccountsLoaded('CIRCULAR_133'),
    ensureAccountsLoaded('CIRCULAR_99'),
    ensureAccountsLoaded('CIRCULAR_58'),
  ]);
}

export function hasAccountsLoaded(regime: AccountingRegime): boolean {
  return Boolean(ACCOUNTS_CACHE[regime]);
}

export function getAccountsByRegime(regime: AccountingRegime): AccountItem[] {
  const cached = ACCOUNTS_CACHE[regime];
  if (cached) return cached;
  if (regime !== 'CIRCULAR_200') {
    // Dataset chưa được dynamic-import: trả về rỗng thay vì throw để không phá
    // render đồng bộ; consumer nên await ensureAccountsLoaded(regime) trước.
    console.warn(`[coa-service] Dataset cho ${regime} chưa được tải — gọi ensureAccountsLoaded() trước.`);
  }
  return [];
}

export function getCircular99Highlights(): Circular99Highlight[] {
  return circular99Highlights ?? [];
}

export function getCircular58Highlights(): Circular58Highlight[] {
  return circular58Highlights ?? [];
}

export function findAccountByCode(code: string, regime: AccountingRegime): AccountItem | undefined {
  const accounts = getAccountsByRegime(regime);
  return accounts.find((acc) => acc.code === code);
}

export function searchAccounts(
  query: string,
  regime: AccountingRegime,
  categoryFilter?: AccountCategory | 'ALL'
): AccountItem[] {
  const accounts = getAccountsByRegime(regime);
  const normalizedQuery = query.trim().toLowerCase();

  return accounts.filter((account) => {
    // Check category filter
    if (categoryFilter && categoryFilter !== 'ALL' && account.category !== categoryFilter) {
      return false;
    }

    if (!normalizedQuery) return true;

    // Search by code, Vietnamese name, description, or substitute
    const matchCode = account.code.toLowerCase().includes(normalizedQuery);
    const matchName = account.nameVi.toLowerCase().includes(normalizedQuery);
    const matchDesc = account.description.toLowerCase().includes(normalizedQuery);
    const matchSubstitute = account.substituteIn133?.toLowerCase().includes(normalizedQuery);

    return matchCode || matchName || matchDesc || matchSubstitute;
  });
}

export {
  isProhibitedInCircular133,
  getProhibitionRule,
};

// Giữ kiểu cũ export lại cho consumer type-only (không kéo runtime dataset)
export type { Circular99Highlight, Circular58Highlight };
