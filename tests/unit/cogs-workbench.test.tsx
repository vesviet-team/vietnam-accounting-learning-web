import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import CogsWorkbench from '@/components/workbench/cogs/CogsWorkbench';
import { storageService } from '@/services/storage/storage-service';
import { App } from '@/App';
import { CogsState } from '@/types/cogs';

describe('COGS & Cost Accounting Workbench Container & Shell Integration (CogsWorkbench.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // T5.1: Renders CogsWorkbench with 3 sub-tabs navigation
  // =========================================================================
  it('T5.1: Renders CogsWorkbench with 3 sub-tabs navigation and executive header', () => {
    render(<CogsWorkbench currentRegime="CIRCULAR_200" />);

    // Verify Main Container & Title
    expect(screen.getByTestId('cogs-workbench')).toBeInTheDocument();
    expect(
      screen.getByText(/Bàn Tính Giá Vốn Hàng Bán & Giá Thành Doanh Nghiệp/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Phân Hệ Kế Toán COGS & Costing/i)).toBeInTheDocument();

    // Verify Sub-Tabs Buttons
    expect(screen.getByTestId('subtab-stock-card')).toBeInTheDocument();
    expect(screen.getByTestId('subtab-manufacturing')).toBeInTheDocument();
    expect(screen.getByTestId('subtab-comparison')).toBeInTheDocument();

    // Initial Viewport is Stock Card
    expect(screen.getByTestId('viewport-stock-card')).toBeInTheDocument();

    // Verify Socratic Ladder and Scenario Bar are rendered
    expect(screen.getByTestId('cogs-socratic-ladder')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-selector-select')).toBeInTheDocument();
  });

  // =========================================================================
  // T5.2: Switches smoothly between sub-tabs
  // =========================================================================
  it('T5.2: Switches smoothly between sub-tabs (Stock Card -> Manufacturing -> Comparison)', () => {
    render(<CogsWorkbench currentRegime="CIRCULAR_200" />);

    // Initially in Stock Card
    expect(screen.getByTestId('viewport-stock-card')).toBeInTheDocument();
    expect(screen.queryByTestId('viewport-manufacturing')).not.toBeInTheDocument();
    expect(screen.queryByTestId('viewport-comparison')).not.toBeInTheDocument();

    // 1. Switch to Manufacturing Tab
    fireEvent.click(screen.getByTestId('subtab-manufacturing'));
    expect(screen.getByTestId('viewport-manufacturing')).toBeInTheDocument();
    expect(screen.queryByTestId('viewport-stock-card')).not.toBeInTheDocument();
    expect(
      screen.getByText(/BÀN TÍNH GIÁ THÀNH SẢN XUẤT & BÓC TÁCH CHI PHÍ VƯỢT ĐỊNH MỨC/i)
    ).toBeInTheDocument();

    // 2. Switch to Comparison Matrix Tab
    fireEvent.click(screen.getByTestId('subtab-comparison'));
    expect(screen.getByTestId('viewport-comparison')).toBeInTheDocument();
    expect(screen.queryByTestId('viewport-manufacturing')).not.toBeInTheDocument();
    expect(
      screen.getByText(/MA TRẬN SO SÁNH ĐA PHƯƠNG PHÁP & TÁC ĐỘNG BÁO CÁO TÀI CHÍNH/i)
    ).toBeInTheDocument();

    // 3. Switch back to Stock Card Tab
    fireEvent.click(screen.getByTestId('subtab-stock-card'));
    expect(screen.getByTestId('viewport-stock-card')).toBeInTheDocument();
    expect(screen.queryByTestId('viewport-comparison')).not.toBeInTheDocument();
  });

  // =========================================================================
  // T5.3: Loads DOK 3 Scenario "Thép Thăng Long" into Stock Card and Comparison Matrix
  // =========================================================================
  it('T5.3: Loads DOK 3 Scenario "Thép Thăng Long" into Stock Card and Comparison Matrix with rising price trend', async () => {
    render(<CogsWorkbench currentRegime="CIRCULAR_200" />);

    // Select Scenario 2 (Thép Thăng Long DOK 3)
    const btnScen2 = screen.getByTestId('scenario-select-btn-scen-cogs-02');
    fireEvent.click(btnScen2);

    // Should auto-align to comparison or show comparison view
    expect(screen.getByTestId('viewport-comparison')).toBeInTheDocument();

    // Check Socratic Ladder title updated to Thép Thăng Long
    const ladder = screen.getByTestId('cogs-socratic-ladder');
    expect(
      within(ladder).getByText(/Thép Thăng Long — Chu Kỳ Sốt Giá & Hồ Sơ Vay Vốn Ngân Hàng/i)
    ).toBeInTheDocument();

    // Switch to Stock Card tab to verify transactions
    fireEvent.click(screen.getByTestId('subtab-stock-card'));
    const stockTable = screen.getByTestId('stock-card-table');

    // Verify key transactions from Thép Thăng Long scenario are rendered
    expect(within(stockTable).getByText(/Thép Hòa Phát/i)).toBeInTheDocument();
    expect(within(stockTable).getByText(/Dự án Cầu Nhật Tân/i)).toBeInTheDocument();
    expect(within(stockTable).getByText(/Coteccons/i)).toBeInTheDocument();
  });

  // =========================================================================
  // T5.4: Loads DOK 3 Scenario "May Xuất Khẩu Thăng Long" with abnormal waste and CIT B4
  // =========================================================================
  it('T5.4: Loads DOK 3 Scenario "May Xuất Khẩu Thăng Long" with abnormal waste and CIT B4 calculation', async () => {
    render(<CogsWorkbench currentRegime="CIRCULAR_200" />);

    // Select Scenario 3 (May Xuất Khẩu Thăng Long DOK 3)
    const btnScen3 = screen.getByTestId('scenario-select-btn-scen-cogs-03');
    fireEvent.click(btnScen3);

    // Should auto-align to manufacturing tab
    expect(screen.getByTestId('viewport-manufacturing')).toBeInTheDocument();

    // Verify Direct Material Actual (2.1B) and Technical Norm (1.8B)
    const actualMaterialInput = screen.getByTestId('input-actual-direct-material') as HTMLInputElement;
    const normalMaterialInput = screen.getByTestId('input-normal-direct-material') as HTMLInputElement;
    expect(actualMaterialInput.value).toBe('2100000000');
    expect(normalMaterialInput.value).toBe('1800000000');

    // Verify Abnormal Waste is 300,000,000 đ
    const abnormalWasteDisplay = screen.getByTestId('kpi-abnormal-waste');
    expect(abnormalWasteDisplay).toHaveTextContent(/300\.000\.000/);

    // Verify CIT Schedule B4 impact is 60,000,000 đ (20% of 300M)
    const citTaxAmountDisplay = screen.getByTestId('cit-tax-amount');
    expect(citTaxAmountDisplay).toHaveTextContent(/60\.000\.000/);

    const citB4AmountDisplay = screen.getByTestId('cit-b4-amount');
    expect(citB4AmountDisplay).toHaveTextContent(/300\.000\.000/);

    // Verify debit 632 / credit 621 journal entry for abnormal waste
    const journalTable = screen.getByTestId('journal-entries-table');
    expect(journalTable).toHaveTextContent(/Nợ 632/i);
    expect(journalTable).toHaveTextContent(/Có 621/i);
  });

  // =========================================================================
  // T5.5: Unlocks 3-level Socratic hint ladder progressively without spoilers
  // =========================================================================
  it('T5.5: Unlocks 3-level Socratic hint ladder progressively without spoilers', () => {
    render(<CogsWorkbench currentRegime="CIRCULAR_200" />);

    // Level 1 should be visible immediately
    expect(screen.getByTestId('hint-content-level-1')).toBeInTheDocument();
    expect(
      screen.getByText(/Câu Hỏi Tư Duy Gợi Mở \(Reflective Questions\):/i)
    ).toBeInTheDocument();

    // Level 2 should be locked
    const btnLevel2 = screen.getByTestId('tab-hint-level-2');
    expect(btnLevel2).toBeDisabled();

    // Unlock Level 2
    const unlockLevel2Btn = screen.getByTestId('unlock-level-2-btn');
    fireEvent.click(unlockLevel2Btn);

    // Now Level 2 is unlocked and active
    expect(screen.getByTestId('hint-content-level-2')).toBeInTheDocument();
    expect(screen.getByText(/Cơ Sở Pháp Lý Chuẩn Mực:/i)).toBeInTheDocument();
    expect(screen.getByText(/Nguyên Tắc Hạch Toán Cốt Lõi:/i)).toBeInTheDocument();

    // Level 3 should still be locked
    const btnLevel3 = screen.getByTestId('tab-hint-level-3');
    expect(btnLevel3).toBeDisabled();

    // Unlock Level 3
    const unlockLevel3Btn = screen.getByTestId('unlock-level-3-btn');
    fireEvent.click(unlockLevel3Btn);

    // Now Level 3 is active with sample journal entries
    expect(screen.getByTestId('hint-content-level-3')).toBeInTheDocument();
    expect(screen.getByText(/Mẫu Định Khoản Tham Chiếu:/i)).toBeInTheDocument();

    // Test Reset Button: Re-locks hints back to Level 1
    const resetBtn = screen.getByTestId('reset-socratic-ladder-btn');
    fireEvent.click(resetBtn);

    expect(screen.getByTestId('hint-content-level-1')).toBeInTheDocument();
    expect(screen.getByTestId('tab-hint-level-2')).toBeDisabled();
    expect(screen.getByTestId('tab-hint-level-3')).toBeDisabled();
  });

  // =========================================================================
  // T5.6: Saves state to storageService and restores state on load
  // =========================================================================
  it('T5.6: Saves state to storageService and restores state on load', async () => {
    const mockSavedState: CogsState = {
      initialLots: [
        {
          id: 'mock-lot-persisted',
          date: '2026-01-01',
          quantity: 999,
          unitPrice: 120_000,
        },
      ],
      transactions: [],
      selectedMethod: 'PERIODIC_WEIGHTED_AVERAGE',
      manufacturingInput: {
        regime: 'CIRCULAR_200',
        beginningWip: 5_000_000,
        actualDirectMaterial: 50_000_000,
        normalDirectMaterial: 50_000_000,
        actualDirectLabor: 20_000_000,
        normalDirectLabor: 20_000_000,
        actualOverhead: 15_000_000,
        finishedUnits: 500,
        endingWipUnits: 50,
        wipMethod: 'DIRECT_MATERIAL',
        completionPercentage: 0,
      },
      activeSubTab: 'comparison',
      selectedScenarioId: 'scen-cogs-02',
    };

    const loadSpy = vi.spyOn(storageService, 'loadCogsState').mockResolvedValue(mockSavedState);
    const saveSpy = vi.spyOn(storageService, 'saveCogsState').mockResolvedValue(true);

    render(<CogsWorkbench currentRegime="CIRCULAR_200" />);

    // Wait for storage load
    await waitFor(() => {
      expect(loadSpy).toHaveBeenCalled();
      expect(screen.getByTestId('viewport-comparison')).toBeInTheDocument();
    });

    // Verify saveCogsState is triggered when user interacts
    fireEvent.click(screen.getByTestId('subtab-stock-card'));
    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });

    loadSpy.mockRestore();
    saveSpy.mockRestore();
  });

  // =========================================================================
  // T5.7: Navigation callbacks to Journalizer and Financial Statements trigger properly
  // =========================================================================
  it('T5.7: Navigation callbacks to Journalizer and Financial Statements trigger properly', async () => {
    const handleNavJournalizer = vi.fn();
    const handleNavBctc = vi.fn();

    render(
      <CogsWorkbench
        currentRegime="CIRCULAR_200"
        onNavigateToJournalizer={handleNavJournalizer}
        onNavigateToFinancialStatements={handleNavBctc}
      />
    );

    // 1. Click Top Header Journalizer button
    const btnNavJournalizer = screen.getByTestId('btn-navigate-journalizer');
    fireEvent.click(btnNavJournalizer);
    expect(handleNavJournalizer).toHaveBeenCalledTimes(1);

    // 2. Click Top Header BCTC button
    const btnNavBctc = screen.getByTestId('btn-navigate-bctc');
    fireEvent.click(btnNavBctc);
    expect(handleNavBctc).toHaveBeenCalledTimes(1);

    // 3. Navigate from Manufacturing 1-Click Export button
    fireEvent.click(screen.getByTestId('scenario-select-btn-scen-cogs-03'));
    await waitFor(() => {
      expect(screen.getByTestId('viewport-manufacturing')).toBeInTheDocument();
    });
    const btnExportJournalizer = screen.getByTestId('export-journalizer-btn');
    expect(btnExportJournalizer).not.toBeDisabled();
    fireEvent.click(btnExportJournalizer);
    await waitFor(() => {
      expect(handleNavJournalizer).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // T5.8: Sidebar and Quick Navigation Bar integration in App switches activeTab to 'cogs'
  // =========================================================================
  it('T5.8: Sidebar and Quick Navigation Bar integration in App switches activeTab to "cogs"', async () => {
    render(<App />);

    // Verify Quick Nav Bar button for COGS workbench exists
    const quickTabCogs = screen.getByTestId('tab-cogs-workbench');
    expect(quickTabCogs).toBeInTheDocument();

    // Click quick nav button
    fireEvent.click(quickTabCogs);

    // Verify CogsWorkbench is mounted inside main
    await waitFor(() => {
      expect(screen.getByTestId('cogs-workbench')).toBeInTheDocument();
      expect(screen.getByText(/COGS & Costing Workbench Đang Mở/i)).toBeInTheDocument();
    });

    // Verify Sidebar navigation tab for COGS exists
    const sidebarCogsBtns = screen.getAllByRole('button', {
      name: /Giá Vốn & Giá Thành/i,
    });
    expect(sidebarCogsBtns.length).toBeGreaterThanOrEqual(1);
  });
});
