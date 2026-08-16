importScripts(
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyCtmlQAVgJJfW2TfbO4QrANbDlqq7QQxbY",
  authDomain: "sra-make-prudente.firebaseapp.com",
  projectId: "sra-make-prudente",
  storageBucket: "sra-make-prudente.firebasestorage.app",
  messagingSenderId: "597269148",
  appId: "1:597269148:web:98e5c80eb90e996f426b59",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw] Mensagem recebida:", payload);
});
