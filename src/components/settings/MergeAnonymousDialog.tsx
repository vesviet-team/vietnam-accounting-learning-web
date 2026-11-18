import { useEffect, useState, type FC } from 'react';
import { CloudUpload, XCircle, Loader2, CloudOff } from 'lucide-react';
import { authService } from '@/services/auth/auth-service';
import { syncService } from '@/services/sync/sync-service';
import type { AuthUser } from '@/types/auth';

/**
 * Anonymous → account migration dialog (P1). Shows once, right after the
 * first login, when this device holds local learning data. Declining keeps
 * the local data anonymous (offline-first: nothing is ever forced into the
 * cloud).
 */
export const MergeAnonymousDialog: FC = () => {
  const [user, setUser] = useState<AuthUser | null>(authService.getUser());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'merged' | 'failed' | null>(null);

  useEffect(() => {
    const check = async ({ user: u }: { user: AuthUser | null }) => {
      setUser(u);
      if (!u) return;
      try {
        if (syncService.wasMergeAsked(u.id)) return;
        const hasData = await syncService.hasLocalLearningData();
        if (hasData) setOpen(true);
        else syncService.markMergeAsked(u.id);
      } catch {
        /* never block the app on the prompt */
      }
    };
    const off = authService.onAuthChange(check);
    // Already-logged-in reload case (no auth-change event fires).
    const current = authService.getUser();
    if (current) void check({ user: current });
    return off;
  }, []);

  const handleMerge = async () => {
    setBusy(true);
    const ok = await syncService.mergeAnonymous();
    setBusy(false);
    if (ok) {
      setResult('merged');
      const u = authService.getUser();
      if (u) syncService.markMergeAsked(u.id);
      void syncService.pull();
    } else {
      setResult('failed');
    }
  };

  const handleDecline = () => {
    const u = authService.getUser();
    if (u) {
      syncService.markMergeAsked(u.id);
      syncService.setLastAccountId(u.id);
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open || busy) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, busy]);

  if (!user || !open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      data-testid="merge-anonymous-dialog"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CloudUpload className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Gộp tiến độ từ thiết bị này vào tài khoản?
          </h2>
        </div>

        {result === null && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Chúng tôi thấy tiến độ học, điểm milestone và bảng định khoản đã lưu <strong>trên thiết bị này</strong>.
              Gộp chúng vào tài khoản để học tiếp trên mọi thiết bị — dữ liệu cục bộ vẫn được giữ nguyên.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleMerge}
                disabled={busy}
                data-testid="merge-anonymous-confirm"
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                <span>{busy ? 'Đang gộp…' : 'Gộp tiến độ'}</span>
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={busy}
                data-testid="merge-anonymous-decline"
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Để local, không gộp</span>
              </button>
            </div>
          </>
        )}

        {result === 'merged' && (
          <>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
              Đã gộp tiến độ vào tài khoản thành công! Từ giờ mọi thiết bị đăng nhập đều thấy dữ liệu này.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl"
            >
              Tiếp tục học
            </button>
          </>
        )}

        {result === 'failed' && (
          <>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Không gộp được lúc này (có thể đang offline). Tiến độ vẫn an toàn trên thiết bị — bạn có thể thử lại trong
              phần Cài đặt.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleMerge}
                disabled={busy}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
              >
                Thử lại
              </button>
              <button
                type="button"
                onClick={handleDecline}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl"
              >
                <CloudOff className="w-4 h-4" />
                <span>Để sau</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
