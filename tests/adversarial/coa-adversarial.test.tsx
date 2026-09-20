import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CoaExplorer } from '@/components/coa/CoaExplorer';
import { COA_CIRCULAR_200 } from '@/data/coa-circular-200';
import { COA_CIRCULAR_133 } from '@/data/coa-circular-133';
import {
  isProhibitedInCircular133,
  getProhibitionRule,
  validateAccountForRegime,
  getProhibitedAccounts133,
} from '@/data/prohibited-accounts';
import {
  getAccountsByRegime,
  findAccountByCode,
  searchAccounts,
} from '@/data/coa-service';
import { AccountCategory, CATEGORY_METADATA } from '@/types/coa';

/**
 * ============================================================================
 * ADVERSARIAL STRESS TEST SUITE: CHART OF ACCOUNTS & STATUTORY RULES
 * Milestone 1 — Empirical Verification Harness
 * ============================================================================
 */

describe('ADVERSARIAL BATTERY 1: Circular 133 Prohibited Accounts Safeguard & Bypass Attempts', () => {
  const STATUTORY_PROHIBITED_133_CODES = ['621', '622', '623', '627', '641', '521', '413'];

  describe('1.1 Statutory Prohibited Accounts Enforcement', () => {
    it.each(STATUTORY_PROHIBITED_133_CODES)(
      'prohibited account TK %s must be detected as prohibited in Circular 133',
      (code) => {
        expect(isProhibitedInCircular133(code)).toBe(true);
        const rule = getProhibitionRule(code);
        expect(rule).toBeDefined();
        expect(rule?.code).toBe(code);
        expect(rule?.substituteCode).toBeTruthy();
        expect(rule?.remedyGuideVi).toBeTruthy();
        expect(rule?.statutoryBasis).toBeTruthy();
      }
    );

    it('PROHIBITED accounts must NEVER exist in the active COA_CIRCULAR_133 array', () => {
      STATUTORY_PROHIBITED_133_CODES.forEach((prohibitedCode) => {
        const found = COA_CIRCULAR_133.find((a) => a.code === prohibitedCode);
        expect(found, `Prohibited account ${prohibitedCode} was found in COA_CIRCULAR_133!`).toBeUndefined();
      });

      // No account in COA_CIRCULAR_133 should be prohibited
      const prohibitedIn133ActiveList = COA_CIRCULAR_133.filter((acc) =>
        isProhibitedInCircular133(acc.code)
      );
      expect(prohibitedIn133ActiveList).toHaveLength(0);
    });

    it('Circular 133 prohibited accounts dedicated list must provide complete pedagogical replacements', () => {
      const prohibitedItems = getProhibitedAccounts133();
      expect(prohibitedItems.length).toBe(7);

      prohibitedItems.forEach((item) => {
        expect(item.isProhibitedIn133).toBe(true);
        expect(item.substituteIn133).toBeTruthy();
        expect(item.description).toContain('BỊ CẤM');
      });

      // Verify specific redirections
      const tk621 = prohibitedItems.find((a) => a.code === '621');
      expect(tk621?.substituteIn133).toContain('154');

      const tk641 = prohibitedItems.find((a) => a.code === '641');
      expect(tk641?.substituteIn133).toContain('6421');

      const tk521 = prohibitedItems.find((a) => a.code === '521');
      expect(tk521?.substituteIn133).toContain('511');

      const tk413 = prohibitedItems.find((a) => a.code === '413');
      expect(tk413?.substituteIn133).toMatch(/515|635/);
    });
  });

  describe('1.2 Sub-Account Inheritance & Deep Code Prefix Detection', () => {
    const PROHIBITED_SUBACCOUNTS = [
      // 621 sub-accounts
      '6211', '6212', '6213', '6218',
      // 622 sub-accounts
      '6221', '6222',
      // 623 sub-accounts
      '6231', '6232', '6234', '6237', '6238',
      // 627 sub-accounts
      '6271', '6272', '6273', '6274', '6277', '6278',
      // 641 sub-accounts
      '6411', '6412', '6413', '6414', '6415', '6417', '6418',
      // 521 sub-accounts
      '5211', '5212', '5213',
      // 413 sub-accounts
      '4131', '4132',
    ];

    it.each(PROHIBITED_SUBACCOUNTS)(
      'sub-account %s must inherit prohibition from parent under Circular 133',
      (subCode) => {
        expect(isProhibitedInCircular133(subCode)).toBe(true);
        const rule = getProhibitionRule(subCode);
        expect(rule).toBeDefined();

        const validation = validateAccountForRegime(subCode, 'CIRCULAR_133');
        expect(validation.isValid).toBe(false);
        expect(validation.isProhibited).toBe(true);
        expect(validation.substituteCode).toBe(rule?.substituteCode);
      }
    );
  });

  describe('1.3 False-Positive Boundary Stress (Valid accounts must NEVER be falsely blocked)', () => {
    const LEGITIMATE_SIMILAR_ACCOUNTS = [
      '642',   // Chi phí QLKD in TT 133
      '6421',  // Chi phí bán hàng in TT 133 (substitute for 641)
      '6422',  // Chi phí QLDN in TT 133
      '6428',  // Chi phí khác in TT 133 / TT 200
      '632',   // Giá vốn hàng bán
      '635',   // Chi phí tài chính
      '611',   // Mua hàng (KKĐK)
      '631',   // Giá thành SX (KKĐK)
      '511',   // Doanh thu (substitute for 521)
      '5111', '5112', '5113', '5118',
      '515',   // Doanh thu tài chính (substitute for 413)
      '154',   // Chi phí SXKD dở dang (substitute for 621, 622, 623, 627)
      '411', '4111', '4112', '414', '418', '419', '421', '4211', '4212',
      '131', '331', '111', '112', '911',
    ];

    it.each(LEGITIMATE_SIMILAR_ACCOUNTS)(
      'legitimate account %s must NOT be flagged as prohibited in Circular 133',
      (code) => {
        expect(isProhibitedInCircular133(code)).toBe(false);
        expect(getProhibitionRule(code)).toBeUndefined();
        const validation = validateAccountForRegime(code, 'CIRCULAR_133');
        expect(validation.isValid).toBe(true);
        expect(validation.isProhibited).toBe(false);
      }
    );
  });

  describe('1.4 Circular 200 vs Circular 133 Asymmetry', () => {
    it('all prohibited-in-133 accounts MUST be 100% valid under Circular 200', () => {
      STATUTORY_PROHIBITED_133_CODES.forEach((code) => {
        const validation200 = validateAccountForRegime(code, 'CIRCULAR_200');
        expect(validation200.isValid).toBe(true);
        expect(validation200.isProhibited).toBe(false);
        expect(validation200.warning).toBeUndefined();

        const account200 = findAccountByCode(code, 'CIRCULAR_200');
        expect(account200, `Account ${code} must exist in Circular 200`).toBeDefined();
      });
    });
  });

  describe('1.5 Malicious / Fuzzing Inputs to Prohibition Guard', () => {
    it('should safely handle null, undefined, empty, and whitespace strings without throwing', () => {
      expect(isProhibitedInCircular133('')).toBe(false);
      expect(isProhibitedInCircular133('   ')).toBe(false);
      expect(isProhibitedInCircular133('\t\n')).toBe(false);
      // @ts-expect-error test invalid types
      expect(isProhibitedInCircular133(null)).toBe(false);
      // @ts-expect-error test invalid types
      expect(isProhibitedInCircular133(undefined)).toBe(false);

      expect(getProhibitionRule('')).toBeUndefined();
      // @ts-expect-error test invalid types
      expect(getProhibitionRule(null)).toBeUndefined();
    });

    it('should strip whitespace before checking prohibited account codes', () => {
      expect(isProhibitedInCircular133('  641  ')).toBe(true);
      expect(isProhibitedInCircular133('\t621\n')).toBe(true);
      expect(isProhibitedInCircular133('  521  ')).toBe(true);
      expect(isProhibitedInCircular133('  6421  ')).toBe(false);
    });

    it('should safely handle SQL injection and regex payloads', () => {
      const maliciousCodes = [
        "621' OR '1'='1",
        "641; DROP TABLE accounts;--",
        "<script>alert('621')</script>",
        "621.*",
        "^621$",
        "\\d{3}",
      ];

      maliciousCodes.forEach((payload) => {
        expect(() => isProhibitedInCircular133(payload)).not.toThrow();
        expect(() => validateAccountForRegime(payload, 'CIRCULAR_133')).not.toThrow();
      });
    });
  });
});

describe('ADVERSARIAL BATTERY 2: COA Search & Filter Robustness', () => {
  describe('2.1 Query Sanitization & Edge-Case Search Inputs', () => {
    it('should return all accounts when query is empty, whitespace, or tabs', () => {
      const all200 = getAccountsByRegime('CIRCULAR_200');
      expect(searchAccounts('', 'CIRCULAR_200')).toHaveLength(all200.length);
      expect(searchAccounts('   ', 'CIRCULAR_200')).toHaveLength(all200.length);
      expect(searchAccounts('\t\n  ', 'CIRCULAR_200')).toHaveLength(all200.length);
    });

    it('should handle leading and trailing whitespace around search keywords', () => {
      const exact = searchAccounts('111', 'CIRCULAR_200');
      const spaced = searchAccounts('   111   ', 'CIRCULAR_200');
      expect(spaced).toEqual(exact);
    });

    it('should handle case insensitivity across account codes and Vietnamese names', () => {
      const lower = searchAccounts('tiền mặt', 'CIRCULAR_200');
      const upper = searchAccounts('TIỀN MẶT', 'CIRCULAR_200');
      const mixed = searchAccounts('TiỀn MặT', 'CIRCULAR_200');

      expect(lower.length).toBeGreaterThan(0);
      expect(lower).toEqual(upper);
      expect(lower).toEqual(mixed);
    });

    it('should not crash when query contains regex metacharacters', () => {
      const dangerousQueries = [
        '.*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\',
        '[[[', '(?=.*)', '.*+?^${}()|[]\\',
      ];

      dangerousQueries.forEach((q) => {
        expect(() => searchAccounts(q, 'CIRCULAR_200')).not.toThrow();
      });
    });

    it('should safely handle ultra-long queries without crashing or performance lag', () => {
      const start = performance.now();
      const longQuery = 'x'.repeat(10000);
      const results = searchAccounts(longQuery, 'CIRCULAR_200');
      const duration = performance.now() - start;

      expect(results).toHaveLength(0);
      expect(duration).toBeLessThan(100); // Must execute in < 100ms
    });

    it('should return empty array for non-existent codes or gibberish', () => {
      expect(searchAccounts('999999', 'CIRCULAR_200')).toHaveLength(0);
      expect(searchAccounts('non_existent_account_name_xyz', 'CIRCULAR_200')).toHaveLength(0);
      expect(searchAccounts('000', 'CIRCULAR_133')).toHaveLength(0);
    });
  });

  describe('2.2 Single-Digit Prefix & Substring Searches', () => {
    it('1-digit query should match accounts with that digit', () => {
      for (let digit = 1; digit <= 9; digit++) {
        const query = String(digit);
        const results = searchAccounts(query, 'CIRCULAR_200');
        expect(results.length).toBeGreaterThan(0);

        // Every result must contain the digit in code, name, description, or substitute
        results.forEach((acc) => {
          const inCode = acc.code.includes(query);
          const inName = acc.nameVi.toLowerCase().includes(query);
          const inDesc = acc.description.toLowerCase().includes(query);
          const inSub = acc.substituteIn133?.toLowerCase().includes(query);
          expect(inCode || inName || inDesc || inSub).toBe(true);
        });
      }
    });
  });

  describe('2.3 Category Filtering Consistency & Strict Isolation', () => {
    const ALL_CATEGORIES: AccountCategory[] = [
      'ASSET',
      'LIABILITY',
      'EQUITY',
      'REVENUE',
      'REVENUE_DEDUCTION',
      'COST_OF_GOODS',
      'EXPENSE',
      'OTHER_INCOME_EXPENSE',
      'BUSINESS_RESULT',
    ];

    it.each(ALL_CATEGORIES)(
      'filtering by category %s must ONLY return accounts with that exact category',
      (category) => {
        const results200 = searchAccounts('', 'CIRCULAR_200', category);
        results200.forEach((acc) => {
          expect(acc.category).toBe(category);
        });

        const results133 = searchAccounts('', 'CIRCULAR_133', category);
        results133.forEach((acc) => {
          expect(acc.category).toBe(category);
        });
      }
    );

    it('category filter REVENUE_DEDUCTION should return TK 521 items in TT 200 and 0 in TT 133', () => {
      const ded200 = searchAccounts('', 'CIRCULAR_200', 'REVENUE_DEDUCTION');
      expect(ded200.length).toBeGreaterThan(0);
      expect(ded200.some((a) => a.code === '521')).toBe(true);

      const ded133 = searchAccounts('', 'CIRCULAR_133', 'REVENUE_DEDUCTION');
      expect(ded133).toHaveLength(0); // Prohibited in TT 133, so 0 active accounts!
    });

    it('combined query and category filter must satisfy both criteria simultaneously', () => {
      // 111 is an ASSET, should NOT be found under LIABILITY
      const wrongCat = searchAccounts('111', 'CIRCULAR_200', 'LIABILITY');
      expect(wrongCat).toHaveLength(0);

      const rightCat = searchAccounts('111', 'CIRCULAR_200', 'ASSET');
      expect(rightCat.length).toBeGreaterThan(0);
      expect(rightCat.every((a) => a.category === 'ASSET')).toBe(true);
    });
  });

  describe('2.4 Vietnamese Diacritics Search Behavior Documentation', () => {
    it('documents exact vs unaccented Vietnamese search behavior', () => {
      // With diacritics: should return cash accounts
      const withAccents = searchAccounts('tiền mặt', 'CIRCULAR_200');
      expect(withAccents.length).toBeGreaterThan(0);
      expect(withAccents.some((a) => a.code === '111')).toBe(true);

      // Without diacritics: documents that basic String.prototype.includes requires accented query
      const withoutAccents = searchAccounts('tien mat', 'CIRCULAR_200');
      // Empirical verification: String.includes does not strip diacritics
      expect(withoutAccents.some((a) => a.code === '111')).toBe(false);
    });
  });
});

describe('ADVERSARIAL BATTERY 3: Dual-Nature Accounts & Balance Invariants', () => {
  describe('3.1 Dual-Nature Accounts (TK 131, TK 331)', () => {
    it('TK 131 (Phải thu của khách hàng) must have normalBalance BOTH in both regimes', () => {
      const tk131_200 = findAccountByCode('131', 'CIRCULAR_200');
      expect(tk131_200).toBeDefined();
      expect(tk131_200?.normalBalance).toBe('BOTH');
      expect(tk131_200?.category).toBe('ASSET');
      expect(tk131_200?.description).toContain('lưỡng tính');

      const tk131_133 = findAccountByCode('131', 'CIRCULAR_133');
      expect(tk131_133).toBeDefined();
      expect(tk131_133?.normalBalance).toBe('BOTH');
      expect(tk131_133?.category).toBe('ASSET');
    });

    it('TK 331 (Phải trả cho người bán) must have normalBalance BOTH in both regimes', () => {
      const tk331_200 = findAccountByCode('331', 'CIRCULAR_200');
      expect(tk331_200).toBeDefined();
      expect(tk331_200?.normalBalance).toBe('BOTH');
      expect(tk331_200?.category).toBe('LIABILITY');
      expect(tk331_200?.description).toContain('lưỡng tính');

      const tk331_133 = findAccountByCode('331', 'CIRCULAR_133');
      expect(tk331_133).toBeDefined();
      expect(tk331_133?.normalBalance).toBe('BOTH');
      expect(tk331_133?.category).toBe('LIABILITY');
    });

    it('TK 333 and TK 421 must also reflect dual-nature balance capability', () => {
      const tk333_200 = findAccountByCode('333', 'CIRCULAR_200');
      expect(tk333_200?.normalBalance).toBe('BOTH');

      const tk421_200 = findAccountByCode('421', 'CIRCULAR_200');
      expect(tk421_200?.normalBalance).toBe('BOTH');
    });
  });

  describe('3.2 Contra-Accounts Special Invariants', () => {
    it('contra-asset accounts (214, 229) must have normalBalance CREDIT', () => {
      const contraAssets = ['214', '229'];
      contraAssets.forEach((code) => {
        const acc200 = findAccountByCode(code, 'CIRCULAR_200');
        expect(acc200).toBeDefined();
        expect(acc200?.category).toBe('ASSET');
        expect(acc200?.normalBalance).toBe('CREDIT');
      });
    });

    it('contra-equity account (419) must have normalBalance DEBIT', () => {
      const tk419 = findAccountByCode('419', 'CIRCULAR_200');
      expect(tk419).toBeDefined();
      expect(tk419?.category).toBe('EQUITY');
      expect(tk419?.normalBalance).toBe('DEBIT');
    });
  });

  describe('3.3 Nominal / Clearing Accounts (Classes 5, 6, 7, 8, 9) Ending Balance Invariant', () => {
    it('ALL Class 5, 6, 7, 8, 9 accounts must have normalBalance ZERO (no ending balance)', () => {
      const nominalClasses = ['5', '6', '7', '8', '9'];

      // Check Circular 200
      COA_CIRCULAR_200.forEach((acc) => {
        const firstDigit = acc.code[0];
        if (nominalClasses.includes(firstDigit)) {
          expect(
            acc.normalBalance,
            `Account ${acc.code} in Class ${firstDigit} should have normalBalance ZERO, but got ${acc.normalBalance}`
          ).toBe('ZERO');
        }
      });

      // Check Circular 133
      COA_CIRCULAR_133.forEach((acc) => {
        const firstDigit = acc.code[0];
        if (nominalClasses.includes(firstDigit)) {
          expect(
            acc.normalBalance,
            `Account ${acc.code} in Class ${firstDigit} should have normalBalance ZERO, but got ${acc.normalBalance}`
          ).toBe('ZERO');
        }
      });
    });
  });
});

describe('ADVERSARIAL BATTERY 4: All 9 Classes Structural Integrity & Schema Invariants', () => {
  describe('4.1 Class Coverage (Classes 1 through 9)', () => {
    it('Circular 200 must cover all 9 classes of accounts', () => {
      for (let c = 1; c <= 9; c++) {
        const classAccounts = COA_CIRCULAR_200.filter((a) => a.code.startsWith(String(c)));
        expect(classAccounts.length, `Class ${c} accounts missing in TT 200`).toBeGreaterThan(0);
      }
    });

    it('Circular 133 must cover all 9 classes of accounts', () => {
      for (let c = 1; c <= 9; c++) {
        const classAccounts = COA_CIRCULAR_133.filter((a) => a.code.startsWith(String(c)));
        expect(classAccounts.length, `Class ${c} accounts missing in TT 133`).toBeGreaterThan(0);
      }
    });
  });

  describe('4.2 Category Metadata Completeness', () => {
    it('CATEGORY_METADATA must define styling and metadata for all 9 AccountCategory keys', () => {
      const requiredCategories: AccountCategory[] = [
        'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'REVENUE_DEDUCTION',
        'COST_OF_GOODS', 'EXPENSE', 'OTHER_INCOME_EXPENSE', 'BUSINESS_RESULT',
      ];

      requiredCategories.forEach((cat) => {
        const meta = CATEGORY_METADATA[cat];
        expect(meta, `Missing metadata for category ${cat}`).toBeDefined();
        expect(meta.nameVi).toBeTruthy();
        expect(meta.accountClasses).toBeTruthy();
        expect(meta.colorClass).toBeTruthy();
      });
    });

    it('every account in both regimes must map to a valid CATEGORY_METADATA entry', () => {
      [...COA_CIRCULAR_200, ...COA_CIRCULAR_133].forEach((acc) => {
        const meta = CATEGORY_METADATA[acc.category];
        expect(meta, `Account ${acc.code} has unmapped category ${acc.category}`).toBeDefined();
      });
    });
  });

  describe('4.3 Uniqueness & Hierarchy Invariants', () => {
    it('no duplicate account codes must exist in COA_CIRCULAR_200', () => {
      const codes = COA_CIRCULAR_200.map((a) => a.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('no duplicate account codes must exist in COA_CIRCULAR_133', () => {
      const codes = COA_CIRCULAR_133.map((a) => a.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('every level 2 account must have a valid existing level 1 parent account', () => {
      // TT 200 Level 2 hierarchy
      const level2_200 = COA_CIRCULAR_200.filter((a) => a.level === 2);
      level2_200.forEach((sub) => {
        expect(sub.parentCode, `Account ${sub.code} missing parentCode`).toBeDefined();
        expect(sub.code.startsWith(sub.parentCode!)).toBe(true);

        const parent = COA_CIRCULAR_200.find((a) => a.code === sub.parentCode);
        expect(parent, `Parent ${sub.parentCode} of ${sub.code} not found in TT 200`).toBeDefined();

        // Trace root parent to ensure it eventually reaches Level 1 account
        let currentParent = parent;
        while (currentParent?.parentCode) {
          currentParent = COA_CIRCULAR_200.find((a) => a.code === currentParent?.parentCode);
        }
        expect(currentParent?.level, `Root parent of ${sub.code} must be level 1`).toBe(1);
        expect(currentParent?.code.length, `Root parent of ${sub.code} must be 3 digits`).toBe(3);
      });

      // TT 133 Level 2 hierarchy
      const level2_133 = COA_CIRCULAR_133.filter((a) => a.level === 2);
      level2_133.forEach((sub) => {
        expect(sub.parentCode, `Account ${sub.code} missing parentCode in TT 133`).toBeDefined();
        expect(sub.code.startsWith(sub.parentCode!)).toBe(true);

        const parent = COA_CIRCULAR_133.find((a) => a.code === sub.parentCode);
        expect(parent, `Parent ${sub.parentCode} of ${sub.code} not found in TT 133`).toBeDefined();
      });
    });
  });
});

describe('ADVERSARIAL BATTERY 5: UI Explorer & Modal User Journey Stress Tests', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render CoaExplorer in Circular 200 mode and display accounts', () => {
    let currentRegime: any = 'CIRCULAR_200';
    const setRegime = (r: any) => { currentRegime = r; };

    render(<CoaExplorer currentRegime={currentRegime} onRegimeChange={setRegime} />);

    expect(screen.getByText(/Thông tư 200\/2014\/TT-BTC/)).toBeDefined();
    expect(screen.getByText('TK 111')).toBeDefined();
    expect(screen.getByText('TK 131')).toBeDefined();
    expect(screen.getByText('TK 331')).toBeDefined();
  });

  it('should display Circular 133 safeguard warning banner when in TT 133 mode', () => {
    let currentRegime: any = 'CIRCULAR_133';
    const setRegime = (r: any) => { currentRegime = r; };

    render(<CoaExplorer currentRegime={currentRegime} onRegimeChange={setRegime} />);

    // Prohibited warning banner must be visible
    expect(screen.getByText(/Quy tắc cấm trong TT 133:/)).toBeDefined();
    expect(screen.getByText('Chỉ xem các TK bị cấm')).toBeDefined();

    // Toggle prohibited accounts view
    const toggleProhibitedBtn = screen.getByText('Chỉ xem các TK bị cấm');
    fireEvent.click(toggleProhibitedBtn);

    expect(screen.getByText('Đang lọc TK bị cấm')).toBeDefined();
    expect(screen.getAllByText('TK 621').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('TK 641').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('TK 521').length).toBeGreaterThanOrEqual(1);
  });

  it('should open CoaDetailModal with prohibited warning and handle replacement navigation', () => {
    render(<CoaExplorer currentRegime="CIRCULAR_133" onRegimeChange={() => {}} />);

    // Filter prohibited
    fireEvent.click(screen.getByText('Chỉ xem các TK bị cấm'));

    // Click on TK 641 card (select the one inside the card grid)
    const elements641 = screen.getAllByText('TK 641');
    const cardBadge = elements641.find((el) => el.closest('.group'));
    expect(cardBadge).toBeDefined();
    const card641 = cardBadge!.closest('.group')!;
    fireEvent.click(card641);

    // Modal opens
    expect(screen.getByText(/CẢNH BÁO: TÀI KHOẢN KHÔNG ÁP DỤNG TRONG THÔNG TƯ 133/)).toBeDefined();
    expect(screen.getByText(/TK 6421: Chi phí bán hàng/)).toBeDefined();

    // Click replacement button
    const replaceBtn = screen.getByText('Xem TK thay thế');
    fireEvent.click(replaceBtn);

    // Modal closes and search is filtered to 6421
    expect(screen.queryByText(/CẢNH BÁO: TÀI KHOẢN KHÔNG ÁP DỤNG TRONG THÔNG TƯ 133/)).toBeNull();
    expect(screen.getAllByText('TK 6421').length).toBeGreaterThanOrEqual(1);
  });

  it('should filter accounts by Category pills and handle reset', () => {
    render(<CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />);

    // Click KQKD (Category: BUSINESS_RESULT)
    const kqkdBtn = screen.getByText('Loại 9: KQKD');
    fireEvent.click(kqkdBtn);

    expect(screen.getByText('TK 911')).toBeDefined();
    expect(screen.queryByText('TK 111')).toBeNull();

    // Click back to All
    const allBtn = screen.getByText('Tất Cả Loại TK');
    fireEvent.click(allBtn);

    expect(screen.getByText('TK 111')).toBeDefined();
    expect(screen.getByText('TK 911')).toBeDefined();
  });

  it('should handle search input typing and clear button', () => {
    render(<CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />);

    const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu tài khoản/);
    fireEvent.change(searchInput, { target: { value: 'tiền mặt' } });

    expect(screen.getByText('TK 111')).toBeDefined();

    // Click X button to clear
    const clearBtn = searchInput.parentElement?.querySelector('button');
    expect(clearBtn).toBeDefined();
    fireEvent.click(clearBtn!);

    expect((searchInput as HTMLInputElement).value).toBe('');
  });
});
