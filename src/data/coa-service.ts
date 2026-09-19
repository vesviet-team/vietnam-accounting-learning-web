import { AccountItem, AccountingRegime, AccountCategory } from '@/types/coa';
import { COA_CIRCULAR_200 } from './coa-circular-200';
import { COA_CIRCULAR_133 } from './coa-circular-133';
import { isProhibitedInCircular133, getProhibitionRule } from './prohibited-accounts';

export function getAccountsByRegime(regime: AccountingRegime): AccountItem[] {
  return regime === 'CIRCULAR_200' ? COA_CIRCULAR_200 : COA_CIRCULAR_133;
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

export { isProhibitedInCircular133, getProhibitionRule };
