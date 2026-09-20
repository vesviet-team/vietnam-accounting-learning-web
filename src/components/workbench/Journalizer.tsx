import { useState, useMemo, useEffect, type FC } from 'react';
import {
  Scale,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  RotateCcw,
  Send,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { AccountingRegime } from '@/types/coa';
import { JournalEntryRow, JournalBalanceValidation } from '@/types/workbench';
import { TAccountData } from '@/types/curriculum';
import { searchAccounts, findAccountByCode } from '@/data/coa-service';
import { isProhibitedInCircular133, getProhibitedAccountInfo } from '@/data/prohibited-accounts';
import { TAccountView, formatVnd, determineAccountNature } from '@/components/curriculum/TAccountView';
import { storageService } from '@/services/storage/storage-service';
import { SocraticHintLadder } from '@/components/workbench/SocraticHintLadder';

export interface JournalizerProps {
  currentRegime: AccountingRegime;
  onNavigateToCoa?: () => void;
  onNavigateToFinancialStatements?: () => void;
}

export interface PracticeScenario {
  id: string;
  titleVi: string;
  categoryVi: string;
  descriptionVi: string;
  statutoryBasis: string;
  regimeNoteVi?: string;
  rows: Array<{
    accountCode: string;
    accountNameVi: string;
    debitAmount: number;
    creditAmount: number;
    noteVi?: string;
  }>;
}

export interface PostedJournalEntry {
  id: string;
  timestamp: string;
  descriptionVi: string;
  rows: JournalEntryRow[];
  totalAmount: number;
  regime: AccountingRegime;
}

export const PRACTICE_SCENARIOS: PracticeScenario[] = [
  {
    id: 'scen-01',
    titleVi: 'Rút tiền gửi ngân hàng về nhập quỹ tiền mặt',
    categoryVi: 'Vốn bằng tiền',
    descriptionVi:
      'Doanh nghiệp lập Giấy rút tiền / Séc rút tiền mặt từ tài khoản Vietcombank số tiền 50.000.000 VNĐ về nhập quỹ tiền mặt công ty để chi tiêu nội bộ.',
    statutoryBasis: 'Thông tư 200/2014/TT-BTC Điều 11 & Điều 13 (hoặc TT 133 Điều 11 & 12)',
    rows: [
      {
        accountCode: '1111',
        accountNameVi: 'Tiền Việt Nam (Quỹ tiền mặt)',
        debitAmount: 50000000,
        creditAmount: 0,
        noteVi: 'Thu tiền mặt nhập quỹ',
      },
      {
        accountCode: '1121',
        accountNameVi: 'Tiền gửi ngân hàng (VNĐ)',
        debitAmount: 0,
        creditAmount: 50000000,
        noteVi: 'Rút tiền gửi ngân hàng',
      },
    ],
  },
  {
    id: 'scen-02',
    titleVi: 'Mua nguyên vật liệu nhập kho chưa trả tiền người bán (VAT 10%)',
    categoryVi: 'Mua hàng & Kho',
    descriptionVi:
      'Công ty mua nguyên vật liệu nhập kho theo Hóa đơn GTGT số 000123: Tiền hàng 40.000.000 VNĐ, thuế GTGT 10% (4.000.000 VNĐ), chưa thanh toán cho Công ty Hải Hà.',
    statutoryBasis: 'Thông tư 200/2014 & TT 133 / Chuẩn mực Kế toán VAS 02 (Hàng tồn kho)',
    rows: [
      {
        accountCode: '152',
        accountNameVi: 'Nguyên liệu, vật liệu',
        debitAmount: 40000000,
        creditAmount: 0,
        noteVi: 'Giá trị NVL nhập kho',
      },
      {
        accountCode: '1331',
        accountNameVi: 'Thuế GTGT đầu vào được khấu trừ',
        debitAmount: 4000000,
        creditAmount: 0,
        noteVi: 'Thuế GTGT đầu vào 10%',
      },
      {
        accountCode: '331',
        accountNameVi: 'Phải trả cho người bán',
        debitAmount: 0,
        creditAmount: 44000000,
        noteVi: 'Công nợ phải trả NCC Hải Hà',
      },
    ],
  },
  {
    id: 'scen-03',
    titleVi: 'Xuất bán hàng hóa thu tiền ngay qua chuyển khoản (VAT 10%)',
    categoryVi: 'Bán hàng & Doanh thu',
    descriptionVi:
      'Xuất kho bán lô hàng hóa cho khách hàng Minh Tâm thu tiền ngay bằng chuyển khoản ngân hàng: Giá bán chưa thuế 60.000.000 VNĐ, thuế GTGT 10% (6.000.000 VNĐ).',
    statutoryBasis: 'Thông tư 200/2014 & TT 133 / Chuẩn mực Kế toán VAS 14 (Doanh thu)',
    rows: [
      {
        accountCode: '1121',
        accountNameVi: 'Tiền gửi ngân hàng (VNĐ)',
        debitAmount: 66000000,
        creditAmount: 0,
        noteVi: 'Nhận tiền chuyển khoản khách hàng',
      },
      {
        accountCode: '5111',
        accountNameVi: 'Doanh thu bán hàng hóa',
        debitAmount: 0,
        creditAmount: 60000000,
        noteVi: 'Doanh thu bán hàng chưa VAT',
      },
      {
        accountCode: '33311',
        accountNameVi: 'Thuế GTGT đầu ra phải nộp',
        debitAmount: 0,
        creditAmount: 6000000,
        noteVi: 'Thuế GTGT 10% đầu ra',
      },
    ],
  },
  {
    id: 'scen-04',
    titleVi: 'Chi tiền mặt tạm ứng công tác phí cho nhân viên',
    categoryVi: 'Thanh toán & Tạm ứng',
    descriptionVi:
      'Lập Phiếu chi số 015 xuất quỹ tiền mặt 8.000.000 VNĐ tạm ứng cho nhân viên Nguyễn Văn B đi công tác khảo sát thị trường tại Đà Nẵng.',
    statutoryBasis: 'Thông tư 200 Điều 25 & TT 133 Điều 20 (Kế toán tạm ứng TK 141)',
    rows: [
      {
        accountCode: '141',
        accountNameVi: 'Tạm ứng',
        debitAmount: 8000000,
        creditAmount: 0,
        noteVi: 'Tạm ứng công tác phí cho NV Nguyễn Văn B',
      },
      {
        accountCode: '1111',
        accountNameVi: 'Tiền Việt Nam (Quỹ tiền mặt)',
        debitAmount: 0,
        creditAmount: 8000000,
        noteVi: 'Xuất quỹ tiền mặt tạm ứng',
      },
    ],
  },
  {
    id: 'scen-05',
    titleVi: 'Chi phí bán hàng / quảng cáo (Phân biệt TT 200 vs TT 133)',
    categoryVi: 'Chi phí hoạt động',
    descriptionVi:
      'Chi phí dịch vụ chạy quảng cáo trực tuyến thanh toán qua chuyển khoản ngân hàng: Giá chưa thuế 20.000.000 VNĐ, thuế GTGT 10% (2.000.000 VNĐ). Lưu ý: TT 200 dùng TK 641, còn TT 133 cấm TK 641 và bắt buộc dùng TK 6421!',
    statutoryBasis: 'Điều 62 TT 133/2016/TT-BTC & Điều 91 TT 200/2014/TT-BTC',
    regimeNoteVi: 'Trong TT 133, TK 641 bị nghiêm cấm; phải dùng TK 6421 (Chi phí bán hàng)',
    rows: [
      {
        accountCode: '641',
        accountNameVi: 'Chi phí bán hàng (TT 200) / Lưu ý TT 133 cấm TK này',
        debitAmount: 20000000,
        creditAmount: 0,
        noteVi: 'Chi phí quảng cáo bán hàng',
      },
      {
        accountCode: '1331',
        accountNameVi: 'Thuế GTGT đầu vào được khấu trừ',
        debitAmount: 2000000,
        creditAmount: 0,
        noteVi: 'Thuế GTGT đầu vào 10%',
      },
      {
        accountCode: '1121',
        accountNameVi: 'Tiền gửi ngân hàng (VNĐ)',
        debitAmount: 0,
        creditAmount: 22000000,
        noteVi: 'Chuyển khoản thanh toán qua ngân hàng',
      },
    ],
  },
  {
    id: 'scen-custom',
    titleVi: 'Nghiệp vụ tự do (Tự tạo bút toán)',
    categoryVi: 'Tùy chỉnh',
    descriptionVi:
      'Thực hành lập định khoản tự do theo ý muốn. Bạn có thể thêm, xóa dòng, tra cứu tài khoản và kiểm tra cân đối trước khi ghi sổ.',
    statutoryBasis: 'Nguyên lý kế toán kép (Double-Entry Bookkeeping)',
    rows: [
      {
        accountCode: '',
        accountNameVi: '',
        debitAmount: 0,
        creditAmount: 0,
        noteVi: '',
      },
      {
        accountCode: '',
        accountNameVi: '',
        debitAmount: 0,
        creditAmount: 0,
        noteVi: '',
      },
    ],
  },
];

export const Journalizer: FC<JournalizerProps> = ({
  currentRegime,
  onNavigateToCoa,
  onNavigateToFinancialStatements,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('scen-01');
  const [entryDescription, setEntryDescription] = useState<string>(
    PRACTICE_SCENARIOS[0].titleVi
  );
  const [rows, setRows] = useState<JournalEntryRow[]>(() => {
    const s = PRACTICE_SCENARIOS[0];
    return s.rows.map((r, i) => ({
      id: `row-${Date.now()}-${i}`,
      accountCode: r.accountCode,
      accountNameVi: r.accountNameVi,
      debitAmount: r.debitAmount,
      creditAmount: r.creditAmount,
      noteVi: r.noteVi || '',
    }));
  });

  const [activeAccountSearchRowId, setActiveAccountSearchRowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [postSuccessMessage, setPostSuccessMessage] = useState<string | null>(null);
  const [postedEntries, setPostedEntries] = useState<PostedJournalEntry[]>([]);
  const [ledgerTAccounts, setLedgerTAccounts] = useState<Record<string, TAccountData>>({});

  // Restore persisted workbench state (postedEntries & ledgerTAccounts) on mount
  useEffect(() => {
    let isMounted = true;
    storageService
      .loadWorkbenchState()
      .then((state) => {
        if (!isMounted) return;
        if (state.postedEntries && state.postedEntries.length > 0) {
          setPostedEntries(state.postedEntries as unknown as PostedJournalEntry[]);
        }
        if (state.ledgerTAccounts && Object.keys(state.ledgerTAccounts).length > 0) {
          setLedgerTAccounts(state.ledgerTAccounts as unknown as Record<string, TAccountData>);
        }
      })
      .catch((err) => {
        console.warn('[Journalizer] Failed to load persisted state:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Current active scenario object
  const currentScenario = useMemo(() => {
    return PRACTICE_SCENARIOS.find((s) => s.id === selectedScenarioId) || PRACTICE_SCENARIOS[0];
  }, [selectedScenarioId]);

  // Load a practice scenario
  const handleSelectScenario = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    setPostSuccessMessage(null);
    const scen = PRACTICE_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scen) return;

    // In TT 133, auto-map 641 to 6421 if the scenario row uses 641, or let learner see the prohibition
    setEntryDescription(scen.titleVi);
    setRows(
      scen.rows.map((r, i) => {
        let code = r.accountCode;
        let name = r.accountNameVi;

        // If regime is 133 and code is 641 in scen-05, we let learner experience the prohibition warning
        if (currentRegime === 'CIRCULAR_133' && code === '641') {
          // Keep 641 so warning is triggered, or if user wishes they can click substitute
        }

        return {
          id: `row-${Date.now()}-${i}`,
          accountCode: code,
          accountNameVi: name,
          debitAmount: r.debitAmount,
          creditAmount: r.creditAmount,
          noteVi: r.noteVi || '',
        };
      })
    );
  };

  // Add new row
  const handleAddRow = () => {
    setPostSuccessMessage(null);
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${prev.length}`,
        accountCode: '',
        accountNameVi: '',
        debitAmount: 0,
        creditAmount: 0,
        noteVi: '',
      },
    ]);
  };

  // Remove row (minimum 2 rows)
  const handleRemoveRow = (id: string) => {
    if (rows.length <= 2) return;
    setPostSuccessMessage(null);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Clear / reset rows
  const handleResetRows = () => {
    setPostSuccessMessage(null);
    setRows([
      {
        id: `row-${Date.now()}-0`,
        accountCode: '',
        accountNameVi: '',
        debitAmount: 0,
        creditAmount: 0,
        noteVi: '',
      },
      {
        id: `row-${Date.now()}-1`,
        accountCode: '',
        accountNameVi: '',
        debitAmount: 0,
        creditAmount: 0,
        noteVi: '',
      },
    ]);
  };

  // Reload rows from the selected scenario (for restoring after independent practice)
  const handleReloadScenarioRows = () => {
    setPostSuccessMessage(null);
    if (!currentScenario) return;
    setRows(
      currentScenario.rows.map((r, i) => ({
        id: `row-${Date.now()}-${i}`,
        accountCode: r.accountCode,
        accountNameVi: r.accountNameVi,
        debitAmount: r.debitAmount,
        creditAmount: r.creditAmount,
        noteVi: r.noteVi || '',
      }))
    );
  };

  // Update a field in a row
  const handleUpdateRow = (
    id: string,
    field: 'accountCode' | 'debitAmount' | 'creditAmount' | 'noteVi',
    value: string | number
  ) => {
    setPostSuccessMessage(null);
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        if (field === 'accountCode') {
          const codeStr = String(value).trim();
          const found = findAccountByCode(codeStr, currentRegime);
          return {
            ...r,
            accountCode: codeStr,
            accountNameVi: found ? found.nameVi : r.accountNameVi,
          };
        }

        if (field === 'debitAmount') {
          const num = Math.max(0, Number(value) || 0);
          // Mutual exclusion: if debit > 0, credit becomes 0
          return {
            ...r,
            debitAmount: num,
            creditAmount: num > 0 ? 0 : r.creditAmount,
          };
        }

        if (field === 'creditAmount') {
          const num = Math.max(0, Number(value) || 0);
          // Mutual exclusion: if credit > 0, debit becomes 0
          return {
            ...r,
            creditAmount: num,
            debitAmount: num > 0 ? 0 : r.debitAmount,
          };
        }

        if (field === 'noteVi') {
          return { ...r, noteVi: String(value) };
        }

        return r;
      })
    );
  };

  // Replace prohibited account with recommended substitute
  const handleApplySubstitute = (rowId: string, substituteCode: string) => {
    const subAcc = findAccountByCode(substituteCode, currentRegime);
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          accountCode: substituteCode,
          accountNameVi: subAcc ? subAcc.nameVi : `Tài khoản ${substituteCode}`,
        };
      })
    );
  };

  // Mathematical balance validation
  const validation: JournalBalanceValidation = useMemo(() => {
    const totalDebit = rows.reduce((sum, r) => sum + (Number(r.debitAmount) || 0), 0);
    const totalCredit = rows.reduce((sum, r) => sum + (Number(r.creditAmount) || 0), 0);
    const roundedDebit = Math.round(totalDebit);
    const roundedCredit = Math.round(totalCredit);
    const delta = Math.abs(roundedDebit - roundedCredit);

    let errorMessageVi: string | undefined;

    // Check row count
    if (rows.length < 2) {
      errorMessageVi = 'Bút toán phải có ít nhất 2 dòng tài khoản đối ứng (1 Nợ - 1 Có).';
    } else if (roundedDebit === 0 && roundedCredit === 0) {
      errorMessageVi = 'Số tiền định khoản phải lớn hơn 0 VNĐ.';
    } else if (delta !== 0) {
      errorMessageVi = `Bút toán chưa cân đối! Tổng Nợ (${formatVnd(roundedDebit)}) lệch ${formatVnd(delta)} so với Tổng Có (${formatVnd(roundedCredit)}).`;
    }

    // Check same-row simultaneous debit and credit
    const sameRowConflict = rows.some((r) => r.debitAmount > 0 && r.creditAmount > 0);
    if (sameRowConflict) {
      errorMessageVi = 'Một dòng tài khoản không được nhập đồng thời cả Nợ và Có.';
    }

    // Check Circular 133 prohibited accounts
    if (currentRegime === 'CIRCULAR_133') {
      const prohibitedRow = rows.find((r) => isProhibitedInCircular133(r.accountCode));
      if (prohibitedRow) {
        const rule = getProhibitedAccountInfo(prohibitedRow.accountCode);
        errorMessageVi = `TK ${prohibitedRow.accountCode} bị CẤM trong Thông tư 133! Vui lòng thay bằng TK ${rule?.substituteCode || 'hợp lệ'}.`;
      }
    }

    // Check empty account code
    const emptyAccount = rows.some((r) => (r.debitAmount > 0 || r.creditAmount > 0) && !r.accountCode.trim());
    if (emptyAccount) {
      errorMessageVi = 'Vui lòng chọn Mã tài khoản cho tất cả các dòng phát sinh.';
    }

    const isBalanced = delta === 0 && roundedDebit > 0 && !errorMessageVi;

    return {
      totalDebit: roundedDebit,
      totalCredit: roundedCredit,
      isBalanced,
      delta,
      errorMessageVi,
    };
  }, [rows, currentRegime]);

  // Search filtered accounts for picker popup
  const searchedAccounts = useMemo(() => {
    if (!searchQuery.trim()) {
      return searchAccounts('', currentRegime).slice(0, 10);
    }
    return searchAccounts(searchQuery, currentRegime).slice(0, 10);
  }, [searchQuery, currentRegime]);

  // Select account from picker
  const handleSelectAccountFromPicker = (rowId: string, code: string, name: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          accountCode: code,
          accountNameVi: name,
        };
      })
    );
    setActiveAccountSearchRowId(null);
    setSearchQuery('');
  };

  // Posting action: "Ghi sổ"
  const handlePostToLedger = async () => {
    if (!validation.isBalanced) return;

    const newPostedEntry: PostedJournalEntry = {
      id: `pe-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      descriptionVi: entryDescription || 'Bút toán định khoản',
      rows: JSON.parse(JSON.stringify(rows)),
      totalAmount: validation.totalDebit,
      regime: currentRegime,
    };

    // Update posted entries history
    const updatedEntries = [newPostedEntry, ...postedEntries];
    setPostedEntries(updatedEntries);

    // Update Live T-Accounts
    const updatedLedger: Record<string, TAccountData> = { ...ledgerTAccounts };

    // Identify opposing counter account codes for narrative
    const debitAccounts = rows.filter((r) => r.debitAmount > 0).map((r) => r.accountCode);
    const creditAccounts = rows.filter((r) => r.creditAmount > 0).map((r) => r.accountCode);

    for (const row of rows) {
      if (!row.accountCode) continue;
      const code = row.accountCode;

      if (!updatedLedger[code]) {
        const accItem = findAccountByCode(code, currentRegime);
        const nature = determineAccountNature(code);
        updatedLedger[code] = {
          accountCode: code,
          accountNameVi: accItem ? accItem.nameVi : row.accountNameVi || `Tài khoản ${code}`,
          accountClass: nature.accountClass,
          isContra: nature.isContraAsset || nature.isContraEquity,
          normalBalance: nature.normalSide,
          openingBalance: {
            side: nature.normalSide === 'CREDIT' ? 'CREDIT' : 'DEBIT',
            amount: 0,
          },
          entries: [],
        };
      }

      const isDebit = row.debitAmount > 0;
      const amount = isDebit ? row.debitAmount : row.creditAmount;
      const counterCodes = isDebit ? creditAccounts.join(', ') : debitAccounts.join(', ');

      updatedLedger[code].entries = [
        ...updatedLedger[code].entries,
        {
          id: `entry-${Date.now()}-${Math.random()}`,
          description: row.noteVi || entryDescription,
          amount,
          side: isDebit ? 'DEBIT' : 'CREDIT',
          counterAccountCode: counterCodes,
        },
      ];
    }

    setLedgerTAccounts(updatedLedger);

    // Save to storageService for persistent offline reload
    storageService
      .saveWorkbenchState({
        postedEntries: updatedEntries as any,
        ledgerTAccounts: updatedLedger as any,
      })
      .catch((err) => {
        console.warn('[Journalizer] Failed to persist state:', err);
      });

    setPostSuccessMessage(
      `Ghi sổ thành công! Đã ghi nhận bút toán "${entryDescription}" với tổng số tiền ${formatVnd(validation.totalDebit)}. Sơ đồ chữ T đã được cập nhật.`
    );

    // Record study activity to advance streak in background
    storageService.recordStreakActivity().catch(() => {});
  };

  // Clear posted entries and ledger history
  const handleClearJournalHistory = async () => {
    setPostedEntries([]);
    setLedgerTAccounts({});
    setPostSuccessMessage(null);
    await storageService.saveWorkbenchState({
      postedEntries: [],
      ledgerTAccounts: {},
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <Scale className="w-4 h-4" />
            <span>Bàn Định Khoản Kế Toán Trực Quan (Journalizing Workbench)</span>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              currentRegime === 'CIRCULAR_200'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
            }`}
          >
            Đang áp dụng: {currentRegime === 'CIRCULAR_200' ? 'Thông tư 200 (DN Lớn)' : 'Thông tư 133 (DN Vừa & Nhỏ)'}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
          Thực Hành Định Khoản Đa Dòng & Ghi Sổ Nhật Ký Kèm Sơ Đồ Chữ T
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Xây dựng định khoản nghiệp vụ kinh tế, tự động kiểm tra bất biến kép{' '}
          <strong className="text-slate-800 dark:text-slate-200">&Sigma; Nợ &equiv; &Sigma; Có</strong>,
          ngăn chặn tài khoản bị cấm theo Thông tư 133 và cập nhật thời gian thực vào Sơ đồ chữ T.
        </p>
      </div>

      {/* Practice Scenario Selector */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>Chọn Kịch Bản Nghiệp Vụ Thực Tế Để Luyện Tập</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PRACTICE_SCENARIOS.map((scen) => {
            const isSelected = selectedScenarioId === scen.id;
            return (
              <button
                key={scen.id}
                type="button"
                onClick={() => handleSelectScenario(scen.id)}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white dark:bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                    {scen.categoryVi}
                  </span>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                    {scen.titleVi}
                  </div>
                </div>
                {scen.id === 'scen-05' && currentRegime === 'CIRCULAR_133' && (
                  <span className="mt-2 inline-flex items-center text-[10px] text-amber-600 font-semibold">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Chứa TK 641 bị cấm TT 133
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Scenario Context Box */}
        <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900 text-xs text-slate-700 dark:text-slate-300 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="font-bold text-emerald-900 dark:text-emerald-200">
              Tình huống: {currentScenario.titleVi}
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleResetRows}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 text-[11px] font-semibold shadow-2xs transition-all flex items-center gap-1"
                title="Xóa các dòng định khoản mẫu để tự thử thách với gợi ý Socratic"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Tự thử thách (Xóa mẫu)</span>
              </button>
              {currentScenario.id !== 'scen-custom' && (
                <button
                  type="button"
                  onClick={handleReloadScenarioRows}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shadow-2xs transition-all flex items-center gap-1"
                  title="Tải lại các dòng gợi ý mẫu của tình huống"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Tải lại mẫu</span>
                </button>
              )}
            </div>
          </div>
          <p className="leading-relaxed">{currentScenario.descriptionVi}</p>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            Căn cứ pháp lý: {currentScenario.statutoryBasis}
          </div>
          {currentScenario.regimeNoteVi && (
            <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              Lưu ý chế độ: {currentScenario.regimeNoteVi}
            </div>
          )}
        </div>

        {/* 3-Tier Graduated Socratic Hint Ladder */}
        <SocraticHintLadder
          scenarioId={selectedScenarioId}
          currentRegime={currentRegime}
        />
      </div>

      {/* Balance Indicator Status Banner */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          validation.isBalanced
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
        }`}
      >
        <div className="flex items-start sm:items-center space-x-3">
          {validation.isBalanced ? (
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          ) : (
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          )}
          <div>
            <div className="font-bold text-base flex items-center gap-2">
              <span>{validation.isBalanced ? 'Bút toán đã CÂN ĐỐI' : 'Bút toán CHƯA CÂN ĐỐI'}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  validation.isBalanced
                    ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200'
                }`}
              >
                {validation.isBalanced
                  ? `${formatVnd(validation.totalDebit)} ≡ ${formatVnd(validation.totalCredit)}`
                  : `Lệch: ${formatVnd(validation.delta)}`}
              </span>
            </div>
            <div className="text-xs opacity-90 mt-0.5">
              {validation.isBalanced
                ? 'Đã thỏa mãn bất biến &Sigma; Nợ = &Sigma; Có. Bạn có thể nhấn "Ghi sổ" để cập nhật vào Sổ cái và Sơ đồ chữ T.'
                : validation.errorMessageVi || 'Hãy kiểm tra lại số tiền các tài khoản bên Nợ và bên Có.'}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6 text-sm font-mono self-end sm:self-center">
          <div className="text-right">
            <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400 block">Tổng phát sinh Nợ:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
              {formatVnd(validation.totalDebit)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400 block">Tổng phát sinh Có:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 text-base">
              {formatVnd(validation.totalCredit)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Journal Entry Builder Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Table Header Controls */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Diễn giải nghiệp vụ (Nội dung ghi sổ)
            </label>
            <input
              type="text"
              value={entryDescription}
              onChange={(e) => setEntryDescription(e.target.value)}
              placeholder="Nhập nội dung nghiệp vụ kinh tế phát sinh..."
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleResetRows}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              title="Đặt lại bảng trắng"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm dòng</span>
            </button>
          </div>
        </div>

        {/* Rows Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-44">Số Hiệu TK</th>
                <th className="py-3 px-4 min-w-[200px]">Tên Tài Khoản</th>
                <th className="py-3 px-4 min-w-[160px]">Diễn Giải Chi Tiết</th>
                <th className="py-3 px-4 text-right w-36">Số Tiền Nợ (VNĐ)</th>
                <th className="py-3 px-4 text-right w-36">Số Tiền Có (VNĐ)</th>
                <th className="py-3 px-3 text-center w-14">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {rows.map((row, index) => {
                const isProhibited =
                  currentRegime === 'CIRCULAR_133' && isProhibitedInCircular133(row.accountCode);
                const prohibitedInfo = isProhibited
                  ? getProhibitedAccountInfo(row.accountCode)
                  : undefined;

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                      isProhibited ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    {/* Account Code with Searchable Picker Trigger */}
                    <td className="py-3 px-4 relative">
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          value={row.accountCode}
                          onChange={(e) =>
                            handleUpdateRow(row.id, 'accountCode', e.target.value)
                          }
                          placeholder="Mã TK"
                          className={`w-24 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 ${
                            isProhibited
                              ? 'border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAccountSearchRowId(
                              activeAccountSearchRowId === row.id ? null : row.id
                            );
                            setSearchQuery(row.accountCode);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                          title="Tra cứu danh mục tài khoản"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Account Search Popover Dropdown */}
                      {activeAccountSearchRowId === row.id && (
                        <div className="absolute left-4 top-12 z-20 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 space-y-2">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              Chọn tài khoản ({currentRegime === 'CIRCULAR_200' ? 'TT 200' : 'TT 133'})
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveAccountSearchRowId(null)}
                              className="text-[11px] text-slate-400 hover:text-slate-600"
                            >
                              Đóng
                            </button>
                          </div>
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Gõ mã số hoặc tên tài khoản..."
                            autoFocus
                            className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                          />
                          <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-700/50">
                            {searchedAccounts.map((acc) => {
                              const accProhibited =
                                currentRegime === 'CIRCULAR_133' &&
                                isProhibitedInCircular133(acc.code);
                              return (
                                <button
                                  key={acc.code}
                                  type="button"
                                  onClick={() =>
                                    handleSelectAccountFromPicker(row.id, acc.code, acc.nameVi)
                                  }
                                  className={`w-full text-left p-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                                    accProhibited
                                      ? 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                                      : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  <div>
                                    <span className="font-mono font-bold mr-1.5">{acc.code}</span>
                                    <span>{acc.nameVi}</span>
                                  </div>
                                  {accProhibited && (
                                    <span className="text-[10px] text-amber-600 font-bold ml-1">
                                      Cấm TT133
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Account Name & Prohibition Warning */}
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {row.accountNameVi || (
                          <span className="italic text-slate-400">Chưa chọn tài khoản</span>
                        )}
                      </div>

                      {/* Circular 133 Prohibition Warning with 1-Click Substitute */}
                      {isProhibited && prohibitedInfo && (
                        <div className="mt-1 p-1.5 bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-lg text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                          <div className="flex items-center space-x-1 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Tài khoản {row.accountCode} bị cấm trong Thông tư 133!</span>
                          </div>
                          <p className="text-[10px]">{prohibitedInfo.reasonVi}</p>
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              Thay thế: TK {prohibitedInfo.substituteCode} ({prohibitedInfo.substituteNameVi})
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleApplySubstitute(row.id, prohibitedInfo.substituteCode)
                              }
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] transition-colors"
                            >
                              Đổi sang TK {prohibitedInfo.substituteCode}
                            </button>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Note / Detail narrative */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={row.noteVi || ''}
                        onChange={(e) => handleUpdateRow(row.id, 'noteVi', e.target.value)}
                        placeholder={`Dòng ${index + 1}`}
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300"
                      />
                    </td>

                    {/* Debit Amount (Nợ) */}
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        min="0"
                        value={row.debitAmount || ''}
                        onChange={(e) =>
                          handleUpdateRow(row.id, 'debitAmount', Number(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-right text-emerald-600 dark:text-emerald-400"
                      />
                    </td>

                    {/* Credit Amount (Có) */}
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        min="0"
                        value={row.creditAmount || ''}
                        onChange={(e) =>
                          handleUpdateRow(row.id, 'creditAmount', Number(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-right text-blue-600 dark:text-blue-400"
                      />
                    </td>

                    {/* Remove Row Button */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={rows.length <= 2}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-colors"
                        title="Xóa dòng định khoản"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Footer Totals */}
            <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-mono text-xs font-bold border-t border-slate-200 dark:border-slate-800">
              <tr>
                <td colSpan={3} className="py-3 px-4 text-right font-sans uppercase text-slate-500">
                  Tổng Phát Sinh Nghiệp Vụ:
                </td>
                <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                  {formatVnd(validation.totalDebit)}
                </td>
                <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400">
                  {formatVnd(validation.totalCredit)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Action Bottom Bar */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Mỗi dòng chỉ ghi 1 bên (Nợ hoặc Có). Tổng số tiền Nợ bắt buộc phải bằng Tổng số tiền Có.
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {onNavigateToCoa && (
              <button
                type="button"
                onClick={onNavigateToCoa}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <span>Xem danh mục TK</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {onNavigateToFinancialStatements && (
              <button
                type="button"
                onClick={onNavigateToFinancialStatements}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl text-xs font-bold transition-all shadow-2xs"
                title="Chuyển đến Bảng Cân Đối Kế Toán (B01-DN) & Báo Cáo KQKD (B02-DN)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Xem Báo Cáo Tài Chính</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePostToLedger}
              disabled={!validation.isBalanced}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" />
              <span>Ghi Sổ (Post to Ledger)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Post Success Message Banner */}
      {postSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center space-x-3 text-xs text-emerald-900 dark:text-emerald-200 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1 font-medium">{postSuccessMessage}</div>
        </div>
      )}

      {/* Live T-Account Previews for Posted Accounts */}
      {Object.keys(ledgerTAccounts).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>Sơ Đồ Chữ T Của Các Tài Khoản Đã Ghi Sổ (Live T-Account Ledger)</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400">
                {Object.keys(ledgerTAccounts).length} tài khoản có phát sinh
              </span>
              {onNavigateToFinancialStatements && (
                <button
                  type="button"
                  onClick={onNavigateToFinancialStatements}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Xem BCTC (B01 & B02) &rarr;</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(ledgerTAccounts).map((tData) => (
              <div key={tData.accountCode} className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <TAccountView initialData={tData} allowInteractive={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General Journal Log Table (Sổ Nhật Ký Chung) */}
      {postedEntries.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden space-y-2">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Sổ Nhật Ký Chung (Lịch Sử Các Bút Toán Đã Ghi Sổ)
              </h3>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 font-mono">
                {postedEntries.length} bút toán đã ghi
              </span>
              <button
                type="button"
                onClick={handleClearJournalHistory}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/60"
                title="Xóa toàn bộ lịch sử bút toán và làm sạch Sơ đồ chữ T"
              >
                Xóa lịch sử
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {postedEntries.map((pe) => (
              <div key={pe.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-xs font-sans space-y-2">
                <div className="flex items-center justify-between text-slate-500">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-emerald-600 font-semibold">{pe.timestamp}</span>
                    <strong className="text-slate-900 dark:text-slate-100">{pe.descriptionVi}</strong>
                  </div>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatVnd(pe.totalAmount)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 border-l-2 border-emerald-500">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Bên Nợ:</span>
                    {pe.rows
                      .filter((r) => r.debitAmount > 0)
                      .map((r, i) => (
                        <div key={i} className="font-mono text-emerald-700 dark:text-emerald-400">
                          Nợ TK {r.accountCode}: {formatVnd(r.debitAmount)}
                        </div>
                      ))}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Bên Có:</span>
                    {pe.rows
                      .filter((r) => r.creditAmount > 0)
                      .map((r, i) => (
                        <div key={i} className="font-mono text-blue-700 dark:text-blue-400">
                          Có TK {r.accountCode}: {formatVnd(r.creditAmount)}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Journalizer;
