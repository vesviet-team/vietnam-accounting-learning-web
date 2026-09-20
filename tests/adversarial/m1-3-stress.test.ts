import { describe, it, expect } from 'vitest';
import { calculateManufacturingCost } from '@/engine/cogs-engine';
import type { ManufacturingCostInput } from '@/types/cogs';

describe('Adversarial Challenge M1-3: Empirical Cost Accounting & Circular 133 Invariants', () => {
  // =========================================================================
  // 1. Challenge Zero-Norm Boundary Condition
  // =========================================================================
  describe('1. Zero-Norm Boundary Condition Robustness', () => {
    it('1.1. normalDirectMaterial === 0 triggers 100% abnormal material waste and Tax B4 adjustment', () => {
      const input: ManufacturingCostInput = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 80_000_000,
        actualDirectLabor: 30_000_000,
        actualOverhead: 10_000_000,
        normalDirectMaterial: 0, // Zero norm
        normalDirectLabor: 30_000_000,
        finishedUnits: 100,
        endingWipUnits: 0,
        wipMethod: 'DIRECT_MATERIAL',
      };

      const res = calculateManufacturingCost(input);

      expect(res.normalMaterialCost).toBe(0);
      expect(res.abnormalMaterialCost).toBe(80_000_000);
      expect(res.cogsDirectExpense).toBe(80_000_000);
      expect(res.scheduleB4Amount).toBe(80_000_000);
      expect(res.citTaxImpact).toBe(16_000_000); // 80M * 20%
      expect(res.totalCostZ).toBe(40_000_000); // Only labor (30M) + overhead (10M)
      expect(res.unitCostZ).toBe(400_000);
    });

    it('1.2. normalDirectLabor === 0 triggers 100% abnormal labor waste and Tax B4 adjustment', () => {
      const input: ManufacturingCostInput = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 50_000_000,
        actualDirectLabor: 40_000_000,
        actualOverhead: 15_000_000,
        normalDirectMaterial: 50_000_000,
        normalDirectLabor: 0, // Zero norm
        finishedUnits: 50,
        endingWipUnits: 0,
        wipMethod: 'DIRECT_MATERIAL',
      };

      const res = calculateManufacturingCost(input);

      expect(res.normalLaborCost).toBe(0);
      expect(res.abnormalLaborCost).toBe(40_000_000);
      expect(res.cogsDirectExpense).toBe(40_000_000);
      expect(res.scheduleB4Amount).toBe(40_000_000);
      expect(res.citTaxImpact).toBe(8_000_000); // 40M * 20%
      expect(res.totalCostZ).toBe(65_000_000); // Material (50M) + overhead (15M)
      expect(res.unitCostZ).toBe(1_300_000);
    });

    it('1.3. Both normalDirectMaterial === 0 AND normalDirectLabor === 0: 100% waste', () => {
      const input: ManufacturingCostInput = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 100_000_000,
        actualDirectLabor: 50_000_000,
        actualOverhead: 0,
        normalDirectMaterial: 0,
        normalDirectLabor: 0,
        finishedUnits: 10,
        endingWipUnits: 0,
        wipMethod: 'DIRECT_MATERIAL',
      };

      const res = calculateManufacturingCost(input);

      expect(res.normalMaterialCost).toBe(0);
      expect(res.abnormalMaterialCost).toBe(100_000_000);
      expect(res.normalLaborCost).toBe(0);
      expect(res.abnormalLaborCost).toBe(50_000_000);
      expect(res.cogsDirectExpense).toBe(150_000_000);
      expect(res.scheduleB4Amount).toBe(150_000_000);
      expect(res.citTaxImpact).toBe(30_000_000);
      expect(res.totalCostZ).toBe(0);
      expect(res.unitCostZ).toBe(0);
    });

    it('1.4. Undefined normal norms default to 0% abnormal waste (norm = actual)', () => {
      const input: ManufacturingCostInput = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 70_000_000,
        actualDirectLabor: 25_000_000,
        actualOverhead: 5_000_000,
        normalDirectMaterial: undefined,
        normalDirectLabor: undefined,
        finishedUnits: 100,
        endingWipUnits: 0,
        wipMethod: 'DIRECT_MATERIAL',
      };

      const res = calculateManufacturingCost(input);

      expect(res.normalMaterialCost).toBe(70_000_000);
      expect(res.abnormalMaterialCost).toBe(0);
      expect(res.normalLaborCost).toBe(25_000_000);
      expect(res.abnormalLaborCost).toBe(0);
      expect(res.cogsDirectExpense).toBe(0);
      expect(res.scheduleB4Amount).toBe(0);
      expect(res.citTaxImpact).toBe(0);
      expect(res.totalCostZ).toBe(100_000_000);
    });

    it('1.5. Null normal norms default to 0% abnormal waste (norm = actual)', () => {
      const input: any = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 60_000_000,
        actualDirectLabor: 20_000_000,
        actualOverhead: 10_000_000,
        normalDirectMaterial: null,
        normalDirectLabor: null,
        finishedUnits: 100,
        endingWipUnits: 0,
        wipMethod: 'DIRECT_MATERIAL',
      };

      const res = calculateManufacturingCost(input);

      expect(res.normalMaterialCost).toBe(60_000_000);
      expect(res.abnormalMaterialCost).toBe(0);
      expect(res.normalLaborCost).toBe(20_000_000);
      expect(res.abnormalLaborCost).toBe(0);
      expect(res.cogsDirectExpense).toBe(0);
      expect(res.scheduleB4Amount).toBe(0);
      expect(res.citTaxImpact).toBe(0);
      expect(res.totalCostZ).toBe(90_000_000);
    });

    it('1.6. Negative normal norms clamp to 0 and trigger 100% abnormal waste', () => {
      const input: ManufacturingCostInput = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 45_000_000,
        actualDirectLabor: 15_000_000,
        actualOverhead: 5_000_000,
        normalDirectMaterial: -10_000_000, // Negative norm
        normalDirectLabor: -5_000_000,      // Negative norm
        finishedUnits: 10,
        endingWipUnits: 0,
        wipMethod: 'DIRECT_MATERIAL',
      };

      const res = calculateManufacturingCost(input);

      expect(res.normalMaterialCost).toBe(0);
      expect(res.abnormalMaterialCost).toBe(45_000_000);
      expect(res.normalLaborCost).toBe(0);
      expect(res.abnormalLaborCost).toBe(15_000_000);
      expect(res.cogsDirectExpense).toBe(60_000_000);
      expect(res.scheduleB4Amount).toBe(60_000_000);
      expect(res.citTaxImpact).toBe(12_000_000);
      expect(res.totalCostZ).toBe(5_000_000); // Only overhead survived
    });

    it('1.7. Efficiency case: normal norm > actual usage results in 0 abnormal waste and no negative amounts', () => {
      const input: ManufacturingCostInput = {
        regime: 'CIRCULAR_200',
        beginningWip: 0,
        actualDirectMaterial: 75_000_000,
        actualDirectLabor: 25_000_000,
        actualOverhead: 10_000_000,
        normalDirectMaterial: 90_000_000, // Higher than actual
        normalDirectLabor: 35_000_000,     // Higher than actual
        finishedUnits: 100,
        endingWipUnits: 0,
        wipMethod: 'DIRECT_MATERIAL',
      };

      const res = calculateManufacturingCost(input);

      expect(res.normalMaterialCost).toBe(75_000_000);
      expect(res.abnormalMaterialCost).toBe(0);
      expect(res.normalLaborCost).toBe(25_000_000);
      expect(res.abnormalLaborCost).toBe(0);
      expect(res.cogsDirectExpense).toBe(0);
      expect(res.scheduleB4Amount).toBe(0);
      expect(res.citTaxImpact).toBe(0);
      expect(res.totalCostZ).toBe(110_000_000);
    });
  });

  // =========================================================================
  // 2. Challenge Circular 133 Double-Entry Equilibrium on Account 154
  // =========================================================================
  describe('2. Circular 133 Account 154 Equilibrium & Ledger Invariants', () => {
    function get154Totals(entries: { debitAccount: string; creditAccount: string; amount: number }[]) {
      const debits = entries.filter((e) => e.debitAccount === '154').reduce((s, e) => s + e.amount, 0);
      const credits = entries.filter((e) => e.creditAccount === '154').reduce((s, e) => s + e.amount, 0);
      return { debits, credits, netBalance: debits - credits };
    }

    // --- Scenario A: Zero WIP (endingWipUnits === 0, beginningWip === 0) ---
    describe('2.1. Zero WIP Scenarios: Assert Debits - Credits === 0', () => {
      it('Case A1: 0% waste (norm === actual)', () => {
        const res = calculateManufacturingCost({
          regime: 'CIRCULAR_133',
          beginningWip: 0,
          actualDirectMaterial: 100_000_000,
          normalDirectMaterial: 100_000_000,
          actualDirectLabor: 50_000_000,
          normalDirectLabor: 50_000_000,
          actualOverhead: 20_000_000,
          finishedUnits: 100,
          endingWipUnits: 0,
          wipMethod: 'DIRECT_MATERIAL',
        });

        const { debits, credits, netBalance } = get154Totals(res.journalEntries);
        expect(debits).toBe(170_000_000);
        expect(credits).toBe(170_000_000);
        expect(netBalance).toBe(0);
        expect(res.endingWipCost).toBe(0);
        expect(netBalance).toBe(res.endingWipCost);
      });

      it('Case A2: Partial waste (e.g. 20% material waste, 10% labor waste)', () => {
        const res = calculateManufacturingCost({
          regime: 'CIRCULAR_133',
          beginningWip: 0,
          actualDirectMaterial: 100_000_000,
          normalDirectMaterial: 80_000_000, // 20M abnormal
          actualDirectLabor: 50_000_000,
          normalDirectLabor: 45_000_000,    // 5M abnormal
          actualOverhead: 20_000_000,
          finishedUnits: 100,
          endingWipUnits: 0,
          wipMethod: 'DIRECT_MATERIAL',
        });

        const { debits, credits, netBalance } = get154Totals(res.journalEntries);
        expect(debits).toBe(170_000_000);
        expect(credits).toBe(170_000_000);
        expect(netBalance).toBe(0);
        expect(res.endingWipCost).toBe(0);
        expect(netBalance).toBe(res.endingWipCost);
      });

      it('Case A3: 100% waste (norm === 0 for both material and labor)', () => {
        const res = calculateManufacturingCost({
          regime: 'CIRCULAR_133',
          beginningWip: 0,
          actualDirectMaterial: 100_000_000,
          normalDirectMaterial: 0, // 100% abnormal
          actualDirectLabor: 50_000_000,
          normalDirectLabor: 0,    // 100% abnormal
          actualOverhead: 20_000_000,
          finishedUnits: 100,
          endingWipUnits: 0,
          wipMethod: 'DIRECT_MATERIAL',
        });

        const { debits, credits, netBalance } = get154Totals(res.journalEntries);
        // Debits: 100M + 50M + 20M = 170M
        // Credits: 150M (632) + 20M (155) = 170M
        expect(debits).toBe(170_000_000);
        expect(credits).toBe(170_000_000);
        expect(netBalance).toBe(0);
        expect(res.endingWipCost).toBe(0);
        expect(netBalance).toBe(res.endingWipCost);
      });
    });

    // --- Scenario B: Partial WIP with DIRECT_MATERIAL method ---
    describe('2.2. Partial WIP (Direct Material Method): Assert Debits - Credits === endingWipCost', () => {
      it('Case B1: 0% waste with ending WIP', () => {
        const res = calculateManufacturingCost({
          regime: 'CIRCULAR_133',
          beginningWip: 0,
          actualDirectMaterial: 100_000_000,
          normalDirectMaterial: 100_000_000,
          actualDirectLabor: 40_000_000,
          normalDirectLabor: 40_000_000,
          actualOverhead: 20_000_000,
          finishedUnits: 80,
          endingWipUnits: 20, // totalUnits = 100, 20% in WIP
          wipMethod: 'DIRECT_MATERIAL',
        });

        // unitMaterialWip = 100M / 100 = 1M -> endingWipCost = 20M
        expect(res.endingWipCost).toBe(20_000_000);
        const { debits, credits, netBalance } = get154Totals(res.journalEntries);
        // Debits = 160M, Credits = totalCostZ (140M)
        expect(debits).toBe(160_000_000);
        expect(credits).toBe(140_000_000);
        expect(netBalance).toBe(res.endingWipCost);
      });

      it('Case B2: Partial waste with ending WIP', () => {
        const res = calculateManufacturingCost({
          regime: 'CIRCULAR_133',
          beginningWip: 0,
          actualDirectMaterial: 120_000_000,
          normalDirectMaterial: 100_000_000, // 20M abnormal
          actualDirectLabor: 40_000_000,
          normalDirectLabor: 30_000_000,     // 10M abnormal
          actualOverhead: 15_000_000,
          finishedUnits: 80,
          endingWipUnits: 20,
          wipMethod: 'DIRECT_MATERIAL',
        });

        const { debits, credits, netBalance } = get154Totals(res.journalEntries);
        expect(debits).toBe(175_000_000);
        expect(credits).toBe(175_000_000 - res.endingWipCost);
        expect(netBalance).toBe(res.endingWipCost);
      });

      it('Case B3: 100% waste with ending WIP (norm === 0)', () => {
        const res = calculateManufacturingCost({
          regime: 'CIRCULAR_133',
          beginningWip: 0,
          actualDirectMaterial: 80_000_000,
          normalDirectMaterial: 0, // 100% abnormal
          actualDirectLabor: 40_000_000,
          normalDirectLabor: 0,    // 100% abnormal
          actualOverhead: 20_000_000,
          finishedUnits: 60,
          endingWipUnits: 40,
          wipMethod: 'DIRECT_MATERIAL',
        });

        // Direct material method absorbs 0 material (normalMat = 0), so endingWipCost = 0
        expect(res.endingWipCost).toBe(0);
        const { debits, credits, netBalance } = get154Totals(res.journalEntries);
        expect(debits).toBe(140_000_000);
        expect(credits).toBe(140_000_000);
        expect(netBalance).toBe(0);
        expect(netBalance).toBe(res.endingWipCost);
      });
    });

    // --- Scenario C: Partial WIP with EQUIVALENT_UNITS (EUP) method ---
    describe('2.3. Partial WIP (EUP Method): Assert Debits - Credits === endingWipCost', () => {
      const completionRates = [20, 33, 50, 75, 90];

      for (const h of completionRates) {
        it(`Case C (EUP at ${h}% completion): Debits - Credits === endingWipCost across waste levels`, () => {
          // Test with partial waste
          const res = calculateManufacturingCost({
            regime: 'CIRCULAR_133',
            beginningWip: 0,
            actualDirectMaterial: 90_000_000,
            normalDirectMaterial: 80_000_000, // 10M abnormal
            actualDirectLabor: 60_000_000,
            normalDirectLabor: 50_000_000,    // 10M abnormal
            actualOverhead: 30_000_000,
            finishedUnits: 70,
            endingWipUnits: 30,
            completionPercentage: h,
            wipMethod: 'EQUIVALENT_UNITS',
          });

          const { debits, credits, netBalance } = get154Totals(res.journalEntries);
          expect(debits - credits).toBe(netBalance);
          expect(netBalance).toBe(res.endingWipCost);
        });
      }
    });

    // --- Scenario D: 100% WIP (finishedUnits === 0) ---
    describe('2.4. 100% WIP Scenarios (finishedUnits === 0): Assert Debits - Credits === endingWipCost', () => {
      it('Case D1: finishedUnits === 0 with endingWipUnits > 0', () => {
        const res = calculateManufacturingCost({
          regime: 'CIRCULAR_133',
          beginningWip: 0,
          actualDirectMaterial: 75_000_000,
          normalDirectMaterial: 60_000_000,
          actualDirectLabor: 35_000_000,
          normalDirectLabor: 30_000_000,
          actualOverhead: 15_000_000,
          finishedUnits: 0,
          endingWipUnits: 100,
          wipMethod: 'DIRECT_MATERIAL',
        });

        // totalCostZ must be 0
        expect(res.totalCostZ).toBe(0);
        // endingWipCost must equal totalEligibleCost (60M + 30M + 15M = 105M)
        expect(res.endingWipCost).toBe(105_000_000);

        const { debits, credits, netBalance } = get154Totals(res.journalEntries);
        expect(debits).toBe(125_000_000);
        expect(credits).toBe(20_000_000);
        expect(netBalance).toBe(res.endingWipCost);
      });

      it('Case D2: Pathological case: finishedUnits === 0 AND endingWipUnits === 0', () => {
        const res = calculateManufacturingCost({
          regime: 'CIRCULAR_133',
          beginningWip: 0,
          actualDirectMaterial: 50_000_000,
          normalDirectMaterial: 40_000_000,
          actualDirectLabor: 20_000_000,
          normalDirectLabor: 20_000_000,
          actualOverhead: 10_000_000,
          finishedUnits: 0,
          endingWipUnits: 0,
          wipMethod: 'DIRECT_MATERIAL',
        });

        expect(res.totalCostZ).toBe(0);
        const { netBalance } = get154Totals(res.journalEntries);
        expect(netBalance).toBe(res.endingWipCost);
      });
    });

    // --- Scenario E: Beginning WIP > 0: General Asset Account Invariant ---
    describe('2.5. Beginning WIP > 0: Assert Debits - Credits === endingWipCost - beginningWip', () => {
      it('Maintains general asset account balance equation: D_ck = D_dk + Phát sinh Nợ - Phát sinh Có', () => {
        const beginningWip = 25_000_000;
        const res = calculateManufacturingCost({
          regime: 'CIRCULAR_133',
          beginningWip,
          actualDirectMaterial: 110_000_000,
          normalDirectMaterial: 90_000_000,
          actualDirectLabor: 45_000_000,
          normalDirectLabor: 40_000_000,
          actualOverhead: 20_000_000,
          finishedUnits: 80,
          endingWipUnits: 20,
          wipMethod: 'DIRECT_MATERIAL',
        });

        const { debits, credits, netBalance } = get154Totals(res.journalEntries);
        expect(debits - credits).toBe(netBalance);
        // General asset rule: netBalance = endingWipCost - beginningWip
        expect(netBalance).toBe(res.endingWipCost - beginningWip);
      });
    });

    // --- Scenario F: Circular 133 Account Isolation & Voucher Integrity ---
    describe('2.6. Circular 133 Account Isolation & Double-Entry Integrity', () => {
      it('Prohibits accounts 621, 622, 623, 627, 157 and uses strictly legal counter-accounts', () => {
        const res = calculateManufacturingCost({
          regime: 'CIRCULAR_133',
          beginningWip: 10_000_000,
          actualDirectMaterial: 100_000_000,
          normalDirectMaterial: 80_000_000,
          actualDirectLabor: 50_000_000,
          normalDirectLabor: 40_000_000,
          actualOverhead: 20_000_000,
          finishedUnits: 90,
          endingWipUnits: 10,
          wipMethod: 'DIRECT_MATERIAL',
        });

        for (const entry of res.journalEntries) {
          // No intermediate 62x accounts or 157
          expect(entry.debitAccount.startsWith('62')).toBe(false);
          expect(entry.creditAccount.startsWith('62')).toBe(false);
          expect(entry.debitAccount).not.toBe('157');
          expect(entry.creditAccount).not.toBe('157');

          // Valid debit/credit pairs
          if (entry.debitAccount === '154') {
            expect(['152', '334', '111']).toContain(entry.creditAccount);
          }
          if (entry.creditAccount === '154') {
            expect(['632', '155']).toContain(entry.debitAccount);
          }
        }
      });
    });

    // --- Scenario G: Monte Carlo Invariant Matrix (100 random permutations) ---
    describe('2.7. Monte Carlo Invariant Matrix (100 permutations under Circular 133)', () => {
      it('guarantees Debits - Credits === endingWipCost - beginningWip across 100 randomized inputs', () => {
        for (let i = 0; i < 100; i++) {
          const actualMat = Math.floor(Math.random() * 200_000_000);
          const normMat = Math.random() < 0.2 ? 0 : Math.floor(Math.random() * (actualMat * 1.2));
          const actualLab = Math.floor(Math.random() * 100_000_000);
          const normLab = Math.random() < 0.2 ? 0 : Math.floor(Math.random() * (actualLab * 1.2));
          const actualOvh = Math.floor(Math.random() * 50_000_000);
          const beginningWip = Math.floor(Math.random() * 30_000_000);
          const finishedUnits = Math.floor(Math.random() * 200);
          const endingWipUnits = Math.floor(Math.random() * 100);
          const wipMethod = Math.random() < 0.5 ? 'DIRECT_MATERIAL' : 'EQUIVALENT_UNITS';
          const completionPercentage = Math.floor(Math.random() * 100);

          const res = calculateManufacturingCost({
            regime: 'CIRCULAR_133',
            beginningWip,
            actualDirectMaterial: actualMat,
            normalDirectMaterial: normMat,
            actualDirectLabor: actualLab,
            normalDirectLabor: normLab,
            actualOverhead: actualOvh,
            finishedUnits,
            endingWipUnits,
            wipMethod,
            completionPercentage,
          });

          const { debits, credits, netBalance } = get154Totals(res.journalEntries);
          expect(debits - credits).toBe(netBalance);
          expect(netBalance).toBe(res.endingWipCost - beginningWip);
        }
      });
    });
  });
});
