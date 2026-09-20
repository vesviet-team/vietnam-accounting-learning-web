import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import CostingComparisonMatrix, {
  formatVnd,
} from '@/components/workbench/cogs/CostingComparisonMatrix';
import { generateComparisonMatrix } from '@/engine/cogs-engine';
import { InventoryLot, StockTransaction } from '@/types/cogs';

describe('Multi-Method Costing Comparison Matrix & Financial Impact Analyzer (CostingComparisonMatrix.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // T4.1: Renders side-by-side comparison matrix of 3 methods on identical datasets
  // =========================================================================
  it('T4.1: Renders side-by-side comparison matrix of 3 methods (FIFO, Periodic Average, Moving Average) on identical transaction datasets', () => {
    render(<CostingComparisonMatrix />);

    // Verify Main Headers & Regulatory Framework
    expect(
      screen.getByText(/MA TRẬN SO SÁNH ĐA PHƯƠNG PHÁP & TÁC ĐỘNG BÁO CÁO TÀI CHÍNH/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/VAS 02 \/ IAS 2 \(Hàng tồn kho\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Thông tư 200\/2014 & 99\/2025\/TT-BTC/i)).toBeInTheDocument();
    expect(screen.getByText(/BCTC B01-DN & B02-DN/i)).toBeInTheDocument();

    // Verify Table Element
    const table = screen.getByTestId('comparison-matrix-table');
    expect(table).toBeInTheDocument();

    // Verify 3 Method Column Headers
    expect(screen.getByTestId('col-method-FIFO')).toBeInTheDocument();
    expect(screen.getByTestId('col-method-PERIODIC_WEIGHTED_AVERAGE')).toBeInTheDocument();
    expect(screen.getByTestId('col-method-MOVING_WEIGHTED_AVERAGE')).toBeInTheDocument();

    // Verify Header Text
    expect(within(table).getByText(/Nhập Trước - Xuất Trước \(FIFO\)/i)).toBeInTheDocument();
    expect(within(table).getByText(/Bình Quân Cả Kỳ Dự Trữ/i)).toBeInTheDocument();
    expect(within(table).getByText(/Bình Quân Gia Quyền Liên Hoàn/i)).toBeInTheDocument();
    expect(within(table).getByText(/Chênh Lệch \(Δ Max - Min\)/i)).toBeInTheDocument();

    // Verify presence of all key rows
    expect(screen.getByTestId('row-cogs')).toBeInTheDocument();
    expect(screen.getByTestId('row-ending-inventory')).toBeInTheDocument();
    expect(screen.getByTestId('row-gross-profit')).toBeInTheDocument();
    expect(screen.getByTestId('row-cit-tax')).toBeInTheDocument();
    expect(screen.getByTestId('row-net-profit')).toBeInTheDocument();
    expect(screen.getByTestId('row-gross-margin')).toBeInTheDocument();
  });

  // =========================================================================
  // T4.2: Computes and verifies 4 key metrics across all 3 methods
  // =========================================================================
  it('T4.2: Computes and verifies 4 key metrics across all 3 methods (COGS, Ending Inventory, Gross Profit, CIT 20% & NPAT)', () => {
    const initialLots: InventoryLot[] = [
      { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 50_000 },
    ];
    const transactions: StockTransaction[] = [
      {
        id: 'tx-1',
        date: '2026-01-05',
        voucherCode: 'PNK-001',
        voucherType: 'PNK',
        description: 'Nhập hàng',
        quantity: 100,
        unitPrice: 60_000,
      },
      {
        id: 'tx-2',
        date: '2026-01-10',
        voucherCode: 'PXK-001',
        voucherType: 'PXK',
        description: 'Xuất bán',
        quantity: 120,
        targetAccount: '632',
      },
    ];
    const assumedRevenue = 15_000_000;

    // Ground truth from engine
    const expected = generateComparisonMatrix(initialLots, transactions, assumedRevenue);
    const fifoExp = expected.rows.find((r) => r.method === 'FIFO')!;
    const periodicExp = expected.rows.find((r) => r.method === 'PERIODIC_WEIGHTED_AVERAGE')!;
    const movingExp = expected.rows.find((r) => r.method === 'MOVING_WEIGHTED_AVERAGE')!;

    render(
      <CostingComparisonMatrix
        initialInventory={initialLots}
        transactions={transactions}
        assumedRevenue={assumedRevenue}
      />
    );

    // 1. Check Total COGS (TK 632)
    expect(screen.getByTestId('cogs-FIFO')).toHaveTextContent(formatVnd(fifoExp.cogsAmount));
    expect(screen.getByTestId('cogs-PERIODIC_WEIGHTED_AVERAGE')).toHaveTextContent(
      formatVnd(periodicExp.cogsAmount)
    );
    expect(screen.getByTestId('cogs-MOVING_WEIGHTED_AVERAGE')).toHaveTextContent(
      formatVnd(movingExp.cogsAmount)
    );

    // 2. Check Ending Inventory (TK 156 / Mã 140 B01)
    expect(screen.getByTestId('ending-FIFO')).toHaveTextContent(
      formatVnd(fifoExp.endingInventoryValue)
    );
    expect(screen.getByTestId('ending-PERIODIC_WEIGHTED_AVERAGE')).toHaveTextContent(
      formatVnd(periodicExp.endingInventoryValue)
    );
    expect(screen.getByTestId('ending-MOVING_WEIGHTED_AVERAGE')).toHaveTextContent(
      formatVnd(movingExp.endingInventoryValue)
    );

    // 3. Check Gross Profit (Mã 20 B02)
    expect(screen.getByTestId('profit-FIFO')).toHaveTextContent(formatVnd(fifoExp.grossProfit));
    expect(screen.getByTestId('profit-PERIODIC_WEIGHTED_AVERAGE')).toHaveTextContent(
      formatVnd(periodicExp.grossProfit)
    );
    expect(screen.getByTestId('profit-MOVING_WEIGHTED_AVERAGE')).toHaveTextContent(
      formatVnd(movingExp.grossProfit)
    );

    // 4. Check CIT Tax (20%) and Net Profit After Tax (Mã 60 B02)
    expect(screen.getByTestId('cit-FIFO')).toHaveTextContent(formatVnd(fifoExp.citExpense));
    expect(screen.getByTestId('cit-PERIODIC_WEIGHTED_AVERAGE')).toHaveTextContent(
      formatVnd(periodicExp.citExpense)
    );
    expect(screen.getByTestId('cit-MOVING_WEIGHTED_AVERAGE')).toHaveTextContent(
      formatVnd(movingExp.citExpense)
    );

    expect(screen.getByTestId('npat-FIFO')).toHaveTextContent(
      formatVnd(fifoExp.netProfitAfterTax)
    );
    expect(screen.getByTestId('npat-PERIODIC_WEIGHTED_AVERAGE')).toHaveTextContent(
      formatVnd(periodicExp.netProfitAfterTax)
    );
    expect(screen.getByTestId('npat-MOVING_WEIGHTED_AVERAGE')).toHaveTextContent(
      formatVnd(movingExp.netProfitAfterTax)
    );
  });

  // =========================================================================
  // T4.3: Mathematical rule verification under rising price trends
  // =========================================================================
  it('T4.3: Mathematical rule verification under rising price trends: FIFO exhibits lowest COGS, highest ending inventory, and highest gross profit', () => {
    // Rising price sequence: 50,000 -> 70,000 -> 90,000
    const initialLots: InventoryLot[] = [
      { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 50_000 },
    ];
    const transactions: StockTransaction[] = [
      {
        id: 'tx-1',
        date: '2026-01-05',
        voucherCode: 'PNK-001',
        voucherType: 'PNK',
        description: 'Nhập giá cao đợt 1',
        quantity: 100,
        unitPrice: 70_000,
      },
      {
        id: 'tx-2',
        date: '2026-01-10',
        voucherCode: 'PNK-002',
        voucherType: 'PNK',
        description: 'Nhập giá cao đợt 2',
        quantity: 100,
        unitPrice: 90_000,
      },
      {
        id: 'tx-3',
        date: '2026-01-15',
        voucherCode: 'PXK-001',
        voucherType: 'PXK',
        description: 'Xuất bán một phần',
        quantity: 150,
        targetAccount: '632',
      },
    ];

    let capturedResult: any = null;
    render(
      <CostingComparisonMatrix
        initialInventory={initialLots}
        transactions={transactions}
        onStateChange={(res) => {
          capturedResult = res;
        }}
      />
    );

    // Trend badge must detect Inflation
    const trendBadge = screen.getByTestId('trend-badge');
    expect(trendBadge).toHaveTextContent(/Giá Tăng \(Lạm phát \/ Inflation\)/i);

    // Mathematical verification:
    // Under inflation: FIFO exhausts cheaper lots first:
    // FIFO COGS: 100 @ 50k + 50 @ 70k = 5,000,000 + 3,500,000 = 8,500,000
    // Periodic WA Unit Price: (5M + 7M + 9M) / 300 = 21M / 300 = 70,000
    // Periodic WA COGS: 150 * 70k = 10,500,000
    expect(capturedResult).not.toBeNull();
    const fifo = capturedResult.rows.find((r: any) => r.method === 'FIFO');
    const periodic = capturedResult.rows.find(
      (r: any) => r.method === 'PERIODIC_WEIGHTED_AVERAGE'
    );
    const moving = capturedResult.rows.find(
      (r: any) => r.method === 'MOVING_WEIGHTED_AVERAGE'
    );

    // 1. FIFO has the Lowest COGS
    expect(fifo.cogsAmount).toBeLessThan(periodic.cogsAmount);
    expect(fifo.cogsAmount).toBeLessThan(moving.cogsAmount);

    // 2. FIFO has the Highest Ending Inventory
    expect(fifo.endingInventoryValue).toBeGreaterThan(periodic.endingInventoryValue);
    expect(fifo.endingInventoryValue).toBeGreaterThan(moving.endingInventoryValue);

    // 3. FIFO has the Highest Gross Profit
    expect(fifo.grossProfit).toBeGreaterThan(periodic.grossProfit);
    expect(fifo.grossProfit).toBeGreaterThan(moving.grossProfit);
  });

  // =========================================================================
  // T4.4: Under falling price trends
  // =========================================================================
  it('T4.4: Under falling price trends: FIFO exhibits highest COGS and lowest ending inventory', () => {
    // Falling price sequence: 100,000 -> 80,000 -> 60,000
    const initialLots: InventoryLot[] = [
      { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 100_000 },
    ];
    const transactions: StockTransaction[] = [
      {
        id: 'tx-1',
        date: '2026-01-05',
        voucherCode: 'PNK-001',
        voucherType: 'PNK',
        description: 'Nhập giá giảm đợt 1',
        quantity: 100,
        unitPrice: 80_000,
      },
      {
        id: 'tx-2',
        date: '2026-01-10',
        voucherCode: 'PNK-002',
        voucherType: 'PNK',
        description: 'Nhập giá giảm đợt 2',
        quantity: 100,
        unitPrice: 60_000,
      },
      {
        id: 'tx-3',
        date: '2026-01-15',
        voucherCode: 'PXK-001',
        voucherType: 'PXK',
        description: 'Xuất bán',
        quantity: 150,
        targetAccount: '632',
      },
    ];

    let capturedResult: any = null;
    render(
      <CostingComparisonMatrix
        initialInventory={initialLots}
        transactions={transactions}
        onStateChange={(res) => {
          capturedResult = res;
        }}
      />
    );

    // Trend badge must detect Deflation
    const trendBadge = screen.getByTestId('trend-badge');
    expect(trendBadge).toHaveTextContent(/Giá Giảm \(Giảm phát \/ Deflation\)/i);

    expect(capturedResult).not.toBeNull();
    const fifo = capturedResult.rows.find((r: any) => r.method === 'FIFO');
    const periodic = capturedResult.rows.find(
      (r: any) => r.method === 'PERIODIC_WEIGHTED_AVERAGE'
    );
    const moving = capturedResult.rows.find(
      (r: any) => r.method === 'MOVING_WEIGHTED_AVERAGE'
    );

    // 1. FIFO has the Highest COGS (depleting expensive earlier lots)
    expect(fifo.cogsAmount).toBeGreaterThan(periodic.cogsAmount);
    expect(fifo.cogsAmount).toBeGreaterThan(moving.cogsAmount);

    // 2. FIFO has the Lowest Ending Inventory (remaining stock is at lower current prices)
    expect(fifo.endingInventoryValue).toBeLessThan(periodic.endingInventoryValue);
    expect(fifo.endingInventoryValue).toBeLessThan(moving.endingInventoryValue);

    // 3. FIFO has the Lowest Gross Profit
    expect(fifo.grossProfit).toBeLessThan(periodic.grossProfit);
    expect(fifo.grossProfit).toBeLessThan(moving.grossProfit);
  });

  // =========================================================================
  // T4.5: Under flat price trends (equal prices)
  // =========================================================================
  it('T4.5: Under flat price trends: All 3 methods yield identical COGS and ending inventory', () => {
    // Constant unit price = 50,000 across all acquisitions
    const initialLots: InventoryLot[] = [
      { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 50_000 },
    ];
    const transactions: StockTransaction[] = [
      {
        id: 'tx-1',
        date: '2026-01-05',
        voucherCode: 'PNK-001',
        voucherType: 'PNK',
        description: 'Nhập đơn giá bằng nhau',
        quantity: 150,
        unitPrice: 50_000,
      },
      {
        id: 'tx-2',
        date: '2026-01-10',
        voucherCode: 'PXK-001',
        voucherType: 'PXK',
        description: 'Xuất bán đợt 1',
        quantity: 120,
        targetAccount: '632',
      },
      {
        id: 'tx-3',
        date: '2026-01-15',
        voucherCode: 'PNK-002',
        voucherType: 'PNK',
        description: 'Nhập thêm đơn giá bằng nhau',
        quantity: 200,
        unitPrice: 50_000,
      },
      {
        id: 'tx-4',
        date: '2026-01-20',
        voucherCode: 'PXK-002',
        voucherType: 'PXK',
        description: 'Xuất bán đợt 2',
        quantity: 180,
        targetAccount: '632',
      },
    ];

    let capturedResult: any = null;
    render(
      <CostingComparisonMatrix
        initialInventory={initialLots}
        transactions={transactions}
        onStateChange={(res) => {
          capturedResult = res;
        }}
      />
    );

    // Trend badge must detect Stable
    const trendBadge = screen.getByTestId('trend-badge');
    expect(trendBadge).toHaveTextContent(/Giá Bình Ổn \(Flat Price\)/i);

    expect(capturedResult).not.toBeNull();
    const fifo = capturedResult.rows.find((r: any) => r.method === 'FIFO');
    const periodic = capturedResult.rows.find(
      (r: any) => r.method === 'PERIODIC_WEIGHTED_AVERAGE'
    );
    const moving = capturedResult.rows.find(
      (r: any) => r.method === 'MOVING_WEIGHTED_AVERAGE'
    );

    // All 3 methods MUST produce identical values
    expect(fifo.cogsAmount).toBe(periodic.cogsAmount);
    expect(fifo.cogsAmount).toBe(moving.cogsAmount);

    expect(fifo.endingInventoryValue).toBe(periodic.endingInventoryValue);
    expect(fifo.endingInventoryValue).toBe(moving.endingInventoryValue);

    expect(fifo.grossProfit).toBe(periodic.grossProfit);
    expect(fifo.grossProfit).toBe(moving.grossProfit);

    expect(fifo.citExpense).toBe(periodic.citExpense);
    expect(fifo.citExpense).toBe(moving.citExpense);

    // Delta should be exactly 0
    expect(screen.getByTestId('delta-cogs')).toHaveTextContent('0 đ');
    expect(screen.getByTestId('delta-ending')).toHaveTextContent('0 đ');
    expect(screen.getByTestId('delta-profit')).toHaveTextContent('0 đ');
  });

  // =========================================================================
  // T4.6: Renders SVG comparison chart illustrating margin divergence
  // =========================================================================
  it('T4.6: Renders SVG comparison chart illustrating gross margin divergence across methods', () => {
    render(<CostingComparisonMatrix />);

    // Verify SVG container exists
    const chartSvg = screen.getByTestId('cogs-comparison-chart');
    expect(chartSvg).toBeInTheDocument();
    expect(chartSvg.tagName.toLowerCase()).toBe('svg');

    // Verify SVG contains rect elements representing the comparison bars
    const rects = chartSvg.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThanOrEqual(9); // at least 3 methods x 3-4 metrics

    // Verify Accounting Color Palette:
    // Amber for COGS (#d97706), Emerald for Ending Inventory (#059669),
    // Blue for Gross Profit (#2563eb), Red for CIT Tax (#dc2626)
    const fills = Array.from(rects).map((r) => r.getAttribute('fill'));
    expect(fills).toContain('#d97706');
    expect(fills).toContain('#059669');
    expect(fills).toContain('#2563eb');
    expect(fills).toContain('#dc2626');

    // Verify method text labels inside SVG
    const svgTexts = Array.from(chartSvg.querySelectorAll('text')).map(
      (t) => t.textContent
    );
    expect(svgTexts.some((t) => t?.includes('FIFO'))).toBe(true);
    expect(svgTexts.some((t) => t?.includes('BQ Cả Kỳ'))).toBe(true);
    expect(svgTexts.some((t) => t?.includes('BQ Liên Hoàn'))).toBe(true);

    // Verify Gross Margin divergence progress bars in the card
    expect(screen.getByTestId('row-gross-margin')).toBeInTheDocument();
    expect(screen.getByTestId('margin-FIFO')).toBeInTheDocument();
    expect(screen.getByTestId('margin-PERIODIC_WEIGHTED_AVERAGE')).toBeInTheDocument();
    expect(screen.getByTestId('margin-MOVING_WEIGHTED_AVERAGE')).toBeInTheDocument();
  });

  // =========================================================================
  // T4.7: Renders Executive Insights section providing statutory management advice
  // =========================================================================
  it('T4.7: Renders Executive Insights section providing statutory management advice (loan covenants vs CIT tax cash-flow optimization)', () => {
    render(<CostingComparisonMatrix />);

    // Verify Executive Insights Section
    const insightsSection = screen.getByTestId('executive-insights-section');
    expect(insightsSection).toBeInTheDocument();

    // Verify Strategy 1: Loan covenants & Balance Sheet Optimization
    expect(
      within(insightsSection).getByText(/Chiến Lược 1: Hỗ Trợ Hồ Sơ Vay Vốn & Cải Thiện BCTC/i)
    ).toBeInTheDocument();
    expect(
      within(insightsSection).getAllByText(/Hệ số thanh toán hiện hành/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      within(insightsSection).getAllByText(/ROE/i).length
    ).toBeGreaterThanOrEqual(1);

    // Verify Strategy 2: Corporate Income Tax Cash Flow Optimization
    expect(
      within(insightsSection).getByText(
        /Chiến Lược 2: Tối Ưu Hóa Dòng Tiền Thuế TNDN \(Tax Cash Flow\)/i
      )
    ).toBeInTheDocument();
    expect(
      within(insightsSection).getByText(/Bảo toàn Vốn Lưu Động/i)
    ).toBeInTheDocument();

    // Verify Statutory Consistency Principle (VAS 01 / TT 200/99)
    expect(
      within(insightsSection).getByText(/Nguyên Tắc Nhất Quán \(Consistency Principle\)/i)
    ).toBeInTheDocument();
    expect(
      within(insightsSection).getByText(/Thuyết minh Báo cáo tài chính/i)
    ).toBeInTheDocument();
  });

  // =========================================================================
  // T4.8: Synchronizes seamlessly when input transactions in Stock Card are mutated
  // =========================================================================
  it('T4.8: Synchronizes seamlessly when input transactions in Stock Card are mutated', () => {
    const initialLots: InventoryLot[] = [
      { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 50_000 },
    ];
    const initialTxs: StockTransaction[] = [
      {
        id: 'tx-1',
        date: '2026-01-05',
        voucherCode: 'PXK-001',
        voucherType: 'PXK',
        description: 'Xuất bán ban đầu',
        quantity: 40,
        targetAccount: '632',
      },
    ];

    const { rerender } = render(
      <CostingComparisonMatrix
        initialInventory={initialLots}
        transactions={initialTxs}
        assumedRevenue={10_000_000}
      />
    );

    // Initial state check: 40 units sold @ 50,000 = 2,000,000 VND
    expect(screen.getByTestId('cogs-FIFO')).toHaveTextContent('2.000.000 đ');

    // Mutate transactions by adding a new outbound transaction
    const mutatedTxs: StockTransaction[] = [
      ...initialTxs,
      {
        id: 'tx-2',
        date: '2026-01-10',
        voucherCode: 'PXK-002',
        voucherType: 'PXK',
        description: 'Xuất bán thêm lô 2',
        quantity: 30,
        targetAccount: '632',
      },
    ];

    // Re-render with mutated transactions
    rerender(
      <CostingComparisonMatrix
        initialInventory={initialLots}
        transactions={mutatedTxs}
        assumedRevenue={10_000_000}
      />
    );

    // Updated state check: 70 units sold @ 50,000 = 3,500,000 VND
    expect(screen.getByTestId('cogs-FIFO')).toHaveTextContent('3.500.000 đ');

    // Ending inventory should have decreased from 60 units (3M) to 30 units (1.5M)
    expect(screen.getByTestId('ending-FIFO')).toHaveTextContent('1.500.000 đ');
  });
});
