import { useState, useMemo } from 'react';
import type { FC } from 'react';
import {
  PlusCircle,
  RotateCcw,
  Info,
  Scale,
} from 'lucide-react';
import { TAccountData, TAccountEntry } from '@/types/curriculum';

interface TAccountViewProps {
  initialData: TAccountData;
  allowInteractive?: boolean;
}

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

export function determineAccountNature(code: string, explicitClass?: number, explicitContra?: boolean) {
  const firstChar = code.trim().charAt(0);
  const accountClass = explicitClass || parseInt(firstChar, 10) || 1;

  const isContraAsset = explicitContra ?? (code.startsWith('214') || code.startsWith('229'));
  const isContraEquity = explicitContra ?? code.startsWith('419');
  const isDualNature = code.startsWith('131') || code.startsWith('331');
  const isNominal = accountClass >= 5 && accountClass <= 9;

  let normalSide: 'DEBIT' | 'CREDIT' | 'BOTH' | 'ZERO' = 'DEBIT';
  let classTitle = 'Tài sản';

  if (isNominal) {
    normalSide = 'ZERO';
    if (accountClass === 5) classTitle = 'Doanh thu';
    else if (accountClass === 6) classTitle = 'Chi phí SXKD';
    else if (accountClass === 7) classTitle = 'Thu nhập khác';
    else if (accountClass === 8) classTitle = 'Chi phí khác';
    else classTitle = 'Xác định KQKD';
  } else if (isContraAsset) {
    normalSide = 'CREDIT';
    classTitle = 'Tài sản điều chỉnh giảm (Contra-Asset)';
  } else if (isContraEquity) {
    normalSide = 'DEBIT';
    classTitle = 'Vốn CSH điều chỉnh giảm (Contra-Equity)';
  } else if (isDualNature) {
    normalSide = 'BOTH';
    classTitle = accountClass === 1 ? 'Tài sản (Lưỡng tính)' : 'Nợ phải trả (Lưỡng tính)';
  } else if (accountClass === 1 || accountClass === 2) {
    normalSide = 'DEBIT';
    classTitle = accountClass === 1 ? 'Tài sản ngắn hạn' : 'Tài sản dài hạn';
  } else if (accountClass === 3) {
    normalSide = 'CREDIT';
    classTitle = 'Nợ phải trả';
  } else if (accountClass === 4) {
    normalSide = 'CREDIT';
    classTitle = 'Vốn chủ sở hữu';
  }

  return {
    accountClass,
    isContraAsset,
    isContraEquity,
    isDualNature,
    isNominal,
    normalSide,
    classTitle,
  };
}

export const TAccountView: FC<TAccountViewProps> = ({
  initialData,
  allowInteractive = true,
}) => {
  const [entries, setEntries] = useState<TAccountEntry[]>(initialData.entries || []);
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newSide, setNewSide] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [newCounter, setNewCounter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const nature = useMemo(() => {
    return determineAccountNature(
      initialData.accountCode,
      initialData.accountClass,
      initialData.isContra
    );
  }, [initialData.accountCode, initialData.accountClass, initialData.isContra]);

  // Separate Debit and Credit entries
  const debitEntries = useMemo(() => entries.filter((e) => e.side === 'DEBIT'), [entries]);
  const creditEntries = useMemo(() => entries.filter((e) => e.side === 'CREDIT'), [entries]);

  // Subtotals
  const totalDebit = useMemo(
    () => debitEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [debitEntries]
  );
  const totalCredit = useMemo(
    () => creditEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [creditEntries]
  );

  // Opening Balance
  const openingAmount = initialData.openingBalance?.amount || 0;
  const openingSide = initialData.openingBalance?.side || (nature.normalSide === 'CREDIT' ? 'CREDIT' : 'DEBIT');

  // Calculated Ending Balance
  const calculation = useMemo(() => {
    if (nature.isNominal) {
      return {
        amount: 0,
        side: 'ZERO' as const,
        noteVi: 'Tài khoản thời kỳ: Kết chuyển sạch về TK 911 cuối kỳ, số dư cuối kỳ bằng 0.',
      };
    }

    if (nature.isContraAsset) {
      // Normal balance is CREDIT. Credit increases, Debit decreases.
      const initialCredit = openingSide === 'CREDIT' ? openingAmount : -openingAmount;
      const endAmount = initialCredit + totalCredit - totalDebit;
      return {
        amount: Math.abs(endAmount),
        side: endAmount >= 0 ? ('CREDIT' as const) : ('DEBIT' as const),
        noteVi: 'Tài khoản điều chỉnh giảm (TK 214/229): Dư Có, trình bày số âm bên Tài sản trên BCTC.',
      };
    }

    if (nature.isContraEquity) {
      // Normal balance is DEBIT. Debit increases, Credit decreases.
      const initialDebit = openingSide === 'DEBIT' ? openingAmount : -openingAmount;
      const endAmount = initialDebit + totalDebit - totalCredit;
      return {
        amount: Math.abs(endAmount),
        side: endAmount >= 0 ? ('DEBIT' as const) : ('CREDIT' as const),
        noteVi: 'Cổ phiếu quỹ (TK 419): Dư Nợ, trình bày số âm bên Vốn chủ sở hữu trên BCTC.',
      };
    }

    if (nature.accountClass === 1 || nature.accountClass === 2) {
      // Assets: Debit increases, Credit decreases.
      const initialDebit = openingSide === 'DEBIT' ? openingAmount : -openingAmount;
      const endAmount = initialDebit + totalDebit - totalCredit;
      return {
        amount: Math.abs(endAmount),
        side: endAmount >= 0 ? ('DEBIT' as const) : ('CREDIT' as const),
        noteVi: endAmount < 0 ? 'Cảnh báo: Tài sản có số dư âm! Hãy kiểm tra lại các bút toán chi.' : 'Dư Nợ: Phản ánh giá trị tài sản hiện có của doanh nghiệp.',
      };
    }

    // Liabilities & Equity (Class 3 & 4)
    const initialCredit = openingSide === 'CREDIT' ? openingAmount : -openingAmount;
    const endAmount = initialCredit + totalCredit - totalDebit;
    return {
      amount: Math.abs(endAmount),
      side: endAmount >= 0 ? ('CREDIT' as const) : ('DEBIT' as const),
      noteVi: 'Dư Có: Phản ánh nguồn vốn hình thành nên tài sản.',
    };
  }, [nature, openingSide, openingAmount, totalDebit, totalCredit]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(newAmount);
    if (!newDesc.trim() || isNaN(num) || num <= 0) return;

    const newEntry: TAccountEntry = {
      id: `user-${Date.now()}`,
      description: newDesc.trim(),
      amount: num,
      side: newSide,
      counterAccountCode: newCounter.trim() ? newCounter.trim() : undefined,
    };

    setEntries((prev) => [...prev, newEntry]);
    setNewDesc('');
    setNewAmount('');
    setNewCounter('');
    setShowAddForm(false);
  };

  const handleReset = () => {
    setEntries(initialData.entries || []);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 bg-emerald-600 text-white font-mono font-bold text-xs rounded-lg shadow-2xs">
              TK {initialData.accountCode}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Loại {nature.accountClass}: {nature.classTitle}
            </span>
            {nature.isContraAsset && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Contra-Asset
              </span>
            )}
            {nature.isDualNature && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                Lưỡng tính
              </span>
            )}
          </div>
          <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            {initialData.accountNameVi}
          </h4>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 self-start sm:self-center">
          {allowInteractive && (
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Đóng form' : 'Thêm bút toán'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            title="Khôi phục trạng thái ban đầu"
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Entry Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddEntry}
          className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-200 dark:border-emerald-800/60 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
        >
          <div className="sm:col-span-2">
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Diễn giải nghiệp vụ
            </label>
            <input
              type="text"
              required
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="VD: Rút tiền gửi nhập quỹ, bán hàng..."
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Số tiền (VNĐ)
            </label>
            <input
              type="number"
              required
              min="1"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="VD: 50000000"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ghi bên
              </label>
              <select
                value={newSide}
                onChange={(e) => setNewSide(e.target.value as 'DEBIT' | 'CREDIT')}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="DEBIT">NỢ (Debit)</option>
                <option value="CREDIT">CÓ (Credit)</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition-colors shrink-0"
            >
              Ghi sổ
            </button>
          </div>
        </form>
      )}

      {/* The T-Account Master Structure */}
      <div className="p-4 sm:p-6">
        <div className="max-w-3xl mx-auto border-2 border-slate-800 dark:border-slate-300 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
          {/* T-Bar Header: Account Title */}
          <div className="py-2.5 px-4 text-center bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold text-sm tracking-wide flex items-center justify-between">
            <span className="text-emerald-400 dark:text-emerald-700 font-mono">BÊN NỢ (DEBIT)</span>
            <span className="uppercase text-xs sm:text-sm">
              SƠ ĐỒ CHỮ T: TK {initialData.accountCode} - {initialData.accountNameVi}
            </span>
            <span className="text-rose-400 dark:text-rose-700 font-mono">BÊN CÓ (CREDIT)</span>
          </div>

          {/* 2 Column Body: Left = Debit, Right = Credit */}
          <div className="grid grid-cols-2 divide-x-2 divide-slate-800 dark:divide-slate-300 min-h-[160px]">
            {/* LEFT COLUMN: NỢ */}
            <div className="p-3 sm:p-4 flex flex-col justify-between space-y-3 bg-slate-50/40 dark:bg-slate-900">
              <div className="space-y-2">
                {/* Opening Balance on Debit */}
                {openingAmount > 0 && openingSide === 'DEBIT' && (
                  <div className="pb-2 border-b border-dashed border-slate-300 dark:border-slate-700 text-xs flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold bg-emerald-50/60 dark:bg-emerald-950/30 p-1.5 rounded">
                    <span>Số dư đầu kỳ (SDĐ):</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {formatVnd(openingAmount)}
                    </span>
                  </div>
                )}

                {/* Debit Transactions */}
                {debitEntries.length === 0 ? (
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center py-4">
                    Không có phát sinh Nợ
                  </div>
                ) : (
                  debitEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="text-xs flex items-start justify-between gap-1.5 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="text-slate-600 dark:text-slate-400 text-[11px] leading-tight flex-1">
                        <span>{entry.description}</span>
                        {entry.counterAccountCode && (
                          <span className="ml-1 text-[10px] font-mono text-slate-400">
                            (ĐƯ: {entry.counterAccountCode})
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                        {formatVnd(entry.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Subtotal Debit */}
              <div className="pt-2 border-t-2 border-slate-300 dark:border-slate-700 text-xs flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400">
                <span>Tổng phát sinh Nợ:</span>
                <span className="font-mono">{formatVnd(totalDebit)}</span>
              </div>
            </div>

            {/* RIGHT COLUMN: CÓ */}
            <div className="p-3 sm:p-4 flex flex-col justify-between space-y-3 bg-slate-50/40 dark:bg-slate-900">
              <div className="space-y-2">
                {/* Opening Balance on Credit */}
                {openingAmount > 0 && openingSide === 'CREDIT' && (
                  <div className="pb-2 border-b border-dashed border-slate-300 dark:border-slate-700 text-xs flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold bg-rose-50/60 dark:bg-rose-950/30 p-1.5 rounded">
                    <span>Số dư đầu kỳ (SDĐ):</span>
                    <span className="font-mono text-rose-700 dark:text-rose-400">
                      {formatVnd(openingAmount)}
                    </span>
                  </div>
                )}

                {/* Credit Transactions */}
                {creditEntries.length === 0 ? (
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center py-4">
                    Không có phát sinh Có
                  </div>
                ) : (
                  creditEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="text-xs flex items-start justify-between gap-1.5 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="text-slate-600 dark:text-slate-400 text-[11px] leading-tight flex-1">
                        <span>{entry.description}</span>
                        {entry.counterAccountCode && (
                          <span className="ml-1 text-[10px] font-mono text-slate-400">
                            (ĐƯ: {entry.counterAccountCode})
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                        {formatVnd(entry.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Subtotal Credit */}
              <div className="pt-2 border-t-2 border-slate-300 dark:border-slate-700 text-xs flex items-center justify-between font-bold text-rose-700 dark:text-rose-400">
                <span>Tổng phát sinh Có:</span>
                <span className="font-mono">{formatVnd(totalCredit)}</span>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Ending Balance */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-800 dark:border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Số Dư Cuối Kỳ (SDCK):
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono font-bold ${
                  calculation.side === 'ZERO'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    : calculation.side === 'DEBIT'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                }`}
              >
                {calculation.side === 'ZERO'
                  ? 'Dư = 0 đ'
                  : `Dư ${calculation.side === 'DEBIT' ? 'NỢ' : 'CÓ'}: ${formatVnd(calculation.amount)}`}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 italic text-center sm:text-right">
              {calculation.noteVi}
            </div>
          </div>
        </div>

        {/* Pedagogical Explanation Box */}
        {(initialData.explanationVi || nature.isDualNature || nature.isContraAsset) && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400 flex items-start space-x-2">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {initialData.explanationVi && <p>{initialData.explanationVi}</p>}
              {nature.isDualNature && (
                <p className="text-amber-800 dark:text-amber-300">
                  <strong>Lưu ý lưỡng tính:</strong> TK {initialData.accountCode} có thể vừa có số dư Nợ (khách nợ / trả trước NCC), vừa có số dư Có (ứng trước / phải trả). Tuyệt đối không bù trừ số dư trên Bảng cân đối kế toán.
                </p>
              )}
              {nature.isContraAsset && (
                <p className="text-blue-800 dark:text-blue-300">
                  <strong>Lưu ý Contra-Asset:</strong> TK {initialData.accountCode} tăng bên Có, giảm bên Nợ, số dư Có được thể hiện là số âm bên phần Tài sản của BCTC để làm giảm nguyên giá.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
