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
  return <SortableContainer dndKitId="061917ec-b3b7-42ef-a4b9-f55f610da3a2" containerType="regular" prevTag="footer" className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" data-magicpath-id="0" data-magicpath-path="Footer.tsx">
      <SortableContainer dndKitId="919f4e99-73dc-4b79-8570-2dcd12a8d214" containerType="regular" prevTag="div" className="p-4 space-y-4" data-magicpath-id="1" data-magicpath-path="Footer.tsx">
        <SortableContainer dndKitId="47bdd1e3-1126-4834-a862-c805cf1131c5" containerType="regular" prevTag="div" className="flex gap-2" data-magicpath-id="2" data-magicpath-path="Footer.tsx">
          <SortableContainer dndKitId="2042426d-9c24-4f2d-9cd8-e35b729a81b3" containerType="regular" prevTag="button" onClick={onCopyTranscript} disabled={disabled} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-colors duration-200 text-sm font-medium ${disabled ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`} data-magicpath-id="3" data-magicpath-path="Footer.tsx">
            <Copy className="w-4 h-4" data-magicpath-id="4" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="5" data-magicpath-path="Footer.tsx">Copy</span>
          </SortableContainer>
          
          <SortableContainer dndKitId="d82bc6eb-d096-4a2b-a8af-720fd4662ca0" containerType="regular" prevTag="div" className="relative" data-magicpath-id="6" data-magicpath-path="Footer.tsx">
            <SortableContainer dndKitId="69571522-1825-4593-903a-8f48167d17b0" containerType="regular" prevTag="button" onClick={() => setShowExportDropdown(!showExportDropdown)} disabled={disabled} className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors duration-200 text-sm font-medium ${disabled ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`} data-magicpath-id="7" data-magicpath-path="Footer.tsx">
              <Download className="w-4 h-4" data-magicpath-id="8" data-magicpath-path="Footer.tsx" />
              <span data-magicpath-id="9" data-magicpath-path="Footer.tsx">Export</span>
              <ChevronDown className="w-3 h-3" data-magicpath-id="10" data-magicpath-path="Footer.tsx" />
            </SortableContainer>
            
            {showExportDropdown && !disabled && <SortableContainer dndKitId="e6f5f221-581d-490a-a4d3-719394d6ef2d" containerType="regular" prevTag="div" className="absolute bottom-full mb-1 right-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-24 z-10" data-magicpath-id="11" data-magicpath-path="Footer.tsx">
                <SortableContainer dndKitId="66326f8e-e9fd-425a-8275-c56b7c3b9184" containerType="regular" prevTag="button" onClick={() => handleExport('txt')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="12" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="13" data-magicpath-path="Footer.tsx">TXT</span>
                </SortableContainer>
                <SortableContainer dndKitId="bb8f830d-fa5e-4c72-a51b-802045675d0f" containerType="regular" prevTag="button" onClick={() => handleExport('markdown')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="14" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="15" data-magicpath-path="Footer.tsx">Markdown</span>
                </SortableContainer>
                <SortableContainer dndKitId="414fbad4-ea79-4807-9f55-983b59a34fe4" containerType="regular" prevTag="button" onClick={() => handleExport('json')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="16" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="17" data-magicpath-path="Footer.tsx">JSON</span>
                </SortableContainer>
              </SortableContainer>}
          </SortableContainer>
          
          <SortableContainer dndKitId="e8582586-c3e9-49e2-a71c-7328a86fd1ae" containerType="regular" prevTag="button" onClick={handleAISummarize} disabled={isAILoading || disabled} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed' : isAILoading ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white'}`} data-magicpath-id="18" data-magicpath-path="Footer.tsx">
            <Sparkles className={`w-4 h-4 ${isAILoading ? 'animate-spin' : ''}`} />
            <span data-magicpath-id="19" data-magicpath-path="Footer.tsx">{isAILoading ? 'Processing...' : 'AI Summary'}</span>
          </SortableContainer>
        </SortableContainer>
        
        <SortableContainer dndKitId="172855de-b937-463b-9c70-d7b698500004" containerType="regular" prevTag="div" className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="20" data-magicpath-path="Footer.tsx">
          <SortableContainer dndKitId="67288cc5-f93a-42bf-92f6-fff062d771db" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="21" data-magicpath-path="Footer.tsx">
            <Shield className="w-3 h-3 text-green-500" data-magicpath-id="22" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="23" data-magicpath-path="Footer.tsx">Privacy Protected</span>
          </SortableContainer>
          <SortableContainer dndKitId="67d6a915-9e02-4109-9392-7e340f8d1a80" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="24" data-magicpath-path="Footer.tsx">
            <Github className="w-3 h-3" data-magicpath-id="25" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="26" data-magicpath-path="Footer.tsx">Open Source</span>
          </SortableContainer>
        </SortableContainer>
      </SortableContainer>
    </SortableContainer>;
};