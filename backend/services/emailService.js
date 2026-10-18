const nodemailer = require('nodemailer');

/**
 * Configure standard SMTP transporter
 * Supports:
 * 1. Brevo SMTP Relay (SMTP_HOST=smtp-relay.brevo.com, port 587)
 * 2. Gmail App Password (SMTP_HOST=smtp.gmail.com)
 * 3. Standard SMTP (Mailtrap, SendGrid, Amazon SES)
 */
const createTransporter = () => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, GMAIL_USER, GMAIL_PASS } = process.env;

    const rawUser = SMTP_USER || GMAIL_USER;
    const rawPass = SMTP_PASS || GMAIL_PASS;

    if (!rawUser || !rawPass) {
        return null;
    }

    const cleanUser = rawUser.trim();
    // Passwords often contain spaces (e.g. Gmail App Passwords "wfke iowx nskn fbsz"). Sanitize.
    const cleanPass = rawPass.replace(/\s+/g, '').trim();

    // If host is Gmail or GMAIL_USER is provided, use nodemailer's dedicated Gmail service profile
    if ((SMTP_HOST && SMTP_HOST.toLowerCase().includes('gmail')) || GMAIL_USER) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: cleanUser,
                pass: cleanPass,
            },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000,
        });
    }

    // Standard SMTP (Brevo Relay, Mailtrap, SendGrid, Amazon SES, etc.)
    if (SMTP_HOST) {
        const port = Number(SMTP_PORT) || 587;
        return nodemailer.createTransport({
            host: SMTP_HOST.trim(),
            port: port,
            secure: port === 465,
            auth: {
                user: cleanUser,
                pass: cleanPass,
            },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 10000,
            tls: {
                rejectUnauthorized: false,
            },
        });
    }

    return null;
};

/**
 * Helper to log actionable troubleshooting tips for Brevo
 */
const logBrevoHelp = (errorMessage = '') => {
    const msg = String(errorMessage).toLowerCase();
    console.error('\n' + '═'.repeat(60));
    console.error('🚨 [BREVO TRANSACTIONAL EMAIL ASSISTANCE]');
    if (msg.includes('key not found') || msg.includes('unauthorized') || msg.includes('401')) {
        console.error('   👉 Cause : Invalid or missing Brevo API key.');
        console.error('   👉 Fix   : Get your free API key at https://app.brevo.com/settings/keys/api');
        console.error('   👉 Env   : Set BREVO_API_KEY=xkeysib-... in your .env');
    } else if (msg.includes('sender') || msg.includes('not confirmed') || msg.includes('registered')) {
        console.error('   👉 Cause : Sender email is not verified in your Brevo account.');
        console.error('   👉 Fix   : Verify your sender at https://app.brevo.com/senders');
        console.error('   👉 Env   : Set BREVO_SENDER_EMAIL to your verified Brevo account email.');
    } else if (msg.includes('credit') || msg.includes('quota') || msg.includes('402')) {
        console.error('   👉 Cause : Daily free quota reached (300 emails/day).');
        console.error('   👉 Fix   : Limit resets daily at 00:00 UTC.');
    } else {
        console.error(`   👉 Error : ${errorMessage}`);
        console.error('   👉 Docs  : https://developers.brevo.com/docs/send-a-transactional-email');
    }
    console.error('═'.repeat(60) + '\n');
};

/**
 * Send email via Brevo (Sendinblue) HTTP API (HTTPS port 443 - 100% permitted on Render Free Tier!)
 * Free tier offers 300 free emails/day to ANY email address.
 */
const sendViaBrevo = async ({ email, name, otp, htmlContent, subject, textContent }) => {
    const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
    if (!brevoApiKey) return null;

    const senderEmail = (
        process.env.BREVO_SENDER_EMAIL ||
        process.env.BREVO_SENDER ||
        process.env.SMTP_USER ||
        "robitkumbhar956@gmail.com"
    ).trim();

    const senderName = (
        process.env.BREVO_SENDER_NAME ||
        "SendChat Security"
    ).trim();

    const emailSubject = subject || `🔐 ${otp} is your SendChat verification code`;
    const emailText = textContent || `Your SendChat verification code is: ${otp}. It expires in 5 minutes. Do not share it with anyone.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let res;
    try {
        res = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": brevoApiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sender: { name: senderName, email: senderEmail },
                to: [{ email: email.trim(), name: (name || "User").trim() }],
                subject: emailSubject,
                textContent: emailText,
                htmlContent: htmlContent
            }),
            signal: controller.signal
        });
    } catch (fetchErr) {
        if (fetchErr.name === 'AbortError') {
            throw new Error("Brevo HTTP request timed out after 10 seconds");
        }
        throw fetchErr;
    } finally {
        clearTimeout(timeoutId);
    }

    const responseText = await res.text();
    let data = {};
    try {
        data = responseText ? JSON.parse(responseText) : {};
    } catch {
        data = { message: responseText };
    }

    if (!res.ok) {
        const errorMsg = data.message || data.error || `Brevo HTTP error ${res.status}`;
        throw new Error(errorMsg);
    }

    return {
        ...data,
        messageId: data.messageId || data.id,
    };
};

/**
 * Send email via Resend HTTP API (HTTPS port 443 - permitted on Render Free Tier)
 * Note: Resend Free Tier sandbox (onboarding@resend.dev) only allows sending to the account owner email.
 */
const sendViaResend = async ({ email, name, otp, htmlContent, subject, textContent }) => {
    const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
    if (!resendApiKey) return null;

    const from = (process.env.RESEND_FROM || "SendChat Security <onboarding@resend.dev>").trim();
    const emailSubject = subject || `🔐 ${otp} is your SendChat verification code`;
    const emailText = textContent || `Your SendChat verification code is: ${otp}. It expires in 5 minutes. Do not share it with anyone.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let res;
    try {
        res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: from,
                to: [email.trim()],
                subject: emailSubject,
                text: emailText,
                html: htmlContent
            }),
            signal: controller.signal
        });
    } catch (fetchErr) {
        if (fetchErr.name === 'AbortError') {
            throw new Error("Resend HTTP request timed out after 10 seconds");
        }
        throw fetchErr;
    } finally {
        clearTimeout(timeoutId);
    }

    const responseText = await res.text();
    let data = {};
    try {
        data = responseText ? JSON.parse(responseText) : {};
    } catch {
        data = { message: responseText };
    }

    if (!res.ok) {
        throw new Error(data.message || `Resend HTTP error ${res.status}`);
    }
    return data;
};

/**
 * Send 6-digit signup/login OTP email
 * Provider strategy:
 * 1. Brevo HTTP API (Default & recommended: 300 free emails/day to any recipient, port 443)
 * 2. Brevo SMTP / Standard SMTP (smtp-relay.brevo.com, port 587)
 * 3. Resend HTTP API (if configured)
 * 4. Dev / Console fallback (never blocks signup/testing)
 *
 * @param {Object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.name - User display name
 * @param {string} params.otp - 6-digit OTP string
 */
const sendSignupOtpEmail = async ({ email, name, otp }) => {
    const rawUser = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
    
    // For Gmail and strict SMTP relays, sender address must match authenticated user
    let fromAddress = process.env.EMAIL_FROM;
    if (!fromAddress || fromAddress.includes('sendchat.app') || fromAddress.includes('"')) {
        fromAddress = rawUser ? `"SendChat Security" <${rawUser}>` : `"SendChat Security" <security@sendchat.app>`;
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SendChat Security Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; color: #1e293b; }
        .container { max-width: 520px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 8px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 36px 32px; text-align: center; }
        .greeting { font-size: 16px; margin-bottom: 16px; color: #334155; }
        .message { font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 28px; }
        .otp-box { background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; margin: 0 auto 28px; max-width: 320px; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e293b; margin: 0; }
        .expiry-note { font-size: 12px; color: #ef4444; font-weight: 600; margin-top: 8px; margin-bottom: 0; }
        .security-warning { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; text-align: left; font-size: 12px; color: #991b1b; margin-bottom: 24px; }
        .footer { background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SendChat Security</h1>
          <p>Real-Time Encrypted AI Messaging</p>
        </div>
        <div class="content">
          <div class="greeting">Hello <strong>${name || 'there'}</strong>,</div>
          <div class="message">
            We received a request to verify your email address for your SendChat account. Use the verification code below to complete sign-up:
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <p class="expiry-note">⏱ Code expires in 5 minutes</p>
          </div>
          <div class="security-warning">
            <strong>Security Tip:</strong> Never share this code with anyone. SendChat staff will never ask for your verification code. If you did not initiate this request, change your password immediately.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} SendChat. All rights reserved.<br>
          Automated security dispatch. Please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
    `;

    const preferredProvider = (process.env.EMAIL_PROVIDER || 'brevo').toLowerCase().trim();
    let deliveryError = null;

    // Helper to attempt Brevo HTTP API
    const tryBrevoApi = async () => {
        if (!process.env.BREVO_API_KEY) return null;
        try {
            const info = await sendViaBrevo({ email, name, otp, htmlContent });
            console.log(`📧 OTP email dispatched via Brevo HTTP API to ${email} (Message ID: ${info.messageId})`);
            return { success: true, messageId: info.messageId, provider: 'brevo' };
        } catch (err) {
            console.error('⚠️ Brevo HTTP API failed:', err.message);
            logBrevoHelp(err.message);
            deliveryError = `Brevo: ${err.message}`;
            return null;
        }
    };

    // Helper to attempt SMTP (Brevo Relay, Gmail, or Custom SMTP)
    const trySmtp = async () => {
        const transporter = createTransporter();
        if (!transporter) return null;
        try {
            const info = await transporter.sendMail({
                from: fromAddress,
                to: email,
                subject: `🔐 ${otp} is your SendChat verification code`,
                text: `Your SendChat verification code is: ${otp}. It expires in 5 minutes. Do not share it with anyone.`,
                html: htmlContent,
            });
            console.log(`📧 OTP email dispatched via SMTP to ${email} (Message ID: ${info.messageId})`);
            return { success: true, messageId: info.messageId, provider: 'smtp' };
        } catch (err) {
            deliveryError = `SMTP: ${err.message}`;
            console.error('⚠️ SMTP delivery failed:', err.message);
            if (process.env.RENDER) {
                console.error('🚨 [RENDER FREE TIER NOTICE] Outgoing SMTP ports (25, 465, 587) are blocked on Render free tier. Use Brevo HTTP API instead.');
            }
            return null;
        }
    };

    // Helper to attempt Resend HTTP API
    const tryResendApi = async () => {
        if (!process.env.RESEND_API_KEY) return null;
        try {
            const info = await sendViaResend({ email, name, otp, htmlContent });
            console.log(`📧 OTP email dispatched via Resend HTTP API to ${email} (ID: ${info.id})`);
            return { success: true, messageId: info.id, provider: 'resend' };
        } catch (err) {
            console.error('⚠️ Resend HTTP API failed:', err.message);
            if (err.message && (err.message.includes('only send testing emails') || err.message.includes('verify a domain'))) {
                console.error('🚨 [RESEND TEST RESTRICTION] Resend sandbox only sends to account owner email. Switch to Brevo for free sending to any email.');
            }
            deliveryError = `Resend: ${err.message}`;
            return null;
        }
    };

    // 1. Try preferred provider first
    let result = null;
    if (preferredProvider === 'brevo') {
        result = await tryBrevoApi();
        if (!result) result = await trySmtp();
        if (!result) result = await tryResendApi();
    } else if (preferredProvider === 'resend') {
        result = await tryResendApi();
        if (!result) result = await tryBrevoApi();
        if (!result) result = await trySmtp();
    } else if (preferredProvider === 'smtp') {
        result = await trySmtp();
        if (!result) result = await tryBrevoApi();
        if (!result) result = await tryResendApi();
    } else {
        // Default cascade: Brevo API -> SMTP -> Resend API
        result = await tryBrevoApi();
        if (!result) result = await trySmtp();
        if (!result) result = await tryResendApi();
    }

    if (result && result.success) {
        return result;
    }

    // 4. Console Fallback so developers/users are NEVER locked out of signing up
    console.log('\n' + '═'.repeat(60));
    console.log('🔐 [SENDCHAT SECURITY] SIGNUP VERIFICATION CODE DISPATCH');
    console.log(`👤 Recipient : ${name || 'User'} <${email}>`);
    console.log(`🔢 OTP Code  : >>> ${otp} <<<`);
    console.log('⏱  Valid For : 5 Minutes (Single-Use)');
    if (deliveryError) {
        console.log(`⚠️  Status    : Delivery failed (${deliveryError.split('\n')[0]}). Used console fallback.`);
    } else {
        console.log('💡 Note      : Configure BREVO_API_KEY in .env for real email delivery (300/day free).');
    }
    console.log('═'.repeat(60) + '\n');

    return { success: true, devMode: true, deliveryError, otp };
};

module.exports = {
    sendSignupOtpEmail,
    sendLoginOtpEmail: sendSignupOtpEmail,
    sendViaBrevo,
    sendViaResend,
    createTransporter,
    logBrevoHelp,
};
