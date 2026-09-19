import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar, NavTab } from '@/components/layout/Sidebar';
import { BackupModal } from '@/components/layout/BackupModal';
import { CoaExplorer } from '@/components/coa/CoaExplorer';
import { CurriculumPreview } from '@/components/curriculum/CurriculumPreview';
import { Journalizer } from '@/components/workbench/Journalizer';
import { VoucherInspector } from '@/components/workbench/VoucherInspector';
import { SettingsView } from '@/components/settings/SettingsView';
import { QuizModal } from '@/components/assessment/QuizModal';
import { AccountingRegime } from '@/types/coa';
import { storageService } from '@/services/storage/storage-service';
import { StreakEngine, CareerLevel } from '@/engine/streak-engine';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('coa');
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
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentRegime={currentRegime}
          onRegimeChange={handleRegimeChange}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {activeTab === 'coa' && (
            <CoaExplorer
              currentRegime={currentRegime}
              onRegimeChange={handleRegimeChange}
            />
          )}

          {activeTab === 'curriculum' && (
            <CurriculumPreview
              currentRegime={currentRegime}
              onNavigateToCoa={() => setActiveTab('coa')}
            />
          )}

          {activeTab === 'workbench' && (
            <Journalizer
              currentRegime={currentRegime}
              onNavigateToCoa={() => setActiveTab('coa')}
            />
          )}

          {activeTab === 'voucher' && (
            <VoucherInspector currentRegime={currentRegime} />
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
        <QuizModal
          isOpen={true}
          milestoneDay={activeMilestoneQuizDay}
          onClose={() => setActiveMilestoneQuizDay(null)}
        />
      )}
    </div>
  );
}

export default App;
