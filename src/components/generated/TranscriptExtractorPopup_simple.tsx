"use client";

import * as React from "react";
import { useState, useEffect } from 'react';
import { FileText, Sun, Moon, Download, Clock, Clipboard, Play, Lock, Github, Zap, Loader2 } from 'lucide-react';
// Dynamic import to avoid chunking conflicts
// import { ExtensionService } from '../../lib/extension-service';

// Helper function for dynamic ExtensionService import
const getExtensionService = async () => {
  const { ExtensionService } = await import('../../lib/extension-service');
  return ExtensionService;
};
import { StorageService } from '../../lib/storage-service';

export default function TranscriptExtractorPopup() {
  // Basic state
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [extractedTranscript, setExtractedTranscript] = useState<string>('');
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<{title: string, duration: string} | null>(null);
  
  // Tab state - simplified to only have transcript and settings
  const [activeTab, setActiveTab] = useState<'transcript' | 'settings'>('transcript');
  
  // Export settings
  const [exportFormat, setExportFormat] = useState<'txt' | 'json' | 'csv'>('txt');
  const [exportTarget, setExportTarget] = useState<'clipboard' | 'download'>('clipboard');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  
  const [isExporting, setIsExporting] = useState(false);

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Check availability when component mounts and load saved state
  useEffect(() => {
    console.log('🎯 Transcript Extractor Popup initialized - Simplified Version');
    // Apply dark mode by default
    document.documentElement.classList.add('dark');
    
    loadSavedState();
    checkPageAvailability();
  }, []);

  // Load saved state
  const loadSavedState = async () => {
    try {
      const savedState = await StorageService.loadState();
      if (savedState) {
        setExportFormat(savedState.exportFormat || 'txt');
        setExportTarget(savedState.exportTarget || 'clipboard');
        setIncludeTimestamps(savedState.includeTimestamps !== undefined ? savedState.includeTimestamps : true);
        if (savedState.extractedTranscript) {
          setExtractedTranscript(savedState.extractedTranscript);
          setExtractionStatus('success');
        }
      }
    } catch (error) {
      console.error('Failed to load saved state:', error);
    }
  };

  // Check page availability
  const checkPageAvailability = async () => {
    try {
      const response = await (await getExtensionService()).checkPageAvailability();
      if (response.success && response.data) {
        setCurrentVideo(response.data);
      }
    } catch (error) {
      console.error('Failed to check page availability:', error);
    }
  };

  // Extract transcript
  const handleExtractTranscript = async () => {
    setIsExtracting(true);
    setErrorMessage('');
    setExtractionStatus('extracting');

    try {
      const response = await (await getExtensionService()).collectCurrentTranscript();
      
      if (response.success && response.data) {
        const transcriptData = response.data;
        const transcript = typeof transcriptData === 'string' ? transcriptData : transcriptData.transcript;
        
        setExtractedTranscript(transcript);
        setExtractionStatus('success');
        
        // Save to storage
        await StorageService.saveState({ extractedTranscript: transcript });
      } else {
        throw new Error(response.error || 'Failed to extract transcript');
      }
    } catch (error) {
      console.error('Extraction failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to extract transcript');
      setExtractionStatus('error');
    } finally {
      setIsExtracting(false);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    if (!extractedTranscript) return;
    
    try {
      await navigator.clipboard.writeText(extractedTranscript);
      setErrorMessage('Transcript copied to clipboard!');
      setTimeout(() => setErrorMessage(''), 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setErrorMessage('Failed to copy to clipboard');
    }
  };

  // Export transcript
  const handleExportTranscript = async () => {
    if (!extractedTranscript) return;
    
    setIsExporting(true);
    setErrorMessage('');

    try {
      if (exportTarget === 'clipboard') {
        await navigator.clipboard.writeText(extractedTranscript);
        setErrorMessage('Transcript copied to clipboard!');
      } else {
        // Download file
        const blob = new Blob([extractedTranscript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript_${Date.now()}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setErrorMessage('Transcript downloaded!');
      }
      
      setTimeout(() => setErrorMessage(''), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      setErrorMessage('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Tab Navigation Component
  const TabNavigation = () => (
    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6">
      <button
        onClick={() => setActiveTab('transcript')}
        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          activeTab === 'transcript'
            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" />
          <span>Transcript</span>
        </div>
      </button>
      
      <button
        onClick={() => setActiveTab('settings')}
        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          activeTab === 'settings'
            ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <Download className="w-4 h-4" />
          <span>Settings</span>
        </div>
      </button>
    </div>
  );

  // Transcript Tab Component
  const TranscriptTab = () => (
    <div className="space-y-6">
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

      {/* Error Message */}
      {errorMessage && (
        <div className={`p-3 rounded-lg text-sm ${
          errorMessage.includes('Failed') || errorMessage.includes('Error')
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
        }`}>
          {errorMessage}
        </div>
      )}

      {/* Extract Button */}
      <button
        onClick={handleExtractTranscript}
        disabled={isExtracting}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
          isExtracting
            ? 'bg-gray-400 cursor-not-allowed text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
        }`}
      >
        {isExtracting ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Extracting...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Extract Transcript</span>
          </div>
        )}
      </button>

      {/* Transcript Display */}
      {extractionStatus === 'success' && extractedTranscript && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Extracted Transcript</h3>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>{extractedTranscript.split('\n\n').length} entries</span>
              <span>{extractedTranscript.length} characters</span>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
            <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {extractedTranscript}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCopyToClipboard}
              className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              <div className="flex items-center justify-center gap-2">
                <Clipboard className="w-4 h-4" />
                <span>Copy</span>
              </div>
            </button>
            
            <button
              onClick={handleExportTranscript}
              disabled={isExporting}
              className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Settings Tab Component
  const SettingsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Export Settings</h3>
      </div>
      
      {/* Export Format */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Export Format</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'txt', label: 'Text' },
            { value: 'json', label: 'JSON' },
            { value: 'csv', label: 'CSV' }
          ].map(format => (
            <button
              key={format.value}
              onClick={() => setExportFormat(format.value as any)}
              className={`p-2 text-xs rounded-lg border transition-colors ${
                exportFormat === format.value
                  ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {format.label}
            </button>
          ))}
        </div>
      </div>

      {/* Export Target */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Export Target</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'clipboard', label: 'Clipboard' },
            { value: 'download', label: 'Download' }
          ].map(target => (
            <button
              key={target.value}
              onClick={() => setExportTarget(target.value as any)}
              className={`p-2 text-xs rounded-lg border transition-colors ${
                exportTarget === target.value
                  ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {target.label}
            </button>
          ))}
        </div>
      </div>

      {/* Include Timestamps */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Include Timestamps</span>
        </div>
        <button
          onClick={() => setIncludeTimestamps(!includeTimestamps)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            includeTimestamps ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              includeTimestamps ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-96 h-[600px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-semibold">Transcript Extractor</h1>
        </div>
        <button
          onClick={handleThemeToggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <TabNavigation />
        
        {activeTab === 'transcript' && <TranscriptTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>Local-first</span>
          </div>
          <div className="flex items-center gap-1">
            <Github className="w-3 h-3" />
            <span>Open Source</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>MIT License</span>
          </div>
        </div>
      </div>
    </div>
  );
}
