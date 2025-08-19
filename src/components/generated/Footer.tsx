import { SortableContainer } from "@/dnd-kit/SortableContainer";
import React, { useState } from 'react';
import { Copy, Download, Sparkles, Shield, Github, ChevronDown } from 'lucide-react';
interface FooterProps {
  onCopyTranscript: () => void;
  onExport: (format: 'txt' | 'markdown' | 'json') => void;
  onAISummarize: () => void;
  disabled?: boolean;
  mpid?: string;
}

// @component: Footer
export const Footer = ({
  onCopyTranscript,
  onExport,
  onAISummarize,
  disabled = false
}: FooterProps) => {
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const handleAISummarize = async () => {
    setIsAILoading(true);
    await onAISummarize();
    setTimeout(() => setIsAILoading(false), 2000);
  };
  const handleExport = (format: 'txt' | 'markdown' | 'json') => {
    onExport(format);
    setShowExportDropdown(false);
  };

  // @return
  return <SortableContainer dndKitId="b8d77c94-ad6e-4765-b127-f2ba12f966c4" containerType="regular" prevTag="footer" className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" data-magicpath-id="0" data-magicpath-path="Footer.tsx">
      <SortableContainer dndKitId="c89eb3bc-3cf0-4650-a18c-c1a37fc9d7a6" containerType="regular" prevTag="div" className="p-4 space-y-4" data-magicpath-id="1" data-magicpath-path="Footer.tsx">
        <SortableContainer dndKitId="8b80053b-70a5-4a03-953a-1d9d9d7ff218" containerType="regular" prevTag="div" className="flex gap-2" data-magicpath-id="2" data-magicpath-path="Footer.tsx">
          <SortableContainer dndKitId="8e36ddab-bb22-4047-9da2-312ca5c5af4b" containerType="regular" prevTag="button" onClick={onCopyTranscript} disabled={disabled} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-colors duration-200 text-sm font-medium ${disabled ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`} data-magicpath-id="3" data-magicpath-path="Footer.tsx">
            <Copy className="w-4 h-4" data-magicpath-id="4" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="5" data-magicpath-path="Footer.tsx">Copy</span>
          </SortableContainer>
          
          <SortableContainer dndKitId="084a1b5b-d31c-489a-825b-c295072513ef" containerType="regular" prevTag="div" className="relative" data-magicpath-id="6" data-magicpath-path="Footer.tsx">
            <SortableContainer dndKitId="d6439b3f-1329-4ffe-ae26-2a4a77eced51" containerType="regular" prevTag="button" onClick={() => setShowExportDropdown(!showExportDropdown)} disabled={disabled} className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors duration-200 text-sm font-medium ${disabled ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`} data-magicpath-id="7" data-magicpath-path="Footer.tsx">
              <Download className="w-4 h-4" data-magicpath-id="8" data-magicpath-path="Footer.tsx" />
              <span data-magicpath-id="9" data-magicpath-path="Footer.tsx">Export</span>
              <ChevronDown className="w-3 h-3" data-magicpath-id="10" data-magicpath-path="Footer.tsx" />
            </SortableContainer>
            
            {showExportDropdown && !disabled && <SortableContainer dndKitId="6ab05038-04fd-4f2d-9f62-d8bc9bea6c7a" containerType="regular" prevTag="div" className="absolute bottom-full mb-1 right-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-24 z-10" data-magicpath-id="11" data-magicpath-path="Footer.tsx">
                <SortableContainer dndKitId="078145ba-d1e3-4643-8534-8457acce66a5" containerType="regular" prevTag="button" onClick={() => handleExport('txt')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="12" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="13" data-magicpath-path="Footer.tsx">TXT</span>
                </SortableContainer>
                <SortableContainer dndKitId="f557d046-289a-44af-bc8e-4abe499b24a9" containerType="regular" prevTag="button" onClick={() => handleExport('markdown')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="14" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="15" data-magicpath-path="Footer.tsx">Markdown</span>
                </SortableContainer>
                <SortableContainer dndKitId="973595b0-1891-40a6-b8b9-39b81dff0571" containerType="regular" prevTag="button" onClick={() => handleExport('json')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="16" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="17" data-magicpath-path="Footer.tsx">JSON</span>
                </SortableContainer>
              </SortableContainer>}
          </SortableContainer>
          
          <SortableContainer dndKitId="21928120-79c2-44af-b1db-d6e89ade07d5" containerType="regular" prevTag="button" onClick={handleAISummarize} disabled={isAILoading || disabled} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed' : isAILoading ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white'}`} data-magicpath-id="18" data-magicpath-path="Footer.tsx">
            <Sparkles className={`w-4 h-4 ${isAILoading ? 'animate-spin' : ''}`} />
            <span data-magicpath-id="19" data-magicpath-path="Footer.tsx">{isAILoading ? 'Processing...' : 'AI Summary'}</span>
          </SortableContainer>
        </SortableContainer>
        
        <SortableContainer dndKitId="a03e747f-8fde-4c34-a1ab-abc3776ec616" containerType="regular" prevTag="div" className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="20" data-magicpath-path="Footer.tsx">
          <SortableContainer dndKitId="576a67e3-cfc9-472b-80cb-221f22ba8524" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="21" data-magicpath-path="Footer.tsx">
            <Shield className="w-3 h-3 text-green-500" data-magicpath-id="22" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="23" data-magicpath-path="Footer.tsx">Privacy Protected</span>
          </SortableContainer>
          <SortableContainer dndKitId="d8f05a73-399a-4728-b6c0-65d4445c94fa" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="24" data-magicpath-path="Footer.tsx">
            <Github className="w-3 h-3" data-magicpath-id="25" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="26" data-magicpath-path="Footer.tsx">Open Source</span>
          </SortableContainer>
        </SortableContainer>
      </SortableContainer>
    </SortableContainer>;
};