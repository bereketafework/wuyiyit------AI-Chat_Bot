
import React from 'react';
import { ChatSession, ChatMode, Theme, LanguageCode, FileInfo } from '../types';
import { TranslationKey } from '../localization';
import { SendIcon } from './icons/SendIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { FileIcon as FileDisplayIcon } from './icons/FileIcon'; // Renamed to avoid conflict
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';

interface ChatFooterProps {
  activeSession: ChatSession | undefined;
  handleChangeMode: (newMode: ChatMode) => Promise<void>;
  isLoading: boolean;
  apiKeyExists: boolean;
  translate: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
  language: LanguageCode;
  theme: Theme;
  fileError: string | null;
  selectedFile: File | null;
  selectedFilePreview: string | null;
  handleRemoveSelectedFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  userInput: string;
  setUserInput: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: () => Promise<void>;
  supportedFileTypes: string[];
}

export const CHAT_MODES_CONFIG: { id: ChatMode; nameKey: TranslationKey; icon: React.FC<{className?: string}> }[] = [
  { id: 'general', nameKey: 'generalMode', icon: ChatBubbleLeftRightIcon },
  { id: 'medical', nameKey: 'medicalMode', icon: BriefcaseIcon },
  { id: 'child', nameKey: 'childMode', icon: SparklesIcon },
  { id: 'student', nameKey: 'studentMode', icon: AcademicCapIcon },
];


export const ChatFooter: React.FC<ChatFooterProps> = ({
  activeSession,
  handleChangeMode,
  isLoading,
  apiKeyExists,
  translate,
  language,
  theme,
  fileError,
  selectedFile,
  selectedFilePreview,
  handleRemoveSelectedFile,
  fileInputRef,
  handleFileChange,
  textareaRef,
  userInput,
  setUserInput,
  handleSendMessage,
  supportedFileTypes,
}) => {
  return (
    <footer className={`p-2 sm:p-3 md:p-4 border-t ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700/50' : 'bg-gray-50 border-gray-200/80'} backdrop-blur-sm sticky bottom-0 z-20`}>
      {activeSession && (
        <div className="max-w-3xl mx-auto mb-2 sm:mb-3">
          <div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2" role="radiogroup" aria-label="Chat Modes">
            {CHAT_MODES_CONFIG.map(modeInfo => (
              <button key={modeInfo.id} onClick={() => handleChangeMode(modeInfo.id)}
                className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm flex items-center space-x-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1
                  ${activeSession.mode === modeInfo.id 
                    ? 'bg-purple-600 text-white font-semibold shadow-md'
                    : `${theme === 'dark' 
                        ? 'bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-gray-900'}`}
                  ${theme === 'dark' ? 'focus:ring-offset-slate-800/40' : 'focus:ring-offset-gray-50'}`}
                role="radio" aria-checked={activeSession.mode === modeInfo.id} aria-label={translate(modeInfo.nameKey)}
                disabled={isLoading || !apiKeyExists}>
                <modeInfo.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-['Noto_Sans']">{translate(modeInfo.nameKey)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeSession?.mode === 'medical' && (
        <div className={`max-w-3xl mx-auto mb-2 p-2 rounded-md text-xs text-center ${language === 'am' ? 'font-amharic' : ''} ${theme === 'dark' ? 'bg-yellow-600/20 border-yellow-500/40 text-yellow-200' : 'bg-yellow-100 border-yellow-300 text-yellow-700'}`}>
          <strong className="font-bold">{translate('error')}:</strong> {translate('medicalModeDisclaimer')}
        </div>
      )}
      {fileError && (
        <div className={`max-w-3xl mx-auto mb-2 p-2 rounded-md text-xs text-center ${language === 'am' ? 'font-amharic' : ''} ${theme === 'dark' ? 'bg-red-500/30 border-red-600/50 text-red-300' : 'bg-red-100 border-red-300 text-red-700'}`}>
          {fileError}
        </div>
      )}
      {selectedFilePreview && (
        <div className={`max-w-3xl mx-auto mb-1.5 sm:mb-2 p-2 rounded-md flex items-center justify-between ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100 border border-gray-300'}`}>
          <div className="flex items-center space-x-2 overflow-hidden">
            {selectedFile?.type.startsWith('image/') && selectedFilePreview.startsWith('data:image') ? (
              <img src={selectedFilePreview} alt="Preview" className="h-10 w-10 rounded object-cover" />
            ) : (
              <div className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-600' : 'bg-gray-200'}`}><FileDisplayIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-500'}`} /></div>
            )}
            <span className={`text-xs truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{selectedFile?.name}</span>
          </div>
          <button onClick={handleRemoveSelectedFile} className={`p-1 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`} aria-label="Remove selected file">
            <XCircleIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="max-w-3xl mx-auto flex items-end space-x-2 sm:space-x-3">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={supportedFileTypes.join(',')} aria-label={translate('attachFile')}/>
        <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || !apiKeyExists || !activeSession?.id}
          className={`p-2.5 sm:p-3 rounded-lg text-white transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500
          ${theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700' : 'bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300'} disabled:cursor-not-allowed`}
          aria-label={translate('attachFile')}>
          <PaperclipIcon />
        </button>
        <textarea ref={textareaRef} rows={1}
          className={`flex-grow p-2.5 sm:p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 resize-none transition-all duration-150 ease-in-out outline-none max-h-32 overflow-y-auto ${language === 'am' ? 'font-amharic' : ''}
          ${theme === 'dark' ? 'bg-slate-700/80 border-slate-600 placeholder-gray-400 text-gray-100 focus:border-purple-500' : 'bg-white border-gray-300 placeholder-gray-500 text-gray-800 focus:border-purple-500'}`}
          placeholder={apiKeyExists && activeSession?.id ? translate('chatInputPlaceholder') : (apiKeyExists ? translate('chatInputSelectSessionPlaceholder') : translate('chatInputApiKeyNeededPlaceholder'))}
          value={userInput} onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
          disabled={isLoading || !apiKeyExists || !activeSession?.id || (activeSession && !activeSession.messagesLoaded)} 
          aria-label="Chat input"/>
        <button onClick={handleSendMessage} disabled={isLoading || (!userInput.trim() && !selectedFile) || !apiKeyExists || !activeSession?.id || (activeSession && !activeSession.messagesLoaded)}
        className={`p-2.5 sm:p-3 rounded-lg text-white transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500
          ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 focus:ring-offset-2 focus:ring-offset-slate-800' : 'bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 focus:ring-offset-2 focus:ring-offset-gray-50'}
           disabled:cursor-not-allowed`} aria-label={translate('sendMessage')}>
          {(isLoading && activeSession?.id && (userInput.trim() || selectedFile)) ? <LoadingSpinner /> : <SendIcon />}
        </button>
      </div>
    </footer>
  );
};
