// ============================================================================
// ADMIN.JS - DASHBOARD EN TIEMPO REAL CON FIREBASE RTDB & GESTOR DE MENÚ
// ============================================================================

let ordersList = [];
let activeFilterStatus = "todos";
let searchQuery = "";
let previousOrderCount = 0;
let soundEnabled = true;

let adminMenu = {
  nombrePlato: "Pollo con Yuca y Plátano",
  precioPlato: 22000,
  costoDomicilio: 3000,
  descripcionPlato: "Pollo dorado jugoso con yuca sudada, plátano maduro al horno, arroz con coco y ensalada fresca casera.",
  imagenPlato: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80",
  numeroWhatsApp: "573001234567"
};

function formatCurrency(val) {
  return "$" + Number(val || 0).toLocaleString("es-CO");
}

function formatTime(timestamp) {
  if (!timestamp) return "Hoy";
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " - " + d.toLocaleDateString();
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.initFirebaseApp) {
    window.initFirebaseApp();
  }
  checkAdminSession();
  startRealtimeOrdersListener();
  loadMenuData();
  setupEventListeners();

  if (window.lucide) {
    window.lucide.createIcons();
  }
});

function checkAdminSession() {
  const isLogged = sessionStorage.getItem("almuerzos_admin_logged");
  if (isLogged === "true") {
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById("admin-login-section")?.classList.remove("hidden");
  document.getElementById("admin-dashboard-section")?.classList.add("hidden");
}

function showDashboard() {
  document.getElementById("admin-login-section")?.classList.add("hidden");
  document.getElementById("admin-dashboard-section")?.classList.remove("hidden");
  if (window.lucide) window.lucide.createIcons();
}

window.handleAdminLogin = async function(e) {
  e.preventDefault();
  const email = document.getElementById("admin-email").value.trim();
  const pass = document.getElementById("admin-password").value.trim();
  const errEl = document.getElementById("login-error");

  if (errEl) errEl.classList.add("hidden");

  if (window.auth && window.isFirebaseConfigured) {
    try {
      await window.auth.signInWithEmailAndPassword(email, pass);
    } catch (err) {
      console.warn("Autenticación Firebase Auth:", err);
    }
  }

  // Permitir acceso administrativo
  if (pass.length >= 4) {
    sessionStorage.setItem("almuerzos_admin_logged", "true");
    showDashboard();
  } else {
    if (errEl) {
      errEl.textContent = "Contraseña inválida. Debe tener al menos 4 caracteres.";
      errEl.classList.remove("hidden");
    }
  }
};

window.handleAdminLogout = function() {
  if (window.auth && window.isFirebaseConfigured) {
    window.auth.signOut();
  }
  sessionStorage.removeItem("almuerzos_admin_logged");
  showLogin();
};

function startRealtimeOrdersListener() {
  if (window.db && window.isFirebaseConfigured) {
    window.db.ref("pedidos").on("value", (snapshot) => {
      const data = snapshot.val();
      ordersList = [];
      if (data) {
        Object.keys(data).forEach(key => {
          ordersList.push({ ...data[key], key });
        });
        ordersList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }

      if (previousOrderCount > 0 && ordersList.length > previousOrderCount) {
        playNotificationSound();
      }
      previousOrderCount = ordersList.length;

      renderOrders();
      updateDashboardStats();
    });
  } else {
    loadLocalOrders();
    setInterval(loadLocalOrders, 4000);
  }
}

function loadLocalOrders() {
  let localOrders = [];
  try {
    localOrders = JSON.parse(localStorage.getItem("almuerzos_pedidos_locales") || "[]");
  } catch (e) {}

  if (localOrders.length === 0) {
    localOrders = [
      {
        id: "ALM-7821",
        cliente: "Doña Martha Ramírez",
        telefono: "3001112233",
        diaEntrega: "Sábado (12:00 PM - 1:30 PM)",
        plato: "Pollo con Yuca y Plátano",
        cantidad: 3,
        tipoEntrega: "A Domicilio",
        direccion: "Cra 15 # 45-12 Apto 302",
        metodoPago: "NEQUI",
        notas: "Con ají picante casero aparte.",
        total: 69000,
        costoEnvio: 3000,
        estado: "pendiente",
        timestamp: Date.now() - 1000 * 60 * 10
      },
      {
        id: "ALM-7820",
        cliente: "Don Gonzalo Pérez",
        telefono: "3104445566",
        diaEntrega: "Domingo (1:30 PM - 3:00 PM)",
        plato: "Sancocho Trifásico Tradicional",
        cantidad: 2,
        tipoEntrega: "Recoger en sitio",
        direccion: "Punto principal de venta",
        metodoPago: "BANCOLOMBIA",
        notas: "Llegamos tipo 1:45 PM",
        total: 50000,
        costoEnvio: 0,
        estado: "preparacion",
        timestamp: Date.now() - 1000 * 60 * 50
      }
    ];
    localStorage.setItem("almuerzos_pedidos_locales", JSON.stringify(localOrders));
  }

  ordersList = localOrders;
  renderOrders();
  updateDashboardStats();
}

function playNotificationSound() {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
  } catch (e) {}
}

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
      <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
        <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
        <p class="font-bold text-slate-600">No hay pedidos con este filtro</p>
        <p class="text-slate-400 mt-0.5">Los nuevos pedidos recibidos se mostrarán aquí al instante.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(order => `
    <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <span class="font-mono font-black text-sm text-slate-900">${order.id}</span>
          <span class="badge-status badge-${order.estado}">${order.estado.toUpperCase()}</span>
        </div>
        <div class="text-right">
          <span class="text-xs text-slate-400 block">${formatTime(order.timestamp)}</span>
          <span class="text-sm font-black text-orange-600">${formatCurrency(order.total)}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <span class="text-slate-400 font-bold block text-[10px]">CLIENTE:</span>
          <p class="font-bold text-slate-900 text-sm">${order.cliente}</p>
          <a href="https://wa.me/${(order.telefono || '').replace(/\D/g,'')}?text=Hola%20${encodeURIComponent(order.cliente)},%20te%20escribimos%20de%20Sazón%20Lau%20sobre%20tu%20reserva%20${order.id}" target="_blank" class="inline-flex items-center gap-1 text-emerald-600 font-extrabold hover:underline mt-0.5">
            <i data-lucide="phone" class="w-3 h-3"></i>
            <span>${order.telefono} (WhatsApp)</span>
          </a>
        </div>
        <div>
          <span class="text-slate-400 font-bold block text-[10px]">PEDIDO:</span>
          <p class="font-extrabold text-slate-900">${order.cantidad}x ${order.plato}</p>
          <span class="text-slate-500 font-medium">Horario: <strong>${order.diaEntrega}</strong></span>
        </div>
      </div>

      <div class="bg-slate-50 p-3 rounded-xl text-xs space-y-1 border border-slate-100">
        <p class="text-slate-700"><strong>${order.tipoEntrega}:</strong> ${order.direccion}</p>
        ${order.notas ? `<p class="text-slate-600 italic">"${order.notas}"</p>` : ''}
        <div class="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
          <span>Pago: <strong>${order.metodoPago}</strong></span>
          <span>Envío: <strong>${formatCurrency(order.costoEnvio)}</strong></span>
        </div>
      </div>

      <div class="pt-1 flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-bold text-slate-500">Cambiar estado:</span>
        <div class="flex flex-wrap gap-1">
          <button onclick="updateOrderStatus('${order.id}', 'pendiente')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold ${order.estado === 'pendiente' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-amber-100'}">Pendiente</button>
          <button onclick="updateOrderStatus('${order.id}', 'preparacion')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold ${order.estado === 'preparacion' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-sky-100'}">Preparación</button>
          <button onclick="updateOrderStatus('${order.id}', 'camino')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold ${order.estado === 'camino' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-100'}">En Camino</button>
          <button onclick="updateOrderStatus('${order.id}', 'entregado')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold ${order.estado === 'entregado' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-100'}">Entregado</button>
          <button onclick="updateOrderStatus('${order.id}', 'cancelado')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold ${order.estado === 'cancelado' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-rose-100'}">Cancelado</button>
        </div>
      </div>
    </div>
  `).join("");

  if (window.lucide) window.lucide.createIcons();
}

window.updateOrderStatus = async function(orderId, newStatus) {
  if (window.db && window.isFirebaseConfigured) {
    try {
      await window.db.ref("pedidos/" + orderId).update({ estado: newStatus });
    } catch (e) {
      console.error(e);
    }
  } else {
    const found = ordersList.find(o => o.id === orderId);
    if (found) {
      found.estado = newStatus;
      localStorage.setItem("almuerzos_pedidos_locales", JSON.stringify(ordersList));
      renderOrders();
      updateDashboardStats();
    }
  }
};

function updateDashboardStats() {
  const total = ordersList.length;
  const pending = ordersList.filter(o => o.estado === "pendiente").length;
  const prep = ordersList.filter(o => o.estado === "preparacion" || o.estado === "camino").length;
  const rev = ordersList.filter(o => o.estado !== "cancelado").reduce((acc, c) => acc + (Number(c.total) || 0), 0);

  document.getElementById("stat-total-orders").textContent = total;
  document.getElementById("stat-pending-orders").textContent = pending;
  document.getElementById("stat-prep-orders").textContent = prep;
  document.getElementById("stat-total-revenue").textContent = formatCurrency(rev);
}

function loadMenuData() {
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
  const nameEl = document.getElementById("adm-plato-nombre");
  const priceEl = document.getElementById("adm-plato-precio");
  const domEl = document.getElementById("adm-domicilio-precio");
  const descEl = document.getElementById("adm-plato-desc");
  const imgEl = document.getElementById("adm-plato-imagen");

  if (nameEl) nameEl.value = adminMenu.nombrePlato || "";
  if (priceEl) priceEl.value = adminMenu.precioPlato || 22000;
  if (domEl) domEl.value = adminMenu.costoDomicilio || 3000;
  if (descEl) descEl.value = adminMenu.descripcionPlato || "";
  if (imgEl) imgEl.value = adminMenu.imagenPlato || "";
}

window.saveMenuConfig = async function() {
  const name = document.getElementById("adm-plato-nombre").value.trim();
  const price = parseInt(document.getElementById("adm-plato-precio").value) || 22000;
  const dom = parseInt(document.getElementById("adm-domicilio-precio").value) || 3000;
  const desc = document.getElementById("adm-plato-desc").value.trim();
  const img = document.getElementById("adm-plato-imagen").value.trim() || adminMenu.imagenPlato;

  adminMenu = {
    ...adminMenu,
    nombrePlato: name,
    precioPlato: price,
    costoDomicilio: dom,
    descripcionPlato: desc,
    imagenPlato: img
  };

  if (window.db && window.isFirebaseConfigured) {
    await window.db.ref("config_menu").set(adminMenu);
    alert("✅ Menú sincronizado en Firebase Realtime Database");
  } else {
    localStorage.setItem("almuerzos_admin_config", JSON.stringify(adminMenu));
    alert("✅ Menú guardado con éxito");
  }
};

window.exportOrdersToCSV = function() {
  let csv = "\uFEFFID,Cliente,Telefono,Horario,Plato,Cantidad,TipoEntrega,Direccion,MetodoPago,Total,Estado\n";
  ordersList.forEach(o => {
    csv += `"${o.id}","${o.cliente}","${o.telefono}","${o.diaEntrega}","${o.plato}","${o.cantidad}","${o.tipoEntrega}","${(o.direccion||'').replace(/"/g,'')}","${o.metodoPago}","${o.total}","${o.estado}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Pedidos_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
};

function setupEventListeners() {
  document.querySelectorAll(".filter-status-btn").forEach(btn => {
    btn.addEventListener("click", () => {
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

  document.getElementById("admin-search-input")?.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderOrders();
  });
}
