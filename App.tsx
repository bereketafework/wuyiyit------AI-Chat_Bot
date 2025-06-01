
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LocalUser, Message, ChatSession, FileInfo as AppFileInfo, ChatMode, Theme, LanguageCode, CustomBeforeInstallPromptEvent } from './types';
import { ChatMessage } from './components/ChatMessage';
import { sendMessageToAI, prepareHistoryForGemini, deleteChatSessionHistory } from './services/geminiService';
import * as dbService from './services/dbService';
import { SendIcon } from './components/icons/SendIcon';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ChatSessionList } from './components/ChatSessionList';
import { MenuIcon } from './components/icons/MenuIcon';
import { PaperclipIcon } from './components/icons/PaperclipIcon';
import { XCircleIcon } from './components/icons/XCircleIcon';
import { fileToBase64, fileToDataURL, isValidFileType, isValidFileSize, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from './components/fileUtils';
import { FileIcon } from './components/icons/FileIcon';
import { BriefcaseIcon } from './components/icons/BriefcaseIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { AcademicCapIcon } from './components/icons/AcademicCapIcon';
import { ChatBubbleLeftRightIcon } from './components/icons/ChatBubbleLeftRightIcon';
import { HelpModal } from './components/HelpModal';
// import { BroomIcon } from './components/icons/BroomIcon'; // Removed
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
// ConfirmClearHistoryModal import removed
import { SunIcon } from './components/icons/SunIcon';
import { MoonIcon } from './components/icons/MoonIcon';
import { EmailPasswordAuthForm } from './components/EmailPasswordAuthForm';
import { t, TranslationKey } from './localization'; // Import translation utilities
import { InstallIcon } from './components/icons/InstallIcon'; // Ensured correct relative path


const CHAT_MODES: { id: ChatMode; nameKey: TranslationKey; icon: React.FC<{className?: string}> }[] = [
  { id: 'general', nameKey: 'generalMode', icon: ChatBubbleLeftRightIcon },
  { id: 'medical', nameKey: 'medicalMode', icon: BriefcaseIcon },
  { id: 'child', nameKey: 'childMode', icon: SparklesIcon },
  { id: 'student', nameKey: 'studentMode', icon: AcademicCapIcon },
];

type AuthView = 'initial_choice' | 'login' | 'signup';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(() => {
    const savedUser = localStorage.getItem('wuyiyit-currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [authView, setAuthView] = useState<AuthView>('initial_choice');
  const [customAuthLoading, setCustomAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true); // General loading for data, AI response
  const [error, setError] = useState<string | null>(null);
  const [apiKeyExists, setApiKeyExists] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
        const storedTheme = localStorage.getItem('wuyiyit-theme') as Theme | null;
        if (storedTheme) return storedTheme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  const [language, setLanguage] = useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
        const storedLang = localStorage.getItem('wuyiyit-language') as LanguageCode | null;
        return storedLang || 'am'; // Default to Amharic
    }
    return 'am';
  });

  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [sessionPendingDeletionId, setSessionPendingDeletionId] = useState<string | null>(null);
  // isClearHistoryModalOpen state removed
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<CustomBeforeInstallPromptEvent | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault(); // Prevent the mini-infobar from appearing on mobile
      setDeferredInstallPrompt(e as CustomBeforeInstallPromptEvent); // Save the event for later use
      console.log('beforeinstallprompt event fired and saved.');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);


  // Language and Theme Effects
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('wuyiyit-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('wuyiyit-language', language);
  }, [language]);

  const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  const toggleLanguage = () => setLanguage(prevLang => (prevLang === 'am' ? 'en' : 'am'));


  const translate = useCallback((key: TranslationKey, replacements?: Record<string, string | number>): string => {
    return t(language, key, replacements);
  }, [language]);

  // Centralized error handler for Supabase operations
  const handleSupabaseError = useCallback((e: any, contextKey: TranslationKey | string): string => {
    let errorMessage = 'Unknown error';
    let errorCode = 'N/A';
    let errorDetails = ''; 
    let errorHint = '';

    if (e) {
      if (typeof e === 'string') {
        errorMessage = e;
      } else {
        errorMessage = e.message || 'No specific error message provided.';
        errorCode = e.code || 'N/A';
        errorDetails = e.details || '';
        errorHint = e.hint || '';
        if (typeof errorMessage !== 'string' || errorMessage === '[object Object]') {
            try { errorMessage = JSON.stringify(e); } catch (stringifyError) { errorMessage = 'Could not stringify the error object.'; }
        }
      }
    }

    const contextStr = typeof contextKey === 'string' ? contextKey : translate(contextKey);
    
    console.error(`Supabase error during operation: '${contextStr}'`);
    if (typeof e === 'object' && e !== null) {
        if (e.message) console.error(`  Error Message: ${e.message}`);
        if (e.code) console.error(`  Error Code: ${e.code}`);
        if (e.details) console.error(`  Details: ${e.details}`);
        if (e.hint) console.error(`  Hint: ${e.hint}`);
        if (Object.keys(e).length > 0 && (Object.keys(e).length > 4 || !e.message || !e.code)) {
             console.error(`  Full Error Object:`, e);
        }
    } else {
        console.error(`  Raw Error Value: ${e}`);
    }
    
    if (errorCode === '57014') { // Statement timeout
        return translate('dbTimeoutError', { context: contextStr });
    }
    if (errorCode === '42501') { // RLS violation
        return translate('dbAccessDeniedError', { code: errorCode, table: (e && typeof e === 'object' && e.table) || 'target table' });
    }
    if (navigator && !navigator.onLine) {
        return translate('operationFailedError', { context: contextStr, message: 'Network connection lost. Please check your internet connection.' });
    }
    if (errorMessage.toLowerCase().includes('failed to fetch') || errorMessage.toLowerCase().includes('networkerror')) {
       return translate('operationFailedError', { context: contextStr, message: 'A network request failed. This could be due to a temporary connectivity issue or a problem with the server. Please try again later.' });
    }
    
    let displayMessage = errorMessage;
    if (displayMessage === 'No specific error message provided.' && errorCode !== 'N/A') {
        displayMessage = `An error occurred (Code: ${errorCode}).`;
    } else if (displayMessage.startsWith('{') && displayMessage.endsWith('}')) {
        try {
            JSON.parse(displayMessage); 
            displayMessage = `An unexpected error structure was received. (Code: ${errorCode !== 'N/A' ? errorCode : 'Unknown'})`;
        } catch (jsonError) { /* Not JSON */ }
    } else if (errorCode !== 'N/A' && !displayMessage.includes(errorCode)) {
         if (displayMessage !== 'Unknown error' && displayMessage !== 'No specific error message provided.') {
            displayMessage += ` (Code: ${errorCode})`;
         }
    }
    if (displayMessage === '[object Object]') {
        displayMessage = `An unexpected error occurred. (Code: ${errorCode !== 'N/A' ? errorCode : 'General'})`;
    }

    return translate('operationFailedError', { context: contextStr, message: displayMessage });
  }, [language, translate]);


  useEffect(() => {
    if (process.env.API_KEY) {
      setApiKeyExists(true);
    } else {
      setApiKeyExists(false);
      setError(translate('apiKeyMissing'));
      setIsLoading(false);
      setCustomAuthLoading(false);
    }
  }, [translate]); 

  useEffect(() => {
    if (currentUser) localStorage.setItem('wuyiyit-currentUser', JSON.stringify(currentUser));
    else localStorage.removeItem('wuyiyit-currentUser');
  }, [currentUser]);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser || !currentUser.id) {
        setChatSessions([]);
        setActiveSessionId(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true); setError(null);
      try {
        const sessionsFromDB = await dbService.getAllChatSessions(currentUser.id);
        if (sessionsFromDB.length > 0) {
          const sortedByDate = [...sessionsFromDB].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const initialActiveSessionId = sortedByDate[0]?.id || null;

          const sessionsWithInitialMessages: ChatSession[] = await Promise.all(
            sessionsFromDB.map(async (session) => {
              if (session.id === initialActiveSessionId) {
                return {
                  ...session,
                  messages: await dbService.getMessagesForSession(session.id, currentUser.id),
                  messagesLoaded: true,
                };
              }
              return {
                ...session,
                messages: [], 
                messagesLoaded: false, 
              };
            })
          );
          setChatSessions(sessionsWithInitialMessages);
          setActiveSessionId(initialActiveSessionId);
        } else {
          const defaultSessionId = `session-${Date.now()}`;
          const defaultSessionName = `ውይይት 1`;
          const defaultSession: ChatSession = {
            id: defaultSessionId, name: defaultSessionName, messages: [], createdAt: new Date(), mode: 'general',
            created_by_user_id: currentUser.id, messagesLoaded: true,
          };
          await dbService.addChatSession(defaultSession, currentUser.id);
          setChatSessions([defaultSession]);
          setActiveSessionId(defaultSessionId);
        }
      } catch (e: any) {
        setError(handleSupabaseError(e, "loadingChatData"));
      } finally {
        setIsLoading(false);
      }
    };

    if (apiKeyExists && currentUser) {
      loadData();
    } else if (!currentUser) {
        setIsLoading(false);
        setChatSessions([]);
        setActiveSessionId(null);
    }
  }, [apiKeyExists, currentUser, handleSupabaseError]);

  const activeSession = chatSessions.find(s => s.id === activeSessionId);
  const activeSessionMessages = activeSession?.messages || [];

  useEffect(() => {
    if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [activeSessionMessages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`; // max-h-32 (128px)
    }
  }, [userInput]);

  // Effect to scroll textarea into view on focus (helps with OSK)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleFocus = () => {
      setTimeout(() => {
        textarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300); // Delay to allow OSK to potentially appear
    };

    textarea.addEventListener('focus', handleFocus);
    return () => {
      textarea.removeEventListener('focus', handleFocus);
    };
  }, []); // Empty dependency array means this runs once when component mounts and textareaRef is set

  const handleCustomLogin = async (email: string, password: string) => {
    setCustomAuthLoading(true); setAuthError(null);
    try {
      const user = await dbService.getUserByEmail(email);
      if (user && user.password === password) { 
        setCurrentUser({ id: user.id, email: user.email, name: user.name, created_at: user.created_at });
        setAuthView('initial_choice');
      } else if (user && user.password !== password) {
        setAuthError(translate('incorrectPasswordError'));
      } else {
        setAuthError(translate('emailNotRegisteredError'));
        setAuthView('signup');
      }
    } catch (e: any) {
      setAuthError(handleSupabaseError(e, 'loginFailedError'));
    } finally {
      setCustomAuthLoading(false);
    }
  };

  const handleCustomSignUp = async (name: string, email: string, password: string) => {
    setCustomAuthLoading(true); setAuthError(null);
    try {
      const existingUser = await dbService.getUserByEmail(email);
      if (existingUser) {
        setAuthError(translate('emailRegisteredError'));
        setAuthView('login');
        return;
      }
      const newUser = await dbService.addUser(name, email, password); 
      setCurrentUser(newUser);
      setAuthView('initial_choice');
    } catch (e: any) {
      setAuthError(handleSupabaseError(e, 'signUpFailedError'));
    } finally {
      setCustomAuthLoading(false);
    }
  };

  const handleCustomLogout = () => {
    setCurrentUser(null);
    setChatSessions([]);
    setActiveSessionId(null);
    setAuthView('initial_choice');
  };

  const handleNewSession = useCallback(async () => {
    if (!currentUser || !currentUser.id) {
      setError(translate('pleaseLoginToChat'));
      setAuthView('login');
      return;
    }
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      name: `ውይይት ${chatSessions.length + 1}`, 
      messages: [],
      createdAt: new Date(),
      mode: 'general',
      created_by_user_id: currentUser.id,
      messagesLoaded: true, // New session, no messages to load
    };
    try {
      await dbService.addChatSession(newSession, currentUser.id);
      setChatSessions(prevSessions => [...prevSessions, newSession]);
      setActiveSessionId(newSessionId);
      setError(null); setSelectedFile(null); setSelectedFilePreview(null); setFileError(null);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } catch (e: any) {
      setError(handleSupabaseError(e, "creating new session"));
    }
  }, [chatSessions.length, currentUser, translate, handleSupabaseError]);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    if (!currentUser || !currentUser.id) return;

    setActiveSessionId(sessionId);
    setError(null); setSelectedFile(null); setSelectedFilePreview(null); setFileError(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);

    const sessionToLoad = chatSessions.find(s => s.id === sessionId);

    if (sessionToLoad && !sessionToLoad.messagesLoaded) {
        setIsLoading(true); 
        try {
            const messages = await dbService.getMessagesForSession(sessionId, currentUser.id);
            setChatSessions(prevSessions =>
                prevSessions.map(s =>
                    s.id === sessionId ? { ...s, messages, messagesLoaded: true } : s
                )
            );
        } catch (e: any) {
            setError(handleSupabaseError(e, translate("loadingMessages")));
        } finally {
            setIsLoading(false);
        }
    } else if (sessionToLoad && sessionToLoad.messagesLoaded && sessionToLoad.messages.length === 0) {
         // If messages are loaded but empty (e.g. new session), ensure UI reflects this.
        // This branch might not be strictly necessary if initial state is handled well.
    }
  }, [currentUser, chatSessions, handleSupabaseError, translate]);

  const handleChangeMode = async (newMode: ChatMode) => {
    if (!activeSessionId || !currentUser || !currentUser.id || (activeSession && activeSession.mode === newMode)) return;
    
    // Optimistically update UI
    const oldSessions = [...chatSessions];
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === activeSessionId ? { ...session, mode: newMode } : session
      )
    );

    try {
      await dbService.updateChatSessionMode(activeSessionId, newMode, currentUser.id);
      // Clear the Gemini SDK's in-memory chat history for this session to apply new system instructions
      deleteChatSessionHistory(activeSessionId); 
    } catch (e:any) {
       setError(handleSupabaseError(e, "changing mode"));
       // Revert UI on error
       setChatSessions(oldSessions);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileError(null);
      if (!isValidFileType(file)) {
        setFileError(translate('unsupportedFileType', { fileTypes: SUPPORTED_FILE_TYPES.join(', ').replace(/image\//g, '').replace(/application\//g, '') }));
        setSelectedFile(null); setSelectedFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (!isValidFileSize(file)) {
        setFileError(translate('fileTooLarge', { maxSize: MAX_FILE_SIZE_MB }));
        setSelectedFile(null); setSelectedFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        try {
          const dataUrl = await fileToDataURL(file);
          setSelectedFilePreview(dataUrl);
        } catch (e) {
          setFileError(translate('imagePreviewError')); setSelectedFilePreview(null);
        }
      } else {
        setSelectedFilePreview(file.name);
      }
    }
     if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null); setSelectedFilePreview(null); setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = useCallback(async () => {
    if (!activeSession || (!userInput.trim() && !selectedFile) || isLoading || !apiKeyExists || !currentUser || !currentUser.id) return;

    setIsLoading(true); setError(null); setFileError(null);

    let fileInfoForGemini: ReturnType<typeof prepareHistoryForGemini>[0]['parts'][0] | undefined = undefined;
    let fileInfoForMessage: AppFileInfo | undefined = undefined;

    if (selectedFile) {
      try {
        const base64Data = await fileToBase64(selectedFile);
        fileInfoForGemini = {
            inlineData: { mimeType: selectedFile.type, data: base64Data }
        };
        fileInfoForMessage = {
            name: selectedFile.name, type: selectedFile.type, base64Data: base64Data,
            dataUrl: selectedFile.type.startsWith('image/') ? selectedFilePreview || undefined : undefined,
        };
      } catch (e) {
        setError(translate('fileProcessingError')); setIsLoading(false); return;
      }
    }

    const userMessageText = userInput.trim();
    const newUserMessage: Message = {
      id: `msg-user-${Date.now()}`, text: userMessageText, sender: 'user', timestamp: new Date(),
      fileInfo: fileInfoForMessage,
    };

    let updatedSessionForUI = { ...activeSession, messages: [...activeSession.messages, newUserMessage] };
    if (!activeSession.messagesLoaded) updatedSessionForUI.messagesLoaded = true;
    
    setChatSessions(prevSessions =>
      prevSessions.map(session => session.id === activeSessionId ? updatedSessionForUI : session)
    );
    
    let updatedSessionNameFromDb: string | undefined;

    try {
      updatedSessionNameFromDb = await dbService.addMessage(activeSession.id, newUserMessage, currentUser.id);
      if (updatedSessionNameFromDb) {
        setChatSessions(prevSessions =>
          prevSessions.map(s => s.id === activeSessionId ? { ...s, name: updatedSessionNameFromDb as string } : s)
        );
      }
    } catch (e: any) {
       setError(handleSupabaseError(e, "saving user message"));
       setChatSessions(prevSessions =>
            prevSessions.map(session =>
                session.id === activeSessionId ?
                {...session, messages: session.messages.filter(m => m.id !== newUserMessage.id)}
                : session
            )
        );
       setIsLoading(false); return;
    }

    setUserInput(''); setSelectedFile(null); setSelectedFilePreview(null);

    try {
      const messagesForHistory = activeSession.messages; 
      const geminiHistory = prepareHistoryForGemini(messagesForHistory.slice(0, -1)); 
      
      const currentMessageParts: any[] = [];
      if (userMessageText) currentMessageParts.push({ text: userMessageText });
      if (fileInfoForGemini) currentMessageParts.push(fileInfoForGemini);
      
      const currentMessageContent = { role: 'user', parts: currentMessageParts };

      const aiResponseText = await sendMessageToAI(
        activeSession.id, currentMessageContent, activeSession.mode, geminiHistory 
      );
      const newAiMessage: Message = {
        id: `msg-ai-${Date.now() + 1}`, text: aiResponseText, sender: 'ai', timestamp: new Date(),
      };

      setChatSessions(prevSessions =>
        prevSessions.map(session => session.id === activeSessionId ? { ...session, messages: [...session.messages, newAiMessage] } : session)
      );
      await dbService.addMessage(activeSession.id, newAiMessage, currentUser.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      let displayError = translate('aiResponseError', { errorMessage });
      if (errorMessage.includes("User location is not supported")) displayError = translate('aiRegionError');
      else if (errorMessage.includes("billing account")) displayError = translate('aiBillingError');
      setError(displayError);
      const errorAiMessage: Message = {
        id: `msg-ai-${Date.now() + 1}`, text: `${translate('error')}: ${displayError}`, sender: 'ai', timestamp: new Date(), isError: true,
      };
      setChatSessions(prevSessions =>
        prevSessions.map(session => session.id === activeSessionId ? { ...session, messages: [...session.messages, errorAiMessage] } : session)
      );
      try { await dbService.addMessage(activeSession.id, errorAiMessage, currentUser.id); } 
      catch (eDb: any) { setError(handleSupabaseError(eDb, "saving AI error message")); }
    } finally {
      setIsLoading(false); textareaRef.current?.focus();
    }
  }, [userInput, selectedFile, selectedFilePreview, apiKeyExists, activeSession, isLoading, currentUser, translate, handleSupabaseError, activeSessionId]);

  const toggleHelpModal = () => setIsHelpModalOpen(!isHelpModalOpen);

  const handlePromptDeleteSession = (sessionId: string) => {
    setSessionPendingDeletionId(sessionId);
    setIsDeleteConfirmModalOpen(true);
  };

  const handleDeleteSession = async () => {
    if (!sessionPendingDeletionId || !currentUser || !currentUser.id) return;
    const sessionIdToDelete = sessionPendingDeletionId;
    setSessionPendingDeletionId(null);

    const sessionsBeforeDelete = [...chatSessions];
    const sessionIndexToDelete = sessionsBeforeDelete.findIndex(s => s.id === sessionIdToDelete);

    setChatSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));

    if (activeSessionId === sessionIdToDelete) {
        const remainingSessions = sessionsBeforeDelete.filter(s => s.id !== sessionIdToDelete);
        if (remainingSessions.length > 0) {
            const newActiveIndex = Math.max(0, sessionIndexToDelete -1); 
            const newActiveSessionId = remainingSessions[newActiveIndex]?.id || remainingSessions[0]?.id;
            
            const newActiveSessionIsLoaded = chatSessions.find(s => s.id === newActiveSessionId)?.messagesLoaded;
            setActiveSessionId(newActiveSessionId);
            if (!newActiveSessionIsLoaded) {
                 handleSelectSession(newActiveSessionId); 
             }

        } else {
            if (currentUser) await handleNewSession(); 
            else setActiveSessionId(null);
        }
    }
    setIsDeleteConfirmModalOpen(false);

    try {
        await dbService.deleteChatSession(sessionIdToDelete, currentUser.id);
        deleteChatSessionHistory(sessionIdToDelete); 
    } catch (e: any) {
        setError(handleSupabaseError(e, "deleting session"));
        setChatSessions(sessionsBeforeDelete); 
        if (activeSessionId === sessionIdToDelete && sessionsBeforeDelete[sessionIndexToDelete]) {
           setActiveSessionId(sessionsBeforeDelete[sessionIndexToDelete].id);
        }
    }
  };

  const handleInstallClick = async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt(); 
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        if (outcome === 'accepted') console.log('User accepted the A2HS prompt');
        else console.log('User dismissed the A2HS prompt');
        setDeferredInstallPrompt(null); 
      } else {
        console.log('Install prompt not available.');
        alert(translate('installManuallyHelp'));
      }
    };


  if (!currentUser) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen p-4 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
        <div className={`p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-md text-center ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
          <h1 className="text-3xl font-bold mb-2 font-amharic bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-red-500">
            {translate('appName')}
          </h1>
          
          {authView === 'initial_choice' && (
            <>
              <p className={`my-6 ${language === 'am' ? 'font-amharic' : ''} ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {translate('loginPrompt')}
              </p>
              <div className="space-y-4">
                <button onClick={() => { setAuthView('login'); setAuthError(null); }}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors duration-150 ease-in-out
                    ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'}`}>
                  {translate('signInWithEmail')}
                </button>
                <button onClick={() => { setAuthView('signup'); setAuthError(null); }}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors duration-150 ease-in-out
                    ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-800 hover:bg-gray-900 text-white'}`}>
                  {translate('signUpWithEmail')}
                </button>
              </div>
            </>
          )}

          {(authView === 'login' || authView === 'signup') && (
            <EmailPasswordAuthForm
              mode={authView}
              onSubmit={authView === 'login' ? handleCustomLogin : (name, email, password) => handleCustomSignUp(name!, email!, password!)}
              onSwitchMode={() => { setAuthView(authView === 'login' ? 'signup' : 'login'); setAuthError(null); }}
              onBackToInitial={() => { setAuthView('initial_choice'); setAuthError(null); }}
              loading={customAuthLoading}
              authError={authError}
              theme={theme}
              language={language}
              translate={translate}
            />
          )}
           <p className={`mt-8 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            {translate('copyright')} by Bereket Afework
            </p>
        </div>
         <button onClick={toggleLanguage} className={`mt-4 px-3 py-1.5 text-xs rounded-md ${theme === 'dark' ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            {language === 'am' ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}
        </button>
      </div>
    );
  }

  if (!apiKeyExists && isLoading) {
    return (
      <div className={`flex items-center justify-center h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'}`}>
        <LoadingSpinner />
        <p className={`ml-3 text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{translate('loading')}</p>
      </div>
    );
  }
  if (isLoading && chatSessions.length === 0 && apiKeyExists && !activeSession?.messagesLoaded) { 
     return (
      <div className={`flex items-center justify-center h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gray-100'}`}>
        <LoadingSpinner />
        <p className={`ml-3 text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} ${language === 'am' ? 'font-amharic' : ''}`}>{translate('loadingChatData')}</p>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
      <div className={`fixed inset-y-0 left-0 z-30 w-64 md:w-72 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-xl`}>
        <ChatSessionList
          currentUser={currentUser}
          onLogout={handleCustomLogout}
          sessions={chatSessions} activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession} onNewSession={handleNewSession}
          onPromptDelete={handlePromptDeleteSession}
          onToggleHelp={toggleHelpModal}
          theme={theme}
          language={language}
          translate={translate}
        />
      </div>

      <div className="flex flex-col flex-1 min-h-0"> 
        <header className={`shadow-md p-3 md:p-4 text-center flex items-center justify-between md:justify-center relative ${theme === 'dark' ? 'bg-slate-800/60 text-gray-100' : 'bg-white text-gray-800 border-b border-gray-200'} backdrop-blur-md sticky top-0 z-20`}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`md:hidden p-2 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black'}`}
            aria-label={translate('toggleChatSessions')}>
            <MenuIcon />
          </button>
          <div className="flex-1 flex flex-col items-center">
            <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 ${language === 'am' ? 'font-amharic' : ''}`}>
              {translate('appName')}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            {deferredInstallPrompt && currentUser && (
                <button
                    onClick={handleInstallClick}
                    className={`p-1.5 sm:p-2 rounded-md text-xs sm:text-sm font-medium flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
                    ${theme === 'dark' ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 focus:ring-offset-slate-800/60' 
                                      : 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-500 focus:ring-offset-white'}`}
                    title={translate('installApp')}
                    aria-label={translate('installApp')}
                >
                    <InstallIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-0 sm:mr-1.5" />
                    <span className="hidden sm:inline font-['Noto_Sans']">{translate('installApp')}</span>
                </button>
            )}
            <button onClick={toggleLanguage} className={`p-1.5 rounded-full text-xs ${theme === 'dark' ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {language === 'am' ? 'EN' : 'አማ'}
            </button>
            <button onClick={toggleTheme}
              className={`p-2 rounded-full ${theme === 'dark' ? 'text-yellow-400 hover:bg-slate-700' : 'text-purple-600 hover:bg-gray-200'}`}
              aria-label={theme === 'light' ? translate('switchToDarkMode') : translate('switchToLightMode')}>
              {theme === 'light' ? <MoonIcon className="w-5 h-5"/> : <SunIcon className="w-5 h-5" />}
            </button>
          </div>
        </header>
        
        {!apiKeyExists && (
           <div className={`bg-red-600 text-white text-center p-2 text-sm ${language === 'am' ? 'font-amharic' : ''}`}>
             {translate('apiKeyMissing')}
           </div>
        )}
        {error && !isLoading && ( 
            <div className={`bg-red-500/30 border border-red-600/50 text-red-300 dark:text-red-400 p-3 rounded-lg text-sm shadow-md mx-4 my-2 break-words ${language === 'am' ? 'font-amharic' : ''}`}>
              <strong>{translate('error')}:</strong> {error}
            </div>
        )}

        <main ref={chatContainerRef} className={`flex-grow p-4 md:p-6 space-y-4 overflow-y-auto scroll-smooth ${theme === 'dark' ? '' : 'bg-zinc-200'} scroll-pb-28 md:scroll-pb-32`} aria-live="polite">
          {!activeSession && !isLoading && !error && apiKeyExists && (
             <div className={`flex flex-col items-center justify-center h-full text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                 <p className={`text-lg ${language === 'am' ? 'font-amharic' : ''}`}>{translate('startNewChatPrompt')}</p>
             </div>
          )}

          {activeSession && isLoading && !activeSession.messagesLoaded && (
            <div className={`flex flex-col items-center justify-center h-full text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <LoadingSpinner />
              <p className={`mt-2 text-lg ${language === 'am' ? 'font-amharic' : ''}`}>{translate('loadingMessages')}</p>
            </div>
          )}

          {activeSession && activeSession.messagesLoaded && activeSessionMessages.length === 0 && !isLoading && !error && (
            <div className={`flex flex-col items-center justify-center h-full text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 opacity-70">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-3.861 8.25-8.625 8.25S3.75 16.556 3.75 12s3.861-8.25 8.625-8.25S21 7.444 21 12Zm-2.625 .065a8.247 8.247 0 0 1-1.423-4.794.75.75 0 1 0-1.494.158A6.745 6.745 0 0 0 18.75 12a6.745 6.745 0 0 0-1.522 4.572.75.75 0 1 0 1.494.158c.452-1.302.702-2.711.702-4.165Zm-11.25 0c0-1.454.25-2.863.702-4.165a.75.75 0 1 0-1.494-.158A8.247 8.247 0 0 1 5.25 12a8.247 8.247 0 0 1-1.423 4.794.75.75 0 0 0 1.494.158A6.745 6.745 0 0 0 6.75 12a6.745 6.745 0 0 0-1.522-4.572.75.75 0 0 0-1.494-.158C3.25 10.863 3 12.272 3 13.728V12c0-1.454.25-2.863.702-4.165Z" />
              </svg>
              <p className={`text-lg ${language === 'am' ? 'font-amharic' : ''}`}>{translate('howCanIHelp')}</p>
              <p className="text-sm">{translate('typeMessageOrAttachFile')}</p>
            </div>
          )}

          {activeSession && activeSession.messagesLoaded && activeSessionMessages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} theme={theme} language={language} />
          ))}

          {isLoading && activeSessionId && activeSession?.messagesLoaded && (userInput.trim() || selectedFile) && (
             <div className="flex justify-start pl-10 animate-pulse">
               <div className={`flex items-center space-x-2 p-3 rounded-lg rounded-bl-none max-w-md shadow-md ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  <div className={`w-8 h-8 rounded-full ${theme === 'dark' ? 'bg-slate-600' : 'bg-gray-300'}`}></div>
                  <div className="space-y-2">
                    <div className={`h-3 w-32 rounded ${theme === 'dark' ? 'bg-slate-600' : 'bg-gray-300'}`}></div>
                    <div className={`h-3 w-24 rounded ${theme === 'dark' ? 'bg-slate-600' : 'bg-gray-300'}`}></div>
                  </div>
               </div>
            </div>
          )}
        </main>

        <footer className={`p-3 md:p-4 border-t ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700/50' : 'bg-gray-50 border-gray-200/80'} backdrop-blur-sm sticky bottom-0 z-20`}>
          {activeSession && (
            <div className="max-w-3xl mx-auto mb-3 sm:mb-4">
              <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3" role="radiogroup" aria-label="Chat Modes">
                {CHAT_MODES.map(modeInfo => (
                  <button key={modeInfo.id} onClick={() => handleChangeMode(modeInfo.id)}
                    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm flex items-center space-x-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1
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
            <div className={`max-w-3xl mx-auto mb-2 p-2 rounded-md flex items-center justify-between ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100 border border-gray-300'}`}>
              <div className="flex items-center space-x-2 overflow-hidden">
                {selectedFile?.type.startsWith('image/') && selectedFilePreview.startsWith('data:image') ? (
                  <img src={selectedFilePreview} alt="Preview" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className={`p-2 rounded ${theme === 'dark' ? 'bg-slate-600' : 'bg-gray-200'}`}><FileIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-500'}`} /></div>
                )}
                <span className={`text-xs truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{selectedFile?.name}</span>
              </div>
              <button onClick={handleRemoveSelectedFile} className={`p-1 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`} aria-label="Remove selected file">
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="max-w-3xl mx-auto flex items-end space-x-2 sm:space-x-3">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={SUPPORTED_FILE_TYPES.join(',')} aria-label={translate('attachFile')}/>
            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || !apiKeyExists || !activeSessionId}
              className={`p-3 rounded-lg text-white transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500
              ${theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700' : 'bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300'} disabled:cursor-not-allowed`}
              aria-label={translate('attachFile')}>
              <PaperclipIcon />
            </button>
            <textarea ref={textareaRef} rows={1}
              className={`flex-grow p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 resize-none transition-all duration-150 ease-in-out outline-none max-h-32 overflow-y-auto ${language === 'am' ? 'font-amharic' : ''}
              ${theme === 'dark' ? 'bg-slate-700/80 border-slate-600 placeholder-gray-400 text-gray-100 focus:border-purple-500' : 'bg-white border-gray-300 placeholder-gray-500 text-gray-800 focus:border-purple-500'}`}
              placeholder={apiKeyExists && activeSessionId ? translate('chatInputPlaceholder') : (apiKeyExists ? translate('chatInputSelectSessionPlaceholder') : translate('chatInputApiKeyNeededPlaceholder'))}
              value={userInput} onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
              disabled={isLoading || !apiKeyExists || !activeSessionId || (activeSession && !activeSession.messagesLoaded)} 
              aria-label="Chat input"/>
            <button onClick={handleSendMessage} disabled={isLoading || (!userInput.trim() && !selectedFile) || !apiKeyExists || !activeSessionId || (activeSession && !activeSession.messagesLoaded)}
            className={`p-3 rounded-lg text-white transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500
              ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 focus:ring-offset-2 focus:ring-offset-slate-800' : 'bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 focus:ring-offset-2 focus:ring-offset-gray-50'}
               disabled:cursor-not-allowed`} aria-label={translate('sendMessage')}>
              {(isLoading && activeSessionId && (userInput.trim() || selectedFile)) ? <LoadingSpinner /> : <SendIcon />}
            </button>
          </div>
        </footer>
      </div>
      <HelpModal isOpen={isHelpModalOpen} onClose={toggleHelpModal} theme={theme} language={language} translate={translate}/>
      <ConfirmDeleteModal isOpen={isDeleteConfirmModalOpen} onClose={() => setIsDeleteConfirmModalOpen(false)} onConfirm={handleDeleteSession}
        sessionName={chatSessions.find(s => s.id === sessionPendingDeletionId)?.name} theme={theme} language={language} translate={translate}/>
      {/* ConfirmClearHistoryModal fully removed from JSX */}
    </div>
  );
};
export default App;
