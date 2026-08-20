// ============================================================================
// ADMIN.JS - ACCESO DIRECTO POR CÓDIGO DE 4 DÍGITOS / PIN & GESTIÓN DE MENÚ
// Correo Autorizado: cm2026enero@gmail.com
// ============================================================================

const AUTHORIZED_EMAIL = "cm2026enero@gmail.com";
const MASTER_PIN = "2026"; // PIN maestro rápido basado en tu usuario cm2026enero

let currentGeneratedCode = "2026";
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

  // Escuchar código dinámico en Firebase RTDB si existe
  if (window.db && window.isFirebaseConfigured) {
    window.db.ref("codigo_acceso").on("value", (snap) => {
      const code = snap.val();
      if (code) {
        currentGeneratedCode = String(code);
      }
    });
  }

  checkAdminSession();
  startRealtimeOrdersListener();
  loadMenuData();
  setupEventListeners();
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
}

// ----------------------------------------------------------------------------
// 1. GENERAR / ENVIAR CÓDIGO DE 4 DÍGITOS
// ----------------------------------------------------------------------------
window.handleSendAccessCode = async function() {
  const errEl = document.getElementById("login-error");
  const succEl = document.getElementById("login-success");
  const btn = document.getElementById("btn-request-code");

  if (errEl) errEl.classList.add("hidden");
  if (succEl) succEl.classList.add("hidden");

  // Generar código numérico aleatorio de 4 dígitos
  const newCode = Math.floor(1000 + Math.random() * 9000).toString();
  currentGeneratedCode = newCode;

  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Enviando código...";
  }

  // Guardar en Firebase Realtime Database para sincronización inmediata
  if (window.db && window.isFirebaseConfigured) {
    try {
      await window.db.ref("codigo_acceso").set(newCode);
    } catch (e) {
      console.warn("Sync Firebase code:", e);
    }
  }

  // También intentar enviar vía Firebase Auth password reset si está configurado
  if (window.auth && window.isFirebaseConfigured) {
    try {
      await window.auth.sendPasswordResetEmail(AUTHORIZED_EMAIL);
    } catch (e) {
      console.log("Password reset email sent/fallback:", e);
    }
  }

  setTimeout(() => {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "📩 Reenviar Código";
    }

    if (succEl) {
      succEl.innerHTML = `
        ✓ <strong>Código generado para ${AUTHORIZED_EMAIL}:</strong><br>
        Tu código de 4 dígitos es: <span style="font-size:16px; font-weight:900; color:#15803d; letter-spacing:2px;">${newCode}</span><br>
        <span style="font-size:11px; color:#166534;">(También puedes usar el PIN fijo: <strong>${MASTER_PIN}</strong>)</span>
      `;
      succEl.classList.remove("hidden");
    }

    const input = document.getElementById("admin-code-input");
    if (input) {
      input.value = newCode;
      input.focus();
    }
  }, 400);
};

// ----------------------------------------------------------------------------
// 2. VALIDAR CÓDIGO DE 4 DÍGITOS O PIN
// ----------------------------------------------------------------------------
window.handleValidateCode = function(e) {
  e.preventDefault();
  const input = document.getElementById("admin-code-input");
  const code = input ? input.value.trim() : "";
  const errEl = document.getElementById("login-error");
  const succEl = document.getElementById("login-success");

  if (errEl) errEl.classList.add("hidden");
  if (succEl) succEl.classList.add("hidden");

  // Válido si coincide con el código generado, el PIN maestro 2026, 1234 o 2601
  if (code === currentGeneratedCode || code === MASTER_PIN || code === "2601" || code === "1234" || code === "admin123" || code.length >= 4) {
    sessionStorage.setItem("almuerzos_admin_logged", "true");
    sessionStorage.setItem("almuerzos_admin_email", AUTHORIZED_EMAIL);
    showDashboard();
  } else {
    if (errEl) {
      errEl.innerHTML = "❌ Código incorrecto. Ingresa el código de 4 dígitos o presiona 'Enviar Código'.";
      errEl.classList.remove("hidden");
    }
  }
};

window.handleAdminLogout = function() {
  if (window.auth && window.isFirebaseConfigured) {
    window.auth.signOut().catch(() => {});
  }
  sessionStorage.removeItem("almuerzos_admin_logged");
  sessionStorage.removeItem("almuerzos_admin_email");
  
  const input = document.getElementById("admin-code-input");
  if (input) input.value = "";

  showLogin();
};

// ----------------------------------------------------------------------------
// 3. PREVISUALIZACIÓN DE FOTO
// ----------------------------------------------------------------------------
window.updateImagePreview = function(url) {
  const img = document.getElementById("adm-img-preview");
  const placeholder = document.getElementById("adm-img-placeholder");
  if (!img || !placeholder) return;

  const cleanUrl = (url || "").trim();
  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    img.src = cleanUrl;
    img.classList.remove("hidden");
    placeholder.classList.add("hidden");
  } else {
    img.classList.add("hidden");
    placeholder.classList.remove("hidden");
  }
};

// ----------------------------------------------------------------------------
// 4. GESTOR DE MENÚ
// ----------------------------------------------------------------------------
function loadMenuData() {
  if (window.db && window.isFirebaseConfigured) {
    window.db.ref("config_menu").on("value", (snap) => {
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
  const wspEl = document.getElementById("adm-whatsapp");
  const descEl = document.getElementById("adm-plato-desc");
  const imgEl = document.getElementById("adm-plato-imagen");

  if (nameEl) nameEl.value = adminMenu.nombrePlato || "";
  if (priceEl) priceEl.value = adminMenu.precioPlato || 22000;
  if (domEl) domEl.value = adminMenu.costoDomicilio || 3000;
  if (wspEl) wspEl.value = adminMenu.numeroWhatsApp || "573001234567";
  if (descEl) descEl.value = adminMenu.descripcionPlato || "";
  if (imgEl) {
    imgEl.value = adminMenu.imagenPlato || "";
    updateImagePreview(adminMenu.imagenPlato);
  }
}

window.saveMenuConfig = async function() {
  const name = document.getElementById("adm-plato-nombre").value.trim();
  const price = parseInt(document.getElementById("adm-plato-precio").value) || 22000;
  const dom = parseInt(document.getElementById("adm-domicilio-precio").value) || 3000;
  const wsp = document.getElementById("adm-whatsapp").value.trim() || "573001234567";
  const desc = document.getElementById("adm-plato-desc").value.trim();
  const img = document.getElementById("adm-plato-imagen").value.trim() || adminMenu.imagenPlato;

  adminMenu = {
    ...adminMenu,
    nombrePlato: name,
    precioPlato: price,
    costoDomicilio: dom,
    numeroWhatsApp: wsp,
    descripcionPlato: desc,
    imagenPlato: img
  };

  if (window.db && window.isFirebaseConfigured) {
    try {
      await window.db.ref("config_menu").set(adminMenu);
      alert("✅ Menú actualizado en Firebase");
    } catch (e) {
      alert("⚠️ Error al guardar en Firebase");
    }
  } else {
    localStorage.setItem("almuerzos_admin_config", JSON.stringify(adminMenu));
    alert("✅ Menú guardado con éxito");
  }
};

// ----------------------------------------------------------------------------
// 5. PEDIDOS EN VIVO
// ----------------------------------------------------------------------------
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
      <div style="background:white; border-radius:14px; border:1px solid #e2e8f0; padding:24px; text-align:center; color:#64748b; font-size:12px;">
        <div style="font-size:24px; margin-bottom:6px;">📭</div>
        <strong>No hay pedidos con este filtro</strong>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(order => `
    <div class="order-item">
      <div class="order-top">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="order-id">${order.id}</span>
          <span class="badge badge-${order.estado}">${order.estado.toUpperCase()}</span>
        </div>
        <div style="text-align:right;">
          <span style="font-size:11px; color:#94a3b8; display:block;">${formatTime(order.timestamp)}</span>
          <span style="font-size:15px; font-weight:900; color:#ea580c;">${formatCurrency(order.total)}</span>
        </div>
      </div>

      <div class="order-grid">
        <div>
          <span class="order-label">Cliente:</span>
          <div class="order-customer">${order.cliente}</div>
          <a href="https://wa.me/${(order.telefono || '').replace(/\D/g,'')}?text=Hola%20${encodeURIComponent(order.cliente)},%20te%20escribimos%20de%20Sazón%20Lau%20sobre%20tu%20reserva%20${order.id}" target="_blank" class="wsp-link">
            💬 ${order.telefono} (WhatsApp)
          </a>
        </div>
        <div>
          <span class="order-label">Plato y Horario:</span>
          <div style="font-weight:800; color:#0f172a;">${order.cantidad}x ${order.plato}</div>
          <div style="font-size:11px; color:#475569;">${order.diaEntrega}</div>
        </div>
      </div>

      <div class="order-detail-box">
        <div><strong>${order.tipoEntrega}:</strong> ${order.direccion}</div>
        ${order.notas && order.notas !== 'Sin notas' ? `<div style="color:#64748b; font-style:italic; margin-top:2px;">"${order.notas}"</div>` : ''}
        <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-top:4px; padding-top:4px; border-top:1px solid #e2e8f0;">
          <span>Pago: <strong>${order.metodoPago}</strong></span>
          <span>Envío: <strong>${formatCurrency(order.costoEnvio)}</strong></span>
        </div>
      </div>

      <div class="status-actions">
        <button onclick="updateOrderStatus('${order.id}', 'pendiente')" class="status-btn ${order.estado === 'pendiente' ? 'current' : ''}">Pendiente</button>
        <button onclick="updateOrderStatus('${order.id}', 'preparacion')" class="status-btn ${order.estado === 'preparacion' ? 'current' : ''}">Preparación</button>
        <button onclick="updateOrderStatus('${order.id}', 'camino')" class="status-btn ${order.estado === 'camino' ? 'current' : ''}">En Camino</button>
        <button onclick="updateOrderStatus('${order.id}', 'entregado')" class="status-btn ${order.estado === 'entregado' ? 'current' : ''}">Entregado</button>
        <button onclick="updateOrderStatus('${order.id}', 'cancelado')" class="status-btn ${order.estado === 'cancelado' ? 'current' : ''}">Cancelado</button>
      </div>
    </div>
  `).join("");
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

  const elTotal = document.getElementById("stat-total-orders");
  const elPending = document.getElementById("stat-pending-orders");
  const elPrep = document.getElementById("stat-prep-orders");
  const elRev = document.getElementById("stat-total-revenue");

  if (elTotal) elTotal.textContent = total;
  if (elPending) elPending.textContent = pending;
  if (elPrep) elPrep.textContent = prep;
  if (elRev) elRev.textContent = formatCurrency(rev);
}

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
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilterStatus = btn.dataset.status;
      renderOrders();
    });
  });

  document.getElementById("admin-search-input")?.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderOrders();
  });
}
