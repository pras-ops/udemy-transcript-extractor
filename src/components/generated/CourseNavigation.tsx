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
  return <SortableContainer dndKitId="c609c8f8-ab29-46eb-8bd5-0b86e4e0934d" containerType="regular" prevTag="div" className="border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700" data-magicpath-id="0" data-magicpath-path="CourseNavigation.tsx">
      <SortableContainer dndKitId="df520a46-9308-448e-b32d-bd0999b9365a" containerType="regular" prevTag="div" className="p-4 space-y-3" data-magicpath-id="1" data-magicpath-path="CourseNavigation.tsx">
        {/* Course Info */}
        <SortableContainer dndKitId="64be263d-2869-447d-8c93-4312637314d3" containerType="regular" prevTag="div" className="space-y-2" data-magicpath-id="2" data-magicpath-path="CourseNavigation.tsx">
          <SortableContainer dndKitId="9cd01f5d-cf6b-4d4d-a06d-9da4675c196c" containerType="regular" prevTag="div" className="flex items-start gap-2" data-magicpath-id="3" data-magicpath-path="CourseNavigation.tsx">
            <BookOpen className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" data-magicpath-id="4" data-magicpath-path="CourseNavigation.tsx" />
            <SortableContainer dndKitId="a4c91406-58cc-4b42-aced-4e17d0503922" containerType="regular" prevTag="div" className="flex-1 min-w-0" data-magicpath-id="5" data-magicpath-path="CourseNavigation.tsx">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" data-magicpath-id="6" data-magicpath-path="CourseNavigation.tsx">
                <span data-magicpath-id="7" data-magicpath-path="CourseNavigation.tsx">{currentCourse.title}</span>
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400" data-magicpath-id="8" data-magicpath-path="CourseNavigation.tsx">
                <span data-magicpath-id="9" data-magicpath-path="CourseNavigation.tsx">by {currentCourse.instructor}</span>
              </p>
            </SortableContainer>
          </SortableContainer>
          
          <SortableContainer dndKitId="0f46001f-cdf7-489a-8513-78c9eadc39ca" containerType="regular" prevTag="div" className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="10" data-magicpath-path="CourseNavigation.tsx">
            <SortableContainer dndKitId="cff33b00-ef98-46ca-92c8-a7df2485fec8" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="11" data-magicpath-path="CourseNavigation.tsx">
              <Clock className="w-3 h-3" data-magicpath-id="12" data-magicpath-path="CourseNavigation.tsx" />
              <span data-magicpath-id="13" data-magicpath-path="CourseNavigation.tsx">{currentCourse.duration}</span>
            </SortableContainer>
            <SortableContainer dndKitId="9bf4146e-7931-4f37-a480-f76102e4b89b" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="14" data-magicpath-path="CourseNavigation.tsx">
              <Users className="w-3 h-3" data-magicpath-id="15" data-magicpath-path="CourseNavigation.tsx" />
              <span data-magicpath-id="16" data-magicpath-path="CourseNavigation.tsx">{currentCourse.students}</span>
            </SortableContainer>
          </SortableContainer>
          
          {/* Current Lesson */}
          <SortableContainer dndKitId="3a5fff4d-af7c-4f4a-93a5-5b37d1a65fdf" containerType="regular" prevTag="div" className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600" data-magicpath-id="17" data-magicpath-path="CourseNavigation.tsx">
            <SortableContainer dndKitId="2ff699e3-61c9-416b-8a0d-c740aaf70896" containerType="regular" prevTag="div" className="flex items-center justify-between" data-magicpath-id="18" data-magicpath-path="CourseNavigation.tsx">
              <SortableContainer dndKitId="e9db1705-b6f0-4ee9-986f-f0b5cbe694b5" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="19" data-magicpath-path="CourseNavigation.tsx">
                <Play className="w-3 h-3 text-orange-600 dark:text-orange-400" data-magicpath-id="20" data-magicpath-path="CourseNavigation.tsx" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="21" data-magicpath-path="CourseNavigation.tsx">
                  <span data-magicpath-id="22" data-magicpath-path="CourseNavigation.tsx">Lesson {currentCourse.currentLesson}/{currentCourse.totalLessons}</span>
                </span>
              </SortableContainer>
              <SortableContainer dndKitId="c9d42ce3-1063-4b83-a5fc-8b3618502f1a" containerType="regular" prevTag="div" className="text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="23" data-magicpath-path="CourseNavigation.tsx">
                <span data-magicpath-id="24" data-magicpath-path="CourseNavigation.tsx">{Math.round(currentCourse.currentLesson / currentCourse.totalLessons * 100)}%</span>
              </SortableContainer>
            </SortableContainer>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate" data-magicpath-id="25" data-magicpath-path="CourseNavigation.tsx">
              <span data-magicpath-id="26" data-magicpath-path="CourseNavigation.tsx">{currentCourse.lessonTitle}</span>
            </p>
            
            {/* Progress Bar */}
            <SortableContainer dndKitId="896e1334-9d70-40d5-80cf-0ec366e5530b" containerType="regular" prevTag="div" className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2" data-magicpath-id="27" data-magicpath-path="CourseNavigation.tsx">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full transition-all duration-300" style={{
              width: `${currentCourse.currentLesson / currentCourse.totalLessons * 100}%`
            }} data-magicpath-id="28" data-magicpath-path="CourseNavigation.tsx"></div>
            </SortableContainer>
          </SortableContainer>
        </SortableContainer>

        {/* Extract Transcript Button */}
        <SortableContainer dndKitId="b35bb8c7-0077-48cd-a199-e858bd8bef66" containerType="regular" prevTag="button" onClick={onExtractTranscript} disabled={isExtracting} className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${hasTranscript ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : isExtracting ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-sm hover:shadow-md'}`} data-magicpath-id="29" data-magicpath-path="CourseNavigation.tsx">
          {isExtracting ? <SortableContainer dndKitId="f1485cd4-6fc0-4376-a73a-457031744c4a" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="30" data-magicpath-path="CourseNavigation.tsx">
              <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" data-magicpath-id="31" data-magicpath-path="CourseNavigation.tsx"></div>
              <span data-magicpath-id="32" data-magicpath-path="CourseNavigation.tsx">Extracting...</span>
            </SortableContainer> : hasTranscript ? <SortableContainer dndKitId="e15cc654-0aa7-4815-b72a-2f26a3ee0a71" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="33" data-magicpath-path="CourseNavigation.tsx">
              <SortableContainer dndKitId="51a2abaa-4345-45ce-bed3-efd3f7803fc2" containerType="regular" prevTag="div" className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center" data-magicpath-id="34" data-magicpath-path="CourseNavigation.tsx">
                <div className="w-2 h-2 bg-white rounded-full" data-magicpath-id="35" data-magicpath-path="CourseNavigation.tsx"></div>
              </SortableContainer>
              <span data-magicpath-id="36" data-magicpath-path="CourseNavigation.tsx">Transcript Ready</span>
            </SortableContainer> : <SortableContainer dndKitId="c4fa3211-ff4a-49a6-ac36-2fb2a44bb07b" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="37" data-magicpath-path="CourseNavigation.tsx">
              <BookOpen className="w-4 h-4" data-magicpath-id="38" data-magicpath-path="CourseNavigation.tsx" />
              <span data-magicpath-id="39" data-magicpath-path="CourseNavigation.tsx">Extract Transcript</span>
            </SortableContainer>}
        </SortableContainer>

        {/* Navigation Controls */}
        <SortableContainer dndKitId="e27b14ea-324d-48b1-9051-2b845670227f" containerType="regular" prevTag="div" className="flex items-center justify-between" data-magicpath-id="40" data-magicpath-path="CourseNavigation.tsx">
          <SortableContainer dndKitId="7ac8f79a-510f-4085-91b7-a828a267470e" containerType="regular" prevTag="button" onClick={onPreviousCourse} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="41" data-magicpath-path="CourseNavigation.tsx">
            <ChevronLeft className="w-4 h-4" data-magicpath-id="42" data-magicpath-path="CourseNavigation.tsx" />
            <span data-magicpath-id="43" data-magicpath-path="CourseNavigation.tsx">Previous</span>
          </SortableContainer>
          
          <SortableContainer dndKitId="c88ab487-0bd1-457a-9772-e83fc4932834" containerType="regular" prevTag="div" className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="44" data-magicpath-path="CourseNavigation.tsx">
            <div className="flex gap-1" data-magicpath-id="45" data-magicpath-path="CourseNavigation.tsx">
              {[1, 2, 3, 4, 5].map((dot, index) => <div key={dot} className={`w-1.5 h-1.5 rounded-full ${index === 2 ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`} data-magicpath-id="46" data-magicpath-path="CourseNavigation.tsx"></div>)}
            </div>
            <span data-magicpath-id="47" data-magicpath-path="CourseNavigation.tsx">Course 3 of 5</span>
          </SortableContainer>
          
          <SortableContainer dndKitId="c6abf02f-2c3f-476b-b47d-f7ab22aa3fe2" containerType="regular" prevTag="button" onClick={onNextCourse} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="48" data-magicpath-path="CourseNavigation.tsx">
            <span data-magicpath-id="49" data-magicpath-path="CourseNavigation.tsx">Next</span>
            <ChevronRight className="w-4 h-4" data-magicpath-id="50" data-magicpath-path="CourseNavigation.tsx" />
          </SortableContainer>
        </SortableContainer>
      </SortableContainer>
    </SortableContainer>;
};