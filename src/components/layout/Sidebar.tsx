import type { FC } from 'react';
import {
  Search,
  GraduationCap,
  Scale,
  FileCheck2,
  UserRound,
  Info,
  Factory,
  Calculator,
  BarChart3,
  LogIn,
  LogOut,
  UserPlus,
} from 'lucide-react';
import { AccountingRegime } from '@/types/coa';
import type { AuthUser } from '@/types/auth';
import type { SyncStatusState } from '@/services/sync/sync-service';

export type NavTab =
  | 'coa'
  | 'curriculum'
  | 'workbench'
  | 'cogs'
  | 'financial-statements'
  | 'voucher'
  | 'tax'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentRegime: AccountingRegime;
  onRegimeChange: (regime: AccountingRegime) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  user?: AuthUser | null;
  syncStatus?: SyncStatusState;
  onLogin?: () => void;
  onLogout?: () => void;
  onOpenRegister?: () => void;
}

export const Sidebar: FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentRegime,
  onRegimeChange,
  isOpenMobile,
  onCloseMobile,
  user = null,
  syncStatus,
  onLogin,
  onLogout,
  onOpenRegister,
}) => {
  const navItems: {
    id: NavTab;
    labelVi: string;
    subtextVi: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
    milestone?: string;
  }[] = [
    {
      id: 'coa',
      labelVi: 'Tra Cứu Tài Khoản (COA)',
      subtextVi: 'Hệ thống TK TT 200 & TT 133',
      icon: Search,
      badge: 'Sẵn sàng',
      milestone: 'M1',
    },
    {
      id: 'curriculum',
      labelVi: 'Lộ Trình 30 Ngày',
      subtextVi: '10 học phần & bài test định kỳ',
      icon: GraduationCap,
      badge: '30 Ngày',
      milestone: 'M2',
    },
    {
      id: 'workbench',
      labelVi: 'Bàn Định Khoản Nợ/Có',
      subtextVi: 'Thực hành cân đối tự động',
      icon: Scale,
      badge: 'Sẵn sàng',
      milestone: 'M4',
    },
    {
      id: 'cogs',
      labelVi: 'Giá Vốn & Giá Thành',
      subtextVi: 'Thẻ kho, Z/z & So sánh BCTC',
      icon: Factory,
      badge: 'Mới 2026',
      milestone: 'M6',
    },
    {
      id: 'financial-statements',
      labelVi: 'Báo Cáo Tài Chính',
      subtextVi: 'B01-DN, B02-DN & B03-DN',
      icon: BarChart3,
      badge: 'TT 99',
      milestone: 'M7',
    },
    {
      id: 'voucher',
      labelVi: 'Kiểm Tra Chứng Từ',
      subtextVi: 'Hóa đơn GTGT & Ngưỡng 20M',
      icon: FileCheck2,
      badge: 'Sẵn sàng',
      milestone: 'M4',
    },
    {
      id: 'tax',
      labelVi: 'Thuế TMĐT & R&D',
      subtextVi: 'NĐ 117/2025 & Khấu trừ 200% Luật 67/2025',
      icon: Calculator,
      badge: 'Mới',
      milestone: 'M6',
    },
    {
      id: 'settings',
      labelVi: 'Tài Khoản & Sao Lưu',
      subtextVi: 'Đăng nhập, đồng bộ & JSON',
      icon: UserRound,
      milestone: 'M1',
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:sticky top-16 bottom-0 left-0 z-30 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } h-[calc(100vh-4rem)] overflow-y-auto`}
      >
        <div className="p-4 space-y-6">
          {/* Regime Switcher Mobile/Sidebar */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Chế Độ Kế Toán
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onRegimeChange('CIRCULAR_200')}
                className={`px-2 py-2 rounded-lg text-xs font-semibold text-center transition-all ${
                  currentRegime === 'CIRCULAR_200'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                TT 200
                <span className="block text-[10px] font-normal opacity-85">DN Lớn</span>
              </button>
              <button
                type="button"
                onClick={() => onRegimeChange('CIRCULAR_133')}
                className={`px-2 py-2 rounded-lg text-xs font-semibold text-center transition-all ${
                  currentRegime === 'CIRCULAR_133'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                TT 133
                <span className="block text-[10px] font-normal opacity-85">SME</span>
              </button>
              <button
                type="button"
                onClick={() => onRegimeChange('CIRCULAR_99')}
                className={`px-2 py-2 rounded-lg text-xs font-semibold text-center transition-all ${
                  currentRegime === 'CIRCULAR_99'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                TT 99
                <span className="block text-[10px] font-normal opacity-85">2026 Mới</span>
              </button>
              <button
                type="button"
                onClick={() => onRegimeChange('CIRCULAR_58')}
                className={`px-2 py-2 rounded-lg text-xs font-semibold text-center transition-all ${
                  currentRegime === 'CIRCULAR_58'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                TT 58
                <span className="block text-[10px] font-normal opacity-85">DN Siêu Nhỏ</span>
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block px-1 mb-2">
              Tính Năng Nền Tảng
            </label>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-start space-x-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800/80 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate">{item.labelVi}</span>
                      {item.badge && (
                        <span
                          className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-md font-semibold ${
                            item.id === 'coa'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {item.subtextVi}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Account Card & Footer Info Box */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
          <div
            data-testid="sidebar-auth-card"
            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 space-y-2.5 shadow-sm"
          >
            {user ? (
              <>
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <UserRound className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {user.display_name || user.email}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate">
                      {syncStatus?.status === 'syncing'
                        ? 'Đang đồng bộ…'
                        : syncStatus?.status === 'error'
                          ? 'Đồng bộ tạm gián đoạn'
                          : 'Đã đồng bộ tài khoản'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('settings');
                      onCloseMobile();
                    }}
                    className="px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    Tài khoản
                  </button>
                  <button
                    type="button"
                    data-testid="sidebar-logout-btn"
                    onClick={() => {
                      onLogout?.();
                      onCloseMobile();
                    }}
                    className="inline-flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/70 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  <strong className="text-slate-700 dark:text-slate-200 block">Chế độ ẩn danh</strong>
                  Lưu trên máy. Đăng nhập để đồng bộ bài học đa thiết bị.
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    data-testid="sidebar-login-btn"
                    onClick={() => {
                      onLogin?.();
                      onCloseMobile();
                    }}
                    className="inline-flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
                  >
                    <LogIn className="w-3 h-3" />
                    <span>Đăng nhập</span>
                  </button>
                  <button
                    type="button"
                    data-testid="sidebar-register-btn"
                    onClick={() => {
                      if (onOpenRegister) {
                        onOpenRegister();
                      } else {
                        onSelectTab('settings');
                      }
                      onCloseMobile();
                    }}
                    className="inline-flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Đăng ký</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-start space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Chuẩn mực VAS: Thông tư 200/2014, Thông tư 133/2016, Thông tư 99/2025 & Thông tư 58/2026 (DN siêu nhỏ) của Bộ Tài Chính.
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
