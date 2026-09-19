import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VoucherInspector } from '@/components/workbench/VoucherInspector';

describe('VOUCHER INSPECTION ROOM UNIT TESTS', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. Component Rendering & Challenge Navigation', () => {
    it('should render the Voucher Inspector header and checklist', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      expect(
        screen.getByText(/Phòng Kiểm Tra & Soát Xét Chứng Từ Kế Toán/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Bảng Kiểm Tra Soát Xét \(Audit Checklist\)/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Chế độ: Thông tư 200/i)
      ).toBeInTheDocument();
    });

    it('should display all voucher audit cases in the selector', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      expect(
        screen.getByText(/Hóa đơn Mua Văn phòng phẩm 15 Triệu/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Hóa đơn Điện Máy Đúng 20 Triệu/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Hóa đơn Mua Hàng từ Doanh nghiệp Đang Tạm Ngừng/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Hóa đơn Phát sinh từ Doanh nghiệp Bỏ Địa chỉ/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Hóa đơn Sai lệch Số học/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Phiếu Chi Tiền Mặt 5 Triệu Thiếu Chữ Ký/i)
      ).toBeInTheDocument();
    });

    it('should switch between cases and update document preview', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Switch to Case 6 (Phiếu chi thiếu chữ ký Giám đốc)
      const case6Btn = screen.getByText(/Phiếu Chi Tiền Mặt 5 Triệu Thiếu Chữ Ký/i);
      fireEvent.click(case6Btn);

      expect(screen.getByText('PHIẾU CHI TIỀN MẶT')).toBeInTheDocument();
      expect(screen.getByText('✗ THIẾU CHỮ KÝ')).toBeInTheDocument();
    });
  });

  describe('2. Audit Scenarios & Statutory Scoring', () => {
    it('should evaluate valid invoice below 20M paid in cash as 100% compliant', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Case 1 is selected by default (15M paid in cash, valid)
      // Check overall conclusion: VALID
      const validBtn = screen.getByRole('button', { name: /Chứng từ HỢP LỆ/i });
      fireEvent.click(validBtn);

      // Submit audit
      const submitBtn = screen.getByRole('button', {
        name: /Chấm Điểm & Xem Giải Trình Pháp Lý/i,
      });
      fireEvent.click(submitBtn);

      // Score should be 100/100
      expect(screen.getByText(/100\/100 ĐIỂM/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Chính xác tuyệt đối.*Chứng từ này hoàn toàn hợp lệ/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Được khấu trừ toàn bộ/i)
      ).toBeInTheDocument();
    });

    it('should detect cash payment >= 20M breach and report statutory disallowance', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Switch to Case 2 (20M paid in cash)
      const case2Btn = screen.getByText(/Hóa đơn Điện Máy Đúng 20 Triệu/i);
      fireEvent.click(case2Btn);

      // Flag non-cash rule breach
      const nonCashCheckbox = screen.getByLabelText(
        /Vi phạm quy tắc thanh toán không dùng tiền mặt/i
      );
      fireEvent.click(nonCashCheckbox);

      // Conclude INVALID
      const invalidBtn = screen.getByRole('button', { name: /CÓ SAI PHẠM/i });
      fireEvent.click(invalidBtn);

      // Submit audit
      const submitBtn = screen.getByRole('button', {
        name: /Chấm Điểm & Xem Giải Trình Pháp Lý/i,
      });
      fireEvent.click(submitBtn);

      // Perfect score
      expect(screen.getByText(/100\/100 ĐIỂM/i)).toBeInTheDocument();
      expect(screen.getByText(/Điều 15 Thông tư 219\/2013\/TT-BTC/i)).toBeInTheDocument();
      expect(screen.getByText(/BỊ LOẠI TOÀN BỘ 1\.481\.481 VNĐ thuế GTGT/i)).toBeInTheDocument();
    });

    it('should detect suspended supplier tax code (Status 03)', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Switch to Case 3 (Status 03)
      const case3Btn = screen.getByText(/Hóa đơn Mua Hàng từ Doanh nghiệp Đang Tạm Ngừng/i);
      fireEvent.click(case3Btn);

      // Flag tax code issue
      const taxCodeCheckbox = screen.getByLabelText(
        /Rủi ro Mã số thuế người bán \(Status 03\/04\)/i
      );
      fireEvent.click(taxCodeCheckbox);

      // Conclude INVALID
      fireEvent.click(screen.getByRole('button', { name: /CÓ SAI PHẠM/i }));

      // Submit
      fireEvent.click(
        screen.getByRole('button', { name: /Chấm Điểm & Xem Giải Trình Pháp Lý/i })
      );

      expect(screen.getByText(/100\/100 ĐIỂM/i)).toBeInTheDocument();
      expect(screen.getByText(/Nghị định 125\/2020\/NĐ-CP/i)).toBeInTheDocument();
    });

    it('should detect runaway supplier tax code (Status 04)', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Switch to Case 4 (Status 04)
      const case4Btn = screen.getByText(/Hóa đơn Phát sinh từ Doanh nghiệp Bỏ Địa chỉ/i);
      fireEvent.click(case4Btn);

      // Flag tax code issue
      fireEvent.click(
        screen.getByLabelText(/Rủi ro Mã số thuế người bán \(Status 03\/04\)/i)
      );
      fireEvent.click(screen.getByRole('button', { name: /CÓ SAI PHẠM/i }));

      fireEvent.click(
        screen.getByRole('button', { name: /Chấm Điểm & Xem Giải Trình Pháp Lý/i })
      );

      expect(screen.getByText(/100\/100 ĐIỂM/i)).toBeInTheDocument();
      expect(screen.getByText(/Công văn số 11797\/BTC-TCT/i)).toBeInTheDocument();
    });

    it('should detect arithmetic discrepancy in invoice totals', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Switch to Case 5 (Arithmetic error)
      const case5Btn = screen.getByText(/Hóa đơn Sai lệch Số học/i);
      fireEvent.click(case5Btn);

      // Flag arithmetic
      fireEvent.click(screen.getByLabelText(/Sai lệch số học trên hóa đơn/i));
      fireEvent.click(screen.getByRole('button', { name: /CÓ SAI PHẠM/i }));

      fireEvent.click(
        screen.getByRole('button', { name: /Chấm Điểm & Xem Giải Trình Pháp Lý/i })
      );

      expect(screen.getByText(/100\/100 ĐIỂM/i)).toBeInTheDocument();
      expect(screen.getByText(/Điều 10 Nghị định 123\/2020\/NĐ-CP/i)).toBeInTheDocument();
    });

    it('should detect missing mandatory signatures on internal payment voucher', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Switch to Case 6 (Missing Director signature)
      const case6Btn = screen.getByText(/Phiếu Chi Tiền Mặt 5 Triệu Thiếu Chữ Ký/i);
      fireEvent.click(case6Btn);

      // Flag missing signature
      fireEvent.click(screen.getByLabelText(/Thiếu chữ ký thẩm quyền bắt buộc/i));
      fireEvent.click(screen.getByRole('button', { name: /CÓ SAI PHẠM/i }));

      fireEvent.click(
        screen.getByRole('button', { name: /Chấm Điểm & Xem Giải Trình Pháp Lý/i })
      );

      expect(screen.getByText(/100\/100 ĐIỂM/i)).toBeInTheDocument();
      expect(screen.getByText(/Điều 19 Luật Kế toán số 88\/2015\/QH13/i)).toBeInTheDocument();
    });
  });

  describe('3. Tax Portal Simulation Modal', () => {
    it('should open GDT tax portal modal and display supplier status', () => {
      render(<VoucherInspector currentRegime="CIRCULAR_200" />);

      // Switch to Case 3 (Status 03)
      const case3Btn = screen.getByText(/Hóa đơn Mua Hàng từ Doanh nghiệp Đang Tạm Ngừng/i);
      fireEvent.click(case3Btn);

      // Click "Tra cứu MST" button
      const lookupBtn = screen.getByRole('button', { name: /Tra cứu MST/i });
      fireEvent.click(lookupBtn);

      // Modal appears
      expect(
        screen.getByText(/Cổng Thông Tin Tổng Cục Thuế — Tra Cứu Người Nộp Thuế/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Trạng Thái 03: NNT Tạm ngừng kinh doanh có thời hạn/i)
      ).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByRole('button', { name: /Đóng tra cứu/i });
      fireEvent.click(closeBtn);

      expect(
        screen.queryByText(/Cổng Thông Tin Tổng Cục Thuế/i)
      ).not.toBeInTheDocument();
    });
  });
});
