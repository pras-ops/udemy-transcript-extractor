"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from 'react';
import { FileText, Sun, Moon, Download, ChevronDown, Clock, Clipboard, Play, Lock, Github, Zap, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { ExtensionService } from '../../lib/extension-service';
import { StorageService } from '../../lib/storage-service';
import { AISummarizationPopup } from './AISummarizationPopup';

// Simple debouncing utility
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
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
  
  // Batch collection states
  const [batchMode, setBatchMode] = useState<'next' | 'collect'>('next');
  const [batchProgress, setBatchProgress] = useState<{[lectureId: string]: 'pending' | 'collecting' | 'completed' | 'failed' | 'skipped'}>({});
  const [isBatchCollecting, setIsBatchCollecting] = useState(false);
  const [batchStats, setBatchStats] = useState({ total: 0, completed: 0, failed: 0, skipped: 0 });
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentProcessingLecture, setCurrentProcessingLecture] = useState<string>('');
  const [currentSection, setCurrentSection] = useState<string>('');
  const [progressUpdateTrigger, setProgressUpdateTrigger] = useState(0);
  const [clipboardEntries, setClipboardEntries] = useState(0);
  const [clipboardData, setClipboardData] = useState<string>('');
  
  // AI Summarization states
  const [showAIPopup, setShowAIPopup] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  
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
    
    loadSavedState();
    checkPageAvailability();
    
    // Load clipboard data from storage
    const loadClipboardData = async () => {
      try {
        const { clipboardData: savedData, clipboardEntries: savedEntries } = await StorageService.loadClipboardData();
        setClipboardData(savedData);
        setClipboardEntries(savedEntries);
        // Loaded clipboard data from storage
      } catch (error) {
        console.error('Failed to load clipboard data:', error);
      }
    };
    
    loadClipboardData();
    
    // Simple cleanup on unmount
    return () => {
      setExtractionStatus('idle');
      setExtractedTranscript('');
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
      
      // Restore batch collection state - but only if user was actively collecting
      // For new sessions, always start with batch collection inactive
      const wasActivelyCollecting = savedState.isBatchCollecting && savedState.batchStats.total > 0;
      
      if (wasActivelyCollecting) {
        // User was in middle of batch collection - restore their state
        setBatchMode(savedState.batchMode);
        setBatchProgress(savedState.batchProgress);
        setBatchStats(savedState.batchStats);
        setIsBatchCollecting(true);
        setCurrentProcessingLecture(savedState.currentProcessingLecture || '');
      } else {
        // New session or user wasn't collecting - start fresh
        setBatchMode('next');
        setBatchProgress({});
        setBatchStats({ total: 0, completed: 0, failed: 0, skipped: 0 });
        setIsBatchCollecting(false);
        setCurrentProcessingLecture('');
      }
      
      // Restore other UI state
      setExportFormat(savedState.exportFormat);
      setExportTarget(savedState.exportTarget);
      setIncludeTimestamps(savedState.includeTimestamps);
      
      // Validate extracted transcript - reset if invalid
      if (savedState.extractedTranscript && savedState.extractedTranscript.trim().length > 0) {
        setExtractedTranscript(savedState.extractedTranscript);
        setExtractionStatus(savedState.extractionStatus);
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
      
      // State restored from storage
    } catch (error) {
      console.error('Failed to load saved state:', error);
    }
  };

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
          setIsCourseStructureLoading(true);
          const courseResponse = await ExtensionService.extractCourseStructure();
                if (courseResponse.success && courseResponse.data) {
              setCourseStructure(courseResponse.data);
          } else {
            console.warn('Could not get course structure:', courseResponse.error);
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
    console.log('🎯 handleExtractTranscript called');
    console.log('🎯 availability:', availability);
    console.log('🎯 hasTranscript:', availability?.hasTranscript);
    
    if (!availability?.hasTranscript) {
      console.log('🎯 No transcript available, aborting');
      setErrorMessage('No transcript available for this video');
      setExtractionStatus('error');
      return;
    }

    setIsExtracting(true);
    setExtractionStatus('extracting');
    setErrorMessage('');

    try {
      console.log('🎯 Calling ExtensionService.extractTranscript()...');
      const response = await ExtensionService.extractTranscript();
      console.log('🎯 ExtensionService.extractTranscript() response:', response);
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

  // AI Summarization handlers
  const handleAISummarize = () => {
    if (!extractedTranscript || extractedTranscript.trim().length === 0) {
      setErrorMessage('Please extract a transcript first before generating an AI summary');
      return;
    }
    setShowAIPopup(true);
  };

  const handleAISummaryGenerated = (summary: string) => {
    setAiSummary(summary);
  };

  const handleCloseAIPopup = () => {
    setShowAIPopup(false);
  };

  // Test functions removed for production

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


      }
    } catch (error) {
      setErrorMessage('Export failed');
    }
  };

  // New function to append transcript to clipboard with storage management
  const appendToClipboard = async (transcript: string, lectureTitle: string) => {
    try {
      // Check if we're approaching the 5MB limit (roughly 5 million characters)
      const maxSize = 4.5 * 1024 * 1024; // 4.5MB to be safe
      
      if (clipboardData.length + transcript.length > maxSize) {
        setErrorMessage('Clipboard storage limit reached! Please export current data first.');
        return false;
      }

      // Format the transcript with title and separator
      const formattedTranscript = `\n\n=== ${lectureTitle} ===\n${transcript}\n`;
      
      // Append to clipboard data
      const newClipboardData = clipboardData + formattedTranscript;
      setClipboardData(newClipboardData);
      
      // Update clipboard entries count
      const newEntries = clipboardEntries + 1;
      setClipboardEntries(newEntries);
      
      // Save to Chrome storage
      await StorageService.saveClipboardData(newClipboardData, newEntries);
      
      // Copy to system clipboard
      await navigator.clipboard.writeText(newClipboardData);
      
      console.log('🎯 Appended transcript to clipboard. Total entries:', newEntries);
      return true;
    } catch (error) {
      console.error('Failed to append to clipboard:', error);
      setErrorMessage('Failed to append transcript to clipboard');
      return false;
    }
  };

  // Batch collection methods
  const handleBatchModeToggle = async () => {
    if (!isBatchCollecting) {
      // Starting batch collection
      console.log('🎯 Batch mode toggled ON - starting batch collection');
      await handleStartBatchCollection();
    } else {
      // Stopping batch collection
      console.log('🎯 Batch mode toggled OFF - stopping batch collection');
      setIsBatchCollecting(false);
      setBatchProgress({});
      setBatchStats({ total: 0, completed: 0, failed: 0, skipped: 0 });
      setBatchMode('next');
    }
  };

  const handleStartBatchCollection = async () => {
    console.log('🎯 Starting batch collection with course structure...');
    if (!availability?.hasTranscript) {
      console.log('🎯 No transcript available, aborting batch collection');
      return;
    }
    
    setIsBatchCollecting(true);
    setBatchProgress({});
    setErrorMessage('');
    
    // Use actual course structure to determine total sections
    try {
      // Get the actual course structure to determine total sections
      const courseResponse = await ExtensionService.extractCourseStructure();
      if (courseResponse.success && courseResponse.data && courseResponse.data.sections) {
        const totalSections = courseResponse.data.sections.length;
        console.log('🎯 Using actual course structure - total sections:', totalSections);
        
        // Reset all counters to ensure clean start
        setBatchStats({ total: totalSections, completed: 0, failed: 0, skipped: 0 });
        setBatchProgress({});
        console.log('🎯 Reset batch stats to zero');
        
        // Initialize current section
        const initialSection = getCurrentSectionNumber();
        setCurrentSection(initialSection.toString());
        console.log('🎯 Batch collection started with total sections:', totalSections, 'starting from section:', initialSection);
      } else {
        // Fallback to dynamic counting if course structure not available
        console.log('🎯 Course structure not available, using dynamic counting');
        setBatchStats({ total: 0, completed: 0, failed: 0, skipped: 0 });
        setBatchProgress({});
        
        // Initialize current section
        const initialSection = getCurrentSectionNumber();
        setCurrentSection(initialSection.toString());
        console.log('🎯 Batch collection started with dynamic counting, starting from section:', initialSection);
      }
    } catch (error) {
      console.log('🎯 Error setting up section counting, using dynamic counting:', error);
      setBatchStats({ total: 0, completed: 0, failed: 0, skipped: 0 });
      setBatchProgress({});
      
      // Initialize current section
      const initialSection = getCurrentSectionNumber();
      setCurrentSection(initialSection.toString());
      console.log('🎯 Batch collection started with error fallback, starting from section:', initialSection);
    }
  };

  const handleNextOrCollect = async () => {
    try {
      if (batchMode === 'next') {
        // Navigate to next lecture
        setIsNavigating(true);
        
        // Set the current lecture name for progress display
        if (currentVideo?.title) {
          setCurrentProcessingLecture(currentVideo.title);
        }
        
        const response = await ExtensionService.navigateToNextLecture();
        if (response.success) {
          setBatchMode('collect');
          setErrorMessage(''); // Clear any previous errors
          
          // Refresh page data after navigation
          setTimeout(async () => {
            try {
              await checkPageAvailability();
              setIsNavigating(false);
              
              // Update the current processing lecture after navigation
              const videoInfo = await ExtensionService.getVideoInfo();
              if (videoInfo.success && videoInfo.data) {
                setCurrentVideo(videoInfo.data); // Update current video info
                setCurrentProcessingLecture(videoInfo.data.title);
              }
              
              // Show success message
              setErrorMessage(''); // Clear any previous errors
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
        setCurrentProcessingLecture(currentVideo?.title || 'Processing...');
        
        const response = await ExtensionService.collectCurrentTranscript();
        if (response.success && response.data) {
          const { lectureId, transcript } = response.data;
          
          // Update progress based on result
          console.log('🎯 Updating batch progress for lecture:', lectureId, 'with transcript result:', transcript);
          
          if (transcript === 'NO_TRANSCRIPT_AVAILABLE') {
            setBatchProgress(prev => {
              const updated = { ...prev, [lectureId]: 'skipped' as const };
              console.log('🎯 Updated batch progress (skipped):', updated);
              return updated;
            });
            
            setBatchStats(prev => {
              const updated = { ...prev, skipped: prev.skipped + 1 };
              console.log('🎯 Updated batch stats (skipped):', updated);
              return updated;
            });
            setProgressUpdateTrigger(prev => prev + 1); // Force re-render
          } else if (transcript === 'EXTRACTION_FAILED') {
            setBatchProgress(prev => {
              const updated = { ...prev, [lectureId]: 'failed' as const };
              console.log('🎯 Updated batch progress (failed):', updated);
              return updated;
            });
            
            setBatchStats(prev => {
              const updated = { ...prev, failed: prev.failed + 1 };
              console.log('🎯 Updated batch stats (failed):', updated);
              return updated;
            });
            setProgressUpdateTrigger(prev => prev + 1); // Force re-render
          } else {
            setBatchProgress(prev => {
              const updated = { ...prev, [lectureId]: 'completed' as const };
              console.log('🎯 Updated batch progress (completed):', updated);
              return updated;
            });
            
            // Append transcript to clipboard
            const success = await appendToClipboard(transcript, currentVideo?.title || `Lecture ${lectureId}`);
            if (success) {
              console.log('🎯 Transcript appended to clipboard successfully');
            } else {
              console.log('🎯 Failed to append transcript to clipboard');
            }
            
            // Don't increment completed count here - only increment when we move to a new section
            console.log('🎯 Transcript collected successfully, but not incrementing section count yet');
            setProgressUpdateTrigger(prev => prev + 1); // Force re-render
          }
          
          // Switch back to next mode
          setBatchMode('next');
          setErrorMessage(''); // Clear any previous errors
          setCurrentProcessingLecture(''); // Clear processing state
          
          // Force progress bar update
          setProgressUpdateTrigger(prev => prev + 1);
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
                <span>{batchMode === 'next' ? '➡ Next Section' : '📝 Collect Transcript'}</span>
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

      {/* AI Summarization Button */}
      {extractionStatus === 'success' && extractedTranscript && (
        <button 
          onClick={handleAISummarize}
          className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span>AI Summarize</span>
          </div>
        </button>
      )}

      {/* Course Structure */}
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
               {['markdown', 'txt', 'json', 'rag'].map(format => <button key={format} onClick={() => {
             setExportFormat(format as 'markdown' | 'txt' | 'json' | 'rag');
             setShowFormatDropdown(false);
           }} className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg capitalize">
                   <span>{format === 'rag' ? 'RAG' : format}</span>
                 </button>)}
             </div>}
        </div>
      </div>

      {/* Include Timestamps Toggle - Hidden for now */}
      {/* <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Include Timestamps</span>
        </div>
        <button onClick={() => setIncludeTimestamps(!includeTimestamps)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeTimestamps ? 'bg-[#4CAF50]' : 'bg-gray-300 dark:bg-gray-600'}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeTimestamps ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div> */}


    </div>;


  return (
    <>
      <div className="w-[400px] h-[600px] bg-white dark:bg-gray-900 flex flex-col shadow-2xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
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
            <ExportOptionsSection />
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
        />
      )}
    </>
  );
};