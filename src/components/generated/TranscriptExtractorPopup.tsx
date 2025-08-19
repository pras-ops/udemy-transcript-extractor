"use client";

import { SortableContainer } from "@/dnd-kit/SortableContainer";
import * as React from "react";
import { useState } from 'react';
import { FileText, Sun, Moon, Download, ChevronDown, Clock, Clipboard, Play, History, Calendar, Lock, Github, BookOpen, Zap, ExternalLink } from 'lucide-react';
interface HistoryEntry {
  id: string;
  title: string;
  date: string;
  format: string;
  size: string;
  mpid?: string;
}
const mockHistory: HistoryEntry[] = [{
  id: '1',
  title: 'React Hooks Tutorial',
  date: '2024-01-15',
  format: 'Markdown',
  size: '2.3 KB',
  mpid: "04bcad24-28b9-4dfd-906b-7458262794dc"
}, {
  id: '2',
  title: 'TypeScript Basics',
  date: '2024-01-14',
  format: 'TXT',
  size: '1.8 KB',
  mpid: "61f9a07b-60c2-47a1-b574-b7d92887226e"
}, {
  id: '3',
  title: 'Node.js Express Setup',
  date: '2024-01-13',
  format: 'JSON',
  size: '3.1 KB',
  mpid: "9d210acd-9ba1-42a0-ba3d-849cfa20c5f1"
}, {
  id: '4',
  title: 'CSS Grid Layout',
  date: '2024-01-12',
  format: 'Markdown',
  size: '1.5 KB',
  mpid: "b4418adc-7a44-4e70-82c0-98c0851c5ffa"
}, {
  id: '5',
  title: 'JavaScript ES6 Features',
  date: '2024-01-11',
  format: 'TXT',
  size: '1.9 KB',
  mpid: "9672affd-610c-4026-bd86-6acc99d491db"
}];
export const TranscriptExtractorPopup = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'txt' | 'json'>('markdown');
  const [exportTarget, setExportTarget] = useState<'clipboard' | 'download' | 'notebookllm' | 'notion' | 'obsidian'>('clipboard');
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  const handleExtractTranscript = async () => {
    setIsExtracting(true);
    // Simulate extraction
    setTimeout(() => {
      setIsExtracting(false);
    }, 3000);
  };
  const handleExportHistory = (entry: HistoryEntry) => {
    console.log('Exporting:', entry.title);
  };
  const exportTargets = [{
    id: 'clipboard',
    label: 'Clipboard',
    icon: Clipboard,
    mpid: "c16a18fb-aedf-4b34-8a83-e2bce44450a4"
  }, {
    id: 'download',
    label: 'Download File',
    icon: Download,
    mpid: "ed69eeb8-9066-4ccd-add7-87be71db3e03"
  }, {
    id: 'notebookllm',
    label: 'NotebookLLM',
    icon: BookOpen,
    mpid: "cb4191e6-f3c2-4771-8b02-bd14bc44367e"
  }, {
    id: 'notion',
    label: 'Notion',
    icon: ExternalLink,
    mpid: "d15730eb-41db-4b75-b76b-1488b2132770"
  }, {
    id: 'obsidian',
    label: 'Obsidian',
    icon: Zap,
    mpid: "a771cfc0-4ae5-4857-ab83-eaed5ad38313"
  }] as any[];
  const getTargetIcon = (targetId: string) => {
    const target = exportTargets.find(t => t.id === targetId);
    return target ? target.icon : Clipboard;
  };
  const getTargetLabel = (targetId: string) => {
    const target = exportTargets.find(t => t.id === targetId);
    return target ? target.label : 'Clipboard';
  };
  return <SortableContainer dndKitId="8327ebf1-b436-4281-a6e9-a26051448749" containerType="regular" prevTag="div" className="w-[400px] h-[600px] bg-white dark:bg-gray-900 flex flex-col shadow-2xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800" data-magicpath-id="0" data-magicpath-path="TranscriptExtractorPopup.tsx">
      {/* Header */}
      <SortableContainer dndKitId="016d1ac8-d814-4b08-8ef3-01382145e4aa" containerType="regular" prevTag="header" className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800" data-magicpath-id="1" data-magicpath-path="TranscriptExtractorPopup.tsx">
        <SortableContainer dndKitId="a2b5f2c6-112b-464d-97fd-19c7b11437d1" containerType="regular" prevTag="div" className="flex items-center space-x-3" data-magicpath-id="2" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <SortableContainer dndKitId="35e228cd-71ee-45fa-a6c6-8943d7c906d8" containerType="regular" prevTag="div" className="p-2 bg-[#4CAF50] rounded-lg" data-magicpath-id="3" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <FileText className="w-4 h-4 text-white" data-magicpath-id="4" data-magicpath-path="TranscriptExtractorPopup.tsx" />
          </SortableContainer>
          <SortableContainer dndKitId="6018d310-3328-411b-b479-ff07823aa1bd" containerType="regular" prevTag="div" data-magicpath-id="5" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white" data-magicpath-id="6" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <span data-magicpath-id="7" data-magicpath-path="TranscriptExtractorPopup.tsx">Transcript Extractor</span>
            </h1>
          </SortableContainer>
        </SortableContainer>
        
        <SortableContainer dndKitId="a9ae8f32-2cb8-40e7-8c01-3950f1c7b783" containerType="regular" prevTag="button" onClick={handleThemeToggle} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700" aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} data-magicpath-id="8" data-magicpath-path="TranscriptExtractorPopup.tsx">
          {isDarkMode ? <Sun className="w-4 h-4 text-yellow-500" data-magicpath-id="9" data-magicpath-path="TranscriptExtractorPopup.tsx" /> : <Moon className="w-4 h-4 text-gray-600" data-magicpath-id="10" data-magicpath-path="TranscriptExtractorPopup.tsx" />}
        </SortableContainer>
      </SortableContainer>

      {/* Main Content */}
      <SortableContainer dndKitId="2d2e3031-e256-400a-90f9-3322d4393869" containerType="regular" prevTag="main" className="flex-1 overflow-y-auto" data-magicpath-id="11" data-magicpath-path="TranscriptExtractorPopup.tsx">
        {/* Extract Section */}
        <SortableContainer dndKitId="0083f64a-ad28-452e-8003-4e14d48d9407" containerType="regular" prevTag="section" className="p-6 border-b border-gray-200 dark:border-gray-800" data-magicpath-id="12" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4" data-magicpath-id="13" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <span data-magicpath-id="14" data-magicpath-path="TranscriptExtractorPopup.tsx">Extract</span>
          </h2>
          
          <SortableContainer dndKitId="73306f1f-589a-4331-a7e9-b5cc95a03107" containerType="regular" prevTag="button" onClick={handleExtractTranscript} disabled={isExtracting} className={`w-full py-4 px-6 rounded-xl text-white font-medium transition-all duration-200 ${isExtracting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#4CAF50] hover:bg-[#45a049] shadow-lg hover:shadow-xl'}`} data-magicpath-id="15" data-magicpath-path="TranscriptExtractorPopup.tsx">
            {isExtracting ? <SortableContainer dndKitId="e9c1ebd4-bcb3-4448-a9bc-012d6c158bc9" containerType="regular" prevTag="div" className="flex items-center justify-center gap-2" data-magicpath-id="16" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" data-magicpath-id="17" data-magicpath-path="TranscriptExtractorPopup.tsx"></div>
                <span data-magicpath-id="18" data-magicpath-path="TranscriptExtractorPopup.tsx">Extracting...</span>
              </SortableContainer> : <SortableContainer dndKitId="5af4fa71-c623-4f9c-81a8-d9911bd39765" containerType="regular" prevTag="div" className="flex items-center justify-center gap-2" data-magicpath-id="19" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <Play className="w-5 h-5" data-magicpath-id="20" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                <span data-magicpath-id="21" data-magicpath-path="TranscriptExtractorPopup.tsx">Extract Transcript</span>
              </SortableContainer>}
          </SortableContainer>
        </SortableContainer>

        {/* Export Options Section */}
        <SortableContainer dndKitId="573379c9-1c4e-4247-b08c-d4050405452d" containerType="regular" prevTag="section" className="p-6 border-b border-gray-200 dark:border-gray-800" data-magicpath-id="22" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4" data-magicpath-id="23" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <span data-magicpath-id="24" data-magicpath-path="TranscriptExtractorPopup.tsx">Export Options</span>
          </h2>
          
          <SortableContainer dndKitId="c4718692-ca6c-4ff0-9090-248406c4ac97" containerType="regular" prevTag="div" className="space-y-4" data-magicpath-id="25" data-magicpath-path="TranscriptExtractorPopup.tsx">
            {/* Export Format */}
            <SortableContainer dndKitId="0d29eeee-8eb2-439b-9894-4ea99023f82f" containerType="regular" prevTag="div" className="space-y-2" data-magicpath-id="26" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="27" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <span data-magicpath-id="28" data-magicpath-path="TranscriptExtractorPopup.tsx">Format</span>
              </label>
              <SortableContainer dndKitId="170023fa-f03b-4bc9-9a07-bbd4887086b3" containerType="regular" prevTag="div" className="relative" data-magicpath-id="29" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <SortableContainer dndKitId="1b2226e1-a51d-44fd-9e47-9283818bca9c" containerType="regular" prevTag="button" onClick={() => setShowFormatDropdown(!showFormatDropdown)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-magicpath-id="30" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize" data-magicpath-id="31" data-magicpath-path="TranscriptExtractorPopup.tsx">{exportFormat}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" data-magicpath-id="32" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                </SortableContainer>
                
                {showFormatDropdown && <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10" data-magicpath-id="33" data-magicpath-path="TranscriptExtractorPopup.tsx">
                    {['markdown', 'txt', 'json'].map(format => <SortableContainer dndKitId="b65fd09e-4447-44d3-935d-087e2c2012bd" containerType="regular" prevTag="button" key={format} onClick={() => {
                  setExportFormat(format as any);
                  setShowFormatDropdown(false);
                }} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg capitalize" data-magicpath-id="34" data-magicpath-path="TranscriptExtractorPopup.tsx">
                        <span data-magicpath-id="35" data-magicpath-path="TranscriptExtractorPopup.tsx">{format}</span>
                      </SortableContainer>)}
                  </div>}
              </SortableContainer>
            </SortableContainer>

            {/* Include Timestamps Toggle */}
            <SortableContainer dndKitId="8076cd66-a029-4257-b50d-7ea633ff5758" containerType="regular" prevTag="div" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg" data-magicpath-id="36" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <SortableContainer dndKitId="4d094c15-3f5f-4446-ab03-210ebdfe1fae" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="37" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <Clock className="w-4 h-4 text-gray-500" data-magicpath-id="38" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="39" data-magicpath-path="TranscriptExtractorPopup.tsx">Include Timestamps</span>
              </SortableContainer>
              <SortableContainer dndKitId="f0cfcb68-5c15-4a7e-bee2-caada41d4627" containerType="regular" prevTag="button" onClick={() => setIncludeTimestamps(!includeTimestamps)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeTimestamps ? 'bg-[#4CAF50]' : 'bg-gray-300 dark:bg-gray-600'}`} data-magicpath-id="40" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeTimestamps ? 'translate-x-6' : 'translate-x-1'}`} data-magicpath-id="41" data-magicpath-path="TranscriptExtractorPopup.tsx" />
              </SortableContainer>
            </SortableContainer>

            {/* Export Target */}
            <SortableContainer dndKitId="71a56c5b-bfa5-40b5-b768-687c9d0c5586" containerType="regular" prevTag="div" className="space-y-2" data-magicpath-id="42" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="43" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <span data-magicpath-id="44" data-magicpath-path="TranscriptExtractorPopup.tsx">Export To</span>
              </label>
              <SortableContainer dndKitId="fae4ebef-a4f9-46c1-a813-102dab2bb60c" containerType="regular" prevTag="div" className="relative" data-magicpath-id="45" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <SortableContainer dndKitId="3e866251-c266-4ba8-8839-9f6ce179f5be" containerType="regular" prevTag="button" onClick={() => setShowTargetDropdown(!showTargetDropdown)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-magicpath-id="46" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <SortableContainer dndKitId="03b5493d-81aa-4e60-83e7-5f7e07c5e197" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="47" data-magicpath-path="TranscriptExtractorPopup.tsx">
                    {React.createElement(getTargetIcon(exportTarget), {
                    className: "w-4 h-4 text-gray-500"
                  })}
                    <span className="text-sm text-gray-700 dark:text-gray-300" data-magicpath-id="48" data-magicpath-path="TranscriptExtractorPopup.tsx">{getTargetLabel(exportTarget)}</span>
                  </SortableContainer>
                  <ChevronDown className="w-4 h-4 text-gray-500" data-magicpath-id="49" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                </SortableContainer>
                
                {showTargetDropdown && <SortableContainer dndKitId="ed44bbce-8ebf-45b9-a351-7683bbe71067" containerType="collection" prevTag="div" className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10" data-magicpath-id="50" data-magicpath-path="TranscriptExtractorPopup.tsx">
                    {exportTargets.map(target => {
                  const Icon = target.icon;
                  return <button key={target.id} onClick={() => {
                    setExportTarget(target.id as any);
                    setShowTargetDropdown(false);
                  }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg" data-magicpath-uuid={(target as any)["mpid"] ?? "unsafe"} data-magicpath-id="51" data-magicpath-path="TranscriptExtractorPopup.tsx">
                          <Icon className="w-4 h-4 text-gray-500" data-magicpath-uuid={(target as any)["mpid"] ?? "unsafe"} data-magicpath-id="52" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                          <span data-magicpath-uuid={(target as any)["mpid"] ?? "unsafe"} data-magicpath-field="label:string" data-magicpath-id="53" data-magicpath-path="TranscriptExtractorPopup.tsx">{target.label}</span>
                        </button>;
                })}
                  </SortableContainer>}
              </SortableContainer>
            </SortableContainer>
          </SortableContainer>
        </SortableContainer>

        {/* History Section */}
        <SortableContainer dndKitId="8228540b-0bc9-4034-a5ed-0cff9be106d4" containerType="regular" prevTag="section" className="p-6" data-magicpath-id="54" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4" data-magicpath-id="55" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <span data-magicpath-id="56" data-magicpath-path="TranscriptExtractorPopup.tsx">History</span>
          </h2>
          
          {mockHistory.length === 0 ? <SortableContainer dndKitId="c8b5fcab-5c8b-4217-b8b5-a20f8263f366" containerType="regular" prevTag="div" className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400" data-magicpath-id="57" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <History className="w-8 h-8 mb-2 opacity-50" data-magicpath-id="58" data-magicpath-path="TranscriptExtractorPopup.tsx" />
              <p className="text-sm text-center" data-magicpath-id="59" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <span data-magicpath-id="60" data-magicpath-path="TranscriptExtractorPopup.tsx">No transcripts extracted yet</span>
              </p>
            </SortableContainer> : <SortableContainer dndKitId="fdb2a35c-ea44-4709-a5f2-2289acd21268" containerType="collection" prevTag="div" className="space-y-2" data-magicpath-id="61" data-magicpath-path="TranscriptExtractorPopup.tsx">
              {mockHistory.slice(0, 5).map(entry => <div key={entry.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="62" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <div className="flex items-center justify-between" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="63" data-magicpath-path="TranscriptExtractorPopup.tsx">
                    <div className="flex-1 min-w-0" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="64" data-magicpath-path="TranscriptExtractorPopup.tsx">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="65" data-magicpath-path="TranscriptExtractorPopup.tsx">
                        <span data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-field="title:unknown" data-magicpath-id="66" data-magicpath-path="TranscriptExtractorPopup.tsx">{entry.title}</span>
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="67" data-magicpath-path="TranscriptExtractorPopup.tsx">
                        <div className="flex items-center gap-1" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="68" data-magicpath-path="TranscriptExtractorPopup.tsx">
                          <Calendar className="w-3 h-3" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="69" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                          <span data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-field="date:unknown" data-magicpath-id="70" data-magicpath-path="TranscriptExtractorPopup.tsx">{entry.date}</span>
                        </div>
                        <span data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="71" data-magicpath-path="TranscriptExtractorPopup.tsx">•</span>
                        <span data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-field="format:unknown" data-magicpath-id="72" data-magicpath-path="TranscriptExtractorPopup.tsx">{entry.format}</span>
                        <span data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="73" data-magicpath-path="TranscriptExtractorPopup.tsx">•</span>
                        <span data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-field="size:unknown" data-magicpath-id="74" data-magicpath-path="TranscriptExtractorPopup.tsx">{entry.size}</span>
                      </div>
                    </div>
                    
                    <button onClick={() => handleExportHistory(entry)} className="p-1.5 text-gray-500 hover:text-[#4CAF50] hover:bg-[#4CAF50] hover:bg-opacity-10 rounded-lg transition-colors" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="75" data-magicpath-path="TranscriptExtractorPopup.tsx">
                      <Download className="w-4 h-4" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="76" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                    </button>
                  </div>
                </div>)}
            </SortableContainer>}
        </SortableContainer>
      </SortableContainer>

      {/* Footer */}
      <SortableContainer dndKitId="b717d12b-7dc9-43b1-954b-397c2112afdb" containerType="regular" prevTag="footer" className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700" data-magicpath-id="77" data-magicpath-path="TranscriptExtractorPopup.tsx">
        <SortableContainer dndKitId="040ec6a8-220f-47d9-8b19-1f47071f817a" containerType="regular" prevTag="div" className="flex items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="78" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <SortableContainer dndKitId="76db3a42-b123-47b2-97be-048c42d575f3" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="79" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <Lock className="w-3 h-3" data-magicpath-id="80" data-magicpath-path="TranscriptExtractorPopup.tsx" />
            <span data-magicpath-id="81" data-magicpath-path="TranscriptExtractorPopup.tsx">Local-first</span>
          </SortableContainer>
          <span data-magicpath-id="82" data-magicpath-path="TranscriptExtractorPopup.tsx">•</span>
          <SortableContainer dndKitId="5daf2426-426f-4119-84c0-ed7e06d6718e" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="83" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <Github className="w-3 h-3" data-magicpath-id="84" data-magicpath-path="TranscriptExtractorPopup.tsx" />
            <span data-magicpath-id="85" data-magicpath-path="TranscriptExtractorPopup.tsx">Open Source</span>
          </SortableContainer>
          <span data-magicpath-id="86" data-magicpath-path="TranscriptExtractorPopup.tsx">•</span>
          <span data-magicpath-id="87" data-magicpath-path="TranscriptExtractorPopup.tsx">MIT License</span>
        </SortableContainer>
      </SortableContainer>
    </SortableContainer>;
};