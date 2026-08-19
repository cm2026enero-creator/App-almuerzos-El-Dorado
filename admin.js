// ============================================================================
// ADMIN.JS - PANEL DE ADMINISTRACIÓN EN TIEMPO REAL & AUTHENTICATION
// ============================================================================

let currentUser = null;
let ordersList = [];
let activeFilterStatus = "todos";
let activeFilterDate = "todos";
let searchQuery = "";
let previousOrderCount = 0;
let soundEnabled = true;

// Estado del menú en el panel admin
let adminMenu = {
  nombrePlato: "Pollo con Yuca y Plátano",
  precioPlato: 22000,
  costoDomicilio: 3000,
  descripcionPlato: "Pollo jugoso dorado a fuego lento acompañado de yuca sudada, plátano maduro al horno, arroz con coco y ensalada fresca casera.",
  imagenPlato: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80",
  numeroWhatsApp: "573001234567",
  numeroNequi: "300 123 4567",
  titularCuenta: "Sazón Lau - Almuerzos del Barrio",
  detallesBanco: "Bancolombia Ahorros N° 123-456789-00"
};

// Inicialización del Administrador
document.addEventListener("DOMContentLoaded", () => {
  if (window.initFirebaseApp) {
    window.initFirebaseApp();
  }

  setupAuthListeners();
  setupEventListeners();
  loadMenuConfiguration();

  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// 1. SISTEMA DE AUTENTICACIÓN
function setupAuthListeners() {
  const loginSection = document.getElementById("admin-login-section");
  const dashboardSection = document.getElementById("admin-dashboard-section");

  if (window.auth && window.isFirebaseConfigured) {
    window.auth.onAuthStateChanged((user) => {
      if (user) {
        currentUser = user;
        showDashboard();
      } else {
        currentUser = null;
        showLogin();
      }
    });
  } else {
    // Si Firebase no está configurado, verificar sesión local o mostrar formulario con opción de ingreso demo
    const localSession = sessionStorage.getItem("almuerzos_admin_logged");
    if (localSession === "true") {
      currentUser = { email: "admin@sazonlau.com", isDemo: true };
      showDashboard();
    } else {
      showLogin();
    }
  }
}

function showLogin() {
  const loginSection = document.getElementById("admin-login-section");
  const dashboardSection = document.getElementById("admin-dashboard-section");
  if (loginSection) loginSection.classList.remove("hidden");
  if (dashboardSection) dashboardSection.classList.add("hidden");
}

function showDashboard() {
  const loginSection = document.getElementById("admin-login-section");
  const dashboardSection = document.getElementById("admin-dashboard-section");
  if (loginSection) loginSection.classList.add("hidden");
  if (dashboardSection) dashboardSection.classList.remove("hidden");

  // Iniciar escucha en tiempo real de pedidos
  startRealtimeOrdersListener();
}

// Iniciar sesión
window.handleAdminLogin = async function(e) {
  e.preventDefault();
  const email = document.getElementById("admin-email").value.trim();
  const pass = document.getElementById("admin-password").value.trim();
  const errEl = document.getElementById("login-error");

  if (errEl) errEl.classList.add("hidden");

  if (window.auth && window.isFirebaseConfigured) {
    try {
      await window.auth.signInWithEmailAndPassword(email, pass);
      showToast("¡Sesión iniciada con Firebase!");
    } catch (error) {
      console.error(error);
      if (errEl) {
        errEl.textContent = "Error: Credenciales inválidas o usuario no registrado en Firebase.";
        errEl.classList.remove("hidden");
      }
    }
  } else {
    // Modo demostración local
    if ((email === "admin@sazonlau.com" && pass === "admin123") || pass.length >= 4) {
      sessionStorage.setItem("almuerzos_admin_logged", "true");
      currentUser = { email: email || "admin@sazonlau.com", isDemo: true };
      showToast("¡Bienvenido al Panel de Administración (Modo Demo)! Para conectar Firebase en vivo, ingresa tus credenciales en firebase-config.js.");
      showDashboard();
    } else {
      if (errEl) {
        errEl.textContent = "Contraseña incorrecta (Usa contraseña de al menos 4 caracteres en modo demo).";
        errEl.classList.remove("hidden");
      }
    }
  }
};

// Cerrar sesión
window.handleAdminLogout = function() {
  if (window.auth && window.isFirebaseConfigured) {
    window.auth.signOut();
  }
  sessionStorage.removeItem("almuerzos_admin_logged");
  currentUser = null;
  showLogin();
  showToast("Sesión cerrada.");
};

// 2. RECEPCIÓN DE PEDIDOS EN TIEMPO REAL
function startRealtimeOrdersListener() {
  if (window.db && window.isFirebaseConfigured) {
    window.db.ref("pedidos").on("value", (snapshot) => {
      const data = snapshot.val();
      ordersList = [];
      if (data) {
        Object.keys(data).forEach(key => {
          ordersList.push({ ...data[key], key });
        });
        // Ordenar por más reciente primero
        ordersList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }

      // Notificación sonora y visual si llega un nuevo pedido
      if (previousOrderCount > 0 && ordersList.length > previousOrderCount) {
        playNewOrderNotification();
        showToast("🔔 ¡NUEVO PEDIDO RECIBIDO EN TIEMPO REAL!");
      }
      previousOrderCount = ordersList.length;

      renderOrders();
      updateDashboardStats();
    });
  } else {
    // Carga de pedidos de muestra o pedidos locales guardados
    loadLocalOrders();
    // Revisar periódicamente por si entran en otra pestaña
    setInterval(loadLocalOrders, 4000);
  }
}

function loadLocalOrders() {
  let localOrders = [];
  try {
    localOrders = JSON.parse(localStorage.getItem("almuerzos_pedidos_locales") || "[]");
  } catch (e) {}

  if (localOrders.length === 0) {
    // Pedidos iniciales de demostración
    localOrders = [
      {
        id: "ALM-7821",
        cliente: "Doña Martha Ramírez",
        telefono: "3001112233",
        diaEntrega: "Sábado, 12:30 PM",
        plato: "Pollo con Yuca y Plátano",
        cantidad: 3,
        tipoEntrega: "Domicilio",
        direccion: "Cra 15 # 45-12 Apto 302, Barrio Central",
        metodoPago: "NEQUI",
        notas: "Por favor con bastante ají casero aparte.",
        subtotal: 66000,
        costoEnvio: 3000,
        total: 69000,
        estado: "pendiente",
        fechaCreacion: new Date().toISOString(),
        timestamp: Date.now() - 1000 * 60 * 15
      },
      {
        id: "ALM-7820",
        cliente: "Don Gonzalo Pérez",
        telefono: "3104445566",
        diaEntrega: "Domingo, 1:00 PM",
        plato: "Sancocho Trifásico Tradicional",
        cantidad: 2,
        tipoEntrega: "Recoger en sitio",
        direccion: "Punto Principal Barrio",
        metodoPago: "BANCOLOMBIA",
        notas: "Llegamos a recoger tipo 1:15pm",
        subtotal: 50000,
        costoEnvio: 0,
        total: 50000,
        estado: "preparacion",
        fechaCreacion: new Date().toISOString(),
        timestamp: Date.now() - 1000 * 60 * 65
      }
    ];
    localStorage.setItem("almuerzos_pedidos_locales", JSON.stringify(localOrders));
  }

  if (previousOrderCount > 0 && localOrders.length > previousOrderCount) {
    playNewOrderNotification();
    showToast("🔔 ¡NUEVO PEDIDO RECIBIDO!");
  }
  previousOrderCount = localOrders.length;
  ordersList = localOrders;
  renderOrders();
  updateDashboardStats();
}

// Sintetizador de sonido de notificación de pedido (Web Audio API)
function playNewOrderNotification() {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.25); // D6

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.75);
  } catch (e) {
    console.log("Audio no permitido aún por interacción:", e);
  }
}

// 3. RENDERIZADO Y FILTRADO DE PEDIDOS
function renderOrders() {
  const container = document.getElementById("admin-orders-list");
  if (!container) return;

  const filtered = ordersList.filter(o => {
    const matchStatus = activeFilterStatus === "todos" || o.estado === activeFilterStatus;
    const matchSearch = searchQuery === "" || 
      (o.cliente && o.cliente.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.telefono && o.telefono.includes(searchQuery)) ||
      (o.id && o.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.plato && o.plato.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
        <i data-lucide="inbox" class="w-12 h-12 text-slate-300 mx-auto mb-2"></i>
        <h4 class="font-bold text-slate-700 text-sm">No hay pedidos con estos filtros</h4>
        <p class="text-xs text-slate-400 mt-1">Los pedidos recibidos aparecerán aquí automáticamente.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(order => `
    <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
      <!-- Encabezado de la tarjeta -->
      <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <span class="font-black text-sm text-slate-900 font-mono">${order.id}</span>
          <span class="badge-status badge-${order.estado}">${formatStatusName(order.estado)}</span>
        </div>
        <div class="text-right">
          <span class="text-xs text-slate-400 block">${formatTime(order.timestamp || order.fechaCreacion)}</span>
          <span class="text-sm font-black text-orange-600">${formatCurrency(order.total)}</span>
        </div>
      </div>

      <!-- Detalle del cliente y plato -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <span class="text-slate-400 block text-[11px] font-bold">CLIENTE:</span>
          <p class="font-bold text-slate-800 text-sm">${order.cliente}</p>
          <a href="https://wa.me/${(order.telefono || '').replace(/\D/g,'')}?text=Hola%20${encodeURIComponent(order.cliente)},%20te%20escribimos%20de%20Sazón%20Lau%20sobre%20tu%20reserva%20${order.id}" 
             target="_blank" 
             class="inline-flex items-center gap-1 text-emerald-600 font-extrabold hover:underline mt-0.5">
            <i data-lucide="phone" class="w-3 h-3"></i>
            <span>${order.telefono} (WhatsApp)</span>
          </a>
        </div>

        <div>
          <span class="text-slate-400 block text-[11px] font-bold">PLATO Y CANTIDAD:</span>
          <p class="font-extrabold text-slate-900">${order.cantidad}x ${order.plato}</p>
          <span class="text-slate-500 font-medium">Entrega: <strong class="text-slate-700">${order.diaEntrega}</strong></span>
        </div>
      </div>

      <!-- Dirección y notas -->
      <div class="bg-slate-50 p-3 rounded-xl text-xs space-y-1 border border-slate-100">
        <div class="flex items-start gap-1.5 text-slate-700">
          <i data-lucide="map-pin" class="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5"></i>
          <span><strong>${order.tipoEntrega}:</strong> ${order.direccion || 'En punto de venta'}</span>
        </div>
        ${order.notas ? `
          <div class="flex items-start gap-1.5 text-slate-600">
            <i data-lucide="message-square" class="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"></i>
            <span><em>"${order.notas}"</em></span>
          </div>
        ` : ''}
        <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
          <span>Pago: <strong class="text-slate-700">${order.metodoPago}</strong></span>
          <span>Envío: <strong>${formatCurrency(order.costoEnvio)}</strong></span>
        </div>
      </div>

      <!-- Cambiador Rápido de Estados -->
      <div class="pt-2 flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-bold text-slate-500">Cambiar estado:</span>
        <div class="flex flex-wrap gap-1">
          <button onclick="updateOrderStatus('${order.id}', 'pendiente')" class="px-2 py-1 rounded-lg text-[10px] font-bold ${order.estado === 'pendiente' ? 'bg-amber-500 text-white' : 'bg-slate-100 hover:bg-amber-100 text-slate-600'}">Pendiente</button>
          <button onclick="updateOrderStatus('${order.id}', 'preparacion')" class="px-2 py-1 rounded-lg text-[10px] font-bold ${order.estado === 'preparacion' ? 'bg-sky-600 text-white' : 'bg-slate-100 hover:bg-sky-100 text-slate-600'}">En preparación</button>
          <button onclick="updateOrderStatus('${order.id}', 'camino')" class="px-2 py-1 rounded-lg text-[10px] font-bold ${order.estado === 'camino' ? 'bg-purple-600 text-white' : 'bg-slate-100 hover:bg-purple-100 text-slate-600'}">En camino</button>
          <button onclick="updateOrderStatus('${order.id}', 'entregado')" class="px-2 py-1 rounded-lg text-[10px] font-bold ${order.estado === 'entregado' ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-emerald-100 text-slate-600'}">Entregado</button>
          <button onclick="updateOrderStatus('${order.id}', 'cancelado')" class="px-2 py-1 rounded-lg text-[10px] font-bold ${order.estado === 'cancelado' ? 'bg-rose-600 text-white' : 'bg-slate-100 hover:bg-rose-100 text-slate-600'}">Cancelado</button>
        </div>
      </div>
    </div>
  `).join("");

  if (window.lucide) window.lucide.createIcons();
}

// Formateador de nombres de estado
function formatStatusName(st) {
  switch (st) {
    case "pendiente": return "Pendiente";
    case "preparacion": return "En Preparación";
    case "camino": return "En Camino";
    case "entregado": return "Entregado";
    case "cancelado": return "Cancelado";
    default: return st;
  }
}

function formatCurrency(val) {
  return "$" + Number(val || 0).toLocaleString("es-CO");
}

function formatTime(timestamp) {
  if (!timestamp) return "Hoy";
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " - " + d.toLocaleDateString();
}

// 4. ACTUALIZACIÓN DE ESTADO DE UN PEDIDO
window.updateOrderStatus = async function(orderId, newStatus) {
  if (window.db && window.isFirebaseConfigured) {
    try {
      await window.db.ref("pedidos/" + orderId).update({ estado: newStatus });
      showToast(`Pedido ${orderId} actualizado a ${formatStatusName(newStatus)}`);
    } catch (e) {
      console.error(e);
      showToast("Error al actualizar en Firebase");
    }
  } else {
    // Actualización local
    const found = ordersList.find(o => o.id === orderId);
    if (found) {
      found.estado = newStatus;
      localStorage.setItem("almuerzos_pedidos_locales", JSON.stringify(ordersList));
      renderOrders();
      updateDashboardStats();
      showToast(`Pedido ${orderId} actualizado a ${formatStatusName(newStatus)}`);
    }
  }
};

// 5. ESTADÍSTICAS DEL DASHBOARD
function updateDashboardStats() {
  const totalOrders = ordersList.length;
  const pendingCount = ordersList.filter(o => o.estado === "pendiente").length;
  const inPrepCount = ordersList.filter(o => o.estado === "preparacion" || o.estado === "camino").length;
  const deliveredCount = ordersList.filter(o => o.estado === "entregado").length;
  const totalRevenue = ordersList
    .filter(o => o.estado !== "cancelado")
    .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  const elTotal = document.getElementById("stat-total-orders");
  const elPending = document.getElementById("stat-pending-orders");
  const elPrep = document.getElementById("stat-prep-orders");
  const elDelivered = document.getElementById("stat-delivered-orders");
  const elRevenue = document.getElementById("stat-total-revenue");

  if (elTotal) elTotal.textContent = totalOrders;
  if (elPending) elPending.textContent = pendingCount;
  if (elPrep) elPrep.textContent = inPrepCount;
  if (elDelivered) elDelivered.textContent = deliveredCount;
  if (elRevenue) elRevenue.textContent = formatCurrency(totalRevenue);
}

// 6. GESTIÓN Y EDICIÓN DEL MENÚ
function loadMenuConfiguration() {
  if (window.db && window.isFirebaseConfigured) {
    window.db.ref("config_menu").once("value", (snap) => {
      const data = snap.val();
      if (data) {
        adminMenu = { ...adminMenu, ...data };
        fillMenuForm();
      }
    });
  } else {
    try {
      const saved = localStorage.getItem("almuerzos_admin_config");
      if (saved) adminMenu = { ...adminMenu, ...JSON.parse(saved) };
    } catch (e) {}
    fillMenuForm();
  }
}

function fillMenuForm() {
  const nameInput = document.getElementById("adm-plato-nombre");
  const priceInput = document.getElementById("adm-plato-precio");
  const domInput = document.getElementById("adm-domicilio-precio");
  const descInput = document.getElementById("adm-plato-desc");
  const imgInput = document.getElementById("adm-plato-imagen");
  const wspInput = document.getElementById("adm-wsp-admin");
  const previewImg = document.getElementById("adm-dish-preview-img");

  if (nameInput) nameInput.value = adminMenu.nombrePlato || "";
  if (priceInput) priceInput.value = adminMenu.precioPlato || 22000;
  if (domInput) domInput.value = adminMenu.costoDomicilio || 3000;
  if (descInput) descInput.value = adminMenu.descripcionPlato || "";
  if (imgInput) imgInput.value = adminMenu.imagenPlato || "";
  if (wspInput) wspInput.value = adminMenu.numeroWhatsApp || "";
  if (previewImg && adminMenu.imagenPlato) previewImg.src = adminMenu.imagenPlato;
}

// Platos predeterminados
const PRESET_DISHES = {
  PolloYuca: {
    nombre: "Pollo con Yuca y Plátano",
    precio: 22000,
    desc: "Pollo jugoso dorado a fuego lento acompañado de yuca sudada, plátano maduro al horno, arroz con coco y ensalada fresca casera.",
    img: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80"
  },
  Sancocho: {
    nombre: "Sancocho Trifásico Tradicional",
    precio: 25000,
    desc: "Sancocho criollo tradicional con gallina, cerdo y res, mazorca tierna, plátano verde, yuca, arroz blanco y aguacate.",
    img: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80"
  },
  BandejaPaisa: {
    nombre: "Bandeja Paisa con Frijoles",
    precio: 26000,
    desc: "Frijoles cargamanto en salsa casera, chicharrón crocante, carne molida, huevo frito, tajadas de maduro, arepa y aguacate.",
    img: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"
  },
  Pescado: {
    nombre: "Mojarra Frita con Patacón y Yuca",
    precio: 28000,
    desc: "Mojarra dorada crocante con patacones de plátano verde, yuca frita, arroz con coco y ensalada mixta de la huerta.",
    img: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80"
  },
  Empanadas: {
    nombre: "Combo de Empanadas Caseras (x5)",
    precio: 15000,
    desc: "Porción de 5 empanadas crocantes recién fritas rellenas de carne desmechada y papa criolla con ají casero.",
    img: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&q=80"
  },
  CarneAsada: {
    nombre: "Carne Asada a la Brasa con Patacón",
    precio: 25000,
    desc: "Jugoso corte de res asado al carbón con patacón pisao, papa salada, chimichurri casero, arroz y ensalada.",
    img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80"
  }
};

window.selectPresetDish = function(key) {
  const preset = PRESET_DISHES[key];
  if (!preset) return;

  adminMenu.nombrePlato = preset.nombre;
  adminMenu.precioPlato = preset.precio;
  adminMenu.descripcionPlato = preset.desc;
  adminMenu.imagenPlato = preset.img;

  fillMenuForm();
  showToast(`¡Plato ${preset.nombre} cargado al formulario!`);
};

window.saveMenuConfig = async function() {
  const name = document.getElementById("adm-plato-nombre").value.trim();
  const price = parseInt(document.getElementById("adm-plato-precio").value) || 22000;
  const dom = parseInt(document.getElementById("adm-domicilio-precio").value) || 3000;
  const desc = document.getElementById("adm-plato-desc").value.trim();
  const img = document.getElementById("adm-plato-imagen").value.trim() || adminMenu.imagenPlato;
  const wsp = document.getElementById("adm-wsp-admin").value.trim().replace(/\D/g, "") || adminMenu.numeroWhatsApp;

  adminMenu = {
    ...adminMenu,
    nombrePlato: name,
    precioPlato: price,
    costoDomicilio: dom,
    descripcionPlato: desc,
    imagenPlato: img,
    numeroWhatsApp: wsp
  };

  // Guardar en Firebase o LocalStorage
  if (window.db && window.isFirebaseConfigured) {
    try {
      await window.db.ref("config_menu").set(adminMenu);
      showToast("✅ Menú sincronizado en Firebase en tiempo real");
    } catch (e) {
      console.error(e);
      showToast("Error al guardar en Firebase");
    }
  } else {
    localStorage.setItem("almuerzos_admin_config", JSON.stringify(adminMenu));
    showToast("✅ Menú guardado localmente");
  }
};

// Carga de Foto desde Galería
window.handleAdminDishImageUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const rawImg = new Image();
    rawImg.src = e.target.result;
    rawImg.onload = function() {
      const canvas = document.createElement("canvas");
      const maxDim = 600;
      let width = rawImg.width;
      let height = rawImg.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(rawImg, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
      adminMenu.imagenPlato = compressedBase64;
      const previewImg = document.getElementById("adm-dish-preview-img");
      if (previewImg) previewImg.src = compressedBase64;
      const imgInput = document.getElementById("adm-plato-imagen");
      if (imgInput) imgInput.value = "";

      showToast("Foto cargada de tu dispositivo. Recuerda pulsar 'Guardar Menú'.");
    };
  };
  reader.readAsDataURL(file);
};

// 7. EXPORTAR A EXCEL / CSV
window.exportOrdersToCSV = function() {
  if (ordersList.length === 0) {
    showToast("No hay pedidos para exportar");
    return;
  }

  let csv = "\uFEFFID,Fecha,Cliente,Telefono,Plato,Cantidad,Entrega,Direccion,MetodoPago,Total,Estado\n";
  ordersList.forEach(o => {
    const cleanAddress = (o.direccion || "").replace(/,/g, " ");
    const cleanNotes = (o.notas || "").replace(/,/g, " ");
    csv += `"${o.id}","${o.diaEntrega}","${o.cliente}","${o.telefono}","${o.plato}","${o.cantidad}","${o.tipoEntrega}","${cleanAddress}","${o.metodoPago}","${o.total}","${o.estado}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Pedidos_FinDeSemana_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  showToast("Archivo CSV de pedidos descargado.");
};

// 8. EVENT LISTENERS GENERALES
function setupEventListeners() {
  // Filtros de estado
  document.querySelectorAll(".filter-status-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".filter-status-btn").forEach(b => {
        b.classList.remove("bg-orange-600", "text-white");
        b.classList.add("bg-slate-100", "text-slate-700");
      });
      btn.classList.add("bg-orange-600", "text-white");
      btn.classList.remove("bg-slate-100", "text-slate-700");
      activeFilterStatus = btn.dataset.status;
      renderOrders();
    });
  });

  // Buscador
  const searchInput = document.getElementById("admin-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      renderOrders();
    });
  }

  // Toggle de sonido
  const soundBtn = document.getElementById("toggle-sound-btn");
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      soundBtn.innerHTML = soundEnabled 
        ? '<i data-lucide="volume-2" class="w-4 h-4 text-emerald-600"></i><span>Sonido Activo</span>'
        : '<i data-lucide="volume-x" class="w-4 h-4 text-slate-400"></i><span>Sonido Silenciado</span>';
      if (window.lucide) window.lucide.createIcons();
      showToast(soundEnabled ? "Sonido de pedidos activado" : "Sonido silenciado");
    });
  }
}

// Toast helper
function showToast(msg) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast-item";
  toast.innerHTML = `<span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}
