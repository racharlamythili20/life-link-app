// src/config/firebase.js
const admin = require('firebase-admin');
const logger = require('../utils/logger');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID?.replace(/^["']|["']$/g, '');
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/^["']|["']$/g, '')?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.replace(/^["']|["']$/g, '');

  if (!projectId || !privateKey || !clientEmail) {
    logger.warn('⚠️ Firebase Admin SDK config is missing required environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Push notifications and Firebase Google Auth will be disabled until keys are configured.');
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });
      logger.info('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      logger.error(`❌ Failed to initialize Firebase Admin SDK: ${error.message}`);
    }
  }
}

module.exports = admin;
