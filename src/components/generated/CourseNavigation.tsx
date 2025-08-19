"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Play, BookOpen, Clock, Users } from 'lucide-react';
interface Course {
  id: string;
  title: string;
  instructor: string;
  duration: string;
  students: string;
  currentLesson: number;
  totalLessons: number;
  lessonTitle: string;
}
interface CourseNavigationProps {
  currentCourse: Course;
  onPreviousCourse: () => void;
  onNextCourse: () => void;
  onExtractTranscript: () => void;
  isExtracting: boolean;
  hasTranscript: boolean;
}
export const CourseNavigation = ({
  currentCourse,
  onPreviousCourse,
  onNextCourse,
  onExtractTranscript,
  isExtracting,
  hasTranscript
}: CourseNavigationProps) => {
  return <div className="border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700">
      <div className="p-4 space-y-3">
        {/* Course Info */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                <span>{currentCourse.title}</span>
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span>by {currentCourse.instructor}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{currentCourse.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{currentCourse.students}</span>
            </div>
          </div>
          
          {/* Current Lesson */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  <span>Lesson {currentCourse.currentLesson}/{currentCourse.totalLessons}</span>
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span>{Math.round(currentCourse.currentLesson / currentCourse.totalLessons * 100)}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
              <span>{currentCourse.lessonTitle}</span>
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full transition-all duration-300" style={{
              width: `${currentCourse.currentLesson / currentCourse.totalLessons * 100}%`
            }}></div>
            </div>
          </div>
        </div>

        {/* Extract Transcript Button */}
        <button onClick={onExtractTranscript} disabled={isExtracting} className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${hasTranscript ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : isExtracting ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-sm hover:shadow-md'}`}>
          {isExtracting ? <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin"></div>
              <span>Extracting...</span>
            </div> : hasTranscript ? <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span>Transcript Ready</span>
            </div> : <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>Extract Transcript</span>
            </div>}
        </button>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between">
          <button onClick={onPreviousCourse} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-300">
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((dot, index) => <div key={dot} className={`w-1.5 h-1.5 rounded-full ${index === 2 ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>)}
            </div>
            <span>Course 3 of 5</span>
          </div>
          
          <button onClick={onNextCourse} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-300">
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>;
};