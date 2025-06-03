
import React from 'react';
import { Theme, LanguageCode } from '../types';
import { TranslationKey } from '../localization';
import { MenuIcon } from './icons/MenuIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';

interface ChatHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  theme: Theme;
  toggleTheme: () => void;
  language: LanguageCode;
  toggleLanguage: () => void;
  translate: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  theme,
  toggleTheme,
  language,
  toggleLanguage,
  translate,
}) => {
  return (
    <header className={`shadow-md p-3 md:p-4 text-center flex items-center justify-between md:justify-center relative ${theme === 'dark' ? 'bg-slate-800/60 text-gray-100' : 'bg-white text-gray-800 border-b border-gray-200'} backdrop-blur-md sticky top-0 z-20`}>
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`md:hidden p-2 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black'}`}
        aria-label={translate('toggleChatSessions')}>
        <MenuIcon />
      </button>
      <div className="flex-1 flex flex-col items-center">
        <h1 className={`text-lg sm:text-xl md:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 ${language === 'am' ? 'font-amharic' : ''}`}>
          {translate('appName')}
        </h1>
      </div>
      <div className="flex items-center space-x-2">
        <button onClick={toggleLanguage} className={`p-1.5 rounded-full text-xs ${theme === 'dark' ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            {language === 'am' ? 'EN' : 'አማ'}
        </button>
        <button onClick={toggleTheme}
          className={`p-2 rounded-full ${theme === 'dark' ? 'text-yellow-400 hover:bg-slate-700' : 'text-purple-600 hover:bg-gray-200'}`}
          aria-label={theme === 'light' ? translate('switchToDarkMode') : translate('switchToLightMode')}>
          {theme === 'light' ? <MoonIcon className="w-5 h-5"/> : <SunIcon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};
