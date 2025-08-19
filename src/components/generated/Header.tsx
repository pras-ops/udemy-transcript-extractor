import React from 'react';
import { FileText, Sun, Moon } from 'lucide-react';
interface HeaderProps {
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

// @component: Header
export const Header = ({
  isDarkMode,
  onThemeToggle
}: HeaderProps) => {
  // @return
  return <header className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            <span>Transcript Extractor</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span>Privacy-first transcript tool</span>
          </p>
        </div>
      </div>
      
      <button onClick={onThemeToggle} className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500" aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
        {isDarkMode ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-gray-600" />}
      </button>
    </header>;
};