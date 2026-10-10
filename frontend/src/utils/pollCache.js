const POLL_CACHE_KEY = "sendchat_poll_cache";

export const getPollCache = () => {
    if (typeof window === "undefined") return {};
    try {
        const raw = localStorage.getItem(POLL_CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

export const isValidPoll = (poll) => {
    return Boolean(
        poll &&
        typeof poll === "object" &&
        typeof poll.question === "string" &&
        poll.question.trim().length > 0 &&
        Array.isArray(poll.options) &&
        poll.options.length >= 2
    );
};

export const saveCachedPoll = (msgIdOrKey, pollData) => {
    if (typeof window === "undefined" || !msgIdOrKey || !isValidPoll(pollData)) return;
    try {
        const cache = getPollCache();
        cache[String(msgIdOrKey)] = pollData;
        if (pollData.question) {
            const cleanQ = pollData.question.replace(/<!--.*?-->/g, "").replace("📊 Poll:", "").trim().toLowerCase();
            if (cleanQ) {
                cache[`q_${cleanQ}`] = pollData;
            }
        }
        localStorage.setItem(POLL_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn("saveCachedPoll error:", e);
    }
};

export const formatPollMessage = (pollData) => {
    if (!pollData || !pollData.question) return "📊 Poll";
    const meta = encodeURIComponent(JSON.stringify(pollData));
    return `📊 Poll: ${pollData.question}<!--[POLL]:${meta}-->`;
};

export const cleanMessageText = (text) => {
    if (!text || typeof text !== "string") return "";
    return text.replace(/<!--\[POLL\]:.*?-->/g, "").trim();
};

export const getCachedPoll = (msg) => {
    if (!msg) return null;
    if (isValidPoll(msg.poll)) {
        return msg.poll;
    }

    const text = String(msg.message || msg.body || "");

    // Check if embedded metadata is in message text
    const metaMatch = text.match(/<!--\[POLL\]:(.*?)-->/);
    if (metaMatch && metaMatch[1]) {
        try {
            const parsed = JSON.parse(decodeURIComponent(metaMatch[1]));
            if (isValidPoll(parsed)) {
                const id = String(msg._id || msg.id || "");
                if (id) saveCachedPoll(id, parsed);
                return parsed;
            }
        } catch (_) {}
    }

    const id = String(msg._id || msg.id || "");
    const cache = getPollCache();
    if (id && isValidPoll(cache[id])) return cache[id];

    // ONLY match messages that strictly start with "📊 Poll:" (not normal replies that mention polls)
    const trimmed = text.trim();
    if (trimmed.startsWith("📊 Poll:")) {
        const cleanQuestion = trimmed.replace(/<!--.*?-->/g, "").replace("📊 Poll:", "").trim();
        const key = cleanQuestion.toLowerCase();
        if (key && isValidPoll(cache[`q_${key}`])) {
            return cache[`q_${key}`];
        }

        if (cleanQuestion.length > 0) {
            return {
                question: cleanQuestion,
                options: [
                    { id: "opt-1", text: "Yes", votes: [] },
                    { id: "opt-2", text: "No", votes: [] }
                ],
                allowMultiple: false
            };
        }
    }

    return null;
};
