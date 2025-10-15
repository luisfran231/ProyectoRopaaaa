document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    const userEmailEl = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const addProductForm = document.getElementById('add-product-form');
    const myProductsList = document.getElementById('my-products-list');
    const myRatingsEl = document.getElementById('my-ratings');

    let currentUser;

    // 1. Auth Guard y Carga de Datos
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists && doc.data().role === 'vendedor') {
                    currentUser = user;
                    userEmailEl.textContent = `Vendedor: ${user.email}`;
                    loadProducts(user.uid);
                    loadRatings(user.uid);
                } else {
                    window.location.href = 'catalogo.html';
                }
            });
        } else {
            window.location.href = 'index.html';
        }
    });

    // 2. Logout
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    });

    // 3. Añadir Productos (versión con URL)
    addProductForm.addEventListener('submit', e => {
        e.preventDefault();
        const productName = document.getElementById('product-name').value;
        const productDesc = document.getElementById('product-desc').value;
        const productPrice = parseFloat(document.getElementById('product-price').value);
        const imageUrl = document.getElementById('product-image').value;

        db.collection('products').add({
            name: productName,
            description: productDesc,
            price: productPrice,
            imageUrl: imageUrl, // Guardar la URL directamente
            sellerId: currentUser.uid,
            sellerEmail: currentUser.email,
            status: 'disponible'
        }).then(() => {
            addProductForm.reset();
            alert('¡Producto añadido con éxito!');
        }).catch(error => {
            console.error("Error al añadir producto: ", error);
            alert('Hubo un error al guardar el producto.');
        });
    });

    // 4. Cargar y Mostrar Productos
    function loadProducts(sellerId) {
        db.collection('products').where('sellerId', '==', sellerId)
            .onSnapshot(snapshot => {
                myProductsList.innerHTML = '';
                if (snapshot.empty) {
                    myProductsList.innerHTML = '<p>Aún no has añadido ningún producto.</p>';
                    return;
                }
                snapshot.forEach(doc => {
                    const product = doc.data();
                    const productEl = document.createElement('div');
                    productEl.className = 'product-item-admin';
                    productEl.innerHTML = `
                        <h4>${product.name}</h4>
                        <p>Estado: ${product.status}</p>
                        <button data-id="${doc.id}" data-status="${product.status}" class="toggle-status-btn">
                            Marcar como ${product.status === 'disponible' ? 'Vendido' : 'Disponible'}
                        </button>
                    `;
                    myProductsList.appendChild(productEl);
                });
            });
    }

    // 5. Cambiar Estado del Producto
    myProductsList.addEventListener('click', e => {
        if (e.target.classList.contains('toggle-status-btn')) {
            const productId = e.target.dataset.id;
            const currentStatus = e.target.dataset.status;
            const newStatus = currentStatus === 'disponible' ? 'vendido' : 'disponible';

            db.collection('products').doc(productId).update({ status: newStatus });
        }
    });

    // 6. Cargar Calificaciones
    function loadRatings(sellerId) {
        db.collection('ratings').where('sellerId', '==', sellerId)
            .onSnapshot(snapshot => {
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
                    
                    const ratingEl = document.createElement('div');
                    ratingEl.className = 'rating-item';
                    ratingEl.innerHTML = `<p><b>Cliente:</b> ${rating.customerEmail || 'Anónimo'} - <b>Calificación:</b> ${'&#9733;'.repeat(rating.stars)}</p>`;
                    myRatingsEl.appendChild(ratingEl);
                });

                const averageRating = (totalStars / ratingCount).toFixed(1);
                const averageEl = document.createElement('h3');
                averageEl.innerHTML = `Promedio: ${averageRating} ${'&#9733;'.repeat(Math.round(averageRating))} (${ratingCount} calificaciones)`;
                myRatingsEl.prepend(averageEl);
            });
    }
});