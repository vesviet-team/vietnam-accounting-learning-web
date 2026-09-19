import type { FC } from 'react';
import {
  X,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { AccountItem, CATEGORY_METADATA } from '@/types/coa';
import { getProhibitionRule } from '@/data/prohibited-accounts';

interface CoaDetailModalProps {
  account: AccountItem | null;
  onClose: () => void;
  onSelectSubstitute?: (code: string) => void;
}

export const CoaDetailModal: FC<CoaDetailModalProps> = ({
  account,
  onClose,
  onSelectSubstitute,
}) => {
  if (!account) return null;

  const prohibition = getProhibitionRule(account.code);
  const isProhibited = account.isProhibitedIn133 || !!prohibition;
  const categoryMeta = CATEGORY_METADATA[account.category];

  const getBalanceBadge = () => {
    switch (account.normalBalance) {
      case 'DEBIT':
        return {
          label: 'Dư Nợ (Tài sản / Chi phí phát sinh)',
          desc: 'Tăng ghi bên Nợ, Giảm ghi bên Có. Số dư cuối kỳ thường nằm bên Nợ (ngoại trừ tài khoản điều chỉnh giảm 214, 229 ghi Có).',
          color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        };
      case 'CREDIT':
        return {
          label: 'Dư Có (Nguồn vốn / Nợ phải trả)',
          desc: 'Tăng ghi bên Có, Giảm ghi bên Nợ. Số dư cuối kỳ nằm bên Có (ngoại trừ tài khoản điều chỉnh giảm vốn 419 ghi Nợ).',
          color: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        };
      case 'BOTH':
        return {
          label: 'Lưỡng tính (Có thể dư Nợ hoặc dư Có)',
          desc: 'Tài khoản công nợ thanh toán (131, 331, 333, 338, 421). Số dư cuối kỳ phản ánh chi tiết theo từng đối tượng khách hàng hoặc nhà cung cấp; không được bù trừ giữa dư Nợ và dư Có khi lập Báo cáo tài chính.',
          color: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
        };
      case 'ZERO':
      default:
        return {
          label: 'Không có số dư cuối kỳ (Tài khoản quá độ / Kết chuyển)',
          desc: 'Doanh thu (Loại 5), Chi phí (Loại 6, 8) và Xác định kết quả (Loại 9). Cuối kỳ kế toán toàn bộ số phát sinh được kết chuyển để xác định kết quả kinh doanh, số dư cuối kỳ luôn bằng 0.',
          color: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
        };
    }
  };

  const balanceInfo = getBalanceBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-emerald-600 text-white font-mono font-bold text-lg rounded-xl shadow-xs">
                TK {account.code}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${categoryMeta.colorClass}`}
              >
                {categoryMeta.nameVi}
              </span>
              {account.parentCode && (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Thuộc TK mẹ: {account.parentCode}
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 pt-1">
              {account.nameVi}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Prohibited in Circular 133 Warning Guard */}
          {isProhibited && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700/80 space-y-3">
              <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-semibold">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>CẢNH BÁO: TÀI KHOẢN KHÔNG ÁP DỤNG TRONG THÔNG TƯ 133</span>
              </div>
              <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                {prohibition?.reasonVi ||
                  account.prohibitionNote ||
                  'Bộ Tài chính đã tinh giản tài khoản này trong Thông tư 133/2016/TT-BTC nhằm giảm tải công việc hạch toán cho doanh nghiệp vừa và nhỏ.'}
              </p>

              {(prohibition?.substituteCode || account.substituteIn133) && (
                <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Tài khoản thay thế hợp chuẩn theo TT 133:
                    </div>
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {prohibition?.substituteCode
                        ? `TK ${prohibition.substituteCode}: ${prohibition.substituteNameVi}`
                        : account.substituteIn133}
                    </div>
                  </div>
                  {onSelectSubstitute && prohibition?.substituteCode && (
                    <button
                      type="button"
                      onClick={() => onSelectSubstitute(prohibition.substituteCode)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors"
                    >
                      <span>Xem TK thay thế</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {prohibition?.remedyGuideVi && (
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Hướng dẫn xử lý:</strong> {prohibition.remedyGuideVi}
                </div>
              )}

              {prohibition?.statutoryBasis && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Căn cứ pháp lý: {prohibition.statutoryBasis}
                </div>
              )}
            </div>
          )}

          {/* Normal Balance Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Kết Cấu & Bản Chất Số Dư</span>
            </h4>
            <div className={`p-4 rounded-xl border ${balanceInfo.color} space-y-1.5`}>
              <div className="font-bold text-sm sm:text-base">
                {balanceInfo.label}
              </div>
              <p className="text-xs sm:text-sm leading-relaxed opacity-90">
                {balanceInfo.desc}
              </p>
            </div>
          </div>

          {/* Accounting Content Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Nội Dung & Phạm Vi Phản Ánh</span>
            </h4>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {account.description}
            </div>
          </div>

          {/* Regimes Supported */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
              <HelpCircle className="w-4 h-4" />
              <span>Áp dụng trong hệ thống:</span>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-0.5 rounded-md font-medium ${
                  account.regimes.includes('CIRCULAR_200')
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'
                }`}
              >
                Thông tư 200
              </span>
              <span
                className={`px-2 py-0.5 rounded-md font-medium ${
                  account.regimes.includes('CIRCULAR_133') && !account.isProhibitedIn133
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : isProhibited
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'
                }`}
              >
                Thông tư 133 {isProhibited && '(Bị cấm)'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
