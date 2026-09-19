/**
 * STREAK & PROGRESSION ENGINE
 * Vietnam Accounting 30-Day Learning Platform
 *
 * Implements:
 * 1. Daily study streak tracking calibrated to Vietnam calendar time (Asia/Ho_Chi_Minh, UTC+7).
 * 2. Weekly "Streak Freeze" buffer protection (preserves streak when a day is missed).
 * 3. Escalating career titles based on milestone test completions and active streak:
 *    - Người mới bắt đầu (Junior Apprentice)
 *    - Nhân viên kế toán (Bookkeeper)
 *    - Kế toán tổng hợp (General Accountant)
 *    - Kế toán trưởng (Chief Accounting Officer)
 * 4. Synchronization with StorageService (IndexedDB + LocalStorage).
 */

import { IStorageAdapter } from '@/types/storage';

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const DEFAULT_WEEKLY_FREEZE_BUFFER = 1;
export const STORAGE_KEY_STREAK = 'user_streak_state';

export interface StreakState {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  freezeBufferCount: number; // available freezes (0 or 1+)
  lastFreezeUsedDate?: string;
  lastFreezeRefillWeek?: string; // YYYY-WW to track weekly refill
  totalActiveDays: number;
}

export type CareerTitleId =
  | 'APPRENTICE'
  | 'BOOKKEEPER'
  | 'GENERAL_ACCOUNTANT'
  | 'CHIEF_ACCOUNTANT';

export interface CareerLevel {
  id: CareerTitleId;
  level: number;
  titleVi: string;
  titleEn: string;
  minMilestonesPassed: number;
  minStreakDays: number;
  badgeIcon: string;
  colorClass: string;
  descriptionVi: string;
}

export const CAREER_LEVELS: CareerLevel[] = [
  {
    id: 'APPRENTICE',
    level: 1,
    titleVi: 'Người mới bắt đầu',
    titleEn: 'Junior Apprentice',
    minMilestonesPassed: 0,
    minStreakDays: 0,
    badgeIcon: 'Seedling',
    colorClass: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800',
    descriptionVi: 'Làm quen với phương trình kế toán và hệ thống tài khoản',
  },
  {
    id: 'BOOKKEEPER',
    level: 2,
    titleVi: 'Nhân viên kế toán',
    titleEn: 'Bookkeeper',
    minMilestonesPassed: 3,
    minStreakDays: 3,
    badgeIcon: 'BookOpen',
    colorClass: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950',
    descriptionVi: 'Thành thạo định khoản tiền mặt, ngân hàng và hàng tồn kho',
  },
  {
    id: 'GENERAL_ACCOUNTANT',
    level: 3,
    titleVi: 'Kế toán tổng hợp',
    titleEn: 'General Accountant',
    minMilestonesPassed: 6,
    minStreakDays: 7,
    badgeIcon: 'Award',
    colorClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950',
    descriptionVi: 'Nắm vững chi phí giá thành, TSCĐ, tiền lương và doanh thu',
  },
  {
    id: 'CHIEF_ACCOUNTANT',
    level: 4,
    titleVi: 'Kế toán trưởng',
    titleEn: 'Chief Accounting Officer',
    minMilestonesPassed: 9,
    minStreakDays: 10,
    badgeIcon: 'Crown',
    colorClass: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950',
    descriptionVi: 'Chuyên gia khóa sổ, lập Báo cáo tài chính và soát xét thuế',
  },
];

export class StreakEngine {
  /**
   * Formats a date into YYYY-MM-DD in the Asia/Ho_Chi_Minh timezone.
   */
  static getVietnamCalendarDate(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: VIETNAM_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  }

  /**
   * Formats date into Year-Week identifier (e.g., '2026-W37') to enforce weekly refills.
   */
  static getVietnamYearWeek(date: Date = new Date()): string {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7; // Monday = 0
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    return `${target.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }

  /**
   * Calculates difference in calendar days between two YYYY-MM-DD strings.
   */
  static getDaysBetween(dateStrA: string, dateStrB: string): number {
    const [yA, mA, dA] = dateStrA.split('-').map(Number);
    const [yB, mB, dB] = dateStrB.split('-').map(Number);
    const dateA = Date.UTC(yA, mA - 1, dA);
    const dateB = Date.UTC(yB, mB - 1, dB);
    const diffMs = dateB - dateA;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Default initial streak state.
   */
  static getInitialState(initialDate?: string): StreakState {
    const todayStr = initialDate || this.getVietnamCalendarDate();
    return {
      currentStreak: 1,
      bestStreak: 1,
      lastActiveDate: todayStr,
      freezeBufferCount: DEFAULT_WEEKLY_FREEZE_BUFFER,
      lastFreezeRefillWeek: this.getVietnamYearWeek(),
      totalActiveDays: 1,
    };
  }

  /**
   * Evaluates streak continuation given previous state and target active date.
   * Handles same day, consecutive day, streak freeze usage, and reset.
   */
  static calculateStreakWithFreeze(
    prevState: StreakState | null,
    currentDateStr: string = this.getVietnamCalendarDate(),
    currentWeekStr: string = this.getVietnamYearWeek()
  ): {
    newState: StreakState;
    freezeUsed: boolean;
    streakIncremented: boolean;
    streakReset: boolean;
  } {
    if (!prevState || !prevState.lastActiveDate) {
      const initial = this.getInitialState(currentDateStr);
      return {
        newState: initial,
        freezeUsed: false,
        streakIncremented: true,
        streakReset: false,
      };
    }

    let availableFreezes = prevState.freezeBufferCount;
    let refillWeek = prevState.lastFreezeRefillWeek;

    // Check weekly refill: if new calendar week, refill buffer up to 1
    if (!refillWeek || refillWeek !== currentWeekStr) {
      if (availableFreezes < DEFAULT_WEEKLY_FREEZE_BUFFER) {
        availableFreezes = DEFAULT_WEEKLY_FREEZE_BUFFER;
      }
      refillWeek = currentWeekStr;
    }

    const diffDays = this.getDaysBetween(prevState.lastActiveDate, currentDateStr);

    // Negative diff (e.g. clock change or backfilled dates): keep state
    if (diffDays < 0) {
      return {
        newState: {
          ...prevState,
          freezeBufferCount: availableFreezes,
          lastFreezeRefillWeek: refillWeek,
        },
        freezeUsed: false,
        streakIncremented: false,
        streakReset: false,
      };
    }

    // 0 days: already active today
    if (diffDays === 0) {
      return {
        newState: {
          ...prevState,
          freezeBufferCount: availableFreezes,
          lastFreezeRefillWeek: refillWeek,
        },
        freezeUsed: false,
        streakIncremented: false,
        streakReset: false,
      };
    }

    // 1 day: consecutive daily activity!
    if (diffDays === 1) {
      const newStreak = prevState.currentStreak + 1;
      return {
        newState: {
          currentStreak: newStreak,
          bestStreak: Math.max(prevState.bestStreak, newStreak),
          lastActiveDate: currentDateStr,
          freezeBufferCount: availableFreezes,
          lastFreezeRefillWeek: refillWeek,
          totalActiveDays: prevState.totalActiveDays + 1,
          lastFreezeUsedDate: prevState.lastFreezeUsedDate,
        },
        freezeUsed: false,
        streakIncremented: true,
        streakReset: false,
      };
    }

    // 2 days (missed exactly 1 day): check if freeze buffer can protect
    if (diffDays === 2 && availableFreezes > 0) {
      // Freeze buffer protects!
      const newStreak = prevState.currentStreak + 1;
      return {
        newState: {
          currentStreak: newStreak,
          bestStreak: Math.max(prevState.bestStreak, newStreak),
          lastActiveDate: currentDateStr,
          freezeBufferCount: availableFreezes - 1,
          lastFreezeUsedDate: currentDateStr,
          lastFreezeRefillWeek: refillWeek,
          totalActiveDays: prevState.totalActiveDays + 1,
        },
        freezeUsed: true,
        streakIncremented: true,
        streakReset: false,
      };
    }

    // More than 1 day missed, or no freeze available: streak resets to 1
    return {
      newState: {
        currentStreak: 1,
        bestStreak: prevState.bestStreak,
        lastActiveDate: currentDateStr,
        freezeBufferCount: availableFreezes,
        lastFreezeRefillWeek: refillWeek,
        totalActiveDays: prevState.totalActiveDays + 1,
        lastFreezeUsedDate: prevState.lastFreezeUsedDate,
      },
      freezeUsed: false,
      streakIncremented: false,
      streakReset: true,
    };
  }

  /**
   * Backwards-compatible legacy method matching tests/helpers/domain-engines.ts.
   */
  static calculateStreak(
    lastActiveDateStr: string | null,
    currentDateStr: string,
    currentStreak: number
  ): number {
    if (!lastActiveDateStr) return 1;

    const diff = this.getDaysBetween(lastActiveDateStr, currentDateStr);
    if (diff === 0) return currentStreak;
    if (diff === 1) return currentStreak + 1;
    return 1;
  }

  /**
   * Computes the user's career level based on milestone tests passed and current streak.
   */
  static determineCareerLevel(
    milestonesPassedCount: number,
    currentStreakDays: number
  ): CareerLevel {
    // Traverse from highest rank to lowest
    for (let i = CAREER_LEVELS.length - 1; i >= 0; i--) {
      const level = CAREER_LEVELS[i];
      if (
        milestonesPassedCount >= level.minMilestonesPassed &&
        currentStreakDays >= level.minStreakDays
      ) {
        return level;
      }
    }
    return CAREER_LEVELS[0];
  }

  /**
   * Computes progress percentage towards the next career level.
   */
  static getCareerProgress(
    milestonesPassedCount: number,
    currentStreakDays: number
  ): {
    currentLevel: CareerLevel;
    nextLevel: CareerLevel | null;
    milestoneProgressPercent: number;
    streakProgressPercent: number;
    overallPercent: number;
  } {
    const currentLevel = this.determineCareerLevel(milestonesPassedCount, currentStreakDays);
    const currentIndex = CAREER_LEVELS.findIndex((l) => l.id === currentLevel.id);
    const nextLevel =
      currentIndex < CAREER_LEVELS.length - 1 ? CAREER_LEVELS[currentIndex + 1] : null;

    if (!nextLevel) {
      return {
        currentLevel,
        nextLevel: null,
        milestoneProgressPercent: 100,
        streakProgressPercent: 100,
        overallPercent: 100,
      };
    }

    const mTarget = nextLevel.minMilestonesPassed;
    const sTarget = nextLevel.minStreakDays;

    const mPercent = mTarget > 0 ? Math.min(100, (milestonesPassedCount / mTarget) * 100) : 100;
    const sPercent = sTarget > 0 ? Math.min(100, (currentStreakDays / sTarget) * 100) : 100;
    const overall = Math.round((mPercent + sPercent) / 2);

    return {
      currentLevel,
      nextLevel,
      milestoneProgressPercent: Math.round(mPercent),
      streakProgressPercent: Math.round(sPercent),
      overallPercent: overall,
    };
  }

  /**
   * Loads streak state from StorageService, applying any necessary day-rollover or freeze.
   */
  static async loadStreakState(
    storage: IStorageAdapter,
    defaultDate?: string
  ): Promise<StreakState> {
    const saved = await storage.getItem<StreakState>(STORAGE_KEY_STREAK);
    if (!saved) {
      const initial = this.getInitialState(defaultDate);
      await storage.setItem(STORAGE_KEY_STREAK, initial);
      return initial;
    }
    return saved;
  }

  /**
   * Records user activity (e.g. studying, posting in workbench, completing a test).
   */
  static async recordActivity(
    storage: IStorageAdapter,
    customDateStr?: string
  ): Promise<{ state: StreakState; freezeUsed: boolean; incremented: boolean }> {
    const dateStr = customDateStr || this.getVietnamCalendarDate();
    const current = await storage.getItem<StreakState>(STORAGE_KEY_STREAK);

    if (!current) {
      const initial = this.getInitialState(dateStr);
      await storage.setItem(STORAGE_KEY_STREAK, initial);
      return {
        state: initial,
        freezeUsed: false,
        incremented: true,
      };
    }

    const result = this.calculateStreakWithFreeze(current, dateStr);
    await storage.setItem(STORAGE_KEY_STREAK, result.newState);
    return {
      state: result.newState,
      freezeUsed: result.freezeUsed,
      incremented: result.streakIncremented,
    };
  }
}
