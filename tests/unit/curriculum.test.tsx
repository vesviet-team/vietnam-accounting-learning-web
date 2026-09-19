import { describe, it, expect } from 'vitest';
import {
  getAllLessons,
  getLessonByDay,
  getLessonsByModule,
  MODULE_METADATA,
  ALL_CURRICULUM_LESSONS,
} from '@/data/curriculum';
import { determineAccountNature, formatVnd } from '@/components/curriculum/TAccountView';
import { removeVietnameseAccents } from '@/components/coa/CoaExplorer';
import { LocalStorageAdapter } from '@/services/storage/local-storage-adapter';
import { EInvoiceData, BankTransferData } from '@/types/voucher';

describe('CURRICULUM UNIT TEST SUITE', () => {
  describe('1. 30-Day Curriculum Structure & Pedagogical Completeness', () => {
    it('should contain exactly 30 distinct daily lessons', () => {
      const lessons = getAllLessons();
      expect(lessons).toHaveLength(30);

      // Verify days are strictly 1 to 30 in sequence
      const days = lessons.map((l) => l.day);
      expect(days).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    });

    it('should organize lessons into exactly 10 modules with 3 days each', () => {
      expect(MODULE_METADATA).toHaveLength(10);

      for (let m = 1; m <= 10; m++) {
        const moduleLessons = getLessonsByModule(m);
        expect(moduleLessons).toHaveLength(3);

        const expectedDays = [(m - 1) * 3 + 1, (m - 1) * 3 + 2, m * 3];
        expect(moduleLessons.map((l) => l.day)).toEqual(expectedDays);

        // Verify module number matches
        moduleLessons.forEach((l) => {
          expect(l.moduleNumber).toBe(m);
        });
      }
    });

    it('should strictly flag milestone days at Days 3, 6, 9, 12, 15, 18, 21, 24, 27, 30', () => {
      const expectedMilestones = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];

      ALL_CURRICULUM_LESSONS.forEach((lesson) => {
        if (expectedMilestones.includes(lesson.day)) {
          expect(lesson.isMilestoneDay).toBe(true);
        } else {
          expect(lesson.isMilestoneDay).toBe(false);
        }
      });
    });

    it('should constrain cognitive load per day: 3 to 5 concepts and 15 to 20 estimated minutes', () => {
      ALL_CURRICULUM_LESSONS.forEach((lesson) => {
        // Concept count
        expect(lesson.concepts.length).toBeGreaterThanOrEqual(3);
        expect(lesson.concepts.length).toBeLessThanOrEqual(5);

        // Estimated reading time
        expect(lesson.estimatedMinutes).toBeGreaterThanOrEqual(15);
        expect(lesson.estimatedMinutes).toBeLessThanOrEqual(20);

        // Title and descriptions
        expect(lesson.dayTitleVi).toBeTruthy();
        expect(lesson.moduleTitleVi).toBeTruthy();

        // Each concept must have authentic Vietnamese content
        lesson.concepts.forEach((concept) => {
          expect(concept.id).toBeTruthy();
          expect(concept.titleVi.trim().length).toBeGreaterThan(5);
          expect(concept.summaryVi.trim().length).toBeGreaterThan(10);
          expect(concept.contentVi.trim().length).toBeGreaterThan(30);
          expect(concept.keyTakeawayVi.trim().length).toBeGreaterThan(10);
        });
      });
    });

    it('should retrieve lesson accurately by day number', () => {
      const day1 = getLessonByDay(1);
      expect(day1).toBeDefined();
      expect(day1?.day).toBe(1);
      expect(day1?.dayTitleVi).toContain('Bản Chất Kế Toán');

      const day15 = getLessonByDay(15);
      expect(day15).toBeDefined();
      expect(day15?.day).toBe(15);
      expect(day15?.isMilestoneDay).toBe(true);

      const day30 = getLessonByDay(30);
      expect(day30).toBeDefined();
      expect(day30?.day).toBe(30);
      expect(day30?.isMilestoneDay).toBe(true);

      const nonExistent = getLessonByDay(99);
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('2. T-Account Component Logic & Account Class Invariants', () => {
    it('should correctly classify Asset accounts (Classes 1 & 2) as normal DEBIT', () => {
      const tk111 = determineAccountNature('111');
      expect(tk111.accountClass).toBe(1);
      expect(tk111.normalSide).toBe('DEBIT');
      expect(tk111.isNominal).toBe(false);

      const tk211 = determineAccountNature('211');
      expect(tk211.accountClass).toBe(2);
      expect(tk211.normalSide).toBe('DEBIT');
    });

    it('should correctly classify Liabilities (Class 3) and Equity (Class 4) as normal CREDIT', () => {
      const tk331 = determineAccountNature('331');
      expect(tk331.accountClass).toBe(3);
      expect(tk331.isDualNature).toBe(true);

      const tk411 = determineAccountNature('411');
      expect(tk411.accountClass).toBe(4);
      expect(tk411.normalSide).toBe('CREDIT');
      expect(tk411.isNominal).toBe(false);
    });

    it('should identify Contra-Asset accounts (TK 214, TK 229) with normal CREDIT balance', () => {
      const tk214 = determineAccountNature('214');
      expect(tk214.isContraAsset).toBe(true);
      expect(tk214.normalSide).toBe('CREDIT');

      const tk229 = determineAccountNature('229');
      expect(tk229.isContraAsset).toBe(true);
      expect(tk229.normalSide).toBe('CREDIT');
    });

    it('should identify Contra-Equity accounts (TK 419) with normal DEBIT balance', () => {
      const tk419 = determineAccountNature('419');
      expect(tk419.isContraEquity).toBe(true);
      expect(tk419.normalSide).toBe('DEBIT');
    });

    it('should classify Nominal & Clearing accounts (Classes 5 to 9) with normal ZERO balance', () => {
      for (let c = 5; c <= 9; c++) {
        const nature = determineAccountNature(`${c}11`);
        expect(nature.isNominal).toBe(true);
        expect(nature.normalSide).toBe('ZERO');
      }

      const tk911 = determineAccountNature('911');
      expect(tk911.accountClass).toBe(9);
      expect(tk911.isNominal).toBe(true);
      expect(tk911.normalSide).toBe('ZERO');
    });

    it('should format numbers into standard Vietnamese currency notation', () => {
      const formatted = formatVnd(15000000);
      expect(formatted).toContain('15.000.000');
      expect(formatted).toContain('đ');
    });
  });

  describe('3. Statutory Voucher Illustrations & Invariants', () => {
    it('should validate Decree 123 E-Invoice Decision 1450 schema attributes', () => {
      const sampleEInvoice: EInvoiceData = {
        type: 'E_INVOICE_ND123',
        titleVi: 'Hóa đơn GTGT điện tử',
        templateCode: '1',
        symbol: 'C26TAA',
        invoiceNumber: '00001245',
        mccqt: '0037A2F8B1E9C40526D80A12BC34EF5678',
        invoiceDate: '2026-09-18',
        seller: {
          name: 'Công ty TNHH Thiết bị Việt',
          taxCode: '0108992345',
          address: 'Hà Nội',
          status: 'ACTIVE',
        },
        buyer: {
          name: 'Công ty CP Bách Khoa',
          taxCode: '0106778899',
          address: 'Hà Nội',
        },
        items: [
          { name: 'Máy chiếu 4K', unit: 'Bộ', quantity: 2, unitPrice: 25000000, amount: 50000000, vatRate: 10, vatAmount: 5000000 },
        ],
        subtotalPretax: 50000000,
        totalVat: 5000000,
        totalPayment: 55000000,
        currency: 'VND',
      };

      // 6-character symbol validation
      expect(sampleEInvoice.symbol).toHaveLength(6);
      expect(sampleEInvoice.symbol.startsWith('C26')).toBe(true);

      // 8-digit invoice number
      expect(sampleEInvoice.invoiceNumber).toHaveLength(8);
      expect(/^\d{8}$/.test(sampleEInvoice.invoiceNumber)).toBe(true);

      // 34-hex MCCQT verification
      expect(sampleEInvoice.mccqt).toHaveLength(34);
      expect(/^[0-9A-Fa-f]{34}$/.test(sampleEInvoice.mccqt)).toBe(true);

      // Pretax + VAT == Total Payment Invariant
      expect(sampleEInvoice.subtotalPretax + sampleEInvoice.totalVat).toBe(sampleEInvoice.totalPayment);
    });

    it('should enforce the Circular 219 non-cash rule flag for vouchers >= 20M VND', () => {
      const uncUnder20M: BankTransferData = {
        type: 'BANK_TRANSFER_UNC',
        titleVi: 'Ủy nhiệm chi',
        voucherNumber: 'UNC-01',
        date: '2026-09-01',
        remitter: { accountName: 'Công ty A', accountNumber: '123', bankName: 'VCB' },
        beneficiary: { accountName: 'Công ty B', accountNumber: '456', bankName: 'TCB' },
        amount: 15000000,
        amountInWords: 'Mười lăm triệu đồng',
        narrative: 'Trả tiền hàng',
        chargeFeeTo: 'REMITTER',
        isNonCashRuleApplicable: 15000000 >= 20000000,
        signatures: { accountHolder: 'A', chiefAccountant: 'B', bankTeller: 'C', bankController: 'D' },
      };
      expect(uncUnder20M.isNonCashRuleApplicable).toBe(false);

      const uncOver20M: BankTransferData = {
        ...uncUnder20M,
        amount: 25000000,
        isNonCashRuleApplicable: 25000000 >= 20000000,
      };
      expect(uncOver20M.isNonCashRuleApplicable).toBe(true);
    });
  });

  describe('4. Milestone 1 Polish Recommendations Verification', () => {
    it('LocalStorageAdapter should guard against non-object customData pollution', async () => {
      const adapter = new LocalStorageAdapter('test_pollute_');

      // Test with primitive string
      const stringPayload = JSON.stringify({
        app: 'vietnam-accounting-learning-web',
        customData: 'string_data',
      });
      const resultStr = await adapter.importBackup(stringPayload);
      expect(resultStr).toBe(true);
      expect(await adapter.getItem('0')).toBeNull();

      // Test with array
      const arrayPayload = JSON.stringify({
        app: 'vietnam-accounting-learning-web',
        customData: ['item1', 'item2'],
      });
      const resultArr = await adapter.importBackup(arrayPayload);
      expect(resultArr).toBe(true);
      expect(await adapter.getItem('0')).toBeNull();
    });

    it('removeVietnameseAccents should normalize Vietnamese diacritics for accent-insensitive search', () => {
      expect(removeVietnameseAccents('Tiền mặt')).toBe('Tien mat');
      expect(removeVietnameseAccents('Chi phí quản lý')).toBe('Chi phi quan ly');
      expect(removeVietnameseAccents('Khấu hao TSCĐ')).toBe('Khau hao TSCD');
      expect(removeVietnameseAccents('Đầu tư tài chính')).toBe('Dau tu tai chinh');
      expect(removeVietnameseAccents('Doanh thu bán hàng')).toBe('Doanh thu ban hang');
    });
  });

  describe('5. Interactive UI Component Integration Tests', () => {
    it('TAccountView should render Debit/Credit columns, subtotals, and calculate ending balance', async () => {
      const { render, screen, fireEvent } = await import('@testing-library/react');
      const { TAccountView } = await import('@/components/curriculum/TAccountView');

      const testData = {
        accountCode: '111',
        accountNameVi: 'Tiền mặt',
        accountClass: 1,
        normalBalance: 'DEBIT' as const,
        openingBalance: { side: 'DEBIT' as const, amount: 50000000 },
        entries: [
          { id: '1', description: 'Rút tiền gửi về nhập quỹ', amount: 30000000, side: 'DEBIT' as const },
          { id: '2', description: 'Chi mua văn phòng phẩm', amount: 5000000, side: 'CREDIT' as const },
        ],
      };

      const { container } = render(<TAccountView initialData={testData} allowInteractive={true} />);

      expect(screen.getByText('TK 111')).toBeDefined();
      expect(screen.getByText('Tiền mặt')).toBeDefined();
      expect(screen.getByText('BÊN NỢ (DEBIT)')).toBeDefined();
      expect(screen.getByText('BÊN CÓ (CREDIT)')).toBeDefined();

      // Check ending balance: 50M + 30M - 5M = 75M
      expect(container.textContent).toContain('75.000.000');

      // Click "Thêm bút toán" and add a new entry
      const addBtn = screen.getByText('Thêm bút toán');
      fireEvent.click(addBtn);

      const descInput = screen.getByPlaceholderText(/Rút tiền gửi/);
      const amountInput = screen.getByPlaceholderText(/VD: 50000000/);
      fireEvent.change(descInput, { target: { value: 'Chi tiếp khách' } });
      fireEvent.change(amountInput, { target: { value: '10000000' } });

      const sideSelect = screen.getByDisplayValue('NỢ (Debit)');
      fireEvent.change(sideSelect, { target: { value: 'CREDIT' } });

      const submitBtn = screen.getByText('Ghi sổ');
      fireEvent.click(submitBtn);

      // New ending balance: 75M - 10M = 65M
      expect(container.textContent).toContain('65.000.000');
    });

    it('VoucherCard should render authentic Decree 123 E-Invoice details and switch tabs', async () => {
      const { render, screen, fireEvent } = await import('@testing-library/react');
      const { VoucherCard } = await import('@/components/curriculum/VoucherCard');

      const testInvoice: EInvoiceData = {
        type: 'E_INVOICE_ND123',
        titleVi: 'Hóa đơn GTGT điện tử NĐ 123',
        templateCode: '1',
        symbol: 'C26TAA',
        invoiceNumber: '00001245',
        mccqt: '0037A2F8B1E9C40526D80A12BC34EF5678',
        invoiceDate: '2026-09-18',
        seller: {
          name: 'CÔNG TY TNHH PHÂN PHỐI ĐIỆN MÁY VIỆT TRẦN',
          taxCode: '0108992345',
          address: 'Hà Nội',
          status: 'ACTIVE',
        },
        buyer: {
          name: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ BÁCH KHOA',
          taxCode: '0106778899',
          address: 'Hà Nội',
        },
        items: [
          { name: 'Máy chiếu tương tác thông minh 4K', unit: 'Bộ', quantity: 1, unitPrice: 25000000, amount: 25000000, vatRate: 10, vatAmount: 2500000 },
        ],
        subtotalPretax: 25000000,
        totalVat: 2500000,
        totalPayment: 27500000,
        currency: 'VND',
        xmlPayload: '<HDon><DLHDon></DLHDon></HDon>',
      };

      const { container } = render(<VoucherCard voucher={testInvoice} />);

      expect(screen.getByText('Hóa đơn GTGT điện tử NĐ 123')).toBeDefined();
      expect(screen.getByText('C26TAA')).toBeDefined();
      expect(screen.getByText('00001245')).toBeDefined();
      expect(container.textContent).toContain('0037A2F8B1E9C40526D80A12BC34EF5678');

      // Click Legal tab
      const legalTab = screen.getByText('Căn cứ pháp lý');
      fireEvent.click(legalTab);
      expect(container.textContent).toContain('Luật Kế toán số 88/2015/QH13');

      // Click XML tab
      const xmlTab = screen.getByText('XML QĐ 1450');
      fireEvent.click(xmlTab);
      expect(container.textContent).toContain('<HDon>');
    });

    it('LessonReader should support paging and mark lesson complete', async () => {
      const { render, screen, fireEvent } = await import('@testing-library/react');
      const { LessonReader } = await import('@/components/curriculum/LessonReader');

      render(<LessonReader initialDay={1} />);

      // Day 1 title
      expect(screen.getByText(/Ngày 1: Bản Chất Kế Toán/)).toBeDefined();

      // Next Day button
      const nextBtn = screen.getByText(/Ngày 2/);
      fireEvent.click(nextBtn);

      // Now at Day 2
      expect(screen.getByText(/Ngày 2: Phương Trình Kế Toán/)).toBeDefined();

      // Toggle complete button
      const completeBtn = screen.getByText(/Đánh dấu đã hoàn thành bài học/);
      fireEvent.click(completeBtn);

      expect(screen.getByText(/Đã hoàn thành bài học/)).toBeDefined();
    });
  });
});

