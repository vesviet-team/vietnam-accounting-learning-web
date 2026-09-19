import { MilestoneTest, MilestoneDay } from '@/types/assessment';
import { MILESTONE_TEST_01 } from './milestone-01';
import { MILESTONE_TEST_02 } from './milestone-02';
import { MILESTONE_TEST_03 } from './milestone-03';
import { MILESTONE_TEST_04 } from './milestone-04';
import { MILESTONE_TEST_05 } from './milestone-05';
import { MILESTONE_TEST_06 } from './milestone-06';
import { MILESTONE_TEST_07 } from './milestone-07';
import { MILESTONE_TEST_08 } from './milestone-08';
import { MILESTONE_TEST_09 } from './milestone-09';
import { MILESTONE_TEST_10 } from './milestone-10';

export {
  MILESTONE_TEST_01,
  MILESTONE_TEST_02,
  MILESTONE_TEST_03,
  MILESTONE_TEST_04,
  MILESTONE_TEST_05,
  MILESTONE_TEST_06,
  MILESTONE_TEST_07,
  MILESTONE_TEST_08,
  MILESTONE_TEST_09,
  MILESTONE_TEST_10,
};

export const ALL_MILESTONE_TESTS: MilestoneTest[] = [
  MILESTONE_TEST_01,
  MILESTONE_TEST_02,
  MILESTONE_TEST_03,
  MILESTONE_TEST_04,
  MILESTONE_TEST_05,
  MILESTONE_TEST_06,
  MILESTONE_TEST_07,
  MILESTONE_TEST_08,
  MILESTONE_TEST_09,
  MILESTONE_TEST_10,
];

export const VALID_MILESTONE_DAYS: MilestoneDay[] = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];

export function getMilestoneTestByDay(day: number): MilestoneTest | undefined {
  return ALL_MILESTONE_TESTS.find((t) => t.milestoneDay === day);
}

export function getAllMilestoneTests(): MilestoneTest[] {
  return ALL_MILESTONE_TESTS;
}

export function isMilestoneDay(day: number): day is MilestoneDay {
  return VALID_MILESTONE_DAYS.includes(day as MilestoneDay);
}
