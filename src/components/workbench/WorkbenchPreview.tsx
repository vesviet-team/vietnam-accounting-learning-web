import { useState, type FC } from 'react';
import { Scale, Plus, Trash2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { AccountingRegime } from '@/types/coa';
import { isProhibitedInCircular133 } from '@/data/prohibited-accounts';

interface WorkbenchPreviewProps {
  currentRegime: AccountingRegime;
  onNavigateToCoa: () => void;
}

interface DemoRow {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export const WorkbenchPreview: FC<WorkbenchPreviewProps> = ({
  currentRegime,
  onNavigateToCoa,
}) => {
  const [rows, setRows] = useState<DemoRow[]>([
    {
      id: '1',
      accountCode: '1121',
      accountName: 'Tiền gửi ngân hàng (VNĐ)',
      debit: 55000000,
      credit: 0,
    },
    {
      id: '2',
      accountCode: '5111',
      accountName: 'Doanh thu bán hàng hóa',
      debit: 0,
      credit: 50000000,
    },
    {
      id: '3',
      accountCode: '33311',
      accountName: 'Thuế GTGT đầu ra phải nộp (10%)',
      debit: 0,
      credit: 5000000,
    },
  ]);

  const totalDebit = rows.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);
  const totalCredit = rows.reduce((sum, r) => sum + (Number(r.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;
  const delta = Math.abs(totalDebit - totalCredit);

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  const handleUpdateRow = (
    id: string,
    field: 'accountCode' | 'debit' | 'credit',
    val: string | number
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: val };
        }
        return r;
      })
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        accountCode: '',
        accountName: '',
        debit: 0,
        credit: 0,
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 2) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          <Scale className="w-4 h-4" />
          <span>Bàn Định Khoản Kế Toán Trực Quan (Interactive Workbench)</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Thực Hành Định Khoản Đa Dòng & Cân Đối Nợ - Có Thời Gian Thực
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kiểm soát chặt chẽ nguyên tắc kế toán kép: <strong>Tổng số tiền bên Nợ bắt buộc phải bằng Tổng số tiền bên Có</strong> (&Sigma; Nợ &equiv; &Sigma; Có) trước khi ghi sổ.
        </p>
      </div>

      {/* Balance Indicator Banner */}
      <div
        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          isBalanced
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
        }`}
      >
        <div className="flex items-center space-x-3">
          {isBalanced ? (
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          ) : (
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
          )}
          <div>
            <div className="font-bold text-base">
              {isBalanced
                ? 'Bút toán đã CÂN ĐỐI (Tổng Nợ = Tổng Có)'
                : 'Bút toán CHƯA CÂN ĐỐI (Lệch Nợ - Có)'}
            </div>
            <div className="text-xs opacity-85">
              {isBalanced
                ? 'Đã thỏa mãn bất biến kế toán kép, sẵn sàng ghi sổ Nhật ký chung.'
                : `Chênh lệch còn thiếu: ${formatVnd(delta)}. Hãy kiểm tra lại số tiền các định khoản.`}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6 text-sm">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Tổng Nợ:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatVnd(totalDebit)}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Tổng Có:</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {formatVnd(totalCredit)}
            </span>
          </div>
        </div>
      </div>

      {/* Journal Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            Nghiệp vụ mẫu: Bán hàng thu tiền qua chuyển khoản (VAT 10%)
          </h3>
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm dòng</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Mã Tài Khoản</th>
                <th className="py-3 px-4">Tên Tài Khoản</th>
                <th className="py-3 px-4 text-right">Số Tiền Nợ</th>
                <th className="py-3 px-4 text-right">Số Tiền Có</th>
                <th className="py-3 px-4 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {rows.map((row) => {
                const isProhibited =
                  currentRegime === 'CIRCULAR_133' && isProhibitedInCircular133(row.accountCode);

                return (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={row.accountCode}
                          onChange={(e) =>
                            handleUpdateRow(row.id, 'accountCode', e.target.value)
                          }
                          className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100"
                        />
                        {isProhibited && (
                          <span
                            title="Tài khoản bị cấm theo TT 133!"
                            className="text-amber-600"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-sans text-xs text-slate-600 dark:text-slate-300">
                      {row.accountName || 'Tài khoản nhập thủ công'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        value={row.debit || ''}
                        onChange={(e) =>
                          handleUpdateRow(row.id, 'debit', Number(e.target.value) || 0)
                        }
                        className="w-32 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right font-bold text-emerald-600 dark:text-emerald-400"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        value={row.credit || ''}
                        onChange={(e) =>
                          handleUpdateRow(row.id, 'credit', Number(e.target.value) || 0)
                        }
                        className="w-32 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right font-bold text-blue-600 dark:text-blue-400"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={rows.length <= 2}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNavigateToCoa}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          <span>Xem danh mục tài khoản để chọn mã chính xác</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
