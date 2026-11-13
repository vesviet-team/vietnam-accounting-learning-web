import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { COA_CIRCULAR_58, CIRCULAR_58_KEY_HIGHLIGHTS } from '@/data/coa-circular-58';
import { getAccountsByRegime, findAccountByCode } from '@/data/coa-service';
import { SettingsView } from '@/components/settings/SettingsView';

describe('Circular 58/2026/TT-BTC — Micro-enterprise (DN siêu nhỏ) accounting regime', () => {
  it('exports COA_CIRCULAR_58 minimal conversion dataset with highlights', () => {
    // TT 58/2026 bãi bỏ hệ thống tài khoản — dataset là bộ đối chiếu chuyển đổi tối giản
    expect(COA_CIRCULAR_58.length).toBeGreaterThanOrEqual(12);
    expect(CIRCULAR_58_KEY_HIGHLIGHTS.length).toBeGreaterThanOrEqual(4);

    // Mọi entry đều gắn regime CIRCULAR_58 và có cấp 1
    for (const account of COA_CIRCULAR_58) {
      expect(account.regimes).toContain('CIRCULAR_58');
    }

    // Các đối tượng theo dõi cốt lõi của DN siêu nhỏ
    const codes = new Set(COA_CIRCULAR_58.map((a) => a.code));
    for (const required of ['111', '131', '152', '211', '331', '333', '411', '511', '632', '911']) {
      expect(codes.has(required)).toBe(true);
    }

    // TT 58 không có hệ thống TK sản xuất tập hợp 621/622/627 như TT 200
    expect(codes.has('621')).toBe(false);
    expect(codes.has('622')).toBe(false);
    expect(codes.has('627')).toBe(false);
  });

  it('routes CIRCULAR_58 regime through coa-service (getAccountsByRegime & findAccountByCode)', () => {
    const accounts = getAccountsByRegime('CIRCULAR_58');
    expect(accounts.length).toBe(COA_CIRCULAR_58.length);
    expect(accounts).toEqual(COA_CIRCULAR_58);

    const tk511 = findAccountByCode('511', 'CIRCULAR_58');
    expect(tk511).toBeDefined();
    expect(tk511?.regimes).toContain('CIRCULAR_58');
    expect(tk511?.nameVi).toContain('Doanh thu');

    // Mã không có trong dataset TT 58
    expect(findAccountByCode('621', 'CIRCULAR_58')).toBeUndefined();

    // Routing không rò rỉ sang regime khác
    expect(getAccountsByRegime('CIRCULAR_133')).not.toEqual(COA_CIRCULAR_58);
  });

  it('renders 4 regime cards in SettingsView and selects CIRCULAR_58 on click', () => {
    const onRegimeChange = vi.fn();
    render(<SettingsView currentRegime="CIRCULAR_200" onRegimeChange={onRegimeChange} />);

    // 4 card regime: TT 200, TT 133, TT 99/2025, TT 58/2026
    expect(screen.getByText('Thông tư 200/2014/TT-BTC')).toBeInTheDocument();
    expect(screen.getByText('Thông tư 133/2016/TT-BTC')).toBeInTheDocument();
    expect(screen.getByText('Thông tư 99/2025/TT-BTC (Mới)')).toBeInTheDocument();
    const tt58Card = screen.getByText('Thông tư 58/2026/TT-BTC (Mới)');
    expect(tt58Card).toBeInTheDocument();

    // Mô tả DN siêu nhỏ & hiệu lực
    expect(screen.getByText(/TT 58\/2026 — DN siêu nhỏ, hiệu lực 01\/07\/2026/)).toBeInTheDocument();

    fireEvent.click(tt58Card);
    expect(onRegimeChange).toHaveBeenCalledWith('CIRCULAR_58');
  });
});
