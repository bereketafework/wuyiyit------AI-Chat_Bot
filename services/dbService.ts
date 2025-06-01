
import { supabase } from './supabaseClient';
import { ChatSession, Message, ChatMode, FileInfo, LocalUser } from '../types';

const CHAT_SESSIONS_TABLE = 'chat_sessions';
const MESSAGES_TABLE = 'messages';
const USERS_TABLE = 'users';

// Helper to convert Supabase row to ChatSession
function supabaseToChatSession(data: any): ChatSession {
  return {
    id: data.id,
    name: data.name || `ውይይት ${data.id.substring(0, 5)}`,
    createdAt: new Date(data.created_at || Date.now()),
    mode: (data.mode as ChatMode) || 'general',
    messages: [], // Messages are fetched separately
    created_by_user_id: data.created_by_user_id, 
    // history_cleared and history_cleared_by_user_id removed
  };
}

// Helper to convert Supabase row to Message
function supabaseToMessage(data: any): Message {
    const fileInfo: FileInfo | undefined = data.file_info_name && data.file_info_type
    ? {
        name: data.file_info_name,
        type: data.file_info_type,
        base64Data: data.file_info_base64data || undefined,
        dataUrl: data.file_info_dataurl || undefined,
      }
    : undefined;

  return {
    id: data.id,
    text: data.text || '',
    sender: (data.sender as 'user' | 'ai') || 'ai',
    timestamp: new Date(data.timestamp || Date.now()),
    isError: data.is_error || false,
    fileInfo: fileInfo,
  };
}

// --- User Management Functions (Custom Auth - TEMPORARY & INSECURE) ---
/**
 * CRITICAL SECURITY WARNING: This function retrieves the plaintext password.
 * This is ONLY for demonstration purposes and is extremely insecure.
 * DO NOT USE IN PRODUCTION.
 */
export async function getUserByEmail(email: string): Promise<(LocalUser & { password?: string }) | null> {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116: "Standard পীজিআরএসটি১১৬" (The result contains 0 rows)
    console.error(
      `Error getting user by email "${email}" from Supabase. Message: ${error?.message}, Code: ${error?.code}, Details: ${error?.details}, Hint: ${error?.hint}`,
      error
    );
    throw error;
  }
  return data ? (data as (LocalUser & { password?: string })) : null;
}

/**
 * CRITICAL SECURITY WARNING: This function stores passwords in plaintext.
 */
export async function addUser(name: string, email: string, password: string): Promise<LocalUser> {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .insert({ name: name, email: email.toLowerCase(), password: password }) // Storing plaintext password
    .select('id, email, name, created_at')
    .single();

  if (error) {
    console.error(
      `Error adding user "${email}" to Supabase. Message: ${error?.message}, Code: ${error?.code}, Details: ${error?.details}, Hint: ${error?.hint}`,
      error
    );
    throw error;
  }
  if (!data) throw new Error("Failed to add user, no data returned.");
  return data as LocalUser;
}

// --- Helper function to check session ownership ---
async function isSessionOwner(sessionId: string, userId: string): Promise<boolean> {
  if (!userId) return false; // Cannot be owner if no userId
  const { data, error } = await supabase
    .from(CHAT_SESSIONS_TABLE)
    .select('created_by_user_id')
    .eq('id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return false; // Session not found
    console.error(
      `Error checking session ownership for session "${sessionId}". Message: ${error?.message}, Code: ${error?.code}, Details: ${error?.details}, Hint: ${error?.hint}`,
      error
    );
    throw error; 
  }
  return data?.created_by_user_id === userId;
}


// --- Chat Session and Message Functions (Now with user ownership) ---

export async function getAllChatSessions(userId: string): Promise<ChatSession[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from(CHAT_SESSIONS_TABLE)
    .select('*')
    .eq('created_by_user_id', userId) // Filter by user ID
    .order('created_at', { ascending: true });

  if (error) {
    console.error(
      `Error getting chat sessions for user "${userId}" from Supabase. Message: ${error?.message}, Code: ${error?.code}, Details: ${error?.details}, Hint: ${error?.hint}`,
      error
    );
    throw error;
  }
  return data ? data.map(supabaseToChatSession) : [];
}

export async function addChatSession(session: ChatSession, userId: string): Promise<void> {
  if (!userId) throw new Error("User ID is required to create a chat session.");
  const { error } = await supabase
    .from(CHAT_SESSIONS_TABLE)
    .insert({
      id: session.id,
      name: session.name,
      created_at: new Date(session.createdAt).toISOString(),
      mode: session.mode,
      // history_cleared removed
      created_by_user_id: userId, // Store the creator's ID
    });

  if (error) {
    console.error(
      `Error adding chat session "${session.id}" for user "${userId}" to Supabase. Message: ${error?.message}, Code: ${error?.code}, Details: ${error?.details}, Hint: ${error?.hint}`,
      error
    );
    throw error;
  }
}

export async function updateChatSessionMode(sessionId: string, mode: ChatMode, userId: string): Promise<void> {
  if (!await isSessionOwner(sessionId, userId)) {
    console.warn(`Permission denied: User "${userId}" does not own session "${sessionId}" for mode update.`);
    throw new Error("Permission denied: User does not own this session.");
  }
  const { error } = await supabase
    .from(CHAT_SESSIONS_TABLE)
    .update({ mode })
    .eq('id', sessionId);

  if (error) {
    console.error(
      `Error updating mode for session "${sessionId}" in Supabase. Message: ${error?.message}, Code: ${error?.code}, Details: ${error?.details}, Hint: ${error?.hint}`,
      error
    );
    throw error;
  }
}

export async function updateChatSessionName(sessionId: string, newName: string, userId: string): Promise<void> {
  if (!await isSessionOwner(sessionId, userId)) {
    console.warn(`Permission denied: User "${userId}" does not own session "${sessionId}" for name update.`);
    throw new Error("Permission denied: User does not own this session.");
  }
  const { error } = await supabase
    .from(CHAT_SESSIONS_TABLE)
    .update({ name: newName })
    .eq('id', sessionId);

  if (error) {
    console.error(
      `Error updating name for session "${sessionId}" in Supabase. Message: ${error?.message}, Code: ${error?.code}, Details: ${error?.details}, Hint: ${error?.hint}`,
      error
    );
    throw error;
  }
}

// updateChatSessionHistoryClearedStatus function removed

export async function deleteChatSession(sessionId: string, userId: string): Promise<void> {
  if (!await isSessionOwner(sessionId, userId)) {
    console.warn(`Permission denied: User "${userId}" does not own session "${sessionId}" for deletion.`);
    throw new Error("Permission denied: User does not own this session.");
  }
  const { error: sessionError } = await supabase
    .from(CHAT_SESSIONS_TABLE)
    .delete()
    .eq('id', sessionId); 

  if (sessionError) {
    console.error(
      `Error deleting chat session "${sessionId}" from Supabase. Message: ${sessionError?.message}, Code: ${sessionError?.code}, Details: ${sessionError?.details}, Hint: ${sessionError?.hint}`,
      sessionError
    );
    throw sessionError;
  }
}

export async function getMessagesForSession(sessionId: string, userId: string): Promise<Message[]> {
  if (!await isSessionOwner(sessionId, userId)) {
    // console.warn(`Attempt to get messages for session "${sessionId}" by non-owner "${userId}". Returning empty.`);
    return []; 
  }
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error(
      `Error getting messages for session "${sessionId}" from Supabase. Message: ${error?.message}, Code: ${error?.code}, Details: ${error?.details}, Hint: ${error?.hint}`,
      error
    );
    throw error;
  }
  return data ? data.map(supabaseToMessage) : [];
}

export async function addMessage(sessionId: string, message: Message, userId: string): Promise<string | undefined> {
  if (!await isSessionOwner(sessionId, userId)) {
    console.warn(`Permission denied: User "${userId}" does not own session "${sessionId}" to add messages.`);
    throw new Error("Permission denied: User does not own this session to add messages.");
  }
  const messageForDb = {
    id: message.id,
    session_id: sessionId,
    text: message.text,
    sender: message.sender,
    timestamp: new Date(message.timestamp).toISOString(),
    is_error: message.isError || false,
    file_info_name: message.fileInfo?.name || null,
    file_info_type: message.fileInfo?.type || null,
    file_info_base64data: message.fileInfo?.base64Data || null,
    file_info_dataurl: message.fileInfo?.dataUrl || null,
  };

  if (messageForDb.file_info_base64data && messageForDb.file_info_base64data.length * 0.75 > 1024 * 1024 * 0.7) {
    console.warn(`Base64 data for file ${messageForDb.file_info_name} might be large. Size: ${messageForDb.file_info_base64data.length} chars.`);
  }

  const { error } = await supabase
    .from(MESSAGES_TABLE)
    .insert(messageForDb);

  if (error) {
    console.error(
      `Error adding message to session "${sessionId}" in Supabase. Message: ${error?.message}, Code: ${error?.code}, Details: ${error?.details}, Hint: ${error?.hint}`,
      error
    );
    throw error;
  }
  
  const { data: sessionData, error: sessionFetchError } = await supabase
    .from(CHAT_SESSIONS_TABLE)
    .select('name, created_by_user_id') 
    .eq('id', sessionId)
    .single();

  if (sessionFetchError) {
    console.error(
        `Error fetching session name for update after adding message to session "${sessionId}". Message: ${sessionFetchError?.message}, Code: ${sessionFetchError?.code}, Details: ${sessionFetchError?.details}, Hint: ${sessionFetchError?.hint}`,
        sessionFetchError
      );
    return undefined;
  }

  if (sessionData && sessionData.created_by_user_id === userId && sessionData.name && /^ውይይት \d+$/.test(sessionData.name) && message.sender === 'user') {
    let newName = '';
    if (message.text.trim()) {
      newName = message.text.trim().substring(0, 40);
    } else if (message.fileInfo?.name) {
      newName = `File: ${message.fileInfo.name.substring(0, 30)}`;
    }
    if (newName.length === 40 && message.text.trim().length > 40) newName += "...";
    else if (newName.length === 30 + "File: ".length && message.fileInfo?.name && message.fileInfo.name.length > 30) newName += "...";

    if (newName) {
        try {
            await updateChatSessionName(sessionId, newName, userId);
            return newName;
        } catch (updateError: any) {
            console.error(
                `Error updating session name for session "${sessionId}" to "${newName}". Message: ${updateError?.message}, Code: ${updateError?.code}, Details: ${updateError?.details}, Hint: ${updateError?.hint}`,
                updateError
              );
        }
    }
  }
  return undefined;
}

export async function clearMessagesForSession(sessionId: string, userId: string): Promise<void> {
  if (!await isSessionOwner(sessionId, userId)) {
    console.warn(`Permission denied: User "${userId}" does not own session "${sessionId}" to clear messages.`);
    throw new Error("Permission denied: User does not own this session to clear messages.");
  }
  const { error } = await supabase
    .from(MESSAGES_TABLE)
    .delete()
    .eq('session_id', sessionId);

  if (error) {
     console.error(
        `Failed to clear messages for session "${sessionId}" from Supabase. Message: ${error?.message}, Code: ${error?.code}, Details: ${error?.details}, Hint: ${error?.hint}`,
        error
      );
    throw error;
  }
}

export async function clearAllData_DevOnly(): Promise<void> {
  console.warn("CLEARING ALL CHAT HISTORY FROM SUPABASE (DEV ONLY)");
  try {
    const { error: messagesError } = await supabase.from(MESSAGES_TABLE).delete().neq('id', 'dummy-id-to-delete-all');
    if (messagesError) {
        console.error(`DevOnly: Error clearing messages. Message: ${messagesError?.message}`, messagesError);
        throw messagesError;
    }

    const { error: sessionsError } = await supabase.from(CHAT_SESSIONS_TABLE).delete().neq('id', 'dummy-id-to-delete-all');
    if (sessionsError) {
        console.error(`DevOnly: Error clearing sessions. Message: ${sessionsError?.message}`, sessionsError);
        throw sessionsError;
    }
    
    const { error: usersError } = await supabase.from(USERS_TABLE).delete().neq('id', 'dummy-id-to-delete-all');
    if (usersError) {
        console.error(`DevOnly: Error clearing users. Message: ${usersError?.message}`, usersError);
        throw usersError;
    }

    console.log("DevOnly: All chat data and user data cleared from Supabase.");
  } catch (error: any) {
    console.error(
        `DevOnly: Error clearing all data from Supabase. Message: ${error?.message}, Code: ${error?.code}, Details: ${error?.details}, Hint: ${error?.hint}`,
        error
      );
    throw error;
  }
}