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
  return <SortableContainer dndKitId="65772cbf-4764-4e2c-9901-4fc94ec30fc6" containerType="regular" prevTag="div" className="border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700" data-magicpath-id="0" data-magicpath-path="CourseNavigation.tsx">
      <SortableContainer dndKitId="f44debf3-826a-4399-a8d6-2a33a3aedffc" containerType="regular" prevTag="div" className="p-4 space-y-3" data-magicpath-id="1" data-magicpath-path="CourseNavigation.tsx">
        {/* Course Info */}
        <SortableContainer dndKitId="b5c662cc-d97b-492c-a359-bc4fae13be47" containerType="regular" prevTag="div" className="space-y-2" data-magicpath-id="2" data-magicpath-path="CourseNavigation.tsx">
          <SortableContainer dndKitId="85e367af-ced8-46d0-980b-c8de80e3d9f4" containerType="regular" prevTag="div" className="flex items-start gap-2" data-magicpath-id="3" data-magicpath-path="CourseNavigation.tsx">
            <BookOpen className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" data-magicpath-id="4" data-magicpath-path="CourseNavigation.tsx" />
            <SortableContainer dndKitId="fee039ae-3e3a-4865-8e83-826ceac0dcbc" containerType="regular" prevTag="div" className="flex-1 min-w-0" data-magicpath-id="5" data-magicpath-path="CourseNavigation.tsx">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" data-magicpath-id="6" data-magicpath-path="CourseNavigation.tsx">
                <span data-magicpath-id="7" data-magicpath-path="CourseNavigation.tsx">{currentCourse.title}</span>
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400" data-magicpath-id="8" data-magicpath-path="CourseNavigation.tsx">
                <span data-magicpath-id="9" data-magicpath-path="CourseNavigation.tsx">by {currentCourse.instructor}</span>
              </p>
            </SortableContainer>
          </SortableContainer>
          
          <SortableContainer dndKitId="706f1da0-4a56-45ab-9664-3c16719ae1d5" containerType="regular" prevTag="div" className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="10" data-magicpath-path="CourseNavigation.tsx">
            <SortableContainer dndKitId="d6b341cb-86fc-4aee-947b-fbe09d7792d7" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="11" data-magicpath-path="CourseNavigation.tsx">
              <Clock className="w-3 h-3" data-magicpath-id="12" data-magicpath-path="CourseNavigation.tsx" />
              <span data-magicpath-id="13" data-magicpath-path="CourseNavigation.tsx">{currentCourse.duration}</span>
            </SortableContainer>
            <SortableContainer dndKitId="ec8cb94f-15de-4ee3-a825-633ef9da3550" containerType="regular" prevTag="div" className="flex items-center gap-1" data-magicpath-id="14" data-magicpath-path="CourseNavigation.tsx">
              <Users className="w-3 h-3" data-magicpath-id="15" data-magicpath-path="CourseNavigation.tsx" />
              <span data-magicpath-id="16" data-magicpath-path="CourseNavigation.tsx">{currentCourse.students}</span>
            </SortableContainer>
          </SortableContainer>
          
          {/* Current Lesson */}
          <SortableContainer dndKitId="5d56f8fb-2fd5-4220-a186-26bb9126ea67" containerType="regular" prevTag="div" className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600" data-magicpath-id="17" data-magicpath-path="CourseNavigation.tsx">
            <SortableContainer dndKitId="6a290fc2-d282-459e-a19f-5910ac9c055f" containerType="regular" prevTag="div" className="flex items-center justify-between" data-magicpath-id="18" data-magicpath-path="CourseNavigation.tsx">
              <SortableContainer dndKitId="15b0aeec-afad-4cd5-9235-b4685041fbea" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="19" data-magicpath-path="CourseNavigation.tsx">
                <Play className="w-3 h-3 text-orange-600 dark:text-orange-400" data-magicpath-id="20" data-magicpath-path="CourseNavigation.tsx" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="21" data-magicpath-path="CourseNavigation.tsx">
                  <span data-magicpath-id="22" data-magicpath-path="CourseNavigation.tsx">Lesson {currentCourse.currentLesson}/{currentCourse.totalLessons}</span>
                </span>
              </SortableContainer>
              <SortableContainer dndKitId="d3f71661-e6b0-4cd8-a474-466312710ef7" containerType="regular" prevTag="div" className="text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="23" data-magicpath-path="CourseNavigation.tsx">
                <span data-magicpath-id="24" data-magicpath-path="CourseNavigation.tsx">{Math.round(currentCourse.currentLesson / currentCourse.totalLessons * 100)}%</span>
              </SortableContainer>
            </SortableContainer>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate" data-magicpath-id="25" data-magicpath-path="CourseNavigation.tsx">
              <span data-magicpath-id="26" data-magicpath-path="CourseNavigation.tsx">{currentCourse.lessonTitle}</span>
            </p>
            
            {/* Progress Bar */}
            <SortableContainer dndKitId="8e574902-c8ee-446d-a931-88b3e0a36ee0" containerType="regular" prevTag="div" className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2" data-magicpath-id="27" data-magicpath-path="CourseNavigation.tsx">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full transition-all duration-300" style={{
              width: `${currentCourse.currentLesson / currentCourse.totalLessons * 100}%`
            }} data-magicpath-id="28" data-magicpath-path="CourseNavigation.tsx"></div>
            </SortableContainer>
          </SortableContainer>
        </SortableContainer>

        {/* Extract Transcript Button */}
        <SortableContainer dndKitId="830a5761-7865-4b04-972d-b6e07bdd6019" containerType="regular" prevTag="button" onClick={onExtractTranscript} disabled={isExtracting} className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${hasTranscript ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : isExtracting ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-sm hover:shadow-md'}`} data-magicpath-id="29" data-magicpath-path="CourseNavigation.tsx">
          {isExtracting ? <SortableContainer dndKitId="f1492693-74ff-492d-881f-2ea63ac6c96f" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="30" data-magicpath-path="CourseNavigation.tsx">
              <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" data-magicpath-id="31" data-magicpath-path="CourseNavigation.tsx"></div>
              <span data-magicpath-id="32" data-magicpath-path="CourseNavigation.tsx">Extracting...</span>
            </SortableContainer> : hasTranscript ? <SortableContainer dndKitId="2edaa9a4-7b19-495d-a516-5d524d8c7149" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="33" data-magicpath-path="CourseNavigation.tsx">
              <SortableContainer dndKitId="73cb9902-9050-40b0-ac27-48f3842282fe" containerType="regular" prevTag="div" className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center" data-magicpath-id="34" data-magicpath-path="CourseNavigation.tsx">
                <div className="w-2 h-2 bg-white rounded-full" data-magicpath-id="35" data-magicpath-path="CourseNavigation.tsx"></div>
              </SortableContainer>
              <span data-magicpath-id="36" data-magicpath-path="CourseNavigation.tsx">Transcript Ready</span>
            </SortableContainer> : <SortableContainer dndKitId="a9b13a69-292c-4921-849e-513911fcc8b8" containerType="regular" prevTag="div" className="flex items-center gap-2" data-magicpath-id="37" data-magicpath-path="CourseNavigation.tsx">
              <BookOpen className="w-4 h-4" data-magicpath-id="38" data-magicpath-path="CourseNavigation.tsx" />
              <span data-magicpath-id="39" data-magicpath-path="CourseNavigation.tsx">Extract Transcript</span>
            </SortableContainer>}
        </SortableContainer>

        {/* Navigation Controls */}
        <SortableContainer dndKitId="5e2d14ac-46fe-4f42-bebc-7ef0526219b5" containerType="regular" prevTag="div" className="flex items-center justify-between" data-magicpath-id="40" data-magicpath-path="CourseNavigation.tsx">
          <SortableContainer dndKitId="75edb6be-e6ba-4fc1-b98a-f00521a6415a" containerType="regular" prevTag="button" onClick={onPreviousCourse} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="41" data-magicpath-path="CourseNavigation.tsx">
            <ChevronLeft className="w-4 h-4" data-magicpath-id="42" data-magicpath-path="CourseNavigation.tsx" />
            <span data-magicpath-id="43" data-magicpath-path="CourseNavigation.tsx">Previous</span>
          </SortableContainer>
          
          <SortableContainer dndKitId="b531707c-e750-4df6-8ee5-0689e7449fe9" containerType="regular" prevTag="div" className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400" data-magicpath-id="44" data-magicpath-path="CourseNavigation.tsx">
            <div className="flex gap-1" data-magicpath-id="45" data-magicpath-path="CourseNavigation.tsx">
              {[1, 2, 3, 4, 5].map((dot, index) => <div key={dot} className={`w-1.5 h-1.5 rounded-full ${index === 2 ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`} data-magicpath-id="46" data-magicpath-path="CourseNavigation.tsx"></div>)}
            </div>
            <span data-magicpath-id="47" data-magicpath-path="CourseNavigation.tsx">Course 3 of 5</span>
          </SortableContainer>
          
          <SortableContainer dndKitId="66777c21-f02a-457c-8976-0c71ebf218ea" containerType="regular" prevTag="button" onClick={onNextCourse} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-300" data-magicpath-id="48" data-magicpath-path="CourseNavigation.tsx">
            <span data-magicpath-id="49" data-magicpath-path="CourseNavigation.tsx">Next</span>
            <ChevronRight className="w-4 h-4" data-magicpath-id="50" data-magicpath-path="CourseNavigation.tsx" />
          </SortableContainer>
        </SortableContainer>
      </SortableContainer>
    </SortableContainer>;
};