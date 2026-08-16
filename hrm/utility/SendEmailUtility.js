// 📁 utility/SendEmailUtility.js
const nodemailer = require('nodemailer');

async function SendEmailUtility(EmailTo, EmailSubject, EmailText, EmailHTML = null) {
    console.log('📧 SendEmailUtility called:', { 
        to: EmailTo, 
        subject: EmailSubject 
    });
    
    // Debug environment variables
    console.log('🔧 ENV Variables:', {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        hasPassword: !!process.env.EMAIL_PASSWORD,
        secure: process.env.EMAIL_SECURE
    });

    try {
        // ✅ Correct Hostinger SMTP configuration
        const emailPort = parseInt(process.env.EMAIL_PORT) || 465;
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
            port: emailPort,
            // Honour EMAIL_SECURE from env; default true for the SSL port 465
            secure: process.env.EMAIL_SECURE
                ? process.env.EMAIL_SECURE === 'true'
                : emailPort === 465,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                // Do NOT reject unauthorized for Hostinger
                rejectUnauthorized: false
            }
        });

        // Verify SMTP connection first
        console.log('🔄 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP Connection verified!');

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: EmailTo,
            subject: EmailSubject,
            text: EmailText,
            html: EmailHTML || `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; color: white; text-align: center;">
                        <h1 style="margin: 0;">A2IT HRM System</h1>
                    </div>
                    <div style="padding: 30px; background: #f9f9f9;">
                        <h2>${EmailSubject}</h2>
                        <div style="white-space: pre-line; line-height: 1.6;">
                            ${EmailText.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                    <div style="padding: 20px; background: #eee; text-align: center; font-size: 12px; color: #666;">
                        © ${new Date().getFullYear()} A2IT Ltd. All rights reserved.
                    </div>
                </div>
            `,
            // Important headers for deliverability
            headers: {
                'X-Priority': '1',
                'X-Mailer': 'A2IT HRM',
                'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER || ''}>`
            }
        };

        console.log('📤 Sending email...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Email sent successfully!', {
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected
        });
        
        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        };
        
    } catch (error) {
        console.error('❌ SMTP Error:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        // User-friendly error messages
        let userError = 'Failed to send email. Please try again.';
        
        if (error.code === 'EAUTH') {
            userError = 'Email authentication failed. Please check email credentials.';
        } else if (error.code === 'ECONNECTION') {
            userError = 'Cannot connect to email server. Please check your internet connection.';
        } else if (error.message.includes('Invalid login')) {
            userError = 'Invalid email credentials. Please check your email username and password.';
        }
        
        throw new Error(userError);
    }
}

module.exports = SendEmailUtility;