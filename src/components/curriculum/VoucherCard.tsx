import { useState } from 'react';
import type { FC } from 'react';
import {
  FileText,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  Code,
  CheckCircle2,
} from 'lucide-react';
import {
  AnyVoucherData,
  EInvoiceData,
  CashReceiptData,
  CashPaymentData,
  BankTransferData,
  GoodsReceiptData,
  GoodsIssueData,
} from '@/types/voucher';
import { formatVnd } from './TAccountView';

interface VoucherCardProps {
  voucher: AnyVoucherData;
}

export const VoucherCard: FC<VoucherCardProps> = ({ voucher }) => {
  const [activeTab, setActiveTab] = useState<'VISUAL' | 'LEGAL' | 'RAW'>('VISUAL');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden my-4">
      {/* Tab Navigation Header */}
      <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {voucher.titleVi}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
            {voucher.type}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab('VISUAL')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'VISUAL'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Chứng từ mẫu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LEGAL')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'LEGAL'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Căn cứ pháp lý
          </button>
          {voucher.type === 'E_INVOICE_ND123' && voucher.xmlPayload && (
            <button
              type="button"
              onClick={() => setActiveTab('RAW')}
              className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                activeTab === 'RAW'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>XML QĐ 1450</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Visual Voucher Representation */}
      {activeTab === 'VISUAL' && (
        <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40">
          {voucher.type === 'E_INVOICE_ND123' && <EInvoiceVisual invoice={voucher} />}
          {voucher.type === 'CASH_RECEIPT_01_TT' && <CashReceiptVisual receipt={voucher} />}
          {voucher.type === 'CASH_PAYMENT_02_TT' && <CashPaymentVisual payment={voucher} />}
          {voucher.type === 'BANK_TRANSFER_UNC' && <BankTransferVisual unc={voucher} />}
          {voucher.type === 'GOODS_RECEIPT_01_VT' && <GoodsReceiptVisual grn={voucher} />}
          {voucher.type === 'GOODS_ISSUE_02_VT' && <GoodsIssueVisual gin={voucher} />}
        </div>
      )}

      {/* Tab 2: Legal & Accounting Compliance Checklist */}
      {activeTab === 'LEGAL' && (
        <div className="p-5 space-y-4 text-xs">
          <div className="space-y-2">
            <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Quy Chuẩn Kiểm Soát & Tuân Thủ Pháp Luật Việt Nam</span>
            </h5>
            <p className="text-slate-600 dark:text-slate-400">
              Chứng từ kế toán là thước đo pháp lý duy nhất để bảo vệ chi phí được trừ khi tính thuế TNDN và quyền được khấu trừ thuế GTGT đầu vào.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Yếu tố bắt buộc của chứng từ</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                Theo Điều 16 Luật Kế toán số 88/2015/QH13: Tên chứng từ, số hiệu, ngày lập, tên/địa chỉ/MST hai bên, nội dung kinh tế, quy mô số tiền bằng số và chữ, đầy đủ chữ ký phân định trách nhiệm.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Rủi ro thanh toán &gt;= 20 triệu VNĐ</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                Hóa đơn từ 20 triệu đồng (đã có VAT) bắt buộc phải thanh toán bằng UNC chuyển khoản ngân hàng theo Thông tư 219/2013 và Thông tư 96/2015. Thanh toán tiền mặt sẽ bị loại trừ toàn bộ thuế GTGT và chi phí hợp lý.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Raw XML view for Decision 1450 E-Invoices */}
      {activeTab === 'RAW' && voucher.type === 'E_INVOICE_ND123' && (
        <div className="p-4 bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto max-h-[360px]">
          <pre>{voucher.xmlPayload}</pre>
        </div>
      )}
    </div>
  );
};

// 1. Electronic Invoice Visual Renderer
const EInvoiceVisual: FC<{ invoice: EInvoiceData }> = ({ invoice }) => {
  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-5 sm:p-6 shadow-sm space-y-4 font-sans text-xs">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b-2 border-emerald-600 gap-3">
        <div>
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Nghị Định 123/2020/NĐ-CP • Quyết Định 1450/QĐ-TCT
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
            HÓA ĐƠN GIÁ TRỊ GIA TĂNG (ĐIỆN TỬ)
          </h3>
          <div className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center space-x-2 mt-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Ngày lập: {invoice.invoiceDate}</span>
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
            Ký hiệu: <span className="text-emerald-600 dark:text-emerald-400">{invoice.symbol}</span>
          </div>
          <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
            Số: <span className="text-rose-600 dark:text-rose-400">{invoice.invoiceNumber}</span>
          </div>
          <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-[10px] text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Có mã CQT</span>
          </div>
        </div>
      </div>

      {/* MCCQT Cryptographic Token */}
      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 overflow-hidden">
        <span className="shrink-0 font-bold text-slate-500">Mã CQT (MCCQT 34 hex):</span>
        <span className="truncate text-emerald-700 dark:text-emerald-400 font-semibold">
          {invoice.mccqt}
        </span>
      </div>

      {/* Seller & Buyer Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Đơn vị bán hàng</div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{invoice.seller.name}</div>
          <div className="font-mono text-slate-600 dark:text-slate-400">
            MST: <strong>{invoice.seller.taxCode}</strong>{' '}
            {invoice.seller.status === 'ACTIVE' && (
              <span className="text-emerald-600 text-[10px] font-semibold">(Status 00: Đang hoạt động)</span>
            )}
          </div>
          <div className="text-slate-500 text-[11px]">{invoice.seller.address}</div>
        </div>

        <div className="space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Đơn vị mua hàng</div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{invoice.buyer.name}</div>
          {invoice.buyer.taxCode && (
            <div className="font-mono text-slate-600 dark:text-slate-400">
              MST: <strong>{invoice.buyer.taxCode}</strong>
            </div>
          )}
          {invoice.buyer.address && (
            <div className="text-slate-500 text-[11px]">{invoice.buyer.address}</div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-2 text-center w-10">STT</th>
              <th className="p-2">Tên hàng hóa, dịch vụ</th>
              <th className="p-2 text-center w-16">ĐVT</th>
              <th className="p-2 text-right w-16">SL</th>
              <th className="p-2 text-right w-24">Đơn giá</th>
              <th className="p-2 text-right w-24">Thuế %</th>
              <th className="p-2 text-right w-28">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoice.items.map((item, idx) => (
              <tr key={idx}>
                <td className="p-2 text-center font-mono">{idx + 1}</td>
                <td className="p-2 font-medium text-slate-900 dark:text-slate-100">{item.name}</td>
                <td className="p-2 text-center text-slate-500">{item.unit}</td>
                <td className="p-2 text-right font-mono">{item.quantity}</td>
                <td className="p-2 text-right font-mono">{formatVnd(item.unitPrice)}</td>
                <td className="p-2 text-right font-mono text-emerald-600">{item.vatRate}%</td>
                <td className="p-2 text-right font-mono font-semibold">{formatVnd(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Summary */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-end justify-between gap-3">
        <div className="text-[11px] text-slate-500 italic max-w-sm">
          {invoice.legalNoteVi || 'Hóa đơn khởi tạo từ hệ thống HĐĐT có mã theo Nghị định 123/2020/NĐ-CP.'}
        </div>

        <div className="w-full sm:w-64 space-y-1 font-mono text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Tiền hàng chưa thuế:</span>
            <span>{formatVnd(invoice.subtotalPretax)}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Tiền thuế GTGT:</span>
            <span className="text-emerald-600 font-semibold">{formatVnd(invoice.totalVat)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-300 dark:border-slate-700">
            <span>Tổng thanh toán:</span>
            <span className="text-rose-600 dark:text-rose-400">{formatVnd(invoice.totalPayment)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Cash Receipt Visual Renderer (Phiếu thu 01-TT)
const CashReceiptVisual: FC<{ receipt: CashReceiptData }> = ({ receipt }) => {
  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-6 shadow-sm space-y-4 text-xs font-sans">
      <div className="flex justify-between items-start border-b pb-3 border-slate-200 dark:border-slate-700">
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-200">Đơn vị: CÔNG TY TNHH VIỆT HÀ</div>
          <div className="text-[11px] text-slate-500">Bộ phận: Kế toán thanh toán</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-slate-800 dark:text-slate-200">Mẫu số 01 - TT</div>
          <div className="text-[10px] text-slate-400">Ban hành theo TT 200/2014 & TT 133/2016</div>
          <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 pt-1">
            Số: {receipt.voucherNumber}
          </div>
        </div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">PHIẾU THU</h3>
        <div className="text-slate-500 text-[11px]">Ngày lập: {receipt.date}</div>
        <div className="text-[11px] font-mono font-semibold space-x-3 text-slate-700 dark:text-slate-300">
          <span>Nợ: {receipt.debitAccount}</span>
          <span>Có: {receipt.creditAccount}</span>
        </div>
      </div>

      <div className="space-y-2 py-2 border-y border-slate-100 dark:border-slate-800">
        <div className="flex"><span className="w-36 text-slate-400">Họ và tên người nộp:</span><strong className="text-slate-900 dark:text-slate-100">{receipt.payerName}</strong></div>
        <div className="flex"><span className="w-36 text-slate-400">Địa chỉ:</span><span className="text-slate-700 dark:text-slate-300">{receipt.payerAddress}</span></div>
        <div className="flex"><span className="w-36 text-slate-400">Lý do nộp:</span><span className="text-slate-700 dark:text-slate-300">{receipt.reason}</span></div>
        <div className="flex items-center"><span className="w-36 text-slate-400">Số tiền:</span><span className="font-mono font-bold text-emerald-600 text-sm">{formatVnd(receipt.amount)}</span></div>
        <div className="flex"><span className="w-36 text-slate-400">Bằng chữ:</span><span className="font-semibold italic text-slate-800 dark:text-slate-200">{receipt.amountInWords}</span></div>
      </div>

      {/* 5 Signatures */}
      <div className="grid grid-cols-5 gap-2 text-center text-[10px] pt-4">
        <div><div className="font-bold">Giám đốc</div><div className="h-10"></div><div className="text-slate-600">{receipt.signatures.director}</div></div>
        <div><div className="font-bold">Kế toán trưởng</div><div className="h-10"></div><div className="text-slate-600">{receipt.signatures.chiefAccountant}</div></div>
        <div><div className="font-bold">Người lập phiếu</div><div className="h-10"></div><div className="text-slate-600">{receipt.signatures.preparer}</div></div>
        <div><div className="font-bold">Người nộp tiền</div><div className="h-10"></div><div className="text-slate-600">{receipt.signatures.payer}</div></div>
        <div><div className="font-bold">Thủ quỹ</div><div className="h-10"></div><div className="text-slate-600">{receipt.signatures.cashier}</div></div>
      </div>
    </div>
  );
};

// 3. Cash Payment Visual Renderer (Phiếu chi 02-TT)
const CashPaymentVisual: FC<{ payment: CashPaymentData }> = ({ payment }) => {
  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-6 shadow-sm space-y-4 text-xs font-sans">
      <div className="flex justify-between items-start border-b pb-3 border-slate-200 dark:border-slate-700">
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-200">Đơn vị: CÔNG TY TNHH VIỆT HÀ</div>
          <div className="text-[11px] text-slate-500">Bộ phận: Kế toán thanh toán</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-slate-800 dark:text-slate-200">Mẫu số 02 - TT</div>
          <div className="text-[10px] text-slate-400">Ban hành theo TT 200/2014 & TT 133/2016</div>
          <div className="font-mono font-bold text-rose-600 dark:text-rose-400 pt-1">
            Số: {payment.voucherNumber}
          </div>
        </div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">PHIẾU CHI</h3>
        <div className="text-slate-500 text-[11px]">Ngày lập: {payment.date}</div>
        <div className="text-[11px] font-mono font-semibold space-x-3 text-slate-700 dark:text-slate-300">
          <span>Nợ: {payment.debitAccount}</span>
          <span>Có: {payment.creditAccount}</span>
        </div>
      </div>

      <div className="space-y-2 py-2 border-y border-slate-100 dark:border-slate-800">
        <div className="flex"><span className="w-36 text-slate-400">Họ và tên người nhận:</span><strong className="text-slate-900 dark:text-slate-100">{payment.receiverName}</strong></div>
        <div className="flex"><span className="w-36 text-slate-400">Địa chỉ:</span><span className="text-slate-700 dark:text-slate-300">{payment.receiverAddress}</span></div>
        <div className="flex"><span className="w-36 text-slate-400">Lý do chi:</span><span className="text-slate-700 dark:text-slate-300">{payment.reason}</span></div>
        <div className="flex items-center"><span className="w-36 text-slate-400">Số tiền:</span><span className="font-mono font-bold text-rose-600 text-sm">{formatVnd(payment.amount)}</span></div>
        <div className="flex"><span className="w-36 text-slate-400">Bằng chữ:</span><span className="font-semibold italic text-slate-800 dark:text-slate-200">{payment.amountInWords}</span></div>
      </div>

      {/* 5 Signatures */}
      <div className="grid grid-cols-5 gap-2 text-center text-[10px] pt-4">
        <div><div className="font-bold">Giám đốc</div><div className="h-10"></div><div className="text-slate-600">{payment.signatures.director}</div></div>
        <div><div className="font-bold">Kế toán trưởng</div><div className="h-10"></div><div className="text-slate-600">{payment.signatures.chiefAccountant}</div></div>
        <div><div className="font-bold">Người lập phiếu</div><div className="h-10"></div><div className="text-slate-600">{payment.signatures.preparer}</div></div>
        <div><div className="font-bold">Người nhận tiền</div><div className="h-10"></div><div className="text-slate-600">{payment.signatures.receiver}</div></div>
        <div><div className="font-bold">Thủ quỹ</div><div className="h-10"></div><div className="text-slate-600">{payment.signatures.cashier}</div></div>
      </div>
    </div>
  );
};

// 4. Bank Transfer Order Visual Renderer (Ủy nhiệm chi - UNC)
const BankTransferVisual: FC<{ unc: BankTransferData }> = ({ unc }) => {
  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-6 shadow-sm space-y-4 text-xs font-sans">
      <div className="flex justify-between items-start border-b pb-3 border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
            ỦY NHIỆM CHI (PAYMENT ORDER)
          </span>
        </div>
        <div className="text-right font-mono">
          <div className="font-bold text-blue-600">{unc.voucherNumber}</div>
          <div className="text-[10px] text-slate-400">{unc.date}</div>
        </div>
      </div>

      {/* Non-cash >=20M reminder */}
      {unc.isNonCashRuleApplicable && (
        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] text-blue-900 dark:text-blue-200 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Chứng từ thanh toán không dùng tiền mặt bắt buộc cho giao dịch &ge; 20.000.000 VNĐ (TT 219/2013).</span>
        </div>
      )}

      {/* Remitter & Beneficiary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
        <div className="space-y-1">
          <div className="font-bold text-slate-500 uppercase text-[10px]">Đơn vị trả tiền (Remitter)</div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{unc.remitter.accountName}</div>
          <div className="font-mono text-slate-700 dark:text-slate-300">STK: {unc.remitter.accountNumber}</div>
          <div className="text-[11px] text-slate-500">{unc.remitter.bankName}</div>
        </div>
        <div className="space-y-1">
          <div className="font-bold text-slate-500 uppercase text-[10px]">Đơn vị thụ hưởng (Beneficiary)</div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{unc.beneficiary.accountName}</div>
          <div className="font-mono text-slate-700 dark:text-slate-300">STK: {unc.beneficiary.accountNumber}</div>
          <div className="text-[11px] text-slate-500">{unc.beneficiary.bankName}</div>
        </div>
      </div>

      <div className="space-y-2 py-2 border-y border-slate-100 dark:border-slate-800">
        <div className="flex items-center"><span className="w-32 text-slate-400">Số tiền chuyển:</span><span className="font-mono font-bold text-blue-600 text-sm">{formatVnd(unc.amount)}</span></div>
        <div className="flex"><span className="w-32 text-slate-400">Bằng chữ:</span><span className="font-semibold italic text-slate-800 dark:text-slate-200">{unc.amountInWords}</span></div>
        <div className="flex"><span className="w-32 text-slate-400">Nội dung thanh toán:</span><span className="text-slate-700 dark:text-slate-300">{unc.narrative}</span></div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-4">
        <div><div className="font-bold">Kế toán trưởng</div><div className="h-10"></div><div className="text-slate-600">{unc.signatures.chiefAccountant}</div></div>
        <div><div className="font-bold">Chủ tài khoản</div><div className="h-10"></div><div className="text-slate-600">{unc.signatures.accountHolder}</div></div>
        <div><div className="font-bold">Giao dịch viên NH</div><div className="h-10"></div><div className="text-slate-600">{unc.signatures.bankTeller}</div></div>
        <div><div className="font-bold">Kiểm soát viên NH</div><div className="h-10"></div><div className="text-slate-600">{unc.signatures.bankController}</div></div>
      </div>
    </div>
  );
};

// 5. Goods Receipt Note Visual Renderer (Phiếu nhập kho 01-VT)
const GoodsReceiptVisual: FC<{ grn: GoodsReceiptData }> = ({ grn }) => {
  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-6 shadow-sm space-y-4 text-xs font-sans">
      <div className="flex justify-between items-start border-b pb-3 border-slate-200 dark:border-slate-700">
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-200">Đơn vị: CÔNG TY TNHH VIỆT HÀ</div>
          <div className="text-[11px] text-slate-500">{grn.warehouseName}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-slate-800 dark:text-slate-200">Mẫu số 01 - VT</div>
          <div className="font-mono font-bold text-emerald-600 pt-1">Số: {grn.voucherNumber}</div>
        </div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">PHIẾU NHẬP KHO</h3>
        <div className="text-slate-500 text-[11px]">Ngày lập: {grn.date} • Kèm theo: {grn.invoiceRef}</div>
        <div className="text-[11px] font-mono font-semibold space-x-3 text-slate-700 dark:text-slate-300">
          <span>Nợ: {grn.debitAccount}</span>
          <span>Có: {grn.creditAccount}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
            <tr>
              <th className="p-2">Tên vật tư hàng hóa</th>
              <th className="p-2 text-center">ĐVT</th>
              <th className="p-2 text-right">Chứng từ</th>
              <th className="p-2 text-right">Thực nhập</th>
              <th className="p-2 text-right">Đơn giá</th>
              <th className="p-2 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {grn.items.map((it, idx) => (
              <tr key={idx}>
                <td className="p-2 font-sans">{it.name}</td>
                <td className="p-2 text-center font-sans">{it.unit}</td>
                <td className="p-2 text-right">{it.quantityDoc}</td>
                <td className="p-2 text-right font-bold text-emerald-600">{it.quantityActual}</td>
                <td className="p-2 text-right">{formatVnd(it.unitPrice)}</td>
                <td className="p-2 text-right font-bold">{formatVnd(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-4">
        <div><div className="font-bold">Người lập phiếu</div><div className="h-10"></div><div className="text-slate-600">{grn.signatures.preparer}</div></div>
        <div><div className="font-bold">Người giao hàng</div><div className="h-10"></div><div className="text-slate-600">{grn.signatures.deliverer}</div></div>
        <div><div className="font-bold">Thủ kho</div><div className="h-10"></div><div className="text-slate-600">{grn.signatures.warehouseKeeper}</div></div>
        <div><div className="font-bold">Kế toán trưởng</div><div className="h-10"></div><div className="text-slate-600">{grn.signatures.chiefAccountant}</div></div>
      </div>
    </div>
  );
};

// 6. Goods Issue Note Visual Renderer (Phiếu xuất kho 02-VT)
const GoodsIssueVisual: FC<{ gin: GoodsIssueData }> = ({ gin }) => {
  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-6 shadow-sm space-y-4 text-xs font-sans">
      <div className="flex justify-between items-start border-b pb-3 border-slate-200 dark:border-slate-700">
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-200">Đơn vị: CÔNG TY TNHH VIỆT HÀ</div>
          <div className="text-[11px] text-slate-500">{gin.warehouseName}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-slate-800 dark:text-slate-200">Mẫu số 02 - VT</div>
          <div className="font-mono font-bold text-rose-600 pt-1">Số: {gin.voucherNumber}</div>
        </div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">PHIẾU XUẤT KHO</h3>
        <div className="text-slate-500 text-[11px]">Ngày lập: {gin.date} • Lý do: {gin.reason}</div>
        <div className="text-[11px] font-mono font-semibold space-x-3 text-slate-700 dark:text-slate-300">
          <span>Nợ: {gin.debitAccount}</span>
          <span>Có: {gin.creditAccount}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
            <tr>
              <th className="p-2">Tên vật tư hàng hóa</th>
              <th className="p-2 text-center">ĐVT</th>
              <th className="p-2 text-right">Yêu cầu</th>
              <th className="p-2 text-right">Thực xuất</th>
              <th className="p-2 text-right">Đơn giá</th>
              <th className="p-2 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {gin.items.map((it, idx) => (
              <tr key={idx}>
                <td className="p-2 font-sans">{it.name}</td>
                <td className="p-2 text-center font-sans">{it.unit}</td>
                <td className="p-2 text-right">{it.quantityRequested}</td>
                <td className="p-2 text-right font-bold text-rose-600">{it.quantityDispatched}</td>
                <td className="p-2 text-right">{formatVnd(it.unitPrice)}</td>
                <td className="p-2 text-right font-bold">{formatVnd(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-5 gap-2 text-center text-[10px] pt-4">
        <div><div className="font-bold">Giám đốc</div><div className="h-10"></div><div className="text-slate-600">{gin.signatures.director}</div></div>
        <div><div className="font-bold">Kế toán trưởng</div><div className="h-10"></div><div className="text-slate-600">{gin.signatures.chiefAccountant}</div></div>
        <div><div className="font-bold">Người lập phiếu</div><div className="h-10"></div><div className="text-slate-600">{gin.signatures.preparer}</div></div>
        <div><div className="font-bold">Người nhận hàng</div><div className="h-10"></div><div className="text-slate-600">{gin.signatures.receiver}</div></div>
        <div><div className="font-bold">Thủ kho</div><div className="h-10"></div><div className="text-slate-600">{gin.signatures.warehouseKeeper}</div></div>
      </div>
    </div>
  );
};
