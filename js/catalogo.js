document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    const logoutButton = document.getElementById('logout-button');
    const productList = document.getElementById('product-list');
    const paginationContainer = document.getElementById('pagination-container');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');
    const notificationBell = document.getElementById('notification-bell');
    const notificationCount = document.getElementById('notification-count');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const genderFilter = document.getElementById('gender-filter');
    genderFilter.value = 'all';

    let currentUser;
    let allProducts = [];
    let currentPage = 1;
    const productsPerPage = 6;

    genderFilter.addEventListener('change', () => {
        loadProducts(genderFilter.value);
    });

    // Verificar autenticación
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    currentUser = { ...user, ...userData };

                    if (currentUser.role === 'vendedor') {
                        window.location.href = 'admin.html';
                    } else if (currentUser.role === 'cliente') {
                        // Sin perfil visible
                        loadProducts(genderFilter.value);
                        loadNotifications(currentUser.uid);
                    } else {
                        auth.signOut();
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
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            localStorage.removeItem('cart');
            auth.signOut().then(() => window.location.href = 'index.html');
        }
    });

    // Productos
    function loadProducts(gender = 'all') {
        let query = db.collection('products');
        if (gender !== 'all') query = query.where('gender', '==', gender);

        query.onSnapshot(snapshot => {
            allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            currentPage = 1;
            renderPage();
        });
    }

    function renderPage() {
        productList.innerHTML = '';
        const startIndex = (currentPage - 1) * productsPerPage;
        const productsToRender = allProducts.slice(startIndex, startIndex + productsPerPage);

        if (!productsToRender.length) {
            productList.innerHTML = '<p>No hay productos disponibles.</p>';
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';
        productsToRender.forEach(async product => {
            const rating = await getSellerRating(product.sellerId);
            const productEl = document.createElement('div');
            productEl.className = 'product-card';
            productEl.innerHTML = `
                <a href="producto.html?id=${product.id}" class="product-card-link">
                    <img src="${product.imageUrl}" alt="${product.name}">
                    <div class="product-card-content">
                        <h3>${product.name}</h3>
                        <p class="price">MXN $${product.price.toFixed(2)}</p>
                        <div class="seller-info">
                            <p class="seller">Vendido por: <a href="perfil-vendedor.html?id=${product.sellerId}">${product.sellerUsername}</a></p>
                            <div class="seller-rating">${rating.average} ★ (${rating.count} calificaciones)</div>
                        </div>
                        ${product.status === 'vendido' ? '<span class="product-status sold">VENDIDO</span>' : '<span class="product-status available">DISPONIBLE</span>'}
                    </div>
                </a>
                <a href="producto.html?id=${product.id}" class="details-btn">Ver Detalles</a>
            `;
            productList.appendChild(productEl);
        });

        updatePagination();
    }

    function updatePagination() {
        const totalPages = Math.ceil(allProducts.length / productsPerPage);
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(allProducts.length / productsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderPage();
        }
    });

    async function getSellerRating(sellerId) {
        const ratings = await db.collection('ratings').where('sellerId', '==', sellerId).get();
        if (ratings.empty) return { average: 0, count: 0 };
        const total = ratings.docs.reduce((sum, doc) => sum + doc.data().stars, 0);
        return { average: (total / ratings.size).toFixed(1), count: ratings.size };
    }

    // Notificaciones
    notificationBell.addEventListener('click', () => {
        notificationDropdown.style.display =
            notificationDropdown.style.display === 'block' ? 'none' : 'block';
        if (currentUser) loadNotifications(currentUser.uid);
    });

    function loadNotifications(userId) {
        db.collection('notifications')
            .where('userId', '==', userId)
            .where('read', '==', false)
            .onSnapshot(snapshot => {
                const count = snapshot.size;
                notificationCount.textContent = count;
                notificationCount.style.display = count > 0 ? 'block' : 'none';
                notificationDropdown.innerHTML = count
                    ? snapshot.docs.map(doc => {
                        const n = doc.data();
                        return `
                            <div class="notification-item">
                                <p>${n.message}</p>
                                ${
                                    n.orderStatus === 'Aceptado'
                                        ? `<button class="download-pdf-btn" data-order-id="${n.orderId}">Descargar PDF</button>`
                                        : ''
                                }
                                <button class="mark-as-read-btn" data-notification-id="${doc.id}">Marcar como leído</button>
                            </div>`;
                    }).join('')
                    : '<p>No hay notificaciones nuevas.</p>';
            });
    }

    notificationDropdown.addEventListener('click', async e => {
        if (e.target.classList.contains('download-pdf-btn')) {
            const orderId = e.target.dataset.orderId;
            await generatePdf(orderId);
        } else if (e.target.classList.contains('mark-as-read-btn')) {
            const id = e.target.dataset.notificationId;
            db.collection('notifications').doc(id).update({ read: true });
        }
    });

    // PDF tipo ticket
    async function generatePdf(orderId) {
        console.log('Generando ticket para pedido:', orderId);
        const { jsPDF } = window.jspdf;

        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            alert("El pedido no existe");
            return;
        }

        const order = orderSnap.data();

        // Obtener datos del producto
        const productRef = db.collection('products').doc(order.productId);
        const productSnap = await productRef.get();
        const product = productSnap.exists ? productSnap.data() : {};

        // --- Crear PDF ---
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 200] // Formato de ticket
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        let y = 10;

        // --- ENCABEZADO CON LOGO Y TÍTULO ---
        try {
            const logoPath = './Logo.jpg'; // asegúrate que esté junto al HTML
            const imgLogo = await toDataURL(logoPath);
            pdf.addImage(imgLogo, 'JPG', (pageWidth - 25) / 2, y, 25, 25);
            y += 30;
        } catch (err) {
            console.warn('No se pudo cargar el logo:', err);
            pdf.setFontSize(16);
            pdf.text('BZ ONLINE', pageWidth / 2, y, { align: 'center' });
            y += 10;
        }

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('ORDEN DE PEDIDO', pageWidth / 2, y, { align: 'center' });
        y += 6;
        pdf.line(5, y, pageWidth - 5, y);
        y += 5;

        // --- DATOS DEL PRODUCTO ---
        pdf.setFont('helvetica', 'bold');
        pdf.text('Producto:', 5, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(order.productName || '—', 25, y);
        y += 6;

        pdf.setFont('helvetica', 'bold');
        pdf.text('Talla:', 5, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(product.size || '—', 25, y);
        y += 6;

        pdf.setFont('helvetica', 'bold');
        pdf.text('Género:', 5, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(product.gender || '—', 25, y);
        y += 6;

        pdf.setFont('helvetica', 'bold');
        pdf.text('Precio:', 5, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`$${product.price?.toFixed(2) || '0.00'}`, 25, y);
        y += 8;

        pdf.line(5, y, pageWidth - 5, y);
        y += 5;

        // --- DATOS DEL CLIENTE ---
        pdf.setFont('helvetica', 'bold');
        pdf.text('Cliente:', 5, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(order.customerUsername || '—', 25, y);
        y += 6;

        pdf.setFont('helvetica', 'bold');
        pdf.text('Dirección:', 5, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(order.deliveryLocation || '—', 25, y, { maxWidth: pageWidth - 30 });
        y += 10;

        pdf.setFont('helvetica', 'bold');
        pdf.text('Día de encuentro:', 5, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(order.deliveryDay || '—', 40, y);
        y += 6;

        pdf.setFont('helvetica', 'bold');
        pdf.text('Hora de encuentro:', 5, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(order.deliveryTime || '—', 40, y);
        y += 10;

        pdf.line(5, y, pageWidth - 5, y);
        y += 5;

        // --- TOTALES ---
        const subtotal = product.price || 0;
        const envio = 0;
        const total = subtotal + envio;

        pdf.setFont('helvetica', 'bold');
        pdf.text('Subtotal:', 5, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`$${subtotal.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
        y += 6;

        pdf.setFont('helvetica', 'bold');
        pdf.text('Envío:', 5, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`$${envio.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
        y += 6;

        pdf.setFont('helvetica', 'bold');
        pdf.text('TOTAL:', 5, y);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`$${total.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
        y += 10;

        pdf.line(5, y, pageWidth - 5, y);
        y += 8;

        // --- CÓDIGO VISUAL (imagen del producto) ---
        if (product.imageUrl) {
            try {
                const img = await toDataURL(product.imageUrl);
                pdf.addImage(img, 'JPEG', 25, y, 30, 30);
            } catch (err) {
                console.warn('Error al cargar imagen del producto:', err);
            }
        }

        y += 35;
        pdf.setFontSize(8);
        pdf.text(`ID Pedido: ${orderId}`, pageWidth / 2, y, { align: 'center' });
        y += 5;
        pdf.text('¡Gracias por tu compra!', pageWidth / 2, y, { align: 'center' });

        pdf.save(`ticket-${orderId}.pdf`);
    }

    // Función auxiliar para convertir imagen URL a Base64
    async function toDataURL(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`No se pudo cargar la imagen: ${url}`);
        const blob = await response.blob();
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }
});
