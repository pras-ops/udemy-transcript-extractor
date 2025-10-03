"use client";

import * as React from "react";
import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Copy, 
  Download, 
  Cpu, 
  Zap, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Info
} from 'lucide-react';
import { aiSummarizationService, SummarizationOptions, SummarizationResult, SummaryMode } from '../../lib/ai-summarization-service';

interface AISummarizationPopupProps {
  transcript: string;
  onClose: () => void;
  onSummaryGenerated?: (summary: string) => void;
  initialSettings?: {
    summaryMode?: SummaryMode;
    outputFormat?: 'paragraph' | 'bullet-points' | 'numbered-list';
    useWebLLM?: boolean;
    includeExamples?: boolean;
    includeDefinitions?: boolean;
  };
}

export const AISummarizationPopup: React.FC<AISummarizationPopupProps> = ({
  transcript,
  onClose,
  onSummaryGenerated,
  initialSettings
}) => {
  console.log('🎯 AISummarizationPopup: Component mounted with transcript length:', transcript?.length);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [engine, setEngine] = useState<'webllm' | 'transformers' | 'mock' | 'enhanced' | 'simple' | 'rag-enhanced' | 'enhanced-local' | 'dynamic-enhanced' | 'error' | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [subjects, setSubjects] = useState<Array<{name: string, confidence: number, keywords: string[]}>>([]);
  const [primarySubject, setPrimarySubject] = useState<string>('');
  const [options, setOptions] = useState<SummarizationOptions>({
    summaryMode: initialSettings?.summaryMode ?? SummaryMode.Simple, // Default: Simple overview
    useWebLLM: initialSettings?.useWebLLM ?? true, // Enable AI engines for better summarization
    outputFormat: initialSettings?.outputFormat ?? 'paragraph',
    includeExamples: initialSettings?.includeExamples ?? true,
    includeDefinitions: initialSettings?.includeDefinitions ?? true,
    focusAreas: []
  });
  const [availableEngines, setAvailableEngines] = useState<{ webllm: boolean; transformers: boolean; mock: boolean }>({
    webllm: true, // AI engines restored for better summarization
    transformers: true, // AI engines restored for better summarization
    mock: true // Local processing always available
  });
  const [setupInstructions, setSetupInstructions] = useState<string>('');
  const [wordCountInfo, setWordCountInfo] = useState<{
    original: number;
    summary: number;
    target?: number;
    compressionRatio?: number;
  } | null>(null);

  // Load saved settings from storage, but prioritize initialSettings
  const loadSavedSettings = async () => {
    try {
      const result = await chrome.storage.local.get(['aiSummarizationSettings']);
      if (result.aiSummarizationSettings) {
        // Merge saved settings with initialSettings, giving priority to initialSettings
        const mergedSettings = {
          ...result.aiSummarizationSettings,
          ...initialSettings
        };
        setOptions(mergedSettings);
        console.log('🎯 AISummarizationPopup: Loaded merged settings:', mergedSettings);
      } else if (initialSettings) {
        // If no saved settings but we have initialSettings, use them
        setOptions(prev => ({ ...prev, ...initialSettings }));
        console.log('🎯 AISummarizationPopup: Using initialSettings:', initialSettings);
      }
    } catch (error) {
      console.log('Could not load saved settings, using defaults');
      // Fallback to initialSettings if available
      if (initialSettings) {
        setOptions(prev => ({ ...prev, ...initialSettings }));
        console.log('🎯 AISummarizationPopup: Fallback to initialSettings:', initialSettings);
      }
    }
  };

  // Save settings to storage
  const saveSettings = async (newOptions: SummarizationOptions) => {
    try {
      await chrome.storage.local.set({ aiSummarizationSettings: newOptions });
    } catch (error) {
      console.log('Could not save settings');
    }
  };

  useEffect(() => {
    console.log('🎯 AISummarizationPopup: useEffect mount');
    console.log('🎯 AISummarizationPopup: initialSettings:', initialSettings);
    
    // Load saved settings first (this will now prioritize initialSettings)
    loadSavedSettings();
    
    // Set engines to local-only mode (privacy-first approach)
    const engines = { webllm: false, transformers: false, mock: true };
    console.log('🎯 Privacy-first mode: Local processing only');
    setAvailableEngines(engines);
    
    // Get setup instructions
    const instructions = aiSummarizationService.getSetupInstructions();
    setSetupInstructions(instructions);
    
    // Test the service directly
    console.log('🎯 Testing AI service directly...');
    aiSummarizationService.summarizeTranscript('Test transcript for debugging', {
      summaryMode: SummaryMode.Simple
    }).then(result => {
      console.log('🎯 Direct test result:', result);
    }).catch(error => {
      console.log('🎯 Direct test error:', error);
    });
  }, [initialSettings]); // Add initialSettings as dependency

  // Track engine state changes for debugging
  useEffect(() => {
    console.log('🎯 AISummarizationPopup: Engine state changed to:', engine);
  }, [engine]);

  // Auto-start summarization when transcript is provided
  useEffect(() => {
    if (transcript && transcript.trim().length > 0) {
      // Clear previous results when transcript changes
      setSummary('');
      setError('');
      setEngine(null);
      setWordCountInfo(null);
      
      // Auto-start summarization after a short delay to allow settings to load
      const timer = setTimeout(() => {
        handleSummarize();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [transcript]);

  // Listen for WebLLM streaming messages
  useEffect(() => {
    const handleMessage = (message: any) => {
      console.log('🎯 AISummarizationPopup: Received message:', message.type);
      
      if (message.type === 'AI_SUMMARIZE_CHUNK') {
        // Handle streaming chunks
        setStreamingText(prev => prev + (message.data.chunk || ''));
        setSummary(message.data.fullResponse || '');
        setIsStreaming(true);
      } else if (message.type === 'AI_SUMMARIZE_RESPONSE') {
        // Handle final response
        if (message.data.success) {
          setSummary(message.data.summary || '');
          setEngine(message.data.engine || 'webllm');
        } else {
          const errorMessage = message.data.error || 'Failed to generate summary';
          setError(errorMessage);
          
          // Check if it's a system compatibility error
          if (errorMessage.includes('System not compatible') || errorMessage.includes('hardware may not support')) {
            setEngine('error');
          }
        }
        setIsSummarizing(false);
        setIsStreaming(false);
        setStreamingText('');
        setStreamingProgress(0);
      } else if (message.type === 'WEBLLM_LOAD_PROGRESS') {
        // Handle model loading progress
        setStreamingProgress(message.data.progress || 0);
        console.log(`🎯 AISummarizationPopup: WebLLM loading ${message.data.progress}% - ${message.data.text}`);
      } else if (message.type === 'TRANSFORMERS_LOAD_PROGRESS') {
        // Handle Transformers.js loading progress
        setStreamingProgress(message.data.progress || 0);
        console.log(`🎯 AISummarizationPopup: Transformers.js loading ${message.data.progress}%`);
      } else if (message.type === 'WEBLLM_CHUNK_PROGRESS') {
        // Handle hierarchical processing progress
        console.log(`🎯 AISummarizationPopup: Processing chunk ${message.data.current}/${message.data.total}`);
        setStreamingProgress(Math.round((message.data.current / message.data.total) * 100));
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleSummarize = async () => {
    console.log('🎯 AISummarizationPopup: handleSummarize called');
    console.log('🎯 AISummarizationPopup: transcript length:', transcript?.length);
    console.log('🎯 AISummarizationPopup: options:', options);
    console.log('🎯 AISummarizationPopup: summaryMode:', options.summaryMode);
    console.log('🎯 AISummarizationPopup: outputFormat:', options.outputFormat);
    
    if (!transcript || transcript.trim().length === 0) {
      console.log('🎯 AISummarizationPopup: No transcript provided');
      setError('No transcript provided for summarization');
      return;
    }

    console.log('🎯 AISummarizationPopup: Starting WebLLM summarization...');
    setIsSummarizing(true);
    setError('');
    setSummary('');
    setStreamingText('');
    setStreamingProgress(0);

    try {
      console.log('🎯 AISummarizationPopup: Calling ExtensionService.summarizeWithAI...');
      console.log('🎯 AISummarizationPopup: Final options being passed:', options);
      
      // Import ExtensionService dynamically to avoid circular dependencies
      const { ExtensionService } = await import('../../lib/extension-service');
      
      const result = await ExtensionService.summarizeWithAI(transcript, {
        mode: options.summaryMode === SummaryMode.Simple ? 'balanced' : 'detailed',
        outputFormat: options.outputFormat,
        useWebLLM: true,
        includeTimestamps: false
      });
      
      console.log('🎯 AISummarizationPopup: Received WebLLM result:', result);

      if (result.success && result.data?.summary) {
        console.log('🎯 AISummarizationPopup: Summary generated successfully');
        console.log('🎯 AISummarizationPopup: Engine received:', result.data.engine);
        setSummary(result.data.summary);
        setEngine(result.data.engine || 'webllm');
        
        // Update word count information
        if (result.data.wordCount) {
          setWordCountInfo({
            original: transcript.split(/\s+/).length,
            summary: result.data.summary.split(/\s+/).length,
            compressionRatio: result.data.summary.split(/\s+/).length / transcript.split(/\s+/).length
          });
        }
        
        onSummaryGenerated?.(result.data.summary);
      } else {
        console.log('🎯 AISummarizationPopup: Summarization failed:', result.error);
        setError(result.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('🎯 AISummarizationPopup: Summarization error:', error);
      setError(`Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopySummary = async () => {
    if (summary) {
      try {
        await navigator.clipboard.writeText(summary);
        // You could add a toast notification here
      } catch (error) {
        setError('Failed to copy summary to clipboard');
      }
    }
  };

  const handleDownloadSummary = () => {
    if (summary) {
      const blob = new Blob([summary], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-summary-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getEngineIcon = (engineType: string) => {
    switch (engineType) {
      case 'webllm':
        return <Zap className="w-4 h-4 text-purple-500" />;
      case 'transformers':
        return <Cpu className="w-4 h-4 text-blue-500" />;
      case 'enhanced':
        return <Sparkles className="w-4 h-4 text-green-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEngineName = (engineType: string) => {
    switch (engineType) {
      case 'webllm':
        return 'WebLLM (GPU)';
      case 'transformers':
        return 'Transformers.js (CPU)';
      case 'mock':
        return 'Basic Summary (Mock)';
      case 'enhanced':
        return 'Enhanced Summary (Local)';
      case 'simple':
        return 'Enhanced Summary (Local)';
      case 'rag-enhanced':
        return 'RAG-Enhanced AI (Local)';
      case 'enhanced-local':
        return 'Enhanced Local Processing';
      case 'error':
        return 'Processing Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                AI Transcript Summary
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                Powered by local AI models
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          {isSummarizing ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur opacity-30 animate-pulse"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Generating Summary...
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
                This may take a few moments depending on your device and the transcript length.
              </p>
              <div className="mt-4 w-64 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Summarization Failed
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 text-center mb-6 max-w-md">
                {error}
              </p>
              <button
                onClick={handleSummarize}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Try Again
              </button>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              {/* Engine Info and Word Count */}
              <div className="space-y-4">
                {engine && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div className="p-2 bg-white dark:bg-gray-600 rounded-lg shadow-sm">
                      {getEngineIcon(engine)}
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Generated with {getEngineName(engine)}
                    </span>
                  </div>
                )}
                
                {wordCountInfo && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="text-center p-2.5 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{wordCountInfo.original}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Original Words</div>
                      </div>
                      <div className="text-center p-2.5 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">{wordCountInfo.summary}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Summary Words</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                            <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">TARGET</span>
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">
                            {wordCountInfo.target ? (
                              <span>{wordCountInfo.target} words ({options.summaryMode === SummaryMode.Simple ? 'Simple Overview' : 'Study Notes'})</span>
                            ) : (
                              <span>{options.summaryMode === SummaryMode.Simple ? 'Simple Overview' : 'Study Notes'} mode</span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                            <span className="text-green-600 dark:text-green-400 text-xs font-bold">RATIO</span>
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            {Math.round((wordCountInfo.summary / wordCountInfo.original) * 100)}% of original
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Summary
                  </h3>
                </div>
                <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans leading-relaxed">
                    {summary}
                  </pre>
                </div>
              </div>

              {/* Dynamic Subject Information */}
              {primarySubject && subjects.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                      <Info className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Detected Subjects
                    </h3>
                  </div>
                  <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                          Primary Subject
                        </h4>
                        <div className="px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <span className="text-green-700 dark:text-green-400 font-medium">
                            {primarySubject}
                          </span>
                        </div>
                      </div>
                      
                      {subjects.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                            All Detected Subjects
                          </h4>
                          <div className="space-y-2">
                            {subjects.map((subject, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {subject.name}
                                  </span>
                                  {subject.keywords.length > 0 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      Keywords: {subject.keywords.join(', ')}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {Math.round(subject.confidence * 100)}% confidence
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleCopySummary}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Copy className="w-4 h-4" />
                  Copy Summary
                </button>
                <button
                  onClick={handleDownloadSummary}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-full blur opacity-20 animate-pulse"></div>
                </div>
                
                {/* Generate Summary Button */}
                {!summary && !isSummarizing && (
                  <button
                    onClick={handleSummarize}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-600 hover:from-purple-600 hover:via-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-105"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Generate Summary
                    </div>
                  </button>
                )}
              </div>

              {/* Summary Display */}
              {summary && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      AI Summary
                    </h3>
                    {engine && (
                      <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {engine === 'webllm' ? 'WebLLM' : 
                           engine === 'transformers' ? 'Transformers.js' : 
                           engine === 'enhanced' ? 'Enhanced' : 
                           engine === 'dynamic-enhanced' ? 'Dynamic AI' : 
                           'Basic'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">
                        Summarization Error
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isSummarizing && (
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                        {streamingProgress > 0 ? `Loading WebLLM Model... ${streamingProgress}%` : 'Generating Summary...'}
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {streamingProgress > 0 ? 'Initializing AI model for processing' : 'Processing transcript with WebLLM'}
                      </p>
                      {streamingProgress > 0 && (
                        <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${streamingProgress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Streaming State */}
              {isStreaming && streamingText && (
                <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Zap className="w-4 h-4 text-green-600 dark:text-green-400 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-green-800 dark:text-green-200">
                        Streaming Summary
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        WebLLM generating real-time summary
                      </p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {streamingText}
                      <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy-First Information */}
              <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <span className="text-green-600 dark:text-green-400 text-lg">🔒</span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Privacy-First Processing
                  </h4>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                  <p>This extension prioritizes your privacy by processing all data locally:</p>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <pre className="whitespace-pre-wrap text-xs font-mono text-gray-600 dark:text-gray-400">
{setupInstructions}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                  <span className="text-green-600 dark:text-green-400 text-xs">🔒</span>
                </div>
                <span className="text-gray-600 dark:text-gray-400 font-medium">Privacy Protected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                  <span className="text-blue-600 dark:text-blue-400 text-xs">🏠</span>
                </div>
                <span className="text-gray-600 dark:text-gray-400 font-medium">Runs Locally</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                  <Cpu className="w-3 h-3 text-blue-500" />
                </div>
                <span className="text-gray-600 dark:text-gray-400 font-medium">Enhanced Local</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
