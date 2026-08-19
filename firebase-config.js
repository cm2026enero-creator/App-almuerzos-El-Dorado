// ============================================================================
// CONFIGURACIÓN DE FIREBASE (Realtime Database & Authentication)
// ============================================================================
// Para producción en GitHub Pages:
// 1. Ve a https://console.firebase.google.com/
// 2. Crea un proyecto ("Almuerzos-Fin-De-Semana")
// 3. Registra una aplicación Web y copia tus credenciales aquí abajo.
// 4. Habilita 'Authentication' (Método: Correo electrónico / Contraseña)
// 5. Habilita 'Realtime Database' (o Firestore) con reglas de lectura pública y escritura para pedidos.
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

// Variable global de estado de Firebase
let isFirebaseConfigured = false;
let db = null;
let auth = null;

// Inicialización de Firebase con fallback automático a LocalStorage (Demo Mode)
function initFirebaseApp() {
  try {
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "TU_API_KEY_AQUI" && !firebaseConfig.apiKey.includes("TU_API_KEY")) {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.database();
      auth = firebase.auth();
      isFirebaseConfigured = true;
      console.log("✅ Firebase inicializado correctamente en tiempo real.");
    } else {
      console.warn("⚠️ Firebase no configurado con credenciales reales. Usando motor local reactivo (LocalStorage Fallback).");
      isFirebaseConfigured = false;
    }
  } catch (error) {
    console.error("Error al inicializar Firebase:", error);
    isFirebaseConfigured = false;
  }
}

// Inicializar inmediatamente
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
  window.isFirebaseConfigured = isFirebaseConfigured;
  window.initFirebaseApp = initFirebaseApp;
}
