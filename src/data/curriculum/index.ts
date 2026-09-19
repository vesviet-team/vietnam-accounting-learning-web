import { DailyLesson } from '@/types/curriculum';
import { MODULE_1_LESSONS } from './module-01';
import { MODULE_2_LESSONS } from './module-02';
import { MODULE_3_LESSONS } from './module-03';
import { MODULE_4_LESSONS } from './module-04';
import { MODULE_5_LESSONS } from './module-05';
import { MODULE_6_LESSONS } from './module-06';
import { MODULE_7_LESSONS } from './module-07';
import { MODULE_8_LESSONS } from './module-08';
import { MODULE_9_LESSONS } from './module-09';
import { MODULE_10_LESSONS } from './module-10';

export interface ModuleMetadata {
  moduleNumber: number;
  titleVi: string;
  subtitleVi: string;
  days: [number, number, number];
  milestoneDay: number;
  colorClass: string;
}

export const MODULE_METADATA: ModuleMetadata[] = [
  {
    moduleNumber: 1,
    titleVi: 'Bản Chất Kế Toán & Cơ Chế Ghi Sổ Kép',
    subtitleVi: 'Nền tảng phương trình kế toán, phân tích giao dịch và chứng từ gốc',
    days: [1, 2, 3],
    milestoneDay: 3,
    colorClass: 'emerald',
  },
  {
    moduleNumber: 2,
    titleVi: 'Tiền Mặt, Tiền Gửi & Nghiệp Vụ Ngoại Tệ',
    subtitleVi: 'Kế toán quỹ tiền mặt (111), tiền gửi ngân hàng (112) và tỷ giá hối đoái',
    days: [4, 5, 6],
    milestoneDay: 6,
    colorClass: 'blue',
  },
  {
    moduleNumber: 3,
    titleVi: 'Mua Hàng, Tồn Kho & Quy Tắc Thanh Toán Không Tiền Mặt',
    subtitleVi: 'Kế toán công nợ 331, luật thanh toán >= 20M VND và đối soát 3 bên',
    days: [7, 8, 9],
    milestoneDay: 9,
    colorClass: 'amber',
  },
  {
    moduleNumber: 4,
    titleVi: 'Tài Sản Cố Định, Khấu Hao & Quy Định Xe Ô Tô 1.6 Tỷ',
    subtitleVi: 'Tiêu chuẩn ghi nhận TSCĐ, khấu hao đường thẳng TK 214 và trần thuế xe ô tô',
    days: [10, 11, 12],
    milestoneDay: 12,
    colorClass: 'indigo',
  },
  {
    moduleNumber: 5,
    titleVi: 'Kế Toán Tiền Lương & Các Khoản Trích Theo Lương',
    subtitleVi: 'Bảng lương TK 334, tỷ lệ bảo hiểm 34% (TK 338) và khấu trừ thuế TNCN (3335)',
    days: [13, 14, 15],
    milestoneDay: 15,
    colorClass: 'violet',
  },
  {
    moduleNumber: 6,
    titleVi: 'Doanh Thu Bán Hàng, Hóa Đơn NĐ 123 & Các Khoản Giảm Trừ',
    subtitleVi: 'VAS 14 điều kiện doanh thu, cặp bút toán 511/632, TK 131 và HĐĐT NĐ 123',
    days: [16, 17, 18],
    milestoneDay: 18,
    colorClass: 'cyan',
  },
  {
    moduleNumber: 7,
    titleVi: 'Kế Toán Chi Phí Sản Xuất & Tính Giá Thành (TT 200 vs 133)',
    subtitleVi: 'Tập hợp chi phí theo TT 200 vs TT 133, đánh giá dở dang và tính giá thành (155)',
    days: [19, 20, 21],
    milestoneDay: 21,
    colorClass: 'teal',
  },
  {
    moduleNumber: 8,
    titleVi: 'Chi Phí Hoạt Động, Phân Bổ TK 242 & Chi Phí Tài Chính',
    subtitleVi: 'Chi phí bán hàng/quản lý (641/642), trần phân bổ 36 tháng TK 242 và NĐ 132',
    days: [22, 23, 24],
    milestoneDay: 24,
    colorClass: 'rose',
  },
  {
    moduleNumber: 9,
    titleVi: 'Bút Toán Khóa Sổ & Xác Định Kết Quả Kinh Doanh (TK 911)',
    subtitleVi: 'Trình tự khóa sổ, kỹ thuật kết chuyển TK 911 sạch số dư và tính thuế TNDN',
    days: [25, 26, 27],
    milestoneDay: 27,
    colorClass: 'orange',
  },
  {
    moduleNumber: 10,
    titleVi: 'Lập Bộ Báo Cáo Tài Chính & Tổng Duyệt Chu Trình Kế Toán',
    subtitleVi: 'Bảng Cân đối kế toán (B01), KQKD (B02), LCTT (B03) và Thuyết minh BCTC (B09)',
    days: [28, 29, 30],
    milestoneDay: 30,
    colorClass: 'emerald',
  },
];

export const ALL_CURRICULUM_LESSONS: DailyLesson[] = [
  ...MODULE_1_LESSONS,
  ...MODULE_2_LESSONS,
  ...MODULE_3_LESSONS,
  ...MODULE_4_LESSONS,
  ...MODULE_5_LESSONS,
  ...MODULE_6_LESSONS,
  ...MODULE_7_LESSONS,
  ...MODULE_8_LESSONS,
  ...MODULE_9_LESSONS,
  ...MODULE_10_LESSONS,
];

export function getAllLessons(): DailyLesson[] {
  return ALL_CURRICULUM_LESSONS;
}

export function getLessonByDay(day: number): DailyLesson | undefined {
  return ALL_CURRICULUM_LESSONS.find((l) => l.day === day);
}

export function getLessonsByModule(moduleNumber: number): DailyLesson[] {
  return ALL_CURRICULUM_LESSONS.filter((l) => l.moduleNumber === moduleNumber);
}

export function getModuleMetadata(moduleNumber: number): ModuleMetadata | undefined {
  return MODULE_METADATA.find((m) => m.moduleNumber === moduleNumber);
}
