import admin from 'firebase-admin';

const firebaseAdmin: any = admin;
let isFirebaseInitialized = false;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(serviceAccount),
    });
    isFirebaseInitialized = true;
    console.log('[Firebase] Initialized using FIREBASE_SERVICE_ACCOUNT env credentials.');
  } else {
    const fs = require('fs');
    const path = require('path');
    const saPath = path.resolve(__dirname, '../../firebase-service-account.json');
    if (fs.existsSync(saPath)) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(saPath),
      });
      isFirebaseInitialized = true;
      console.log('[Firebase] Initialized using firebase-service-account.json file.');
    } else {
      console.log('[Firebase] No credentials found. Push notifications will run in simulation mode.');
    }
  }
} catch (error) {
  console.error('[Firebase] Initialization failed:', error);
}

export class FirebaseService {
  static async sendPushNotification(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, string> = {}
  ): Promise<void> {
    const validTokens = tokens.filter(t => t && t.trim().length > 0);
    if (validTokens.length === 0) {
      console.log('[Firebase] No valid FCM tokens to send.');
      return;
    }

    if (!isFirebaseInitialized) {
      console.log(`[Firebase Simulation] Send Push Notification:
        Title: "${title}"
        Body: "${body}"
        Data: ${JSON.stringify(data)}
        To Tokens (${validTokens.length}): ${validTokens.join(', ')}`);
      return;
    }

    try {
      const response = await firebaseAdmin.messaging().sendEachForMulticast({
        tokens: validTokens,
        notification: {
          title,
          body,
        },
        data,
      });
      console.log(`[Firebase] Push notification request sent: ${response.successCount} success, ${response.failureCount} failed.`);
    } catch (error) {
      console.error('[Firebase] Failed to send multicast notification:', error);
    }
  }
}
