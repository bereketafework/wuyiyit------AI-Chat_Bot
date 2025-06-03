
import React from 'react';
import { XCircleIcon } from './icons/XCircleIcon'; 
import { LanguageCode, Theme } from '../types';
import { TranslationKey } from '../localization';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  language: LanguageCode;
  translate: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, theme, language, translate }) => {
  if (!isOpen) return null;

  const textDirectionClass = language === 'am' ? 'text-right dir-rtl' : 'text-left dir-ltr';
  const amharicFontClass = language === 'am' ? 'font-amharic' : '';

  return (
    <div 
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn ${theme === 'dark' ? 'dark' : ''}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div 
        className={`p-6 md:p-8 rounded-lg shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto 
          ${amharicFontClass} ${textDirectionClass}
          ${theme === 'dark' ? 'bg-slate-800 text-gray-200' : 'bg-white text-gray-700'}`}
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="help-modal-title" className={`text-2xl font-bold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
            {translate('helpModalTitle')}
          </h2>
          <button 
            onClick={onClose} 
            className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-white hover:text-gray-800'} transition-colors`}
            aria-label="Close help modal"
          >
            <XCircleIcon className="w-7 h-7" />
          </button>
        </div>

        <div className="space-y-4 text-sm md:text-base">
          <h3 className={`text-lg font-semibold mt-2 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-500'}`}>
            {translate('helpModalHowToUse')}
          </h3>
          
          <div className={`space-y-2 ${language === 'am' ? 'pr-4 pl-0' : 'pl-4'}`}>
            <p><strong>{translate('helpModalNewChat').split(':')[0]}:</strong> {translate('helpModalNewChat').split(':')[1]}</p>
            <p><strong>{translate('helpModalSendMessage').split(':')[0]}:</strong> {translate('helpModalSendMessage').split(':')[1]}</p>
            <p><strong>{translate('helpModalAttachFile').split(':')[0]}:</strong> {translate('helpModalAttachFile').split(':')[1]}</p>
            
            <div>
              <p><strong>{translate('helpModalChatModes').split(':')[0]}:</strong> {translate('helpModalChatModes').split(':')[1]}</p>
              <ul className={`list-disc ${language === 'am' ? 'list-outside' : 'list-inside'} ${language === 'am' ? 'mr-4 ml-0' : 'ml-4'} mt-1 space-y-1`}>
                <li><strong>{translate('generalMode')}:</strong> {translate('helpModalModeGeneral').split(': ')[1]}</li>
                <li><strong>{translate('medicalMode')}:</strong> {translate('helpModalModeMedical').split(': ')[1]}</li>
                <li><strong>{translate('childMode')}:</strong> {translate('helpModalModeChild').split(': ')[1]}</li>
                <li><strong>{translate('studentMode')}:</strong> {translate('helpModalModeStudent').split(': ')[1]}</li>
              </ul>
            </div>
            <p><strong>{translate('helpModalSwitchChats').split(':')[0]}:</strong> {translate('helpModalSwitchChats').split(':')[1]}</p>
            <p><strong>{translate('helpModalDeleteChat').split(':')[0]}:</strong> {translate('helpModalDeleteChat').split(':')[1]}</p>
            {/* helpModalClearHistory item removed */}
          </div>

          <h3 className={`text-lg font-semibold mt-3 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-500'}`}>
            {translate('helpModalAiResponses')}
          </h3>
          <p className={`${language === 'am' ? 'pr-4 pl-0' : 'pl-4'}`}>
            {translate('helpModalAiAmharicOnly')}
          </p>
          
          <div className={`border-t mt-6 pt-4 text-center text-xs ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-white'}`}>{translate('helpModalDevInfo')}</p>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-white'}`}>{translate('helpModalContact')}</p>
          </div>

          <p className={`text-center font-semibold pt-3 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
            {translate('helpModalEnjoy')}
          </p>
        </div>
      </div>
    </div>
  );
};
