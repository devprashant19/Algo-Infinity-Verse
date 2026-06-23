import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

let configPromise = null;
let app = null;
let auth = null;
let stateListeners = [];

function fetchConfig() {
  if (!configPromise) {
    configPromise = fetch("/api/firebase-config")
      .then(r => r.json())
      .then(data => {
        if (!data.configured) throw new Error("Firebase not configured");
        return data;
      })
      .catch(() => {
        configPromise = null;
        throw new Error("Firebase not configured");
      });
  }
  return configPromise;
}

async function ensureAuth() {
  if (auth) return auth;
  const config = await fetchConfig();
  if (!app) {
    app = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });
  }
  if (!auth) {
    auth = getAuth(app);
    auth.onAuthStateChanged((user) => {
      stateListeners.forEach(cb => { try { cb(user); } catch (e) { console.warn("Firebase auth listener error:", e); } });
    });
  }
  return auth;
}

export async function signInWithGoogle() {
  const authInstance = await ensureAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(authInstance, provider);
  const idToken = await result.user.getIdToken();
  return { idToken, user: result.user };
}

export async function signOutUser() {
  if (!auth) return;
  await signOut(auth);
}

export function getCurrentUser() {
  return auth ? auth.currentUser : null;
}

export function onAuthChange(callback) {
  stateListeners.push(callback);
  if (auth && auth.currentUser !== undefined) {
    try { callback(auth.currentUser); } catch (e) { console.warn(e); }
  }
  return () => {
    stateListeners = stateListeners.filter(cb => cb !== callback);
  };
}

export async function getIdToken() {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;
  return currentUser.getIdToken();
}

export function isConfigured() {
  return auth !== null;
}

window.__firebaseClient = { signInWithGoogle, signOutUser, getCurrentUser, onAuthChange, getIdToken, isConfigured };
