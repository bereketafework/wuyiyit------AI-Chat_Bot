
import React from 'react';
import { Theme } from '../../types';

interface BIconProps {
  isError?: boolean;
  theme: Theme;
}

export const BIcon: React.FC<BIconProps> = ({ isError = false, theme }) => {
  const errorBgColor = isError ? 'bg-red-500 dark:bg-red-600' : '';
  const normalBgColor = theme === 'dark' ? 'bg-slate-500' : 'bg-gray-400';
  const bgColor = isError ? errorBgColor : normalBgColor;
  
  const textColor = 'text-white';

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgColor} flex-shrink-0 shadow-md`}>
      <span className={`font-bold text-md ${textColor}`}>B</span>
    </div>
  );
};
