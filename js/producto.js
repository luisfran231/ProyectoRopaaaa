document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Elementos de la UI
    const userDisplay = document.getElementById('user-display');
    const logoutButton = document.getElementById('logout-button');
    const productDetailContainer = document.getElementById('product-detail-container');
    const deliveryModal = document.getElementById('delivery-modal');
    const closeModalButton = document.querySelector('.close-button');
    const deliveryOptionsContainer = document.getElementById('delivery-options');
    const confirmOrderBtn = document.getElementById('confirm-order-btn');

    let currentUser;
    let currentProduct;

    // --- INICIALIZACIÓN Y AUTH GUARD ---
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    currentUser = { ...user, ...doc.data() };
                    userDisplay.textContent = `${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}: ${currentUser.username}`;
                } else {
                    auth.signOut();
                }
            });
        } else {
            window.location.href = 'index.html';
        }
    });

    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => window.location.href = 'index.html');
    });

    // --- CARGA DEL PRODUCTO ---
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (productId) {
        loadProduct(productId);
    } else {
        productDetailContainer.innerHTML = '<p>Producto no encontrado.</p>';
    }

    function loadProduct(id) {
        db.collection('products').doc(id).get().then(doc => {
            if (doc.exists) {
                currentProduct = { id: doc.id, ...doc.data() };
                renderProduct(currentProduct);
            } else {
                productDetailContainer.innerHTML = '<p>Producto no encontrado.</p>';
            }
        });
    }

    function renderProduct(product) {
        productDetailContainer.innerHTML = `
            <section class="product-detail-layout">
                <div class="product-detail-image">
                    <img src="${product.imageUrl}" alt="${product.name}">
                </div>
                <div class="product-detail-info">
                    <h2>${product.name}</h2>
                    <p class="price">MXN $${product.price.toFixed(2)}</p>
                    <p>Talla: ${product.size || 'N/A'}</p>
                    <p>Género: ${product.gender || 'N/A'}</p>
                    <p>${product.description}</p>
                    <a href="perfil-vendedor.html?id=${product.sellerId}" class="seller-link">
                        Vendido por: ${product.sellerUsername}
                    </a>
                    <button id="buy-btn">Comprar</button>
                </div>
            </section>
        `;
    }

    // --- LÓGICA DEL MODAL DE ENTREGA ---
    productDetailContainer.addEventListener('click', e => {
        if (e.target.id === 'buy-btn') {
            openDeliveryModal();
        }
    });

    closeModalButton.addEventListener('click', () => {
        deliveryModal.style.display = 'none';
    });

    function openDeliveryModal() {
        const deliveryLocationSelect = document.getElementById('delivery-location');
        deliveryLocationSelect.innerHTML = '<option value="">Selecciona una dirección</option>'; // Limpiar opciones

        const specificLocations = [
            'Punto de entrega 1 (Centro de iguala cerca del banco BBVA)', // Placeholder
            'Punto de entrega 2 (Centro de iguala cerca del ayuntamiento)', // Placeholder
            'Punto de entrega 3 (Centro de iguala cerca del centro joyero)'  // Placeholder
        ];

        if (currentUser.address) {
            specificLocations.push(`Mi dirección: ${currentUser.address}`);
        }

        specificLocations.forEach(location => {
            const optionEl = document.createElement('option');
            optionEl.value = location;
            optionEl.textContent = location;
            deliveryLocationSelect.appendChild(optionEl);
        });

        deliveryModal.style.display = 'flex';
    }

    confirmOrderBtn.addEventListener('click', () => {
        const selectedLocation = document.getElementById('delivery-location').value;
        if (selectedLocation && selectedLocation !== '') {
            placeOrder(selectedLocation);
        } else {
            alert('Por favor, selecciona un lugar de entrega.');
        }
    });

    function placeOrder(deliveryLocation) {
        const deliveryDay = document.getElementById('delivery-day').value;
        const deliveryTime = document.getElementById('delivery-time').value;

        if (!deliveryDay || !deliveryTime) {
            alert('Por favor, selecciona el día y la hora de encuentro.');
            return;
        }

        db.collection('orders').add({
            productId: currentProduct.id,
            productName: currentProduct.name,
            sellerId: currentProduct.sellerId,
            customerId: currentUser.uid,
            customerUsername: currentUser.username,
            deliveryLocation: deliveryLocation,
            deliveryDay: deliveryDay, // Nuevo campo
            deliveryTime: deliveryTime, // Nuevo campo
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert(`¡Pedido de "${currentProduct.name}" realizado con éxito!`);
            deliveryModal.style.display = 'none';
            window.location.href = 'catalogo.html'; // Redirigir al catálogo
        }).catch(error => {
            console.error("Error al realizar pedido: ", error);
            alert('Hubo un error al procesar tu pedido.');
        });
    }
});
