// Shared across all sites — do not edit per-company. Company-specific
// values (COMPANY_ID, COMPANY_NAME) come from company-config.js, which
// must be loaded BEFORE this file.
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, sendPasswordResetEmail,
  browserSessionPersistence, setPersistence
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, updateDoc,
  collection, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAgceNDUpzdP58GDUoVVRbo5klNmRNoGWw",
  authDomain: "punch-b5e7c.firebaseapp.com",
  projectId: "punch-b5e7c",
  storageBucket: "punch-b5e7c.firebasestorage.app",
  messagingSenderId: "429105848962",
  appId: "1:429105848962:web:85649040bbe33159d04a9b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Session-only persistence: closing the tab/app requires logging back in.
// This matters because a time clock is often used on one shared device by
// several different employees, so we don't want it silently staying
// logged in as the last person forever.
const persistenceReady = setPersistence(auth, browserSessionPersistence);

/* ---------- Auth ---------- */
async function login(email, password){
  await persistenceReady;
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getProfile(cred.user.uid);
  if (!profile){
    await signOut(auth);
    throw new Error('No profile found for this account. Ask your admin to check your access.');
  }
  return { uid: cred.user.uid, ...profile };
}
async function logout(){
  await signOut(auth);
}
function onAuthChange(cb){
  onAuthStateChanged(auth, cb);
}

/* ---------- Profiles (accounts) ---------- */
async function getProfile(uid){
  const snap = await getDoc(doc(db, 'profiles', uid));
  return snap.exists() ? snap.data() : null;
}

async function listCompanyAccounts(companyId){
  const q = query(collection(db, 'profiles'), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  const out = {};
  snap.forEach(d => { out[d.id] = d.data(); });
  return out;
}

/* Creates a brand-new login (Firebase Auth account + profile doc) without
   disturbing the admin's own signed-in session. Firebase's client SDK
   normally switches your current session to whatever account you just
   created — a secondary, throwaway app instance avoids that. */
async function createAccount({ email, password, name, role, companyId }){
  const secondaryApp = initializeApp(firebaseConfig, 'secondary-' + Date.now());
  const secondaryAuth = getAuth(secondaryApp);
  try{
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await setDoc(doc(db, 'profiles', cred.user.uid), { email, name, role, companyId });
    return cred.user.uid;
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}

async function setAccountRole(uid, role){
  await updateDoc(doc(db, 'profiles', uid), { role });
}

/* There is no way for an admin to directly set another person's password
   from client-side code — only Firebase's server-side Admin SDK can do
   that. The standard, secure alternative is to email the person a reset
   link so THEY set their own new password. */
async function sendReset(email){
  await sendPasswordResetEmail(auth, email);
}

/* Deletes the profile doc, which immediately blocks that person from
   logging into any company site (login checks for a profile). It does
   NOT delete the underlying Firebase Auth account — fully deleting a
   login can only be done from the Firebase Console (Authentication tab)
   or via a server-side Admin SDK, not from a static site's client code. */
async function removeAccount(uid){
  await deleteDoc(doc(db, 'profiles', uid));
}

/* ---------- Punch entries ---------- */
async function loadEntries(uid){
  const snap = await getDoc(doc(db, 'entries', uid));
  return snap.exists() ? (snap.data().entries || []) : [];
}
async function saveEntries(uid, companyId, entries){
  await setDoc(doc(db, 'entries', uid), { companyId, entries });
}

/* ---------- Schedule grid ---------- */
async function loadGrid(companyId){
  const snap = await getDoc(doc(db, 'schedules', companyId));
  return snap.exists() ? (snap.data().grid || {}) : {};
}
async function saveGrid(companyId, grid){
  await setDoc(doc(db, 'schedules', companyId), { grid });
}

/* ---------- Master-only: companies ---------- */
async function listCompanies(){
  const snap = await getDocs(collection(db, 'companies'));
  const out = {};
  snap.forEach(d => { out[d.id] = d.data(); });
  return out;
}
async function createCompany(companyId, name){
  await setDoc(doc(db, 'companies', companyId), { name });
}

window.FB = {
  login, logout, onAuthChange, getProfile,
  listCompanyAccounts, createAccount, setAccountRole, sendReset, removeAccount,
  loadEntries, saveEntries, loadGrid, saveGrid,
  listCompanies, createCompany
};
window.dispatchEvent(new Event('fb-ready'));
