document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburger-menu');
    const nav = document.getElementById('main-nav');

    if (hamburger && nav) {
        hamburger.addEventListener('click', () => {
            nav.classList.toggle('active');
        });
    }

    const auth = firebase.auth();
    const db = firebase.firestore();

    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    if (doc.data().role === 'cliente') {
                        initializeFloatingCart();
                    } else if (doc.data().role === 'vendedor') {
                        const cartIcon = document.getElementById('cart-icon');
                        if (cartIcon) {
                            cartIcon.remove();
                        }
                    }
                }
            });
        }
    });

    function initializeFloatingCart() {
        const cartIcon = document.getElementById('cart-icon');
        const cartModal = document.getElementById('cart-modal');
        const closeCartBtn = document.querySelector('.close-cart-btn');
        const cartItemsContainer = document.getElementById('cart-items-container');
        const cartCount = document.getElementById('cart-count');

        if (cartIcon) {
            cartIcon.addEventListener('click', () => {
                cartModal.classList.add('active');
                loadCartItems();
            });
        }

        if (closeCartBtn) {
            closeCartBtn.addEventListener('click', () => {
                cartModal.classList.remove('active');
            });
        }

        function getCart() {
            return JSON.parse(localStorage.getItem('cart')) || [];
        }

        function saveCart(cart) {
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
        }

        function updateCartCount() {
            const cart = getCart();
            if (cart.length > 0) {
                cartCount.textContent = cart.length;
                cartCount.style.display = 'flex';
            } else {
                cartCount.style.display = 'none';
            }
        }

        async function loadCartItems() {
            const cart = getCart();
            if (cart.length === 0) {
                cartItemsContainer.innerHTML = '<p>Tu carrito está vacío.</p>';
                return;
            }

            cartItemsContainer.innerHTML = ''; // Clear before loading

            for (const productId of cart) {
                const productRef = db.collection('products').doc(productId);
                const doc = await productRef.get();

                if (doc.exists) {
                    const product = doc.data();
                    const productElement = document.createElement('div');
                    productElement.classList.add('cart-item');
                    productElement.innerHTML = `
                        <img src="${product.imageUrl}" alt="${product.name}">
                        <div class="cart-item-info">
                            <h3>${product.name}</h3>
                            <p>$${product.price}</p>
                        </div>
                        <div class="cart-item-actions">
                            <button class="buy-btn" data-id="${doc.id}">Comprar</button>
                            <button class="remove-btn" data-id="${doc.id}">Eliminar</button>
                        </div>
                    `;
                    cartItemsContainer.appendChild(productElement);
                }
            }

            // Add event listeners for buy and remove buttons
            cartItemsContainer.querySelectorAll('.buy-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const productId = e.target.dataset.id;
                    window.location.href = `producto.html?id=${productId}`;
                });
            });

            cartItemsContainer.querySelectorAll('.remove-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const productId = e.target.dataset.id;
                    removeFromCart(productId);
                    loadCartItems(); // Reload cart items
                });
            });
        }

        function removeFromCart(productId) {
            let cart = getCart();
            cart = cart.filter(id => id !== productId);
            saveCart(cart);
        }

        // Initial cart count update on page load
        updateCartCount();
    }
});
