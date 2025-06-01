
import React from 'react';
import { XCircleIcon } from './icons/XCircleIcon';
import { LanguageCode, Theme } from '../types';
import { TranslationKey } from '../localization';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sessionName?: string;
  theme: Theme;
  language: LanguageCode;
  translate: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ 
  isOpen, onClose, onConfirm, sessionName, theme, language, translate 
}) => {
  if (!isOpen) return null;

  const amharicFontClass = language === 'am' ? 'font-amharic' : '';

  return (
    <div 
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn ${theme === 'dark' ? 'dark' : ''}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div 
        className={`bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl max-w-md w-full text-gray-800 dark:text-gray-200 ${amharicFontClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="confirm-delete-title" className={`text-xl font-semibold text-red-600 dark:text-red-500 ${amharicFontClass}`}>
            {translate('confirmDeleteTitle')}
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
        <p className={`mb-6 ${amharicFontClass}`}>
          {translate('confirmDeleteMessage', { sessionName: sessionName || (language === 'am' ? 'ይህን ውይይት' : 'this chat session') })}
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
            className={`px-4 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors ${amharicFontClass}`}
          >
            {translate('yesDelete')}
          </button>
        </div>
      </div>
    </div>
  );
};