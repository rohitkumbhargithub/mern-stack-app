const nodemailer = require('nodemailer');

/**
 * Configure email transporter
 * Supports:
 * 1. Standard SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 * 2. Gmail App Password (GMAIL_USER, GMAIL_PASS)
 * 3. Fallback Development Mode (logs OTP directly in server console with formatted preview)
 */
const createTransporter = () => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, GMAIL_USER, GMAIL_PASS } = process.env;

    const rawUser = SMTP_USER || GMAIL_USER;
    const rawPass = SMTP_PASS || GMAIL_PASS;

    if (!rawUser || !rawPass) {
        return null;
    }

    const cleanUser = rawUser.trim();
    // Google App Passwords often contain spaces (e.g. "fveg kytz gbso ocwh"). Sanitize to 16 continuous chars.
    const cleanPass = rawPass.replace(/\s+/g, '').trim();

    // If host is Gmail or GMAIL_USER is provided, use nodemailer's dedicated Gmail service profile
    if ((SMTP_HOST && SMTP_HOST.toLowerCase().includes('gmail')) || GMAIL_USER) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: cleanUser,
                pass: cleanPass,
            },
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
            tls: {
                rejectUnauthorized: false,
            },
        });
    }

    return null;
};

/**
 * Send 6-digit login OTP email
 * @param {Object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.name - User display name
 * @param {string} params.otp - 6-digit OTP string
 */
const sendLoginOtpEmail = async ({ email, name, otp }) => {
    const rawUser = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
    
    // For Gmail and strict SMTP relays, sender address must match authenticated user
    let fromAddress = process.env.EMAIL_FROM;
    if (!fromAddress || fromAddress.includes('sendchat.app')) {
        fromAddress = rawUser ? `"SendChat Security" <${rawUser}>` : '"SendChat Security" <security@sendchat.app>';
    }

    const transporter = createTransporter();

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
            We received a request to log in to your SendChat account. Use the verification code below to complete sign-in:
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

    // If SMTP transporter is configured, attempt sending real email
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
            return { success: true, messageId: info.messageId };
        } catch (err) {
            deliveryError = err.message;
            console.error('\n' + '═'.repeat(60));
            console.error('❌ [SMTP DISPATCH ERROR] Email delivery failed:');
            console.error(`   To      : ${email}`);
            console.error(`   From    : ${fromAddress}`);
            console.error(`   Reason  : ${deliveryError}`);
            if (deliveryError.includes('535') || deliveryError.includes('BadCredentials')) {
                console.error('\n💡 [DIAGNOSIS: GOOGLE BAD CREDENTIALS]');
                console.error('   Google rejected the username/app password combination.');
                console.error('   Common causes:');
                console.error('   1. 2-Step Verification is OFF on this Google account.');
                console.error('   2. The App Password was generated for a different Google account.');
                console.error('   3. Generate a fresh 16-letter App Password at: https://myaccount.google.com/apppasswords');
            }
            console.error('═'.repeat(60) + '\n');
        }
    }

    // Terminal Fallback so the developer/user is NEVER blocked from logging in
    console.log('\n' + '═'.repeat(60));
    console.log('🔐 [SENDCHAT SECURITY] LOGIN VERIFICATION CODE DISPATCH');
    console.log(`👤 Recipient : ${name || 'User'} <${email}>`);
    console.log(`🔢 OTP Code  : >>> ${otp} <<<`);
    console.log('⏱  Valid For : 5 Minutes (Single-Use)');
    if (deliveryError) {
        console.log(`⚠️  Status    : SMTP Delivery Failed (${deliveryError.split('\n')[0]}). Used console fallback.`);
    } else {
        console.log('💡 Note      : To receive real emails, set SMTP_HOST & SMTP_USER in .env');
    }
    console.log('═'.repeat(60) + '\n');

    return { success: true, devMode: true, deliveryError };
};

module.exports = {
    sendLoginOtpEmail,
};
