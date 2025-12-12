import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Перевіряємо чи є всі необхідні змінні
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;

let firebaseInitialized = false;

if (!FIREBASE_PROJECT_ID || !FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
  console.error('❌ Firebase credentials missing!');
  console.error('   FIREBASE_PROJECT_ID:', FIREBASE_PROJECT_ID ? '✓ set' : '✗ MISSING');
  console.error('   FIREBASE_PRIVATE_KEY:', FIREBASE_PRIVATE_KEY ? '✓ set' : '✗ MISSING');
  console.error('   FIREBASE_CLIENT_EMAIL:', FIREBASE_CLIENT_EMAIL ? '✓ set' : '✗ MISSING');
  console.error('');
  console.error('   Отримайте credentials з Firebase Console:');
  console.error('   Project Settings → Service Accounts → Generate new private key');
} else {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: FIREBASE_CLIENT_EMAIL,
        }),
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
      console.log('   Project:', FIREBASE_PROJECT_ID);
    } catch (error: any) {
      console.error('❌ Firebase initialization error:', error.message);
    }
  } else {
    firebaseInitialized = true;
  }
}

// Таймаут для Firebase операцій (10 секунд)
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), ms)
    )
  ]);
};

export const verifyFirebaseToken = async (idToken: string) => {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized. Check server logs for credential errors.');
  }
  
  if (!idToken) {
    throw new Error('Firebase token is required');
  }

  try {
    const decodedToken = await withTimeout(
      admin.auth().verifyIdToken(idToken),
      10000,
      'Firebase token verification timeout'
    );
    return decodedToken;
  } catch (error: any) {
    console.error('Firebase token verification error:', error.message);
    if (error.message.includes('timeout')) {
      throw new Error('Firebase service timeout. Please try again.');
    }
    throw new Error('Invalid Firebase token: ' + error.message);
  }
};

export const getUserById = async (uid: string) => {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized. Check server logs for credential errors.');
  }

  try {
    const user = await withTimeout(
      admin.auth().getUser(uid),
      10000,
      'Firebase getUser timeout'
    );
    return user;
  } catch (error: any) {
    console.error('Firebase getUser error:', error.message);
    if (error.message.includes('timeout')) {
      throw new Error('Firebase service timeout. Please try again.');
    }
    throw new Error('User not found: ' + error.message);
  }
};

export const isFirebaseInitialized = () => firebaseInitialized;

