import { describe, it, expect } from 'vitest';
import {
  calculateFifo,
  calculatePeriodicWeightedAverage,
  calculateMovingWeightedAverage,
  calculateStockCard,
  calculateManufacturingCost,
  NegativeStockError,
  ZeroStockBoundaryError,
  LIFO_PROHIBITED_EXPLANATION_VI,
} from '../../src/engine/cogs-engine';
import {
  InventoryLot,
  StockTransaction,
  CostingMethod,
} from '../../src/types/cogs';

/**
 * ============================================================================
 * ADVERSARIAL STRESS TEST SUITE: INVENTORY VALUATION & INVARIANTS
 * Milestone 1 — Empirical Verification Harness
 * Challenger: challenger_m1_1
 * ============================================================================
 */

describe('CHALLENGER M1: Empirical Stress Testing & Permutation Invariants (cogs-engine.ts)', () => {
  // =========================================================================
  // Challenge 1: Multi-lot FIFO with 10+ lots and interleaved receipts & dispatches
  // =========================================================================
  describe('Challenge 1: Multi-Lot FIFO (12 Lots Interleaved Flow)', () => {
    it('accurately tracks 3 initial lots + 10 receipt lots with 8 interleaved multi-lot dispatches', () => {
      // 3 initial lots with ascending acquisition prices
      const initialLots: InventoryLot[] = [
        { id: 'init-1', date: '2026-01-01', quantity: 20, unitPrice: 10_000, voucherCode: 'DK-01' },
        { id: 'init-2', date: '2026-01-02', quantity: 30, unitPrice: 12_000, voucherCode: 'DK-02' },
        { id: 'init-3', date: '2026-01-03', quantity: 50, unitPrice: 15_000, voucherCode: 'DK-03' },
      ];
      // Total initial: 100 units, amount = 20*10k + 30*12k + 50*15k = 200k + 360k + 750k = 1,310,000 VND

      // 10 distinct receipt transactions (PNK) interleaved with 8 dispatches (PXK)
      const transactions: StockTransaction[] = [
        // Tx 1: PNK-01 (+40 @ 16,000) -> total in: 40, amount: 640,000
        { id: 'tx-1', date: '2026-01-04', voucherCode: 'PNK-01', voucherType: 'PNK', quantity: 40, unitPrice: 16_000, description: 'Nhập đợt 1' },
        // Tx 2: PXK-01 (-35 units)
        // Depletes: 20 from init-1 (@10k = 200k), 15 from init-2 (@12k = 180k) -> outAmount = 380,000
        { id: 'tx-2', date: '2026-01-05', voucherCode: 'PXK-01', voucherType: 'PXK', quantity: 35, description: 'Xuất đợt 1' },
        // Tx 3: PNK-02 (+25 @ 18,000) -> 450,000
        { id: 'tx-3', date: '2026-01-06', voucherCode: 'PNK-02', voucherType: 'PNK', quantity: 25, unitPrice: 18_000, description: 'Nhập đợt 2' },
        // Tx 4: PNK-03 (+35 @ 20,000) -> 700,000
        { id: 'tx-4', date: '2026-01-07', voucherCode: 'PNK-03', voucherType: 'PNK', quantity: 35, unitPrice: 20_000, description: 'Nhập đợt 3' },
        // Tx 5: PXK-02 (-65 units)
        // Remaining in init-2: 15 (@12k = 180k)
        // init-3: 50 (@15k = 750k)
        // Sum needed = 65 -> takes all 15 init-2 + all 50 init-3!
        // outAmount = 180k + 750k = 930,000
        { id: 'tx-5', date: '2026-01-08', voucherCode: 'PXK-02', voucherType: 'PXK', quantity: 65, description: 'Xuất đợt 2: cạn sạch lot đầu kỳ' },
        // Tx 6: PNK-04 (+50 @ 21,000) -> 1,050,000
        { id: 'tx-6', date: '2026-01-09', voucherCode: 'PNK-04', voucherType: 'PNK', quantity: 50, unitPrice: 21_000, description: 'Nhập đợt 4' },
        // Tx 7: PNK-05 (+30 @ 23,000) -> 690,000
        { id: 'tx-7', date: '2026-01-10', voucherCode: 'PNK-05', voucherType: 'PNK', quantity: 30, unitPrice: 23_000, description: 'Nhập đợt 5' },
        // Tx 8: PXK-03 (-50 units)
        // Current active: PNK-01 (40 @16k = 640k), PNK-02 (25 @18k -> take 10 @18k = 180k)
        // outAmount = 640k + 180k = 820,000
        { id: 'tx-8', date: '2026-01-11', voucherCode: 'PXK-03', voucherType: 'PXK', quantity: 50, description: 'Xuất đợt 3' },
        // Tx 9: PNK-06 (+45 @ 25,000) -> 1,125,000
        { id: 'tx-9', date: '2026-01-12', voucherCode: 'PNK-06', voucherType: 'PNK', quantity: 45, unitPrice: 25_000, description: 'Nhập đợt 6' },
        // Tx 10: PXK-04 (-20 units)
        // Remaining in PNK-02: 15 (@18k = 270k)
        // Next: PNK-03 (35 @20k -> take 5 @20k = 100k)
        // outAmount = 270k + 100k = 370,000
        { id: 'tx-10', date: '2026-01-13', voucherCode: 'PXK-04', voucherType: 'PXK', quantity: 20, description: 'Xuất đợt 4' },
        // Tx 11: PNK-07 (+60 @ 28,000) -> 1,680,000
        { id: 'tx-11', date: '2026-01-14', voucherCode: 'PNK-07', voucherType: 'PNK', quantity: 60, unitPrice: 28_000, description: 'Nhập đợt 7' },
        // Tx 12: PNK-08 (+40 @ 30,000) -> 1,200,000
        { id: 'tx-12', date: '2026-01-15', voucherCode: 'PNK-08', voucherType: 'PNK', quantity: 40, unitPrice: 30_000, description: 'Nhập đợt 8' },
        // Tx 13: PXK-05 (-70 units)
        // Remaining in PNK-03: 30 (@20k = 600k)
        // Next in PNK-04: 50 -> take 40 (@21k = 840k)
        // outAmount = 600k + 840k = 1,440,000
        { id: 'tx-13', date: '2026-01-16', voucherCode: 'PXK-05', voucherType: 'PXK', quantity: 70, description: 'Xuất đợt 5' },
        // Tx 14: PNK-09 (+30 @ 32,000) -> 960,000
        { id: 'tx-14', date: '2026-01-17', voucherCode: 'PNK-09', voucherType: 'PNK', quantity: 30, unitPrice: 32_000, description: 'Nhập đợt 9' },
        // Tx 15: PXK-06 (-40 units)
        // Remaining in PNK-04: 10 (@21k = 210k)
        // Next in PNK-05: 30 (@23k = 690k)
        // Sum = 10 + 30 = 40 units! Exactly exhausts both PNK-04 and PNK-05!
        // outAmount = 210k + 690k = 900,000
        { id: 'tx-15', date: '2026-01-18', voucherCode: 'PXK-06', voucherType: 'PXK', quantity: 40, description: 'Xuất đợt 6: cạn 2 tầng giá' },
        // Tx 16: PNK-10 (+50 @ 35,000) -> 1,750,000
        { id: 'tx-16', date: '2026-01-19', voucherCode: 'PNK-10', voucherType: 'PNK', quantity: 50, unitPrice: 35_000, description: 'Nhập đợt 10' },
        // Tx 17: PXK-07 (-55 units)
        // Active: PNK-06 (45 @25k = 1,125,000), PNK-07 (60 -> take 10 @28k = 280k)
        // outAmount = 1,125,000 + 280,000 = 1,405,000
        { id: 'tx-17', date: '2026-01-20', voucherCode: 'PXK-07', voucherType: 'PXK', quantity: 55, description: 'Xuất đợt 7' },
        // Tx 18: PXK-08 (-30 units)
        // Remaining in PNK-07: 50 -> take 30 (@28k = 840,000)
        // outAmount = 840,000
        { id: 'tx-18', date: '2026-01-21', voucherCode: 'PXK-08', voucherType: 'PXK', quantity: 30, description: 'Xuất đợt 8' },
      ];

      const result = calculateFifo(initialLots, transactions);

      // 1. Verify row count
      expect(result.rows).toHaveLength(18);
      expect(result.hasNegativeStock).toBe(false);

      // 2. Verify specific calculated outAmounts
      const rowPxk1 = result.rows.find((r) => r.voucherCode === 'PXK-01')!;
      expect(rowPxk1.outAmount).toBe(380_000);
      expect(rowPxk1.explanationVi).toContain('20 sp @ 10.000đ');
      expect(rowPxk1.explanationVi).toContain('15 sp @ 12.000đ');

      const rowPxk2 = result.rows.find((r) => r.voucherCode === 'PXK-02')!;
      expect(rowPxk2.outAmount).toBe(930_000);
      expect(rowPxk2.explanationVi).toContain('15 sp @ 12.000đ');
      expect(rowPxk2.explanationVi).toContain('50 sp @ 15.000đ');

      const rowPxk3 = result.rows.find((r) => r.voucherCode === 'PXK-03')!;
      expect(rowPxk3.outAmount).toBe(820_000);

      const rowPxk4 = result.rows.find((r) => r.voucherCode === 'PXK-04')!;
      expect(rowPxk4.outAmount).toBe(370_000);

      const rowPxk5 = result.rows.find((r) => r.voucherCode === 'PXK-05')!;
      expect(rowPxk5.outAmount).toBe(1_440_000);

      const rowPxk6 = result.rows.find((r) => r.voucherCode === 'PXK-06')!;
      expect(rowPxk6.outAmount).toBe(900_000);

      const rowPxk7 = result.rows.find((r) => r.voucherCode === 'PXK-07')!;
      expect(rowPxk7.outAmount).toBe(1_405_000);

      const rowPxk8 = result.rows.find((r) => r.voucherCode === 'PXK-08')!;
      expect(rowPxk8.outAmount).toBe(840_000);

      // 3. Expected ending lots:
      // PNK-07: 60 total - 10 (tx-17) - 30 (tx-18) = 20 remaining @ 28,000 = 560,000
      // PNK-08: 40 remaining @ 30,000 = 1,200,000
      // PNK-09: 30 remaining @ 32,000 = 960,000
      // PNK-10: 50 remaining @ 35,000 = 1,750,000
      // Ending qty: 20 + 40 + 30 + 50 = 140 units.
      // Ending amount: 560k + 1,200k + 960k + 1,750k = 4,470,000 VND.

      expect(result.endingBalanceQty).toBe(140);
      expect(result.endingBalanceAmount).toBe(4_470_000);

      // 4. Invariant conservation: Total Inflow === Total Outflow + Ending Inventory
      const totalInitialAmount = 1_310_000;
      const totalInAmount = 640_000 + 450_000 + 700_000 + 1_050_000 + 690_000 + 1_125_000 + 1_680_000 + 1_200_000 + 960_000 + 1_750_000; // 10,245,000
      expect(result.totalInAmount).toBe(totalInAmount);

      const expectedTotalOut = 380_000 + 930_000 + 820_000 + 370_000 + 1_440_000 + 900_000 + 1_405_000 + 840_000; // 7,085,000
      expect(result.totalOutAmount).toBe(expectedTotalOut);

      expect(totalInitialAmount + totalInAmount).toBe(result.totalOutAmount + result.endingBalanceAmount);
      expect(result.isConserved).toBe(true);
      expect(result.roundingDiff).toBe(0);
    });
  });

  // =========================================================================
  // Challenge 2: Moving Weighted Average (Same Date & Subsequent Dates)
  // =========================================================================
  describe('Challenge 2: Moving Weighted Average (Same and Subsequent Dates)', () => {
    it('accurately recalculates unit rate immediately upon multiple receipts on the SAME date before dispatch', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-0', date: '2026-03-01', quantity: 20, unitPrice: 10_000 }, // 200,000
      ];

      // Two receipts on the SAME date (2026-03-01) followed by an outbound on that same date
      const transactions: StockTransaction[] = [
        { id: 'tx-1', date: '2026-03-01', voucherCode: 'PNK-01', voucherType: 'PNK', quantity: 30, unitPrice: 15_000, description: 'Nhập cùng ngày 1' }, // +450,000 => 50 sp, 650,000đ (rate 13,000)
        { id: 'tx-2', date: '2026-03-01', voucherCode: 'PNK-02', voucherType: 'PNK', quantity: 50, unitPrice: 20_000, description: 'Nhập cùng ngày 2' }, // +1,000,000 => 100 sp, 1,650,000đ (rate 16,500)
        { id: 'tx-3', date: '2026-03-01', voucherCode: 'PXK-01', voucherType: 'PXK', quantity: 40, description: 'Xuất cùng ngày' }, // 40 sp @ 16,500 = 660,000 => 60 sp, 990,000đ
      ];

      const result = calculateMovingWeightedAverage(initialLots, transactions);

      expect(result.rows).toHaveLength(3);
      const row3 = result.rows[2];
      expect(row3.outQty).toBe(40);
      expect(row3.outPrice).toBe(16_500);
      expect(row3.outAmount).toBe(660_000);
      expect(row3.balanceQty).toBe(60);
      expect(row3.balanceAmount).toBe(990_000);
      expect(result.endingBalanceQty).toBe(60);
      expect(result.endingBalanceAmount).toBe(990_000);
      expect(result.isConserved).toBe(true);
    });

    it('interleaves same-date and subsequent-date receipts with dynamic rate adjustments', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-0', date: '2026-03-01', quantity: 50, unitPrice: 20_000 }, // 1,000,000
      ];

      const transactions: StockTransaction[] = [
        // Same date receipt
        { id: 'tx-1', date: '2026-03-01', voucherCode: 'PNK-1', voucherType: 'PNK', quantity: 50, unitPrice: 30_000, description: 'Nhập ngày 01' }, // 100 sp, 2,500,000đ => rate 25,000
        // Same date dispatch
        { id: 'tx-2', date: '2026-03-01', voucherCode: 'PXK-1', voucherType: 'PXK', quantity: 60, description: 'Xuất ngày 01' }, // 60 @ 25k = 1,500,000 => balance 40 sp, 1,000,000đ
        // Subsequent date receipt 1
        { id: 'tx-3', date: '2026-03-05', voucherCode: 'PNK-2', voucherType: 'PNK', quantity: 60, unitPrice: 15_000, description: 'Nhập ngày 05' }, // +900,000 => 100 sp, 1,900,000đ => rate 19,000
        // Subsequent date dispatch 1
        { id: 'tx-4', date: '2026-03-06', voucherCode: 'PXK-2', voucherType: 'PXK', quantity: 50, description: 'Xuất ngày 06' }, // 50 @ 19k = 950,000 => balance 50 sp, 950,000đ
        // Subsequent date receipt 2 (same date as dispatch 2)
        { id: 'tx-5', date: '2026-03-10', voucherCode: 'PNK-3', voucherType: 'PNK', quantity: 50, unitPrice: 25_000, description: 'Nhập ngày 10' }, // +1,250,000 => 100 sp, 2,200,000đ => rate 22,000
        // Subsequent date dispatch 2
        { id: 'tx-6', date: '2026-03-10', voucherCode: 'PXK-3', voucherType: 'PXK', quantity: 100, description: 'Xuất ngày 10 cạn kho' }, // 100 @ 22k = 2,200,000 => balance 0 sp, 0đ (exhausted!)
      ];

      const result = calculateMovingWeightedAverage(initialLots, transactions);

      expect(result.rows).toHaveLength(6);
      expect(result.rows[1].outPrice).toBe(25_000);
      expect(result.rows[1].outAmount).toBe(1_500_000);

      expect(result.rows[3].outPrice).toBe(19_000);
      expect(result.rows[3].outAmount).toBe(950_000);

      expect(result.rows[5].outPrice).toBe(22_000);
      expect(result.rows[5].outAmount).toBe(2_200_000);
      expect(result.rows[5].balanceQty).toBe(0);
      expect(result.rows[5].balanceAmount).toBe(0);

      expect(result.endingBalanceQty).toBe(0);
      expect(result.endingBalanceAmount).toBe(0);
      expect(result.hasNegativeStock).toBe(false);
      expect(result.isConserved).toBe(true);
    });
  });

  // =========================================================================
  // Challenge 3: Boundary Test — Outbound exactly equal to available stock (Exhaustion to zero)
  // =========================================================================
  describe('Challenge 3: Boundary Test (Outbound Exactly Equal to Available Stock)', () => {
    it('FIFO: single outbound exactly equal to available stock depletes stock to exactly 0 qty and 0 amount', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 40, unitPrice: 15_000 },
      ];
      const transactions: StockTransaction[] = [
        { id: 'tx-1', date: '2026-01-02', voucherCode: 'PNK-1', voucherType: 'PNK', quantity: 60, unitPrice: 25_000, description: 'Nhập mua đợt 1' },
        // Total available: 100 units (40 @ 15k = 600k, 60 @ 25k = 1.5M -> total 2.1M)
        { id: 'tx-2', date: '2026-01-03', voucherCode: 'PXK-1', voucherType: 'PXK', quantity: 100, description: 'Xuất hết 100 sp' },
      ];

      const result = calculateFifo(initialLots, transactions, { strict: true });

      expect(result.endingBalanceQty).toBe(0);
      expect(result.endingBalanceAmount).toBe(0);
      expect(result.totalOutQty).toBe(100);
      expect(result.totalOutAmount).toBe(2_100_000);
      expect(result.hasNegativeStock).toBe(false);
      expect(result.isConserved).toBe(true);
    });

    it('Moving WAC: single outbound exactly equal to available stock depletes stock to exactly 0 qty and 0 amount', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 17, unitPrice: 11_333 }, // 192,661
      ];
      const transactions: StockTransaction[] = [
        { id: 'tx-1', date: '2026-01-02', voucherCode: 'PNK-1', voucherType: 'PNK', quantity: 23, unitPrice: 17_777, description: 'Nhập đợt 1' }, // 408,871
        // Available: 40 units, total amount = 601,532
        { id: 'tx-2', date: '2026-01-03', voucherCode: 'PXK-1', voucherType: 'PXK', quantity: 40, description: 'Xuất đúng 40 sp' },
      ];

      const result = calculateMovingWeightedAverage(initialLots, transactions, { strict: true });

      expect(result.endingBalanceQty).toBe(0);
      expect(result.endingBalanceAmount).toBe(0);
      expect(result.totalOutQty).toBe(40);
      expect(result.totalOutAmount).toBe(601_532);
      expect(result.hasNegativeStock).toBe(false);
      expect(result.isConserved).toBe(true);
    });

    it('Periodic WAC: single outbound exactly equal to available stock yields 0 qty and 0 amount', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 30, unitPrice: 20_000 },
      ];
      const transactions: StockTransaction[] = [
        { id: 'tx-1', date: '2026-01-02', voucherCode: 'PNK-1', voucherType: 'PNK', quantity: 70, unitPrice: 30_000, description: 'Nhập lô hàng B' },
        // Total available: 100 units, 2,700,000 VND
        { id: 'tx-2', date: '2026-01-03', voucherCode: 'PXK-1', voucherType: 'PXK', quantity: 100, description: 'Xuất toàn bộ kỳ' },
      ];

      const result = calculatePeriodicWeightedAverage(initialLots, transactions, { strict: true });

      expect(result.endingBalanceQty).toBe(0);
      expect(result.endingBalanceAmount).toBe(0);
      expect(result.totalOutQty).toBe(100);
      expect(result.totalOutAmount).toBe(2_700_000);
      expect(result.hasNegativeStock).toBe(false);
      expect(result.isConserved).toBe(true);
    });

    it('FIFO: multiple fragmented outbounds that cumulatively exhaust stock to 0 preserves conservation', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 30, unitPrice: 10_000 },
        { id: 'lot-2', date: '2026-01-01', quantity: 30, unitPrice: 20_000 },
      ];
      // Total 60 units. Deplete in chunks of 10, 15, 20, 15 (sum = 60)
      const transactions: StockTransaction[] = [
        { id: 'tx-1', date: '2026-01-02', voucherCode: 'PXK-1', voucherType: 'PXK', quantity: 10, description: 'Xuất phần 1' },
        { id: 'tx-2', date: '2026-01-03', voucherCode: 'PXK-2', voucherType: 'PXK', quantity: 15, description: 'Xuất phần 2' },
        { id: 'tx-3', date: '2026-01-04', voucherCode: 'PXK-3', voucherType: 'PXK', quantity: 20, description: 'Xuất phần 3' },
        { id: 'tx-4', date: '2026-01-05', voucherCode: 'PXK-4', voucherType: 'PXK', quantity: 15, description: 'Xuất vét kho' },
      ];

      const result = calculateFifo(initialLots, transactions, { strict: true });

      expect(result.endingBalanceQty).toBe(0);
      expect(result.endingBalanceAmount).toBe(0);
      expect(result.totalOutQty).toBe(60);
      expect(result.hasNegativeStock).toBe(false);
      expect(result.isConserved).toBe(true);
    });
  });

  // =========================================================================
  // Challenge 4: Boundary Test — Outbound exceeding stock by 1 unit
  // =========================================================================
  describe('Challenge 4: Boundary Test (Outbound Exceeding Available Stock by 1 Unit)', () => {
    it('non-strict mode: detects negative stock flag on row and result when outQty = available + 1', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 50, unitPrice: 20_000 },
      ];
      const transactions: StockTransaction[] = [
        // Available: 50. Outbound: 51 (+1 unit deficit)
        { id: 'tx-1', date: '2026-01-02', voucherCode: 'PXK-01', voucherType: 'PXK', quantity: 51, description: 'Xuất lố 1 đơn vị' },
      ];

      for (const method of ['FIFO', 'MOVING_WEIGHTED_AVERAGE', 'PERIODIC_WEIGHTED_AVERAGE'] as CostingMethod[]) {
        const result = calculateStockCard(method, initialLots, transactions);

        expect(result.hasNegativeStock).toBe(true);
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].isNegativeStock).toBe(true);
        expect(result.rows[0].balanceQty).toBe(-1);
        expect(result.endingBalanceQty).toBe(-1);
        expect(result.rows[0].explanationVi).toMatch(/âm kho|vượt quá/i);
      }
    });

    it('strict mode: throws NegativeStockError when outQty exceeds available stock by 1 unit', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 50, unitPrice: 20_000 },
      ];
      const transactions: StockTransaction[] = [
        { id: 'tx-1', date: '2026-01-02', voucherCode: 'PXK-01', voucherType: 'PXK', quantity: 51, description: 'Xuất vượt quá 1 sp' },
      ];

      for (const method of ['FIFO', 'MOVING_WEIGHTED_AVERAGE', 'PERIODIC_WEIGHTED_AVERAGE'] as CostingMethod[]) {
        expect(() =>
          calculateStockCard(method, initialLots, transactions, { strict: true })
        ).toThrow(NegativeStockError);
      }
    });

    it('strict mode: throws ZeroStockBoundaryError when available stock is 0 and outQty is 1 unit', () => {
      const initialLots: InventoryLot[] = []; // Zero stock
      const transactions: StockTransaction[] = [
        { id: 'tx-1', date: '2026-01-02', voucherCode: 'PXK-01', voucherType: 'PXK', quantity: 1, description: 'Xuất khi kho rỗng' },
      ];

      for (const method of ['FIFO', 'MOVING_WEIGHTED_AVERAGE', 'PERIODIC_WEIGHTED_AVERAGE'] as CostingMethod[]) {
        expect(() =>
          calculateStockCard(method, initialLots, transactions, { strict: true })
        ).toThrow(ZeroStockBoundaryError);
      }
    });

    it('non-strict mode: flags negative stock when available stock is 0 and outQty is 1 unit', () => {
      const initialLots: InventoryLot[] = [];
      const transactions: StockTransaction[] = [
        { id: 'tx-1', date: '2026-01-02', voucherCode: 'PXK-01', voucherType: 'PXK', quantity: 1, description: 'Xuất kho rỗng không nghiêm ngặt' },
      ];

      const result = calculateFifo(initialLots, transactions);
      expect(result.hasNegativeStock).toBe(true);
      expect(result.rows[0].isNegativeStock).toBe(true);
      expect(result.rows[0].balanceQty).toBe(-1);
      expect(result.rows[0].explanationVi).toMatch(/Tồn kho bằng 0/i);
    });
  });

  // =========================================================================
  // Challenge 5: Mathematical Invariant — Conservation across 100 Random Permutations
  // =========================================================================
  describe('Challenge 5: Mathematical Invariant (+-1 VND Conservation across 100 Random Permutations)', () => {
    // Simple Mulberry32 deterministic PRNG for reproducible test vectors
    function mulberry32(seed: number) {
      return function () {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    it('satisfies conservation invariant: initialAmount + sum(inAmount) === sum(outAmount) + endingAmount (+-1 VND) across 100 randomized streams', () => {
      const rng = mulberry32(20260920);

      const methods: CostingMethod[] = ['FIFO', 'MOVING_WEIGHTED_AVERAGE', 'PERIODIC_WEIGHTED_AVERAGE'];

      let totalRuns = 0;
      let conservedCount = 0;

      for (let run = 0; run < 100; run++) {
        // 1. Generate 1 to 4 random initial lots
        const numInitialLots = 1 + Math.floor(rng() * 4);
        const initialLots: InventoryLot[] = [];
        let stockLevel = 0;
        let expectedInitialAmount = 0;

        for (let i = 0; i < numInitialLots; i++) {
          const qty = 10 + Math.floor(rng() * 100);
          const price = 5_000 + Math.floor(rng() * 45_000);
          stockLevel += qty;
          expectedInitialAmount += qty * price;
          initialLots.push({
            id: `init-lot-${run}-${i}`,
            date: '2026-01-01',
            voucherCode: `DK-${i}`,
            quantity: qty,
            unitPrice: price,
          });
        }

        // 2. Generate 10 to 25 randomized transactions
        const numTx = 10 + Math.floor(rng() * 16);
        const transactions: StockTransaction[] = [];

        for (let t = 0; t < numTx; t++) {
          const isReceipt = stockLevel <= 5 || rng() > 0.55;
          const day = 2 + Math.floor(t / 2);
          const dateStr = `2026-01-${day < 10 ? '0' + day : day}`;

          if (isReceipt) {
            const inQty = 10 + Math.floor(rng() * 80);
            const inPrice = 6_000 + Math.floor(rng() * 50_000);
            stockLevel += inQty;
            transactions.push({
              id: `tx-${run}-${t}`,
              date: dateStr,
              voucherCode: `PNK-${t}`,
              voucherType: 'PNK',
              quantity: inQty,
              unitPrice: inPrice,
              description: `Nhập lô random ${t}`,
            });
          } else {
            // Outbound: dispatch between 1 and min(stockLevel, 60)
            const maxOut = Math.max(1, Math.min(stockLevel, 60));
            const outQty = 1 + Math.floor(rng() * maxOut);
            stockLevel -= outQty;
            transactions.push({
              id: `tx-${run}-${t}`,
              date: dateStr,
              voucherCode: `PXK-${t}`,
              voucherType: 'PXK',
              quantity: outQty,
              description: `Xuất bán random ${t}`,
            });
          }
        }

        // 3. Test the generated transaction stream against all 3 statutory costing methods
        for (const method of methods) {
          totalRuns++;
          const result = calculateStockCard(method, initialLots, transactions);

          // Invariant Check 1: result.isConserved must be true
          expect(result.isConserved).toBe(true);

          // Invariant Check 2: roundingDiff within +-1 VND
          expect(Math.abs(result.roundingDiff)).toBeLessThanOrEqual(1);

          // Invariant Check 3: Mathematical equality
          // V_dk + sum(V_in) === sum(V_out) + V_ck (with rounding diff absorbed)
          const totalInflow = expectedInitialAmount + result.totalInAmount;
          const totalOutflowAndEnding = result.totalOutAmount + result.endingBalanceAmount;
          expect(Math.abs(totalInflow - totalOutflowAndEnding)).toBeLessThanOrEqual(1);

          // Invariant Check 4: Row-level sum consistency
          const rowSumOutAmount = result.rows.reduce((sum, r) => sum + r.outAmount, 0);
          expect(rowSumOutAmount).toBe(result.totalOutAmount);

          const rowSumInAmount = result.rows.reduce((sum, r) => sum + r.inAmount, 0);
          expect(rowSumInAmount).toBe(result.totalInAmount);

          // Invariant Check 5: Quantity conservation (Exact integer identity)
          const totalInitialQty = initialLots.reduce((s, l) => s + l.quantity, 0);
          const rowSumInQty = result.rows.reduce((sum, r) => sum + r.inQty, 0);
          const rowSumOutQty = result.rows.reduce((sum, r) => sum + r.outQty, 0);
          expect(totalInitialQty + rowSumInQty).toBe(rowSumOutQty + result.endingBalanceQty);
          expect(result.totalInQty).toBe(rowSumInQty);
          expect(result.totalOutQty).toBe(rowSumOutQty);

          conservedCount++;
        }
      }

      expect(totalRuns).toBe(300); // 100 iterations * 3 methods
      expect(conservedCount).toBe(300); // 100% compliance
    });
  });

  // =========================================================================
  // Additional Statutory & Security Challenges
  // =========================================================================
  describe('Statutory & Security Challenges', () => {
    it('LIFO request explicitly flags statutory prohibition citing VAS 02, TT 200/133/99, and IAS 2', () => {
      const initialLots: InventoryLot[] = [
        { id: 'lot-1', date: '2026-01-01', quantity: 10, unitPrice: 20_000 },
      ];
      const transactions: StockTransaction[] = [
        { id: 'tx-1', date: '2026-01-02', voucherCode: 'PXK-1', voucherType: 'PXK', quantity: 5, description: 'Xuất hàng LIFO kiểm toán' },
      ];

      const result = calculateStockCard('LIFO', initialLots, transactions);
      expect(result.lifoProhibitedWarning).toBe(true);
      expect(result.lifoProhibitedExplanationVi).toBe(LIFO_PROHIBITED_EXPLANATION_VI);
      expect(result.lifoProhibitedExplanationVi).toContain('VAS 02');
      expect(result.lifoProhibitedExplanationVi).toContain('Thông tư 200/2014/TT-BTC');
      expect(result.lifoProhibitedExplanationVi).toContain('Thông tư 133/2016/TT-BTC');
      expect(result.lifoProhibitedExplanationVi).toContain('Thông tư 99/2025/TT-BTC');
      expect(result.lifoProhibitedExplanationVi).toContain('IAS 2');
    });
  });

  // =========================================================================
  // Challenge 7: Circular 133 TK 154 Double-Entry Equilibrium & Zero-Norm Stress Matrix
  // =========================================================================
  describe('Challenge 7: Circular 133 TK 154 Double-Entry Equilibrium & Zero-Norm Stress Matrix', () => {
    it('guarantees Account 154 Debits === Credits under Circular 133 across permutations of normal/abnormal waste', () => {
      const permutations = [
        { mat: 100_000, lab: 50_000, ovh: 20_000, normMat: 100_000, normLab: 50_000 }, // 0% abnormal
        { mat: 100_000, lab: 50_000, ovh: 20_000, normMat: 80_000, normLab: 40_000 },  // partial abnormal
        { mat: 100_000, lab: 50_000, ovh: 20_000, normMat: 0, normLab: 0 },            // 100% abnormal mat & lab
        { mat: 100_000, lab: 50_000, ovh: 20_000, normMat: 0, normLab: 50_000 },       // 100% abnormal mat only
        { mat: 100_000, lab: 50_000, ovh: 20_000, normMat: 100_000, normLab: 0 },       // 100% abnormal lab only
        { mat: 100_000, lab: 0, ovh: 0, normMat: 0, normLab: 0 },                      // single expense 100% abnormal
      ];

      for (const p of permutations) {
        const result = calculateManufacturingCost({
          regime: 'CIRCULAR_133',
          beginningWip: 0,
          actualDirectMaterial: p.mat,
          actualDirectLabor: p.lab,
          actualOverhead: p.ovh,
          normalDirectMaterial: p.normMat,
          normalDirectLabor: p.normLab,
          finishedUnits: 10,
          endingWipUnits: 0,
          wipMethod: 'DIRECT_MATERIAL',
        });

        const debits154 = result.journalEntries
          .filter((e) => e.debitAccount === '154')
          .reduce((s, e) => s + e.amount, 0);
        const credits154 = result.journalEntries
          .filter((e) => e.creditAccount === '154')
          .reduce((s, e) => s + e.amount, 0);

        expect(debits154).toBe(p.mat + p.lab + p.ovh);
        expect(credits154).toBe(debits154);
      }
    });

    it('correctly handles zero-norm direct labor: 100% abnormal labor cost routed to 632 and Schedule B4', () => {
      const result = calculateManufacturingCost({
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 0,
        actualDirectLabor: 40_000_000,
        actualOverhead: 0,
        normalDirectMaterial: 0,
        normalDirectLabor: 0,
        finishedUnits: 0,
        endingWipUnits: 0,
        wipMethod: 'DIRECT_MATERIAL',
      });

      expect(result.normalLaborCost).toBe(0);
      expect(result.abnormalLaborCost).toBe(40_000_000);
      expect(result.cogsDirectExpense).toBe(40_000_000);
      expect(result.scheduleB4Amount).toBe(40_000_000);
      expect(result.citTaxImpact).toBe(8_000_000);
    });
  });
});
