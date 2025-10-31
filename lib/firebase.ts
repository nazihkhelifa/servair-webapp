// Firebase configuration for web app
import { initializeApp } from 'firebase/app'
import { getFirestore, initializeFirestore } from 'firebase/firestore'

// TODO: Replace with your Firebase project configuration
// Get this from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: "AIzaSyDny__f8_pCBWeNYlX6iCAnEavyvgg8qyE",
  authDomain: "servair-map.firebaseapp.com",
  projectId: "servair-map",
  storageBucket: "servair-map.appspot.com",
  messagingSenderId: "971873899065",
  appId: "1:971873899065:web:7e351bb638c8fa4e9eb3e8",
  measurementId: "G-C98F1H7PDQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore with robust networking for restricted networks
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
})

export default app
