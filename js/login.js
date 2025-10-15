document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Usuario ha iniciado sesión, ahora obtenemos su rol
                const user = userCredential.user;
                const userRef = firebase.firestore().collection('users').doc(user.uid);

                return userRef.get();
            })
            .then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    // Redirigir según el rol
                    if (userData.role === 'vendedor') {
                        window.location.href = 'admin.html';
                    } else if (userData.role === 'cliente') {
                        window.location.href = 'catalogo.html';
                    } else {
                        // Rol no definido, redirigir a login
                        alert('Rol de usuario no definido.');
                        firebase.auth().signOut();
                        window.location.href = 'index.html';
                    }
                } else {
                    // No se encontró el documento del usuario
                    alert('No se encontró información adicional del usuario.');
                    firebase.auth().signOut();
                    window.location.href = 'index.html';
                }
            })
            .catch((error) => {
                console.error('Error al iniciar sesión:', error);
                alert('Error al iniciar sesión: ' + error.message);
            });
    });
});
