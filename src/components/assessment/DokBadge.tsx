import type { FC } from 'react';
import { DokLevel } from '@/types/assessment';
import { DOK_POINT_MAP } from '@/engine/grading-engine';
import { BookOpen, Calculator, SearchCheck } from 'lucide-react';

interface DokBadgeProps {
  dokLevel: DokLevel;
  showPoints?: boolean;
  className?: string;
}

export const DokBadge: FC<DokBadgeProps> = ({
  dokLevel,
  showPoints = true,
  className = '',
}) => {
  const points = DOK_POINT_MAP[dokLevel];

  switch (dokLevel) {
    case 'DOK_1':
      return (
        <span
          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 ${className}`}
          title="Cấp độ 1: Tái hiện & Nhận diện Khái niệm (32% tổng điểm)"
        >
          <BookOpen className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>DOK 1 • Nhận diện</span>
          {showPoints && <span className="opacity-80 font-bold">({points}đ)</span>}
        </span>
      );
    case 'DOK_2':
      return (
        <span
          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 ${className}`}
          title="Cấp độ 2: Kỹ năng Thực hành & Định khoản (40% tổng điểm)"
        >
          <Calculator className="w-3 h-3 text-sky-600 dark:text-sky-400" />
          <span>DOK 2 • Định khoản</span>
          {showPoints && <span className="opacity-80 font-bold">({points}đ)</span>}
        </span>
      );
    case 'DOK_3':
      return (
        <span
          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 ${className}`}
          title="Cấp độ 3: Tư duy Chiến lược & Soát xét Chứng từ (28% tổng điểm)"
        >
          <SearchCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
          <span>DOK 3 • Soát xét & Chiến lược</span>
          {showPoints && <span className="opacity-80 font-bold">({points}đ)</span>}
        </span>
      );
    default:
      return null;
  }
};
