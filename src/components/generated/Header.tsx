import { SortableContainer } from "@/dnd-kit/SortableContainer";
import React from 'react';
import { FileText, Sun, Moon } from 'lucide-react';
interface HeaderProps {
  isDarkMode: boolean;
  onThemeToggle: () => void;
  mpid?: string;
}

// @component: Header
export const Header = ({
  isDarkMode,
  onThemeToggle
}: HeaderProps) => {
  // @return
  return <SortableContainer dndKitId="b281e449-a7fe-4143-a5b9-77cf7a247ae6" containerType="regular" prevTag="header" className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600" data-magicpath-id="0" data-magicpath-path="Header.tsx">
      <SortableContainer dndKitId="24421847-c47f-4f80-b772-ccecee421248" containerType="regular" prevTag="div" className="flex items-center space-x-3" data-magicpath-id="1" data-magicpath-path="Header.tsx">
        <SortableContainer dndKitId="ca5f2625-38c9-4219-b44c-4db1c90b9593" containerType="regular" prevTag="div" className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm" data-magicpath-id="2" data-magicpath-path="Header.tsx">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" data-magicpath-id="3" data-magicpath-path="Header.tsx" />
        </SortableContainer>
        <SortableContainer dndKitId="6448bf36-57ed-4ad3-a10d-5db9f2ca9f1d" containerType="regular" prevTag="div" data-magicpath-id="4" data-magicpath-path="Header.tsx">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white" data-magicpath-id="5" data-magicpath-path="Header.tsx">
            <span data-magicpath-id="6" data-magicpath-path="Header.tsx">Transcript Extractor</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="7" data-magicpath-path="Header.tsx">
            <span data-magicpath-id="8" data-magicpath-path="Header.tsx">Privacy-first transcript tool</span>
          </p>
        </SortableContainer>
      </SortableContainer>
      
      <SortableContainer dndKitId="8859a0ea-767e-4202-80f0-b3e590d4b5b6" containerType="regular" prevTag="button" onClick={onThemeToggle} className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500" aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} data-magicpath-id="9" data-magicpath-path="Header.tsx">
        {isDarkMode ? <Sun className="w-4 h-4 text-yellow-500" data-magicpath-id="10" data-magicpath-path="Header.tsx" /> : <Moon className="w-4 h-4 text-gray-600" data-magicpath-id="11" data-magicpath-path="Header.tsx" />}
      </SortableContainer>
    </SortableContainer>;
};