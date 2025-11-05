document.addEventListener("DOMContentLoaded", () => {
  const auth = firebase.auth();
  const db = firebase.firestore();

  const logoutButton = document.getElementById("logout-button");
  const notificationBell = document.getElementById("notification-bell");
  const notificationCount = document.getElementById("notification-count");
  const notificationDropdown = document.getElementById("notification-dropdown");
  const profileChipContainer = document.getElementById("profile-chip-container");

  const offcanvas = document.getElementById("offcanvas-menu");
  const offcanvasOverlay = document.getElementById("offcanvas-overlay");
  const hamburger = document.getElementById("hamburger-menu");
  const closeOffcanvas = document.getElementById("close-offcanvas");

  const tabs = document.querySelectorAll(".offcanvas-link");
  const contents = document.querySelectorAll(".tab-content");

  let currentUser = null;

  // Toggle del menú offcanvas
  hamburger.addEventListener("click", () => {
    offcanvas.classList.add("open");
    offcanvasOverlay.classList.add("show");
  });
  closeOffcanvas.addEventListener("click", closeMenu);
  offcanvasOverlay.addEventListener("click", closeMenu);
  function closeMenu() {
    offcanvas.classList.remove("open");
    offcanvasOverlay.classList.remove("show");
  }

  // Navegación entre secciones
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      contents.forEach((c) => c.classList.remove("active"));
      document.getElementById(tab.dataset.tab).classList.add("active");
      closeMenu();
    });
  });

  // Auth
  auth.onAuthStateChanged((user) => {
    if (!user) return (window.location.href = "index.html");
    db.collection("users").doc(user.uid).get().then((doc) => {
      if (!doc.exists || doc.data().role !== "vendedor") {
        return (window.location.href = "index.html");
      }
      currentUser = { ...user, ...doc.data() };
      renderProfileChip();
      loadProducts();
      loadOrders();
      loadNotifications();
    });
  });

  function renderProfileChip() {
    const chip = document.createElement("a");
    chip.href = `perfil-vendedor.html?id=${currentUser.uid}`;
    chip.className = "profile-chip";
    chip.innerHTML = `
      <img src="${currentUser.photoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.username)}" alt="perfil">
      <span>${currentUser.username}</span>
    `;
    profileChipContainer.appendChild(chip);
  }

  // Logout
  logoutButton.addEventListener("click", () => {
    if (confirm("¿Cerrar sesión?")) {
      auth.signOut().then(() => (window.location.href = "index.html"));
    }
  });

  // -------------------- PRODUCTOS --------------------
  const CLOUD_NAME = "dvdctjltz";
  const UPLOAD_PRESET = "catalogo-productos";
  const imageUpload = document.getElementById("image-upload");
  const imageStatus = document.getElementById("image-upload-status");
  const imageHidden = document.getElementById("product-image");
  const addForm = document.getElementById("add-product-form");
  const myProductsList = document.getElementById("my-products-list");

  imageUpload.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    imageStatus.textContent = "Subiendo...";
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      imageHidden.value = data.secure_url;
      imageStatus.textContent = "¡Subida exitosa!";
    } catch {
      imageStatus.textContent = "Error al subir imagen.";
    }
  });

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!imageHidden.value) return alert("Espera a que la imagen se suba.");
    const product = {
      name: document.getElementById("product-name").value,
      description: document.getElementById("product-desc").value,
      price: parseFloat(document.getElementById("product-price").value),
      size: document.getElementById("product-size").value,
      gender: document.getElementById("product-gender").value,
      imageUrl: imageHidden.value,
      sellerId: currentUser.uid,
      sellerUsername: currentUser.username,
      status: "disponible",
    };
    db.collection("products").add(product).then(() => {
      alert("Producto agregado.");
      addForm.reset();
      imageStatus.textContent = "";
    });
  });

  function loadProducts() {
    db.collection("products").where("sellerId", "==", currentUser.uid)
      .onSnapshot((snapshot) => {
        myProductsList.innerHTML = "";
        if (snapshot.empty) return (myProductsList.innerHTML = "<p>No hay productos.</p>");
        snapshot.forEach((doc) => {
          const p = doc.data();
          const card = document.createElement("div");
          card.className = "product-card";
          card.innerHTML = `
            <img src="${p.imageUrl}">
            <h3>${p.name}</h3>
            <p>$${p.price}</p>
            <div class="card-actions">
              <button class="edit-btn" data-id="${doc.id}">Editar</button>
              <button class="delete-btn" data-id="${doc.id}">Eliminar</button>
            </div>
          `;
          myProductsList.appendChild(card);
        });
        myProductsList.querySelectorAll(".delete-btn").forEach((btn) => {
          btn.onclick = () => {
            if (confirm("¿Eliminar producto?"))
              db.collection("products").doc(btn.dataset.id).delete();
          };
        });
      });
  }

  // -------------------- PEDIDOS --------------------
  function loadOrders() {
    const ordersList = document.getElementById("orders-list");
    db.collection("orders").where("sellerId", "==", currentUser.uid)
      .onSnapshot((snapshot) => {
        ordersList.innerHTML = "";
        if (snapshot.empty) return (ordersList.innerHTML = "<p>No hay pedidos.</p>");
        snapshot.forEach((doc) => {
          const o = doc.data();
          const div = document.createElement("div");
          div.className = "order-card";
          div.innerHTML = `
            <h4>${o.productName}</h4>
            <p>Cliente: ${o.customerUsername}</p>
            <p>Estado: <b>${o.status}</b></p>
          `;
          ordersList.appendChild(div);
        });
      });
  }

  // -------------------- NOTIFICACIONES --------------------
  notificationBell.addEventListener("click", () => {
    notificationDropdown.style.display =
      notificationDropdown.style.display === "block" ? "none" : "block";
  });

  function loadNotifications() {
    db.collection("notifications")
      .where("userId", "==", currentUser.uid)
      .where("read", "==", false)
      .onSnapshot((snap) => {
        const count = snap.size;
        notificationCount.textContent = count;
        notificationDropdown.innerHTML = "";
        if (!count) {
          notificationCount.style.display = "none";
          notificationDropdown.innerHTML = "<p>Sin notificaciones.</p>";
          return;
        }
        notificationCount.style.display = "block";
        snap.forEach((doc) => {
          const n = doc.data();
          const div = document.createElement("div");
          div.className = "notification-item";
          div.innerHTML = `
            <p>${n.message}</p>
            <button class="mark-read" data-id="${doc.id}">Marcar leído</button>
          `;
          notificationDropdown.appendChild(div);
        });
      });
  }

  notificationDropdown.addEventListener("click", (e) => {
    if (e.target.classList.contains("mark-read")) {
      db.collection("notifications").doc(e.target.dataset.id).update({ read: true });
    }
  });
});
