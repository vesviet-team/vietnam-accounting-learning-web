import { useState, useMemo, useEffect, type FC } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  BookOpen,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { AccountingRegime } from '@/types/coa';
import { storageService } from '@/services/storage/storage-service';
import {
  generateBalanceSheet,
  generateIncomeStatement,
  formatCurrencyVnd,
  DAY_27_CLOSING_DATASET,
  BalanceSheetReport,
  IncomeStatementReport,
} from '@/services/financial-statements';

export interface FinancialStatementsViewProps {
  currentRegime?: AccountingRegime;
  onRegimeChange?: (regime: AccountingRegime) => void;
  onNavigateToJournalizer?: () => void;
  initialLedger?: Record<string, any>;
}

export const FinancialStatementsView: FC<FinancialStatementsViewProps> = ({
  currentRegime = 'CIRCULAR_200',
  onRegimeChange,
  onNavigateToJournalizer,
  initialLedger,
}) => {
  const [selectedCircular, setSelectedCircular] = useState<'TT200' | 'TT133'>(
    currentRegime === 'CIRCULAR_133' ? 'TT133' : 'TT200'
  );
  const [activeStatement, setActiveStatement] = useState<'B01' | 'B02'>('B01');
  const [ledgerSource, setLedgerSource] = useState<'DAY_27' | 'JOURNALIZER' | 'CUSTOM'>(
    initialLedger ? 'CUSTOM' : 'DAY_27'
  );
  const [ledgerAccounts, setLedgerAccounts] = useState<Record<string, any>>(
    initialLedger || DAY_27_CLOSING_DATASET
  );
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Synchronize when currentRegime changes from outside
  useEffect(() => {
    setSelectedCircular(currentRegime === 'CIRCULAR_133' ? 'TT133' : 'TT200');
  }, [currentRegime]);

  // Handle manual circular toggle
  const handleToggleCircular = (circular: 'TT200' | 'TT133') => {
    setSelectedCircular(circular);
    if (onRegimeChange) {
      onRegimeChange(circular === 'TT133' ? 'CIRCULAR_133' : 'CIRCULAR_200');
    }
  };

  // Load standard Day 27 closing data
  const handleLoadDay27Data = () => {
    setLedgerAccounts(DAY_27_CLOSING_DATASET);
    setLedgerSource('DAY_27');
    setStatusFeedback('Đã nạp thành công bộ số liệu chuẩn Ngày 27 (Khóa sổ hoàn chỉnh 1,540,000,000 đ).');
  };

  // Load from Journalizer (IndexedDB / storageService)
  const handleLoadFromJournalizer = async () => {
    try {
      const state = await storageService.loadWorkbenchState();
      if (state.ledgerTAccounts && Object.keys(state.ledgerTAccounts).length > 0) {
        setLedgerAccounts(state.ledgerTAccounts);
        setLedgerSource('JOURNALIZER');
        setStatusFeedback(
          `Đã nạp ${Object.keys(state.ledgerTAccounts).length} tài khoản phát sinh từ Sổ Cái (Journalizer).`
        );
      } else {
        setStatusFeedback('Sổ Cái chưa có tài khoản phát sinh nào được ghi sổ. Bạn có thể định khoản trước tại Bàn Định Khoản.');
      }
    } catch (err) {
      console.error('[FinancialStatementsView] Failed to load workbench state:', err);
      setStatusFeedback('Lỗi khi nạp dữ liệu từ Sổ Cái.');
    }
  };

  // Generate Reports
  const balanceSheet: BalanceSheetReport = useMemo(() => {
    return generateBalanceSheet(ledgerAccounts, selectedCircular);
  }, [ledgerAccounts, selectedCircular]);

  const incomeStatement: IncomeStatementReport = useMemo(() => {
    return generateIncomeStatement(ledgerAccounts);
  }, [ledgerAccounts]);

  const formatted270 = formatCurrencyVnd(balanceSheet.assets.totalAssets);
  const formatted440 = formatCurrencyVnd(balanceSheet.resources.totalResources);
  const formattedDelta = formatCurrencyVnd(balanceSheet.discrepancy);

  // Filter nominal account warnings for dedicated highlight
  const nominalWarnings = balanceSheet.warnings.filter((w) => w.includes('Tài khoản tạm thời'));

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Phòng Thực Hành Lập Bộ Báo Cáo Tài Chính Động (B01-DN & B02-DN)</span>
          </div>

          <div className="flex items-center space-x-2">
            {onNavigateToJournalizer && (
              <button
                type="button"
                onClick={onNavigateToJournalizer}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại Bàn Định Khoản</span>
              </button>
            )}

            {/* Regime Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleToggleCircular('TT200')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedCircular === 'TT200'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Thông tư 200
              </button>
              <button
                type="button"
                onClick={() => handleToggleCircular('TT133')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedCircular === 'TT133'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Thông tư 133
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Hệ Thống Báo Cáo Tài Chính Chuẩn Mực</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                VAS & {selectedCircular}
              </span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Tự động tổng hợp số liệu từ Sổ Cái, xác thực phương trình bất biến{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                Tổng Tài Sản (Mã 270) &equiv; Tổng Nguồn Vốn (Mã 440)
              </strong>{' '}
              và chuỗi tính toán 12 tầng Kết quả kinh doanh.
            </p>
          </div>

          {/* Action Buttons for Loading Data */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLoadDay27Data}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Nạp số liệu chuẩn Ngày 27</span>
            </button>

            <button
              type="button"
              onClick={handleLoadFromJournalizer}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all"
            >
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Nạp số liệu từ Sổ Cái (Journalizer)</span>
            </button>
          </div>
        </div>

        {/* Status Feedback Toast */}
        {statusFeedback && (
          <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{statusFeedback}</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Nguồn: {ledgerSource === 'DAY_27' ? 'Ngày 27 Chuẩn' : ledgerSource === 'JOURNALIZER' ? 'Sổ Cái Thực Hành' : 'Tùy chỉnh'}
            </span>
          </div>
        )}
      </div>

      {/* PROMINENT INVARIANT STATUS BANNER */}
      <div
        data-testid="invariant-banner"
        className={`p-5 rounded-2xl border transition-all ${
          balanceSheet.isBalanced
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            {balanceSheet.isBalanced ? (
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            ) : (
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
            )}

            <div>
              <div className="font-bold text-base sm:text-lg flex flex-wrap items-center gap-2">
                {balanceSheet.isBalanced ? (
                  <span>
                    Cân đối kế toán Tuyệt đối: Tổng Tài Sản (Mã 270) = Nguồn Vốn (Mã 440) = {formatted270}
                  </span>
                ) : (
                  <span>
                    CẢNH BÁO: Bảng Cân đối kế toán bị LỆCH {formattedDelta}! Tổng Tài Sản: {formatted270} != Nguồn Vốn: {formatted440}
                  </span>
                )}
              </div>

              <div className="text-xs mt-1 text-slate-600 dark:text-slate-300">
                {balanceSheet.isBalanced ? (
                  <span>
                    Báo cáo tài chính thỏa mãn phương trình kế toán cơ bản VAS:{' '}
                    <strong>Tài sản (270) = Nợ phải trả (300) + Vốn chủ sở hữu (400)</strong>. Không phát sinh sai lệch số học.
                  </span>
                ) : (
                  <span>
                    Sai lệch kế toán kép &Delta; = <strong>{formattedDelta}</strong>. Báo cáo tài chính vi phạm nguyên tắc cân đối pháp lý. Vui lòng kiểm tra lại các bút toán chưa đối ứng hoặc số dư chưa khóa sổ.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-center">
              <span className="text-[10px] text-slate-400 block font-semibold">TÀI SẢN (270)</span>
              <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                {formatted270}
              </strong>
            </div>
            <span className="text-slate-400 font-bold">{balanceSheet.isBalanced ? '=' : '≠'}</span>
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-center">
              <span className="text-[10px] text-slate-400 block font-semibold">NGUỒN VỐN (440)</span>
              <strong className="font-mono text-blue-700 dark:text-blue-400 font-bold">
                {formatted440}
              </strong>
            </div>
          </div>
        </div>

        {/* Temporary Accounts Warning (Classes 5 to 9) */}
        {nominalWarnings.length > 0 && (
          <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-900/60 flex items-start space-x-2 text-xs text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Cảnh báo khóa sổ tài khoản tạm thời (Loại 5 - 9):</div>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                {nominalWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Statement Selector Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveStatement('B01')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeStatement === 'B01'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>B01-DN: Bảng Cân Đối Kế Toán</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatement('B02')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeStatement === 'B02'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>B02-DN: Báo Cáo Kết Quả Kinh Doanh</span>
        </button>
      </div>

      {/* STATEMENT CONTENT AREA */}
      {activeStatement === 'B01' ? (
        /* ================= B01-DN: BẢNG CÂN ĐỐI KẾ TOÁN ================= */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 text-center space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block">
              Mẫu số B01 - DN (Ban hành theo TT 200 & TT 133)
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              BẢNG CÂN ĐỐI KẾ TOÁN
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tại ngày: 31 tháng 12 năm 2026 &bull; Đơn vị tính: VNĐ &bull; Chế độ: {selectedCircular}
            </p>
          </div>

          {/* Balance Sheet Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <th className="py-3 px-4 text-left font-bold w-2/5">CHỈ TIÊU</th>
                  <th className="py-3 px-3 text-center font-bold w-16">MÃ SỐ</th>
                  <th className="py-3 px-4 text-left font-bold w-1/4">TÀI KHOẢN TẬP HỢP</th>
                  <th className="py-3 px-4 text-right font-bold w-1/4">SỐ CUỐI NĂM (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {balanceSheet.items?.map((row) => {
                  const isLevel1 = row.displayLevel === 1;
                  const isLevel2 = row.displayLevel === 2;
                  const isNegative = row.isNegative || row.closingAmount < 0;

                  return (
                    <tr
                      key={row.itemCode}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isLevel1
                          ? 'bg-slate-100/60 dark:bg-slate-800/50 font-bold text-slate-900 dark:text-slate-100'
                          : isLevel2
                          ? 'font-semibold text-slate-800 dark:text-slate-200'
                          : 'text-slate-600 dark:text-slate-400 pl-4'
                      }`}
                    >
                      <td className={`py-2.5 px-4 ${row.displayLevel === 3 ? 'pl-8' : ''}`}>
                        {row.itemNameVi}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 dark:text-slate-400">
                        {row.itemCode}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {row.accountSources?.join(', ') || '-'}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono font-semibold ${
                          isLevel1 ? 'text-sm font-bold text-emerald-700 dark:text-emerald-400' : ''
                        } ${isNegative ? 'text-rose-600 dark:text-rose-400' : ''}`}
                      >
                        {isNegative
                          ? `(${formatCurrencyVnd(Math.abs(row.closingAmount))})`
                          : formatCurrencyVnd(row.closingAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Summary Cards */}
          <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Tổng Tài Sản (Mã 270)
              </span>
              <div className="text-base font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                {formatted270}
              </div>
              <div className="text-[11px] text-slate-500">
                Ngắn hạn: {formatCurrencyVnd(balanceSheet.assets.shortTerm.code100)} &bull; Dài hạn: {formatCurrencyVnd(balanceSheet.assets.longTerm.code200)}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Nợ Phải Trả (Mã 300)
              </span>
              <div className="text-base font-extrabold font-mono text-blue-700 dark:text-blue-400">
                {formatCurrencyVnd(balanceSheet.resources.liabilities.code300)}
              </div>
              <div className="text-[11px] text-slate-500">
                Ngắn hạn: {formatCurrencyVnd(balanceSheet.resources.liabilities.items['310'] || 0)} &bull; Dài hạn: {formatCurrencyVnd(balanceSheet.resources.liabilities.items['330'] || 0)}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Vốn Chủ Sở Hữu (Mã 400)
              </span>
              <div className="text-base font-extrabold font-mono text-purple-700 dark:text-purple-400">
                {formatCurrencyVnd(balanceSheet.resources.equity.code400)}
              </div>
              <div className="text-[11px] text-slate-500">
                Vốn CSH: {formatCurrencyVnd(balanceSheet.resources.equity.items['411'] || 0)} &bull; LN chưa PP: {formatCurrencyVnd(balanceSheet.resources.equity.items['421'] || 0)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= B02-DN: KẾT QUẢ KINH DOANH ================= */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-4">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 text-center space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block">
              Mẫu số B02 - DN (Ban hành theo TT 200 & TT 133)
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kỳ báo cáo: {incomeStatement.period} &bull; Đơn vị tính: VNĐ &bull; Chế độ: {selectedCircular}
            </p>
          </div>

          {/* Income Statement Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <th className="py-3 px-4 text-left font-bold w-1/2">CHỈ TIÊU</th>
                  <th className="py-3 px-3 text-center font-bold w-16">MÃ SỐ</th>
                  <th className="py-3 px-4 text-left font-bold w-1/4">CÔNG THỨC & NGUỒN SỐ LIỆU</th>
                  <th className="py-3 px-4 text-right font-bold w-1/4">NĂM NAY (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {incomeStatement.items?.map((item) => {
                  const isHighlight =
                    item.itemCode === '10' ||
                    item.itemCode === '20' ||
                    item.itemCode === '30' ||
                    item.itemCode === '50' ||
                    item.itemCode === '60';

                  const isFinal = item.itemCode === '60';

                  return (
                    <tr
                      key={item.itemCode}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isFinal
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 font-bold text-emerald-950 dark:text-emerald-200'
                          : isHighlight
                          ? 'bg-slate-50/80 dark:bg-slate-800/60 font-bold text-slate-900 dark:text-slate-100'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-medium">{item.itemNameVi}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 dark:text-slate-400">
                        {item.itemCode}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {item.formulaDescriptionVi}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono font-semibold ${
                          isFinal
                            ? 'text-sm font-extrabold text-emerald-700 dark:text-emerald-400'
                            : isHighlight
                            ? 'font-bold text-slate-900 dark:text-slate-100'
                            : ''
                        }`}
                      >
                        {formatCurrencyVnd(item.currentPeriodAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Income Statement Summary Highlights */}
          <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Doanh thu thuần (Mã 10)</span>
              <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {formatCurrencyVnd(incomeStatement.netRevenue)}
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Lợi nhuận gộp (Mã 20)</span>
              <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {formatCurrencyVnd(incomeStatement.grossProfit)}
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Thuế TNDN (Mã 51)</span>
              <div className="font-mono font-bold text-amber-700 dark:text-amber-400">
                {formatCurrencyVnd(incomeStatement.citExpense)}
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Lợi nhuận sau thuế (Mã 60)</span>
              <div className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                {formatCurrencyVnd(incomeStatement.netProfitAfterTax)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialStatementsView;
