
# Wuyiyit (ውይይት) AI

Wuyiyit (ውይይት) AI is an intelligent chatbot application powered by Google's Gemini API. It's designed to provide responses exclusively in Amharic, regardless of the input language. The application supports text-based conversations, file uploads (images and PDFs) for analysis, various chat modes to tailor the AI's responses, and is built as a Progressive Web App (PWA). Users can sign in using a custom email/password system (currently with PLAINTEXT password storage for demonstration - **NOT SECURE**). Users can only see their own created chat sessions.

## Features

*   **Custom User Authentication:** Sign in/sign up with email and password.
    *   **CRITICAL SECURITY WARNING:** The current custom authentication system stores passwords in **PLAINTEXT**. This is for demonstration purposes ONLY and is **EXTREMELY INSECURE**. Do not use with real user data. Revert to Supabase's built-in authentication or implement proper server-side password hashing for any real application.
*   **Per-User Chat Sessions:** Users can only view and interact with chat sessions they created.
*   **Intelligent Amharic Conversations:** The AI understands queries in various languages but responds **only in Amharic**.
*   **Multimodal Input:**
    *   Send text messages.
    *   Upload files for analysis:
        *   Images: JPG, PNG, WEBP, HEIC, HEIF
        *   Documents: PDF (Max file size: 4MB for inline data)
*   **Contextual File Analysis:** The AI analyzes the content of uploaded images and PDFs, integrating findings into its Amharic responses.
*   **Chat Modes:** Tailor the AI's persona and response style.
*   **UI Language Toggle:** Switch the application's interface language between Amharic and English.
*   **Multiple Chat Sessions:** Manage and switch between several independent conversations.
*   **Responsive Design & PWA Features.**
*   **Markdown Rendering, Loading & Error States, User-Friendly Interface, In-App Help Guide.**

## Tech Stack

*   React 19 (esm.sh)
*   TypeScript
*   Tailwind CSS (CDN)
*   Google Gemini API (`@google/genai`)
*   Supabase (database for users, chat sessions, messages)
*   Service Worker

## Installation Guide

(Prerequisites and Setup remain largely the same as before - ensure API_KEY, Supabase setup, icons, and HTTPS serving)

## Supabase Database and RLS Setup

Execute the following SQL in your Supabase project's SQL Editor.

**CRITICAL SECURITY WARNING (users table):**
The `users` table stores passwords in **PLAINTEXT**. This is **EXTREMELY INSECURE** and for demonstration ONLY. **DO NOT USE THIS WITH REAL USER DATA.**

```sql
-- -----------------------------------------------------------------------------
-- 1. Create users Table (for custom email/password auth)
-- DROP TABLE IF EXISTS public.users; -- Uncomment if you need to recreate
-- -----------------------------------------------------------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- CRITICAL WARNING: Storing plaintext passwords. Highly insecure. For demonstration purposes ONLY.
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON COLUMN public.users.password IS 'CRITICAL SECURITY WARNING: Passwords stored in PLAINTEXT. This is for demonstration purposes ONLY and is highly insecure. In a real system, passwords MUST be securely hashed.';

-- -----------------------------------------------------------------------------
-- 2. Create chat_sessions Table
-- DROP TABLE IF EXISTS public.chat_sessions; -- Uncomment if you need to recreate
-- -----------------------------------------------------------------------------
CREATE TABLE public.chat_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    mode TEXT,
    history_cleared BOOLEAN DEFAULT false,
    created_by_user_id UUID, -- Foreign key to public.users table
    history_cleared_by_user_id UUID -- Foreign key to public.users table
);

-- Add foreign key constraint for created_by_user_id
ALTER TABLE public.chat_sessions
ADD CONSTRAINT fk_created_by_user
FOREIGN KEY (created_by_user_id)
REFERENCES public.users(id)
ON DELETE CASCADE; -- If a user is deleted, their chat sessions are also deleted.

COMMENT ON COLUMN public.chat_sessions.created_by_user_id IS 'Foreign key referencing the user (from public.users table) who created this chat session.';

-- Add foreign key constraint for history_cleared_by_user_id
ALTER TABLE public.chat_sessions
ADD CONSTRAINT fk_history_cleared_by_user
FOREIGN KEY (history_cleared_by_user_id)
REFERENCES public.users(id)
ON DELETE SET NULL; -- If user who cleared history is deleted, set this field to NULL.

COMMENT ON COLUMN public.chat_sessions.history_cleared_by_user_id IS 'Foreign key referencing the user (from public.users table) who last cleared the history of this session.';


-- -----------------------------------------------------------------------------
-- 3. Create messages Table
-- DROP TABLE IF EXISTS public.messages; -- Uncomment if you need to recreate
-- -----------------------------------------------------------------------------
CREATE TABLE public.messages (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    text TEXT,
    sender TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    is_error BOOLEAN DEFAULT false,
    file_info_name TEXT,
    file_info_type TEXT,
    file_info_base64data TEXT,
    file_info_dataurl TEXT,
    CONSTRAINT fk_session
        FOREIGN KEY(session_id)
        REFERENCES public.chat_sessions(id)
        ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS) for all tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5. RLS Policies (Permissive for 'anon' role due to custom auth bypass)
-- Data isolation for chat_sessions and messages is primarily handled by dbService.ts
-- These RLS policies allow the 'anon' key (used by the app) to interact with the tables.
-- -----------------------------------------------------------------------------

-- For users table
DROP POLICY IF EXISTS "Allow anon read access to users" ON public.users;
CREATE POLICY "Allow anon read access to users" ON public.users FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon insert access to users" ON public.users;
CREATE POLICY "Allow anon insert access to users" ON public.users FOR INSERT TO anon WITH CHECK (true);

-- For chat_sessions table
DROP POLICY IF EXISTS "Allow anon full access to chat_sessions" ON public.chat_sessions;
CREATE POLICY "Allow anon full access to chat_sessions"
ON public.chat_sessions
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- For messages table
DROP POLICY IF EXISTS "Allow anon full access to messages" ON public.messages;
CREATE POLICY "Allow anon full access to messages"
ON public.messages
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Note on Per-User Data:
-- With the custom authentication system (bypassing Supabase Auth), the 'dbService.ts'
-- file is responsible for filtering 'chat_sessions' and 'messages' based on 'created_by_user_id'.
-- The RLS policies above for 'chat_sessions' and 'messages' are permissive for the 'anon' role
-- to allow the application (using the anon key) to perform operations, which are then
-- further restricted by the application logic in 'dbService.ts'.
-- If Supabase's built-in authentication were used, RLS could directly leverage 'auth.uid()'.
```

## Usage Guide

(Remains mostly the same, with the addition of the language toggle)
*   **Language Toggle:** Look for a language toggle button (e.g., "EN" / "አማ") in the header to switch the UI language.

## Packaging for App Stores

(Remains the same)

---

Wuyiyit (ውይይት) AI aims to be a helpful and versatile tool. Enjoy your conversations!
```

</content>
  </change>
  <change>
    <file>components/ChatMessage.tsx</file>
    <description>Pass language prop to ChatMessage for potential future use, though AI responses are Amharic-only.</description>
    <content><![CDATA[
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
    : `bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-gray-100 rounded-lg rounded-bl-none shadow-md`;
  
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
      const paragraphClasses = `font-normal font-amharic my-0.5 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`; // AI always uses Amharic font for paragraphs
      
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