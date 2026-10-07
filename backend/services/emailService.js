const nodemailer = require('nodemailer');

/**
 * Configure standard SMTP transporter
 * Supports:
 * 1. Gmail App Password (SMTP_HOST=smtp.gmail.com)
 * 2. Standard SMTP (Brevo, Mailtrap, SendGrid, Amazon SES)
 */
const createTransporter = () => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, GMAIL_USER, GMAIL_PASS } = process.env;

    const rawUser = SMTP_USER || GMAIL_USER;
    const rawPass = SMTP_PASS || GMAIL_PASS;

    if (!rawUser || !rawPass) {
        return null;
    }

    const cleanUser = rawUser.trim();
    // Google App Passwords often contain spaces (e.g. "wfke iowx nskn fbsz"). Sanitize to 16 continuous chars.
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

    // Standard SMTP (Brevo, Mailtrap, SendGrid, Amazon SES, etc.)
    if (SMTP_HOST) {
        return nodemailer.createTransport({
            host: SMTP_HOST.trim(),
            port: Number(SMTP_PORT) || 587,
            secure: Number(SMTP_PORT) === 465,
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
 * Send email via Resend HTTP API (HTTPS port 443 - 100% permitted on Render Free Tier!)
 */
const sendViaResend = async ({ email, name, otp, htmlContent }) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) return null;

    const from = process.env.RESEND_FROM || "SendChat Security <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${resendApiKey.trim()}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: from,
            to: [email],
            subject: `🔐 ${otp} is your SendChat verification code`,
            text: `Your SendChat verification code is: ${otp}. It expires in 5 minutes. Do not share it with anyone.`,
            html: htmlContent
        })
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || `Resend HTTP error ${res.status}`);
    }
    return data;
};

/**
 * Send email via Brevo (Sendinblue) HTTP API (HTTPS port 443 - 100% permitted on Render Free Tier!)
 */
const sendViaBrevo = async ({ email, name, otp, htmlContent }) => {
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) return null;

    const senderEmail = process.env.BREVO_SENDER || process.env.SMTP_USER || "robitkumbhar956@gmail.com";
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": brevoApiKey.trim(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            sender: { name: "SendChat Security", email: senderEmail },
            to: [{ email, name: name || "User" }],
            subject: `🔐 ${otp} is your SendChat verification code`,
            textContent: `Your SendChat verification code is: ${otp}. It expires in 5 minutes. Do not share it with anyone.`,
            htmlContent: htmlContent
        })
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || `Brevo HTTP error ${res.status}`);
    }
    return data;
};

/**
 * Send 6-digit login OTP email
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
            We received a verify your email address to create your SendChat account. Use the verification code below to complete sign-in:
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

    let deliveryError = null;

    // 1. Try Resend HTTP API first (Works on Render Free Tier via HTTPS port 443)
    if (process.env.RESEND_API_KEY) {
        try {
            const info = await sendViaResend({ email, name, otp, htmlContent });
            console.log(`📧 Signup OTP email dispatched via Resend HTTP API to ${email} (ID: ${info.id})`);
            return { success: true, messageId: info.id, provider: 'resend' };
        } catch (resendErr) {
            console.error('⚠️ Resend HTTP API failed:', resendErr.message);
            deliveryError = `Resend: ${resendErr.message}`;
        }
    }

    // 2. Try Brevo HTTP API (Works on Render Free Tier via HTTPS port 443)
    if (process.env.BREVO_API_KEY) {
        try {
            const info = await sendViaBrevo({ email, name, otp, htmlContent });
            console.log(`📧 Signup OTP email dispatched via Brevo HTTP API to ${email} (ID: ${info.messageId})`);
            return { success: true, messageId: info.messageId, provider: 'brevo' };
        } catch (brevoErr) {
            console.error('⚠️ Brevo HTTP API failed:', brevoErr.message);
            deliveryError = `Brevo: ${brevoErr.message}`;
        }
    }

    // 3. Fallback to standard SMTP (Gmail / Custom SMTP)
    const transporter = createTransporter();
    if (transporter) {
        try {
            const info = await transporter.sendMail({
                from: fromAddress,
                to: email,
                subject: `🔐 ${otp} is your SendChat verification code`,
                text: `Your SendChat verification code is: ${otp}. It expires in 5 minutes. Do not share it with anyone.`,
                html: htmlContent,
            });
            console.log(`📧 Login OTP email dispatched successfully to ${email} (Message ID: ${info.messageId})`);
            return { success: true, messageId: info.messageId, provider: 'smtp' };
        } catch (err) {
            deliveryError = err.message;
            console.error('\n' + '═'.repeat(60));
            console.error('❌ [SMTP DISPATCH ERROR] Email delivery failed:');
            console.error(`   To      : ${email}`);
            console.error(`   From    : ${fromAddress}`);
            console.error(`   Reason  : ${deliveryError}`);

            if (process.env.RENDER) {
                console.error('\n🚨 [RENDER FREE TIER NOTICE]');
                console.error('   Render.com blocks outgoing SMTP ports (25, 465, 587) on Free Tier.');
                console.error('   To receive real emails in your inbox on Render Free Tier:');
                console.error('   👉 Add RESEND_API_KEY (free from resend.com) in Render Environment variables.');
                console.error('   OR check your Render Logs below to see the OTP code instantly.');
            }
            console.error('═'.repeat(60) + '\n');
        }
    }

    // Console Fallback so user/developer is NEVER locked out of logging in
    console.log('\n' + '═'.repeat(60));
    console.log('🔐 [SENDCHAT SECURITY] SIGNUP VERIFICATION CODE DISPATCH');
    console.log(`👤 Recipient : ${name || 'User'} <${email}>`);
    console.log(`🔢 OTP Code  : >>> ${otp} <<<`);
    console.log('⏱  Valid For : 5 Minutes (Single-Use)');
    if (deliveryError) {
        console.log(`⚠️  Status    : Delivery failed (${deliveryError.split('\n')[0]}). Used console fallback.`);
    }
    console.log('═'.repeat(60) + '\n');

    return { success: true, devMode: true, deliveryError, otp };
};

module.exports = {
    sendSignupOtpEmail,
    sendLoginOtpEmail: sendSignupOtpEmail,
};
