import { describe, it, expect } from 'vitest';
import {
  isProhibitedInCircular133,
  getProhibitionRule,
  getProhibitedAccountInfo,
  validateAccountForRegime,
  getProhibitedAccounts133,
  PROHIBITED_IN_133,
  PROHIBITED_ACCOUNTS_ITEMS,
} from '@/data/prohibited-accounts';
import { COA_CIRCULAR_133 } from '@/data/coa-circular-133';
import { COA_CIRCULAR_200 } from '@/data/coa-circular-200';
import { findAccountByCode } from '@/data/coa-service';

/**
 * ============================================================================
 * ADVERSARIAL STRESS TEST SUITE: TT 133 PROHIBITED ACCOUNTS & SAFEGUARDS
 * Milestone 5 — Empirical Challenger Harness (challenger_m5_2)
 * ============================================================================
 */

describe('ADVERSARIAL SUITE M5-2: Circular 133 Prohibited Accounts Deep Verification', () => {
  const ALL_13_PROHIBITED_CODES = [
    '621', // CP NVL trực tiếp -> 154
    '622', // CP Nhân công trực tiếp -> 154
    '623', // CP Máy thi công -> 154
    '627', // CP Sản xuất chung -> 154
    '641', // CP Bán hàng -> 6421
    '521', // Giảm trừ doanh thu -> 511
    '413', // Chênh lệch tỷ giá -> 515 / 635
    '157', // Hàng gửi đi bán -> 156
    '212', // TSCĐ thuê tài chính -> 211
    '213', // TSCĐ vô hình -> 2113
    '113', // Tiền đang chuyển -> 111 / 112
    '243', // Tài sản thuế hoãn lại -> Không sử dụng
    '347', // Thuế hoãn lại phải trả -> Không sử dụng
  ] as const;

  // ==========================================================================
  // BATTERY 1: ALL 13 PROHIBITED ACCOUNTS VERIFICATION
  // ==========================================================================
  describe('Battery 1: All 13 Prohibited Accounts Complete Verification', () => {
    it('should have exactly 13 prohibited accounts in PROHIBITED_IN_133 mapping', () => {
      const keys = Object.keys(PROHIBITED_IN_133);
      expect(keys).toHaveLength(13);
      ALL_13_PROHIBITED_CODES.forEach((code) => {
        expect(keys).toContain(code);
      });
    });

    it('should have exactly 13 prohibited items in PROHIBITED_ACCOUNTS_ITEMS array', () => {
      expect(PROHIBITED_ACCOUNTS_ITEMS).toHaveLength(13);
      const itemCodes = PROHIBITED_ACCOUNTS_ITEMS.map((item) => item.code);
      ALL_13_PROHIBITED_CODES.forEach((code) => {
        expect(itemCodes).toContain(code);
      });
    });

    it.each(ALL_13_PROHIBITED_CODES)(
      'account %s must be identified as prohibited with complete statutory rule',
      (code) => {
        // 1. isProhibitedInCircular133 check
        expect(isProhibitedInCircular133(code)).toBe(true);

        // 2. getProhibitionRule & getProhibitedAccountInfo parity
        const rule = getProhibitionRule(code);
        const info = getProhibitedAccountInfo(code);
        expect(rule).toBeDefined();
        expect(info).toBeDefined();
        expect(rule).toEqual(info);

        // 3. Rule metadata fields validation
        expect(rule?.code).toBe(code);
        expect(rule?.nameVi).toBeTruthy();
        expect(rule?.reasonVi).toBeTruthy();
        expect(rule?.reasonVi).toContain('133');
        expect(rule?.substituteCode).toBeTruthy();
        expect(rule?.substituteNameVi).toBeTruthy();
        expect(rule?.remedyGuideVi).toBeTruthy();
        expect(rule?.statutoryBasis).toBeTruthy();

        // 4. validateAccountForRegime under CIRCULAR_133
        const validation = validateAccountForRegime(code, 'CIRCULAR_133');
        expect(validation.isValid).toBe(false);
        expect(validation.isProhibited).toBe(true);
        expect(validation.warning).toBeDefined();
        expect(validation.warning).toContain(code);
        expect(validation.warning).toContain('KHÔNG ĐƯỢC PHÉP');
        expect(validation.substituteCode).toBe(rule?.substituteCode);
        expect(validation.substituteNameVi).toBe(rule?.substituteNameVi);
      }
    );

    it('all 13 prohibited accounts MUST NOT exist in active COA_CIRCULAR_133 array', () => {
      ALL_13_PROHIBITED_CODES.forEach((code) => {
        const found = COA_CIRCULAR_133.find((a) => a.code === code);
        expect(found, `Prohibited account ${code} must NOT be in COA_CIRCULAR_133`).toBeUndefined();
      });
    });

    it('all 13 prohibited accounts MUST exist in standard COA_CIRCULAR_200 array', () => {
      ALL_13_PROHIBITED_CODES.forEach((code) => {
        const found = COA_CIRCULAR_200.find((a) => a.code === code);
        expect(found, `Account ${code} must exist in COA_CIRCULAR_200`).toBeDefined();
      });
    });

    it('specific replacement logic should conform to Circular 133/2016/TT-BTC', () => {
      // Manufacturing cost accounts -> 154
      ['621', '622', '623', '627'].forEach((code) => {
        const rule = getProhibitionRule(code);
        expect(rule?.substituteCode).toBe('154');
        expect(rule?.statutoryBasis).toContain('Điều 58');
      });

      // Selling expense 641 -> 6421
      const r641 = getProhibitionRule('641');
      expect(r641?.substituteCode).toBe('6421');
      expect(r641?.statutoryBasis).toContain('Điều 62');

      // Revenue deduction 521 -> 511
      const r521 = getProhibitionRule('521');
      expect(r521?.substituteCode).toBe('511');
      expect(r521?.statutoryBasis).toContain('Điều 56');

      // Forex difference 413 -> 515 / 635
      const r413 = getProhibitionRule('413');
      expect(r413?.substituteCode).toContain('515');
      expect(r413?.statutoryBasis).toContain('Điều 52');

      // Consignment goods 157 -> 156
      const r157 = getProhibitionRule('157');
      expect(r157?.substituteCode).toBe('156');
      expect(r157?.statutoryBasis).toContain('Điều 26');

      // Finance lease asset 212 -> 211
      const r212 = getProhibitionRule('212');
      expect(r212?.substituteCode).toBe('211');
      expect(r212?.statutoryBasis).toContain('Điều 31');

      // Intangible asset 213 -> 2113
      const r213 = getProhibitionRule('213');
      expect(r213?.substituteCode).toBe('2113');
      expect(r213?.statutoryBasis).toContain('Điều 31');

      // Cash in transit 113 -> 111 / 112
      const r113 = getProhibitionRule('113');
      expect(r113?.substituteCode).toContain('111');
      expect(r113?.statutoryBasis).toContain('Điều 13');

      // Deferred tax accounts 243 & 347 -> Không sử dụng
      ['243', '347'].forEach((code) => {
        const rule = getProhibitionRule(code);
        expect(rule?.substituteCode).toBe('Không sử dụng');
        expect(rule?.reasonVi).toContain('không áp dụng kế toán thuế');
      });
    });
  });

  // ==========================================================================
  // BATTERY 2: SUB-ACCOUNTS PREFIX INHERITANCE MATCHING
  // ==========================================================================
  describe('Battery 2: Deep Sub-Account Prefix Inheritance Matching', () => {
    const PROHIBITED_SUBACCOUNTS = [
      // 157 sub-accounts
      { subCode: '1571', parent: '157', substitute: '156' },
      { subCode: '1572', parent: '157', substitute: '156' },
      { subCode: '1578', parent: '157', substitute: '156' },
      // 212 sub-accounts
      { subCode: '2121', parent: '212', substitute: '211' },
      { subCode: '2122', parent: '212', substitute: '211' },
      // 213 sub-accounts
      { subCode: '2131', parent: '213', substitute: '2113' },
      { subCode: '2132', parent: '213', substitute: '2113' },
      { subCode: '2133', parent: '213', substitute: '2113' },
      { subCode: '2138', parent: '213', substitute: '2113' },
      // 113 sub-accounts
      { subCode: '1131', parent: '113', substitute: '111 / 112' },
      { subCode: '1132', parent: '113', substitute: '111 / 112' },
      // 243 sub-accounts
      { subCode: '2431', parent: '243', substitute: 'Không sử dụng' },
      // 347 sub-accounts
      { subCode: '3471', parent: '347', substitute: 'Không sử dụng' },
      // 641 sub-accounts
      { subCode: '6411', parent: '641', substitute: '6421' },
      { subCode: '6412', parent: '641', substitute: '6421' },
      { subCode: '6417', parent: '641', substitute: '6421' },
      { subCode: '6418', parent: '641', substitute: '6421' },
      // 621 sub-accounts
      { subCode: '6211', parent: '621', substitute: '154' },
      { subCode: '6212', parent: '621', substitute: '154' },
      // 622 sub-accounts
      { subCode: '6221', parent: '622', substitute: '154' },
      // 623 sub-accounts
      { subCode: '6231', parent: '623', substitute: '154' },
      { subCode: '6232', parent: '623', substitute: '154' },
      // 627 sub-accounts
      { subCode: '6271', parent: '627', substitute: '154' },
      { subCode: '6278', parent: '627', substitute: '154' },
      // 521 sub-accounts
      { subCode: '5211', parent: '521', substitute: '511' },
      { subCode: '5212', parent: '521', substitute: '511' },
      { subCode: '5213', parent: '521', substitute: '511' },
      // 413 sub-accounts
      { subCode: '4131', parent: '413', substitute: '515 / 635' },
      { subCode: '4132', parent: '413', substitute: '515 / 635' },
    ];

    it.each(PROHIBITED_SUBACCOUNTS)(
      'sub-account %s must inherit prohibition from parent TK %s with substitute %s',
      ({ subCode, parent, substitute }) => {
        expect(isProhibitedInCircular133(subCode)).toBe(true);

        const rule = getProhibitionRule(subCode);
        expect(rule).toBeDefined();
        expect(rule?.code).toBe(parent);
        expect(rule?.substituteCode).toBe(substitute);

        const validation = validateAccountForRegime(subCode, 'CIRCULAR_133');
        expect(validation.isValid).toBe(false);
        expect(validation.isProhibited).toBe(true);
        expect(validation.substituteCode).toBe(substitute);
      }
    );

    it('should correctly detect deep arbitrary-depth sub-accounts (5 to 8 digits)', () => {
      const deepCodes = [
        '15711',
        '157123',
        '212199',
        '21310001',
        '11311',
        '243199',
        '347100',
        '64110001',
        '62112345',
        '52111',
        '413101',
      ];

      deepCodes.forEach((deepCode) => {
        expect(isProhibitedInCircular133(deepCode)).toBe(true);
        const rule = getProhibitionRule(deepCode);
        expect(rule).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // BATTERY 3: FALSE POSITIVE SAFEGUARD (CRITICAL EMPIRICAL CHECKS)
  // ==========================================================================
  describe('Battery 3: False Positive Safeguard (CRITICAL: Valid accounts must NEVER be rejected)', () => {
    const HIGH_RISK_LOOKALIKE_ACCOUNTS = [
      // 2113 is intangible fixed assets in TT 133 — MUST NOT be blocked by 213 or 212!
      { code: '2113', name: 'TSCĐ vô hình trong TT 133' },
      { code: '211', name: 'Tài sản cố định tổng hợp' },
      { code: '2111', name: 'TSCĐ hữu hình' },
      { code: '2112', name: 'TSCĐ thuê tài chính (chi tiết TT 133)' },
      { code: '214', name: 'Hao mòn TSCĐ' },
      { code: '2141', name: 'Hao mòn TSCĐ hữu hình' },
      { code: '2142', name: 'Hao mòn TSCĐ thuê tài chính' },
      { code: '2143', name: 'Hao mòn TSCĐ vô hình' },
      { code: '217', name: 'Bất động sản đầu tư' },

      // 6421 is selling expenses in TT 133 — MUST NOT be blocked by 641!
      { code: '6421', name: 'Chi phí bán hàng trong TT 133' },
      { code: '6422', name: 'Chi phí quản lý doanh nghiệp trong TT 133' },
      { code: '642', name: 'Chi phí quản lý kinh doanh' },

      // Inventory & manufacturing accounts in TT 133
      { code: '156', name: 'Hàng hóa' },
      { code: '1561', name: 'Giá mua hàng hóa' },
      { code: '1562', name: 'Chi phí thu mua hàng hóa' },
      { code: '154', name: 'Chi phí SXKD dở dang' },
      { code: '1541', name: 'Chi phí SXKD dở dang NVL' },
      { code: '1542', name: 'Chi phí SXKD dở dang Nhân công' },
      { code: '151', name: 'Hàng mua đang đi đường' },
      { code: '152', name: 'Nguyên liệu, vật liệu' },
      { code: '153', name: 'Công cụ, dụng cụ' },
      { code: '155', name: 'Thành phẩm' },

      // Cash & Bank accounts in TT 133 — MUST NOT be blocked by 113!
      { code: '111', name: 'Tiền mặt' },
      { code: '1111', name: 'Tiền Việt Nam' },
      { code: '1112', name: 'Ngoại tệ' },
      { code: '112', name: 'Tiền gửi ngân hàng' },
      { code: '1121', name: 'Tiền gửi VNĐ' },
      { code: '1122', name: 'Tiền gửi ngoại tệ' },

      // Prepayments & construction in progress — MUST NOT be blocked by 243!
      { code: '241', name: 'XDCB dở dang' },
      { code: '2411', name: 'Mua sắm TSCĐ' },
      { code: '2412', name: 'Xây dựng cơ bản' },
      { code: '242', name: 'Chi phí trả trước' },

      // Liabilities — MUST NOT be blocked by 347!
      { code: '341', name: 'Vay và nợ thuê tài chính' },
      { code: '3411', name: 'Các khoản đi vay' },
      { code: '3412', name: 'Nợ thuê tài chính' },
      { code: '331', name: 'Phải trả người bán' },
      { code: '333', name: 'Thuế và các khoản phải nộp' },
      { code: '3331', name: 'Thuế GTGT phải nộp' },

      // Equity & Forex — MUST NOT be blocked by 413!
      { code: '411', name: 'Vốn đầu tư của CSH' },
      { code: '4111', name: 'Vốn góp của CSH' },
      { code: '418', name: 'Các quỹ khác thuộc VCSH' },
      { code: '421', name: 'Lợi nhuận chưa phân phối' },
      { code: '4211', name: 'LN chưa phân phối năm trước' },
      { code: '4212', name: 'LN chưa phân phối năm nay' },

      // Revenue & Finance — MUST NOT be blocked by 521!
      { code: '511', name: 'Doanh thu bán hàng' },
      { code: '5111', name: 'Doanh thu bán hàng hóa' },
      { code: '5112', name: 'Doanh thu bán thành phẩm' },
      { code: '5113', name: 'Doanh thu dịch vụ' },
      { code: '515', name: 'Doanh thu hoạt động tài chính' },
      { code: '635', name: 'Chi phí tài chính' },

      // Other standard accounts
      { code: '632', name: 'Giá vốn hàng bán' },
      { code: '711', name: 'Thu nhập khác' },
      { code: '811', name: 'Chi phí khác' },
      { code: '821', name: 'Chi phí thuế TNDN' },
      { code: '911', name: 'Xác định kết quả kinh doanh' },
    ];

    it.each(HIGH_RISK_LOOKALIKE_ACCOUNTS)(
      'valid account %s (%s) must NOT be falsely rejected under Circular 133',
      ({ code }) => {
        // Must return false for prohibited check
        expect(isProhibitedInCircular133(code)).toBe(false);

        // Must return undefined for prohibition rule
        expect(getProhibitionRule(code)).toBeUndefined();
        expect(getProhibitedAccountInfo(code)).toBeUndefined();

        // Must be valid under validateAccountForRegime in Circular 133
        const val133 = validateAccountForRegime(code, 'CIRCULAR_133');
        expect(val133.isValid).toBe(true);
        expect(val133.isProhibited).toBe(false);
        expect(val133.warning).toBeUndefined();

        // Must be valid under validateAccountForRegime in Circular 200
        const val200 = validateAccountForRegime(code, 'CIRCULAR_200');
        expect(val200.isValid).toBe(true);
        expect(val200.isProhibited).toBe(false);
      }
    );

    it('crucial distinction: 2113 (Valid TT133) vs 213 (Prohibited TT133)', () => {
      // 2113 is Intangible Fixed Assets sub-account in TT 133 (valid!)
      expect(isProhibitedInCircular133('2113')).toBe(false);
      const val2113 = validateAccountForRegime('2113', 'CIRCULAR_133');
      expect(val2113.isValid).toBe(true);
      expect(val2113.isProhibited).toBe(false);

      // 213 is Intangible Fixed Assets standalone level-1 account in TT 200 (prohibited in TT 133!)
      expect(isProhibitedInCircular133('213')).toBe(true);
      const val213 = validateAccountForRegime('213', 'CIRCULAR_133');
      expect(val213.isValid).toBe(false);
      expect(val213.isProhibited).toBe(true);
      expect(val213.substituteCode).toBe('2113');
    });

    it('crucial distinction: 6421 (Valid TT133) vs 641 (Prohibited TT133)', () => {
      // 6421 is Selling Expenses sub-account in TT 133 (valid!)
      expect(isProhibitedInCircular133('6421')).toBe(false);
      const val6421 = validateAccountForRegime('6421', 'CIRCULAR_133');
      expect(val6421.isValid).toBe(true);
      expect(val6421.isProhibited).toBe(false);

      // 641 is Selling Expenses level-1 account in TT 200 (prohibited in TT 133!)
      expect(isProhibitedInCircular133('641')).toBe(true);
      const val641 = validateAccountForRegime('641', 'CIRCULAR_133');
      expect(val641.isValid).toBe(false);
      expect(val641.isProhibited).toBe(true);
      expect(val641.substituteCode).toBe('6421');
    });

    it('crucial distinction: 156 (Valid TT133) vs 157 (Prohibited TT133)', () => {
      expect(isProhibitedInCircular133('156')).toBe(false);
      expect(isProhibitedInCircular133('157')).toBe(true);
      expect(validateAccountForRegime('156', 'CIRCULAR_133').isValid).toBe(true);
      expect(validateAccountForRegime('157', 'CIRCULAR_133').isValid).toBe(false);
    });

    it('crucial distinction: 111/112 (Valid TT133) vs 113 (Prohibited TT133)', () => {
      expect(isProhibitedInCircular133('111')).toBe(false);
      expect(isProhibitedInCircular133('112')).toBe(false);
      expect(isProhibitedInCircular133('113')).toBe(true);
      expect(validateAccountForRegime('111', 'CIRCULAR_133').isValid).toBe(true);
      expect(validateAccountForRegime('112', 'CIRCULAR_133').isValid).toBe(true);
      expect(validateAccountForRegime('113', 'CIRCULAR_133').isValid).toBe(false);
    });

    it('ZERO FALSE POSITIVES across entire COA_CIRCULAR_133 official dataset', () => {
      const falsePositives: string[] = [];

      COA_CIRCULAR_133.forEach((acc) => {
        if (isProhibitedInCircular133(acc.code)) {
          falsePositives.push(acc.code);
        }
      });

      expect(falsePositives, 'Every active account in COA_CIRCULAR_133 must be valid').toEqual([]);
    });
  });

  // ==========================================================================
  // BATTERY 4: EDGE CASES, SANITIZATION & FUZZING INPUTS
  // ==========================================================================
  describe('Battery 4: Edge Cases, Input Sanitization & Fuzzing Inputs', () => {
    it('should handle empty strings, blank spaces, tabs and newlines gracefully', () => {
      const blanks = ['', '   ', '\t', '\n', ' \t \r\n '];

      blanks.forEach((blank) => {
        expect(isProhibitedInCircular133(blank)).toBe(false);
        expect(getProhibitionRule(blank)).toBeUndefined();
        const res133 = validateAccountForRegime(blank, 'CIRCULAR_133');
        expect(res133.isValid).toBe(true);
        expect(res133.isProhibited).toBe(false);
      });
    });

    it('should safely handle null and undefined without throwing runtime errors', () => {
      // @ts-expect-error test invalid inputs
      expect(isProhibitedInCircular133(null)).toBe(false);
      // @ts-expect-error test invalid inputs
      expect(isProhibitedInCircular133(undefined)).toBe(false);

      // @ts-expect-error test invalid inputs
      expect(getProhibitionRule(null)).toBeUndefined();
      // @ts-expect-error test invalid inputs
      expect(getProhibitionRule(undefined)).toBeUndefined();

      // @ts-expect-error test invalid inputs
      const resNull = validateAccountForRegime(null, 'CIRCULAR_133');
      expect(resNull.isValid).toBe(true);
      expect(resNull.isProhibited).toBe(false);

      // @ts-expect-error test invalid inputs
      const resUndef = validateAccountForRegime(undefined, 'CIRCULAR_133');
      expect(resUndef.isValid).toBe(true);
      expect(resUndef.isProhibited).toBe(false);
    });

    it('should strip leading and trailing whitespace before evaluating prohibition', () => {
      expect(isProhibitedInCircular133('  621  ')).toBe(true);
      expect(isProhibitedInCircular133('\t157\n')).toBe(true);
      expect(isProhibitedInCircular133('   2131   ')).toBe(true);
      expect(isProhibitedInCircular133('  6421  ')).toBe(false);
      expect(isProhibitedInCircular133('  2113  ')).toBe(false);
    });

    it('should return false for non-existent account codes and gibberish', () => {
      const nonExistent = ['9999', '000', '999', 'ABC', 'XYZ', '123456789', '---', 'NaN'];

      nonExistent.forEach((code) => {
        expect(isProhibitedInCircular133(code)).toBe(false);
        expect(getProhibitionRule(code)).toBeUndefined();
        const res = validateAccountForRegime(code, 'CIRCULAR_133');
        expect(res.isValid).toBe(true);
        expect(res.isProhibited).toBe(false);
      });
    });

    it('should NOT treat broad single/double-digit prefixes as prohibited', () => {
      // '6' or '62' should not trigger prohibition
      const truncated = ['6', '62', '1', '15', '2', '21', '11', '24', '3', '34', '5', '52', '4', '41'];

      truncated.forEach((code) => {
        expect(isProhibitedInCircular133(code)).toBe(false);
        expect(getProhibitionRule(code)).toBeUndefined();
      });
    });

    it('should safely handle malicious injection payloads without throwing', () => {
      const payloads = [
        "621' OR '1'='1",
        "641; DROP TABLE accounts;--",
        "<script>alert('621')</script>",
        "621.*",
        "^621$",
        "\\d{3}",
        "[object Object]",
      ];

      payloads.forEach((payload) => {
        expect(() => isProhibitedInCircular133(payload)).not.toThrow();
        expect(() => getProhibitionRule(payload)).not.toThrow();
        expect(() => validateAccountForRegime(payload, 'CIRCULAR_133')).not.toThrow();
      });
    });
  });

  // ==========================================================================
  // BATTERY 5: REGIME SWITCHING & ASYMMETRY (TT 200 vs TT 133)
  // ==========================================================================
  describe('Battery 5: Regime Switching & Asymmetry (TT 200 vs TT 133)', () => {
    it('ALL 13 prohibited accounts MUST be completely valid under Circular 200', () => {
      ALL_13_PROHIBITED_CODES.forEach((code) => {
        const res200 = validateAccountForRegime(code, 'CIRCULAR_200');
        expect(res200.isValid).toBe(true);
        expect(res200.isProhibited).toBe(false);
        expect(res200.warning).toBeUndefined();

        const account200 = findAccountByCode(code, 'CIRCULAR_200');
        expect(account200, `Account ${code} must exist in Circular 200`).toBeDefined();
      });
    });

    it('should remain purely idempotent and deterministic across repeated regime toggles', () => {
      const testCases = [
        { code: '641', prohibitedIn133: true },
        { code: '6421', prohibitedIn133: false },
        { code: '157', prohibitedIn133: true },
        { code: '213', prohibitedIn133: true },
        { code: '2113', prohibitedIn133: false },
        { code: '111', prohibitedIn133: false },
      ];

      // Alternating regime toggling for 100 iterations
      for (let i = 0; i < 100; i++) {
        const regime = i % 2 === 0 ? 'CIRCULAR_200' : 'CIRCULAR_133';

        testCases.forEach(({ code, prohibitedIn133 }) => {
          const res = validateAccountForRegime(code, regime);
          if (regime === 'CIRCULAR_200') {
            expect(res.isValid).toBe(true);
            expect(res.isProhibited).toBe(false);
          } else {
            expect(res.isValid).toBe(!prohibitedIn133);
            expect(res.isProhibited).toBe(prohibitedIn133);
          }
        });
      }
    });
  });

  // ==========================================================================
  // BATTERY 6: getProhibitedAccounts133 API CONTRACT
  // ==========================================================================
  describe('Battery 6: getProhibitedAccounts133 API Contract Verification', () => {
    it('calling getProhibitedAccounts133() without arguments should return 7 items for test backward compatibility', () => {
      const items = getProhibitedAccounts133();
      expect(items).toHaveLength(7);
      items.forEach((item) => {
        expect(item.isProhibitedIn133).toBe(true);
      });
    });

    it('calling getProhibitedAccounts133(true) should return all 13 items', () => {
      const allItems = getProhibitedAccounts133(true);
      expect(allItems).toHaveLength(13);
      const codes = allItems.map((a) => a.code);
      ALL_13_PROHIBITED_CODES.forEach((c) => {
        expect(codes).toContain(c);
      });
    });

    it('calling getProhibitedAccounts133(code) should filter accurately without false matches', () => {
      // Target match for 157
      const res157 = getProhibitedAccounts133('157');
      expect(res157).toHaveLength(1);
      expect(res157[0].code).toBe('157');

      // Prefix match for sub-account 1571
      const res1571 = getProhibitedAccounts133('1571');
      expect(res1571).toHaveLength(1);
      expect(res1571[0].code).toBe('157');

      // Valid lookalike accounts must return empty array
      expect(getProhibitedAccounts133('2113')).toHaveLength(0);
      expect(getProhibitedAccounts133('6421')).toHaveLength(0);
      expect(getProhibitedAccounts133('156')).toHaveLength(0);
      expect(getProhibitedAccounts133('154')).toHaveLength(0);
      expect(getProhibitedAccounts133('111')).toHaveLength(0);
      expect(getProhibitedAccounts133('112')).toHaveLength(0);
    });
  });
});
