/**
 * AI Database Security Guard & Guardrails Middleware
 * 
 * Provides defense-in-depth protections against:
 * 1. Destructive Database Operations (dropDatabase, dropCollection, deleteMany, etc.)
 * 2. Prompt Injections & Jailbreak Attempts targeting DB queries
 * 3. Multi-Tenant Cross-Access & Data Exfiltration
 * 4. Arbitrary Query Execution ($where, eval, NoSQL injection)
 */

// Strictly prohibited dangerous database commands
const PROHIBITED_OPERATIONS = new Set([
    "drop",
    "dropdatabase",
    "dropcollection",
    "deletemany",
    "remove",
    "deletedatabase",
    "repairdatabase",
    "copydatabase",
    "eval",
    "$where",
    "$accumulator",
    "$function"
]);

// Whitelisted safe operations that AI tools are permitted to call
const ALLOWED_AI_OPERATIONS = new Set([
    "read_recent_messages",
    "summarize_conversation",
    "generate_reply",
    "translate_message",
    "save_ai_message"
]);

// Prompt injection jailbreak signatures targeting database commands
const DANGEROUS_PROMPT_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /drop\s+(database|table|collection)/i,
    /delete\s+from\s+/i,
    /db\.\w+\.drop/i,
    /db\.\w+\.remove/i,
    /db\.\w+\.deleteMany/i,
    /format\s+database/i,
    /truncate\s+(table|collection)/i
];

/**
 * Validates that an AI tool call is strictly within the allowed whitelist
 * and does not execute prohibited destructive database actions.
 */
function validateAIOperation(operationName, params = {}) {
    const opLower = String(operationName || "").toLowerCase().trim();

    // 1. Check against prohibited destructive commands
    if (PROHIBITED_OPERATIONS.has(opLower)) {
        const error = `[SECURITY ALERT] Blocked prohibited destructive operation: '${operationName}'`;
        console.error(error);
        throw new Error("Security Violation: Destructive database operations are strictly prohibited.");
    }

    // 2. Enforce strict whitelist
    if (!ALLOWED_AI_OPERATIONS.has(opLower)) {
        const error = `[SECURITY ALERT] Blocked non-whitelisted AI operation: '${operationName}'`;
        console.error(error);
        throw new Error(`Security Violation: Operation '${operationName}' is not authorized.`);
    }

    // 3. Inspect parameters for NoSQL injection keywords or operators
    const serializedParams = JSON.stringify(params).toLowerCase();
    for (const prohibited of PROHIBITED_OPERATIONS) {
        if (serializedParams.includes(`"${prohibited}"`) || serializedParams.includes(`$${prohibited}`)) {
            throw new Error(`Security Violation: Dangerous parameter detected: '${prohibited}'.`);
        }
    }

    return true;
}

/**
 * Sanitizes user input against prompt injection attempts aimed at manipulating the DB
 */
function sanitizeAIPrompt(promptText) {
    if (!promptText || typeof promptText !== "string") return promptText;

    for (const pattern of DANGEROUS_PROMPT_PATTERNS) {
        if (pattern.test(promptText)) {
            console.warn(`[SECURITY WARNING] Prompt injection pattern detected: ${pattern}`);
            // Neutralize and strip dangerous intent
            return promptText.replace(pattern, "[FILTERED_SUSPICIOUS_COMMAND]");
        }
    }

    return promptText;
}

/**
 * Enforces Tenant Isolation:
 * Guarantees that any query executed on behalf of a user is strictly scoped
 * to that authenticated user's ID and cannot access other tenants' data.
 */
function enforceTenantScope(queryFilter, authenticatedUserId) {
    if (!authenticatedUserId) {
        throw new Error("Authentication required: Tenant scope cannot be verified.");
    }

    // Forcefully inject authenticated user constraint into query filter
    return {
        ...queryFilter,
        $or: [
            { senderId: authenticatedUserId },
            { participated: { $in: [authenticatedUserId] } }
        ]
    };
}

/**
 * Audit Logger for AI Database Interactions
 */
function logAIOperationAudit({ userId, operation, targetId, status, details = "" }) {
    const auditRecord = {
        timestamp: new Date().toISOString(),
        userId: String(userId || "anonymous"),
        operation,
        targetId: String(targetId || ""),
        status, // 'SUCCESS' | 'BLOCKED' | 'FAILED'
        details
    };

    console.log(`[AI-AUDIT] ${JSON.stringify(auditRecord)}`);
    return auditRecord;
}

module.exports = {
    validateAIOperation,
    sanitizeAIPrompt,
    enforceTenantScope,
    logAIOperationAudit,
    PROHIBITED_OPERATIONS,
    ALLOWED_AI_OPERATIONS
};
