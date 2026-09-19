import type { FC } from 'react';
import {
  Search,
  GraduationCap,
  Scale,
  FileCheck2,
  HardDrive,
  Info,
} from 'lucide-react';
import { AccountingRegime } from '@/types/coa';

export type NavTab = 'coa' | 'curriculum' | 'workbench' | 'voucher' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentRegime: AccountingRegime;
  onRegimeChange: (regime: AccountingRegime) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentRegime,
  onRegimeChange,
  isOpenMobile,
  onCloseMobile,
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
      badge: 'M2 Sắp ra mắt',
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
      id: 'voucher',
      labelVi: 'Kiểm Tra Chứng Từ',
      subtextVi: 'Hóa đơn GTGT & Ngưỡng 20M',
      icon: FileCheck2,
      badge: 'Sẵn sàng',
      milestone: 'M4',
    },
    {
      id: 'settings',
      labelVi: 'Sao Lưu & Dữ Liệu',
      subtextVi: 'Xuất / nhập file JSON',
      icon: HardDrive,
      milestone: 'M1',
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:sticky top-16 z-30 inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } h-[calc(100vh-4rem)] overflow-y-auto`}
      >
        <div className="p-4 space-y-6">
          {/* Regime Switcher Mobile/Sidebar */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Chế Độ Kế Toán
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onRegimeChange('CIRCULAR_200')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold text-center transition-all ${
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
                className={`px-3 py-2 rounded-lg text-xs font-semibold text-center transition-all ${
                  currentRegime === 'CIRCULAR_133'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                TT 133
                <span className="block text-[10px] font-normal opacity-85">DN Vừa & Nhỏ</span>
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
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800/80 shadow-xs'
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

        {/* Footer Info Box */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-start space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Chuẩn mực VAS: Thông tư 200/2014 & Thông tư 133/2016 của Bộ Tài Chính.
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
