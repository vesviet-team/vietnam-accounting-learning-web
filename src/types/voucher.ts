export type VoucherType =
  | 'E_INVOICE_ND123'
  | 'CASH_RECEIPT_01_TT'
  | 'CASH_PAYMENT_02_TT'
  | 'BANK_TRANSFER_UNC'
  | 'GOODS_RECEIPT_01_VT'
  | 'GOODS_ISSUE_02_VT';

export interface EInvoiceItem {
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  vatRate: number; // 0, 5, 8, 10
  vatAmount: number;
}

export interface EInvoiceData {
  type: 'E_INVOICE_ND123';
  titleVi: string;
  templateCode: string; // '1' (Hóa đơn GTGT)
  symbol: string; // 'C26TAA' (6 characters)
  invoiceNumber: string; // '00001245' (8 digits)
  mccqt: string; // 34 hex characters
  invoiceDate: string;
  seller: {
    name: string;
    taxCode: string;
    address: string;
    status: 'ACTIVE' | 'SUSPENDED_03' | 'RUNAWAY_04';
  };
  buyer: {
    name: string;
    taxCode?: string;
    address?: string;
  };
  items: EInvoiceItem[];
  subtotalPretax: number;
  totalVat: number;
  totalPayment: number;
  currency: 'VND';
  legalNoteVi?: string;
  xmlPayload?: string; // Decision 1450 XML representation
}

export interface CashReceiptData {
  type: 'CASH_RECEIPT_01_TT';
  titleVi: string;
  voucherNumber: string; // 'PT-0926-001'
  date: string;
  payerName: string;
  payerAddress: string;
  reason: string;
  amount: number;
  amountInWords: string;
  debitAccount: string; // 'TK 1111'
  creditAccount: string; // 'TK 1121' or 'TK 131'
  attachedDocsCount?: number;
  signatures: {
    director: string;
    chiefAccountant: string;
    cashier: string;
    preparer: string;
    payer: string;
  };
}

export interface CashPaymentData {
  type: 'CASH_PAYMENT_02_TT';
  titleVi: string;
  voucherNumber: string; // 'PC-0926-042'
  date: string;
  receiverName: string;
  receiverAddress: string;
  reason: string;
  amount: number;
  amountInWords: string;
  debitAccount: string; // 'TK 152' or 'TK 642'
  creditAccount: string; // 'TK 1111'
  attachedDocsCount?: number;
  signatures: {
    director: string;
    chiefAccountant: string;
    cashier: string;
    preparer: string;
    receiver: string;
  };
}

export interface BankTransferData {
  type: 'BANK_TRANSFER_UNC';
  titleVi: string;
  voucherNumber: string; // 'UNC-2026-0812'
  date: string;
  remitter: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
  beneficiary: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
  amount: number;
  amountInWords: string;
  narrative: string;
  chargeFeeTo: 'REMITTER' | 'BENEFICIARY';
  isNonCashRuleApplicable: boolean; // Threshold >= 20,000,000 VND
  signatures: {
    accountHolder: string;
    chiefAccountant: string;
    bankTeller: string;
    bankController: string;
  };
}

export interface GoodsReceiptData {
  type: 'GOODS_RECEIPT_01_VT';
  titleVi: string;
  voucherNumber: string; // 'PNK-0926-015'
  date: string;
  delivererName: string;
  invoiceRef: string;
  warehouseName: string;
  warehouseLocation: string;
  debitAccount: string; // 'TK 152' or 'TK 156'
  creditAccount: string; // 'TK 331'
  items: {
    sku: string;
    name: string;
    unit: string;
    quantityDoc: number;
    quantityActual: number;
    unitPrice: number;
    amount: number;
  }[];
  totalAmount: number;
  signatures: {
    warehouseKeeper: string;
    deliverer: string;
    preparer: string;
    chiefAccountant: string;
  };
}

export interface GoodsIssueData {
  type: 'GOODS_ISSUE_02_VT';
  titleVi: string;
  voucherNumber: string; // 'PXK-0926-028'
  date: string;
  receiverName: string;
  department: string;
  reason: string;
  warehouseName: string;
  debitAccount: string; // 'TK 632' or 'TK 621' or 'TK 154'
  creditAccount: string; // 'TK 156' or 'TK 152'
  items: {
    sku: string;
    name: string;
    unit: string;
    quantityRequested: number;
    quantityDispatched: number;
    unitPrice: number;
    amount: number;
  }[];
  totalAmount: number;
  signatures: {
    director: string;
    warehouseKeeper: string;
    receiver: string;
    preparer: string;
    chiefAccountant: string;
  };
}

export type AnyVoucherData =
  | EInvoiceData
  | CashReceiptData
  | CashPaymentData
  | BankTransferData
  | GoodsReceiptData
  | GoodsIssueData;
