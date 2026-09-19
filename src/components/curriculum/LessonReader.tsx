import { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  Layers,
  ArrowRight,
  ListFilter,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { DailyLesson, LearnerProgress } from '@/types/curriculum';
import { MilestoneAssessmentResult } from '@/types/assessment';
import {
  getAllLessons,
  getLessonByDay,
  MODULE_METADATA,
} from '@/data/curriculum';
import {
  canAccessDay,
  isMilestonePassed,
  getPrerequisiteMilestone,
  createInitialLearnerProgress,
} from '@/engine/gating-engine';
import { QuizModal } from '@/components/assessment/QuizModal';
import { TAccountView } from './TAccountView';
import { VoucherCard } from './VoucherCard';
import { storageService } from '@/services/storage/storage-service';

interface LessonReaderProps {
  initialDay?: number;
  onNavigateToCoa?: () => void;
  onBackToOverview?: () => void;
}

export const LessonReader: FC<LessonReaderProps> = ({
  initialDay = 1,
  onNavigateToCoa,
  onBackToOverview,
}) => {
  const [currentDay, setCurrentDay] = useState<number>(initialDay);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [learnerProgress, setLearnerProgress] = useState<LearnerProgress>(createInitialLearnerProgress());
  const [activeConceptIndex, setActiveConceptIndex] = useState<number>(0);
  const [isDaySelectorOpen, setIsDaySelectorOpen] = useState<boolean>(false);

  // Quiz Modal State
  const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);
  const [activeQuizDay, setActiveQuizDay] = useState<number>(3);
  const [lockedDayAlert, setLockedDayAlert] = useState<{ targetDay: number; prereqMilestone: number } | null>(null);

  const loadProgressFromStorage = async () => {
    const prog = await storageService.getLearnerProgress();
    if (prog) {
      setLearnerProgress(prog);
      if (prog.completedDays) {
        setCompletedDays(prog.completedDays);
      }
    }
  };

  // Load persistence progress on mount
  useEffect(() => {
    let isMounted = true;
    storageService.getLearnerProgress().then((prog) => {
      if (isMounted && prog) {
        setLearnerProgress(prog);
        if (prog.completedDays) {
          setCompletedDays(prog.completedDays);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const lesson: DailyLesson = useMemo(() => {
    return getLessonByDay(currentDay) || getLessonByDay(1)!;
  }, [currentDay]);

  const moduleMeta = useMemo(() => {
    return MODULE_METADATA.find((m) => m.moduleNumber === lesson.moduleNumber);
  }, [lesson.moduleNumber]);

  const isCurrentDayCompleted = completedDays.includes(currentDay);
  const isCurrentDayAccessible = canAccessDay(currentDay, learnerProgress);

  const handleToggleComplete = async () => {
    let newCompleted: number[];
    if (isCurrentDayCompleted) {
      newCompleted = completedDays.filter((d) => d !== currentDay);
    } else {
      newCompleted = [...completedDays, currentDay];
    }
    setCompletedDays(newCompleted);

    const updatedProgress: LearnerProgress = {
      ...learnerProgress,
      currentDay,
      completedDays: newCompleted,
      lastActiveDate: new Date().toISOString(),
    };

    setLearnerProgress(updatedProgress);
    await storageService.saveLearnerProgress(updatedProgress);
  };

  const handleSelectDay = (day: number) => {
    if (!canAccessDay(day, learnerProgress)) {
      const prereq = getPrerequisiteMilestone(day);
      setLockedDayAlert({ targetDay: day, prereqMilestone: prereq || 3 });
      return;
    }

    setLockedDayAlert(null);
    setCurrentDay(day);
    setActiveConceptIndex(0);
    setIsDaySelectorOpen(false);

    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        // Safe fallback for testing environments
      }
    }
  };

  const handlePrevDay = () => {
    if (currentDay > 1) {
      handleSelectDay(currentDay - 1);
    }
  };

  const handleNextDay = () => {
    if (currentDay < 30) {
      handleSelectDay(currentDay + 1);
    }
  };

  const handleOpenQuiz = (day: number) => {
    setActiveQuizDay(day);
    setIsQuizModalOpen(true);
  };

  const handleQuizComplete = async (_result: MilestoneAssessmentResult) => {
    await loadProgressFromStorage();
  };

  const allLessons = useMemo(() => getAllLessons(), []);

  const currentMilestoneScore = learnerProgress.milestoneScores?.[currentDay] ?? 0;
  const hasCurrentMilestonePassed = isMilestonePassed(currentDay, learnerProgress);

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-5xl mx-auto">
      {/* Top Header Card & Quick Day Jump */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Upper Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold rounded-lg uppercase">
              Khối {lesson.moduleNumber} / 10
            </span>
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              {lesson.moduleTitleVi} {moduleMeta?.subtitleVi ? `• ${moduleMeta.subtitleVi}` : ''}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {onBackToOverview && (
              <button
                type="button"
                onClick={onBackToOverview}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
              >
                Tổng quan lộ trình
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsDaySelectorOpen(!isDaySelectorOpen)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors font-semibold"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Chọn Ngày ({currentDay}/30)</span>
            </button>
          </div>
        </div>

        {/* 30-Day Grid Drawer Selector with Gating Indicators */}
        {isDaySelectorOpen && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Danh mục 30 Ngày học Kế toán</span>
              <span className="text-emerald-600">
                Đã hoàn thành: {completedDays.length} / 30 ngày
              </span>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {allLessons.map((l) => {
                const isCurrent = l.day === currentDay;
                const isDone = completedDays.includes(l.day);
                const isMilestone = l.isMilestoneDay;
                const isUnlocked = canAccessDay(l.day, learnerProgress);

                return (
                  <button
                    key={l.day}
                    type="button"
                    onClick={() => handleSelectDay(l.day)}
                    title={
                      !isUnlocked
                        ? `Ngày ${l.day} đang bị khóa. Hoàn thành Milestone Ngày ${getPrerequisiteMilestone(l.day)} (≥70%) để mở khóa!`
                        : `Học Ngày ${l.day}`
                    }
                    className={`p-2 rounded-lg text-xs font-bold transition-all relative flex flex-col items-center justify-center ${
                      isCurrent
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                        : !isUnlocked
                        ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
                        : isDone
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>N{l.day}</span>
                    {!isUnlocked ? (
                      <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500 mt-0.5" />
                    ) : isDone ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5" />
                    ) : isMilestone ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Locked Day Alert Banner if user clicked a locked day */}
        {lockedDayAlert && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl flex items-start justify-between gap-3 text-xs text-rose-900 dark:text-rose-200 animate-fade-in">
            <div className="flex items-start space-x-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">
                  Ngày {lockedDayAlert.targetDay} đang bị khóa theo Cổng kiểm soát tiến trình!
                </div>
                <p>
                  Bạn cần vượt qua <strong>Bài kiểm tra Cột mốc Ngày {lockedDayAlert.prereqMilestone}</strong> với điểm số từ 70% trở lên để mở khóa bài học này.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenQuiz(lockedDayAlert.prereqMilestone)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shrink-0 transition-colors shadow-xs"
            >
              Làm bài test Ngày {lockedDayAlert.prereqMilestone}
            </button>
          </div>
        )}

        {/* Main Lesson Title & Stats */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {lesson.dayTitleVi}
            </h1>
            {isCurrentDayCompleted && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã hoàn thành</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Thời lượng đọc: ~{lesson.estimatedMinutes} phút</span>
            </span>
            <span className="flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lesson.concepts.length} khái niệm cốt lõi</span>
            </span>
            {lesson.isMilestoneDay && (
              <span className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-semibold">
                <Award className="w-3.5 h-3.5" />
                <span>Ngày kết thúc Khối & Kiểm tra cột mốc</span>
              </span>
            )}
          </div>
        </div>

        {/* Milestone Alert & Action Banner */}
        {lesson.isMilestoneDay && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-300 dark:border-amber-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-sm text-amber-950 dark:text-amber-100 flex items-center space-x-2">
                  <span>Cột mốc đánh giá định kỳ: Bài Test #{lesson.moduleNumber}</span>
                  {currentMilestoneScore > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        hasCurrentMilestonePassed
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {currentMilestoneScore}/100đ • {hasCurrentMilestonePassed ? 'ĐÃ ĐẠT' : 'CHƯA ĐẠT'}
                    </span>
                  )}
                </div>
                <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                  Bài kiểm tra 10 câu hỏi chuẩn Webb's DOK (DOK 1, 2, 3) giúp rà soát toàn diện kiến thức của khối. Đạt từ 70% trở lên sẽ mở khóa Ngày {currentDay + 1}!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenQuiz(currentDay)}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-600/20 shrink-0"
            >
              <Award className="w-4 h-4" />
              <span>{hasCurrentMilestonePassed ? 'Làm lại bài kiểm tra' : 'Bắt đầu làm bài test'}</span>
            </button>
          </div>
        )}
      </div>

      {/* If Day is strictly locked (e.g. initialDay locked or accessed improperly), show Locked Screen */}
      {!isCurrentDayAccessible ? (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Bài học Ngày {currentDay} Đang Bị Khóa
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Theo quy tắc cổng chặn kiểm soát tiến trình (Gating State Machine), bạn cần hoàn thành bài kiểm tra Cột mốc Ngày {getPrerequisiteMilestone(currentDay) || 3} với điểm số từ 70% trở lên để mở khóa các bài học tiếp theo.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenQuiz(getPrerequisiteMilestone(currentDay) || 3)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs inline-flex items-center space-x-1.5"
            >
              <Award className="w-4 h-4" />
              <span>Làm bài test Ngày {getPrerequisiteMilestone(currentDay) || 3} ngay</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDay(getPrerequisiteMilestone(currentDay) || 1)}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
            >
              Quay về Ngày {getPrerequisiteMilestone(currentDay) || 1}
            </button>
          </div>
        </div>
      ) : (
        /* Accessible Lesson Content */
        <>
          {/* Concept Tab Switcher */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {lesson.concepts.map((concept, idx) => (
              <button
                key={concept.id}
                type="button"
                onClick={() => setActiveConceptIndex(idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                  activeConceptIndex === idx
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <span>Khái niệm {idx + 1}</span>
              </button>
            ))}
          </div>

          {/* Active Concept Body Card */}
          {lesson.concepts[activeConceptIndex] && (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Khái niệm {activeConceptIndex + 1} / {lesson.concepts.length}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                  {lesson.concepts[activeConceptIndex].titleVi}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {lesson.concepts[activeConceptIndex].summaryVi}
                </p>
              </div>

              {/* Main Rich Content Section */}
              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-4 whitespace-pre-line">
                {lesson.concepts[activeConceptIndex].contentVi}
              </div>

              {/* T-Account Visual Component */}
              {lesson.concepts[activeConceptIndex].detailedTAccounts && (
                <div className="space-y-4 pt-2">
                  {lesson.concepts[activeConceptIndex].detailedTAccounts!.map((acc) => (
                    <TAccountView key={acc.accountCode} initialData={acc} />
                  ))}
                </div>
              )}

              {/* Voucher Illustrations */}
              {lesson.concepts[activeConceptIndex].vouchers && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Chứng từ kế toán thực tế minh họa</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {lesson.concepts[activeConceptIndex].vouchers!.map((v, i) => (
                      <VoucherCard key={i} voucher={v} />
                    ))}
                  </div>
                </div>
              )}

              {/* Key Takeaway Box */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80 flex items-start space-x-3 text-xs text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[11px]">
                    Điểm cốt lõi cần nhớ (Key Takeaway)
                  </span>
                  <p className="mt-0.5 font-medium leading-relaxed">
                    {lesson.concepts[activeConceptIndex].keyTakeawayVi}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Completion & Navigation Footer Controls */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              type="button"
              onClick={handlePrevDay}
              disabled={currentDay <= 1}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Ngày {Math.max(1, currentDay - 1)}</span>
            </button>

            {/* Middle Actions: Completion & Milestone Launch */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleToggleComplete}
                className={`inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  isCurrentDayCompleted
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isCurrentDayCompleted ? 'Đã hoàn thành bài học (Nhấn để hủy)' : 'Đánh dấu đã hoàn thành bài học'}
                </span>
              </button>

              {lesson.isMilestoneDay && (
                <button
                  type="button"
                  onClick={() => handleOpenQuiz(currentDay)}
                  className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs"
                >
                  <Award className="w-4 h-4" />
                  <span>Làm bài kiểm tra Cột mốc #{lesson.moduleNumber}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              disabled={currentDay >= 30}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Ngày {Math.min(30, currentDay + 1)}</span>
              {currentDay < 30 && !canAccessDay(currentDay + 1, learnerProgress) ? (
                <Lock className="w-3.5 h-3.5 text-amber-500 ml-1" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </>
      )}

      {/* Shortcut link to COA Explorer */}
      {onNavigateToCoa && (
        <div className="text-center">
          <button
            type="button"
            onClick={onNavigateToCoa}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <span>Cần tra cứu tài khoản cho bài học này? Mở Hệ thống Tài khoản (COA)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Global Interactive Quiz Modal */}
      <QuizModal
        isOpen={isQuizModalOpen}
        milestoneDay={activeQuizDay}
        onClose={() => setIsQuizModalOpen(false)}
        onComplete={handleQuizComplete}
      />
    </div>
  );
};
