import {
  DokLevel,
  MilestoneTest,
  AssessmentItem,
  MilestoneAssessmentResult,
  AssessmentItemGradingResult,
  RuleOfOneDiagnosis,
  ErrorPriority,
} from '@/types/assessment';

export const DOK_POINT_MAP: Record<DokLevel, number> = {
  DOK_1: 8,
  DOK_2: 10,
  DOK_3: 14,
};

export const PASSING_SCORE_THRESHOLD = 70;

export function getItemPointValue(dokLevel: DokLevel): number {
  return DOK_POINT_MAP[dokLevel] || 8;
}

export function calculateProficiencyTier(score: number): 'beginning' | 'developing' | 'proficient' | 'advanced' {
  if (score >= 90) return 'advanced';
  if (score >= 70) return 'proficient';
  if (score >= 50) return 'developing';
  return 'beginning';
}

/**
 * Priority Hierarchy for Rule of One Diagnostic Remediation:
 * Priority 1: Conceptual Debit/Credit Inversions & Asset/Liability misclassifications.
 * Priority 2: Statutory Tax & Decree Violations (Non-cash payment >= 20M VND breach, 36m prepaid cap, 1.6B car cap, status 03/04 fraud).
 * Priority 3: Regime Mapping Confusion (prohibited Circular 133 accounts like 621/622/627/641, 521, 413).
 * Priority 4: Arithmetic & Rounding Errors.
 */
export function prioritizeErrors(incorrectItems: AssessmentItem[]): AssessmentItem[] {
  return [...incorrectItems].sort((a, b) => {
    const priorityA = a.errorPriority ?? 4;
    const priorityB = b.errorPriority ?? 4;

    if (priorityA !== priorityB) {
      return priorityA - priorityB; // Lower number = higher priority
    }

    // Tie-breaker: higher DOK level first (DOK_3 > DOK_2 > DOK_1)
    const dokWeight = (dok: DokLevel) => (dok === 'DOK_3' ? 3 : dok === 'DOK_2' ? 2 : 1);
    return dokWeight(b.dokLevel) - dokWeight(a.dokLevel);
  });
}

export function diagnoseRuleOfOne(
  incorrectItems: AssessmentItem[],
  score: number,
  totalItemsCount: number
): RuleOfOneDiagnosis {
  if (incorrectItems.length === 0) {
    return {
      highestPriorityErrorVi: 'Không có lỗi sai nào. Nắm vững 100% kiến thức cột mốc.',
      growthMindsetFeedbackVi:
        'Xuất sắc! Bạn đã thể hiện sự am hiểu sâu sắc và chính xác tuyệt đối toàn bộ các câu hỏi trong bài kiểm tra cột mốc này.',
      actionableNextStepVi: 'Bạn đã nắm chắc nền tảng và hoàn toàn sẵn sàng bước tiếp sang các khối bài học tiếp theo!',
      priorityLevel: undefined,
    };
  }

  const sortedErrors = prioritizeErrors(incorrectItems);
  const primaryError = sortedErrors[0];
  const priority = primaryError.errorPriority ?? 4;
  const correctCount = totalItemsCount - incorrectItems.length;

  let priorityNameVi = '';
  switch (priority) {
    case 1:
      priorityNameVi = 'Lỗi Khái Niệm Cốt Lõi (Định khoản Nợ/Có & Bản chất Tài khoản)';
      break;
    case 2:
      priorityNameVi = 'Lỗi Vi Phạm Ngưỡng & Quy Định Pháp Lý Bắt Buộc (Thuế & Hóa đơn)';
      break;
    case 3:
      priorityNameVi = 'Lỗi Nhầm Lẫn Chế Độ Kế Toán (Thông tư 200 vs Thông tư 133)';
      break;
    case 4:
    default:
      priorityNameVi = 'Lỗi Tính Toán Số Học & Áp Dụng Công Thức';
      break;
  }

  const highestPriorityErrorVi = `[Ưu tiên ${priority}: ${priorityNameVi}] ${
    primaryError.misconceptionFocus
      ? `Điểm nghẽn nhận thức: ${primaryError.misconceptionFocus}. `
      : ''
  }${primaryError.explanationVi.slice(0, 180)}...`;

  // Growth Mindset framing: Praise effort / partial success + "Not Yet" framing
  let praisePrefix = '';
  if (correctCount >= 7) {
    praisePrefix = `Bạn đã làm rất tốt khi trả lời đúng ${correctCount}/${totalItemsCount} câu hỏi (${score}/100 điểm). Bạn đã vượt qua bài test và chỉ còn một chút vướng mắc nhỏ`;
  } else if (correctCount >= 4) {
    praisePrefix = `Bạn đã nỗ lực giải quyết được ${correctCount}/${totalItemsCount} tình huống nghiệp vụ. Bạn chưa thuần thục hoàn toàn ở một số quy định then chốt`;
  } else {
    praisePrefix = `Bạn đã dũng cảm thử sức với bài kiểm tra nghiệp vụ thực tế. Đừng lo lắng, kế toán đòi hỏi sự rèn luyện kiên trì và bạn chỉ là "chưa quen" với các nguyên tắc đối ứng`;
  }

  const growthMindsetFeedbackVi = `${praisePrefix}. Thay vì dàn trải sửa mọi câu cùng lúc, hãy tập trung giải quyết triệt để 01 lỗ hổng nhận thức quan trọng nhất lúc này: ${primaryError.questionVi}`;

  // Strictly ONE actionable directive
  const actionableNextStepVi =
    primaryError.remediationStepVi ||
    'Hãy mở lại bài học lý thuyết tương ứng, vẽ lại sơ đồ chữ T của nghiệp vụ này và làm lại bài kiểm tra để đạt điểm tối đa!';

  return {
    highestPriorityErrorVi,
    growthMindsetFeedbackVi,
    actionableNextStepVi,
    priorityLevel: priority as ErrorPriority,
    misconceptionFocus: primaryError.misconceptionFocus,
  };
}

/**
 * Pure function grading engine for Milestone Assessments.
 * Evaluates submitted option IDs against the test blueprint and Webb's DOK points.
 */
export function gradeMilestoneAssessment(
  test: MilestoneTest,
  selectedAnswers: Record<string, string>
): MilestoneAssessmentResult {
  let totalScore = 0;
  const itemResults: AssessmentItemGradingResult[] = [];
  const incorrectItems: AssessmentItem[] = [];

  const dokScoreBreakdown = {
    dok1: { earned: 0, max: 0 },
    dok2: { earned: 0, max: 0 },
    dok3: { earned: 0, max: 0 },
  };

  for (const item of test.items) {
    const itemMaxPoints = getItemPointValue(item.dokLevel);
    const correctOption = item.options.find((opt) => opt.isCorrect);
    const correctOptionId = correctOption ? correctOption.id : '';
    const selectedOptionId = selectedAnswers[item.id];
    const isCorrect = Boolean(selectedOptionId && selectedOptionId === correctOptionId);

    const earnedPoints = isCorrect ? itemMaxPoints : 0;
    totalScore += earnedPoints;

    if (item.dokLevel === 'DOK_1') {
      dokScoreBreakdown.dok1.max += itemMaxPoints;
      dokScoreBreakdown.dok1.earned += earnedPoints;
    } else if (item.dokLevel === 'DOK_2') {
      dokScoreBreakdown.dok2.max += itemMaxPoints;
      dokScoreBreakdown.dok2.earned += earnedPoints;
    } else if (item.dokLevel === 'DOK_3') {
      dokScoreBreakdown.dok3.max += itemMaxPoints;
      dokScoreBreakdown.dok3.earned += earnedPoints;
    }

    if (!isCorrect) {
      incorrectItems.push(item);
    }

    itemResults.push({
      itemId: item.id,
      dokLevel: item.dokLevel,
      isCorrect,
      earnedPoints,
      maxPoints: itemMaxPoints,
      selectedOptionId,
      correctOptionId,
      errorPriority: item.errorPriority,
      misconceptionFocus: item.misconceptionFocus,
    });
  }

  const passed = totalScore >= PASSING_SCORE_THRESHOLD;
  const proficiencyTier = calculateProficiencyTier(totalScore);
  const ruleOfOneDiagnosis = diagnoseRuleOfOne(incorrectItems, totalScore, test.items.length);

  return {
    milestoneDay: test.milestoneDay,
    score: totalScore,
    passed,
    proficiencyTier,
    ruleOfOneDiagnosis,
    selectedAnswers,
    itemResults,
    dokScoreBreakdown,
    attemptTimestamp: new Date().toISOString(),
  };
}
