import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import {
  X,
  Award,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  History,
  CheckCircle2,
  XCircle,
  BookOpen,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { MilestoneAssessmentResult } from '@/types/assessment';
import { getMilestoneTestByDay } from '@/data/milestone-tests';
import { gradeMilestoneAssessment } from '@/engine/grading-engine';
import { recordMilestoneAttempt } from '@/engine/gating-engine';
import { storageService } from '@/services/storage/storage-service';
import { DokBadge } from './DokBadge';
import { RuleOfOneCard } from './RuleOfOneCard';
import { ScoreHistoryModal } from './ScoreHistoryModal';

interface QuizModalProps {
  isOpen: boolean;
  milestoneDay: number;
  onClose: () => void;
  onComplete?: (result: MilestoneAssessmentResult) => void;
}

export const QuizModal: FC<QuizModalProps> = ({
  isOpen,
  milestoneDay,
  onClose,
  onComplete,
}) => {
  const test = useMemo(() => getMilestoneTestByDay(milestoneDay), [milestoneDay]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MilestoneAssessmentResult | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<MilestoneAssessmentResult[]>([]);
  const [showConfirmUnanswered, setShowConfirmUnanswered] = useState<boolean>(false);

  // Load existing score history on mount or when milestoneDay changes
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      storageService.getLearnerProgress().then((progress) => {
        if (isMounted && progress?.scoreHistory?.[milestoneDay]) {
          setHistoryList(progress.scoreHistory[milestoneDay]);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, milestoneDay]);

  if (!isOpen || !test) return null;

  const currentItem = test.items[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const totalCount = test.items.length;
  const isAllAnswered = answeredCount === totalCount;

  const handleSelectOption = (optionId: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentItem.id]: optionId,
    }));
  };

  const handlePerformGrading = async () => {
    const assessmentResult = gradeMilestoneAssessment(test, selectedAnswers);
    setResult(assessmentResult);
    setIsSubmitted(true);
    setShowConfirmUnanswered(false);

    // Save and sync with persistence layer
    const currentProgress = (await storageService.getLearnerProgress()) || {
      currentDay: 1,
      unlockedDays: [1, 2, 3],
      completedDays: [],
      milestoneScores: {},
      scoreHistory: {},
      streakDays: 1,
      lastActiveDate: new Date().toISOString(),
    };

    const updatedProgress = recordMilestoneAttempt(currentProgress, assessmentResult);
    await storageService.saveLearnerProgress(updatedProgress);

    if (updatedProgress.scoreHistory?.[milestoneDay]) {
      setHistoryList(updatedProgress.scoreHistory[milestoneDay]);
    }

    if (onComplete) {
      onComplete(assessmentResult);
    }
  };

  const handleSubmitAttempt = () => {
    if (!isAllAnswered) {
      setShowConfirmUnanswered(true);
      return;
    }
    handlePerformGrading();
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setResult(null);
    setIsSubmitted(false);
    setCurrentIndex(0);
    setShowConfirmUnanswered(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  Cột mốc #{test.moduleNumber} • Ngày {test.milestoneDay}
                </span>
                {historyList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen(true)}
                    className="inline-flex items-center space-x-1 text-[11px] font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    <History className="w-3 h-3" />
                    <span>Lịch sử ({historyList.length})</span>
                  </button>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {test.titleVi}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!isSubmitted ? (
            /* --- 1. ACTIVE TEST TAKER VIEW --- */
            <div className="space-y-6">
              {/* Question Navigation Bar & Progress Indicator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span>
                    Tiến độ: <strong>{answeredCount}</strong> / {totalCount} câu đã chọn
                  </span>
                  <span>{Math.round((answeredCount / totalCount) * 100)}% hoàn thành</span>
                </div>

                {/* Progress Line */}
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${(answeredCount / totalCount) * 100}%` }}
                  />
                </div>

                {/* 10 Question Paging Badges */}
                <div className="grid grid-cols-10 gap-1.5 pt-2">
                  {test.items.map((item, idx) => {
                    const isAnswered = Boolean(selectedAnswers[item.id]);
                    const isCurrent = idx === currentIndex;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`p-2 rounded-lg text-xs font-bold transition-all relative flex flex-col items-center justify-center ${
                          isCurrent
                            ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400'
                            : isAnswered
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{idx + 1}</span>
                        {isAnswered && !isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Question Display Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                    Câu {currentIndex + 1} / {totalCount}
                  </span>
                  <DokBadge dokLevel={currentItem.dokLevel} />
                </div>

                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {currentItem.questionVi}
                </p>

                {/* 4 Interactive Choice Cards */}
                <div className="space-y-2.5 pt-2">
                  {currentItem.options.map((option) => {
                    const isSelected = selectedAnswers[currentItem.id] === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelectOption(option.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-start space-x-3 ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-transparent'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-xs sm:text-sm font-medium leading-relaxed">
                          {option.textVi}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Unanswered Confirmation Warning */}
              {showConfirmUnanswered && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl space-y-2 text-xs text-amber-900 dark:text-amber-200 animate-fade-in">
                  <div className="font-bold flex items-center space-x-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>Lưu ý: Bạn còn {totalCount - answeredCount} câu hỏi chưa chọn đáp án!</span>
                  </div>
                  <p>
                    Các câu chưa trả lời sẽ được tính là 0 điểm. Bạn có chắc chắn muốn nộp bài đánh giá ngay bây giờ không?
                  </p>
                  <div className="pt-2 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handlePerformGrading}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold"
                    >
                      Vẫn nộp bài
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmUnanswered(false)}
                      className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-slate-700 dark:text-slate-300"
                    >
                      Quay lại làm tiếp
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Câu trước</span>
                </button>

                {currentIndex < totalCount - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(totalCount - 1, prev + 1))}
                    className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    <span>Câu tiếp theo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitAttempt}
                    className="inline-flex items-center space-x-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                  >
                    <Send className="w-4 h-4" />
                    <span>Nộp bài đánh giá</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* --- 2. INSTANT RESULTS & RULE OF ONE REVIEW VIEW --- */
            result && (
              <div className="space-y-6 animate-fade-in">
                {/* Score & Status Hero Banner */}
                <div
                  className={`p-6 rounded-2xl border text-center space-y-3 ${
                    result.passed
                      ? 'bg-gradient-to-b from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border-emerald-300 dark:border-emerald-800'
                      : 'bg-gradient-to-b from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/30 border-rose-300 dark:border-rose-800'
                  }`}
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white dark:bg-slate-900 shadow-md mx-auto">
                    <span
                      className={`text-2xl font-black ${
                        result.passed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {result.score}
                    </span>
                    <span className="text-xs text-slate-400 font-bold ml-0.5">/100</span>
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`text-base sm:text-lg font-bold ${
                        result.passed
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : 'text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {result.passed
                        ? '🎉 ĐẠT CHUẨN (≥ 70%) • ĐÃ MỞ KHÓA BÀI HỌC TIẾP THEO!'
                        : '⚠️ CHƯA ĐẠT CHUẨN (< 70%) • CẦN ÔN TẬP VÀ THỬ LẠI'}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                      {result.passed
                        ? `Chúc mừng bạn! Cổng kiểm soát tiến trình đã mở khóa các bài học Ngày ${milestoneDay + 1} đến ${Math.min(30, milestoneDay + 3)}.`
                        : `Theo quy tắc cổng chặn kiểm soát tiến trình (Gating State Machine), bạn cần đạt từ 70 điểm trở lên để mở khóa Ngày ${milestoneDay + 1}.`}
                    </p>
                  </div>

                  {/* DOK Points Breakdown Badges */}
                  {result.dokScoreBreakdown && (
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
                      <span className="px-3 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 font-semibold">
                        DOK 1: <strong>{result.dokScoreBreakdown.dok1.earned}</strong>/{result.dokScoreBreakdown.dok1.max}đ
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 font-semibold">
                        DOK 2: <strong>{result.dokScoreBreakdown.dok2.earned}</strong>/{result.dokScoreBreakdown.dok2.max}đ
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 font-semibold">
                        DOK 3: <strong>{result.dokScoreBreakdown.dok3.earned}</strong>/{result.dokScoreBreakdown.dok3.max}đ
                      </span>
                    </div>
                  )}
                </div>

                {/* Pedagogical Rule of One Diagnosis Card */}
                {result.ruleOfOneDiagnosis && (
                  <RuleOfOneCard
                    diagnosis={result.ruleOfOneDiagnosis}
                    onTakeAction={onClose}
                  />
                )}

                {/* Detailed 10-Item Review List */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>Chi Tiết Lời Giải & Căn Cứ Pháp Lý Từng Câu:</span>
                  </h3>

                  <div className="space-y-3">
                    {test.items.map((item, idx) => {
                      const itemResult = result.itemResults?.find((r) => r.itemId === item.id);
                      const isCorrect = itemResult?.isCorrect ?? false;
                      const selectedOptId = selectedAnswers[item.id];
                      const selectedOpt = item.options.find((o) => o.id === selectedOptId);
                      const correctOpt = item.options.find((o) => o.isCorrect);

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-xl border text-xs sm:text-sm space-y-3 ${
                            isCorrect
                              ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-rose-600 text-white'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {item.questionVi}
                              </span>
                            </div>

                            <DokBadge dokLevel={item.dokLevel} />
                          </div>

                          {/* Selected vs Correct answers */}
                          <div className="space-y-1.5 pl-8 text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-slate-500">Lựa chọn của bạn:</span>
                              <span
                                className={`font-bold flex items-center space-x-1 ${
                                  isCorrect ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {isCorrect ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                )}
                                <span>{selectedOpt?.textVi || 'Chưa chọn đáp án'}</span>
                              </span>
                            </div>

                            {!isCorrect && (
                              <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300">
                                <span className="font-semibold text-slate-500">Đáp án chính xác:</span>
                                <span className="font-bold">{correctOpt?.textVi}</span>
                              </div>
                            )}
                          </div>

                          {/* Thorough statutory explanation */}
                          <div className="ml-8 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              Giải thích chi tiết:
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                              {item.explanationVi}
                            </p>
                            {item.statutoryReference && (
                              <div className="pt-1 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center space-x-1">
                                <FileText className="w-3 h-3" />
                                <span>Căn cứ pháp lý: {item.statutoryReference}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Làm lại bài kiểm tra</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsHistoryOpen(true)}
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <History className="w-4 h-4" />
                      <span>Xem lịch sử điểm thi</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Đóng & Quay lại bài học
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Embedded Score History Modal */}
      <ScoreHistoryModal
        isOpen={isHistoryOpen}
        milestoneDay={milestoneDay}
        history={historyList}
        onClose={() => setIsHistoryOpen(false)}
        onRetake={handleRetake}
      />
    </div>
  );
};
