import { useState, useEffect, type FC } from 'react';
import {
  Sparkles,
  Lock,
  ChevronRight,
  RotateCcw,
  Compass,
  HelpCircle,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getHintsForScenario, SocraticHint } from '@/data/socratic-hints';
import { AccountingRegime } from '@/types/coa';
import { formatVnd } from '@/components/curriculum/TAccountView';

export interface SocraticHintLadderProps {
  scenarioId: string;
  currentRegime?: AccountingRegime;
  className?: string;
  initiallyOpen?: boolean;
}

export const SocraticHintLadder: FC<SocraticHintLadderProps> = ({
  scenarioId,
  currentRegime,
  className = '',
  initiallyOpen = true,
}) => {
  const [currentLevel, setCurrentLevel] = useState<1 | 2 | 3>(1);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<1 | 2 | 3>(1);
  const [isOpen, setIsOpen] = useState<boolean>(initiallyOpen);

  // Anti-spoil reset when scenario changes
  useEffect(() => {
    setCurrentLevel(1);
    setMaxUnlockedLevel(1);
  }, [scenarioId]);

  const scenarioHints = getHintsForScenario(scenarioId);

  if (!scenarioHints) {
    return null;
  }

  const activeHint: SocraticHint | undefined = scenarioHints.hints.find(
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
    // Anti-spoil: only allow switching to levels that are unlocked
    if (lvl <= maxUnlockedLevel) {
      setCurrentLevel(lvl);
    }
  };

  const handleResetLadder = () => {
    setCurrentLevel(1);
    setMaxUnlockedLevel(1);
  };

  const getStepBadgeInfo = (lvl: 1 | 2 | 3) => {
    switch (lvl) {
      case 1:
        return {
          label: 'Nấc 1: Định vị',
          shortName: 'Định vị',
          color: 'emerald',
          activeBg: 'bg-emerald-600 text-white',
          inactiveBg:
            'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        };
      case 2:
        return {
          label: 'Nấc 2: Bản chất',
          shortName: 'Bản chất',
          color: 'sky',
          activeBg: 'bg-sky-600 text-white',
          inactiveBg:
            'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800',
        };
      case 3:
        return {
          label: 'Nấc 3: Mẫu tương tự',
          shortName: 'Mẫu tương tự',
          color: 'purple',
          activeBg: 'bg-purple-600 text-white',
          inactiveBg:
            'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
        };
    }
  };

  return (
    <div
      className={`rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 shadow-xs overflow-hidden transition-all ${className}`}
      data-testid="socratic-hint-ladder"
    >
      {/* Ladder Header Bar */}
      <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-indigo-100 dark:border-indigo-950/60 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Nấc Thang Gợi Ý Socratic (Graduated Hint Ladder)
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Chống lộ đáp án (Anti-Spoil)
              </span>
              {currentRegime && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  [{currentRegime === 'CIRCULAR_133' ? 'TT 133' : 'TT 200'}]
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Gợi ý tuần tự theo nguyên tắc sư phạm tăng dần (Định vị &rarr; Bản chất &rarr; Mẫu tương tự)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {maxUnlockedLevel > 1 && (
            <button
              type="button"
              onClick={handleResetLadder}
              title="Đặt lại nấc thang gợi ý về Nấc 1"
              className="px-2 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden md:inline">Đặt lại</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={isOpen ? 'Thu gọn gợi ý' : 'Mở rộng gợi ý'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Ladder Body */}
      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* 3-Step Stepper Navigation */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            {([1, 2, 3] as const).map((lvl) => {
              const isUnlocked = lvl <= maxUnlockedLevel;
              const isActive = lvl === currentLevel;
              const badgeInfo = getStepBadgeInfo(lvl);

              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleSelectLevel(lvl)}
                  disabled={!isUnlocked}
                  data-testid={`hint-step-button-${lvl}`}
                  className={`relative py-2 px-2.5 sm:px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                    isActive
                      ? `${badgeInfo.activeBg} shadow-xs scale-[1.01]`
                      : isUnlocked
                      ? 'bg-white dark:bg-slate-700/90 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600/80 shadow-2xs'
                      : 'bg-transparent text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70'
                  }`}
                  title={
                    isUnlocked
                      ? `Xem ${badgeInfo.label}`
                      : `Cần mở khóa tuần tự Nấc ${lvl - 1} trước`
                  }
                >
                  <span className="shrink-0 flex items-center">
                    {lvl === 1 ? (
                      <Compass className="w-3.5 h-3.5" />
                    ) : lvl === 2 ? (
                      <HelpCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Layers className="w-3.5 h-3.5" />
                    )}
                  </span>

                  <span className="truncate">
                    <span className="hidden sm:inline">{badgeInfo.label}</span>
                    <span className="sm:hidden">{badgeInfo.shortName}</span>
                  </span>

                  {!isUnlocked ? (
                    <Lock className="w-3 h-3 ml-0.5 shrink-0 opacity-80" data-testid={`lock-icon-${lvl}`} />
                  ) : isActive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0 hidden sm:inline-block" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Active Hint Content Card */}
          {activeHint && (
            <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200/90 dark:border-slate-700 p-4 sm:p-5 space-y-4 shadow-2xs">
              {/* Badge & Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                      currentLevel === 1
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : currentLevel === 2
                        ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                        : 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                    }`}
                  >
                    {getStepBadgeInfo(currentLevel).label}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {activeHint.title}
                  </h4>
                </div>

                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  Mức {currentLevel}/3
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeHint.content}
              </p>

              {/* Level 1: Account Groups */}
              {currentLevel === 1 && activeHint.suggestedAccountGroups && (
                <div className="space-y-2 pt-1" data-testid="level-1-content">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Gợi ý nhóm tài khoản liên quan:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeHint.suggestedAccountGroups.map((group, idx) => (
                      <div
                        key={idx}
                        className="flex items-start space-x-2 p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-xs font-medium text-emerald-900 dark:text-emerald-200"
                      >
                        <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{group}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
                    * Lưu ý sư phạm: Nấc 1 chỉ định vị nhóm tài khoản hoặc tài khoản mẹ mà không tiết lộ chi tiết tài khoản con hoặc chiều ghi Nợ/Có.
                  </div>
                </div>
              )}

              {/* Level 2: Reflective Questions */}
              {currentLevel === 2 && activeHint.reflectiveQuestions && (
                <div className="space-y-2.5 pt-1" data-testid="level-2-content">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Câu hỏi định hướng tư duy bản chất kế toán:
                  </div>
                  <div className="space-y-2">
                    {activeHint.reflectiveQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="flex items-start space-x-3 p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 text-xs text-sky-950 dark:text-sky-200"
                      >
                        <span className="shrink-0 w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="leading-relaxed">{q}</p>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
                    * Hãy tự suy ngẫm và trả lời các câu hỏi trên trước khi quyết định mở nấc mẫu tương tự.
                  </div>
                </div>
              )}

              {/* Level 3: Twin Analogous Case */}
              {currentLevel === 3 && activeHint.twinCase && (
                <div className="space-y-3 pt-1" data-testid="level-3-content">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Nghiệp vụ mẫu song sinh (Đẳng cấu suy luận):
                  </div>

                  {/* Twin Scenario Description */}
                  <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 text-xs text-purple-950 dark:text-purple-200">
                    <span className="font-bold block mb-1">Tình huống song sinh:</span>
                    <p className="leading-relaxed">{activeHint.twinCase.scenario}</p>
                  </div>

                  {/* Sample Journal Table */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                    <div className="bg-slate-100 dark:bg-slate-700/80 px-3 py-2 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <span>Bút toán định khoản mẫu tương tự</span>
                      <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                        Cân đối Nợ = Có
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeHint.twinCase.sampleJournal.map((row, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 dark:hover:bg-slate-700/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded text-xs">
                              TK {row.accountCode}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {row.accountName}
                            </span>
                          </div>

                          <div className="flex items-center space-x-4 font-mono font-bold text-xs shrink-0">
                            {row.debit > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                Nợ: {formatVnd(row.debit)}
                              </span>
                            )}
                            {row.credit > 0 && (
                              <span className="text-blue-600 dark:text-blue-400">
                                Có: {formatVnd(row.credit)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Twin Case Explanation */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      Phân tích suy luận tương tự:
                    </span>
                    <p className="leading-relaxed">{activeHint.twinCase.explanation}</p>
                  </div>
                </div>
              )}

              {/* Stepper Progression Button Footer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {currentLevel === 1 ? (
                    <span>Chưa hình dung được? Hãy mở nấc 2 để suy ngẫm bản chất.</span>
                  ) : currentLevel === 2 ? (
                    <span>Cần ví dụ đối chiếu? Mở nấc 3 để xem nghiệp vụ tương tự.</span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đã mở khóa tối đa 3 nấc gợi ý. Hãy tự tin định khoản!
                    </span>
                  )}
                </div>

                {currentLevel === 1 && (
                  <button
                    type="button"
                    onClick={handleUnlockNext}
                    data-testid="unlock-level-2-button"
                    className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    <span>Tiếp theo: Gợi ý bản chất (Nấc 2)</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {currentLevel === 2 && (
                  <button
                    type="button"
                    onClick={handleUnlockNext}
                    data-testid="unlock-level-3-button"
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    <span>Tiếp theo: Nghiệp vụ mẫu song sinh (Nấc 3)</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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
