
import React, { useState } from 'react';
import { LanguageCode, Theme } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { TranslationKey } from '../localization';

interface EmailPasswordAuthFormProps {
  mode: 'login' | 'signup';
  onSubmit: (nameOrEmail: string, emailOrPassword?: string, password?: string) => Promise<void>;
  onSwitchMode: () => void;
  onBackToInitial: () => void; // To go back to initial auth choice screen
  loading: boolean;
  authError: string | null;
  theme: Theme;
  language: LanguageCode;
  translate: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
}

export const EmailPasswordAuthForm: React.FC<EmailPasswordAuthFormProps> = ({
  mode,
  onSubmit,
  onSwitchMode,
  onBackToInitial,
  loading,
  authError,
  theme,
  language,
  translate,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (mode === 'signup') {
      if (!name.trim()) {
        setFormError(translate('nameRequiredError'));
        return;
      }
      if (password !== confirmPassword) {
        setFormError(translate('passwordMismatchError'));
        return;
      }
      if (password.length < 6) {
        setFormError(translate('passwordLengthError'));
        return;
      }
      await onSubmit(name, email, password);
    } else {
      await onSubmit(email, password);
    }
  };

  const inputBaseClasses = `w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 transition-colors duration-150 ease-in-out text-sm`;
  const inputDarkClasses = `bg-slate-700 border-slate-600 placeholder-gray-400 text-gray-100 focus:ring-purple-500 focus:border-purple-500`;
  const inputLightClasses = `bg-gray-50 border-gray-300 placeholder-gray-500 text-gray-800 focus:ring-purple-500 focus:border-purple-500`;
  const inputClasses = `${inputBaseClasses} ${theme === 'dark' ? inputDarkClasses : inputLightClasses}`;

  const buttonBaseClasses = `w-full px-4 py-3 rounded-lg font-medium transition-colors duration-150 ease-in-out flex items-center justify-center`;
  const primaryButtonClasses = `${buttonBaseClasses} ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'}`;
  const secondaryButtonClasses = `${buttonBaseClasses} ${theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-6 text-left">
      {mode === 'signup' && (
        <div>
          <label htmlFor="name" className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} ${language === 'am' ? 'font-amharic' : ''}`}>
            {translate('nameLabel')}
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${inputClasses} ${language === 'am' ? 'font-amharic' : ''}`}
            placeholder={translate('namePlaceholder')}
            required
          />
        </div>
      )}
      <div>
        <label htmlFor="email" className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} ${language === 'am' ? 'font-amharic' : ''}`}>
          {translate('emailLabel')}
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClasses} // Email typically not Amharic font
          placeholder={translate('emailPlaceholder')}
          required
        />
      </div>
      <div>
        <label htmlFor="password" className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} ${language === 'am' ? 'font-amharic' : ''}`}>
          {translate('passwordLabel')}
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClasses}
          placeholder={translate('passwordPlaceholder')}
          required
        />
      </div>
      {mode === 'signup' && (
        <div>
          <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} ${language === 'am' ? 'font-amharic' : ''}`}>
            {translate('confirmPasswordLabel')}
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClasses}
            placeholder={translate('passwordPlaceholder')}
            required
          />
        </div>
      )}
      
      {(formError || authError) && (
        <p className={`text-red-500 text-xs text-center ${language === 'am' ? 'font-amharic' : ''}`}>{formError || authError}</p>
      )}

      <button type="submit" disabled={loading}
        className={`${primaryButtonClasses} disabled:opacity-70 disabled:cursor-not-allowed ${language === 'am' ? 'font-amharic' : ''}`}>
        {loading ? <LoadingSpinner /> : (mode === 'login' ? translate('signInButton') : translate('signUpButton'))}
      </button>
      <button type="button" onClick={onSwitchMode} disabled={loading}
        className={`${secondaryButtonClasses} text-sm ${language === 'am' ? 'font-amharic' : ''}`}>
        {mode === 'login' ? translate('switchToSignUp') : translate('switchToSignIn')}
      </button>
      <button type="button" onClick={onBackToInitial} disabled={loading}
        className={`${secondaryButtonClasses} text-xs mt-2 ${language === 'am' ? 'font-amharic' : ''}`}>
        {translate('backToMainLogin')}
      </button>
    </form>
  );
};