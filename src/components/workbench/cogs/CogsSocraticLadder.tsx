import { useState, useEffect, type FC } from 'react';
import {
  Sparkles,
  Lock,
  RotateCcw,
  BookOpen,
  HelpCircle,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { getCogsHintsForScenario, CogsSocraticHint } from '@/data/cogs-socratic-hints';
import { DokBadge } from '@/components/assessment/DokBadge';

export interface CogsSocraticLadderProps {
  scenarioId: string;
  dokLevel?: 1 | 2 | 3;
  dokLevelKey?: 'DOK_1' | 'DOK_2' | 'DOK_3';
  className?: string;
  initiallyOpen?: boolean;
}

export const CogsSocraticLadder: FC<CogsSocraticLadderProps> = ({
  scenarioId,
  dokLevel = 1,
  dokLevelKey = 'DOK_1',
  className = '',
  initiallyOpen = true,
}) => {
  const [currentLevel, setCurrentLevel] = useState<1 | 2 | 3>(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<1 | 2 | 3>(1);
  const [isOpen, setIsOpen] = useState<boolean>(initiallyOpen);

  // Anti-spoil auto reset when scenario changes
  useEffect(() => {
    setCurrentLevel(1);
    setMaxUnlockedLevel(1);
  }, [scenarioId]);

  const scenarioHints = getCogsHintsForScenario(scenarioId);

  if (!scenarioHints) {
    return null;
  }

  const activeHint: CogsSocraticHint | undefined = scenarioHints.hints.find(
    (h) => h.level === currentLevel
  );

  const handleUnlockNext = () => {
    if (currentLevel === 1) {
      setMaxUnlockedLevel((prev) => (prev < 2 ? 2 : prev));
      setCurrentLevel(2);
    } else if (currentLevel === 2) {
      setMaxUnlockedLevel(3);
      setCurrentLevel(3);
    }
  };

  const handleSelectLevel = (lvl: 1 | 2 | 3) => {
    if (lvl <= maxUnlockedLevel) {
      setCurrentLevel(lvl);
    }
  };

  const handleResetLadder = () => {
    setCurrentLevel(1);
    setMaxUnlockedLevel(1);
  };

  const computedDokKey: 'DOK_1' | 'DOK_2' | 'DOK_3' =
    dokLevelKey || (dokLevel === 3 ? 'DOK_3' : dokLevel === 2 ? 'DOK_2' : 'DOK_1');

  return (
    <div
      data-testid="cogs-socratic-ladder"
      className={`rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-linear-to-b from-amber-50/70 via-white to-amber-50/30 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm transition-all overflow-hidden ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-b border-amber-200 dark:border-amber-900/40 bg-amber-100/60 dark:bg-amber-950/40">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Thang Gợi Ý Socratic 3 Nấc (Anti-Spoil)
              </h3>
              <DokBadge dokLevel={computedDokKey} showPoints={false} />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {scenarioHints.scenarioTitleVi}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {maxUnlockedLevel > 1 && (
            <button
              type="button"
              data-testid="reset-socratic-ladder-btn"
              onClick={handleResetLadder}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-200/50 dark:hover:bg-amber-900/40 rounded-lg transition-colors flex items-center gap-1"
              title="Khóa lại toàn bộ gợi ý về Nấc 1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khóa lại</span>
            </button>
          )}

          <button
            type="button"
            data-testid="toggle-socratic-ladder-btn"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-900/40 transition-colors"
            aria-label={isOpen ? 'Thu gọn thang gợi ý' : 'Mở rộng thang gợi ý'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* 3-Tier Stepped Ladder Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Level 1 Button */}
            <button
              type="button"
              data-testid="tab-hint-level-1"
              onClick={() => handleSelectLevel(1)}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                currentLevel === 1
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  currentLevel === 1
                    ? 'bg-white text-emerald-700'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                1
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">Nấc 1: Định Vị</div>
                <div className="text-[11px] opacity-85 truncate">Câu hỏi gợi mở không spoil</div>
              </div>
            </button>

            {/* Level 2 Button */}
            <button
              type="button"
              data-testid="tab-hint-level-2"
              onClick={() => handleSelectLevel(2)}
              disabled={maxUnlockedLevel < 2}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                currentLevel === 2
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : maxUnlockedLevel >= 2
                  ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-400'
                  : 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-75'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  currentLevel === 2
                    ? 'bg-white text-sky-700'
                    : maxUnlockedLevel >= 2
                    ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }`}
              >
                {maxUnlockedLevel >= 2 ? '2' : <Lock className="w-3 h-3" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">Nấc 2: Cơ Sở Pháp Lý</div>
                <div className="text-[11px] opacity-85 truncate">
                  {maxUnlockedLevel >= 2 ? 'VAS 02, IAS 2, TT 200' : 'Đang khóa (Cần mở khóa)'}
                </div>
              </div>
            </button>

            {/* Level 3 Button */}
            <button
              type="button"
              data-testid="tab-hint-level-3"
              onClick={() => handleSelectLevel(3)}
              disabled={maxUnlockedLevel < 3}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                currentLevel === 3
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : maxUnlockedLevel >= 3
                  ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
                  : 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-75'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  currentLevel === 3
                    ? 'bg-white text-purple-700'
                    : maxUnlockedLevel >= 3
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }`}
              >
                {maxUnlockedLevel >= 3 ? '3' : <Lock className="w-3 h-3" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">Nấc 3: Mẫu Định Khoản</div>
                <div className="text-[11px] opacity-85 truncate">
                  {maxUnlockedLevel >= 3 ? 'Bút toán kép & Đáp án' : 'Đang khóa (Cần mở khóa)'}
                </div>
              </div>
            </button>
          </div>

          {/* Active Level Content */}
          {activeHint && (
            <div
              data-testid={`hint-content-level-${currentLevel}`}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{activeHint.titleVi}</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeHint.subtitleVi}
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {activeHint.badgeVi}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {activeHint.contentVi}
              </p>

              {/* Level 1 Questions */}
              {activeHint.level === 1 && activeHint.keyQuestionsVi && (
                <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Câu Hỏi Tư Duy Gợi Mở (Reflective Questions):</span>
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {activeHint.keyQuestionsVi.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2"
                      >
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          {idx + 1}.
                        </span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Level 2 Legal Basis & Accounting Principles */}
              {activeHint.level === 2 && (
                <div className="space-y-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {activeHint.legalBasisVi && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Cơ Sở Pháp Lý Chuẩn Mực:</span>
                      </span>
                      <ul className="space-y-1">
                        {activeHint.legalBasisVi.map((law, idx) => (
                          <li
                            key={idx}
                            className="p-2 rounded-lg bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2"
                          >
                            <span className="text-sky-500 font-bold shrink-0">&bull;</span>
                            <span>{law}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activeHint.accountingPrinciplesVi && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Nguyên Tắc Hạch Toán Cốt Lõi:</span>
                      </span>
                      <ul className="space-y-1">
                        {activeHint.accountingPrinciplesVi.map((principle, idx) => (
                          <li
                            key={idx}
                            className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2"
                          >
                            <span className="text-amber-500 font-bold shrink-0">&#10003;</span>
                            <span>{principle}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Level 3 Technical Guidance & Sample Journal Entries */}
              {activeHint.level === 3 && (
                <div className="space-y-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {activeHint.technicalGuidanceVi && (
                    <div className="p-3 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                      <span className="font-bold block uppercase tracking-wider text-purple-800 dark:text-purple-300">
                        Hướng Dẫn Kỹ Thuật Chi Tiết:
                      </span>
                      <div className="whitespace-pre-line leading-relaxed">
                        {activeHint.technicalGuidanceVi}
                      </div>
                    </div>
                  )}

                  {activeHint.sampleJournalEntriesVi && activeHint.sampleJournalEntriesVi.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 block">
                        Mẫu Định Khoản Tham Chiếu:
                      </span>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <tr>
                              <th className="p-2">TK Nợ</th>
                              <th className="p-2">TK Có</th>
                              <th className="p-2 text-right">Số Tiền (VNĐ)</th>
                              <th className="p-2">Diễn Giải Nghiệp Vụ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {activeHint.sampleJournalEntriesVi.map((entry, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              >
                                <td className="p-2 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                  {entry.debitAccount}
                                </td>
                                <td className="p-2 font-mono font-bold text-sky-700 dark:text-sky-400">
                                  {entry.creditAccount}
                                </td>
                                <td className="p-2 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                                  {typeof entry.amount === 'number'
                                    ? entry.amount.toLocaleString('vi-VN') + ' đ'
                                    : entry.amount || '—'}
                                </td>
                                <td className="p-2 text-slate-600 dark:text-slate-400">
                                  {entry.descriptionVi}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeHint.taxGuidanceVi && (
                    <div className="p-2.5 rounded-lg bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-xs text-red-900 dark:text-red-200 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-red-800 dark:text-red-300">
                          Lưu Ý Rủi Ro Quyết Toán Thuế TNDN:
                        </span>
                        <p className="mt-0.5">{activeHint.taxGuidanceVi}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Unlock Next Step CTA */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  * Cơ chế chống spoil: Hãy suy nghĩ và tự tính toán trước khi mở khóa nấc tiếp theo.
                </span>

                {currentLevel === 1 && maxUnlockedLevel < 2 && (
                  <button
                    type="button"
                    data-testid="unlock-level-2-btn"
                    onClick={handleUnlockNext}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <span>🔓 Mở Khóa Nấc 2: Cơ Sở Pháp Lý</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {currentLevel === 2 && maxUnlockedLevel < 3 && (
                  <button
                    type="button"
                    data-testid="unlock-level-3-btn"
                    onClick={handleUnlockNext}
                    className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <span>🔓 Mở Khóa Nấc 3: Mẫu Định Khoản & Đáp Án</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CogsSocraticLadder;
