import React, { useState, useMemo, FC, FormEvent } from 'react';
import {
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Truck,
  AlertTriangle,
  Trash2,
  Plus,
  RefreshCw,
  Edit2,
  Info,
  CheckCircle2,
  X,
  ShieldAlert,
  FileText,
  Layers,
} from 'lucide-react';
import {
  calculateStockCard,
  LIFO_PROHIBITED_EXPLANATION_VI,
} from '@/engine/cogs-engine';
import {
  CostingMethod,
  VoucherType,
  InventoryLot,
  StockTransaction,
  StockCardRow,
  StockCardResult,
} from '@/types/cogs';

export interface StockCardSimulatorProps {
  initialLots?: InventoryLot[];
  initialTransactions?: StockTransaction[];
  initialMethod?: CostingMethod;
  onStateChange?: (state: {
    initialLots: InventoryLot[];
    transactions: StockTransaction[];
    method: CostingMethod;
    result: StockCardResult;
  }) => void;
  className?: string;
}

export const DEFAULT_INITIAL_LOTS: InventoryLot[] = [
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
    description: 'Nhập kho mua hàng từ Công ty Cổ phần Thép Việt Ý',
    quantity: 150,
    unitPrice: 52_000,
    targetAccount: '156',
  },
  {
    id: 'tx-2',
    date: '2026-01-10',
    voucherCode: 'PXK-001',
    voucherType: 'PXK',
    description: 'Xuất kho bán hàng cho Công ty TNHH Xây Dựng An Bình',
    quantity: 120,
    targetAccount: '632',
  },
  {
    id: 'tx-3',
    date: '2026-01-15',
    voucherCode: 'XKNB-001',
    voucherType: 'XKNB_03',
    description: 'Xuất kho kiêm VCNB điều chuyển Chi nhánh Đà Nẵng (Mẫu 03/XKNB)',
    quantity: 50,
    targetAccount: '157',
  },
  {
    id: 'tx-4',
    date: '2026-01-20',
    voucherCode: 'PNK-002',
    voucherType: 'PNK',
    description: 'Nhập kho lô hàng bổ sung từ Thép Hòa Phát',
    quantity: 200,
    unitPrice: 55_000,
    targetAccount: '156',
  },
  {
    id: 'tx-5',
    date: '2026-01-25',
    voucherCode: 'PXK-002',
    voucherType: 'PXK',
    description: 'Xuất kho bán hàng cho Tổng công ty Đầu tư & Xây lắp Đô thị',
    quantity: 180,
    targetAccount: '632',
  },
];

export function formatVnd(val: number): string {
  if (val === 0) return '0 đ';
  return Math.round(val).toLocaleString('vi-VN') + ' đ';
}

export function formatQty(val: number): string {
  if (val === 0) return '0';
  return val.toLocaleString('vi-VN');
}

export function formatPrice(val: number): string {
  if (val === 0) return '-';
  return Math.round(val).toLocaleString('vi-VN') + ' đ';
}

export function formatDateVi(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function getTargetAccountDisplay(row: StockCardRow): string {
  if (row.voucherType === 'PXK') {
    return 'Nợ 632 / Có 156';
  }
  if (row.voucherType === 'XKNB_03') {
    return 'Nợ 157 / Có 156';
  }
  if (row.voucherType === 'PNK') {
    return 'Có 152/156';
  }
  return row.targetAccount || '156';
}

export const StockCardSimulator: FC<StockCardSimulatorProps> = ({
  initialLots = DEFAULT_INITIAL_LOTS,
  initialTransactions = DEFAULT_TRANSACTIONS,
  initialMethod = 'FIFO',
  onStateChange,
  className = '',
}) => {
  const [currentLots, setCurrentLots] = useState<InventoryLot[]>(initialLots);
  const [transactions, setTransactions] = useState<StockTransaction[]>(initialTransactions);
  const [method, setMethod] = useState<CostingMethod>(initialMethod);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState('2026-01-28');
  const [formVoucherCode, setFormVoucherCode] = useState('');
  const [formVoucherType, setFormVoucherType] = useState<VoucherType>('PXK');
  const [formDescription, setFormDescription] = useState('');
  const [formQuantity, setFormQuantity] = useState<number>(50);
  const [formUnitPrice, setFormUnitPrice] = useState<number>(55_000);
  const [formError, setFormError] = useState<string | null>(null);

  // LIFO Modal State
  const [showLifoModal, setShowLifoModal] = useState(false);

  // Instant reactive recalculation via pure calculation engine in <2ms
  const result: StockCardResult = useMemo(() => {
    return calculateStockCard(method, currentLots, transactions, { strict: false });
  }, [method, currentLots, transactions]);

  // Propagate state changes if callback provided
  React.useEffect(() => {
    if (onStateChange) {
      onStateChange({
        initialLots: currentLots,
        transactions,
        method,
        result,
      });
    }
  }, [currentLots, transactions, method, result, onStateChange]);

  // Handlers
  const handleMethodChange = (newMethod: CostingMethod) => {
    setMethod(newMethod);
    if (newMethod === 'LIFO') {
      setShowLifoModal(true);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormVoucherCode(`PXK-${String(transactions.length + 1).padStart(3, '0')}`);
    setFormVoucherType('PXK');
    setFormDescription('Xuất kho bán hàng thương mại');
    setFormQuantity(50);
    setFormUnitPrice(55_000);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tx: StockTransaction) => {
    setEditingId(tx.id);
    setFormDate(tx.date);
    setFormVoucherCode(tx.voucherCode);
    setFormVoucherType(tx.voucherType);
    setFormDescription(tx.description);
    setFormQuantity(tx.quantity);
    setFormUnitPrice(tx.unitPrice ?? 55_000);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleResetDefault = () => {
    setCurrentLots(DEFAULT_INITIAL_LOTS);
    setTransactions(DEFAULT_TRANSACTIONS);
    setMethod('FIFO');
  };

  const handleSaveTransaction = (e: FormEvent) => {
    e.preventDefault();
    if (!formVoucherCode.trim()) {
      setFormError('Vui lòng nhập số hiệu chứng từ');
      return;
    }
    if (formQuantity <= 0 || isNaN(formQuantity)) {
      setFormError('Số lượng phải lớn hơn 0');
      return;
    }
    if (formVoucherType === 'PNK' && (formUnitPrice < 0 || isNaN(formUnitPrice))) {
      setFormError('Đơn giá nhập kho không được âm');
      return;
    }

    const targetAccount: '632' | '157' | '156' =
      formVoucherType === 'PXK' ? '632' : formVoucherType === 'XKNB_03' ? '157' : '156';

    if (editingId) {
      // Edit existing transaction
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                date: formDate,
                voucherCode: formVoucherCode.trim(),
                voucherType: formVoucherType,
                description: formDescription.trim(),
                quantity: Number(formQuantity),
                unitPrice: formVoucherType === 'PNK' ? Number(formUnitPrice) : undefined,
                targetAccount,
              }
            : t
        )
      );
    } else {
      // Add new transaction
      const newTx: StockTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        date: formDate,
        voucherCode: formVoucherCode.trim(),
        voucherType: formVoucherType,
        description: formDescription.trim(),
        quantity: Number(formQuantity),
        unitPrice: formVoucherType === 'PNK' ? Number(formUnitPrice) : undefined,
        targetAccount,
      };
      setTransactions((prev) => [...prev, newTx]);
    }

    setIsModalOpen(false);
  };

  // Compute Initial Stock totals
  const initialQtyTotal = useMemo(
    () => currentLots.reduce((acc, lot) => acc + lot.quantity, 0),
    [currentLots]
  );
  const initialAmountTotal = useMemo(
    () => currentLots.reduce((acc, lot) => acc + lot.quantity * lot.unitPrice, 0),
    [currentLots]
  );
  const initialUnitPrice =
    initialQtyTotal > 0 ? Math.round(initialAmountTotal / initialQtyTotal) : 0;

  return (
    <div
      className={`bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden font-sans text-slate-800 ${className}`}
      data-testid="stock-card-simulator-container"
    >
      {/* 1. Header & Regulatory Reference Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 border-b border-indigo-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded">
                Mẫu S10-DN
              </span>
              <span className="px-2.5 py-0.5 text-xs font-medium text-slate-300 bg-slate-800/80 rounded border border-slate-700">
                Thông tư 200/2014/TT-BTC & Thông tư 99/2025/TT-BTC
              </span>
              <span className="px-2.5 py-0.5 text-xs font-medium text-amber-200 bg-amber-900/40 rounded border border-amber-500/30">
                Nghị định 123/2020 & 70/2025 (Mẫu 03/XKNB)
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-400" />
              THẺ KHO ĐIỆN TỬ & SỔ CHI TIẾT VẬT LIỆU, HÀNG HÓA
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1">
              Hàng hóa: <strong className="text-white">Thép cuộn cán nóng SS400 (D10)</strong> | Mã: <strong className="text-white">HH-156-SS400</strong> | ĐVT: <strong className="text-white">Tấn</strong> | Kho: <strong className="text-white">Kho Tổng Số 1</strong>
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            {result.isConserved ? (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 rounded-lg text-xs font-medium"
                title="Bất biến: Tồn ĐK + Nhập = Xuất + Tồn CK (Chênh lệch 0 đ)"
                data-testid="conservation-badge"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Bảo toàn kho 100%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 border border-rose-400/40 text-rose-200 rounded-lg text-xs font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Chênh lệch làm tròn: {result.roundingDiff} đ</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleResetDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-medium transition-colors"
              title="Đặt lại dữ liệu mẫu ban đầu"
              data-testid="reset-data-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đặt lại dữ liệu</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Method Selector & Controls Toolbar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Phương pháp xuất kho:
          </span>

          <button
            type="button"
            onClick={() => handleMethodChange('FIFO')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              method === 'FIFO'
                ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            data-testid="method-btn-FIFO"
          >
            Nhập trước xuất trước (FIFO)
          </button>

          <button
            type="button"
            onClick={() => handleMethodChange('PERIODIC_WEIGHTED_AVERAGE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              method === 'PERIODIC_WEIGHTED_AVERAGE'
                ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            data-testid="method-btn-PERIODIC_WEIGHTED_AVERAGE"
          >
            Bình quân cả kỳ dự trữ
          </button>

          <button
            type="button"
            onClick={() => handleMethodChange('MOVING_WEIGHTED_AVERAGE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              method === 'MOVING_WEIGHTED_AVERAGE'
                ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            data-testid="method-btn-MOVING_WEIGHTED_AVERAGE"
          >
            Bình quân gia quyền liên hoàn
          </button>

          <button
            type="button"
            onClick={() => handleMethodChange('LIFO')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
              method === 'LIFO'
                ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
            }`}
            data-testid="method-btn-LIFO"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>LIFO (Bãi bỏ)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLifoModal(true)}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Tra cứu quy định bãi bỏ LIFO theo VAS 02, IAS 2, TT 200/133/99"
            data-testid="lifo-info-btn"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            data-testid="add-transaction-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm chứng từ phát sinh</span>
          </button>
        </div>
      </div>

      {/* 3. Negative Stock Violation Guardrail Banner */}
      {result.hasNegativeStock && (
        <div
          className="mx-4 mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-lg shadow-sm"
          role="alert"
          data-testid="negative-stock-warning"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-900 uppercase tracking-wide">
                Cảnh báo vi phạm: Xuất âm kho! Số lượng tồn kho không được phép nhỏ hơn 0 tại thời điểm xuất
              </h4>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                Rào chắn kiểm soát nội bộ & Chuẩn mực Kế toán VAS 02: Doanh nghiệp không thể xuất kho vượt quá số lượng hàng thực tế đang có sẵn tại thời điểm ghi sổ. Vui lòng kiểm tra lại thứ tự ngày ghi sổ hoặc bổ sung chứng từ Nhập kho (PNK) trước thời điểm xuất hàng.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Statutory LIFO Warning Banner (when LIFO selected) */}
      {method === 'LIFO' && (
        <div
          className="mx-4 mt-4 p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-900 rounded-r-lg shadow-sm"
          role="alert"
          data-testid="lifo-statutory-warning"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                Cảnh báo chuẩn mực: Phương pháp LIFO đã bị bãi bỏ tại Việt Nam
              </h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {LIFO_PROHIBITED_EXPLANATION_VI}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium text-amber-700">
                <span className="px-2 py-0.5 bg-amber-100 rounded border border-amber-200">
                  Chuẩn mực VAS 02
                </span>
                <span className="px-2 py-0.5 bg-amber-100 rounded border border-amber-200">
                  Chuẩn mực IAS 2
                </span>
                <span className="px-2 py-0.5 bg-amber-100 rounded border border-amber-200">
                  Thông tư 200/2014/TT-BTC
                </span>
                <span className="px-2 py-0.5 bg-amber-100 rounded border border-amber-200">
                  Thông tư 133/2016/TT-BTC
                </span>
                <span className="px-2 py-0.5 bg-amber-100 rounded border border-amber-200">
                  Thông tư 99/2025/TT-BTC
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-100/70 border-b border-slate-200">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Tồn đầu kỳ
          </div>
          <div className="text-base font-bold text-slate-800 mt-1" data-testid="kpi-initial-qty">
            {formatQty(initialQtyTotal)} <span className="text-xs font-normal text-slate-500">tấn</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{formatVnd(initialAmountTotal)}</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
            Tổng Nhập trong kỳ
          </div>
          <div className="text-base font-bold text-emerald-700 mt-1" data-testid="kpi-total-in-qty">
            {formatQty(result.totalInQty)} <span className="text-xs font-normal text-slate-500">tấn</span>
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-0.5">
            {formatVnd(result.totalInAmount)}
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
            Tổng Xuất trong kỳ
          </div>
          <div className="text-base font-bold text-blue-700 mt-1" data-testid="kpi-total-out-qty">
            {formatQty(result.totalOutQty)} <span className="text-xs font-normal text-slate-500">tấn</span>
          </div>
          <div className="text-xs text-blue-600 font-medium mt-0.5">
            {formatVnd(result.totalOutAmount)}
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
            Giá vốn xuất bán (TK 632)
          </div>
          <div className="text-base font-bold text-indigo-700 mt-1" data-testid="kpi-total-cogs">
            {formatVnd(result.totalCogsAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            (Chỉ hạch toán Nợ 632)
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs col-span-2 md:col-span-1">
          <div className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-purple-500" />
            Tồn cuối kỳ (TK 156)
          </div>
          <div className="text-base font-bold text-purple-700 mt-1" data-testid="kpi-ending-qty">
            {formatQty(result.endingBalanceQty)} <span className="text-xs font-normal text-slate-500">tấn</span>
          </div>
          <div className="text-xs text-purple-600 font-medium mt-0.5">
            {formatVnd(result.endingBalanceAmount)}
          </div>
        </div>
      </div>

      {/* 6. Authentic Stock Card Table (Mẫu S10-DN theo TT 200 & TT 99/2025) */}
      <div className="overflow-x-auto">
        <table
          className="w-full text-left border-collapse text-xs md:text-sm"
          data-testid="stock-card-table"
        >
          <thead>
            {/* Top Multi-column Header Row */}
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold">
              <th
                rowSpan={2}
                className="p-3 border-r border-slate-300 text-center min-w-[95px] align-middle"
              >
                Ngày ghi sổ / chứng từ
              </th>
              <th
                colSpan={2}
                className="p-2 border-r border-slate-300 text-center align-middle"
              >
                Chứng từ
              </th>
              <th
                rowSpan={2}
                className="p-3 border-r border-slate-300 min-w-[200px] align-middle"
              >
                Diễn giải nội dung kinh tế
              </th>
              <th
                rowSpan={2}
                className="p-3 border-r border-slate-300 text-center min-w-[130px] align-middle"
              >
                TK đối ứng
              </th>
              <th
                rowSpan={2}
                className="p-3 border-r border-slate-300 text-right min-w-[100px] align-middle"
              >
                Đơn giá xuất kho
              </th>
              <th
                colSpan={2}
                className="p-2 border-r border-slate-300 text-center bg-emerald-50 text-emerald-900"
              >
                Nhập kho
              </th>
              <th
                colSpan={2}
                className="p-2 border-r border-slate-300 text-center bg-blue-50 text-blue-900"
              >
                Xuất kho
              </th>
              <th
                colSpan={2}
                className="p-2 border-r border-slate-300 text-center bg-purple-50 text-purple-900"
              >
                Tồn kho
              </th>
              <th
                rowSpan={2}
                className="p-3 text-center min-w-[90px] align-middle"
              >
                Thao tác
              </th>
            </tr>

            {/* Sub-column Header Row */}
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-300 text-xs">
              <th className="p-2 border-r border-slate-300 text-center min-w-[90px]">
                Số hiệu
              </th>
              <th className="p-2 border-r border-slate-300 text-center min-w-[120px]">
                Loại chứng từ
              </th>
              {/* Nhập */}
              <th className="p-2 border-r border-slate-300 text-right bg-emerald-50/50 min-w-[75px]">
                Số lượng
              </th>
              <th className="p-2 border-r border-slate-300 text-right bg-emerald-50/50 min-w-[105px]">
                Thành tiền
              </th>
              {/* Xuất */}
              <th className="p-2 border-r border-slate-300 text-right bg-blue-50/50 min-w-[75px]">
                Số lượng
              </th>
              <th className="p-2 border-r border-slate-300 text-right bg-blue-50/50 min-w-[105px]">
                Thành tiền
              </th>
              {/* Tồn */}
              <th className="p-2 border-r border-slate-300 text-right bg-purple-50/50 min-w-[75px]">
                Số lượng
              </th>
              <th className="p-2 border-r border-slate-300 text-right bg-purple-50/50 min-w-[105px]">
                Thành tiền
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {/* Initial Stock Balance Row */}
            <tr
              className="bg-slate-50/60 font-medium text-slate-700 hover:bg-slate-100/60 transition-colors"
              data-testid="initial-stock-row"
            >
              <td className="p-2.5 text-center text-slate-500">
                {formatDateVi(currentLots[0]?.date ?? '2026-01-01')}
              </td>
              <td className="p-2.5 text-center font-mono text-xs text-slate-600">
                {currentLots[0]?.voucherCode ?? 'SDDK'}
              </td>
              <td className="p-2.5 text-center">
                <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-200 text-slate-700 rounded">
                  Số dư ĐK
                </span>
              </td>
              <td className="p-2.5 font-medium text-slate-800">
                Số dư tồn đầu kỳ
              </td>
              <td className="p-2.5 text-center text-slate-400 font-mono text-xs">-</td>
              <td className="p-2.5 text-right font-mono text-xs text-slate-600">
                {formatPrice(initialUnitPrice)}
              </td>
              {/* Nhập */}
              <td className="p-2.5 text-right text-slate-400">-</td>
              <td className="p-2.5 text-right text-slate-400">-</td>
              {/* Xuất */}
              <td className="p-2.5 text-right text-slate-400">-</td>
              <td className="p-2.5 text-right text-slate-400">-</td>
              {/* Tồn */}
              <td className="p-2.5 text-right font-semibold text-purple-900 bg-purple-50/30 font-mono">
                {formatQty(initialQtyTotal)}
              </td>
              <td className="p-2.5 text-right font-semibold text-purple-900 bg-purple-50/30 font-mono">
                {formatVnd(initialAmountTotal)}
              </td>
              <td className="p-2.5 text-center text-slate-400 text-xs">Mặc định</td>
            </tr>

            {/* Calculated Transaction Rows */}
            {result.rows.map((row) => {
              const originalTx = transactions.find((t) => t.id === row.id);
              const isNegative = row.isNegativeStock;

              return (
                <tr
                  key={row.id}
                  data-testid={`stock-row-${row.id}`}
                  className={`transition-colors ${
                    isNegative
                      ? 'bg-red-50 text-red-950 font-medium hover:bg-red-100/70 border-l-4 border-red-500'
                      : 'hover:bg-slate-50/80 text-slate-800'
                  }`}
                >
                  {/* Ngày */}
                  <td className="p-2.5 text-center text-xs font-mono">
                    {formatDateVi(row.date)}
                  </td>

                  {/* Số hiệu */}
                  <td className="p-2.5 text-center font-mono text-xs font-semibold">
                    {row.voucherCode}
                  </td>

                  {/* Loại chứng từ */}
                  <td className="p-2.5 text-center">
                    {row.voucherType === 'PNK' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                        <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                        PNK (Nhập kho)
                      </span>
                    )}
                    {row.voucherType === 'PXK' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 rounded border border-blue-300">
                        <ArrowUpRight className="w-3 h-3 text-blue-600" />
                        PXK (Xuất bán)
                      </span>
                    )}
                    {row.voucherType === 'XKNB_03' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-purple-100 text-purple-800 rounded border border-purple-300">
                        <Truck className="w-3 h-3 text-purple-600" />
                        XKNB Mẫu 03
                      </span>
                    )}
                  </td>

                  {/* Diễn giải */}
                  <td className="p-2.5">
                    <div className="font-medium text-xs md:text-sm">{row.description}</div>
                    {row.explanationVi && (
                      <div className="text-[11px] text-slate-500 italic mt-0.5">
                        {row.explanationVi}
                      </div>
                    )}
                    {isNegative && (
                      <div className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        Xuất âm kho! Vượt tồn khả dụng.
                      </div>
                    )}
                  </td>

                  {/* Tài khoản đối ứng */}
                  <td className="p-2.5 text-center font-mono text-xs font-semibold">
                    <span
                      className={`px-2 py-0.5 rounded border ${
                        row.voucherType === 'PXK'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : row.voucherType === 'XKNB_03'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                      data-testid={`target-account-${row.id}`}
                    >
                      {getTargetAccountDisplay(row)}
                    </span>
                  </td>

                  {/* Đơn giá xuất kho */}
                  <td className="p-2.5 text-right font-mono text-xs text-slate-700">
                    {row.outPrice > 0 ? formatPrice(row.outPrice) : '-'}
                  </td>

                  {/* Nhập - Số lượng */}
                  <td className="p-2.5 text-right font-mono text-xs bg-emerald-50/30 text-emerald-800 font-semibold">
                    {row.inQty > 0 ? formatQty(row.inQty) : '-'}
                  </td>

                  {/* Nhập - Thành tiền */}
                  <td className="p-2.5 text-right font-mono text-xs bg-emerald-50/30 text-emerald-900 font-semibold">
                    {row.inAmount > 0 ? formatVnd(row.inAmount) : '-'}
                  </td>

                  {/* Xuất - Số lượng */}
                  <td
                    className={`p-2.5 text-right font-mono text-xs bg-blue-50/30 font-semibold ${
                      isNegative ? 'text-red-700 font-bold underline' : 'text-blue-800'
                    }`}
                  >
                    {row.outQty > 0 ? formatQty(row.outQty) : '-'}
                  </td>

                  {/* Xuất - Thành tiền */}
                  <td className="p-2.5 text-right font-mono text-xs bg-blue-50/30 text-blue-900 font-semibold">
                    {row.outAmount > 0 ? formatVnd(row.outAmount) : '-'}
                  </td>

                  {/* Tồn - Số lượng */}
                  <td
                    className={`p-2.5 text-right font-mono text-xs font-bold bg-purple-50/30 ${
                      row.balanceQty < 0 ? 'text-red-600' : 'text-purple-900'
                    }`}
                  >
                    {formatQty(row.balanceQty)}
                  </td>

                  {/* Tồn - Thành tiền */}
                  <td
                    className={`p-2.5 text-right font-mono text-xs font-bold bg-purple-50/30 ${
                      row.balanceAmount < 0 ? 'text-red-600' : 'text-purple-900'
                    }`}
                  >
                    {formatVnd(row.balanceAmount)}
                  </td>

                  {/* Thao tác */}
                  <td className="p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {originalTx && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(originalTx)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Chỉnh sửa dòng chứng từ"
                          data-testid={`edit-btn-${row.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteTransaction(row.id)}
                        className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Xóa dòng chứng từ"
                        data-testid={`delete-btn-${row.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Table Footer: Totals */}
          <tfoot className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300 text-xs md:text-sm">
            <tr>
              <td colSpan={6} className="p-3 text-right uppercase tracking-wider text-slate-600">
                Tổng cộng số phát sinh trong kỳ:
              </td>
              {/* Tổng Nhập */}
              <td className="p-3 text-right font-mono text-emerald-900 bg-emerald-100/60 font-bold">
                {formatQty(result.totalInQty)}
              </td>
              <td className="p-3 text-right font-mono text-emerald-900 bg-emerald-100/60 font-bold">
                {formatVnd(result.totalInAmount)}
              </td>
              {/* Tổng Xuất */}
              <td className="p-3 text-right font-mono text-blue-900 bg-blue-100/60 font-bold">
                {formatQty(result.totalOutQty)}
              </td>
              <td className="p-3 text-right font-mono text-blue-900 bg-blue-100/60 font-bold">
                {formatVnd(result.totalOutAmount)}
              </td>
              {/* Tồn Cuối Kỳ */}
              <td className="p-3 text-right font-mono text-purple-900 bg-purple-100/60 font-bold">
                {formatQty(result.endingBalanceQty)}
              </td>
              <td className="p-3 text-right font-mono text-purple-900 bg-purple-100/60 font-bold">
                {formatVnd(result.endingBalanceAmount)}
              </td>
              <td className="p-3 text-center text-slate-400">-</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 7. Pedagogical & Regulatory Method Explainer Box */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <div className="font-semibold text-slate-800">
              Cơ chế phản ánh hạch toán theo Chuẩn mực & Thông tư 99/2025/TT-BTC:
            </div>
            <p>
              • <strong>Xuất bán thương mại (PXK Form 02-VT)</strong>: Ghi nhận giá vốn trực tiếp vào{' '}
              <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
                Nợ TK 632 / Có TK 156
              </span>
              . Giá vốn này kết chuyển vào Báo cáo KQKD (Mã 11).
            </p>
            <p>
              • <strong>Điều chuyển / Gửi đại lý (Phiếu XK kiêm VCNB Mẫu 03/XKNB)</strong>: Tuân thủ Nghị định 123/2020 & Nghị định 70/2025, chỉ phản ánh luân chuyển hàng gửi bán hoặc điều chuyển kho, hạch toán{' '}
              <span className="font-mono font-semibold text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-200">
                Nợ TK 157 / Có TK 156
              </span>
              . Không ghi nhận giá vốn TK 632 tại thời điểm lập phiếu xuất.
            </p>
            <p>
              • <strong>Phương pháp tính giá:</strong> Hiện đang áp dụng{' '}
              <span className="font-semibold text-indigo-700">
                {method === 'FIFO'
                  ? 'Nhập trước - Xuất trước (FIFO - Đoạn 13 VAS 02)'
                  : method === 'PERIODIC_WEIGHTED_AVERAGE'
                  ? 'Bình quân cả kỳ dự trữ (Đoạn 15 VAS 02)'
                  : method === 'MOVING_WEIGHTED_AVERAGE'
                  ? 'Bình quân gia quyền liên hoàn sau mỗi lần nhập'
                  : 'LIFO (Đã bị bãi bỏ theo luật định)'}
              </span>
              . Hệ thống tự động tính toán lại toàn bộ thẻ kho trong &lt;2ms khi thêm, sửa hoặc xóa dòng chứng từ.
            </p>
          </div>
        </div>
      </div>

      {/* 8. Add / Edit Transaction Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          data-testid="transaction-modal"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                {editingId ? 'Chỉnh sửa dòng chứng từ thẻ kho' : 'Thêm mới chứng từ phát sinh'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                data-testid="close-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-5 space-y-4">
              {formError && (
                <div
                  className="p-3 bg-red-50 border border-red-300 text-red-700 text-xs rounded-lg flex items-center gap-2"
                  data-testid="form-error-alert"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày chứng từ
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                    data-testid="input-date"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số hiệu chứng từ
                  </label>
                  <input
                    type="text"
                    value={formVoucherCode}
                    onChange={(e) => setFormVoucherCode(e.target.value)}
                    placeholder="PNK-xxx, PXK-xxx, XKNB-xxx"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden uppercase"
                    data-testid="input-voucher-code"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loại chứng từ
                </label>
                <select
                  value={formVoucherType}
                  onChange={(e) => {
                    const vt = e.target.value as VoucherType;
                    setFormVoucherType(vt);
                    if (vt === 'PNK' && !editingId) {
                      setFormDescription('Nhập kho mua hàng vật tư');
                      setFormVoucherCode(`PNK-${String(transactions.length + 1).padStart(3, '0')}`);
                    } else if (vt === 'XKNB_03' && !editingId) {
                      setFormDescription('Xuất kho kiêm VCNB điều chuyển Chi nhánh (Mẫu 03/XKNB)');
                      setFormVoucherCode(`XKNB-${String(transactions.length + 1).padStart(3, '0')}`);
                    } else if (vt === 'PXK' && !editingId) {
                      setFormDescription('Xuất kho bán hàng cho khách hàng');
                      setFormVoucherCode(`PXK-${String(transactions.length + 1).padStart(3, '0')}`);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                  data-testid="select-voucher-type"
                >
                  <option value="PNK">PNK - Phiếu nhập kho (Có 152/156)</option>
                  <option value="PXK">PXK - Phiếu xuất kho bán hàng (Nợ 632 / Có 156)</option>
                  <option value="XKNB_03">
                    XKNB Mẫu 03 - Phiếu XK kiêm VCNB NĐ 123/70 (Nợ 157 / Có 156)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diễn giải nội dung kinh tế
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ghi rõ nội dung nghiệp vụ kinh tế phát sinh"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                  data-testid="input-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng (tấn)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                    data-testid="input-quantity"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Đơn giá nhập (đ/tấn)
                  </label>
                  <input
                    type="number"
                    min={0}
                    disabled={formVoucherType !== 'PNK'}
                    value={formVoucherType === 'PNK' ? formUnitPrice : ''}
                    onChange={(e) => setFormUnitPrice(Number(e.target.value))}
                    placeholder={formVoucherType !== 'PNK' ? 'Tự động tính theo phương pháp' : '0'}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden ${
                      formVoucherType !== 'PNK' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                    }`}
                    data-testid="input-unit-price"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                  data-testid="cancel-btn"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  data-testid="save-transaction-btn"
                >
                  {editingId ? 'Cập nhật chứng từ' : 'Lưu chứng từ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Statutory LIFO Audit Modal */}
      {showLifoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          data-testid="lifo-modal"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-300 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-amber-800 to-amber-950 text-white p-4 flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                Quy Định Bãi Bỏ Phương Pháp LIFO
              </h3>
              <button
                type="button"
                onClick={() => setShowLifoModal(false)}
                className="text-amber-200 hover:text-white p-1 rounded transition-colors"
                data-testid="close-lifo-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-medium">
                {LIFO_PROHIBITED_EXPLANATION_VI}
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                  Căn cứ pháp lý bãi bỏ:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                  <li>
                    <strong>Chuẩn mực Kế toán Việt Nam VAS 02</strong>: Hàng tồn kho chỉ cho phép 3 phương pháp (FIFO, Bình quân gia quyền, Giá thực tế đích danh).
                  </li>
                  <li>
                    <strong>Chuẩn mực Báo cáo Tài chính Quốc tế IAS 2</strong>: Nghiêm cấm hoàn toàn LIFO từ năm 2005.
                  </li>
                  <li>
                    <strong>Thông tư 200/2014/TT-BTC & Thông tư 133/2016/TT-BTC</strong>: Đã loại bỏ hoàn toàn phương pháp Nhập sau - Xuất trước khỏi hệ thống tài khoản và chế độ kế toán doanh nghiệp.
                  </li>
                  <li>
                    <strong>Thông tư 99/2025/TT-BTC</strong> (Hiệu lực từ 01/01/2026): Tiếp tục duy trì lệnh cấm tuyệt đối đối với phương pháp LIFO.
                  </li>
                </ul>
              </div>

              <div className="space-y-1 pt-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                  Tác động kinh tế nếu vi phạm:
                </h4>
                <p className="text-slate-600">
                  Trong chu kỳ giá tăng, LIFO đẩy giá vốn lên cao giả tạo và hạ thấp giá trị hàng tồn kho trên Bảng cân đối kế toán, dẫn đến sai lệch nghiêm trọng các chỉ tiêu tài chính (Hệ số thanh toán hiện hành, ROA, ROE) và rủi ro bị cơ quan Thuế thanh tra truy thu thuế TNDN.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowLifoModal(false)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition-colors"
                  data-testid="confirm-lifo-modal-btn"
                >
                  Đã hiểu & Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockCardSimulator;
