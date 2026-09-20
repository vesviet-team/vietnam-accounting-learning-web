import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoaExplorer, removeVietnameseAccents } from '@/components/coa/CoaExplorer';
import { getAccountsByRegime } from '@/data/coa-service';

describe('CHALLENGER BATTERY: Diacritic Search & Account Accessibility in CoaExplorer', () => {
  const allAccounts200 = getAccountsByRegime('CIRCULAR_200');
  const allAccounts133 = getAccountsByRegime('CIRCULAR_133');

  // Helper to find account card badge: <span ...>TK {code}</span>
  const hasAccountBadge = (code: string): boolean => {
    const badges = screen.queryAllByText((_content, element) => {
      return (
        element?.tagName.toLowerCase() === 'span' &&
        element.textContent?.replace(/\s+/g, ' ').trim() === `TK ${code}`
      );
    });
    return badges.length > 0;
  };

  // =========================================================================
  // 1. DIACRITIC VS NON-DIACRITIC SEARCH QUERIES
  // =========================================================================
  describe('1. Vietnamese Search Queries: Accented vs Unaccented Equivalence', () => {
    const testPairs = [
      { name: 'phải trả / phai tra', accented: 'phải trả', unaccented: 'phai tra', sampleExpectedCode: '331' },
      { name: 'ngân hàng / ngan hang', accented: 'ngân hàng', unaccented: 'ngan hang', sampleExpectedCode: '112' },
      { name: 'chi phí / chi phi', accented: 'chi phí', unaccented: 'chi phi', sampleExpectedCode: '642' },
      { name: 'tạm ứng / tam ung', accented: 'tạm ứng', unaccented: 'tam ung', sampleExpectedCode: '141' },
      { name: 'tiền mặt / tien mat', accented: 'tiền mặt', unaccented: 'tien mat', sampleExpectedCode: '111' },
      { name: 'hao mòn / hao mon', accented: 'hao mòn', unaccented: 'hao mon', sampleExpectedCode: '214' },
      { name: 'thuế / thue', accented: 'thuế', unaccented: 'thue', sampleExpectedCode: '333' },
      { name: 'doanh thu / doanh thu', accented: 'doanh thu', unaccented: 'doanh thu', sampleExpectedCode: '511' },
      { name: 'phải thu / phai thu', accented: 'phải thu', unaccented: 'phai thu', sampleExpectedCode: '131' },
      { name: 'dự phòng / du phong', accented: 'dự phòng', unaccented: 'du phong', sampleExpectedCode: '229' },
    ];

    testPairs.forEach(({ name, accented, unaccented, sampleExpectedCode }) => {
      it(`[Query Equivalence] ${name}: both accented and unaccented must reach TK ${sampleExpectedCode}`, () => {
        const { unmount: unmount1 } = render(
          <CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />
        );
        const searchInput1 = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);

        // Search with diacritics
        fireEvent.change(searchInput1, { target: { value: accented } });
        expect(hasAccountBadge(sampleExpectedCode)).toBe(true);
        unmount1();

        // Search without diacritics
        const { unmount: unmount2 } = render(
          <CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />
        );
        const searchInput2 = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);
        fireEvent.change(searchInput2, { target: { value: unaccented } });
        expect(hasAccountBadge(sampleExpectedCode)).toBe(true);
        unmount2();
      });
    });

    it('should be case-insensitive across uppercase, lowercase, and mixed case with accents', () => {
      const { unmount } = render(
        <CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />
      );
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);

      const variations = ['PHẢI TRẢ', 'phải trả', 'PhẢi TrẢ', 'PHAI TRA', 'phai tra', 'PhAi TrA'];
      for (const query of variations) {
        fireEvent.change(searchInput, { target: { value: query } });
        expect(hasAccountBadge('331')).toBe(true);
      }
      unmount();
    });

    it('should test character normalization function removeVietnameseAccents on edge letters (đ, Đ, ơ, ư, ă, â, ê, ô)', () => {
      expect(removeVietnameseAccents('định khoản')).toBe('dinh khoan');
      expect(removeVietnameseAccents('ĐỊNH KHOẢN')).toBe('DINH KHOAN');
      expect(removeVietnameseAccents('lương bổng')).toBe('luong bong');
      expect(removeVietnameseAccents('thặng dư')).toBe('thang du');
      expect(removeVietnameseAccents('nghiệp vụ')).toBe('nghiep vu');
    });

    it('investigates colloquial query "khấu hao" vs statutory name "hao mòn" for TK 214', () => {
      const { unmount } = render(
        <CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />
      );
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);

      // Searching statutory term "hao mòn" finds TK 214
      fireEvent.change(searchInput, { target: { value: 'hao mòn' } });
      expect(hasAccountBadge('214')).toBe(true);

      // Searching unaccented "hao mon" finds TK 214
      fireEvent.change(searchInput, { target: { value: 'hao mon' } });
      expect(hasAccountBadge('214')).toBe(true);

      // Searching colloquial "khấu hao": check if description or name contains it
      fireEvent.change(searchInput, { target: { value: 'khấu hao' } });
      const foundWithKhauHao = hasAccountBadge('214');
      // In coa-circular-200, TK 214 does not contain "khấu hao", only "hao mòn"
      expect(foundWithKhauHao).toBe(false);
      unmount();
    });
  });

  // =========================================================================
  // 2. ACCOUNT CODE SEARCH (3-DIGIT & 4-DIGIT)
  // =========================================================================
  describe('2. Account Code Search (3-digit and 4-digit)', () => {
    it('should find 3-digit parent account 111 and its child 4-digit sub-accounts (1111, 1112, 1113)', () => {
      render(<CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />);
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);
      fireEvent.change(searchInput, { target: { value: '111' } });

      expect(hasAccountBadge('111')).toBe(true);
      expect(hasAccountBadge('1111')).toBe(true);
      expect(hasAccountBadge('1112')).toBe(true);
      expect(hasAccountBadge('1113')).toBe(true);
    });

    it('should find 4-digit account 1111 exclusively when searching exact 1111', () => {
      render(<CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />);
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);
      fireEvent.change(searchInput, { target: { value: '1111' } });

      expect(hasAccountBadge('1111')).toBe(true);
      expect(hasAccountBadge('111')).toBe(false);
      expect(hasAccountBadge('1112')).toBe(false);
      expect(hasAccountBadge('1113')).toBe(false);
    });

    it('should find dual-nature account 331 (Phải trả cho người bán)', () => {
      render(<CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />);
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);
      fireEvent.change(searchInput, { target: { value: '331' } });

      expect(hasAccountBadge('331')).toBe(true);
      expect(screen.getByRole('heading', { name: 'Phải trả cho người bán' })).toBeInTheDocument();
    });

    it('should find closing account 911 (Xác định kết quả kinh doanh)', () => {
      render(<CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />);
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);
      fireEvent.change(searchInput, { target: { value: '911' } });

      expect(hasAccountBadge('911')).toBe(true);
      expect(screen.getByRole('heading', { name: 'Xác định kết quả kinh doanh' })).toBeInTheDocument();
    });

    it('investigates prefix search queries "TK 111", "tk 111", "TK111", "tk111"', () => {
      const { unmount } = render(
        <CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />
      );
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);

      // "TK 111"
      fireEvent.change(searchInput, { target: { value: 'TK 111' } });
      const tkSpacedMatches = hasAccountBadge('111');

      // "tk 111"
      fireEvent.change(searchInput, { target: { value: 'tk 111' } });
      const tkLowerMatches = hasAccountBadge('111');

      // "TK111"
      fireEvent.change(searchInput, { target: { value: 'TK111' } });
      const tkCombinedMatches = hasAccountBadge('111');

      // "111"
      fireEvent.change(searchInput, { target: { value: '111' } });
      const plainCodeMatches = hasAccountBadge('111');

      expect(plainCodeMatches).toBe(true);
      // Empirical verification: _normalizedSearch consists of:
      // `${codeLower} ${nameLower} ${nameNoAccents} ${descLower} ${descNoAccents} ${subLower} ${subNoAccents}`
      // without synthetic "tk <codeLower>" token.
      expect(tkSpacedMatches).toBe(false);
      expect(tkLowerMatches).toBe(false);
      expect(tkCombinedMatches).toBe(false);
      unmount();
    });
  });

  // =========================================================================
  // 3. EDGE CASES & ADVERSARIAL INPUTS
  // =========================================================================
  describe('3. Edge Cases & Adversarial Search Inputs', () => {
    it('empty search string should display full account list', () => {
      const { container } = render(<CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />);
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);
      fireEvent.change(searchInput, { target: { value: '' } });

      expect(container.querySelector('strong.text-emerald-600, strong.text-emerald-400')?.textContent).toBe(String(allAccounts200.length));
      expect(hasAccountBadge('111')).toBe(true);
      expect(hasAccountBadge('911')).toBe(true);
    });

    it('whitespace-only queries should trim and display full account list without crashing', () => {
      const { container } = render(<CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />);
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);

      const whitespaceInputs = [' ', '   ', '\t\t', '  \n  '];
      for (const ws of whitespaceInputs) {
        fireEvent.change(searchInput, { target: { value: ws } });
        expect(container.querySelector('strong.text-emerald-600, strong.text-emerald-400')?.textContent).toBe(String(allAccounts200.length));
      }
    });

    it('non-existent account codes (e.g. 9999, 000, ABCXYZ) should show 0 results and friendly empty state', () => {
      const { container } = render(<CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />);
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);

      fireEvent.change(searchInput, { target: { value: '9999' } });
      expect(container.querySelector('strong.text-emerald-600, strong.text-emerald-400')?.textContent).toBe('0');
      expect(screen.getByText('Không tìm thấy tài khoản phù hợp')).toBeInTheDocument();

      // Reset button should restore all accounts
      const resetBtn = screen.getByRole('button', { name: 'Đặt lại tất cả bộ lọc' });
      fireEvent.click(resetBtn);
      expect(container.querySelector('strong.text-emerald-600, strong.text-emerald-400')?.textContent).toBe(String(allAccounts200.length));
    });

    it('special characters and regex injection attempts should not crash or throw', () => {
      render(<CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />);
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);

      const maliciousQueries = [
        '.*',
        '(111)+',
        '[0-9]{3}',
        '\\',
        '\\d+',
        '(?=.*)',
        '[$^&*()+?{}|[\\]/\\\\]',
        '<script>alert("xss")</script>',
        '{"code": "111"}',
        '\' OR \'1\'=\'1',
        '-- drop table accounts;',
        '~`!@#$%^&*()-_=+[{]}\\|;:\'",<.>/?',
      ];

      for (const query of maliciousQueries) {
        expect(() => {
          fireEvent.change(searchInput, { target: { value: query } });
        }).not.toThrow();
      }
    });

    it('handles extremely long queries without freezing or crashing', () => {
      const { container } = render(<CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />);
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);

      const longQuery = 'tiền mặt '.repeat(500);
      expect(() => {
        fireEvent.change(searchInput, { target: { value: longQuery } });
      }).not.toThrow();
      expect(container.querySelector('strong.text-emerald-600, strong.text-emerald-400')?.textContent).toBe('0');
    });
  });

  // =========================================================================
  // 4. REACHABILITY & CLASSIFICATION OF TT200 & TT133 ACCOUNTS
  // =========================================================================
  describe('4. Reachability & Correct Classification of TT200 and TT133 Accounts', () => {
    it('documents actual account counts in current dataset (154 in TT200, 57 in TT133)', () => {
      expect(allAccounts200).toHaveLength(154);
      expect(allAccounts133).toHaveLength(57);
    });

    it('verifies zero duplicated account codes within each regime', () => {
      const codes200 = allAccounts200.map((a) => a.code);
      const uniqueCodes200 = new Set(codes200);
      expect(uniqueCodes200.size).toBe(codes200.length);

      const codes133 = allAccounts133.map((a) => a.code);
      const uniqueCodes133 = new Set(codes133);
      expect(uniqueCodes133.size).toBe(codes133.length);
    });

    it('verifies all accounts have non-empty nameVi, valid category, and valid normalBalance', () => {
      const validCategories = [
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
      const validBalances = ['DEBIT', 'CREDIT', 'ZERO', 'BOTH'];

      [...allAccounts200, ...allAccounts133].forEach((acc) => {
        expect(acc.code).toBeTruthy();
        expect(acc.nameVi).toBeTruthy();
        expect(validCategories).toContain(acc.category);
        expect(validBalances).toContain(acc.normalBalance);
      });
    });

    it('verifies level 2 sub-accounts have a valid parentCode matching an existing account in the hierarchy', () => {
      const map200 = new Map(allAccounts200.map((a) => [a.code, a]));
      allAccounts200.forEach((acc) => {
        if (acc.level === 2) {
          expect(acc.parentCode).toBeDefined();
          expect(map200.has(acc.parentCode!)).toBe(true);
          const parent = map200.get(acc.parentCode!)!;
          // Parent must be level 1 (e.g. 111 -> 1111) or level 2 for 5-digit accounts (3331 -> 33311)
          expect([1, 2]).toContain(parent.level);
          expect(acc.code.startsWith(acc.parentCode!)).toBe(true);
        }
      });

      const map133 = new Map(allAccounts133.map((a) => [a.code, a]));
      allAccounts133.forEach((acc) => {
        if (acc.level === 2) {
          expect(acc.parentCode).toBeDefined();
          expect(map133.has(acc.parentCode!)).toBe(true);
          const parent = map133.get(acc.parentCode!)!;
          expect([1, 2]).toContain(parent.level);
          expect(acc.code.startsWith(acc.parentCode!)).toBe(true);
        }
      });
    });

    it('verifies representative accounts across all 9 classes in TT200 are reachable via exact code search in CoaExplorer', () => {
      const { unmount } = render(
        <CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />
      );
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);

      const representativeCodes = [
        '111', '1111', '112', '121', '131', '152', '156', '211', '214', '229',
        '331', '333', '334', '341', '411', '511', '521', '621', '632', '641',
        '642', '711', '811', '821', '911'
      ];

      for (const code of representativeCodes) {
        fireEvent.change(searchInput, { target: { value: code } });
        expect(hasAccountBadge(code)).toBe(true);
      }
      unmount();
    });

    it('verifies representative accounts in TT133 are reachable via exact code search in CoaExplorer', () => {
      const { unmount } = render(
        <CoaExplorer currentRegime="CIRCULAR_133" onRegimeChange={() => {}} />
      );
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);

      const representativeCodes = [
        '111', '1111', '112', '131', '152', '156', '211', '214', '229',
        '331', '333', '334', '341', '411', '511', '632', '642', '6421', '6422',
        '711', '811', '821', '911'
      ];

      for (const code of representativeCodes) {
        fireEvent.change(searchInput, { target: { value: code } });
        expect(hasAccountBadge(code)).toBe(true);
      }
      unmount();
    });

    it('documents Category Filter Pills coverage: REVENUE_DEDUCTION vs REVENUE', () => {
      const { unmount } = render(
        <CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />
      );

      // In default 'ALL', TK 511 and TK 521 are both accessible
      expect(hasAccountBadge('511')).toBe(true);
      expect(hasAccountBadge('521')).toBe(true);

      // Click "Loại 5: Doanh Thu" pill
      const revPill = screen.getByRole('button', { name: 'Loại 5: Doanh Thu' });
      fireEvent.click(revPill);

      // TK 511 (REVENUE) is visible
      expect(hasAccountBadge('511')).toBe(true);

      // Empirical Observation: TK 521 has category REVENUE_DEDUCTION,
      // so clicking "Loại 5: Doanh Thu" filters it out!
      expect(hasAccountBadge('521')).toBe(false);

      // Furthermore, verify whether there exists any Category Pill for "REVENUE_DEDUCTION"
      const dedPill = screen.queryByRole('button', { name: /giảm trừ/i });
      expect(dedPill).toBeNull();

      unmount();
    });

    it('verifies Circular 133 prohibited accounts filter functionality', () => {
      const onRegimeChange = vi.fn();
      render(
        <CoaExplorer currentRegime="CIRCULAR_133" onRegimeChange={onRegimeChange} />
      );

      // Check prohibited notice is rendered
      expect(screen.getByText(/Quy tắc cấm trong TT 133:/)).toBeInTheDocument();

      // Click "Chỉ xem các TK bị cấm" button
      const filterProhibitedBtn = screen.getByRole('button', { name: 'Chỉ xem các TK bị cấm' });
      fireEvent.click(filterProhibitedBtn);

      // Prohibited accounts (621, 622, 623, 627, 641, 521) should have badges displayed
      expect(hasAccountBadge('621')).toBe(true);
      expect(hasAccountBadge('622')).toBe(true);
      expect(hasAccountBadge('623')).toBe(true);
      expect(hasAccountBadge('627')).toBe(true);
      expect(hasAccountBadge('641')).toBe(true);
      expect(hasAccountBadge('521')).toBe(true);

      // Active TT 133 accounts like TK 111 should NOT be shown in this filtered view
      expect(hasAccountBadge('111')).toBe(false);
    });

    it('verifies that EVERY single account in TT200 (all 154) can be reached by its exact code', () => {
      const { unmount } = render(
        <CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />
      );
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);

      // Test all accounts in TT200
      for (const account of allAccounts200) {
        fireEvent.change(searchInput, { target: { value: account.code } });
        const found = hasAccountBadge(account.code);
        if (!found) {
          throw new Error(`Account ${account.code} (${account.nameVi}) was not reachable in TT200 via search!`);
        }
      }
      unmount();
    });

    it('verifies that EVERY single account in TT133 (all 57) can be reached by its exact code', () => {
      const { unmount } = render(
        <CoaExplorer currentRegime="CIRCULAR_133" onRegimeChange={() => {}} />
      );
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);

      // Test all accounts in TT133
      for (const account of allAccounts133) {
        fireEvent.change(searchInput, { target: { value: account.code } });
        const found = hasAccountBadge(account.code);
        if (!found) {
          throw new Error(`Account ${account.code} (${account.nameVi}) was not reachable in TT133 via search!`);
        }
      }
      unmount();
    });

    it('verifies that EVERY single account in TT200 can be reached by searching its unaccented name snippet', () => {
      const { unmount } = render(
        <CoaExplorer currentRegime="CIRCULAR_200" onRegimeChange={() => {}} />
      );
      const searchInput = screen.getByPlaceholderText(/Tìm nhanh theo số hiệu/);

      for (const account of allAccounts200) {
        const unaccented = removeVietnameseAccents(account.nameVi).toLowerCase();
        // Take first word or first 12 characters to simulate search
        const queryTerm = unaccented.slice(0, 12).trim();
        fireEvent.change(searchInput, { target: { value: queryTerm } });
        const found = hasAccountBadge(account.code);
        if (!found) {
          throw new Error(
            `Account ${account.code} was NOT found when searching by unaccented nameVi snippet "${queryTerm}" (original: "${account.nameVi}")!`
          );
        }
      }
      unmount();
    });
  });
});
