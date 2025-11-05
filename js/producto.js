document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    const logoutButton = document.getElementById('logout-button');
    const productDetailContainer = document.getElementById('product-detail-container');
    const deliveryModal = document.getElementById('delivery-modal');
    const closeModalButton = document.querySelector('.close-button');
    const confirmOrderBtn = document.getElementById('confirm-order-btn');
    const deliveryPointOption = document.getElementById('delivery-point-option');
    const personalAddressOption = document.getElementById('personal-address-option');
    const deliveryPointSelection = document.getElementById('delivery-point-selection');
    const personalAddressSelection = document.getElementById('personal-address-selection');
    const personalAddress = document.getElementById('personal-address');

    let currentUser;
    let currentProduct;

    // Alternar entre punto de entrega y dirección
    deliveryPointOption.addEventListener('change', () => {
        deliveryPointSelection.classList.remove('hidden');
        personalAddressSelection.classList.add('hidden');
    });

    personalAddressOption.addEventListener('change', () => {
        personalAddressSelection.classList.remove('hidden');
        deliveryPointSelection.classList.add('hidden');
    });

    // Autenticación
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    currentUser = { ...user, ...doc.data() };
                } else {
                    auth.signOut();
                }
            });
        } else {
            window.location.href = 'index.html';
        }
    });

    // Cerrar sesión
    logoutButton.addEventListener('click', () => {
        if (confirm('¿Deseas cerrar sesión?')) {
            auth.signOut().then(() => window.location.href = 'index.html');
        }
    });

    // Cargar producto
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
                    ${product.status === 'vendido' ? '<p class="product-status sold">VENDIDO</p>' : ''}
                    <p><strong>Vendedor:</strong> ${product.sellerUsername}</p>
                    <div class="product-actions">
                        <button id="buy-btn" ${product.status === 'vendido' ? 'disabled' : ''}>Comprar</button>
                        <button id="add-to-cart-btn" ${product.status === 'vendido' ? 'disabled' : ''}>Añadir al Carrito</button>
                    </div>
                </div>
            </section>
        `;
    }

    // Abrir modal y añadir a carrito
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

    // Modal de entrega
    closeModalButton.addEventListener('click', () => {
        deliveryModal.style.display = 'none';
    });

    function openDeliveryModal() {
        const deliveryLocationSelect = document.getElementById('delivery-location');
        deliveryLocationSelect.innerHTML = '<option value="">Selecciona un punto de entrega</option>';

        const defaultLocations = [
            'Punto 1 (Centro - BBVA)',
            'Punto 2 (Ayuntamiento)',
            'Punto 3 (Centro joyero)'
        ];

        defaultLocations.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc;
            option.textContent = loc;
            deliveryLocationSelect.appendChild(option);
        });

        db.collection('delivery_points').get().then(snapshot => {
            snapshot.forEach(doc => {
                const point = doc.data();
                const option = document.createElement('option');
                option.value = point.name;
                option.textContent = point.name;
                deliveryLocationSelect.appendChild(option);
            });
        });

        if (currentUser?.address) personalAddress.value = currentUser.address;

        deliveryModal.style.display = 'flex';
    }

    confirmOrderBtn.addEventListener('click', () => {
        let deliveryLocation = deliveryPointOption.checked
            ? document.getElementById('delivery-location').value
            : personalAddress.value;

        if (!deliveryLocation) {
            alert('Por favor, selecciona o ingresa un lugar de entrega.');
            return;
        }

        placeOrder(deliveryLocation);
    });

    function placeOrder(deliveryLocation) {
        const day = document.getElementById('delivery-day').value;
        const time = document.getElementById('delivery-time').value;

        if (!day || !time) {
            alert('Por favor, selecciona día y hora.');
            return;
        }

        db.collection('orders').add({
            productId: currentProduct.id,
            productName: currentProduct.name,
            price: currentProduct.price,
            sellerId: currentProduct.sellerId,
            customerId: currentUser.uid,
            customerUsername: currentUser.username,
            deliveryLocation,
            deliveryDay: day,
            deliveryTime: time,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pendiente'
        }).then(docRef => {
            db.collection('notifications').add({
                userId: currentProduct.sellerId,
                message: `El cliente ${currentUser.username} pidió "${currentProduct.name}"`,
                orderId: docRef.id,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert('¡Pedido realizado con éxito!');
            deliveryModal.style.display = 'none';
            window.location.href = 'catalogo.html';
        }).catch(err => {
            console.error(err);
            alert('Error al procesar tu pedido.');
        });
    }
});
