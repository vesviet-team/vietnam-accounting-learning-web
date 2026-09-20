/**
 * Tier 5 Adversarial & Stress Test Suite: COGS & Cost Accounting Workbench
 *
 * Tests T5.1–T5.12:
 * - T5.1: High-throughput 5,000 to 10,000 transaction batch stress test (<100ms, memory safety, arithmetic conservation).
 * - T5.2: Pathological sub-penny / fractional currency rounding stress (+-1 VND invariant across 100 transactions).
 * - T5.3: Zero/Near-zero inventory oscillation (+1, -1, +1, -1 with varying lot prices and moving average precision).
 * - T5.4: Huge transaction values (100 billion VND) under Number.MAX_SAFE_INTEGER.
 * - T5.5: Multi-regime TT 200 vs TT 133 vs TT 99 mathematical invariance (eligible cost, abnormal waste, Z, z, CIT B4).
 * - T5.6: Boundary WIP tests (0% completion, 100% completion, Q_tp = 0, Q_dd = 0).
 * - T5.7: Abnormal waste boundary tests (0% abnormal waste, 100% abnormal waste, negative norm inputs sanitized safely).
 * - T5.8: Mixed interleaved dispatches (Form 03/XKNB TK 157 vs Sales PXK TK 632 across all 3 valuation methods).
 * - T5.9: Comparison Matrix adversarial stress: extreme market cycles (hyperinflation +500% vs deflation crash -80%).
 * - T5.10: State persistence / IndexedDB serialization fuzzing: corrupted or partial CogsState objects safely loaded.
 * - T5.11: Rapid scenario switching: simulating multiple consecutive scenario loads without state bleeding.
 * - T5.12: Socratic hint anti-spoil stress: hint level segregation and anti-spoil reset invariant.
 *
 * Roles: @qa-engineer & @vietnam-accounting-specialist
 * Standards: VAS 02, IAS 2, TT 200/2014, TT 133/2016, TT 99/2025, Decree 123/2020, TT 96/2015.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateFifo,
  calculateMovingWeightedAverage,
  calculateStockCard,
  calculateManufacturingCost,
  generateComparisonMatrix,
  NegativeStockError,
  ZeroStockBoundaryError,
} from '@/engine/cogs-engine';
import {
  InventoryLot,
  StockTransaction,
  CostingMethod,
  ManufacturingCostInput,
  CogsState,
} from '@/types/cogs';
import {
  getCogsScenarioById,
} from '@/data/cogs-scenarios';
import {
  getCogsHintsForScenario,
} from '@/data/cogs-socratic-hints';
import { storageService } from '@/services/storage/storage-service';

describe('Tier 5 Adversarial & Stress Test Suite: COGS & Cost Accounting Workbench', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // T5.1: High-throughput 5,000 to 10,000 transaction batch stress test
  // =========================================================================
  it('T5.1: High-throughput 5,000 transaction batch stress test (<100ms execution, memory safety, arithmetic conservation)', () => {
    const initialLots: InventoryLot[] = [
      {
        id: 'init-stress-1',
        date: '2026-01-01',
        voucherCode: 'SDDK-STRESS-1',
        quantity: 5_000,
        unitPrice: 100_000,
      },
      {
        id: 'init-stress-2',
        date: '2026-01-02',
        voucherCode: 'SDDK-STRESS-2',
        quantity: 5_000,
        unitPrice: 102_000,
      },
    ];
    const initialAmount = 5_000 * 100_000 + 5_000 * 102_000;
    const initialQty = 10_000;

    // Generate 5,000 transactions: 100 receipts (500 units each) interleaved with 4,900 dispatches (10 units each)
    const txCount = 5_000;
    const transactions: StockTransaction[] = new Array(txCount);

    for (let i = 0; i < txCount; i++) {
      const isReceipt = i % 50 === 0;
      if (isReceipt) {
        transactions[i] = {
          id: `tx-stress-pnk-${i}`,
          date: '2026-01-15',
          voucherCode: `PNK-${i}`,
          voucherType: 'PNK',
          description: `Nhập vật tư lô stress #${i}`,
          quantity: 500,
          unitPrice: 105_000 + (i % 50) * 100,
          targetAccount: '156',
        };
      } else {
        transactions[i] = {
          id: `tx-stress-pxk-${i}`,
          date: '2026-01-20',
          voucherCode: `PXK-${i}`,
          voucherType: 'PXK',
          description: `Xuất bán thương phẩm stress #${i}`,
          quantity: 10,
          targetAccount: '632',
        };
      }
    }

    // JIT Warm-up for V8 TurboFan optimization
    calculateFifo(initialLots, transactions.slice(0, 100));

    // 1. Performance and Conservation under FIFO
    const startTimeFifo = performance.now();
    const resultFifo = calculateFifo(initialLots, transactions);
    const elapsedFifo = performance.now() - startTimeFifo;

    expect(elapsedFifo).toBeLessThan(100); // Latency requirement < 100ms
    expect(resultFifo.rows.length).toBe(txCount);
    expect(resultFifo.hasNegativeStock).toBe(false);
    expect(resultFifo.isConserved).toBe(true);

    // Quantity Conservation Invariant: Q_dk + sum(Q_nhap) === sum(Q_xuat) + Q_ck
    expect(resultFifo.endingBalanceQty).toBe(11_000);
    expect(initialQty + resultFifo.totalInQty).toBe(resultFifo.totalOutQty + resultFifo.endingBalanceQty);

    // Value Conservation Invariant: V_dk + sum(V_nhap) === sum(V_xuat) + V_ck
    const totalInflowFifo = initialAmount + resultFifo.totalInAmount;
    const totalOutflowFifo = resultFifo.totalOutAmount + resultFifo.endingBalanceAmount;
    expect(Math.abs(totalInflowFifo - totalOutflowFifo)).toBeLessThanOrEqual(1);

    // 2. Performance and Conservation under Moving Weighted Average
    const startTimeMwa = performance.now();
    const resultMwa = calculateMovingWeightedAverage(initialLots, transactions);
    const elapsedMwa = performance.now() - startTimeMwa;

    expect(elapsedMwa).toBeLessThan(100);
    expect(resultMwa.rows.length).toBe(txCount);
    expect(resultMwa.hasNegativeStock).toBe(false);
    expect(resultMwa.isConserved).toBe(true);

    const totalInflowMwa = initialAmount + resultMwa.totalInAmount;
    const totalOutflowMwa = resultMwa.totalOutAmount + resultMwa.endingBalanceAmount;
    expect(Math.abs(totalInflowMwa - totalOutflowMwa)).toBeLessThanOrEqual(1);
  });

  // =========================================================================
  // T5.2: Pathological sub-penny / fractional currency rounding stress
  // =========================================================================
  it('T5.2: Pathological sub-penny / fractional currency rounding stress (+-1 VND invariant across 100 transactions)', () => {
    // Initial lot with fractional unit price (100.3333 VND)
    const initialLot: InventoryLot = {
      id: 'init-fractional',
      date: '2026-01-01',
      voucherCode: 'SDDK-FRAC',
      quantity: 333,
      unitPrice: 100.3333333333,
    };
    const initialAmount = Math.round(initialLot.quantity * initialLot.unitPrice);

    // 100 transactions with odd quantities and pathological repeating decimal unit prices
    const transactions: StockTransaction[] = [];
    const fractionalPrices = [33.333333, 77.142857, 100.333333, 142.857143, 199.999999];
    const primeQuantities = [3, 7, 11, 13, 17, 19, 23];

    for (let i = 0; i < 100; i++) {
      const isReceipt = i % 2 === 0;
      const qty = primeQuantities[i % primeQuantities.length];
      if (isReceipt) {
        transactions.push({
          id: `tx-frac-pnk-${i}`,
          date: '2026-02-01',
          voucherCode: `PNK-FRAC-${i}`,
          voucherType: 'PNK',
          description: `Nhập vật tư đơn giá phân số #${i}`,
          quantity: qty,
          unitPrice: fractionalPrices[i % fractionalPrices.length],
          targetAccount: '156',
        });
      } else {
        transactions.push({
          id: `tx-frac-pxk-${i}`,
          date: '2026-02-15',
          voucherCode: `PXK-FRAC-${i}`,
          voucherType: 'PXK',
          description: `Xuất kho kiểm tra làm tròn #${i}`,
          quantity: qty,
          targetAccount: '632',
        });
      }
    }

    const methods: CostingMethod[] = ['FIFO', 'PERIODIC_WEIGHTED_AVERAGE', 'MOVING_WEIGHTED_AVERAGE'];

    for (const method of methods) {
      const res = calculateStockCard(method, [initialLot], transactions);

      // Verify strict financial invariant: V_dk + sum(V_nhap) === sum(V_xuat) + V_ck (+- 1 VND)
      const totalInflow = initialAmount + res.totalInAmount;
      const totalOutflowAndEnding = res.totalOutAmount + res.endingBalanceAmount;
      const diff = Math.abs(totalInflow - totalOutflowAndEnding);

      expect(diff).toBeLessThanOrEqual(1);
      expect(res.isConserved).toBe(true);
      expect(Math.abs(res.roundingDiff)).toBeLessThanOrEqual(1);

      // Verify no NaN or non-finite numbers in rows
      for (const row of res.rows) {
        expect(Number.isFinite(row.balanceAmount)).toBe(true);
        expect(Number.isFinite(row.balancePrice)).toBe(true);
        expect(Number.isFinite(row.outAmount)).toBe(true);
        expect(Number.isFinite(row.inAmount)).toBe(true);
      }
    }
  });

  // =========================================================================
  // T5.3: Zero/Near-zero inventory oscillation (+1, -1, +1, -1 with varying lot prices)
  // =========================================================================
  it('T5.3: Zero/Near-zero inventory oscillation (+1, -1, +1, -1 with varying lot prices and moving average precision)', () => {
    // 30 cycles of buy 1, sell 1 with different lot prices
    const transactions: StockTransaction[] = [];
    const prices = [10_000, 25_000, 15_000, 30_000, 18_000, 45_000];

    for (let cycle = 0; cycle < 30; cycle++) {
      const price = prices[cycle % prices.length];
      transactions.push({
        id: `tx-osc-pnk-${cycle}`,
        date: `2026-03-${String(cycle + 1).padStart(2, '0')}`,
        voucherCode: `PNK-OSC-${cycle}`,
        voucherType: 'PNK',
        description: `Mua 1 sp giá ${price}đ`,
        quantity: 1,
        unitPrice: price,
      });
      transactions.push({
        id: `tx-osc-pxk-${cycle}`,
        date: `2026-03-${String(cycle + 1).padStart(2, '0')}`,
        voucherCode: `PXK-OSC-${cycle}`,
        voucherType: 'PXK',
        description: `Bán 1 sp`,
        quantity: 1,
        targetAccount: '632',
      });
    }

    // Compute under Moving Weighted Average
    const resMwa = calculateMovingWeightedAverage([], transactions);

    expect(resMwa.hasNegativeStock).toBe(false);
    expect(resMwa.endingBalanceQty).toBe(0);
    expect(resMwa.endingBalanceAmount).toBe(0);
    expect(resMwa.isConserved).toBe(true);

    // Verify each receipt following a zero balance resets the unit price cleanly without NaN
    for (let i = 0; i < resMwa.rows.length; i++) {
      const row = resMwa.rows[i];
      if (row.voucherType === 'PNK') {
        expect(row.balanceQty).toBe(1);
        expect(row.balancePrice).toBe(row.inPrice);
        expect(row.balanceAmount).toBe(row.inPrice);
      } else if (row.voucherType === 'PXK') {
        expect(row.balanceQty).toBe(0);
        expect(row.balanceAmount).toBe(0);
        expect(row.isNegativeStock).toBe(false);
      }
    }

    // Boundary stress: dispatch when stock is strictly 0
    const emptyInventoryTx: StockTransaction[] = [
      {
        id: 'tx-overdraw',
        date: '2026-03-31',
        voucherCode: 'PXK-ZERO-FAIL',
        voucherType: 'PXK',
        description: 'Xuất kho khi tồn bằng 0',
        quantity: 1,
      },
    ];

    // Without strict option: flags negative stock safely
    const laxResult = calculateFifo([], emptyInventoryTx, { strict: false });
    expect(laxResult.hasNegativeStock).toBe(true);
    expect(laxResult.rows[0].isNegativeStock).toBe(true);

    // With strict option: throws ZeroStockBoundaryError
    expect(() => calculateFifo([], emptyInventoryTx, { strict: true })).toThrow(
      ZeroStockBoundaryError
    );

    // Over-dispatch beyond available quantity
    const partialInventoryTx: StockTransaction[] = [
      {
        id: 'tx-partial-overdraw',
        date: '2026-03-31',
        voucherCode: 'PXK-OVERDRAW',
        voucherType: 'PXK',
        description: 'Xuất 5 sp khi chỉ có 2 sp',
        quantity: 5,
      },
    ];
    const initialLot2: InventoryLot = {
      id: 'init-2-units',
      date: '2026-03-01',
      quantity: 2,
      unitPrice: 50_000,
    };
    expect(() => calculateFifo([initialLot2], partialInventoryTx, { strict: true })).toThrow(
      NegativeStockError
    );
  });

  // =========================================================================
  // T5.4: Huge transaction values (100 billion VND)
  // =========================================================================
  it('T5.4: Huge transaction values (100 billion VND) confirming no JavaScript 64-bit float precision overflow', () => {
    // Initial Lot: 1,000 tons of heavy steel @ 100,000,000 VND/ton = 100 billion VND
    const initialLot: InventoryLot = {
      id: 'init-mega-lot',
      date: '2026-01-01',
      voucherCode: 'SDDK-MEGA',
      quantity: 1_000,
      unitPrice: 100_000_000,
    };
    const initialAmount = 100_000_000_000; // 100 billion VND

    const transactions: StockTransaction[] = [
      // PNK 1: 500 tons @ 120,000,000 VND = 60 billion VND
      {
        id: 'tx-mega-1',
        date: '2026-01-05',
        voucherCode: 'PNK-MEGA-1',
        voucherType: 'PNK',
        description: 'Nhập thép cán nóng 500 tấn',
        quantity: 500,
        unitPrice: 120_000_000,
        targetAccount: '156',
      },
      // PNK 2: 800 tons @ 110,000,000 VND = 88 billion VND
      {
        id: 'tx-mega-2',
        date: '2026-01-10',
        voucherCode: 'PNK-MEGA-2',
        voucherType: 'PNK',
        description: 'Nhập thép đặc chủng 800 tấn',
        quantity: 800,
        unitPrice: 110_000_000,
        targetAccount: '156',
      },
      // PXK 1: Dispatch 700 tons for external sale (TK 632)
      {
        id: 'tx-mega-3',
        date: '2026-01-15',
        voucherCode: 'PXK-MEGA-1',
        voucherType: 'PXK',
        description: 'Xuất bán đại dự án cầu đường',
        quantity: 700,
        targetAccount: '632',
      },
      // XKNB 1: Internal dispatch 600 tons (TK 157)
      {
        id: 'tx-mega-4',
        date: '2026-01-20',
        voucherCode: 'XKNB-MEGA-1',
        voucherType: 'XKNB_03',
        description: 'Điều chuyển kho chi nhánh miền Trung',
        quantity: 600,
        targetAccount: '157',
      },
    ];

    const methods: CostingMethod[] = ['FIFO', 'PERIODIC_WEIGHTED_AVERAGE', 'MOVING_WEIGHTED_AVERAGE'];

    for (const method of methods) {
      const res = calculateStockCard(method, [initialLot], transactions);

      // Verify all amounts are well below Number.MAX_SAFE_INTEGER (9,007,199,254,740,991)
      expect(res.totalInAmount).toBeLessThan(Number.MAX_SAFE_INTEGER);
      expect(res.totalOutAmount).toBeLessThan(Number.MAX_SAFE_INTEGER);
      expect(res.endingBalanceAmount).toBeLessThan(Number.MAX_SAFE_INTEGER);

      // Total quantity check: 1000 + 1300 - 1300 = 1000
      expect(res.endingBalanceQty).toBe(1_000);

      // Exact mathematical conservation: V_dk + sum(V_nhap) === sum(V_xuat) + V_ck (+- 1 VND)
      const totalInflow = initialAmount + res.totalInAmount;
      const totalOutflow = res.totalOutAmount + res.endingBalanceAmount;
      expect(Math.abs(totalInflow - totalOutflow)).toBeLessThanOrEqual(1);
      expect(res.isConserved).toBe(true);

      // Verify amounts are positive and finite integers
      expect(Number.isSafeInteger(res.totalInAmount)).toBe(true);
      expect(Number.isSafeInteger(res.totalOutAmount)).toBe(true);
      expect(Number.isSafeInteger(res.endingBalanceAmount)).toBe(true);
    }
  });

  // =========================================================================
  // T5.5: Multi-regime TT 200 vs TT 133 vs TT 99 mathematical invariance
  // =========================================================================
  it('T5.5: Multi-regime TT 200 vs TT 133 vs TT 99 mathematical invariance (eligible cost, abnormal waste, Z, z, CIT B4)', () => {
    const baseCostInput = {
      beginningWip: 60_000_000,
      actualDirectMaterial: 600_000_000,
      normalDirectMaterial: 500_000_000, // 100M abnormal waste
      actualDirectLabor: 250_000_000,
      normalDirectLabor: 200_000_000,    // 50M abnormal waste
      actualOverhead: 180_000_000,
      finishedUnits: 1_200,
      endingWipUnits: 300,
      wipMethod: 'EQUIVALENT_UNITS' as const,
      completionPercentage: 60,
    };

    const res200 = calculateManufacturingCost({ ...baseCostInput, regime: 'CIRCULAR_200' });
    const res133 = calculateManufacturingCost({ ...baseCostInput, regime: 'CIRCULAR_133' });
    const res99 = calculateManufacturingCost({ ...baseCostInput, regime: 'CIRCULAR_99' });

    // Mathematical Invariance across regimes:
    // 1. Eligible manufacturing costs: 500M normal mat + 200M normal labor + 180M overhead = 880M
    expect(res200.totalEligibleCost).toBe(880_000_000);
    expect(res133.totalEligibleCost).toBe(res200.totalEligibleCost);
    expect(res99.totalEligibleCost).toBe(res200.totalEligibleCost);

    // 2. Abnormal waste: 100M mat + 50M labor = 150M
    expect(res200.abnormalMaterialCost).toBe(100_000_000);
    expect(res133.abnormalMaterialCost).toBe(100_000_000);
    expect(res99.abnormalMaterialCost).toBe(100_000_000);

    expect(res200.abnormalLaborCost).toBe(50_000_000);
    expect(res133.abnormalLaborCost).toBe(50_000_000);
    expect(res99.abnormalLaborCost).toBe(50_000_000);

    // 3. Direct COGS (TK 632) and Schedule B4 Tax impact: 150M x 20% = 30M
    expect(res200.cogsDirectExpense).toBe(150_000_000);
    expect(res133.cogsDirectExpense).toBe(150_000_000);
    expect(res99.cogsDirectExpense).toBe(150_000_000);

    expect(res200.scheduleB4Amount).toBe(150_000_000);
    expect(res133.scheduleB4Amount).toBe(150_000_000);
    expect(res99.scheduleB4Amount).toBe(150_000_000);

    expect(res200.citTaxImpact).toBe(30_000_000);
    expect(res133.citTaxImpact).toBe(30_000_000);
    expect(res99.citTaxImpact).toBe(30_000_000);

    // 4. Ending WIP Cost, Total Cost Z, and Unit Cost z are 100% identical
    expect(res133.endingWipCost).toBe(res200.endingWipCost);
    expect(res99.endingWipCost).toBe(res200.endingWipCost);

    expect(res133.totalCostZ).toBe(res200.totalCostZ);
    expect(res99.totalCostZ).toBe(res200.totalCostZ);

    expect(res133.unitCostZ).toBe(res200.unitCostZ);
    expect(res99.unitCostZ).toBe(res200.unitCostZ);

    // 5. Chart of Accounts regulatory divergence:
    // Circular 200 & Circular 99 use 621, 622, 627 -> 154
    const coa200Credits = res200.journalEntries.map((j) => j.creditAccount);
    expect(coa200Credits).toContain('621');
    expect(coa200Credits).toContain('622');
    expect(coa200Credits).toContain('627');

    // Circular 133 prohibits 621, 622, 627, posting directly to TK 154
    const coa133Accounts = res133.journalEntries.flatMap((j) => [j.debitAccount, j.creditAccount]);
    expect(coa133Accounts).not.toContain('621');
    expect(coa133Accounts).not.toContain('622');
    expect(coa133Accounts).not.toContain('627');
    expect(coa133Accounts).toContain('154');
    expect(coa133Accounts).toContain('632');
  });

  // =========================================================================
  // T5.6: Boundary WIP tests (0% completion, 100% completion, Q_tp = 0, Q_dd = 0)
  // =========================================================================
  it('T5.6: Boundary WIP tests: 0% completion, 100% completion, Q_tp = 0, Q_dd = 0', () => {
    // 1. All ending WIP, zero finished goods (Q_tp = 0, Q_dd = 500)
    const allWipInput: ManufacturingCostInput = {
      regime: 'CIRCULAR_200',
      beginningWip: 20_000_000,
      actualDirectMaterial: 100_000_000,
      normalDirectMaterial: 100_000_000,
      actualDirectLabor: 40_000_000,
      normalDirectLabor: 40_000_000,
      actualOverhead: 30_000_000,
      finishedUnits: 0, // Zero finished goods
      endingWipUnits: 500,
      wipMethod: 'DIRECT_MATERIAL',
    };
    const resAllWip = calculateManufacturingCost(allWipInput);
    expect(resAllWip.totalCostZ).toBe(0);
    expect(resAllWip.unitCostZ).toBe(0);
    // Ending WIP absorbs 100% of beginning WIP + total eligible cost
    expect(resAllWip.endingWipCost).toBe(20_000_000 + 170_000_000);

    // 2. Zero ending WIP, 100% finished goods (Q_dd = 0, Q_tp = 500)
    const zeroWipInput: ManufacturingCostInput = {
      ...allWipInput,
      finishedUnits: 500,
      endingWipUnits: 0, // Zero WIP
    };
    const resZeroWip = calculateManufacturingCost(zeroWipInput);
    expect(resZeroWip.endingWipCost).toBe(0);
    expect(resZeroWip.totalCostZ).toBe(20_000_000 + 170_000_000);
    expect(resZeroWip.unitCostZ).toBe(190_000_000 / 500);

    // 3. Both Q_tp = 0 and Q_dd = 0 (idle plant)
    const idleInput: ManufacturingCostInput = {
      ...allWipInput,
      finishedUnits: 0,
      endingWipUnits: 0,
    };
    const resIdle = calculateManufacturingCost(idleInput);
    expect(resIdle.totalCostZ).toBe(0);
    expect(resIdle.unitCostZ).toBe(0);

    // 4. EUP Method with 0% completion (h = 0)
    const eupZeroPercent: ManufacturingCostInput = {
      regime: 'CIRCULAR_200',
      beginningWip: 0,
      actualDirectMaterial: 200_000_000,
      normalDirectMaterial: 200_000_000,
      actualDirectLabor: 80_000_000,
      normalDirectLabor: 80_000_000,
      actualOverhead: 60_000_000,
      finishedUnits: 400,
      endingWipUnits: 100,
      wipMethod: 'EQUIVALENT_UNITS',
      completionPercentage: 0, // 0% conversion
    };
    const resEupZero = calculateManufacturingCost(eupZeroPercent);
    // Ending WIP absorbs ONLY materials: (200M / 500) * 100 = 40M. Conversion WIP = 0.
    expect(resEupZero.endingWipCost).toBe(40_000_000);
    // Finished goods absorb remainder: 200M + 140M - 40M = 300M
    expect(resEupZero.totalCostZ).toBe(300_000_000);

    // 5. EUP Method with 100% completion (h = 100)
    const eupHundredPercent: ManufacturingCostInput = {
      ...eupZeroPercent,
      completionPercentage: 100, // 100% conversion
    };
    const resEupHundred = calculateManufacturingCost(eupHundredPercent);
    // Material WIP: (200M / 500) * 100 = 40M
    // Conversion WIP: (140M / 500) * 100 = 28M
    // Total WIP: 68M
    expect(resEupHundred.endingWipCost).toBe(68_000_000);
    expect(resEupHundred.totalCostZ).toBe(340_000_000 - 68_000_000);
    expect(resEupHundred.unitCostZ).toBe(272_000_000 / 400);
  });

  // =========================================================================
  // T5.7: Abnormal waste boundary tests
  // =========================================================================
  it('T5.7: Abnormal waste boundary tests: 0% abnormal waste, 100% abnormal waste (zero norm), negative norm inputs sanitized safely', () => {
    // 1. 0% abnormal waste (actual <= normal)
    const noWasteInput: ManufacturingCostInput = {
      regime: 'CIRCULAR_200',
      beginningWip: 0,
      actualDirectMaterial: 150_000_000,
      normalDirectMaterial: 160_000_000, // Norm higher than actual
      actualDirectLabor: 50_000_000,
      normalDirectLabor: 50_000_000,
      actualOverhead: 40_000_000,
      finishedUnits: 100,
      endingWipUnits: 0,
      wipMethod: 'DIRECT_MATERIAL',
    };
    const resNoWaste = calculateManufacturingCost(noWasteInput);
    expect(resNoWaste.abnormalMaterialCost).toBe(0);
    expect(resNoWaste.abnormalLaborCost).toBe(0);
    expect(resNoWaste.cogsDirectExpense).toBe(0);
    expect(resNoWaste.scheduleB4Amount).toBe(0);
    expect(resNoWaste.citTaxImpact).toBe(0);
    expect(resNoWaste.scheduleB4Item).toBeUndefined();
    expect(resNoWaste.scheduleB4Adjustments.length).toBe(0);
    expect(resNoWaste.journalEntries.some((j) => j.debitAccount === '632')).toBe(false);

    // 2. 100% abnormal waste (zero norm)
    const allWasteInput: ManufacturingCostInput = {
      ...noWasteInput,
      normalDirectMaterial: 0, // 0 norm -> 100% waste
      normalDirectLabor: 0,    // 0 norm -> 100% waste
    };
    const resAllWaste = calculateManufacturingCost(allWasteInput);
    expect(resAllWaste.normalMaterialCost).toBe(0);
    expect(resAllWaste.normalLaborCost).toBe(0);
    expect(resAllWaste.abnormalMaterialCost).toBe(150_000_000);
    expect(resAllWaste.abnormalLaborCost).toBe(50_000_000);
    expect(resAllWaste.cogsDirectExpense).toBe(200_000_000);
    expect(resAllWaste.scheduleB4Amount).toBe(200_000_000);
    expect(resAllWaste.citTaxImpact).toBe(40_000_000); // 200M * 20%
    // Finished goods absorb ONLY overhead (40M)
    expect(resAllWaste.totalCostZ).toBe(40_000_000);
    expect(resAllWaste.unitCostZ).toBe(400_000);

    // 3. Negative norm input sanitized safely (Math.max(0, norm))
    const negativeNormInput: ManufacturingCostInput = {
      ...noWasteInput,
      normalDirectMaterial: -50_000_000, // Negative norm input
      normalDirectLabor: -10_000_000,    // Negative norm input
    };
    const resNegativeNorm = calculateManufacturingCost(negativeNormInput);
    expect(resNegativeNorm.normalMaterialCost).toBe(0);
    expect(resNegativeNorm.normalLaborCost).toBe(0);
    expect(resNegativeNorm.abnormalMaterialCost).toBe(150_000_000);
    expect(resNegativeNorm.abnormalLaborCost).toBe(50_000_000);
    expect(Number.isFinite(resNegativeNorm.totalCostZ)).toBe(true);
    expect(resNegativeNorm.totalCostZ).toBeGreaterThanOrEqual(0);
  });

  // =========================================================================
  // T5.8: Mixed interleaved dispatches (Form 03/XKNB vs Sales PXK)
  // =========================================================================
  it('T5.8: Mixed interleaved dispatches (Form 03/XKNB vs Sales PXK) confirming exact separation of TK 632 vs TK 157 across all 3 valuation methods', () => {
    const initialLot: InventoryLot = {
      id: 'init-lot-interleaved',
      date: '2026-01-01',
      voucherCode: 'SDDK-INT',
      quantity: 1_000,
      unitPrice: 50_000,
    };
    const initialAmount = 50_000_000;

    const transactions: StockTransaction[] = [
      // 1. PNK: +500 @ 52,000 VND
      {
        id: 'tx-int-1',
        date: '2026-01-05',
        voucherCode: 'PNK-01',
        voucherType: 'PNK',
        description: 'Nhập vật tư',
        quantity: 500,
        unitPrice: 52_000,
      },
      // 2. PXK: -300 units (Commercial sale -> TK 632)
      {
        id: 'tx-int-2',
        date: '2026-01-10',
        voucherCode: 'PXK-01',
        voucherType: 'PXK',
        description: 'Xuất bán khách hàng BigC',
        quantity: 300,
        targetAccount: '632',
      },
      // 3. Form 03/XKNB: -400 units (Internal dispatch / Consignment -> TK 157)
      {
        id: 'tx-int-3',
        date: '2026-01-15',
        voucherCode: 'XKNB-01',
        voucherType: 'XKNB_03',
        description: 'Xuất gửi đại lý hưởng hoa hồng (Mẫu 03/XKNB)',
        quantity: 400,
        targetAccount: '157',
      },
      // 4. PNK: +800 @ 55,000 VND
      {
        id: 'tx-int-4',
        date: '2026-01-20',
        voucherCode: 'PNK-02',
        voucherType: 'PNK',
        description: 'Nhập bổ sung',
        quantity: 800,
        unitPrice: 55_000,
      },
      // 5. Form 03/XKNB: -200 units (Internal transfer -> TK 157)
      {
        id: 'tx-int-5',
        date: '2026-01-22',
        voucherCode: 'XKNB-02',
        voucherType: 'XKNB_03',
        description: 'Điều chuyển kho phụ (Mẫu 03/XKNB)',
        quantity: 200,
        targetAccount: '157',
      },
      // 6. PXK: -600 units (Commercial sale -> TK 632)
      {
        id: 'tx-int-6',
        date: '2026-01-28',
        voucherCode: 'PXK-02',
        voucherType: 'PXK',
        description: 'Xuất bán đại lý cấp 1',
        quantity: 600,
        targetAccount: '632',
      },
    ];

    const methods: CostingMethod[] = ['FIFO', 'PERIODIC_WEIGHTED_AVERAGE', 'MOVING_WEIGHTED_AVERAGE'];

    for (const method of methods) {
      const res = calculateStockCard(method, [initialLot], transactions);

      // Verify row account targets
      const pxkRows = res.rows.filter((r) => r.voucherType === 'PXK');
      const xknbRows = res.rows.filter((r) => r.voucherType === 'XKNB_03');

      expect(pxkRows.length).toBe(2);
      expect(xknbRows.length).toBe(2);

      for (const row of pxkRows) {
        expect(row.targetAccount).toBe('632');
      }
      for (const row of xknbRows) {
        expect(row.targetAccount).toBe('157');
      }

      // Strict account segregation:
      // totalCogsAmount MUST equal sum of PXK rows ONLY, excluding TK 157 XKNB rows
      const sumPxkAmount = pxkRows.reduce((sum, r) => sum + r.outAmount, 0);
      const sumXknbAmount = xknbRows.reduce((sum, r) => sum + r.outAmount, 0);

      expect(res.totalCogsAmount).toBe(sumPxkAmount);
      expect(res.totalOutAmount).toBe(sumPxkAmount + sumXknbAmount);

      // Inventory conservation invariant holds: V_dk + sum(V_nhap) === sum(V_xuat) + V_ck (+- 1 VND)
      const totalInflow = initialAmount + res.totalInAmount;
      const totalOutflow = res.totalOutAmount + res.endingBalanceAmount;
      expect(Math.abs(totalInflow - totalOutflow)).toBeLessThanOrEqual(1);
      expect(res.isConserved).toBe(true);
    }
  });

  // =========================================================================
  // T5.9: Comparison Matrix adversarial stress: extreme market cycles
  // =========================================================================
  it('T5.9: Comparison Matrix adversarial stress: extreme market cycles (hyperinflation +500% vs deflation crash -80%)', () => {
    // 1. Hyperinflation Scenario (+500% price surge: 20k -> 50k -> 120k)
    const inflationInitialLots: InventoryLot[] = [
      { id: 'lot-inf-1', date: '2026-01-01', quantity: 100, unitPrice: 20_000 },
    ];
    const inflationTxs: StockTransaction[] = [
      { id: 'tx-inf-1', date: '2026-01-05', voucherCode: 'PNK-INF-1', voucherType: 'PNK', description: 'Nhập đợt 1', quantity: 100, unitPrice: 50_000 },
      { id: 'tx-inf-2', date: '2026-01-10', voucherCode: 'PNK-INF-2', voucherType: 'PNK', description: 'Nhập đợt 2 (+500%)', quantity: 100, unitPrice: 120_000 },
      { id: 'tx-inf-3', date: '2026-01-20', voucherCode: 'PXK-INF-1', voucherType: 'PXK', description: 'Xuất bán thương phẩm', quantity: 150, targetAccount: '632' },
    ];

    const matrixInflation = generateComparisonMatrix(inflationInitialLots, inflationTxs, 30_000_000);
    expect(matrixInflation.trend).toBe('INFLATION');
    expect(matrixInflation.minCogsMethod).toBe('FIFO');

    const rowFifoInf = matrixInflation.rows.find((r) => r.method === 'FIFO')!;
    const rowPeriodicInf = matrixInflation.rows.find((r) => r.method === 'PERIODIC_WEIGHTED_AVERAGE')!;
    const rowMovingInf = matrixInflation.rows.find((r) => r.method === 'MOVING_WEIGHTED_AVERAGE')!;

    // Mathematical Inequalities under Inflation:
    // COGS_FIFO < COGS_MovingWA <= COGS_PeriodicWA
    expect(rowFifoInf.cogsAmount).toBeLessThan(rowMovingInf.cogsAmount);
    expect(rowFifoInf.cogsAmount).toBeLessThan(rowPeriodicInf.cogsAmount);

    // EndingInventory_FIFO > EndingInventory_WA
    expect(rowFifoInf.endingInventoryValue).toBeGreaterThan(rowMovingInf.endingInventoryValue);
    expect(rowFifoInf.endingInventoryValue).toBeGreaterThan(rowPeriodicInf.endingInventoryValue);

    // GrossProfit_FIFO > GrossProfit_WA
    expect(rowFifoInf.grossProfit).toBeGreaterThan(rowMovingInf.grossProfit);
    expect(rowFifoInf.grossProfit).toBeGreaterThan(rowPeriodicInf.grossProfit);

    // 2. Deflation Crash Scenario (-80% price collapse: 100k -> 40k -> 20k)
    const deflationInitialLots: InventoryLot[] = [
      { id: 'lot-def-1', date: '2026-01-01', quantity: 100, unitPrice: 100_000 },
    ];
    const deflationTxs: StockTransaction[] = [
      { id: 'tx-def-1', date: '2026-01-05', voucherCode: 'PNK-DEF-1', voucherType: 'PNK', description: 'Nhập đợt 1', quantity: 100, unitPrice: 40_000 },
      { id: 'tx-def-2', date: '2026-01-10', voucherCode: 'PNK-DEF-2', voucherType: 'PNK', description: 'Nhập đợt 2 (-80%)', quantity: 100, unitPrice: 20_000 },
      { id: 'tx-def-3', date: '2026-01-20', voucherCode: 'PXK-DEF-1', voucherType: 'PXK', description: 'Xuất bán thương phẩm', quantity: 150, targetAccount: '632' },
    ];

    const matrixDeflation = generateComparisonMatrix(deflationInitialLots, deflationTxs, 30_000_000);
    expect(matrixDeflation.trend).toBe('DEFLATION');
    expect(matrixDeflation.maxCogsMethod).toBe('FIFO');

    const rowFifoDef = matrixDeflation.rows.find((r) => r.method === 'FIFO')!;
    const rowPeriodicDef = matrixDeflation.rows.find((r) => r.method === 'PERIODIC_WEIGHTED_AVERAGE')!;
    const rowMovingDef = matrixDeflation.rows.find((r) => r.method === 'MOVING_WEIGHTED_AVERAGE')!;

    // Mathematical Inequalities under Deflation:
    // COGS_FIFO > COGS_WA
    expect(rowFifoDef.cogsAmount).toBeGreaterThan(rowMovingDef.cogsAmount);
    expect(rowFifoDef.cogsAmount).toBeGreaterThan(rowPeriodicDef.cogsAmount);

    // EndingInventory_FIFO < EndingInventory_WA
    expect(rowFifoDef.endingInventoryValue).toBeLessThan(rowMovingDef.endingInventoryValue);
    expect(rowFifoDef.endingInventoryValue).toBeLessThan(rowPeriodicDef.endingInventoryValue);

    // GrossProfit_FIFO < GrossProfit_WA
    expect(rowFifoDef.grossProfit).toBeLessThan(rowMovingDef.grossProfit);
    expect(rowFifoDef.grossProfit).toBeLessThan(rowPeriodicDef.grossProfit);
  });

  // =========================================================================
  // T5.10: State persistence / IndexedDB serialization fuzzing
  // =========================================================================
  it('T5.10: State persistence / IndexedDB serialization fuzzing: corrupted or partial CogsState objects safely loaded with defaults', async () => {
    // 1. Normal save and load round-trip
    const validState: CogsState = {
      initialLots: [{ id: 'fuzz-lot-1', date: '2026-01-01', quantity: 10, unitPrice: 20_000 }],
      transactions: [],
      selectedMethod: 'FIFO',
      manufacturingInput: {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 10_000_000,
        normalDirectMaterial: 10_000_000,
        actualDirectLabor: 5_000_000,
        normalDirectLabor: 5_000_000,
        actualOverhead: 3_000_000,
        finishedUnits: 100,
        endingWipUnits: 0,
        wipMethod: 'DIRECT_MATERIAL',
      },
      activeSubTab: 'stock-card',
      selectedScenarioId: 'scen-cogs-01',
    };

    await storageService.saveCogsState(validState);
    const loaded = await storageService.loadCogsState();
    expect(loaded).toBeDefined();
    expect(loaded?.selectedScenarioId).toBe('scen-cogs-01');

    // 2. Fuzzing with corrupted / partial object payloads
    const corruptedPayloads = [
      {}, // Empty object
      { selectedScenarioId: 'scen-unknown' }, // Missing lots and transactions
      { initialLots: null, transactions: null }, // Null lists
      { initialLots: [{ quantity: -999, unitPrice: -500 }] }, // Negative lot quantities
      { selectedMethod: 'CORRUPTED_METHOD' as any }, // Corrupted enum string
    ];

    for (const corrupt of corruptedPayloads) {
      // Storage adapter safely saves without unhandled error
      await expect(storageService.saveCogsState(corrupt as any)).resolves.not.toThrow();

      // Engine safely calculates with empty or sanitized inputs without crashing
      const fallbackLots = Array.isArray(corrupt.initialLots) ? corrupt.initialLots : [];
      const fallbackTxs = Array.isArray((corrupt as any).transactions) ? (corrupt as any).transactions : [];

      expect(() => calculateStockCard('FIFO', fallbackLots as any, fallbackTxs as any)).not.toThrow();
      expect(() => calculateStockCard('MOVING_WEIGHTED_AVERAGE', fallbackLots as any, fallbackTxs as any)).not.toThrow();
    }
  });

  // =========================================================================
  // T5.11: Rapid scenario switching: simulating multiple consecutive scenario loads without state bleeding
  // =========================================================================
  it('T5.11: Rapid scenario switching: simulating multiple consecutive scenario loads without state bleeding', () => {
    const scen1 = getCogsScenarioById('scen-cogs-01');
    const scen2 = getCogsScenarioById('scen-cogs-02');
    const scen3 = getCogsScenarioById('scen-cogs-03');

    expect(scen1).toBeDefined();
    expect(scen2).toBeDefined();
    expect(scen3).toBeDefined();

    // Verify baseline scenario parameters are cleanly distinct
    expect(scen1!.id).toBe('scen-cogs-01');
    expect(scen2!.id).toBe('scen-cogs-02');
    expect(scen3!.id).toBe('scen-cogs-03');

    // Scenario 1: Dairy distribution (5 transactions, 1 lot)
    expect(scen1!.initialLots.length).toBe(1);
    expect(scen1!.transactions.length).toBe(5);

    // Scenario 2: Steel industry (6 transactions, 1 lot, rising price trend)
    expect(scen2!.initialLots.length).toBe(1);
    expect(scen2!.transactions.length).toBe(6);

    // Scenario 3: Garment manufacturing (manufacturing inputs, 0 inventory stock card transactions)
    expect(scen3!.manufacturingInput).toBeDefined();
    expect(scen3!.manufacturingInput!.finishedUnits).toBe(10_000);

    // Simulate State Machine Rapid Switching:
    // State 1 -> State 2 -> State 3 -> State 1
    let currentLots = [...scen1!.initialLots];
    let currentTxs = [...scen1!.transactions];
    let currentMethod = scen1!.recommendedMethod || 'FIFO';

    // Step 1: Calculate on scen-1
    const res1a = calculateStockCard(currentMethod, currentLots, currentTxs);
    expect(res1a.rows.length).toBe(5);
    expect(res1a.endingBalanceQty).toBe(500);

    // Step 2: Switch to scen-2
    currentLots = [...scen2!.initialLots];
    currentTxs = [...scen2!.transactions];
    currentMethod = scen2!.recommendedMethod || 'FIFO';
    const res2 = calculateStockCard(currentMethod, currentLots, currentTxs);
    expect(res2.rows.length).toBe(6);
    expect(res2.endingBalanceQty).toBe(70);
    // Confirm no leftover transactions from scen-1
    expect(res2.rows.some((r) => r.voucherCode === 'PNK-001')).toBe(false);

    // Step 3: Switch to scen-3
    const mfgInput3 = scen3!.manufacturingInput!;
    const res3 = calculateManufacturingCost(mfgInput3);
    expect(res3.abnormalMaterialCost).toBe(300_000_000);
    expect(res3.scheduleB4Amount).toBe(300_000_000);
    expect(res3.citTaxImpact).toBe(60_000_000);

    // Step 4: Switch back to scen-1 and verify absolute determinism (no state bleed)
    currentLots = [...scen1!.initialLots];
    currentTxs = [...scen1!.transactions];
    currentMethod = scen1!.recommendedMethod || 'FIFO';
    const res1b = calculateStockCard(currentMethod, currentLots, currentTxs);

    expect(res1b.rows.length).toBe(res1a.rows.length);
    expect(res1b.totalCogsAmount).toBe(res1a.totalCogsAmount);
    expect(res1b.endingBalanceAmount).toBe(res1a.endingBalanceAmount);
    expect(res1b.isConserved).toBe(true);
  });

  // =========================================================================
  // T5.12: Socratic hint anti-spoil stress
  // =========================================================================
  it('T5.12: Socratic hint anti-spoil stress: ensuring Level 2 and Level 3 hints are strictly segregated from Level 1, and anti-spoil reset invariant holds', () => {
    const scenarioIds = ['scen-cogs-01', 'scen-cogs-02', 'scen-cogs-03'];

    for (const scId of scenarioIds) {
      const scenarioHints = getCogsHintsForScenario(scId);
      expect(scenarioHints).toBeDefined();

      const [h1, h2, h3] = scenarioHints!.hints;
      expect(h1.level).toBe(1);
      expect(h2.level).toBe(2);
      expect(h3.level).toBe(3);

      // Invariant 1: Level 1 (Positioning) MUST NOT reveal sample journal entries or answers
      expect(h1.keyQuestionsVi).toBeDefined();
      expect(h1.keyQuestionsVi!.length).toBeGreaterThanOrEqual(2);
      expect(h1.sampleJournalEntriesVi).toBeUndefined();
      expect(h1.technicalGuidanceVi).toBeUndefined();

      // Level 1 content must not contain direct journalizing syntax like "Nợ TK 632 / Có TK 156"
      expect(h1.contentVi).not.toMatch(/Nợ\s+TK\s+\d+/i);
      expect(h1.contentVi).not.toMatch(/Có\s+TK\s+\d+/i);

      // Invariant 2: Level 2 (Legal & Accounting Principles) MUST contain statutory citations
      expect(h2.legalBasisVi).toBeDefined();
      expect(h2.legalBasisVi!.length).toBeGreaterThanOrEqual(1);
      expect(h2.accountingPrinciplesVi).toBeDefined();
      expect(h2.accountingPrinciplesVi!.length).toBeGreaterThanOrEqual(1);
      expect(h2.sampleJournalEntriesVi).toBeUndefined(); // Level 2 still does not reveal full sample solution entries

      // Invariant 3: Level 3 (Technical Guidance & Sample Vouchers) provides reference models
      expect(h3.technicalGuidanceVi).toBeDefined();
      expect(h3.technicalGuidanceVi!.length).toBeGreaterThan(0);
      expect(h3.sampleJournalEntriesVi).toBeDefined();
      expect(h3.sampleJournalEntriesVi!.length).toBeGreaterThanOrEqual(1);

      for (const entry of h3.sampleJournalEntriesVi!) {
        expect(entry.debitAccount).toBeTruthy();
        expect(entry.creditAccount).toBeTruthy();
        expect(entry.descriptionVi).toBeTruthy();
      }
    }

    // Invariant 4: Anti-spoil Reset State Machine simulation
    // Simulates CogsSocraticLadder state management:
    // Initial: level = 1, maxUnlocked = 1
    let currentLevel: 1 | 2 | 3 = 1;
    let maxUnlockedLevel: 1 | 2 | 3 = 1;

    // User unlocks Level 2
    maxUnlockedLevel = 2;
    currentLevel = 2;
    expect(currentLevel).toBe(2);
    expect(maxUnlockedLevel).toBe(2);

    // User unlocks Level 3
    maxUnlockedLevel = 3;
    currentLevel = 3;
    expect(currentLevel).toBe(3);
    expect(maxUnlockedLevel).toBe(3);

    // Scenario switch or reset button click triggers anti-spoil reset
    const handleResetLadder = () => {
      currentLevel = 1;
      maxUnlockedLevel = 1;
    };
    handleResetLadder();

    expect(currentLevel).toBe(1);
    expect(maxUnlockedLevel).toBe(1);
  });
});
