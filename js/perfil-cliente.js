document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // UI Elements
    const userEmailEl = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const profileUsernameEl = document.getElementById('profile-username');
    const profileEmailEl = document.getElementById('profile-email');
    const profileAddressEl = document.getElementById('profile-address');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const clientOrdersList = document.getElementById('client-orders-list');

    // Edit Profile Modal Elements
    const editProfileModal = document.getElementById('edit-profile-modal');
    const closeButton = editProfileModal.querySelector('.close-button');
    const editProfileForm = document.getElementById('edit-profile-form');
    const editUsernameInput = document.getElementById('edit-username');
    const editAddressInput = document.getElementById('edit-address');

    let currentUser;

    // --- INITIALIZATION AND AUTH GUARD ---
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    currentUser = { ...user, ...userData };

                    userEmailEl.textContent = `${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}: ${currentUser.username}`;

                    if (currentUser.role === 'cliente') {
                        loadClientProfile(currentUser.uid);
                        loadClientOrders(currentUser.uid);
                    } else {
                        // Redirect non-clients
                        window.location.href = 'catalogo.html'; // Or admin.html if they are a seller
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

    // --- LOAD CLIENT PROFILE DATA ---
    function loadClientProfile(userId) {
        db.collection('users').doc(userId).onSnapshot(doc => {
            if (doc.exists) {
                const userData = doc.data();
                profileUsernameEl.textContent = userData.username;
                profileEmailEl.textContent = userData.email;
                profileAddressEl.textContent = userData.address || 'No especificada';

                // Pre-fill edit form
                editUsernameInput.value = userData.username;
                editAddressInput.value = userData.address || '';
            }
        });
    }

    // --- LOAD CLIENT ORDERS ---
    function loadClientOrders(userId) {
        db.collection('orders').where('customerId', '==', userId).onSnapshot(snapshot => {
            clientOrdersList.innerHTML = '';
            if (snapshot.empty) {
                clientOrdersList.innerHTML = '<p>No has realizado ningún pedido aún.</p>';
                return;
            }
            snapshot.forEach(doc => {
                const order = doc.data();
                const orderEl = document.createElement('div');
                orderEl.className = 'order-card'; // You might want to style this
                orderEl.innerHTML = `
                    <h4>Pedido #${doc.id.substring(0, 8)}</h4>
                    <p>Producto: ${order.productName}</p>
                    <p>Cantidad: ${order.quantity}</p>
                    <p>Total: $${order.total.toFixed(2)}</p>
                    <p>Estado: ${order.status}</p>
                    <p>Fecha: ${new Date(order.orderDate.toDate()).toLocaleDateString()}</p>
                `;
                clientOrdersList.appendChild(orderEl);
            });
        });
    }

    // --- EDIT PROFILE MODAL LOGIC ---
    editProfileBtn.addEventListener('click', () => {
        editProfileModal.style.display = 'block';
    });

    closeButton.addEventListener('click', () => {
        editProfileModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == editProfileModal) {
            editProfileModal.style.display = 'none';
        }
    });

    editProfileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const updatedUsername = editUsernameInput.value;
        const updatedAddress = editAddressInput.value;

        db.collection('users').doc(currentUser.uid).update({
            username: updatedUsername,
            address: updatedAddress
        })
        .then(() => {
            alert('Perfil actualizado con éxito!');
            editProfileModal.style.display = 'none';
        })
        .catch(error => {
            console.error("Error al actualizar perfil: ", error);
            alert('Error al actualizar perfil.');
        });
    });
});