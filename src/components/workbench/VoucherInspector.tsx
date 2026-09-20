import { useState, useMemo, useEffect, type FC } from 'react';
import {
  FileCheck2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Search,
  Award,
  Check,
} from 'lucide-react';
import { AccountingRegime } from '@/types/coa';
import {
  VOUCHER_AUDIT_CASES,
  VoucherAuditCaseData,
} from '@/data/voucher-cases';
import { formatVnd } from '@/components/curriculum/TAccountView';
import { storageService } from '@/services/storage/storage-service';
import {
  evaluateNonCashRule,
  evaluateVendorTaxStatus,
  NonCashCheckResult,
  VendorTaxStatusCheckResult,
} from '@/services/tax/tax-guardrails';

export interface VoucherInspectorProps {
  currentRegime: AccountingRegime;
}

export interface UserAuditSubmission {
  flagTaxCode: boolean;
  flagCashOver20M: boolean;
  flagArithmetic: boolean;
  flagMissingSignature: boolean;
  overallDecision: 'VALID' | 'INVALID' | null;
}

export interface AuditResult {
  score: number; // 0-100
  isPerfect: boolean;
  taxCodeCorrect: boolean;
  cashRuleCorrect: boolean;
  arithmeticCorrect: boolean;
  signatureCorrect: boolean;
  overallDecisionCorrect: boolean;
  feedbackVi: string;
}

export const VoucherInspector: FC<VoucherInspectorProps> = ({ currentRegime }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(VOUCHER_AUDIT_CASES[0].id);

  // User checklist state
  const [submission, setSubmission] = useState<UserAuditSubmission>({
    flagTaxCode: false,
    flagCashOver20M: false,
    flagArithmetic: false,
    flagMissingSignature: false,
    overallDecision: null,
  });

  // Audit evaluation state
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [completedCases, setCompletedCases] = useState<Record<string, number>>({});
  const [taxLookupModalOpen, setTaxLookupModalOpen] = useState(false);

  // Restore persisted completed cases from storageService on mount
  useEffect(() => {
    let isMounted = true;
    storageService
      .loadWorkbenchState()
      .then((state) => {
        if (!isMounted) return;
        if (state.voucherScores && Object.keys(state.voucherScores).length > 0) {
          setCompletedCases(state.voucherScores);
        } else if (state.completedVoucherCases && state.completedVoucherCases.length > 0) {
          const map: Record<string, number> = {};
          for (const id of state.completedVoucherCases) {
            map[id] = 100;
          }
          setCompletedCases(map);
        }
      })
      .catch((err) => {
        console.warn('[VoucherInspector] Failed to load completed cases:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Current selected voucher case
  const currentCase = useMemo<VoucherAuditCaseData>(() => {
    return (
      VOUCHER_AUDIT_CASES.find((c) => c.id === selectedCaseId) || VOUCHER_AUDIT_CASES[0]
    );
  }, [selectedCaseId]);

  // Regulatory tax guardrail evaluations
  const nonCashCheck = useMemo<NonCashCheckResult>(() => {
    return evaluateNonCashRule(currentCase.totalAmount, currentCase.paymentMethod);
  }, [currentCase.totalAmount, currentCase.paymentMethod]);

  const vendorStatusCheck = useMemo<VendorTaxStatusCheckResult>(() => {
    return evaluateVendorTaxStatus(
      currentCase.sellerTaxCode || '',
      currentCase.vendorTaxStatus
    );
  }, [currentCase.sellerTaxCode, currentCase.vendorTaxStatus]);

  // Switch voucher case
  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setSubmission({
      flagTaxCode: false,
      flagCashOver20M: false,
      flagArithmetic: false,
      flagMissingSignature: false,
      overallDecision: null,
    });
    setAuditResult(null);
  };

  // Reset current case checklist
  const handleResetChecklist = () => {
    setSubmission({
      flagTaxCode: false,
      flagCashOver20M: false,
      flagArithmetic: false,
      flagMissingSignature: false,
      overallDecision: null,
    });
    setAuditResult(null);
  };

  // Reset current case checklist and score
  const handleResetCurrentCase = async () => {
    handleResetChecklist();
    if (completedCases[currentCase.id] !== undefined) {
      const updated = { ...completedCases };
      delete updated[currentCase.id];
      setCompletedCases(updated);
      const caseIds = Object.keys(updated);
      await storageService.saveWorkbenchState({
        completedVoucherCases: caseIds,
        voucherCompletedCases: caseIds,
        voucherScores: updated,
      });
    }
  };

  // Reset all completed cases
  const handleResetAllCases = async () => {
    handleResetChecklist();
    setCompletedCases({});
    await storageService.saveWorkbenchState({
      completedVoucherCases: [],
      voucherCompletedCases: [],
      voucherScores: {},
    });
  };

  // Submit Audit Inspection
  const handleSubmitAudit = () => {
    if (submission.overallDecision === null) {
      alert('Vui lòng đưa ra Kết luận kiểm toán (Chứng từ Đạt hay Không Đạt).');
      return;
    }

    const actualHasTaxCodeIssue = currentCase.hasTaxCodeIssue;
    const actualViolates20M = currentCase.violates20mCashRule;
    const actualHasArithmetic = currentCase.hasArithmeticError;
    const actualMissingSig = currentCase.missingSignature;
    const actualIsValid =
      !actualHasTaxCodeIssue &&
      !actualViolates20M &&
      !actualHasArithmetic &&
      !actualMissingSig;

    const taxCodeCorrect = submission.flagTaxCode === actualHasTaxCodeIssue;
    const cashRuleCorrect = submission.flagCashOver20M === actualViolates20M;
    const arithmeticCorrect = submission.flagArithmetic === actualHasArithmetic;
    const signatureCorrect = submission.flagMissingSignature === actualMissingSig;
    const expectedDecision = actualIsValid ? 'VALID' : 'INVALID';
    const overallDecisionCorrect = submission.overallDecision === expectedDecision;

    // Scoring calculation: 20 points per check (4 checks * 20 = 80 pts) + 20 pts for overall decision = 100 pts
    let score = 0;
    if (taxCodeCorrect) score += 20;
    if (cashRuleCorrect) score += 20;
    if (arithmeticCorrect) score += 20;
    if (signatureCorrect) score += 20;
    if (overallDecisionCorrect) score += 20;

    const isPerfect = score === 100;
    let feedbackVi = '';

    if (isPerfect) {
      feedbackVi = actualIsValid
        ? 'Chính xác tuyệt đối (100/100)! Chứng từ này hoàn toàn hợp lệ, đầy đủ điều kiện khấu trừ thuế GTGT và tính chi phí hợp lý.'
        : 'Chính xác tuyệt đối (100/100)! Bạn đã phát hiện đúng toàn bộ sai phạm và rủi ro pháp lý của chứng từ này.';
    } else {
      feedbackVi = `Bạn đạt ${score}/100 điểm. Hãy xem chi tiết các tiêu chí kiểm tra và căn cứ pháp lý phía dưới để rút kinh nghiệm.`;
    }

    const result: AuditResult = {
      score,
      isPerfect,
      taxCodeCorrect,
      cashRuleCorrect,
      arithmeticCorrect,
      signatureCorrect,
      overallDecisionCorrect,
      feedbackVi,
    };

    setAuditResult(result);
    const updatedCompleted = { ...completedCases, [currentCase.id]: score };
    setCompletedCases(updatedCompleted);
    const caseIds = Object.keys(updatedCompleted);
    storageService
      .saveWorkbenchState({
        completedVoucherCases: caseIds,
        voucherCompletedCases: caseIds,
        voucherScores: updatedCompleted,
      })
      .catch((err) => {
        console.warn('[VoucherInspector] Failed to persist completed cases:', err);
      });

    // Record study activity to advance streak
    storageService.recordStreakActivity().catch(() => {});
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <FileCheck2 className="w-4 h-4" />
            <span>Phòng Kiểm Tra & Soát Xét Chứng Từ Kế Toán (Voucher Inspection Room)</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            Chế độ: {currentRegime === 'CIRCULAR_200' ? 'Thông tư 200' : 'Thông tư 133'}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
          Soát Xét Hóa Đơn Điện Tử & Phát Hiện Rủi Ro Thuế Thực Tế
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Rèn luyện kỹ năng kiểm toán chứng từ thực chiến: Thẩm tra trạng thái mã số thuế người bán (Status 03/04), kiểm soát ngưỡng thanh toán không dùng tiền mặt &ge; 20 triệu đồng (Thông tư 219/2013), kiểm tra tính toán số học và chữ ký thẩm quyền.
        </p>
      </div>

      {/* Challenge Selector */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>Chọn Hồ Sơ Chứng Từ Cần Soát Xét ({VOUCHER_AUDIT_CASES.length} Tình Huống)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">
              Đã hoàn thành: {Object.keys(completedCases).length}/{VOUCHER_AUDIT_CASES.length}
            </span>
            {Object.keys(completedCases).length > 0 && (
              <button
                type="button"
                onClick={handleResetAllCases}
                className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                title="Đặt lại toàn bộ hồ sơ đã hoàn thành"
              >
                (Đặt lại)
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {VOUCHER_AUDIT_CASES.map((c) => {
            const isSelected = selectedCaseId === c.id;
            const score = completedCases[c.id];
            const isPassed = typeof score === 'number' && score >= 70;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCase(c.id)}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white dark:bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {c.categoryVi}
                    </span>
                    {typeof score === 'number' && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isPassed
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {score}đ
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                    {c.titleVi}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{formatVnd(c.totalAmount)}</span>
                  <span className="uppercase text-[10px] font-sans">
                    {c.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Audit Workspace: Voucher Display & Audit Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Authentic Voucher View */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border-2 border-slate-200 dark:border-slate-800 overflow-hidden font-sans">
            {/* Voucher Header */}
            <div className="p-5 bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {currentCase.voucherType === 'VAT_INVOICE'
                      ? `KÝ HIỆU: ${currentCase.invoiceSymbol} - SỐ: ${currentCase.invoiceNumber}`
                      : `MẪU SỐ: 02-TT - SỐ: ${currentCase.voucherCode || 'PC-0029'}`}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                    {currentCase.voucherType === 'VAT_INVOICE'
                      ? 'HÓA ĐƠN GIÁ TRỊ GIA TĂNG (ĐIỆN TỬ)'
                      : 'PHIẾU CHI TIỀN MẶT'}
                  </h2>
                  {currentCase.issueDate && (
                    <div className="text-xs text-slate-400">Ngày lập: {currentCase.issueDate}</div>
                  )}
                </div>

                {/* E-Invoice MCCQT or Internal Stamp */}
                {currentCase.voucherType === 'VAT_INVOICE' ? (
                  <div className="p-2.5 bg-emerald-100/70 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs space-y-1">
                    <div className="flex items-center space-x-1 font-bold text-emerald-800 dark:text-emerald-300 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Có mã của Cơ quan Thuế</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[220px]">
                      {currentCase.mccqt}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Chứng từ nội bộ tiền mặt
                  </div>
                )}
              </div>

              {/* VAT Invoice Seller & Buyer Info */}
              {currentCase.voucherType === 'VAT_INVOICE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Đơn vị bán hàng:</span>
                    <strong className="text-slate-900 dark:text-slate-100 block">
                      {currentCase.sellerNameVi}
                    </strong>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className="font-mono text-slate-600 dark:text-slate-400">
                        MST: {currentCase.sellerTaxCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTaxLookupModalOpen(true)}
                        className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 text-[10px] rounded font-semibold transition-colors"
                        title="Tra cứu trạng thái người nộp thuế trên cổng Tổng cục Thuế"
                      >
                        <Search className="w-2.5 h-2.5 mr-0.5" />
                        <span>Tra cứu MST</span>
                      </button>
                    </div>
                    {vendorStatusCheck.vendorTaxStatus !== '00' && (
                      <div
                        data-testid="vendor-tax-status-warning"
                        className={`mt-2 p-2 rounded-lg border text-[11px] space-y-0.5 ${
                          vendorStatusCheck.isFraudRisk
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                        }`}
                      >
                        <div className="font-bold flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>{vendorStatusCheck.statusNameVi}</span>
                        </div>
                        <p className="text-[10px] leading-tight">{vendorStatusCheck.explanationVi}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Đơn vị mua hàng:</span>
                    <strong className="text-slate-900 dark:text-slate-100 block">
                      {currentCase.buyerNameVi}
                    </strong>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      MST: {currentCase.buyerTaxCode}
                    </span>
                  </div>
                </div>
              )}

              {/* Internal Payment Voucher Particulars */}
              {currentCase.voucherType === 'PAYMENT_VOUCHER' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-400">Người nhận tiền: </span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {currentCase.receiverOrPayerNameVi || 'Nhân viên thanh toán'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Lý do chi: </span>
                    <span>{currentCase.reasonVi || 'Chi phí hoạt động sản xuất kinh doanh'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Kèm theo: </span>
                    <span className="italic text-slate-500">
                      {currentCase.attachedDocsVi || 'Hóa đơn / Giấy đề nghị thanh toán'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Line Items Table (For Invoice) */}
            {currentCase.items && currentCase.items.length > 0 && (
              <div className="p-4 overflow-x-auto border-b border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-2 px-2.5 text-center">STT</th>
                      <th className="py-2 px-2.5">Tên Hàng Hóa, Dịch Vụ</th>
                      <th className="py-2 px-2.5 text-center">ĐVT</th>
                      <th className="py-2 px-2.5 text-right">SL</th>
                      <th className="py-2 px-2.5 text-right">Đơn Giá</th>
                      <th className="py-2 px-2.5 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {currentCase.items.map((item) => (
                      <tr key={item.stt}>
                        <td className="py-2.5 px-2.5 text-center">{item.stt}</td>
                        <td className="py-2.5 px-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">
                          {item.itemNameVi}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-sans">{item.unitVi}</td>
                        <td className="py-2.5 px-2.5 text-right">{item.quantity}</td>
                        <td className="py-2.5 px-2.5 text-right">{formatVnd(item.unitPrice)}</td>
                        <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatVnd(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals & Payment Method Section */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="text-slate-500 dark:text-slate-400">
                  Phương thức thanh toán ghi nhận:{' '}
                  <strong
                    className={
                      currentCase.paymentMethod === 'CASH'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }
                  >
                    {currentCase.paymentMethod === 'CASH'
                      ? 'Tiền mặt (TM)'
                      : 'Chuyển khoản (CK) qua Ngân hàng'}
                  </strong>
                </div>
                <div className="text-[11px] text-slate-400">
                  {currentCase.voucherType === 'VAT_INVOICE'
                    ? 'Chứng từ gốc kèm theo: Biên lai thu tiền / Phiếu thu chi / UNC'
                    : 'Số tiền bằng chữ: Năm triệu đồng chẵn'}
                </div>
                {nonCashCheck.isViolated && (
                  <div
                    data-testid="non-cash-rule-warning"
                    className="mt-2 p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-200 space-y-0.5"
                  >
                    <div className="font-bold flex items-center space-x-1 text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Cảnh báo Vi phạm Thanh toán Tiền mặt &ge; 20 Triệu VNĐ</span>
                    </div>
                    <p className="text-[10px] leading-tight">{nonCashCheck.explanationVi}</p>
                  </div>
                )}
              </div>

              <div className="text-right space-y-1 font-mono text-xs">
                {currentCase.pretaxAmount !== undefined && (
                  <div>Cộng tiền hàng: {formatVnd(currentCase.pretaxAmount)}</div>
                )}
                {currentCase.vatAmount !== undefined && (
                  <div>
                    Thuế GTGT ({currentCase.taxRate || '10%'}): {formatVnd(currentCase.vatAmount)}
                  </div>
                )}
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-700">
                  Tổng thanh toán: {formatVnd(currentCase.totalAmount)}
                </div>
              </div>
            </div>

            {/* Signatures Panel for Internal Vouchers or Invoice */}
            {currentCase.signers && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Tình Trạng Chữ Ký Trên Chứng Từ (Segregation of Duties)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div
                    className={`p-2 rounded-xl border ${
                      currentCase.signers.director
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <span className="block text-[10px] text-slate-400 font-semibold">Giám Đốc (Duyệt)</span>
                    <div className="font-bold mt-1">
                      {currentCase.signers.director ? '✓ Đã ký duyệt' : '✗ THIẾU CHỮ KÝ'}
                    </div>
                  </div>

                  <div
                    className={`p-2 rounded-xl border ${
                      currentCase.signers.chiefAccountant
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <span className="block text-[10px] text-slate-400 font-semibold">Kế Toán Trưởng</span>
                    <div className="font-bold mt-1">
                      {currentCase.signers.chiefAccountant ? '✓ Đã ký' : '✗ THIẾU CHỮ KÝ'}
                    </div>
                  </div>

                  <div
                    className={`p-2 rounded-xl border ${
                      currentCase.signers.cashierOrStorekeeper
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <span className="block text-[10px] text-slate-400 font-semibold">Thủ Quỹ / Thủ Kho</span>
                    <div className="font-bold mt-1">
                      {currentCase.signers.cashierOrStorekeeper ? '✓ Đã ký' : '✗ THIẾU CHỮ KÝ'}
                    </div>
                  </div>

                  <div
                    className={`p-2 rounded-xl border ${
                      currentCase.signers.receiverOrPayer
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <span className="block text-[10px] text-slate-400 font-semibold">Người Nhận / Lập</span>
                    <div className="font-bold mt-1">
                      {currentCase.signers.receiverOrPayer ? '✓ Đã ký' : '✗ THIẾU CHỮ KÝ'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Interactive Audit Checklist & Statutory Assessment */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-1.5 font-bold text-sm text-slate-900 dark:text-slate-100">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>Bảng Kiểm Tra Soát Xét (Audit Checklist)</span>
              </div>
              <button
                type="button"
                onClick={handleResetCurrentCase}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center space-x-1"
                title="Đặt lại các tiêu chí và kết quả của hồ sơ hiện tại"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Đánh dấu vào các dấu hiệu sai phạm hoặc vi phạm pháp luật thuế mà bạn phát hiện thấy trên chứng từ này:
            </p>

            {/* Checkbox 1: Tax code status */}
            <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={submission.flagTaxCode}
                onChange={(e) =>
                  setSubmission((prev) => ({ ...prev, flagTaxCode: e.target.checked }))
                }
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  1. Rủi ro Mã số thuế người bán (Status 03/04)
                </span>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                  Bên bán đang tạm ngừng hoạt động hoặc đã bỏ trốn khỏi địa chỉ đăng ký kinh doanh.
                </span>
              </div>
            </label>

            {/* Checkbox 2: Cash payment >= 20M */}
            <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={submission.flagCashOver20M}
                onChange={(e) =>
                  setSubmission((prev) => ({ ...prev, flagCashOver20M: e.target.checked }))
                }
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  2. Vi phạm quy tắc thanh toán không dùng tiền mặt
                </span>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                  Hóa đơn có tổng thanh toán &ge; 20.000.000 VNĐ nhưng lại trả bằng Tiền mặt (TM) thay vì Ủy nhiệm chi chuyển khoản (TT 219/2013).
                </span>
              </div>
            </label>

            {/* Checkbox 3: Arithmetic VAT mismatch */}
            <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={submission.flagArithmetic}
                onChange={(e) =>
                  setSubmission((prev) => ({ ...prev, flagArithmetic: e.target.checked }))
                }
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  3. Sai lệch số học trên hóa đơn
                </span>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                  Tổng cộng thanh toán không khớp đúng với Tiền hàng trước thuế + Tiền thuế GTGT.
                </span>
              </div>
            </label>

            {/* Checkbox 4: Missing signatures */}
            <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={submission.flagMissingSignature}
                onChange={(e) =>
                  setSubmission((prev) => ({ ...prev, flagMissingSignature: e.target.checked }))
                }
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  4. Thiếu chữ ký thẩm quyền bắt buộc
                </span>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                  Thiếu chữ ký duyệt chi của Giám đốc hoặc Kế toán trưởng hoặc Thủ quỹ theo Luật Kế toán.
                </span>
              </div>
            </label>

            {/* Overall Conclusion Decision */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
                Kết Luận Kiểm Toán Cuối Cùng:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSubmission((prev) => ({ ...prev, overallDecision: 'VALID' }))
                  }
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    submission.overallDecision === 'VALID'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Chứng từ HỢP LỆ</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSubmission((prev) => ({ ...prev, overallDecision: 'INVALID' }))
                  }
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    submission.overallDecision === 'INVALID'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>CÓ SAI PHẠM</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmitAudit}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Chấm Điểm & Xem Giải Trình Pháp Lý</span>
            </button>
          </div>

          {/* Audit Result & Feedback Display */}
          {auditResult && (
            <div
              className={`p-5 rounded-2xl border space-y-4 animate-fade-in ${
                auditResult.isPerfect
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {auditResult.isPerfect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <span className="font-bold text-sm">Kết Quả Chấm Điểm Soát Xét</span>
                </div>
                <span className="text-base font-extrabold font-mono px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-slate-800 shadow-xs">
                  {auditResult.score}/100 ĐIỂM
                </span>
              </div>

              <p className="text-xs leading-relaxed">{auditResult.feedbackVi}</p>

              {/* Statutory Legal Rationale & Consequences Box */}
              <div className="p-4 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs text-slate-800 dark:text-slate-200">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Giải Trình Pháp Lý & Căn Cứ Thuế Chuyên Sâu</span>
                </div>

                <div>
                  <strong className="text-slate-600 dark:text-slate-400 block text-[11px]">
                    Căn cứ pháp lý:
                  </strong>
                  <span>{currentCase.statutoryBasis}</span>
                </div>

                <div>
                  <strong className="text-slate-600 dark:text-slate-400 block text-[11px]">
                    Hậu quả về Thuế GTGT đầu vào:
                  </strong>
                  <span className={currentCase.violates20mCashRule || currentCase.hasTaxCodeIssue ? 'text-rose-600 font-semibold' : ''}>
                    {currentCase.vatConsequenceVi}
                  </span>
                </div>

                <div>
                  <strong className="text-slate-600 dark:text-slate-400 block text-[11px]">
                    Hậu quả về Chi phí được trừ Thuế TNDN:
                  </strong>
                  <span className={currentCase.violates20mCashRule || currentCase.hasTaxCodeIssue ? 'text-rose-600 font-semibold' : ''}>
                    {currentCase.citConsequenceVi}
                  </span>
                </div>

                <div>
                  <strong className="text-slate-600 dark:text-slate-400 block text-[11px]">
                    Khuyến nghị kiểm soát & Xử lý sai phạm:
                  </strong>
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    {currentCase.remedyActionVi}
                  </span>
                </div>

                {/* Statutory Guardrails Breakdown for VAT Input and CIT Schedule B4 */}
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <div
                    data-testid="vat-input-consequence-card"
                    className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                      nonCashCheck.vatCreditable && vendorStatusCheck.vatCreditable
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between text-[11px]">
                      <span>1. Rào chắn Thuế GTGT đầu vào (TK 133):</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        nonCashCheck.vatCreditable && vendorStatusCheck.vatCreditable
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300'
                      }`}>
                        {nonCashCheck.vatCreditable && vendorStatusCheck.vatCreditable ? 'ĐỦ ĐIỀU KIỆN KHẤU TRỪ' : 'TỪ CHỐI KHẤU TRỪ'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {!nonCashCheck.vatCreditable
                        ? 'Vi phạm thanh toán bằng tiền mặt với giá trị từ 20 triệu VNĐ trở lên; toàn bộ số thuế GTGT đầu vào không đủ điều kiện khấu trừ theo luật định.'
                        : !vendorStatusCheck.vatCreditable
                        ? `Nhà cung cấp ở trạng thái ${vendorStatusCheck.vendorTaxStatus} (${vendorStatusCheck.statusNameVi}); hóa đơn không có giá trị pháp lý để khấu trừ thuế GTGT.`
                        : 'Hóa đơn đáp ứng quy chuẩn thanh toán và tư cách người bán để khấu trừ thuế GTGT đầu vào.'}
                    </p>
                  </div>

                  <div
                    data-testid="cit-deductible-consequence-card"
                    className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                      nonCashCheck.citDeductible && vendorStatusCheck.citDeductible
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between text-[11px]">
                      <span>2. Rào chắn Chi phí Thuế TNDN & Mục B4:</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        nonCashCheck.citDeductible && vendorStatusCheck.citDeductible
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300'
                      }`}>
                        {nonCashCheck.citDeductible && vendorStatusCheck.citDeductible ? 'ĐỦ ĐIỀU KIỆN TÍNH CP' : 'ĐIỀU CHỈNH TĂNG MỤC B4'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {!nonCashCheck.citDeductible
                        ? 'Chi phí mua hàng từ 20 triệu đồng không có chứng từ thanh toán ngân hàng bị loại trừ; bắt buộc cộng vào Chỉ tiêu B4 trên Tờ khai Quyết toán TNDN.'
                        : !vendorStatusCheck.citDeductible
                        ? 'Hóa đơn bất hợp pháp của doanh nghiệp tạm ngừng/bỏ trốn không được tính vào chi phí hợp lý; toàn bộ giá trị phải loại sang Chỉ tiêu B4.'
                        : 'Chi phí mua sắm hợp lý, có đầy đủ hóa đơn chứng từ và phương thức thanh toán hợp lệ theo luật thuế TNDN.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tax Code GDT Portal Lookup Modal Simulation */}
      {taxLookupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Cổng Thông Tin Tổng Cục Thuế — Tra Cứu Người Nộp Thuế
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTaxLookupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 font-mono">
                <div>
                  <span className="text-slate-400 font-sans">Mã số thuế: </span>
                  <strong className="text-slate-900 dark:text-slate-100">
                    {currentCase.sellerTaxCode}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">Tên người nộp thuế: </span>
                  <strong className="text-slate-900 dark:text-slate-100 font-sans">
                    {currentCase.sellerNameVi}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">Cơ quan thuế quản lý: </span>
                  <span className="font-sans">Cục Thuế TP. Hà Nội</span>
                </div>
              </div>

              {/* Status Indicator */}
              <div
                className={`p-4 rounded-xl border flex items-start space-x-3 ${
                  currentCase.vendorTaxStatus === '00'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}
              >
                {currentCase.vendorTaxStatus === '00' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {currentCase.vendorTaxStatus === '00' &&
                      'Trạng Thái 00: NNT Đang hoạt động (đã được cấp MST)'}
                    {currentCase.vendorTaxStatus === '03' &&
                      'Trạng Thái 03: NNT Tạm ngừng kinh doanh có thời hạn'}
                    {currentCase.vendorTaxStatus === '04' &&
                      'Trạng Thái 04: NNT Không hoạt động tại địa chỉ đã đăng ký'}
                  </div>
                  <p className="text-[11px] opacity-90 mt-1">
                    {currentCase.vendorTaxStatus === '00' &&
                      'Doanh nghiệp hoạt động bình thường theo quy định của pháp luật thuế.'}
                    {currentCase.vendorTaxStatus === '03' &&
                      'Doanh nghiệp đã nộp hồ sơ tạm ngừng kinh doanh. Trong thời gian tạm ngừng, doanh nghiệp không được phép xuất hóa đơn GTGT.'}
                    {currentCase.vendorTaxStatus === '04' &&
                      'Cơ quan thuế đã lập biên bản xác định doanh nghiệp bỏ trốn, không hoạt động tại trụ sở. Hóa đơn xuất phát sinh từ thời điểm này bị coi là bất hợp pháp.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setTaxLookupModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors"
              >
                Đóng tra cứu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherInspector;
