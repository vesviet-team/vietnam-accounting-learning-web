import { describe, it, expect } from 'vitest';
import {
  calculateEcommerceSellerTaxObligation,
  calculatePlatformTaxRemittance,
  validateEcommerceInvoiceCompliance,
  reconcileSellerWithPlatform,
  EcommerceTransaction,
  STATUTORY_BASIS_ECOMMERCE_TAX,
} from '@/services/tax/ecommerce-tax';

describe('E-Commerce Tax Compliance Engine (ND 117/2025 + ND 68/2026)', () => {
  const createSampleTransaction = (overrides: Partial<EcommerceTransaction> = {}): EcommerceTransaction => ({
    platform: 'SHOPEE',
    sellerType: 'HOUSEHOLD_BUSINESS',
    sellerTaxCode: '0123456789',
    sellerName: 'Hộ kinh doanh Nguyễn Văn A',
    grossRevenue: 100_000_000,
    platformFee: 10_000_000,
    netRevenue: 90_000_000,
    vatRate: 8,
    vatAmount: 7_200_000,
    pitRate: 0.5,
    pitAmount: 450_000,
    transactionDate: '2026-09-15',
    invoiceNumber: 'INV-001',
    ...overrides,
  });

  describe('calculateEcommerceSellerTaxObligation', () => {
    it('should calculate correct tax obligation for household business seller', () => {
      const transactions = [createSampleTransaction()];
      const result = calculateEcommerceSellerTaxObligation(transactions, '09/2026', {
        taxCode: '0123456789',
        name: 'Hộ kinh doanh Nguyễn Văn A',
        type: 'HOUSEHOLD_BUSINESS',
      });

      expect(result.period).toBe('09/2026');
      expect(result.platform).toBe('SHOPEE');
      expect(result.sellerType).toBe('HOUSEHOLD_BUSINESS');
      expect(result.totalGrossRevenue).toBe(100_000_000);
      expect(result.totalPlatformFee).toBe(10_000_000);
      expect(result.totalNetRevenue).toBe(90_000_000);
      expect(result.vatWithheldByPlatform).toBe(7_200_000);
      expect(result.pitWithheldByPlatform).toBe(450_000);
      expect(result.totalTaxRemittedByPlatform).toBe(7_650_000);
      expect(result.vatSelfDeclared).toBe(0); // Platform handles VAT
      expect(result.pitSelfDeclared).toBe(0); // Platform handles PIT
      expect(result.statutoryBasis).toBe(STATUTORY_BASIS_ECOMMERCE_TAX);
      expect(result.isPlatformCompliant).toBe(true);
      expect(result.discrepancies).toHaveLength(0);
    });

    it('should flag discrepancy for household business > 1B VND without tax code', () => {
      const transactions = [createSampleTransaction({ grossRevenue: 1_200_000_000, netRevenue: 1_080_000_000 })];
      const result = calculateEcommerceSellerTaxObligation(transactions, '09/2026', {
        name: 'Hộ kinh doanh lớn',
        type: 'HOUSEHOLD_BUSINESS',
      });

      expect(result.isPlatformCompliant).toBe(false);
      expect(result.discrepancies.some((d) => d.includes('> 1 tỷ VNĐ') && d.includes('mã số thuế'))).toBe(true);
    });

    it('should flag discrepancy for missing invoice numbers', () => {
      const transactions = [createSampleTransaction({ invoiceNumber: undefined })];
      const result = calculateEcommerceSellerTaxObligation(transactions, '09/2026', {
        taxCode: '0123456789',
        name: 'Test',
        type: 'HOUSEHOLD_BUSINESS',
      });

      expect(result.isPlatformCompliant).toBe(false);
      expect(result.discrepancies.some((d) => d.includes('thiếu số hóa đơn'))).toBe(true);
    });

    it('should calculate CIT for enterprise sellers', () => {
      const transactions = [createSampleTransaction({ sellerType: 'ENTERPRISE', netRevenue: 100_000_000, vatAmount: 8_000_000 })];
      const result = calculateEcommerceSellerTaxObligation(transactions, '09/2026', {
        taxCode: '0101234567',
        name: 'Công ty TNHH Test',
        type: 'ENTERPRISE',
      });

      // CIT = 20% of netRevenue (simplified)
      expect(result.citSelfDeclared).toBe(20_000_000);
      expect(result.sellerType).toBe('ENTERPRISE');
    });

    it('should aggregate multiple transactions correctly', () => {
      const transactions = [
        createSampleTransaction({ grossRevenue: 50_000_000, netRevenue: 45_000_000, vatAmount: 3_600_000, pitAmount: 225_000 }),
        createSampleTransaction({ grossRevenue: 75_000_000, netRevenue: 67_500_000, vatAmount: 5_400_000, pitAmount: 337_500 }),
      ];
      const result = calculateEcommerceSellerTaxObligation(transactions, '09/2026', {
        taxCode: '0123456789',
        name: 'Test',
        type: 'HOUSEHOLD_BUSINESS',
      });

      expect(result.totalGrossRevenue).toBe(125_000_000);
      expect(result.totalNetRevenue).toBe(112_500_000);
      expect(result.vatWithheldByPlatform).toBe(9_000_000);
      expect(result.pitWithheldByPlatform).toBe(562_500);
    });
  });

  describe('calculatePlatformTaxRemittance', () => {
    it('should calculate correct platform remittance', () => {
      const transactions = [
        createSampleTransaction({ grossRevenue: 100_000_000, netRevenue: 90_000_000, vatAmount: 7_200_000, pitAmount: 450_000 }),
        createSampleTransaction({ grossRevenue: 200_000_000, netRevenue: 180_000_000, vatAmount: 14_400_000, pitAmount: 900_000, sellerName: 'Hộ B', sellerType: 'HOUSEHOLD_BUSINESS' }),
      ];

      const result = calculatePlatformTaxRemittance(transactions, 'SHOPEE', '09/2026');

      expect(result.platform).toBe('SHOPEE');
      expect(result.period).toBe('09/2026');
      expect(result.totalSellers).toBe(2);
      expect(result.totalGrossRevenue).toBe(300_000_000);
      expect(result.totalVatRemitted).toBe(21_600_000);
      expect(result.totalPitRemitted).toBe(1_350_000);
      expect(result.totalTaxRemitted).toBe(22_950_000);
      expect(result.portalUrl).toBe('https://thuedientu.gdt.gov.vn/TMDT');
      expect(result.filingDeadline).toBe('31/10/2026'); // Last day of following month
      expect(result.statutoryBasis).toBe(STATUTORY_BASIS_ECOMMERCE_TAX);
    });

    it('should handle year-end period correctly', () => {
      const transactions = [createSampleTransaction()];
      const result = calculatePlatformTaxRemittance(transactions, 'LAZADA', '12/2026');

      expect(result.filingDeadline).toBe('31/01/2027');
    });
  });

  describe('validateEcommerceInvoiceCompliance', () => {
    it('should return compliant for valid transaction', () => {
      const transaction = createSampleTransaction();
      const result = validateEcommerceInvoiceCompliance(transaction);

      expect(result.compliant).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.riskLevel).toBe('LOW');
    });

    it('should flag missing invoice number', () => {
      const transaction = createSampleTransaction({ invoiceNumber: undefined });
      const result = validateEcommerceInvoiceCompliance(transaction);

      expect(result.compliant).toBe(false);
      expect(result.issues.some((i) => i.includes('Thiếu số hóa đơn'))).toBe(true);
      expect(result.riskLevel).toBe('MEDIUM');
    });

    it('should flag household business without tax code', () => {
      const transaction = createSampleTransaction({ sellerTaxCode: undefined, sellerType: 'HOUSEHOLD_BUSINESS' });
      const result = validateEcommerceInvoiceCompliance(transaction);

      expect(result.compliant).toBe(false);
      expect(result.issues.some((i) => i.includes('chưa cung cấp mã số thuế'))).toBe(true);
    });

    it('should flag high revenue with 0% VAT', () => {
      const transaction = createSampleTransaction({ grossRevenue: 200_000_000, vatRate: 0, vatAmount: 0 });
      const result = validateEcommerceInvoiceCompliance(transaction);

      expect(result.compliant).toBe(false);
      expect(result.issues.some((i) => i.includes('thuế suất 0%') && i.includes('miễn thuế'))).toBe(true);
    });

    it('should return HIGH risk for multiple issues', () => {
      const transaction = createSampleTransaction({
        invoiceNumber: undefined,
        sellerTaxCode: undefined,
        sellerType: 'HOUSEHOLD_BUSINESS',
        grossRevenue: 200_000_000,
        vatRate: 0,
        vatAmount: 0,
      });
      const result = validateEcommerceInvoiceCompliance(transaction);

      expect(result.riskLevel).toBe('HIGH');
    });
  });

  describe('reconcileSellerWithPlatform', () => {
    it('should return reconciled when variance <= 5%', () => {
      const result = reconcileSellerWithPlatform(100_000_000, 98_000_000);

      expect(result.reconciled).toBe(true);
      expect(result.variance).toBe(2_000_000);
      expect(result.variancePercent).toBeCloseTo(2.04, 1);
      expect(result.adjustmentNeeded).toBe('NONE');
      expect(result.explanationVi).toContain('khớp với dữ liệu sàn');
    });

    it('should flag additional declaration when seller > platform by > 5%', () => {
      const result = reconcileSellerWithPlatform(110_000_000, 100_000_000);

      expect(result.reconciled).toBe(false);
      expect(result.variance).toBe(10_000_000);
      expect(result.variancePercent).toBe(10);
      expect(result.adjustmentNeeded).toBe('ADDITIONAL_DECLARATION');
      expect(result.explanationVi).toContain('kê khai bổ sung');
    });

    it('should flag refund claim when platform > seller by > 5%', () => {
      const result = reconcileSellerWithPlatform(90_000_000, 100_000_000);

      expect(result.reconciled).toBe(false);
      expect(result.variance).toBe(-10_000_000);
      expect(result.variancePercent).toBe(10);
      expect(result.adjustmentNeeded).toBe('REFUND_CLAIM');
      expect(result.explanationVi).toContain('thấp hơn dữ liệu sàn');
    });

    it('should handle edge case of zero platform revenue', () => {
      const result = reconcileSellerWithPlatform(50_000_000, 0);

      expect(result.reconciled).toBe(false);
      expect(result.variance).toBe(50_000_000);
      expect(result.variancePercent).toBe(100); // Treated as 100% variance
      expect(result.adjustmentNeeded).toBe('ADDITIONAL_DECLARATION');
    });
  });

  describe('Statutory Basis', () => {
    it('should reference correct decrees', () => {
      expect(STATUTORY_BASIS_ECOMMERCE_TAX).toContain('117/2025/NĐ-CP');
      expect(STATUTORY_BASIS_ECOMMERCE_TAX).toContain('68/2026/NĐ-CP');
      expect(STATUTORY_BASIS_ECOMMERCE_TAX).toContain('01/07/2025');
      expect(STATUTORY_BASIS_ECOMMERCE_TAX).toContain('01/07/2026');
    });
  });
});