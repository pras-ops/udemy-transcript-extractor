import React from 'react';
import { Search, Clock } from 'lucide-react';
interface TranscriptEntry {
  id: string;
  timestamp: string;
  text: string;
}
interface TranscriptViewerProps {
  transcript: TranscriptEntry[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isEmpty?: boolean;
  isExtracting?: boolean;
}

// @component: TranscriptViewer
export const TranscriptViewer = ({
  transcript,
  searchQuery,
  onSearchChange,
  isEmpty = false,
  isExtracting = false
}: TranscriptViewerProps) => {
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 text-gray-900 dark:text-white px-1 rounded">
            <span>{part}</span>
          </mark>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  // @return
  return <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search transcript..." value={searchQuery} onChange={e => onSearchChange(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isExtracting ? <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8">
            <div className="w-8 h-8 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-center">
              <span>Extracting transcript from video...</span>
            </p>
            <p className="text-xs text-center mt-1 opacity-75">
              <span>This may take a few moments</span>
            </p>
          </div> : isEmpty ? <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8">
            <Search className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">
              <span>No transcript available yet.</span>
            </p>
            <p className="text-xs text-center mt-1 opacity-75">
              <span>Click "Extract Transcript" to get started</span>
            </p>
          </div> : transcript.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8">
            <Search className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">
              <span>No transcript entries found matching your search.</span>
            </p>
          </div> : <div className="p-4 space-y-3">
            {transcript.map(entry => <div key={entry.id} className="flex gap-4 group hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors duration-150">
                <div className="flex items-start gap-1 text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded min-w-fit">
                  <Clock className="w-3 h-3 mt-0.5" />
                  <span>{entry.timestamp}</span>
                </div>
                <div className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  <p>{highlightText(entry.text, searchQuery)}</p>
                </div>
              </div>)}
          </div>}
      </div>
    </div>;
};