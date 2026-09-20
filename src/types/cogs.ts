/**
 * COGS & Cost Accounting Workbench Types
 * Vietnamese Accounting Standards (VAS 02 / IAS 2, TT 200, TT 133, TT 99/2025)
 * & Corporate Income Tax Regulations (TT 96/2015, TT 78/2014, TT 80/2021)
 */

export type CostingMethod =
  | 'FIFO'
  | 'PERIODIC_WEIGHTED_AVERAGE'
  | 'MOVING_WEIGHTED_AVERAGE'
  | 'LIFO';

export type VoucherType = 'PNK' | 'PXK' | 'XKNB_03';

export type AccountingRegime = 'CIRCULAR_200' | 'CIRCULAR_133' | 'CIRCULAR_99';

export type WipMethod = 'DIRECT_MATERIAL' | 'EQUIVALENT_UNITS';

export interface InventoryLot {
  id: string;
  date: string;
  voucherCode?: string;
  quantity: number;
  unitPrice: number;
  remainingQuantity?: number;
}

export interface StockTransaction {
  id: string;
  date: string;
  voucherCode: string;
  voucherType: VoucherType;
  description: string;
  quantity: number;
  unitPrice?: number;
  targetAccount?: '632' | '157' | '156';
}

export interface StockCardRow {
  id: string;
  date: string;
  voucherCode: string;
  voucherType: VoucherType;
  description: string;
  targetAccount: string;
  inQty: number;
  inPrice: number;
  inAmount: number;
  outQty: number;
  outPrice: number;
  outAmount: number;
  balanceQty: number;
  balancePrice: number;
  balanceAmount: number;
  isNegativeStock?: boolean;
  explanationVi?: string;
}

export interface StockCardResult {
  rows: StockCardRow[];
  totalInQty: number;
  totalInAmount: number;
  totalOutQty: number;
  totalOutAmount: number;
  totalCogsAmount: number;
  endingBalanceQty: number;
  endingBalanceAmount: number;
  method: CostingMethod;
  hasNegativeStock: boolean;
  lifoProhibitedWarning?: boolean;
  lifoProhibitedExplanationVi?: string;
  isConserved: boolean;
  roundingDiff: number;
}

export interface CalculateStockCardOptions {
  strict?: boolean; // When true, throws NegativeStockError on negative/zero stock dispatch
}

export interface JournalEntryItem {
  debitAccount: string;
  creditAccount: string;
  amount: number;
  descriptionVi: string;
}

export interface ScheduleB4Adjustment {
  code: string;
  amount: number;
  reasonVi: string;
  statutoryBasis?: string;
}

export interface ManufacturingCostInput {
  regime: AccountingRegime;
  beginningWip: number;
  actualDirectMaterial: number;
  actualDirectLabor: number;
  actualOverhead: number;
  normalDirectMaterial?: number;
  normalDirectLabor?: number;
  finishedUnits: number;
  endingWipUnits: number;
  wipMethod: WipMethod;
  completionPercentage?: number;
}

export interface ManufacturingCostOutput {
  normalMaterialCost: number;
  abnormalMaterialCost: number;
  normalLaborCost: number;
  abnormalLaborCost: number;
  overheadCost: number;
  totalEligibleCost: number;
  endingWipCost: number;
  totalCostZ: number;
  unitCostZ: number;
  cogsDirectExpense: number; // Nợ 632
  citTaxImpact: number;      // Chỉ tiêu B4 x 20%
  scheduleB4Amount: number;  // Chỉ tiêu B4
  scheduleB4Item?: ScheduleB4Adjustment;
  scheduleB4Adjustments: ScheduleB4Adjustment[];
  journalEntries: JournalEntryItem[];
  warningVi?: string;
}

export interface ComparisonMatrixRow {
  method: CostingMethod;
  methodLabelVi: string;
  cogsAmount: number;           // TK 632 (Mã 11 B02)
  endingInventoryValue: number; // TK 156 (Mã 140 B01)
  grossProfit: number;          // Mã 20 B02
  citExpense: number;           // Thuế TNDN 20%
  netProfitAfterTax: number;    // LNST (Mã 60 B02)
  grossMarginPercent: number;   // Biên LN gộp (%)
}

export interface ComparisonMatrixResult {
  rows: ComparisonMatrixRow[];
  revenue: number;
  maxCogsMethod: CostingMethod;
  minCogsMethod: CostingMethod;
  trend: 'INFLATION' | 'DEFLATION' | 'STABLE';
  executiveInsightsVi: string[];
}

export interface CogsState {
  initialLots: InventoryLot[];
  transactions: StockTransaction[];
  selectedMethod: CostingMethod;
  manufacturingInput: ManufacturingCostInput;
  activeSubTab?: 'stock-card' | 'manufacturing' | 'comparison';
  selectedScenarioId?: string;
}
