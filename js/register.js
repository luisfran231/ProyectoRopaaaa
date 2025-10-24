document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const addressGroup = document.getElementById('address-group');
    const roleInputs = document.querySelectorAll('input[name="role"]');

    // Función para mostrar u ocultar el campo de dirección
    function toggleAddressField() {
        const selectedRole = document.querySelector('input[name="role"]:checked').value;
        if (selectedRole === 'cliente') {
            addressGroup.style.display = 'block';
        } else {
            addressGroup.style.display = 'none';
        }
    }

    // Ocultar o mostrar al cambiar la selección
    roleInputs.forEach(input => input.addEventListener('change', toggleAddressField));

    // Estado inicial al cargar la página
    toggleAddressField();

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.querySelector('input[name="role"]:checked').value;
        const address = document.getElementById('address').value;

        // Crear usuario en Firebase Authentication
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Usuario creado, ahora guardar sus datos en Firestore
                const user = userCredential.user;
                const userData = {
                    username: username,
                    email: email,
                    role: role
                };

                if (role === 'cliente') {
                    userData.address = address;
                }

                return firebase.firestore().collection('users').doc(user.uid).set(userData);
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