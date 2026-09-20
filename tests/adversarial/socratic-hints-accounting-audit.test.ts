import { describe, it, expect } from 'vitest';
import { SCENARIO_HINTS, getHintsForScenario, getHintByLevel } from '../../src/data/socratic-hints';
import { COA_CIRCULAR_200 } from '../../src/data/coa-circular-200';
import { COA_CIRCULAR_133 } from '../../src/data/coa-circular-133';
import { PRACTICE_SCENARIOS } from '../../src/components/workbench/Journalizer';

describe('Adversarial Mathematical & Accounting Integrity Audit of Socratic Hints', () => {
  const coa200Codes = new Set(COA_CIRCULAR_200.map((a) => a.code));
  const coa133Codes = new Set(COA_CIRCULAR_133.map((a) => a.code));
  const allValidCodes = new Set([...coa200Codes, ...coa133Codes]);

  const scenarioKeys = Object.keys(SCENARIO_HINTS);

  it('audits scenario coverage: all PRACTICE_SCENARIOS have corresponding SCENARIO_HINTS', () => {
    for (const practice of PRACTICE_SCENARIOS) {
      expect(SCENARIO_HINTS[practice.id]).toBeDefined();
      expect(getHintsForScenario(practice.id)).toBeDefined();
    }
  });

  describe('Audit 1: Mathematical Balance & Invariants in Twin Cases', () => {
    for (const key of scenarioKeys) {
      const scenarioHint = SCENARIO_HINTS[key];
      const level3 = scenarioHint.hints.find((h) => h.level === 3);

      it(`[${key}] twin case exists with valid sampleJournal`, () => {
        expect(level3).toBeDefined();
        expect(level3?.twinCase).toBeDefined();
        const twin = level3!.twinCase!;
        expect(twin.scenario).toBeTruthy();
        expect(twin.explanation).toBeTruthy();
        expect(Array.isArray(twin.sampleJournal)).toBe(true);
        expect(twin.sampleJournal.length).toBeGreaterThanOrEqual(2);
      });

      it(`[${key}] sampleJournal satisfies strict Double-Entry Balance: sum(Debit) === sum(Credit) > 0`, () => {
        const twin = level3!.twinCase!;
        let totalDebit = 0;
        let totalCredit = 0;

        for (const row of twin.sampleJournal) {
          // No NaN or negative numbers
          expect(Number.isFinite(row.debit)).toBe(true);
          expect(Number.isFinite(row.credit)).toBe(true);
          expect(row.debit).toBeGreaterThanOrEqual(0);
          expect(row.credit).toBeGreaterThanOrEqual(0);
          // A single line cannot have both debit and credit
          expect(row.debit > 0 && row.credit > 0).toBe(false);
          // At least one side must be > 0
          expect(row.debit > 0 || row.credit > 0).toBe(true);

          totalDebit += row.debit;
          totalCredit += row.credit;
        }

        // Strictly positive
        expect(totalDebit).toBeGreaterThan(0);
        expect(totalCredit).toBeGreaterThan(0);

        // Strict mathematical equality
        expect(totalDebit).toBe(totalCredit);
      });
    }
  });

  describe('Audit 2: Chart of Accounts Validity (TT200 / TT133)', () => {
    for (const key of scenarioKeys) {
      const scenarioHint = SCENARIO_HINTS[key];
      const level3 = scenarioHint.hints.find((h) => h.level === 3);

      it(`[${key}] all account codes in twin case exist in Circular 200 or 133`, () => {
        const twin = level3!.twinCase!;
        for (const row of twin.sampleJournal) {
          const code = row.accountCode;
          const exists = allValidCodes.has(code);
          if (!exists) {
            console.error(`Invalid account code: ${code} in scenario ${key}`);
          }
          expect(exists).toBe(true);

          // Find definition in COA
          const item200 = COA_CIRCULAR_200.find((a) => a.code === code);
          const item133 = COA_CIRCULAR_133.find((a) => a.code === code);
          const item = item200 || item133;
          expect(item).toBeDefined();
          expect(row.accountName).toBeTruthy();
        }
      });
    }
  });

  describe('Audit 3: Level 1 Anti-Spoil Guardrails (No Full Entries Given Away)', () => {
    for (const key of scenarioKeys) {
      const scenarioHint = SCENARIO_HINTS[key];
      const level1 = scenarioHint.hints.find((h) => h.level === 1);
      const practiceScenario = PRACTICE_SCENARIOS.find((s) => s.id === key);

      it(`[${key}] Level 1 does not disclose complete journal entry with exact amounts and sides`, () => {
        expect(level1).toBeDefined();
        expect(level1?.suggestedAccountGroups).toBeDefined();
        expect(level1!.suggestedAccountGroups!.length).toBeGreaterThan(0);

        const level1Text = (level1!.content + ' ' + level1!.suggestedAccountGroups!.join(' ')).toLowerCase();

        // Level 1 should not contain direct journal formatting e.g. "nợ tk ...: [số tiền]" or "có tk ...: [số tiền]"
        const debitCreditAmountRegex = /(nợ\s+(tk\s*)?\d+.*có\s+(tk\s*)?\d+.*\d{3,})|(ghi\s+nợ\s+.*ghi\s+có\s+.*\d{3,})/i;
        expect(debitCreditAmountRegex.test(level1Text)).toBe(false);

        // If practice scenario has specific amounts, Level 1 must not reveal those exact amounts
        if (practiceScenario && practiceScenario.rows) {
          const amounts = practiceScenario.rows
            .flatMap((r) => [r.debitAmount, r.creditAmount])
            .filter((amt) => amt > 0);

          for (const amt of amounts) {
            const formattedAmt = amt.toLocaleString('vi-VN');
            const rawAmtStr = amt.toString();
            expect(level1Text).not.toContain(rawAmtStr);
            expect(level1Text).not.toContain(formattedAmt);
          }
        }
      });
    }
  });

  describe('Audit 4: Level 2 Accounting Equation Reflection', () => {
    for (const key of scenarioKeys) {
      const scenarioHint = SCENARIO_HINTS[key];
      const level2 = scenarioHint.hints.find((h) => h.level === 2);

      it(`[${key}] Level 2 prompts reflection on accounting equation and nature without direct solution`, () => {
        expect(level2).toBeDefined();
        expect(level2?.reflectiveQuestions).toBeDefined();
        expect(level2!.reflectiveQuestions!.length).toBeGreaterThanOrEqual(2);

        const allQuestions = level2!.reflectiveQuestions!.join(' ').toLowerCase();

        // Must prompt on asset, liability, equity, revenue, expense, debit, or credit
        const keywords = ['tài sản', 'nguồn vốn', 'nợ phải trả', 'doanh thu', 'chi phí', 'nợ', 'có', 'biến động', 'cân bằng', 'đối ứng'];
        const matches = keywords.filter((kw) => allQuestions.includes(kw));
        expect(matches.length).toBeGreaterThanOrEqual(2);

        // Must NOT give away the exact direct solution like "Định khoản: Nợ 1111 50tr Có 1121 50tr"
        expect(allQuestions).not.toMatch(/định khoản:\s*nợ/i);
        expect(allQuestions).not.toMatch(/đáp án là/i);
      });
    }
  });

  describe('Audit 5: Level 3 Isomorphic Analogy (Not an Exact Clone of Target Scenario)', () => {
    for (const key of scenarioKeys) {
      if (key === 'scen-custom') continue; // custom has no fixed practice scenario

      const scenarioHint = SCENARIO_HINTS[key];
      const level3 = scenarioHint.hints.find((h) => h.level === 3);
      const practiceScenario = PRACTICE_SCENARIOS.find((s) => s.id === key);

      it(`[${key}] Level 3 twin case is analogous/isomorphic, not identical copy of scenario`, () => {
        const twin = level3!.twinCase!;
        if (practiceScenario && practiceScenario.rows.length > 0) {
          const practiceAmounts = practiceScenario.rows
            .flatMap((r) => [r.debitAmount, r.creditAmount])
            .filter((a) => a > 0);
          const twinAmounts = twin.sampleJournal
            .flatMap((r) => [r.debit, r.credit])
            .filter((a) => a > 0);

          // The twin case amounts should be different from the practice scenario amounts (analogous test data)
          const isIdenticalAmounts =
            practiceAmounts.length === twinAmounts.length &&
            practiceAmounts.every((val, idx) => val === twinAmounts[idx]);

          expect(isIdenticalAmounts).toBe(false);
        }
      });
    }
  });

  describe('Audit 6: Socratic Hint API Functions & Structure', () => {
    it('verifies getHintByLevel for all scenarios and levels', () => {
      for (const key of scenarioKeys) {
        for (const lvl of [1, 2, 3] as const) {
          const hint = getHintByLevel(key, lvl);
          expect(hint).toBeDefined();
          expect(hint?.level).toBe(lvl);
        }
      }
      expect(getHintByLevel('non-existent', 1)).toBeUndefined();
      expect(getHintsForScenario('non-existent')).toBeUndefined();
    });
  });
});
