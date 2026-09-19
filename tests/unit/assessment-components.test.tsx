import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DokBadge } from '@/components/assessment/DokBadge';
import { RuleOfOneCard } from '@/components/assessment/RuleOfOneCard';
import { ScoreHistoryModal } from '@/components/assessment/ScoreHistoryModal';
import { QuizModal } from '@/components/assessment/QuizModal';
import { RuleOfOneDiagnosis, MilestoneAssessmentResult } from '@/types/assessment';

describe('ASSESSMENT UI COMPONENTS TEST SUITE', () => {
  describe('1. DokBadge Component', () => {
    it('should render DOK 1 badge with 8 points', () => {
      render(<DokBadge dokLevel="DOK_1" />);
      expect(screen.getByText(/DOK 1 • Nhận diện/)).toBeDefined();
      expect(screen.getByText(/(8đ)/)).toBeDefined();
    });

    it('should render DOK 2 badge with 10 points', () => {
      render(<DokBadge dokLevel="DOK_2" />);
      expect(screen.getByText(/DOK 2 • Định khoản/)).toBeDefined();
      expect(screen.getByText(/(10đ)/)).toBeDefined();
    });

    it('should render DOK 3 badge with 14 points', () => {
      render(<DokBadge dokLevel="DOK_3" />);
      expect(screen.getByText(/DOK 3 • Soát xét & Chiến lược/)).toBeDefined();
      expect(screen.getByText(/(14đ)/)).toBeDefined();
    });
  });

  describe('2. RuleOfOneCard Component', () => {
    it('should render perfect score mastery card when no priority level is set', () => {
      const diagnosis: RuleOfOneDiagnosis = {
        highestPriorityErrorVi: 'Không có lỗi sai nào.',
        growthMindsetFeedbackVi: 'Xuất sắc! Bạn đã làm chủ 100% kiến thức.',
        actionableNextStepVi: 'Bạn đã sẵn sàng bước tiếp!',
      };

      render(<RuleOfOneCard diagnosis={diagnosis} />);
      expect(screen.getByText(/Xuất Sắc 100%/)).toBeDefined();
      expect(screen.getByText(/Bạn đã làm chủ 100% kiến thức/)).toBeDefined();
      expect(screen.getByText(/Bạn đã sẵn sàng bước tiếp/)).toBeDefined();
    });

    it('should render Priority 1 error card with growth mindset and single actionable next step', () => {
      const onAction = vi.fn();
      const diagnosis: RuleOfOneDiagnosis = {
        highestPriorityErrorVi: 'Lỗi đảo ngược Nợ/Có TK 111 và TK 112',
        growthMindsetFeedbackVi: 'Bạn đã nỗ lực làm tốt phần lớn câu hỏi nhưng chưa thuần thục đối ứng kép',
        actionableNextStepVi: 'Hãy xem lại sơ đồ chữ T Ngày 2 trước khi bấm làm lại bài test!',
        priorityLevel: 1,
      };

      render(<RuleOfOneCard diagnosis={diagnosis} onTakeAction={onAction} />);
      expect(screen.getByText(/Ưu tiên 1/)).toBeDefined();
      expect(screen.getByText(/Bạn đã nỗ lực làm tốt phần lớn câu hỏi/)).toBeDefined();
      expect(screen.getByText(/Hãy xem lại sơ đồ chữ T Ngày 2/)).toBeDefined();

      const actionBtn = screen.getByText(/Xem bài học & thực hành ngay/);
      fireEvent.click(actionBtn);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. ScoreHistoryModal Component', () => {
    it('should render attempt history with highest score badge and pass status', () => {
      const onClose = vi.fn();
      const onRetake = vi.fn();

      const history: MilestoneAssessmentResult[] = [
        {
          milestoneDay: 3,
          score: 60,
          passed: false,
          proficiencyTier: 'developing',
          attemptTimestamp: '2026-09-13T10:00:00Z',
        },
        {
          milestoneDay: 3,
          score: 84,
          passed: true,
          proficiencyTier: 'proficient',
          attemptTimestamp: '2026-09-13T11:00:00Z',
        },
      ];

      render(
        <ScoreHistoryModal
          isOpen={true}
          milestoneDay={3}
          history={history}
          onClose={onClose}
          onRetake={onRetake}
        />
      );

      expect(screen.getByText(/Lịch Sử Làm Bài: Milestone #1/)).toBeDefined();
      expect(screen.getByText(/84 \/ 100 điểm/)).toBeDefined();
      expect(screen.getByText(/Cao nhất/)).toBeDefined();
      expect(screen.getByText(/84đ • ĐẠT/)).toBeDefined();
      expect(screen.getByText(/60đ • CHƯA ĐẠT/)).toBeDefined();

      const retakeBtn = screen.getByText(/Làm lại bài kiểm tra này/);
      fireEvent.click(retakeBtn);
      expect(onRetake).toHaveBeenCalledTimes(1);
    });

    it('should show empty message when history is empty', () => {
      render(
        <ScoreHistoryModal
          isOpen={true}
          milestoneDay={3}
          history={[]}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Bạn chưa thực hiện lần làm bài nào/)).toBeDefined();
    });
  });

  describe('4. QuizModal Interactive Journey', () => {
    it('should render test question, allow selecting option, and submit test', async () => {
      const onClose = vi.fn();
      const onComplete = vi.fn();

      render(
        <QuizModal
          isOpen={true}
          milestoneDay={3}
          onClose={onClose}
          onComplete={onComplete}
        />
      );

      // Verify header and first question
      expect(screen.getByText(/Cột mốc #1 • Ngày 3/)).toBeDefined();
      expect(screen.getByText(/Phương trình kế toán cơ bản/)).toBeDefined();

      // Click option B (correct)
      const correctOption = screen.getByText(/Tài sản = Nợ phải trả \+ Vốn chủ sở hữu/);
      fireEvent.click(correctOption);

      // Verify progress updated
      expect(screen.getByText(/10% hoàn thành/)).toBeDefined();

      // Navigate to question 10 and click submit
      const q10Btn = screen.getByText('10');
      fireEvent.click(q10Btn);
      expect(screen.getByText(/Câu 10 \/ 10/)).toBeDefined();

      const submitBtn = screen.getByText(/Nộp bài đánh giá/);
      fireEvent.click(submitBtn);

      // Shows unanswered warning
      expect(screen.getByText(/Bạn còn 9 câu hỏi chưa chọn đáp án/)).toBeDefined();

      // Click "Vẫn nộp bài"
      const forceSubmitBtn = screen.getByText(/Vẫn nộp bài/);
      fireEvent.click(forceSubmitBtn);

      // Results view appears
      await waitFor(() => {
        expect(screen.getByText(/CHƯA ĐẠT CHUẨN/)).toBeDefined();
        expect(screen.getByText(/Chẩn Đoán Sư Phạm: Nguyên Lý Một Trọng Tâm/)).toBeDefined();
        expect(onComplete).toHaveBeenCalledTimes(1);
      });
    });
  });
});
