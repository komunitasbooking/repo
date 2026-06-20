// firebase-messaging-sw.js
// Letakkan file ini di ROOT repo GitHub Pages (bukan di subfolder)

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCtxdF_hpk9LgSHzbcjSeCBfGMBesdEXhg",
  authDomain: "bookingalarm-10146.firebaseapp.com",
  projectId: "bookingalarm-10146",
  storageBucket: "bookingalarm-10146.firebasestorage.app",
  messagingSenderId: "507173877394",
  appId: "1:507173877394:web:1620ec6696f1538803584b"
});

const messaging = firebase.messaging();

// Ini yang jalan saat push masuk dan tab/app TIDAK aktif (background/closed)
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Notifikasi Booking";
  const options = {
    body: (payload.notification && payload.notification.body) || "",
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(title, options);
});
