"use client";

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
}
const mockHistory: HistoryEntry[] = [{
  id: '1',
  title: 'React Hooks Tutorial',
  date: '2024-01-15',
  time: '14:30',
  format: 'Markdown',
  size: '2.3 KB'
}, {
  id: '2',
  title: 'TypeScript Basics',
  date: '2024-01-14',
  time: '09:15',
  format: 'TXT',
  size: '1.8 KB'
}, {
  id: '3',
  title: 'Node.js Express Setup',
  date: '2024-01-13',
  time: '16:45',
  format: 'JSON',
  size: '3.1 KB'
}, {
  id: '4',
  title: 'CSS Grid Layout',
  date: '2024-01-12',
  time: '11:20',
  format: 'Markdown',
  size: '1.5 KB'
}, {
  id: '5',
  title: 'JavaScript ES6 Features',
  date: '2024-01-11',
  time: '13:10',
  format: 'TXT',
  size: '1.9 KB'
}, {
  id: '6',
  title: 'Vue.js Components',
  date: '2024-01-10',
  time: '10:30',
  format: 'Markdown',
  size: '2.7 KB'
}, {
  id: '7',
  title: 'Python Data Analysis',
  date: '2024-01-09',
  time: '15:25',
  format: 'JSON',
  size: '4.2 KB'
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
    icon: Clipboard
  }, {
    id: 'download',
    label: 'Download File',
    icon: Download
  }, {
    id: 'notebookllm',
    label: 'NotebookLLM',
    icon: BookOpen
  }, {
    id: 'notion',
    label: 'Notion',
    icon: ExternalLink
  }, {
    id: 'obsidian',
    label: 'Obsidian',
    icon: Zap
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
    icon: FileText
  }, {
    id: 'ai-notes' as const,
    label: 'AI Notes',
    icon: Brain
  }, {
    id: 'history' as const,
    label: 'History',
    icon: History
  }] as any[];

  // Shared Extract Section Component
  const ExtractSection = () => <div className="space-y-6">
      <button onClick={handleExtractTranscript} disabled={isExtracting} className={`w-full py-4 px-6 rounded-xl text-white font-medium transition-all duration-200 ${isExtracting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#4CAF50] hover:bg-[#45a049] shadow-lg hover:shadow-xl'}`}>
        {isExtracting ? <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Extracting...</span>
          </div> : <div className="flex items-center justify-center gap-2">
            <Play className="w-5 h-5" />
            <span>Extract Transcript</span>
          </div>}
      </button>
    </div>;

  // Shared Export Options Component
  const ExportOptionsSection = () => <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        <span>Export Options</span>
      </h3>
      
      {/* Export Format */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          <span>Format</span>
        </label>
        <div className="relative">
          <button onClick={() => setShowFormatDropdown(!showFormatDropdown)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{exportFormat}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
          
          {showFormatDropdown && <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
              {['markdown', 'txt', 'json'].map(format => <button key={format} onClick={() => {
            setExportFormat(format as any);
            setShowFormatDropdown(false);
          }} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg capitalize">
                  <span>{format}</span>
                </button>)}
            </div>}
        </div>
      </div>

      {/* Include Timestamps Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Include Timestamps</span>
        </div>
        <button onClick={() => setIncludeTimestamps(!includeTimestamps)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeTimestamps ? 'bg-[#4CAF50]' : 'bg-gray-300 dark:bg-gray-600'}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeTimestamps ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Export Target */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          <span>Export To</span>
        </label>
        <div className="relative">
          <button onClick={() => setShowTargetDropdown(!showTargetDropdown)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-2">
              {React.createElement(getTargetIcon(exportTarget), {
              className: "w-4 h-4 text-gray-500"
            })}
              <span className="text-sm text-gray-700 dark:text-gray-300">{getTargetLabel(exportTarget)}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
          
          {showTargetDropdown && <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
              {exportTargets.map(target => {
            const Icon = target.icon;
            return <button key={target.id} onClick={() => {
              setExportTarget(target.id as any);
              setShowTargetDropdown(false);
            }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span>{target.label}</span>
                  </button>;
          })}
            </div>}
        </div>
      </div>
    </div>;

  // Shared History Section Component
  const HistorySection = ({
    showTitle = true,
    limit
  }: {
    showTitle?: boolean;
    limit?: number;
  }) => <div className="space-y-4">
      {showTitle && <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          <span>History</span>
        </h3>}
      
      {mockHistory.length === 0 ? <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
          <History className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm text-center">
            <span>No transcripts extracted yet</span>
          </p>
        </div> : <div className="space-y-2">
          {(limit ? mockHistory.slice(0, limit) : mockHistory).map(entry => <div key={entry.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    <span>{entry.title}</span>
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{entry.date} {entry.time}</span>
                    </div>
                    <span>•</span>
                    <span>{entry.format}</span>
                    <span>•</span>
                    <span>{entry.size}</span>
                  </div>
                </div>
                
                <button onClick={() => handleExportHistory(entry)} className="p-1.5 text-gray-500 hover:text-[#4CAF50] hover:bg-[#4CAF50] hover:bg-opacity-10 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>)}
        </div>}
    </div>;
  return <div className="w-[400px] h-[600px] bg-white dark:bg-gray-900 flex flex-col shadow-2xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#4CAF50] rounded-lg">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
              <span>Transcript Extractor</span>
            </h1>
          </div>
        </div>
        
        <button onClick={handleThemeToggle} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700" aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDarkMode ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-gray-600" />}
        </button>
      </header>

      {/* Tab Navigation */}
      <nav className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {tabs.map(tab => {
        const Icon = tab.icon;
        return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-200 ${activeTab === tab.id ? 'text-[#4CAF50] border-b-2 border-[#4CAF50] bg-white dark:bg-gray-900' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>;
      })}
      </nav>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'extract' && <div className="p-6 space-y-6">
            <ExtractSection />
            <ExportOptionsSection />
          </div>}

        {activeTab === 'ai-notes' && <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <span>Extract</span>
              </h2>
              <ExtractSection />
            </div>
            
            <div>
              <ExportOptionsSection />
            </div>
            
            <div>
              <HistorySection limit={5} />
            </div>
          </div>}

        {activeTab === 'history' && <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              <span>All Extractions</span>
            </h2>
            <HistorySection showTitle={false} />
          </div>}
      </main>

      {/* Footer */}
      <footer className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Local-first</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Github className="w-3 h-3" />
            <span>Open Source</span>
          </div>
          <span>•</span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>;
};