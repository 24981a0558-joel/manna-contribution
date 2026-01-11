import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7N6o378sgS00n4uxa8JFWsIVJYYPurjY",
  authDomain: "manna-contribution-app.firebaseapp.com",
  projectId: "manna-contribution-app",
  storageBucket: "manna-contribution-app.firebasestorage.app",
  messagingSenderId: "176129008052",
  appId: "1:176129008052:web:8fb1fdb638020e6af312e1",
  measurementId: "G-XDMV6SM737",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Persistence failed: Multiple tabs open");
  } else if (err.code === "unimplemented") {
    console.warn("Persistence not supported by browser");
  }
});

// Church Events Configuration
export const CHURCH_EVENTS = [
  {
    id: "church-dedication",
    name: "Church Dedication",
    icon: "⛪",
    color: "#6f42c1",
    date: "January 21",
  },
  {
    id: "kids-camp",
    name: "Kids Camp",
    icon: "🏕️",
    color: "#fd7e14",
    date: "Summer",
  },
  {
    id: "good-friday",
    name: "Good Friday",
    icon: "✝️",
    color: "#6c757d",
    date: "March/April",
  },
  {
    id: "easter",
    name: "Easter Service",
    icon: "🌅",
    color: "#20c997",
    date: "March/April",
  },
  {
    id: "harvest-festival",
    name: "Harvest Festival",
    icon: "🌾",
    color: "#e6a000",
    date: "October/November",
  },
  {
    id: "christmas",
    name: "Christmas",
    icon: "🎄",
    color: "#dc3545",
    date: "December 25",
  },
  {
    id: "new-year",
    name: "New Year",
    icon: "🎆",
    color: "#0d6efd",
    date: "January 1",
  },
  {
    id: "sunday-offering",
    name: "Sunday Offering",
    icon: "🙏",
    color: "#198754",
    date: "Weekly",
  },
];

// User Roles
export const USER_ROLES = {
  admin: { label: "Admin", icon: "👑" },
  editor: { label: "Editor", icon: "✏️" },
  viewer: { label: "Viewer", icon: "👁️" },
  // Keep string constants for AuthContext compatibility
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
};
