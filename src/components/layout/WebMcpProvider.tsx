import { useEffect, type FC } from 'react';
import { AccountingRegime } from '@/types/coa';

interface WebMcpProviderProps {
  currentRegime: AccountingRegime;
  activeTab: string;
}

declare global {
  interface Navigator {
    modelContext?: {
      provideContext?: (context: Record<string, unknown>) => void;
      registerTool?: (tool: {
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
        execute?: (args: Record<string, unknown>) => Promise<unknown> | unknown;
      }) => void;
    };
  }
}

export const WebMcpProvider: FC<WebMcpProviderProps> = ({ currentRegime, activeTab }) => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (navigator.modelContext) {
      if (typeof navigator.modelContext.provideContext === 'function') {
        navigator.modelContext.provideContext({
          app: 'vietnam-accounting-learning-web',
          mcpVersion: '2026-07-28',
          currentRegime,
          activeTab,
          supportedCirculars: ['99/2025/TT-BTC', '58/2026/TT-BTC', '200/2014/TT-BTC', '133/2016/TT-BTC'],
          discovery: {
            authMd: '/auth.md',
            serverCard: '/.well-known/mcp/server-card.json',
            agentCard: '/.well-known/agent-card.json',
            apiCatalog: '/.well-known/api-catalog',
            llmsTxt: '/llms.txt',
          },
        });
      }
      if (typeof navigator.modelContext.registerTool === 'function') {
        const tools = [
          {
            name: 'lookup_vn_coa',
            description: 'Lookup Vietnamese Chart of Accounts across Circular 99/2025, 58/2026, 200/2014, and 133/2016',
            inputSchema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] },
          },
          {
            name: 'validate_tax_voucher_2026',
            description: 'Validate non-cash payment thresholds (5M VAT Law 48/2024/QH15 & 20M legacy) and vendor tax status',
            inputSchema: { type: 'object', properties: { totalAmount: { type: 'number' }, paymentMethod: { type: 'string' } } },
          },
          {
            name: 'calculate_fct_103',
            description: 'Calculate Foreign Contractor Tax (FCT) GROSS/NET under Circular 103/2014/TT-BTC',
            inputSchema: { type: 'object', properties: { contractAmount: { type: 'number' }, contractType: { type: 'string' } } },
          },
          {
            name: 'get_accounting_workspace_state',
            description: 'Inspect active regime and workspace tab',
            inputSchema: { type: 'object', properties: {} },
          },
        ];
        for (const tool of tools) {
          navigator.modelContext.registerTool(tool);
        }
      }
    }
  }, [currentRegime, activeTab]);

  return null;
};
