document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- ELEMENTOS DE LA UI ---
    const userEmailEl = document.getElementById('user-email');
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
    const modal = document.getElementById('order-details-modal');
    const closeModalBtn = document.querySelector('.close-button');
    const modalOrderDetails = document.getElementById('modal-order-details');

    let currentUser;

    // --- LÓGICA DE PESTAÑAS ---
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

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
                    userEmailEl.textContent = `Vendedor: ${currentUser.username}`;
                    viewCatalogLink.style.display = 'none'; // Ocultar "Ver Catálogo"

                    loadProducts(currentUser.uid);
                    loadRatings(currentUser.uid);
                    loadOrders(currentUser.uid);
                    loadNotifications(currentUser.uid);
                } else {
                    window.location.href = 'catalogo.html';
                }
            });
        } else {
            window.location.href = 'index.html';
        }
    });

    // --- LÓGICA DE NEGOCIO ---
    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', e => {
        if (e.target == modal) {
            modal.style.display = 'none';
        }
    });

    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => window.location.href = 'index.html');
    });

    // --- LÓGICA PARA SUBIR IMAGEN A CLOUDINARY ---
    const CLOUD_NAME = 'dvdctjltz'; // <-- REEMPLAZA ESTO
    const UPLOAD_PRESET = 'catalogo-productos'; // <-- REEMPLAZA ESTO

    imageUploadInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
        
        imageUploadStatus.textContent = 'Subiendo imagen...';
        productImageHiddenInput.value = '';

        fetch(url, {
            method: 'POST',
            body: formData
        })
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

        console.log('Product Name:', productName);
        console.log('Product Description:', productDesc);
        console.log('Product Price:', productPrice);
        console.log('Product Size:', productSize);
        console.log('Product Gender:', productGender);
        console.log('Image URL:', imageUrl);

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
            console.log('Product added successfully!');
            addProductForm.reset();
            imageUploadStatus.textContent = '';
            alert('¡Producto añadido con éxito!');
        }).catch(error => {
            console.error("Error al añadir producto: ", error);
            alert('Hubo un error al guardar el producto.');
        });
    });

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
                        <button class="action-btn delete-btn" data-product-id="${productId}">Eliminar</button>
                    </div>
                `;
                myProductsList.appendChild(productEl);
            });

            const deleteButtons = myProductsList.querySelectorAll('.delete-btn');
            deleteButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const productId = e.target.dataset.productId;
                    deleteProduct(productId);
                });
            });
        });
    }

    function deleteProduct(productId) {
        if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            db.collection('products').doc(productId).delete()
                .then(() => {
                    console.log('Producto eliminado');
                })
                .catch(error => {
                    console.error('Error al eliminar el producto: ', error);
                });
        }
    }

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

    function renderStars(rating) {
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            starsHTML += `<i class="star ${i <= rating ? 'filled' : ''}">&#9733;</i>`;
        }
        return starsHTML;
    }

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

            // Event listeners
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
                const orderDate = new Date(order.createdAt.seconds * 1000);
                const formattedDate = orderDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

                modal.querySelector('h2').textContent = 'Detalles del Pedido';
                modal.querySelector('.close-button').style.display = 'block';

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
                        <p><strong>Lugar de Entrega:</strong> ${order.deliveryLocation}</p>
                        <p><strong>Estado:</strong> <span class="status status-${order.status || 'pendiente'}">${order.status || 'pendiente'}</span></p>
                    </div>
                `;
                modal.style.display = 'flex';
            } else {
                alert('No se encontraron detalles para este pedido.');
            }
        });
    }

    function deleteOrder(orderId) {
        if (confirm('¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.')) {
            db.collection('orders').doc(orderId).delete()
            .then(() => {
                alert('Pedido eliminado con éxito.');
            })
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
                    message: `El vendedor rechazó su pedido de "${order.productName}". Por favor, contacta al vendedor para más detalles.`, // Mensaje más informativo
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

    function loadNotifications(sellerId) {
        db.collection('orders').where('sellerId', '==', sellerId).where('status', '==', 'pendiente')
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
});
