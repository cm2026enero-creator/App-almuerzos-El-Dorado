// ============================================================================
// FIREBASE-CONFIG.JS - CONEXIÓN A REALTIME DATABASE & AUTH
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyCBR_auqkJGUTcyD7OSziAGsD03ys7QNYQ",
  authDomain: "almuerzos-27a0b.firebaseapp.com",
  databaseURL: "https://almuerzos-27a0b-default-rtdb.firebaseio.com",
  projectId: "almuerzos-27a0b",
  storageBucket: "almuerzos-27a0b.firebasestorage.app",
  messagingSenderId: "724783685178",
  appId: "1:724783685178:web:d56ac85ad9c0a242c01f03",
  measurementId: "G-BER65WSV1G"
};

let isFirebaseConfigured = false;
let db = null;
let auth = null;

function initFirebaseApp() {
  try {
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey) {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.database();
      auth = firebase.auth();
      isFirebaseConfigured = true;
      console.log("✅ Firebase inicializado correctamente en Realtime Database:", firebaseConfig.databaseURL);
    } else {
      console.warn("⚠️ SDK de Firebase no cargado aún. Activando modo local reactivo.");
      isFirebaseConfigured = false;
    }
  } catch (error) {
    console.error("Error al inicializar Firebase:", error);
    isFirebaseConfigured = false;
  }
}

// Inicialización automática
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
  window.isFirebaseConfigured = isFirebaseConfigured;
  window.initFirebaseApp = initFirebaseApp;
  initFirebaseApp();
}
