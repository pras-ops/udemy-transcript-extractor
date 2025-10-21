"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, Download, ChevronDown, Clipboard, Play, Lock, Github, AlertCircle, CheckCircle, Clock, Bot } from 'lucide-react';
import { StorageService } from '../../lib/storage-service';
import { ChatWithTranscript } from '../ChatWithTranscript';

// Helper function for dynamic ExtensionService import
const getExtensionService = async () => {
  const { ExtensionService } = await import('../../lib/extension-service');
  return ExtensionService;
};

// Simple debouncing utility
const debounce = (func: (...args: unknown[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Custom LogIcon component using actual Log.png image
// Professional SVG Logo Component
const TranscriptIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
    />
    <path 
      d="M14 2V8H20" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M16 13H8" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M16 17H8" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M10 9H8" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const TranscriptExtractorPopup = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'txt' | 'json' | 'rag'>('markdown');
  const [exportTarget, setExportTarget] = useState<'clipboard' | 'download'>('clipboard');
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);

  const [isExtracting, setIsExtracting] = useState(false);
  const [availability, setAvailability] = useState<{ platform: string; hasTranscript: boolean; isCoursePage: boolean } | null>(null);
  const [currentVideo, setCurrentVideo] = useState<{ title: string; duration: string } | null>(null);
  const [courseStructure, setCourseStructure] = useState<any>(null);
  const [isCourseStructureLoading, setIsCourseStructureLoading] = useState(false);
  const [extractedTranscript, setExtractedTranscript] = useState<string>('');
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Simple navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  
  // AI Chat state
  const [showAIChat, setShowAIChat] = useState(false);

  const handleThemeToggle = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    // Apply the theme immediately
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save theme preference to localStorage
    localStorage.setItem('transcript-extractor-theme', newDarkMode ? 'dark' : 'light');
  };


  // Check availability when component mounts and load saved state
  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('transcript-extractor-theme');
    const shouldUseDarkMode = savedTheme === 'dark';
    
    setIsDarkMode(shouldUseDarkMode);
    
    // Apply the theme immediately
    if (shouldUseDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    loadSavedState();
    checkPageAvailability();
    
    return () => {
      setExtractionStatus('idle');
      setExtractedTranscript('');
    };
  }, []);


  // Auto-save course structure when it changes
  useEffect(() => {
    if (courseStructure) {
      StorageService.saveCourseStructure(courseStructure);
    }
  }, [courseStructure]);

  // Auto-save UI preferences when they change
  useEffect(() => {
    StorageService.saveState({
      exportFormat,
      exportTarget,
      includeTimestamps,
      extractedTranscript,
      extractionStatus
    });
  }, [exportFormat, exportTarget, includeTimestamps, extractedTranscript, extractionStatus]);

  // Load saved state from Chrome storage
  const loadSavedState = async () => {
    try {
      const savedState = await StorageService.loadState();
      
      setExportFormat(savedState.exportFormat);
      setExportTarget(savedState.exportTarget);
      setIncludeTimestamps(savedState.includeTimestamps);
      
      if (savedState.extractedTranscript && savedState.extractedTranscript.trim().length > 0) {
        setExtractedTranscript(savedState.extractedTranscript);
        setExtractionStatus(savedState.extractionStatus === 'success' ? 'success' : 'idle');
      } else {
        setExtractedTranscript('');
        setExtractionStatus('idle');
      }
      
      if (savedState.courseStructure) {
        setCourseStructure(savedState.courseStructure);
      }
      if (savedState.currentVideo) {
        setCurrentVideo(savedState.currentVideo);
      }
      if (savedState.availability) {
        setAvailability(savedState.availability);
      }
      
    } catch (error) {
      // Failed to load saved state
    }
  };

  const checkPageAvailability = async () => {
    try {
      setExtractionStatus('extracting');
      setErrorMessage('');
      
      const ExtensionService = await getExtensionService();
      const response = await (await getExtensionService()).checkAvailability();
      
      if (response.success && response.data) {
        setAvailability(response.data);
        setExtractionStatus('idle');
        
        if (response.data.isCoursePage) {
          const videoInfo = await (await getExtensionService()).getVideoInfo();
          if (videoInfo.success && videoInfo.data) {
            setCurrentVideo(videoInfo.data);
          }
          
          setIsCourseStructureLoading(true);
          const courseResponse = await (await getExtensionService()).extractCourseStructure();
          if (courseResponse.success && courseResponse.data) {
            setCourseStructure(courseResponse.data);
          } else {
            setCourseStructure({ title: 'Unknown Course', sections: [] });
          }
          setIsCourseStructureLoading(false);
        }
      } else {
        setErrorMessage(response.error || 'Could not detect page type');
        setExtractionStatus('error');
        setAvailability({
          platform: 'unknown',
          hasTranscript: false,
          isCoursePage: false
        });
      }
    } catch (error) {
      setErrorMessage('Extension communication failed');
      setExtractionStatus('error');
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

    setIsExtracting(true);
    setExtractionStatus('extracting');
    setErrorMessage('');

    try {
      const response = await (await getExtensionService()).extractTranscript();
      
      if (response.success && response.data) {
        setExtractedTranscript(response.data);
        setExtractionStatus('success');
        
        try {
          const copied = await (await getExtensionService()).copyToClipboard(response.data);
          if (!copied) {
            setErrorMessage('Transcript extracted but failed to copy to clipboard');
          }
        } catch (clipboardError) {
          setErrorMessage('Transcript extracted but failed to copy to clipboard');
        }
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

  const handleExport = async (action: 'clipboard' | 'download') => {
    if (!extractedTranscript) {
      setErrorMessage('No transcript available to export');
      return;
    }

    const formattedTranscript = (await getExtensionService()).formatTranscript(
      extractedTranscript,
      exportFormat,
      includeTimestamps,
      currentVideo?.title
    );

    try {
      switch (action) {
        case 'clipboard': {
          const copied = await (await getExtensionService()).copyToClipboard(formattedTranscript);
          if (!copied) {
            setErrorMessage('Failed to copy to clipboard');
          } else {
            setErrorMessage('');
          }
          break;
        }

        case 'download': {
          const filename = (await getExtensionService()).generateFilename(
            currentVideo?.title || 'transcript',
            exportFormat
          );
          const mimeType = (await getExtensionService()).getMimeType(exportFormat);
          (await getExtensionService()).downloadFile(formattedTranscript, filename, mimeType);
          setErrorMessage('');
          break;
        }
      }
    } catch (error) {
      setErrorMessage('Export failed');
    }
  };

  // Simple navigation to next lecture
  const handleNextLecture = async () => {
    setIsNavigating(true);
    try {
      const response = await (await getExtensionService()).navigateToNextLecture();
      if (response.success) {
        // Wait for page to load
        setTimeout(async () => {
          await checkPageAvailability();
          setIsNavigating(false);
          // Reset extraction status so user can extract again
          setExtractionStatus('idle');
          setExtractedTranscript('');
          setErrorMessage('Ready to extract next transcript!');
          setTimeout(() => setErrorMessage(''), 2000);
        }, 1500);
      } else {
        setErrorMessage('Failed to navigate to next lecture');
        setIsNavigating(false);
      }
    } catch (error) {
      setErrorMessage('Failed to navigate to next lecture');
      setIsNavigating(false);
    }
  };

  // Super Curvy Extract Section Component
  const ExtractSection = () => <div className="space-y-5">
      {/* Video Information Card */}
      {currentVideo && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-5 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center shadow-md">
              <Play className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
                {currentVideo.title}
              </h3>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-2 font-medium">
                  <Clock className="w-4 h-4" />
                  {currentVideo.duration}
                </span>
                {availability && (
                  <span className={`flex items-center gap-2 font-semibold ${
                    availability.hasTranscript ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {availability.hasTranscript ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {availability.hasTranscript ? 'Available' : 'No Transcript'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 rounded-3xl p-4 shadow-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Super Curvy Action Button */}
      <button 
        onClick={extractionStatus === 'success' && extractedTranscript ? handleNextLecture : handleExtractTranscript} 
        disabled={isExtracting || isNavigating || !availability?.hasTranscript} 
        className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-3xl font-semibold text-sm transition-all duration-300 transform ${
          isExtracting || isNavigating || !availability?.hasTranscript 
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed' 
            : extractionStatus === 'success' && extractedTranscript
              ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-gradient-to-r from-emerald-600 to-green-700 text-white hover:from-emerald-700 hover:to-green-800 shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {isExtracting ? (
          <>
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span>Extracting...</span>
          </>
        ) : isNavigating ? (
          <>
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span>Navigating...</span>
          </>
        ) : extractionStatus === 'success' && extractedTranscript ? (
          <>
            <span>➡️</span>
            <span>Next Lecture & Extract</span>
          </>
        ) : (
          <>
            <TranscriptIcon className="w-5 h-5" />
            <span>Extract Transcript</span>
          </>
        )}
      </button>

      {/* Success Message with Animation */}
      {extractionStatus === 'success' && extractedTranscript && (
        <div className="bg-emerald-50/80 dark:bg-emerald-900/20 backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-800/50 rounded-3xl p-4 shadow-md animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Success!
              </p>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Ready for next lecture
            </p>
          </div>
        </div>
      )}
    </div>;

  // Super Curvy Export Options Component
  const ExportOptionsSection = () => <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-5 shadow-lg animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center shadow-md">
          <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Export Options</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Choose format and action</p>
        </div>
      </div>
      
      {/* Format Selection */}
      <div className="space-y-3 mb-4">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Format</label>
        <select 
          value={exportFormat} 
          onChange={(e) => setExportFormat(e.target.value as 'markdown' | 'txt' | 'json' | 'rag')}
          className="w-full p-3 text-sm bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-slate-300/50 dark:border-slate-600/50 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 font-medium"
        >
          <option value="markdown">📝 Markdown (.md)</option>
          <option value="txt">📄 Plain Text (.txt)</option>
          <option value="json">🔧 JSON (.json)</option>
          <option value="rag">🤖 RAG Format (.txt)</option>
        </select>
      </div>

      {/* Export Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleExport('clipboard')}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-2xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Clipboard className="w-4 h-4" />
          Copy
        </button>
        
        <button
          onClick={() => handleExport('download')}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-semibold rounded-2xl transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>
      
      {/* AI Chat Button */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setShowAIChat(!showAIChat)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-semibold rounded-2xl transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Bot className="w-4 h-4" />
          {showAIChat ? 'Close AI Chat' : 'Chat with AI'}
        </button>
      </div>
    </div>;

  return (
    <>
      {!showAIChat ? (
        <div className="w-[360px] h-[480px] bg-white dark:bg-slate-900 flex flex-col shadow-2xl rounded-[48px] overflow-hidden border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
          {/* Ultra Curvy Header */}
          <header className="bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200/30 dark:border-slate-700/30 px-6 py-4 rounded-t-[48px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <TranscriptIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Transcript Extractor
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Extract video transcripts</p>
                </div>
              </div>
              
              <button 
                onClick={handleThemeToggle} 
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 hover:scale-105 active:scale-95" 
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900">
            <div className="p-5 space-y-5">
              <ExtractSection />
              {/* Show export options only after successful extraction */}
              {extractionStatus === 'success' && extractedTranscript && (
                <ExportOptionsSection />
              )}
            </div>
          </main>

          {/* Ultra Curvy Footer */}
          <footer className="bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-t border-slate-200/30 dark:border-slate-700/30 px-6 py-3 rounded-b-[48px]">
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Local-first
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Github className="w-3 h-3" />
                Open Source
              </span>
              <span>•</span>
              <span>MIT License</span>
            </div>
          </footer>
        </div>
      ) : (
        <div className="w-[600px] h-[600px]">
          <ChatWithTranscript 
            transcript={extractedTranscript}
            isVisible={showAIChat}
            onClose={() => setShowAIChat(false)}
          />
        </div>
      )}
    </>
  );
};
