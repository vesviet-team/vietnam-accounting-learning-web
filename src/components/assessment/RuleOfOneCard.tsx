import type { FC } from 'react';
import { RuleOfOneDiagnosis } from '@/types/assessment';
import {
  Sparkles,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Scale,
  FileCheck2,
  GitCompare,
  Calculator,
} from 'lucide-react';

interface RuleOfOneCardProps {
  diagnosis: RuleOfOneDiagnosis;
  onTakeAction?: () => void;
  className?: string;
}

export const RuleOfOneCard: FC<RuleOfOneCardProps> = ({
  diagnosis,
  onTakeAction,
  className = '',
}) => {
  const isPerfect = !diagnosis.priorityLevel;

  if (isPerfect) {
    return (
      <div
        className={`p-5 sm:p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl shadow-xs space-y-3 ${className}`}
      >
        <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm sm:text-base">
          <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
          <span>Nguyên Lý Một Trọng Tâm (Rule of One): Xuất Sắc 100%</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {diagnosis.growthMindsetFeedbackVi}
        </p>
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{diagnosis.actionableNextStepVi}</span>
        </div>
      </div>
    );
  }

  const getPriorityBadge = (level?: number) => {
    switch (level) {
      case 1:
        return {
          icon: <Scale className="w-4 h-4 text-rose-500" />,
          label: 'Ưu tiên 1: Lỗi Khái Niệm Nền Tảng (Nợ / Có & Tài sản)',
          badgeColor: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        };
      case 2:
        return {
          icon: <FileCheck2 className="w-4 h-4 text-amber-500" />,
          label: 'Ưu tiên 2: Lỗi Vi Phạm Ngưỡng & Quy Định Thuế Bắt Buộc',
          badgeColor: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        };
      case 3:
        return {
          icon: <GitCompare className="w-4 h-4 text-blue-500" />,
          label: 'Ưu tiên 3: Lỗi Phân Biệt Chế Độ Kế Toán (TT 200 vs TT 133)',
          badgeColor: 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
        };
      case 4:
      default:
        return {
          icon: <Calculator className="w-4 h-4 text-indigo-500" />,
          label: 'Ưu tiên 4: Lỗi Tính Toán Số Học & Công Thức Phân Bổ',
          badgeColor: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
        };
    }
  };

  const badgeInfo = getPriorityBadge(diagnosis.priorityLevel);

  return (
    <div
      className={`p-5 sm:p-6 bg-gradient-to-br from-amber-500/10 via-slate-50 to-amber-500/5 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-950 border border-amber-300 dark:border-amber-800/70 rounded-2xl shadow-xs space-y-4 ${className}`}
    >
      {/* Header & Principle Label */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-sm sm:text-base">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>Chẩn Đoán Sư Phạm: Nguyên Lý Một Trọng Tâm (Rule of One)</span>
        </div>

        <span
          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${badgeInfo.badgeColor}`}
        >
          {badgeInfo.icon}
          <span>{badgeInfo.label}</span>
        </span>
      </div>

      {/* Growth Mindset Coaching Section */}
      <div className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white/70 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700">
        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Điểm Cần Thấu Đáo:</span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 italic">
          "{diagnosis.growthMindsetFeedbackVi}"
        </p>
      </div>

      {/* Highlighted Single Actionable Directive */}
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
          <ArrowRight className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>DUY NHẤT 01 HÀNH ĐỘNG CẦN THỰC HIỆN NGAY:</span>
        </div>
        <p className="text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-100 leading-relaxed">
          {diagnosis.actionableNextStepVi}
        </p>

        {onTakeAction && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onTakeAction}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              <span>Xem bài học & thực hành ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
