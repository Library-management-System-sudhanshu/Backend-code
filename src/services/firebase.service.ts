import { initializeApp, cert, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';

let firebaseApp: App | null = null;
let isFirebaseInitialized = false;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
    });
    isFirebaseInitialized = true;
    console.log('[Firebase] Initialized using FIREBASE_SERVICE_ACCOUNT env credentials.');
  } else {
    const saPath = path.resolve(__dirname, '../../firebase-service-account.json');
    if (fs.existsSync(saPath)) {
      firebaseApp = initializeApp({
        credential: cert(saPath),
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

    if (!isFirebaseInitialized || !firebaseApp) {
      console.log(`[Firebase Simulation] Send Push Notification:
        Title: "${title}"
        Body: "${body}"
        Data: ${JSON.stringify(data)}
        To Tokens (${validTokens.length}): ${validTokens.join(', ')}`);
      return;
    }

    try {
      const response = await getMessaging(firebaseApp).sendEachForMulticast({
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
