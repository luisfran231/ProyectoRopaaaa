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

    // Elementos del perfil del vendedor
    const sellerPhoneDisplay = document.getElementById('seller-phone-display');
    const editSellerProfileBtn = document.getElementById('edit-seller-profile-btn');

    // Elementos del modal de edición de perfil de vendedor
    const editSellerProfileModal = document.getElementById('edit-seller-profile-modal');
    const closeButtonSellerProfileModal = editSellerProfileModal.querySelector('.close-button-seller-profile');
    const editSellerProfileForm = document.getElementById('edit-seller-profile-form');
    const editSellerUsernameInput = document.getElementById('edit-seller-username');
    const editSellerPhoneInput = document.getElementById('edit-seller-phone');

    // Nuevos elementos para la gestión de productos
    const otherSellerProductsSection = document.getElementById('other-seller-products-section');
    const otherSellerProductsTitle = document.getElementById('other-seller-products-title');
    const otherSellerProductList = document.getElementById('other-seller-product-list');
    const myProductsSection = document.getElementById('my-products-section');
    const myProductList = document.getElementById('my-product-list');
    const rateSellerSection = document.getElementById('rate-seller-section');

    // Elementos del modal de edición
    const editProductModal = document.getElementById('edit-product-modal');
    const closeButtonProductModal = editProductModal.querySelector('.close-button');
    const editProductForm = document.getElementById('edit-product-form');
    const editProductId = document.getElementById('edit-product-id');
    const editProductName = document.getElementById('edit-product-name');
    const editProductDescription = document.getElementById('edit-product-description');
    const editProductPrice = document.getElementById('edit-product-price');
    const editProductImageUrl = document.getElementById('edit-product-image-url');

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
                    currentUser.phone = userData.phone || ''; // Cargar teléfono

                    userEmailEl.textContent = `${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}: ${userData.username}`;
                    
                    const params = new URLSearchParams(window.location.search);
                    sellerId = params.get('id');
        
                    if (sellerId) {
                        // Si el usuario logueado es el dueño de este perfil
                        if (currentUser.uid === sellerId) {
                            myProductsSection.classList.remove('hidden');
                            otherSellerProductsSection.classList.add('hidden');
                            rateSellerSection.classList.add('hidden'); // No se puede calificar a uno mismo
                            editSellerProfileBtn.classList.remove('hidden'); // Mostrar botón de editar perfil
                            loadMyProducts(currentUser.uid);
                            sellerEmailDisplay.textContent = `Mi Perfil: ${userData.username}`;
                            sellerPhoneDisplay.textContent = `Teléfono: ${userData.phone || 'No especificado'}`;
                            loadSellerRatings(currentUser.uid); // Cargar mis calificaciones como vendedor

                            // Pre-fill edit seller profile form
                            editSellerUsernameInput.value = userData.username;
                            editSellerPhoneInput.value = userData.phone || '';
                        } else { // Si está viendo el perfil de otro vendedor
                            otherSellerProductsSection.classList.remove('hidden');
                            rateSellerSection.classList.remove('hidden');
                            myProductsSection.classList.add('hidden');
                            editSellerProfileBtn.classList.add('hidden'); // Ocultar botón de editar perfil
                            loadSellerData(sellerId);
                            setupStarRating();
                        }
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

    // --- CARGA DE DATOS DEL VENDEDOR (para otros vendedores) ---
    function loadSellerData(id) {
        // Cargar email y teléfono
        db.collection('users').doc(id).get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                otherSellerProductsTitle.textContent = `Productos de ${userData.username}`;
                sellerEmailDisplay.textContent = `Vendedor: ${userData.username}`;
                sellerPhoneDisplay.textContent = `Teléfono: ${userData.phone || 'No especificado'}`;
            }
        });

        // Cargar productos
        db.collection('products').where('sellerId', '==', id).onSnapshot(snapshot => {
            otherSellerProductList.innerHTML = '';
            if (snapshot.empty) {
                otherSellerProductList.innerHTML = '<p>Este vendedor aún no tiene productos a la venta.</p>';
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
                        ${product.isSold ? '<span class="product-status sold">VENDIDO</span>' : ''}
                    </div>
                `;
                otherSellerProductList.appendChild(productEl);
            });
        });

        loadSellerRatings(id);
    }

    // --- CARGA DE MIS PRODUCTOS (para el vendedor logueado) ---
    function loadMyProducts(userId) {
        db.collection('products').where('sellerId', '==', userId).onSnapshot(snapshot => {
            myProductList.innerHTML = '';
            if (snapshot.empty) {
                myProductList.innerHTML = '<p>Aún no tienes productos a la venta. ¡Anímate a publicar el primero!</p>';
                return;
            }
            snapshot.forEach(doc => {
                const product = { id: doc.id, ...doc.data() };
                const productEl = document.createElement('div');
                productEl.className = 'product-card';
                productEl.innerHTML = `
                    <img src="${product.imageUrl}" alt="${product.name}">
                    <div class="product-card-content">
                        <h3>${product.name}</h3>
                        <p class="price">$${product.price.toFixed(2)}</p>
                        <p>${product.description}</p>
                        ${product.isSold ? '<span class="product-status sold">VENDIDO</span>' : '<span class="product-status available">DISPONIBLE</span>'}
                        <div class="product-actions">
                            <button class="edit-product-btn" data-id="${product.id}">Editar</button>
                            <button class="toggle-sold-btn" data-id="${product.id}" data-issold="${product.isSold}">
                                ${product.isSold ? 'Marcar como Disponible' : 'Marcar como Vendido'}
                            </button>
                        </div>
                    </div>
                `;
                myProductList.appendChild(productEl);
            });

            // Adjuntar event listeners después de que los elementos estén en el DOM
            document.querySelectorAll('.edit-product-btn').forEach(button => {
                button.addEventListener('click', (e) => openEditModal(e.target.dataset.id));
            });
            document.querySelectorAll('.toggle-sold-btn').forEach(button => {
                button.addEventListener('click', (e) => toggleProductSoldStatus(e.target.dataset.id, e.target.dataset.issold === 'true'));
            });
        });
    }

    // --- CARGA DE CALIFICACIONES DEL VENDEDOR ---
    function loadSellerRatings(id) {
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

    // --- LÓGICA DEL MODAL DE EDICIÓN ---
    function openEditModal(productId) {
        db.collection('products').doc(productId).get().then(doc => {
            if (doc.exists) {
                const product = doc.data();
                editProductId.value = productId;
                editProductName.value = product.name;
                editProductDescription.value = product.description;
                editProductPrice.value = product.price;
                editProductImageUrl.value = product.imageUrl;
                editProductModal.style.display = 'block';
            }
        }).catch(error => {
            console.error("Error al cargar producto para edición: ", error);
        });
    }

    closeButtonProductModal.addEventListener('click', () => {
        editProductModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == editProductModal) {
            editProductModal.style.display = 'none';
        }
    });

    editProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const productId = editProductId.value;
        db.collection('products').doc(productId).update({
            name: editProductName.value,
            description: editProductDescription.value,
            price: parseFloat(editProductPrice.value),
            imageUrl: editProductImageUrl.value
        })
        .then(() => {
            alert('Producto actualizado con éxito!');
            editProductModal.style.display = 'none';
        })
        .catch(error => {
            console.error("Error al actualizar producto: ", error);
            alert('Error al actualizar producto.');
        });
    });

    // --- LÓGICA PARA MARCAR/DESMARCAR COMO VENDIDO ---
    function toggleProductSoldStatus(productId, isCurrentlySold) {
        db.collection('products').doc(productId).update({
            isSold: !isCurrentlySold
        })
        .then(() => {
            alert(`Producto marcado como ${!isCurrentlySold ? 'VENDIDO' : 'DISPONIBLE'} con éxito!`);
        })
        .catch(error => {
            console.error("Error al cambiar estado del producto: ", error);
            alert('Error al cambiar estado del producto.');
        });
    }

    // --- LÓGICA DEL MODAL DE EDICIÓN DE PERFIL DE VENDEDOR ---
    editSellerProfileBtn.addEventListener('click', () => {
        editSellerProfileModal.style.display = 'block';
    });

    closeButtonSellerProfileModal.addEventListener('click', () => {
        editSellerProfileModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == editSellerProfileModal) {
            editSellerProfileModal.style.display = 'none';
        }
    });

    editSellerProfileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const updatedUsername = editSellerUsernameInput.value;
        const updatedPhone = editSellerPhoneInput.value;

        db.collection('users').doc(currentUser.uid).update({
            username: updatedUsername,
            phone: updatedPhone
        })
        .then(() => {
            alert('Perfil de vendedor actualizado con éxito!');
            editSellerProfileModal.style.display = 'none';
        })
        .catch(error => {
            console.error("Error al actualizar perfil de vendedor: ", error);
            alert('Error al actualizar perfil de vendedor.');
        });
    });
});