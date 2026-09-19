import { describe, it, expect } from 'vitest';
import {
  COA_CIRCULAR_200,
} from '@/data/coa-circular-200';
import {
  COA_CIRCULAR_133,
} from '@/data/coa-circular-133';
import {
  isProhibitedInCircular133,
  getProhibitionRule,
  validateAccountForRegime,
} from '@/data/prohibited-accounts';
import {
  getAccountsByRegime,
  findAccountByCode,
  searchAccounts,
} from '@/data/coa-service';

describe('Chart of Accounts Data Integrity', () => {
  it('Circular 200 dataset should cover all 9 account classes', () => {
    const accounts = COA_CIRCULAR_200;
    expect(accounts.length).toBeGreaterThanOrEqual(40);

    // Classes 1 through 9 should be represented
    for (let c = 1; c <= 9; c++) {
      const classAccounts = accounts.filter((a) => a.code.startsWith(String(c)));
      expect(classAccounts.length).toBeGreaterThan(0);
    }
  });

  it('Circular 133 dataset should cover standard SME accounts', () => {
    const accounts = COA_CIRCULAR_133;
    expect(accounts.length).toBeGreaterThanOrEqual(30);

    const tk111 = accounts.find((a) => a.code === '111');
    expect(tk111).toBeDefined();
    expect(tk111?.nameVi).toContain('Tiền mặt');

    const tk154 = accounts.find((a) => a.code === '154');
    expect(tk154).toBeDefined();
    expect(tk154?.normalBalance).toBe('DEBIT');
  });

  it('should distinguish account levels (cấp 1: 3 digits, cấp 2: 4 digits)', () => {
    const level1 = COA_CIRCULAR_200.filter((a) => a.code.length === 3);
    const level2 = COA_CIRCULAR_200.filter((a) => a.code.length >= 4);

    expect(level1.length).toBeGreaterThan(0);
    expect(level2.length).toBeGreaterThan(0);

    level2.forEach((sub) => {
      expect(sub.parentCode).toBeDefined();
      expect(sub.code.startsWith(sub.parentCode!)).toBe(true);
    });
  });

  it('contra-asset accounts 214 and 229 should have normalBalance CREDIT', () => {
    const tk214 = findAccountByCode('214', 'CIRCULAR_200');
    expect(tk214?.normalBalance).toBe('CREDIT');

    const tk229 = findAccountByCode('229', 'CIRCULAR_200');
    expect(tk229?.normalBalance).toBe('CREDIT');
  });

  it('contra-equity account 419 should have normalBalance DEBIT', () => {
    const tk419 = findAccountByCode('419', 'CIRCULAR_200');
    expect(tk419?.normalBalance).toBe('DEBIT');
  });

  it('clearing accounts (Class 5, 6, 7, 8, 9) should have ZERO normal balance', () => {
    const clearingCodes = ['511', '632', '635', '642', '711', '811', '911'];
    clearingCodes.forEach((code) => {
      const acc = findAccountByCode(code, 'CIRCULAR_200');
      expect(acc).toBeDefined();
      expect(acc?.normalBalance).toBe('ZERO');
    });
  });

  it('two-way settlement accounts (131, 331) should have normalBalance BOTH', () => {
    const tk131 = findAccountByCode('131', 'CIRCULAR_200');
    expect(tk131?.normalBalance).toBe('BOTH');

    const tk331 = findAccountByCode('331', 'CIRCULAR_200');
    expect(tk331?.normalBalance).toBe('BOTH');
  });
});

describe('Circular 133 Prohibited Accounts Safeguard', () => {
  const prohibitedList = ['621', '622', '623', '627', '641', '521', '413'];

  it.each(prohibitedList)(
    'account %s must be flagged as prohibited in Circular 133',
    (code) => {
      expect(isProhibitedInCircular133(code)).toBe(true);
      const rule = getProhibitionRule(code);
      expect(rule).toBeDefined();
      expect(rule?.substituteCode).toBeDefined();
      expect(rule?.remedyGuideVi).toBeDefined();
      expect(rule?.statutoryBasis).toBeDefined();
    }
  );

  it('sub-accounts of prohibited accounts (e.g. 6411, 5211, 6271) must also be prohibited', () => {
    expect(isProhibitedInCircular133('6411')).toBe(true);
    expect(isProhibitedInCircular133('5211')).toBe(true);
    expect(isProhibitedInCircular133('6271')).toBe(true);
    expect(isProhibitedInCircular133('6211')).toBe(true);
  });

  it('valid Circular 133 substitute accounts must NOT be flagged as prohibited', () => {
    const validAccounts = ['111', '112', '152', '154', '156', '632', '642', '6421', '6422', '511', '911'];
    validAccounts.forEach((code) => {
      expect(isProhibitedInCircular133(code)).toBe(false);
    });
  });

  it('validateAccountForRegime should allow 641 in TT 200 but reject in TT 133 with substitute 6421', () => {
    const validation200 = validateAccountForRegime('641', 'CIRCULAR_200');
    expect(validation200.isValid).toBe(true);
    expect(validation200.isProhibited).toBe(false);

    const validation133 = validateAccountForRegime('641', 'CIRCULAR_133');
    expect(validation133.isValid).toBe(false);
    expect(validation133.isProhibited).toBe(true);
    expect(validation133.substituteCode).toBe('6421');
    expect(validation133.warning).toContain('KHÔNG ĐƯỢC PHÉP');
  });

  it('validateAccountForRegime should recommend TK 154 for manufacturing accounts 621, 622, 627 in TT 133', () => {
    ['621', '622', '627'].forEach((code) => {
      const res = validateAccountForRegime(code, 'CIRCULAR_133');
      expect(res.isValid).toBe(false);
      expect(res.substituteCode).toBe('154');
    });
  });

  it('validateAccountForRegime should recommend direct debit to TK 511 for TK 521 in TT 133', () => {
    const res = validateAccountForRegime('521', 'CIRCULAR_133');
    expect(res.isValid).toBe(false);
    expect(res.substituteCode).toBe('511');
  });
});

describe('COA Search and Filtering Service', () => {
  it('should search by account code exactly and partially', () => {
    const results = searchAccounts('111', 'CIRCULAR_200');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((a) => a.code === '111')).toBe(true);
  });

  it('should search case-insensitively by Vietnamese name', () => {
    const results = searchAccounts('tiền mặt', 'CIRCULAR_200');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((a) => a.code === '111')).toBe(true);
  });

  it('should filter by Category correctly', () => {
    const assets = searchAccounts('', 'CIRCULAR_200', 'ASSET');
    assets.forEach((acc) => {
      expect(acc.category).toBe('ASSET');
    });

    const liabilities = searchAccounts('', 'CIRCULAR_200', 'LIABILITY');
    liabilities.forEach((acc) => {
      expect(acc.category).toBe('LIABILITY');
    });
  });

  it('should return correct account list by regime', () => {
    const acc200 = getAccountsByRegime('CIRCULAR_200');
    const acc133 = getAccountsByRegime('CIRCULAR_133');

    expect(acc200).toBe(COA_CIRCULAR_200);
    expect(acc133).toBe(COA_CIRCULAR_133);
  });
});
