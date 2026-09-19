import type { FC } from 'react';
import { MilestoneAssessmentResult } from '@/types/assessment';
import {
  X,
  History,
  Trophy,
  CheckCircle2,
  XCircle,
  Calendar,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface ScoreHistoryModalProps {
  isOpen: boolean;
  milestoneDay: number;
  history: MilestoneAssessmentResult[];
  onClose: () => void;
  onRetake?: () => void;
}

export const ScoreHistoryModal: FC<ScoreHistoryModalProps> = ({
  isOpen,
  milestoneDay,
  history,
  onClose,
  onRetake,
}) => {
  if (!isOpen) return null;

  const highestScore = history.length > 0 ? Math.max(...history.map((h) => h.score)) : 0;
  const moduleNumber = Math.ceil(milestoneDay / 3);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Lịch Sử Làm Bài: Milestone #{moduleNumber} (Ngày {milestoneDay})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lưu trữ toàn bộ các lần thử sức và cập nhật điểm số cao nhất
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Summary Stat Card */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <Trophy className="w-4 h-4 text-emerald-600" />
              <span>Điểm cao nhất hiện tại:</span>
            </div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {highestScore} / 100 điểm
            </div>
          </div>

          {/* History List */}
          {history.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs sm:text-sm space-y-2">
              <History className="w-8 h-8 mx-auto opacity-40" />
              <p>Bạn chưa thực hiện lần làm bài nào cho Cột mốc Ngày {milestoneDay}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((attempt, index) => {
                const isBest = attempt.score === highestScore && highestScore > 0;
                return (
                  <div
                    key={`${attempt.attemptTimestamp}-${index}`}
                    className={`p-4 rounded-xl border transition-all ${
                      isBest
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
                          #{index + 1}
                        </span>
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(attempt.attemptTimestamp)}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isBest && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Cao nhất</span>
                          </span>
                        )}

                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            attempt.passed
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {attempt.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span>
                            {attempt.score}đ • {attempt.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {attempt.ruleOfOneDiagnosis && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">
                          {attempt.ruleOfOneDiagnosis.highestPriorityErrorVi}
                        </div>
                        <div className="text-emerald-600 dark:text-emerald-400">
                          → {attempt.ruleOfOneDiagnosis.actionableNextStepVi}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Đóng
          </button>

          {onRetake && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRetake();
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm lại bài kiểm tra này</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
