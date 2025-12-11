// ==========================================
// Firebase Configuration (ПУБЛІЧНІ ДАНІ - це ок!)
// ==========================================
// 
// ЦЕ НЕ СЕКРЕТ! Firebase Web SDK так працює.
// apiKey — це просто ідентифікатор проекту.
// Безпека через Firebase Security Rules + Authorized Domains.
//
// Отримай з: Firebase Console → Project Settings → Your apps → Web app
//

const firebaseConfig = {
  apiKey: "AIzaSy...",              // ← твій apiKey
  authDomain: "xxx.firebaseapp.com", // ← твій authDomain  
  projectId: "xxx",                  // ← твій projectId
  storageBucket: "xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

// ==========================================
// API URL — зміни на свій продакшн URL
// ==========================================
// Локально: http://localhost:3000/api
// Продакшн: https://api.yourdomain.com/api

const API_BASE_URL = "http://localhost:3000/api";

// ==========================================
// Ініціалізація Firebase
// ==========================================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
