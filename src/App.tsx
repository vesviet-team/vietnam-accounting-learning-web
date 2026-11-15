import { useState, useEffect, lazy, Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar, NavTab } from '@/components/layout/Sidebar';
import { BackupModal } from '@/components/layout/BackupModal';
import { CoaExplorer } from '@/components/coa/CoaExplorer';
import { Journalizer } from '@/components/workbench/Journalizer';
import { VoucherInspector } from '@/components/workbench/VoucherInspector';
import { TaxComplianceTools } from '@/components/voucher/TaxComplianceTools';
import { SettingsView } from '@/components/settings/SettingsView';

// Code-split P2: các view nặng (Lộ trình curriculum ~184 kB, bộ đề milestone
// ~204 kB, engine BCTC & COGS) được tách khỏi main chunk bằng dynamic import —
// chỉ tải khi người dùng mở tab tương ứng. Các component vẫn giữ nguyên xuất
// khẩu tĩnh cho unit test (test import trực tiếp từ module, không qua lazy
// wrapper; App-integration test dùng waitFor nên tương thích với lazy load).
const CurriculumPreview = lazy(() =>
  import('@/components/curriculum/CurriculumPreview').then((m) => ({ default: m.CurriculumPreview }))
);
const QuizModal = lazy(() =>
  import('@/components/assessment/QuizModal').then((m) => ({ default: m.QuizModal }))
);
const FinancialStatementsView = lazy(() =>
  import('@/components/workbench/FinancialStatementsView').then((m) => ({
    default: m.FinancialStatementsView,
  }))
);
const CogsWorkbench = lazy(() =>
  import('@/components/workbench/cogs/CogsWorkbench').then((m) => ({ default: m.default }))
);
import { WebMcpProvider } from '@/components/layout/WebMcpProvider';
import { AccountingRegime } from '@/types/coa';
import { storageService } from '@/services/storage/storage-service';
import { StreakEngine, CareerLevel } from '@/engine/streak-engine';

export type AppNavTab = NavTab | 'financial-statements' | 'bctc' | 'cogs';

export function App() {
  const [activeTab, setActiveTab] = useState<AppNavTab>('coa');
  const [currentRegime, setCurrentRegime] = useState<AccountingRegime>('CIRCULAR_200');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [activeMilestoneQuizDay, setActiveMilestoneQuizDay] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [streakDays, setStreakDays] = useState(1);
  const [careerLevel, setCareerLevel] = useState<CareerLevel | undefined>();

  // Load preferred regime, streak, and career level on mount
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      storageService.getPreferredRegime(),
      storageService.getStreakState(),
      storageService.getLearnerProgress(),
    ]).then(([regime, streak, progress]) => {
      if (!isMounted) return;
      if (regime) setCurrentRegime(regime);
      if (streak) {
        setStreakDays(streak.currentStreak);
        const milestoneCount = progress?.milestoneScores
          ? Object.values(progress.milestoneScores).filter((s) => s >= 70).length
          : 0;
        setCareerLevel(
          StreakEngine.determineCareerLevel(milestoneCount, streak.currentStreak)
        );
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRegimeChange = (newRegime: AccountingRegime) => {
    setCurrentRegime(newRegime);
    storageService.setPreferredRegime(newRegime);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* WebMCP 2026 Agent Context & Tool Registration */}
      <WebMcpProvider currentRegime={currentRegime} activeTab={activeTab} />

      {/* Top Header */}
      <Header
        currentRegime={currentRegime}
        onRegimeChange={handleRegimeChange}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenMilestoneTest={(day?: number) => setActiveMilestoneQuizDay(day || 3)}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        streakDays={streakDays}
        careerLevel={careerLevel}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab as NavTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          currentRegime={currentRegime}
          onRegimeChange={handleRegimeChange}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {/* Quick Navigation Tab Bar for Financial Statements */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Mô-đun Kế Toán:
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('workbench')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'workbench'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Bàn Định Khoản (Journalizer)
              </button>
              <button
                type="button"
                data-testid="tab-financial-statements"
                onClick={() => setActiveTab('financial-statements')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'financial-statements' || activeTab === 'bctc'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <span>📊 Báo Cáo Tài Chính (B01 &amp; B02)</span>
              </button>
              <button
                type="button"
                data-testid="tab-cogs-workbench"
                onClick={() => setActiveTab('cogs')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'cogs'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                }`}
              >
                <span>🏭 Giá Vốn &amp; Giá Thành (COGS)</span>
              </button>
              <button
                type="button"
                data-testid="tab-tax-tools"
                onClick={() => setActiveTab('tax')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'tax'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 hover:bg-purple-100'
                }`}
              >
                <span>🧮 Thuế TMĐT &amp; R&D</span>
              </button>
            </div>

            {(activeTab === 'financial-statements' || activeTab === 'bctc') && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                &bull; B01-DN &amp; B02-DN Đang Mở
              </span>
            )}
            {activeTab === 'cogs' && (
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                &bull; COGS &amp; Costing Workbench Đang Mở
              </span>
            )}
          </div>

          {activeTab === 'coa' && (
            <CoaExplorer
              currentRegime={currentRegime}
              onRegimeChange={handleRegimeChange}
            />
          )}

          {activeTab === 'curriculum' && (
            <Suspense fallback={<div className="p-8 text-sm text-slate-500 dark:text-slate-400">Đang tải Lộ Trình 30 Ngày…</div>}>
              <CurriculumPreview
                currentRegime={currentRegime}
                onNavigateToCoa={() => setActiveTab('coa')}
              />
            </Suspense>
          )}

          {activeTab === 'workbench' && (
            <Journalizer
              currentRegime={currentRegime}
              onNavigateToCoa={() => setActiveTab('coa')}
              onNavigateToFinancialStatements={() => setActiveTab('financial-statements')}
            />
          )}

          {activeTab === 'voucher' && (
            <VoucherInspector currentRegime={currentRegime} />
          )}

          {activeTab === 'tax' && <TaxComplianceTools />}

          {(activeTab === 'financial-statements' || activeTab === 'bctc') && (
            <Suspense fallback={<div className="p-8 text-sm text-slate-500 dark:text-slate-400">Đang tải Báo Cáo Tài Chính…</div>}>
              <FinancialStatementsView
                currentRegime={currentRegime}
                onRegimeChange={handleRegimeChange}
                onNavigateToJournalizer={() => setActiveTab('workbench')}
              />
            </Suspense>
          )}

          {activeTab === 'cogs' && (
            <Suspense fallback={<div className="p-8 text-sm text-slate-500 dark:text-slate-400">Đang tải COGS Workbench…</div>}>
              <CogsWorkbench
                currentRegime={currentRegime}
                onRegimeChange={handleRegimeChange}
                onNavigateToJournalizer={() => setActiveTab('workbench')}
                onNavigateToFinancialStatements={() => setActiveTab('financial-statements')}
              />
            </Suspense>
          )}

          {activeTab === 'settings' && (
            <SettingsView
              currentRegime={currentRegime}
              onRegimeChange={handleRegimeChange}
            />
          )}
        </main>
      </div>

      {/* Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      {/* Global Milestone Assessment Modal */}
      {activeMilestoneQuizDay !== null && (
        <Suspense fallback={<div className="fixed inset-0 z-50" />}>
          <QuizModal
            isOpen={true}
            milestoneDay={activeMilestoneQuizDay}
            onClose={() => setActiveMilestoneQuizDay(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
