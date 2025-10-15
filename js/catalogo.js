document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    const userEmailEl = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const productList = document.getElementById('product-list');

    let currentUser;

    // 1. Auth Guard
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists && doc.data().role === 'cliente') {
                    currentUser = user;
                    userEmailEl.textContent = `Cliente: ${user.email}`;
                    loadProducts();
                } else {
                    // Si es vendedor, redirigir a admin
                    window.location.href = 'admin.html';
                }
            });
        } else {
            // Si no está logueado, redirigir a login
            window.location.href = 'index.html';
        }
    });

    // 2. Logout
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    });

    // 3. Cargar Productos
    function loadProducts() {
        db.collection('products').where('status', '==', 'disponible')
            .onSnapshot(snapshot => {
                productList.innerHTML = '';
                if (snapshot.empty) {
                    productList.innerHTML = '<p>No hay productos disponibles en este momento.</p>';
                    return;
                }
                snapshot.forEach(doc => {
                    const product = doc.data();
                    const productEl = document.createElement('div');
                    productEl.className = 'product-card';
                    productEl.innerHTML = `
                        <img src="${product.imageUrl}" alt="${product.name}">
                        <h3>${product.name}</h3>
                        <p>${product.description}</p>
                        <p class="price">$${product.price.toFixed(2)}</p>
                        <a href="perfil-vendedor.html?id=${product.sellerId}" class="seller-link">
                            <p class="seller">Vendido por: ${product.sellerEmail}</p>
                        </a>
                        <button class="order-btn" data-product-id="${doc.id}" data-product-name="${product.name}" data-seller-id="${product.sellerId}">Realizar Pedido</button>
                    `;
                    productList.appendChild(productEl);
                });
            });
    }

    // 4. Realizar Pedido (Listener de eventos)
    productList.addEventListener('click', e => {
        // Lógica para pedir
        if (e.target.classList.contains('order-btn')) {
            const productId = e.target.dataset.productId;
            const productName = e.target.dataset.productName;
            const sellerId = e.target.dataset.sellerId;
            placeOrder(productId, productName, sellerId);
        }
    });

    function placeOrder(productId, productName, sellerId) {
        db.collection('orders').add({
            productId: productId,
            productName: productName,
            sellerId: sellerId,
            customerId: currentUser.uid,
            customerEmail: currentUser.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert(`Pedido de "${productName}" realizado con éxito.`);
        }).catch(error => {
            console.error("Error al realizar pedido: ", error);
        });
    }
});