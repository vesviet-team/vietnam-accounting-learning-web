/**
 * Core Calculation Engine for COGS & Cost Accounting Workbench
 * Vietnam Accounting Standards (VAS 02 / IAS 2, Circular 200, Circular 133, Circular 99/2025)
 * & CIT Law (Decree 123/2020, Decree 70/2025, Circular 96/2015, Circular 78/2014)
 *
 * Zero external dependencies, pure functions, sub-millisecond execution latency (<0.1ms).
 */

import {
  CostingMethod,
  InventoryLot,
  StockTransaction,
  StockCardRow,
  StockCardResult,
  CalculateStockCardOptions,
  ManufacturingCostInput,
  ManufacturingCostOutput,
  JournalEntryItem,
  ScheduleB4Adjustment,
  ComparisonMatrixResult,
  ComparisonMatrixRow,
} from '../types/cogs';

export const LIFO_PROHIBITED_EXPLANATION_VI =
  'Phương pháp LIFO (Nhập sau - Xuất trước) đã bị bãi bỏ tại Việt Nam theo Chuẩn mực Kế toán VAS 02, Thông tư 200/2014/TT-BTC, Thông tư 133/2016/TT-BTC và Thông tư 99/2025/TT-BTC, đồng thời bị cấm theo Chuẩn mực Quốc tế IAS 2 do làm bóp méo giá trị tài sản hàng tồn kho trên Bảng cân đối kế toán trong bối cảnh giá cả biến động.';

export class NegativeStockError extends Error {
  readonly code = 'NEGATIVE_STOCK_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'NegativeStockError';
  }
}

export class ZeroStockBoundaryError extends Error {
  readonly code = 'ZERO_STOCK_BOUNDARY_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ZeroStockBoundaryError';
  }
}

interface WorkingLot {
  id: string;
  date: string;
  voucherCode?: string;
  quantity: number;
  unitPrice: number;
  remainingQuantity: number;
}

/**
 * Calculates stock card rows and summary under the FIFO (First-In, First-Out) method.
 * VAS 02 Paragraph 13, 14 & Circular 200/99.
 */
export function calculateFifo(
  initialInventory: InventoryLot[] = [],
  transactions: StockTransaction[] = [],
  options?: CalculateStockCardOptions
): StockCardResult {
  return runStockCardEngine('FIFO', initialInventory, transactions, options);
}

/**
 * Calculates stock card rows and summary under the Periodic Weighted Average method.
 * A single average rate is computed across the entire accounting period.
 * VAS 02 Paragraph 15 & Circular 200 / Circular 133.
 */
export function calculatePeriodicWeightedAverage(
  initialInventory: InventoryLot[] = [],
  transactions: StockTransaction[] = [],
  options?: CalculateStockCardOptions
): StockCardResult {
  return runStockCardEngine('PERIODIC_WEIGHTED_AVERAGE', initialInventory, transactions, options);
}

/**
 * Calculates stock card rows and summary under the Moving / Continuous Weighted Average method.
 * Unit cost is recalculated dynamically upon each receipt transaction.
 * VAS 02 Paragraph 15 & ERP best practices.
 */
export function calculateMovingWeightedAverage(
  initialInventory: InventoryLot[] = [],
  transactions: StockTransaction[] = [],
  options?: CalculateStockCardOptions
): StockCardResult {
  return runStockCardEngine('MOVING_WEIGHTED_AVERAGE', initialInventory, transactions, options);
}

/**
 * Dispatches stock card calculation according to the chosen CostingMethod.
 * If method === 'LIFO', flags statutory prohibition warning and explainer.
 */
export function calculateStockCard(
  method: CostingMethod,
  initialInventory: InventoryLot[] = [],
  transactions: StockTransaction[] = [],
  options?: CalculateStockCardOptions
): StockCardResult {
  const result = runStockCardEngine(method, initialInventory, transactions, options);
  if (method === 'LIFO') {
    result.lifoProhibitedWarning = true;
    result.lifoProhibitedExplanationVi = LIFO_PROHIBITED_EXPLANATION_VI;
  }
  return result;
}

/**
 * Core engine implementation supporting FIFO, Periodic Weighted Average, Moving Weighted Average, and LIFO.
 */
function runStockCardEngine(
  method: CostingMethod,
  initialInventory: InventoryLot[] = [],
  transactions: StockTransaction[] = [],
  options?: CalculateStockCardOptions
): StockCardResult {
  let initialQty = 0;
  let initialAmount = 0;
  const initialLots: WorkingLot[] = [];

  for (const lot of initialInventory) {
    const qty = Math.max(0, lot.quantity);
    const price = Math.max(0, lot.unitPrice);
    const amount = Math.round(qty * price);
    initialQty += qty;
    initialAmount += amount;
    initialLots.push({
      id: lot.id,
      date: lot.date,
      voucherCode: lot.voucherCode,
      quantity: qty,
      unitPrice: price,
      remainingQuantity: lot.remainingQuantity !== undefined ? lot.remainingQuantity : qty,
    });
  }

  // Pre-calculate periodic weighted average rate if needed
  let periodicAvgRate = 0;
  if (method === 'PERIODIC_WEIGHTED_AVERAGE') {
    let totalInQty = initialQty;
    let totalInValue = initialAmount;
    for (const tx of transactions) {
      if (tx.voucherType === 'PNK') {
        const qty = Math.max(0, tx.quantity);
        const price = Math.max(0, tx.unitPrice ?? 0);
        totalInQty += qty;
        totalInValue += Math.round(qty * price);
      }
    }
    periodicAvgRate = totalInQty > 0 ? totalInValue / totalInQty : 0;
  }

  const rows: StockCardRow[] = [];
  const activeLots: WorkingLot[] = initialLots.map((l) => ({ ...l }));

  let currentBalanceQty = initialQty;
  let currentBalanceAmount = initialAmount;
  let totalInQty = 0;
  let totalInAmount = 0;
  let totalOutQty = 0;
  let totalOutAmount = 0;
  let totalCogsAmount = 0;
  let hasNegativeStock = false;

  for (const tx of transactions) {
    const isReceipt = tx.voucherType === 'PNK';
    const isOutbound = tx.voucherType === 'PXK' || tx.voucherType === 'XKNB_03';

    if (isReceipt) {
      const inQty = Math.max(0, tx.quantity);
      const inPrice = Math.max(0, tx.unitPrice ?? 0);
      const inAmount = Math.round(inQty * inPrice);

      totalInQty += inQty;
      totalInAmount += inAmount;
      currentBalanceQty += inQty;
      currentBalanceAmount += inAmount;

      const balancePrice =
        currentBalanceQty > 0 ? Math.round((currentBalanceAmount / currentBalanceQty) * 100) / 100 : 0;

      activeLots.push({
        id: tx.id,
        date: tx.date,
        voucherCode: tx.voucherCode,
        quantity: inQty,
        unitPrice: inPrice,
        remainingQuantity: inQty,
      });

      rows.push({
        id: tx.id,
        date: tx.date,
        voucherCode: tx.voucherCode,
        voucherType: tx.voucherType,
        description: tx.description,
        targetAccount: tx.targetAccount ?? '156',
        inQty,
        inPrice,
        inAmount,
        outQty: 0,
        outPrice: 0,
        outAmount: 0,
        balanceQty: currentBalanceQty,
        balancePrice,
        balanceAmount: currentBalanceAmount,
        isNegativeStock: false,
      });
    } else if (isOutbound) {
      const outQty = Math.max(0, tx.quantity);
      const targetAccount =
        tx.targetAccount ?? (tx.voucherType === 'XKNB_03' ? '157' : '632');

      const availableQtyBefore = currentBalanceQty;
      let rowIsNegative = false;
      let rowExplanation = '';

      if (availableQtyBefore === 0 && outQty > 0) {
        if (options?.strict) {
          throw new ZeroStockBoundaryError(
            `Không có hàng trong kho để xuất (tồn kho: 0, yêu cầu xuất: ${outQty}) tại chứng từ ${tx.voucherCode}`
          );
        }
        rowIsNegative = true;
        hasNegativeStock = true;
        rowExplanation = `Cảnh báo: Tồn kho bằng 0 khi xuất ${outQty} sản phẩm.`;
      } else if (outQty > availableQtyBefore) {
        if (options?.strict) {
          throw new NegativeStockError(
            `Số lượng xuất kho (${outQty}) vượt quá lượng hàng tồn khả dụng (${availableQtyBefore}) tại chứng từ ${tx.voucherCode}`
          );
        }
        rowIsNegative = true;
        hasNegativeStock = true;
        rowExplanation = `Cảnh báo xuất âm kho: Yêu cầu ${outQty} sp > tồn khả dụng ${availableQtyBefore} sp.`;
      }

      let outAmount = 0;
      let outPrice = 0;

      if (method === 'FIFO') {
        let needed = outQty;
        const slices: string[] = [];

        for (const lot of activeLots) {
          if (lot.remainingQuantity > 0 && needed > 0) {
            const take = Math.min(needed, lot.remainingQuantity);
            const lotAmount = take * lot.unitPrice;
            outAmount += lotAmount;
            lot.remainingQuantity -= take;
            needed -= take;
            slices.push(`${take} sp @ ${lot.unitPrice.toLocaleString('vi-VN')}đ`);
          }
        }

        if (needed > 0) {
          // Unfunded portion (exceeds lots)
          const fallbackPrice =
            activeLots.length > 0 ? activeLots[activeLots.length - 1].unitPrice : (tx.unitPrice ?? 0);
          outAmount += needed * fallbackPrice;
          slices.push(`thiếu ${needed} sp âm kho`);
        }

        outAmount = Math.round(outAmount);
        outPrice = outQty > 0 ? Math.round((outAmount / outQty) * 100) / 100 : 0;
        if (!rowExplanation && slices.length > 0) {
          rowExplanation = `FIFO: ${slices.join('; ')}`;
        }
      } else if (method === 'LIFO') {
        // LIFO (reverse queue iteration for educational audit)
        let needed = outQty;
        const slices: string[] = [];

        for (let i = activeLots.length - 1; i >= 0; i--) {
          const lot = activeLots[i];
          if (lot.remainingQuantity > 0 && needed > 0) {
            const take = Math.min(needed, lot.remainingQuantity);
            const lotAmount = take * lot.unitPrice;
            outAmount += lotAmount;
            lot.remainingQuantity -= take;
            needed -= take;
            slices.push(`${take} sp @ ${lot.unitPrice.toLocaleString('vi-VN')}đ`);
          }
        }

        if (needed > 0) {
          const fallbackPrice =
            activeLots.length > 0 ? activeLots[0].unitPrice : (tx.unitPrice ?? 0);
          outAmount += needed * fallbackPrice;
        }

        outAmount = Math.round(outAmount);
        outPrice = outQty > 0 ? Math.round((outAmount / outQty) * 100) / 100 : 0;
        rowExplanation = `LIFO (Bị bãi bỏ): ${slices.join('; ')}`;
      } else if (method === 'PERIODIC_WEIGHTED_AVERAGE') {
        outPrice = Math.round(periodicAvgRate * 100) / 100;
        outAmount = Math.round(outQty * periodicAvgRate);
        if (!rowExplanation) {
          rowExplanation = `BQ cả kỳ: Đơn giá cố định ${periodicAvgRate.toFixed(2)}đ/sp`;
        }
      } else if (method === 'MOVING_WEIGHTED_AVERAGE') {
        const movingRate =
          currentBalanceQty > 0 ? currentBalanceAmount / currentBalanceQty : 0;
        outPrice = Math.round(movingRate * 100) / 100;
        outAmount = Math.round(outQty * movingRate);
        if (!rowExplanation) {
          rowExplanation = `BQ liên hoàn: Đơn giá thời điểm ${movingRate.toFixed(2)}đ/sp`;
        }
      }

      totalOutQty += outQty;
      totalOutAmount += outAmount;
      if (targetAccount === '632') {
        totalCogsAmount += outAmount;
      }

      currentBalanceQty -= outQty;
      currentBalanceAmount -= outAmount;

      const balancePrice =
        currentBalanceQty > 0 ? Math.round((currentBalanceAmount / currentBalanceQty) * 100) / 100 : 0;

      rows.push({
        id: tx.id,
        date: tx.date,
        voucherCode: tx.voucherCode,
        voucherType: tx.voucherType,
        description: tx.description,
        targetAccount,
        inQty: 0,
        inPrice: 0,
        inAmount: 0,
        outQty,
        outPrice,
        outAmount,
        balanceQty: currentBalanceQty,
        balancePrice,
        balanceAmount: currentBalanceAmount,
        isNegativeStock: rowIsNegative,
        explanationVi: rowExplanation || undefined,
      });
    }
  }

  // Stock conservation invariant check:
  // V_dk + sum(V_in) == sum(V_out) + V_ck (within +- 1 VND arithmetic precision)
  const totalInflow = initialAmount + totalInAmount;
  const totalOutflowAndEnding = totalOutAmount + currentBalanceAmount;
  const roundingDiff = totalInflow - totalOutflowAndEnding;
  const isConserved = Math.abs(roundingDiff) <= 1;

  // Apply penny rounding correction to balance amount if needed to guarantee exact equality
  let finalEndingAmount = currentBalanceAmount;
  if (isConserved && roundingDiff !== 0 && rows.length > 0) {
    finalEndingAmount += roundingDiff;
    rows[rows.length - 1].balanceAmount += roundingDiff;
  }

  return {
    rows,
    totalInQty,
    totalInAmount,
    totalOutQty,
    totalOutAmount,
    totalCogsAmount,
    endingBalanceQty: currentBalanceQty,
    endingBalanceAmount: finalEndingAmount,
    method,
    hasNegativeStock,
    isConserved,
    roundingDiff,
  };
}

/**
 * Calculates manufacturing product cost (Z & z), separates abnormal waste (VAS 02 Paragraph 11),
 * determines CIT tax add-back on Schedule B4, evaluates ending WIP, and generates double-entry vouchers.
 */
export function calculateManufacturingCost(
  input: ManufacturingCostInput
): ManufacturingCostOutput {
  const {
    regime,
    beginningWip = 0,
    actualDirectMaterial = 0,
    actualDirectLabor = 0,
    actualOverhead = 0,
    finishedUnits = 0,
    endingWipUnits = 0,
    wipMethod = 'DIRECT_MATERIAL',
    completionPercentage = 50,
  } = input;

  // 1. Separation of normal vs abnormal waste (VAS 02 Paragraph 11 & IAS 2 Paragraph 16)
  const normMat = input.normalDirectMaterial !== undefined && input.normalDirectMaterial !== null
    ? Math.max(0, input.normalDirectMaterial)
    : actualDirectMaterial;
  const normalMaterialCost = Math.min(actualDirectMaterial, normMat);
  const abnormalMaterialCost = Math.max(0, actualDirectMaterial - normMat);

  const normLab = input.normalDirectLabor !== undefined && input.normalDirectLabor !== null
    ? Math.max(0, input.normalDirectLabor)
    : actualDirectLabor;
  const normalLaborCost = Math.min(actualDirectLabor, normLab);
  const abnormalLaborCost = Math.max(0, actualDirectLabor - normLab);

  const overheadCost = actualOverhead;
  const totalEligibleCost = normalMaterialCost + normalLaborCost + overheadCost;
  const cogsDirectExpense = abnormalMaterialCost + abnormalLaborCost;

  // 2. Tax impact on CIT Schedule B4 (Circular 96/2015 & Circular 78/2014)
  const scheduleB4Amount = cogsDirectExpense;
  const citTaxImpact = Math.round(scheduleB4Amount * 0.2);

  const scheduleB4Item: ScheduleB4Adjustment | undefined =
    scheduleB4Amount > 0
      ? {
          code: 'B4_ABNORMAL_COST',
          amount: scheduleB4Amount,
          reasonVi:
            'Chi phí nguyên vật liệu, nhân công vượt định mức kinh tế - kỹ thuật theo VAS 02 Đoạn 11 & Thông tư 96/2015/TT-BTC',
          statutoryBasis:
            'Khoản 2.3 Điều 6 Thông tư 78/2014/TT-BTC, sửa đổi bởi Điều 4 Thông tư 96/2015/TT-BTC',
        }
      : undefined;

  const scheduleB4Adjustments: ScheduleB4Adjustment[] = scheduleB4Item ? [scheduleB4Item] : [];

  // 3. WIP Ending Valuation (D_ck)
  let endingWipCost = 0;
  const totalUnits = finishedUnits + endingWipUnits;

  if (totalUnits === 0) {
    endingWipCost = 0;
  } else if (wipMethod === 'DIRECT_MATERIAL') {
    // Direct Material method: ending WIP only absorbs eligible direct material cost
    const unitMaterialWip = (beginningWip + normalMaterialCost) / totalUnits;
    endingWipCost = Math.round(unitMaterialWip * endingWipUnits);
  } else if (wipMethod === 'EQUIVALENT_UNITS') {
    // EUP method: Raw materials absorbed 100%, conversion costs absorbed by equivalent units
    const h = Math.max(0, Math.min(100, completionPercentage)) / 100;
    const eupUnits = endingWipUnits * h;
    const totalConversionUnits = finishedUnits + eupUnits;

    const unitMat = (beginningWip + normalMaterialCost) / totalUnits;
    const matWip = unitMat * endingWipUnits;

    const totalConversionCost = normalLaborCost + overheadCost;
    const unitConv = totalConversionUnits > 0 ? totalConversionCost / totalConversionUnits : 0;
    const convWip = unitConv * eupUnits;

    endingWipCost = Math.round(matWip + convWip);
  }

  // 4. Total Cost Z and Unit Cost z
  let totalCostZ = 0;
  let unitCostZ = 0;

  if (finishedUnits === 0) {
    totalCostZ = 0;
    unitCostZ = 0;
    endingWipCost = beginningWip + totalEligibleCost;
  } else {
    totalCostZ = Math.max(0, beginningWip + totalEligibleCost - endingWipCost);
    unitCostZ = Math.round((totalCostZ / finishedUnits) * 100) / 100;
  }

  // 5. Automatic Double-Entry Voucher Generation
  const journalEntries: JournalEntryItem[] = [];

  if (regime === 'CIRCULAR_200' || regime === 'CIRCULAR_99') {
    // Under Circular 200 & Circular 99: Accounts 621, 622, 627 -> 154
    if (normalMaterialCost > 0) {
      journalEntries.push({
        debitAccount: '154',
        creditAccount: '621',
        amount: normalMaterialCost,
        descriptionVi: 'Tập hợp chi phí nguyên vật liệu trực tiếp hợp lý vào TK 154',
      });
    }
    if (normalLaborCost > 0) {
      journalEntries.push({
        debitAccount: '154',
        creditAccount: '622',
        amount: normalLaborCost,
        descriptionVi: 'Tập hợp chi phí nhân công trực tiếp hợp lý vào TK 154',
      });
    }
    if (overheadCost > 0) {
      journalEntries.push({
        debitAccount: '154',
        creditAccount: '627',
        amount: overheadCost,
        descriptionVi: 'Tập hợp chi phí sản xuất chung vào TK 154',
      });
    }

    // Abnormal cost routed directly to TK 632 (VAS 02 Paragraph 11)
    if (abnormalMaterialCost > 0) {
      journalEntries.push({
        debitAccount: '632',
        creditAccount: '621',
        amount: abnormalMaterialCost,
        descriptionVi: 'Chi phí NVL trực tiếp vượt định mức hạch toán thẳng vào giá vốn (TK 632)',
      });
    }
    if (abnormalLaborCost > 0) {
      journalEntries.push({
        debitAccount: '632',
        creditAccount: '622',
        amount: abnormalLaborCost,
        descriptionVi: 'Chi phí nhân công trực tiếp vượt định mức hạch toán thẳng vào giá vốn (TK 632)',
      });
    }

    // Finished goods completed and transferred to inventory
    if (totalCostZ > 0) {
      journalEntries.push({
        debitAccount: '155',
        creditAccount: '154',
        amount: totalCostZ,
        descriptionVi: 'Nhập kho thành phẩm hoàn thành (Tổng giá thành sản xuất Z)',
      });
    }
  } else if (regime === 'CIRCULAR_133') {
    // Under Circular 133: Accounts 621, 622, 627 are prohibited; directly collected on TK 154
    if (actualDirectMaterial > 0) {
      journalEntries.push({
        debitAccount: '154',
        creditAccount: '152',
        amount: actualDirectMaterial,
        descriptionVi: 'Xuất kho NVL trực tiếp dùng cho sản xuất (TK 1541)',
      });
    }
    if (actualDirectLabor > 0) {
      journalEntries.push({
        debitAccount: '154',
        creditAccount: '334',
        amount: actualDirectLabor,
        descriptionVi: 'Chi phí tiền lương nhân công trực tiếp sản xuất (TK 1542)',
      });
    }
    if (overheadCost > 0) {
      journalEntries.push({
        debitAccount: '154',
        creditAccount: '111',
        amount: overheadCost,
        descriptionVi: 'Chi phí sản xuất chung phát sinh trong kỳ (TK 1544)',
      });
    }

    // Abnormal cost debited directly to TK 632
    if (cogsDirectExpense > 0) {
      journalEntries.push({
        debitAccount: '632',
        creditAccount: '154',
        amount: cogsDirectExpense,
        descriptionVi: 'Chi phí sản xuất vượt định mức hạch toán thẳng vào giá vốn (TK 632)',
      });
    }

    if (totalCostZ > 0) {
      journalEntries.push({
        debitAccount: '155',
        creditAccount: '154',
        amount: totalCostZ,
        descriptionVi: 'Nhập kho thành phẩm hoàn thành (Tổng giá thành sản xuất Z)',
      });
    }
  }

  let warningVi: string | undefined;
  if (scheduleB4Amount > 0) {
    warningVi = `VAS 02 Đoạn 11: Phát sinh ${scheduleB4Amount.toLocaleString('vi-VN')}đ chi phí vượt định mức đã hạch toán Nợ 632 và phải điều chỉnh tăng thu nhập chịu thuế tại Chỉ tiêu B4 Tờ khai 03/TNDN (thuế TNDN phát sinh thêm: ${citTaxImpact.toLocaleString('vi-VN')}đ).`;
  }

  return {
    normalMaterialCost,
    abnormalMaterialCost,
    normalLaborCost,
    abnormalLaborCost,
    overheadCost,
    totalEligibleCost,
    endingWipCost,
    totalCostZ,
    unitCostZ,
    cogsDirectExpense,
    citTaxImpact,
    scheduleB4Amount,
    scheduleB4Item,
    scheduleB4Adjustments,
    journalEntries,
    warningVi,
  };
}

/**
 * Generates a side-by-side comparison matrix across FIFO, Periodic Weighted Average, and Moving Weighted Average.
 * Evaluates the 4 core financial KPIs: COGS (TK 632), Ending Inventory (TK 156 / Code 140 B01),
 * Gross Profit (Code 20 B02), and CIT 20% / NPAT (Code 60 B02).
 */
export function generateComparisonMatrix(
  initialInventory: InventoryLot[] = [],
  transactions: StockTransaction[] = [],
  assumedRevenue?: number
): ComparisonMatrixResult {
  const fifoRes = calculateFifo(initialInventory, transactions);
  const periodicRes = calculatePeriodicWeightedAverage(initialInventory, transactions);
  const movingRes = calculateMovingWeightedAverage(initialInventory, transactions);

  // Determine baseline revenue: use provided assumedRevenue or derive from sales quantity
  const salesQty = transactions
    .filter((t) => t.voucherType === 'PXK')
    .reduce((sum, t) => sum + t.quantity, 0);

  const maxCogs = Math.max(fifoRes.totalCogsAmount, periodicRes.totalCogsAmount, movingRes.totalCogsAmount);
  const revenue =
    assumedRevenue !== undefined
      ? assumedRevenue
      : salesQty > 0
      ? Math.round(Math.max(100_000_000, maxCogs * 1.35))
      : 100_000_000;

  const methods: Array<{
    method: CostingMethod;
    labelVi: string;
    result: StockCardResult;
  }> = [
    { method: 'FIFO', labelVi: 'Nhập trước xuất trước (FIFO)', result: fifoRes },
    {
      method: 'PERIODIC_WEIGHTED_AVERAGE',
      labelVi: 'Bình quân cả kỳ dự trữ',
      result: periodicRes,
    },
    {
      method: 'MOVING_WEIGHTED_AVERAGE',
      labelVi: 'Bình quân gia quyền liên hoàn',
      result: movingRes,
    },
  ];

  const rows: ComparisonMatrixRow[] = methods.map(({ method, labelVi, result }) => {
    const cogsAmount = result.totalCogsAmount;
    const endingInventoryValue = result.endingBalanceAmount;
    const grossProfit = revenue - cogsAmount;
    const citExpense = grossProfit > 0 ? Math.round(grossProfit * 0.2) : 0;
    const netProfitAfterTax = grossProfit - citExpense;
    const grossMarginPercent =
      revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0;

    return {
      method,
      methodLabelVi: labelVi,
      cogsAmount,
      endingInventoryValue,
      grossProfit,
      citExpense,
      netProfitAfterTax,
      grossMarginPercent,
    };
  });

  // Determine trend: inspect prices across initial lots and receipt vouchers
  const chronologicalPrices: number[] = [];
  for (const lot of initialInventory) {
    if (lot.quantity > 0) {
      chronologicalPrices.push(lot.unitPrice);
    }
  }
  for (const tx of transactions) {
    if (tx.voucherType === 'PNK' && tx.unitPrice !== undefined && tx.quantity > 0) {
      chronologicalPrices.push(tx.unitPrice);
    }
  }

  let trend: 'INFLATION' | 'DEFLATION' | 'STABLE' = 'STABLE';
  if (chronologicalPrices.length >= 2) {
    const firstPrice = chronologicalPrices[0];
    const lastPrice = chronologicalPrices[chronologicalPrices.length - 1];
    if (lastPrice > firstPrice) {
      trend = 'INFLATION';
    } else if (lastPrice < firstPrice) {
      trend = 'DEFLATION';
    }
  }

  // Find min/max COGS methods
  let minCogsMethod: CostingMethod = 'FIFO';
  let maxCogsMethod: CostingMethod = 'FIFO';
  let minCogs = Infinity;
  let maxCogsVal = -Infinity;

  for (const r of rows) {
    if (r.cogsAmount < minCogs) {
      minCogs = r.cogsAmount;
      minCogsMethod = r.method;
    }
    if (r.cogsAmount > maxCogsVal) {
      maxCogsVal = r.cogsAmount;
      maxCogsMethod = r.method;
    }
  }

  const executiveInsightsVi: string[] = [];
  if (trend === 'INFLATION') {
    executiveInsightsVi.push(
      'Trong chu kỳ giá cả hàng hóa/vật tư có xu hướng tăng (lạm phát): Phương pháp FIFO xuất các lô giá rẻ trước, dẫn đến Giá vốn (TK 632) thấp nhất, Lợi nhuận gộp (Mã 20) và Giá trị tồn kho (Mã 140) cao nhất.'
    );
    executiveInsightsVi.push(
      'Chiến lược BCTC & Vay vốn: Chọn FIFO giúp làm đẹp Báo cáo tài chính B01 & B02, cải thiện hệ số thanh toán hiện hành (Current Ratio) và ROE/ROA để đáp ứng điều kiện giải ngân và hạn mức tín dụng ngân hàng.'
    );
    executiveInsightsVi.push(
      'Chiến lược Dòng tiền thuế (Tax Cash Flow): Phương pháp Bình quân gia quyền đưa chi phí trung bình cao hơn vào giá vốn, làm giảm lợi nhuận chịu thuế và hoãn số tiền thuế TNDN 20% phải nộp ngay, giúp tối ưu nguồn vốn lưu động bằng tiền mặt.'
    );
  } else if (trend === 'DEFLATION') {
    executiveInsightsVi.push(
      'Trong chu kỳ giá cả hàng hóa/vật tư có xu hướng giảm: Phương pháp FIFO xuất các lô giá cao trước, dẫn đến Giá vốn (TK 632) cao nhất, Lợi nhuận gộp thấp nhất và Giá trị tồn kho phản ánh giá mới nhất.'
    );
    executiveInsightsVi.push(
      'Chiến lược Thuế & Quản trị: Phương pháp FIFO trong chu kỳ giảm giá giúp doanh nghiệp phản ánh kịp thời chi phí cao vào giá vốn, giảm thiểu số thuế TNDN phải nộp trong kỳ.'
    );
  } else {
    executiveInsightsVi.push(
      'Khi đơn giá nhập kho ổn định không biến động, cả 3 phương pháp (FIFO, Bình quân cả kỳ, Bình quân liên hoàn) đều cho ra kết quả đồng nhất 100% về Giá vốn (TK 632) và Giá trị tồn kho (TK 156).'
    );
  }

  return {
    rows,
    revenue,
    maxCogsMethod,
    minCogsMethod,
    trend,
    executiveInsightsVi,
  };
}
