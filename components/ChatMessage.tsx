
import React from 'react';
import { Message, Theme, LanguageCode } from '../types';
import { UserIcon } from './icons/UserIcon';
import { BIcon } from './icons/BIcon';
import { FileIcon } from './icons/FileIcon'; 

interface ChatMessageProps {
  message: Message;
  theme: Theme;
  language: LanguageCode; // Added language prop
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, theme, language }) => {
  const isUser = message.sender === 'user';

  const messageContainerClasses = isUser
    ? 'flex justify-end'
    : 'flex justify-start';

  const userMessageBubbleClasses = 'bg-purple-600 text-white dark:bg-purple-700 dark:text-gray-100 rounded-lg rounded-br-none shadow-md';
  const aiMessageBubbleClasses = message.isError 
    ? 'bg-red-600 text-white dark:bg-red-700 dark:text-gray-100 rounded-lg rounded-bl-none shadow-md' 
    : `bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-gray-100 rounded-lg rounded-bl-none shadow-md`;
  
  const messageBubbleClasses = isUser ? userMessageBubbleClasses : aiMessageBubbleClasses;

  const icon = isUser ? (
    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-500 dark:bg-purple-600 text-white flex-shrink-0 shadow-md">
      <UserIcon />
    </div>
  ) : (
    <BIcon isError={message.isError} theme={theme}/>
  );

  // User messages are displayed as is, respecting line breaks.
  // If UI language is Amharic, apply Amharic font. Otherwise, default.
  const formattedUserText = message.text.split(/\r\n|\r|\n|\\n/).map((line, index, arr) => (
    <React.Fragment key={`line-${index}`}>
      <span className={isUser && language === 'am' ? 'font-amharic' : ''}>{line}</span>
      {index < arr.length - 1 && <br />}
    </React.Fragment>
  ));

  // AI messages are always Amharic, so font-amharic is applied.
  const renderAiMessageContent = (text: string) => {
    const lines = text.split(/\r\n|\r|\n|\\n/);
    const contentElements: JSX.Element[] = [];

    lines.forEach((line, index) => {
      const key = `ai-line-${index}`;
      const titleBaseClasses = "font-bold font-amharic"; // AI always uses Amharic font for titles
      const paragraphClasses = `font-normal font-amharic my-0.5 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-500'}`; 
      
      if (line.startsWith('# ')) {
        contentElements.push(<h3 key={key} className={`${titleBaseClasses} text-lg md:text-xl mt-3 mb-1.5 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>{line.substring(2)}</h3>);
      } else if (line.startsWith('## ')) {
        contentElements.push(<h4 key={key} className={`${titleBaseClasses} text-base md:text-lg mt-2.5 mb-1 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>{line.substring(3)}</h4>);
      } else if (line.startsWith('### ')) {
        contentElements.push(<h5 key={key} className={`${titleBaseClasses} text-sm md:text-base mt-2 mb-0.5 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-500'}`}>{line.substring(4)}</h5>);
      } else if (line.trim() !== '') { 
        contentElements.push(<p key={key} className={paragraphClasses}>{line}</p>);
      }
    });
    return contentElements;
  };

  const fileDisplay = message.fileInfo ? (
    <div className={`mt-2 p-2 rounded-md ${isUser ? 'bg-purple-500/80 dark:bg-purple-600/80' : (theme === 'dark' ? 'bg-slate-600/80' : 'bg-gray-100') }`}>
      {message.fileInfo.type.startsWith('image/') && (
        <img 
          src={message.fileInfo.dataUrl || (message.fileInfo.base64Data ? `data:${message.fileInfo.type};base64,${message.fileInfo.base64Data}` : '')} 
          alt={message.fileInfo.name} 
          className="max-w-xs max-h-64 rounded-md object-contain" 
          onError={(e) => (e.currentTarget.style.display = 'none')} 
        />
      )}
      {(message.fileInfo.type === 'application/pdf' || (!message.fileInfo.type.startsWith('image/'))) && (
        <div className="flex items-center space-x-2 text-sm">
          <FileIcon className={`w-6 h-6 ${isUser ? 'text-purple-200 dark:text-purple-300' : (theme === 'dark' ? 'text-slate-300' : 'text-gray-600')}`} />
          <span className={`${isUser ? 'text-purple-100 dark:text-gray-200' : (theme === 'dark' ? 'text-gray-200' : 'text-gray-700')} ${language === 'am' ? 'font-amharic' : ''}`}>
            {message.fileInfo.name} ({message.fileInfo.type === 'application/pdf' ? 'PDF' : 'File'})
          </span>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className={`${messageContainerClasses} group animate-fadeIn`}>
      <div className={`flex items-start space-x-2.5 max-w-xl md:max-w-2xl lg:max-w-3xl ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className={`mt-1 ${isUser ? 'ml-2.5' : 'mr-2.5'}`}>
         {icon}
        </div>
        <div className={`p-3 md:p-4 ${messageBubbleClasses}`}>
          {fileDisplay}
          {message.text && (
            <div className={`text-sm md:text-base leading-relaxed ${fileDisplay && message.text ? 'mt-2' : ''} ${isUser && language === 'en' ? '' : "font-amharic"}`}>
              {isUser ? formattedUserText : renderAiMessageContent(message.text)}
            </div>
          )}
          <p className={`text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-right ${isUser ? 'text-purple-200 dark:text-purple-300' : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const animationName = 'fadeIn';
    const styleSheet = document.styleSheets[0];
    let ruleExists = false;
    if (styleSheet) {
        try {
            for (let i = 0; i < styleSheet.cssRules.length; i++) {
                const rule = styleSheet.cssRules[i] as CSSKeyframesRule;
                if (rule.type === CSSRule.KEYFRAMES_RULE && rule.name === animationName) {
                    ruleExists = true;
                    break;
                }
            }
        } catch (e) {
            // console.warn("Could not check/insert CSS animation rules:", e);
        }
    }
}