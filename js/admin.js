document.addEventListener('DOMContentLoaded', () => {
  const auth = firebase.auth();
  const db = firebase.firestore();

  // --- ELEMENTOS DE LA UI ---
  const logoutButton = document.getElementById('logout-button');
  const viewCatalogLink = document.getElementById('view-catalog-link');
  const addProductForm = document.getElementById('add-product-form');
  const myProductsList = document.getElementById('my-products-list');
  const myRatingsEl = document.getElementById('my-ratings');
  const ordersList = document.getElementById('orders-list');
  const notificationBell = document.getElementById('notification-bell');
  const notificationCount = document.getElementById('notification-count');
  const imageUploadInput = document.getElementById('image-upload');
  const productImageHiddenInput = document.getElementById('product-image');
  const imageUploadStatus = document.getElementById('image-upload-status');
  const pendingOrdersCount = document.getElementById('pending-orders-count');

  // Modales
  const orderDetailsModal = document.getElementById('order-details-modal');
  const closeOrderModalBtn = orderDetailsModal.querySelector('.close-button');
  const modalOrderDetails = document.getElementById('modal-order-details');

  const editProductModal = document.getElementById('edit-product-modal');
  const closeEditModalBtn = editProductModal.querySelector('.close-button');
  const editProductForm = document.getElementById('edit-product-form');
  const editProductId = document.getElementById('edit-product-id');
  const editProductName = document.getElementById('edit-product-name');
  const editProductPrice = document.getElementById('edit-product-price');
  const editProductDesc = document.getElementById('edit-product-desc');
  const editImageUpload = document.getElementById('edit-image-upload');
  const editImageUploadStatus = document.getElementById('edit-image-upload-status');
  const editProductImage = document.getElementById('edit-product-image');

  let currentUser;

  // --- HELPERS DE MODAL (accesibles, sin desbordes) ---
  let lastFocusedElement = null;
  let activeKeydownHandler = null;

  function getFocusable(container) {
    return container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
  }

  function openModal(el, { autoFocusSelector } = {}) {
    el.style.display = 'flex';
    document.body.classList.add('modal-open'); // bloquea scroll del fondo

    lastFocusedElement = document.activeElement;
    const focusables = getFocusable(el);
    const first = focusables[0];
    const toFocus = autoFocusSelector ? el.querySelector(autoFocusSelector) : first;
    if (toFocus) toFocus.focus();

    // cerrar con click fuera
    el.addEventListener('mousedown', onBackdropClick);
    function onBackdropClick(e) {
      if (e.target === el) closeModal(el);
    }
    el._onBackdropClick = onBackdropClick;

    // cerrar con ESC + trampa de foco
    activeKeydownHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal(el);
      } else if (e.key === 'Tab') {
        const items = Array.from(getFocusable(el));
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault(); lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault(); firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', activeKeydownHandler);
  }

  function closeModal(el) {
    el.style.display = 'none';
    document.body.classList.remove('modal-open');

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
    if (el._onBackdropClick) {
      el.removeEventListener('mousedown', el._onBackdropClick);
      el._onBackdropClick = null;
    }
    if (activeKeydownHandler) {
      document.removeEventListener('keydown', activeKeydownHandler);
      activeKeydownHandler = null;
    }
  }

  // --- LÓGICA DE PESTAÑAS ---
  const tabs = document.querySelectorAll('.tab-link');
  const tabContents = document.querySelectorAll('.tab-content');
  const tabsToggle = document.getElementById('tabs-toggle');
  const tabsNav = document.getElementById('tabs-nav');

  if (tabsToggle && tabsNav) {
    tabsToggle.addEventListener('click', () => {
      tabsNav.classList.toggle('active');
    });

    tabsNav.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-link')) {
        tabsNav.classList.remove('active');
      }
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(item => item.classList.remove('active'));
      tab.classList.add('active');

      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // --- INICIALIZACIÓN Y AUTH GUARD ---
  auth.onAuthStateChanged(user => {
    if (user) {
      db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists && doc.data().role === 'vendedor') {
          const userData = doc.data();
          currentUser = { ...user, ...userData };
          viewCatalogLink.style.display = 'none'; // Ocultar "Ver Catálogo"

         // ... dentro de onAuthStateChanged, cuando el role === 'vendedor'
const userNav = document.getElementById('main-nav');
const profileChip = document.createElement('a');
profileChip.href = `perfil-vendedor.html?id=${currentUser.uid}`;
profileChip.className = 'profile-chip';
profileChip.innerHTML = `
  <img class="chip-avatar" src="${currentUser.photoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.username) + '&background=2c2c2c&color=e0e0e0'}" alt="Perfil">
  <span class="chip-name">${currentUser.username}</span>
`;

userNav.insertBefore(profileChip, logoutButton);

          loadProducts(currentUser.uid);
          loadRatings(currentUser.uid);
          loadOrders(currentUser.uid);
          loadNotifications(currentUser.uid);
          loadPendingOrdersCount(currentUser.uid);
        } else {
          window.location.href = 'catalogo.html';
        }
      });
    } else {
      window.location.href = 'index.html';
    }
  });

  // --- LOGOUT ---
  logoutButton.addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = 'index.html');
  });

  // --- SUBIR IMAGEN A CLOUDINARY ---
  const CLOUD_NAME = 'dvdctjltz'; // <-- tu cloud
  const UPLOAD_PRESET = 'catalogo-productos'; // <-- tu preset

  imageUploadInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    
    imageUploadStatus.textContent = 'Subiendo imagen...';
    productImageHiddenInput.value = '';

    fetch(url, { method: 'POST', body: formData })
      .then(response => response.json())
      .then(data => {
        console.log('Cloudinary response:', data);
        if (data.secure_url) {
          imageUploadStatus.textContent = '¡Imagen subida con éxito!';
          imageUploadStatus.style.color = 'green';
          productImageHiddenInput.value = data.secure_url;
        } else {
          throw new Error('La URL segura no se encontró en la respuesta de Cloudinary.');
        }
      })
      .catch(error => {
        console.error('Error al subir la imagen a Cloudinary:', error);
        imageUploadStatus.textContent = 'Error al subir la imagen. Intenta de nuevo.';
        imageUploadStatus.style.color = 'red';
      });
  });

  // --- AÑADIR PRODUCTOS ---
  addProductForm.addEventListener('submit', e => {
    e.preventDefault();
    console.log('Submitting product form...');

    const productName = document.getElementById('product-name').value;
    const productDesc = document.getElementById('product-desc').value;
    const productPrice = parseFloat(document.getElementById('product-price').value);
    const productSize = document.getElementById('product-size').value;
    const productGender = document.getElementById('product-gender').value;
    const imageUrl = document.getElementById('product-image').value;

    if (!imageUrl) {
      alert('Por favor, espera a que la imagen termine de subir.');
      return;
    }

    db.collection('products').add({
      name: productName,
      description: productDesc,
      price: productPrice,
      size: productSize,
      gender: productGender,
      imageUrl: imageUrl,
      sellerId: currentUser.uid,
      sellerUsername: currentUser.username,
      status: 'disponible'
    }).then(() => {
      addProductForm.reset();
      imageUploadStatus.textContent = '';
      alert('¡Producto añadido con éxito!');
    }).catch(error => {
      console.error("Error al añadir producto: ", error);
      alert('Hubo un error al guardar el producto.');
    });
  });

  // --- CARGAR PRODUCTOS DEL VENDEDOR ---
  function loadProducts(sellerId) {
    db.collection('products').where('sellerId', '==', sellerId).onSnapshot(snapshot => {
      myProductsList.innerHTML = '';
      if (snapshot.empty) {
        myProductsList.innerHTML = '<p>Aún no has añadido ningún producto.</p>';
        return;
      }
      myProductsList.className = 'product-grid';
      snapshot.forEach(doc => {
        const product = doc.data();
        const productId = doc.id;
        const productEl = document.createElement('div');
        productEl.className = 'product-card';
        productEl.innerHTML = `
          <img src="${product.imageUrl}" alt="${product.name}">
          <div class="product-card-content">
            <h3>${product.name}</h3>
            <p class="price">$${product.price.toFixed(2)}</p>
            <p>${product.description}</p>
          </div>
          <div class="product-card-actions">
            <button class="action-btn edit-btn" data-product-id="${productId}">Editar</button>
            <button class="action-btn delete-btn" data-product-id="${productId}">Eliminar</button>
          </div>
        `;
        myProductsList.appendChild(productEl);
      });

      myProductsList.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.dataset.productId;
          deleteProduct(productId);
        });
      });

      myProductsList.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.dataset.productId;
          openEditModal(productId);
        });
      });
    });
  }

  // --- EDITAR PRODUCTO ---
  function openEditModal(productId) {
    db.collection('products').doc(productId).get().then(doc => {
      if (doc.exists) {
        const product = doc.data();
        editProductId.value = doc.id;
        editProductName.value = product.name;
        editProductPrice.value = product.price;
        editProductDesc.value = product.description;
        editProductImage.value = product.imageUrl;
        document.getElementById('edit-product-size').value = product.size;
        document.getElementById('edit-product-gender').value = product.gender;

        openModal(editProductModal, { autoFocusSelector: '#edit-product-name' });
      }
    });
  }

  closeEditModalBtn.addEventListener('click', () => {
    closeModal(editProductModal);
  });

  editProductForm.addEventListener('submit', e => {
    e.preventDefault();
    const productId = editProductId.value;
    const updatedProduct = {
      name: editProductName.value,
      price: parseFloat(editProductPrice.value),
      description: editProductDesc.value,
      imageUrl: editProductImage.value,
      size: document.getElementById('edit-product-size').value,
      gender: document.getElementById('edit-product-gender').value
    };

    db.collection('products').doc(productId).update(updatedProduct).then(() => {
      alert('Producto actualizado con éxito');
      closeModal(editProductModal);
    }).catch(error => {
      console.error('Error al actualizar el producto: ', error);
      alert('Hubo un error al actualizar el producto.');
    });
  });

  editImageUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    
    editImageUploadStatus.textContent = 'Subiendo imagen...';
    editProductImage.value = '';

    fetch(url, { method: 'POST', body: formData })
      .then(response => response.json())
      .then(data => {
        if (data.secure_url) {
          editImageUploadStatus.textContent = '¡Imagen subida con éxito!';
          editImageUploadStatus.style.color = 'green';
          editProductImage.value = data.secure_url;
        } else {
          throw new Error('La URL segura no se encontró en la respuesta de Cloudinary.');
        }
      })
      .catch(error => {
        console.error('Error al subir la imagen a Cloudinary:', error);
        editImageUploadStatus.textContent = 'Error al subir la imagen. Intenta de nuevo.';
        editImageUploadStatus.style.color = 'red';
      });
  });

  function deleteProduct(productId) {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      db.collection('products').doc(productId).delete()
        .then(() => console.log('Producto eliminado'))
        .catch(error => console.error('Error al eliminar el producto: ', error));
    }
  }

  // --- CALIFICACIONES ---
  function loadRatings(sellerId) {
    db.collection('ratings').where('sellerId', '==', sellerId).onSnapshot(snapshot => {
      myRatingsEl.innerHTML = '';
      if (snapshot.empty) {
        myRatingsEl.innerHTML = '<p>Aún no tienes calificaciones.</p>';
        return;
      }
      let totalStars = 0;
      let ratingCount = 0;
      snapshot.forEach(doc => {
        const rating = doc.data();
        totalStars += rating.stars;
        ratingCount++;
      });
      const averageRating = (totalStars / ratingCount).toFixed(1);
      const averageEl = document.createElement('div');
      averageEl.className = 'average-rating-summary';
      averageEl.innerHTML = `
        <h3>Promedio de Calificaciones</h3>
        <div class="average-stars">${averageRating} ★</div>
        <p>Basado en ${ratingCount} calificaciones</p>
      `;
      myRatingsEl.appendChild(averageEl);
    });
  }

  // --- PEDIDOS ---
  function loadOrders(sellerId) {
    db.collection('orders').where('sellerId', '==', sellerId).onSnapshot(snapshot => {
      ordersList.innerHTML = '';
      if (snapshot.empty) {
        ordersList.innerHTML = '<p>No tienes pedidos.</p>';
        return;
      }
      const table = document.createElement('table');
      table.className = 'orders-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector('tbody');
      snapshot.forEach(doc => {
        const order = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${order.productName}</td>
          <td>${order.customerUsername}</td>
          <td><span class="status status-${order.status || 'pendiente'}">${order.status || 'pendiente'}</span></td>
          <td class="action-buttons">
            <button class="action-btn details-btn" data-id="${doc.id}">Detalles</button>
            ${(order.status === 'pendiente' || !order.status) ? 
              `<button class="action-btn accept-btn" data-id="${doc.id}">Aceptar</button>
               <button class="action-btn reject-btn" data-id="${doc.id}">Rechazar</button>` : ''
            }
            <button class="action-btn delete-btn" data-id="${doc.id}">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      ordersList.appendChild(table);

      ordersList.querySelectorAll('.details-btn').forEach(button => {
        button.addEventListener('click', e => showOrderDetails(e.target.dataset.id));
      });
      ordersList.querySelectorAll('.accept-btn').forEach(button => {
        button.addEventListener('click', e => acceptOrder(e.target.dataset.id));
      });
      ordersList.querySelectorAll('.reject-btn').forEach(button => {
        button.addEventListener('click', e => rejectOrder(e.target.dataset.id));
      });
      ordersList.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', e => deleteOrder(e.target.dataset.id));
      });
    });
  }

  function showOrderDetails(orderId) {
    db.collection('orders').doc(orderId).get().then(doc => {
      if (doc.exists) {
        const order = doc.data();
        const orderDate = order.createdAt?.seconds
          ? new Date(order.createdAt.seconds * 1000)
          : new Date();
        const formattedDate = orderDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

        orderDetailsModal.querySelector('h2').textContent = 'Detalles del Pedido';
        orderDetailsModal.querySelector('.close-button').style.display = 'block';

        modalOrderDetails.innerHTML = `
          <div class="ticket-logo-container">
            <img src="https://res.cloudinary.com/dvdctjltz/image/upload/v1761329349/Logo_fhwezv.jpg" alt="Logo" class="ticket-logo">
          </div>
          <div class="order-meta">
            <p><strong>Fecha:</strong> ${formattedDate}</p>
          </div>
          <div class="order-details-body">
            <p><strong>Producto:</strong> ${order.productName}</p>
            <p><strong>Cliente:</strong> ${order.customerUsername}</p>
            <p><strong>Lugar de Entrega:</strong> ${order.deliveryLocation || '-'}</p>
            <p><strong>Estado:</strong> <span class="status status-${order.status || 'pendiente'}">${order.status || 'pendiente'}</span></p>
          </div>
        `;
        openModal(orderDetailsModal, { autoFocusSelector: '.close-button' });
      } else {
        alert('No se encontraron detalles para este pedido.');
      }
    });
  }

  closeOrderModalBtn.addEventListener('click', () => closeModal(orderDetailsModal));

  function deleteOrder(orderId) {
    if (confirm('¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.')) {
      db.collection('orders').doc(orderId).delete()
        .then(() => alert('Pedido eliminado con éxito.'))
        .catch(error => {
          console.error('Error al eliminar pedido: ', error);
          alert('Hubo un error al eliminar el pedido.');
        });
    }
  }

  function acceptOrder(orderId) {
    db.collection('orders').doc(orderId).update({ status: 'aceptado' })
      .then(() => {
        db.collection('orders').doc(orderId).get().then(doc => {
          const order = doc.data();
          db.collection('notifications').add({
            userId: order.customerId,
            message: `Tu pedido de "${order.productName}" ha sido aceptado.`,
            orderId: orderId,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          alert('Pedido aceptado y cliente notificado.');
        });
      }).catch(error => {
        console.error("Error al aceptar pedido: ", error);
        alert('Hubo un error al aceptar el pedido.');
      });
  }

  function rejectOrder(orderId) {
    db.collection('orders').doc(orderId).update({ status: 'rechazado' })
      .then(() => {
        db.collection('orders').doc(orderId).get().then(doc => {
          const order = doc.data();
          db.collection('notifications').add({
            userId: order.customerId,
            message: `El vendedor rechazó su pedido de "${order.productName}". Por favor, contacta al vendedor para más detalles.`,
            orderId: orderId,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          alert('Pedido rechazado y cliente notificado.');
        });
      }).catch(error => {
        console.error("Error al rechazar pedido: ", error);
        alert('Hubo un error al rechazar el pedido.');
      });
  }

  function loadPendingOrdersCount(sellerId) {
    db.collection('orders').where('sellerId', '==', sellerId).where('status', '==', 'pendiente').onSnapshot(snapshot => {
        const count = snapshot.size;
        if (count > 0) {
            pendingOrdersCount.textContent = count;
            pendingOrdersCount.style.display = 'inline-block';
        } else {
            pendingOrdersCount.style.display = 'none';
        }
    });
  }

  // --- NOTIFICACIONES ---
  function loadNotifications(sellerId) {
    db.collection('orders')
      .where('sellerId', '==', sellerId)
      .where('status', '==', 'pendiente')
      .onSnapshot(snapshot => {
        const newOrdersCount = snapshot.size;
        if (newOrdersCount > 0) {
          notificationCount.textContent = newOrdersCount;
          notificationCount.style.display = 'block';
        } else {
          notificationCount.style.display = 'none';
        }
      });
  }
}); // DOMContentLoaded


// === CARRUSEL (Mis Productos) ===
(function initMyProductsCarousel(){
  const carousel = document.getElementById('my-products-carousel');
  if (!carousel) return;

  const viewport = carousel.querySelector('.carousel-viewport');
  const track    = carousel.querySelector('.carousel-track');
  const btnPrev  = carousel.querySelector('.carousel-btn.prev');
  const btnNext  = carousel.querySelector('.carousel-btn.next');
  const dotsWrap = document.getElementById('my-products-dots');

  function updateUI() {
    const maxScroll = track.scrollWidth - viewport.clientWidth;
    const atStart = viewport.scrollLeft <= 2;
    const atEnd = viewport.scrollLeft >= maxScroll - 2;

    btnPrev.disabled = atStart;
    btnNext.disabled = atEnd;

    const cards = track.querySelectorAll('.product-card');
    if (!cards.length) return;

    const viewportMid = viewport.scrollLeft + viewport.clientWidth / 2;
    let nearestIndex = 0, nearestDist = Infinity;

    cards.forEach((card, idx) => {
      const left = card.offsetLeft;
      const center = left + card.clientWidth / 2;
      const dist = Math.abs(center - viewportMid);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = idx;
      }
    });

    const btns = dotsWrap.querySelectorAll('button');
    btns.forEach((b,i)=> b.setAttribute('aria-current', i===nearestIndex ? 'true' : 'false'));
  }

  function buildDots() {
    dotsWrap.innerHTML = '';
    const cards = track.querySelectorAll('.product-card');
    cards.forEach((card, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Ir a producto ${index+1}`);
      dot.addEventListener('click', () => {
        const left = card.offsetLeft - 8;
        viewport.scrollTo({ left, behavior: 'smooth' });
      });
      dotsWrap.appendChild(dot);
    });
    updateUI();
  }

  btnPrev.addEventListener('click', () => {
    const step = viewport.clientWidth * 0.9;
    viewport.scrollBy({ left: -step, behavior: 'smooth' });
  });
  btnNext.addEventListener('click', () => {
    const step = viewport.clientWidth * 0.9;
    viewport.scrollBy({ left: step, behavior: 'smooth' });
  });

  viewport.addEventListener('scroll', () => { window.requestAnimationFrame(updateUI); });
  window.addEventListener('resize', updateUI);

  const mo = new MutationObserver(() => { buildDots(); });
  mo.observe(track, { childList: true });

  if (track.children.length) buildDots();
})();
