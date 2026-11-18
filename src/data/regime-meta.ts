import type { AccountingRegime } from '@/types/coa';

export interface RegimeDisplayMeta {
  id: AccountingRegime;
  shortLabel: string;
  fullLabel: string;
  badgeClass: string;
}

const REGIME_META: Record<AccountingRegime, RegimeDisplayMeta> = {
  CIRCULAR_200: {
    id: 'CIRCULAR_200',
    shortLabel: 'TT 200',
    fullLabel: 'Thông tư 200 (DN Lớn)',
    badgeClass:
      'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  },
  CIRCULAR_133: {
    id: 'CIRCULAR_133',
    shortLabel: 'TT 133',
    fullLabel: 'Thông tư 133 (DN Vừa & Nhỏ)',
    badgeClass:
      'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
  },
  CIRCULAR_99: {
    id: 'CIRCULAR_99',
    shortLabel: 'TT 99/2025',
    fullLabel: 'Thông tư 99/2025 (Hiệu lực 2026)',
    badgeClass:
      'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
  },
  CIRCULAR_58: {
    id: 'CIRCULAR_58',
    shortLabel: 'TT 58/2026',
    fullLabel: 'Thông tư 58/2026 (DN Siêu Nhỏ)',
    badgeClass:
      'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  },
};

export const ORDERED_REGIMES: AccountingRegime[] = [
  'CIRCULAR_200',
  'CIRCULAR_133',
  'CIRCULAR_99',
  'CIRCULAR_58',
];

export function getRegimeDisplayMeta(regime: AccountingRegime): RegimeDisplayMeta {
  return REGIME_META[regime] ?? REGIME_META.CIRCULAR_200;
}

export function getNextRegime(current: AccountingRegime): AccountingRegime {
  const idx = ORDERED_REGIMES.indexOf(current);
  return ORDERED_REGIMES[(idx + 1) % ORDERED_REGIMES.length];
}
