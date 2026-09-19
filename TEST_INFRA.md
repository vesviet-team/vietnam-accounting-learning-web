# TEST_INFRA.md — 4-Tier Requirement-Driven Test Architecture
## Vietnam Accounting 30-Day Learning Web Platform (`vietnam-accounting-learning-web`)

**Role**: E2E Test Suite Lead (`teamwork_preview_test_writer` / `qa-engineer`)  
**Target Project**: `D:/myproject/vietnam-accounting-learning-web`  
**Authoritative Specifications**:
- `ORIGINAL_REQUEST.md` (section `## 2026-09-13T12:53:39Z`, R1–R5)
- `PROJECT.md` (`D:/myproject/.agents/teamwork_preview_orchestrator_2/PROJECT.md`)
- `analysis.md` (`D:/myproject/.agents/vnacc_survey_spec_1/analysis.md`)
- `analysis.md` (`D:/myproject/.agents/vnacc_survey_pedagogy_3/analysis.md`)

---

## 1. Test Architecture & Philosophy

The Vietnam Accounting 30-Day Learning Web Platform requires strict, opaque-box, requirement-driven automated verification. Because accounting education directly shapes professional competency and statutory tax compliance, this test infrastructure establishes a **4-Tier Testing Pyramid**:

```
                              ┌─────────────────────────────┐
                              │           TIER 4            │
                              │   Real-World End-to-End     │
                              │   Application Scenarios     │
                              │  (5 Complete Journeys)      │
                              ├─────────────────────────────┤
                              │           TIER 3            │
                              │  Cross-Feature Combinations │
                              │   & Pairwise Interactions   │
                              ├─────────────────────────────┤
                              │           TIER 2            │
                              │ Boundary, Extreme Precision │
                              │     & Edge Case Stress      │
                              ├─────────────────────────────┤
                              │           TIER 1            │
                              │  Feature Coverage Baseline  │
                              │ (>=5 tests/feature, R1-R5)  │
                              └─────────────────────────────┘
```

### 1.1. Core Principles & Anti-Fraud Mandate
1. **Opaque-Box Verification**: Tests execute against exported public interfaces, data structures, and state transitions rather than inspecting private implementation details or asserting trivialities.
2. **Zero Assertion Theater**: Every assertion tests genuine invariant properties ($\sum \text{Debit} \equiv \sum \text{Credit}$, Circular 133 prohibition enforcement, $\ge 70\%$ gating, and 100% round-trip persistence fidelity).
3. **Statutory Alignment**: Tests encode Vietnamese legal mandates:
   - **Circular 133/2016/TT-BTC & Circular 200/2014/TT-BTC**: Elimination of accounts 621, 622, 623, 627, 641, 521, 413 under TT 133 and rerouting to 154 / 6421 / 511.
   - **Decree 123/2020/NĐ-CP & Decision 1450/QĐ-TCT**: E-invoice structures, 6-character symbols (e.g., `C26TAA`), 34-hex MCCQT codes, and tax rates (0%, 5%, 8%, 10%).
   - **Circular 219/2013/TT-BTC (Article 15) & Circular 96/2015/TT-BTC (Article 4)**: Mandatory non-cash bank payment condition for transactions $\ge 20,000,000$ VND.
   - **Webb's Depth of Knowledge (DOK 1–3)**: Question taxonomy and automated Rule of One diagnostic remediation.

---

## 2. Test Runner Configuration & Environment

The test suite runs on **Vitest 3.x** embedded within Vite and React 18:
- **Test Runner**: `vitest run`
- **Environment**: `jsdom` (with `fake-indexeddb` and `@testing-library/jest-dom`)
- **Path Aliases**: `@/` mapped to `./src/`
- **Execution Command**: `npm test` (or `npx vitest run`)
- **Fast Execution**: Pure in-memory execution completed in < 15 seconds without network flakiness.

---

## 3. Feature Inventory Mapped Across Tiers 1–4

| Requirement | Feature ID | Feature Name | Tier 1 Target | Tier 2 Target | Tier 3 Target | Tier 4 Target |
|:---|:---|:---|:---:|:---:|:---:|:---:|
| **R1** | `FEAT-01` | Curriculum Structure & 30-Day Navigation | 5 tests | 5 tests | Pairwise | Scenario 1 |
| **R1** | `FEAT-02` | Chart of Accounts Search & TT 133/200 Filtering | 5 tests | 5 tests | Pairwise | Scenario 4 |
| **R2** | `FEAT-03` | Assessment Grading & >=70% Gating State Machine | 5 tests | 5 tests | Pairwise | Scenario 1 |
| **R3** | `FEAT-04` | Live Debit=Credit Journalizer & Balance Validator | 5 tests | 5 tests | Pairwise | Scenario 2 |
| **R3** | `FEAT-05` | Voucher Inspection & >=20M VND Non-Cash Rule | 5 tests | 5 tests | Pairwise | Scenario 3 |
| **R4** | `FEAT-06` | Storage Adapter & JSON Backup/Restore Persistence | 5 tests | 5 tests | Pairwise | Scenario 5 |
| **R5** | `FEAT-07` | UI Shell, Theme Toggle & System Stability | 5 tests | 5 tests | Pairwise | Integration |

---

## 4. Detailed Tier Specifications

### Tier 1: Feature Coverage (>=5 Isolated Tests per Feature)
- **FEAT-01 (Curriculum)**:
  1. Validates exactly 30 days present across 10 modules (3 days per module).
  2. Validates milestone test days occur on Days 3, 6, 9, 12, 15, 18, 21, 24, 27, 30.
  3. Verifies each day has 3–5 interacting concepts calibrated to 15–20 minute load.
  4. Verifies module titles and pedagogical descriptions adhere to curriculum syllabus.
  5. Verifies initial unlocked state starts with Day 1 unlocked and subsequent modules locked.
- **FEAT-02 (Chart of Accounts)**:
  1. Verifies Circular 200 contains all standard 9 account classes (TK 111 through TK 911).
  2. Verifies Circular 133 filters out prohibited accounts (621, 622, 623, 627, 641, 521, 413).
  3. Verifies searching by code (e.g. "112") returns exact and sub-account matches.
  4. Verifies searching by name (e.g. "tiền gửi ngân hàng") returns relevant matches.
  5. Verifies prohibited account check provides statutory basis and correct substitute recommendation.
- **FEAT-03 (Assessment & Gating)**:
  1. Verifies 10-item questionnaire structure per milestone assessment.
  2. Verifies score calculation generates 0–100 scale accurately.
  3. Verifies score >= 70% sets `passed: true` and unlocks next 3-day module.
  4. Verifies score < 70% sets `passed: false` and maintains gate lock.
  5. Verifies Rule of One diagnostic engine emits exactly 1 priority error focus and 1 actionable step.
- **FEAT-04 (Live Journalizer)**:
  1. Verifies balanced two-sided entry ($\text{Debit} = \text{Credit}$) produces `isBalanced: true` and `delta: 0`.
  2. Verifies complex compound entry (e.g. 1 Debit - 2 Credits) calculates correct equality.
  3. Verifies unbalanced entry produces `isBalanced: false` and nonzero delta.
  4. Verifies formatting of currency values in Vietnamese Dong (VND).
  5. Verifies normal balance classification (Assets debit, Liabilities credit, Revenue/Expense clearing).
- **FEAT-05 (Voucher Inspection)**:
  1. Verifies Decree 123 e-invoice pattern validation (6-character symbol `C26TAA`, 8-digit number).
  2. Verifies tax authority code (MCCQT) validation for 'C' type invoices.
  3. Verifies detection of cash payment on invoice >= 20,000,000 VND as non-compliant.
  4. Verifies detection of suspended/inactive vendor tax code status (Status 03 and 04).
  5. Verifies standard internal voucher signature requirements across roles.
- **FEAT-06 (Persistence Layer)**:
  1. Verifies LocalStorage adapter reads, writes, and deletes keys.
  2. Verifies IndexedDB / InMemory fallback store persists learner progress.
  3. Verifies export backup produces valid JSON payload with schema metadata.
  4. Verifies import backup validates schema and restores progress state.
  5. Verifies streak tracking increments on active days and calculates continuity.
- **FEAT-07 (UI Shell & Theme)**:
  1. Verifies theme switcher switches between 'light', 'dark', and 'system'.
  2. Verifies theme preference persists in storage adapter.
  3. Verifies category metadata colors and Vietnamese labels across all 9 classes.
  4. Verifies application bootstrapping without runtime crashes.
  5. Verifies responsive navigation route definitions across views.

### Tier 2: Boundary & Corner Cases (>=5 Tests per Feature)
- **FEAT-01**: Day 0, Day 31, negative days, empty lesson titles, navigating past highest unlocked day.
- **FEAT-02**: Empty search string, regex special chars (`.*+?^${}()|[]\`), leading/trailing whitespaces, diacritic-insensitive Vietnamese matching, uppercase vs lowercase code inputs.
- **FEAT-03**: Score boundary exactly 69% (fails) vs 70% (passes), 0% all incorrect, 100% all correct, retake where new score is lower than previous best (preserves best while appending attempt history), all options unselected.
- **FEAT-04**: Single-row journal entry (unbalanced), negative amounts, zero amounts, delta of exactly 1 VND, extreme values (100,000,000,000 VND precision without floating point corruption).
- **FEAT-05**: Payment amount exactly 19,999,999 VND (valid cash) vs 20,000,000 VND (bank transfer mandatory), multiple invoices same day from same vendor aggregating to >= 20M, VAT calculation rounding on 8% and 10%, missing signers.
- **FEAT-06**: Malformed JSON backup import (syntax error), empty string import, backup missing optional fields, storage quota exceeded handling, streak resets when inactive for > 48 hours.
- **FEAT-07**: Invalid theme string fallback to 'system', rapid multi-toggle state stability, HTML class attribute injection safety, SSR hydration mock safety, null storage handling.

### Tier 3: Cross-Feature Combinations (Pairwise & Multi-Feature)
1. **Gating + Retake + Persistence**: Learner fails Day 3 quiz at 60% (Day 4 locked), retakes and scores 80% (Day 4 unlocked), browser simulated reload -> Day 4 remains unlocked and score history shows both attempts.
2. **Journalizer + T-Account Live Preview**: Posting a balanced entry (`Nợ 156: 10M / Có 111: 10M`) updates corresponding T-accounts: TK 156 debit side increases by 10M, TK 111 credit side increases by 10M, ending balances update accurately.
3. **Regime Switch + Prohibited Account Entry Validation**: User switches regime from Circular 200 to Circular 133 while editing a transaction containing TK 621; system immediately flags TK 621 with an inline warning and provides rerouting to TK 154.
4. **Voucher Inspection + Journalizing Generation**: Learner completes voucher audit for an approved purchase invoice and transitions directly into the journalizer with pre-filled line items.
5. **Backup/Restore + Gating State Synchronization**: Full progress state at Day 12 exported; local storage completely purged; backup re-imported; gating engine immediately verifies Days 1–12 unlocked, Milestone tests 1–4 passed, and Day 13 available.
6. **Assessment Submission + Rule of One + Streak Calculation**: Submitting an assessment updates learner streak, classifies proficiency tier, and isolates exactly 1 misconception without altering other module states.

### Tier 4: Real-World Application Scenarios (5 End-to-End Workflows)
- **Scenario 1: Novice 3-Day Journey & Gating Unlock**:
  Learner navigates Day 1 (Accounting Equation), Day 2 (Assets vs Equity), Day 3 (Double-Entry principles) -> Initiates Milestone Assessment 1 -> Answers DOK 1–3 items achieving 80% -> Gating unlocks Day 4 -> Day 4 curriculum content is accessible -> Day 7 remains locked.
- **Scenario 2: E-Invoice Inventory Procurement $\ge$ 20M VND**:
  Learner inspects an authentic Decree 123 VAT e-invoice (50,000,000 VND + 10% VAT = 55,000,000 VND) -> Verifies non-cash rule compliance via Bank Transfer Order (UNC) -> Enters journalizer: Nợ 156 (50M), Nợ 1331 (5M) / Có 1121 (55M) -> Verifies mathematical balance and posts entry.
- **Scenario 3: Voucher Audit Detecting Suspended Supplier (Status 03)**:
  Learner audits an incoming invoice where supplier Tax Code status is '03' (Ngừng hoạt động nhưng chưa hoàn thành thủ tục đóng MST) -> System rejects input VAT deduction under Circular 219 and flags deductible CIT expense exclusion (Chỉ tiêu B4) under Decree 125/2020.
- **Scenario 4: Circular 133 Manufacturing Cost Rerouting**:
  In Circular 133 mode, learner attempts to journalize factory raw materials using prohibited TK 621 -> Platform blocks submission, displays Article 58 Circular 133 explanation, suggests Nợ TK 154 (chi tiết NVL) -> Learner corrects to TK 154 -> System accepts and confirms balanced journal entry.
- **Scenario 5: Complete Progress Export & Disaster Recovery**:
  Learner completes multiple modules with milestone scores, streaks, and custom settings -> Triggers JSON export -> Clears all local storage and IndexedDB -> Imports the JSON backup -> Platform verifies 100% state restoration, streak preservation, and unlocks all previously earned days.

---

## 5. Pass/Fail Execution Semantics

- **Passing Criterion**: 100% of test cases in all 4 tiers must pass without a single failure or unhandled exception (`exit code 0`).
- **Execution Script**:
  ```bash
  cd D:/myproject/vietnam-accounting-learning-web
  npm test
  ```
- **Audit Requirement**: The `teamwork_preview_auditor` independently runs the test suite to certify zero false mocks and verified contract fulfillment.
