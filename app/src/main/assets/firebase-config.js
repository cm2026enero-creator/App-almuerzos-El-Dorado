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
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "tu-proyecto.firebaseapp.com",
  databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
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
