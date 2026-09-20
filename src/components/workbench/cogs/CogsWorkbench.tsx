import { useState, useEffect, useMemo, FC } from 'react';
import {
  Factory,
  Package,
  Calculator,
  BarChart3,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  CostingMethod,
  InventoryLot,
  StockTransaction,
  ManufacturingCostInput,
  ManufacturingCostOutput,
  StockCardResult,
  JournalEntryItem,
  CogsState,
  AccountingRegime as CogsAccountingRegime,
} from '@/types/cogs';
import { AccountingRegime as CoaAccountingRegime } from '@/types/coa';
import {
  COGS_SCENARIOS,
  CogsScenario,
  getCogsScenarioById,
  getDefaultCogsScenario,
} from '@/data/cogs-scenarios';
import { StockCardSimulator } from './StockCardSimulator';
import { ManufacturingCostCalculator } from './ManufacturingCostCalculator';
import { CostingComparisonMatrix } from './CostingComparisonMatrix';
import { CogsSocraticLadder } from './CogsSocraticLadder';
import { storageService } from '@/services/storage/storage-service';
import { DokBadge } from '@/components/assessment/DokBadge';

export interface CogsWorkbenchProps {
  currentRegime: CogsAccountingRegime | CoaAccountingRegime;
  onRegimeChange?: (regime: CoaAccountingRegime) => void;
  onNavigateToJournalizer?: () => void;
  onNavigateToFinancialStatements?: () => void;
}

export type CogsSubTab = 'stock-card' | 'manufacturing' | 'comparison';

export const CogsWorkbench: FC<CogsWorkbenchProps> = ({
  currentRegime,
  onRegimeChange,
  onNavigateToJournalizer,
  onNavigateToFinancialStatements,
}) => {
  const defaultScen = getDefaultCogsScenario();

  // Workbench State
  const [activeSubTab, setActiveSubTab] = useState<CogsSubTab>('stock-card');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(defaultScen.id);
  const [initialLots, setInitialLots] = useState<InventoryLot[]>(defaultScen.initialLots);
  const [transactions, setTransactions] = useState<StockTransaction[]>(defaultScen.transactions);
  const [selectedMethod, setSelectedMethod] = useState<CostingMethod>(
    defaultScen.recommendedMethod || 'FIFO'
  );
  const [manufacturingInput, setManufacturingInput] = useState<ManufacturingCostInput>(
    defaultScen.manufacturingInput || {
      regime: currentRegime,
      beginningWip: 0,
      actualDirectMaterial: 0,
      normalDirectMaterial: 0,
      actualDirectLabor: 0,
      normalDirectLabor: 0,
      actualOverhead: 0,
      finishedUnits: 0,
      endingWipUnits: 0,
      wipMethod: 'DIRECT_MATERIAL',
      completionPercentage: 0,
    }
  );

  const [stateVersion, setStateVersion] = useState<number>(1);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState<boolean>(false);
  const [showScenarioDetails, setShowScenarioDetails] = useState<boolean>(false);

  // Active Scenario metadata
  const activeScenario: CogsScenario = useMemo(() => {
    return getCogsScenarioById(selectedScenarioId) || defaultScen;
  }, [selectedScenarioId, defaultScen]);

  // Load persisted state on mount
  useEffect(() => {
    let isMounted = true;
    storageService.loadCogsState().then((saved) => {
      if (!isMounted) return;
      if (saved) {
        if (saved.selectedScenarioId) {
          setSelectedScenarioId(saved.selectedScenarioId);
        }
        if (saved.activeSubTab) {
          setActiveSubTab(saved.activeSubTab);
        }
        if (saved.initialLots && saved.initialLots.length > 0) {
          setInitialLots(saved.initialLots);
        }
        if (saved.transactions && saved.transactions.length > 0) {
          setTransactions(saved.transactions);
        }
        if (saved.selectedMethod) {
          setSelectedMethod(saved.selectedMethod);
        }
        if (saved.manufacturingInput) {
          setManufacturingInput(saved.manufacturingInput);
        }
        setStateVersion((v) => v + 1);
      }
      setIsLoadedFromStorage(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Save state on updates
  useEffect(() => {
    if (!isLoadedFromStorage) return;

    const payload: CogsState = {
      initialLots,
      transactions,
      selectedMethod,
      manufacturingInput,
      activeSubTab,
      selectedScenarioId,
    };

    storageService.saveCogsState(payload);
  }, [
    isLoadedFromStorage,
    initialLots,
    transactions,
    selectedMethod,
    manufacturingInput,
    activeSubTab,
    selectedScenarioId,
  ]);

  // Handle Scenario Selection
  const handleSelectScenario = (scenId: string) => {
    const scen = getCogsScenarioById(scenId);
    if (!scen) return;

    setSelectedScenarioId(scen.id);
    setInitialLots(scen.initialLots);
    setTransactions(scen.transactions);
    if (scen.recommendedMethod) {
      setSelectedMethod(scen.recommendedMethod);
    }
    if (scen.manufacturingInput) {
      setManufacturingInput({
        ...scen.manufacturingInput,
        regime: currentRegime,
      });
    }

    // Auto-align subtab for optimal learning experience
    if (scen.id === 'scen-cogs-03') {
      setActiveSubTab('manufacturing');
    } else if (scen.id === 'scen-cogs-02') {
      setActiveSubTab('comparison');
    }

    setStateVersion((v) => v + 1);
  };

  // Synchronize regime changes into manufacturing input
  useEffect(() => {
    setManufacturingInput((prev) => {
      if (prev.regime === currentRegime) return prev;
      return { ...prev, regime: currentRegime };
    });
  }, [currentRegime]);

  // Child State Sync Handlers
  const handleStockCardChange = (state: {
    initialLots: InventoryLot[];
    transactions: StockTransaction[];
    method: CostingMethod;
    result: StockCardResult;
  }) => {
    setInitialLots(state.initialLots);
    setTransactions(state.transactions);
    setSelectedMethod(state.method);
  };

  const handleManufacturingChange = (
    input: ManufacturingCostInput,
    _output: ManufacturingCostOutput
  ) => {
    setManufacturingInput(input);
  };

  const handleExportToJournalizerFromMfg = (_entries: JournalEntryItem[]) => {
    if (onNavigateToJournalizer) {
      onNavigateToJournalizer();
    }
  };

  return (
    <div
      data-testid="cogs-workbench"
      className="space-y-6 max-w-7xl mx-auto transition-colors"
    >
      {/* 1. Header Banner & Executive Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5" />
                <span>Phân Hệ Kế Toán COGS &amp; Costing</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/90 border border-white/10">
                VAS 02 / IAS 2 &bull; TT 200 &bull; TT 99/2025 &bull; TT 133
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Bàn Tính Giá Vốn Hàng Bán &amp; Giá Thành Doanh Nghiệp
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              Mô phỏng Thẻ kho điện tử (Mẫu 03/XKNB), Bàn tính giá thành Z &amp; bóc tách chi phí vượt định mức (Chỉ tiêu B4 thuế TNDN), cùng Ma trận so sánh đa phương pháp phân tích tác động trực tiếp lên BCTC B01 &amp; B02.
            </p>
          </div>

          {/* Quick Cross-Workbench Actions */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            {onNavigateToJournalizer && (
              <button
                type="button"
                data-testid="btn-navigate-journalizer"
                onClick={onNavigateToJournalizer}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <span>📝 Mở Bàn Định Khoản (Journalizer)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {onNavigateToFinancialStatements && (
              <button
                type="button"
                data-testid="btn-navigate-bctc"
                onClick={onNavigateToFinancialStatements}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <span>📊 Xem Báo Cáo Tài Chính (B01 &amp; B02)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Pedagogical Scenario Selector Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Tình Huống Thực Tế &amp; Sư Phạm DOK 1–3
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              Chọn nhanh tình huống:
            </span>
            <select
              data-testid="scenario-selector-select"
              value={selectedScenarioId}
              onChange={(e) => handleSelectScenario(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {COGS_SCENARIOS.map((scen) => (
                <option key={scen.id} value={scen.id}>
                  [{scen.dokLevelKey}] {scen.titleVi}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Scenario Interactive Pills/Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {COGS_SCENARIOS.map((scen) => {
            const isSelected = scen.id === selectedScenarioId;
            return (
              <button
                key={scen.id}
                type="button"
                data-testid={`scenario-select-btn-${scen.id}`}
                onClick={() => handleSelectScenario(scen.id)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                      {scen.code}
                    </span>
                    <DokBadge dokLevel={scen.dokLevelKey} showPoints={false} />
                  </div>
                  <h4
                    className={`text-xs font-bold line-clamp-2 ${
                      isSelected
                        ? 'text-emerald-900 dark:text-emerald-200'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {scen.titleVi}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {scen.shortDescriptionVi}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">
                    {scen.industryVi}
                  </span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      isSelected
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    {isSelected ? 'Đang chọn' : 'Áp dụng'}
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Expandable Scenario Full Narrative */}
        <div className="pt-1">
          <button
            type="button"
            data-testid="toggle-scenario-details-btn"
            onClick={() => setShowScenarioDetails(!showScenarioDetails)}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>
              {showScenarioDetails
                ? 'Thu gọn bối cảnh tình huống & căn cứ pháp lý'
                : 'Xem chi tiết bối cảnh nghiệp vụ, căn cứ pháp lý & mục tiêu sư phạm'}
            </span>
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform ${
                showScenarioDetails ? 'rotate-90' : ''
              }`}
            />
          </button>

          {showScenarioDetails && (
            <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-3">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                  Bối Cảnh Tình Huống Chi Tiết:
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {activeScenario.fullStoryVi}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                    Căn Cứ Pháp Lý &amp; Chuẩn Mực:
                  </span>
                  <p className="text-slate-600 dark:text-slate-400">
                    {activeScenario.regulatoryBasisVi}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                    Mục Tiêu Bài Học (Learning Objectives):
                  </span>
                  <ul className="space-y-0.5 text-slate-600 dark:text-slate-400">
                    {activeScenario.learningObjectivesVi.map((obj, i) => (
                      <li key={i}>&bull; {obj}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Socratic Progressive Hint Ladder */}
      <CogsSocraticLadder
        scenarioId={activeScenario.id}
        dokLevel={activeScenario.dokLevel}
        dokLevelKey={activeScenario.dokLevelKey}
      />

      {/* 4. Sub-Tabs Interactive Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-tab 1: Stock Card */}
          <button
            type="button"
            data-testid="subtab-stock-card"
            onClick={() => setActiveSubTab('stock-card')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'stock-card'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>📦 Sổ Chi Tiết Vật Liệu / Thẻ Kho</span>
          </button>

          {/* Sub-tab 2: Manufacturing Cost */}
          <button
            type="button"
            data-testid="subtab-manufacturing"
            onClick={() => setActiveSubTab('manufacturing')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'manufacturing'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>⚙️ Bàn Tính Giá Thành &amp; Quyết Toán Thuế</span>
          </button>

          {/* Sub-tab 3: Costing Comparison Matrix */}
          <button
            type="button"
            data-testid="subtab-comparison"
            onClick={() => setActiveSubTab('comparison')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'comparison'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>📊 Ma Trận So Sánh &amp; Tác Động BCTC</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>Chế độ:</span>
          {onRegimeChange ? (
            <button
              type="button"
              data-testid="cogs-regime-toggle-btn"
              onClick={() =>
                onRegimeChange(
                  currentRegime === 'CIRCULAR_200' ? 'CIRCULAR_133' : 'CIRCULAR_200'
                )
              }
              className="px-2 py-0.5 rounded-md font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 transition-colors"
              title="Chuyển đổi chế độ kế toán"
            >
              {currentRegime}
            </button>
          ) : (
            <span className="font-bold text-slate-800 dark:text-slate-200">{currentRegime}</span>
          )}
        </div>
      </div>

      {/* 5. Sub-Tab Workspace Viewport */}
      <div className="min-w-0">
        {activeSubTab === 'stock-card' && (
          <div data-testid="viewport-stock-card">
            <StockCardSimulator
              key={`stock-card-${selectedScenarioId}-${stateVersion}`}
              initialLots={initialLots}
              initialTransactions={transactions}
              initialMethod={selectedMethod}
              onStateChange={handleStockCardChange}
            />
          </div>
        )}

        {activeSubTab === 'manufacturing' && (
          <div data-testid="viewport-manufacturing">
            <ManufacturingCostCalculator
              key={`manufacturing-${selectedScenarioId}-${stateVersion}`}
              initialInput={manufacturingInput}
              onStateChange={handleManufacturingChange}
              onExportToJournalizer={handleExportToJournalizerFromMfg}
            />
          </div>
        )}

        {activeSubTab === 'comparison' && (
          <div data-testid="viewport-comparison">
            <CostingComparisonMatrix
              key={`comparison-${selectedScenarioId}-${stateVersion}`}
              initialInventory={initialLots}
              transactions={transactions}
              assumedRevenue={activeScenario.assumedRevenue || 500_000_000}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CogsWorkbench;
