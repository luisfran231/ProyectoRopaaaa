document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.querySelector('input[name="role"]:checked').value;

        // Crear usuario en Firebase Authentication
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Usuario creado, ahora guardar su rol en Firestore
                const user = userCredential.user;
                return firebase.firestore().collection('users').doc(user.uid).set({
                    email: email,
                    role: role
                });
            })
            .then(() => {
                alert('¡Registro exitoso! Serás redirigido al login.');
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error("Error en el registro: ", error);
                alert('Error en el registro: ' + error.message);
            });
    });
});
