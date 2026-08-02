// طبقة Firebase: تخزين مشترك لكل الأجهزة عبر Firestore، ومصادقة حقيقية
// عبر Firebase Authentication تحفظ كلمات المرور مُجزّأة على خوادم Google
// فلا تصل إلى المتصفح إطلاقاً.
//
// تُحمّل كوحدة ES module وتُعرّف window.CloudStore، ثم تُطلق حدث
// cloud-store-ready ليكمل script.js الإقلاع. إن كانت الإعدادات فارغة أو
// فشل الاتصال يبقى enabled = false فيرجع التطبيق للتخزين المحلي.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js';
import {
    getFirestore, doc, getDoc, setDoc,
    collection, getDocs, writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import {
    getAuth, signInWithEmailAndPassword, signOut,
    onAuthStateChanged, setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';

const SETTINGS_DOC = ['config', 'financial'];
const CARS_COLLECTION = 'cars';

const store = {
    enabled: false,
    reason: '',
    user: null,
    _db: null,
    _auth: null,
    _authWatchers: []
};

function isConfigured(config) {
    return !!(config && config.apiKey && config.projectId && config.appId);
}

async function init() {
    const config = window.FIREBASE_CONFIG;

    if (!isConfigured(config)) {
        store.reason = 'لم تُضبط إعدادات Firebase في firebase-config.js';
        return;
    }

    try {
        const app = initializeApp(config);
        store._db = getFirestore(app);
        store._auth = getAuth(app);

        // إبقاء الجلسة بعد إغلاق المتصفح
        await setPersistence(store._auth, browserLocalPersistence);

        onAuthStateChanged(store._auth, user => {
            store.user = user;
            store._authWatchers.forEach(fn => fn(user));
        });

        store.enabled = true;
    } catch (error) {
        console.error('تعذّرت تهيئة Firebase:', error);
        store.reason = `تعذّرت تهيئة Firebase: ${error.message}`;
    }
}

// ————— الإعدادات —————

store.getSettings = async function () {
    if (!store.enabled) return null;

    const snapshot = await getDoc(doc(store._db, ...SETTINGS_DOC));
    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    return {
        financialSettings: {
            ceiling: data.ceiling,
            profitRate: data.profitRate,
            discountedRate: data.discountedRate
        }
    };
};

store.saveSettings = async function (settings) {
    if (!store.enabled) throw new Error('Firebase غير مفعّل');

    const { ceiling, profitRate, discountedRate } = settings.financialSettings;
    await setDoc(doc(store._db, ...SETTINGS_DOC), {
        ceiling, profitRate, discountedRate,
        updatedAt: new Date().toISOString(),
        updatedBy: store.user ? store.user.email : 'غير معروف'
    });
};

// ————— السيارات —————

store.getCars = async function () {
    if (!store.enabled) return null;

    const snapshot = await getDocs(collection(store._db, CARS_COLLECTION));
    return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
};

// تُستبدل القائمة كاملة لتطابق واجهة saveCars الحالية في script.js
store.saveCars = async function (cars) {
    if (!store.enabled) throw new Error('Firebase غير مفعّل');

    const existing = await getDocs(collection(store._db, CARS_COLLECTION));
    const batch = writeBatch(store._db);

    existing.docs.forEach(d => batch.delete(d.ref));
    cars.forEach(car => {
        const ref = doc(collection(store._db, CARS_COLLECTION));
        batch.set(ref, { name: car.name, price: car.price });
    });

    await batch.commit();
};

// ————— المصادقة —————

store.signIn = async function (email, password) {
    if (!store.enabled) throw new Error('Firebase غير مفعّل');
    await signInWithEmailAndPassword(store._auth, email, password);
};

store.signOut = async function () {
    if (!store.enabled) return;
    await signOut(store._auth);
};

store.onAuthChange = function (callback) {
    store._authWatchers.push(callback);
    callback(store.user);
};

store.isSignedIn = function () {
    return !!store.user;
};

// رسائل Firebase الإنجليزية تُترجم لرسائل مفهومة للمستخدم
store.describeAuthError = function (error) {
    const messages = {
        'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة',
        'auth/user-disabled': 'هذا الحساب معطّل',
        'auth/user-not-found': 'لا يوجد حساب بهذا البريد',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
        'auth/too-many-requests': 'محاولات كثيرة متتالية — انتظر قليلاً ثم أعد المحاولة',
        'auth/network-request-failed': 'تعذّر الاتصال بالشبكة'
    };
    return messages[error && error.code] || 'تعذّر تسجيل الدخول — حاول مرة أخرى';
};

window.CloudStore = store;

init().finally(() => {
    window.__cloudStoreReady = true;
    window.dispatchEvent(new Event('cloud-store-ready'));
});
