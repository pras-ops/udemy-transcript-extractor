"use client";

import * as React from "react";
import { useState, useEffect } from 'react';
import { FileText, Sun, Moon, Download, ChevronDown, Clock, Clipboard, Play, History, Calendar, Lock, Github, BookOpen, Zap, ExternalLink, Brain, AlertCircle, CheckCircle } from 'lucide-react';
import { ExtensionService } from '../../lib/extension-service';
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
  const [availability, setAvailability] = useState<{ platform: string; hasTranscript: boolean; isCoursePage: boolean } | null>(null);
  const [currentVideo, setCurrentVideo] = useState<{ title: string; duration: string } | null>(null);
  const [courseStructure, setCourseStructure] = useState<any>(null);
  const [extractedTranscript, setExtractedTranscript] = useState<string>('');
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  // Check availability when component mounts
  useEffect(() => {
    checkPageAvailability();
  }, []);

  const checkPageAvailability = async () => {
    try {
      setExtractionStatus('extracting');
      setErrorMessage('');
      
      const response = await ExtensionService.checkAvailability();
      
      if (response.success && response.data) {
        setAvailability(response.data);
        setExtractionStatus('success');
        
        if (response.data.isCoursePage) {
          // Get current video info
          const videoInfo = await ExtensionService.getVideoInfo();
          if (videoInfo.success && videoInfo.data) {
            setCurrentVideo(videoInfo.data);
          } else {
            console.warn('Could not get video info:', videoInfo.error);
          }
          
          // Get course structure
          const courseResponse = await ExtensionService.extractCourseStructure();
          if (courseResponse.success && courseResponse.data) {
            setCourseStructure(courseResponse.data);
          } else {
            console.warn('Could not get course structure:', courseResponse.error);
          }
        }
      } else {
        setErrorMessage(response.error || 'Could not detect page type');
        setExtractionStatus('error');
        // Set default values for development/testing
        setAvailability({
          platform: 'unknown',
          hasTranscript: false,
          isCoursePage: false
        });
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setErrorMessage('Extension communication failed');
      setExtractionStatus('error');
      // Set default values for development/testing
      setAvailability({
        platform: 'unknown',
        hasTranscript: false,
        isCoursePage: false
      });
    }
  };

  const handleExtractTranscript = async () => {
    if (!availability?.hasTranscript) {
      setErrorMessage('No transcript available for this video');
      setExtractionStatus('error');
      return;
    }

    // If we already have a successful extraction, just re-export
    if (extractionStatus === 'success' && extractedTranscript) {
      try {
        await handleExport(extractedTranscript);
        setErrorMessage(''); // Clear any previous errors
      } catch (error) {
        setErrorMessage('Failed to export transcript');
      }
      return;
    }

    setIsExtracting(true);
    setExtractionStatus('extracting');
    setErrorMessage('');

    try {
      const response = await ExtensionService.extractTranscript();
      if (response.success && response.data) {
        setExtractedTranscript(response.data);
        setExtractionStatus('success');
        
        // Auto-export based on selected target
        await handleExport(response.data);
      } else {
        setErrorMessage(response.error || 'Failed to extract transcript');
        setExtractionStatus('error');
      }
    } catch (error) {
      setErrorMessage('Error extracting transcript');
      setExtractionStatus('error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExport = async (transcript: string) => {
    const formattedTranscript = ExtensionService.formatTranscript(
      transcript,
      exportFormat,
      includeTimestamps
    );

    try {
      switch (exportTarget) {
        case 'clipboard':
          const copied = await ExtensionService.copyToClipboard(formattedTranscript);
          if (!copied) {
            setErrorMessage('Failed to copy to clipboard');
          }
          break;

        case 'download':
          const filename = ExtensionService.generateFilename(
            currentVideo?.title || 'transcript',
            exportFormat
          );
          const mimeType = ExtensionService.getMimeType(exportFormat);
          ExtensionService.downloadFile(formattedTranscript, filename, mimeType);
          break;

        case 'notebookllm':
        case 'notion':
        case 'obsidian':
          // These would require API integration
          setErrorMessage(`${exportTarget} integration not yet implemented`);
          break;
      }
    } catch (error) {
      setErrorMessage('Export failed');
    }
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
      {/* Current Video Info */}
      {currentVideo && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Current Video</span>
          </div>
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
            {currentVideo.title}
          </h3>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Duration: {currentVideo.duration}
          </p>
        </div>
      )}

      {/* Availability Status */}
      {availability && (
        <div className={`p-4 rounded-lg border ${
          availability.hasTranscript 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-center gap-2">
            {availability.hasTranscript ? (
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            )}
            <span className={`text-sm font-medium ${
              availability.hasTranscript 
                ? 'text-green-900 dark:text-green-100' 
                : 'text-yellow-900 dark:text-yellow-100'
            }`}>
              {availability.hasTranscript ? 'Transcript Available' : 'No Transcript Available'}
            </span>
          </div>
          <p className={`text-xs mt-1 ${
            availability.hasTranscript 
              ? 'text-green-700 dark:text-green-300' 
              : 'text-yellow-700 dark:text-yellow-300'
          }`}>
            Platform: {availability.platform}
          </p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-900 dark:text-red-100">Error</span>
          </div>
          <p className="text-xs text-red-700 dark:text-red-300 mt-1">{errorMessage}</p>
        </div>
      )}

      {/* Extract Button */}
      <button 
        onClick={handleExtractTranscript} 
        disabled={isExtracting || !availability?.hasTranscript} 
        className={`w-full py-4 px-6 rounded-xl text-white font-medium transition-all duration-200 ${
          isExtracting || !availability?.hasTranscript 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-[#4CAF50] hover:bg-[#45a049] shadow-lg hover:shadow-xl'
        }`}
      >
        {isExtracting ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Extracting...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Play className="w-5 h-5" />
            <span>{extractionStatus === 'success' && extractedTranscript ? 'Copy Again' : 'Extract Transcript'}</span>
          </div>
        )}
      </button>

      {/* Course Structure */}
      {courseStructure && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Course Structure</span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-2">
            {courseStructure.sections?.slice(0, 5).map((section: any, index: number) => (
              <div key={index} className="text-xs">
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {section.title} ({section.lectures?.length || 0} videos)
                </div>
                {section.lectures?.slice(0, 2).map((lecture: any, lIndex: number) => (
                  <div key={lIndex} className="text-gray-500 dark:text-gray-500 ml-2 mb-1">
                    • {lecture.title}
                  </div>
                ))}
                {section.lectures?.length > 2 && (
                  <div className="text-gray-400 dark:text-gray-600 ml-2 text-xs">
                    ... and {section.lectures.length - 2} more
                  </div>
                )}
              </div>
            ))}
            {courseStructure.sections?.length > 5 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                ... and {courseStructure.sections.length - 5} more sections
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      {extractionStatus === 'success' && extractedTranscript && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-900 dark:text-green-100">Transcript Extracted Successfully!</span>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            {extractedTranscript.split('\n\n').length} entries extracted
          </p>
        </div>
      )}
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