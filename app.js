// ============================================================================
// APP.JS - LÓGICA DEL CLIENTE (RESERVAS EN TIEMPO REAL & WHATSAPP)
// ============================================================================

// Estado local del cliente
const state = {
  menu: {
    nombrePlato: "Pollo con Yuca y Plátano",
    precioPlato: 22000,
    costoDomicilio: 3000,
    descripcionPlato: "Pollo dorado jugoso con yuca sudada, plátano maduro al horno, arroz con coco y ensalada fresca casera.",
    imagenPlato: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80",
    disponible: true,
    platosDisponibles: [
      { id: "p1", nombre: "Pollo con Yuca y Plátano", precio: 22000, desc: "Con arroz con coco, yuca sudada, maduro y ensalada.", img: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80", disponible: true },
      { id: "p2", nombre: "Sancocho Trifásico Tradicional", precio: 25000, desc: "Gallina, cerdo y res con mazorca, plátano, yuca y aguacate.", img: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80", disponible: true },
      { id: "p3", nombre: "Bandeja Paisa con Frijoles", precio: 26000, desc: "Chicharrón crocante, carne molida, huevo, maduro, arepa y aguacate.", img: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80", disponible: true },
      { id: "p4", nombre: "Mojarra Frita con Patacón", precio: 28000, desc: "Pescado dorado crocante con patacones verdes, yuca y ensalada.", img: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80", disponible: true }
    ],
    numeroWhatsApp: "573001234567",
    numeroNequi: "300 123 4567",
    titularCuenta: "Sazón Lau - Almuerzos del Barrio",
    detallesBanco: "Bancolombia Ahorros N° 123-456789-00"
  },
  selectedPlatoId: "p1",
  cantidad: 1,
  tipoEntrega: "domicilio", // 'domicilio' | 'recoger'
  metodoPago: "nequi" // 'nequi' | 'bancolombia' | 'efectivo'
};

// Formateador de moneda en pesos colombianos / locales
function formatCurrency(val) {
  return "$" + Number(val || 0).toLocaleString("es-CO");
}

// Inicialización de la app
document.addEventListener("DOMContentLoaded", () => {
  if (window.initFirebaseApp) {
    window.initFirebaseApp();
  }
  
  loadMenuFromUrlOrDatabase();
  bindClientEvents();
  renderClientMenu();
  calculateTotals();
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// Carga de configuración desde URL o Firebase
function loadMenuFromUrlOrDatabase() {
  // 1. Leer parámetros de URL compartida si existen
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("plato")) {
    state.menu.nombrePlato = urlParams.get("plato");
    if (state.menu.platosDisponibles[0]) {
      state.menu.platosDisponibles[0].nombre = urlParams.get("plato");
    }
  }
  if (urlParams.has("precio")) {
    const p = parseInt(urlParams.get("precio"));
    if (!isNaN(p) && p > 0) {
      state.menu.precioPlato = p;
      if (state.menu.platosDisponibles[0]) state.menu.platosDisponibles[0].precio = p;
    }
  }
  if (urlParams.has("domicilio")) {
    const d = parseInt(urlParams.get("domicilio"));
    if (!isNaN(d)) state.menu.costoDomicilio = d;
  }
  if (urlParams.has("desc")) {
    state.menu.descripcionPlato = urlParams.get("desc");
    if (state.menu.platosDisponibles[0]) state.menu.platosDisponibles[0].desc = urlParams.get("desc");
  }
  if (urlParams.has("img")) {
    state.menu.imagenPlato = urlParams.get("img");
    if (state.menu.platosDisponibles[0]) state.menu.platosDisponibles[0].img = urlParams.get("img");
  }
  if (urlParams.has("wsp")) {
    state.menu.numeroWhatsApp = urlParams.get("wsp");
  }

  // 2. Si Firebase está activo, escuchar cambios en tiempo real del menú
  if (window.db && window.isFirebaseConfigured) {
    window.db.ref("config_menu").on("value", (snapshot) => {
      const data = snapshot.val();
      if (data) {
        state.menu = { ...state.menu, ...data };
        renderClientMenu();
        calculateTotals();
      }
    });
  } else {
    // Intentar leer de LocalStorage si fue guardado previamente desde el admin local
    try {
      const localCfg = localStorage.getItem("almuerzos_admin_config");
      if (localCfg) {
        const parsed = JSON.parse(localCfg);
        state.menu = { ...state.menu, ...parsed };
      }
    } catch (e) {
      console.warn(e);
    }
  }
}

// Renderizado de menú en la vista del cliente
function renderClientMenu() {
  // Plato principal destacado
  const heroImg = document.getElementById("hero-dish-img");
  const heroName = document.getElementById("hero-dish-name");
  const heroDesc = document.getElementById("hero-dish-desc");
  const heroPrice = document.getElementById("hero-dish-price");
  const heroDom = document.getElementById("hero-delivery-price");

  if (heroImg) heroImg.src = state.menu.imagenPlato;
  if (heroName) heroName.textContent = state.menu.nombrePlato;
  if (heroDesc) heroDesc.textContent = state.menu.descripcionPlato;
  if (heroPrice) heroPrice.textContent = formatCurrency(state.menu.precioPlato);
  if (heroDom) heroDom.textContent = formatCurrency(state.menu.costoDomicilio);

  // Cuentas de pago en el modal o sección
  const nequiEl = document.getElementById("info-nequi");
  const bancoEl = document.getElementById("info-banco");
  const titularEl = document.getElementById("info-titular");
  if (nequiEl) nequiEl.textContent = state.menu.numeroNequi;
  if (bancoEl) bancoEl.textContent = state.menu.detallesBanco;
  if (titularEl) titularEl.textContent = state.menu.titularCuenta;

  // Lista interactiva de platos disponibles para seleccionar
  const dishesContainer = document.getElementById("dishes-selection-container");
  if (dishesContainer && state.menu.platosDisponibles) {
    dishesContainer.innerHTML = state.menu.platosDisponibles.map(dish => `
      <div onclick="selectPlato('${dish.id}')" 
           class="cursor-pointer transition p-3 rounded-2xl border-2 flex items-center gap-3.5 ${state.selectedPlatoId === dish.id ? 'border-orange-500 bg-orange-50/80 ring-2 ring-orange-200' : 'border-slate-200 bg-white hover:border-slate-300'}">
        <img src="${dish.img}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=300&q=70';" class="w-16 h-16 rounded-xl object-cover shadow-sm shrink-0">
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h4 class="font-extrabold text-sm text-slate-900 truncate">${dish.nombre}</h4>
            <span class="text-xs font-black text-orange-600">${formatCurrency(dish.precio)}</span>
          </div>
          <p class="text-xs text-slate-500 line-clamp-2 mt-0.5">${dish.desc}</p>
        </div>
        <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center ${state.selectedPlatoId === dish.id ? 'border-orange-600 bg-orange-600' : 'border-slate-300'}">
          ${state.selectedPlatoId === dish.id ? '<div class="w-2 h-2 rounded-full bg-white"></div>' : ''}
        </div>
      </div>
    `).join("");
  }
}

// Selección de plato
window.selectPlato = function(id) {
  state.selectedPlatoId = id;
  const found = state.menu.platosDisponibles.find(p => p.id === id);
  if (found) {
    state.menu.nombrePlato = found.nombre;
    state.menu.precioPlato = found.precio;
    state.menu.descripcionPlato = found.desc;
    state.menu.imagenPlato = found.img;
  }
  renderClientMenu();
  calculateTotals();
};

// Eventos y listeners del cliente
function bindClientEvents() {
  // Botones de cantidad (+ / -)
  const btnMinus = document.getElementById("btn-minus");
  const btnPlus = document.getElementById("btn-plus");
  const inputQty = document.getElementById("order-quantity");

  if (btnMinus) {
    btnMinus.addEventListener("click", () => {
      if (state.cantidad > 1) {
        state.cantidad--;
        if (inputQty) inputQty.textContent = state.cantidad;
        calculateTotals();
      }
    });
  }

  if (btnPlus) {
    btnPlus.addEventListener("click", () => {
      if (state.cantidad < 50) {
        state.cantidad++;
        if (inputQty) inputQty.textContent = state.cantidad;
        calculateTotals();
      }
    });
  }

  // Tipo de entrega (Domicilio vs Recoger)
  const radioDom = document.getElementById("entrega-domicilio");
  const radioRec = document.getElementById("entrega-recoger");
  const addressContainer = document.getElementById("direccion-container");

  if (radioDom) {
    radioDom.addEventListener("change", () => {
      state.tipoEntrega = "domicilio";
      if (addressContainer) addressContainer.classList.remove("hidden");
      calculateTotals();
    });
  }

  if (radioRec) {
    radioRec.addEventListener("change", () => {
      state.tipoEntrega = "recoger";
      if (addressContainer) addressContainer.classList.add("hidden");
      calculateTotals();
    });
  }

  // Método de pago
  document.querySelectorAll('input[name="metodo-pago"]').forEach(elem => {
    elem.addEventListener("change", (e) => {
      state.metodoPago = e.target.value;
    });
  });

  // Formulario de Reserva
  const orderForm = document.getElementById("order-form");
  if (orderForm) {
    orderForm.addEventListener("submit", handleOrderSubmit);
  }
}

// Cálculo de Totales
function calculateTotals() {
  const currentDish = state.menu.platosDisponibles.find(p => p.id === state.selectedPlatoId) || { precio: state.menu.precioPlato };
  const subtotal = currentDish.precio * state.cantidad;
  const envio = state.tipoEntrega === "domicilio" ? state.menu.costoDomicilio : 0;
  const total = subtotal + envio;

  const subtotalEl = document.getElementById("summary-subtotal");
  const envioEl = document.getElementById("summary-envio");
  const totalEl = document.getElementById("summary-total");
  const btnTotalEl = document.getElementById("btn-submit-total");

  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (envioEl) envioEl.textContent = envio === 0 ? "Gratis / En sitio" : formatCurrency(envio);
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (btnTotalEl) btnTotalEl.textContent = formatCurrency(total);
}

// Procesar el envío de la reserva
async function handleOrderSubmit(e) {
  e.preventDefault();

  const nombre = document.getElementById("cliente-nombre").value.trim();
  const telefono = document.getElementById("cliente-telefono").value.trim();
  const diaEntrega = document.getElementById("cliente-dia").value;
  const direccion = state.tipoEntrega === "domicilio" 
    ? (document.getElementById("cliente-direccion") ? document.getElementById("cliente-direccion").value.trim() : "") 
    : "Recoger en sitio (Punto Principal)";
  const notas = document.getElementById("cliente-notas") ? document.getElementById("cliente-notas").value.trim() : "";

  if (!nombre || !telefono) {
    showToast("⚠️ Por favor completa tu nombre y número de WhatsApp");
    return;
  }

  if (state.tipoEntrega === "domicilio" && !direccion) {
    showToast("⚠️ Por favor ingresa la dirección de entrega");
    return;
  }

  const currentDish = state.menu.platosDisponibles.find(p => p.id === state.selectedPlatoId) || { nombre: state.menu.nombrePlato, precio: state.menu.precioPlato };
  const subtotal = currentDish.precio * state.cantidad;
  const costoEnvio = state.tipoEntrega === "domicilio" ? state.menu.costoDomicilio : 0;
  const total = subtotal + costoEnvio;
  const orderId = "ALM-" + Math.floor(1000 + Math.random() * 9000);

  const orderData = {
    id: orderId,
    cliente: nombre,
    telefono: telefono,
    diaEntrega: diaEntrega,
    plato: currentDish.nombre,
    cantidad: state.cantidad,
    tipoEntrega: state.tipoEntrega === "domicilio" ? "Domicilio" : "Recoger en sitio",
    direccion: direccion,
    metodoPago: state.metodoPago.toUpperCase(),
    notas: notas || "Sin notas adicionales",
    subtotal: subtotal,
    costoEnvio: costoEnvio,
    total: total,
    estado: "pendiente",
    fechaCreacion: new Date().toISOString(),
    timestamp: Date.now()
  };

  // 1. Guardar en Firebase Realtime Database (o LocalStorage)
  try {
    if (window.db && window.isFirebaseConfigured) {
      await window.db.ref("pedidos/" + orderId).set(orderData);
      console.log("Pedido guardado en Firebase Realtime DB:", orderId);
    } else {
      // Guardado local de respaldo
      let localOrders = [];
      try {
        localOrders = JSON.parse(localStorage.getItem("almuerzos_pedidos_locales") || "[]");
      } catch (err) {}
      localOrders.unshift(orderData);
      localStorage.setItem("almuerzos_pedidos_locales", JSON.stringify(localOrders));
    }
  } catch (error) {
    console.error("Error al guardar el pedido:", error);
  }

  // 2. Preparar el mensaje para WhatsApp
  const mensajeWhatsApp = encodeURIComponent(
    `*¡HOLA! QUIERO CONFIRMAR MI RESERVA DE ALMUERZO*\n` +
    `----------------------------------------\n` +
    `📌 *Reserva N°:* ${orderId}\n` +
    `👤 *Cliente:* ${nombre}\n` +
    `📱 *Teléfono:* ${telefono}\n` +
    `📅 *Día:* ${diaEntrega}\n` +
    `🍲 *Plato:* ${currentDish.nombre}\n` +
    `🔢 *Cantidad:* ${state.cantidad} porción(es)\n` +
    `🛵 *Entrega:* ${orderData.tipoEntrega}\n` +
    (state.tipoEntrega === "domicilio" ? `📍 *Dirección:* ${direccion}\n` : ``) +
    `💳 *Método de Pago:* ${orderData.metodoPago}\n` +
    (notas ? `📝 *Notas:* ${notas}\n` : ``) +
    `----------------------------------------\n` +
    `💰 *TOTAL A PAGAR: ${formatCurrency(total)}*\n` +
    `----------------------------------------\n` +
    `_Quedo atento(a) a la confirmación de mi pedido. ¡Gracias!_`
  );

  const wspNumber = state.menu.numeroWhatsApp.replace(/\D/g, "") || "573001234567";
  const wspUrl = `https://api.whatsapp.com/send?phone=${wspNumber}&text=${mensajeWhatsApp}`;

  // 3. Mostrar Modal de Confirmación y botón directo a WhatsApp
  showSuccessModal(orderData, wspUrl);
}

// Modal de Éxito
function showSuccessModal(order, wspUrl) {
  const modal = document.getElementById("success-modal");
  const modalOrderId = document.getElementById("modal-order-id");
  const modalPlato = document.getElementById("modal-order-plato");
  const modalTotal = document.getElementById("modal-order-total");
  const btnWsp = document.getElementById("btn-send-whatsapp");

  if (modalOrderId) modalOrderId.textContent = order.id;
  if (modalPlato) modalPlato.textContent = `${order.cantidad}x ${order.plato}`;
  if (modalTotal) modalTotal.textContent = formatCurrency(order.total);
  if (btnWsp) {
    btnWsp.onclick = () => {
      window.open(wspUrl, "_blank");
    };
  }

  if (modal) {
    modal.classList.add("active");
  }
}

// Cerrar Modal
window.closeSuccessModal = function() {
  const modal = document.getElementById("success-modal");
  if (modal) modal.classList.remove("active");
  // Reset formulario
  const form = document.getElementById("order-form");
  if (form) form.reset();
  state.cantidad = 1;
  const inputQty = document.getElementById("order-quantity");
  if (inputQty) inputQty.textContent = "1";
  calculateTotals();
  showToast("¡Gracias por tu reserva!");
};

// Toast notification helper
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
