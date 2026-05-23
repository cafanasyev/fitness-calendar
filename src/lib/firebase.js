import { initializeApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator,
  GoogleAuthProvider, signInWithPopup, signOut as _signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator,
  doc, getDoc, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore/lite';
import { validateActual } from './workout-validation.js';

const config = await fetch('/__/firebase/init.json').then(r => r.json());
const app  = initializeApp(config);
const auth = getAuth(app);
const db   = getFirestore(app);

if (location.hostname === 'localhost') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export function signIn() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOut() {
  return _signOut(auth);
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, cb);
}

function _userDoc() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  return doc(db, 'users', user.uid);
}

export async function loadProgress() {
  const ref = _userDoc();
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { workouts: {} });
    return { startDate: null, workouts: {} };
  }
  const data = snap.data();
  return { startDate: data.startDate || null, workouts: data.workouts || {} };
}

export async function saveStartDate(iso) {
  await updateDoc(_userDoc(), { startDate: iso });
}

export async function saveWorkout(weekN, dayKey, status, actual) {
  validateActual(actual);
  const entry = { status };
  if (actual) entry.actual = actual;
  await updateDoc(_userDoc(), { [`workouts.${weekN}-${dayKey}`]: entry });
}

export async function saveAutoSkips(toSkip) {
  if (!toSkip.length) return;
  const batch = writeBatch(db);
  const ref = _userDoc();
  for (const { weekN, dayKey } of toSkip) {
    batch.update(ref, { [`workouts.${weekN}-${dayKey}`]: { status: 'skipped' } });
  }
  await batch.commit();
}
