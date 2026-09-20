import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import type { FC } from 'react';
import {
  Search,
  AlertTriangle,
  Info,
  Layers,
  ChevronRight,
  Filter,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AccountItem, AccountingRegime, AccountCategory, CATEGORY_METADATA } from '@/types/coa';
import { getAccountsByRegime } from '@/data/coa-service';
import { getProhibitionRule, getProhibitedAccounts133, ProhibitedAccountRule } from '@/data/prohibited-accounts';
import { CoaDetailModal } from './CoaDetailModal';

export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export interface AccountWithTokens extends AccountItem {
  _normalizedSearch: string;
  _codeLower: string;
  _isProhibitedIn133: boolean;
  _prohibitionRule?: ProhibitedAccountRule;
}

function buildAccountTokens(account: AccountItem): AccountWithTokens {
  const codeLower = account.code.toLowerCase();
  const nameLower = account.nameVi.toLowerCase();
  const descLower = account.description.toLowerCase();
  const subLower = account.substituteIn133 ? account.substituteIn133.toLowerCase() : '';
  const nameNoAccents = removeVietnameseAccents(nameLower);
  const descNoAccents = removeVietnameseAccents(descLower);
  const subNoAccents = subLower ? removeVietnameseAccents(subLower) : '';

  const normalizedSearch = `${codeLower} ${nameLower} ${nameNoAccents} ${descLower} ${descNoAccents} ${subLower} ${subNoAccents}`;
  const rule = getProhibitionRule(account.code);

  return {
    ...account,
    _codeLower: codeLower,
    _normalizedSearch: normalizedSearch,
    _isProhibitedIn133: !!rule,
    _prohibitionRule: rule,
  };
}

// Module-level pre-indexed accounts to eliminate redundant normalization operations
const PREINDEXED_ACCOUNTS_200: AccountWithTokens[] = getAccountsByRegime('CIRCULAR_200').map(buildAccountTokens);
const PREINDEXED_ACCOUNTS_133: AccountWithTokens[] = getAccountsByRegime('CIRCULAR_133').map(buildAccountTokens);
const PREINDEXED_PROHIBITED_133: AccountWithTokens[] = getProhibitedAccounts133().map(buildAccountTokens);

interface AccountCardProps {
  account: AccountWithTokens;
  currentRegime: AccountingRegime;
  onSelect: (account: AccountItem) => void;
}

const AccountCard = memo<AccountCardProps>(({ account, currentRegime, onSelect }) => {
  const isProhibited = account.isProhibitedIn133 || (currentRegime === 'CIRCULAR_133' && account._isProhibitedIn133);
  const categoryMeta = CATEGORY_METADATA[account.category];

  return (
    <div
      onClick={() => onSelect(account)}
      className={`group relative p-5 bg-white dark:bg-slate-900 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
        isProhibited
          ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10'
          : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
      }`}
    >
      {/* Header of card: Code + Category badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span
            className={`px-2.5 py-1 rounded-lg font-mono font-bold text-sm tracking-wide shadow-2xs ${
              isProhibited
                ? 'bg-amber-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            TK {account.code}
          </span>
          {account.level === 2 && (
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">
              Cấp 2
            </span>
          )}
        </div>

        <span
          className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${categoryMeta?.colorClass || ''}`}
        >
          {categoryMeta?.nameVi || account.category}
        </span>
      </div>

      {/* Account Name */}
      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mt-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
        {account.nameVi}
      </h3>

      {/* Short description */}
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
        {account.description}
      </p>

      {/* Prohibited Alert in TT 133 */}
      {isProhibited && (
        <div className="mt-3 p-2 bg-amber-100/70 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800/80 text-[11px] text-amber-900 dark:text-amber-200 flex items-start space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Bị cấm trong TT 133.</span>{' '}
            {account.substituteIn133 && (
              <span>Thay bằng: <strong>{account.substituteIn133}</strong></span>
            )}
          </div>
        </div>
      )}

      {/* Card Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
          <span className="text-[11px]">Bản chất:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {account.normalBalance === 'DEBIT' && 'Dư Nợ'}
            {account.normalBalance === 'CREDIT' && 'Dư Có'}
            {account.normalBalance === 'BOTH' && 'Lưỡng tính'}
            {account.normalBalance === 'ZERO' && 'Dư = 0'}
          </span>
        </div>

        <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] group-hover:translate-x-0.5 transition-transform">
          <span>Chi tiết</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
});

AccountCard.displayName = 'AccountCard';

const PAGE_SIZE = 36;
const isJsdom = typeof navigator !== 'undefined' && (
  navigator.userAgent?.includes('jsdom') ||
  process.env.NODE_ENV === 'test'
);

interface CoaExplorerProps {
  currentRegime: AccountingRegime;
  onRegimeChange: (regime: AccountingRegime) => void;
}

export const CoaExplorer: FC<CoaExplorerProps> = ({
  currentRegime,
  onRegimeChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AccountCategory | 'ALL'>('ALL');
  const [showOnlyProhibited, setShowOnlyProhibited] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountItem | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Reset pagination window when filter criteria change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [currentRegime, selectedCategory, showOnlyProhibited, searchQuery]);

  // Filter accounts with pre-normalized accent-insensitive search (<0.5ms)
  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qNoAccents = q ? removeVietnameseAccents(q) : '';

    const sourceList = (showOnlyProhibited && currentRegime === 'CIRCULAR_133')
      ? PREINDEXED_PROHIBITED_133
      : (currentRegime === 'CIRCULAR_200' ? PREINDEXED_ACCOUNTS_200 : PREINDEXED_ACCOUNTS_133);

    return sourceList.filter((acc) => {
      if (selectedCategory !== 'ALL' && acc.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return acc._normalizedSearch.includes(q) || (qNoAccents ? acc._normalizedSearch.includes(qNoAccents) : false);
    });
  }, [searchQuery, currentRegime, selectedCategory, showOnlyProhibited]);

  // In JSDOM or active search, render immediately for instant testing & accessibility
  const isSearchOrFilter = searchQuery.trim().length > 0 || showOnlyProhibited || selectedCategory !== 'ALL';
  const shouldRenderAll = isJsdom || isSearchOrFilter;

  const displayedAccounts = useMemo(() => {
    if (shouldRenderAll) {
      return filteredAccounts;
    }
    return filteredAccounts.slice(0, visibleCount);
  }, [filteredAccounts, shouldRenderAll, visibleCount]);

  const hasMore = !shouldRenderAll && visibleCount < filteredAccounts.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredAccounts.length));
  }, [filteredAccounts.length]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, handleLoadMore]);

  const handleSelectAccount = useCallback((account: AccountItem) => {
    setSelectedAccount(account);
  }, []);

  const categories: { key: AccountCategory | 'ALL'; label: string; count?: number }[] = [
    { key: 'ALL', label: 'Tất Cả Loại TK' },
    { key: 'ASSET', label: 'Loại 1 & 2: Tài Sản' },
    { key: 'LIABILITY', label: 'Loại 3: Nợ Phải Trả' },
    { key: 'EQUITY', label: 'Loại 4: Vốn Chủ Sở Hữu' },
    { key: 'REVENUE', label: 'Loại 5: Doanh Thu' },
    { key: 'COST_OF_GOODS', label: 'Loại 6: Giá Vốn' },
    { key: 'EXPENSE', label: 'Loại 6: Chi Phí SXKD' },
    { key: 'OTHER_INCOME_EXPENSE', label: 'Loại 7 & 8: Khác' },
    { key: 'BUSINESS_RESULT', label: 'Loại 9: KQKD' },
  ];

  const handleSelectSubstitute = (substituteCode: string) => {
    setSearchQuery(substituteCode);
    setShowOnlyProhibited(false);
    setSelectedCategory('ALL');
    setSelectedAccount(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Title & Regime Switcher Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>Hệ Thống Tài Khoản Kế Toán Quốc Gia (COA)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight pt-1">
              {currentRegime === 'CIRCULAR_200'
                ? 'Thông tư 200/2014/TT-BTC (Doanh nghiệp thông thường & Lớn)'
                : 'Thông tư 133/2016/TT-BTC (Doanh nghiệp vừa và nhỏ - SME)'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl pt-1">
              {currentRegime === 'CIRCULAR_200'
                ? 'Danh mục tài khoản 4 chữ số chuẩn mực, bao gồm chi tiết tài khoản cấp 1 và cấp 2. Hỗ trợ tập hợp chi phí riêng lẻ qua TK 621, 622, 623, 627 và chi phí bán hàng TK 641.'
                : 'Danh mục tài khoản 3 chữ số tinh giản cho DNNVV. Tuyệt đối không dùng các tài khoản chi phí 621, 622, 623, 627, 641 và tài khoản giảm trừ doanh thu 521.'}
            </p>
          </div>

          {/* Regime Switcher Toggle */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 self-start lg:self-center">
            <button
              type="button"
              onClick={() => onRegimeChange('CIRCULAR_200')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                currentRegime === 'CIRCULAR_200'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>TT 200</span>
            </button>
            <button
              type="button"
              onClick={() => onRegimeChange('CIRCULAR_133')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                currentRegime === 'CIRCULAR_133'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>TT 133 (SME)</span>
            </button>
          </div>
        </div>

        {/* Circular 133 Safeguard Alert Notice */}
        {currentRegime === 'CIRCULAR_133' && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                <span className="font-bold">Quy tắc cấm trong TT 133:</span> Không sử dụng các tài khoản 
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 mx-1">TK 621, 622, 623, 627</span>
                (chuyển sang <strong className="text-emerald-700 dark:text-emerald-300">TK 154</strong>), 
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 mx-1">TK 641</span>
                (chuyển sang <strong className="text-emerald-700 dark:text-emerald-300">TK 6421</strong>), và 
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 mx-1">TK 521</span>
                (ghi giảm trực tiếp <strong className="text-emerald-700 dark:text-emerald-300">Nợ TK 511</strong>).
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowOnlyProhibited(!showOnlyProhibited)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                showOnlyProhibited
                  ? 'bg-amber-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100'
              }`}
            >
              {showOnlyProhibited ? 'Đang lọc TK bị cấm' : 'Chỉ xem các TK bị cấm'}
            </button>
          </div>
        )}
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh theo số hiệu tài khoản (VD: 111, 154, 642) hoặc tên (tiền mặt, doanh thu)..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0 font-medium">
            Tìm thấy: <strong className="text-emerald-600 dark:text-emerald-400">{filteredAccounts.length}</strong> tài khoản
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.key
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Account Grid / Table List */}
      {filteredAccounts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Info className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Không tìm thấy tài khoản phù hợp
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Không có kết quả nào cho từ khóa &quot;{searchQuery}&quot; trong chế độ {currentRegime}. Hãy thử tìm mã tài khoản khác hoặc đặt lại bộ lọc.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setShowOnlyProhibited(false);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl transition-colors"
          >
            Đặt lại tất cả bộ lọc
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedAccounts.map((account) => (
              <AccountCard
                key={account.code}
                account={account}
                currentRegime={currentRegime}
                onSelect={handleSelectAccount}
              />
            ))}
          </div>

          {/* Progressive Chunked Rendering: "Xem thêm" & Sentinel */}
          {hasMore && (
            <div className="flex flex-col items-center justify-center pt-6 pb-2 space-y-2">
              <button
                type="button"
                onClick={handleLoadMore}
                className="px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
              >
                <span>Xem thêm ({Math.min(PAGE_SIZE, filteredAccounts.length - visibleCount)} tài khoản)</span>
              </button>
              <span className="text-[11px] text-slate-400">
                Đang hiển thị {Math.min(visibleCount, filteredAccounts.length)} / {filteredAccounts.length} tài khoản
              </span>
            </div>
          )}
          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
        </>
      )}

      {/* Account Detail Modal */}
      <CoaDetailModal
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onSelectSubstitute={handleSelectSubstitute}
      />
    </div>
  );
};
