document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Elementos de la UI
    const userEmailEl = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const sellerEmailDisplay = document.getElementById('seller-email-display');
    const sellerAverageRating = document.getElementById('seller-average-rating');
    const ratingStarsContainer = document.querySelector('#rate-seller-section .rating-stars');
    const ratingFeedback = document.getElementById('rating-feedback');
    const sellerProductList = document.getElementById('seller-product-list');

    let currentUser;
    let sellerId;

    // 1. Auth Guard y obtener ID del vendedor
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            userEmailEl.textContent = `Cliente: ${currentUser.email}`;

            // Obtener el ID del vendedor de la URL
            const params = new URLSearchParams(window.location.search);
            sellerId = params.get('id');

            if (sellerId) {
                loadSellerData(sellerId);
            } else {
                window.location.href = 'catalogo.html'; // Si no hay ID, volver al catálogo
            }
        } else {
            window.location.href = 'index.html';
        }
    });

    // 2. Logout
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => window.location.href = 'index.html');
    });

    // 3. Cargar toda la información del vendedor
    function loadSellerData(id) {
        // Cargar email del vendedor
        db.collection('users').doc(id).get().then(doc => {
            if (doc.exists) {
                sellerEmailDisplay.textContent = `Vendedor: ${doc.data().email}`;
            }
        });

        // Cargar productos del vendedor
        db.collection('products').where('sellerId', '==', id).onSnapshot(snapshot => {
            sellerProductList.innerHTML = '';
            if (snapshot.empty) {
                sellerProductList.innerHTML = '<p>Este vendedor no tiene productos.</p>';
                return;
            }
            snapshot.forEach(doc => {
                const product = doc.data();
                const productEl = document.createElement('div');
                productEl.className = 'product-card-small'; // Usar una clase más pequeña si es necesario
                productEl.innerHTML = `
                    <img src="${product.imageUrl}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p class="price">$${product.price.toFixed(2)}</p>
                    <p>Estado: ${product.status}</p>
                `;
                sellerProductList.appendChild(productEl);
            });
        });

        // Cargar calificaciones del vendedor
        db.collection('ratings').where('sellerId', '==', id).onSnapshot(snapshot => {
            if (snapshot.empty) {
                sellerAverageRating.innerHTML = '<h3>Aún no tiene calificaciones</h3>';
                return;
            }
            let totalStars = 0;
            let ratingCount = 0;
            snapshot.forEach(doc => {
                totalStars += doc.data().stars;
                ratingCount++;
            });
            const average = (totalStars / ratingCount).toFixed(1);
            sellerAverageRating.innerHTML = `<h3>Calificación Promedio: ${average} ★ (${ratingCount} votos)</h3>`;
        });
    }

    // 4. Lógica para calificar
    ratingStarsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('star')) {
            const stars = parseInt(e.target.dataset.value);
            rateSeller(stars);
        }
    });

    function rateSeller(stars) {
        if (!sellerId || !currentUser) return;

        const ratingId = `${currentUser.uid}_${sellerId}`;
        db.collection('ratings').doc(ratingId).set({
            sellerId: sellerId,
            customerId: currentUser.uid,
            customerEmail: currentUser.email,
            stars: stars
        }, { merge: true })
        .then(() => {
            ratingFeedback.textContent = `¡Gracias! Has calificado con ${stars} estrellas.`;
            // Marcar visualmente las estrellas
            Array.from(ratingStarsContainer.children).forEach(child => {
                if(child.tagName === 'I') {
                    child.innerHTML = parseInt(child.dataset.value) <= stars ? '&#9733;' : '&#9734;';
                }
            });
        })
        .catch(error => {
            ratingFeedback.textContent = 'Error al guardar la calificación.';
            console.error("Error al calificar: ", error);
        });
    }
});
