/**
 * Link Preview Service
 * Handles metadata extraction, OpenGraph parsing, SSRF protection,
 * and specialized rich preview cards for Google Meet, Zoom, MS Teams, YouTube, etc.
 */

const previewCache = new Map(); // url -> { data, timestamp }
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Validate and sanitize URL against SSRF attacks
 */
function validateUrl(targetUrl) {
    if (!targetUrl || typeof targetUrl !== 'string') {
        throw new Error('URL is required');
    }

    const trimmed = targetUrl.trim();
    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch {
        throw new Error('Invalid URL format');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only HTTP and HTTPS protocols are permitted');
    }

    const hostname = parsed.hostname.toLowerCase();

    // SSRF Guard: Prevent scanning localhost, cloud metadata, or private RFC1918 subnets
    if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '0.0.0.0' ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.localhost') ||
        /^10\./.test(hostname) ||
        /^192\.168\./.test(hostname) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
        /^169\.254\./.test(hostname)
    ) {
        throw new Error('Access to private network or local addresses is prohibited');
    }

    return parsed;
}

/**
 * Extract YouTube video ID
 */
function extractYouTubeId(urlObj) {
    if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1).split(/[?#&]/)[0];
    }
    if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v');
    }
    return null;
}

/**
 * Extract Google Meet code
 */
function extractGoogleMeetCode(urlObj) {
    if (urlObj.hostname === 'meet.google.com') {
        const path = urlObj.pathname.replace(/^\/+/, '').split(/[?#&]/)[0];
        // Typical Google Meet code is 3-4-3 chars e.g. khh-qemj-gru or similar
        if (path && path.length >= 3) {
            return path;
        }
    }
    return null;
}

/**
 * Extract Zoom meeting ID
 */
function extractZoomId(urlObj) {
    if (urlObj.hostname.includes('zoom.us')) {
        const match = urlObj.pathname.match(/\/j\/(\d+)/);
        return match ? match[1] : null;
    }
    return null;
}

/**
 * Simple HTML tag and entity cleaner
 */
function cleanText(str) {
    if (!str) return '';
    return str
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract metadata from HTML string
 */
function parseHtmlMetadata(html, baseUrl) {
    const getTagAttr = (tagRegex, attrName) => {
        const match = html.match(tagRegex);
        if (!match) return null;
        const attrRegex = new RegExp(`${attrName}=["']([^"']+)["']`, 'i');
        const attrMatch = match[0].match(attrRegex);
        return attrMatch ? cleanText(attrMatch[1]) : null;
    };

    // OpenGraph Title or document title
    let title =
        getTagAttr(/<meta[^>]+property=["']og:title["'][^>]*>/i, 'content') ||
        getTagAttr(/<meta[^>]+name=["']twitter:title["'][^>]*>/i, 'content');

    if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) title = cleanText(titleMatch[1]);
    }

    // OpenGraph Description or meta description
    let description =
        getTagAttr(/<meta[^>]+property=["']og:description["'][^>]*>/i, 'content') ||
        getTagAttr(/<meta[^>]+name=["']twitter:description["'][^>]*>/i, 'content') ||
        getTagAttr(/<meta[^>]+name=["']description["'][^>]*>/i, 'content');

    // OpenGraph Image
    let image =
        getTagAttr(/<meta[^>]+property=["']og:image["'][^>]*>/i, 'content') ||
        getTagAttr(/<meta[^>]+name=["']twitter:image["'][^>]*>/i, 'content') ||
        getTagAttr(/<link[^>]+rel=["']image_src["'][^>]*>/i, 'href');

    // Site Name
    let siteName =
        getTagAttr(/<meta[^>]+property=["']og:site_name["'][^>]*>/i, 'content');

    // Favicon
    let favicon =
        getTagAttr(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*>/i, 'href');

    // Resolve relative URLs
    if (image && !image.startsWith('http')) {
        try { image = new URL(image, baseUrl).href; } catch { image = null; }
    }

    if (favicon && !favicon.startsWith('http')) {
        try { favicon = new URL(favicon, baseUrl).href; } catch { favicon = null; }
    }

    return { title, description, image, siteName, favicon };
}

/**
 * Fetch and extract rich link preview
 */
async function getLinkPreviewData(rawUrl) {
    const parsedUrl = validateUrl(rawUrl);
    const normalizedUrl = parsedUrl.href;

    // Check in-memory cache
    const cached = previewCache.get(normalizedUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
    }

    const domain = parsedUrl.hostname.replace(/^www\./, '');
    const defaultFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    // 1. Google Meet Special Handling
    const meetCode = extractGoogleMeetCode(parsedUrl);
    if (meetCode) {
        const data = {
            url: normalizedUrl,
            domain: 'meet.google.com',
            siteName: 'Google Meet',
            title: 'Google Meet Video Call',
            description: `Meeting code: ${meetCode} • Join real-time video conference with your team`,
            image: 'https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-96dp/logo_meet_2020q4_color_2x_web_96dp.png',
            favicon: 'https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-96dp/logo_meet_2020q4_color_2x_web_96dp.png',
            isMeeting: true,
            meetingType: 'google_meet',
            meetingCode: meetCode,
            joinUrl: normalizedUrl,
        };
        previewCache.set(normalizedUrl, { data, timestamp: Date.now() });
        return data;
    }

    // 2. Zoom Special Handling
    const zoomId = extractZoomId(parsedUrl);
    if (zoomId || parsedUrl.hostname.includes('zoom.us')) {
        const data = {
            url: normalizedUrl,
            domain: 'zoom.us',
            siteName: 'Zoom',
            title: zoomId ? `Zoom Meeting (${zoomId})` : 'Zoom Video Meeting',
            description: zoomId ? `Meeting ID: ${zoomId} • Click to join Zoom video conference` : 'Join Zoom meeting',
            image: 'https://st1.zoom.us/zoom.ico',
            favicon: 'https://st1.zoom.us/zoom.ico',
            isMeeting: true,
            meetingType: 'zoom',
            meetingCode: zoomId || '',
            joinUrl: normalizedUrl,
        };
        previewCache.set(normalizedUrl, { data, timestamp: Date.now() });
        return data;
    }

    // 3. Microsoft Teams Special Handling
    if (parsedUrl.hostname.includes('teams.microsoft.com') || parsedUrl.hostname.includes('teams.live.com')) {
        const data = {
            url: normalizedUrl,
            domain: 'teams.microsoft.com',
            siteName: 'Microsoft Teams',
            title: 'Microsoft Teams Video Meeting',
            description: 'Click to connect and collaborate in Microsoft Teams video call',
            image: 'https://statics.teams.cdn.office.net/evergreen-assets/icons/favicon.ico',
            favicon: 'https://statics.teams.cdn.office.net/evergreen-assets/icons/favicon.ico',
            isMeeting: true,
            meetingType: 'teams',
            joinUrl: normalizedUrl,
        };
        previewCache.set(normalizedUrl, { data, timestamp: Date.now() });
        return data;
    }

    // 4. YouTube Special Handling
    const ytVideoId = extractYouTubeId(parsedUrl);
    if (ytVideoId) {
        const data = {
            url: normalizedUrl,
            domain: 'youtube.com',
            siteName: 'YouTube',
            title: 'YouTube Video',
            description: `Watch video on YouTube (${ytVideoId})`,
            image: `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`,
            favicon: 'https://www.youtube.com/s/desktop/favicon.ico',
            isVideo: true,
            youtubeId: ytVideoId,
        };
        // We will try fetching real title below, but keep this as fallback
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
                const oembed = await res.json();
                if (oembed.title) data.title = oembed.title;
                if (oembed.author_name) data.description = `By ${oembed.author_name} • Watch on YouTube`;
                if (oembed.thumbnail_url) data.image = oembed.thumbnail_url;
            }
        } catch {
            // Fallback stays in place
        }
        previewCache.set(normalizedUrl, { data, timestamp: Date.now() });
        return data;
    }

    // 5. Generic Website Fetching
    let meta = { title: null, description: null, image: null, siteName: null, favicon: null };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(normalizedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (compatible; SendChat/1.0; +https://sendchat.app)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            signal: controller.signal,
            redirect: 'follow',
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
            // Stream first 70KB to quickly extract <head>
            const reader = response.body.getReader();
            let htmlChunks = '';
            let bytesRead = 0;
            const maxBytes = 70 * 1024; // 70KB

            while (bytesRead < maxBytes) {
                const { done, value } = await reader.read();
                if (done || !value) break;
                htmlChunks += new TextDecoder('utf-8').decode(value, { stream: true });
                bytesRead += value.length;
                if (htmlChunks.includes('</head>') || htmlChunks.includes('</HEAD>')) break;
            }
            reader.cancel().catch(() => {});

            meta = parseHtmlMetadata(htmlChunks, normalizedUrl);
        }
    } catch (err) {
        // Network or timeout error: fallback to domain information
    }

    const data = {
        url: normalizedUrl,
        domain: domain,
        siteName: meta.siteName || domain,
        title: meta.title || domain,
        description: meta.description || `Visit ${domain}`,
        image: meta.image || null,
        favicon: meta.favicon || defaultFavicon,
        isMeeting: false,
    };

    previewCache.set(normalizedUrl, { data, timestamp: Date.now() });
    return data;
}

module.exports = {
    getLinkPreviewData,
    validateUrl,
    extractGoogleMeetCode,
    extractZoomId,
    extractYouTubeId,
    parseHtmlMetadata,
};
