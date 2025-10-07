"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from 'react';
import { FileText, Sun, Moon, Download, ChevronDown, Clock, Clipboard, Play, Lock, Github, Zap, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
// Dynamic import to avoid chunking conflicts
// import { ExtensionService } from '../../lib/extension-service';
import { StorageService } from '../../lib/storage-service';

// Helper function for dynamic ExtensionService import
const getExtensionService = async () => {
  const { ExtensionService } = await import('../../lib/extension-service');
  return ExtensionService;
};
import { AISummarizationPopup } from './AISummarizationPopup';
import { SummaryMode } from '../../lib/ai-summarization-service';
import { SystemPerformanceDetector } from '../../lib/system-performance-detector';

// Simple debouncing utility
const debounce = (func: (...args: unknown[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Custom LogIcon component using actual Log.png image
const LogIcon = ({ className = "", ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <img 
    src="/Log.png" 
    alt="Transcript Extractor Logo"
    className={className}
    {...props}
  />
);

export const TranscriptExtractorPopup = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);

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
  // Test state variables removed for production
  
  // System performance detection
  const [systemPerformance, setSystemPerformance] = useState<{
    timingDisplay: string;
    detailedTimingDisplay: string;
  }>({
    timingDisplay: '⏱️ Processing time varies by system performance',
    detailedTimingDisplay: '💻 Faster systems: 45-90s | Slower systems: 90-180s'
  });
  
  // Batch collection states
  const [batchMode, setBatchMode] = useState<'next' | 'collect'>('next');
  const [batchProgress, setBatchProgress] = useState<{[lectureId: string]: 'pending' | 'collecting' | 'completed' | 'failed' | 'skipped'}>({});
  const [isBatchCollecting, setIsBatchCollecting] = useState(false);
  const [batchStats, setBatchStats] = useState({ total: 0, completed: 0, failed: 0, skipped: 0 });
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentProcessingLecture, setCurrentProcessingLecture] = useState<string>('');
  
  // Debug batchMode changes
  useEffect(() => {
    console.log('🔄 batchMode changed to:', batchMode);
    console.log('🔄 Current batchMode state:', batchMode);
  }, [batchMode]);
  const [currentSection, setCurrentSection] = useState<string>('');
  const [progressUpdateTrigger, setProgressUpdateTrigger] = useState(0);
  const [clipboardEntries, setClipboardEntries] = useState(0);
  const [clipboardData, setClipboardData] = useState<string>('');
  
  // AI Summarization states
  const [showAIPopup, setShowAIPopup] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [streamingText, setStreamingText] = useState('');
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState('');
  
  // AI Settings - using defaults only
  const [aiSettings] = useState({
    summaryMode: SummaryMode.Simple, // Default to Simple overview
    outputFormat: 'paragraph' as 'paragraph' | 'bullet-points' | 'numbered-list',
    useWebLLM: true, // Prefer GPU acceleration
    includeExamples: true,
    includeDefinitions: true
  });
  
  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Calculate progress percentage using useMemo for better performance
  const progressPercentage = useMemo(() => {
    const totalProcessed = batchStats.completed + batchStats.failed + batchStats.skipped;
    if (batchStats.total === 0) {
      // Dynamic counting mode - show progress based on completed count
      return totalProcessed > 0 ? Math.min((totalProcessed / (totalProcessed + 1)) * 100, 100) : 0;
    }
    // Fixed total mode - show progress as percentage of total
    const percentage = (totalProcessed / batchStats.total) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  }, [batchStats, progressUpdateTrigger]);

  // Get current section number from URL or video info
  const getCurrentSectionNumber = (): number => {
    try {
      // Try to extract section from URL first
      const urlMatch = window.location.href.match(/lecture\/(\d+)/);
      if (urlMatch) {
        const lectureId = parseInt(urlMatch[1]);
        // Map lecture ID to approximate section (this is a rough estimate)
        // You can adjust this mapping based on your course structure
        return Math.floor(lectureId / 100) + 1;
      }
      
      // Fallback: try to get from video title
      if (currentVideo?.title) {
        const sectionMatch = currentVideo.title.match(/Section (\d+)/i);
        if (sectionMatch) {
          return parseInt(sectionMatch[1]);
        }
      }
      
      // Default to 1 if we can't determine
      return 1;
    } catch (error) {
      return 1;
    }
  };

  // Simple section counter - show current section only
  const getSectionCounter = (): string => {
    const currentSection = getCurrentSectionNumber();
    if (batchStats.total === 0) {
      // Dynamic counting mode
      return `${currentSection}/∞`;
    }
    return `${currentSection}/${batchStats.total}`;
  };



  // Check availability when component mounts and load saved state
  useEffect(() => {
    // Apply dark mode by default
    document.documentElement.classList.add('dark');
    
    // Register popup globally for content script communication
    (window as any).transcriptExtractorPopup = {
      handleMessage: (message: any) => {
        console.log('🎯 Popup: Received message from content script:', message);
        // Handle AI summarization messages
        if (message.type === 'AI_SUMMARIZE_RESPONSE') {
          if (message.data?.success) {
            setAiSummary(message.data.summary || '');
            setIsAiProcessing(false);
          } else {
            setAiError(message.data?.error || 'Failed to generate summary');
            setIsAiProcessing(false);
          }
        } else if (message.type === 'AI_SUMMARIZE_CHUNK') {
          setStreamingText(prev => prev + (message.data?.chunk || ''));
        } else if (message.type === 'WEBLLM_LOAD_PROGRESS' || message.type === 'TRANSFORMERS_LOAD_PROGRESS') {
          setStreamingProgress(message.data?.progress || 0);
        }
      }
    };
    
    loadSavedState();
    checkPageAvailability();
    
    // Initialize system performance detection
    const initializeSystemPerformance = async () => {
      try {
        const detector = SystemPerformanceDetector.getInstance();
        await detector.detectSystemPerformance();
        
        setSystemPerformance({
          timingDisplay: detector.getTimingDisplay(),
          detailedTimingDisplay: detector.getDetailedTimingDisplay()
        });
      } catch (error) {
        console.warn('Failed to detect system performance:', error);
        // Keep default values if detection fails
      }
    };
    
    initializeSystemPerformance();
    
      // Load clipboard data from storage
      const loadClipboardData = async () => {
        try {
          const { clipboardData: savedData, clipboardEntries: savedEntries } = await StorageService.loadClipboardData();
          setClipboardData(savedData);
          setClipboardEntries(savedEntries);
        } catch (error) {
          // Failed to load clipboard data
        }
      };
    
    loadClipboardData();
    
    // Simple cleanup on unmount
    return () => {
      setExtractionStatus('idle');
      setExtractedTranscript('');
      // Clean up global reference
      delete (window as any).transcriptExtractorPopup;
    };
  }, []);

  // Auto-save batch collection state when it changes (with debouncing)
  const debouncedSaveBatchState = useMemo(
    () => debounce((progress: any, stats: any, mode: any, collecting: boolean) => {
      if (progress && Object.keys(progress).length > 0) {
        StorageService.saveBatchState(progress, stats, mode, collecting);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSaveBatchState(batchProgress, batchStats, batchMode, isBatchCollecting);
  }, [batchProgress, batchStats, batchMode, isBatchCollecting, debouncedSaveBatchState]);

  // Debug logging removed for production

  // Auto-save current processing lecture
  useEffect(() => {
    StorageService.saveState({ currentProcessingLecture });
  }, [currentProcessingLecture]);

  // Auto-save batch collection state
  useEffect(() => {
    StorageService.saveState({
      batchMode,
      batchProgress,
      batchStats,
      isBatchCollecting,
      clipboardData,
      clipboardEntries
    });
  }, [batchMode, batchProgress, batchStats, isBatchCollecting, clipboardData, clipboardEntries]);

  // Simple video title update and section detection
  useEffect(() => {
    if (currentVideo && currentVideo.title) {
      setCurrentProcessingLecture(currentVideo.title);
      
      // Check if we've moved to a new section
      const newSection = getCurrentSectionNumber();
      if (currentSection && currentSection !== newSection.toString() && isBatchCollecting) {
        // We've moved to a new section - increment the completed count
        setBatchStats(prev => {
          const updated = { ...prev, completed: prev.completed + 1 };
          return updated;
        });
        setProgressUpdateTrigger(prev => prev + 1);
      }
      setCurrentSection(newSection.toString());
    }
  }, [currentVideo, currentSection, isBatchCollecting, courseStructure]);

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
      
      // Restore batch collection state - be more permissive about restoration
      // Restore if user was actively collecting OR if they have any batch progress
      const wasActivelyCollecting = savedState.isBatchCollecting || 
                                   (savedState.batchStats && savedState.batchStats.total > 0) ||
                                   (savedState.batchProgress && Object.keys(savedState.batchProgress).length > 0);
      
      console.log('🎯 Restoring batch state:', {
        wasActivelyCollecting,
        savedBatchMode: savedState.batchMode,
        savedBatchStats: savedState.batchStats,
        savedBatchProgress: savedState.batchProgress
      });
      
      if (wasActivelyCollecting) {
        // User was in middle of batch collection - restore their state
        setBatchMode(savedState.batchMode || 'next');
        setBatchProgress(savedState.batchProgress || {});
        setBatchStats(savedState.batchStats || { total: 0, completed: 0, failed: 0, skipped: 0 });
        setIsBatchCollecting(true);
        setCurrentProcessingLecture(savedState.currentProcessingLecture || '');
        
        // Also restore clipboard data if available
        if (savedState.clipboardData) {
          setClipboardData(savedState.clipboardData);
          setClipboardEntries(savedState.clipboardEntries || 0);
        }
        
        console.log('✅ Batch state restored successfully');
        console.log('🎯 Restored batchMode:', savedState.batchMode);
        console.log('🎯 Restored isBatchCollecting:', true);
      } else {
        // New session or user wasn't collecting - start fresh
        setBatchMode('next');
        setBatchProgress({});
        setBatchStats({ total: 0, completed: 0, failed: 0, skipped: 0 });
        setIsBatchCollecting(false);
        setCurrentProcessingLecture('');
        setClipboardData('');
        setClipboardEntries(0);
        
        console.log('🔄 Starting fresh batch state');
        console.log('🎯 Initial batchMode:', 'next');
        console.log('🎯 Initial isBatchCollecting:', false);
      }
      
      // Restore other UI state
      setExportFormat(savedState.exportFormat);
      setExportTarget(savedState.exportTarget);
      setIncludeTimestamps(savedState.includeTimestamps);
      
      // Validate extracted transcript - reset if invalid
      if (savedState.extractedTranscript && savedState.extractedTranscript.trim().length > 0) {
        setExtractedTranscript(savedState.extractedTranscript);
        // Only restore success status if we have a valid transcript
        setExtractionStatus(savedState.extractionStatus === 'success' ? 'success' : 'idle');
      } else {
        // Reset invalid extraction state
        setExtractedTranscript('');
        setExtractionStatus('idle');
      }
      
      // Restore course data if available
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
          // Get current video info
          const videoInfo = await (await getExtensionService()).getVideoInfo();
          if (videoInfo.success && videoInfo.data) {
            setCurrentVideo(videoInfo.data);
          }
          
          // Get course structure
          setIsCourseStructureLoading(true);
          const courseResponse = await (await getExtensionService()).extractCourseStructure();
                if (courseResponse.success && courseResponse.data) {
              setCourseStructure(courseResponse.data);
          } else {
            setCourseStructure({ title: 'Unknown Course', sections: [] }); // Set an empty structure to indicate no data
          }
          setIsCourseStructureLoading(false);
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

    setIsExtracting(true);
    setExtractionStatus('extracting');
    setErrorMessage('');

    try {
      const response = await (await getExtensionService()).extractTranscript();
      
      if (response.success && response.data) {
        setExtractedTranscript(response.data);
        setExtractionStatus('success');
        
        // Automatically copy transcript to clipboard
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

  // AI Summarization handlers
  const handleAISummarize = async () => {
    if (!extractedTranscript || extractedTranscript.trim().length === 0) {
      setErrorMessage('Please extract a transcript first before generating an AI summary');
      return;
    }
    
    // Prevent duplicate requests
    if (isAiProcessing) {
      console.log('⚠️ Popup: Already processing AI request, ignoring duplicate');
      return;
    }
    
    // Set processing flag immediately to prevent rapid clicks
    setIsAiProcessing(true);
    
    setShowAIPopup(true);
    setAiError('');
    setStreamingText('');
    setStreamingProgress(0);
    
    try {
      console.log('🎯 Popup: Starting WebLLM summarization...');
      
      const response = await (await getExtensionService()).summarizeWithAI(extractedTranscript, {
        mode: aiSettings.summaryMode === SummaryMode.Simple ? 'balanced' : 'detailed',
        outputFormat: aiSettings.outputFormat,
        useWebLLM: aiSettings.useWebLLM,
        includeTimestamps: includeTimestamps
      });
      
      console.log('🎯 Popup: AI summarization response:', response);
      
      if (response.success) {
        setAiSummary(response.summary || '');
        setIsAiProcessing(false);
      } else {
        setAiError(response.error || 'Failed to generate summary');
        setIsAiProcessing(false);
      }
      
    } catch (error) {
      console.error('❌ Popup: AI summarization error:', error);
      setAiError(error instanceof Error ? error.message : 'Failed to generate summary');
      setIsAiProcessing(false);
    }
  };

  const handleAISummaryGenerated = (summary: string) => {
    setAiSummary(summary);
  };

  const handleCloseAIPopup = () => {
    setShowAIPopup(false);
  };


  // Test functions removed for production

  const handleExport = async (action: 'clipboard' | 'download') => {
    console.log('🎯 Export action:', action);
    console.log('🎯 Extracted transcript available:', !!extractedTranscript);
    console.log('🎯 Export format:', exportFormat);
    console.log('🎯 Include timestamps:', includeTimestamps);
    
    if (!extractedTranscript) {
      console.error('❌ No transcript available to export');
      setErrorMessage('No transcript available to export');
      return;
    }

    console.log('🎯 Original transcript length:', extractedTranscript.length);
    console.log('🎯 Sample transcript content:', extractedTranscript.substring(0, 200) + '...');

    const formattedTranscript = (await getExtensionService()).formatTranscript(
      extractedTranscript,
      exportFormat,
      includeTimestamps,
      currentVideo?.title
    );

    console.log('🎯 Formatted transcript length:', formattedTranscript.length);
    console.log('🎯 Sample formatted content:', formattedTranscript.substring(0, 200) + '...');

    try {
      switch (action) {
        case 'clipboard': {
          console.log('🎯 Attempting to copy to clipboard...');
          const copied = await (await getExtensionService()).copyToClipboard(formattedTranscript);
          if (!copied) {
            console.error('❌ Failed to copy to clipboard');
            setErrorMessage('Failed to copy to clipboard');
          } else {
            setErrorMessage(''); // Clear any previous errors
            console.log('✅ Transcript copied to clipboard successfully');
          }
          break;
        }

        case 'download': {
          console.log('🎯 Attempting to download...');
          const filename = (await getExtensionService()).generateFilename(
            currentVideo?.title || 'transcript',
            exportFormat
          );
          const mimeType = (await getExtensionService()).getMimeType(exportFormat);
          console.log('🎯 Download filename:', filename);
          console.log('🎯 MIME type:', mimeType);
          (await getExtensionService()).downloadFile(formattedTranscript, filename, mimeType);
          setErrorMessage(''); // Clear any previous errors
          console.log('✅ Transcript downloaded successfully');
          break;
        }
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      setErrorMessage('Export failed');
    }
  };

  // New function to append transcript to clipboard with storage management
  const appendToClipboard = async (transcript: string, lectureTitle: string) => {
    try {
      console.log('🎯 appendToClipboard called with:', { transcriptLength: transcript.length, lectureTitle });
      
      // Check if we're approaching the 5MB limit (roughly 5 million characters)
      const maxSize = 4.5 * 1024 * 1024; // 4.5MB to be safe
      
      if (clipboardData.length + transcript.length > maxSize) {
        console.log('⚠️ Clipboard storage limit reached');
        setErrorMessage('Clipboard storage limit reached! Please export current data first.');
        return false;
      }
      
      // Format the transcript with title and separator
      const formattedTranscript = `\n\n=== ${lectureTitle} ===\n${transcript}\n`;
      console.log('🎯 Formatted transcript length:', formattedTranscript.length);
      
      // Append to clipboard data
      const newClipboardData = clipboardData + formattedTranscript;
      console.log('🎯 New clipboard data length:', newClipboardData.length);
      setClipboardData(newClipboardData);
      
      // Update clipboard entries count
      const newEntries = clipboardEntries + 1;
      console.log('🎯 New clipboard entries count:', newEntries);
      setClipboardEntries(newEntries);
      
      // Save to Chrome storage
      console.log('🎯 Saving to Chrome storage...');
      await StorageService.saveClipboardData(newClipboardData, newEntries);
      console.log('✅ Chrome storage saved');
      
      // Copy to system clipboard
      console.log('🎯 Copying to system clipboard...');
      await navigator.clipboard.writeText(newClipboardData);
      console.log('✅ System clipboard updated');
      
      console.log('✅ appendToClipboard completed successfully');
      return true;
    } catch (error) {
      console.error('❌ appendToClipboard failed:', error);
      setErrorMessage('Failed to append transcript to clipboard');
      return false;
    }
  };

  // Batch collection methods
  const handleBatchModeToggle = async () => {
    if (!isBatchCollecting) {
      // Starting batch collection
      await handleStartBatchCollection();
    } else {
      // Stopping batch collection
      setIsBatchCollecting(false);
      setBatchProgress({});
      setBatchStats({ total: 0, completed: 0, failed: 0, skipped: 0 });
      setBatchMode('next');
    }
  };

  const handleStartBatchCollection = async () => {
    if (!availability?.hasTranscript) {
      return;
    }
    
    setIsBatchCollecting(true);
    setBatchProgress({});
    setErrorMessage('');
    
    // Use actual course structure to determine total sections
    try {
      // Get the actual course structure to determine total sections
      const courseResponse = await (await getExtensionService()).extractCourseStructure();
      if (courseResponse.success && courseResponse.data && courseResponse.data.sections) {
        const totalSections = courseResponse.data.sections.length;
        
        // Reset all counters to ensure clean start
        setBatchStats({ total: totalSections, completed: 0, failed: 0, skipped: 0 });
        setBatchProgress({});
        
        // Initialize current section
        const initialSection = getCurrentSectionNumber();
        setCurrentSection(initialSection.toString());
      } else {
        // Fallback to dynamic counting if course structure not available
        setBatchStats({ total: 0, completed: 0, failed: 0, skipped: 0 });
        setBatchProgress({});
        
        // Initialize current section
        const initialSection = getCurrentSectionNumber();
        setCurrentSection(initialSection.toString());
      }
    } catch (error) {
      setBatchStats({ total: 0, completed: 0, failed: 0, skipped: 0 });
      setBatchProgress({});
      
      // Initialize current section
      const initialSection = getCurrentSectionNumber();
      setCurrentSection(initialSection.toString());
    }
  };

  const handleNextOrCollect = async () => {
    console.log('🎯 handleNextOrCollect called, batchMode:', batchMode);
    try {
      if (batchMode === 'next') {
        // Navigate to next lecture
        setIsNavigating(true);
        
        // Set the current lecture name for progress display
        if (currentVideo?.title) {
          setCurrentProcessingLecture(currentVideo.title);
        }
        
        const response = await (await getExtensionService()).navigateToNextLecture();
        if (response.success) {
          setBatchMode('collect');
          setErrorMessage(''); // Clear any previous errors
          
          // Refresh page data after navigation
          setTimeout(async () => {
            try {
              await checkPageAvailability();
              setIsNavigating(false);
              
              // Update the current processing lecture after navigation
              const videoInfo = await (await getExtensionService()).getVideoInfo();
              if (videoInfo.success && videoInfo.data) {
                setCurrentVideo(videoInfo.data); // Update current video info
                setCurrentProcessingLecture(videoInfo.data.title);
              }
              
              // Show success message
              setErrorMessage(''); // Clear any previous errors
              
              // Keep popup focused to prevent closing
              try {
                window.focus();
              } catch (focusError) {
                console.log('Could not focus popup window:', focusError);
              }
            } catch (error) {
              console.log('Failed to refresh page data after navigation:', error);
              setIsNavigating(false);
            }
          }, 1500); // Wait 1.5 seconds for page to fully load
        } else {
          setErrorMessage('Failed to navigate to next lecture');
          setIsNavigating(false);
          setCurrentProcessingLecture(''); // Clear on failure
        }
      } else {
        // Collect transcript from current lecture
        console.log('📝 Collecting transcript from current lecture...');
        setCurrentProcessingLecture(currentVideo?.title || 'Processing...');
        
        const response = await (await getExtensionService()).collectCurrentTranscript();
        if (response.success && response.data) {
          const { lectureId, transcript } = response.data;
          
          // Update progress based on result
          if (transcript === 'NO_TRANSCRIPT_AVAILABLE') {
            setBatchProgress(prev => {
              const updated = { ...prev, [lectureId]: 'skipped' as const };
              return updated;
            });
            
            setBatchStats(prev => {
              const updated = { ...prev, skipped: prev.skipped + 1 };
              return updated;
            });
            setProgressUpdateTrigger(prev => prev + 1); // Force re-render
          } else if (transcript === 'EXTRACTION_FAILED') {
            setBatchProgress(prev => {
              const updated = { ...prev, [lectureId]: 'failed' as const };
              return updated;
            });
            
            setBatchStats(prev => {
              const updated = { ...prev, failed: prev.failed + 1 };
              return updated;
            });
            setProgressUpdateTrigger(prev => prev + 1); // Force re-render
          } else {
            setBatchProgress(prev => {
              const updated = { ...prev, [lectureId]: 'completed' as const };
              return updated;
            });
            
            // Append transcript to clipboard
            console.log('🎯 Attempting to append transcript to clipboard...');
            const clipboardSuccess = await appendToClipboard(transcript, currentVideo?.title || `Lecture ${lectureId}`);
            if (clipboardSuccess) {
              console.log('✅ Successfully appended transcript to clipboard');
            } else {
              console.error('❌ Failed to append transcript to clipboard');
              setErrorMessage('Failed to append transcript to clipboard');
            }
            
            // Don't increment completed count here - only increment when we move to a new section
            setProgressUpdateTrigger(prev => prev + 1); // Force re-render
          }
          
          // Switch back to next mode
          console.log('🔄 Switching back to next mode after successful collection');
          
          // Clear processing state first
          setCurrentProcessingLecture('');
          setErrorMessage('');
          
          // Force progress bar update
          setProgressUpdateTrigger(prev => prev + 1);
          
          // Keep popup focused to prevent closing
          try {
            window.focus();
          } catch (focusError) {
            console.log('Could not focus popup window:', focusError);
          }
          
          // Use a more reliable state update approach
          setTimeout(() => {
            console.log('🔄 Setting batchMode to next...');
            setBatchMode('next');
            console.log('✅ batchMode should now be next');
          }, 50);
        } else {
          setErrorMessage('Failed to collect transcript');
          setCurrentProcessingLecture(''); // Clear on failure
        }
      }
    } catch (error) {
      setErrorMessage(`Failed to ${batchMode === 'next' ? 'navigate' : 'collect'}`);
      setCurrentProcessingLecture(''); // Clear on error
    }
  };







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

      {/* Batch Collection Toggle */}
      <div className={`p-4 rounded-lg border transition-all duration-200 ${
        isBatchCollecting 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${isBatchCollecting ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} />
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isBatchCollecting ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`}>
                Batch Collection Mode
              </span>
              {isBatchCollecting && (
                <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full font-medium">
                  ACTIVE
                </span>
              )}
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isBatchCollecting}
              onChange={handleBatchModeToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className={`text-xs mt-2 ${isBatchCollecting ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
          {isBatchCollecting ? 'Batch collection is active - use Next/Collect buttons below' : 'Collect transcripts from multiple lectures automatically'}
        </p>
      </div>

      {/* Batch Collection Controls */}
      {isBatchCollecting && (
        <div className="space-y-4">
          {/* Simple Progress Bar - Always show when batch collecting */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-center text-sm mb-3">
              <div className="flex items-center gap-2">
                <LogIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-900 dark:text-blue-100 font-medium">Batch Collection Active</span>
              </div>
              <span className="text-blue-700 dark:text-blue-300">
                {batchStats.total > 0 ? `${batchStats.completed}/${batchStats.total} sections` : `${batchStats.completed} sections processed`}
              </span>
            </div>
            
            {/* Simple Progress Bar */}
            <div className="mb-3">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ 
                    width: `${Math.min(progressPercentage, 100)}%` 
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                <span>0%</span>
                <span className="font-medium">
                  {Math.round(progressPercentage)}%
                </span>
                <span>100%</span>
              </div>
            </div>

            {/* Current Status */}
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {currentProcessingLecture ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Processing: {currentProcessingLecture}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Ready to process next section</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Breakdown - Only show when we have stats */}
          {batchStats.total > 0 && (
            <div className="flex justify-between items-center text-xs">
              <div className="flex gap-3">
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  {batchStats.completed} completed
                </span>
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Clipboard className="w-3 h-3" />
                  {clipboardEntries} in clipboard
                </span>
                {batchStats.failed > 0 && (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    {batchStats.failed} failed
                  </span>
                )}
                {batchStats.skipped > 0 && (
                  <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <Clock className="w-3 h-3" />
                    {batchStats.skipped} skipped
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <LogIcon className="w-3 h-3" />
                <span>Log</span>
              </div>
            </div>
          )}

          {/* Batch Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleNextOrCollect}
              disabled={isNavigating}
              className={`w-full py-3 px-4 text-white rounded-lg text-sm font-medium transition-colors ${
                batchMode === 'next' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-green-600 hover:bg-green-700'
              } ${isNavigating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isNavigating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Navigating...</span>
                </div>
              ) : (
                <span>
                  {batchMode === 'next' ? '➡ Next Section' : '📝 Collect Transcript'}
                  {/* Debug info */}
                  <span className="text-xs opacity-75 ml-2">({batchMode})</span>
                </span>
              )}
            </button>
          </div>

          {/* Clipboard Management Buttons */}
          {clipboardEntries > 0 && (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const blob = new Blob([clipboardData], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `batch-transcripts-${Date.now()}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    setErrorMessage('Batch transcripts downloaded!');
                  } catch (error) {
                    setErrorMessage('Failed to download batch transcripts');
                  }
                }}
                className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <LogIcon className="w-4 h-4" />
                Export All ({clipboardEntries})
              </button>
              <button
                onClick={async () => {
                  try {
                    await StorageService.clearClipboardData();
                    setClipboardData('');
                    setClipboardEntries(0);
                    setErrorMessage('Clipboard data cleared!');
                  } catch (error) {
                    setErrorMessage('Failed to clear clipboard data');
                  }
                }}
                className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                🗑️ Clear
              </button>
            </div>
          )}


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
                       <LogIcon className="w-6 h-6" />
            <span>Extract Transcript</span>
          </div>
        )}
      </button>

      {/* Course Structure - Hidden to simplify UI */}
      {process.env.NODE_ENV === 'development' && false && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
                      <LogIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Course Structure</span>
        </div>
        {isCourseStructureLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Loading course structure...</span>
          </div>
        ) : courseStructure && courseStructure.sections && courseStructure.sections.length > 0 ? (
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
        ) : (
          <div className="text-center p-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">No course structure found</span>
          </div>
        )}
        </div>
      )}

      {/* AI Summarize Button - Only option after extraction */}
      {extractionStatus === 'success' && extractedTranscript && (
        <button
          onClick={handleAISummarize}
          className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span>🤖 AI Summarize</span>
          </div>
          <div className="text-xs mt-1 opacity-90 text-center">
            Context-aware summary generation
          </div>
          <div className="text-xs mt-1 opacity-75 text-center">
            {systemPerformance.timingDisplay}
          </div>
          <div className="text-xs mt-1 opacity-60 text-center">
            {systemPerformance.detailedTimingDisplay}
          </div>
          <div className="text-xs mt-1 opacity-50 text-center">
            ⚠️ May take longer due to system load or model initialization
          </div>
        </button>
      )}
    </div>;

  // Shared Export Options Component
  const ExportOptionsSection = () => <div className="space-y-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Export Transcript
        </h3>
      </div>
      
      {/* Export Format */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Choose Format
        </label>
        <div className="relative">
          <button 
            onClick={() => setShowFormatDropdown(!showFormatDropdown)} 
            className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                {exportFormat === 'rag' ? 'RAG Format' : exportFormat.toUpperCase()}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showFormatDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showFormatDropdown && (
            <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl z-20 overflow-hidden">
              {['markdown', 'txt', 'json', 'rag'].map((format, index) => (
                <button 
                  key={format} 
                  onClick={() => {
                    setExportFormat(format as 'markdown' | 'txt' | 'json' | 'rag');
                    setShowFormatDropdown(false);
                  }} 
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors duration-150 ${
                    exportFormat === format 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } ${index === 0 ? 'rounded-t-xl' : ''} ${index === 3 ? 'rounded-b-xl' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${exportFormat === format ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    <span>{format === 'rag' ? 'RAG Format' : format.toUpperCase()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => handleExport('clipboard')}
          className="flex-1 flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Clipboard className="w-4 h-4" />
          <span className="text-sm">Copy</span>
        </button>
        
        <button
          onClick={() => handleExport('download')}
          className="flex-1 flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm">Download</span>
        </button>
      </div>

    </div>;


  return (
    <>
      <div className="w-[400px] h-[700px] bg-white dark:bg-gray-900 flex flex-col shadow-2xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                 <div className="flex items-center space-x-3">
                       <div className="p-1 bg-white rounded-lg shadow-sm border border-gray-200">
              <LogIcon className="w-12 h-12" />
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



      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
            <ExtractSection />
            {/* Show export options only after successful extraction */}
            {extractionStatus === 'success' && extractedTranscript && (
              <ExportOptionsSection />
            )}
            </div>
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
      </div>

      {/* AI Summarization Popup */}
      {showAIPopup && (
        <AISummarizationPopup
          transcript={extractedTranscript}
          onClose={handleCloseAIPopup}
          onSummaryGenerated={handleAISummaryGenerated}
          initialSettings={aiSettings}
        />
      )}
    </>
  );
};