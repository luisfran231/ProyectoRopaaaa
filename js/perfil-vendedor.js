document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Elementos de la UI
    const userEmailEl = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const sellerEmailDisplay = document.getElementById('seller-email-display');
    const sellerAverageRating = document.getElementById('seller-average-rating');
    const ratingStarsContainer = document.getElementById('rating-stars-container');
    const ratingFeedback = document.getElementById('rating-feedback');
    const sellerProductList = document.getElementById('seller-product-list');

    let currentUser;
    let sellerId;

    // --- INICIALIZACIÓN ---
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    currentUser = user;
                    currentUser.username = userData.username;

                    userEmailEl.textContent = `${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}: ${userData.username}`;
                    
                    const params = new URLSearchParams(window.location.search);
                    sellerId = params.get('id');
        
                    if (sellerId) {
                        loadSellerData(sellerId);
                        setupStarRating();
                    } else {
                        window.location.href = 'catalogo.html';
                    }
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

    // --- CARGA DE DATOS DEL VENDEDOR ---
    function loadSellerData(id) {
        // Cargar email
        db.collection('users').doc(id).get().then(doc => {
            if (doc.exists) {
                sellerEmailDisplay.textContent = `Vendedor: ${doc.data().username}`;
            }
        });

        // Cargar productos
        db.collection('products').where('sellerId', '==', id).onSnapshot(snapshot => {
            sellerProductList.innerHTML = '';
            if (snapshot.empty) {
                sellerProductList.innerHTML = '<p>Este vendedor aún no tiene productos a la venta.</p>';
                return;
            }
            snapshot.forEach(doc => {
                const product = doc.data();
                const productEl = document.createElement('div');
                productEl.className = 'product-card'; // Usamos la clase estándar para consistencia
                productEl.innerHTML = `
                    <img src="${product.imageUrl}" alt="${product.name}">
                    <div class="product-card-content">
                        <h3>${product.name}</h3>
                        <p class="price">$${product.price.toFixed(2)}</p>
                        <p>${product.description}</p>
                    </div>
                `;
                sellerProductList.appendChild(productEl);
            });
        });

        // Cargar y mostrar calificación promedio
        db.collection('ratings').where('sellerId', '==', id).onSnapshot(snapshot => {
            sellerAverageRating.innerHTML = ''; // Limpiar antes de renderizar
            if (snapshot.empty) {
                sellerAverageRating.innerHTML = '<span>Aún no tiene calificaciones</span>';
                return;
            }
            let totalStars = 0;
            let ratingCount = 0;
            snapshot.forEach(doc => {
                totalStars += doc.data().stars;
                ratingCount++;
            });
            const average = totalStars / ratingCount;
            const averageRounded = Math.round(average);

            const ratingValue = document.createElement('span');
            ratingValue.textContent = `${average.toFixed(1)} de 5`;
            
            const starsWrapper = document.createElement('div');
            starsWrapper.className = 'rating-stars';

            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('i');
                star.className = 'star';
                star.innerHTML = '&#9733;'; // Usamos el caracter de estrella llena
                if (i <= averageRounded) {
                    star.classList.add('filled');
                }
                starsWrapper.appendChild(star);
            }
            
            sellerAverageRating.appendChild(ratingValue);
            sellerAverageRating.appendChild(starsWrapper);
        });
    }

    // --- LÓGICA DEL SISTEMA DE CALIFICACIÓN ---
    function setupStarRating() {
        ratingStarsContainer.innerHTML = ''; // Limpiar contenedor
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('i');
            star.className = 'star';
            star.dataset.value = i;
            star.innerHTML = '&#9734;'; // Estrella vacía
            ratingStarsContainer.appendChild(star);
        }

        const stars = ratingStarsContainer.querySelectorAll('.star');

        stars.forEach(star => {
            star.addEventListener('mouseover', handleStarHover);
            star.addEventListener('mouseout', handleStarMouseOut);
            star.addEventListener('click', handleStarClick);
        });
    }

    function handleStarHover(e) {
        const hoverValue = e.target.dataset.value;
        const stars = ratingStarsContainer.querySelectorAll('.star');
        stars.forEach(star => {
            star.classList.remove('hovered');
            if (star.dataset.value <= hoverValue) {
                star.classList.add('hovered');
            }
        });
    }

    function handleStarMouseOut() {
        ratingStarsContainer.querySelectorAll('.star').forEach(star => star.classList.remove('hovered'));
    }

    function handleStarClick(e) {
        const starsValue = parseInt(e.target.dataset.value);
        rateSeller(starsValue);
    }

    function rateSeller(stars) {
        if (!sellerId || !currentUser) return;

        const ratingId = `${currentUser.uid}_${sellerId}`;
        db.collection('ratings').doc(ratingId).set({
            sellerId: sellerId,
            customerId: currentUser.uid,
            customerUsername: currentUser.username, // Guardar el username del cliente
            stars: stars
        }, { merge: true })
        .then(() => {
            ratingFeedback.textContent = `¡Gracias! Has calificado con ${stars} estrellas.`;
            // Actualizar visualmente las estrellas seleccionadas
            const starElements = ratingStarsContainer.querySelectorAll('.star');
            starElements.forEach(star => {
                star.innerHTML = parseInt(star.dataset.value) <= stars ? '&#9733;' : '&#9734;';
                star.classList.remove('hovered');
                if (parseInt(star.dataset.value) <= stars) {
                    star.classList.add('filled');
                } else {
                    star.classList.remove('filled');
                }
            });
        })
        .catch(error => {
            ratingFeedback.textContent = 'Error al guardar la calificación. Inténtalo de nuevo.';
            console.error("Error al calificar: ", error);
        });
    }
});