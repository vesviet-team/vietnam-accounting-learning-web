import { useState, type FC, type ChangeEvent } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { AccountingRegime } from '@/types/coa';
import { storageService } from '@/services/storage/storage-service';
import { useTheme } from '@/hooks/useTheme';

interface SettingsViewProps {
  currentRegime: AccountingRegime;
  onRegimeChange: (regime: AccountingRegime) => void;
}

export const SettingsView: FC<SettingsViewProps> = ({
  currentRegime,
  onRegimeChange,
}) => {
  const { theme, setTheme } = useTheme();
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async () => {
    try {
      setIsProcessing(true);
      const backup = await storageService.exportBackup();
      storageService.downloadBackup(backup);
      setStatus({
        type: 'success',
        text: 'Đã xuất file JSON sao lưu thành công!',
      });
    } catch {
      setStatus({
        type: 'error',
        text: 'Có lỗi khi xuất file sao lưu.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const text = await file.text();
      const ok = await storageService.importBackup(text);
      if (ok) {
        setStatus({
          type: 'success',
          text: 'Khôi phục dữ liệu thành công! Đang tải lại cấu hình...',
        });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setStatus({
          type: 'error',
          text: 'Tệp sao lưu không hợp lệ.',
        });
      }
    } catch {
      setStatus({
        type: 'error',
        text: 'Không thể xử lý tệp sao lưu đã chọn.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu tạm thời trên trình duyệt?')) {
      await storageService.removeItem('theme');
      await storageService.removeItem('preferred_regime');
      await storageService.removeItem('learner_progress');
      setStatus({
        type: 'success',
        text: 'Đã xóa bộ nhớ đệm cục bộ.',
      });
      setTimeout(() => window.location.reload(), 800);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Cài Đặt & Lưu Trữ Dữ Liệu
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cấu hình môi trường học tập, chế độ kế toán và sao lưu toàn bộ tiến độ của bạn.
        </p>
      </div>

      {status && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 text-sm ${
            status.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      {/* Accounting Regime Setting */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Chế Độ Kế Toán Doanh Nghiệp Mặc Định</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => onRegimeChange('CIRCULAR_200')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              currentRegime === 'CIRCULAR_200'
                ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Thông tư 200/2014/TT-BTC
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Doanh nghiệp quy mô lớn và vừa, áp dụng đầy đủ 9 loại tài khoản với hệ thống tài khoản chi tiết 4 chữ số.
            </p>
          </div>

          <div
            onClick={() => onRegimeChange('CIRCULAR_133')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              currentRegime === 'CIRCULAR_133'
                ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Thông tư 133/2016/TT-BTC
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Doanh nghiệp vừa và nhỏ (SME), tài khoản tinh giản 3 chữ số, cấm các tài khoản TK 621, 622, 623, 627, 641, 521.
            </p>
          </div>
        </div>
      </div>

      {/* Theme Setting */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Giao Diện & Chế Độ Màu Sắc
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {(['light', 'dark', 'system'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setTheme(mode)}
              className={`py-3 px-4 rounded-xl text-xs font-semibold border transition-all ${
                theme === mode
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 border-transparent shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {mode === 'light' && 'Sáng (Light)'}
              {mode === 'dark' && 'Tối (Dark)'}
              {mode === 'system' && 'Hệ thống (Auto)'}
            </button>
          ))}
        </div>
      </div>

      {/* Backup & Storage Layer */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center space-x-2">
          <HardDrive className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Tầng Lưu Trữ Cục Bộ (LocalStorage & IndexedDB)
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Ứng dụng thiết kế theo triết lý <strong>Offline-First & Zero Server Lock-in</strong>. Toàn bộ tiến trình làm bài test, kết quả đánh giá theo DOK, và điểm số của bạn được lưu trong IndexedDB trên thiết bị. Bạn có thể xuất file sao lưu JSON bất cứ lúc nào.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Xuất file JSON sao lưu</span>
          </button>

          <label className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <span>Khôi phục từ tệp JSON</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <button
            type="button"
            onClick={handleClearCache}
            className="flex items-center space-x-2 px-4 py-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-800/80 transition-colors ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Đặt lại dữ liệu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
