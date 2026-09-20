import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  getHintsForScenario,
  getHintByLevel,
  getAllScenarioHints,
} from '@/data/socratic-hints';
import { SocraticHintLadder } from '@/components/workbench/SocraticHintLadder';
import { Journalizer } from '@/components/workbench/Journalizer';
import { formatVnd } from '@/components/curriculum/TAccountView';

describe('CHALLENGER M2: Anti-Spoil Gating & Progression Empirical Stress Harness', () => {
  afterEach(() => {
    cleanup();
  });

  describe('1. Direct Level 3 Gating & Event Dispatch Attacks at Level 1', () => {
    it('Level 3 step button has HTML disabled attribute and lock icon on initial render', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      const button3 = screen.getByTestId('hint-step-button-3');
      expect(button3).toBeDisabled();
      expect(button3.getAttribute('disabled')).not.toBeNull();

      const lockIcon3 = screen.getByTestId('lock-icon-3');
      expect(lockIcon3).toBeInTheDocument();

      const button2 = screen.getByTestId('hint-step-button-2');
      expect(button2).toBeDisabled();
      expect(screen.getByTestId('lock-icon-2')).toBeInTheDocument();

      // Ensure Level 1 is active and not disabled
      const button1 = screen.getByTestId('hint-step-button-1');
      expect(button1).not.toBeDisabled();
    });

    it('Level 2 and Level 3 content are completely absent from DOM (no CSS hidden leaks)', () => {
      const { container } = render(<SocraticHintLadder scenarioId="scen-01" />);

      // Level 1 content present
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();

      // Level 2 & 3 content cards must NOT exist in DOM tree at all
      expect(screen.queryByTestId('level-2-content')).toBeNull();
      expect(screen.queryByTestId('level-3-content')).toBeNull();

      // Verify twin case text is not present anywhere in DOM text
      expect(container.textContent).not.toContain('Nghiệp vụ mẫu song sinh');
      expect(container.textContent).not.toContain('Bút toán định khoản mẫu tương tự');
      expect(container.textContent).not.toContain('Câu hỏi định hướng tư duy');
    });

    it('fireEvent.click on disabled Level 3 button is blocked and does not change level', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      const button3 = screen.getByTestId('hint-step-button-3');
      fireEvent.click(button3);

      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.queryByTestId('level-3-content')).toBeNull();
      expect(screen.getAllByText(/Nấc 1: Định vị/i).length).toBeGreaterThan(0);
    });

    it('native MouseEvent dispatch to Level 3 button does not bypass anti-spoil guardrail', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      const button3 = screen.getByTestId('hint-step-button-3');
      act(() => {
        button3.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });

      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.queryByTestId('level-3-content')).toBeNull();
    });

    it('adversarial DevTools bypass: stripping disabled attribute and clicking still fails internal level gate', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      const button3 = screen.getByTestId('hint-step-button-3');

      // Simulate a malicious user opening DevTools and removing the disabled attribute
      button3.removeAttribute('disabled');
      expect(button3).not.toBeDisabled();

      // Attempt to click the hacked element
      fireEvent.click(button3);

      // SocraticHintLadder internal guard `if (lvl <= maxUnlockedLevel)` must prevent state change
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.queryByTestId('level-3-content')).toBeNull();
      expect(screen.getByTestId('hint-step-button-3')).toBeInTheDocument();
    });

    it('keyboard events (Enter, Space) on Level 3 button do not trigger unlock', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      const button3 = screen.getByTestId('hint-step-button-3');

      fireEvent.keyDown(button3, { key: 'Enter', code: 'Enter', charCode: 13 });
      fireEvent.keyPress(button3, { key: 'Enter', code: 'Enter', charCode: 13 });
      fireEvent.keyUp(button3, { key: 'Enter', code: 'Enter', charCode: 13 });

      fireEvent.keyDown(button3, { key: ' ', code: 'Space', charCode: 32 });
      fireEvent.keyPress(button3, { key: ' ', code: 'Space', charCode: 32 });
      fireEvent.keyUp(button3, { key: ' ', code: 'Space', charCode: 32 });

      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.queryByTestId('level-3-content')).toBeNull();
    });

    it('unlock-level-3-button does NOT exist in DOM while learner is at Level 1', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      expect(screen.getByTestId('unlock-level-2-button')).toBeInTheDocument();
      expect(screen.queryByTestId('unlock-level-3-button')).toBeNull();
    });

    it('unlocking Level 2 leaves Level 3 strictly locked until Level 2 step is resolved', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      // Unlock Level 2
      fireEvent.click(screen.getByTestId('unlock-level-2-button'));

      expect(screen.getByTestId('level-2-content')).toBeInTheDocument();
      expect(screen.queryByTestId('level-3-content')).toBeNull();

      // Button 3 is STILL locked and disabled
      const button3 = screen.getByTestId('hint-step-button-3');
      expect(button3).toBeDisabled();
      expect(screen.getByTestId('lock-icon-3')).toBeInTheDocument();

      // Clicking button 3 does nothing
      fireEvent.click(button3);
      expect(screen.queryByTestId('level-3-content')).toBeNull();

      // DevTools hack on button 3 while at Level 2 (testing 3 <= 2)
      button3.removeAttribute('disabled');
      fireEvent.click(button3);
      expect(screen.queryByTestId('level-3-content')).toBeNull();
    });
  });

  describe('2. Rapid Scenario Switching & Concurrency Stress', () => {
    it('reliably resets to Level 1 across 30 rapid alternating scenario transitions', () => {
      const { rerender } = render(<SocraticHintLadder scenarioId="scen-01" />);

      // Advance initially to Level 2
      fireEvent.click(screen.getByTestId('unlock-level-2-button'));
      expect(screen.getByTestId('level-2-content')).toBeInTheDocument();

      // Sequence of rapid scenario changes (each different from preceding one)
      const scenarioSequence = [
        'scen-02', 'scen-03', 'scen-01', 'scen-04', 'scen-05', 'scen-custom',
        'scen-02', 'scen-01', 'scen-03', 'scen-05', 'scen-04', 'scen-custom',
        'scen-03', 'scen-02', 'scen-01', 'scen-04', 'scen-custom', 'scen-05',
        'scen-01', 'scen-03', 'scen-02', 'scen-05', 'scen-custom', 'scen-04',
        'scen-02', 'scen-04', 'scen-01', 'scen-03', 'scen-05', 'scen-custom',
      ];

      for (let i = 0; i < scenarioSequence.length; i++) {
        const nextScenId = scenarioSequence[i];

        // Rapid rerender with different scenario
        rerender(<SocraticHintLadder scenarioId={nextScenId} />);

        // Invariant check: Must ALWAYS reset to Level 1
        expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
        expect(screen.queryByTestId('level-2-content')).toBeNull();
        expect(screen.queryByTestId('level-3-content')).toBeNull();

        const btn2 = screen.getByTestId('hint-step-button-2');
        const btn3 = screen.getByTestId('hint-step-button-3');
        expect(btn2).toBeDisabled();
        expect(btn3).toBeDisabled();

        // Unlock to Level 2 or Level 3 before next switch to stress-test reset logic
        if (i % 2 === 0) {
          const unlock2 = screen.queryByTestId('unlock-level-2-button');
          if (unlock2) {
            fireEvent.click(unlock2);
            expect(screen.getByTestId('level-2-content')).toBeInTheDocument();
          }
        }
      }
    });

    it('anti-retention verification: unlocking Level 3 on scen-01 and switching away resets scen-01 on return', () => {
      const { rerender } = render(<SocraticHintLadder scenarioId="scen-01" />);

      // Unlock scen-01 fully to Level 3
      fireEvent.click(screen.getByTestId('unlock-level-2-button'));
      fireEvent.click(screen.getByTestId('unlock-level-3-button'));
      expect(screen.getByTestId('level-3-content')).toBeInTheDocument();

      // Switch to scen-02
      rerender(<SocraticHintLadder scenarioId="scen-02" />);
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.getByTestId('hint-step-button-2')).toBeDisabled();
      expect(screen.getByTestId('hint-step-button-3')).toBeDisabled();

      // Switch back to scen-01: must NOT retain Level 3 (prevents stale solution exposure)
      rerender(<SocraticHintLadder scenarioId="scen-01" />);
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.queryByTestId('level-3-content')).toBeNull();
      expect(screen.getByTestId('hint-step-button-2')).toBeDisabled();
      expect(screen.getByTestId('hint-step-button-3')).toBeDisabled();
    });

    it('switching scenarios while collapsed preserves Level 1 reset upon expansion', () => {
      const { rerender } = render(<SocraticHintLadder scenarioId="scen-01" />);

      // Advance to Level 2
      fireEvent.click(screen.getByTestId('unlock-level-2-button'));
      expect(screen.getByTestId('level-2-content')).toBeInTheDocument();

      // Collapse the ladder
      const toggleBtn = screen.getByTitle(/Thu gọn gợi ý/i);
      fireEvent.click(toggleBtn);
      expect(screen.queryByTestId('level-2-content')).toBeNull();

      // Switch scenario to scen-03 while collapsed
      rerender(<SocraticHintLadder scenarioId="scen-03" />);

      // Expand the ladder
      const expandBtn = screen.getByTitle(/Mở rộng gợi ý/i);
      fireEvent.click(expandBtn);

      // Must be at Level 1 for scen-03
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.getByText(/Nhóm TK 511 - Doanh thu bán hàng/i)).toBeInTheDocument();
      expect(screen.getByTestId('hint-step-button-2')).toBeDisabled();
    });

    it('Journalizer integration: rapid switching between scenario buttons in workbench resets ladder', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      // Ladder is rendered
      expect(screen.getByTestId('socratic-hint-ladder')).toBeInTheDocument();

      // Advance scen-01 to Level 2
      fireEvent.click(screen.getByTestId('unlock-level-2-button'));
      expect(screen.getByTestId('level-2-content')).toBeInTheDocument();

      // Click Scenario 3 button
      const scen3Btn = screen.getByText(/Xuất bán hàng hóa thu tiền ngay qua chuyển khoản/i);
      fireEvent.click(scen3Btn);

      // Ladder resets to Level 1 for scenario 3
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.getByText(/Nhóm TK 511 - Doanh thu bán hàng/i)).toBeInTheDocument();
      expect(screen.getByTestId('hint-step-button-2')).toBeDisabled();

      // Click Scenario 2 button
      const scen2Btn = screen.getByText(/Mua nguyên vật liệu nhập kho chưa trả tiền người bán/i);
      fireEvent.click(scen2Btn);

      // Ladder resets to Level 1 for scenario 2
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.getByText(/Nhóm TK 152 - Nguyên liệu, vật liệu/i)).toBeInTheDocument();
      expect(screen.getByTestId('hint-step-button-2')).toBeDisabled();
    });
  });

  describe('3. Malicious / Boundary Input & Edge Case Stress', () => {
    it('handles invalid, empty, or non-existent scenarioId strings without throwing', () => {
      const invalidIds = [
        '',
        'non-existent-scenario',
        'scen-999',
        'null',
        'undefined',
        '../../sensitive/path',
        '<script>alert(1)</script>',
        '    \t\n  ',
      ];

      for (const badId of invalidIds) {
        const { container } = render(<SocraticHintLadder scenarioId={badId} />);
        // Should safely render nothing (null)
        expect(container.firstChild).toBeNull();
        cleanup();
      }
    });

    it('getHintByLevel data helper safely returns undefined for boundary and invalid level numbers', () => {
      const invalidLevels = [
        0 as unknown as 1,
        -1 as unknown as 1,
        4 as unknown as 1,
        999 as unknown as 1,
        NaN as unknown as 1,
        Infinity as unknown as 1,
        -Infinity as unknown as 1,
      ];

      for (const badLevel of invalidLevels) {
        expect(getHintByLevel('scen-01', badLevel)).toBeUndefined();
      }

      // Invalid scenario IDs
      expect(getHintByLevel('', 1)).toBeUndefined();
      expect(getHintByLevel('unknown', 2)).toBeUndefined();
    });

    it('getHintsForScenario returns undefined for invalid scenario queries', () => {
      expect(getHintsForScenario('')).toBeUndefined();
      expect(getHintsForScenario('not-found')).toBeUndefined();
      expect(getHintsForScenario('scen-null')).toBeUndefined();
    });

    it('all registered scenarios strictly obey the SocraticHint interface contract', () => {
      const allHints = getAllScenarioHints();
      const scenarioKeys = Object.keys(allHints);

      expect(scenarioKeys.length).toBe(6);

      scenarioKeys.forEach((key) => {
        const scenario = allHints[key];
        expect(scenario.scenarioId).toBe(key);
        expect(scenario.scenarioTitle).toBeTruthy();
        expect(scenario.hints).toHaveLength(3);

        const [lvl1, lvl2, lvl3] = scenario.hints;

        // Level 1: Positioning
        expect(lvl1.level).toBe(1);
        expect(lvl1.title).toMatch(/Nấc 1/i);
        expect(lvl1.content).toBeTruthy();
        expect(lvl1.suggestedAccountGroups).toBeDefined();
        expect(lvl1.suggestedAccountGroups!.length).toBeGreaterThan(0);
        expect(lvl1.twinCase).toBeUndefined();

        // Level 2: Nature / Questions
        expect(lvl2.level).toBe(2);
        expect(lvl2.title).toMatch(/Nấc 2/i);
        expect(lvl2.content).toBeTruthy();
        expect(lvl2.reflectiveQuestions).toBeDefined();
        expect(lvl2.reflectiveQuestions!.length).toBeGreaterThanOrEqual(2);
        expect(lvl2.twinCase).toBeUndefined();

        // Level 3: Twin Case & Invariants
        expect(lvl3.level).toBe(3);
        expect(lvl3.title).toMatch(/Nấc 3/i);
        expect(lvl3.content).toBeTruthy();
        expect(lvl3.twinCase).toBeDefined();

        const twin = lvl3.twinCase!;
        expect(twin.scenario).toBeTruthy();
        expect(twin.explanation).toBeTruthy();
        expect(twin.sampleJournal.length).toBeGreaterThanOrEqual(2);

        // Invariant: sum(Debit) === sum(Credit) > 0
        const sumDebit = twin.sampleJournal.reduce((s, r) => s + r.debit, 0);
        const sumCredit = twin.sampleJournal.reduce((s, r) => s + r.credit, 0);
        expect(sumDebit).toBeGreaterThan(0);
        expect(sumDebit).toEqual(sumCredit);

        // Row format invariant: accountCode between 3 and 6 digits (e.g. 1111, 33311)
        twin.sampleJournal.forEach((row) => {
          expect(row.accountCode).toMatch(/^\d{3,6}$/);
          expect(row.accountName.length).toBeGreaterThan(0);
          expect(row.debit).toBeGreaterThanOrEqual(0);
          expect(row.credit).toBeGreaterThanOrEqual(0);
          expect(row.debit > 0 || row.credit > 0).toBe(true);
        });
      });
    });

    it('renders correctly with initiallyOpen=false prop and allows expansion', () => {
      render(<SocraticHintLadder scenarioId="scen-01" initiallyOpen={false} />);

      // Header is rendered
      expect(screen.getByText(/Nấc Thang Gợi Ý Socratic/i)).toBeInTheDocument();

      // Body is collapsed
      expect(screen.queryByTestId('level-1-content')).toBeNull();

      // Expand button is labeled
      const expandBtn = screen.getByTitle(/Mở rộng gợi ý/i);
      fireEvent.click(expandBtn);

      // Now Level 1 is visible
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
    });

    it('renders with different accounting regimes (TT200, TT133, and omitted) cleanly', () => {
      const { rerender } = render(
        <SocraticHintLadder scenarioId="scen-05" currentRegime="CIRCULAR_200" />
      );
      expect(screen.getByText(/\[TT 200\]/i)).toBeInTheDocument();

      rerender(<SocraticHintLadder scenarioId="scen-05" currentRegime="CIRCULAR_133" />);
      expect(screen.getByText(/\[TT 133\]/i)).toBeInTheDocument();

      rerender(<SocraticHintLadder scenarioId="scen-05" currentRegime={undefined} />);
      expect(screen.queryByText(/\[TT 200\]/i)).toBeNull();
      expect(screen.queryByText(/\[TT 133\]/i)).toBeNull();
    });

    it('handles formatVnd formatting within twin case sample journal across extreme amounts', () => {
      expect(formatVnd(0)).toBe('0 đ');
      expect(formatVnd(1000000)).toMatch(/1[.,\s]?000[.,\s]?000/);
      expect(formatVnd(999999999999)).toMatch(/999/);
    });

    it('Reset button "Đặt lại" resets progression to Level 1 and then disappears from header', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      // At Level 1, "Đặt lại" button is NOT displayed
      expect(screen.queryByTitle(/Đặt lại nấc thang gợi ý về Nấc 1/i)).toBeNull();

      // Advance to Level 2
      fireEvent.click(screen.getByTestId('unlock-level-2-button'));
      expect(screen.getByTestId('level-2-content')).toBeInTheDocument();

      // Now "Đặt lại" button appears
      const resetBtn = screen.getByTitle(/Đặt lại nấc thang gợi ý về Nấc 1/i);
      expect(resetBtn).toBeInTheDocument();

      // Click "Đặt lại"
      fireEvent.click(resetBtn);

      // Resets to Level 1, Level 2 is locked again
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.getByTestId('hint-step-button-2')).toBeDisabled();
      expect(screen.getByTestId('hint-step-button-3')).toBeDisabled();

      // "Đặt lại" button disappears again
      expect(screen.queryByTitle(/Đặt lại nấc thang gợi ý về Nấc 1/i)).toBeNull();
    });
  });
});
