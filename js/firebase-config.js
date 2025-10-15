// Este archivo contendrá la configuración de tu proyecto de Firebase.
// Ve a la consola de Firebase, crea un proyecto y una aplicación web.
// Pega aquí el objeto de configuración que te proporciona Firebase.

const firebaseConfig = {
  apiKey: "AIzaSyC01NGfK6ep0PltYpFVDdMy8pRxGfo3emY",
  authDomain: "proyectoropa-5cad6.firebaseapp.com",
  projectId: "proyectoropa-5cad6",
  storageBucket: "proyectoropa-5cad6.firebasestorage.app",
  messagingSenderId: "423893345403",
  appId: "1:423893345403:web:8d74b4bf06f0c3abf86ede",
  measurementId: "G-KGKRJWNJZ0"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Crear referencias a los servicios que usaremos
const db = firebase.firestore();
const storage = firebase.storage();
