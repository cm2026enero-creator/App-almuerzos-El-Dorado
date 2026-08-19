// ============================================================================
// APP.JS - LÓGICA DEL CLIENTE (RESERVAS & SINCRONIZACIÓN FIREBASE)
// ============================================================================

// 1. Reset y depuración de almacenamiento previo obsoleto
try {
  const version = "v2.0";
  const currentVer = localStorage.getItem("almuerzos_app_version");
  if (currentVer !== version) {
    localStorage.removeItem("almuerzos_admin_config");
    localStorage.setItem("almuerzos_app_version", version);
  }
} catch (e) {
  console.warn("Storage reset check bypassed:", e);
}

const state = {
  menu: {
    nombrePlato: "Pollo con Yuca y Plátano",
    precioPlato: 22000,
    costoDomicilio: 3000,
    descripcionPlato: "Pollo dorado jugoso con yuca sudada, plátano maduro al horno, arroz con coco y ensalada fresca casera.",
    imagenPlato: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80",
    platosDisponibles: [
      {
        id: "p1",
        nombre: "Pollo con Yuca y Plátano",
        precio: 22000,
        desc: "Pollo jugoso dorado a fuego lento acompañado de yuca sudada, plátano maduro al horno, arroz con coco y ensalada fresca.",
        img: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: "p2",
        nombre: "Sancocho Trifásico Tradicional",
        precio: 25000,
        desc: "Gallina campesina, carne de res y cerdo con mazorca tierna, plátano verde, yuca, arroz blanco y aguacate.",
        img: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: "p3",
        nombre: "Bandeja Paisa Tradicional",
        precio: 26000,
        desc: "Frijoles cargamanto en salsa de la casa, chicharrón crocante, carne molida, huevo frito, maduro, arepa y aguacate.",
        img: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"
      },
      {
        id: "p4",
        nombre: "Mojarra Frita con Patacón",
        precio: 28000,
        desc: "Mojarra frita bien crocante acompañada de patacones de plátano verde, yuca, arroz con coco y ensalada mixta.",
        img: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80"
      }
    ],
    numeroWhatsApp: "573001234567"
  },
  selectedPlatoId: "p1",
  cantidad: 1,
  tipoEntrega: "domicilio", // 'domicilio' | 'recoger'
  metodoPago: "nequi"
};

function formatCurrency(val) {
  return "$" + Number(val || 0).toLocaleString("es-CO");
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.initFirebaseApp) {
    window.initFirebaseApp();
  }
  loadMenuData();
  bindClientEvents();
  renderClientMenu();
  calculateTotals();
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

function loadMenuData() {
  if (window.db && window.isFirebaseConfigured) {
    window.db.ref("config_menu").on("value", (snapshot) => {
      const data = snapshot.val();
      if (data) {
        state.menu = { ...state.menu, ...data };
        renderClientMenu();
        calculateTotals();
      }
    });
  }
}

function renderClientMenu() {
  const current = state.menu.platosDisponibles.find(p => p.id === state.selectedPlatoId) || state.menu.platosDisponibles[0];
  
  const heroImg = document.getElementById("hero-dish-img");
  const heroName = document.getElementById("hero-dish-name");
  const heroDesc = document.getElementById("hero-dish-desc");
  const heroPrice = document.getElementById("hero-dish-price");
  const heroDom = document.getElementById("hero-delivery-price");

  if (heroImg) {
    heroImg.src = current.img;
    heroImg.onerror = function() {
      this.src = "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80";
    };
  }
  if (heroName) heroName.textContent = current.nombre;
  if (heroDesc) heroDesc.textContent = current.desc;
  if (heroPrice) heroPrice.textContent = formatCurrency(current.precio);
  if (heroDom) heroDom.textContent = formatCurrency(state.menu.costoDomicilio);

  const container = document.getElementById("dishes-selection-container");
  if (container && state.menu.platosDisponibles) {
    container.innerHTML = state.menu.platosDisponibles.map(dish => `
      <div onclick="selectPlato('${dish.id}')" 
           class="dish-card-item cursor-pointer p-3 rounded-2xl border-2 flex items-center gap-3 transition ${state.selectedPlatoId === dish.id ? 'border-orange-500 bg-orange-50/80 ring-2 ring-orange-200' : 'border-slate-200 bg-white hover:border-slate-300'}">
        <div class="dish-thumbnail-box shrink-0">
          <img src="${dish.img}" 
               onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=300&q=70';" 
               alt="${dish.nombre}"
               loading="lazy">
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1">
            <h4 class="font-extrabold text-xs sm:text-sm text-slate-900 truncate">${dish.nombre}</h4>
            <span class="text-xs font-black text-orange-600 shrink-0">${formatCurrency(dish.precio)}</span>
          </div>
          <p class="text-[11px] text-slate-500 line-clamp-2 mt-0.5">${dish.desc}</p>
        </div>
        <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${state.selectedPlatoId === dish.id ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-300'}">
          ${state.selectedPlatoId === dish.id ? '<div class="w-2 h-2 rounded-full bg-white"></div>' : ''}
        </div>
      </div>
    `).join("");
  }
}

window.selectPlato = function(id) {
  state.selectedPlatoId = id;
  renderClientMenu();
  calculateTotals();
};

function bindClientEvents() {
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

  document.querySelectorAll('input[name="metodo-pago"]').forEach(elem => {
    elem.addEventListener("change", (e) => {
      state.metodoPago = e.target.value;
    });
  });

  const orderForm = document.getElementById("order-form");
  if (orderForm) {
    orderForm.addEventListener("submit", handleOrderSubmit);
  }
}

function calculateTotals() {
  const current = state.menu.platosDisponibles.find(p => p.id === state.selectedPlatoId) || state.menu.platosDisponibles[0];
  const subtotal = current.precio * state.cantidad;
  const envio = state.tipoEntrega === "domicilio" ? state.menu.costoDomicilio : 0;
  const total = subtotal + envio;

  const subtotalEl = document.getElementById("summary-subtotal");
  const envioEl = document.getElementById("summary-envio");
  const totalEl = document.getElementById("summary-total");
  const btnTotalEl = document.getElementById("btn-submit-total");

  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (envioEl) envioEl.textContent = envio === 0 ? "Gratis / En punto" : formatCurrency(envio);
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (btnTotalEl) btnTotalEl.textContent = formatCurrency(total);
}

async function handleOrderSubmit(e) {
  e.preventDefault();

  const nombre = document.getElementById("cliente-nombre").value.trim();
  const telefono = document.getElementById("cliente-telefono").value.trim();
  const diaEntrega = document.getElementById("cliente-dia").value;
  const direccion = state.tipoEntrega === "domicilio" 
    ? (document.getElementById("cliente-direccion") ? document.getElementById("cliente-direccion").value.trim() : "") 
    : "Recoger en punto de venta";
  const notas = document.getElementById("cliente-notas") ? document.getElementById("cliente-notas").value.trim() : "";

  if (!nombre || !telefono) {
    alert("Por favor completa tu nombre y teléfono / WhatsApp");
    return;
  }

  if (state.tipoEntrega === "domicilio" && !direccion) {
    alert("Por favor ingresa la dirección de entrega");
    return;
  }

  const currentDish = state.menu.platosDisponibles.find(p => p.id === state.selectedPlatoId) || state.menu.platosDisponibles[0];
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
    tipoEntrega: state.tipoEntrega === "domicilio" ? "A Domicilio" : "Recoger en sitio",
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

  // 1. Guardar en Firebase Realtime Database (/pedidos)
  try {
    if (window.db && window.isFirebaseConfigured) {
      await window.db.ref("pedidos/" + orderId).set(orderData);
      console.log("✅ Pedido guardado en Firebase Realtime DB:", orderId);
    } else {
      let localOrders = [];
      try {
        localOrders = JSON.parse(localStorage.getItem("almuerzos_pedidos_locales") || "[]");
      } catch (err) {}
      localOrders.unshift(orderData);
      localStorage.setItem("almuerzos_pedidos_locales", JSON.stringify(localOrders));
    }
  } catch (error) {
    console.error("Error al guardar en Firebase:", error);
  }

  // 2. Mensaje estructurado de WhatsApp
  const mensajeWhatsApp = encodeURIComponent(
    `*¡HOLA! QUIERO CONFIRMAR MI RESERVA DE ALMUERZO*\n` +
    `----------------------------------------\n` +
    `📌 *Reserva N°:* ${orderId}\n` +
    `👤 *Cliente:* ${nombre}\n` +
    `📱 *Teléfono:* ${telefono}\n` +
    `📅 *Horario:* ${diaEntrega}\n` +
    `🍲 *Plato:* ${currentDish.nombre}\n` +
    `🔢 *Cantidad:* ${state.cantidad} porción(es)\n` +
    `🛵 *Entrega:* ${orderData.tipoEntrega}\n` +
    (state.tipoEntrega === "domicilio" ? `📍 *Dirección:* ${direccion}\n` : ``) +
    `💳 *Pago:* ${orderData.metodoPago}\n` +
    (notas ? `📝 *Notas:* ${notas}\n` : ``) +
    `----------------------------------------\n` +
    `💰 *TOTAL A PAGAR: ${formatCurrency(total)}*\n` +
    `----------------------------------------\n` +
    `_Quedo atento(a) a la confirmación de mi pedido. ¡Gracias!_`
  );

  const wspNumber = state.menu.numeroWhatsApp.replace(/\D/g, "") || "573001234567";
  const wspUrl = `https://wa.me/${wspNumber}?text=${mensajeWhatsApp}`;

  // 3. Modal de éxito y redirección
  showSuccessModal(orderData, wspUrl);
}

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
    btnWsp.onclick = () => window.open(wspUrl, "_blank");
  }

  if (modal) {
    modal.classList.add("active");
  }
}

window.closeSuccessModal = function() {
  const modal = document.getElementById("success-modal");
  if (modal) modal.classList.remove("active");
  const form = document.getElementById("order-form");
  if (form) form.reset();
  state.cantidad = 1;
  const inputQty = document.getElementById("order-quantity");
  if (inputQty) inputQty.textContent = "1";
  calculateTotals();
};
