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
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [engine, setEngine] = useState<'webllm' | 'transformers' | null>(null);
  const [options, setOptions] = useState<SummarizationOptions>({
    maxLength: 150,
    minLength: 50,
    useWebLLM: true,
    adaptiveMode: true,
    adaptivePercentage: 50,
    maxAdaptiveLength: 500
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
    adaptive?: number;
  } | null>(null);

  useEffect(() => {
    // Check available engines on mount
    const engines = aiSummarizationService.getAvailableEngines();
    setAvailableEngines(engines);
    
    // Get setup instructions
    const instructions = aiSummarizationService.getSetupInstructions();
    setSetupInstructions(instructions);
    
    // Auto-start summarization if transcript is provided
    if (transcript && transcript.trim().length > 0) {
      handleSummarize();
    }
  }, [transcript]);

  const handleSummarize = async () => {
    if (!transcript || transcript.trim().length === 0) {
      setError('No transcript provided for summarization');
      return;
    }

    setIsSummarizing(true);
    setError('');
    setSummary('');

    try {
      const result: SummarizationResult = await aiSummarizationService.summarizeTranscript(
        transcript,
        options
      );

      if (result.success && result.summary) {
        setSummary(result.summary);
        setEngine(result.engine || null);
        
        // Update word count information
        if (result.originalWordCount !== undefined && result.summaryWordCount !== undefined) {
          setWordCountInfo({
            original: result.originalWordCount,
            summary: result.summaryWordCount,
            adaptive: result.adaptiveLength
          });
        }
        
        onSummaryGenerated?.(result.summary);
      } else {
        setError(result.error || 'Failed to generate summary');
      }
    } catch (error) {
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
              {/* Adaptive Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Adaptive Mode
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Auto-calculate length based on original
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.adaptiveMode}
                    onChange={(e) => setOptions(prev => ({ ...prev, adaptiveMode: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Adaptive Percentage */}
              {options.adaptiveMode && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <span className="text-green-600 dark:text-green-400 text-xs font-bold">%</span>
                      </div>
                      <label className="text-sm font-medium text-gray-900 dark:text-white">
                        Summary Length (% of original)
                      </label>
                    </div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {options.adaptivePercentage}%
                    </div>
                  </div>
                  <input
                    type="range"
                    value={options.adaptivePercentage}
                    onChange={(e) => setOptions(prev => ({ ...prev, adaptivePercentage: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    min="10"
                    max="100"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${options.adaptivePercentage}%, #e5e7eb ${options.adaptivePercentage}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>10%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}

              {/* Max Adaptive Length Cap */}
              {options.adaptiveMode && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <span className="text-orange-600 dark:text-orange-400 text-xs font-bold">MAX</span>
                      </div>
                      <label className="text-sm font-medium text-gray-900 dark:text-white">
                        Max Length Cap (words)
                      </label>
                    </div>
                    <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {options.maxAdaptiveLength}
                    </div>
                  </div>
                  <input
                    type="range"
                    value={options.maxAdaptiveLength}
                    onChange={(e) => setOptions(prev => ({ ...prev, maxAdaptiveLength: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    min="100"
                    max="1000"
                    style={{
                      background: `linear-gradient(to right, #f97316 0%, #f97316 ${((options.maxAdaptiveLength - 100) / 900) * 100}%, #e5e7eb ${((options.maxAdaptiveLength - 100) / 900) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>100</span>
                    <span>1000</span>
                  </div>
                </div>
              )}

              {/* Fixed Length Settings (when not in adaptive mode) */}
              {!options.adaptiveMode && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700 dark:text-gray-300">
                      Max Length (words)
                    </label>
                    <input
                      type="number"
                      value={options.maxLength}
                      onChange={(e) => setOptions(prev => ({ ...prev, maxLength: parseInt(e.target.value) || 150 }))}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="50"
                      max="500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700 dark:text-gray-300">
                      Min Length (words)
                    </label>
                    <input
                      type="number"
                      value={options.minLength}
                      onChange={(e) => setOptions(prev => ({ ...prev, minLength: parseInt(e.target.value) || 50 }))}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="20"
                      max="200"
                    />
                  </div>
                </>
              )}

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
                      onChange={(e) => setOptions(prev => ({ ...prev, useWebLLM: e.target.checked }))}
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
            </div>
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <p><strong>Adaptive Mode:</strong> Automatically calculates summary length as {options.adaptivePercentage}% of original transcript</p>
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
                            {options.adaptiveMode && wordCountInfo.adaptive ? (
                              <span>{wordCountInfo.adaptive} words ({options.adaptivePercentage}%)</span>
                            ) : (
                              <span>Fixed length mode</span>
                            )}
                          </span>
                        </div>
                      </div>
                      {options.adaptiveMode && (
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
                      )}
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
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-full blur opacity-20 animate-pulse"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Ready to Summarize
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8 max-w-md">
                  Click the button below to generate an intelligent summary of your transcript using local AI models.
                </p>
                <button
                  onClick={handleSummarize}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-600 hover:from-purple-600 hover:via-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-105"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generate Summary
                  </div>
                </button>
              </div>

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
