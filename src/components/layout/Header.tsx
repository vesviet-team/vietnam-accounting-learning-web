import type { FC } from 'react';
import { BookOpen, Flame, HardDrive, Menu, X, ShieldCheck, Award } from 'lucide-react';
import { AccountingRegime } from '@/types/coa';
import { CareerLevel } from '@/engine/streak-engine';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  currentRegime: AccountingRegime;
  onRegimeChange: (regime: AccountingRegime) => void;
  onOpenBackup: () => void;
  onOpenMilestoneTest?: (milestoneDay?: number) => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  streakDays?: number;
  careerLevel?: CareerLevel;
}

export const Header: FC<HeaderProps> = ({
  currentRegime,
  onRegimeChange,
  onOpenBackup,
  onOpenMilestoneTest,
  isMobileMenuOpen,
  onToggleMobileMenu,
  streakDays = 1,
  careerLevel,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Toggle & Brand */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle navigation"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                  Kế Toán Việt Nam
                </span>
                <span className="hidden sm:inline-block ml-1.5 px-2 py-0.5 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                  30 Ngày
                </span>
              </div>
            </div>
          </div>

          {/* Center: Regime Quick Selector */}
          <div className="hidden lg:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onRegimeChange('CIRCULAR_200')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentRegime === 'CIRCULAR_200'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Thông tư 200 (DN Lớn)</span>
            </button>
            <button
              type="button"
              onClick={() => onRegimeChange('CIRCULAR_133')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentRegime === 'CIRCULAR_133'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Thông tư 133 (DN Vừa & Nhỏ)</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Streak Badge */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 rounded-lg text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
              <span>{streakDays} Ngày</span>
            </div>

            {/* Career Title Badge */}
            {careerLevel && (
              <div
                className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-xs ${careerLevel.colorClass}`}
                title={`Cấp bậc nghề nghiệp: ${careerLevel.titleVi} (${careerLevel.titleEn}) - ${careerLevel.descriptionVi}`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>{careerLevel.titleVi}</span>
              </div>
            )}

            {/* Quick Milestone Test Trigger */}
            {onOpenMilestoneTest && (
              <button
                type="button"
                onClick={() => onOpenMilestoneTest()}
                title="Làm bài kiểm tra Cột mốc định kỳ 3 ngày"
                className="flex items-center space-x-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Bài Test Định Kỳ</span>
              </button>
            )}

            {/* Backup / Export */}
            <button
              type="button"
              onClick={onOpenBackup}
              title="Sao lưu & Khôi phục dữ liệu"
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <HardDrive className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};
