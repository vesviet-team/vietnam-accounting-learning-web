import type { FC } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export const ThemeToggle: FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
      <button
        type="button"
        title="Giao diện sáng"
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-md transition-colors ${
          theme === 'light'
            ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Giao diện tối"
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-md transition-colors ${
          theme === 'dark'
            ? 'bg-white dark:bg-slate-700 text-indigo-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Moon className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Theo hệ thống"
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-md transition-colors ${
          theme === 'system'
            ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Laptop className="w-4 h-4" />
      </button>
    </div>
  );
};
