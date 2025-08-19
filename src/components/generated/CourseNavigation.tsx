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
  return <SortableContainer dndKitId="a5a3c36c-fb0e-4e31-9dd4-51b5e621da40" containerType="regular" prevTag="div" className="border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700" data-magicpath-id="0" data-magicpath-path="CourseNavigation.tsx">
      <SortableContainer dndKitId="a93a86fa-302c-4bb5-85d7-2b84ac512390" containerType="regular" prevTag="div" className="p-4 space-y-3" data-magicpath-id="1" data-magicpath-path="CourseNavigation.tsx">
        {/* Course Info */}
        <SortableContainer dndKitId="30e0c821-0dc7-4bf1-b848-96d8350f1a63" containerType="regular" prevTag="div" className="space-y-2" data-magicpath-id="2" data-magicpath-path="CourseNavigation.tsx">
          <SortableContainer dndKitId="9452b844-ae4e-42d3-ba85-3287eeb3c168" containerType="regular" prevTag="div" className="flex items-start gap-2" data-magicpath-id="3" data-magicpath-path="CourseNavigation.tsx">
            <BookOpen className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" data-magicpath-id="4" data-magicpath-path="CourseNavigation.tsx" />
            <SortableContainer dndKitId="7f07347d-9d8a-4fa9-ad5d-f53a589ba4b9" containerType="regular" prevTag="div" className="flex-1 min-w-0" data-magicpath-id="5" data-magicpath-path="CourseNavigation.tsx">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" data-magicpath-id="6" data-magicpath-path="CourseNavigation.tsx">
                <span data-magicpath-id="7" data-magicpath-path="CourseNavigation.tsx">{currentCourse.title}</span>
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400" data-magicpath-id="8" data-magicpath-path="CourseNavigation.tsx">
                <span data-magicpath-id="9" data-magicpath-path="CourseNavigation.tsx">by {currentCourse.instructor}</span>
              </p>
            </SortableContainer>
          </SortableContainer>
          
          <SortableContainer dndKitId="168ee2ce-71f6-424a-8957-7d08b2f90626" containerType="regular" prevTag="div" className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="10" data-magicpath-path="CourseNavigation.tsx">
            <SortableContainer dndKitId="8a4792a8-5980-4829-9f51-f4c9f455ca1f" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="11" data-magicpath-path="CourseNavigation.tsx">
              <Clock className="w-3 h-3" data-magicpath-id="12" data-magicpath-path="CourseNavigation.tsx" />
              <span data-magicpath-id="13" data-magicpath-path="CourseNavigation.tsx">{currentCourse.duration}</span>
            </SortableContainer>
            <SortableContainer dndKitId="472345c6-43c7-45eb-8ab3-86d6a755d3b7" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="14" data-magicpath-path="CourseNavigation.tsx">
              <Users className="w-3 h-3" data-magicpath-id="15" data-magicpath-path="CourseNavigation.tsx" />
              <span data-magicpath-id="16" data-magicpath-path="CourseNavigation.tsx">{currentCourse.students}</span>
            </SortableContainer>
          </SortableContainer>
          
          {/* Current Lesson */}
          <SortableContainer dndKitId="0e0dd162-6c46-4f90-a568-8ffbd47f5be6" containerType="regular" prevTag="div" className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600" data-magicpath-id="17" data-magicpath-path="CourseNavigation.tsx">
            <SortableContainer dndKitId="034e23a5-8bfc-4b2b-82a6-7ca973342cf2" containerType="regular" prevTag="div" className="flex items-center justify-between" data-magicpath-id="18" data-magicpath-path="CourseNavigation.tsx">
              <SortableContainer dndKitId="cc893353-e215-4342-b1bb-b6f490bfbcab" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="19" data-magicpath-path="CourseNavigation.tsx">
                <Play className="w-3 h-3 text-orange-600 dark:text-orange-400" data-magicpath-id="20" data-magicpath-path="CourseNavigation.tsx" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="21" data-magicpath-path="CourseNavigation.tsx">
                  <span data-magicpath-id="22" data-magicpath-path="CourseNavigation.tsx">Lesson {currentCourse.currentLesson}/{currentCourse.totalLessons}</span>
                </span>
              </SortableContainer>
              <SortableContainer dndKitId="08f17972-9991-4a75-9fad-23f0eedb60a2" containerType="regular" prevTag="div" className="text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="23" data-magicpath-path="CourseNavigation.tsx">
                <span data-magicpath-id="24" data-magicpath-path="CourseNavigation.tsx">{Math.round(currentCourse.currentLesson / currentCourse.totalLessons * 100)}%</span>
              </SortableContainer>
            </SortableContainer>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate" data-magicpath-id="25" data-magicpath-path="CourseNavigation.tsx">
              <span data-magicpath-id="26" data-magicpath-path="CourseNavigation.tsx">{currentCourse.lessonTitle}</span>
            </p>
            
            {/* Progress Bar */}
            <SortableContainer dndKitId="268d1b7b-e6fe-4ec9-bc57-5478ae1ac138" containerType="regular" prevTag="div" className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2" data-magicpath-id="27" data-magicpath-path="CourseNavigation.tsx">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full transition-all duration-300" style={{
              width: `${currentCourse.currentLesson / currentCourse.totalLessons * 100}%`
            }} data-magicpath-id="28" data-magicpath-path="CourseNavigation.tsx"></div>
            </SortableContainer>
          </SortableContainer>
        </SortableContainer>

        {/* Extract Transcript Button */}
        <SortableContainer dndKitId="8162d92c-aff6-4d9d-a7a9-ce86fd493d4a" containerType="regular" prevTag="button" onClick={onExtractTranscript} disabled={isExtracting} className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${hasTranscript ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : isExtracting ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-sm hover:shadow-md'}`} data-magicpath-id="29" data-magicpath-path="CourseNavigation.tsx">
          {isExtracting ? <SortableContainer dndKitId="6b6df6a5-6b3a-4307-b942-25a5b821ef5a" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="30" data-magicpath-path="CourseNavigation.tsx">
              <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" data-magicpath-id="31" data-magicpath-path="CourseNavigation.tsx"></div>
              <span data-magicpath-id="32" data-magicpath-path="CourseNavigation.tsx">Extracting...</span>
            </SortableContainer> : hasTranscript ? <SortableContainer dndKitId="50f85f8b-229d-4c0e-8997-4e127b31e6ef" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="33" data-magicpath-path="CourseNavigation.tsx">
              <SortableContainer dndKitId="54f2dc44-5af4-4895-a95a-dac41b322d7e" containerType="regular" prevTag="div" className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center" data-magicpath-id="34" data-magicpath-path="CourseNavigation.tsx">
                <div className="w-2 h-2 bg-white rounded-full" data-magicpath-id="35" data-magicpath-path="CourseNavigation.tsx"></div>
              </SortableContainer>
              <span data-magicpath-id="36" data-magicpath-path="CourseNavigation.tsx">Transcript Ready</span>
            </SortableContainer> : <SortableContainer dndKitId="f0feed45-1a22-47c9-957a-64d4c8f63bc4" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="37" data-magicpath-path="CourseNavigation.tsx">
              <BookOpen className="w-4 h-4" data-magicpath-id="38" data-magicpath-path="CourseNavigation.tsx" />
              <span data-magicpath-id="39" data-magicpath-path="CourseNavigation.tsx">Extract Transcript</span>
            </SortableContainer>}
        </SortableContainer>

        {/* Navigation Controls */}
        <SortableContainer dndKitId="bef1edbe-917d-48ac-8b6d-91c1030dc962" containerType="regular" prevTag="div" className="flex items-center justify-between" data-magicpath-id="40" data-magicpath-path="CourseNavigation.tsx">
          <SortableContainer dndKitId="7a96085c-d790-45ad-93f4-1e3b18dd9d9b" containerType="regular" prevTag="button" onClick={onPreviousCourse} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="41" data-magicpath-path="CourseNavigation.tsx">
            <ChevronLeft className="w-4 h-4" data-magicpath-id="42" data-magicpath-path="CourseNavigation.tsx" />
            <span data-magicpath-id="43" data-magicpath-path="CourseNavigation.tsx">Previous</span>
          </SortableContainer>
          
          <SortableContainer dndKitId="8f12e5d5-d8f1-4c2d-81d8-f23447155b96" containerType="regular" prevTag="div" className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="44" data-magicpath-path="CourseNavigation.tsx">
            <div className="flex gap-1" data-magicpath-id="45" data-magicpath-path="CourseNavigation.tsx">
              {[1, 2, 3, 4, 5].map((dot, index) => <div key={dot} className={`w-1.5 h-1.5 rounded-full ${index === 2 ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`} data-magicpath-id="46" data-magicpath-path="CourseNavigation.tsx"></div>)}
            </div>
            <span data-magicpath-id="47" data-magicpath-path="CourseNavigation.tsx">Course 3 of 5</span>
          </SortableContainer>
          
          <SortableContainer dndKitId="a0deaecb-b466-4bfd-ac58-2397ba496eeb" containerType="regular" prevTag="button" onClick={onNextCourse} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="48" data-magicpath-path="CourseNavigation.tsx">
            <span data-magicpath-id="49" data-magicpath-path="CourseNavigation.tsx">Next</span>
            <ChevronRight className="w-4 h-4" data-magicpath-id="50" data-magicpath-path="CourseNavigation.tsx" />
          </SortableContainer>
        </SortableContainer>
      </SortableContainer>
    </SortableContainer>;
};