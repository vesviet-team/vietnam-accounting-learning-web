import { useEffect, useState, type FC, type FormEvent } from 'react';
import {
  UserRound,
  LogIn,
  LogOut,
  MonitorSmartphone,
  Download,
  Trash2,
  CloudUpload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserPlus,
  X,
} from 'lucide-react';
import { authService } from '@/services/auth/auth-service';
import { syncService, type SyncStatusState } from '@/services/sync/sync-service';
import {
  listSessions,
  revokeSession,
  exportAccountData,
  deleteAccount,
  registerAccount,
  RegisterError,
} from '@/services/auth/api';
import { storageService } from '@/services/storage/storage-service';
import type { AuthUser, DeviceSession } from '@/types/auth';

// Mirrors the server policy (server/internal/user/service.go): password
// 8..1024 chars, display name <= 200 chars.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function registerErrorMessage(err: unknown): string {
  if (err instanceof RegisterError) {
    switch (err.status) {
      case 409:
        return 'Email này đã được đăng ký. Bạn có thể đăng nhập ngay bây giờ.';
      case 400:
        if (err.description.includes('password')) return 'Mật khẩu phải có ít nhất 8 ký tự.';
        if (err.description.includes('email')) return 'Địa chỉ email không hợp lệ.';
        return 'Dữ liệu đăng ký không hợp lệ.';
      case 429:
        return 'Bạn đã thử quá nhiều lần. Vui lòng đợi khoảng 1 phút rồi thử lại.';
      case 0:
        break; // network — fall through
      default:
        return 'Máy chủ gặp lỗi lúc này. Vui lòng thử lại sau.';
    }
  }
  return 'Không kết nối được máy chủ. Kiểm tra kết nối mạng rồi thử lại.';
}

function deviceLabel(deviceId: string, current: boolean): string {
  if (current) return 'Thiết bị này';
  if (!deviceId) return 'Thiết bị không tên';
  return deviceId.length > 24 ? `${deviceId.slice(0, 24)}…` : deviceId;
}

/**
 * Account section of Settings (P1): login state, device sessions with
 * per-device revoke, cloud data export, account deletion (2-step confirm)
 * and last-sync status. Only this section + the merge dialog were added;
 * all other settings UI is untouched.
 */
export const AccountSection: FC = () => {
  const [user, setUser] = useState<AuthUser | null>(authService.getUser());
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>(syncService.getStatus());
  // Registration form (shown when logged out).
  const [showRegister, setShowRegister] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    const offAuth = authService.onAuthChange(({ user: u }) => setUser(u));
    const offSync = syncService.onStatusChange(setSyncStatus);
    return () => {
      offAuth();
      offSync();
    };
  }, []);

  const refreshSessions = async () => {
    if (!authService.isAuthenticated()) return;
    try {
      setSessions(await listSessions());
      setSessionsError(null);
    } catch {
      setSessionsError('Không tải được danh sách thiết bị (có thể đang offline).');
    }
  };

  useEffect(() => {
    if (user) void refreshSessions();
  }, [user]);

  const handleLogin = async () => {
    setBusy('login');
    try {
      await authService.login(); // redirects to /oauth2/auth
    } catch {
      setBusy(null);
      setMessage({ type: 'error', text: 'Không thể bắt đầu đăng nhập.' });
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegError(null);
    const email = regEmail.trim().toLowerCase();
    const displayName = regDisplayName.trim();
    if (!EMAIL_RE.test(email)) {
      setRegError('Địa chỉ email không hợp lệ.');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (regPassword.length > 1024) {
      setRegError('Mật khẩu quá dài (tối đa 1024 ký tự).');
      return;
    }
    if (displayName.length > 200) {
      setRegError('Tên hiển thị quá dài (tối đa 200 ký tự).');
      return;
    }
    setBusy('register');
    try {
      await registerAccount(email, regPassword, displayName);
      setMessage({ type: 'success', text: 'Đã tạo tài khoản thành công. Đang chuyển đến đăng nhập…' });
      setShowRegister(false);
      // Account exists now: continue with the standard OAuth login flow
      // (server-rendered form at /oauth2/auth exchanges for tokens).
      await handleLogin();
    } catch (err) {
      setRegError(registerErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleLogout = async () => {
    setBusy('logout');
    await authService.logout();
    setBusy(null);
    setSessions([]);
    setMessage({ type: 'success', text: 'Đã đăng xuất khỏi thiết bị này.' });
  };

  const handleExport = async () => {
    setBusy('export');
    try {
      const json = await exportAccountData();
      storageService.downloadBackup(json, `vnacc-account-export-${new Date().toISOString().slice(0, 10)}.json`);
      setMessage({ type: 'success', text: 'Đã tải xuống toàn bộ dữ liệu tài khoản (JSON).' });
    } catch {
      setMessage({ type: 'error', text: 'Không thể xuất dữ liệu tài khoản.' });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy('delete');
    const ok = await deleteAccount().catch(() => false);
    setBusy(null);
    if (ok) {
      await authService.logout().catch(() => undefined);
      setMessage({ type: 'success', text: 'Tài khoản đã được xóa. Hẹn gặp lại bạn!' });
      setTimeout(() => window.location.reload(), 1200);
    } else {
      setMessage({ type: 'error', text: 'Không thể xóa tài khoản lúc này. Vui lòng thử lại sau.' });
      setDeleteStep(0);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    setBusy(`revoke:${sessionId}`);
    const ok = await revokeSession(sessionId).catch(() => false);
    setBusy(null);
    if (ok) {
      setMessage({ type: 'success', text: 'Đã thu hồi phiên của thiết bị.' });
    } else {
      setMessage({ type: 'error', text: 'Không thể thu hồi phiên này.' });
    }
    void refreshSessions();
  };

  const syncLine = (() => {
    if (!user) return null;
    if (syncStatus.status === 'syncing') {
      return (
        <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Đang đồng bộ…
        </span>
      );
    }
    if (syncStatus.status === 'error') {
      return (
        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-3 h-3" /> Đồng bộ lỗi (sẽ thử lại tự động) — app vẫn chạy offline bình thường.
        </span>
      );
    }
    if (syncStatus.lastSyncAt) {
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3 h-3" /> Đồng bộ lần cuối:{' '}
          {new Date(syncStatus.lastSyncAt).toLocaleTimeString('vi-VN')}
        </span>
      );
    }
    return <span className="text-slate-400">Chưa đồng bộ lần nào.</span>;
  })();

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
        <UserRound className="w-5 h-5 text-emerald-600" />
        <span>Tài Khoản &amp; Đồng Bộ Đa Thiết Bị</span>
      </h2>
      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        Đăng nhập để đồng bộ tiến độ học, điểm milestone và bảng định khoản giữa các thiết bị. Dữ liệu vẫn lưu offline
        trước — cloud chỉ là điểm gộp. Theo NĐ 13/2023 bạn có thể xuất hoặc xóa toàn bộ dữ liệu bất cứ lúc nào.
      </p>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Login state */}
      <div className="flex flex-wrap items-center gap-3">
        {user ? (
          <>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                {user.display_name || user.email}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={busy === 'logout'}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={busy === 'export'}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Xuất dữ liệu tài khoản</span>
            </button>
          </>
        ) : (
          <>
            <span className="text-xs text-slate-500 dark:text-slate-400">Chưa đăng nhập — chế độ ẩn danh.</span>
            <button
              type="button"
              onClick={handleLogin}
              disabled={busy === 'login' || busy === 'register'}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRegister((v) => !v);
                setRegError(null);
              }}
              disabled={busy === 'register'}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>Đăng ký</span>
            </button>
          </>
        )}
      </div>

      {/* Registration form (logged out only) */}
      {!user && showRegister && (
        <form
          data-testid="register-form"
          onSubmit={handleRegister}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tạo tài khoản mới</span>
            <button
              type="button"
              data-testid="register-cancel"
              onClick={() => {
                setShowRegister(false);
                setRegError(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Đóng form đăng ký"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {regError && (
            <p data-testid="register-error" className="text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {regError}
            </p>
          )}
          <div>
            <label htmlFor="register-email" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Email
            </label>
            <input
              id="register-email"
              data-testid="register-email"
              type="email"
              autoComplete="email"
              required
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label
              htmlFor="register-display-name"
              className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              Tên hiển thị (tùy chọn)
            </label>
            <input
              id="register-display-name"
              data-testid="register-display-name"
              type="text"
              maxLength={200}
              autoComplete="name"
              value={regDisplayName}
              onChange={(e) => setRegDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label
              htmlFor="register-password"
              className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              Mật khẩu (tối thiểu 8 ký tự)
            </label>
            <input
              id="register-password"
              data-testid="register-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            data-testid="register-submit"
            disabled={busy === 'register'}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {busy === 'register' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span>Tạo tài khoản</span>
          </button>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Sau khi tạo tài khoản, bạn sẽ được chuyển đến trang đăng nhập để hoàn tất. Mật khẩu được băm bằng argon2id,
            dữ liệu cá nhân được xử lý theo NĐ 13/2023.
          </p>
        </form>
      )}

      {user && syncLine}

      {/* Device sessions */}
      {user && (
        <div className="pt-2 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <MonitorSmartphone className="w-4 h-4" />
            <span>Thiết bị đang đăng nhập</span>
          </div>
          {sessionsError && <p className="text-xs text-amber-600 dark:text-amber-400">{sessionsError}</p>}
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {deviceLabel(s.device_id, s.current)}
                    {s.current && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                        HIỆN TẠI
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Đăng nhập: {new Date(s.created_at).toLocaleString('vi-VN')}
                    {s.last_used_at && ` · Dùng cuối: ${new Date(s.last_used_at).toLocaleString('vi-VN')}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(s.id)}
                  disabled={busy === `revoke:${s.id}`}
                  className="shrink-0 px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50"
                >
                  Thu hồi
                </button>
              </li>
            ))}
            {sessions.length === 0 && !sessionsError && (
              <li className="text-xs text-slate-400">Không có phiên thiết bị nào.</li>
            )}
          </ul>
        </div>
      )}

      {/* Delete account: 2-step confirm */}
      {user && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          {deleteStep === 0 && (
            <button
              type="button"
              onClick={() => setDeleteStep(1)}
              className="flex items-center gap-2 px-4 py-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-800/80 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa tài khoản &amp; toàn bộ dữ liệu</span>
            </button>
          )}
          {deleteStep === 1 && (
            <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 space-y-3">
              <p className="text-xs text-rose-800 dark:text-rose-200 font-semibold">
                Bước 1/2: Toàn bộ tiến độ học, điểm test, bảng định khoản và bản sao lưu đám mây của bạn sẽ bị xóa vĩnh
                viễn và không thể khôi phục.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteStep(2)}
                  className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  Tôi hiểu, tiếp tục
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteStep(0)}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
          {deleteStep === 2 && (
            <div className="p-4 rounded-xl border border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/50 space-y-3">
              <p className="text-xs text-rose-800 dark:text-rose-200 font-bold">
                Bước 2/2: Hành động cuối cùng — xóa tài khoản ngay bây giờ?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy === 'delete'}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold disabled:opacity-50"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>Xóa vĩnh viễn tài khoản</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteStep(0)}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Giữ tài khoản
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
