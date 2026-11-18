import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '@/App';
import { StorageService } from '@/services/storage/storage-service';
import { getDeviceId } from '@/services/auth/device';
import { CoaExplorer } from '@/components/coa/CoaExplorer';
import { CoaDetailModal } from '@/components/coa/CoaDetailModal';
import { BackupModal } from '@/components/layout/BackupModal';
import { QuizModal } from '@/components/assessment/QuizModal';
import { ManufacturingCostCalculator } from '@/components/workbench/cogs/ManufacturingCostCalculator';
import { CostingComparisonMatrix } from '@/components/workbench/cogs/CostingComparisonMatrix';
import { StockCardSimulator } from '@/components/workbench/cogs/StockCardSimulator';
import { Journalizer } from '@/components/workbench/Journalizer';
import { VoucherInspector } from '@/components/workbench/VoucherInspector';
import { ensureAllRegimesLoaded } from '@/data/coa-service';
import { COA_CIRCULAR_200 } from '@/data/coa-circular-200';
import { getDefaultCogsScenario } from '@/data/cogs-scenarios';

describe('Audit Remediation Regression Suite (P0-P2)', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    await ensureAllRegimesLoaded();
  });

  it('F-04: stores vnacc_device_id cleanly and exportBackup emits zero warnings', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const id = getDeviceId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);

    localStorage.setItem('vnacc_session_hint', '1');
    const storage = new StorageService();
    const json = await storage.exportBackup();
    const parsed = JSON.parse(json) as { customData: { localStorage: Record<string, unknown> } };

    expect(parsed.customData.localStorage.device_id).toBe(id);
    expect(parsed.customData.localStorage.session_hint).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('F-04 & F-13: ManufacturingCostCalculator renders clean formulas (no raw LaTeX) and appends postedEntries', async () => {
    const storage = new StorageService();
    await storage.saveWorkbenchState({
      postedEntries: [
        {
          id: 'existing-1',
          timestamp: '2026-11-18T10:00:00Z',
          descriptionVi: 'Existing journal entry',
          rows: [],
          totalAmount: 1000000,
        },
      ],
    });

    const { container } = render(
      <ManufacturingCostCalculator initialInput={{ regime: 'CIRCULAR_200' }} />
    );
    expect(container.textContent).not.toMatch(/\$D_|\$Q_|\$Z\$|\$z\$|\$h%/);

    fireEvent.click(screen.getByTestId('export-journalizer-btn'));
    await waitFor(async () => {
      const state = await storage.loadWorkbenchState();
      expect(state.postedEntries.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('F-04 & F-13: Journalizer & VoucherInspector show accurate TT 99/2025 & TT 58/2026 labels and Unicode Σ', () => {
    const { container: jContainer } = render(<Journalizer currentRegime="CIRCULAR_99" />);
    expect(jContainer.textContent).toContain('Σ Nợ = Σ Có');
    expect(jContainer.textContent).toContain('Thông tư 99/2025');
    expect(jContainer.textContent).not.toContain('&Sigma;');

    const { container: vContainer } = render(<VoucherInspector currentRegime="CIRCULAR_58" />);
    expect(vContainer.textContent).toContain('Thông tư 58/2026');
  });

  it('F-12: StockCardSimulator and CostingComparisonMatrix support Light and Dark themes symmetrically', () => {
    const scenario = getDefaultCogsScenario();
    const { container: stock } = render(<StockCardSimulator />);
    const stockRoot = stock.firstElementChild as HTMLElement;
    expect(stockRoot.className).toContain('dark:bg-slate-900');

    const { container: matrix } = render(
      <CostingComparisonMatrix
        initialInventory={scenario.initialLots}
        transactions={scenario.transactions}
      />
    );
    const matrixRoot = matrix.firstElementChild as HTMLElement;
    expect(matrixRoot.className).toContain('bg-white');
    expect(matrixRoot.className).toContain('dark:bg-slate-900');
  });

  it('F-13 & F-15: CoaExplorer supports 4 regimes and semantic button cards; Modals close on Escape with dialog roles', () => {
    const onCloseDetail = vi.fn();
    render(
      <>
        <CoaExplorer currentRegime="CIRCULAR_58" onRegimeChange={() => {}} />
        <CoaDetailModal account={COA_CIRCULAR_200[0]} onClose={onCloseDetail} />
      </>
    );

    expect(screen.getByRole('button', { name: /TT 58\/2026/i })).toBeInTheDocument();
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs[0]).toHaveAttribute('aria-modal', 'true');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseDetail).toHaveBeenCalledTimes(1);

    const onCloseBackup = vi.fn();
    render(<BackupModal isOpen={true} onClose={onCloseBackup} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseBackup).toHaveBeenCalledTimes(1);

    const onCloseQuiz = vi.fn();
    render(<QuizModal isOpen={true} milestoneDay={3} onClose={onCloseQuiz} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseQuiz).toHaveBeenCalledTimes(1);
  });

  it('F-15 & F-23: App honors URL hash deep links, includes Sidebar financial-statements & footer landmark', async () => {
    window.history.replaceState(null, '', '#settings');
    render(<App />);
    expect(await screen.findByText(/Chế Độ Kế Toán Doanh Nghiệp Mặc Định/i)).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getAllByText(/Báo Cáo Tài Chính/i).length).toBeGreaterThanOrEqual(1);
  });
});
