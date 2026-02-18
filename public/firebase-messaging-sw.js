// Give the service worker access to Firebase Messaging.
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts(
  "https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js",
);

// Hardcoded Firebase Config for Reliability
const firebaseConfig = {
  apiKey: "AIzaSyB8B2WUXl1HzbYEo-QNtVmcQfZrfSXLRMI",
  authDomain: "arthavi.firebaseapp.com",
  projectId: "arthavi",
  storageBucket: "arthavi.firebasestorage.app",
  messagingSenderId: "677391855620",
  appId: "1:677391855620:web:b9baa1a0b7ca7c6392c551",
  measurementId: "G-SNVL4L7EN7",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload,
  );
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon-192x192.png", // Use existing icon
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", function (event) {
  console.log("[firebase-messaging-sw.js] Notification click Received.", event);
  event.notification.close();

  // Add custom click handling, e.g., open a URL
  // You can send a data payload with { "url": "/portfolio" } to open a specific page
  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});
