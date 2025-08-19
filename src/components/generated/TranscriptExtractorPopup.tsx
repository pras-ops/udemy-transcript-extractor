"use client";

import { SortableContainer } from "@/dnd-kit/SortableContainer";
import * as React from "react";
import { useState, useMemo } from 'react';
import { Header } from './Header';
import { TranscriptViewer } from './TranscriptViewer';
import { Footer } from './Footer';
import { CourseNavigation } from './CourseNavigation';
interface TranscriptEntry {
  id: string;
  timestamp: string;
  text: string;
  mpid?: string;
}
interface Course {
  id: string;
  title: string;
  instructor: string;
  duration: string;
  students: string;
  currentLesson: number;
  totalLessons: number;
  lessonTitle: string;
  transcript?: TranscriptEntry[];
  mpid?: string;
}
const mockCourses: Course[] = [{
  id: '1',
  title: 'Complete Machine Learning & Data Science Bootcamp',
  instructor: 'Dr. Sarah Johnson',
  duration: '42h 30m',
  students: '125,847',
  currentLesson: 15,
  totalLessons: 45,
  lessonTitle: 'Introduction to Neural Networks',
  transcript: [{
    id: '1',
    timestamp: '00:00',
    text: 'Welcome to today\'s presentation on artificial intelligence and machine learning.',
    mpid: "abdf2348-817b-4ffa-b1ea-ba40410a4753"
  }, {
    id: '2',
    timestamp: '00:15',
    text: 'We\'ll be covering the fundamentals of neural networks and their applications.',
    mpid: "4aea4110-2510-4ae1-a37d-09c527703b28"
  }, {
    id: '3',
    timestamp: '00:32',
    text: 'First, let\'s discuss what artificial intelligence really means in today\'s context.',
    mpid: "418df732-8c59-4ab7-a149-37cb81c07c7d"
  }, {
    id: '4',
    timestamp: '00:48',
    text: 'AI has evolved significantly over the past decade, transforming industries.',
    mpid: "bb4c7685-fb1d-4181-9f47-2b9a40726b5f"
  }, {
    id: '5',
    timestamp: '01:05',
    text: 'Machine learning is a subset of AI that focuses on pattern recognition.',
    mpid: "fe31604c-ee0d-47f9-b297-decb303c6c4c"
  }],
  mpid: "633fcfef-f8f7-416f-93de-a3d9800ae22d"
}, {
  id: '2',
  title: 'Advanced React Development with TypeScript',
  instructor: 'Mark Thompson',
  duration: '28h 15m',
  students: '89,234',
  currentLesson: 8,
  totalLessons: 32,
  lessonTitle: 'State Management with Redux Toolkit',
  mpid: "24882cbb-1405-484a-953c-9b247404beb3"
}, {
  id: '3',
  title: 'Full Stack Web Development Masterclass',
  instructor: 'Emily Chen',
  duration: '65h 45m',
  students: '203,567',
  currentLesson: 23,
  totalLessons: 78,
  lessonTitle: 'Building RESTful APIs with Node.js',
  mpid: "64a65d41-f473-41fa-823a-063750e2886e"
}, {
  id: '4',
  title: 'Python for Data Analysis and Visualization',
  instructor: 'Prof. Michael Rodriguez',
  duration: '35h 20m',
  students: '156,789',
  currentLesson: 12,
  totalLessons: 40,
  lessonTitle: 'Advanced Pandas Operations',
  mpid: "1b16e88f-deab-44ee-a834-aff44aa8503b"
}, {
  id: '5',
  title: 'Cloud Computing with AWS Certification',
  instructor: 'Jennifer Liu',
  duration: '52h 10m',
  students: '98,432',
  currentLesson: 18,
  totalLessons: 55,
  lessonTitle: 'EC2 Instance Management',
  mpid: "c94e47d4-4815-41b9-b982-69a392692a4e"
}];
export const TranscriptExtractorPopup = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCourseIndex, setCurrentCourseIndex] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const currentCourse = mockCourses[currentCourseIndex];
  const hasTranscript = Boolean(currentCourse.transcript);
  const filteredTranscript = useMemo(() => {
    if (!currentCourse.transcript) return [];
    if (!searchQuery.trim()) return currentCourse.transcript;
    return currentCourse.transcript.filter(entry => entry.text.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [currentCourse.transcript, searchQuery]);
  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  const handlePreviousCourse = () => {
    setCurrentCourseIndex(prev => prev > 0 ? prev - 1 : mockCourses.length - 1);
    setSearchQuery(''); // Clear search when switching courses
  };
  const handleNextCourse = () => {
    setCurrentCourseIndex(prev => prev < mockCourses.length - 1 ? prev + 1 : 0);
    setSearchQuery(''); // Clear search when switching courses
  };
  const handleExtractTranscript = async () => {
    if (hasTranscript) return; // Already has transcript

    setIsExtracting(true);

    // Simulate transcript extraction
    setTimeout(() => {
      const mockTranscript: TranscriptEntry[] = [{
        id: '1',
        timestamp: '00:00',
        text: `Welcome to ${currentCourse.lessonTitle}. In this lesson, we'll explore key concepts.`,
        mpid: "36fce772-f128-4d49-a657-ca0346e98277"
      }, {
        id: '2',
        timestamp: '00:15',
        text: 'Let\'s start by understanding the fundamental principles behind this topic.',
        mpid: "e5e238ec-ec11-4ed7-ab11-54a2d96b7b1d"
      }, {
        id: '3',
        timestamp: '00:32',
        text: 'This approach has been proven effective in real-world applications.',
        mpid: "4bb2337e-e20e-4cee-99a8-80ba0199d594"
      }, {
        id: '4',
        timestamp: '00:48',
        text: 'We\'ll walk through several practical examples to solidify your understanding.',
        mpid: "7307533a-b127-4bbb-b15c-e5625fbd0978"
      }, {
        id: '5',
        timestamp: '01:05',
        text: 'By the end of this lesson, you\'ll have a solid grasp of these concepts.',
        mpid: "f9ffffbc-6093-425b-b42a-01bb37d31347"
      }];

      // Update the course with extracted transcript
      mockCourses[currentCourseIndex].transcript = mockTranscript;
      setIsExtracting(false);
    }, 3000);
  };
  const handleCopyTranscript = () => {
    if (!hasTranscript) return;
    const transcriptText = filteredTranscript.map(entry => `${entry.timestamp}: ${entry.text}`).join('\n');
    navigator.clipboard.writeText(transcriptText);
  };
  const handleExport = (format: 'txt' | 'markdown' | 'json') => {
    if (!hasTranscript) return;
    let content = '';
    let filename = '';
    let mimeType = '';
    const courseTitle = currentCourse.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    switch (format) {
      case 'txt':
        content = `Course: ${currentCourse.title}\nLesson: ${currentCourse.lessonTitle}\nInstructor: ${currentCourse.instructor}\n\n` + filteredTranscript.map(entry => `${entry.timestamp}: ${entry.text}`).join('\n');
        filename = `${courseTitle}_transcript.txt`;
        mimeType = 'text/plain';
        break;
      case 'markdown':
        content = `# ${currentCourse.title}\n\n**Lesson:** ${currentCourse.lessonTitle}  \n**Instructor:** ${currentCourse.instructor}\n\n## Transcript\n\n` + filteredTranscript.map(entry => `**${entry.timestamp}**: ${entry.text}`).join('\n\n');
        filename = `${courseTitle}_transcript.md`;
        mimeType = 'text/markdown';
        break;
      case 'json':
        content = JSON.stringify({
          course: {
            title: currentCourse.title,
            instructor: currentCourse.instructor,
            lesson: currentCourse.lessonTitle,
            lessonNumber: `${currentCourse.currentLesson}/${currentCourse.totalLessons}`
          },
          transcript: filteredTranscript
        }, null, 2);
        filename = `${courseTitle}_transcript.json`;
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
    if (!hasTranscript) return;
    // Simulate AI summarization - in real app would call API
    console.log('AI Summarization initiated for:', currentCourse.title);
  };
  return <SortableContainer dndKitId="f273151b-6cb1-40fd-b439-987282d6efb4" containerType="regular" prevTag="div" className="w-96 h-[700px] bg-white dark:bg-gray-900 flex flex-col shadow-2xl rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700" data-magicpath-id="0" data-magicpath-path="TranscriptExtractorPopup.tsx">
      <Header isDarkMode={isDarkMode} onThemeToggle={handleThemeToggle} data-magicpath-id="1" data-magicpath-path="TranscriptExtractorPopup.tsx" />
      
      <TranscriptViewer transcript={filteredTranscript} searchQuery={searchQuery} onSearchChange={setSearchQuery} isEmpty={!hasTranscript} isExtracting={isExtracting} data-magicpath-id="2" data-magicpath-path="TranscriptExtractorPopup.tsx" />
      
      <Footer onCopyTranscript={handleCopyTranscript} onExport={handleExport} onAISummarize={handleAISummarize} disabled={!hasTranscript} data-magicpath-id="3" data-magicpath-path="TranscriptExtractorPopup.tsx" />
      
      <CourseNavigation currentCourse={currentCourse} onPreviousCourse={handlePreviousCourse} onNextCourse={handleNextCourse} onExtractTranscript={handleExtractTranscript} isExtracting={isExtracting} hasTranscript={hasTranscript} data-magicpath-id="4" data-magicpath-path="TranscriptExtractorPopup.tsx" />
    </SortableContainer>;
};