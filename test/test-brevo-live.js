#!/usr/bin/env node
require('dotenv').config();
const emailService = require('../backend/services/emailService');

async function runLiveBrevoTest() {
    console.log('\n' + '═'.repeat(60));
    console.log('🚀 [BREVO TRANSACTIONAL EMAIL - LIVE DIAGNOSTIC TOOL]');
    console.log('═'.repeat(60));

    const apiKey = (process.env.BREVO_API_KEY || '').trim();
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'robitkumbhar956@gmail.com').trim();
    const recipient = process.argv[2] || senderEmail;
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`\n📋 Configuration Overview:`);
    console.log(`   • Provider Preference : ${process.env.EMAIL_PROVIDER || 'brevo'}`);
    console.log(`   • Brevo API Key       : ${apiKey ? apiKey.substring(0, 12) + '...' + apiKey.slice(-4) : '❌ NOT CONFIGURED'}`);
    console.log(`   • Sender Email        : ${senderEmail}`);
    console.log(`   • Test Recipient      : ${recipient}`);
    console.log(`   • Generated Test OTP  : ${testOtp}`);

    if (!apiKey) {
        console.log('\n' + '─'.repeat(60));
        console.log('⚠️  BREVO_API_KEY is not set in .env.');
        console.log('   Follow these steps to get your 100% free Brevo API key:');
        console.log('   1. Sign up for free at https://www.brevo.com/ (no credit card required)');
        console.log('   2. Navigate to: Settings > SMTP & API > API Keys (or https://app.brevo.com/settings/keys/api)');
        console.log('   3. Click "Generate a new API key", name it (e.g. "SendChat Dev"), and copy it');
        console.log('   4. In your .env file, add:');
        console.log('      BREVO_API_KEY=xkeysib-your-copied-key');
        console.log('      BREVO_SENDER_EMAIL=' + senderEmail);
        console.log('   5. Re-run: npm run test:brevo [your-email@example.com]');
        console.log('─'.repeat(60) + '\n');
        process.exit(0);
    }

    console.log('\n⏳ Dispatching live test email via Brevo REST API (HTTPS port 443)...');

    try {
        const result = await emailService.sendSignupOtpEmail({
            email: recipient,
            name: 'SendChat Admin',
            otp: testOtp
        });

        console.log('\n' + '─'.repeat(60));
        if (result.provider === 'brevo') {
            console.log('✅ [SUCCESS] Email delivered successfully through Brevo Free Tier!');
            console.log(`   • Provider   : ${result.provider}`);
            console.log(`   • Message ID : ${result.messageId}`);
            console.log(`   • Recipient  : ${recipient}`);
            console.log(`   • Test OTP   : ${testOtp}`);
            console.log('   👉 Check your inbox (and spam/promotions folder) for the verification code.');
        } else if (result.devMode) {
            console.log('⚠️  [FALLBACK] Dispatch used console devMode fallback.');
            console.log(`   • Reason: ${result.deliveryError || 'All external providers failed'}`);
        } else {
            console.log(`ℹ️  [INFO] Dispatched via provider: ${result.provider}`);
            console.log(`   • Message ID: ${result.messageId}`);
        }
        console.log('─'.repeat(60) + '\n');
    } catch (err) {
        console.error('\n❌ [ERROR] Live test dispatch failed:');
        console.error(`   ${err.message}\n`);
        process.exit(1);
    }
}

runLiveBrevoTest();
