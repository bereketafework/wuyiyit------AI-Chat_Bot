
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LocalUser, Message, ChatSession, FileInfo, ChatMode, Theme, LanguageCode, CustomBeforeInstallPromptEvent } from './types';
import { ChatMessage } from './components/ChatMessage';
import { sendMessageToAI, prepareHistoryForGemini, deleteChatSessionHistory } from './services/geminiService';
import * as dbService from './services/dbService';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ChatSessionList } from './components/ChatSessionList';
import { SUPPORTED_FILE_TYPES } from './components/fileUtils';
import { HelpModal } from './components/HelpModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { EmailPasswordAuthForm } from './components/EmailPasswordAuthForm';
import { t, TranslationKey } from './localization';
import { ChatHeader } from './components/ChatHeader';
import { ChatFooter, CHAT_MODES_CONFIG } from './components/ChatFooter';


const CHAT_MODES = CHAT_MODES_CONFIG; // Use the config from ChatFooter

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

  const appContainerRef = useRef<HTMLDivElement>(null); // Ref for the main app container
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to dynamically set app height based on window.innerHeight
  useEffect(() => {
    const appElement = appContainerRef.current;
    if (!appElement) return;

    const setAppHeight = () => {
      appElement.style.height = `${window.innerHeight}px`;
    };

    setAppHeight(); // Initial set
    window.addEventListener('resize', setAppHeight);
    // Consider orientationchange for mobile if resize doesn't cover all cases
    // window.addEventListener('orientationchange', setAppHeight);

    return () => {
      window.removeEventListener('resize', setAppHeight);
      // window.removeEventListener('orientationchange', setAppHeight);
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
  }, []); 

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
      messagesLoaded: true, 
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
    }
  }, [currentUser, chatSessions, handleSupabaseError, translate]);

  const handleChangeMode = async (newMode: ChatMode) => {
    if (!activeSessionId || !currentUser || !currentUser.id || (activeSession && activeSession.mode === newMode)) return;
    
    const oldSessions = [...chatSessions];
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === activeSessionId ? { ...session, mode: newMode } : session
      )
    );

    try {
      await dbService.updateChatSessionMode(activeSessionId, newMode, currentUser.id);
      deleteChatSessionHistory(activeSessionId); 
    } catch (e:any) {
       setError(handleSupabaseError(e, "changing mode"));
       setChatSessions(oldSessions);
    }
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileError(null);
      const { isValidFileType, isValidFileSize, fileToDataURL: appFileToDataURL, MAX_FILE_SIZE_MB: appMAX_FILE_SIZE_MB } = await import('./components/fileUtils');
      if (!isValidFileType(file)) {
        setFileError(translate('unsupportedFileType', { fileTypes: SUPPORTED_FILE_TYPES.join(', ').replace(/image\//g, '').replace(/application\//g, '') }));
        setSelectedFile(null); setSelectedFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (!isValidFileSize(file)) {
        setFileError(translate('fileTooLarge', { maxSize: appMAX_FILE_SIZE_MB }));
        setSelectedFile(null); setSelectedFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        try {
          const dataUrl = await appFileToDataURL(file);
          setSelectedFilePreview(dataUrl);
        } catch (e) {
          setFileError(translate('imagePreviewError')); setSelectedFilePreview(null);
        }
      } else {
        setSelectedFilePreview(file.name);
      }
    }
     if (fileInputRef.current) fileInputRef.current.value = "";
  }, [translate]);

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null); setSelectedFilePreview(null); setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = useCallback(async () => {
    if (!activeSession || (!userInput.trim() && !selectedFile) || isLoading || !apiKeyExists || !currentUser || !currentUser.id) return;

    setIsLoading(true); setError(null); setFileError(null);

    let fileInfoForGemini: ReturnType<typeof prepareHistoryForGemini>[0]['parts'][0] | undefined = undefined;
    let fileInfoForMessage: FileInfo | undefined = undefined;

    if (selectedFile) {
      try {
        const { fileToBase64: appFileToBase64 } = await import('./components/fileUtils');
        const base64Data = await appFileToBase64(selectedFile);
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


  if (!currentUser) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen p-4 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
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

  if (!apiKeyExists && isLoading) { // This might show briefly before API key check completes
    return (
      <div className={`flex items-center justify-center min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'}`}>
        <LoadingSpinner />
        <p className={`ml-3 text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{translate('loading')}</p>
      </div>
    );
  }
  // Loading state for chat data, shown after API key check is positive and user is logged in
  if (isLoading && chatSessions.length === 0 && apiKeyExists && !activeSession?.messagesLoaded) { 
     return (
      <div className={`flex items-center justify-center min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gray-100'}`}>
        <LoadingSpinner />
        <p className={`ml-3 text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} ${language === 'am' ? 'font-amharic' : ''}`}>{translate('loadingChatData')}</p>
      </div>
    );
  }

  return (
    <div ref={appContainerRef} className={`flex overflow-hidden max-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
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
        <ChatHeader
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            theme={theme}
            toggleTheme={toggleTheme}
            language={language}
            toggleLanguage={toggleLanguage}
            translate={translate}
        />
        
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

        <main ref={chatContainerRef} className={`flex-1 p-4 md:p-6 space-y-4 overflow-y-auto overflow-x-hidden scroll-smooth ${theme === 'dark' ? '' : 'bg-zinc-200'} scroll-pb-64 sm:scroll-pb-72 md:scroll-pb-80`} aria-live="polite">
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

        <ChatFooter
            activeSession={activeSession}
            handleChangeMode={handleChangeMode}
            isLoading={isLoading}
            apiKeyExists={apiKeyExists}
            translate={translate}
            language={language}
            theme={theme}
            fileError={fileError}
            selectedFile={selectedFile}
            selectedFilePreview={selectedFilePreview}
            handleRemoveSelectedFile={handleRemoveSelectedFile}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            textareaRef={textareaRef}
            userInput={userInput}
            setUserInput={setUserInput}
            handleSendMessage={handleSendMessage}
            supportedFileTypes={SUPPORTED_FILE_TYPES}
        />
      </div>
      <HelpModal isOpen={isHelpModalOpen} onClose={toggleHelpModal} theme={theme} language={language} translate={translate}/>
      <ConfirmDeleteModal isOpen={isDeleteConfirmModalOpen} onClose={() => setIsDeleteConfirmModalOpen(false)} onConfirm={handleDeleteSession}
        sessionName={chatSessions.find(s => s.id === sessionPendingDeletionId)?.name} theme={theme} language={language} translate={translate}/>
    </div>
  );
};
export default App;
