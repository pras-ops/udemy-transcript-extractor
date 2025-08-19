"use client";

import { SortableContainer } from "@/dnd-kit/SortableContainer";
import * as React from "react";
import { useState } from 'react';
import { FileText, Sun, Moon, Download, ChevronDown, Clock, Clipboard, Play, History, Calendar, Lock, Github, BookOpen, Zap, ExternalLink, Brain } from 'lucide-react';
interface HistoryEntry {
  id: string;
  title: string;
  date: string;
  time: string;
  format: string;
  size: string;
  mpid?: string;
}
const mockHistory: HistoryEntry[] = [{
  id: '1',
  title: 'React Hooks Tutorial',
  date: '2024-01-15',
  time: '14:30',
  format: 'Markdown',
  size: '2.3 KB',
  mpid: "53e2d148-dbbb-4ac2-9ff5-76dd626d5d2a"
}, {
  id: '2',
  title: 'TypeScript Basics',
  date: '2024-01-14',
  time: '09:15',
  format: 'TXT',
  size: '1.8 KB',
  mpid: "95155b1e-ddd9-4dc8-a81f-844bf5ee7aab"
}, {
  id: '3',
  title: 'Node.js Express Setup',
  date: '2024-01-13',
  time: '16:45',
  format: 'JSON',
  size: '3.1 KB',
  mpid: "2dee9074-37c4-4870-8fce-436fee572e2d"
}, {
  id: '4',
  title: 'CSS Grid Layout',
  date: '2024-01-12',
  time: '11:20',
  format: 'Markdown',
  size: '1.5 KB',
  mpid: "f7de1a38-ace7-468e-a48a-0b732545a2ec"
}, {
  id: '5',
  title: 'JavaScript ES6 Features',
  date: '2024-01-11',
  time: '13:10',
  format: 'TXT',
  size: '1.9 KB',
  mpid: "a52395f9-0c71-4d0f-b573-3d7fff512d67"
}, {
  id: '6',
  title: 'Vue.js Components',
  date: '2024-01-10',
  time: '10:30',
  format: 'Markdown',
  size: '2.7 KB',
  mpid: "8c7ff155-264c-4a04-99eb-0738befe812d"
}, {
  id: '7',
  title: 'Python Data Analysis',
  date: '2024-01-09',
  time: '15:25',
  format: 'JSON',
  size: '4.2 KB',
  mpid: "0d2fa7fc-8b6f-483b-a284-c40adecc7d6c"
}];
export const TranscriptExtractorPopup = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'extract' | 'ai-notes' | 'history'>('extract');
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
    mpid: "1c480abd-19b2-4aa1-8550-ddb626262f0d"
  }, {
    id: 'download',
    label: 'Download File',
    icon: Download,
    mpid: "7dfa107c-4e64-461b-bdcf-4295fd7c63de"
  }, {
    id: 'notebookllm',
    label: 'NotebookLLM',
    icon: BookOpen,
    mpid: "e46dbd53-2059-4d84-a660-457bebc373dc"
  }, {
    id: 'notion',
    label: 'Notion',
    icon: ExternalLink,
    mpid: "ee68eac3-4cef-4659-b6cd-9070d4901814"
  }, {
    id: 'obsidian',
    label: 'Obsidian',
    icon: Zap,
    mpid: "ab069d4c-5e0a-4967-afba-f4996f0fc423"
  }] as any[];
  const getTargetIcon = (targetId: string) => {
    const target = exportTargets.find(t => t.id === targetId);
    return target ? target.icon : Clipboard;
  };
  const getTargetLabel = (targetId: string) => {
    const target = exportTargets.find(t => t.id === targetId);
    return target ? target.label : 'Clipboard';
  };
  const tabs = [{
    id: 'extract' as const,
    label: 'Extract',
    icon: FileText,
    mpid: "b2ee54f7-128a-4ac1-bce0-ce32a13d6cb9"
  }, {
    id: 'ai-notes' as const,
    label: 'AI Notes',
    icon: Brain,
    mpid: "5ec909df-632e-41c2-914f-5afdfca2a5b6"
  }, {
    id: 'history' as const,
    label: 'History',
    icon: History,
    mpid: "04b23f83-3fbb-45a7-acac-bfe2d097184d"
  }] as any[];

  // Shared Extract Section Component
  const ExtractSection = () => <SortableContainer dndKitId="8d8693ee-b653-4ffc-92f7-804882ab2f18" containerType="regular" prevTag="div" className="space-y-6" data-magicpath-id="0" data-magicpath-path="TranscriptExtractorPopup.tsx">
      <SortableContainer dndKitId="9a97ead8-e3d0-4bc9-9dd4-c77ac6cbb8e4" containerType="regular" prevTag="button" onClick={handleExtractTranscript} disabled={isExtracting} className={`w-full py-4 px-6 rounded-xl text-white font-medium transition-all duration-200 ${isExtracting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#4CAF50] hover:bg-[#45a049] shadow-lg hover:shadow-xl'}`} data-magicpath-id="1" data-magicpath-path="TranscriptExtractorPopup.tsx">
        {isExtracting ? <SortableContainer dndKitId="1d3cfc00-5dac-4661-a849-56b6877b7b1d" containerType="regular" prevTag="div" className="flex items-center justify-center gap-2" data-magicpath-id="2" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" data-magicpath-id="3" data-magicpath-path="TranscriptExtractorPopup.tsx"></div>
            <span data-magicpath-id="4" data-magicpath-path="TranscriptExtractorPopup.tsx">Extracting...</span>
          </SortableContainer> : <SortableContainer dndKitId="a82bf192-8017-4917-8e81-fa112c79757c" containerType="regular" prevTag="div" className="flex items-center justify-center gap-2" data-magicpath-id="5" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <Play className="w-5 h-5" data-magicpath-id="6" data-magicpath-path="TranscriptExtractorPopup.tsx" />
            <span data-magicpath-id="7" data-magicpath-path="TranscriptExtractorPopup.tsx">Extract Transcript</span>
          </SortableContainer>}
      </SortableContainer>
    </SortableContainer>;

  // Shared Export Options Component
  const ExportOptionsSection = () => <SortableContainer dndKitId="5809c4cd-da8d-40f7-abaa-1a7be3645f86" containerType="regular" prevTag="div" className="space-y-4" data-magicpath-id="8" data-magicpath-path="TranscriptExtractorPopup.tsx">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white" data-magicpath-id="9" data-magicpath-path="TranscriptExtractorPopup.tsx">
        <span data-magicpath-id="10" data-magicpath-path="TranscriptExtractorPopup.tsx">Export Options</span>
      </h3>
      
      {/* Export Format */}
      <SortableContainer dndKitId="427ce70d-81e5-4182-8e9f-01baa5bd5913" containerType="regular" prevTag="div" className="space-y-2" data-magicpath-id="11" data-magicpath-path="TranscriptExtractorPopup.tsx">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="12" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <span data-magicpath-id="13" data-magicpath-path="TranscriptExtractorPopup.tsx">Format</span>
        </label>
        <SortableContainer dndKitId="57907b7b-b5b9-4350-8e5f-19a2ab873d8b" containerType="regular" prevTag="div" className="relative" data-magicpath-id="14" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <SortableContainer dndKitId="2afc105f-b36b-43a7-a3df-420415fcd850" containerType="regular" prevTag="button" onClick={() => setShowFormatDropdown(!showFormatDropdown)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-magicpath-id="15" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize" data-magicpath-id="16" data-magicpath-path="TranscriptExtractorPopup.tsx">{exportFormat}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" data-magicpath-id="17" data-magicpath-path="TranscriptExtractorPopup.tsx" />
          </SortableContainer>
          
          {showFormatDropdown && <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10" data-magicpath-id="18" data-magicpath-path="TranscriptExtractorPopup.tsx">
              {['markdown', 'txt', 'json'].map(format => <SortableContainer dndKitId="a6dba5e2-9f86-4a35-ac19-3c0d7b0042b4" containerType="regular" prevTag="button" key={format} onClick={() => {
            setExportFormat(format as any);
            setShowFormatDropdown(false);
          }} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg capitalize" data-magicpath-id="19" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <span data-magicpath-id="20" data-magicpath-path="TranscriptExtractorPopup.tsx">{format}</span>
                </SortableContainer>)}
            </div>}
        </SortableContainer>
      </SortableContainer>

      {/* Include Timestamps Toggle */}
      <SortableContainer dndKitId="90ac1f51-d5bd-42d4-9da0-8f73bad1ad19" containerType="regular" prevTag="div" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg" data-magicpath-id="21" data-magicpath-path="TranscriptExtractorPopup.tsx">
        <SortableContainer dndKitId="55b95c29-1074-49e8-9678-4f0c451a7396" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="22" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <Clock className="w-4 h-4 text-gray-500" data-magicpath-id="23" data-magicpath-path="TranscriptExtractorPopup.tsx" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="24" data-magicpath-path="TranscriptExtractorPopup.tsx">Include Timestamps</span>
        </SortableContainer>
        <SortableContainer dndKitId="dcdca1be-360a-42c8-9e76-c9263586c028" containerType="regular" prevTag="button" onClick={() => setIncludeTimestamps(!includeTimestamps)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeTimestamps ? 'bg-[#4CAF50]' : 'bg-gray-300 dark:bg-gray-600'}`} data-magicpath-id="25" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeTimestamps ? 'translate-x-6' : 'translate-x-1'}`} data-magicpath-id="26" data-magicpath-path="TranscriptExtractorPopup.tsx" />
        </SortableContainer>
      </SortableContainer>

      {/* Export Target */}
      <SortableContainer dndKitId="4f17dd0f-f5c9-4354-900d-7cc0eb0c522c" containerType="regular" prevTag="div" className="space-y-2" data-magicpath-id="27" data-magicpath-path="TranscriptExtractorPopup.tsx">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="28" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <span data-magicpath-id="29" data-magicpath-path="TranscriptExtractorPopup.tsx">Export To</span>
        </label>
        <SortableContainer dndKitId="90545f4b-2239-4f4c-9f29-ecc627ef2dc4" containerType="regular" prevTag="div" className="relative" data-magicpath-id="30" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <SortableContainer dndKitId="f46b09f3-12fe-4e42-925b-53c8a1f618e3" containerType="regular" prevTag="button" onClick={() => setShowTargetDropdown(!showTargetDropdown)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-magicpath-id="31" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <SortableContainer dndKitId="0669701e-2fcc-4372-9a8c-2fcc5e642270" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="32" data-magicpath-path="TranscriptExtractorPopup.tsx">
              {React.createElement(getTargetIcon(exportTarget), {
              className: "w-4 h-4 text-gray-500"
            })}
              <span className="text-sm text-gray-700 dark:text-gray-300" data-magicpath-id="33" data-magicpath-path="TranscriptExtractorPopup.tsx">{getTargetLabel(exportTarget)}</span>
            </SortableContainer>
            <ChevronDown className="w-4 h-4 text-gray-500" data-magicpath-id="34" data-magicpath-path="TranscriptExtractorPopup.tsx" />
          </SortableContainer>
          
          {showTargetDropdown && <SortableContainer dndKitId="c0a9abb1-322f-40ca-9e1e-bf0216b8479f" containerType="collection" prevTag="div" className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10" data-magicpath-id="35" data-magicpath-path="TranscriptExtractorPopup.tsx">
              {exportTargets.map(target => {
            const Icon = target.icon;
            return <button key={target.id} onClick={() => {
              setExportTarget(target.id as any);
              setShowTargetDropdown(false);
            }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg" data-magicpath-uuid={(target as any)["mpid"] ?? "unsafe"} data-magicpath-id="36" data-magicpath-path="TranscriptExtractorPopup.tsx">
                    <Icon className="w-4 h-4 text-gray-500" data-magicpath-uuid={(target as any)["mpid"] ?? "unsafe"} data-magicpath-id="37" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                    <span data-magicpath-uuid={(target as any)["mpid"] ?? "unsafe"} data-magicpath-field="label:string" data-magicpath-id="38" data-magicpath-path="TranscriptExtractorPopup.tsx">{target.label}</span>
                  </button>;
          })}
            </SortableContainer>}
        </SortableContainer>
      </SortableContainer>
    </SortableContainer>;

  // Shared History Section Component
  const HistorySection = ({
    showTitle = true,
    limit
  }: {
    showTitle?: boolean;
    limit?: number;
  }) => <SortableContainer dndKitId="f671e0eb-0871-43b2-97e0-f2e0c14287f9" containerType="regular" prevTag="div" className="space-y-4" data-magicpath-id="39" data-magicpath-path="TranscriptExtractorPopup.tsx">
      {showTitle && <h3 className="text-sm font-semibold text-gray-900 dark:text-white" data-magicpath-id="40" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <span data-magicpath-id="41" data-magicpath-path="TranscriptExtractorPopup.tsx">History</span>
        </h3>}
      
      {mockHistory.length === 0 ? <SortableContainer dndKitId="bf30dd45-bf88-4dea-a0cd-beb162e47b02" containerType="regular" prevTag="div" className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400" data-magicpath-id="42" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <History className="w-8 h-8 mb-2 opacity-50" data-magicpath-id="43" data-magicpath-path="TranscriptExtractorPopup.tsx" />
          <p className="text-sm text-center" data-magicpath-id="44" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <span data-magicpath-id="45" data-magicpath-path="TranscriptExtractorPopup.tsx">No transcripts extracted yet</span>
          </p>
        </SortableContainer> : <div className="space-y-2" data-magicpath-id="46" data-magicpath-path="TranscriptExtractorPopup.tsx">
          {(limit ? mockHistory.slice(0, limit) : mockHistory).map(entry => <SortableContainer dndKitId="e2ea6625-67a1-4700-b58a-6919d2b974cf" containerType="regular" prevTag="div" key={entry.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-magicpath-id="47" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <SortableContainer dndKitId="5c6e7b40-cb06-47b8-b708-f04ff01fd7d1" containerType="regular" prevTag="div" className="flex items-center justify-between" data-magicpath-id="48" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <SortableContainer dndKitId="18a625be-058f-4782-9427-07084a6d71af" containerType="regular" prevTag="div" className="flex-1 min-w-0" data-magicpath-id="49" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate" data-magicpath-id="50" data-magicpath-path="TranscriptExtractorPopup.tsx">
                    <span data-magicpath-id="51" data-magicpath-path="TranscriptExtractorPopup.tsx">{entry.title}</span>
                  </h4>
                  <SortableContainer dndKitId="2274858f-4748-4b63-b2b1-f73eb0df33be" containerType="regular" prevTag="div" className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="52" data-magicpath-path="TranscriptExtractorPopup.tsx">
                    <SortableContainer dndKitId="eb36700f-0251-4c88-93ca-1d26099cd299" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="53" data-magicpath-path="TranscriptExtractorPopup.tsx">
                      <Calendar className="w-3 h-3" data-magicpath-id="54" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                      <span data-magicpath-id="55" data-magicpath-path="TranscriptExtractorPopup.tsx">{entry.date} {entry.time}</span>
                    </SortableContainer>
                    <span data-magicpath-id="56" data-magicpath-path="TranscriptExtractorPopup.tsx">•</span>
                    <span data-magicpath-id="57" data-magicpath-path="TranscriptExtractorPopup.tsx">{entry.format}</span>
                    <span data-magicpath-id="58" data-magicpath-path="TranscriptExtractorPopup.tsx">•</span>
                    <span data-magicpath-id="59" data-magicpath-path="TranscriptExtractorPopup.tsx">{entry.size}</span>
                  </SortableContainer>
                </SortableContainer>
                
                <SortableContainer dndKitId="7eb3b375-97a9-498e-862c-588c185d014f" containerType="regular" prevTag="button" onClick={() => handleExportHistory(entry)} className="p-1.5 text-gray-500 hover:text-[#4CAF50] hover:bg-[#4CAF50] hover:bg-opacity-10 rounded-lg transition-colors" data-magicpath-id="60" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <Download className="w-4 h-4" data-magicpath-id="61" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                </SortableContainer>
              </SortableContainer>
            </SortableContainer>)}
        </div>}
    </SortableContainer>;
  return <SortableContainer dndKitId="7600c90a-742b-4cae-9e8f-094c0317d090" containerType="regular" prevTag="div" className="w-[400px] h-[600px] bg-white dark:bg-gray-900 flex flex-col shadow-2xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800" data-magicpath-id="62" data-magicpath-path="TranscriptExtractorPopup.tsx">
      {/* Header */}
      <SortableContainer dndKitId="92d50f8c-dec7-4f44-8ddb-1f25a57a93f9" containerType="regular" prevTag="header" className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800" data-magicpath-id="63" data-magicpath-path="TranscriptExtractorPopup.tsx">
        <SortableContainer dndKitId="8b774e8b-16f7-44ce-bc69-553cb040fc57" containerType="regular" prevTag="div" className="flex items-center space-x-3" data-magicpath-id="64" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <SortableContainer dndKitId="45ce1525-882c-487a-939a-3f62282b494a" containerType="regular" prevTag="div" className="p-2 bg-[#4CAF50] rounded-lg" data-magicpath-id="65" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <FileText className="w-4 h-4 text-white" data-magicpath-id="66" data-magicpath-path="TranscriptExtractorPopup.tsx" />
          </SortableContainer>
          <SortableContainer dndKitId="535d8b1f-a824-4835-b3be-7444ac59dd62" containerType="regular" prevTag="div" data-magicpath-id="67" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white" data-magicpath-id="68" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <span data-magicpath-id="69" data-magicpath-path="TranscriptExtractorPopup.tsx">Transcript Extractor</span>
            </h1>
          </SortableContainer>
        </SortableContainer>
        
        <SortableContainer dndKitId="d2f5197c-14ff-4899-a1cc-8891cd9f9073" containerType="regular" prevTag="button" onClick={handleThemeToggle} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700" aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} data-magicpath-id="70" data-magicpath-path="TranscriptExtractorPopup.tsx">
          {isDarkMode ? <Sun className="w-4 h-4 text-yellow-500" data-magicpath-id="71" data-magicpath-path="TranscriptExtractorPopup.tsx" /> : <Moon className="w-4 h-4 text-gray-600" data-magicpath-id="72" data-magicpath-path="TranscriptExtractorPopup.tsx" />}
        </SortableContainer>
      </SortableContainer>

      {/* Tab Navigation */}
      <SortableContainer dndKitId="331468ce-28ed-4688-9bca-8d0795f41122" containerType="collection" prevTag="nav" className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" data-magicpath-id="73" data-magicpath-path="TranscriptExtractorPopup.tsx">
        {tabs.map(tab => {
        const Icon = tab.icon;
        return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-200 ${activeTab === tab.id ? 'text-[#4CAF50] border-b-2 border-[#4CAF50] bg-white dark:bg-gray-900' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`} data-magicpath-uuid={(tab as any)["mpid"] ?? "unsafe"} data-magicpath-id="74" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <Icon className="w-4 h-4" data-magicpath-uuid={(tab as any)["mpid"] ?? "unsafe"} data-magicpath-id="75" data-magicpath-path="TranscriptExtractorPopup.tsx" />
              <span data-magicpath-uuid={(tab as any)["mpid"] ?? "unsafe"} data-magicpath-field="label:string" data-magicpath-id="76" data-magicpath-path="TranscriptExtractorPopup.tsx">{tab.label}</span>
            </button>;
      })}
      </SortableContainer>

      {/* Tab Content */}
      <SortableContainer dndKitId="2979307a-37b6-4161-9663-a49e657002c6" containerType="regular" prevTag="main" className="flex-1 overflow-y-auto" data-magicpath-id="77" data-magicpath-path="TranscriptExtractorPopup.tsx">
        {activeTab === 'extract' && <SortableContainer dndKitId="6f0d48a5-3fe5-4068-9a45-9d3d257cf96e" containerType="regular" prevTag="div" className="p-6 space-y-6" data-magicpath-id="78" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <ExtractSection data-magicpath-id="79" data-magicpath-path="TranscriptExtractorPopup.tsx" />
            <ExportOptionsSection data-magicpath-id="80" data-magicpath-path="TranscriptExtractorPopup.tsx" />
          </SortableContainer>}

        {activeTab === 'ai-notes' && <SortableContainer dndKitId="669124b6-1336-45b5-848e-11d45c83097e" containerType="regular" prevTag="div" className="p-6 space-y-6" data-magicpath-id="81" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <SortableContainer dndKitId="0f0b8576-a235-4904-812f-cf3276ea3032" containerType="regular" prevTag="div" data-magicpath-id="82" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4" data-magicpath-id="83" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <span data-magicpath-id="84" data-magicpath-path="TranscriptExtractorPopup.tsx">Extract</span>
              </h2>
              <ExtractSection data-magicpath-id="85" data-magicpath-path="TranscriptExtractorPopup.tsx" />
            </SortableContainer>
            
            <SortableContainer dndKitId="f1a98d01-a99e-49c7-ba0a-de9bdb902f6d" containerType="regular" prevTag="div" data-magicpath-id="86" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <ExportOptionsSection data-magicpath-id="87" data-magicpath-path="TranscriptExtractorPopup.tsx" />
            </SortableContainer>
            
            <SortableContainer dndKitId="f120c0a0-9d95-45e6-aacf-1f37c9a28816" containerType="regular" prevTag="div" data-magicpath-id="88" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <HistorySection limit={5} data-magicpath-id="89" data-magicpath-path="TranscriptExtractorPopup.tsx" />
            </SortableContainer>
          </SortableContainer>}

        {activeTab === 'history' && <SortableContainer dndKitId="53cc32c1-e6fd-42d8-96ee-3fbe40043592" containerType="regular" prevTag="div" className="p-6" data-magicpath-id="90" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4" data-magicpath-id="91" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <span data-magicpath-id="92" data-magicpath-path="TranscriptExtractorPopup.tsx">All Extractions</span>
            </h2>
            <HistorySection showTitle={false} data-magicpath-id="93" data-magicpath-path="TranscriptExtractorPopup.tsx" />
          </SortableContainer>}
      </SortableContainer>

      {/* Footer */}
      <SortableContainer dndKitId="a2468835-001f-48e4-9800-da5132f5792c" containerType="regular" prevTag="footer" className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700" data-magicpath-id="94" data-magicpath-path="TranscriptExtractorPopup.tsx">
        <SortableContainer dndKitId="624dbed1-10d4-4828-a342-bf1d72e82eb0" containerType="regular" prevTag="div" className="flex items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="95" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <SortableContainer dndKitId="d6ef658d-ded0-4701-a9b1-9739a5f073b6" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="96" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <Lock className="w-3 h-3" data-magicpath-id="97" data-magicpath-path="TranscriptExtractorPopup.tsx" />
            <span data-magicpath-id="98" data-magicpath-path="TranscriptExtractorPopup.tsx">Local-first</span>
          </SortableContainer>
          <span data-magicpath-id="99" data-magicpath-path="TranscriptExtractorPopup.tsx">•</span>
          <SortableContainer dndKitId="66aa2db6-989d-4875-bcd5-31c70486e7ec" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="100" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <Github className="w-3 h-3" data-magicpath-id="101" data-magicpath-path="TranscriptExtractorPopup.tsx" />
            <span data-magicpath-id="102" data-magicpath-path="TranscriptExtractorPopup.tsx">Open Source</span>
          </SortableContainer>
          <span data-magicpath-id="103" data-magicpath-path="TranscriptExtractorPopup.tsx">•</span>
          <span data-magicpath-id="104" data-magicpath-path="TranscriptExtractorPopup.tsx">MIT License</span>
        </SortableContainer>
      </SortableContainer>
    </SortableContainer>;
};