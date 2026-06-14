"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, Download, ChevronDown, Clipboard, Play, Lock, Github, AlertCircle, CheckCircle, Clock, Settings, X, Pause } from 'lucide-react';
import { StorageService } from '../../lib/storage-service';

// Helper function for dynamic ExtensionService import
const getExtensionService = async () => {
  const { ExtensionService } = await import('../../lib/extension-service');
  return ExtensionService;
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

  // Tab State
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');

  // Single Extract Settings
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'txt' | 'json' | 'rag'>('markdown');
  const [exportTarget, setExportTarget] = useState<'clipboard' | 'download'>('clipboard');

  // Popup state
  const [isExtracting, setIsExtracting] = useState(false);
  const [availability, setAvailability] = useState<{ platform: string; hasTranscript: boolean; isCoursePage: boolean } | null>(null);
  const [currentVideo, setCurrentVideo] = useState<{ title: string; duration: string; lectureId?: string } | null>(null);
  const [courseStructure, setCourseStructure] = useState<any>(null);
  const [isCourseStructureLoading, setIsCourseStructureLoading] = useState(false);
  const [extractedTranscript, setExtractedTranscript] = useState<string>('');
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Simple navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Settings state
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Batch collection state
  const [selectedLectures, setSelectedLectures] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [isBatchCollecting, setIsBatchCollecting] = useState(false);
  const [batchProgressState, setBatchProgressState] = useState<any>(null);
  const [consolidatedExportAvailable, setConsolidatedExportAvailable] = useState(false);

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

  // Poll batch state when batch tab is active or extracting
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    const poll = async () => {
      try {
        const ES = await getExtensionService();
        const stateRes = await ES.getBatchState();
        if (stateRes.success && stateRes.data) {
          setBatchProgressState(stateRes.data);
          setIsBatchCollecting(stateRes.data.isActive);
          
          const completedCount = Object.keys(stateRes.data.collectedTranscripts).length;
          if (completedCount > 0) {
            setConsolidatedExportAvailable(true);
          }
        }
      } catch (error) {
        console.warn('Failed to poll batch state:', error);
      }
    };

    if (activeTab === 'batch' || isBatchCollecting) {
      poll();
      interval = setInterval(poll, 1500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, isBatchCollecting]);

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

  // Auto-expand first section and auto-select all lectures when structure loads
  const allLecturesList = useMemo(() => {
    if (!courseStructure || !courseStructure.sections) return [];
    const list: any[] = [];
    courseStructure.sections.forEach((sec: any) => {
      if (sec.lectures) {
        sec.lectures.forEach((lec: any) => {
          list.push(lec);
        });
      }
    });
    return list;
  }, [courseStructure]);

  useEffect(() => {
    if (courseStructure && courseStructure.sections && courseStructure.sections.length > 0) {
      // Expand first section by default
      setExpandedSections(new Set([0]));
      
      // Select all lectures by default
      const allIds = allLecturesList.map((lec: any) => lec.id);
      setSelectedLectures(new Set(allIds));
    }
  }, [courseStructure, allLecturesList]);

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
      
      const ES = await getExtensionService();
      const response = await ES.checkAvailability();
      
      if (response.success && response.data) {
        setAvailability(response.data);
        setExtractionStatus('idle');
        
        if (response.data.isCoursePage) {
          const videoInfo = await ES.getVideoInfo();
          if (videoInfo.success && videoInfo.data) {
            setCurrentVideo(videoInfo.data);
          }
          
          setIsCourseStructureLoading(true);
          const courseResponse = await ES.extractCourseStructure();
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

  // Batch Collection actions
  const startBatchExtraction = async () => {
    const selectedIds = Array.from(selectedLectures);
    if (selectedIds.length === 0) {
      setErrorMessage('Please select at least one lecture first');
      return;
    }

    setIsBatchCollecting(true);
    setErrorMessage('');

    try {
      const ES = await getExtensionService();
      await ES.startBatchCollection(selectedIds);
      
      const stateRes = await ES.getBatchState();
      if (stateRes.success && stateRes.data) {
        setBatchProgressState(stateRes.data);
      }
    } catch (error) {
      console.error('Failed to start batch extraction:', error);
      setErrorMessage('Failed to initialize batch extraction');
      setIsBatchCollecting(false);
    }
  };

  const pauseBatchExtraction = () => {
    setIsBatchCollecting(false);
  };

  const stopBatchExtraction = async () => {
    setIsBatchCollecting(false);
    setBatchProgressState(null);
    setConsolidatedExportAvailable(false);
    try {
      const ES = await getExtensionService();
      await ES.startBatchCollection([]); // Empty list resets state
      checkPageAvailability();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleExportBatch = async (format: 'markdown' | 'txt' | 'json') => {
    try {
      const ES = await getExtensionService();
      const response = await ES.exportBatchTranscripts(format);
      
      if (response.success && response.data) {
        const text = response.data;
        const filename = ES.generateFilename(
          (courseStructure?.title || 'course') + '_batch_transcripts',
          format
        );
        const mimeType = ES.getMimeType(format);
        ES.downloadFile(text, filename, mimeType);
        setErrorMessage('Export completed successfully!');
        setTimeout(() => setErrorMessage(''), 3000);
      } else {
        setErrorMessage(response.error || 'Failed to export batch transcripts');
      }
    } catch (error) {
      setErrorMessage('Export failed');
    }
  };

  const handleCopyBatchToClipboard = async () => {
    try {
      const ES = await getExtensionService();
      const response = await ES.exportBatchTranscripts(
        exportFormat === 'json' ? 'json' : exportFormat === 'markdown' ? 'markdown' : 'txt'
      );
      
      if (response.success && response.data) {
        const copied = await ES.copyToClipboard(response.data);
        if (copied) {
          setErrorMessage('Batch transcripts copied to clipboard!');
          setTimeout(() => setErrorMessage(''), 3000);
        } else {
          setErrorMessage('Failed to copy to clipboard');
        }
      } else {
        setErrorMessage(response.error || 'Failed to generate batch export');
      }
    } catch (error) {
      setErrorMessage('Failed to copy to clipboard');
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedLectures.size === allLecturesList.length) {
      setSelectedLectures(new Set());
    } else {
      const allIds = allLecturesList.map((lec: any) => lec.id);
      setSelectedLectures(new Set(allIds));
    }
  };

  const handleToggleSelectLecture = (id: string) => {
    const next = new Set(selectedLectures);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedLectures(next);
  };

  const handleToggleSection = (index: number) => {
    const next = new Set(expandedSections);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setExpandedSections(next);
  };

  // Self-correcting loop hook driving popup-level transitions
  useEffect(() => {
    if (!isBatchCollecting) return;

    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    const executeStep = async () => {
      try {
        const ES = await getExtensionService();
        
        // 1. Fetch latest state
        const stateRes = await ES.getBatchState();
        if (!stateRes.success || !stateRes.data) {
          console.warn('Failed to fetch batch state');
          return;
        }

        const bState = stateRes.data;
        if (!isMounted) return;
        setBatchProgressState(bState);

        const selectedIds = Array.from(selectedLectures);
        
        // 2. Find next pending selected lecture ID
        const nextPendingId = selectedIds.find(id => bState.progress[id] === 'pending' || bState.progress[id] === 'collecting');
        
        if (!nextPendingId) {
          // Done!
          setIsBatchCollecting(false);
          setConsolidatedExportAvailable(true);
          setErrorMessage('Batch extraction completed successfully!');
          return;
        }

        // 3. Get active lecture ID from page context
        const videoInfoRes = await ES.getVideoInfo();
        if (!videoInfoRes.success || !videoInfoRes.data) {
          console.warn('Failed to get video info from content script');
          timer = setTimeout(executeStep, 2000);
          return;
        }

        const currentId = videoInfoRes.data.lectureId;
        console.log('🤖 Batch loop: next pending is', nextPendingId, ', active page is', currentId);

        if (currentId === nextPendingId) {
          // Extract transcript for active page match
          console.log('🎯 Extracting transcript for matched lecture:', nextPendingId);
          bState.progress[nextPendingId] = 'collecting';
          
          const collectRes = await ES.collectCurrentTranscript();
          if (!isMounted) return;
          
          if (collectRes.success && collectRes.data) {
            const stateRes2 = await ES.getBatchState();
            if (stateRes2.success && stateRes2.data) {
              setBatchProgressState(stateRes2.data);
            }
          }
          
          timer = setTimeout(executeStep, 3000);
        } else {
          // We are not on the target page. If current page matches any OTHER selected pending lecture, extract it first.
          if (currentId && selectedLectures.has(currentId) && (bState.progress[currentId] === 'pending' || bState.progress[currentId] === 'collecting')) {
            console.log('🎯 Extracting matching active lecture first:', currentId);
            const collectRes = await ES.collectCurrentTranscript();
            if (!isMounted) return;
            if (collectRes.success && collectRes.data) {
              const stateRes2 = await ES.getBatchState();
              if (stateRes2.success && stateRes2.data) {
                setBatchProgressState(stateRes2.data);
              }
            }
            timer = setTimeout(executeStep, 3000);
            return;
          }

          // Otherwise, navigate forward
          console.log('🎯 Navigating forward to find next lecture...');
          const navRes = await ES.navigateToNextLecture();
          if (!isMounted) return;

          if (navRes.success) {
            console.log('🎯 Navigated. Waiting for loading...');
          } else {
            console.warn('🎯 Navigation disabled or failed. Ending batch run.');
            setIsBatchCollecting(false);
            setConsolidatedExportAvailable(true);
            setErrorMessage('Reached the end of the course or playlist.');
            return;
          }
          
          timer = setTimeout(executeStep, 4000);
        }
      } catch (error) {
        console.error('Batch loop step error:', error);
        timer = setTimeout(executeStep, 3000);
      }
    };

    executeStep();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [isBatchCollecting, selectedLectures]);

  // Single Extract Section Component
  const ExtractSection = () => (
    <div className="space-y-5">
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

      {/* Action Button */}
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

      {/* Success Message */}
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
    </div>
  );

  // Single Extract Export Card Component
  const ExportOptionsSection = () => (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-5 shadow-lg animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
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
    </div>
  );

  // Batch Extract Section Component
  const BatchSection = () => {
    if (isCourseStructureLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold animate-pulse">Loading course syllabus structure...</p>
        </div>
      );
    }

    if (!courseStructure || !courseStructure.sections || courseStructure.sections.length === 0) {
      return (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-6 text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Syllabus Detected</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Course syllabus extraction is fully supported on **Udemy**, **Coursera** course layouts, and **YouTube Playlists**.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              For other sites, please use **Single Lecture** mode to extract the current tab.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Course Info Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-4 space-y-3 shadow-md">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Course</h4>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1 leading-snug">
              {courseStructure.title}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {courseStructure.instructor}
            </p>
          </div>

          {/* Select All Toggle */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 pt-2 text-xs">
            <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedLectures.size === allLecturesList.length && allLecturesList.length > 0}
                onChange={handleToggleSelectAll}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Select All ({allLecturesList.length})
            </label>
            <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full font-bold">
              {selectedLectures.size} selected
            </span>
          </div>
        </div>

        {/* Batch Progress Bar */}
        {isBatchCollecting && (
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-4 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Extraction Progress</span>
              <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                {(() => {
                  const selected = Array.from(selectedLectures);
                  if (selected.length === 0) return '0%';
                  const completedCount = selected.filter(id => {
                    const status = batchProgressState?.progress[id];
                    return status === 'completed' || status === 'failed' || status === 'skipped';
                  }).length;
                  return Math.round((completedCount / selected.length) * 100) + '%';
                })()}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                style={{
                  width: (() => {
                    const selected = Array.from(selectedLectures);
                    if (selected.length === 0) return '0%';
                    const completedCount = selected.filter(id => {
                      const status = batchProgressState?.progress[id];
                      return status === 'completed' || status === 'failed' || status === 'skipped';
                    }).length;
                    return (completedCount / selected.length) * 100 + '%';
                  })()
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Accordian Sections List */}
        <div className="space-y-3">
          {courseStructure.sections.map((section: any, sIdx: number) => {
            const isExpanded = expandedSections.has(sIdx);
            return (
              <div 
                key={sIdx}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-3xl overflow-hidden transition-all duration-300 shadow-md animate-in fade-in duration-300"
              >
                {/* Section Header */}
                <button
                  onClick={() => handleToggleSection(sIdx)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-100/30 dark:hover:bg-slate-700/30 transition-all text-left"
                >
                  <div className="flex-1 pr-3">
                    <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 line-clamp-1 leading-snug">
                      {section.title || `Section ${sIdx + 1}`}
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {section.lectures?.length || 0} items
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Section Body */}
                {isExpanded && section.lectures && (
                  <div className="border-t border-slate-100 dark:border-slate-700/50 p-2 divide-y divide-slate-100/50 dark:divide-slate-700/30 bg-slate-50/20 dark:bg-slate-900/10">
                    {section.lectures.map((lecture: any) => {
                      const isSelected = selectedLectures.has(lecture.id);
                      const status = batchProgressState?.progress[lecture.id] || 'pending';
                      const isCurrent = currentVideo?.lectureId === lecture.id;

                      return (
                        <div 
                          key={lecture.id}
                          className={`flex items-center justify-between p-2.5 rounded-2xl text-xs transition-colors ${
                            isCurrent 
                              ? 'bg-blue-500/10 dark:bg-blue-900/20 border-l-4 border-blue-500 pl-1.5' 
                              : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectLecture(lecture.id)}
                              disabled={isBatchCollecting}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate leading-tight ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                {lecture.title}
                              </p>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500">
                                {lecture.duration || 'Video'}
                              </span>
                            </div>
                          </label>

                          {/* Status Marker */}
                          <div className="flex-shrink-0 ml-2">
                            {status === 'completed' && (
                              <CheckCircle className="w-4 h-4 text-emerald-500 animate-in zoom-in-50 duration-300" />
                            )}
                            {status === 'collecting' && (
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            )}
                            {status === 'failed' && (
                              <AlertCircle className="w-4 h-4 text-rose-500 animate-in zoom-in-50 duration-300" />
                            )}
                            {status === 'skipped' && (
                              <Clock className="w-4 h-4 text-slate-400" />
                            )}
                            {status === 'pending' && isSelected && (
                              <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Ready</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Batch Action and Export Box */}
        <div className="space-y-4">
          {errorMessage && (
            <div className="bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 rounded-3xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 leading-tight">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isBatchCollecting ? (
              <>
                <button
                  onClick={pauseBatchExtraction}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-2xl transition-all duration-200 shadow-lg shadow-amber-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  onClick={stopBatchExtraction}
                  className="w-12 flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white rounded-2xl transition-all duration-200 shadow-lg shadow-rose-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  title="Stop & Reset"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={startBatchExtraction}
                disabled={selectedLectures.size === 0}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold transition-all duration-200 shadow-lg ${
                  selectedLectures.size === 0
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-emerald-600 to-green-700 text-white hover:from-emerald-700 hover:to-green-800 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                <Play className="w-4 h-4" />
                {(() => {
                  const hasProgress = Object.values(batchProgressState?.progress || {}).some(
                    s => s === 'completed' || s === 'failed' || s === 'skipped'
                  );
                  return hasProgress ? 'Resume Batch Extraction' : 'Start Batch Extraction';
                })()}
              </button>
            )}
          </div>

          {/* Export Box */}
          {(consolidatedExportAvailable || (batchProgressState && Object.keys(batchProgressState.collectedTranscripts).length > 0)) && (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-5 shadow-lg space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Consolidated Batch Export</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Combine all collected transcripts into one file</p>
              </div>
              
              <div className="space-y-3">
                <select 
                  value={exportFormat === 'rag' ? 'txt' : exportFormat} 
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="w-full p-2.5 text-xs bg-white/85 dark:bg-slate-700/85 border border-slate-300/50 dark:border-slate-600/50 text-slate-900 dark:text-white rounded-xl font-medium"
                >
                  <option value="markdown">📝 Markdown (.md)</option>
                  <option value="txt">📄 Plain Text (.txt)</option>
                  <option value="json">🔧 JSON (.json)</option>
                </select>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleCopyBatchToClipboard}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/25 active:scale-[0.97]"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    Copy
                  </button>
                  <button
                    onClick={() => handleExportBatch(exportFormat === 'json' ? 'json' : exportFormat === 'markdown' ? 'markdown' : 'txt')}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/25 active:scale-[0.97]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[360px] h-[480px] bg-white dark:bg-slate-900 flex flex-col shadow-2xl rounded-[48px] overflow-hidden border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm relative animate-in fade-in duration-300">
      {/* Header */}
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
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettingsPanel(true)} 
              className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 hover:scale-105 active:scale-95" 
              aria-label="Settings"
            >
              <Settings className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300" />
            </button>
            <button 
              onClick={handleThemeToggle} 
              className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 hover:scale-105 active:scale-95" 
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300" />}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex px-5 py-2 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200/20 dark:border-slate-700/20 gap-2">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex-1 py-2 px-3 rounded-2xl text-xs font-bold transition-all duration-300 ${
            activeTab === 'single'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md scale-102'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/30'
          }`}
        >
          Single Extract
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          className={`flex-1 py-2 px-3 rounded-2xl text-xs font-bold transition-all duration-300 ${
            activeTab === 'batch'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md scale-102'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/30'
          }`}
        >
          Batch Syllabus
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900">
        <div className="p-5 space-y-5">
          {activeTab === 'single' ? (
            <>
              <ExtractSection />
              {extractionStatus === 'success' && extractedTranscript && (
                <ExportOptionsSection />
              )}
            </>
          ) : (
            <BatchSection />
          )}
        </div>
      </main>

      {/* Footer */}
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

      {showSettingsPanel && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end z-50 animate-in fade-in-30 duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-t-[40px] border-t border-slate-200/50 dark:border-slate-700/50 p-5 space-y-5 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Settings</h2>
              <button 
                onClick={() => setShowSettingsPanel(false)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 pb-2">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <div className="flex flex-col pr-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Include Timestamps</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Include timestamps in extracted format</span>
                </div>
                <button
                  onClick={() => setIncludeTimestamps(!includeTimestamps)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                    includeTimestamps ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      includeTimestamps ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
