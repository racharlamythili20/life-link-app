const nodemailer = require('nodemailer');
const logger = require('./logger');

const sendEmail = async (options) => {
  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Support both 'to' and 'email' formats
    const to = options.to || options.email;
    const subject = options.subject;
    const html = options.html;
    const text = options.text || options.message;

    // Define the email options
    const mailOptions = {
      from: `"LifeLink Support 🩸" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Error sending email:', error.message);
    // Don't crash registration if email service fails or is misconfigured,
    // but log it clearly and let the user register.
    throw error;
  }
};

module.exports = { sendEmail };
