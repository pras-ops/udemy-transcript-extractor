"use client";

import * as React from "react";
import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Copy, 
  Download, 
  Settings, 
  Cpu, 
  Zap, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Info
} from 'lucide-react';
import { aiSummarizationService, SummarizationOptions, SummarizationResult } from '../../lib/ai-summarization-service';

interface AISummarizationPopupProps {
  transcript: string;
  onClose: () => void;
  onSummaryGenerated?: (summary: string) => void;
}

export const AISummarizationPopup: React.FC<AISummarizationPopupProps> = ({
  transcript,
  onClose,
  onSummaryGenerated
}) => {
  console.log('🎯 AISummarizationPopup: Component mounted with transcript length:', transcript?.length);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [engine, setEngine] = useState<'webllm' | 'transformers' | 'mock' | 'enhanced' | null>(null);
  const [options, setOptions] = useState<SummarizationOptions>({
    maxLength: 150,
    minLength: 50,
    useWebLLM: true,
    compressionPercentage: 10, // Default: retain 10% of original (more aggressive compression)
    maxLengthCap: 1000,
    outputFormat: 'paragraph',
    targetWordCount: 300,
    includeExamples: true,
    includeDefinitions: true,
    focusAreas: []
  });
  const [showSettings, setShowSettings] = useState(false);
  const [availableEngines, setAvailableEngines] = useState<{ webllm: boolean; transformers: boolean; mock: boolean }>({
    webllm: false,
    transformers: false,
    mock: true
  });
  const [setupInstructions, setSetupInstructions] = useState<string>('');
  const [wordCountInfo, setWordCountInfo] = useState<{
    original: number;
    summary: number;
    target?: number;
    compressionRatio?: number;
  } | null>(null);

  // Load saved settings from storage
  const loadSavedSettings = async () => {
    try {
      const result = await chrome.storage.local.get(['aiSummarizationSettings']);
      if (result.aiSummarizationSettings) {
        setOptions(result.aiSummarizationSettings);
      }
    } catch (error) {
      console.log('Could not load saved settings, using defaults');
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
    
    // Load saved settings first
    loadSavedSettings();
    
    // Check available engines on mount
    const engines = aiSummarizationService.getAvailableEngines();
    console.log('🎯 Available engines from service:', engines);
    setAvailableEngines(engines);
    
    // Get setup instructions
    const instructions = aiSummarizationService.getSetupInstructions();
    setSetupInstructions(instructions);
    
    // Test the service directly
    console.log('🎯 Testing AI service directly...');
    aiSummarizationService.summarizeTranscript('Test transcript for debugging', {
      compressionPercentage: 60,
      maxLengthCap: 1000
    }).then(result => {
      console.log('🎯 Direct test result:', result);
    }).catch(error => {
      console.log('🎯 Direct test error:', error);
    });
  }, []);

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

  const handleSummarize = async () => {
    console.log('🎯 AISummarizationPopup: handleSummarize called');
    console.log('🎯 AISummarizationPopup: transcript length:', transcript?.length);
    console.log('🎯 AISummarizationPopup: options:', options);
    
    if (!transcript || transcript.trim().length === 0) {
      console.log('🎯 AISummarizationPopup: No transcript provided');
      setError('No transcript provided for summarization');
      return;
    }

    console.log('🎯 AISummarizationPopup: Starting summarization...');
    setIsSummarizing(true);
    setError('');
    setSummary('');

    try {
      console.log('🎯 AISummarizationPopup: Calling aiSummarizationService.summarizeTranscript...');
      const result: SummarizationResult = await aiSummarizationService.summarizeTranscript(
        transcript,
        options
      );
      console.log('🎯 AISummarizationPopup: Received result:', result);

      if (result.success && result.summary) {
        console.log('🎯 AISummarizationPopup: Summary generated successfully');
        setSummary(result.summary);
        setEngine(result.engine || null);
        
        // Update word count information
        if (result.originalWordCount !== undefined && result.summaryWordCount !== undefined) {
          setWordCountInfo({
            original: result.originalWordCount,
            summary: result.summaryWordCount,
            target: result.targetLength,
            compressionRatio: result.compressionRatio
          });
        }
        
        onSummaryGenerated?.(result.summary);
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
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-xl transition-all duration-200 ${
                showSettings 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2 duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Summarization Settings
            </h3>
            <div className="space-y-4">
              {/* Compression Percentage */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Compression Level
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      How much of original text to retain ({options.compressionPercentage}%)
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Retain {options.compressionPercentage}% of original
                    </div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {options.compressionPercentage}%
                    </div>
                  </div>
                  <input
                    type="range"
                    value={options.compressionPercentage}
                    onChange={(e) => {
                      const newOptions = { ...options, compressionPercentage: parseInt(e.target.value) };
                      setOptions(newOptions);
                      saveSettings(newOptions);
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    min="30"
                    max="90"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((options.compressionPercentage - 30) / 60) * 100}%, #e5e7eb ${((options.compressionPercentage - 30) / 60) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>30% (Condensed)</span>
                    <span>90% (Detailed)</span>
                  </div>
                </div>
              </div>


              {/* Max Length Cap */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <span className="text-orange-600 dark:text-orange-400 text-xs font-bold">MAX</span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Maximum Length Cap
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Maximum words allowed in summary
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Cap at {options.maxLengthCap} words
                    </div>
                    <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {options.maxLengthCap}
                    </div>
                  </div>
                  <input
                    type="range"
                    value={options.maxLengthCap}
                    onChange={(e) => {
                      const newOptions = { ...options, maxLengthCap: parseInt(e.target.value) };
                      setOptions(newOptions);
                      saveSettings(newOptions);
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    min="200"
                    max="2000"
                    style={{
                      background: `linear-gradient(to right, #f97316 0%, #f97316 ${((options.maxLengthCap - 200) / 1800) * 100}%, #e5e7eb ${((options.maxLengthCap - 200) / 1800) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>200 words</span>
                    <span>2000 words</span>
                  </div>
                </div>
              </div>

              {/* Engine Selection */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-900 dark:text-white">
                        Use WebLLM (GPU)
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {availableEngines.webllm ? 'Available - GPU accelerated' : 'Not available - requires WebGPU'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.useWebLLM && availableEngines.webllm}
                      onChange={(e) => {
                        const newOptions = { ...options, useWebLLM: e.target.checked };
                        setOptions(newOptions);
                        saveSettings(newOptions);
                      }}
                      disabled={!availableEngines.webllm}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer transition-all ${
                      availableEngines.webllm 
                        ? 'bg-gray-200 peer-checked:bg-purple-600 dark:bg-gray-700' 
                        : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600`}></div>
                  </label>
                </div>
              </div>

              {/* Output Format */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Settings className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Output Format
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      How to structure the summary
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'paragraph', label: 'Paragraph', icon: '📝' },
                    { value: 'bullet-points', label: 'Bullet Points', icon: '•' },
                    { value: 'numbered-list', label: 'Numbered List', icon: '1.' }
                  ].map((format) => (
                    <button
                      key={format.value}
                      onClick={() => {
                        const newOptions = { ...options, outputFormat: format.value as any };
                        setOptions(newOptions);
                        saveSettings(newOptions);
                      }}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        options.outputFormat === format.value
                          ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-400 dark:text-green-300'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="text-lg mb-1">{format.icon}</div>
                      <div>{format.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Options */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Info className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Content Options
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      What to include in the summary
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeExamples || false}
                      onChange={(e) => {
                        const newOptions = { ...options, includeExamples: e.target.checked };
                        setOptions(newOptions);
                        saveSettings(newOptions);
                      }}
                      className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Include examples</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeDefinitions || false}
                      onChange={(e) => {
                        const newOptions = { ...options, includeDefinitions: e.target.checked };
                        setOptions(newOptions);
                        saveSettings(newOptions);
                      }}
                      className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Include key definitions</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <p><strong>Compression Level:</strong> Retains {options.compressionPercentage}% of original transcript length</p>
                  <p><strong>WebLLM:</strong> {availableEngines.webllm ? 'Available (GPU accelerated)' : 'Not available (requires WebGPU)'}</p>
                  <p><strong>Transformers.js:</strong> {availableEngines.transformers ? 'Available (CPU)' : 'Not available (library not loaded)'}</p>
                  <p><strong>Basic Summary:</strong> Available (extractive summarization)</p>
                </div>
              </div>
            </div>
            
            {!availableEngines.webllm && !availableEngines.transformers && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-xs text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">AI Libraries Not Installed</p>
                    <p>Currently using basic extractive summarization. For full AI capabilities, install the required libraries.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
                              <span>{wordCountInfo.target} words ({options.compressionPercentage}% retention)</span>
                            ) : (
                              <span>Compression mode</span>
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
                          {engine === 'webllm' ? 'WebLLM' : engine === 'transformers' ? 'Transformers.js' : engine === 'enhanced' ? 'Enhanced' : 'Basic'}
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
                    <div>
                      <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                        Generating Summary...
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Processing transcript with AI models
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Setup Instructions */}
              {(!availableEngines.webllm && !availableEngines.transformers) && (
                <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                      <span className="text-yellow-600 dark:text-yellow-400 text-lg">🚀</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Enable Full AI Summarization
                    </h4>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                    <p>To enable advanced AI summarization with WebLLM or Transformers.js:</p>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <pre className="whitespace-pre-wrap text-xs font-mono text-gray-600 dark:text-gray-400">
{setupInstructions}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
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
              {availableEngines.webllm && (
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                    <Zap className="w-3 h-3 text-purple-500" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium">WebLLM</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                  <Cpu className="w-3 h-3 text-blue-500" />
                </div>
                <span className="text-gray-600 dark:text-gray-400 font-medium">Transformers.js</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
