import { AnyVoucherData } from './voucher';
import { MilestoneAssessmentResult } from './assessment';

export interface TAccountEntry {
  id: string;
  date?: string;
  description: string;
  amount: number;
  side: 'DEBIT' | 'CREDIT';
  counterAccountCode?: string;
}

export interface TAccountData {
  accountCode: string;
  accountNameVi: string;
  accountClass?: number; // 1 to 9
  normalBalance?: 'DEBIT' | 'CREDIT' | 'BOTH' | 'ZERO';
  isContra?: boolean; // TK 214, 229 (credit in asset), TK 419 (debit in equity)
  contraTarget?: string;
  openingBalance?: {
    side: 'DEBIT' | 'CREDIT';
    amount: number;
  };
  entries: TAccountEntry[];
  explanationVi?: string;
}

export interface JournalExample {
  descriptionVi: string;
  entries: {
    debitCredit: 'DEBIT' | 'CREDIT';
    accountCode: string;
    accountNameVi: string;
    amount: number;
  }[];
  statutoryNoteVi?: string;
}

export interface LessonConcept {
  id: string;
  titleVi: string;
  summaryVi: string;
  contentVi: string;
  tAccounts?: {
    accountCode: string;
    accountNameVi: string;
    debitDescription: string;
    creditDescription: string;
  }[];
  detailedTAccounts?: TAccountData[];
  voucherIllustrations?: string[];
  vouchers?: AnyVoucherData[];
  journalExamples?: JournalExample[];
  keyTakeawayVi: string;
}

export interface DailyLesson {
  day: number; // 1-30
  moduleNumber: number; // 1-10 (each module = 3 days)
  moduleTitleVi: string;
  dayTitleVi: string;
  estimatedMinutes: number; // 15-20 mins
  concepts: LessonConcept[];
  isMilestoneDay: boolean; // Day 3, 6, 9, 12, 15, 18, 21, 24, 27, 30
}

export interface LearnerProgress {
  currentDay: number;
  unlockedDays: number[]; // e.g. [1, 2, 3]
  completedDays: number[];
  milestoneScores: Record<number, number>; // milestoneDay -> highest score (0-100)
  scoreHistory?: Record<number, MilestoneAssessmentResult[]>; // milestoneDay -> attempt history
  streakDays: number;
  lastActiveDate: string;
}
