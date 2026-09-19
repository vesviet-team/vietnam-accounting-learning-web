import { describe, it, expect, beforeEach } from 'vitest';
import {
  StreakEngine,
  CAREER_LEVELS,
  DEFAULT_WEEKLY_FREEZE_BUFFER,
  StreakState,
} from '@/engine/streak-engine';
import { LocalStorageAdapter } from '@/services/storage/local-storage-adapter';

describe('STREAK & PROGRESSION ENGINE UNIT TESTS', () => {
  let storage: LocalStorageAdapter;

  beforeEach(() => {
    window.localStorage.clear();
    storage = new LocalStorageAdapter('test_streak_');
  });

  describe('1. Date & Timezone Calibration (Asia/Ho_Chi_Minh)', () => {
    it('should format date in YYYY-MM-DD for Vietnam timezone', () => {
      // 2026-09-13T17:00:00Z is 2026-09-14 00:00:00 in Vietnam (UTC+7)
      const utcDate = new Date('2026-09-13T17:00:00Z');
      const vnDateStr = StreakEngine.getVietnamCalendarDate(utcDate);
      expect(vnDateStr).toBe('2026-09-14');
    });

    it('should compute correct difference in calendar days', () => {
      expect(StreakEngine.getDaysBetween('2026-09-10', '2026-09-10')).toBe(0);
      expect(StreakEngine.getDaysBetween('2026-09-10', '2026-09-11')).toBe(1);
      expect(StreakEngine.getDaysBetween('2026-09-10', '2026-09-12')).toBe(2);
      expect(StreakEngine.getDaysBetween('2026-09-10', '2026-09-20')).toBe(10);
    });

    it('should generate ISO week string for weekly freeze tracking', () => {
      const weekStr = StreakEngine.getVietnamYearWeek(new Date('2026-09-13T12:00:00Z'));
      expect(weekStr).toMatch(/^\d{4}-W\d{2}$/);
    });
  });

  describe('2. Streak Calculation & Freeze Buffer Mechanics', () => {
    it('should initialize with day 1 streak and default freeze buffer', () => {
      const initial = StreakEngine.getInitialState('2026-09-01');
      expect(initial.currentStreak).toBe(1);
      expect(initial.bestStreak).toBe(1);
      expect(initial.lastActiveDate).toBe('2026-09-01');
      expect(initial.freezeBufferCount).toBe(DEFAULT_WEEKLY_FREEZE_BUFFER);
      expect(initial.totalActiveDays).toBe(1);
    });

    it('should maintain streak when active on the same calendar day', () => {
      const state: StreakState = {
        currentStreak: 5,
        bestStreak: 5,
        lastActiveDate: '2026-09-05',
        freezeBufferCount: 1,
        lastFreezeRefillWeek: '2026-W36',
        totalActiveDays: 5,
      };

      const result = StreakEngine.calculateStreakWithFreeze(state, '2026-09-05', '2026-W36');
      expect(result.newState.currentStreak).toBe(5);
      expect(result.streakIncremented).toBe(false);
      expect(result.freezeUsed).toBe(false);
      expect(result.streakReset).toBe(false);
    });

    it('should increment streak on consecutive active days', () => {
      const state: StreakState = {
        currentStreak: 4,
        bestStreak: 4,
        lastActiveDate: '2026-09-05',
        freezeBufferCount: 1,
        lastFreezeRefillWeek: '2026-W36',
        totalActiveDays: 4,
      };

      const result = StreakEngine.calculateStreakWithFreeze(state, '2026-09-06', '2026-W36');
      expect(result.newState.currentStreak).toBe(5);
      expect(result.newState.bestStreak).toBe(5);
      expect(result.newState.lastActiveDate).toBe('2026-09-06');
      expect(result.streakIncremented).toBe(true);
      expect(result.freezeUsed).toBe(false);
      expect(result.streakReset).toBe(false);
    });

    it('should consume streak freeze and preserve streak when missing exactly 1 day', () => {
      const state: StreakState = {
        currentStreak: 7,
        bestStreak: 7,
        lastActiveDate: '2026-09-05',
        freezeBufferCount: 1, // Has 1 freeze
        lastFreezeRefillWeek: '2026-W36',
        totalActiveDays: 7,
      };

      // Active on 2026-09-07 (missed 2026-09-06)
      const result = StreakEngine.calculateStreakWithFreeze(state, '2026-09-07', '2026-W36');
      expect(result.freezeUsed).toBe(true);
      expect(result.streakIncremented).toBe(true);
      expect(result.newState.currentStreak).toBe(8); // Preserved and incremented for today
      expect(result.newState.freezeBufferCount).toBe(0); // Freeze buffer consumed
      expect(result.newState.lastFreezeUsedDate).toBe('2026-09-07');
    });

    it('should reset streak to 1 when missing a day with 0 streak freezes remaining', () => {
      const state: StreakState = {
        currentStreak: 10,
        bestStreak: 10,
        lastActiveDate: '2026-09-05',
        freezeBufferCount: 0, // No freeze available
        lastFreezeRefillWeek: '2026-W36',
        totalActiveDays: 10,
      };

      // Active on 2026-09-07 (missed 2026-09-06)
      const result = StreakEngine.calculateStreakWithFreeze(state, '2026-09-07', '2026-W36');
      expect(result.freezeUsed).toBe(false);
      expect(result.streakReset).toBe(true);
      expect(result.newState.currentStreak).toBe(1);
      expect(result.newState.bestStreak).toBe(10); // Best streak preserved!
    });

    it('should reset streak when missing more than 1 day even if freeze is available', () => {
      const state: StreakState = {
        currentStreak: 12,
        bestStreak: 12,
        lastActiveDate: '2026-09-01',
        freezeBufferCount: 1,
        lastFreezeRefillWeek: '2026-W36',
        totalActiveDays: 12,
      };

      // Active on 2026-09-05 (missed 3 days)
      const result = StreakEngine.calculateStreakWithFreeze(state, '2026-09-05', '2026-W36');
      expect(result.streakReset).toBe(true);
      expect(result.newState.currentStreak).toBe(1);
      expect(result.newState.bestStreak).toBe(12);
    });

    it('should refill streak freeze buffer when a new calendar week begins', () => {
      const state: StreakState = {
        currentStreak: 6,
        bestStreak: 6,
        lastActiveDate: '2026-09-05',
        freezeBufferCount: 0, // Consumed previous week
        lastFreezeRefillWeek: '2026-W36',
        totalActiveDays: 6,
      };

      // Moving to next week '2026-W37'
      const result = StreakEngine.calculateStreakWithFreeze(state, '2026-09-06', '2026-W37');
      expect(result.newState.freezeBufferCount).toBe(1); // Refilled!
      expect(result.newState.lastFreezeRefillWeek).toBe('2026-W37');
    });

    it('should support legacy calculateStreak method for backwards compatibility', () => {
      expect(StreakEngine.calculateStreak(null, '2026-09-01', 0)).toBe(1);
      expect(StreakEngine.calculateStreak('2026-09-01', '2026-09-01', 3)).toBe(3);
      expect(StreakEngine.calculateStreak('2026-09-01', '2026-09-02', 3)).toBe(4);
      expect(StreakEngine.calculateStreak('2026-09-01', '2026-09-04', 3)).toBe(1);
    });
  });

  describe('3. Career Titles & Progression Hierarchy', () => {
    it('should provide all 4 distinct statutory career levels', () => {
      expect(CAREER_LEVELS).toHaveLength(4);
      const ids = CAREER_LEVELS.map((c) => c.id);
      expect(ids).toEqual([
        'APPRENTICE',
        'BOOKKEEPER',
        'GENERAL_ACCOUNTANT',
        'CHIEF_ACCOUNTANT',
      ]);
    });

    it('should assign Junior Apprentice to beginners', () => {
      const level = StreakEngine.determineCareerLevel(0, 0);
      expect(level.id).toBe('APPRENTICE');
      expect(level.titleVi).toBe('Người mới bắt đầu');
      expect(level.titleEn).toBe('Junior Apprentice');
    });

    it('should promote to Bookkeeper with >= 3 milestones and >= 3 days streak', () => {
      expect(StreakEngine.determineCareerLevel(2, 5).id).toBe('APPRENTICE'); // Insufficient milestones
      expect(StreakEngine.determineCareerLevel(3, 2).id).toBe('APPRENTICE'); // Insufficient streak

      const bookkeeper = StreakEngine.determineCareerLevel(3, 3);
      expect(bookkeeper.id).toBe('BOOKKEEPER');
      expect(bookkeeper.titleVi).toBe('Nhân viên kế toán');
    });

    it('should promote to General Accountant with >= 6 milestones and >= 7 days streak', () => {
      expect(StreakEngine.determineCareerLevel(5, 10).id).toBe('BOOKKEEPER');
      expect(StreakEngine.determineCareerLevel(6, 6).id).toBe('BOOKKEEPER');

      const generalAcc = StreakEngine.determineCareerLevel(6, 7);
      expect(generalAcc.id).toBe('GENERAL_ACCOUNTANT');
      expect(generalAcc.titleVi).toBe('Kế toán tổng hợp');
    });

    it('should promote to Chief Accounting Officer with >= 9 milestones and >= 10 days streak', () => {
      expect(StreakEngine.determineCareerLevel(8, 20).id).toBe('GENERAL_ACCOUNTANT');
      expect(StreakEngine.determineCareerLevel(10, 8).id).toBe('GENERAL_ACCOUNTANT');

      const chief = StreakEngine.determineCareerLevel(9, 10);
      expect(chief.id).toBe('CHIEF_ACCOUNTANT');
      expect(chief.titleVi).toBe('Kế toán trưởng');
    });

    it('should calculate progression percentage towards next rank accurately', () => {
      const progress = StreakEngine.getCareerProgress(1, 1);
      expect(progress.currentLevel.id).toBe('APPRENTICE');
      expect(progress.nextLevel?.id).toBe('BOOKKEEPER');
      expect(progress.milestoneProgressPercent).toBe(33); // 1 / 3
      expect(progress.streakProgressPercent).toBe(33); // 1 / 3
      expect(progress.overallPercent).toBe(33);

      const maxLevel = StreakEngine.getCareerProgress(10, 15);
      expect(maxLevel.currentLevel.id).toBe('CHIEF_ACCOUNTANT');
      expect(maxLevel.nextLevel).toBeNull();
      expect(maxLevel.overallPercent).toBe(100);
    });
  });

  describe('4. Storage Integration & Activity Tracking', () => {
    it('should load initial state from empty storage and persist it', async () => {
      const state = await StreakEngine.loadStreakState(storage);
      expect(state.currentStreak).toBe(1);

      const reloaded = await StreakEngine.loadStreakState(storage);
      expect(reloaded).toEqual(state);
    });

    it('should record user activity and update persisted streak', async () => {
      const res1 = await StreakEngine.recordActivity(storage, '2026-09-01');
      expect(res1.state.currentStreak).toBe(1);

      const res2 = await StreakEngine.recordActivity(storage, '2026-09-02');
      expect(res2.state.currentStreak).toBe(2);
      expect(res2.incremented).toBe(true);

      const loaded = await StreakEngine.loadStreakState(storage);
      expect(loaded.currentStreak).toBe(2);
    });
  });
});
