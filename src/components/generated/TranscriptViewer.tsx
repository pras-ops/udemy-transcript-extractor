import { SortableContainer } from "@/dnd-kit/SortableContainer";
import React from 'react';
import { Search, Clock } from 'lucide-react';
interface TranscriptEntry {
  id: string;
  timestamp: string;
  text: string;
  mpid?: string;
}
interface TranscriptViewerProps {
  transcript: TranscriptEntry[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isEmpty?: boolean;
  isExtracting?: boolean;
  mpid?: string;
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
        return <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 text-gray-900 dark:text-white px-1 rounded" data-magicpath-uuid={(part as any)["mpid"] ?? "unsafe"} data-magicpath-id="0" data-magicpath-path="TranscriptViewer.tsx">
            <span data-magicpath-uuid={(part as any)["mpid"] ?? "unsafe"} data-magicpath-id="1" data-magicpath-path="TranscriptViewer.tsx">{part}</span>
          </mark>;
      }
      return <span key={index} data-magicpath-uuid={(part as any)["mpid"] ?? "unsafe"} data-magicpath-id="2" data-magicpath-path="TranscriptViewer.tsx">{part}</span>;
    });
  };

  // @return
  return <SortableContainer dndKitId="98f25bdb-7fa2-477b-b533-53f8daae286f" containerType="regular" prevTag="div" className="flex-1 flex flex-col" data-magicpath-id="3" data-magicpath-path="TranscriptViewer.tsx">
      <SortableContainer dndKitId="d0b56213-0be5-45d9-a13e-74f4a03fcf37" containerType="regular" prevTag="div" className="p-4 border-b border-gray-200 dark:border-gray-700" data-magicpath-id="4" data-magicpath-path="TranscriptViewer.tsx">
        <SortableContainer dndKitId="34a4534b-504d-4be7-a77d-057e7d5bc66e" containerType="regular" prevTag="div" className="relative" data-magicpath-id="5" data-magicpath-path="TranscriptViewer.tsx">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" data-magicpath-id="6" data-magicpath-path="TranscriptViewer.tsx" />
          <input type="text" placeholder="Search transcript..." value={searchQuery} onChange={e => onSearchChange(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200" data-magicpath-id="7" data-magicpath-path="TranscriptViewer.tsx" />
        </SortableContainer>
      </SortableContainer>
      
      <SortableContainer dndKitId="d59f7bf5-05a1-400d-a83a-748cdca6c736" containerType="regular" prevTag="div" className="flex-1 overflow-y-auto" data-magicpath-id="8" data-magicpath-path="TranscriptViewer.tsx">
        {isExtracting ? <SortableContainer dndKitId="1c80b860-04d1-4737-871d-2980b6c98bff" containerType="regular" prevTag="div" className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8" data-magicpath-id="9" data-magicpath-path="TranscriptViewer.tsx">
            <div className="w-8 h-8 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin mb-4" data-magicpath-id="10" data-magicpath-path="TranscriptViewer.tsx"></div>
            <p className="text-sm text-center" data-magicpath-id="11" data-magicpath-path="TranscriptViewer.tsx">
              <span data-magicpath-id="12" data-magicpath-path="TranscriptViewer.tsx">Extracting transcript from video...</span>
            </p>
            <p className="text-xs text-center mt-1 opacity-75" data-magicpath-id="13" data-magicpath-path="TranscriptViewer.tsx">
              <span data-magicpath-id="14" data-magicpath-path="TranscriptViewer.tsx">This may take a few moments</span>
            </p>
          </SortableContainer> : isEmpty ? <SortableContainer dndKitId="53eec210-548b-4c46-ab81-3c204cfc547e" containerType="regular" prevTag="div" className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8" data-magicpath-id="15" data-magicpath-path="TranscriptViewer.tsx">
            <Search className="w-8 h-8 mb-2 opacity-50" data-magicpath-id="16" data-magicpath-path="TranscriptViewer.tsx" />
            <p className="text-sm text-center" data-magicpath-id="17" data-magicpath-path="TranscriptViewer.tsx">
              <span data-magicpath-id="18" data-magicpath-path="TranscriptViewer.tsx">No transcript available yet.</span>
            </p>
            <p className="text-xs text-center mt-1 opacity-75" data-magicpath-id="19" data-magicpath-path="TranscriptViewer.tsx">
              <span data-magicpath-id="20" data-magicpath-path="TranscriptViewer.tsx">Click "Extract Transcript" to get started</span>
            </p>
          </SortableContainer> : transcript.length === 0 ? <SortableContainer dndKitId="8a874fa5-7f1e-448d-9f64-e873ed2dbf23" containerType="regular" prevTag="div" className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8" data-magicpath-id="21" data-magicpath-path="TranscriptViewer.tsx">
            <Search className="w-8 h-8 mb-2 opacity-50" data-magicpath-id="22" data-magicpath-path="TranscriptViewer.tsx" />
            <p className="text-sm text-center" data-magicpath-id="23" data-magicpath-path="TranscriptViewer.tsx">
              <span data-magicpath-id="24" data-magicpath-path="TranscriptViewer.tsx">No transcript entries found matching your search.</span>
            </p>
          </SortableContainer> : <SortableContainer dndKitId="9382a6b9-6e02-434a-b6cf-2f477aa181aa" containerType="collection" prevTag="div" className="p-4 space-y-3" data-magicpath-id="25" data-magicpath-path="TranscriptViewer.tsx">
            {transcript.map(entry => <div key={entry.id} className="flex gap-4 group hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors duration-150" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="26" data-magicpath-path="TranscriptViewer.tsx">
                <div className="flex items-start gap-1 text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded min-w-fit" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="27" data-magicpath-path="TranscriptViewer.tsx">
                  <Clock className="w-3 h-3 mt-0.5" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="28" data-magicpath-path="TranscriptViewer.tsx" />
                  <span data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-field="timestamp:unknown" data-magicpath-id="29" data-magicpath-path="TranscriptViewer.tsx">{entry.timestamp}</span>
                </div>
                <div className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="30" data-magicpath-path="TranscriptViewer.tsx">
                  <p data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-field="text:unknown" data-magicpath-id="31" data-magicpath-path="TranscriptViewer.tsx">{highlightText(entry.text, searchQuery)}</p>
                </div>
              </div>)}
          </SortableContainer>}
      </SortableContainer>
    </SortableContainer>;
};