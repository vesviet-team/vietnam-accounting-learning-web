export type DokLevel = 'DOK_1' | 'DOK_2' | 'DOK_3';

export type MilestoneDay = 3 | 6 | 9 | 12 | 15 | 18 | 21 | 24 | 27 | 30;

export type ErrorPriority = 1 | 2 | 3 | 4;

export interface AssessmentOption {
  id: string;
  textVi: string;
  isCorrect: boolean;
}

export interface AssessmentItem {
  id: string;
  milestoneDay: MilestoneDay;
  dokLevel: DokLevel;
  questionVi: string;
  options: AssessmentOption[];
  explanationVi: string;
  misconceptionFocus?: string;
  errorPriority?: ErrorPriority;
  remediationStepVi?: string;
  statutoryReference?: string;
}

export interface MilestoneTest {
  milestoneDay: MilestoneDay;
  moduleNumber: number; // 1-10
  titleVi: string;
  descriptionVi: string;
  items: AssessmentItem[];
}

export interface RuleOfOneDiagnosis {
  highestPriorityErrorVi: string;
  growthMindsetFeedbackVi: string;
  actionableNextStepVi: string;
  priorityLevel?: ErrorPriority;
  misconceptionFocus?: string;
}

export interface AssessmentItemGradingResult {
  itemId: string;
  dokLevel: DokLevel;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  selectedOptionId?: string;
  correctOptionId: string;
  errorPriority?: ErrorPriority;
  misconceptionFocus?: string;
}

export interface MilestoneAssessmentResult {
  milestoneDay: number;
  score: number; // 0-100
  passed: boolean; // score >= 70
  proficiencyTier: 'beginning' | 'developing' | 'proficient' | 'advanced';
  ruleOfOneDiagnosis?: RuleOfOneDiagnosis;
  selectedAnswers?: Record<string, string>; // itemId -> optionId
  itemResults?: AssessmentItemGradingResult[];
  dokScoreBreakdown?: {
    dok1: { earned: number; max: number };
    dok2: { earned: number; max: number };
    dok3: { earned: number; max: number };
  };
  attemptTimestamp: string;
}
