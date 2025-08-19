"use client";

import { SortableContainer } from "@/dnd-kit/SortableContainer";
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
  mpid?: string;
}
interface CourseNavigationProps {
  currentCourse: Course;
  onPreviousCourse: () => void;
  onNextCourse: () => void;
  onExtractTranscript: () => void;
  isExtracting: boolean;
  hasTranscript: boolean;
  mpid?: string;
}
export const CourseNavigation = ({
  currentCourse,
  onPreviousCourse,
  onNextCourse,
  onExtractTranscript,
  isExtracting,
  hasTranscript
}: CourseNavigationProps) => {
  return <SortableContainer dndKitId="f68837eb-a1a3-4a66-90bf-0400cb78caf2" containerType="regular" prevTag="div" className="border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700" data-magicpath-id="0" data-magicpath-path="CourseNavigation.tsx">
      <SortableContainer dndKitId="9fcac2a2-88ba-4d18-be13-acf904e4e7c8" containerType="regular" prevTag="div" className="p-4 space-y-3" data-magicpath-id="1" data-magicpath-path="CourseNavigation.tsx">
        {/* Course Info */}
        <SortableContainer dndKitId="5f08f489-85f7-4d7a-bf8f-242005de6316" containerType="regular" prevTag="div" className="space-y-2" data-magicpath-id="2" data-magicpath-path="CourseNavigation.tsx">
          <SortableContainer dndKitId="a73fa970-202e-4180-8397-889aaab8e3ad" containerType="regular" prevTag="div" className="flex items-start gap-2" data-magicpath-id="3" data-magicpath-path="CourseNavigation.tsx">
            <BookOpen className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" data-magicpath-id="4" data-magicpath-path="CourseNavigation.tsx" />
            <SortableContainer dndKitId="faa95b97-b759-40bd-b70e-df4293e9b907" containerType="regular" prevTag="div" className="flex-1 min-w-0" data-magicpath-id="5" data-magicpath-path="CourseNavigation.tsx">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" data-magicpath-id="6" data-magicpath-path="CourseNavigation.tsx">
                <span data-magicpath-id="7" data-magicpath-path="CourseNavigation.tsx">{currentCourse.title}</span>
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400" data-magicpath-id="8" data-magicpath-path="CourseNavigation.tsx">
                <span data-magicpath-id="9" data-magicpath-path="CourseNavigation.tsx">by {currentCourse.instructor}</span>
              </p>
            </SortableContainer>
          </SortableContainer>
          
          <SortableContainer dndKitId="3a580268-b606-41b3-83aa-920953ae31d2" containerType="regular" prevTag="div" className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="10" data-magicpath-path="CourseNavigation.tsx">
            <SortableContainer dndKitId="d8164c1f-ed7e-4837-8068-61401ba3374c" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="11" data-magicpath-path="CourseNavigation.tsx">
              <Clock className="w-3 h-3" data-magicpath-id="12" data-magicpath-path="CourseNavigation.tsx" />
              <span data-magicpath-id="13" data-magicpath-path="CourseNavigation.tsx">{currentCourse.duration}</span>
            </SortableContainer>
            <SortableContainer dndKitId="a35576d8-f4a0-4015-8efa-cb47623aea92" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="14" data-magicpath-path="CourseNavigation.tsx">
              <Users className="w-3 h-3" data-magicpath-id="15" data-magicpath-path="CourseNavigation.tsx" />
              <span data-magicpath-id="16" data-magicpath-path="CourseNavigation.tsx">{currentCourse.students}</span>
            </SortableContainer>
          </SortableContainer>
          
          {/* Current Lesson */}
          <SortableContainer dndKitId="c2095d5f-2b00-4cbf-977e-e68a0977caa1" containerType="regular" prevTag="div" className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600" data-magicpath-id="17" data-magicpath-path="CourseNavigation.tsx">
            <SortableContainer dndKitId="2bdc39b0-c39d-48f2-92f8-c66c06736b13" containerType="regular" prevTag="div" className="flex items-center justify-between" data-magicpath-id="18" data-magicpath-path="CourseNavigation.tsx">
              <SortableContainer dndKitId="374cc4a6-7693-41a3-ba33-61e55636ae1e" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="19" data-magicpath-path="CourseNavigation.tsx">
                <Play className="w-3 h-3 text-orange-600 dark:text-orange-400" data-magicpath-id="20" data-magicpath-path="CourseNavigation.tsx" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="21" data-magicpath-path="CourseNavigation.tsx">
                  <span data-magicpath-id="22" data-magicpath-path="CourseNavigation.tsx">Lesson {currentCourse.currentLesson}/{currentCourse.totalLessons}</span>
                </span>
              </SortableContainer>
              <SortableContainer dndKitId="f5657923-7a81-4bdd-8eec-de1270fb4b3f" containerType="regular" prevTag="div" className="text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="23" data-magicpath-path="CourseNavigation.tsx">
                <span data-magicpath-id="24" data-magicpath-path="CourseNavigation.tsx">{Math.round(currentCourse.currentLesson / currentCourse.totalLessons * 100)}%</span>
              </SortableContainer>
            </SortableContainer>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate" data-magicpath-id="25" data-magicpath-path="CourseNavigation.tsx">
              <span data-magicpath-id="26" data-magicpath-path="CourseNavigation.tsx">{currentCourse.lessonTitle}</span>
            </p>
            
            {/* Progress Bar */}
            <SortableContainer dndKitId="9567d0c8-e23b-4d9c-9d4d-769973f99b67" containerType="regular" prevTag="div" className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2" data-magicpath-id="27" data-magicpath-path="CourseNavigation.tsx">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full transition-all duration-300" style={{
              width: `${currentCourse.currentLesson / currentCourse.totalLessons * 100}%`
            }} data-magicpath-id="28" data-magicpath-path="CourseNavigation.tsx"></div>
            </SortableContainer>
          </SortableContainer>
        </SortableContainer>

        {/* Extract Transcript Button */}
        <SortableContainer dndKitId="b686cddf-951b-4f8c-a72d-9677a6157a58" containerType="regular" prevTag="button" onClick={onExtractTranscript} disabled={isExtracting} className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${hasTranscript ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : isExtracting ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-sm hover:shadow-md'}`} data-magicpath-id="29" data-magicpath-path="CourseNavigation.tsx">
          {isExtracting ? <SortableContainer dndKitId="033432f5-dda4-4592-a0c9-5195139726f5" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="30" data-magicpath-path="CourseNavigation.tsx">
              <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" data-magicpath-id="31" data-magicpath-path="CourseNavigation.tsx"></div>
              <span data-magicpath-id="32" data-magicpath-path="CourseNavigation.tsx">Extracting...</span>
            </SortableContainer> : hasTranscript ? <SortableContainer dndKitId="f0301944-46c4-4128-bfbb-3764d053a384" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="33" data-magicpath-path="CourseNavigation.tsx">
              <SortableContainer dndKitId="87ea25e4-4f13-447c-adfb-2dbdd6a3ea8c" containerType="regular" prevTag="div" className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center" data-magicpath-id="34" data-magicpath-path="CourseNavigation.tsx">
                <div className="w-2 h-2 bg-white rounded-full" data-magicpath-id="35" data-magicpath-path="CourseNavigation.tsx"></div>
              </SortableContainer>
              <span data-magicpath-id="36" data-magicpath-path="CourseNavigation.tsx">Transcript Ready</span>
            </SortableContainer> : <SortableContainer dndKitId="3881d41c-b318-4f9a-8ba7-0eb0b956b628" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="37" data-magicpath-path="CourseNavigation.tsx">
              <BookOpen className="w-4 h-4" data-magicpath-id="38" data-magicpath-path="CourseNavigation.tsx" />
              <span data-magicpath-id="39" data-magicpath-path="CourseNavigation.tsx">Extract Transcript</span>
            </SortableContainer>}
        </SortableContainer>

        {/* Navigation Controls */}
        <SortableContainer dndKitId="918e8776-8d72-4bd7-8ef2-62898b33b536" containerType="regular" prevTag="div" className="flex items-center justify-between" data-magicpath-id="40" data-magicpath-path="CourseNavigation.tsx">
          <SortableContainer dndKitId="d093ebff-88ff-4f3d-983f-70779a059621" containerType="regular" prevTag="button" onClick={onPreviousCourse} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="41" data-magicpath-path="CourseNavigation.tsx">
            <ChevronLeft className="w-4 h-4" data-magicpath-id="42" data-magicpath-path="CourseNavigation.tsx" />
            <span data-magicpath-id="43" data-magicpath-path="CourseNavigation.tsx">Previous</span>
          </SortableContainer>
          
          <SortableContainer dndKitId="211601c2-d5b5-4d98-b064-2dcec33f2759" containerType="regular" prevTag="div" className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="44" data-magicpath-path="CourseNavigation.tsx">
            <div className="flex gap-1" data-magicpath-id="45" data-magicpath-path="CourseNavigation.tsx">
              {[1, 2, 3, 4, 5].map((dot, index) => <div key={dot} className={`w-1.5 h-1.5 rounded-full ${index === 2 ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`} data-magicpath-id="46" data-magicpath-path="CourseNavigation.tsx"></div>)}
            </div>
            <span data-magicpath-id="47" data-magicpath-path="CourseNavigation.tsx">Course 3 of 5</span>
          </SortableContainer>
          
          <SortableContainer dndKitId="2105524c-d46b-4ff4-b130-be163c4c75c1" containerType="regular" prevTag="button" onClick={onNextCourse} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="48" data-magicpath-path="CourseNavigation.tsx">
            <span data-magicpath-id="49" data-magicpath-path="CourseNavigation.tsx">Next</span>
            <ChevronRight className="w-4 h-4" data-magicpath-id="50" data-magicpath-path="CourseNavigation.tsx" />
          </SortableContainer>
        </SortableContainer>
      </SortableContainer>
    </SortableContainer>;
};