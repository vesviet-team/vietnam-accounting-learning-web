import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { COA_CIRCULAR_99, CIRCULAR_99_KEY_HIGHLIGHTS } from '@/data/coa-circular-99';
import { getAccountsByRegime, findAccountByCode } from '@/data/coa-service';
import { CoaExplorer } from '@/components/coa/CoaExplorer';
import {
  generateCashFlowStatement,
  generateBalanceSheet,
  DAY_27_CLOSING_DATASET,
} from '@/services/financial-statements';
import { FinancialStatementsView } from '@/components/workbench/FinancialStatementsView';
import {
  NON_CASH_THRESHOLD_VAT_LAW_2024,
  NON_CASH_PAYMENT_THRESHOLD,
  evaluateNonCashRule,
  evaluateNonCashRuleVatLaw2024,
  calculateForeignContractorTax,
} from '@/services/tax/tax-guardrails';
import { MODULE_8_LESSONS } from '@/data/curriculum/module-08';
import { WebMcpProvider } from '@/components/layout/WebMcpProvider';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

describe('2026 SOTA Vietnam Accounting Standards Upgrade', () => {
  describe('GAP-01: Circular 99/2025/TT-BTC (Effective 01/01/2026) Chart of Accounts', () => {
    it('exports COA_CIRCULAR_99 with modernized accounts and highlights', () => {
      expect(COA_CIRCULAR_99.length).toBeGreaterThanOrEqual(60);
      expect(CIRCULAR_99_KEY_HIGHLIGHTS.length).toBeGreaterThanOrEqual(4);

      const accountsByCode = getAccountsByRegime('CIRCULAR_99');
      expect(accountsByCode.length).toBe(COA_CIRCULAR_99.length);

      const tk112 = findAccountByCode('112', 'CIRCULAR_99');
      expect(tk112).toBeDefined();
      expect(tk112?.regimes).toContain('CIRCULAR_99');
    });

    it('renders Circular 99/2025 highlights banner and switcher in CoaExplorer', () => {
      let selectedRegime = 'CIRCULAR_99' as const;
      render(
        <CoaExplorer
          currentRegime={selectedRegime}
          onRegimeChange={(r) => {
            selectedRegime = r as typeof selectedRegime;
          }}
        />
      );

      const banner = screen.getByTestId('circular-99-highlights');
      expect(banner).toBeInTheDocument();
      expect(banner.textContent).toContain('99/2025/TT-BTC');
      expect(banner.textContent).toContain('Báo cáo tình hình tài chính');
    });
  });

  describe('GAP-02: B03-DN Indirect Cash Flow Statement Engine & Cross-Statement Invariant', () => {
    it('reconciles Mã 70 on B03-DN exactly with Mã 110 on B01-DN for Day 27 dataset', () => {
      const b01 = generateBalanceSheet(DAY_27_CLOSING_DATASET);
      const b03 = generateCashFlowStatement(DAY_27_CLOSING_DATASET);

      // Day 27 Dataset verification:
      // Operating Cash Flow (code20) = 330,000,000 VND
      // Investing Cash Flow (code30) = 0 VND
      // Financing Cash Flow (code40) = 1,000,000,000 VND
      // Ending Cash (code70) = 1,330,000,000 VND === B01-DN Mã 110
      expect(b03.operatingCashFlow).toBe(330_000_000);
      expect(b03.investingCashFlow).toBe(0);
      expect(b03.financingCashFlow).toBe(1_000_000_000);
      expect(b03.netCashFlowInPeriod).toBe(1_330_000_000);
      expect(b03.closingCashAndEquivalents).toBe(b01.assets.shortTerm.items['110']);
      expect(b03.isReconciledWithB01).toBe(true);
      expect(b03.reconciliationDiscrepancy).toBe(0);
    });

    it('renders B03-DN Cash Flow tab and Circular 99/2025 title in FinancialStatementsView', () => {
      render(<FinancialStatementsView currentRegime="CIRCULAR_99" />);

      // Under CIRCULAR_99, B01-DN header should show "BÁO CÁO TÌNH HÌNH TÀI CHÍNH"
      expect(screen.getByText(/BÁO CÁO TÌNH HÌNH TÀI CHÍNH/i)).toBeInTheDocument();

      // Switch to B03-DN tab
      const b03TabBtn = screen.getByTestId('subtab-b03');
      fireEvent.click(b03TabBtn);

      expect(screen.getByTestId('b03-statement-card')).toBeInTheDocument();
      expect(screen.getByTestId('b03-reconciled-badge')).toHaveTextContent(/CÂN ĐỐI KHỚP MÃ 70/i);
      expect(screen.getByTestId('b03-row-70')).toBeInTheDocument();
    });
  });

  describe('GAP-03: VAT Law No. 48/2024/QH15 (5M Threshold) & FCT Circular 103/2014/TT-BTC', () => {
    it('enforces the 5,000,000 VND non-cash payment threshold under VAT Law 48/2024/QH15 while preserving 20M legacy rule', () => {
      expect(NON_CASH_THRESHOLD_VAT_LAW_2024).toBe(5_000_000);
      expect(NON_CASH_PAYMENT_THRESHOLD).toBe(20_000_000);

      // 6,000,000 VND paid in CASH: allowed under legacy 20M rule, rejected under 2025 VAT Law 5M rule
      const legacyResult = evaluateNonCashRule(6_000_000, 'CASH');
      expect(legacyResult.vatCreditable).toBe(true);

      const newLawResult = evaluateNonCashRuleVatLaw2024(6_000_000, 'CASH');
      expect(newLawResult.vatCreditable).toBe(false);
      expect(newLawResult.citDeductible).toBe(false);
      expect(newLawResult.explanationVi).toContain('Luật Thuế GTGT số 48/2024/QH15');

      // 4,900,000 VND paid in CASH: deductible under new 5M rule
      const under5MResult = evaluateNonCashRuleVatLaw2024(4_900_000, 'CASH');
      expect(under5MResult.vatCreditable).toBe(true);
      expect(under5MResult.citDeductible).toBe(true);
    });

    it('calculates Foreign Contractor Tax (FCT - TT 103/2014/TT-BTC) accurately for GROSS and NET contracts', () => {
      // GROSS contract: 100,000,000 VND SaaS/Service (5% CIT, 5% VAT)
      const grossFct = calculateForeignContractorTax({
        contractAmount: 100_000_000,
        contractType: 'GROSS',
        citRate: 0.05,
        vatRate: 0.05,
      });
      expect(grossFct.vatAmount).toBe(5_000_000);
      // CIT taxable turnover = 100M - 5M = 95M; CIT = 95M * 5% = 4,750,000
      expect(grossFct.citTaxableTurnover).toBe(95_000_000);
      expect(grossFct.citAmount).toBe(4_750_000);
      expect(grossFct.totalFctPayable).toBe(9_750_000);

      // NET contract: 90,250,000 VND net payable (5% CIT, 5% VAT) -> should gross up back to 100,000,000 VND
      const netFct = calculateForeignContractorTax({
        contractAmount: 90_250_000,
        contractType: 'NET',
        citRate: 0.05,
        vatRate: 0.05,
      });
      expect(netFct.citTaxableTurnover).toBe(95_000_000);
      expect(netFct.citAmount).toBe(4_750_000);
      expect(netFct.vatTaxableTurnover).toBe(100_000_000);
      expect(netFct.vatAmount).toBe(5_000_000);
      expect(netFct.totalFctPayable).toBe(9_750_000);
    });

    it('includes Concept c24-4 on FCT and VAT Law 48/2024/QH15 in Day 24 curriculum', () => {
      const day24 = MODULE_8_LESSONS.find((l) => l.day === 24);
      expect(day24).toBeDefined();
      const c24_4 = day24?.concepts.find((c) => c.id === 'c24-4');
      expect(c24_4).toBeDefined();
      expect(c24_4?.titleVi).toContain('Thuế Nhà Thầu Nước Ngoài (FCT - TT 103/2014)');
      expect(c24_4?.titleVi).toContain('Luật Thuế GTGT 48/2024/QH15');
    });
  });
});

describe('Agent Discovery 19/19 & A2A 1.0 / MCP 2026-07-28 Readiness', () => {
  it('validates /auth.md matches WorkOS & isitagentready.com agentic registration rules', () => {
    const authMdPath = path.join(PUBLIC_DIR, 'auth.md');
    expect(fs.existsSync(authMdPath)).toBe(true);
    const content = fs.readFileSync(authMdPath, 'utf-8');

    expect(content).toContain('# Auth.md');
    expect(content.toLowerCase()).toContain('agentic registration');
    expect(content).toContain('## Registration');
    expect(content).toContain('## OAuth Metadata');
  });

  it('validates /.well-known/api-catalog adheres to RFC 9727 Linkset JSON format', () => {
    const apiCatalogPath = path.join(PUBLIC_DIR, '.well-known', 'api-catalog');
    expect(fs.existsSync(apiCatalogPath)).toBe(true);
    const catalog = JSON.parse(fs.readFileSync(apiCatalogPath, 'utf-8'));

    expect(Array.isArray(catalog.linkset)).toBe(true);
    expect(catalog.linkset.length).toBeGreaterThanOrEqual(1);
    expect(catalog.linkset[0]).toHaveProperty('anchor');
    expect(catalog.linkset[0]).toHaveProperty('service-desc');
    expect(catalog.linkset[0]).toHaveProperty('service-doc');
    expect(catalog.linkset[0]).toHaveProperty('status');
  });

  it('validates OAuth 2.1 metadata & Protected Resource metadata (RFC 8414 & RFC 9728)', () => {
    const oauthServerPath = path.join(PUBLIC_DIR, '.well-known', 'oauth-authorization-server');
    const oauthResourcePath = path.join(PUBLIC_DIR, '.well-known', 'oauth-protected-resource');

    const serverMeta = JSON.parse(fs.readFileSync(oauthServerPath, 'utf-8'));
    expect(serverMeta.issuer).toMatch(/^https:\/\//);
    expect(serverMeta.code_challenge_methods_supported).toEqual(['S256']);
    expect(serverMeta.agent_auth?.skill).toContain('/auth.md');

    const resourceMeta = JSON.parse(fs.readFileSync(oauthResourcePath, 'utf-8'));
    expect(Array.isArray(resourceMeta.authorization_servers)).toBe(true);
    expect(resourceMeta.bearer_methods_supported).toEqual(['header']);
  });

  it('validates MCP Server Card (2026-07-28 spec) and A2A 1.0 Agent Card', () => {
    const mcpCardPath = path.join(PUBLIC_DIR, '.well-known', 'mcp', 'server-card.json');
    const a2aCardPath = path.join(PUBLIC_DIR, '.well-known', 'agent-card.json');

    const mcpCard = JSON.parse(fs.readFileSync(mcpCardPath, 'utf-8'));
    expect(mcpCard.protocolVersion).toBe('2026-07-28');
    expect(mcpCard.transport?.type).toBe('streamable-http');
    expect(Array.isArray(mcpCard.tools)).toBe(true);
    expect(mcpCard.tools.length).toBeGreaterThanOrEqual(2);

    const a2aCard = JSON.parse(fs.readFileSync(a2aCardPath, 'utf-8'));
    expect(a2aCard.protocolVersion).toBe('1.0.0');
    expect(a2aCard.defaultInputModes).toContain('text');
    expect(a2aCard.defaultInputModes).toContain('data');
    expect(Array.isArray(a2aCard.skills)).toBe(true);
  });

  it('validates Agent Skills Index, robots.txt Content-Signal, llms.txt, and _headers', () => {
    const skillsIndexPath = path.join(PUBLIC_DIR, '.well-known', 'agent-skills', 'index.json');
    const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');
    const llmsPath = path.join(PUBLIC_DIR, 'llms.txt');
    const headersPath = path.join(PUBLIC_DIR, '_headers');

    const skillsIndex = JSON.parse(fs.readFileSync(skillsIndexPath, 'utf-8'));
    expect(skillsIndex.$schema).toContain('schema.json');
    expect(Array.isArray(skillsIndex.skills)).toBe(true);
    expect(skillsIndex.skills.length).toBeGreaterThanOrEqual(3);

    const robots = fs.readFileSync(robotsPath, 'utf-8');
    expect(robots).toContain('Content-Signal: search=yes, ai-train=no, ai-input=yes');

    const llms = fs.readFileSync(llmsPath, 'utf-8');
    expect(llms).toContain('# Vietnam Accounting 30-Day Interactive Learning Web');
    expect(llms).toContain('Circular 99/2025/TT-BTC');

    const headers = fs.readFileSync(headersPath, 'utf-8');
    expect(headers).toContain('rel="authorizing-agent"');
    expect(headers).toContain('Content-Type: application/linkset+json');
  });

  it('registers WebMCP tools on navigator.modelContext when WebMcpProvider mounts', () => {
    const registeredTools: string[] = [];
    Object.defineProperty(window.navigator, 'modelContext', {
      configurable: true,
      writable: true,
      value: {
        registerTool: (tool: { name: string }) => {
          registeredTools.push(tool.name);
        },
      },
    });

    render(<WebMcpProvider currentRegime="CIRCULAR_99" activeTab="coa" />);
    expect(registeredTools).toContain('lookup_vn_coa');
    expect(registeredTools).toContain('validate_tax_voucher_2026');
    expect(registeredTools).toContain('calculate_fct_103');
    expect(registeredTools).toContain('get_accounting_workspace_state');
  });
});
