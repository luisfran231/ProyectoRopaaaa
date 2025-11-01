document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- ELEMENTOS DE LA UI ---
    const userEmailEl = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const profilePictureEl = document.getElementById('profile-picture');
    const profileUsernameEl = document.getElementById('profile-username');
    const profileEmailEl = document.getElementById('profile-email');
    const profileAddressEl = document.getElementById('profile-address');
    const profilePhoneEl = document.getElementById('profile-phone');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const clientOrdersList = document.getElementById('client-orders-list');
    const profileLink = document.getElementById('profile-link');

    // --- Modal de Edición de Perfil ---
    const editProfileModal = document.getElementById('edit-profile-modal');
    const closeButton = editProfileModal.querySelector('.close-button');
    const editProfileForm = document.getElementById('edit-profile-form');
    const editUsernameInput = document.getElementById('edit-username');
    const editAddressInput = document.getElementById('edit-address');
    const editPhoneInput = document.getElementById('edit-phone');
    const profileImageUpload = document.getElementById('profile-image-upload');
    const profileImageUploadStatus = document.getElementById('profile-image-upload-status');
    const profileImageUrlInput = document.getElementById('profile-image-url');

    let currentUser;

    // --- INICIALIZACIÓN Y AUTH GUARD ---
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    currentUser = { uid: user.uid, ...doc.data() };
                    userEmailEl.textContent = `${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}: ${currentUser.username}`;

                    if (currentUser.role === 'cliente') {
                        profileLink.href = `perfil-cliente.html?id=${currentUser.uid}`;
                        profileLink.style.display = 'inline';
                        loadClientProfile(currentUser.uid);
                        loadClientOrders(currentUser.uid);
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

    // --- CARGA DE DATOS Y LÓGICA DEL PERFIL ---
    function loadClientProfile(userId) {
        db.collection('users').doc(userId).onSnapshot(doc => {
            if (doc.exists) {
                const userData = doc.data();
                profilePictureEl.src = userData.profilePictureUrl || 'https://via.placeholder.com/150';
                profileUsernameEl.textContent = userData.username;
                profileEmailEl.textContent = userData.email;
                profileAddressEl.textContent = userData.address || 'No especificada';
                profilePhoneEl.textContent = userData.phone || 'No especificado';

                // Pre-llenar formulario de edición
                editUsernameInput.value = userData.username;
                editAddressInput.value = userData.address || '';
                editPhoneInput.value = userData.phone || '';
                profileImageUrlInput.value = userData.profilePictureUrl || '';
            }
        });
    }

    // --- LÓGICA DEL MODAL DE EDICIÓN ---
    editProfileBtn.addEventListener('click', () => editProfileModal.style.display = 'flex');
    closeButton.addEventListener('click', () => editProfileModal.style.display = 'none');
    window.addEventListener('click', e => {
        if (e.target == editProfileModal) editProfileModal.style.display = 'none';
    });

    // --- LÓGICA DE SUBIDA DE IMAGEN ---
    const CLOUD_NAME = 'dvdctjltz';
    const UPLOAD_PRESET = 'catalogo-productos';

    profileImageUpload.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

        profileImageUploadStatus.textContent = 'Subiendo...';
        fetch(url, { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.secure_url) {
                    profileImageUrlInput.value = data.secure_url;
                    profileImageUploadStatus.textContent = 'Imagen subida.';
                } else {
                    throw new Error('URL no encontrada');
                }
            })
            .catch(error => {
                profileImageUploadStatus.textContent = 'Error al subir.';
                console.error('Error al subir imagen a Cloudinary:', error);
            });
    });

    editProfileForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!currentUser) return;

        const updatedData = {
            username: editUsernameInput.value,
            address: editAddressInput.value,
            phone: editPhoneInput.value,
            profilePictureUrl: profileImageUrlInput.value
        };

        db.collection('users').doc(currentUser.uid).update(updatedData)
            .then(() => {
                alert('Perfil actualizado con éxito!');
                editProfileModal.style.display = 'none';
            })
            .catch(error => {
                console.error("Error al actualizar perfil: ", error);
                alert('Error al actualizar perfil.');
            });
    });

    // --- CARGA DE PEDIDOS DEL CLIENTE ---
    function loadClientOrders(userId) {
        db.collection('orders').where('customerId', '==', userId).orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            clientOrdersList.innerHTML = '';
            if (snapshot.empty) {
                clientOrdersList.innerHTML = '<p>No has realizado ningún pedido aún.</p>';
                return;
            }
            const table = document.createElement('table');
            table.className = 'orders-table';
            table.innerHTML = `<thead><tr><th>Producto</th><th>Vendedor</th><th>Estado</th><th>Fecha</th></tr></thead><tbody></tbody>`;
            const tbody = table.querySelector('tbody');

            snapshot.forEach(doc => {
                const order = doc.data();
                const orderDate = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${order.productName}</td>
                    <td><a href="perfil-vendedor.html?id=${order.sellerId}">${order.sellerUsername || 'N/A'}</a></td>
                    <td><span class="status status-${order.status || 'pendiente'}">${order.status || 'pendiente'}</span></td>
                    <td>${orderDate}</td>
                `;
                tbody.appendChild(tr);
            });
            clientOrdersList.appendChild(table);
        });
    }
});