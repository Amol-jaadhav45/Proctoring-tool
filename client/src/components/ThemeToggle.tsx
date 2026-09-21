import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white/70 dark:bg-slate-800/70 dark:border-slate-700 text-gray-700 dark:text-gray-100 shadow-sm hover:shadow transition"
        >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-sm font-medium">{isDark ? 'Light' : 'Dark'}</span>
        </button>
    );
};


