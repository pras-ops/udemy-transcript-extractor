"use client";

import { SortableContainer } from "@/dnd-kit/SortableContainer";
import * as React from "react";
import { useState } from 'react';
import { FileText, Sun, Moon, Download, ChevronDown, Clock, Clipboard, Play, Brain, HelpCircle, Lightbulb, History, Calendar, Lock, Github } from 'lucide-react';
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
  mpid: "c9cc0aa3-2add-4814-b471-a69a5655f6cc"
}, {
  id: '2',
  title: 'TypeScript Basics',
  date: '2024-01-14',
  format: 'TXT',
  size: '1.8 KB',
  mpid: "495e03df-4214-49d4-bb08-34a3ec515f4c"
}, {
  id: '3',
  title: 'Node.js Express Setup',
  date: '2024-01-13',
  format: 'JSON',
  size: '3.1 KB',
  mpid: "01df30f8-fed9-4271-875e-494b935a6148"
}, {
  id: '4',
  title: 'CSS Grid Layout',
  date: '2024-01-12',
  format: 'Markdown',
  size: '1.5 KB',
  mpid: "319e231e-16d3-4c25-a8bc-a11159c6ffa4"
}];
export const TranscriptExtractorPopup = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'extract' | 'ai-notes' | 'history'>('extract');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'txt' | 'json'>('markdown');
  const [exportTarget, setExportTarget] = useState<'clipboard' | 'download'>('clipboard');
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiProcessing, setAiProcessing] = useState<string | null>(null);
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
  const handleAiAction = async (action: string) => {
    setAiProcessing(action);
    // Simulate AI processing
    setTimeout(() => {
      setAiProcessing(null);
    }, 2500);
  };
  const handleExportHistory = (entry: HistoryEntry) => {
    console.log('Exporting:', entry.title);
  };
  const tabs = [{
    id: 'extract' as const,
    label: 'Extract',
    icon: FileText,
    mpid: "2530face-7bcc-4625-819c-b03c0cf766f4"
  }, {
    id: 'ai-notes' as const,
    label: 'AI Notes',
    icon: Brain,
    mpid: "16730b9b-e57f-448c-bf30-1a305cc1a783"
  }, {
    id: 'history' as const,
    label: 'History',
    icon: History,
    mpid: "19bcc455-c456-48a4-afdd-cf07cf1b70f6"
  }] as any[];
  return <SortableContainer dndKitId="4a72e4ab-4a2b-48ff-89b8-900046bc36bc" containerType="regular" prevTag="div" className="w-[400px] h-[600px] bg-white dark:bg-gray-900 flex flex-col shadow-2xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800" data-magicpath-id="0" data-magicpath-path="TranscriptExtractorPopup.tsx">
      {/* Header */}
      <SortableContainer dndKitId="d865cf04-f621-419e-9903-ddcb47eeb3b0" containerType="regular" prevTag="header" className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" data-magicpath-id="1" data-magicpath-path="TranscriptExtractorPopup.tsx">
        <SortableContainer dndKitId="afb69b83-ce61-4c87-9e4f-5767599ffe02" containerType="regular" prevTag="div" className="flex items-center space-x-3" data-magicpath-id="2" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <SortableContainer dndKitId="cf5bdb0a-fc91-4b7e-8a3d-6c19554ddbdd" containerType="regular" prevTag="div" className="p-2 bg-[#4CAF50] rounded-lg" data-magicpath-id="3" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <FileText className="w-4 h-4 text-white" data-magicpath-id="4" data-magicpath-path="TranscriptExtractorPopup.tsx" />
          </SortableContainer>
          <SortableContainer dndKitId="88f6c2fc-d38c-4922-880f-4a6fceb6e7e1" containerType="regular" prevTag="div" data-magicpath-id="5" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white" data-magicpath-id="6" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <span data-magicpath-id="7" data-magicpath-path="TranscriptExtractorPopup.tsx">Transcript Extractor</span>
            </h1>
          </SortableContainer>
        </SortableContainer>
        
        <SortableContainer dndKitId="ebd36032-567d-421d-8633-3be2fcead43f" containerType="regular" prevTag="button" onClick={handleThemeToggle} className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600" aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} data-magicpath-id="8" data-magicpath-path="TranscriptExtractorPopup.tsx">
          {isDarkMode ? <Sun className="w-4 h-4 text-yellow-500" data-magicpath-id="9" data-magicpath-path="TranscriptExtractorPopup.tsx" /> : <Moon className="w-4 h-4 text-gray-600" data-magicpath-id="10" data-magicpath-path="TranscriptExtractorPopup.tsx" />}
        </SortableContainer>
      </SortableContainer>

      {/* Tab Navigation */}
      <SortableContainer dndKitId="74a765e2-747c-41aa-805d-e1f4c61fd983" containerType="collection" prevTag="nav" className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" data-magicpath-id="11" data-magicpath-path="TranscriptExtractorPopup.tsx">
        {tabs.map(tab => {
        const Icon = tab.icon;
        return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-200 ${activeTab === tab.id ? 'text-[#4CAF50] border-b-2 border-[#4CAF50] bg-white dark:bg-gray-900' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`} data-magicpath-uuid={(tab as any)["mpid"] ?? "unsafe"} data-magicpath-id="12" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <Icon className="w-4 h-4" data-magicpath-uuid={(tab as any)["mpid"] ?? "unsafe"} data-magicpath-id="13" data-magicpath-path="TranscriptExtractorPopup.tsx" />
              <span data-magicpath-uuid={(tab as any)["mpid"] ?? "unsafe"} data-magicpath-field="label:string" data-magicpath-id="14" data-magicpath-path="TranscriptExtractorPopup.tsx">{tab.label}</span>
            </button>;
      })}
      </SortableContainer>

      {/* Tab Content */}
      <SortableContainer dndKitId="7749eb0c-26ff-42b6-8bc4-0cb542b66cc8" containerType="regular" prevTag="main" className="flex-1 overflow-hidden" data-magicpath-id="15" data-magicpath-path="TranscriptExtractorPopup.tsx">
        {activeTab === 'extract' && <SortableContainer dndKitId="5cc360d3-37de-4c40-88e3-49cc8d4791a9" containerType="regular" prevTag="div" className="p-6 space-y-6 h-full overflow-y-auto" data-magicpath-id="16" data-magicpath-path="TranscriptExtractorPopup.tsx">
            {/* Main Extract Button */}
            <SortableContainer dndKitId="0e2b4ab7-3741-4174-8774-2a843ae8d3f6" containerType="regular" prevTag="div" className="text-center" data-magicpath-id="17" data-magicpath-path="TranscriptExtractorPopup.tsx">
              <SortableContainer dndKitId="afd180a1-503f-4494-b862-d1faf92ba88b" containerType="regular" prevTag="button" onClick={handleExtractTranscript} disabled={isExtracting} className={`w-full py-4 px-6 rounded-xl text-white font-medium transition-all duration-200 ${isExtracting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#4CAF50] hover:bg-[#45a049] shadow-lg hover:shadow-xl'}`} data-magicpath-id="18" data-magicpath-path="TranscriptExtractorPopup.tsx">
                {isExtracting ? <SortableContainer dndKitId="550a42c5-2551-47b1-8c05-33b3a5ab3aaf" containerType="regular" prevTag="div" className="flex items-center justify-center gap-2" data-magicpath-id="19" data-magicpath-path="TranscriptExtractorPopup.tsx">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" data-magicpath-id="20" data-magicpath-path="TranscriptExtractorPopup.tsx"></div>
                    <span data-magicpath-id="21" data-magicpath-path="TranscriptExtractorPopup.tsx">Extracting...</span>
                  </SortableContainer> : <SortableContainer dndKitId="80cd247a-7f32-415e-8667-0e8f61c2faad" containerType="regular" prevTag="div" className="flex items-center justify-center gap-2" data-magicpath-id="22" data-magicpath-path="TranscriptExtractorPopup.tsx">
                    <Play className="w-5 h-5" data-magicpath-id="23" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                    <span data-magicpath-id="24" data-magicpath-path="TranscriptExtractorPopup.tsx">Extract Transcript</span>
                  </SortableContainer>}
              </SortableContainer>
            </SortableContainer>

            {/* Options */}
            <SortableContainer dndKitId="b989022e-0a86-4792-a94d-78968c1bc552" containerType="regular" prevTag="div" className="space-y-4" data-magicpath-id="25" data-magicpath-path="TranscriptExtractorPopup.tsx">
              {/* Timestamps Toggle */}
              <SortableContainer dndKitId="5a520004-1258-4850-8598-be181da5ee6c" containerType="regular" prevTag="div" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg" data-magicpath-id="26" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <SortableContainer dndKitId="872ccf71-f7ac-4a73-bf7a-3c631277e420" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="27" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <Clock className="w-4 h-4 text-gray-500" data-magicpath-id="28" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="29" data-magicpath-path="TranscriptExtractorPopup.tsx">Include Timestamps</span>
                </SortableContainer>
                <SortableContainer dndKitId="159a38e5-170b-44ff-a7c5-f8bd91ca89b0" containerType="regular" prevTag="button" onClick={() => setIncludeTimestamps(!includeTimestamps)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeTimestamps ? 'bg-[#4CAF50]' : 'bg-gray-300 dark:bg-gray-600'}`} data-magicpath-id="30" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeTimestamps ? 'translate-x-6' : 'translate-x-1'}`} data-magicpath-id="31" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                </SortableContainer>
              </SortableContainer>

              {/* Export Format */}
              <SortableContainer dndKitId="d9d35bcd-e358-4f21-8b27-fad4f5fbab82" containerType="regular" prevTag="div" className="space-y-2" data-magicpath-id="32" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="33" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <span data-magicpath-id="34" data-magicpath-path="TranscriptExtractorPopup.tsx">Export Format</span>
                </label>
                <SortableContainer dndKitId="5fb0e2a2-563d-4bc3-9552-1ea598cf7dbe" containerType="regular" prevTag="div" className="relative" data-magicpath-id="35" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <SortableContainer dndKitId="309e1289-f8a7-41d7-b808-095eb571e406" containerType="regular" prevTag="button" onClick={() => setShowFormatDropdown(!showFormatDropdown)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-magicpath-id="36" data-magicpath-path="TranscriptExtractorPopup.tsx">
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize" data-magicpath-id="37" data-magicpath-path="TranscriptExtractorPopup.tsx">{exportFormat}</span>
                    <ChevronDown className="w-4 h-4 text-gray-500" data-magicpath-id="38" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                  </SortableContainer>
                  
                  {showFormatDropdown && <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10" data-magicpath-id="39" data-magicpath-path="TranscriptExtractorPopup.tsx">
                      {['markdown', 'txt', 'json'].map(format => <SortableContainer dndKitId="ec732506-3377-456e-bd2d-9806ceb1394c" containerType="regular" prevTag="button" key={format} onClick={() => {
                  setExportFormat(format as any);
                  setShowFormatDropdown(false);
                }} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg capitalize" data-magicpath-id="40" data-magicpath-path="TranscriptExtractorPopup.tsx">
                          <span data-magicpath-id="41" data-magicpath-path="TranscriptExtractorPopup.tsx">{format}</span>
                        </SortableContainer>)}
                    </div>}
                </SortableContainer>
              </SortableContainer>

              {/* Export Target */}
              <SortableContainer dndKitId="19cd00b5-2960-45b3-8b44-07a195f54e64" containerType="regular" prevTag="div" className="space-y-2" data-magicpath-id="42" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="43" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <span data-magicpath-id="44" data-magicpath-path="TranscriptExtractorPopup.tsx">Export To</span>
                </label>
                <SortableContainer dndKitId="37003c35-1525-46bc-9935-5d2c62149e77" containerType="regular" prevTag="div" className="relative" data-magicpath-id="45" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <SortableContainer dndKitId="9b0ddf25-d782-4e64-ad29-63abc716a408" containerType="regular" prevTag="button" onClick={() => setShowTargetDropdown(!showTargetDropdown)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-magicpath-id="46" data-magicpath-path="TranscriptExtractorPopup.tsx">
                    <SortableContainer dndKitId="e399f4ab-a448-41b7-8bc9-abadee708255" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="47" data-magicpath-path="TranscriptExtractorPopup.tsx">
                      {exportTarget === 'clipboard' ? <Clipboard className="w-4 h-4 text-gray-500" data-magicpath-id="48" data-magicpath-path="TranscriptExtractorPopup.tsx" /> : <Download className="w-4 h-4 text-gray-500" data-magicpath-id="49" data-magicpath-path="TranscriptExtractorPopup.tsx" />}
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize" data-magicpath-id="50" data-magicpath-path="TranscriptExtractorPopup.tsx">{exportTarget}</span>
                    </SortableContainer>
                    <ChevronDown className="w-4 h-4 text-gray-500" data-magicpath-id="51" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                  </SortableContainer>
                  
                  {showTargetDropdown && <SortableContainer dndKitId="7d59b82d-2292-4900-8a1a-b145b7c52415" containerType="collection" prevTag="div" className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10" data-magicpath-id="52" data-magicpath-path="TranscriptExtractorPopup.tsx">
                      {[{
                  id: 'clipboard',
                  label: 'Clipboard',
                  icon: Clipboard,
                  mpid: "a6c1e533-46e7-4ffd-b297-3308858cc209"
                }, {
                  id: 'download',
                  label: 'Download',
                  icon: Download,
                  mpid: "370f9cc4-79d5-4071-bd62-c01050275533"
                }].map(target => {
                  const Icon = target.icon;
                  return <button key={target.id} onClick={() => {
                    setExportTarget(target.id as any);
                    setShowTargetDropdown(false);
                  }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg" data-magicpath-uuid={(target as any)["mpid"] ?? "unsafe"} data-magicpath-id="53" data-magicpath-path="TranscriptExtractorPopup.tsx">
                            <Icon className="w-4 h-4 text-gray-500" data-magicpath-uuid={(target as any)["mpid"] ?? "unsafe"} data-magicpath-id="54" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                            <span data-magicpath-uuid={(target as any)["mpid"] ?? "unsafe"} data-magicpath-field="label:unknown" data-magicpath-id="55" data-magicpath-path="TranscriptExtractorPopup.tsx">{target.label}</span>
                          </button>;
                })}
                    </SortableContainer>}
                </SortableContainer>
              </SortableContainer>
            </SortableContainer>
          </SortableContainer>}

        {activeTab === 'ai-notes' && <SortableContainer dndKitId="868f5489-8f34-4a8e-91ad-01fa3fbfa6cd" containerType="collection" prevTag="div" className="p-6 space-y-4 h-full overflow-y-auto" data-magicpath-id="56" data-magicpath-path="TranscriptExtractorPopup.tsx">
            {[{
          id: 'summarize',
          title: 'Summarize',
          description: 'Generate a concise summary',
          icon: FileText,
          mpid: "7166d02f-96e2-49cc-b55a-4424d5536c65"
        }, {
          id: 'quiz',
          title: 'Generate Quiz',
          description: 'Create practice questions',
          icon: HelpCircle,
          mpid: "3ab5af5f-b6f2-4464-920a-ed8e1ba83714"
        }, {
          id: 'takeaways',
          title: 'Key Takeaways',
          description: 'Extract main points',
          icon: Lightbulb,
          mpid: "ad529494-cd96-4261-b927-112900488c2e"
        }].map(action => {
          const Icon = action.icon;
          const isProcessing = aiProcessing === action.id;
          return <div key={action.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700" data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-id="57" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <div className="flex items-start justify-between" data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-id="58" data-magicpath-path="TranscriptExtractorPopup.tsx">
                    <div className="flex items-start gap-3" data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-id="59" data-magicpath-path="TranscriptExtractorPopup.tsx">
                      <div className="p-2 bg-[#4CAF50] bg-opacity-10 rounded-lg" data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-id="60" data-magicpath-path="TranscriptExtractorPopup.tsx">
                        <Icon className="w-4 h-4 text-[#4CAF50]" data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-id="61" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                      </div>
                      <div data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-id="62" data-magicpath-path="TranscriptExtractorPopup.tsx">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white" data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-id="63" data-magicpath-path="TranscriptExtractorPopup.tsx">
                          <span data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-field="title:unknown" data-magicpath-id="64" data-magicpath-path="TranscriptExtractorPopup.tsx">{action.title}</span>
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1" data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-id="65" data-magicpath-path="TranscriptExtractorPopup.tsx">
                          <span data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-field="description:unknown" data-magicpath-id="66" data-magicpath-path="TranscriptExtractorPopup.tsx">{action.description}</span>
                        </p>
                      </div>
                    </div>
                    
                    <button onClick={() => handleAiAction(action.id)} disabled={isProcessing} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${isProcessing ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-[#4CAF50] text-white hover:bg-[#45a049] shadow-sm hover:shadow-md'}`} data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-id="67" data-magicpath-path="TranscriptExtractorPopup.tsx">
                      {isProcessing ? <div className="flex items-center gap-1" data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-id="68" data-magicpath-path="TranscriptExtractorPopup.tsx">
                          <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-id="69" data-magicpath-path="TranscriptExtractorPopup.tsx"></div>
                          <span data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-id="70" data-magicpath-path="TranscriptExtractorPopup.tsx">Running...</span>
                        </div> : <span data-magicpath-uuid={(action as any)["mpid"] ?? "unsafe"} data-magicpath-id="71" data-magicpath-path="TranscriptExtractorPopup.tsx">Run</span>}
                    </button>
                  </div>
                </div>;
        })}
          </SortableContainer>}

        {activeTab === 'history' && <SortableContainer dndKitId="52d7036f-7b8e-43c5-a55d-c272de5cd7c0" containerType="regular" prevTag="div" className="h-full overflow-y-auto" data-magicpath-id="72" data-magicpath-path="TranscriptExtractorPopup.tsx">
            {mockHistory.length === 0 ? <SortableContainer dndKitId="0c64d122-c67b-4232-abcc-709f805a704d" containerType="regular" prevTag="div" className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-6" data-magicpath-id="73" data-magicpath-path="TranscriptExtractorPopup.tsx">
                <History className="w-8 h-8 mb-2 opacity-50" data-magicpath-id="74" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                <p className="text-sm text-center" data-magicpath-id="75" data-magicpath-path="TranscriptExtractorPopup.tsx">
                  <span data-magicpath-id="76" data-magicpath-path="TranscriptExtractorPopup.tsx">No transcripts extracted yet</span>
                </p>
              </SortableContainer> : <SortableContainer dndKitId="472dc7a5-d316-4149-a015-c7cc9426cd35" containerType="collection" prevTag="div" className="p-4 space-y-2" data-magicpath-id="77" data-magicpath-path="TranscriptExtractorPopup.tsx">
                {mockHistory.map(entry => <div key={entry.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="78" data-magicpath-path="TranscriptExtractorPopup.tsx">
                    <div className="flex items-center justify-between" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="79" data-magicpath-path="TranscriptExtractorPopup.tsx">
                      <div className="flex-1 min-w-0" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="80" data-magicpath-path="TranscriptExtractorPopup.tsx">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="81" data-magicpath-path="TranscriptExtractorPopup.tsx">
                          <span data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-field="title:string" data-magicpath-id="82" data-magicpath-path="TranscriptExtractorPopup.tsx">{entry.title}</span>
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="83" data-magicpath-path="TranscriptExtractorPopup.tsx">
                          <div className="flex items-center gap-1" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="84" data-magicpath-path="TranscriptExtractorPopup.tsx">
                            <Calendar className="w-3 h-3" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="85" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                            <span data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-field="date:string" data-magicpath-id="86" data-magicpath-path="TranscriptExtractorPopup.tsx">{entry.date}</span>
                          </div>
                          <span data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="87" data-magicpath-path="TranscriptExtractorPopup.tsx">•</span>
                          <span data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-field="format:string" data-magicpath-id="88" data-magicpath-path="TranscriptExtractorPopup.tsx">{entry.format}</span>
                          <span data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="89" data-magicpath-path="TranscriptExtractorPopup.tsx">•</span>
                          <span data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-field="size:string" data-magicpath-id="90" data-magicpath-path="TranscriptExtractorPopup.tsx">{entry.size}</span>
                        </div>
                      </div>
                      
                      <button onClick={() => handleExportHistory(entry)} className="p-1.5 text-gray-500 hover:text-[#4CAF50] hover:bg-[#4CAF50] hover:bg-opacity-10 rounded-lg transition-colors" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="91" data-magicpath-path="TranscriptExtractorPopup.tsx">
                        <Download className="w-4 h-4" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="92" data-magicpath-path="TranscriptExtractorPopup.tsx" />
                      </button>
                    </div>
                  </div>)}
              </SortableContainer>}
          </SortableContainer>}
      </SortableContainer>

      {/* Footer */}
      <SortableContainer dndKitId="9cedc287-603f-47b4-8d86-7c62db7bf7b0" containerType="regular" prevTag="footer" className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700" data-magicpath-id="93" data-magicpath-path="TranscriptExtractorPopup.tsx">
        <SortableContainer dndKitId="4e9e5daa-bfdc-462c-8499-24f27b5cc924" containerType="regular" prevTag="div" className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="94" data-magicpath-path="TranscriptExtractorPopup.tsx">
          <SortableContainer dndKitId="43ae8f00-828a-423a-96b8-22570d20e79a" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="95" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <Lock className="w-3 h-3" data-magicpath-id="96" data-magicpath-path="TranscriptExtractorPopup.tsx" />
            <span data-magicpath-id="97" data-magicpath-path="TranscriptExtractorPopup.tsx">Local-first</span>
          </SortableContainer>
          <span data-magicpath-id="98" data-magicpath-path="TranscriptExtractorPopup.tsx">•</span>
          <SortableContainer dndKitId="c0d89f3e-ae55-4643-a030-81d679c7e075" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="99" data-magicpath-path="TranscriptExtractorPopup.tsx">
            <Github className="w-3 h-3" data-magicpath-id="100" data-magicpath-path="TranscriptExtractorPopup.tsx" />
            <span data-magicpath-id="101" data-magicpath-path="TranscriptExtractorPopup.tsx">Open Source</span>
          </SortableContainer>
        </SortableContainer>
      </SortableContainer>
    </SortableContainer>;
};