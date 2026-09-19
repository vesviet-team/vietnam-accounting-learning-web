import { LearnerProgress } from '@/types/curriculum';
import { MilestoneAssessmentResult, MilestoneDay } from '@/types/assessment';
import { PASSING_SCORE_THRESHOLD } from './grading-engine';
import { StorageService } from '@/services/storage/storage-service';

export const ALL_GATING_MILESTONES: MilestoneDay[] = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];

/**
 * Returns the prerequisite milestone day required to unlock the target day.
 * Days 1-3 have no prerequisite (returns null).
 * Days 4-6 require Milestone 1 (Day 3).
 * Days 7-9 require Milestone 2 (Day 6).
 * ...
 * Days 28-30 require Milestone 9 (Day 27).
 */
export function getPrerequisiteMilestone(targetDay: number): MilestoneDay | null {
  if (targetDay <= 3) return null;
  const moduleIndex = Math.ceil(targetDay / 3); // 2 for days 4-6, 3 for days 7-9, etc.
  const prereqMilestoneDay = ((moduleIndex - 1) * 3) as MilestoneDay;
  return prereqMilestoneDay;
}

/**
 * Checks if a specific milestone has been passed with a score >= 70%.
 */
export function isMilestonePassed(milestoneDay: number, progress: LearnerProgress): boolean {
  const highestScore = progress.milestoneScores?.[milestoneDay] ?? 0;
  return highestScore >= PASSING_SCORE_THRESHOLD;
}

/**
 * Computes all days currently unlocked for the learner based on milestone completion.
 * Strict Gating Invariant:
 * - Days 1-3 are open initially.
 * - Day 4 is LOCKED until Day 3 passed >= 70%.
 * - Day 7 is LOCKED until Day 6 passed >= 70%.
 * - ... repeats every 3 days.
 */
export function computeUnlockedDays(progress: LearnerProgress): number[] {
  const unlocked: number[] = [1, 2, 3];

  for (let moduleNum = 2; moduleNum <= 10; moduleNum++) {
    const prereqMilestoneDay = (moduleNum - 1) * 3;
    const isPrereqPassed = isMilestonePassed(prereqMilestoneDay, progress);

    if (isPrereqPassed) {
      const startDay = (moduleNum - 1) * 3 + 1;
      const endDay = Math.min(30, moduleNum * 3);
      for (let day = startDay; day <= endDay; day++) {
        unlocked.push(day);
      }
    } else {
      // If a milestone is not passed, downstream days remain strictly locked
      break;
    }
  }

  return unlocked;
}

/**
 * Evaluates whether a learner can access a target day.
 * Strictly enforces gating prerequisites.
 */
export function canAccessDay(targetDay: number, progress: LearnerProgress): boolean {
  if (targetDay < 1 || targetDay > 30) {
    return false;
  }

  // Days 1, 2, 3 are open initially
  if (targetDay <= 3) {
    return true;
  }

  // Check all prerequisite milestones leading up to this day's module
  const targetModule = Math.ceil(targetDay / 3);
  for (let m = 1; m < targetModule; m++) {
    const requiredMilestoneDay = m * 3;
    if (!isMilestonePassed(requiredMilestoneDay, progress)) {
      return false;
    }
  }

  return true;
}

/**
 * Creates a clean, initial learner progress state.
 */
export function createInitialLearnerProgress(): LearnerProgress {
  return {
    currentDay: 1,
    unlockedDays: [1, 2, 3],
    completedDays: [],
    milestoneScores: {},
    scoreHistory: {},
    streakDays: 1,
    lastActiveDate: new Date().toISOString(),
  };
}

/**
 * Records a new milestone assessment attempt.
 * Preserves the highest score achieved, updates attempt history,
 * and recalculates unlocked days to immediately open downstream days upon passing.
 */
export function recordMilestoneAttempt(
  progress: LearnerProgress,
  result: MilestoneAssessmentResult
): LearnerProgress {
  const milestoneDay = result.milestoneDay;
  const currentHighest = progress.milestoneScores?.[milestoneDay] ?? 0;
  const newHighest = Math.max(currentHighest, result.score);

  // Append attempt to scoreHistory
  const existingHistory = progress.scoreHistory?.[milestoneDay] || [];
  const updatedHistory = [...existingHistory, result];

  const updatedProgress: LearnerProgress = {
    ...progress,
    milestoneScores: {
      ...progress.milestoneScores,
      [milestoneDay]: newHighest,
    },
    scoreHistory: {
      ...progress.scoreHistory,
      [milestoneDay]: updatedHistory,
    },
    lastActiveDate: result.attemptTimestamp || new Date().toISOString(),
  };

  // Recalculate unlocked days immediately
  updatedProgress.unlockedDays = computeUnlockedDays(updatedProgress);

  return updatedProgress;
}

/**
 * Helper to save progress through StorageService
 */
export async function persistProgress(
  progress: LearnerProgress,
  storage: StorageService
): Promise<void> {
  await storage.saveLearnerProgress(progress);
}
