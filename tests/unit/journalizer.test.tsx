import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Journalizer } from '@/components/workbench/Journalizer';

describe('INTERACTIVE JOURNALIZER WORKBENCH UNIT TESTS', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. Component Rendering & Pre-loaded Scenarios', () => {
    it('should render the Journalizer workbench header and balance banner', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      expect(screen.getByText(/Bàn Định Khoản Kế Toán Trực Quan/i)).toBeInTheDocument();
      expect(screen.getByText(/Thực Hành Định Khoản Đa Dòng/i)).toBeInTheDocument();
      expect(screen.getByText(/Đang áp dụng: Thông tư 200/i)).toBeInTheDocument();
    });

    it('should render all pre-loaded practice scenarios in the selector', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      expect(screen.getAllByText(/Rút tiền gửi ngân hàng về nhập quỹ tiền mặt/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Mua nguyên vật liệu nhập kho chưa trả tiền người bán/i)).toBeInTheDocument();
      expect(screen.getByText(/Xuất bán hàng hóa thu tiền ngay qua chuyển khoản/i)).toBeInTheDocument();
      expect(screen.getByText(/Chi tiền mặt tạm ứng công tác phí cho nhân viên/i)).toBeInTheDocument();
      expect(screen.getByText(/Chi phí bán hàng \/ quảng cáo/i)).toBeInTheDocument();
    });

    it('should switch scenario and populate rows accordingly', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      // Switch to scenario 2 (Mua nguyên vật liệu nhập kho)
      const scen2Btn = screen.getByText(/Mua nguyên vật liệu nhập kho chưa trả tiền người bán/i);
      fireEvent.click(scen2Btn);

      expect(screen.getByDisplayValue('152')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1331')).toBeInTheDocument();
      expect(screen.getByDisplayValue('331')).toBeInTheDocument();
    });
  });

  describe('2. Dynamic Multi-Row Operations', () => {
    it('should add a new empty row when "Thêm dòng" is clicked', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      const initialInputs = screen.getAllByPlaceholderText('Mã TK');
      const initialCount = initialInputs.length;

      const addBtn = screen.getByRole('button', { name: /Thêm dòng/i });
      fireEvent.click(addBtn);

      const updatedInputs = screen.getAllByPlaceholderText('Mã TK');
      expect(updatedInputs.length).toBe(initialCount + 1);
    });

    it('should remove a row when trash button is clicked, but stop at minimum 2 rows', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      // Scenario 1 starts with 2 rows: trash buttons should be disabled
      const deleteButtons = screen.getAllByTitle('Xóa dòng định khoản');
      expect(deleteButtons).toHaveLength(2);
      expect(deleteButtons[0]).toBeDisabled();
      expect(deleteButtons[1]).toBeDisabled();

      // Add 1 row -> 3 rows total
      fireEvent.click(screen.getByRole('button', { name: /Thêm dòng/i }));
      const activeDeleteButtons = screen.getAllByTitle('Xóa dòng định khoản');
      expect(activeDeleteButtons).toHaveLength(3);
      expect(activeDeleteButtons[0]).not.toBeDisabled();

      // Click delete on third row
      fireEvent.click(activeDeleteButtons[2]);
      expect(screen.getAllByPlaceholderText('Mã TK')).toHaveLength(2);
    });

    it('should reset to blank rows when "Làm mới" is clicked', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      const resetBtn = screen.getByTitle('Đặt lại bảng trắng');
      fireEvent.click(resetBtn);

      const codeInputs = screen.getAllByPlaceholderText('Mã TK') as HTMLInputElement[];
      expect(codeInputs).toHaveLength(2);
      expect(codeInputs[0].value).toBe('');
      expect(codeInputs[1].value).toBe('');
    });
  });

  describe('3. Searchable Account Picker & Prohibited Accounts Safeguard', () => {
    it('should open account picker and select an account', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      const bookButtons = screen.getAllByTitle('Tra cứu danh mục tài khoản');
      fireEvent.click(bookButtons[0]);

      // Search input appears in popover
      const searchInput = screen.getByPlaceholderText(/Gõ mã số hoặc tên tài khoản/i);
      expect(searchInput).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: '1111' } });

      // Click the account option
      const accountOption = screen.getByRole('button', { name: /1111/i });
      fireEvent.click(accountOption);

      const codeInputs = screen.getAllByPlaceholderText('Mã TK') as HTMLInputElement[];
      expect(codeInputs[0].value).toBe('1111');
    });

    it('should trigger prohibited account warning in Circular 133 mode when using TK 641', () => {
      render(<Journalizer currentRegime="CIRCULAR_133" />);

      // Select Scenario 5 (which uses TK 641)
      const scen5Btn = screen.getByText(/Chi phí bán hàng \/ quảng cáo/i);
      fireEvent.click(scen5Btn);

      // Warning text should be visible
      expect(
        screen.getByText(/Tài khoản 641 bị cấm trong Thông tư 133!/i)
      ).toBeInTheDocument();

      // Post button should be disabled
      const postBtn = screen.getByRole('button', { name: /Ghi Sổ/i });
      expect(postBtn).toBeDisabled();

      // Substitute button should be provided
      const substituteBtn = screen.getByRole('button', { name: /Đổi sang TK 6421/i });
      expect(substituteBtn).toBeInTheDocument();

      // Click substitute button
      fireEvent.click(substituteBtn);

      // Row should now have TK 6421
      const codeInputs = screen.getAllByPlaceholderText('Mã TK') as HTMLInputElement[];
      expect(codeInputs[0].value).toBe('6421');

      // Warning should disappear and posting should become enabled
      expect(
        screen.queryByText(/Tài khoản 641 bị cấm trong Thông tư 133!/i)
      ).not.toBeInTheDocument();
      expect(postBtn).not.toBeDisabled();
    });
  });

  describe('4. Real-time Balance Validation & Posting to Ledger', () => {
    it('should validate balanced entries and display green badge', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      // Scenario 1 is already balanced (50M Debit == 50M Credit)
      expect(screen.getByText(/Bút toán đã CÂN ĐỐI/i)).toBeInTheDocument();

      const postBtn = screen.getByRole('button', { name: /Ghi Sổ/i });
      expect(postBtn).not.toBeDisabled();
    });

    it('should detect unbalanced entries and display delta warning', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      // Change Debit amount of row 1 from 50M to 30M
      const debitInputs = screen.getAllByPlaceholderText('0') as HTMLInputElement[];
      // Debit of row 1 is the first input with value 50000000
      const row1Debit = debitInputs.find((i) => i.value === '50000000')!;
      fireEvent.change(row1Debit, { target: { value: '30000000' } });

      expect(screen.getAllByText(/Bút toán CHƯA CÂN ĐỐI/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Lệch: 20\.000\.000/i)).toBeInTheDocument();

      const postBtn = screen.getByRole('button', { name: /Ghi Sổ/i });
      expect(postBtn).toBeDisabled();
    });

    it('should prevent simultaneous Debit and Credit on the same row', () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      // Find the row 1 Credit input (which currently has value '')
      const inputs = screen.getAllByPlaceholderText('0') as HTMLInputElement[];
      const row1Debit = inputs[0];
      const row1Credit = inputs[1];

      expect(row1Debit.value).toBe('50000000');
      expect(row1Credit.value).toBe('');

      // Entering Credit on row 1 should automatically clear Debit
      fireEvent.change(row1Credit, { target: { value: '25000000' } });
      expect(row1Credit.value).toBe('25000000');
      expect(row1Debit.value).toBe('');
    });

    it('should successfully post to ledger and display live T-Account previews', async () => {
      render(<Journalizer currentRegime="CIRCULAR_200" />);

      const postBtn = screen.getByRole('button', { name: /Ghi Sổ/i });
      expect(postBtn).not.toBeDisabled();

      fireEvent.click(postBtn);

      // Verify success message
      expect(
        screen.getByText(/Ghi sổ thành công! Đã ghi nhận bút toán/i)
      ).toBeInTheDocument();

      // Verify General Journal history section appears
      expect(
        screen.getByText(/Sổ Nhật Ký Chung \(Lịch Sử Các Bút Toán Đã Ghi Sổ\)/i)
      ).toBeInTheDocument();

      // Verify T-Accounts section appears for affected accounts (TK 1111 and TK 1121)
      expect(
        screen.getByText(/Sơ Đồ Chữ T Của Các Tài Khoản Đã Ghi Sổ/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/2 tài khoản có phát sinh/i)).toBeInTheDocument();
    });
  });
});
