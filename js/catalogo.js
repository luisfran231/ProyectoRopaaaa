document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Elementos de la UI
    const userEmailEl = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const productList = document.getElementById('product-list');
    const notificationBell = document.getElementById('notification-bell');
    const notificationCount = document.getElementById('notification-count');
    const notificationDropdown = document.getElementById('notification-dropdown');

    let currentUser;

    // --- INICIALIZACIÓN Y AUTH GUARD ---
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    currentUser = { ...user, ...userData };
                    userEmailEl.textContent = `${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}: ${currentUser.username}`;

                    if (currentUser.role === 'cliente') {
                        loadProducts();
                        loadNotifications(currentUser.uid);
                    } else {
                        window.location.href = 'admin.html';
                    }
                } else {
                    auth.signOut();
                }
            });
        } else {
            window.location.href = 'index.html';
        }
    });

    // --- LÓGICA DE NEGOCIO ---
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => window.location.href = 'index.html');
    });

    function loadProducts() {
        db.collection('products').where('status', '==', 'disponible').onSnapshot(snapshot => {
            productList.innerHTML = '';
            if (snapshot.empty) {
                productList.innerHTML = '<p>No hay productos disponibles.</p>';
                return;
            }
            snapshot.forEach(async doc => {
                const product = doc.data();
                const sellerRating = await getSellerRating(product.sellerId);

                const productEl = document.createElement('div');
                productEl.className = 'product-card';
                productEl.innerHTML = `
                    <a href="producto.html?id=${doc.id}" class="product-card-link">
                        <img src="${product.imageUrl}" alt="${product.name}">
                        <div class="product-card-content">
                            <h3>${product.name}</h3>
                            <p class="price">MXN $${product.price.toFixed(2)}</p>
                            <div class="seller-info">
                                <p class="seller">Vendido por: ${product.sellerUsername}</p>
                                <div class="seller-rating">
                                    ${sellerRating.average} ★ (${sellerRating.count} calificaciones)
                                </div>
                            </div>
                        </div>
                    </a>
                    <a href="producto.html?id=${doc.id}" class="details-btn">Ver Detalles</a>
                `;
                productList.appendChild(productEl);
            });
        });
    }

    // Función para obtener el rating de un vendedor
    async function getSellerRating(sellerId) {
        const ratingsSnap = await db.collection('ratings').where('sellerId', '==', sellerId).get();
        if (ratingsSnap.empty) {
            return { average: 0, count: 0 };
        }
        let totalStars = 0;
        ratingsSnap.forEach(doc => {
            totalStars += doc.data().stars;
        });
        return {
            average: (totalStars / ratingsSnap.size).toFixed(1),
            count: ratingsSnap.size
        };
    }

    // --- NOTIFICACIONES ---
    notificationBell.addEventListener('click', () => {
        console.log('Bell clicked');
        notificationDropdown.style.display = notificationDropdown.style.display === 'block' ? 'none' : 'block';
    });

    function loadNotifications(userId) {
        db.collection('notifications').where('userId', '==', userId).where('read', '==', false)
        .onSnapshot(snapshot => {
            console.log('Notifications snapshot received', snapshot.size);
            const newNotificationsCount = snapshot.size;
            notificationCount.textContent = newNotificationsCount;
            notificationDropdown.innerHTML = '';

            if (newNotificationsCount > 0) {
                notificationCount.style.display = 'block';
                snapshot.forEach(doc => {
                    const notification = doc.data();
                    const notificationEl = document.createElement('div');
                    notificationEl.className = 'notification-item';
                    notificationEl.innerHTML = `
                        <p>${notification.message}</p>
                        <button class="download-pdf-btn" data-order-id="${notification.orderId}">Descargar PDF</button>
                    `;
                    notificationDropdown.appendChild(notificationEl);
                });
            } else {
                notificationCount.style.display = 'none';
                notificationDropdown.innerHTML = '<p>No hay notificaciones nuevas.</p>';
            }
        });
    }

    notificationDropdown.addEventListener('click', async e => {
    if (e.target.classList.contains('download-pdf-btn')) {
        const orderId = e.target.dataset.orderId;

        // Buscar el ID del documento de notificación
        const notificationItem = e.target.closest('.notification-item');
        const message = notificationItem.querySelector('p').textContent;

        // Llamamos a generar el PDF
        await generatePdf(orderId);

        // Marcar como leída la notificación en Firestore
        const snapshot = await db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .where('orderId', '==', orderId)
            .get();

        snapshot.forEach(doc => {
            db.collection('notifications').doc(doc.id).update({ read: true });
        });

        // Opcional: eliminar visualmente la notificación sin esperar el snapshot
        notificationItem.remove();
    }
});
notificationDropdown.addEventListener('click', e => {
        if (e.target.classList.contains('download-pdf-btn')) {
            const orderId = e.target.dataset.orderId;
            generatePdf(orderId);
        }
    });

  // --- NUEVA FUNCIÓN PARA GENERAR PDF ESTILO TICKET ---
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

    // --- Crear PDF tipo ticket ---
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200] // tamaño tipo ticket
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
