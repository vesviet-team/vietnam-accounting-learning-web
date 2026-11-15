// Shared progress types for the sync layer. Re-exports the canonical
// curriculum type untouched (engines are import-only) and adds the
// sync bookkeeping fields the SPA stores on attempt results.
import type { LearnerProgress } from '@/types/curriculum';
import type { MilestoneAssessmentResult } from '@/types/assessment';

export type { LearnerProgress };

/** A milestone attempt with the sync-side stable uuid (attemptId). */
export type MilestoneAssessmentLike = MilestoneAssessmentResult & {
  attemptId?: string;
};
