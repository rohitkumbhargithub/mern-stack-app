const { describe, it } = require('node:test');
const assert = require('node:assert');

// WhatsApp & Markdown tokenization regex
const inlineTokenRegex = /(`[^`\n]+`|\*\*[^*\n]+?\*\*|(?<=^|[\s.,!?;:()\[\]{}"''])\*(?!\s)[^*\n]+?(?<!\s)\*(?=$|[\s.,!?;:()\[\]{}"''])|~~[^~\n]+?~~|(?<=^|[\s.,!?;:()\[\]{}"''])~(?!\s)[^~\n]+?(?<!\s)~(?=$|[\s.,!?;:()\[\]{}"''])|(?<=^|[\s.,!?;:()\[\]{}"''])_(?!\s)[^_\n]+?(?<!\s)_(?=$|[\s.,!?;:()\[\]{}"'']))/g;

function parseFormattedTokens(text) {
    if (!text || typeof text !== 'string') return [];
    const parts = text.split(inlineTokenRegex);
    return parts.map((part) => {
        if (!part) return null;
        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
            return { type: 'code', text: part.slice(1, -1) };
        }
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return { type: 'bold', text: part.slice(2, -2) };
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
            return { type: 'bold', text: part.slice(1, -1) };
        }
        if ((part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) || (part.startsWith('~') && part.endsWith('~') && part.length >= 2)) {
            const inner = part.startsWith('~~') ? part.slice(2, -2) : part.slice(1, -1);
            return { type: 'strike', text: inner };
        }
        if (part.startsWith('_') && part.endsWith('_') && part.length >= 2) {
            return { type: 'italic', text: part.slice(1, -1) };
        }
        return { type: 'text', text: part };
    }).filter(Boolean);
}

describe('WhatsApp & Markdown Rich Formatting Suite', () => {
    it('should format Markdown double asterisk **bold** correctly', () => {
        const tokens = parseFormattedTokens('- **Summary**: Project discussion overview');
        const boldTokens = tokens.filter(t => t.type === 'bold');
        assert.strictEqual(boldTokens.length, 1);
        assert.strictEqual(boldTokens[0].text, 'Summary');
    });

    it('should format WhatsApp single asterisk *bold* correctly', () => {
        const tokens = parseFormattedTokens('Please review this *urgent message* today.');
        const boldTokens = tokens.filter(t => t.type === 'bold');
        assert.strictEqual(boldTokens.length, 1);
        assert.strictEqual(boldTokens[0].text, 'urgent message');
    });

    it('should format AI catch-up summary headings like in the user screenshot', () => {
        const input = `- **Summary**: A brief check-in conversation between you and Rohit.
- **Key Points / Decisions**:
  - Established connection.
- **Action Items**:
  - Respond to message.`;

        const tokens = parseFormattedTokens(input);
        const boldHeaders = tokens.filter(t => t.type === 'bold').map(t => t.text);
        assert.deepStrictEqual(boldHeaders, [
            'Summary',
            'Key Points / Decisions',
            'Action Items'
        ]);
    });

    it('should format WhatsApp _italic_ correctly', () => {
        const tokens = parseFormattedTokens('This is _very important_ note.');
        const italicTokens = tokens.filter(t => t.type === 'italic');
        assert.strictEqual(italicTokens.length, 1);
        assert.strictEqual(italicTokens[0].text, 'very important');
    });

    it('should format WhatsApp ~strikethrough~ correctly', () => {
        const tokens = parseFormattedTokens('Meeting ~cancelled~ rescheduled to 5 PM.');
        const strikeTokens = tokens.filter(t => t.type === 'strike');
        assert.strictEqual(strikeTokens.length, 1);
        assert.strictEqual(strikeTokens[0].text, 'cancelled');
    });

    it('should format inline `code` correctly', () => {
        const tokens = parseFormattedTokens('Run `npm test` in the terminal.');
        const codeTokens = tokens.filter(t => t.type === 'code');
        assert.strictEqual(codeTokens.length, 1);
        assert.strictEqual(codeTokens[0].text, 'npm test');
    });

    it('should NOT format multiplication asterisks like 2 * 3 = 6 as bold', () => {
        const tokens = parseFormattedTokens('Calculate 2 * 3 = 6 in math');
        const boldTokens = tokens.filter(t => t.type === 'bold');
        assert.strictEqual(boldTokens.length, 0);
    });

    it('should NOT format snake_case identifiers as italic', () => {
        const tokens = parseFormattedTokens('Check user_account_id in database');
        const italicTokens = tokens.filter(t => t.type === 'italic');
        assert.strictEqual(italicTokens.length, 0);
    });
});
