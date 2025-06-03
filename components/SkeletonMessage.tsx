
import React from 'react';
import { Theme } from '../types';
import { BIcon } from './icons/BIcon'; // Using BIcon as a placeholder base

interface SkeletonMessageProps {
  theme: Theme;
}

export const SkeletonMessage: React.FC<SkeletonMessageProps> = ({ theme }) => {
  const bubbleClasses = theme === 'dark' 
    ? 'bg-slate-700' 
    : 'bg-gray-200';
  
  const placeholderLineClasses = theme === 'dark'
    ? 'bg-slate-600'
    : 'bg-gray-300';

  return (
    <div className="flex justify-start animate-fadeIn">
      <div className="flex items-start space-x-2.5 max-w-xl md:max-w-2xl lg:max-w-3xl">
        <div className="mt-1 mr-2.5">
          {/* AI Icon Placeholder - can use BIcon or a simpler div */}
           <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${theme === 'dark' ? 'bg-slate-500' : 'bg-gray-400'} animate-pulse`}>
             <span className="font-bold text-md text-white opacity-50">B</span>
           </div>
        </div>
        <div className={`p-3 md:p-4 ${bubbleClasses} rounded-lg rounded-bl-none shadow-md animate-pulse`}>
          <div className="space-y-2.5">
            <div className={`h-3 w-40 rounded ${placeholderLineClasses}`}></div>
            <div className={`h-3 w-56 rounded ${placeholderLineClasses}`}></div>
            <div className={`h-3 w-32 rounded ${placeholderLineClasses}`}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
