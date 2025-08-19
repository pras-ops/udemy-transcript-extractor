import { SortableContainer } from "@/dnd-kit/SortableContainer";
import React, { useState } from 'react';
import { Copy, Download, Sparkles, Shield, Github, ChevronDown } from 'lucide-react';
interface FooterProps {
  onCopyTranscript: () => void;
  onExport: (format: 'txt' | 'markdown' | 'json') => void;
  onAISummarize: () => void;
  mpid?: string;
}

// @component: Footer
export const Footer = ({
  onCopyTranscript,
  onExport,
  onAISummarize
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
  return <SortableContainer dndKitId="e33c5b7b-feaf-4416-810f-db315e02861f" containerType="regular" prevTag="footer" className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" data-magicpath-id="0" data-magicpath-path="Footer.tsx">
      <SortableContainer dndKitId="3612698b-8066-4c14-ab1a-0fb2670dfc16" containerType="regular" prevTag="div" className="p-4 space-y-4" data-magicpath-id="1" data-magicpath-path="Footer.tsx">
        <SortableContainer dndKitId="5aec68ac-10d4-4a0f-930b-31bfca599352" containerType="regular" prevTag="div" className="flex gap-2" data-magicpath-id="2" data-magicpath-path="Footer.tsx">
          <SortableContainer dndKitId="763adef4-ea11-4dc7-a64b-0e812a1950db" containerType="regular" prevTag="button" onClick={onCopyTranscript} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="3" data-magicpath-path="Footer.tsx">
            <Copy className="w-4 h-4" data-magicpath-id="4" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="5" data-magicpath-path="Footer.tsx">Copy</span>
          </SortableContainer>
          
          <SortableContainer dndKitId="9acf6413-1508-4cb7-838b-df6e7853dc8c" containerType="regular" prevTag="div" className="relative" data-magicpath-id="6" data-magicpath-path="Footer.tsx">
            <SortableContainer dndKitId="ef6647cc-dd4e-4868-80aa-96b9a2c37540" containerType="regular" prevTag="button" onClick={() => setShowExportDropdown(!showExportDropdown)} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="7" data-magicpath-path="Footer.tsx">
              <Download className="w-4 h-4" data-magicpath-id="8" data-magicpath-path="Footer.tsx" />
              <span data-magicpath-id="9" data-magicpath-path="Footer.tsx">Export</span>
              <ChevronDown className="w-3 h-3" data-magicpath-id="10" data-magicpath-path="Footer.tsx" />
            </SortableContainer>
            
            {showExportDropdown && <SortableContainer dndKitId="267a54d9-9be3-4e2c-abfc-48b5d81a0505" containerType="regular" prevTag="div" className="absolute bottom-full mb-1 right-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-24 z-10" data-magicpath-id="11" data-magicpath-path="Footer.tsx">
                <SortableContainer dndKitId="e72056c5-201f-447e-8415-53e1dc273980" containerType="regular" prevTag="button" onClick={() => handleExport('txt')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="12" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="13" data-magicpath-path="Footer.tsx">TXT</span>
                </SortableContainer>
                <SortableContainer dndKitId="6ebef6c2-da6e-4c2f-a49f-47c943668629" containerType="regular" prevTag="button" onClick={() => handleExport('markdown')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="14" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="15" data-magicpath-path="Footer.tsx">Markdown</span>
                </SortableContainer>
                <SortableContainer dndKitId="9ab43a71-caf5-429b-8c89-dac42ce63b59" containerType="regular" prevTag="button" onClick={() => handleExport('json')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="16" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="17" data-magicpath-path="Footer.tsx">JSON</span>
                </SortableContainer>
              </SortableContainer>}
          </SortableContainer>
          
          <SortableContainer dndKitId="cf4af3dc-3354-46bd-841a-67cce66bc484" containerType="regular" prevTag="button" onClick={handleAISummarize} disabled={isAILoading} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-200 text-sm font-medium disabled:cursor-not-allowed" data-magicpath-id="18" data-magicpath-path="Footer.tsx">
            <Sparkles className={`w-4 h-4 ${isAILoading ? 'animate-spin' : ''}`} />
            <span data-magicpath-id="19" data-magicpath-path="Footer.tsx">{isAILoading ? 'Processing...' : 'AI Summary'}</span>
          </SortableContainer>
        </SortableContainer>
        
        <SortableContainer dndKitId="f9b6c61f-ed6d-4117-b2a9-ea82ba8b7f50" containerType="regular" prevTag="div" className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="20" data-magicpath-path="Footer.tsx">
          <SortableContainer dndKitId="4de38fd2-0177-4412-b754-fa10cdaa4b61" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="21" data-magicpath-path="Footer.tsx">
            <Shield className="w-3 h-3 text-green-500" data-magicpath-id="22" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="23" data-magicpath-path="Footer.tsx">Privacy Protected</span>
          </SortableContainer>
          <SortableContainer dndKitId="9863c2da-07c4-4dab-85c1-a9c970d361ad" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="24" data-magicpath-path="Footer.tsx">
            <Github className="w-3 h-3" data-magicpath-id="25" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="26" data-magicpath-path="Footer.tsx">Open Source</span>
          </SortableContainer>
        </SortableContainer>
      </SortableContainer>
    </SortableContainer>;
};