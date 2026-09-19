import { useState } from 'react';
import type { FC } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  Award,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { AccountingRegime } from '@/types/coa';
import { MODULE_METADATA } from '@/data/curriculum';
import { LessonReader } from './LessonReader';
import { QuizModal } from '@/components/assessment/QuizModal';

interface CurriculumPreviewProps {
  currentRegime: AccountingRegime;
  onNavigateToCoa: () => void;
}

export const CurriculumPreview: FC<CurriculumPreviewProps> = ({
  currentRegime,
  onNavigateToCoa,
}) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeQuizDay, setActiveQuizDay] = useState<number | null>(null);

  if (selectedDay !== null) {
    return (
      <LessonReader
        initialDay={selectedDay}
        onNavigateToCoa={onNavigateToCoa}
        onBackToOverview={() => setSelectedDay(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl text-white shadow-md space-y-3">
        <div className="flex items-center space-x-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
          <GraduationCap className="w-5 h-5" />
          <span>Lộ Trình Học Kế Toán Toàn Diện 30 Ngày</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">
          10 Khối Học Phần & Bài Đọc Hàng Ngày (Ngày 1 đến 30)
        </h1>
        <p className="text-sm text-emerald-100 max-w-2xl leading-relaxed">
          Mỗi ngày dành từ 15–20 phút để làm chủ 3–5 khái niệm cốt lõi kèm Sơ đồ chữ T tương tác, mẫu chứng từ hóa đơn điện tử NĐ 123 và phiếu thu/chi/UNC thực tế.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedDay(1)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-50 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Bắt đầu học Ngày 1 ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNavigateToCoa}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-800/60 hover:bg-emerald-800/80 text-white text-xs font-bold rounded-xl border border-emerald-400/30 transition-colors"
          >
            <span>Tra cứu hệ thống tài khoản</span>
          </button>
          <span className="text-xs text-emerald-200">
            Chế độ: <strong>{currentRegime === 'CIRCULAR_200' ? 'Thông tư 200' : 'Thông tư 133'}</strong>
          </span>
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODULE_METADATA.map((m) => (
          <div
            key={m.moduleNumber}
            className="p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  M{m.moduleNumber}
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Ngày {m.days[0]} - {m.days[2]}
                  </span>
                  <div className="text-[11px] text-slate-400">
                    Cột mốc: Ngày {m.milestoneDay}
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>3 ngày học</span>
              </span>
            </div>

            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              {m.titleVi}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {m.subtitleVi}
            </p>

            {/* Direct Day Buttons */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5">
                {m.days.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDay(d)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Ngày {d}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveQuizDay(m.milestoneDay)}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-200 dark:border-amber-800 rounded-lg font-semibold transition-colors"
                title={`Làm bài kiểm tra Cột mốc Ngày ${m.milestoneDay}`}
              >
                <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Test #{m.moduleNumber} (N{m.milestoneDay})</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Embedded Quiz Modal for direct module testing */}
      {activeQuizDay !== null && (
        <QuizModal
          isOpen={true}
          milestoneDay={activeQuizDay}
          onClose={() => setActiveQuizDay(null)}
        />
      )}
    </div>
  );
};
