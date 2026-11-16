import { useMemo, useState, type FC, type ReactNode } from 'react';
import {
  Calculator,
  Store,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  Scale,
  FileWarning,
  Info,
  Landmark,
} from 'lucide-react';
import {
  calculateEcommerceSellerTaxObligation,
  reconcileSellerWithPlatform,
  STATUTORY_BASIS_ECOMMERCE_TAX,
  STATUTORY_BASIS_HOUSEHOLD_BUSINESS_THRESHOLD,
  HOUSEHOLD_BUSINESS_TAX_CODE_THRESHOLD,
  RECONCILIATION_VARIANCE_THRESHOLD_PERCENT,
  type SellerType,
  type EcommerceTransaction,
} from '@/services/tax/ecommerce-tax';
import {
  calculateRdAdditionalDeduction,
  STATUTORY_BASIS_RD_DEDUCTION,
  type RdProjectStatus,
} from '@/services/tax/rd-deduction';
import { STANDARD_CIT_RATE } from '@/services/tax/tax-guardrails';

/**
 * PHẦN 1a — E-Commerce Tax Inspector
 * Dùng pure functions của src/services/tax/ecommerce-tax.ts (không copy logic).
 *
 * PHẦN 1b — R&D Deduction Calculator
 * Dùng calculateRdAdditionalDeduction của src/services/tax/rd-deduction.ts.
 */

// Thuế suất TNDN 20% — tham số do engine tax-guardrails cung cấp (STANDARD_CIT_RATE).
// Căn cứ: Luật Thuế TNDN hiện hành (đã được sửa đổi bởi Luật số 67/2025/QH15).
export const STATUTORY_BASIS_CIT_RATE_20 =
  'Thuế suất thuế TNDN 20% theo Luật Thuế TNDN hiện hành (sửa đổi bởi Luật số 67/2025/QH15) — tham số STANDARD_CIT_RATE của engine tax-guardrails';

// Ngưỡng đối chiếu doanh thu 5% hiện CHƯA có statutoryBasis (TODO verify của engine).
export const RECONCILIATION_THRESHOLD_NOTE =
  `Ngưỡng ${RECONCILIATION_VARIANCE_THRESHOLD_PERCENT}% là ngưỡng tham khảo, chưa có statutoryBasis (TODO verify — chưa tìm được văn bản quy định số %.`;

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

function StatutoryBasisNote({ text, testId }: { text: string; testId?: string }) {
  return (
    <div
      data-testid={testId}
      className="mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start space-x-2"
    >
      <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
        <span className="font-bold text-slate-700 dark:text-slate-200">Căn cứ pháp lý: </span>
        {text}
      </p>
    </div>
  );
}

function ResultRow({
  label,
  value,
  emphasized,
  testId,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  testId?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 px-3 rounded-lg ${
        emphasized
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800'
          : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800'
      }`}
    >
      <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
      <span
        data-testid={testId}
        className={`font-mono font-bold text-sm ${emphasized ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-slate-100'}`}
      >
        {value}
      </span>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
      />
      {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

function parseAmount(raw: string): number {
  if (!raw.trim()) return 0;
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0 || !Number.isFinite(n)) return NaN;
  return n;
}

interface EcommerceFormState {
  sellerType: SellerType;
  grossRevenue: string;
  platformFee: string;
  vatWithheld: string;
  pitWithheld: string;
  enterpriseTaxableIncome: string;
  declaredRevenue: string;
  platformReportedRevenue: string;
}

const EMPTY_ECOMMERCE_FORM: EcommerceFormState = {
  sellerType: 'HOUSEHOLD_BUSINESS',
  grossRevenue: '',
  platformFee: '',
  vatWithheld: '',
  pitWithheld: '',
  enterpriseTaxableIncome: '',
  declaredRevenue: '',
  platformReportedRevenue: '',
};

const EcommerceInspector: FC = () => {
  const [form, setForm] = useState<EcommerceFormState>(EMPTY_ECOMMERCE_FORM);
  const update = (patch: Partial<EcommerceFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const computed = useMemo(() => {
    const gross = parseAmount(form.grossRevenue);
    const fee = parseAmount(form.platformFee);
    const vat = parseAmount(form.vatWithheld);
    const pit = parseAmount(form.pitWithheld);
    const taxableIncome = parseAmount(form.enterpriseTaxableIncome);
    const declared = parseAmount(form.declaredRevenue);
    const platformReported = parseAmount(form.platformReportedRevenue);

    const anyNegativeInvalid = [gross, fee, vat, pit, taxableIncome, declared, platformReported].some(
      (n) => Number.isNaN(n)
    );
    if (anyNegativeInvalid) {
      return { error: 'Số liệu nhập vào phải là số không âm hợp lệ. Vui lòng kiểm tra lại các ô nhập liệu.' };
    }
    if (fee > gross) {
      return { error: 'Phí sàn không được lớn hơn doanh thu gộm. Vui lòng kiểm tra lại.' };
    }

    const hasRevenueInput = gross > 0 || declared > 0 || platformReported > 0;
    if (!hasRevenueInput) return { empty: true as const };

    const transaction: EcommerceTransaction = {
      platform: 'SHOPEE',
      sellerType: form.sellerType,
      sellerName: form.sellerType === 'ENTERPRISE' ? 'Doanh nghiệp trên sàn TMĐT' : 'Hộ kinh doanh trên sàn TMĐT',
      grossRevenue: gross,
      platformFee: fee,
      netRevenue: gross - fee,
      vatRate: 0,
      vatAmount: vat,
      pitAmount: pit,
      transactionDate: '',
    };

    const obligation = calculateEcommerceSellerTaxObligation(
      [transaction],
      '11/2026',
      {
        name: form.sellerType === 'ENTERPRISE' ? 'Doanh nghiệp trên sàn TMĐT' : 'Hộ kinh doanh trên sàn TMĐT',
        type: form.sellerType,
      },
      form.sellerType === 'ENTERPRISE' ? { enterpriseTaxableIncome: taxableIncome } : undefined
    );

    const reconciliation =
      declared > 0 || platformReported > 0
        ? reconcileSellerWithPlatform(declared, platformReported)
        : null;

    return { obligation, reconciliation };
  }, [form]);

  const obligation = 'obligation' in computed ? computed.obligation : null;
  const reconciliation = 'reconciliation' in computed ? computed.reconciliation : null;

  return (
    <div className="space-y-5" data-testid="ecommerce-tax-inspector">
      {/* Form input */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center space-x-2">
          <Store className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Inspector Thuế Người Bán Trên Sàn TMĐT
          </h3>
        </div>

        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
          <button
            type="button"
            data-testid="seller-type-household"
            onClick={() => update({ sellerType: 'HOUSEHOLD_BUSINESS' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              form.sellerType === 'HOUSEHOLD_BUSINESS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Hộ kinh doanh / cá nhân
          </button>
          <button
            type="button"
            data-testid="seller-type-enterprise"
            onClick={() => update({ sellerType: 'ENTERPRISE' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              form.sellerType === 'ENTERPRISE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Doanh nghiệp
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldInput
            label="Doanh thu gộm trên sàn (VNĐ)"
            value={form.grossRevenue}
            onChange={(v) => update({ grossRevenue: v })}
            placeholder="VD: 1200000000"
            hint="Doanh thu gộm trước khi trừ phí sàn"
          />
          <FieldInput
            label="Phí sàn TMĐT (VNĐ)"
            value={form.platformFee}
            onChange={(v) => update({ platformFee: v })}
            placeholder="VD: 50000000"
          />
          <FieldInput
            label="Thuế GTGT sàn đã khấu trừ (VNĐ)"
            value={form.vatWithheld}
            onChange={(v) => update({ vatWithheld: v })}
            hint="NĐ 117/2025: sàn khấu trừ, khai & nộp thay"
          />
          {form.sellerType === 'HOUSEHOLD_BUSINESS' ? (
            <FieldInput
              label="Thuế TNCN sàn đã khấu trừ (VNĐ)"
              value={form.pitWithheld}
              onChange={(v) => update({ pitWithheld: v })}
            />
          ) : (
            <FieldInput
              label="Thu nhập chịu thuế TNDN (VNĐ)"
              value={form.enterpriseTaxableIncome}
              onChange={(v) => update({ enterpriseTaxableIncome: v })}
              hint="CIT = thu nhập chịu thuế × 20% (KHÔNG tính trên doanh thu)"
            />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <FieldInput
            label="Doanh thu tự khai báo (VNĐ)"
            value={form.declaredRevenue}
            onChange={(v) => update({ declaredRevenue: v })}
            hint="Đối chiếu với dữ liệu sàn khi quyết toán"
          />
          <FieldInput
            label="Doanh thu sàn báo cáo (VNĐ)"
            value={form.platformReportedRevenue}
            onChange={(v) => update({ platformReportedRevenue: v })}
          />
        </div>
      </div>

      {/* Error state */}
      {'error' in computed && computed.error && (
        <div
          data-testid="ecommerce-error-state"
          className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-start space-x-2"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-800 dark:text-rose-200">{computed.error}</p>
        </div>
      )}

      {/* Empty state */}
      {'empty' in computed && computed.empty && (
        <div
          data-testid="ecommerce-empty-state"
          className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2"
        >
          <Info className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Nhập doanh thu sàn để xem nghĩa vụ thuế
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Kết quả gồm: khấu trừ của sàn (NĐ 117/2025), ngưỡng 1 tỷ của hộ kinh doanh (NĐ 141/2026
            sửa NĐ 68/2026) và CIT 20% cho doanh nghiệp — mỗi kết luận kèm căn cứ pháp lý.
          </p>
        </div>
      )}

      {/* Results */}
      {obligation && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3" data-testid="ecommerce-results">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Kết quả nghĩa vụ thuế (kỳ 11/2026)
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <ResultRow label="Doanh thu gộm" value={formatVnd(obligation.totalGrossRevenue)} testId="ecom-gross-revenue" />
            <ResultRow label="Phí sàn TMĐT" value={formatVnd(obligation.totalPlatformFee)} />
            <ResultRow label="Doanh thu ròng" value={formatVnd(obligation.totalNetRevenue)} testId="ecom-net-revenue" />
            <ResultRow label="GTGT sàn đã khấu trừ & nộp thay" value={formatVnd(obligation.vatWithheldByPlatform)} />
            {form.sellerType === 'HOUSEHOLD_BUSINESS' && (
              <ResultRow label="TNCN sàn đã khấu trừ & nộp thay" value={formatVnd(obligation.pitWithheldByPlatform)} />
            )}
            <ResultRow
              label="Tổng thuế sàn đã nộp thay (Cổng thuế điện tử TMĐT)"
              value={formatVnd(obligation.totalTaxRemittedByPlatform)}
            />
            {form.sellerType === 'ENTERPRISE' && (
              <ResultRow
                label="TNDN tự khai = thu nhập chịu thuế × 20%"
                value={formatVnd(obligation.citSelfDeclared)}
                emphasized
                testId="ecom-cit-self-declared"
              />
            )}
          </div>

          {/* Statutory basis per conclusion */}
          <StatutoryBasisNote text={STATUTORY_BASIS_ECOMMERCE_TAX} testId="ecom-basis-nd117" />
          {form.sellerType === 'ENTERPRISE' && (
            <StatutoryBasisNote text={STATUTORY_BASIS_CIT_RATE_20} testId="ecom-basis-cit-rate" />
          )}
          {obligation.totalGrossRevenue > HOUSEHOLD_BUSINESS_TAX_CODE_THRESHOLD &&
            form.sellerType === 'HOUSEHOLD_BUSINESS' && (
              <div data-testid="ecom-threshold-warning" className="space-y-1">
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start space-x-2">
                  <FileWarning className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-900 dark:text-amber-200">
                    Doanh thu vượt ngưỡng {formatVnd(HOUSEHOLD_BUSINESS_TAX_CODE_THRESHOLD)}/năm — bắt buộc
                    đăng ký mã số thuế, không chịu GTGT/TNCN theo tỷ lệ % trên doanh thu.
                  </p>
                </div>
                <StatutoryBasisNote
                  text={STATUTORY_BASIS_HOUSEHOLD_BUSINESS_THRESHOLD}
                  testId="ecom-basis-nd141"
                />
              </div>
            )}

          {obligation.discrepancies.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-1" data-testid="ecom-discrepancies">
              {obligation.discrepancies.map((d, i) => (
                <p key={i} className="text-[11px] text-amber-900 dark:text-amber-200 flex items-start space-x-1.5">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{d}</span>
                </p>
              ))}
            </div>
          )}

          {/* Reconciliation */}
          {reconciliation && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2" data-testid="ecom-reconciliation">
              <div className="flex items-center space-x-2">
                {reconciliation.reconciled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Đối chiếu doanh thu tự khai vs dữ liệu sàn —{' '}
                  {reconciliation.reconciled ? 'KHỚP' : 'LỆCH'}
                </span>
              </div>
              <ResultRow label="Chênh lệch" value={formatVnd(reconciliation.variance)} />
              <ResultRow
                label="Tỷ lệ chênh lệch"
                value={`${reconciliation.variancePercent.toFixed(1)}%`}
                testId="ecom-variance-percent"
              />
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {reconciliation.explanationVi}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {RECONCILIATION_THRESHOLD_NOTE}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface RdFormState {
  mostApproved: string;
  otherQualifying: string;
  nonQualifying: string;
}

const EMPTY_RD_FORM: RdFormState = { mostApproved: '', otherQualifying: '', nonQualifying: '' };

const RdDeductionCalculator: FC = () => {
  const [form, setForm] = useState<RdFormState>(EMPTY_RD_FORM);
  const update = (patch: Partial<RdFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const computed = useMemo(() => {
    const most = parseAmount(form.mostApproved);
    const other = parseAmount(form.otherQualifying);
    const non = parseAmount(form.nonQualifying);
    if ([most, other, non].some((n) => Number.isNaN(n))) {
      return { error: 'Chi phí nhập vào phải là số không âm hợp lệ. Vui lòng kiểm tra lại.' };
    }
    if (most === 0 && other === 0 && non === 0) return { empty: true as const };

    const items = [
      { id: 'rd-most', descriptionVi: 'Chi phí dự án R&D được Bộ KHCN phê duyệt', amount: most, projectStatus: 'MOST_APPROVED' as RdProjectStatus },
      { id: 'rd-other', descriptionVi: 'Chi phí R&D đủ điều kiện khác', amount: other, projectStatus: 'OTHER_QUALIFYING' as RdProjectStatus },
      { id: 'rd-non', descriptionVi: 'Chi phí không đủ điều kiện khấu trừ thêm', amount: non, projectStatus: 'NON_QUALIFYING' as RdProjectStatus },
    ];

    return { result: calculateRdAdditionalDeduction(items) };
  }, [form]);

  return (
    <div className="space-y-5" data-testid="rd-deduction-calculator">
      {/* Form input */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center space-x-2">
          <FlaskConical className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Máy Tính Khấu Trừ R&D (200% / 150%) khi Quyết toán TNDN
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FieldInput
            label="Chi phí dự án được Bộ KHCN phê duyệt (VNĐ)"
            value={form.mostApproved}
            onChange={(v) => update({ mostApproved: v })}
            placeholder="VD: 5000000000"
            hint="Khấu trừ 200% (thêm 100%)"
          />
          <FieldInput
            label="Chi phí R&D đủ điều kiện khác (VNĐ)"
            value={form.otherQualifying}
            onChange={(v) => update({ otherQualifying: v })}
            hint="Khấu trừ 150% (thêm 50%)"
          />
          <FieldInput
            label="Chi phí không đủ điều kiện (VNĐ)"
            value={form.nonQualifying}
            onChange={(v) => update({ nonQualifying: v })}
            hint="Chỉ khấu trừ bình thường 100%"
          />
        </div>
      </div>

      {'error' in computed && computed.error && (
        <div
          data-testid="rd-error-state"
          className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-start space-x-2"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-800 dark:text-rose-200">{computed.error}</p>
        </div>
      )}

      {'empty' in computed && computed.empty && (
        <div
          data-testid="rd-empty-state"
          className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2"
        >
          <Info className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Nhập chi phí R&D để xem mức khấu trừ thêm
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Kết quả gồm: chi phí gốc, mức giảm thu nhập chịu thuế (khấu trừ thêm), số thuế TNDN tiết
            kiệm (× 20%) và vị trí kê khai Chỉ tiêu B4 trên Tờ khai QTT TNDN.
          </p>
        </div>
      )}

      {'result' in computed && computed.result && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3" data-testid="rd-results">
          {(() => {
            const r = computed.result!;
            const citSaved = r.totalAdditionalDeduction * STANDARD_CIT_RATE;
            return (
              <>
                <div className="grid grid-cols-1 gap-2">
                  <ResultRow label="Tổng chi phí R&D nhập vào (chi phí gốc)" value={formatVnd(r.totalRdExpenses)} testId="rd-total-expenses" />
                  <ResultRow label="— Trong đó: dự án Bộ KHCN phê duyệt (200%)" value={formatVnd(r.mostApprovedExpenses)} />
                  <ResultRow label="— Trong đó: R&D đủ điều kiện khác (150%)" value={formatVnd(r.otherQualifyingExpenses)} />
                  <ResultRow
                    label="Mức giảm thu nhập chịu thuế (khấu trừ thêm)"
                    value={formatVnd(r.totalAdditionalDeduction)}
                    emphasized
                    testId="rd-additional-deduction"
                  />
                  <ResultRow
                    label={`Số thuế TNDN tiết kiệm (khấu trừ thêm × ${STANDARD_CIT_RATE * 100}%)`}
                    value={formatVnd(citSaved)}
                    emphasized
                    testId="rd-cit-saved"
                  />
                </div>

                <div
                  className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 space-y-1"
                  data-testid="rd-b4-reference"
                >
                  <p className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    Kê khai tại Chỉ tiêu B4 — Tờ khai Quyết toán thuế TNDN
                  </p>
                  <p className="text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed">
                    Điều chỉnh giảm thu nhập chịu thuế: {formatVnd(r.citAdjustmentB4)} (số âm = giảm).
                    Phần khấu trừ thêm chỉ kê khai tại Chỉ tiêu B4 khi quyết toán, không ghi thêm bút
                    toán vào sổ kế toán — trình bày khớp Lộ trình học module-08, bài c24-6.
                  </p>
                </div>

                <pre className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] whitespace-pre-wrap font-sans text-slate-600 dark:text-slate-300 leading-relaxed">
                  {r.explanationVi}
                </pre>

                <StatutoryBasisNote text={STATUTORY_BASIS_RD_DEDUCTION} testId="rd-basis-law67" />
                <StatutoryBasisNote text={STATUTORY_BASIS_CIT_RATE_20} testId="rd-basis-cit-rate" />
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export const TaxComplianceTools: FC = () => {
  const [activeTool, setActiveTool] = useState<'ecommerce' | 'rd'>('ecommerce');

  const tools: { key: 'ecommerce' | 'rd'; labelVi: string; icon: ReactNode; testId: string }[] = [
    { key: 'ecommerce', labelVi: 'Thuế TMĐT (NĐ 117/2025 & NĐ 141/2026)', icon: <Store className="w-4 h-4" />, testId: 'tool-tab-ecommerce' },
    { key: 'rd', labelVi: 'Khấu trừ R&D 200% (Luật 67/2025 & NĐ 320/2025)', icon: <FlaskConical className="w-4 h-4" />, testId: 'tool-tab-rd' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12" data-testid="tax-compliance-tools">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          <Calculator className="w-4 h-4" />
          <span>Phòng Công Cụ Tuân Thủ Thuế 2025–2026</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Thuế TMĐT &amp; Khấu Trừ R&D
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
          Hai công cụ tính toán trực tiếp trên engine tuân thủ thuế của hệ thống: (1) nghĩa vụ thuế
          người bán trên sàn TMĐT với ngưỡng hộ kinh doanh 1 tỷ đồng/năm và đối chiếu dữ liệu sàn;
          (2) khấu trừ thêm chi phí R&D khi quyết toán thuế TNDN. Mọi kết luận đều hiển thị căn cứ
          pháp lý (statutoryBasis) truy vết được về văn bản gốc.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/70">
          Đối chiếu song song: Quy định nền tảng hiện hành (Thông tư 219/2013/TT-BTC, Thông tư 78/2014/TT-BTC, Thông tư 200/2014/TT-BTC) kèm các cập nhật mới (Luật Thuế GTGT 48/2024/QH15, Thông tư 69/2025/TT-BTC, Thông tư 20/2026/TT-BTC).
        </p>

        {/* Tool switcher */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {tools.map((tool) => (
            <button
              key={tool.key}
              type="button"
              data-testid={tool.testId}
              onClick={() => setActiveTool(tool.key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTool === tool.key
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tool.icon}
              <span>{tool.labelVi}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTool === 'ecommerce' ? <EcommerceInspector /> : <RdDeductionCalculator />}
    </div>
  );
};
