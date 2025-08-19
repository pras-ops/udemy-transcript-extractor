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
  return <SortableContainer dndKitId="97c7fe1e-48f9-42bb-a4fc-f30ee1ce05de" containerType="regular" prevTag="footer" className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" data-magicpath-id="0" data-magicpath-path="Footer.tsx">
      <SortableContainer dndKitId="a75cb5a3-f356-49c7-8255-64c345d14040" containerType="regular" prevTag="div" className="p-4 space-y-4" data-magicpath-id="1" data-magicpath-path="Footer.tsx">
        <SortableContainer dndKitId="e1d8a879-2c3e-4089-9c8e-b69dbc275419" containerType="regular" prevTag="div" className="flex gap-2" data-magicpath-id="2" data-magicpath-path="Footer.tsx">
          <SortableContainer dndKitId="71e2e22f-ec17-421e-ada5-89444b669caf" containerType="regular" prevTag="button" onClick={onCopyTranscript} disabled={disabled} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-colors duration-200 text-sm font-medium ${disabled ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`} data-magicpath-id="3" data-magicpath-path="Footer.tsx">
            <Copy className="w-4 h-4" data-magicpath-id="4" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="5" data-magicpath-path="Footer.tsx">Copy</span>
          </SortableContainer>
          
          <SortableContainer dndKitId="7fd41570-5105-41f9-a9c7-76ab46adf875" containerType="regular" prevTag="div" className="relative" data-magicpath-id="6" data-magicpath-path="Footer.tsx">
            <SortableContainer dndKitId="ed71ff5a-ae07-4b4d-b558-ce8e41a67764" containerType="regular" prevTag="button" onClick={() => setShowExportDropdown(!showExportDropdown)} disabled={disabled} className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors duration-200 text-sm font-medium ${disabled ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`} data-magicpath-id="7" data-magicpath-path="Footer.tsx">
              <Download className="w-4 h-4" data-magicpath-id="8" data-magicpath-path="Footer.tsx" />
              <span data-magicpath-id="9" data-magicpath-path="Footer.tsx">Export</span>
              <ChevronDown className="w-3 h-3" data-magicpath-id="10" data-magicpath-path="Footer.tsx" />
            </SortableContainer>
            
            {showExportDropdown && !disabled && <SortableContainer dndKitId="8091b8c1-ec49-41ba-a34a-bc2a4c779956" containerType="regular" prevTag="div" className="absolute bottom-full mb-1 right-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-24 z-10" data-magicpath-id="11" data-magicpath-path="Footer.tsx">
                <SortableContainer dndKitId="a733087b-d825-4f22-919a-000bb27134e4" containerType="regular" prevTag="button" onClick={() => handleExport('txt')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="12" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="13" data-magicpath-path="Footer.tsx">TXT</span>
                </SortableContainer>
                <SortableContainer dndKitId="73d1eb39-d76e-4d3d-a089-fa79a08181b5" containerType="regular" prevTag="button" onClick={() => handleExport('markdown')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="14" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="15" data-magicpath-path="Footer.tsx">Markdown</span>
                </SortableContainer>
                <SortableContainer dndKitId="6df072b5-24d9-4162-bc3f-2fe7d7661348" containerType="regular" prevTag="button" onClick={() => handleExport('json')} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600" data-magicpath-id="16" data-magicpath-path="Footer.tsx">
                  <span data-magicpath-id="17" data-magicpath-path="Footer.tsx">JSON</span>
                </SortableContainer>
              </SortableContainer>}
          </SortableContainer>
          
          <SortableContainer dndKitId="24409f54-c7ca-4837-a51c-9cdae5e673ca" containerType="regular" prevTag="button" onClick={handleAISummarize} disabled={isAILoading || disabled} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${disabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed' : isAILoading ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white'}`} data-magicpath-id="18" data-magicpath-path="Footer.tsx">
            <Sparkles className={`w-4 h-4 ${isAILoading ? 'animate-spin' : ''}`} />
            <span data-magicpath-id="19" data-magicpath-path="Footer.tsx">{isAILoading ? 'Processing...' : 'AI Summary'}</span>
          </SortableContainer>
        </SortableContainer>
        
        <SortableContainer dndKitId="1444db61-5081-48e6-a24c-f6656754e5de" containerType="regular" prevTag="div" className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="20" data-magicpath-path="Footer.tsx">
          <SortableContainer dndKitId="2e1bcfa6-4904-438f-bb14-08b00ea6a8dc" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="21" data-magicpath-path="Footer.tsx">
            <Shield className="w-3 h-3 text-green-500" data-magicpath-id="22" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="23" data-magicpath-path="Footer.tsx">Privacy Protected</span>
          </SortableContainer>
          <SortableContainer dndKitId="da684cd8-90a9-4390-9607-2866fa9cf3d0" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="24" data-magicpath-path="Footer.tsx">
            <Github className="w-3 h-3" data-magicpath-id="25" data-magicpath-path="Footer.tsx" />
            <span data-magicpath-id="26" data-magicpath-path="Footer.tsx">Open Source</span>
          </SortableContainer>
        </SortableContainer>
      </SortableContainer>
    </SortableContainer>;
};