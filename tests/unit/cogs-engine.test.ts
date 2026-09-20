import { describe, it, expect } from 'vitest';
import {
  calculateFifo,
  calculatePeriodicWeightedAverage,
  calculateMovingWeightedAverage,
  calculateStockCard,
  calculateManufacturingCost,
  generateComparisonMatrix,
  NegativeStockError,
  ZeroStockBoundaryError,
  LIFO_PROHIBITED_EXPLANATION_VI,
} from '../../src/engine/cogs-engine';
import {
  InventoryLot,
  StockTransaction,
  ManufacturingCostInput,
} from '../../src/types/cogs';

describe('COGS & Cost Accounting Engine (cogs-engine.ts)', () => {
  // =========================================================================
  // 1. FIFO Outbound Calculation (T1.1 - T1.4)
  // =========================================================================
  describe('1. FIFO Outbound Calculation', () => {
    it('T1.1: Single-lot FIFO dispatch matches purchase price exactly', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 20_000 },
      ];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-05',
          voucherCode: 'PXK-001',
          voucherType: 'PXK',
          description: 'Xuất bán hàng cho Đại lý Hoa Sen',
          quantity: 40,
        },
        {
          id: 'tx-2',
          date: '2026-01-06',
          voucherCode: 'XKNB-001',
          voucherType: 'XKNB_03',
          description: 'Xuất điều chuyển nội bộ Mẫu 03/XKNB',
          quantity: 20,
        },
      ];

      const result = calculateFifo(initialLots, transactions);

      expect(result.rows).toHaveLength(2);
      const row1 = result.rows[0];
      expect(row1.outQty).toBe(40);
      expect(row1.outPrice).toBe(20_000);
      expect(row1.outAmount).toBe(800_000);
      expect(row1.targetAccount).toBe('632');
      expect(row1.balanceQty).toBe(60);
      expect(row1.balanceAmount).toBe(1_200_000);

      const row2 = result.rows[1];
      expect(row2.outQty).toBe(20);
      expect(row2.outPrice).toBe(20_000);
      expect(row2.outAmount).toBe(400_000);
      expect(row2.targetAccount).toBe('157'); // Mẫu 03/XKNB routes to TK 157
      expect(row2.balanceQty).toBe(40);
      expect(row2.balanceAmount).toBe(800_000);

      // totalCogsAmount ONLY accumulates TK 632 (800,000), not TK 157
      expect(result.totalCogsAmount).toBe(800_000);
      expect(result.totalOutAmount).toBe(1_200_000);
      expect(result.endingBalanceQty).toBe(40);
      expect(result.endingBalanceAmount).toBe(800_000);
    });

    it('T1.2: Multi-lot FIFO spanning 3 acquisition lots correctly depletes oldest lots first', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 20_000 },
      ];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-03',
          voucherCode: 'PNK-001',
          voucherType: 'PNK',
          description: 'Nhập mua đợt 2',
          quantity: 100,
          unitPrice: 22_000,
        },
        {
          id: 'tx-2',
          date: '2026-01-07',
          voucherCode: 'PNK-002',
          voucherType: 'PNK',
          description: 'Nhập mua đợt 3',
          quantity: 100,
          unitPrice: 25_000,
        },
        {
          id: 'tx-3',
          date: '2026-01-10',
          voucherCode: 'PXK-001',
          voucherType: 'PXK',
          description: 'Xuất bán hàng cho dự án xây dựng',
          quantity: 250,
        },
      ];

      const start = performance.now();
      const result = calculateFifo(initialLots, transactions);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5.0); // Execution latency <5ms
      expect(result.rows).toHaveLength(3);
      const saleRow = result.rows[2];
      expect(saleRow.outQty).toBe(250);
      // Depletion: 100 * 20,000 (2M) + 100 * 22,000 (2.2M) + 50 * 25,000 (1.25M) = 5,450,000 VND
      expect(saleRow.outAmount).toBe(5_450_000);
      expect(saleRow.outPrice).toBe(21_800); // 5,450,000 / 250
      expect(saleRow.balanceQty).toBe(50);
      expect(saleRow.balanceAmount).toBe(1_250_000); // Remaining 50 units @ 25,000
      expect(saleRow.balancePrice).toBe(25_000);
      expect(result.totalCogsAmount).toBe(5_450_000);
    });

    it('T1.3: Exact balance exhaustion transitions seamlessly to next lot', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 50, unitPrice: 10_000 },
        { id: 'lot-2', date: '2026-01-02', quantity: 50, unitPrice: 12_000 },
      ];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-05',
          voucherCode: 'PXK-001',
          voucherType: 'PXK',
          description: 'Xuất hết đúng lô 1',
          quantity: 50,
        },
        {
          id: 'tx-2',
          date: '2026-01-06',
          voucherCode: 'PXK-002',
          voucherType: 'PXK',
          description: 'Xuất tiếp sang lô 2',
          quantity: 20,
        },
      ];

      const result = calculateFifo(initialLots, transactions);

      expect(result.rows[0].outQty).toBe(50);
      expect(result.rows[0].outPrice).toBe(10_000);
      expect(result.rows[0].outAmount).toBe(500_000);
      expect(result.rows[0].balanceQty).toBe(50);

      expect(result.rows[1].outQty).toBe(20);
      expect(result.rows[1].outPrice).toBe(12_000);
      expect(result.rows[1].outAmount).toBe(240_000);
      expect(result.rows[1].balanceQty).toBe(30);
      expect(result.rows[1].balanceAmount).toBe(360_000);
    });

    it('T1.4: FIFO unit cost recalculation on remaining stock reflects newer acquisition layers', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 10, unitPrice: 15_000 },
      ];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-04',
          voucherCode: 'PNK-001',
          voucherType: 'PNK',
          description: 'Nhập giá mới cao hơn',
          quantity: 20,
          unitPrice: 30_000,
        },
        {
          id: 'tx-2',
          date: '2026-01-08',
          voucherCode: 'PXK-001',
          voucherType: 'PXK',
          description: 'Xuất hết sạch lô cũ',
          quantity: 10,
        },
      ];

      const result = calculateFifo(initialLots, transactions);

      const postSaleRow = result.rows[1];
      expect(postSaleRow.balanceQty).toBe(20);
      expect(postSaleRow.balanceAmount).toBe(600_000);
      expect(postSaleRow.balancePrice).toBe(30_000); // Only new layer remains
    });
  });

  // =========================================================================
  // 2. Periodic Weighted Average (T1.5 - T1.7)
  // =========================================================================
  describe('2. Periodic Weighted Average (Bình quân cả kỳ dự trữ)', () => {
    it('T1.5: Calculates unit cost accurately using period-wide formula', () => {
      // Opening: 100 @ 20,000 = 2,000,000
      // Inflow: 200 @ 26,000 = 5,200,000
      // Average = (2M + 5.2M) / (100 + 200) = 7,200,000 / 300 = 24,000 VND
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 20_000 },
      ];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-10',
          voucherCode: 'PNK-001',
          voucherType: 'PNK',
          description: 'Nhập hàng trong kỳ',
          quantity: 200,
          unitPrice: 26_000,
        },
        {
          id: 'tx-2',
          date: '2026-01-15',
          voucherCode: 'PXK-001',
          voucherType: 'PXK',
          description: 'Xuất bán hàng',
          quantity: 150,
        },
      ];

      const result = calculatePeriodicWeightedAverage(initialLots, transactions);

      const saleRow = result.rows[1];
      expect(saleRow.outQty).toBe(150);
      expect(saleRow.outPrice).toBe(24_000);
      expect(saleRow.outAmount).toBe(3_600_000);
      expect(saleRow.balanceQty).toBe(150);
      expect(saleRow.balanceAmount).toBe(3_600_000);
    });

    it('T1.6: Dispatches across all outbound dates evaluate at identical end-of-period rate', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 10_000 },
      ];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-05',
          voucherCode: 'PXK-001',
          voucherType: 'PXK',
          description: 'Xuất sớm đầu kỳ',
          quantity: 20,
        },
        {
          id: 'tx-2',
          date: '2026-01-15',
          voucherCode: 'PNK-001',
          voucherType: 'PNK',
          description: 'Nhập giữa kỳ',
          quantity: 100,
          unitPrice: 20_000,
        },
        {
          id: 'tx-3',
          date: '2026-01-25',
          voucherCode: 'PXK-002',
          voucherType: 'PXK',
          description: 'Xuất muộn cuối kỳ',
          quantity: 30,
        },
      ];

      // Total in: 100 @ 10,000 + 100 @ 20,000 = 3,000,000 / 200 = 15,000 VND
      const result = calculatePeriodicWeightedAverage(initialLots, transactions);

      const earlySale = result.rows[0];
      const lateSale = result.rows[2];

      expect(earlySale.outPrice).toBe(15_000);
      expect(lateSale.outPrice).toBe(15_000);
      expect(earlySale.outAmount).toBe(300_000);
      expect(lateSale.outAmount).toBe(450_000);
    });

    it('T1.7: Ending stock value equals Q_ck * rate within +-1 VND rounding', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 33, unitPrice: 17_450 },
      ];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-10',
          voucherCode: 'PNK-001',
          voucherType: 'PNK',
          description: 'Nhập lô lẻ',
          quantity: 47,
          unitPrice: 21_330,
        },
        {
          id: 'tx-2',
          date: '2026-01-20',
          voucherCode: 'PXK-001',
          voucherType: 'PXK',
          description: 'Xuất kho',
          quantity: 25,
        },
      ];

      const result = calculatePeriodicWeightedAverage(initialLots, transactions);

      expect(result.isConserved).toBe(true);
      expect(Math.abs(result.roundingDiff)).toBeLessThanOrEqual(1);

      const totalInflow = 33 * 17_450 + 47 * 21_330;
      expect(result.totalOutAmount + result.endingBalanceAmount).toBe(totalInflow);
    });
  });

  // =========================================================================
  // 3. Continuous Moving Weighted Average (T1.8 - T1.10)
  // =========================================================================
  describe('3. Continuous Moving Weighted Average (Bình quân gia quyền liên hoàn)', () => {
    it('T1.8: Recalculates unit cost immediately after each receipt transaction', () => {
      // Opening: 100 @ 10,000 = 1,000,000
      // Receipt: 100 @ 20,000 = 2,000,000 -> New balance: 200 @ 15,000
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 10_000 },
      ];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-05',
          voucherCode: 'PNK-001',
          voucherType: 'PNK',
          description: 'Nhập thêm lô 2',
          quantity: 100,
          unitPrice: 20_000,
        },
      ];

      const result = calculateMovingWeightedAverage(initialLots, transactions);

      expect(result.rows[0].balanceQty).toBe(200);
      expect(result.rows[0].balanceAmount).toBe(3_000_000);
      expect(result.rows[0].balancePrice).toBe(15_000);
    });

    it('T1.9: Outbound transactions between receipts use latest pre-outbound moving average', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 10_000 },
      ];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-05',
          voucherCode: 'PNK-001',
          voucherType: 'PNK',
          description: 'Nhập lô 2',
          quantity: 100,
          unitPrice: 20_000,
        },
        {
          id: 'tx-2',
          date: '2026-01-07',
          voucherCode: 'PXK-001',
          voucherType: 'PXK',
          description: 'Xuất hàng đợt 1',
          quantity: 50,
        },
      ];

      const result = calculateMovingWeightedAverage(initialLots, transactions);

      const saleRow = result.rows[1];
      expect(saleRow.outQty).toBe(50);
      expect(saleRow.outPrice).toBe(15_000);
      expect(saleRow.outAmount).toBe(750_000);
      expect(saleRow.balanceQty).toBe(150);
      expect(saleRow.balanceAmount).toBe(2_250_000);
    });

    it('T1.10: Subsequent receipt at different price correctly recalibrates moving unit cost', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 10_000 },
      ];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-05',
          voucherCode: 'PNK-001',
          voucherType: 'PNK',
          description: 'Nhập 100 @ 20k',
          quantity: 100,
          unitPrice: 20_000,
        },
        {
          id: 'tx-2',
          date: '2026-01-07',
          voucherCode: 'PXK-001',
          voucherType: 'PXK',
          description: 'Xuất 50 @ 15k',
          quantity: 50,
        },
        {
          id: 'tx-3',
          date: '2026-01-12',
          voucherCode: 'PNK-002',
          voucherType: 'PNK',
          description: 'Nhập tiếp 50 @ 25k',
          quantity: 50,
          unitPrice: 25_000,
        },
      ];

      // After tx-2: 150 units with 2,250,000 VND
      // tx-3: add 50 units @ 25,000 = 1,250,000 VND
      // New balance: 200 units with 3,500,000 VND -> rate = 3,500,000 / 200 = 17,500 VND
      const result = calculateMovingWeightedAverage(initialLots, transactions);

      const lastReceipt = result.rows[2];
      expect(lastReceipt.balanceQty).toBe(200);
      expect(lastReceipt.balanceAmount).toBe(3_500_000);
      expect(lastReceipt.balancePrice).toBe(17_500);
    });
  });

  // =========================================================================
  // 4. VAS 02 Paragraph 11 Abnormal Cost Separation & Tax B4 (T1.11 - T1.13)
  // =========================================================================
  describe('4. VAS 02 Paragraph 11 Abnormal Cost Separation & Tax Impact', () => {
    it('T1.11: Raw material usage within technical norm is capitalized into TK 154 / 621', () => {
      const input: ManufacturingCostInput = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 100_000_000,
        actualDirectLabor: 40_000_000,
        actualOverhead: 20_000_000,
        normalDirectMaterial: 100_000_000, // 100% within norm
        normalDirectLabor: 40_000_000,
        finishedUnits: 100,
        endingWipUnits: 0,
        wipMethod: 'DIRECT_MATERIAL',
      };

      const result = calculateManufacturingCost(input);

      expect(result.normalMaterialCost).toBe(100_000_000);
      expect(result.abnormalMaterialCost).toBe(0);
      expect(result.cogsDirectExpense).toBe(0);
      expect(result.scheduleB4Amount).toBe(0);
      expect(result.citTaxImpact).toBe(0);
      expect(result.totalCostZ).toBe(160_000_000);
      expect(result.unitCostZ).toBe(1_600_000);

      // Journal entry check: Nợ 154 / Có 621
      const matEntry = result.journalEntries.find(
        (e) => e.debitAccount === '154' && e.creditAccount === '621'
      );
      expect(matEntry).toBeDefined();
      expect(matEntry?.amount).toBe(100_000_000);

      // No 632 direct debit
      const abnormalEntry = result.journalEntries.find(
        (e) => e.debitAccount === '632'
      );
      expect(abnormalEntry).toBeUndefined();
    });

    it('T1.12: Raw material usage exceeding norm is separated and debited directly to TK 632', () => {
      // Test Circular 200 mode
      const input200: ManufacturingCostInput = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 120_000_000, // Exceeds norm of 100M by 20M
        actualDirectLabor: 30_000_000,
        actualOverhead: 15_000_000,
        normalDirectMaterial: 100_000_000,
        normalDirectLabor: 30_000_000,
        finishedUnits: 100,
        endingWipUnits: 0,
        wipMethod: 'DIRECT_MATERIAL',
      };

      const result200 = calculateManufacturingCost(input200);

      expect(result200.normalMaterialCost).toBe(100_000_000);
      expect(result200.abnormalMaterialCost).toBe(20_000_000);
      expect(result200.cogsDirectExpense).toBe(20_000_000);
      expect(result200.totalCostZ).toBe(145_000_000);
      expect(result200.unitCostZ).toBe(1_450_000);

      // Verify Nợ 632 / Có 621 entry in Circular 200
      const cogsEntry200 = result200.journalEntries.find(
        (e) => e.debitAccount === '632' && e.creditAccount === '621'
      );
      expect(cogsEntry200).toBeDefined();
      expect(cogsEntry200?.amount).toBe(20_000_000);

      // Test Circular 133 mode: No 621/622/627 accounts allowed, routes Nợ 632 / Có 154
      const input133: ManufacturingCostInput = {
        ...input200,
        regime: 'CIRCULAR_133',
      };
      const result133 = calculateManufacturingCost(input133);
      const prohibited6xx = result133.journalEntries.some(
        (e) => e.debitAccount.startsWith('62') || e.creditAccount.startsWith('62')
      );
      expect(prohibited6xx).toBe(false);
      const cogsEntry133 = result133.journalEntries.find(
        (e) => e.debitAccount === '632' && e.creditAccount === '154'
      );
      expect(cogsEntry133).toBeDefined();
      expect(cogsEntry133?.amount).toBe(20_000_000);

      // Verify Account 154 double-entry equilibrium under Circular 133:
      // Total Debits to 154 (120M mat + 30M lab + 15M ovh = 165M) === Total Credits to 154 (20M abnormal + 145M Z = 165M)
      const debits154 = result133.journalEntries
        .filter((e) => e.debitAccount === '154')
        .reduce((sum, e) => sum + e.amount, 0);
      const credits154 = result133.journalEntries
        .filter((e) => e.creditAccount === '154')
        .reduce((sum, e) => sum + e.amount, 0);
      expect(debits154).toBe(165_000_000);
      expect(credits154).toBe(165_000_000);
      expect(debits154).toBe(credits154);
    });

    it('T1.12b: Zero-norm boundary condition correctly reflects 100% abnormal waste and Schedule B4 tax adjustment', () => {
      // When normalDirectMaterial is 0 (100% abnormal waste / unauthorized production run)
      const inputZeroNorm: ManufacturingCostInput = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 50_000_000,
        actualDirectLabor: 0,
        actualOverhead: 0,
        normalDirectMaterial: 0,
        normalDirectLabor: 0,
        finishedUnits: 0,
        endingWipUnits: 0,
        wipMethod: 'DIRECT_MATERIAL',
      };

      const result = calculateManufacturingCost(inputZeroNorm);

      expect(result.normalMaterialCost).toBe(0);
      expect(result.abnormalMaterialCost).toBe(50_000_000);
      expect(result.abnormalMaterialCost).toBe(inputZeroNorm.actualDirectMaterial);
      expect(result.cogsDirectExpense).toBe(50_000_000);
      expect(result.totalCostZ).toBe(0);
      expect(result.scheduleB4Amount).toBe(50_000_000);
      expect(result.scheduleB4Amount).toBe(inputZeroNorm.actualDirectMaterial);
      expect(result.citTaxImpact).toBe(10_000_000); // 50M * 20%
      expect(result.scheduleB4Adjustments).toHaveLength(1);
      expect(result.scheduleB4Item?.code).toBe('B4_ABNORMAL_COST');
      expect(result.scheduleB4Item?.amount).toBe(50_000_000);

      // Verify also under Circular 133 with normalDirectMaterial = 0
      const inputZeroNorm133: ManufacturingCostInput = {
        ...inputZeroNorm,
        regime: 'CIRCULAR_133',
      };
      const result133 = calculateManufacturingCost(inputZeroNorm133);
      expect(result133.abnormalMaterialCost).toBe(50_000_000);
      expect(result133.totalCostZ).toBe(0);
      expect(result133.scheduleB4Amount).toBe(50_000_000);

      const debits154 = result133.journalEntries
        .filter((e) => e.debitAccount === '154')
        .reduce((sum, e) => sum + e.amount, 0);
      const credits154 = result133.journalEntries
        .filter((e) => e.creditAccount === '154')
        .reduce((sum, e) => sum + e.amount, 0);
      expect(debits154).toBe(50_000_000);
      expect(credits154).toBe(50_000_000);
      expect(debits154).toBe(credits154);
    });

    it('T1.13: Abnormal cost triggers warning and outputs structured Schedule B4 adjustment item', () => {
      const input: ManufacturingCostInput = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 150_000_000,
        actualDirectLabor: 50_000_000,
        actualOverhead: 20_000_000,
        normalDirectMaterial: 120_000_000, // 30M abnormal
        normalDirectLabor: 40_000_000,     // 10M abnormal
        finishedUnits: 50,
        endingWipUnits: 0,
        wipMethod: 'DIRECT_MATERIAL',
      };

      const result = calculateManufacturingCost(input);

      // Total abnormal = 30M + 10M = 40M
      expect(result.scheduleB4Amount).toBe(40_000_000);
      expect(result.citTaxImpact).toBe(8_000_000); // 40M * 20%
      expect(result.scheduleB4Adjustments).toHaveLength(1);
      expect(result.scheduleB4Item?.code).toBe('B4_ABNORMAL_COST');
      expect(result.scheduleB4Item?.amount).toBe(40_000_000);
      expect(result.warningVi).toContain('VAS 02 Đoạn 11');
      expect(result.warningVi).toContain('Chỉ tiêu B4');
    });
  });

  // =========================================================================
  // 5. Work In Progress (WIP) Valuation Methods (T1.14 - T1.16)
  // =========================================================================
  describe('5. Work In Progress (WIP) Valuation Methods', () => {
    it('T1.14: WIP by Direct Material method excludes labor and overhead from WIP', () => {
      // Direct Material method:
      // Normal Material = 80,000,000; Normal Labor = 20,000,000; Overhead = 10,000,000
      // Finished = 80, Ending WIP = 20 -> Total = 100
      // Unit Material = 80M / 100 = 800,000
      // D_ck = 800,000 * 20 = 16,000,000 (No labor or overhead in WIP)
      // Total Eligible = 80M + 20M + 10M = 110M
      // Total Z = 110M - 16M = 94,000,000
      // Unit z = 94,000,000 / 80 = 1,175,000
      const input: ManufacturingCostInput = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 80_000_000,
        actualDirectLabor: 20_000_000,
        actualOverhead: 10_000_000,
        normalDirectMaterial: 80_000_000,
        normalDirectLabor: 20_000_000,
        finishedUnits: 80,
        endingWipUnits: 20,
        wipMethod: 'DIRECT_MATERIAL',
      };

      const result = calculateManufacturingCost(input);

      expect(result.endingWipCost).toBe(16_000_000);
      expect(result.totalCostZ).toBe(94_000_000);
      expect(result.unitCostZ).toBe(1_175_000);
    });

    it('T1.15: WIP by EUP accounts for conversion completion percentage', () => {
      // Finished = 80, Ending WIP = 20, Completion % = 50%
      // eupUnits = 20 * 50% = 10 units
      // Total conversion units = 80 + 10 = 90 units
      const input: ManufacturingCostInput = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 80_000_000,
        actualDirectLabor: 20_000_000,
        actualOverhead: 10_000_000,
        normalDirectMaterial: 80_000_000,
        normalDirectLabor: 20_000_000,
        finishedUnits: 80,
        endingWipUnits: 20,
        wipMethod: 'EQUIVALENT_UNITS',
        completionPercentage: 50,
      };

      const result = calculateManufacturingCost(input);

      // Material WIP = (80M / 100) * 20 = 16,000,000
      // Conversion WIP = (30M / 90) * 10 = 3,333,333
      // Ending WIP = 16M + 3,333,333 = 19,333,333
      expect(result.endingWipCost).toBe(19_333_333);
      expect(result.totalCostZ).toBe(90_666_667);
      expect(result.unitCostZ).toBe(1_133_333.34);
    });

    it('T1.16: Conversion cost per equivalent unit correctly applied to compute ending WIP and finished goods cost Z', () => {
      // Finished = 100, WIP = 50, Completion % = 40%
      // Total Material units = 150 -> unit mat = 150M / 150 = 1,000,000
      // WIP Material = 50 * 1M = 50,000,000
      // EUP conversion units = 100 + (50 * 0.4) = 120
      // Conversion cost = 60M (Labor 40M + Overhead 20M)
      // Conversion per unit = 60M / 120 = 500,000
      // WIP conversion = (50 * 0.4) * 500,000 = 20 * 500,000 = 10,000,000
      // Total WIP = 50M + 10M = 60,000,000
      // Total Z = 210M - 60M = 150,000,000
      // Unit cost z = 150M / 100 = 1,500,000
      const input: ManufacturingCostInput = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 150_000_000,
        actualDirectLabor: 40_000_000,
        actualOverhead: 20_000_000,
        normalDirectMaterial: 150_000_000,
        normalDirectLabor: 40_000_000,
        finishedUnits: 100,
        endingWipUnits: 50,
        wipMethod: 'EQUIVALENT_UNITS',
        completionPercentage: 40,
      };

      const result = calculateManufacturingCost(input);

      expect(result.endingWipCost).toBe(60_000_000);
      expect(result.totalCostZ).toBe(150_000_000);
      expect(result.unitCostZ).toBe(1_500_000);
    });
  });

  // =========================================================================
  // 6. Statutory Guardrails & Mathematical Invariants (T1.17 - T1.20)
  // =========================================================================
  describe('6. Statutory Guardrails & Mathematical Invariants', () => {
    it('T1.17: Tra cứu LIFO triggers explicit statutory rejection warning', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 50, unitPrice: 20_000 },
      ];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-05',
          voucherCode: 'PXK-001',
          voucherType: 'PXK',
          description: 'Tra cứu thử LIFO',
          quantity: 20,
        },
      ];

      const result = calculateStockCard('LIFO', initialLots, transactions);

      expect(result.lifoProhibitedWarning).toBe(true);
      expect(result.lifoProhibitedExplanationVi).toBe(LIFO_PROHIBITED_EXPLANATION_VI);
      expect(result.lifoProhibitedExplanationVi).toContain('VAS 02');
      expect(result.lifoProhibitedExplanationVi).toContain('Thông tư 99/2025/TT-BTC');

      // Also verify comparison matrix behavior
      const matrix = generateComparisonMatrix(initialLots, transactions, 5_000_000);
      expect(matrix.rows).toHaveLength(3);
      expect(matrix.executiveInsightsVi.length).toBeGreaterThanOrEqual(1);
    });

    it('T1.18: Negative inventory safeguard rejects outbound when Q_out > Q_available and throws/returns descriptive error', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 50, unitPrice: 20_000 },
      ];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-05',
          voucherCode: 'PXK-001',
          voucherType: 'PXK',
          description: 'Xuất vượt quá tồn',
          quantity: 60, // Request 60 > Available 50
        },
      ];

      // Non-strict mode: flags violation on result and row
      const lenientResult = calculateFifo(initialLots, transactions, { strict: false });
      expect(lenientResult.hasNegativeStock).toBe(true);
      expect(lenientResult.rows[0].isNegativeStock).toBe(true);
      expect(lenientResult.rows[0].explanationVi).toContain('xuất âm');

      // Strict mode: throws NegativeStockError
      expect(() => calculateFifo(initialLots, transactions, { strict: true })).toThrow(
        NegativeStockError
      );
    });

    it('T1.19: Rounding invariant holds: V_dk + sum(V_in) == sum(V_out) + V_ck (+-1 VND)', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 100, unitPrice: 13_333 },
      ];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-05',
          voucherCode: 'PNK-001',
          voucherType: 'PNK',
          description: 'Nhập số lẻ 1',
          quantity: 77,
          unitPrice: 19_876,
        },
        {
          id: 'tx-2',
          date: '2026-01-10',
          voucherCode: 'PXK-001',
          voucherType: 'PXK',
          description: 'Xuất đợt 1',
          quantity: 45,
        },
        {
          id: 'tx-3',
          date: '2026-01-15',
          voucherCode: 'PNK-002',
          voucherType: 'PNK',
          description: 'Nhập số lẻ 2',
          quantity: 123,
          unitPrice: 24_555,
        },
        {
          id: 'tx-4',
          date: '2026-01-20',
          voucherCode: 'PXK-002',
          voucherType: 'PXK',
          description: 'Xuất đợt 2',
          quantity: 110,
        },
      ];

      for (const method of ['FIFO', 'PERIODIC_WEIGHTED_AVERAGE', 'MOVING_WEIGHTED_AVERAGE'] as const) {
        const result = calculateStockCard(method, initialLots, transactions);
        expect(result.isConserved).toBe(true);
        const totalIn = 100 * 13_333 + 77 * 19_876 + 123 * 24_555;
        const totalOutAndEnd = result.totalOutAmount + result.endingBalanceAmount;
        expect(Math.abs(totalIn - totalOutAndEnd)).toBeLessThanOrEqual(1);
      }
    });

    it('T1.20: Zero stock outbound attempt throws zero-stock boundary error', () => {
      const emptyInitialLots: InventoryLot[] = [];
      const transactions: StockTransaction[] = [
        {
          id: 'tx-1',
          date: '2026-01-02',
          voucherCode: 'PXK-001',
          voucherType: 'PXK',
          description: 'Xuất kho khi chưa có hàng',
          quantity: 10,
        },
      ];

      // Non-strict mode: flags negative stock
      const lenientResult = calculateFifo(emptyInitialLots, transactions, { strict: false });
      expect(lenientResult.hasNegativeStock).toBe(true);
      expect(lenientResult.rows[0].isNegativeStock).toBe(true);

      // Strict mode: throws ZeroStockBoundaryError
      expect(() => calculateFifo(emptyInitialLots, transactions, { strict: true })).toThrow(
        ZeroStockBoundaryError
      );
    });
  });
});
