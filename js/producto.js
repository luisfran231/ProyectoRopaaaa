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
    const deliveryPointOption = document.getElementById('delivery-point-option');
    const personalAddressOption = document.getElementById('personal-address-option');
    const deliveryPointSelection = document.getElementById('delivery-point-selection');
    const personalAddressSelection = document.getElementById('personal-address-selection');
    const personalAddress = document.getElementById('personal-address');

    let currentUser;
    let currentProduct;

    // --- Event listeners for delivery options ---
    deliveryPointOption.addEventListener('change', () => {
        deliveryPointSelection.classList.remove('hidden');
        personalAddressSelection.classList.add('hidden');
    });

    personalAddressOption.addEventListener('change', () => {
        personalAddressSelection.classList.remove('hidden');
        deliveryPointSelection.classList.add('hidden');
    });

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
                    <div class="product-actions">
                    <button id="buy-btn">Comprar</button>
                    <button id="add-to-cart-btn">Añadir al Carrito</button>
                </div>
                </div>
            </section>
        `;
    }

    // --- LÓGICA DEL MODAL DE ENTREGA ---
    // --- LÓGICA DEL MODAL DE ENTREGA Y CARRITO ---
    productDetailContainer.addEventListener('click', e => {
        if (e.target.id === 'buy-btn') {
            openDeliveryModal();
        }
        if (e.target.id === 'add-to-cart-btn') {
            addToCart(currentProduct.id);
        }
    });

    function getCart() {
        return JSON.parse(localStorage.getItem('cart')) || [];
    }

    function saveCart(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    function addToCart(productId) {
        let cart = getCart();
        if (!cart.includes(productId)) {
            cart.push(productId);
            saveCart(cart);
            alert('¡Producto añadido al carrito!');
        } else {
            alert('Este producto ya está en tu carrito.');
        }
    }

    closeModalButton.addEventListener('click', () => {
        deliveryModal.style.display = 'none';
    });

    function openDeliveryModal() {
        const deliveryLocationSelect = document.getElementById('delivery-location');
        deliveryLocationSelect.innerHTML = '<option value="">Selecciona un punto de entrega</option>'; // Limpiar opciones

        const specificLocations = [
            'Punto de entrega 1 (Centro de iguala cerca del banco BBVA)',
            'Punto de entrega 2 (Centro de iguala cerca del ayuntamiento)',
            'Punto de entrega 3 (Centro de iguala cerca del centro joyero)'
        ];

        specificLocations.forEach(location => {
            const optionEl = document.createElement('option');
            optionEl.value = location;
            optionEl.textContent = location;
            deliveryLocationSelect.appendChild(optionEl);
        });

        // Fetch delivery points from Firestore
        db.collection('delivery_points').get().then(snapshot => {
            snapshot.forEach(doc => {
                const point = doc.data();
                const optionEl = document.createElement('option');
                optionEl.value = point.name;
                optionEl.textContent = point.name;
                deliveryLocationSelect.appendChild(optionEl);
            });
        });

        // Pre-fill personal address
        if (currentUser.address) {
            personalAddress.value = currentUser.address;
        }

        deliveryModal.style.display = 'flex';
    }

    confirmOrderBtn.addEventListener('click', () => {
        let selectedLocation = '';
        if (deliveryPointOption.checked) {
            selectedLocation = document.getElementById('delivery-location').value;
        } else if (personalAddressOption.checked) {
            selectedLocation = personalAddress.value;
        }

        if (selectedLocation && selectedLocation !== '') {
            placeOrder(selectedLocation);
        } else {
            alert('Por favor, selecciona o ingresa un lugar de entrega.');
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pendiente' // Estado inicial
        }).then((docRef) => {
            // Notificación para el vendedor
            db.collection('notifications').add({
                userId: currentProduct.sellerId,
                message: `El cliente ${currentUser.username} te hizo un pedido de "${currentProduct.name}"`, 
                orderId: docRef.id,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert(`¡Pedido de "${currentProduct.name}" realizado con éxito!`);
            deliveryModal.style.display = 'none';
            window.location.href = 'catalogo.html'; // Redirigir al catálogo
        }).catch(error => {
            console.error("Error al realizar pedido: ", error);
            alert('Hubo un error al procesar tu pedido.');
        });
    }
});
