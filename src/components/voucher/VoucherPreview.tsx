import type { FC } from 'react';
import { FileCheck2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AccountingRegime } from '@/types/coa';

interface VoucherPreviewProps {
  currentRegime: AccountingRegime;
}

export const VoucherPreview: FC<VoucherPreviewProps> = ({ currentRegime }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          <FileCheck2 className="w-4 h-4" />
          <span>Phòng Kiểm Tra Chứng Từ Kế Toán Thực Tế — Chế độ {currentRegime === 'CIRCULAR_200' ? 'Thông tư 200' : 'Thông tư 133'}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Mô Phỏng Hóa Đơn Điện Tử NĐ 123 & Kiểm Tra Điều Kiện Khấu Trừ Thuế
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Rèn luyện kỹ năng phát hiện sai phạm thực tế: Ngưỡng thanh toán không dùng tiền mặt &ge; 20 triệu đồng (TT 219/2013), kiểm tra MST doanh nghiệp ngừng hoạt động, tính hợp lệ của mã CQT (MCCQT).
        </p>
      </div>

      {/* Realistic E-Invoice Mockup Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border-2 border-slate-200 dark:border-slate-800 overflow-hidden font-sans">
        {/* Invoice Header */}
        <div className="p-6 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                MẪU SỐ: 1/001 - KÝ HIỆU: C26TAA - SỐ: 00002845
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                HÓA ĐƠN GIÁ TRỊ GIA TĂNG (ĐIỆN TỬ)
              </h2>
            </div>

            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs space-y-1">
              <div className="flex items-center space-x-1 font-bold text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Có mã của Cơ quan Thuế</span>
              </div>
              <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[260px]">
                MCCQT: 004A81E99F342B104D7701859C8E74312A
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-slate-400 block font-medium">Đơn vị bán hàng:</span>
              <strong className="text-slate-900 dark:text-slate-100">
                CÔNG TY TNHH VẬT TƯ THIẾT BỊ HÀ NỘI
              </strong>
              <div className="font-mono text-slate-600 dark:text-slate-400">
                MST: 0108992341 (Trạng thái: 00 - Đang hoạt động)
              </div>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Đơn vị mua hàng:</span>
              <strong className="text-slate-900 dark:text-slate-100">
                CÔNG TY CỔ PHẦN CÔNG NGHỆ THƯƠNG MẠI VIỆT
              </strong>
              <div className="font-mono text-slate-600 dark:text-slate-400">
                MST: 0315887229
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Item Table */}
        <div className="p-6 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">STT</th>
                  <th className="py-2.5 px-3">Tên Hàng Hóa, Dịch Vụ</th>
                  <th className="py-2.5 px-3 text-center">ĐVT</th>
                  <th className="py-2.5 px-3 text-right">Số Lượng</th>
                  <th className="py-2.5 px-3 text-right">Đơn Giá</th>
                  <th className="py-2.5 px-3 text-right">Thành Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                <tr>
                  <td className="py-3 px-3">01</td>
                  <td className="py-3 px-3 font-sans font-medium text-slate-900 dark:text-slate-100">
                    Máy vi tính xách tay Dell XPS 15 (Dùng cho phòng Kế toán)
                  </td>
                  <td className="py-3 px-3 text-center font-sans">Chiếc</td>
                  <td className="py-3 px-3 text-right">01</td>
                  <td className="py-3 px-3 text-right">25.000.000</td>
                  <td className="py-3 px-3 text-right font-bold">25.000.000</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 gap-4">
            <div className="space-y-1 text-xs">
              <div className="text-slate-500 dark:text-slate-400">
                Hình thức thanh toán thực tế: <strong className="text-rose-600 dark:text-rose-400">Tiền mặt (TM)</strong>
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Chứng từ kèm theo: Phiếu chi số PC0029/09
              </div>
            </div>

            <div className="text-right space-y-1 text-xs font-mono">
              <div>Cộng tiền hàng: 25.000.000 đ</div>
              <div>Thuế suất GTGT (10%): 2.500.000 đ</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-700">
                Tổng cộng thanh toán: 27.500.000 đ
              </div>
            </div>
          </div>
        </div>

        {/* Audit Flag Detection Banner */}
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border-t-2 border-rose-300 dark:border-rose-800 flex items-start space-x-3 text-xs text-rose-900 dark:text-rose-200">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-sm">
              PHÁT HIỆN SAI PHẠM: VI PHẠM QUY TẮC THANH TOÁN KHÔNG DÙNG TIỀN MẶT
            </span>
            <p className="leading-relaxed">
              Hóa đơn có tổng giá trị thanh toán <strong>27.500.000 đ &ge; 20.000.000 đ</strong> nhưng lại thanh toán bằng <strong>Tiền mặt (TM)</strong> thay vì Ủy nhiệm chi chuyển khoản từ tài khoản công ty.
            </p>
            <div className="font-semibold text-rose-700 dark:text-rose-300 pt-1">
              Hậu quả pháp lý: Doanh nghiệp KHÔNG ĐƯỢC khấu trừ 2.500.000 đ thuế GTGT đầu vào (Khoản 2 Điều 15 TT 219/2013) và KHÔNG ĐƯỢC tính 25.000.000 đ vào chi phí hợp lý khi tính thuế TNDN (Điều 4 TT 96/2015).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
