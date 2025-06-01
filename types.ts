
export type ChatMode = 'general' | 'medical' | 'child' | 'student';
export type Theme = 'light' | 'dark';
export type LanguageCode = 'en' | 'am';

export interface FileInfo {
  name: string;
  type: string; // MIME type
  base64Data?: string; // Base64 encoded file content (used for Gemini and now stored in DB)
  dataUrl?: string; // For local image preview (e.g., from FileReader)
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isError?: boolean; // Optional flag for AI error messages
  fileInfo?: FileInfo; // Optional information about an attached file
}

export interface ChatSession {
  id:string;
  name: string;
  messages: Message[];
  createdAt: Date;
  mode: ChatMode;
  historyCleared?: boolean; // Flag to indicate if history was cleared
  created_by_user_id: string; // ID of the user who created the session
  history_cleared_by_user_id?: string | null; // ID of the user who cleared history
}

// New interface for custom user management (replaces Supabase User for custom auth)
export interface LocalUser {
  id: string; // UUID from your users table
  email: string;
  name?: string | null; // Optional name field
  created_at: string; // ISO date string
}

// Interface for the PWA beforeinstallprompt event
export interface CustomBeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}
