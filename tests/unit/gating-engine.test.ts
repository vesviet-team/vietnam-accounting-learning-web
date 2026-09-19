import { describe, it, expect } from 'vitest';
import {
  canAccessDay,
  isMilestonePassed,
  getPrerequisiteMilestone,
  computeUnlockedDays,
  createInitialLearnerProgress,
  recordMilestoneAttempt,
} from '@/engine/gating-engine';
import { LearnerProgress } from '@/types/curriculum';
import { MilestoneAssessmentResult } from '@/types/assessment';

describe('GATING STATE MACHINE & PROGRESSION ENGINE SUITE', () => {
  describe('1. Initial Progress & Base Invariants', () => {
    it('initial progress should open Days 1, 2, 3 and keep Day 4 strictly locked', () => {
      const initial = createInitialLearnerProgress();

      expect(canAccessDay(1, initial)).toBe(true);
      expect(canAccessDay(2, initial)).toBe(true);
      expect(canAccessDay(3, initial)).toBe(true);

      // Strict gating invariant: Day 4 is LOCKED until Day 3 passed >= 70%
      expect(canAccessDay(4, initial)).toBe(false);
      expect(canAccessDay(5, initial)).toBe(false);
      expect(canAccessDay(6, initial)).toBe(false);
      expect(canAccessDay(7, initial)).toBe(false);
    });

    it('should reject invalid or out-of-bounds days', () => {
      const initial = createInitialLearnerProgress();
      expect(canAccessDay(0, initial)).toBe(false);
      expect(canAccessDay(-1, initial)).toBe(false);
      expect(canAccessDay(31, initial)).toBe(false);
      expect(canAccessDay(100, initial)).toBe(false);
    });

    it('should correctly map prerequisite milestones for all 10 modules', () => {
      // Days 1-3: no prerequisite
      expect(getPrerequisiteMilestone(1)).toBeNull();
      expect(getPrerequisiteMilestone(2)).toBeNull();
      expect(getPrerequisiteMilestone(3)).toBeNull();

      // Module 2 (Days 4-6): prerequisite Day 3
      expect(getPrerequisiteMilestone(4)).toBe(3);
      expect(getPrerequisiteMilestone(5)).toBe(3);
      expect(getPrerequisiteMilestone(6)).toBe(3);

      // Module 3 (Days 7-9): prerequisite Day 6
      expect(getPrerequisiteMilestone(7)).toBe(6);
      expect(getPrerequisiteMilestone(8)).toBe(6);
      expect(getPrerequisiteMilestone(9)).toBe(6);

      // Module 10 (Days 28-30): prerequisite Day 27
      expect(getPrerequisiteMilestone(28)).toBe(27);
      expect(getPrerequisiteMilestone(29)).toBe(27);
      expect(getPrerequisiteMilestone(30)).toBe(27);
    });
  });

  describe('2. >=70% Passing Threshold & Sequential Unlocking', () => {
    it('Day 4 remains locked if Milestone 1 (Day 3) is failed (< 70%)', () => {
      const progress: LearnerProgress = {
        ...createInitialLearnerProgress(),
        milestoneScores: { 3: 68 }, // 68% < 70%
      };

      expect(isMilestonePassed(3, progress)).toBe(false);
      expect(canAccessDay(4, progress)).toBe(false);
      expect(canAccessDay(5, progress)).toBe(false);
      expect(computeUnlockedDays(progress)).toEqual([1, 2, 3]);
    });

    it('Day 4, 5, 6 unlock immediately when Milestone 1 (Day 3) passes (>= 70%)', () => {
      const progress: LearnerProgress = {
        ...createInitialLearnerProgress(),
        milestoneScores: { 3: 70 }, // exactly 70%
      };

      expect(isMilestonePassed(3, progress)).toBe(true);
      expect(canAccessDay(4, progress)).toBe(true);
      expect(canAccessDay(5, progress)).toBe(true);
      expect(canAccessDay(6, progress)).toBe(true);

      // But Day 7 remains strictly locked until Milestone 2 (Day 6) is passed
      expect(canAccessDay(7, progress)).toBe(false);
      expect(computeUnlockedDays(progress)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should sequentially gate all 10 modules every 3 days', () => {
      let progress = createInitialLearnerProgress();

      // Passing milestones 1 through 9 sequentially
      const milestoneDays = [3, 6, 9, 12, 15, 18, 21, 24, 27];

      milestoneDays.forEach((milestoneDay, index) => {
        const nextModuleStartDay = milestoneDay + 1;
        // Prior to passing this milestone, the next day must be locked
        expect(canAccessDay(nextModuleStartDay, progress)).toBe(false);

        // Pass milestone with 80%
        progress = {
          ...progress,
          milestoneScores: {
            ...progress.milestoneScores,
            [milestoneDay]: 80,
          },
        };

        // Now next module days are unlocked
        expect(canAccessDay(nextModuleStartDay, progress)).toBe(true);
        expect(canAccessDay(nextModuleStartDay + 1, progress)).toBe(true);
        expect(canAccessDay(nextModuleStartDay + 2, progress)).toBe(true);

        // Verify next downstream module remains locked if not yet reached
        if (index < milestoneDays.length - 1) {
          const downstreamDay = milestoneDay + 4;
          expect(canAccessDay(downstreamDay, progress)).toBe(false);
        }
      });

      // At this point, Day 30 is fully accessible
      expect(canAccessDay(30, progress)).toBe(true);
      expect(computeUnlockedDays(progress)).toHaveLength(30);
    });
  });

  describe('3. Retakes & Score History State Synchronization', () => {
    it('retake attempt updates attempt history and preserves highest score achieved', () => {
      let progress = createInitialLearnerProgress();

      const attempt1: MilestoneAssessmentResult = {
        milestoneDay: 3,
        score: 52,
        passed: false,
        proficiencyTier: 'developing',
        attemptTimestamp: '2026-09-13T10:00:00Z',
      };

      progress = recordMilestoneAttempt(progress, attempt1);
      expect(progress.milestoneScores[3]).toBe(52);
      expect(progress.scoreHistory?.[3]).toHaveLength(1);
      expect(canAccessDay(4, progress)).toBe(false);

      // Retake 2: Learner studies and scores 84% -> Unlocks Day 4!
      const attempt2: MilestoneAssessmentResult = {
        milestoneDay: 3,
        score: 84,
        passed: true,
        proficiencyTier: 'proficient',
        attemptTimestamp: '2026-09-13T11:00:00Z',
      };

      progress = recordMilestoneAttempt(progress, attempt2);
      expect(progress.milestoneScores[3]).toBe(84);
      expect(progress.scoreHistory?.[3]).toHaveLength(2);
      expect(canAccessDay(4, progress)).toBe(true);

      // Retake 3: Learner retakes for fun and scores 60%
      // Invariant: Highest score (84%) MUST be preserved, and Day 4 remains unlocked!
      const attempt3: MilestoneAssessmentResult = {
        milestoneDay: 3,
        score: 60,
        passed: false,
        proficiencyTier: 'developing',
        attemptTimestamp: '2026-09-13T12:00:00Z',
      };

      progress = recordMilestoneAttempt(progress, attempt3);
      expect(progress.milestoneScores[3]).toBe(84); // Highest preserved!
      expect(progress.scoreHistory?.[3]).toHaveLength(3);
      expect(canAccessDay(4, progress)).toBe(true); // Remains unlocked!
    });
  });
});
