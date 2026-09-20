/**
 * Balance Sheet Engine (B01-DN / B01a-DNN)
 * Dynamic generation and invariant validation under VAS, Circular 200/2014/TT-BTC & Circular 133/2016/TT-BTC.
 *
 * Mathematical Invariant:
 * Mã 270 (Tổng Tài sản) ≡ Mã 440 (Tổng Nguồn vốn = Mã 300 + Mã 400)
 */

export interface BalanceSheetItem {
  itemCode: string;
  itemNameVi: string;
  displayLevel: 1 | 2 | 3;
  isSubtotal?: boolean;
  isNegative?: boolean;
  accountSources: string[];
  closingAmount: number;
  openingAmount?: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  circular: 'TT200' | 'TT133';
  assets: {
    shortTerm: { code100: number; items: Record<string, number> };
    longTerm: { code200: number; items: Record<string, number> };
    totalAssets: number; // Mã số 270
  };
  resources: {
    liabilities: { code300: number; items: Record<string, number> };
    equity: { code400: number; items: Record<string, number> };
    totalResources: number; // Mã số 440 = Mã 300 + Mã 400
  };
  isBalanced: boolean; // Mã 270 === Mã 440
  discrepancy: number; // |Mã 270 - Mã 440|
  warnings: string[];
  items?: BalanceSheetItem[];
}

export interface AccountBalanceExtract {
  code: string;
  closingDebit: number;
  closingCredit: number;
  debitTotal: number;
  creditTotal: number;
}

/**
 * Normalizes various ledger account representations (TAccountData, LedgerAccountBalance, raw numbers)
 * into a consistent AccountBalanceExtract map.
 */
export function extractLedgerBalances(
  ledgerAccounts: Record<string, any>
): Map<string, AccountBalanceExtract> {
  const result = new Map<string, AccountBalanceExtract>();
  if (!ledgerAccounts || typeof ledgerAccounts !== 'object') {
    return result;
  }

  for (const [rawKey, val] of Object.entries(ledgerAccounts)) {
    const code = (val?.accountCode || rawKey || '').trim();
    if (!code) continue;

    const firstChar = code.charAt(0);
    const accountClass = parseInt(firstChar, 10) || 1;
    const isContraAsset = code.startsWith('214') || code.startsWith('229');
    const isContraEquity = code.startsWith('419');

    // Case 1: val is a direct number
    if (typeof val === 'number') {
      const num = Number(val) || 0;
      if (isContraAsset) {
        result.set(code, {
          code,
          closingDebit: 0,
          closingCredit: Math.abs(num),
          debitTotal: 0,
          creditTotal: Math.abs(num),
        });
      } else if (isContraEquity) {
        result.set(code, {
          code,
          closingDebit: Math.abs(num),
          closingCredit: 0,
          debitTotal: Math.abs(num),
          creditTotal: 0,
        });
      } else if (accountClass === 1 || accountClass === 2) {
        result.set(code, {
          code,
          closingDebit: Math.max(0, num),
          closingCredit: Math.max(0, -num),
          debitTotal: Math.max(0, num),
          creditTotal: Math.max(0, -num),
        });
      } else {
        result.set(code, {
          code,
          closingDebit: Math.max(0, -num),
          closingCredit: Math.max(0, num),
          debitTotal: Math.max(0, -num),
          creditTotal: Math.max(0, num),
        });
      }
      continue;
    }

    // Case 2: val has explicit closingDebit or closingCredit
    if (val && (val.closingDebit !== undefined || val.closingCredit !== undefined)) {
      result.set(code, {
        code,
        closingDebit: Number(val.closingDebit) || 0,
        closingCredit: Number(val.closingCredit) || 0,
        debitTotal: Number(val.debitTotal ?? val.closingDebit ?? 0),
        creditTotal: Number(val.creditTotal ?? val.closingCredit ?? 0),
      });
      continue;
    }

    // Case 3: val is TAccountData with entries and openingBalance
    if (val && Array.isArray(val.entries)) {
      const entries: Array<{ side: 'DEBIT' | 'CREDIT'; amount: number }> = val.entries;
      const totalDebit = entries
        .filter((e) => e.side === 'DEBIT')
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalCredit = entries
        .filter((e) => e.side === 'CREDIT')
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const opAmount = Number(val.openingBalance?.amount) || 0;
      const opSide: 'DEBIT' | 'CREDIT' = val.openingBalance?.side || (val.normalBalance === 'CREDIT' ? 'CREDIT' : 'DEBIT');

      let closingDebit = 0;
      let closingCredit = 0;

      if (accountClass >= 5 && accountClass <= 9) {
        // Nominal accounts
        const netDebit = (opSide === 'DEBIT' ? opAmount : 0) + totalDebit;
        const netCredit = (opSide === 'CREDIT' ? opAmount : 0) + totalCredit;
        if (netDebit > netCredit) {
          closingDebit = netDebit - netCredit;
        } else {
          closingCredit = netCredit - netDebit;
        }
      } else if (isContraAsset) {
        const net = (opSide === 'CREDIT' ? opAmount : -opAmount) + totalCredit - totalDebit;
        if (net >= 0) closingCredit = net;
        else closingDebit = Math.abs(net);
      } else if (isContraEquity) {
        const net = (opSide === 'DEBIT' ? opAmount : -opAmount) + totalDebit - totalCredit;
        if (net >= 0) closingDebit = net;
        else closingCredit = Math.abs(net);
      } else if (code.startsWith('421')) {
        const net = (opSide === 'CREDIT' ? opAmount : -opAmount) + totalCredit - totalDebit;
        if (net >= 0) closingCredit = net;
        else closingDebit = Math.abs(net);
      } else if (accountClass === 1 || accountClass === 2) {
        const net = (opSide === 'DEBIT' ? opAmount : -opAmount) + totalDebit - totalCredit;
        if (net >= 0) closingDebit = net;
        else closingCredit = Math.abs(net);
      } else {
        const net = (opSide === 'CREDIT' ? opAmount : -opAmount) + totalCredit - totalDebit;
        if (net >= 0) closingCredit = net;
        else closingDebit = Math.abs(net);
      }

      result.set(code, {
        code,
        closingDebit,
        closingCredit,
        debitTotal: totalDebit + (opSide === 'DEBIT' ? opAmount : 0),
        creditTotal: totalCredit + (opSide === 'CREDIT' ? opAmount : 0),
      });
      continue;
    }

    // Default fallback
    result.set(code, {
      code,
      closingDebit: Number(val?.closingDebit) || 0,
      closingCredit: Number(val?.closingCredit) || 0,
      debitTotal: Number(val?.debitTotal) || 0,
      creditTotal: Number(val?.creditTotal) || 0,
    });
  }

  return result;
}

/**
 * Filters leaf accounts matching prefixes to avoid double counting if both parent and child accounts exist.
 */
function getMatchingLeafAccounts(
  balanceMap: Map<string, AccountBalanceExtract>,
  prefixes: string[]
): AccountBalanceExtract[] {
  const matching = Array.from(balanceMap.values()).filter((bal) =>
    prefixes.some((p) => bal.code === p || bal.code.startsWith(p))
  );

  const leaves: AccountBalanceExtract[] = [];
  for (const item of matching) {
    const hasChildren = matching.some(
      (other) => other.code !== item.code && other.code.startsWith(item.code)
    );
    if (!hasChildren) {
      leaves.push(item);
    } else {
      const childrenTotal = matching
        .filter((other) => other.code !== item.code && other.code.startsWith(item.code))
        .reduce((sum, o) => sum + Math.abs(o.closingDebit) + Math.abs(o.closingCredit), 0);
      if (childrenTotal === 0) {
        leaves.push(item);
      }
    }
  }
  return leaves;
}

/**
 * Computes sum of debit balances for given account prefixes.
 */
function sumDebitBalances(
  balanceMap: Map<string, AccountBalanceExtract>,
  prefixes: string[]
): number {
  const leaves = getMatchingLeafAccounts(balanceMap, prefixes);
  return leaves.reduce((sum, item) => sum + item.closingDebit, 0);
}

/**
 * Computes sum of credit balances for given account prefixes.
 */
function sumCreditBalances(
  balanceMap: Map<string, AccountBalanceExtract>,
  prefixes: string[]
): number {
  const leaves = getMatchingLeafAccounts(balanceMap, prefixes);
  return leaves.reduce((sum, item) => sum + item.closingCredit, 0);
}

/**
 * Formats VNĐ currency string.
 */
export function formatCurrencyVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

/**
 * Generates B01-DN Balance Sheet report from ledger accounts and verifies invariant Mã 270 === Mã 440.
 *
 * @param ledgerAccounts Record of ledger accounts (TAccountData, LedgerAccountBalance, or raw balances)
 * @param circular 'TT200' | 'TT133' (default 'TT200')
 * @param asOfDate Date string (default '31/12/2026')
 */
export function generateBalanceSheet(
  ledgerAccounts: Record<string, any>,
  circular: 'TT200' | 'TT133' = 'TT200',
  asOfDate: string = '2026-12-31'
): BalanceSheetReport {
  const balanceMap = extractLedgerBalances(ledgerAccounts);
  const warnings: string[] = [];

  const shortTermItems: Record<string, number> = {};
  const longTermItems: Record<string, number> = {};
  const liabilitiesItems: Record<string, number> = {};
  const equityItems: Record<string, number> = {};

  // =========================================================================
  // 1. TÀI SẢN NGẮN HẠN (MÃ SỐ 100)
  // =========================================================================

  // Mã 110: Tiền và tương đương tiền (TK 111, 112, 113)
  const cashPrefixes = circular === 'TT133' ? ['111', '112'] : ['111', '112', '113'];
  const cash = sumDebitBalances(balanceMap, cashPrefixes);
  shortTermItems['110'] = cash;

  // Mã 120: Đầu tư tài chính ngắn hạn (TK 121, 128 ngắn hạn)
  const shortTermInvestments = sumDebitBalances(balanceMap, ['121', '128']);
  shortTermItems['120'] = shortTermInvestments;

  // Mã 130: Phải thu ngắn hạn (TK 131, 136, 138 trừ 2293)
  const receivables = sumDebitBalances(balanceMap, ['131', '136', '138']);
  const allowanceReceivables = sumCreditBalances(balanceMap, ['2293']);
  const netReceivables = receivables - allowanceReceivables;
  shortTermItems['130'] = netReceivables;
  shortTermItems['131'] = receivables;
  if (allowanceReceivables > 0) {
    shortTermItems['139'] = -allowanceReceivables;
  }

  // Mã 140: Hàng tồn kho (TK 151, 152, 153, 154, 155, 156, 157 trừ 2294)
  const inventoryPrefixes =
    circular === 'TT133'
      ? ['151', '152', '153', '154', '155', '156']
      : ['151', '152', '153', '154', '155', '156', '157'];
  const inventory = sumDebitBalances(balanceMap, inventoryPrefixes);
  const allowanceInventory = sumCreditBalances(balanceMap, ['2294']);
  const netInventory = inventory - allowanceInventory;
  shortTermItems['140'] = netInventory;
  shortTermItems['141'] = inventory;
  if (allowanceInventory > 0) {
    shortTermItems['149'] = -allowanceInventory;
  }

  // Mã 150: Tài sản ngắn hạn khác (TK 133, 242 ngắn hạn)
  const otherShortTerm = sumDebitBalances(balanceMap, ['133']);
  shortTermItems['150'] = otherShortTerm;

  const code100 = cash + shortTermInvestments + netReceivables + netInventory + otherShortTerm;

  // =========================================================================
  // 2. TÀI SẢN DÀI HẠN (MÃ SỐ 200)
  // =========================================================================

  // Mã 220: Tài sản cố định = Nguyên giá (221) - Hao mòn lũy kế (222/223/214)
  const fixedAssetsCostPrefixes = circular === 'TT133' ? ['211'] : ['211', '212', '213'];
  const fixedAssetsCost = sumDebitBalances(balanceMap, fixedAssetsCostPrefixes);
  const depreciation = sumCreditBalances(balanceMap, ['214']);
  const netFixedAssets = fixedAssetsCost - depreciation;

  longTermItems['221'] = fixedAssetsCost; // Cost
  longTermItems['222'] = -depreciation;   // Negative contra-asset (code 222)
  longTermItems['223'] = -depreciation;   // Negative contra-asset (code 223 statutory)
  longTermItems['220'] = netFixedAssets;

  // Mã 240: Xây dựng cơ bản dở dang (TK 241)
  const construction = sumDebitBalances(balanceMap, ['241']);
  longTermItems['240'] = construction;

  // Mã 250: Đầu tư tài chính dài hạn (TK 221, 222, 228 trừ 229)
  const longTermInvestmentsPrefixes = circular === 'TT133' ? ['228'] : ['221', '222', '228'];
  const longTermInvestments = sumDebitBalances(balanceMap, longTermInvestmentsPrefixes);
  longTermItems['250'] = longTermInvestments;

  // Mã 260: Tài sản dài hạn khác (TK 242 dài hạn, 243)
  const otherLongTermPrefixes = circular === 'TT133' ? ['242'] : ['242', '243'];
  const otherLongTerm = sumDebitBalances(balanceMap, otherLongTermPrefixes);
  longTermItems['260'] = otherLongTerm;

  const code200 = netFixedAssets + construction + longTermInvestments + otherLongTerm;
  const totalAssets = code100 + code200; // Mã số 270

  // =========================================================================
  // 3. NỢ PHẢI TRẢ (MÃ SỐ 300)
  // =========================================================================

  // Mã 310: Nợ ngắn hạn (TK 331, 333, 334, 335, 338, 341 ngắn hạn)
  const payableSuppliers = sumCreditBalances(balanceMap, ['331']);
  const taxPayables = sumCreditBalances(balanceMap, ['333']);
  const salaryPayables = sumCreditBalances(balanceMap, ['334']);
  const accruedExpenses = sumCreditBalances(balanceMap, ['335']);
  const otherShortTermPayables = sumCreditBalances(balanceMap, ['338', '341']);
  const code310 =
    payableSuppliers +
    taxPayables +
    salaryPayables +
    accruedExpenses +
    otherShortTermPayables;
  liabilitiesItems['310'] = code310;
  liabilitiesItems['311'] = payableSuppliers;
  liabilitiesItems['313'] = taxPayables;
  liabilitiesItems['314'] = salaryPayables;
  liabilitiesItems['315'] = accruedExpenses;
  liabilitiesItems['319'] = otherShortTermPayables;

  // Mã 330: Nợ dài hạn (TK 341 dài hạn, 347)
  const longTermLiabilities = circular === 'TT133' ? 0 : sumCreditBalances(balanceMap, ['347']);
  liabilitiesItems['330'] = longTermLiabilities;

  const code300 = code310 + longTermLiabilities; // Mã số 300

  // =========================================================================
  // 4. VỐN CHỦ SỞ HỮU (MÃ SỐ 400)
  // =========================================================================

  // Mã 411: Vốn đầu tư của chủ sở hữu (TK 411)
  const charterCapital = sumCreditBalances(balanceMap, ['411']);
  equityItems['411'] = charterCapital;

  // Mã 418: Các quỹ thuộc vốn CSH (TK 418)
  const equityFunds = sumCreditBalances(balanceMap, ['418']);
  equityItems['418'] = equityFunds;

  // Mã 419: Cổ phiếu quỹ (TK 419 - ghi âm)
  const treasuryShares = sumDebitBalances(balanceMap, ['419']);
  if (treasuryShares > 0) {
    equityItems['419'] = -treasuryShares;
  }

  // Mã 421: Lợi nhuận sau thuế chưa phân phối (TK 4211 + 4212)
  // Credit balance is positive; Debit balance (cumulative loss) is negative.
  const leaves421 = getMatchingLeafAccounts(balanceMap, ['421']);
  let undistributedProfit = 0;
  if (leaves421.length > 0) {
    for (const l of leaves421) {
      undistributedProfit += l.closingCredit - l.closingDebit;
    }
  } else {
    // If not split, check 421 directly
    const p4211Credit = sumCreditBalances(balanceMap, ['4211']);
    const p4211Debit = sumDebitBalances(balanceMap, ['4211']);
    const p4212Credit = sumCreditBalances(balanceMap, ['4212']);
    const p4212Debit = sumDebitBalances(balanceMap, ['4212']);
    undistributedProfit = (p4211Credit - p4211Debit) + (p4212Credit - p4212Debit);
  }
  equityItems['421'] = undistributedProfit;

  const code400 = charterCapital + equityFunds - treasuryShares + undistributedProfit; // Mã số 400
  const totalResources = code300 + code400; // Mã số 440

  // =========================================================================
  // 5. KIỂM TRA BẤT BIẾN TOÁN HỌC & CẢNH BÁO (INVARIANT CHECKS)
  // =========================================================================

  const discrepancy = Math.abs(Math.round(totalAssets) - Math.round(totalResources));
  const isBalanced = discrepancy === 0;

  if (!isBalanced) {
    warnings.push(
      `CẢNH BÁO MẤT CÂN ĐỐI BẢNG CÂN ĐỐI KẾ TOÁN: Tổng Tài sản (Mã 270: ${formatCurrencyVnd(totalAssets)}) lệch ${formatCurrencyVnd(discrepancy)} so với Tổng Nguồn vốn (Mã 440: ${formatCurrencyVnd(totalResources)}).`
    );
  }

  // Check nominal temporary accounts (Classes 5 to 9)
  for (const [code, bal] of balanceMap.entries()) {
    if (/^[56789]/.test(code)) {
      if (bal.closingDebit !== 0 || bal.closingCredit !== 0) {
        warnings.push(
          `Cảnh báo khóa sổ: Tài khoản tạm thời ${code} chưa được kết chuyển hết về TK 911 (số dư khác 0).`
        );
      }
    }
  }

  // Detailed presentation items for UI table
  const items: BalanceSheetItem[] = [
    // TÀI SẢN
    { itemCode: '100', itemNameVi: 'A. TÀI SẢN NGẮN HẠN', displayLevel: 1, isSubtotal: true, accountSources: ['110', '120', '130', '140', '150'], closingAmount: code100 },
    { itemCode: '110', itemNameVi: 'I. Tiền và các khoản tương đương tiền', displayLevel: 2, accountSources: cashPrefixes, closingAmount: cash },
    { itemCode: '120', itemNameVi: 'II. Đầu tư tài chính ngắn hạn', displayLevel: 2, accountSources: ['121', '128'], closingAmount: shortTermInvestments },
    { itemCode: '130', itemNameVi: 'III. Các khoản phải thu ngắn hạn', displayLevel: 2, accountSources: ['131', '136', '138', '2293'], closingAmount: netReceivables },
    { itemCode: '140', itemNameVi: 'IV. Hàng tồn kho', displayLevel: 2, accountSources: inventoryPrefixes, closingAmount: netInventory },
    { itemCode: '150', itemNameVi: 'V. Tài sản ngắn hạn khác', displayLevel: 2, accountSources: ['133'], closingAmount: otherShortTerm },
    { itemCode: '200', itemNameVi: 'B. TÀI SẢN DÀI HẠN', displayLevel: 1, isSubtotal: true, accountSources: ['220', '240', '250', '260'], closingAmount: code200 },
    { itemCode: '220', itemNameVi: 'I. Tài sản cố định', displayLevel: 2, isSubtotal: true, accountSources: fixedAssetsCostPrefixes.concat(['214']), closingAmount: netFixedAssets },
    { itemCode: '221', itemNameVi: '- Nguyên giá', displayLevel: 3, accountSources: fixedAssetsCostPrefixes, closingAmount: fixedAssetsCost },
    { itemCode: '222', itemNameVi: '- Giá trị hao mòn lũy kế (*)', displayLevel: 3, isNegative: true, accountSources: ['214'], closingAmount: -depreciation },
    { itemCode: '240', itemNameVi: 'II. Xây dựng cơ bản dở dang', displayLevel: 2, accountSources: ['241'], closingAmount: construction },
    { itemCode: '250', itemNameVi: 'III. Đầu tư tài chính dài hạn', displayLevel: 2, accountSources: longTermInvestmentsPrefixes, closingAmount: longTermInvestments },
    { itemCode: '260', itemNameVi: 'IV. Tài sản dài hạn khác', displayLevel: 2, accountSources: otherLongTermPrefixes, closingAmount: otherLongTerm },
    { itemCode: '270', itemNameVi: 'TỔNG CỘNG TÀI SẢN (MÃ 270 = 100 + 200)', displayLevel: 1, isSubtotal: true, accountSources: ['100', '200'], closingAmount: totalAssets },

    // NGUỒN VỐN
    { itemCode: '300', itemNameVi: 'C. NỢ PHẢI TRẢ', displayLevel: 1, isSubtotal: true, accountSources: ['310', '330'], closingAmount: code300 },
    { itemCode: '310', itemNameVi: 'I. Nợ ngắn hạn', displayLevel: 2, accountSources: ['331', '333', '334', '335', '338', '341'], closingAmount: code310 },
    { itemCode: '330', itemNameVi: 'II. Nợ dài hạn', displayLevel: 2, accountSources: ['341', '347'], closingAmount: longTermLiabilities },
    { itemCode: '400', itemNameVi: 'D. VỐN CHỦ SỞ HỮU', displayLevel: 1, isSubtotal: true, accountSources: ['411', '418', '419', '421'], closingAmount: code400 },
    { itemCode: '411', itemNameVi: '1. Vốn góp của chủ sở hữu', displayLevel: 2, accountSources: ['411'], closingAmount: charterCapital },
    { itemCode: '421', itemNameVi: '2. Lợi nhuận sau thuế chưa phân phối', displayLevel: 2, accountSources: ['4211', '4212'], closingAmount: undistributedProfit },
    { itemCode: '440', itemNameVi: 'TỔNG CỘNG NGUỒN VỐN (MÃ 440 = 300 + 400)', displayLevel: 1, isSubtotal: true, accountSources: ['300', '400'], closingAmount: totalResources },
  ];

  return {
    asOfDate,
    circular,
    assets: {
      shortTerm: { code100, items: shortTermItems },
      longTerm: { code200, items: longTermItems },
      totalAssets,
    },
    resources: {
      liabilities: { code300, items: liabilitiesItems },
      equity: { code400, items: equityItems },
      totalResources,
    },
    isBalanced,
    discrepancy,
    warnings,
    items,
  };
}
