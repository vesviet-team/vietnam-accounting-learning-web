import { useState, useMemo, FC } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  Coins,
  ShieldCheck,
  FileText,
  Info,
  RefreshCw,
  DollarSign,
} from 'lucide-react';
import { generateComparisonMatrix } from '@/engine/cogs-engine';
import {
  InventoryLot,
  StockTransaction,
  ComparisonMatrixResult,
} from '@/types/cogs';

export interface CostingComparisonMatrixProps {
  initialInventory?: InventoryLot[];
  transactions?: StockTransaction[];
  assumedRevenue?: number;
  className?: string;
  onStateChange?: (matrix: ComparisonMatrixResult) => void;
}

// Fallback Default Dataset (Rising Price Trend / Inflation)
export const DEFAULT_INITIAL_INVENTORY: InventoryLot[] = [
  {
    id: 'lot-init-1',
    date: '2026-01-01',
    voucherCode: 'SDDK-01',
    quantity: 100,
    unitPrice: 50_000,
    remainingQuantity: 100,
  },
];

export const DEFAULT_TRANSACTIONS: StockTransaction[] = [
  {
    id: 'tx-1',
    date: '2026-01-05',
    voucherCode: 'PNK-001',
    voucherType: 'PNK',
    description: 'Nhập kho lô thép đợt 1 (giá gốc tăng nhẹ)',
    quantity: 150,
    unitPrice: 52_000,
    targetAccount: '156',
  },
  {
    id: 'tx-2',
    date: '2026-01-10',
    voucherCode: 'PXK-001',
    voucherType: 'PXK',
    description: 'Xuất bán thương mại đợt 1',
    quantity: 120,
    targetAccount: '632',
  },
  {
    id: 'tx-3',
    date: '2026-01-15',
    voucherCode: 'XKNB-001',
    voucherType: 'XKNB_03',
    description: 'Xuất điều chuyển nội bộ Mẫu 03/XKNB',
    quantity: 50,
    targetAccount: '157',
  },
  {
    id: 'tx-4',
    date: '2026-01-20',
    voucherCode: 'PNK-002',
    voucherType: 'PNK',
    description: 'Nhập kho lô thép đợt 2 (giá thị trường tăng cao)',
    quantity: 200,
    unitPrice: 55_000,
    targetAccount: '156',
  },
  {
    id: 'tx-5',
    date: '2026-01-25',
    voucherCode: 'PXK-002',
    voucherType: 'PXK',
    description: 'Xuất bán thương mại đợt 2',
    quantity: 180,
    targetAccount: '632',
  },
];

// Helper to format currency in VND
export function formatVnd(val: number): string {
  if (val === 0) return '0 đ';
  return Math.round(val).toLocaleString('vi-VN') + ' đ';
}

// Helper to format percentage
export function formatPercent(val: number): string {
  return `${val.toFixed(2)}%`;
}

export const CostingComparisonMatrix: FC<CostingComparisonMatrixProps> = ({
  initialInventory = DEFAULT_INITIAL_INVENTORY,
  transactions = DEFAULT_TRANSACTIONS,
  assumedRevenue,
  className = '',
  onStateChange,
}) => {
  // Custom user-override for revenue input (optional)
  const [customRevenueInput, setCustomRevenueInput] = useState<string>('');
  const [activeChartMetric, setActiveChartMetric] = useState<
    'all' | 'cogs' | 'ending' | 'profit' | 'margin'
  >('all');
  const [hoveredBar, setHoveredBar] = useState<{
    method: string;
    metric: string;
    value: number;
    formatted: string;
    color: string;
    x: number;
    y: number;
  } | null>(null);

  // Parse custom revenue if valid number
  const parsedCustomRevenue = useMemo(() => {
    if (!customRevenueInput.trim()) return undefined;
    const num = Number(customRevenueInput.replace(/[^0-9]/g, ''));
    return Number.isFinite(num) && num > 0 ? num : undefined;
  }, [customRevenueInput]);

  const effectiveRevenue = assumedRevenue ?? parsedCustomRevenue;

  // Real-time pure engine computation
  const matrixResult: ComparisonMatrixResult = useMemo(() => {
    const result = generateComparisonMatrix(
      initialInventory,
      transactions,
      effectiveRevenue
    );
    if (onStateChange) {
      onStateChange(result);
    }
    return result;
  }, [initialInventory, transactions, effectiveRevenue, onStateChange]);

  const { rows, revenue, trend, minCogsMethod, executiveInsightsVi } =
    matrixResult;

  // Map rows by method for direct reference
  const fifoRow = rows.find((r) => r.method === 'FIFO') || rows[0];
  const periodicRow =
    rows.find((r) => r.method === 'PERIODIC_WEIGHTED_AVERAGE') || rows[1];
  const movingRow =
    rows.find((r) => r.method === 'MOVING_WEIGHTED_AVERAGE') || rows[2];

  // Calculate Deltas (Max - Min across methods)
  const cogsValues = rows.map((r) => r.cogsAmount);
  const endingValues = rows.map((r) => r.endingInventoryValue);
  const profitValues = rows.map((r) => r.grossProfit);
  const citValues = rows.map((r) => r.citExpense);
  const npatValues = rows.map((r) => r.netProfitAfterTax);
  const marginValues = rows.map((r) => r.grossMarginPercent);

  const deltaCogs = Math.max(...cogsValues) - Math.min(...cogsValues);
  const deltaEnding = Math.max(...endingValues) - Math.min(...endingValues);
  const deltaProfit = Math.max(...profitValues) - Math.min(...profitValues);
  const deltaCit = Math.max(...citValues) - Math.min(...citValues);
  const deltaNpat = Math.max(...npatValues) - Math.min(...npatValues);
  const deltaMargin = Math.max(...marginValues) - Math.min(...marginValues);

  // SVG Chart Geometry & Calculations
  const svgWidth = 740;
  const svgHeight = 280;
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 40;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Max value for scaling financial bar charts
  const maxFinVal = Math.max(
    revenue,
    ...cogsValues,
    ...endingValues,
    ...profitValues,
    1
  );

  const groupWidth = plotWidth / 3;

  return (
    <div
      className={`space-y-6 bg-slate-900 text-slate-100 p-4 md:p-6 rounded-xl border border-slate-800 shadow-xl ${className}`}
      data-testid="costing-comparison-matrix-container"
    >
      {/* 1. Header & Statutory References */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-700/60">
              VAS 02 / IAS 2 (Hàng tồn kho)
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-700/60">
              Thông tư 200/2014 & 99/2025/TT-BTC
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-950/80 text-purple-400 border border-purple-700/60">
              BCTC B01-DN & B02-DN
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            Ma Trận So Sánh Đa Phương Pháp & Tác Động Báo Cáo Tài Chính
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Đánh giá song song 3 phương pháp xuất kho hợp pháp (FIFO, Bình quân cả kỳ, Bình quân liên hoàn)
            trên cùng tập dữ liệu thực tế. Phân tích sự phân kỳ của 4 chỉ tiêu tài chính then chốt và gợi mở
            chiến lược điều hành vốn vay ngân hàng vs tối ưu dòng tiền thuế TNDN.
          </p>
        </div>

        {/* Market Trend Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            data-testid="trend-badge"
            className={`px-3.5 py-2 rounded-lg border flex items-center gap-2 shadow-sm ${
              trend === 'INFLATION'
                ? 'bg-amber-950/40 border-amber-600/50 text-amber-300'
                : trend === 'DEFLATION'
                ? 'bg-blue-950/40 border-blue-600/50 text-blue-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300'
            }`}
          >
            {trend === 'INFLATION' ? (
              <>
                <TrendingUp className="w-4 h-4 text-amber-400 animate-pulse" />
                <div>
                  <div className="text-xs text-amber-400 font-medium">Xu hướng thị trường</div>
                  <div className="text-sm font-bold">Giá Tăng (Lạm phát / Inflation)</div>
                </div>
              </>
            ) : trend === 'DEFLATION' ? (
              <>
                <TrendingDown className="w-4 h-4 text-blue-400 animate-pulse" />
                <div>
                  <div className="text-xs text-blue-400 font-medium">Xu hướng thị trường</div>
                  <div className="text-sm font-bold">Giá Giảm (Giảm phát / Deflation)</div>
                </div>
              </>
            ) : (
              <>
                <Minus className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400 font-medium">Xu hướng thị trường</div>
                  <div className="text-sm font-bold">Giá Bình Ổn (Flat Price)</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Control Bar */}
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 font-medium">
            Doanh thu bán hàng kỳ tính (Mã 01 / Mã 10 trên B02):
          </span>
          <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-700/80 border border-slate-600">
            {formatVnd(revenue)}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            (Cơ sở tính Lợi nhuận gộp Mã 20 = Doanh thu - Giá vốn)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Doanh thu giả định tùy chỉnh:</span>
          <input
            type="text"
            placeholder="Nhập số tiền..."
            value={customRevenueInput}
            onChange={(e) => setCustomRevenueInput(e.target.value)}
            className="w-36 px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {customRevenueInput && (
            <button
              onClick={() => setCustomRevenueInput('')}
              className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
              title="Đặt lại doanh thu tự động"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. 4 Key Indicator Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Giá vốn TK 632 */}
        <div className="bg-slate-800/60 rounded-xl p-4 border border-amber-500/30 shadow-md">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
            <span>CHỈ TIÊU 1 • B02 MÃ 11</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-700 text-[10px]">
              TK 632
            </span>
          </div>
          <div className="text-base font-bold text-white">Tổng Giá Vốn Xuất Kho</div>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">FIFO:</span>
              <span
                data-testid="kpi-cogs-FIFO"
                className={`font-mono font-bold ${
                  minCogsMethod === 'FIFO' ? 'text-amber-400' : 'text-slate-200'
                }`}
              >
                {formatVnd(fifoRow.cogsAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">BQ Cả kỳ:</span>
              <span
                data-testid="kpi-cogs-PERIODIC_WEIGHTED_AVERAGE"
                className="font-mono font-bold text-slate-200"
              >
                {formatVnd(periodicRow.cogsAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">BQ Liên hoàn:</span>
              <span
                data-testid="kpi-cogs-MOVING_WEIGHTED_AVERAGE"
                className="font-mono font-bold text-slate-200"
              >
                {formatVnd(movingRow.cogsAmount)}
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-700/60 text-[11px] text-amber-300/80 flex justify-between">
            <span>Độ lệch tối đa (Δ):</span>
            <span className="font-mono font-semibold">{formatVnd(deltaCogs)}</span>
          </div>
        </div>

        {/* KPI 2: Tồn kho cuối kỳ TK 156 */}
        <div className="bg-slate-800/60 rounded-xl p-4 border border-emerald-500/30 shadow-md">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
            <span>CHỈ TIÊU 2 • B01 MÃ 140</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-[10px]">
              TK 156
            </span>
          </div>
          <div className="text-base font-bold text-white">Tồn Kho Cuối Kỳ</div>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">FIFO:</span>
              <span
                data-testid="kpi-ending-FIFO"
                className="font-mono font-bold text-emerald-400"
              >
                {formatVnd(fifoRow.endingInventoryValue)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">BQ Cả kỳ:</span>
              <span
                data-testid="kpi-ending-PERIODIC_WEIGHTED_AVERAGE"
                className="font-mono font-bold text-slate-200"
              >
                {formatVnd(periodicRow.endingInventoryValue)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">BQ Liên hoàn:</span>
              <span
                data-testid="kpi-ending-MOVING_WEIGHTED_AVERAGE"
                className="font-mono font-bold text-slate-200"
              >
                {formatVnd(movingRow.endingInventoryValue)}
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-700/60 text-[11px] text-emerald-300/80 flex justify-between">
            <span>Độ lệch tài sản (Δ):</span>
            <span className="font-mono font-semibold">{formatVnd(deltaEnding)}</span>
          </div>
        </div>

        {/* KPI 3: Lợi nhuận gộp Mã 20 */}
        <div className="bg-slate-800/60 rounded-xl p-4 border border-blue-500/30 shadow-md">
          <div className="flex items-center justify-between text-xs text-blue-400 font-semibold mb-1">
            <span>CHỈ TIÊU 3 • B02 MÃ 20</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-700 text-[10px]">
              Mã 10 - Mã 11
            </span>
          </div>
          <div className="text-base font-bold text-white">Lợi Nhuận Gộp (Gross Profit)</div>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">FIFO:</span>
              <span
                data-testid="kpi-profit-FIFO"
                className="font-mono font-bold text-blue-400"
              >
                {formatVnd(fifoRow.grossProfit)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">BQ Cả kỳ:</span>
              <span
                data-testid="kpi-profit-PERIODIC_WEIGHTED_AVERAGE"
                className="font-mono font-bold text-slate-200"
              >
                {formatVnd(periodicRow.grossProfit)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">BQ Liên hoàn:</span>
              <span
                data-testid="kpi-profit-MOVING_WEIGHTED_AVERAGE"
                className="font-mono font-bold text-slate-200"
              >
                {formatVnd(movingRow.grossProfit)}
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-700/60 text-[11px] text-blue-300/80 flex justify-between">
            <span>Độ lệch LN gộp (Δ):</span>
            <span className="font-mono font-semibold">{formatVnd(deltaProfit)}</span>
          </div>
        </div>

        {/* KPI 4: Thuế TNDN tạm tính 20% & LNST */}
        <div className="bg-slate-800/60 rounded-xl p-4 border border-rose-500/30 shadow-md">
          <div className="flex items-center justify-between text-xs text-rose-400 font-semibold mb-1">
            <span>CHỈ TIÊU 4 • B02 MÃ 51 & 60</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-700 text-[10px]">
              CIT 20% & LNST
            </span>
          </div>
          <div className="text-base font-bold text-white">Thuế TNDN & Sau Thuế</div>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">FIFO (Thuế/LNST):</span>
              <span
                data-testid="kpi-cit-FIFO"
                className="font-mono font-bold text-rose-400"
              >
                {formatVnd(fifoRow.citExpense)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">BQ Cả kỳ:</span>
              <span
                data-testid="kpi-cit-PERIODIC_WEIGHTED_AVERAGE"
                className="font-mono font-bold text-slate-200"
              >
                {formatVnd(periodicRow.citExpense)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">BQ Liên hoàn:</span>
              <span
                data-testid="kpi-cit-MOVING_WEIGHTED_AVERAGE"
                className="font-mono font-bold text-slate-200"
              >
                {formatVnd(movingRow.citExpense)}
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-700/60 text-[11px] text-rose-300/80 flex justify-between">
            <span>Dòng tiền thuế lệch (Δ):</span>
            <span className="font-mono font-semibold">{formatVnd(deltaCit)}</span>
          </div>
        </div>
      </div>

      {/* 3. Side-by-Side Comparison Matrix Table */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-white text-sm">
              BẢNG MA TRẬN ĐỐI CHIẾU 3 PHƯƠNG PHÁP XUẤT KHO VÀ TÁC ĐỘNG BÁO CÁO TÀI CHÍNH
            </span>
          </div>
          <span className="text-xs text-slate-400 italic">
            Đơn vị tính: Đồng Việt Nam (VND)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table
            className="w-full text-left border-collapse text-xs md:text-sm"
            data-testid="comparison-matrix-table"
          >
            <thead>
              <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700 text-xs">
                <th className="py-3 px-4 font-semibold w-1/4">Chỉ Tiêu Tài Chính</th>
                <th className="py-3 px-3 font-semibold text-center w-28">Ký Hiệu / Mã Số</th>
                <th
                  className="py-3 px-4 font-semibold text-right text-amber-300 bg-amber-950/20"
                  data-testid="col-method-FIFO"
                >
                  Nhập Trước - Xuất Trước (FIFO)
                </th>
                <th
                  className="py-3 px-4 font-semibold text-right text-blue-300 bg-blue-950/20"
                  data-testid="col-method-PERIODIC_WEIGHTED_AVERAGE"
                >
                  Bình Quân Cả Kỳ Dự Trữ
                </th>
                <th
                  className="py-3 px-4 font-semibold text-right text-purple-300 bg-purple-950/20"
                  data-testid="col-method-MOVING_WEIGHTED_AVERAGE"
                >
                  Bình Quân Gia Quyền Liên Hoàn
                </th>
                <th className="py-3 px-4 font-semibold text-right text-slate-400 bg-slate-800/40">
                  Chênh Lệch (Δ Max - Min)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 font-mono">
              {/* Row 1: COGS */}
              <tr
                className="hover:bg-slate-800/40 transition"
                data-testid="row-cogs"
              >
                <td className="py-3 px-4 font-sans font-medium text-slate-200">
                  1. Tổng Giá vốn hàng bán trong kỳ
                  <span className="block text-[11px] font-normal text-slate-400">
                    Phản ánh toàn bộ giá trị hàng xuất bán ghi nhận vào chi phí hoạt động
                  </span>
                </td>
                <td className="py-3 px-3 text-center font-sans">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-amber-300 text-xs font-semibold">
                    TK 632 / Mã 11 B02
                  </span>
                </td>
                <td
                  className="py-3 px-4 text-right font-bold text-amber-400 bg-amber-950/10"
                  data-testid="cogs-FIFO"
                >
                  {formatVnd(fifoRow.cogsAmount)}
                </td>
                <td
                  className="py-3 px-4 text-right text-slate-200 bg-blue-950/10"
                  data-testid="cogs-PERIODIC_WEIGHTED_AVERAGE"
                >
                  {formatVnd(periodicRow.cogsAmount)}
                </td>
                <td
                  className="py-3 px-4 text-right text-slate-200 bg-purple-950/10"
                  data-testid="cogs-MOVING_WEIGHTED_AVERAGE"
                >
                  {formatVnd(movingRow.cogsAmount)}
                </td>
                <td
                  className="py-3 px-4 text-right font-bold text-amber-300 bg-slate-800/30"
                  data-testid="delta-cogs"
                >
                  {formatVnd(deltaCogs)}
                </td>
              </tr>

              {/* Row 2: Ending Inventory */}
              <tr
                className="hover:bg-slate-800/40 transition"
                data-testid="row-ending-inventory"
              >
                <td className="py-3 px-4 font-sans font-medium text-slate-200">
                  2. Giá trị Hàng tồn kho cuối kỳ
                  <span className="block text-[11px] font-normal text-slate-400">
                    Tài sản ngắn hạn trình bày trên Báo cáo tình hình tài chính
                  </span>
                </td>
                <td className="py-3 px-3 text-center font-sans">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-emerald-300 text-xs font-semibold">
                    TK 156 / Mã 140 B01
                  </span>
                </td>
                <td
                  className="py-3 px-4 text-right font-bold text-emerald-400 bg-amber-950/10"
                  data-testid="ending-FIFO"
                >
                  {formatVnd(fifoRow.endingInventoryValue)}
                </td>
                <td
                  className="py-3 px-4 text-right text-slate-200 bg-blue-950/10"
                  data-testid="ending-PERIODIC_WEIGHTED_AVERAGE"
                >
                  {formatVnd(periodicRow.endingInventoryValue)}
                </td>
                <td
                  className="py-3 px-4 text-right text-slate-200 bg-purple-950/10"
                  data-testid="ending-MOVING_WEIGHTED_AVERAGE"
                >
                  {formatVnd(movingRow.endingInventoryValue)}
                </td>
                <td
                  className="py-3 px-4 text-right font-bold text-emerald-300 bg-slate-800/30"
                  data-testid="delta-ending"
                >
                  {formatVnd(deltaEnding)}
                </td>
              </tr>

              {/* Row 3: Gross Profit */}
              <tr
                className="hover:bg-slate-800/40 transition"
                data-testid="row-gross-profit"
              >
                <td className="py-3 px-4 font-sans font-medium text-slate-200">
                  3. Lợi nhuận gộp về bán hàng & CCDV
                  <span className="block text-[11px] font-normal text-slate-400">
                    Mã số 20 = Doanh thu thuần (Mã 10) - Giá vốn hàng bán (Mã 11)
                  </span>
                </td>
                <td className="py-3 px-3 text-center font-sans">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-blue-300 text-xs font-semibold">
                    Mã số 20 B02
                  </span>
                </td>
                <td
                  className="py-3 px-4 text-right font-bold text-blue-400 bg-amber-950/10"
                  data-testid="profit-FIFO"
                >
                  {formatVnd(fifoRow.grossProfit)}
                </td>
                <td
                  className="py-3 px-4 text-right text-slate-200 bg-blue-950/10"
                  data-testid="profit-PERIODIC_WEIGHTED_AVERAGE"
                >
                  {formatVnd(periodicRow.grossProfit)}
                </td>
                <td
                  className="py-3 px-4 text-right text-slate-200 bg-purple-950/10"
                  data-testid="profit-MOVING_WEIGHTED_AVERAGE"
                >
                  {formatVnd(movingRow.grossProfit)}
                </td>
                <td
                  className="py-3 px-4 text-right font-bold text-blue-300 bg-slate-800/30"
                  data-testid="delta-profit"
                >
                  {formatVnd(deltaProfit)}
                </td>
              </tr>

              {/* Row 4: CIT Tax Expense */}
              <tr
                className="hover:bg-slate-800/40 transition"
                data-testid="row-cit-tax"
              >
                <td className="py-3 px-4 font-sans font-medium text-slate-200">
                  4. Chi phí thuế TNDN hiện hành tạm tính (20%)
                  <span className="block text-[11px] font-normal text-slate-400">
                    Dòng tiền thuế doanh nghiệp có nghĩa vụ nộp cho NSNN theo luật định
                  </span>
                </td>
                <td className="py-3 px-3 text-center font-sans">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-rose-300 text-xs font-semibold">
                    Mã số 51 B02
                  </span>
                </td>
                <td
                  className="py-3 px-4 text-right font-bold text-rose-400 bg-amber-950/10"
                  data-testid="cit-FIFO"
                >
                  {formatVnd(fifoRow.citExpense)}
                </td>
                <td
                  className="py-3 px-4 text-right text-slate-200 bg-blue-950/10"
                  data-testid="cit-PERIODIC_WEIGHTED_AVERAGE"
                >
                  {formatVnd(periodicRow.citExpense)}
                </td>
                <td
                  className="py-3 px-4 text-right text-slate-200 bg-purple-950/10"
                  data-testid="cit-MOVING_WEIGHTED_AVERAGE"
                >
                  {formatVnd(movingRow.citExpense)}
                </td>
                <td
                  className="py-3 px-4 text-right font-bold text-rose-300 bg-slate-800/30"
                  data-testid="delta-cit"
                >
                  {formatVnd(deltaCit)}
                </td>
              </tr>

              {/* Row 5: Net Profit After Tax */}
              <tr
                className="hover:bg-slate-800/40 transition"
                data-testid="row-net-profit"
              >
                <td className="py-3 px-4 font-sans font-medium text-slate-200">
                  5. Lợi nhuận sau thuế TNDN (LNST)
                  <span className="block text-[11px] font-normal text-slate-400">
                    Mã 60 = Lợi nhuận gộp (Mã 20) - Chi phí thuế TNDN (Mã 51)
                  </span>
                </td>
                <td className="py-3 px-3 text-center font-sans">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-purple-300 text-xs font-semibold">
                    Mã số 60 B02
                  </span>
                </td>
                <td
                  className="py-3 px-4 text-right font-bold text-purple-400 bg-amber-950/10"
                  data-testid="npat-FIFO"
                >
                  {formatVnd(fifoRow.netProfitAfterTax)}
                </td>
                <td
                  className="py-3 px-4 text-right text-slate-200 bg-blue-950/10"
                  data-testid="npat-PERIODIC_WEIGHTED_AVERAGE"
                >
                  {formatVnd(periodicRow.netProfitAfterTax)}
                </td>
                <td
                  className="py-3 px-4 text-right text-slate-200 bg-purple-950/10"
                  data-testid="npat-MOVING_WEIGHTED_AVERAGE"
                >
                  {formatVnd(movingRow.netProfitAfterTax)}
                </td>
                <td
                  className="py-3 px-4 text-right font-bold text-purple-300 bg-slate-800/30"
                  data-testid="delta-npat"
                >
                  {formatVnd(deltaNpat)}
                </td>
              </tr>

              {/* Row 6: Gross Margin % */}
              <tr
                className="hover:bg-slate-800/40 transition bg-slate-800/20"
                data-testid="row-gross-margin"
              >
                <td className="py-3 px-4 font-sans font-medium text-slate-200">
                  6. Tỷ suất Biên Lợi Nhuận Gộp (Gross Margin)
                  <span className="block text-[11px] font-normal text-slate-400">
                    Tỷ lệ % = Lợi nhuận gộp (Mã 20) / Doanh thu thuần (Mã 10)
                  </span>
                </td>
                <td className="py-3 px-3 text-center font-sans">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-teal-300 text-xs font-semibold">
                    Biên LN %
                  </span>
                </td>
                <td
                  className="py-3 px-4 text-right font-bold text-teal-400 bg-amber-950/10"
                  data-testid="margin-FIFO"
                >
                  {formatPercent(fifoRow.grossMarginPercent)}
                </td>
                <td
                  className="py-3 px-4 text-right text-slate-200 bg-blue-950/10"
                  data-testid="margin-PERIODIC_WEIGHTED_AVERAGE"
                >
                  {formatPercent(periodicRow.grossMarginPercent)}
                </td>
                <td
                  className="py-3 px-4 text-right text-slate-200 bg-purple-950/10"
                  data-testid="margin-MOVING_WEIGHTED_AVERAGE"
                >
                  {formatPercent(movingRow.grossMarginPercent)}
                </td>
                <td
                  className="py-3 px-4 text-right font-bold text-teal-300 bg-slate-800/30"
                  data-testid="delta-margin"
                >
                  {formatPercent(deltaMargin)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Native SVG Comparison Chart */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700 p-4 md:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">
                Biểu Đồ Trực Quan So Sánh Các Chỉ Số Tài Chính (Native SVG Chart)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              So sánh quy mô Giá vốn, Tồn kho cuối kỳ, Lợi nhuận gộp và Thuế TNDN trên cùng tỷ lệ
            </p>
          </div>

          {/* Interactive Metric Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-700/60 text-xs">
            <button
              onClick={() => setActiveChartMetric('all')}
              className={`px-2.5 py-1 rounded transition ${
                activeChartMetric === 'all'
                  ? 'bg-amber-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất Cả
            </button>
            <button
              onClick={() => setActiveChartMetric('cogs')}
              className={`px-2.5 py-1 rounded transition ${
                activeChartMetric === 'cogs'
                  ? 'bg-amber-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Giá Vốn
            </button>
            <button
              onClick={() => setActiveChartMetric('ending')}
              className={`px-2.5 py-1 rounded transition ${
                activeChartMetric === 'ending'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tồn Kho
            </button>
            <button
              onClick={() => setActiveChartMetric('profit')}
              className={`px-2.5 py-1 rounded transition ${
                activeChartMetric === 'profit'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lợi Nhuận
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs mb-3 px-2 py-1.5 bg-slate-900/50 rounded-lg border border-slate-800">
          <span className="text-slate-400 font-medium">Bảng màu kế toán:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#d97706]" />
            <span className="text-slate-300">Giá vốn xuất kho (TK 632 / #d97706)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#059669]" />
            <span className="text-slate-300">Tồn kho cuối kỳ (TK 156 / #059669)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#2563eb]" />
            <span className="text-slate-300">Lợi nhuận gộp (Mã 20 / #2563eb)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#dc2626]" />
            <span className="text-slate-300">Thuế TNDN 20% (Mã 51 / #dc2626)</span>
          </div>
        </div>

        {/* SVG Visualization Canvas */}
        <div className="relative w-full overflow-x-auto bg-slate-950/60 rounded-lg border border-slate-800/80 p-2">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-[580px]"
            data-testid="cogs-comparison-chart"
          >
            {/* Background Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = paddingTop + plotHeight * (1 - ratio);
              const val = maxFinVal * ratio;
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="#334155"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    fill="#94a3b8"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {val >= 1_000_000
                      ? `${(val / 1_000_000).toFixed(1)}Tr`
                      : `${Math.round(val / 1000)}k`}
                  </text>
                </g>
              );
            })}

            {/* Baseline X-axis */}
            <line
              x1={paddingLeft}
              y1={paddingTop + plotHeight}
              x2={svgWidth - paddingRight}
              y2={paddingTop + plotHeight}
              stroke="#64748b"
              strokeWidth="1.5"
            />

            {/* Grouped Bars per Method */}
            {rows.map((row, groupIdx) => {
              const groupCenterX =
                paddingLeft + groupWidth * groupIdx + groupWidth / 2;

              // Items to display based on active filter
              const items = [
                {
                  key: 'cogs',
                  label: 'Giá vốn',
                  val: row.cogsAmount,
                  color: '#d97706',
                  visible: activeChartMetric === 'all' || activeChartMetric === 'cogs',
                },
                {
                  key: 'ending',
                  label: 'Tồn kho',
                  val: row.endingInventoryValue,
                  color: '#059669',
                  visible: activeChartMetric === 'all' || activeChartMetric === 'ending',
                },
                {
                  key: 'profit',
                  label: 'LN gộp',
                  val: row.grossProfit,
                  color: '#2563eb',
                  visible: activeChartMetric === 'all' || activeChartMetric === 'profit',
                },
                {
                  key: 'tax',
                  label: 'Thuế 20%',
                  val: row.citExpense,
                  color: '#dc2626',
                  visible: activeChartMetric === 'all',
                },
              ].filter((i) => i.visible);

              const totalGroupBars = items.length;
              const barSpacing = 4;
              const actualBarWidth = Math.min(
                28,
                (groupWidth - 30 - (totalGroupBars - 1) * barSpacing) / totalGroupBars
              );
              const startX =
                groupCenterX -
                (totalGroupBars * actualBarWidth + (totalGroupBars - 1) * barSpacing) / 2;

              return (
                <g key={row.method}>
                  {/* Method Label on X-axis */}
                  <text
                    x={groupCenterX}
                    y={svgHeight - paddingBottom + 20}
                    fill="#e2e8f0"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {row.method === 'FIFO'
                      ? 'FIFO (Nhập trước)'
                      : row.method === 'PERIODIC_WEIGHTED_AVERAGE'
                      ? 'BQ Cả Kỳ'
                      : 'BQ Liên Hoàn'}
                  </text>

                  {/* Sub-bars */}
                  {items.map((item, itemIdx) => {
                    const barHeight = Math.max(
                      2,
                      (item.val / maxFinVal) * plotHeight
                    );
                    const barX = startX + itemIdx * (actualBarWidth + barSpacing);
                    const barY = paddingTop + plotHeight - barHeight;

                    return (
                      <g
                        key={item.key}
                        className="cursor-pointer transition-all duration-200"
                        onMouseEnter={() =>
                          setHoveredBar({
                            method: row.methodLabelVi,
                            metric: item.label,
                            value: item.val,
                            formatted: formatVnd(item.val),
                            color: item.color,
                            x: barX + actualBarWidth / 2,
                            y: barY,
                          })
                        }
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        <rect
                          x={barX}
                          y={barY}
                          width={actualBarWidth}
                          height={barHeight}
                          rx="3"
                          fill={item.color}
                          opacity="0.9"
                          className="hover:opacity-100 hover:brightness-110"
                        />
                        {/* Value label on top of bar (if enough room) */}
                        {barHeight > 25 && (
                          <text
                            x={barX + actualBarWidth / 2}
                            y={barY - 4}
                            fill="#cbd5e1"
                            fontSize="9"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {item.val >= 1_000_000
                              ? `${(item.val / 1_000_000).toFixed(1)}M`
                              : `${Math.round(item.val / 1000)}k`}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Hover Tooltip inside SVG */}
            {hoveredBar && (
              <g
                transform={`translate(${Math.min(
                  svgWidth - 140,
                  Math.max(20, hoveredBar.x - 60)
                )}, ${Math.max(10, hoveredBar.y - 48)})`}
                pointerEvents="none"
              >
                <rect
                  x="0"
                  y="0"
                  width="130"
                  height="42"
                  rx="6"
                  fill="#0f172a"
                  stroke={hoveredBar.color}
                  strokeWidth="1.5"
                  filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
                />
                <text
                  x="65"
                  y="16"
                  fill="#94a3b8"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {hoveredBar.metric} ({hoveredBar.method.slice(0, 10)})
                </text>
                <text
                  x="65"
                  y="32"
                  fill="#f8fafc"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {hoveredBar.formatted}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Gross Margin Divergence Progress Visual */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
          {rows.map((r) => (
            <div
              key={r.method}
              className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center text-xs text-slate-300 mb-1">
                <span className="font-semibold">{r.methodLabelVi}</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {formatPercent(r.grossMarginPercent)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, r.grossMarginPercent))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Giá vốn: {formatVnd(r.cogsAmount)}</span>
                <span>LNST: {formatVnd(r.netProfitAfterTax)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Executive Insights Cards (Nhận định Quản trị Tài chính) */}
      <div
        className="bg-slate-800/40 rounded-xl border border-slate-700 p-4 md:p-6 shadow-lg space-y-4"
        data-testid="executive-insights-section"
      >
        <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
          <Building2 className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white text-base">
            Nhận Định Quản Trị Tài Chính & Khuyến Nghị Quyết Định (Executive Insights)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Vay vốn Ngân hàng & Tối ưu hóa BCTC */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-blue-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm mb-1">
                <Building2 className="w-4 h-4" />
                <span>Chiến Lược 1: Hỗ Trợ Hồ Sơ Vay Vốn & Cải Thiện BCTC</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {trend === 'INFLATION' ? (
                  <>
                    <strong className="text-white">Khuyến nghị phương pháp FIFO:</strong> Trong chu kỳ
                    đơn giá đầu vào tăng, FIFO xuất các lô hàng giá thấp trước nên{' '}
                    <span className="text-amber-300 font-semibold">Giá vốn TK 632 thấp nhất</span>,{' '}
                    <span className="text-blue-300 font-semibold">Lợi nhuận gộp (Mã 20) và LNST cao nhất</span>,{' '}
                    đồng thời <span className="text-emerald-300 font-semibold">Tồn kho TK 156 phản ánh giá trị cao nhất</span>{' '}
                    sát với giá thị trường hiện hành.
                  </>
                ) : trend === 'DEFLATION' ? (
                  <>
                    <strong className="text-white">Trong chu kỳ giá giảm:</strong> Phương pháp Bình quân
                    gia quyền liên hoàn hoặc Bình quân cả kỳ giúp hạn chế sụt giảm lợi nhuận kế toán so với FIFO.
                  </>
                ) : (
                  <>
                    <strong className="text-white">Đơn giá ổn định:</strong> Cả 3 phương pháp đều mang lại
                    chỉ số tài chính đồng nhất, không gây biến động đến hệ số tín dụng.
                  </>
                )}
              </p>
            </div>
            <div className="bg-blue-950/40 p-2.5 rounded-lg border border-blue-800/50 text-[11px] text-blue-300">
              <strong>Tác động Covenants Ngân hàng:</strong> Tối ưu hóa Hệ số thanh toán hiện hành
              (Current Ratio &gt; 1.5), Tỷ suất sinh lời trên vốn chủ sở hữu (ROE), và EBITDA,
              đáp ứng điều kiện giải ngân và nâng hạn mức tín dụng tại các NHTM.
            </div>
          </div>

          {/* Card 2: Tối ưu Hóa Dòng Tiền Thuế TNDN */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-emerald-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
                <Coins className="w-4 h-4" />
                <span>Chiến Lược 2: Tối Ưu Hóa Dòng Tiền Thuế TNDN (Tax Cash Flow)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {trend === 'INFLATION' ? (
                  <>
                    <strong className="text-white">Khuyến nghị phương pháp Bình Quân Gia Quyền:</strong>{' '}
                    Trong chu kỳ giá tăng, đưa đơn giá trung bình vào giá vốn giúp{' '}
                    <span className="text-amber-300 font-semibold">tăng chi phí Giá vốn TK 632</span> hợp pháp,{' '}
                    từ đó <span className="text-slate-200 font-semibold">giảm lợi nhuận kế toán trước thuế</span>{' '}
                    và <span className="text-emerald-300 font-semibold">giảm ngay số thuế TNDN 20% phải nộp</span>{' '}
                    trong kỳ tính thuế hiện hành.
                  </>
                ) : trend === 'DEFLATION' ? (
                  <>
                    <strong className="text-white">Trong chu kỳ giá giảm:</strong> Phương pháp FIFO lại đưa
                    các lô giá cao trước đây vào chi phí, giúp tối đa hóa chi phí được trừ và giảm số thuế TNDN
                    tạm nộp.
                  </>
                ) : (
                  <>
                    <strong className="text-white">Đơn giá ổn định:</strong> Nghĩa vụ thuế TNDN phát sinh hoàn
                    toàn ngang bằng nhau giữa các phương pháp.
                  </>
                )}
              </p>
            </div>
            <div className="bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/50 text-[11px] text-emerald-300">
              <strong>Bảo toàn Vốn Lưu Động:</strong> Trì hoãn nộp nghĩa vụ thuế TNDN tương đương với một
              khoản vay lãi suất 0% từ dòng tiền hoạt động kinh doanh, bảo toàn dòng tiền mặt cho doanh nghiệp.
            </div>
          </div>
        </div>

        {/* Dynamic Engine Insight Bullet Points */}
        <div className="bg-slate-900/60 rounded-lg p-3.5 border border-slate-800 text-xs space-y-2">
          <div className="font-semibold text-slate-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400" />
            <span>Phân tích Tác Động Chi Tiết Từ Bộ Máy Tính Toán:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            {executiveInsightsVi.map((insight, idx) => (
              <li key={idx} className="leading-relaxed">
                {insight}
              </li>
            ))}
          </ul>
        </div>

        {/* Regulatory & Consistency Principle Warning */}
        <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg text-xs text-amber-300/90 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-200">
              Nguyên Tắc Nhất Quán (Consistency Principle) — Chuẩn Mực VAS 01 & Thông Tư 200/99:
            </div>
            <p className="text-slate-300 leading-relaxed">
              Doanh nghiệp phải áp dụng thống nhất phương pháp tính giá trị hàng tồn kho đã chọn trong ít nhất
              một niên độ kế toán (năm tài chính). Trường hợp thay đổi phương pháp phải trình bày đầy đủ lý do
              và ảnh hưởng tài chính trong{' '}
              <strong className="text-white">Bản Thuyết minh Báo cáo tài chính</strong> theo quy định của
              Bộ Tài chính.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostingComparisonMatrix;
