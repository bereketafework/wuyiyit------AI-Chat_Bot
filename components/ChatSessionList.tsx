
import React from 'react';
import { LocalUser, ChatSession, Theme, LanguageCode } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { NewTrashIcon } from './icons/NewTrashIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { TranslationKey } from '../localization'; // Import TranslationKey

interface ChatSessionListProps {
  currentUser: LocalUser | null;
  onLogout: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onPromptDelete: (sessionId: string) => void;
  onToggleHelp: () => void;
  theme: Theme;
  language: LanguageCode;
  translate: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
}

export const ChatSessionList: React.FC<ChatSessionListProps> = ({
  currentUser,
  onLogout,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onPromptDelete,
  onToggleHelp,
  theme,
  language,
  translate,
}) => {

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    onPromptDelete(sessionId);
  };

  return (
    <div className={`h-full flex flex-col shadow-lg ${theme === 'dark' ? 'bg-slate-800/70 text-gray-200' : 'bg-gray-50 text-gray-700 border-r border-gray-200'} backdrop-blur-md`}>
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
        <button
          onClick={onNewSession}
          disabled={!currentUser}
          className={`w-full flex items-center justify-center p-2.5 rounded-md text-white transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
            ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700 focus:ring-offset-slate-800 disabled:bg-slate-600' : 'bg-purple-500 hover:bg-purple-600 focus:ring-offset-gray-50 disabled:bg-gray-400'}
            disabled:cursor-not-allowed`}
          aria-label={translate('newChat')}
        >
          <PlusIcon />
          <span className="ml-2 font-['Noto_Sans']">{translate('newChat')}</span>
        </button>
      </div>
      <nav className="flex-grow p-2 space-y-1 overflow-y-auto">
        {sessions.length === 0 && currentUser && (
          <p className={`text-sm px-2 py-4 text-center ${language === 'am' ? 'font-amharic' : ''} ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {translate('noChatSessions')}
          </p>
        )}
         {!currentUser && (
          <p className={`text-sm px-2 py-4 text-center ${language === 'am' ? 'font-amharic' : ''} ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {translate('pleaseLoginToViewChats')}
          </p>
        )}
        {currentUser && sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            tabIndex={0} // Make session item focusable
            className={`group flex items-center justify-between px-3 py-2.5 rounded-md text-sm truncate transition-colors duration-150 ease-in-out cursor-pointer focus:outline-none focus:ring-1 ${theme === 'dark' ? 'focus:ring-purple-400' : 'focus:ring-purple-500'}
                        ${language === 'am' && !session.name.startsWith("File:") ? 'font-amharic' : 'font-["Noto_Sans"]'}
                        ${
                          session.id === activeSessionId
                            ? `${theme === 'dark' ? 'bg-purple-500/30 text-purple-300' : 'bg-purple-100 text-purple-700'} font-semibold`
                            : `${theme === 'dark' ? 'hover:bg-slate-700/50 text-gray-300 hover:text-gray-100' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'}`
                        }
                      `}
            aria-current={session.id === activeSessionId ? 'page' : undefined}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectSession(session.id);}} // Allow selection with Enter/Space
          >
            <span className="truncate">{session.name}</span>
            <button
                onClick={(e) => handleDeleteClick(e, session.id)}
                className={`ml-2 p-1 transition-opacity focus:opacity-100
                  ${theme === 'dark' ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}
                  opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100`}
                aria-label={translate('deleteChat', { sessionName: session.name })}
            >
                <NewTrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </nav>
      <footer className={`p-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'} text-xs`}>
        {currentUser && (
          <div className={`mb-3 p-2 rounded-md ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'}`}>
            <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} title={currentUser.email}>
              {translate('loggedInAs')} <strong>{currentUser.name || currentUser.email}</strong>
            </p>
            <button
              onClick={onLogout}
              className={`w-full mt-2 flex items-center justify-center p-2 rounded-md text-sm transition-colors
                ${theme === 'dark' ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
            >
              <LogoutIcon className="w-4 h-4 mr-2" />
              {translate('logout')}
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mb-1">
            <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{translate('copyright')}</p>
            <button
              onClick={onToggleHelp}
              className={`${theme === 'dark' ? 'text-gray-400 hover:text-purple-400' : 'text-gray-500 hover:text-purple-600'} transition-colors`}
              aria-label={translate('help')}
            >
              <QuestionMarkCircleIcon className="w-6 h-6" />
            </button>
        </div>
        <div className={`${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'} text-center mt-1`}>
            <p>{translate('helpModalDevInfo')}</p>
            <p>{translate('helpModalContact')}</p>
        </div>
      </footer>
    </div>
  );
};
