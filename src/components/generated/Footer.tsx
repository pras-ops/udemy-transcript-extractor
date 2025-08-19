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
  return <SortableContainer dndKitId="e3a36265-c8b7-42f5-be3c-87b7e0c993cd" containerType="regular" prevTag="footer" className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" data-magicpath-id="0" data-magicpath-path="Footer.tsx">
      <SortableContainer dndKitId="a74326d1-aab4-4bf8-8fe9-43e93e5ee197" containerType="regular" prevTag="div" className="p-4 space-y-4" data-magicpath-id="1" data-magicpath-path="Footer.tsx">
        <SortableContainer dndKitId="76483de9-fd64-41ee-a789-55cc6dbb6c16" containerType="regular" prevTag="div" className="flex gap-2" data-magicpath-id="2" data-magicpath-path="Footer.tsx">
          <SortableContainer dndKitId="7420711c-f490-4220-975b-f43295f29b7a" containerType="regular" prevTag="button" onClick={onCopyTranscript} disabled={disabled} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-colors duration-200 text-sm font-medium ${disabled ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`} data-magicpath-id="3" data-magicpath-path="Footer.tsx">
            <Copy className="w-4 h-4" data-magicpath-id="4" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="5" data-magicpath-path="Footer.tsx">Copy</span>
          </SortableContainer>
          
          <SortableContainer dndKitId="a4271eea-1f8a-42ae-9937-84e2c09183a3" containerType="regular" prevTag="div" className="relative" data-magicpath-id="6" data-magicpath-path="Footer.tsx">
            <SortableContainer dndKitId="87dc490b-41a8-42d2-9610-2d79028d037b" containerType="regular" prevTag="button" onClick={() => setShowExportDropdown(!showExportDropdown)} disabled={disabled} className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors duration-200 text-sm font-medium ${disabled ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`} data-magicpath-id="7" data-magicpath-path="Footer.tsx">
              <Download className="w-4 h-4" data-magicpath-id="8" data-magicpath-path="Footer.tsx" />
              <span data-magicpath-id="9" data-magicpath-path="Footer.tsx">Export</span>
              <ChevronDown className="w-3 h-3" data-magicpath-id="10" data-magicpath-path="Footer.tsx" />
            </SortableContainer>
            
            {showExportDropdown && !disabled && <SortableContainer dndKitId="25eaa430-d340-45ca-ad6c-23927c9f1035" containerType="regular" prevTag="div" className="absolute bottom-full mb-1 right-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-24 z-10" data-magicpath-id="11" data-magicpath-path="Footer.tsx">
                <SortableContainer dndKitId="7ff433d8-53fd-42ad-96f9-132aead52e1d" containerType="regular" prevTag="button" onClick={() => handleExport('txt')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="12" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="13" data-magicpath-path="Footer.tsx">TXT</span>
                </SortableContainer>
                <SortableContainer dndKitId="39000874-3a77-41c3-a4ae-bd6c08defc2f" containerType="regular" prevTag="button" onClick={() => handleExport('markdown')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="14" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="15" data-magicpath-path="Footer.tsx">Markdown</span>
                </SortableContainer>
                <SortableContainer dndKitId="83dc83e2-75b9-4de5-b495-4d6b4b5165fe" containerType="regular" prevTag="button" onClick={() => handleExport('json')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="16" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="17" data-magicpath-path="Footer.tsx">JSON</span>
                </SortableContainer>
              </SortableContainer>}
          </SortableContainer>
          
          <SortableContainer dndKitId="4a362bbd-0793-41d6-8eaf-d72de3c62a61" containerType="regular" prevTag="button" onClick={handleAISummarize} disabled={isAILoading || disabled} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed' : isAILoading ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white'}`} data-magicpath-id="18" data-magicpath-path="Footer.tsx">
            <Sparkles className={`w-4 h-4 ${isAILoading ? 'animate-spin' : ''}`} />
            <span data-magicpath-id="19" data-magicpath-path="Footer.tsx">{isAILoading ? 'Processing...' : 'AI Summary'}</span>
          </SortableContainer>
        </SortableContainer>
        
        <SortableContainer dndKitId="69bffc87-8064-481f-a781-ed781112729b" containerType="regular" prevTag="div" className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="20" data-magicpath-path="Footer.tsx">
          <SortableContainer dndKitId="b335aa1e-cdd9-404b-90d0-58b685119521" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="21" data-magicpath-path="Footer.tsx">
            <Shield className="w-3 h-3 text-green-500" data-magicpath-id="22" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="23" data-magicpath-path="Footer.tsx">Privacy Protected</span>
          </SortableContainer>
          <SortableContainer dndKitId="a62a353b-e2a0-495e-9a51-8739c2bc9d4a" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="24" data-magicpath-path="Footer.tsx">
            <Github className="w-3 h-3" data-magicpath-id="25" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="26" data-magicpath-path="Footer.tsx">Open Source</span>
          </SortableContainer>
        </SortableContainer>
      </SortableContainer>
    </SortableContainer>;
};