/**
 * AI Service using Google Gemini API with smart fallback protection.
 * Supports:
 * - Direct Gemini 1.5 Flash / 2.0 Flash REST queries (no heavy external dependencies needed)
 * - Safe fallback generation when offline or when GEMINI_API_KEY is not configured
 */

// Candidate models list in priority order with auto-fallback on 404/503/429
const CANDIDATE_MODELS = [
    process.env.GEMINI_MODEL,
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
].filter(Boolean);

// Dynamically tracks the currently verified healthy model
let activeModel = CANDIDATE_MODELS[0] || "gemini-3.5-flash";

// In-memory LRU/TTL cache for high performance & quota optimization
const responseCache = new Map();

function getCached(key) {
    const entry = responseCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        responseCache.delete(key);
        return null;
    }
    return entry.value;
}

function setCache(key, value, ttlMs = 300000) {
    if (responseCache.size > 200) {
        const oldestKey = responseCache.keys().next().value;
        responseCache.delete(oldestKey);
    }
    responseCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function callGemini(prompt, systemInstruction = "", userApiKey = null) {
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return null; // Signals fallback to use simulated intelligence
    }

    const body = {
        contents: [
            {
                role: "user",
                parts: [{ text: prompt }]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
        }
    };

    if (systemInstruction) {
        body.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    // Prioritize the currently active verified healthy model, followed by fallbacks
    const modelsToTry = [
        activeModel,
        ...CANDIDATE_MODELS.filter(m => m !== activeModel)
    ];

    for (const model of modelsToTry) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                // If model is not found (404), overloaded (503), or rate-limited (429), try next candidate
                if ([404, 503, 429].includes(response.status)) {
                    console.warn(`[AI Service] Model '${model}' returned status ${response.status}. Trying next candidate model...`);
                    continue;
                }
                console.warn(`[AI Service] Gemini API returned error ${response.status}:`, errorText);
                return null;
            }

            const data = await response.json();
            const candidate = data.candidates?.[0];
            const text = candidate?.content?.parts?.[0]?.text;
            if (text) {
                // Pin this model as verified healthy for fast subsequent calls
                if (activeModel !== model) {
                    activeModel = model;
                    console.log(`[AI Service] Active Gemini model pinned to: ${model}`);
                }
                return text.trim();
            }
        } catch (err) {
            console.warn(`[AI Service] Network error with model '${model}':`, err.message);
        }
    }

    console.warn("[AI Service] All Gemini model candidates failed. Falling back to built-in generator.");
    return null;
}

/**
 * Chat with AI Assistant
 */
async function generateAIChatReply(conversationHistory = [], userMessage = "", userApiKey = null) {
    const systemPrompt = "You are SendChat AI, a helpful, friendly, and concise AI chat assistant embedded in a modern messaging app. Answer questions directly, provide clear code snippets when asked, help brainstorm ideas, and maintain a pleasant conversational tone. Keep responses readable and neatly formatted with Markdown.";

    // Build multi-turn context
    const formattedHistory = conversationHistory.slice(-8).map(m => {
        const role = m.isAI ? "AI Assistant" : "User";
        return `${role}: ${m.message}`;
    }).join("\n");

    const prompt = `${formattedHistory}\nUser: ${userMessage}\nAI Assistant:`;

    const result = await callGemini(prompt, systemPrompt, userApiKey);
    if (result) return result;

    // Intelligent Fallback response when no API key or offline
    const lower = userMessage.toLowerCase();
    if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
        return "👋 Hello there! I'm **SendChat AI**, your personal chat assistant. How can I assist you today? You can ask me questions, get help writing messages, brainstorm ideas, or ask for code snippets!";
    }
    if (lower.includes("how are you")) {
        return "I'm doing fantastic, thank you! Ready to help you with anything you need. What's on your mind?";
    }
    if (lower.includes("help") || lower.includes("what can you do")) {
        return "✨ Here is what I can do for you:\n- **Answer questions & explain topics**\n- **Fix grammar & rewrite drafts** in different tones\n- **Suggest smart quick-replies** in conversations\n- **Summarize long chat threads**\n- **Translate messages** between multiple languages\n\n*(Tip: Add your `GEMINI_API_KEY` in `.env` or in Settings to unlock real-time Gemini intelligence!)*";
    }
    if (lower.includes("summarize") || lower.includes("summary")) {
        return "📝 To summarize any chat thread, you can click the **Sparkles (✨) button** in the chat header, or paste any text here and ask me to summarize it!";
    }

    return `✨ I received your message: *"${userMessage}"*.\n\nI'm ready to help you with that! To unlock live Google Gemini AI capabilities, you can configure your \`GEMINI_API_KEY\` in the project \`.env\` file or under **Settings (⚙️) > AI Preferences**.`;
}

/**
 * Generate 3 quick contextual replies for the current conversation
 */
async function generateSmartReplies(messages = [], userApiKey = null) {
    if (!messages || messages.length === 0) {
        return ["Hi there!", "How can I help you?", "Talk to you soon!"];
    }

    const cacheKey = `sr_${messages.map(m => m.message || m.body).slice(-3).join("|")}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const lastMessages = messages.slice(-4).map(m => `${m.senderName || "Sender"}: ${m.message || m.body}`).join("\n");
    const prompt = `Based on the following recent chat conversation, generate exactly 3 short, natural, relevant quick replies for the user to pick from.
Requirements:
- Output ONLY a JSON array of 3 strings, e.g. ["Sounds great!", "Let me check and get back to you", "Thanks for letting me know"].
- Each reply must be under 8 words.
- Do NOT include markdown code blocks or explanations.

Conversation:
${lastMessages}

JSON Output:`;

    const result = await callGemini(prompt, "You are an assistant that outputs only valid raw JSON arrays of strings.", userApiKey);

    if (result) {
        try {
            // Clean any markdown formatting if returned
            const cleaned = result.replace(/```json/gi, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const replies = parsed.slice(0, 3);
                setCache(cacheKey, replies, 300000); // 5 min cache
                return replies;
            }
        } catch {
            // fallback below
        }
    }

    // Context-sensitive heuristics fallback
    const lastMsg = (messages[messages.length - 1]?.message || messages[messages.length - 1]?.body || "").toLowerCase();
    if (lastMsg.includes("?")) {
        return ["Yes, absolutely!", "Let me check and get back to you.", "Could you give me more details?"];
    }
    if (lastMsg.includes("thank") || lastMsg.includes("thx")) {
        return ["You're welcome!", "Anytime! 😊", "Glad to help!"];
    }
    if (lastMsg.includes("ok") || lastMsg.includes("okay") || lastMsg.includes("cool")) {
        return ["Sounds good!", "Perfect 👍", "Catch you later!"];
    }
    if (lastMsg.includes("meet") || lastMsg.includes("call") || lastMsg.includes("time")) {
        return ["That time works for me!", "Can we do a bit later?", "Sounds good, see you then."];
    }

    return ["Sounds good!", "Thanks for letting me know.", "I'll take a look soon!"];
}

/**
 * Rewrite / adjust tone of draft text
 */
async function rewriteDraftText(text, mode = "grammar", targetLanguage = "English", userApiKey = null) {
    if (!text || !text.trim()) return text;

    const cacheKey = `rw_${mode}_${targetLanguage}_${text.trim()}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    let instruction = "";
    switch (mode) {
        case "grammar":
            instruction = "Fix all grammar, spelling, punctuation, and typographical mistakes while preserving the exact meaning and tone.";
            break;
        case "professional":
            instruction = "Rewrite this message to sound professional, respectful, polite, and workplace-appropriate without being overly verbose.";
            break;
        case "casual":
            instruction = "Rewrite this message in a friendly, relaxed, casual conversational tone with natural warmth.";
            break;
        case "concise":
            instruction = "Condense this message to be direct, brief, and straight to the point while retaining all key information.";
            break;
        case "translate":
            instruction = `Translate this message accurately and naturally into ${targetLanguage}. Keep the original meaning and conversational tone.`;
            break;
        default:
            instruction = "Improve the clarity and flow of this message.";
    }

    const prompt = `${instruction}\n\nOriginal Text:\n"${text}"\n\nOutput only the rewritten text directly with no extra quotes or commentary.`;
    const result = await callGemini(prompt, "You are an expert writing assistant and translator. Return only the revised text.", userApiKey);

    if (result) {
        setCache(cacheKey, result, 600000); // 10 min cache
        return result;
    }

    // Offline / fallback transformations
    if (mode === "grammar") {
        let cleaned = text.trim();
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    if (mode === "concise") {
        return text.trim();
    }
    if (mode === "professional") {
        return `Hello, please note: ${text.trim()}. Best regards.`;
    }
    if (mode === "casual") {
        return `Hey! ${text.trim()} 😊`;
    }

    return text;
}

/**
 * Summarize conversation thread
 */
async function summarizeConversationThread(messages = [], userApiKey = null) {
    if (!messages || messages.length === 0) {
        return "No messages available to summarize.";
    }

    const transcript = messages.map(m => `${m.senderName || "Participant"}: ${m.message || m.body}`).join("\n");
    const prompt = `Summarize the following chat conversation thread concisely for someone catching up.
Structure the summary with:
- **Summary**: 1-2 sentence overview
- **Key Points / Decisions**: Bullet points
- **Action Items**: Any pending tasks or questions (if any)

Chat Transcript:
${transcript}`;

    const result = await callGemini(prompt, "You are an executive summary assistant. Keep summaries structured, concise, and easy to skim.", userApiKey);
    if (result) return result;

    // Fallback summary
    const count = messages.length;
    return `### Conversation Summary (${count} messages)\n\n- **Overview**: Active discussion between conversation participants.\n- **Latest Message**: "${messages[messages.length - 1]?.message || messages[messages.length - 1]?.body}"\n\n*(Add a \`GEMINI_API_KEY\` to enable deep semantic AI thread summaries!)*`;
}

/**
 * Translate an individual message
 */
async function translateMessageText(text, targetLanguage = "English", userApiKey = null) {
    if (!text || !text.trim()) return text;

    const cacheKey = `tr_${targetLanguage}_${text.trim()}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const prompt = `Translate the following text into ${targetLanguage}. Output ONLY the translated text without quotes or explanations:\n\n${text}`;
    const result = await callGemini(prompt, "You are a professional multilingual translator.", userApiKey);
    if (result) {
        setCache(cacheKey, result, 3600000); // 1 hour cache
        return result;
    }

    return `[${targetLanguage}]: ${text}`;
}

module.exports = {
    generateAIChatReply,
    generateSmartReplies,
    rewriteDraftText,
    summarizeConversationThread,
    translateMessageText
};
