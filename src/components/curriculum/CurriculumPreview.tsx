import { useState, useEffect } from 'react';
import type { FC } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  Award,
  ArrowRight,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Cloud,
  LogIn,
} from 'lucide-react';
import { AccountingRegime } from '@/types/coa';
import { AuthUser } from '@/types/auth';
import { LearnerProgress } from '@/types/curriculum';
import { MODULE_METADATA, getLessonByDay } from '@/data/curriculum';
import { LessonReader } from './LessonReader';
import { QuizModal } from '@/components/assessment/QuizModal';
import { storageService } from '@/services/storage/storage-service';
import { authService } from '@/services/auth/auth-service';
import { syncService } from '@/services/sync/sync-service';

interface CurriculumPreviewProps {
  currentRegime: AccountingRegime;
  onNavigateToCoa: () => void;
  onLogin?: () => void;
}

function regimeLabel(regime: AccountingRegime): string {
  switch (regime) {
    case 'CIRCULAR_133':
      return 'Thông tư 133';
    case 'CIRCULAR_99':
      return 'Thông tư 99/2025';
    case 'CIRCULAR_58':
      return 'Thông tư 58/2026';
    default:
      return 'Thông tư 200';
  }
}

export const CurriculumPreview: FC<CurriculumPreviewProps> = ({
  currentRegime,
  onNavigateToCoa,
  onLogin,
}) => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeQuizDay, setActiveQuizDay] = useState<number | null>(null);
  const [progress, setProgress] = useState<LearnerProgress | null>(null);
  const [user, setUser] = useState<AuthUser | null>(authService.getUser());

  const loadProgress = () => {
    void storageService.getLearnerProgress().then((p) => {
      if (p) setProgress(p);
    });
  };

  useEffect(() => {
    loadProgress();
  }, [selectedDay]);

  useEffect(() => {
    const offSync = syncService.onRemoteApplied(loadProgress);
    const offAuth = authService.onAuthChange(({ user: u }) => setUser(u));
    return () => {
      offSync();
      offAuth();
    };
  }, []);

  if (selectedDay !== null) {
    return (
      <LessonReader
        initialDay={selectedDay}
        onNavigateToCoa={onNavigateToCoa}
        onBackToOverview={() => setSelectedDay(null)}
        onLogin={onLogin}
      />
    );
  }

  const completedDays = progress?.completedDays ?? [];
  const savedDays = progress?.savedDays ?? [];
  const resumeDay = progress?.currentDay && progress.currentDay >= 1 && progress.currentDay <= 30 ? progress.currentDay : 1;
  const pct = Math.round((completedDays.length / 30) * 100);

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
          Mỗi ngày dành từ 15–20 phút để làm chủ 3–5 khái niệm cốt lõi kèm Sơ đồ chữ T tương tác, mẫu chứng từ hóa đơn điện tử NĐ 254/2026 và phiếu thu/chi/UNC thực tế.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedDay(resumeDay)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-50 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>{resumeDay > 1 || completedDays.length > 0 ? `Tiếp tục học Ngày ${resumeDay}` : 'Bắt đầu học Ngày 1 ngay'}</span>
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
            Chế độ: <strong>{regimeLabel(currentRegime)}</strong>
          </span>
        </div>
      </div>

      {/* Progress & Saved Lessons Summary Card */}
      <div
        data-testid="curriculum-progress-summary"
        className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Tiến độ &amp; Bài học đã lưu ({completedDays.length}/30 ngày · {pct}%)
            </div>
            <div className="w-48 sm:w-64 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <Cloud className={`w-4 h-4 ${user ? 'text-emerald-600' : 'text-slate-400'}`} />
            {user ? (
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                Đang đồng bộ: {user.display_name || user.email}
              </span>
            ) : (
              <button
                type="button"
                data-testid="curriculum-login-btn"
                onClick={() => (onLogin ? onLogin() : void authService.login())}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập để đồng bộ bài học</span>
              </button>
            )}
          </div>
        </div>

        {/* Saved Bookmarked Lessons */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center space-x-1 font-bold text-amber-700 dark:text-amber-300">
            <BookmarkCheck className="w-4 h-4" />
            <span>Bài học đã lưu ({savedDays.length}):</span>
          </span>
          {savedDays.length === 0 ? (
            <span className="text-slate-400 dark:text-slate-500">
              Chưa có bài nào. Nhấn &ldquo;Lưu bài học&rdquo; trong khi đọc để ghim lại ôn tập.
            </span>
          ) : (
            savedDays.map((d) => {
              const title = getLessonByDay(d)?.dayTitleVi;
              return (
                <button
                  key={d}
                  type="button"
                  data-testid={`saved-lesson-chip-${d}`}
                  onClick={() => setSelectedDay(d)}
                  title={title || `Mở Ngày ${d}`}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-semibold transition-colors"
                >
                  <Bookmark className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>Ngày {d}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODULE_METADATA.map((m) => (
          <div
            key={m.moduleNumber}
            className="p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
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
                {m.days.map((d) => {
                  const isDone = completedDays.includes(d);
                  const isSaved = savedDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDay(d)}
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                        isDone
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isDone && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                      {isSaved && <Bookmark className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />}
                      <span>Ngày {d}</span>
                    </button>
                  );
                })}
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
