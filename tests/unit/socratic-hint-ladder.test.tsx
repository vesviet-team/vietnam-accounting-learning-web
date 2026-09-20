import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  SCENARIO_HINTS,
  getHintsForScenario,
  getHintByLevel,
  getAllScenarioHints,
} from '@/data/socratic-hints';
import { SocraticHintLadder } from '@/components/workbench/SocraticHintLadder';
import { Journalizer } from '@/components/workbench/Journalizer';

describe('SOCRATIC HINT LADDER (R2) UNIT TESTS', () => {
  describe('1. Data Integrity & Pedagogical Contract', () => {
    it('should provide rich 3-tier hints for all journalizer scenarios', () => {
      const scenarioIds = ['scen-01', 'scen-02', 'scen-03', 'scen-04', 'scen-05', 'scen-custom'];
      const allHints = getAllScenarioHints();

      expect(Object.keys(SCENARIO_HINTS).length).toBe(6);
      scenarioIds.forEach((id) => {
        expect(allHints[id]).toBeDefined();
        expect(allHints[id].hints).toHaveLength(3);
        expect(allHints[id].hints.map((h) => h.level)).toEqual([1, 2, 3]);
      });
    });

    it('Level 1 (Positioning / Định vị) suggests account groups without revealing full entries', () => {
      const hints = getHintsForScenario('scen-01');
      expect(hints).toBeDefined();

      const level1 = hints!.hints.find((h) => h.level === 1);
      expect(level1).toBeDefined();
      expect(level1?.title).toContain('Định vị');
      expect(level1?.suggestedAccountGroups).toBeDefined();
      expect(level1?.suggestedAccountGroups?.length).toBeGreaterThan(0);

      // Verify Level 1 does NOT contain twin case or reveal debit/credit entry numbers
      expect(level1?.twinCase).toBeUndefined();
      expect(level1?.reflectiveQuestions).toBeUndefined();
    });

    it('Level 2 (Nature / Bản chất) asks guiding reflective questions on asset/liability movements', () => {
      const hints = getHintsForScenario('scen-02');
      expect(hints).toBeDefined();

      const level2 = hints!.hints.find((h) => h.level === 2);
      expect(level2).toBeDefined();
      expect(level2?.title).toMatch(/Bản chất/i);
      expect(level2?.reflectiveQuestions).toBeDefined();
      expect(level2?.reflectiveQuestions?.length).toBeGreaterThanOrEqual(2);

      // Verify reflective questions guide thinking without giving away direct solution
      const questionsText = level2?.reflectiveQuestions?.join(' ') || '';
      expect(questionsText).toMatch(/tài sản|nguồn vốn|Nợ|Có|hàng tồn kho/i);
      expect(level2?.twinCase).toBeUndefined();
    });

    it('Level 3 (Twin Analogous Case / Mẫu tương tự) provides balanced isomorphic sample entries', () => {
      const hints = getHintsForScenario('scen-03');
      expect(hints).toBeDefined();

      const level3 = hints!.hints.find((h) => h.level === 3);
      expect(level3).toBeDefined();
      expect(level3?.title).toMatch(/Mẫu tương tự/i);
      expect(level3?.twinCase).toBeDefined();

      const twinCase = level3!.twinCase!;
      expect(twinCase.scenario).toBeTruthy();
      expect(twinCase.explanation).toBeTruthy();
      expect(twinCase.sampleJournal.length).toBeGreaterThanOrEqual(2);

      // Verify double-entry balance invariant in sample journal: sum(Debit) === sum(Credit) > 0
      const totalDebit = twinCase.sampleJournal.reduce((sum, r) => sum + r.debit, 0);
      const totalCredit = twinCase.sampleJournal.reduce((sum, r) => sum + r.credit, 0);
      expect(totalDebit).toBeGreaterThan(0);
      expect(totalDebit).toEqual(totalCredit);
    });

    it('getHintByLevel helper returns specific hint level or undefined if not found', () => {
      const hintLvl1 = getHintByLevel('scen-01', 1);
      expect(hintLvl1?.level).toBe(1);

      const hintLvl2 = getHintByLevel('scen-01', 2);
      expect(hintLvl2?.level).toBe(2);

      const hintLvl3 = getHintByLevel('scen-01', 3);
      expect(hintLvl3?.level).toBe(3);

      // Non-existent scenario
      expect(getHintByLevel('non-existent', 1)).toBeUndefined();
    });
  });

  describe('2. SocraticHintLadder UI Rendering & Stepper Badges', () => {
    it('should render ladder header, anti-spoil badge, and Level 1 content by default', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      expect(screen.getByText(/Nấc Thang Gợi Ý Socratic/i)).toBeInTheDocument();
      expect(screen.getByText(/Chống lộ đáp án \(Anti-Spoil\)/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Nấc 1: Định vị/i).length).toBeGreaterThan(0);

      // Account group suggestions visible in Level 1
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.getByText(/Nhóm TK 111 - Tiền mặt/i)).toBeInTheDocument();
      expect(screen.getByText(/Nhóm TK 112 - Tiền gửi ngân hàng/i)).toBeInTheDocument();

      // Next unlock button is present
      expect(screen.getByTestId('unlock-level-2-button')).toBeInTheDocument();
      expect(screen.getByText(/Tiếp theo: Gợi ý bản chất \(Nấc 2\)/i)).toBeInTheDocument();
    });

    it('should toggle collapse/expand when chevron button is clicked', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      const toggleBtn = screen.getByTitle(/Thu gọn gợi ý/i);
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(toggleBtn);
      expect(screen.queryByTestId('level-1-content')).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(toggleBtn);
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
    });
  });

  describe('3. Anti-Spoil Sequential Progression', () => {
    it('should prevent skipping directly to Level 2 or Level 3 initially', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      const stepBtn1 = screen.getByTestId('hint-step-button-1');
      const stepBtn2 = screen.getByTestId('hint-step-button-2');
      const stepBtn3 = screen.getByTestId('hint-step-button-3');

      expect(stepBtn1).not.toBeDisabled();
      expect(stepBtn2).toBeDisabled();
      expect(stepBtn3).toBeDisabled();

      // Lock icons visible on locked steps
      expect(screen.getByTestId('lock-icon-2')).toBeInTheDocument();
      expect(screen.getByTestId('lock-icon-3')).toBeInTheDocument();

      // Clicking locked step button 3 should do nothing
      fireEvent.click(stepBtn3);
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.queryByTestId('level-3-content')).not.toBeInTheDocument();
    });

    it('should unlock Level 2 only after clicking "Tiếp theo: Gợi ý bản chất (Nấc 2)"', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      // Unlock Level 2
      const unlockBtn2 = screen.getByTestId('unlock-level-2-button');
      fireEvent.click(unlockBtn2);

      // Now Level 2 is active
      expect(screen.getByTestId('level-2-content')).toBeInTheDocument();
      expect(screen.getAllByText(/Nấc 2: Bản chất/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Câu hỏi định hướng tư duy bản chất kế toán:/i)).toBeInTheDocument();

      // Level 3 is STILL locked
      const stepBtn3 = screen.getByTestId('hint-step-button-3');
      expect(stepBtn3).toBeDisabled();
      expect(screen.getByTestId('lock-icon-3')).toBeInTheDocument();

      // Learner can navigate back to Level 1
      const stepBtn1 = screen.getByTestId('hint-step-button-1');
      fireEvent.click(stepBtn1);
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();

      // Learner can navigate forward to Level 2 since it was unlocked
      const stepBtn2 = screen.getByTestId('hint-step-button-2');
      fireEvent.click(stepBtn2);
      expect(screen.getByTestId('level-2-content')).toBeInTheDocument();
    });

    it('should unlock Level 3 only after progressive unlocking through Level 2', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      // Unlock Level 2
      fireEvent.click(screen.getByTestId('unlock-level-2-button'));

      // Unlock Level 3
      const unlockBtn3 = screen.getByTestId('unlock-level-3-button');
      expect(screen.getByText(/Tiếp theo: Nghiệp vụ mẫu song sinh \(Nấc 3\)/i)).toBeInTheDocument();
      fireEvent.click(unlockBtn3);

      // Now Level 3 is active
      expect(screen.getByTestId('level-3-content')).toBeInTheDocument();
      expect(screen.getAllByText(/Nấc 3: Mẫu tương tự/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Nghiệp vụ mẫu song sinh \(Đẳng cấu suy luận\):/i)).toBeInTheDocument();
      expect(screen.getByText(/Bút toán định khoản mẫu tương tự/i)).toBeInTheDocument();

      // Lock icons should all be gone
      expect(screen.queryByTestId('lock-icon-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('lock-icon-3')).not.toBeInTheDocument();

      // Max unlocked badge
      expect(screen.getByText(/Đã mở khóa tối đa 3 nấc gợi ý/i)).toBeInTheDocument();
    });

    it('should reset ladder progression back to Level 1 when "Đặt lại" button is clicked', () => {
      render(<SocraticHintLadder scenarioId="scen-01" />);

      // Unlock through Level 2
      fireEvent.click(screen.getByTestId('unlock-level-2-button'));
      expect(screen.getByTestId('level-2-content')).toBeInTheDocument();

      // Click "Đặt lại" in header
      const resetBtn = screen.getByTitle(/Đặt lại nấc thang gợi ý về Nấc 1/i);
      fireEvent.click(resetBtn);

      // Should be back to Level 1 and Level 2 should be locked again
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.getByTestId('hint-step-button-2')).toBeDisabled();
      expect(screen.getByTestId('hint-step-button-3')).toBeDisabled();
    });
  });

  describe('4. Anti-Spoil Reset on Scenario Switch', () => {
    it('should automatically reset to Level 1 and lock higher levels when scenarioId changes', () => {
      const { rerender } = render(<SocraticHintLadder scenarioId="scen-01" />);

      // Unlock up to Level 3 on scenario 1
      fireEvent.click(screen.getByTestId('unlock-level-2-button'));
      fireEvent.click(screen.getByTestId('unlock-level-3-button'));
      expect(screen.getByTestId('level-3-content')).toBeInTheDocument();

      // Switch scenarioId prop to scen-02
      rerender(<SocraticHintLadder scenarioId="scen-02" />);

      // Must be reset to Level 1 for the new scenario
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.getByText(/Nhóm TK 152 - Nguyên liệu, vật liệu/i)).toBeInTheDocument();

      // Higher steps must be locked again
      expect(screen.getByTestId('hint-step-button-2')).toBeDisabled();
      expect(screen.getByTestId('hint-step-button-3')).toBeDisabled();
      expect(screen.getByTestId('lock-icon-2')).toBeInTheDocument();
      expect(screen.getByTestId('lock-icon-3')).toBeInTheDocument();
    });
  });

  describe('5. Integration within Journalizer Workbench', () => {
    it('renders SocraticHintLadder inside Journalizer scenario panel', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      expect(screen.getByTestId('socratic-hint-ladder')).toBeInTheDocument();
      expect(screen.getByText(/Nấc Thang Gợi Ý Socratic/i)).toBeInTheDocument();
    });

    it('allows student to clear sample rows for independent practice and reload them', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      // Initially rows are populated with scenario 1
      const initialCodeInputs = screen.getAllByPlaceholderText('Mã TK') as HTMLInputElement[];
      expect(initialCodeInputs[0].value).toBe('1111');
      expect(initialCodeInputs[1].value).toBe('1121');

      // Click "Tự thử thách (Xóa mẫu)" button
      const clearBtn = screen.getByTitle(/Xóa các dòng định khoản mẫu/i);
      fireEvent.click(clearBtn);

      // Rows should now be blank for independent practice
      const blankCodeInputs = screen.getAllByPlaceholderText('Mã TK') as HTMLInputElement[];
      expect(blankCodeInputs[0].value).toBe('');
      expect(blankCodeInputs[1].value).toBe('');

      // Click "Tải lại mẫu" button
      const reloadBtn = screen.getByTitle(/Tải lại các dòng gợi ý mẫu/i);
      fireEvent.click(reloadBtn);

      // Rows should be restored
      const restoredCodeInputs = screen.getAllByPlaceholderText('Mã TK') as HTMLInputElement[];
      expect(restoredCodeInputs[0].value).toBe('1111');
      expect(restoredCodeInputs[1].value).toBe('1121');
    });

    it('resets SocraticHintLadder to Level 1 when user clicks a different scenario button in Journalizer', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      // Advance hint ladder to Level 2
      fireEvent.click(screen.getByTestId('unlock-level-2-button'));
      expect(screen.getByTestId('level-2-content')).toBeInTheDocument();

      // Switch to scenario 2
      const scen2Btn = screen.getByText(/Mua nguyên vật liệu nhập kho chưa trả tiền người bán/i);
      fireEvent.click(scen2Btn);

      // Hint ladder resets to Level 1 for scenario 2
      expect(screen.getByTestId('level-1-content')).toBeInTheDocument();
      expect(screen.getByText(/Nhóm TK 152 - Nguyên liệu, vật liệu/i)).toBeInTheDocument();
      expect(screen.getByTestId('hint-step-button-2')).toBeDisabled();
    });
  });
});
