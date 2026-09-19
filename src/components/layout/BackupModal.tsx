import { useState, useRef, type FC, type ChangeEvent } from 'react';
import { X, Download, Upload, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';
import { storageService } from '@/services/storage/storage-service';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackupRestored?: () => void;
}

export const BackupModal: FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onBackupRestored,
}) => {
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage(null);
      const jsonBackup = await storageService.exportBackup();
      storageService.downloadBackup(jsonBackup);
      setStatusMessage({
        type: 'success',
        text: 'Đã xuất file sao lưu thành công! Kiểm tra thư mục Downloads của bạn.',
      });
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: 'Có lỗi xảy ra khi tạo tệp sao lưu.',
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
      setStatusMessage(null);
      const text = await file.text();
      const success = await storageService.importBackup(text);

      if (success) {
        setStatusMessage({
          type: 'success',
          text: 'Khôi phục dữ liệu thành công! Đang tải lại trạng thái...',
        });
        if (onBackupRestored) {
          onBackupRestored();
        }
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Tệp sao lưu không hợp lệ hoặc bị lỗi cấu trúc dữ liệu.',
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: 'Không thể đọc tệp sao lưu đã chọn.',
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Sao lưu & Khôi phục
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quản lý dữ liệu học tập và tiến độ bài học
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Dữ liệu học tập (tiến độ 30 ngày, điểm bài test định kỳ, tùy chọn giao diện) được lưu trữ an toàn ngay trên trình duyệt của bạn (LocalStorage + IndexedDB). Bạn có thể xuất file JSON để lưu trữ hoặc chuyển sang máy khác.
          </p>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl flex items-start space-x-3 text-sm ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Xuất sao lưu JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>Khôi phục từ tệp</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="pt-2 text-xs text-slate-400 dark:text-slate-500 text-center">
            Định dạng tệp: JSON hợp lệ chuẩn Vietnam Accounting Web v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
};
