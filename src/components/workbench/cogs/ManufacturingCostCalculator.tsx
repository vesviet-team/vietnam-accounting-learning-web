import React, { useState, useMemo, FC } from 'react';
import {
  Calculator,
  ArrowRight,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Layers,
  Percent,
  Send,
  RefreshCw,
  TrendingUp,
  FileCheck,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { calculateManufacturingCost } from '@/engine/cogs-engine';
import {
  AccountingRegime,
  WipMethod,
  ManufacturingCostInput,
  ManufacturingCostOutput,
  JournalEntryItem,
} from '@/types/cogs';
import { storageService } from '@/services/storage/storage-service';

export interface ManufacturingCostCalculatorProps {
  initialInput?: Partial<ManufacturingCostInput>;
  onStateChange?: (input: ManufacturingCostInput, output: ManufacturingCostOutput) => void;
  onExportToJournalizer?: (entries: JournalEntryItem[]) => void;
  className?: string;
}

export const DEFAULT_MANUFACTURING_INPUT: ManufacturingCostInput = {
  regime: 'CIRCULAR_200',
  beginningWip: 10_000_000,
  actualDirectMaterial: 120_000_000,
  normalDirectMaterial: 100_000_000,
  actualDirectLabor: 40_000_000,
  normalDirectLabor: 40_000_000,
  actualOverhead: 30_000_000,
  finishedUnits: 1_000,
  endingWipUnits: 200,
  wipMethod: 'DIRECT_MATERIAL',
  completionPercentage: 50,
};

export function formatVnd(val: number): string {
  if (!val || isNaN(val) || val === 0) return '0 đ';
  return Math.round(val).toLocaleString('vi-VN') + ' đ';
}

export function formatUnitCost(val: number, finishedUnits: number): string {
  if (finishedUnits === 0 || isNaN(val)) {
    return '0 đ (N/A)';
  }
  if (val === 0) return '0 đ/sp';
  return Math.round(val).toLocaleString('vi-VN') + ' đ/sp';
}

export const ManufacturingCostCalculator: FC<ManufacturingCostCalculatorProps> = ({
  initialInput,
  onStateChange,
  onExportToJournalizer,
  className = '',
}) => {
  // Input State
  const [regime, setRegime] = useState<AccountingRegime>(
    initialInput?.regime || DEFAULT_MANUFACTURING_INPUT.regime
  );
  const [beginningWip, setBeginningWip] = useState<number>(
    initialInput?.beginningWip ?? DEFAULT_MANUFACTURING_INPUT.beginningWip
  );
  const [actualDirectMaterial, setActualDirectMaterial] = useState<number>(
    initialInput?.actualDirectMaterial ?? DEFAULT_MANUFACTURING_INPUT.actualDirectMaterial
  );
  const [normalDirectMaterial, setNormalDirectMaterial] = useState<number>(
    initialInput?.normalDirectMaterial ?? DEFAULT_MANUFACTURING_INPUT.normalDirectMaterial!
  );
  const [actualDirectLabor, setActualDirectLabor] = useState<number>(
    initialInput?.actualDirectLabor ?? DEFAULT_MANUFACTURING_INPUT.actualDirectLabor
  );
  const [normalDirectLabor, setNormalDirectLabor] = useState<number>(
    initialInput?.normalDirectLabor ?? DEFAULT_MANUFACTURING_INPUT.normalDirectLabor!
  );
  const [actualOverhead, setActualOverhead] = useState<number>(
    initialInput?.actualOverhead ?? DEFAULT_MANUFACTURING_INPUT.actualOverhead
  );
  const [finishedUnits, setFinishedUnits] = useState<number>(
    initialInput?.finishedUnits ?? DEFAULT_MANUFACTURING_INPUT.finishedUnits
  );
  const [endingWipUnits, setEndingWipUnits] = useState<number>(
    initialInput?.endingWipUnits ?? DEFAULT_MANUFACTURING_INPUT.endingWipUnits
  );
  const [wipMethod, setWipMethod] = useState<WipMethod>(
    initialInput?.wipMethod || DEFAULT_MANUFACTURING_INPUT.wipMethod
  );
  const [completionPercentage, setCompletionPercentage] = useState<number>(
    initialInput?.completionPercentage ?? DEFAULT_MANUFACTURING_INPUT.completionPercentage!
  );

  // Export Feedback State
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Form Validation
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (beginningWip < 0) errors.beginningWip = 'Chi phí dở dang đầu kỳ không được âm';
    if (actualDirectMaterial < 0) errors.actualDirectMaterial = 'Chi phí NVL trực tiếp không được âm';
    if (normalDirectMaterial < 0) errors.normalDirectMaterial = 'Định mức kỹ thuật NVL không được âm';
    if (actualDirectLabor < 0) errors.actualDirectLabor = 'Chi phí nhân công không được âm';
    if (normalDirectLabor < 0) errors.normalDirectLabor = 'Định mức kỹ thuật nhân công không được âm';
    if (actualOverhead < 0) errors.actualOverhead = 'Chi phí SX chung không được âm';
    if (finishedUnits < 0) errors.finishedUnits = 'Số lượng thành phẩm không được âm';
    if (endingWipUnits < 0) errors.endingWipUnits = 'Số lượng dở dang không được âm';
    if (completionPercentage < 0 || completionPercentage > 100) {
      errors.completionPercentage = 'Tỷ lệ hoàn thành phải nằm trong khoảng từ 0% đến 100%';
    }
    return errors;
  }, [
    beginningWip,
    actualDirectMaterial,
    normalDirectMaterial,
    actualDirectLabor,
    normalDirectLabor,
    actualOverhead,
    finishedUnits,
    endingWipUnits,
    completionPercentage,
  ]);

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  // Safe normalized input for engine
  const currentInput: ManufacturingCostInput = useMemo(() => {
    return {
      regime,
      beginningWip: Math.max(0, beginningWip || 0),
      actualDirectMaterial: Math.max(0, actualDirectMaterial || 0),
      normalDirectMaterial: Math.max(0, normalDirectMaterial || 0),
      actualDirectLabor: Math.max(0, actualDirectLabor || 0),
      normalDirectLabor: Math.max(0, normalDirectLabor || 0),
      actualOverhead: Math.max(0, actualOverhead || 0),
      finishedUnits: Math.max(0, finishedUnits || 0),
      endingWipUnits: Math.max(0, endingWipUnits || 0),
      wipMethod,
      completionPercentage: Math.max(0, Math.min(100, completionPercentage || 0)),
    };
  }, [
    regime,
    beginningWip,
    actualDirectMaterial,
    normalDirectMaterial,
    actualDirectLabor,
    normalDirectLabor,
    actualOverhead,
    finishedUnits,
    endingWipUnits,
    wipMethod,
    completionPercentage,
  ]);

  // Reactive Calculation via Pure Engine in <0.1ms
  const calculationOutput: ManufacturingCostOutput = useMemo(() => {
    return calculateManufacturingCost(currentInput);
  }, [currentInput]);

  // Notify parent component if callback provided
  React.useEffect(() => {
    if (onStateChange) {
      onStateChange(currentInput, calculationOutput);
    }
  }, [currentInput, calculationOutput, onStateChange]);

  // Input Handlers
  const handleNumberChange = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    valStr: string
  ) => {
    const parsed = parseFloat(valStr);
    setter(isNaN(parsed) ? 0 : parsed);
    setExportSuccessMessage(null);
  };

  const handleResetDefaults = () => {
    setRegime(DEFAULT_MANUFACTURING_INPUT.regime);
    setBeginningWip(DEFAULT_MANUFACTURING_INPUT.beginningWip);
    setActualDirectMaterial(DEFAULT_MANUFACTURING_INPUT.actualDirectMaterial);
    setNormalDirectMaterial(DEFAULT_MANUFACTURING_INPUT.normalDirectMaterial!);
    setActualDirectLabor(DEFAULT_MANUFACTURING_INPUT.actualDirectLabor);
    setNormalDirectLabor(DEFAULT_MANUFACTURING_INPUT.normalDirectLabor!);
    setActualOverhead(DEFAULT_MANUFACTURING_INPUT.actualOverhead);
    setFinishedUnits(DEFAULT_MANUFACTURING_INPUT.finishedUnits);
    setEndingWipUnits(DEFAULT_MANUFACTURING_INPUT.endingWipUnits);
    setWipMethod(DEFAULT_MANUFACTURING_INPUT.wipMethod);
    setCompletionPercentage(DEFAULT_MANUFACTURING_INPUT.completionPercentage!);
    setExportSuccessMessage(null);
  };

  const handleApplyPresetThangLong = () => {
    // Tình huống May Xuất Khẩu Thăng Long (DOK 3 - VAS 02 Đoạn 11 & Chỉ tiêu B4)
    setRegime('CIRCULAR_200');
    setBeginningWip(15_000_000);
    setActualDirectMaterial(150_000_000);
    setNormalDirectMaterial(120_000_000); // Vượt định mức 30.000.000 đ
    setActualDirectLabor(45_000_000);
    setNormalDirectLabor(45_000_000);
    setActualOverhead(30_000_000);
    setFinishedUnits(1_000);
    setEndingWipUnits(200);
    setWipMethod('EQUIVALENT_UNITS');
    setCompletionPercentage(50);
    setExportSuccessMessage(null);
  };

  const handleApplyPresetCircular133 = () => {
    // Tình huống Doanh nghiệp vừa & nhỏ theo Thông tư 133
    setRegime('CIRCULAR_133');
    setBeginningWip(8_000_000);
    setActualDirectMaterial(90_000_000);
    setNormalDirectMaterial(90_000_000);
    setActualDirectLabor(35_000_000);
    setNormalDirectLabor(35_000_000);
    setActualOverhead(25_000_000);
    setFinishedUnits(800);
    setEndingWipUnits(100);
    setWipMethod('DIRECT_MATERIAL');
    setCompletionPercentage(40);
    setExportSuccessMessage(null);
  };

  // 1-Click Transfer to Journalizer
  const handleExportToJournalizer = async () => {
    const entries = calculationOutput.journalEntries;
    setExportSuccessMessage(
      `Đã kết chuyển thành công ${entries.length} bút toán định khoản sang Bàn Định Khoản (Journalizer)!`
    );

    if (onExportToJournalizer) {
      onExportToJournalizer(entries);
    }

    try {
      const now = new Date().toISOString();
      const rows = entries.flatMap((entry, idx) => [
        {
          id: `mfg-dr-${idx}-${Date.now()}`,
          accountCode: entry.debitAccount,
          accountNameVi: `TK ${entry.debitAccount}`,
          debitAmount: entry.amount,
          creditAmount: 0,
          noteVi: entry.descriptionVi,
        },
        {
          id: `mfg-cr-${idx}-${Date.now()}`,
          accountCode: entry.creditAccount,
          accountNameVi: `TK ${entry.creditAccount}`,
          debitAmount: 0,
          creditAmount: entry.amount,
          noteVi: entry.descriptionVi,
        },
      ]);

      const newPostedEntry = {
        id: `costing-${Date.now()}`,
        timestamp: now,
        descriptionVi: `Giá thành sản xuất (${regime === 'CIRCULAR_133' ? 'TT 133' : 'TT 200/99'}): Tổng Z = ${formatVnd(
          calculationOutput.totalCostZ
        )}`,
        rows,
        totalAmount: calculationOutput.totalCostZ + calculationOutput.cogsDirectExpense,
        regime,
      };

      await storageService.saveWorkbenchState({
        postedEntries: [newPostedEntry as any],
      });
    } catch (err) {
      console.warn('[ManufacturingCostCalculator] Failed to persist into storageService:', err);
    }
  };

  const isCircular133 = regime === 'CIRCULAR_133';

  return (
    <div
      className={`space-y-6 max-w-7xl mx-auto ${className}`}
      data-testid="manufacturing-cost-calculator"
    >
      {/* 1. Header & Regulatory Framing Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <Calculator className="w-4 h-4" />
              <span>Phân Hệ Kế Toán Chi Phí & Giá Thành Sản Phẩm</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              BÀN TÍNH GIÁ THÀNH SẢN XUẤT & BÓC TÁCH CHI PHÍ VƯỢT ĐỊNH MỨC
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
              Tuân thủ chuẩn mực <strong className="font-semibold text-slate-800 dark:text-slate-200">VAS 02 Đoạn 11 & IAS 2 Para 16</strong>{' '}
              (Bóc tách chi phí vượt mức bình thường vào TK 632) và Luật Thuế TNDN{' '}
              <strong className="font-semibold text-slate-800 dark:text-slate-200">
                (Chỉ tiêu B4 Tờ khai 03/TNDN)
              </strong>
              .
            </p>
          </div>

          {/* Regime Switcher */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl self-start lg:self-center">
            <button
              type="button"
              data-testid="regime-btn-CIRCULAR_200"
              onClick={() => {
                setRegime('CIRCULAR_200');
                setExportSuccessMessage(null);
              }}
              className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                regime === 'CIRCULAR_200' || regime === 'CIRCULAR_99'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Thông tư 99/200 (TK 621, 622, 627)
            </button>
            <button
              type="button"
              data-testid="regime-btn-CIRCULAR_133"
              onClick={() => {
                setRegime('CIRCULAR_133');
                setExportSuccessMessage(null);
              }}
              className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                regime === 'CIRCULAR_133'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Thông tư 133 (TK 1541, 1542, 1544)
            </button>
          </div>
        </div>

        {/* Dynamic COA Account Flow Badges */}
        <div
          data-testid="coa-flow-indicator"
          className={`mt-4 p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm ${
            isCircular133
              ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Sơ đồ luân chuyển chi phí:
            </span>
            {isCircular133 ? (
              <>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 font-mono font-medium">
                  TK 1541 (NVL)
                </span>
                <span>+</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 font-mono font-medium">
                  TK 1542 (Nhân công)
                </span>
                <span>+</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 font-mono font-medium">
                  TK 1544 (SXC)
                </span>
                <ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 font-mono font-medium text-emerald-800 dark:text-emerald-200">
                  TK 155 (Thành phẩm Z)
                </span>
              </>
            ) : (
              <>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 font-mono font-medium">
                  TK 621 (NVL)
                </span>
                <span>+</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 font-mono font-medium">
                  TK 622 (Nhân công)
                </span>
                <span>+</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 font-mono font-medium">
                  TK 627 (SXC)
                </span>
                <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 font-mono font-medium text-indigo-800 dark:text-indigo-200">
                  TK 154 (Chi phí SXKD dở dang)
                </span>
                <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 font-mono font-medium text-emerald-800 dark:text-emerald-200">
                  TK 155 (Thành phẩm Z)
                </span>
              </>
            )}
          </div>

          <div className="text-xs italic flex items-center gap-1 text-slate-500 dark:text-slate-400">
            {isCircular133 ? (
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                Cấm sử dụng TK 621, 622, 627 theo Thông tư 133
              </span>
            ) : (
              <span>Áp dụng doanh nghiệp quy mô lớn theo Thông tư 200 & TT 99/2025</span>
            )}
          </div>
        </div>

        {/* Preset Quick Buttons */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Tình huống mẫu thực tế:
          </span>
          <button
            type="button"
            data-testid="preset-thang-long-btn"
            onClick={handleApplyPresetThangLong}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            May XK Thăng Long (Vượt định mức 30tr)
          </button>
          <button
            type="button"
            data-testid="preset-standard-btn"
            onClick={handleApplyPresetCircular133}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Sản xuất chuẩn Thông tư 133
          </button>
          <button
            type="button"
            data-testid="reset-defaults-btn"
            onClick={handleResetDefaults}
            className="ml-auto px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Khôi phục mặc định
          </button>
        </div>
      </div>

      {/* Validation Alert Banner */}
      {hasValidationErrors && (
        <div
          data-testid="validation-error-alert"
          className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Lỗi xác thực dữ liệu đầu vào:</div>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
              {Object.values(validationErrors).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Export Success Toast Banner */}
      {exportSuccessMessage && (
        <div
          data-testid="export-success-banner"
          className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{exportSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportSuccessMessage(null)}
            className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline font-semibold"
          >
            Đóng
          </button>
        </div>
      )}

      {/* 2. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Input Panel (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card A: Chi Phí Sản Xuất Phát Sinh */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  1. Chi Phí Sản Xuất Đầu Vào & Định Mức
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Đơn vị: VNĐ</span>
            </div>

            {/* Dở dang đầu kỳ */}
            <div>
              <label
                htmlFor="input-beginning-wip"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Chi phí sản xuất dở dang đầu kỳ ($D_{'đk'}$)
              </label>
              <div className="relative">
                <input
                  id="input-beginning-wip"
                  data-testid="input-beginning-wip"
                  type="number"
                  min="0"
                  step="100000"
                  value={beginningWip}
                  onChange={(e) => handleNumberChange(setBeginningWip, e.target.value)}
                  className={`w-full px-3.5 py-2 text-sm font-mono rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 ${
                    validationErrors.beginningWip
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500'
                  }`}
                  placeholder="10000000"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">đ</span>
              </div>
            </div>

            {/* Chi phí Nguyên vật liệu trực tiếp (Thực tế vs Định mức) */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span>{isCircular133 ? 'Chi phí NVL trực tiếp (TK 1541)' : 'Chi phí NVL trực tiếp (TK 621)'}</span>
                {actualDirectMaterial > normalDirectMaterial && (
                  <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Vượt: {formatVnd(actualDirectMaterial - normalDirectMaterial)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="input-actual-direct-material"
                    className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Thực tế phát sinh trong kỳ
                  </label>
                  <input
                    id="input-actual-direct-material"
                    data-testid="input-actual-direct-material"
                    type="number"
                    min="0"
                    step="100000"
                    value={actualDirectMaterial}
                    onChange={(e) => handleNumberChange(setActualDirectMaterial, e.target.value)}
                    className="w-full px-3 py-1.5 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="input-normal-direct-material"
                    className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Định mức kỹ thuật cho phép
                  </label>
                  <input
                    id="input-normal-direct-material"
                    data-testid="input-normal-direct-material"
                    type="number"
                    min="0"
                    step="100000"
                    value={normalDirectMaterial}
                    onChange={(e) => handleNumberChange(setNormalDirectMaterial, e.target.value)}
                    className="w-full px-3 py-1.5 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Chi phí Nhân công trực tiếp (Thực tế vs Định mức) */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span>{isCircular133 ? 'Chi phí Nhân công trực tiếp (TK 1542)' : 'Chi phí Nhân công trực tiếp (TK 622)'}</span>
                {actualDirectLabor > normalDirectLabor && (
                  <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Vượt: {formatVnd(actualDirectLabor - normalDirectLabor)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="input-actual-direct-labor"
                    className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Thực tế phát sinh trong kỳ
                  </label>
                  <input
                    id="input-actual-direct-labor"
                    data-testid="input-actual-direct-labor"
                    type="number"
                    min="0"
                    step="100000"
                    value={actualDirectLabor}
                    onChange={(e) => handleNumberChange(setActualDirectLabor, e.target.value)}
                    className="w-full px-3 py-1.5 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="input-normal-direct-labor"
                    className="block text-xs text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Định mức kỹ thuật cho phép
                  </label>
                  <input
                    id="input-normal-direct-labor"
                    data-testid="input-normal-direct-labor"
                    type="number"
                    min="0"
                    step="100000"
                    value={normalDirectLabor}
                    onChange={(e) => handleNumberChange(setNormalDirectLabor, e.target.value)}
                    className="w-full px-3 py-1.5 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Chi phí Sản xuất chung */}
            <div>
              <label
                htmlFor="input-actual-overhead"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                {isCircular133 ? 'Chi phí Sản xuất chung phát sinh (TK 1544)' : 'Chi phí Sản xuất chung phát sinh (TK 627)'}
              </label>
              <div className="relative">
                <input
                  id="input-actual-overhead"
                  data-testid="input-actual-overhead"
                  type="number"
                  min="0"
                  step="100000"
                  value={actualOverhead}
                  onChange={(e) => handleNumberChange(setActualOverhead, e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">đ</span>
              </div>
            </div>
          </div>

          {/* Card B: Sản Lượng & Đánh Giá Dở Dang */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  2. Sản Lượng & Phương Pháp Đánh Giá Dở Dang Cuối Kỳ
                </h3>
              </div>
            </div>

            {/* Số lượng hoàn thành & dở dang */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="input-finished-units"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Số lượng thành phẩm hoàn thành ($Q_{'tp'}$)
                </label>
                <div className="relative">
                  <input
                    id="input-finished-units"
                    data-testid="input-finished-units"
                    type="number"
                    min="0"
                    step="1"
                    value={finishedUnits}
                    onChange={(e) => handleNumberChange(setFinishedUnits, e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">sp</span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="input-ending-wip-units"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Số lượng sản phẩm dở dang cuối kỳ ($Q_{'dd'}$)
                </label>
                <div className="relative">
                  <input
                    id="input-ending-wip-units"
                    data-testid="input-ending-wip-units"
                    type="number"
                    min="0"
                    step="1"
                    value={endingWipUnits}
                    onChange={(e) => handleNumberChange(setEndingWipUnits, e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">sp</span>
                </div>
              </div>
            </div>

            {/* Toggle WIP Valuation Method */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phương pháp đánh giá sản phẩm dở dang cuối kỳ:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  data-testid="wip-method-DIRECT_MATERIAL"
                  onClick={() => setWipMethod('DIRECT_MATERIAL')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    wipMethod === 'DIRECT_MATERIAL'
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>1. Theo chi phí NVL trực tiếp</span>
                    {wipMethod === 'DIRECT_MATERIAL' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    $D_{'ck'}$ chỉ tính chi phí NVL trực tiếp. Chi phí chế biến tính 100% vào thành phẩm.
                  </p>
                </button>

                <button
                  type="button"
                  data-testid="wip-method-EQUIVALENT_UNITS"
                  onClick={() => setWipMethod('EQUIVALENT_UNITS')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    wipMethod === 'EQUIVALENT_UNITS'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>2. Theo SL hoàn thành tương đương (EUP)</span>
                    {wipMethod === 'EQUIVALENT_UNITS' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Phân bổ cả chi phí chế biến (nhân công, SXC) theo mức độ hoàn thành ($h\%$).
                  </p>
                </button>
              </div>
            </div>

            {/* Mức độ hoàn thành (% khi chọn EUP) */}
            {wipMethod === 'EQUIVALENT_UNITS' && (
              <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="input-completion-percentage"
                    className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5"
                  >
                    <Percent className="w-3.5 h-3.5" />
                    Tỷ lệ hoàn thành sản phẩm dở dang ($h\%$):
                  </label>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                    {completionPercentage}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={completionPercentage}
                    onChange={(e) => setCompletionPercentage(parseInt(e.target.value) || 0)}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <input
                    id="input-completion-percentage"
                    data-testid="input-completion-percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={completionPercentage}
                    onChange={(e) => handleNumberChange(setCompletionPercentage, e.target.value)}
                    className="w-20 px-2 py-1 text-sm font-mono text-center rounded-md border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 italic">
                  Sản lượng tương đương quy đổi: $Q_{'dd'}^{'tđ'} = {endingWipUnits} \times{' '}
                  {completionPercentage}\% = {Math.round(endingWipUnits * (completionPercentage / 100))} sp$
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Costing Outputs, Tax Impact, & Journal Entries (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card C: Bảng Tính Tổng Giá Thành Z & Đơn Giá z */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Kết Quả Tính Giá Thành Sản Xuất
                </h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-semibold font-mono">
                TK 155
              </span>
            </div>

            {/* Core KPI Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                  Chi phí dở dang đầu kỳ ($D_{'đk'}$)
                </span>
                <span
                  data-testid="kpi-beginning-wip"
                  className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200"
                >
                  {formatVnd(currentInput.beginningWip)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                  Chi phí hợp lý đưa vào Z
                </span>
                <span
                  data-testid="kpi-total-eligible-cost"
                  className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400"
                >
                  {formatVnd(calculationOutput.totalEligibleCost)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                  Chi phí dở dang cuối kỳ ($D_{'ck'}$)
                </span>
                <span
                  data-testid="kpi-ending-wip-cost"
                  className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400"
                >
                  {formatVnd(calculationOutput.endingWipCost)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                  Chi phí vượt định mức (TK 632)
                </span>
                <span
                  data-testid="kpi-abnormal-waste"
                  className={`text-sm font-bold font-mono ${
                    calculationOutput.cogsDirectExpense > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {formatVnd(calculationOutput.cogsDirectExpense)}
                </span>
              </div>
            </div>

            {/* Total Cost Z & Unit Cost z Highlight Box */}
            <div className="p-4 rounded-xl bg-linear-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold uppercase tracking-wide">
                    Tổng Giá Thành Sản Xuất ($Z$)
                  </span>
                  <div
                    data-testid="kpi-total-cost-z"
                    className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300"
                  >
                    {formatVnd(calculationOutput.totalCostZ)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                    Đơn giá thành phẩm ($z$)
                  </span>
                  <div
                    data-testid="kpi-unit-cost-z"
                    className="text-lg font-bold font-mono text-slate-900 dark:text-white"
                  >
                    {formatUnitCost(calculationOutput.unitCostZ, finishedUnits)}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 dark:text-slate-400 border-t border-emerald-500/20 pt-2 font-mono">
                Công thức: $Z = D_{'đk'} + C_{'hợp lý'} - D_{'ck'} ={' '}
                {formatVnd(currentInput.beginningWip)} + {formatVnd(calculationOutput.totalEligibleCost)} -{' '}
                {formatVnd(calculationOutput.endingWipCost)}$
              </div>
            </div>
          </div>

          {/* Card D: Thẻ Tác Động Thuế TNDN (CIT Tax Impact Card - Chỉ Tiêu B4) */}
          <div
            data-testid="cit-tax-card"
            className={`p-4 rounded-2xl border transition-all ${
              calculationOutput.scheduleB4Amount > 0
                ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <ShieldAlert
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  calculationOutput.scheduleB4Amount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-400'
                }`}
              />
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">
                    Thẻ Tác Động Thuế TNDN — Chỉ Tiêu B4 Tờ Khai 03/TNDN
                  </h4>
                  {calculationOutput.scheduleB4Amount > 0 && (
                    <span className="px-2 py-0.5 text-[11px] rounded-full bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-semibold font-mono">
                      Cảnh báo Thuế
                    </span>
                  )}
                </div>

                {calculationOutput.scheduleB4Amount > 0 ? (
                  <>
                    <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
                      Theo chuẩn mực <strong className="font-semibold">VAS 02 Đoạn 11</strong> & Khoản 2.3 Điều 6{' '}
                      <strong className="font-semibold">Thông tư 78/2014</strong> (sửa đổi bởi{' '}
                      <strong className="font-semibold">Thông tư 96/2015</strong>), chi phí NVL & nhân công
                      vượt mức bình thường bị loại khỏi giá thành Z, hạch toán thẳng vào{' '}
                      <strong className="font-semibold font-mono">Nợ TK 632</strong> và{' '}
                      <strong className="font-semibold">không được trừ khi tính thuế TNDN</strong>.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                      <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-sans">
                          Chỉ tiêu B4 (Tăng TNCT)
                        </span>
                        <span data-testid="cit-b4-amount" className="font-bold text-rose-700 dark:text-rose-300">
                          {formatVnd(calculationOutput.scheduleB4Amount)}
                        </span>
                      </div>
                      <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-sans">
                          Thuế TNDN phát sinh (+20%)
                        </span>
                        <span data-testid="cit-tax-amount" className="font-bold text-rose-700 dark:text-rose-300">
                          {formatVnd(calculationOutput.citTaxImpact)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Toàn bộ chi phí nguyên vật liệu và nhân công đều nằm trong định mức kỹ thuật hợp lý. Không phát sinh
                    điều chỉnh tăng thu nhập chịu thuế tại Chỉ tiêu B4 Tờ khai 03/TNDN.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card E: Sơ Đồ Bút Toán Định Khoản & 1-Click Export */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Bút Toán Kế Toán Tự Động Sinh
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {calculationOutput.journalEntries.length} bút toán
              </span>
            </div>

            {/* Journal Entries List */}
            <div
              data-testid="journal-entries-table"
              className="space-y-2 max-h-72 overflow-y-auto pr-1"
            >
              {calculationOutput.journalEntries.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">Chưa có phát sinh chi phí</div>
              ) : (
                calculationOutput.journalEntries.map((entry, index) => {
                  const isCogsDebit = entry.debitAccount === '632';
                  const isFinishedGoods = entry.debitAccount === '155';
                  return (
                    <div
                      key={index}
                      data-testid={`journal-row-${index}`}
                      className={`p-2.5 rounded-xl border text-xs font-mono transition-all ${
                        isCogsDebit
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                          : isFinishedGoods
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              isCogsDebit
                                ? 'bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                                : isFinishedGoods
                                ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}
                          >
                            Nợ {entry.debitAccount}
                          </span>
                          <span>/</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold">
                            Có {entry.creditAccount}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatVnd(entry.amount)}
                        </span>
                      </div>
                      <div className="text-[11px] font-sans text-slate-600 dark:text-slate-400 mt-1">
                        {entry.descriptionVi}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 1-Click Transfer Button */}
            <div className="pt-2">
              <button
                type="button"
                data-testid="export-journalizer-btn"
                onClick={handleExportToJournalizer}
                disabled={calculationOutput.journalEntries.length === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="w-4 h-4" />
                1-Click Kết Chuyển Sang Bàn Định Khoản
              </button>
              <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-1.5">
                Tự động đẩy toàn bộ bút toán vào sổ nhật ký chung & cập nhật Sơ đồ chữ T
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManufacturingCostCalculator;
