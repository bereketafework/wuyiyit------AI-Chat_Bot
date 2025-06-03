
import React from 'react';
import { XCircleIcon } from './icons/XCircleIcon';
import { LanguageCode, Theme } from '../types';
import { TranslationKey } from '../localization';

interface ConfirmClearHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  theme: Theme;
  language: LanguageCode;
  translate: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
}

export const ConfirmClearHistoryModal: React.FC<ConfirmClearHistoryModalProps> = ({ 
  isOpen, onClose, onConfirm, theme, language, translate 
}) => {
  if (!isOpen) return null;

  const amharicFontClass = language === 'am' ? 'font-amharic' : '';

  return (
    <div 
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn ${theme === 'dark' ? 'dark' : ''}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-clear-title"
    >
      <div 
        className={`bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl max-w-md w-full text-gray-800 dark:text-gray-200 ${amharicFontClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="confirm-clear-title" className={`text-xl font-semibold text-orange-600 dark:text-orange-500 ${amharicFontClass}`}>
            {translate('confirmDeleteTitle')} {/* Was: clearHistoryTitle */}
          </h2>
          <button onClick={onClose} className="text-white dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
        <p className={`mb-6 ${amharicFontClass}`}>
          {/* Using a generic message with a valid key as the original 'clearHistoryMessage' key is removed. */}
          {translate('confirmDeleteMessage', { sessionName: language === 'am' ? 'የዚህ ውይይት ታሪክ' : 'this chat history' })} {/* Was: clearHistoryMessage */}
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-md text-sm font-medium bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors ${amharicFontClass}`}
          >
            {translate('cancel')}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 rounded-md text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors ${amharicFontClass}`}
          >
            {translate('yesDelete')} {/* Was: yesClear */}
          </button>
        </div>
      </div>
    </div>
  );
};
