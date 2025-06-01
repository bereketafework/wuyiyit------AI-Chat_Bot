
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
*   **Multiple Chat Sessions:** Manage and switch between several independent conversations. Session history cannot be cleared by the user, but entire sessions can be deleted.
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
    created_by_user_id UUID -- Foreign key to public.users table
);

-- Add foreign key constraint for created_by_user_id
ALTER TABLE public.chat_sessions
ADD CONSTRAINT fk_created_by_user
FOREIGN KEY (created_by_user_id)
REFERENCES public.users(id)
ON DELETE CASCADE; -- If a user is deleted, their chat sessions are also deleted.

COMMENT ON COLUMN public.chat_sessions.created_by_user_id IS 'Foreign key referencing the user (from public.users table) who created this chat session.';

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
-- 4. Add Indexes for Performance
-- -----------------------------------------------------------------------------
-- Index on users table for email lookup (Supabase usually adds for UNIQUE constraints, but explicit is fine)
-- DROP INDEX IF EXISTS idx_users_email; -- Uncomment if you need to recreate
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Index on chat_sessions for filtering by user and ordering by creation date
-- DROP INDEX IF EXISTS idx_chat_sessions_created_by_user_id_created_at; -- Uncomment if you need to recreate
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_by_user_id_created_at ON public.chat_sessions(created_by_user_id, created_at DESC);

-- Index on messages for fetching messages for a session, ordered by timestamp
-- DROP INDEX IF EXISTS idx_messages_session_id_timestamp; -- Uncomment if you need to recreate
CREATE INDEX IF NOT EXISTS idx_messages_session_id_timestamp ON public.messages(session_id, timestamp ASC);


-- -----------------------------------------------------------------------------
-- 5. Enable Row Level Security (RLS) for all tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 6. RLS Policies (Permissive for 'anon' role due to custom auth bypass)
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
*   **Chat Sessions:** You can create new chat sessions, switch between them, and delete them. The history of messages within a session cannot be individually cleared by the user, but deleting the entire session removes all its messages.

## Packaging for App Stores

(Remains the same)

---

Wuyiyit (ውይይት) AI aims to be a helpful and versatile tool. Enjoy your conversations!