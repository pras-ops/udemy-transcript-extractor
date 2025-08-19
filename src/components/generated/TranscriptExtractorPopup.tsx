import { SortableContainer } from "@/dnd-kit/SortableContainer";
import React, { useState, useMemo } from 'react';
import { Header } from './Header';
import { TranscriptViewer } from './TranscriptViewer';
import { Footer } from './Footer';
interface TranscriptEntry {
  id: string;
  timestamp: string;
  text: string;
  mpid?: string;
}
const mockTranscriptData: TranscriptEntry[] = [{
  id: '1',
  timestamp: '00:00',
  text: 'Welcome to today\'s presentation on artificial intelligence and machine learning.',
  mpid: "2d588b01-1293-4293-96d2-f80476fbeb83"
}, {
  id: '2',
  timestamp: '00:15',
  text: 'We\'ll be covering the fundamentals of neural networks and their applications.',
  mpid: "98eb1e4a-34f0-49a1-9f54-47eb546600ef"
}, {
  id: '3',
  timestamp: '00:32',
  text: 'First, let\'s discuss what artificial intelligence really means in today\'s context.',
  mpid: "f59254cd-a37e-4d19-a433-f52350688d04"
}, {
  id: '4',
  timestamp: '00:48',
  text: 'AI has evolved significantly over the past decade, transforming industries.',
  mpid: "cfe16321-bc1f-4806-b767-56046653149f"
}, {
  id: '5',
  timestamp: '01:05',
  text: 'Machine learning is a subset of AI that focuses on pattern recognition.',
  mpid: "d1e097c5-c42d-4216-b84d-b90346f03a9e"
}, {
  id: '6',
  timestamp: '01:22',
  text: 'Deep learning uses neural networks with multiple layers to process data.',
  mpid: "3ea3df64-068f-479c-b6a1-7dd249256815"
}, {
  id: '7',
  timestamp: '01:38',
  text: 'These technologies are now being used in healthcare, finance, and transportation.',
  mpid: "0b025b76-fea5-4c06-bb1a-d6dab863898f"
}, {
  id: '8',
  timestamp: '01:55',
  text: 'Let\'s explore some real-world examples of AI implementation.',
  mpid: "5a694d31-74f8-47ba-a7b3-449392b7ac5a"
}, {
  id: '9',
  timestamp: '02:12',
  text: 'Computer vision allows machines to interpret and understand visual information.',
  mpid: "84dd9914-0451-4033-bb1f-d351f4a5c8c4"
}, {
  id: '10',
  timestamp: '02:28',
  text: 'Natural language processing enables computers to understand human language.',
  mpid: "ff320c56-e32d-49d7-96c7-c557b2515e06"
}];

// @component: TranscriptExtractorPopup
export const TranscriptExtractorPopup = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredTranscript = useMemo(() => {
    if (!searchQuery.trim()) return mockTranscriptData;
    return mockTranscriptData.filter(entry => entry.text.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);
  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  const handleCopyTranscript = () => {
    const transcriptText = filteredTranscript.map(entry => `${entry.timestamp}: ${entry.text}`).join('\n');
    navigator.clipboard.writeText(transcriptText);
  };
  const handleExport = (format: 'txt' | 'markdown' | 'json') => {
    let content = '';
    let filename = '';
    let mimeType = '';
    switch (format) {
      case 'txt':
        content = filteredTranscript.map(entry => `${entry.timestamp}: ${entry.text}`).join('\n');
        filename = 'transcript.txt';
        mimeType = 'text/plain';
        break;
      case 'markdown':
        content = '# Transcript\n\n' + filteredTranscript.map(entry => `**${entry.timestamp}**: ${entry.text}`).join('\n\n');
        filename = 'transcript.md';
        mimeType = 'text/markdown';
        break;
      case 'json':
        content = JSON.stringify(filteredTranscript, null, 2);
        filename = 'transcript.json';
        mimeType = 'application/json';
        break;
    }
    const blob = new Blob([content], {
      type: mimeType
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleAISummarize = () => {
    // Simulate AI summarization - in real app would call API
    console.log('AI Summarization initiated...');
  };

  // @return
  return <SortableContainer dndKitId="32f22d9e-1b56-47c1-ab51-5dc42574f054" containerType="regular" prevTag="div" className="w-96 h-[600px] bg-white dark:bg-gray-900 flex flex-col shadow-2xl rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700" data-magicpath-id="0" data-magicpath-path="TranscriptExtractorPopup.tsx">
      <Header isDarkMode={isDarkMode} onThemeToggle={handleThemeToggle} data-magicpath-id="1" data-magicpath-path="TranscriptExtractorPopup.tsx" />
      
      <TranscriptViewer transcript={filteredTranscript} searchQuery={searchQuery} onSearchChange={setSearchQuery} data-magicpath-id="2" data-magicpath-path="TranscriptExtractorPopup.tsx" />
      
      <Footer onCopyTranscript={handleCopyTranscript} onExport={handleExport} onAISummarize={handleAISummarize} data-magicpath-id="3" data-magicpath-path="TranscriptExtractorPopup.tsx" />
    </SortableContainer>;
};