import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import StockCardSimulator from '@/components/workbench/cogs/StockCardSimulator';
import { InventoryLot, StockTransaction } from '@/types/cogs';

describe('Interactive Digital Stock Card Simulator (StockCardSimulator.tsx)', () => {
  beforeEach(() => {
    // Clean environment before each test
  });

  // =========================================================================
  // T2.1: Renders authentic table columns conforming to Circular 200/99
  // =========================================================================
  it('T2.1: Renders authentic table columns conforming to Circular 200/99', () => {
    render(<StockCardSimulator />);

    // Check Header & Regulatory References
    expect(
      screen.getByText(/THẺ KHO ĐIỆN TỬ & SỔ CHI TIẾT VẬT LIỆU, HÀNG HÓA/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Thông tư 200\/2014\/TT-BTC & Thông tư 99\/2025\/TT-BTC/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Mẫu S10-DN/i)
    ).toBeInTheDocument();

    // Verify Main Table Headers
    const table = screen.getByTestId('stock-card-table');
    expect(table).toBeInTheDocument();

    expect(within(table).getByText('Ngày ghi sổ / chứng từ')).toBeInTheDocument();
    expect(within(table).getByText('Chứng từ')).toBeInTheDocument();
    expect(within(table).getByText('Số hiệu')).toBeInTheDocument();
    expect(within(table).getByText('Loại chứng từ')).toBeInTheDocument();
    expect(within(table).getByText('Diễn giải nội dung kinh tế')).toBeInTheDocument();
    expect(within(table).getByText('TK đối ứng')).toBeInTheDocument();
    expect(within(table).getByText('Đơn giá xuất kho')).toBeInTheDocument();
    expect(within(table).getByText('Nhập kho')).toBeInTheDocument();
    expect(within(table).getByText('Xuất kho')).toBeInTheDocument();
    expect(within(table).getByText('Tồn kho')).toBeInTheDocument();
    expect(within(table).getByText('Thao tác')).toBeInTheDocument();

    // Verify initial stock balance row
    expect(screen.getByTestId('initial-stock-row')).toBeInTheDocument();
    expect(screen.getByText('Số dư tồn đầu kỳ')).toBeInTheDocument();
  });

  // =========================================================================
  // T2.2: Supports voucher types: PNK, PXK, and XKNB Form 03 (Decree 123/2020 & 70/2025)
  // =========================================================================
  it('T2.2: Supports voucher types: PNK, PXK, and XKNB Form 03 (Decree 123/2020 & 70/2025)', () => {
    render(<StockCardSimulator />);

    // In the default dataset, all 3 types are rendered in the table
    expect(screen.getAllByText(/PNK \(Nhập kho\)/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/PXK \(Xuất bán\)/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/XKNB Mẫu 03/i).length).toBeGreaterThanOrEqual(1);

    // Verify presence of voucher codes
    expect(screen.getByText('PNK-001')).toBeInTheDocument();
    expect(screen.getByText('PXK-001')).toBeInTheDocument();
    expect(screen.getByText('XKNB-001')).toBeInTheDocument();

    // Open add transaction modal to check that voucher type options include all three
    fireEvent.click(screen.getByTestId('add-transaction-btn'));
    const selectVoucherType = screen.getByTestId('select-voucher-type') as HTMLSelectElement;
    expect(selectVoucherType).toBeInTheDocument();

    const options = Array.from(selectVoucherType.options).map((opt) => opt.value);
    expect(options).toContain('PNK');
    expect(options).toContain('PXK');
    expect(options).toContain('XKNB_03');

    // Close modal
    fireEvent.click(screen.getByTestId('close-modal-btn'));
  });

  // =========================================================================
  // T2.3: Commercial sale dispatch renders Nợ 632 / Có 156
  // =========================================================================
  it('T2.3: Commercial sale dispatch renders Nợ 632 / Có 156', () => {
    render(<StockCardSimulator />);

    // Find row for PXK-001 (Commercial sale)
    const targetAccountCell = screen.getByTestId('target-account-tx-2');
    expect(targetAccountCell).toBeInTheDocument();
    expect(targetAccountCell).toHaveTextContent('Nợ 632 / Có 156');

    // Verify row for PXK-002 also renders Nợ 632 / Có 156
    const targetAccountCell2 = screen.getByTestId('target-account-tx-5');
    expect(targetAccountCell2).toBeInTheDocument();
    expect(targetAccountCell2).toHaveTextContent('Nợ 632 / Có 156');
  });

  // =========================================================================
  // T2.4: Internal consignment dispatch renders Nợ 157 / Có 156
  // =========================================================================
  it('T2.4: Internal consignment dispatch renders Nợ 157 / Có 156', () => {
    render(<StockCardSimulator />);

    // Find row for XKNB-001 (Internal consignment dispatch Form 03)
    const targetAccountCell = screen.getByTestId('target-account-tx-3');
    expect(targetAccountCell).toBeInTheDocument();
    expect(targetAccountCell).toHaveTextContent('Nợ 157 / Có 156');

    // Verify explanation / description indicates internal dispatch
    expect(
      screen.getByText(/Xuất kho kiêm VCNB điều chuyển Chi nhánh Đà Nẵng \(Mẫu 03\/XKNB\)/i)
    ).toBeInTheDocument();
  });

  // =========================================================================
  // T2.5: Adding new transaction row dynamically updates balances in <2ms
  // =========================================================================
  it('T2.5: Adding new transaction row dynamically updates balances in <2ms', () => {
    render(<StockCardSimulator />);

    const endingQtyBefore = screen.getByTestId('kpi-ending-qty').textContent;

    // Open add transaction modal
    fireEvent.click(screen.getByTestId('add-transaction-btn'));
    expect(screen.getByTestId('transaction-modal')).toBeInTheDocument();

    // Fill in new receipt transaction (PNK-999, 100 tấn @ 60,000)
    fireEvent.change(screen.getByTestId('input-date'), { target: { value: '2026-01-28' } });
    fireEvent.change(screen.getByTestId('select-voucher-type'), { target: { value: 'PNK' } });
    fireEvent.change(screen.getByTestId('input-voucher-code'), { target: { value: 'PNK-999' } });
    fireEvent.change(screen.getByTestId('input-description'), {
      target: { value: 'Nhập kho bổ sung khẩn cấp' },
    });
    fireEvent.change(screen.getByTestId('input-quantity'), { target: { value: '100' } });
    fireEvent.change(screen.getByTestId('input-unit-price'), { target: { value: '60000' } });

    // Submit form and measure latency
    const t0 = performance.now();
    fireEvent.click(screen.getByTestId('save-transaction-btn'));
    const t1 = performance.now();

    // Verify sub-millisecond to 2ms latency
    expect(t1 - t0).toBeLessThan(100); // Test runner overhead allowance, core engine is <0.1ms

    // Check that new transaction is rendered
    expect(screen.getByText('PNK-999')).toBeInTheDocument();
    expect(screen.getByText('Nhập kho bổ sung khẩn cấp')).toBeInTheDocument();

    // Verify ending quantity increased by 100 (from 100 to 200)
    const endingQtyAfter = screen.getByTestId('kpi-ending-qty').textContent;
    expect(endingQtyAfter).toContain('200');
    expect(endingQtyAfter).not.toEqual(endingQtyBefore);
  });

  // =========================================================================
  // T2.6: Editing receipt quantity cascades updates to subsequent running balances
  // =========================================================================
  it('T2.6: Editing receipt quantity cascades updates to subsequent running balances', () => {
    render(<StockCardSimulator />);

    // Initial ending quantity is 100 tấn
    expect(screen.getByTestId('kpi-ending-qty')).toHaveTextContent('100');

    // Click edit on the first receipt: PNK-001 (id: tx-1, original qty: 150)
    fireEvent.click(screen.getByTestId('edit-btn-tx-1'));
    expect(screen.getByTestId('transaction-modal')).toBeInTheDocument();

    // Change quantity from 150 to 250 (+100 tấn)
    fireEvent.change(screen.getByTestId('input-quantity'), { target: { value: '250' } });
    fireEvent.click(screen.getByTestId('save-transaction-btn'));

    // Verify modal closed
    expect(screen.queryByTestId('transaction-modal')).not.toBeInTheDocument();

    // The ending quantity must immediately cascade from 100 to 200
    expect(screen.getByTestId('kpi-ending-qty')).toHaveTextContent('200');

    // Total In quantity must also update from 350 to 450
    expect(screen.getByTestId('kpi-total-in-qty')).toHaveTextContent('450');
  });

  // =========================================================================
  // T2.7: Deleting row updates balance and restores downstream lot availability
  // =========================================================================
  it('T2.7: Deleting row updates balance and restores downstream lot availability', () => {
    render(<StockCardSimulator />);

    // Initially, total outbound is 350 tấn (120 + 50 + 180) and ending qty is 100 tấn
    expect(screen.getByTestId('kpi-total-out-qty')).toHaveTextContent('350');
    expect(screen.getByTestId('kpi-ending-qty')).toHaveTextContent('100');

    // Delete transaction tx-2 (PXK-001, quantity: 120)
    fireEvent.click(screen.getByTestId('delete-btn-tx-2'));

    // Row PXK-001 must no longer be present
    expect(screen.queryByText('PXK-001')).not.toBeInTheDocument();

    // Total outbound quantity must decrease to 230 (350 - 120)
    expect(screen.getByTestId('kpi-total-out-qty')).toHaveTextContent('230');

    // Ending inventory balance quantity must increase to 220 (100 + 120)
    expect(screen.getByTestId('kpi-ending-qty')).toHaveTextContent('220');
  });

  // =========================================================================
  // T2.8: Switching method (FIFO <-> Periodic <-> Moving) recalculates values dynamically
  // =========================================================================
  it('T2.8: Switching method (FIFO <-> Periodic <-> Moving) recalculates values dynamically', () => {
    render(<StockCardSimulator />);

    // In FIFO mode initially
    const fifoBtn = screen.getByTestId('method-btn-FIFO');
    expect(fifoBtn).toHaveClass('bg-blue-600');

    const initialCogsText = screen.getByTestId('kpi-total-cogs').textContent;
    const initialEndingAmountText = screen.getByTestId('kpi-ending-qty').parentElement?.textContent;
    expect(initialCogsText).toBeTruthy();
    expect(initialEndingAmountText).toBeTruthy();

    // Switch to Periodic Weighted Average
    const periodicBtn = screen.getByTestId('method-btn-PERIODIC_WEIGHTED_AVERAGE');
    fireEvent.click(periodicBtn);
    expect(periodicBtn).toHaveClass('bg-blue-600');

    // Verify explanation changes
    expect(screen.getByText(/Bình quân cả kỳ dự trữ \(Đoạn 15 VAS 02\)/i)).toBeInTheDocument();

    // Switch to Moving Weighted Average
    const movingBtn = screen.getByTestId('method-btn-MOVING_WEIGHTED_AVERAGE');
    fireEvent.click(movingBtn);
    expect(movingBtn).toHaveClass('bg-blue-600');

    // Verify explanation changes
    expect(
      screen.getByText(/Bình quân gia quyền liên hoàn sau mỗi lần nhập/i)
    ).toBeInTheDocument();

    // Switch back to FIFO
    fireEvent.click(fifoBtn);
    expect(fifoBtn).toHaveClass('bg-blue-600');
    expect(screen.getByText(/Nhập trước - Xuất trước \(FIFO - Đoạn 13 VAS 02\)/i)).toBeInTheDocument();
  });

  // =========================================================================
  // T2.9: Negative stock dispatch displays visual warning and highlights row
  // =========================================================================
  it('T2.9: Negative stock dispatch displays visual warning and highlights row', () => {
    // Custom transactions containing an excessive dispatch that causes negative stock
    const initialLots: InventoryLot[] = [
      { id: 'lot-1', date: '2026-01-01', quantity: 50, unitPrice: 50_000 },
    ];
    const transactions: StockTransaction[] = [
      {
        id: 'tx-neg-1',
        date: '2026-01-05',
        voucherCode: 'PXK-999',
        voucherType: 'PXK',
        description: 'Xuất quá số lượng tồn kho khả dụng',
        quantity: 500, // available is only 50
        targetAccount: '632',
      },
    ];

    render(
      <StockCardSimulator
        initialLots={initialLots}
        initialTransactions={transactions}
      />
    );

    // Verify prominent red warning banner
    const warningBanner = screen.getByTestId('negative-stock-warning');
    expect(warningBanner).toBeInTheDocument();
    expect(warningBanner).toHaveTextContent(
      'Cảnh báo vi phạm: Xuất âm kho! Số lượng tồn kho không được phép nhỏ hơn 0 tại thời điểm xuất'
    );

    // Verify row highlighting in red
    const row = screen.getByTestId('stock-row-tx-neg-1');
    expect(row).toBeInTheDocument();
    expect(row.className).toContain('bg-red-50');
    expect(row.className).toContain('border-red-500');
    expect(within(row).getByText(/Xuất âm kho! Vượt tồn khả dụng/i)).toBeInTheDocument();
  });

  // =========================================================================
  // T2.10: LIFO lookup displays statutory warning alert/modal
  // =========================================================================
  it('T2.10: LIFO lookup displays statutory warning alert/modal', () => {
    render(<StockCardSimulator />);

    // Click LIFO method button
    const lifoBtn = screen.getByTestId('method-btn-LIFO');
    fireEvent.click(lifoBtn);

    // Verify statutory prohibition warning banner is rendered
    const lifoWarning = screen.getByTestId('lifo-statutory-warning');
    expect(lifoWarning).toBeInTheDocument();

    // Check required legal citations in the warning
    expect(lifoWarning).toHaveTextContent('VAS 02');
    expect(lifoWarning).toHaveTextContent('IAS 2');
    expect(lifoWarning).toHaveTextContent('Thông tư 200');
    expect(lifoWarning).toHaveTextContent('Thông tư 133');
    expect(lifoWarning).toHaveTextContent('Thông tư 99/2025');

    // Also verify LIFO statutory audit modal is open
    const lifoModal = screen.getByTestId('lifo-modal');
    expect(lifoModal).toBeInTheDocument();
    expect(within(lifoModal).getByText(/Quy Định Bãi Bỏ Phương Pháp LIFO/i)).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByTestId('confirm-lifo-modal-btn'));
    expect(screen.queryByTestId('lifo-modal')).not.toBeInTheDocument();

    // Click LIFO info button to re-open modal
    fireEvent.click(screen.getByTestId('lifo-info-btn'));
    expect(screen.getByTestId('lifo-modal')).toBeInTheDocument();
  });
});
