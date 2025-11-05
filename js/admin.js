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

  const tabs = document.querySelectorAll(".admin-nav-link");
  const contents = document.querySelectorAll(".tab-content");

  let currentUser = null;

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
      console.log("Current User:", currentUser); // Debug log
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
            <img src="${p.imageUrl}" alt="${p.name}">
            <div class="product-card-content">
              <h3>${p.name}</h3>
              <p class="price">$${p.price.toFixed(2)}</p>
              <p class="product-status ${p.status === 'vendido' ? 'sold' : 'available'}">${p.status.toUpperCase()}</p>
              <div class="card-actions">
                <button class="edit-btn primary-button" data-id="${doc.id}">Editar</button>
                <button class="delete-btn secondary-button" data-id="${doc.id}">Eliminar</button>
              </div>
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
        myProductsList.querySelectorAll(".edit-btn").forEach((btn) => {
          btn.onclick = () => handleEditProduct(btn.dataset.id);
        });
      });
  }

  // Edit Product Modal Logic
  const editProductModal = document.getElementById("edit-product-modal");
  const closeEditProductModal = editProductModal.querySelector(".close-button");
  const editProductForm = document.getElementById("edit-product-form");
  const editProductId = document.getElementById("edit-product-id");
  const editProductName = document.getElementById("edit-product-name");
  const editProductPrice = document.getElementById("edit-product-price");
  const editProductDesc = document.getElementById("edit-product-desc");
  const editProductSize = document.getElementById("edit-product-size");
  const editProductGender = document.getElementById("edit-product-gender");
  const editProductStatus = document.getElementById("edit-product-status");
  const editImageUpload = document.getElementById("edit-image-upload");
  const editImageUploadStatus = document.getElementById("edit-image-upload-status");
  const editProductImage = document.getElementById("edit-product-image");

  closeEditProductModal.addEventListener("click", () => closeModal(editProductModal));

  async function handleEditProduct(productId) {
    try {
      const productDoc = await db.collection("products").doc(productId).get();
      if (!productDoc.exists) {
        alert("Producto no encontrado.");
        return;
      }
      const product = productDoc.data();

      editProductId.value = productId;
      editProductName.value = product.name;
      editProductPrice.value = product.price;
      editProductDesc.value = product.description;
      editProductSize.value = product.size;
      editProductGender.value = product.gender;
      editProductStatus.value = product.status;
      editProductImage.value = product.imageUrl;
      editImageUploadStatus.textContent = product.imageUrl ? "Imagen actual cargada." : "";

      openModal(editProductModal);
    } catch (error) {
      console.error("Error fetching product for edit:", error);
      alert("Error al cargar el producto para editar.");
    }
  }

  editImageUpload.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    editImageUploadStatus.textContent = "Subiendo...";
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      editProductImage.value = data.secure_url;
      editImageUploadStatus.textContent = "¡Subida exitosa!";
    } catch {
      editImageUploadStatus.textContent = "Error al subir imagen.";
    }
  });

  editProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!editProductImage.value) return alert("Espera a que la imagen se suba.");

    const productId = editProductId.value;
    const updatedProduct = {
      name: editProductName.value,
      price: parseFloat(editProductPrice.value),
      description: editProductDesc.value,
      size: editProductSize.value,
      gender: editProductGender.value,
      status: editProductStatus.value,
      imageUrl: editProductImage.value,
    };

    try {
      await db.collection("products").doc(productId).update(updatedProduct);
      alert("Producto actualizado correctamente.");
      closeModal(editProductModal);
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Error al actualizar el producto.");
    }
  });

  // -------------------- PEDIDOS --------------------
  const orderDetailsModal = document.getElementById("order-details-modal");
  const orderDetailsContent = document.getElementById("order-details-content");
  const closeOrderDetailsModal = orderDetailsModal.querySelector(".close-button");

  function openModal(modalElement) {
    modalElement.style.display = "flex";
    document.body.classList.add("modal-open");
  }

  function closeModal(modalElement) {
    modalElement.style.display = "none";
    document.body.classList.remove("modal-open");
  }

  closeOrderDetailsModal.addEventListener("click", () => closeModal(orderDetailsModal));

  function loadOrders() {
    const ordersTableBody = document.getElementById("orders-table-body");
    console.log("Loading orders for sellerId:", currentUser.uid); // Debug log
    db.collection("orders").where("sellerId", "==", currentUser.uid)
      .onSnapshot((snapshot) => {
        ordersTableBody.innerHTML = "";
        if (snapshot.empty) {
          console.log("No orders found for this seller."); // Debug log
          return (ordersTableBody.innerHTML = "<tr><td colspan=\"4\">No hay pedidos.</td></tr>");
        }
        console.log("Orders snapshot received:", snapshot.docs.map(doc => doc.data())); // Debug log
        snapshot.forEach((doc) => {
          const o = doc.data();
          const orderId = doc.id;
          const row = document.createElement("tr");

          let actionButtonsHtml = `
            <button class="action-btn details-btn" data-id="${orderId}">Ver Detalles</button>
            <button class="action-btn delete-btn" data-id="${orderId}">Eliminar</button>
          `;

          if (o.status === 'pendiente') {
            actionButtonsHtml = `
              <button class="action-btn accept-btn" data-id="${orderId}">Aceptar</button>
              <button class="action-btn reject-btn" data-id="${orderId}">Rechazar</button>
              ${actionButtonsHtml}
            `;
          }

          row.innerHTML = `
            <td data-label="ID Pedido">${orderId}</td>
            <td data-label="Cliente">${o.customerUsername}</td>
            <td data-label="Estado"><span class="status status-${o.status.toLowerCase()}">${o.status}</span></td>
            <td data-label="Acciones">
              <div class="action-buttons">
                ${actionButtonsHtml}
              </div>
            </td>
          `;
          ordersTableBody.appendChild(row);
        });

        // Add event listeners for action buttons
        ordersTableBody.querySelectorAll(".accept-btn").forEach(button => {
          button.addEventListener("click", (e) => handleOrderStatusChange(e.target.dataset.id, "Aceptado"));
        });
        ordersTableBody.querySelectorAll(".reject-btn").forEach(button => {
          button.addEventListener("click", (e) => handleOrderStatusChange(e.target.dataset.id, "Rechazado"));
        });
        ordersTableBody.querySelectorAll(".delete-btn").forEach(button => {
          button.addEventListener("click", (e) => handleDeleteOrder(e.target.dataset.id));
        });
        ordersTableBody.querySelectorAll(".details-btn").forEach(button => {
          button.addEventListener("click", (e) => handleViewDetails(e.target.dataset.id));
        });
      });
  }

  async function handleViewDetails(orderId) {
    try {
      const orderDoc = await db.collection("orders").doc(orderId).get();
      if (!orderDoc.exists) {
        alert("Pedido no encontrado.");
        return;
      }
      const order = orderDoc.data();

      console.log("Order details for orderId:", orderId, order); // Debug log
      let productDetailsHtml = '';
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          console.log("Processing order item:", item); // Debug log
          const productDoc = await db.collection("products").doc(item.productId).get();
          const product = productDoc.exists ? productDoc.data() : {};
          console.log("Fetched product for item:", product); // Debug log
          productDetailsHtml += `
            <div class="order-product-item">
              <img src="${product.imageUrl || 'https://via.placeholder.com/50'}" alt="${product.name}">
              <div>
                <h3>${product.name || 'Producto Desconocido'}</h3>
                <p>Cantidad: ${item.quantity || 1}</p>
                <p>Precio Unitario: $${(item.price || 0).toFixed(2)}</p>
                <p>Talla: ${item.size || 'N/A'}</p>
                <p>Género: ${item.gender || 'N/A'}</p>
              </div>
            </div>
          `;
        }
      } else if (order.productId) {
        // Assume single product details are directly in the order object
        console.log("Processing single product order:", order.productId);
        const productDoc = await db.collection("products").doc(order.productId).get();
        const product = productDoc.exists ? productDoc.data() : {};
        console.log("Fetched product for single item:", product); // Debug log
        productDetailsHtml += `
          <div class="order-product-item">
            <img src="${product.imageUrl || 'https://via.placeholder.com/50'}" alt="${order.productName || 'Producto Desconocido'}">
            <div>
              <h3>${order.productName || 'Producto Desconocido'}</h3>
              <p>Cantidad: 1</p>
              <p>Precio Unitario: $${(order.price || 0).toFixed(2)}</p>
              <p>Talla: ${product.size || 'N/A'}</p>
              <p>Género: ${product.gender || 'N/A'}</p>
            </div>
          </div>
        `;
      }

      orderDetailsContent.innerHTML = `
        <div class="order-details-header">
          <h3>Pedido #${orderId}</h3>
          <span class="status status-${order.status.toLowerCase()}">${order.status}</span>
        </div>
        <p><strong>Cliente:</strong> ${order.customerUsername}</p>
        <p><strong>Fecha:</strong> ${order.createdAt ? new Date(order.createdAt.toDate()).toLocaleString() : 'Fecha no disponible'}</p>
        <p><strong>Total:</strong> $${(order.price || 0).toFixed(2)}</p>
        <p><strong>Dirección de Envío:</strong> ${order.deliveryLocation || 'No especificada'}</p>
        <h4>Productos:</h4>
        <div class="order-products-list">
          ${productDetailsHtml || '<p>No hay productos en este pedido.</p>'}
        </div>
      `;
      openModal(orderDetailsModal);

    } catch (error) {
      console.error("Error fetching order details:", error);
      alert("Error al cargar los detalles del pedido.");
    }
  }

  async function handleOrderStatusChange(orderId, newStatus) {
    console.log(`Attempting to change order ${orderId} to status: ${newStatus}`); // Debug log
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      alert("Pedido no encontrado.");
      return;
    }
    const order = orderDoc.data();

    if (confirm(`¿Estás seguro de que quieres ${newStatus === 'Aceptado' ? 'aceptar' : 'rechazar'} este pedido?`)) {
      try {
        await db.collection("orders").doc(orderId).update({ status: newStatus });
        alert(`Pedido ${newStatus.toLowerCase()} correctamente.`);
        console.log(`Order ${orderId} successfully updated to ${newStatus}`); // Debug log

        if (newStatus === 'Aceptado') {
          // Fetch full order and product details for PDF generation
          const productDoc = await db.collection("products").doc(order.productId).get();
          const product = productDoc.exists ? productDoc.data() : {};

          // Generate PDF for seller
          console.log("Attempting to generate seller PDF...");
          await generatePdf(orderId, true); // Generate seller's PDF
          console.log("Seller PDF generation attempted.");
          alert("Registro de pedido generado y descargado para el vendedor.");

          // Create notification for customer to download their PDF
            await db.collection("notifications").add({
              userId: order.customerId,
              orderId: orderId,
              message: `¡Tu pedido #${orderId} ha sido aceptado! Descarga tu ticket.`,
              read: false,
              orderStatus: 'Aceptado',
              timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
          console.log(`Notification created for customer ${order.customerId} for order ${orderId}.`);
        } else if (newStatus === 'Rechazado') {
          // Create notification for customer about rejected order
          await db.collection("notifications").add({
            userId: order.customerId,
            orderId: orderId,
            message: `¡Tu pedido #${orderId} ha sido rechazado!`,
            read: false,
            orderStatus: 'Rechazado',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Notification created for customer ${order.customerId} for rejected order ${orderId}.`);
        }
      } catch (error) {
        console.error("Error updating order status:", error); // Debug log
        alert("Error al actualizar el estado del pedido.");
      }
    }
  }

  async function handleDeleteOrder(orderId) {
    if (confirm("¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.")) {
      try {
        await db.collection("orders").doc(orderId).delete();
        alert("Pedido eliminado correctamente.");
      } catch (error) {
        console.error("Error deleting order:", error);
        alert("Error al eliminar el pedido.");
      }
    }
  }

  // --- NUEVA FUNCIÓN PARA GENERAR PDF ESTILO TICKET (ADAPTADA DE catalogo.js) ---
  async function generatePdf(orderId, isSellerPdf = false) { // Added isSellerPdf parameter
    console.log('Generando ticket para pedido:', orderId, isSellerPdf ? '(Vendedor)' : '(Cliente)');
    const { jsPDF } = window.jspdf;

    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      alert("El pedido no existe");
      return;
    }

    const order = orderSnap.data();

    // Obtener datos del producto
    const productRef = db.collection('products').doc(order.productId);
    const productSnap = await productRef.get();
    const product = productSnap.exists ? productSnap.data() : {};

    // --- Crear PDF ---
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: isSellerPdf ? 'a4' : [80, 200] // A4 para registro, ticket para cliente
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 10;

    if (isSellerPdf) {
      // --- Layout para el REGISTRO DEL VENDEDOR (Tabla) ---
      pdf.setFontSize(18);
      pdf.text('REGISTRO DE PEDIDO', pageWidth / 2, y, { align: 'center' });
      y += 10;

      pdf.setFontSize(10);
      pdf.text(`ID Pedido: ${orderId}`, 10, y);
      y += 7;
      pdf.text(`Fecha de Aceptación: ${new Date().toLocaleString()}`, 10, y);
      y += 10;

      const head = [['Campo', 'Detalle']];
      const body = [
        ['ID Pedido', orderId],
        ['Estado', order.status],
        ['Cliente', order.customerUsername],
        ['Vendedor', order.sellerUsername || 'N/A'],
        ['Fecha Pedido', order.createdAt ? new Date(order.createdAt.toDate()).toLocaleString() : 'N/A'],
        ['Total', `$${(order.price || 0).toFixed(2)}`],
        ['Producto', product.name || 'N/A'],
        ['Talla', product.size || 'N/A'],
        ['Género', product.gender || 'N/A'],
        ['Precio Unitario', `$${(product.price || 0).toFixed(2)}`],
        ['Dirección de Envío', order.deliveryLocation || 'No especificada'],
        ['Día de Encuentro', order.deliveryDay || 'N/A'],
        ['Hora de Encuentro', order.deliveryTime || 'N/A'],
      ];

      pdf.autoTable({
        startY: y,
        head: head,
        body: body,
        theme: 'striped',
        styles: { font: 'helvetica', fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { top: 10, left: 10, right: 10 }
      });

      y = pdf.autoTable.previous.finalY + 10;
      pdf.text('Registro generado por BZ Online', pageWidth / 2, y, { align: 'center' });

    } else {
      // --- Layout para el TICKET DEL CLIENTE (Estilo ticket) ---
      // --- ENCABEZADO CON LOGO Y TÍTULO ---
      try {
          const logoPath = './Logo.jpg'; // asegúrate que esté junto al HTML
          const imgLogo = await toDataURL(logoPath);
          pdf.addImage(imgLogo, 'JPG', (pageWidth - 25) / 2, y, 25, 25);
          y += 30;
      } catch (err) {
          console.warn('No se pudo cargar el logo:', err);
          pdf.setFontSize(16);
          pdf.text('BZ ONLINE', pageWidth / 2, y, { align: 'center' });
          y += 10;
      }

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('ORDEN DE PEDIDO', pageWidth / 2, y, { align: 'center' });
      y += 6;
      pdf.line(5, y, pageWidth - 5, y);
      y += 5;

      // --- DATOS DEL PRODUCTO ---
      pdf.setFont('helvetica', 'bold');
      pdf.text('Producto:', 5, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(order.productName || '—', 25, y);
      y += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Talla:', 5, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(product.size || '—', 25, y);
      y += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Género:', 5, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(product.gender || '—', 25, y);
      y += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Precio:', 5, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`$${product.price?.toFixed(2) || '0.00'}`, 25, y);
      y += 8;

      pdf.line(5, y, pageWidth - 5, y);
      y += 5;

      // --- DATOS DEL CLIENTE ---
      pdf.setFont('helvetica', 'bold');
      pdf.text('Cliente:', 5, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(order.customerUsername || '—', 25, y);
      y += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Dirección:', 5, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(order.deliveryLocation || '—', 25, y, { maxWidth: pageWidth - 30 });
      y += 10;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Día de encuentro:', 5, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(order.deliveryDay || '—', 40, y);
      y += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Hora de encuentro:', 5, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(order.deliveryTime || '—', 40, y);
      y += 10;

      pdf.line(5, y, pageWidth - 5, y);
      y += 5;

      // --- TOTALES ---
      const subtotal = product.price || 0;
      const envio = 0;
      const total = subtotal + envio;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Subtotal:', 5, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`$${subtotal.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
      y += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Envío:', 5, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`$${envio.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
      y += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL:', 5, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`$${total.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
      y += 10;

      pdf.line(5, y, pageWidth - 5, y);
      y += 8;

      // --- CÓDIGO VISUAL (imagen del producto) ---
      if (product.imageUrl) {
          try {
              const img = await toDataURL(product.imageUrl);
              pdf.addImage(img, 'JPEG', 25, y, 30, 30);
          } catch (err) {
              console.warn('Error al cargar imagen del producto:', err);
          }
      }

      y += 35;
      pdf.setFontSize(8);
      pdf.text(`ID Pedido: ${orderId}`, pageWidth / 2, y, { align: 'center' });
      y += 5;
      pdf.text('¡Gracias por tu compra!', pageWidth / 2, y, { align: 'center' });
    }

    pdf.save(`${isSellerPdf ? 'registro' : 'ticket'}-${orderId}.pdf`);
  }

  // Función auxiliar para convertir imagen URL a Base64
  async function toDataURL(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudo cargar la imagen: ${url}`);
    const blob = await response.blob();
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
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