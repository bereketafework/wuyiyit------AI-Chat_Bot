
import { GoogleGenAI, GenerateContentResponse, Chat, Part, Content } from "@google/genai";
import { ChatMode, Message as AppMessage } from "../types"; // Removed AppFileInfo as it's not directly used here after change

const API_KEY = process.env.API_KEY;

const ai = new GoogleGenAI({ apiKey: API_KEY! });
const modelName = "gemini-2.5-flash-preview-04-17";

const getBaseSystemInstruction = () => `You are a highly proficient AI assistant. Your primary and ONLY language for communication is Amharic.
Regardless of the language used in the user's query (e.g., English, French, Spanish, etc.), you MUST understand the query and formulate your entire response exclusively in Amharic.
If the user provides an image or a PDF file, you MUST analyze its content and incorporate that analysis into your response.

RESPONSE FORMATTING:
- Structure your responses using Markdown headings for titles and subtitles.
  - For a main title, use: # Main Title Example (e.g., # ዋና ርዕስ)
  - For a subtitle, use: ## Subtitle Example (e.g., ## ንዑስ ርዕስ)
  - For a sub-subtitle, use: ### Sub-subtitle Example (e.g., ### ተጨማሪ ንዑስ ርዕስ)
- You MAY use colons after titles and subtitles (e.g., # ዋና ርዕስ:).
- Ensure that the main content/paragraph text is NOT bold. Only the headings generated with #, ##, or ### should appear bold due to styling.
- Use paragraphs for longer explanations and bullet points (using * or -) for lists if appropriate.
- When presenting information from a file, clearly state that the information is derived from the provided document or image (e.g., "ከተያያዘው ምስል እንደተረዳሁት..." or "ከሰነዱ እንደተገኘው መረጃ...").

LANGUAGE AND CONTENT:
- Provide detailed explanations. Wherever appropriate, include specific examples to clarify your points. These examples must also be in Amharic.
- Do not provide any part of your response in any language other than Amharic.
- Do not include greetings, closings, or any other text in English or any other language.
- Strictly Amharic output.
- If the user asks a question you cannot answer, respond in Amharic that you cannot answer.
- If the user's input is unclear, ask for clarification in Amharic.
- Always be helpful, polite, and thorough in your Amharic responses.`;

const getSystemInstructionForMode = (mode: ChatMode): string => {
  const baseInstruction = getBaseSystemInstruction();
  switch (mode) {
    case 'medical':
      return `You are an AI assistant specializing in providing medical information IN AMHARIC ONLY. You are in "Medical Mode".
${baseInstruction}

MEDICAL MODE SPECIFICS:
- CRITICAL: ALWAYS start your response with a disclaimer in Amharic: "ትኩረት: እኔ የሕክምና ባለሙያ አይደለሁም። ይህ መረጃ ለመማሪያና ለመረጃ አገልግሎት ብቻ የቀረበ ሲሆን የባለሙያ የሕክምና ምክርን، ምርመራን ወይም ሕክምናን ሊተካ አይችልም። ማንኛውም የጤና ጉዳይ ካለዎት ሁልጊዜ ብቁ የሆኑ የጤና ባለሙያዎችን ያማክሩ።"
- Base your medical explanations, terminology, and descriptions on information similar in style and accuracy to that found on reputable medical information websites like uptodate.com, but ensure all content is presented clearly and originally in Amharic.
- Provide detailed Amharic explanations for treatments, diagnoses, and general medical queries.
- Analyze any provided images or PDFs for medical relevance and discuss them according to these guidelines.
`;
    case 'child':
      return `You are a friendly, fun, and patient AI assistant for children under 13 years old, IN AMHARIC ONLY. You are in "Child Mode".
${baseInstruction}

CHILD MODE SPECIFICS:
- Make your Amharic responses simple, engaging, and very easy for a young child to understand.
- Use plenty of EMOJIS (😊🎉🌟💡🎈👍📖) to make the chat fun and visually appealing!
- If the user sends an image or PDF, explain it in a simple, child-friendly Amharic way.
- Appreciate their questions (e.g., "ጥሩ ጥያቄ ነው! 👍" or "ይሄ በጣም ደስ የሚል ጥያቄ ነው! 😊"). Encourage them to ask more questions (e.g., "ሌላ ጥያቄ አለህ? ጠይቀኝ እስኪ!").
- Use shorter sentences and repetition if it helps clarify.
- If appropriate for the explanation, you can use onomatopoeia or sound words in Amharic if they fit the context.
`;
    case 'student':
      return `You are an AI assistant for high school students, aiming to help them learn and understand topics IN AMHARIC ONLY. You are in "Student Mode".
${baseInstruction}

STUDENT MODE SPECIFICS:
- Assume the user is seeking to expand their knowledge for academic purposes (high school level).
- Provide comprehensive, well-explained answers in Amharic, suitable for a high school student's understanding.
- If an image or PDF is provided, analyze it thoroughly and explain its content in an educational manner, highlighting key concepts.
- Break down complex topics into digestible parts. Use analogies or real-world examples (in Amharic) where helpful.
- Encourage critical thinking by occasionally posing a follow-up question related to the topic.
`;
    case 'general':
    default:
      return `${baseInstruction}\nYou are in "General Mode". Respond helpfully and thoroughly to user queries.`;
  }
};

const chatInstances: Map<string, { chat: Chat, mode: ChatMode }> = new Map();

// ExternalFileInput interface is removed as handleSendMessage now takes a Content object

export const prepareHistoryForGemini = (messages: AppMessage[]): Content[] => {
  return messages.map((msg): Content => {
    const parts: Part[] = [];
    if (msg.text) {
      parts.push({ text: msg.text });
    }
    if (msg.fileInfo && msg.fileInfo.base64Data) { // Ensure base64Data exists before using it
      parts.push({
        inlineData: {
          mimeType: msg.fileInfo.type,
          data: msg.fileInfo.base64Data,
        },
      });
    }
    return {
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: parts,
    };
  });
};


const getOrCreateChat = (sessionId: string, mode: ChatMode, history: Content[]): Chat => {
    const existingInstance = chatInstances.get(sessionId);

    if (existingInstance && existingInstance.mode === mode) {
        // Mode is the same. We'll delete and recreate to ensure history is correctly applied
        // for chat.sendMessage (which doesn't take history directly).
        // console.log(`Chat instance for ${sessionId} has same mode. Recreating for fresh history context.`);
        chatInstances.delete(sessionId);
    } else if (existingInstance) {
        // console.log(`Chat instance mode mismatch for ${sessionId}. Current: ${existingInstance.mode}, New: ${mode}. Recreating.`);
        chatInstances.delete(sessionId);
    }


    const systemInstruction = getSystemInstructionForMode(mode);
    const newChat = ai.chats.create({
        model: modelName,
        config: {
            systemInstruction: systemInstruction,
        },
        history: history // Pass the full history (up to the current user message) here
    });
    chatInstances.set(sessionId, { chat: newChat, mode: mode });
    return newChat;
};

export const sendMessageToAI = async (
  sessionId: string,
  currentUserMessageContent: Content, // Expects a Content object for the current user turn
  mode: ChatMode,
  historyForChatCreation: Content[] // Full history *before* the current user message
): Promise<string> => {
  if (!API_KEY) {
    throw new Error("Gemini API Key is not configured. Please set the API_KEY environment variable.");
  }

  // History for chat creation should NOT include the current user message,
  // as that message will be sent via chat.sendMessage().
  const chat = getOrCreateChat(sessionId, mode, historyForChatCreation);

  if (!currentUserMessageContent.parts || currentUserMessageContent.parts.length === 0) {
    return "እባክዎ መልዕክት ያስገቡ ወይም ፋይል ያያይዙ። (Please enter a message or attach a file.)";
  }

  try {
    // `sendMessage` takes the current user message (parts).
    // The history (previous turns) was already set when creating/getting the chat instance.
    const response: GenerateContentResponse = await chat.sendMessage({ message: currentUserMessageContent.parts });

    const text = response.text;
    if (typeof text === 'string') {
        const cleanedText = text.trim();
        if (cleanedText) {
            return cleanedText;
        } else {
            console.warn("Gemini API returned an empty string. Session:", sessionId, "Mode:", mode);
            return "ይቅርታ፣ ምላሽ ማመንጨት አልቻልኩም። እባክዎ እንደገና ይሞክሩ። (Sorry, I could not generate a response. Please try again.)";
        }
    } else {
        console.error("Gemini API response.text was not a string:", response, "Session:", sessionId, "Mode:", mode);
        throw new Error("AI response format was invalid. Received non-string data.");
    }

  } catch (error) {
    console.error(`Error calling Gemini API for session ${sessionId} (Mode: ${mode}):`, error);
    if (error instanceof Error) {
        if (error.message.includes("400 Bad Request") && error.message.includes("User location is not supported")) {
             return "ይቅርታ፣ በአካባቢዎ ይህ አገልግሎት ገና አልተፈቀደም። (Sorry, this service is not yet available in your region.)";
        }
         if (error.message.includes("billing account")) {
            return "የኤፒአይ ቁልፍዎ ላይ የክፍያ ችግር ያለ ይመስላል። እባክዎ ያረጋግጡ። (There seems to be a billing issue with your API key. Please check.)";
        }
        // Check for HARMFUL_CONTENT error specifically
        if (error.message.includes("HARMFUL_CONTENT")) {
            return "ይቅርታ፣ በጠየቁት ይዘት ምክንያት ምላሽ ማመንጨት አልቻልኩም። እባክዎ ጥያቄዎን አስተካክለው እንደገና ይሞክሩ። (Sorry, I could not generate a response due to the nature of the content requested. Please adjust your query and try again.)";
        }
        throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
};

// This function is to clear the in-memory chat instance if a session is deleted from UI/DB or history is cleared.
export const deleteChatSessionHistory = (sessionId: string): void => {
    if (chatInstances.has(sessionId)) {
        chatInstances.delete(sessionId);
        // console.log(`Deleted in-memory Gemini chat instance for session ${sessionId}`);
    }
};
