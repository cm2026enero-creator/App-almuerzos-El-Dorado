// ============================================================================
// APP.JS - LÓGICA DEL CLIENTE (RESERVAS & SINCRONIZACIÓN FIREBASE)
// ============================================================================

const state = {
  menu: {
    nombrePlato: "Pollo con Yuca y Plátano",
    precioPlato: 22000,
    costoDomicilio: 3000,
    descripcionPlato: "Pollo jugoso dorado a fuego lento acompañado de yuca sudada, plátano maduro al horno, arroz con coco y ensalada fresca.",
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
  tipoEntrega: "domicilio",
  metodoPago: "nequi"
};

function formatCurrency(val) {
  return "$" + Number(val || 0).toLocaleString("es-CO");
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.initFirebaseApp) window.initFirebaseApp();
  loadMenuData();
  bindClientEvents();
  renderClientMenu();
  calculateTotals();
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
      <div onclick="selectPlato('${dish.id}')" class="dish-option ${state.selectedPlatoId === dish.id ? 'active' : ''}">
        <div class="dish-thumb">
          <img src="${dish.img}" onerror="this.src='https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=300&q=70';" alt="${dish.nombre}">
        </div>
        <div class="dish-info">
          <div class="dish-name-price">
            <span class="dish-name">${dish.nombre}</span>
            <span class="dish-price">${formatCurrency(dish.precio)}</span>
          </div>
          <div class="dish-desc-small">${dish.desc}</div>
        </div>
        <div class="check-circle"></div>
      </div>
    `).join("");
  }
}

window.selectPlato = function(id) {
  state.selectedPlatoId = id;
  renderClientMenu();
  calculateTotals();
};

window.setDeliveryType = function(type) {
  state.tipoEntrega = type;
  document.getElementById("btn-delivery-dom").classList.toggle("active", type === "domicilio");
  document.getElementById("btn-delivery-rec").classList.toggle("active", type === "recoger");
  document.getElementById("direccion-container").classList.toggle("hidden", type === "recoger");
  calculateTotals();
};

window.setPaymentMethod = function(method) {
  state.metodoPago = method;
  document.getElementById("pay-nequi").classList.toggle("active", method === "nequi");
  document.getElementById("pay-banco").classList.toggle("active", method === "bancolombia");
  document.getElementById("pay-efectivo").classList.toggle("active", method === "efectivo");
};

function bindClientEvents() {
  document.getElementById("btn-minus")?.addEventListener("click", () => {
    if (state.cantidad > 1) {
      state.cantidad--;
      document.getElementById("order-quantity").textContent = state.cantidad;
      calculateTotals();
    }
  });

  document.getElementById("btn-plus")?.addEventListener("click", () => {
    if (state.cantidad < 50) {
      state.cantidad++;
      document.getElementById("order-quantity").textContent = state.cantidad;
      calculateTotals();
    }
  });

  document.getElementById("order-form")?.addEventListener("submit", handleOrderSubmit);
}

function calculateTotals() {
  const current = state.menu.platosDisponibles.find(p => p.id === state.selectedPlatoId) || state.menu.platosDisponibles[0];
  const subtotal = current.precio * state.cantidad;
  const envio = state.tipoEntrega === "domicilio" ? state.menu.costoDomicilio : 0;
  const total = subtotal + envio;

  document.getElementById("summary-subtotal").textContent = formatCurrency(subtotal);
  document.getElementById("summary-envio").textContent = envio === 0 ? "Gratis" : formatCurrency(envio);
  document.getElementById("summary-total").textContent = formatCurrency(total);
  document.getElementById("btn-submit-total").textContent = formatCurrency(total);
}

async function handleOrderSubmit(e) {
  e.preventDefault();

  const nombre = document.getElementById("cliente-nombre").value.trim();
  const telefono = document.getElementById("cliente-telefono").value.trim();
  const diaEntrega = document.getElementById("cliente-dia").value;
  const direccion = state.tipoEntrega === "domicilio" ? document.getElementById("cliente-direccion").value.trim() : "Recoger en sitio";
  const notas = document.getElementById("cliente-notas")?.value.trim() || "";

  if (!nombre || !telefono) {
    alert("Por favor completa tu nombre y teléfono");
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
    notas: notas || "Sin notas",
    subtotal: subtotal,
    costoEnvio: costoEnvio,
    total: total,
    estado: "pendiente",
    fechaCreacion: new Date().toISOString(),
    timestamp: Date.now()
  };

  // Guardar en Firebase Realtime Database
  if (window.db && window.isFirebaseConfigured) {
    try {
      await window.db.ref("pedidos/" + orderId).set(orderData);
    } catch (err) {
      console.error(err);
    }
  }

  const msgWsp = encodeURIComponent(
    `*¡HOLA! RESERVA DE ALMUERZO*\n` +
    `----------------------------------------\n` +
    `📌 *Reserva:* ${orderId}\n` +
    `👤 *Cliente:* ${nombre}\n` +
    `📱 *Tel:* ${telefono}\n` +
    `📅 *Horario:* ${diaEntrega}\n` +
    `🍲 *Plato:* ${currentDish.nombre} (x${state.cantidad})\n` +
    `🛵 *Entrega:* ${orderData.tipoEntrega}\n` +
    (state.tipoEntrega === "domicilio" ? `📍 *Dir:* ${direccion}\n` : ``) +
    `💳 *Pago:* ${orderData.metodoPago}\n` +
    (notas ? `📝 *Notas:* ${notas}\n` : ``) +
    `----------------------------------------\n` +
    `💰 *TOTAL: ${formatCurrency(total)}*`
  );

  const wspUrl = `https://wa.me/${state.menu.numeroWhatsApp.replace(/\D/g,"")}?text=${msgWsp}`;
  showSuccessModal(orderData, wspUrl);
}

function showSuccessModal(order, wspUrl) {
  document.getElementById("modal-order-id").textContent = order.id;
  document.getElementById("modal-order-plato").textContent = `${order.cantidad}x ${order.plato} - ${formatCurrency(order.total)}`;
  document.getElementById("btn-send-whatsapp").onclick = () => window.open(wspUrl, "_blank");
  document.getElementById("success-modal").classList.add("active");
}

window.closeSuccessModal = function() {
  document.getElementById("success-modal").classList.remove("active");
  document.getElementById("order-form").reset();
  state.cantidad = 1;
  document.getElementById("order-quantity").textContent = "1";
  calculateTotals();
};
