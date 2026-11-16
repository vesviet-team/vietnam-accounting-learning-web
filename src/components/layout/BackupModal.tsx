import { useState, useRef, type FC, type ChangeEvent } from 'react';
import {
  X,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  CloudUpload,
  LogIn,
  UserRound,
} from 'lucide-react';
import { storageService } from '@/services/storage/storage-service';
import type { AuthUser } from '@/types/auth';
import type { SyncStatusState } from '@/services/sync/sync-service';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackupRestored?: () => void;
  user?: AuthUser | null;
  syncStatus?: SyncStatusState;
  onLogin?: () => void;
  onOpenAccount?: () => void;
  onSyncNow?: () => void;
}

export const BackupModal: FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onBackupRestored,
  user = null,
  syncStatus,
  onLogin,
  onOpenAccount,
  onSyncNow,
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
        <div className="p-6 space-y-5">
          {/* Cloud Account Sync Summary */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2.5">
            {user ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <UserRound className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {user.display_name || user.email}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                    {syncStatus?.status === 'syncing'
                      ? 'Đang đồng bộ…'
                      : syncStatus?.lastSyncAt
                        ? `Đồng bộ lúc ${new Date(syncStatus.lastSyncAt).toLocaleTimeString('vi-VN')}`
                        : 'Sẵn sàng đồng bộ'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {onSyncNow && (
                    <button
                      type="button"
                      onClick={onSyncNow}
                      className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                    >
                      <CloudUpload className="w-3.5 h-3.5" />
                      <span>Đồng bộ ngay</span>
                    </button>
                  )}
                  {onOpenAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAccount();
                        onClose();
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
                    >
                      Quản lý tài khoản
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <strong className="block text-slate-800 dark:text-slate-100">Đồng bộ đám mây</strong>
                  Đăng nhập để tự động lưu tiến độ học và bài đã lưu.
                </div>
                {onLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      onLogin();
                      onClose();
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Đăng nhập</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Dữ liệu học tập (tiến độ 30 ngày, bài học đã lưu, điểm bài test định kỳ, tùy chọn giao diện) được lưu trữ an toàn ngay trên trình duyệt của bạn (LocalStorage + IndexedDB). Bạn có thể xuất file JSON để lưu trữ hoặc chuyển sang máy khác.
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
