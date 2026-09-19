export interface JournalEntryRow {
  id: string;
  accountCode: string;
  accountNameVi: string;
  debitAmount: number;
  creditAmount: number;
  noteVi?: string;
}

export interface JournalBalanceValidation {
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  delta: number; // abs(totalDebit - totalCredit)
  errorMessageVi?: string;
}

export interface VoucherAuditCase {
  id: string;
  titleVi: string;
  voucherType: 'VAT_INVOICE' | 'PAYMENT_ORDER' | 'RECEIPT' | 'PAYMENT_VOUCHER';
  scenarioDescriptionVi: string;
  totalAmount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  hasTaxCodeIssue?: boolean;
  vendorTaxStatus?: '00' | '03' | '04'; // 00 Active, 03 Suspended, 04 Runaway
  violates20mCashRule?: boolean;
  hasArithmeticError?: boolean;
  missingSignature?: boolean;
  statutoryBasis: string;
}
