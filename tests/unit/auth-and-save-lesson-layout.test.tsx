import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { LessonReader } from '@/components/curriculum/LessonReader';
import { CurriculumPreview } from '@/components/curriculum/CurriculumPreview';
import { IndexedDbAdapter } from '@/services/storage/indexeddb-adapter';
import { storageService } from '@/services/storage/storage-service';

describe('Auth Navigation Layout & Save Lesson UX', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await new IndexedDbAdapter().clearAll();
  });

  it('Header displays Login & Register buttons when logged out and User + Logout when logged in', () => {
    const onLogin = vi.fn();
    const onLogout = vi.fn();
    const onOpenAccount = vi.fn();
    const onOpenRegister = vi.fn();

    const { rerender } = render(
      <Header
        currentRegime="CIRCULAR_200"
        onRegimeChange={vi.fn()}
        onOpenBackup={vi.fn()}
        isMobileMenuOpen={false}
        onToggleMobileMenu={vi.fn()}
        user={null}
        onLogin={onLogin}
        onLogout={onLogout}
        onOpenAccount={onOpenAccount}
        onOpenRegister={onOpenRegister}
      />
    );

    fireEvent.click(screen.getByTestId('header-login-btn'));
    expect(onLogin).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('header-register-btn'));
    expect(onOpenRegister).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('header-logout-btn')).not.toBeInTheDocument();

    rerender(
      <Header
        currentRegime="CIRCULAR_200"
        onRegimeChange={vi.fn()}
        onOpenBackup={vi.fn()}
        isMobileMenuOpen={false}
        onToggleMobileMenu={vi.fn()}
        user={{ id: 'u1', email: 'lan@ketoan.vn', display_name: 'Chị Lan' }}
        syncStatus={{ status: 'idle', lastSyncAt: '2026-11-16T10:00:00Z', lastError: null }}
        onLogin={onLogin}
        onLogout={onLogout}
        onOpenAccount={onOpenAccount}
        onOpenRegister={onOpenRegister}
      />
    );

    expect(screen.getByTestId('header-account-btn')).toHaveTextContent('Chị Lan');
    fireEvent.click(screen.getByTestId('header-account-btn'));
    expect(onOpenAccount).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('header-logout-btn'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('Sidebar exposes Tài Khoản & Sao Lưu nav and compact auth card for login/logout', () => {
    const onSelectTab = vi.fn();
    const onLogin = vi.fn();
    const onLogout = vi.fn();
    const onOpenRegister = vi.fn();

    const { rerender } = render(
      <Sidebar
        activeTab="coa"
        onSelectTab={onSelectTab}
        currentRegime="CIRCULAR_200"
        onRegimeChange={vi.fn()}
        isOpenMobile={true}
        onCloseMobile={vi.fn()}
        user={null}
        onLogin={onLogin}
        onLogout={onLogout}
        onOpenRegister={onOpenRegister}
      />
    );

    expect(screen.getByText('Tài Khoản & Sao Lưu')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('sidebar-login-btn'));
    expect(onLogin).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('sidebar-register-btn'));
    expect(onOpenRegister).toHaveBeenCalledTimes(1);

    rerender(
      <Sidebar
        activeTab="coa"
        onSelectTab={onSelectTab}
        currentRegime="CIRCULAR_200"
        onRegimeChange={vi.fn()}
        isOpenMobile={true}
        onCloseMobile={vi.fn()}
        user={{ id: 'u1', email: 'an@ketoan.vn' }}
        onLogin={onLogin}
        onLogout={onLogout}
        onOpenRegister={onOpenRegister}
      />
    );

    expect(screen.getByTestId('sidebar-auth-card')).toHaveTextContent('an@ketoan.vn');
    fireEvent.click(screen.getByTestId('sidebar-logout-btn'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('LessonReader allows saving/bookmarking a lesson and persists savedDays + currentDay', async () => {
    render(<LessonReader initialDay={1} />);

    const saveBtn = screen.getByTestId('toggle-save-lesson-btn');
    expect(saveBtn).toHaveTextContent('Lưu bài học');

    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(screen.getByTestId('toggle-save-lesson-btn')).toHaveTextContent('Đã lưu');
    });
    expect(await screen.findByTestId('lesson-save-notice')).toBeInTheDocument();

    const saved = await storageService.getLearnerProgress();
    expect(saved?.savedDays).toEqual([1]);

    // Paging to Day 2 updates persisted currentDay automatically.
    fireEvent.click(screen.getByText('Ngày 2'));
    await waitFor(async () => {
      const updated = await storageService.getLearnerProgress();
      expect(updated?.currentDay).toBe(2);
    });
  });

  it('CurriculumPreview renders saved lesson chips and opens bookmarked day directly', async () => {
    await storageService.saveLearnerProgress({
      currentDay: 2,
      unlockedDays: [1, 2, 3],
      completedDays: [1],
      savedDays: [2],
      milestoneScores: {},
      streakDays: 1,
      lastActiveDate: '2026-11-16T10:00:00.000Z',
    });

    render(<CurriculumPreview currentRegime="CIRCULAR_99" onNavigateToCoa={vi.fn()} />);

    const chip = await screen.findByTestId('saved-lesson-chip-2');
    expect(chip).toHaveTextContent('Ngày 2');
    expect(screen.getByTestId('curriculum-progress-summary')).toHaveTextContent('1/30 ngày');

    fireEvent.click(chip);
    expect(screen.getByText(/Ngày 2: Phương Trình Kế Toán/)).toBeInTheDocument();
  });
});
