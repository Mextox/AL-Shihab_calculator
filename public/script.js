// Application State
let appState = {
    settings: {
        // قيم احتياطية تُستخدم فقط إذا فشل تحميل config/settings.json
        // يجب أن تبقى مطابقة له حتى لا تُحسب الأقساط بنسب خاطئة
        financialSettings: {
            ceiling: 120000,
            profitRate: 3,
            discountedRate: 2,
            currency: 'د.ل'
        },
        appSettings: {
            theme: 'light',
            language: 'ar'
        }
    },
    cars: [],
    currentTheme: 'light'
};

// Storage Layer
// يعمل التطبيق في وضعين: مع خادم Express فيكون التخزين موحّداً لكل الأجهزة،
// أو بدون خادم مثل GitHub Pages فيكون التخزين في متصفح كل جهاز على حدة.
const STORAGE_KEYS = {
    settings: 'carFinance.settings',
    cars: 'carFinance.cars',
    password: 'carFinance.settingsPassword'
};

let staticMode = false; // يصبح true عند غياب خادم الـAPI

function cloudEnabled() {
    return !!(window.CloudStore && window.CloudStore.enabled);
}

function enterStaticMode() {
    if (staticMode) return;
    staticMode = true;
    if (cloudEnabled()) return; // Firebase يتولى التخزين، فلا تنبيه محلي
    showToast('💾 لا يوجد خادم — يتم حفظ الإعدادات والسيارات في هذا المتصفح فقط', 'success');
    document.querySelectorAll('.local-storage-note').forEach(el => el.classList.remove('hidden'));
}

function readLocal(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error(`تعذّرت قراءة ${key} من التخزين المحلي:`, error);
        return null;
    }
}

function writeLocal(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`تعذّرت كتابة ${key} في التخزين المحلي:`, error);
        showToast('تعذّر الحفظ في هذا المتصفح — تحقّق من إعدادات الخصوصية', 'error');
        return false;
    }
}

const API = {
    async getSettings() {
        if (cloudEnabled()) {
            try {
                return await window.CloudStore.getSettings();
            } catch (error) {
                console.error('تعذّرت قراءة الإعدادات من Firebase:', error);
                showToast(`${window.CloudStore.describeStoreError(error)} — يتم استخدام القيم الافتراضية`, 'error');
                return null;
            }
        }

        if (!staticMode) {
            try {
                const response = await fetch('/api/settings');
                if (response.ok) {
                    return await response.json();
                }
                throw new Error('Failed to load settings');
            } catch (error) {
                console.error('Error loading settings:', error);
                enterStaticMode();
            }
        }
        return readLocal(STORAGE_KEYS.settings);
    },

    async saveSettings(settings) {
        if (cloudEnabled()) {
            try {
                await window.CloudStore.saveSettings(settings);
                showToast('تم حفظ الإعدادات لجميع الأجهزة', 'success');
                return true;
            } catch (error) {
                console.error('تعذّر حفظ الإعدادات في Firebase:', error);
                showToast(`فشل الحفظ — ${window.CloudStore.describeStoreError(error)}`, 'error');
                return false;
            }
        }

        if (!staticMode) {
            try {
                const response = await fetch('/api/settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(settings)
                });

                if (response.ok) {
                    const result = await response.json();
                    showToast(result.message, 'success');
                    return true;
                }
                throw new Error('Failed to save settings');
            } catch (error) {
                console.error('Error saving settings:', error);
                showToast('فشل في حفظ الإعدادات على الخادم', 'error');
                return false;
            }
        }

        if (!writeLocal(STORAGE_KEYS.settings, settings)) {
            return false;
        }
        showToast('تم حفظ الإعدادات في هذا المتصفح', 'success');
        return true;
    },

    async getCars() {
        if (cloudEnabled()) {
            try {
                return await window.CloudStore.getCars() || [];
            } catch (error) {
                console.error('تعذّرت قراءة السيارات من Firebase:', error);
                return [];
            }
        }

        if (!staticMode) {
            try {
                const response = await fetch('/api/cars');
                if (response.ok) {
                    return await response.json();
                }
                throw new Error('Failed to load cars');
            } catch (error) {
                console.error('Error loading cars:', error);
                enterStaticMode();
            }
        }
        return readLocal(STORAGE_KEYS.cars) || [];
    },

    async saveCars(cars) {
        if (cloudEnabled()) {
            try {
                await window.CloudStore.saveCars(cars);
                return true;
            } catch (error) {
                console.error('تعذّر حفظ السيارات في Firebase:', error);
                showToast(`فشل الحفظ — ${window.CloudStore.describeStoreError(error)}`, 'error');
                return false;
            }
        }

        if (!staticMode) {
            try {
                const response = await fetch('/api/cars', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(cars)
                });

                if (response.ok) {
                    return true;
                }
                throw new Error('Failed to save cars');
            } catch (error) {
                console.error('Error saving cars:', error);
                showToast('فشل في حفظ السيارات على الخادم', 'error');
                return false;
            }
        }

        return writeLocal(STORAGE_KEYS.cars, cars);
    }
};

// Utility Functions
function formatNumber(number) {
    return new Intl.NumberFormat('ar-LY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}

function formatWhole(number) {
    return new Intl.NumberFormat('ar-LY', {
        maximumFractionDigits: 0
    }).format(number);
}

// أسماء السيارات تأتي من إدخال المستخدم وتُحقن في HTML، فتُهرَّب أولاً
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// يعرض قيمة واحدة إن تساوى الحدّان، ونطاقاً إن اختلفا
function formatRange(low, high, unit) {
    if (Math.abs(high - low) < 0.01) {
        return `${formatNumber(low)} ${unit}`;
    }
    return `${formatNumber(low)} – ${formatNumber(high)} ${unit}`;
}

function validateForm(formData) {
    const required = ['salary', 'years', 'carPrice']; // حذف closingPrice من المطلوبة
    const missing = required.filter(field => !formData[field] || formData[field] <= 0);
    
    if (missing.length > 0) {
        showToast('يرجى ملء الحقول المطلوبة: المرتب، المدة، سعر السيارة', 'error');
        return false;
    }
    
    if (formData.salary < 500) {
        showToast('مرتب العميل يجب أن يكون أكثر من 500 د.ل', 'error');
        return false;
    }
    
    if (formData.carPrice < 1000) {
        showToast('سعر السيارة يجب أن يكون أكثر من 1000 د.ل', 'error');
        return false;
    }

    if (!isYearAvailable(formData.years, formData.salary, formData.carPrice)) {
        const needed = formatWhole(requiredSalaryFor(formData.years, formData.carPrice));
        showToast(`مدة ${formData.years} سنوات غير متاحة بهذه البيانات — تتطلب مرتب ${needed} د.ل`, 'error');
        return false;
    }

    return true;
}

// Theme Management
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    appState.currentTheme = newTheme;
    appState.settings.appSettings.theme = newTheme;
    
    const themeIcon = document.getElementById('themeIcon');
    themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    
    localStorage.setItem('theme', newTheme);
    API.saveSettings(appState.settings);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || appState.settings.appSettings.theme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    appState.currentTheme = savedTheme;
    
    const themeIcon = document.getElementById('themeIcon');
    themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Settings Management
function toggleSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsButton = document.querySelector('button[onclick="toggleSettings()"]');
    const settingsIcon = settingsButton.querySelector('i');
    
    // إذا كانت الإعدادات مفتوحة، أغلقها بدون كلمة مرور
    if (!settingsPanel.classList.contains('hidden')) {
        settingsPanel.classList.add('hidden');
        settingsIcon.className = 'fas fa-lock';
        settingsButton.style.backgroundColor = '';
        showToast('🔒 تم إغلاق الإعدادات', 'success');
        return;
    }

    // مع Firebase تكفي الجلسة القائمة دون إعادة تسجيل الدخول
    if (cloudEnabled() && window.CloudStore.isSignedIn()) {
        openSettingsPanel();
        return;
    }

    if (cloudEnabled()) {
        showLoginModal();
        return;
    }

    // إظهار نافذة كلمة المرور
    showPasswordModal();
}

// ————— تسجيل دخول المسؤول عبر Firebase Authentication —————

function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'password-modal';
    modal.innerHTML = `
        <div class="password-modal-content">
            <div class="password-modal-header">
                <h3>
                    <i class="fas fa-user-shield"></i>
                    دخول المسؤول
                </h3>
                <button class="close-btn" onclick="closePasswordModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="password-modal-body">
                <p>سجّل الدخول لتعديل الإعدادات وقائمة السيارات:</p>
                <input type="email" id="loginEmail" class="form-control" placeholder="البريد الإلكتروني" autocomplete="username">
                <input type="password" id="loginPassword" class="form-control" placeholder="كلمة المرور" autocomplete="current-password" style="margin-top: 0.75rem;">
                <div class="password-modal-buttons">
                    <button class="btn btn-primary" id="loginSubmit" onclick="submitLogin()">
                        <i class="fas fa-sign-in-alt"></i>
                        دخول
                    </button>
                    <button class="btn btn-outline" onclick="closePasswordModal()">
                        <i class="fas fa-times"></i>
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    // قد يُغلق المستخدم النافذة قبل انتهاء المؤقّت، فنتحقق من بقاء الحقل
    setTimeout(() => {
        const field = document.getElementById('loginEmail');
        if (field) field.focus();
    }, 100);

    ['loginEmail', 'loginPassword'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', e => {
            if (e.key === 'Enter') submitLogin();
        });
    });
}

async function submitLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const button = document.getElementById('loginSubmit');

    if (!email || !password) {
        showToast('أدخل البريد الإلكتروني وكلمة المرور', 'error');
        return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ الدخول...';

    try {
        await window.CloudStore.signIn(email, password);
        closePasswordModal();
        openSettingsPanel();
        showToast(`🔓 مرحباً ${email}`, 'success');
    } catch (error) {
        showToast(`🚫 ${window.CloudStore.describeAuthError(error)}`, 'error');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-sign-in-alt"></i> دخول';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginPassword').focus();
    }
}

async function adminSignOut() {
    await window.CloudStore.signOut();
    closeSettings();
    showToast('تم تسجيل الخروج', 'success');
}

function showPasswordModal() {
    const isFirstRun = !getStoredPassword();

    // إنشاء النافذة المنبثقة
    const modal = document.createElement('div');
    modal.className = 'password-modal';
    modal.innerHTML = `
        <div class="password-modal-content">
            <div class="password-modal-header">
                <h3>
                    <i class="fas fa-lock"></i>
                    ${isFirstRun ? 'تعيين كلمة مرور الإعدادات' : 'الدخول إلى الإعدادات'}
                </h3>
                <button class="close-btn" onclick="closePasswordModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="password-modal-body">
                <p>${isFirstRun
                    ? 'لا توجد كلمة مرور محفوظة في هذا المتصفح. اختر كلمة مرور لحماية الإعدادات:'
                    : 'يرجى إدخال كلمة المرور للوصول إلى الإعدادات:'}</p>
                <input type="password" id="passwordInput" class="form-control" placeholder="${isFirstRun ? 'اختر كلمة مرور جديدة' : 'أدخل كلمة المرور'}">
                <div class="password-modal-buttons">
                    <button class="btn btn-primary" onclick="checkPassword()">
                        <i class="fas ${isFirstRun ? 'fa-key' : 'fa-unlock'}"></i>
                        ${isFirstRun ? 'تعيين' : 'تأكيد'}
                    </button>
                    <button class="btn btn-outline" onclick="closePasswordModal()">
                        <i class="fas fa-times"></i>
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // التركيز على حقل كلمة المرور، مع التحقق من بقائه إن أُغلقت النافذة سريعاً
    setTimeout(() => {
        const field = document.getElementById('passwordInput');
        if (field) field.focus();
    }, 100);
    
    // دعم مفتاح Enter
    document.getElementById('passwordInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });
}

function openSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsButton = document.querySelector('button[onclick="toggleSettings()"]');
    const settingsIcon = settingsButton.querySelector('i');

    settingsPanel.classList.remove('hidden');
    settingsIcon.className = 'fas fa-unlock';
    settingsButton.style.backgroundColor = 'var(--success-color)';
}

// كلمة المرور تُحفظ في متصفح كل جهاز ولا تُكتب في الكود المصدري،
// حتى لا تنكشف لأي شخص يطّلع على المستودع.
function getStoredPassword() {
    return readLocal(STORAGE_KEYS.password);
}

function checkPassword() {
    const input = document.getElementById('passwordInput');
    const storedPassword = getStoredPassword();

    // أول استخدام على هذا الجهاز: المُدخل يصبح كلمة المرور
    if (!storedPassword) {
        if (input.value.length < 4) {
            showToast('اختر كلمة مرور من 4 خانات على الأقل', 'error');
            input.focus();
            return;
        }

        if (!writeLocal(STORAGE_KEYS.password, input.value)) {
            return;
        }

        openSettingsPanel();
        showToast('🔐 تم تعيين كلمة مرور الإعدادات لهذا المتصفح', 'success');
        closePasswordModal();
        return;
    }

    if (input.value === storedPassword) {
        openSettingsPanel();
        showToast('🔓 تم فتح الإعدادات بنجاح', 'success');
        closePasswordModal();
    } else {
        showToast('🚫 كلمة المرور غير صحيحة', 'error');
        input.value = '';
        input.focus();
    }
}

function closePasswordModal() {
    const modal = document.querySelector('.password-modal');
    if (modal) {
        modal.remove();
    }
}

// إغلاق صامت — يُستخدم عندما تكون هناك رسالة أهم تُعرض للمستخدم
function closeSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsButton = document.querySelector('button[onclick="toggleSettings()"]');
    const settingsIcon = settingsButton.querySelector('i');

    settingsPanel.classList.add('hidden');
    settingsIcon.className = 'fas fa-lock';
    settingsButton.style.backgroundColor = '';
}

function closeSettings() {
    closeSettingsPanel();
    showToast('🔒 تم إغلاق الإعدادات', 'success');
}

async function loadSettings() {
    const settings = await API.getSettings();

    if (settings) {
        // دمج بدل الاستبدال حتى لا تختفي المفاتيح الناقصة من ملف الإعدادات
        appState.settings = {
            ...appState.settings,
            ...settings,
            financialSettings: {
                ...appState.settings.financialSettings,
                ...settings.financialSettings
            },
            appSettings: {
                ...appState.settings.appSettings,
                ...settings.appSettings
            }
        };
    } else if (cloudEnabled()) {
        // لم يحفظ المسؤول الإعدادات في Firestore بعد — تُستخدم القيم
        // الافتراضية بصمت حتى أول حفظ، وأي فشل اتصال نبّه عنه API.getSettings
    } else if (!staticMode) {
        showToast('تعذّر تحميل الإعدادات من الخادم — يتم استخدام القيم الاحتياطية. تحقّق من الإعدادات قبل اعتماد أي حساب', 'error');
    }
    // في الوضع المحلي بلا إعدادات محفوظة تُستخدم القيم الافتراضية بصمت

    // Update form fields
    const { ceiling, profitRate, discountedRate } = appState.settings.financialSettings;
    document.getElementById('ceiling').value = ceiling;
    document.getElementById('profitRate').value = profitRate;
    document.getElementById('discountedRate').value = discountedRate;

    updateYearAvailability();
}

async function saveSettings() {
    const ceiling = parseFloat(document.getElementById('ceiling').value);
    const profitRate = parseFloat(document.getElementById('profitRate').value);
    const discountedRate = parseFloat(document.getElementById('discountedRate').value);
    
    if (isNaN(ceiling) || ceiling <= 0) {
        showToast('يرجى إدخال سقف مرابحة صحيح', 'error');
        return;
    }
    
    if (isNaN(profitRate) || profitRate < 0 || profitRate > 100) {
        showToast('يرجى إدخال هامش ربح صحيح (0-100%)', 'error');
        return;
    }
    
    if (isNaN(discountedRate) || discountedRate < 0 || discountedRate > 100) {
        showToast('يرجى إدخال هامش ربح مخفض صحيح (0-100%)', 'error');
        return;
    }
    
    appState.settings.financialSettings = {
        ...appState.settings.financialSettings,
        ceiling,
        profitRate,
        discountedRate
    };
    
    const success = await API.saveSettings(appState.settings);
    if (success) {
        updateYearAvailability(); // السقف والنسب تغيّرا فتتغير المدد المتاحة
        closeSettingsPanel(); // صامت حتى تبقى رسالة نجاح الحفظ ظاهرة
    }
}

// Financing Term Availability
// المدة تُتاح إذا كان نصف المرتب × عدد الأشهر يغطي المبلغ المطلوب.
// المبلغ المطلوب هو سقف المرابحة قبل إدخال سعر السيارة، ثم يصبح الأقل
// بين السعر النهائي للسيارة والسقف بعد إدخاله. الحد الأقصى متاح دائماً.
const MAX_YEARS = 8;

function getActiveRate() {
    const { profitRate, discountedRate } = appState.settings.financialSettings;
    return document.getElementById('hasDiscount').value === 'yes' ? discountedRate : profitRate;
}

function requiredAmountFor(years, carPrice) {
    const { ceiling } = appState.settings.financialSettings;

    if (!carPrice || carPrice <= 0) {
        return ceiling;
    }

    const finalPrice = carPrice * (1 + (getActiveRate() * years) / 100);
    return Math.min(finalPrice, ceiling);
}

function requiredSalaryFor(years, carPrice) {
    return Math.ceil((requiredAmountFor(years, carPrice) / (years * 12)) * 2);
}

function isYearAvailable(years, salary, carPrice) {
    if (years === MAX_YEARS) return true;
    if (!salary || salary <= 0) return true; // لا مرتب بعد، فلا شيء نحكم عليه
    return (salary / 2) * (years * 12) >= requiredAmountFor(years, carPrice);
}

function updateYearAvailability() {
    const yearsSelect = document.getElementById('years');
    const salary = parseFloat(document.getElementById('salary').value) || 0;
    const carPrice = parseFloat(document.getElementById('carPrice').value) || 0;
    let selectionCleared = false;

    Array.from(yearsSelect.options).forEach(option => {
        const years = parseInt(option.value);
        if (!years) return; // تجاوز خيار "اختر المدة"

        // نحفظ النص الأصلي مرة واحدة حتى لا تتراكم عبارة "يتطلب مرتب"
        if (!option.dataset.baseLabel) {
            option.dataset.baseLabel = option.textContent.trim();
        }
        const baseLabel = option.dataset.baseLabel;
        const available = isYearAvailable(years, salary, carPrice);

        option.disabled = !available;
        option.textContent = available
            ? baseLabel
            : `${baseLabel} — يتطلب مرتب ${formatWhole(requiredSalaryFor(years, carPrice))} د.ل`;

        if (!available && yearsSelect.value === option.value) {
            yearsSelect.value = '';
            selectionCleared = true;
        }
    });

    if (selectionCleared) {
        showToast('المدة المختارة لم تعد متاحة بهذه البيانات — يرجى اختيار مدة أخرى', 'error');
    }
}

// ————— سعر الإغلاق: قيمة ثابتة أو نطاق —————
// النطاق ينعكس على صافي العميل والخسارة فقط، أما القسط ودفعة المصرف
// فلا يعتمدان على سعر الإغلاق إطلاقاً.
function readClosingInput() {
    const mode = document.getElementById('closingMode').value;

    if (mode === 'range') {
        const min = parseFloat(document.getElementById('closingMin').value) || 0;
        const max = parseFloat(document.getElementById('closingMax').value) || 0;
        if (min <= 0 && max <= 0) return { type: 'none' };
        return { type: 'range', min: Math.min(min, max), max: Math.max(min, max) };
    }

    const value = parseFloat(document.getElementById('closingPrice').value) || 0;
    return value > 0 ? { type: 'fixed', value } : { type: 'none' };
}

function closingBounds(closing) {
    if (closing.type === 'fixed') return { low: closing.value, high: closing.value };
    if (closing.type === 'range') return { low: closing.min, high: closing.max };
    return { low: 0, high: 0 };
}

function describeClosing(closing) {
    if (closing.type === 'fixed') return `${formatNumber(closing.value)} د.ل`;
    if (closing.type === 'range') {
        return `${formatNumber(closing.min)} – ${formatNumber(closing.max)} د.ل`;
    }
    return 'بدون سعر إغلاق';
}

// Calculator Functions
function calculate() {
    const closing = readClosingInput();
    const formData = {
        salary: parseFloat(document.getElementById('salary').value),
        years: parseInt(document.getElementById('years').value),
        carPrice: parseFloat(document.getElementById('carPrice').value),
        closing,
        closingPrice: closingBounds(closing).low, // للتوافق مع عمليات التحقق
        hasDiscount: document.getElementById('hasDiscount').value === 'yes'
    };
    
    if (!validateForm(formData)) {
        return;
    }
    
    const { ceiling, profitRate, discountedRate } = appState.settings.financialSettings;
    const months = formData.years * 12;
    const halfSalary = formData.salary / 2;
    let note = '';
    
    // Calculate profit rate first
    const rate = formData.hasDiscount ? discountedRate : profitRate;
    const totalProfitPercent = (rate * formData.years) / 100;
    const finalCarPrice = formData.carPrice * (1 + totalProfitPercent);
    
    // Calculate installment based on final car price or ceiling (whichever is lower)
    let monthlyInstallment;
    if (finalCarPrice <= ceiling) {
        monthlyInstallment = finalCarPrice / months;
        note = 'تم حساب القسط على أساس السعر النهائي للسيارة';
    } else {
        monthlyInstallment = ceiling / months;
        note = 'تم حساب القسط على أساس سقف المرابحة';
    }
    
    // Check if installment exceeds half salary
    if (monthlyInstallment > halfSalary) {
        monthlyInstallment = halfSalary;
        note = 'تم تطبيق قاعدة نصف المرتب لحماية العميل';
    }
    
    const totalInstallments = monthlyInstallment * months;
    const bankPayment = finalCarPrice - totalInstallments;

    // مع نطاق الإغلاق يصبح صافي العميل والخسارة نطاقين. لاحظ أن أعلى سعر
    // إغلاق يعطي أعلى صافٍ وأقل خسارة، فالحدود تنعكس بين المقياسين.
    const { low, high } = closingBounds(closing);
    const contributionLow = low - bankPayment;
    const contributionHigh = high - bankPayment;

    // خسارة العميل = الفرق بين السعر النهائي بعد الربح وسعر الإغلاق.
    // الصيغة السابقة (totalInstallments - customerContribution) تختصر جبرياً
    // إلى هذه المعادلة نفسها لأن حد الأقساط يُلغى، فكُتبت هنا صريحة.
    const lossLow = finalCarPrice - high;
    const lossHigh = finalCarPrice - low;
    const lossPercentLow = (lossLow / formData.carPrice) * 100;
    const lossPercentHigh = (lossHigh / formData.carPrice) * 100;

    const hasClosing = closing.type !== 'none';
    const isRange = closing.type === 'range';

    // Check feasibility
    let feasibilityNote = '';
    if (!hasClosing) {
        feasibilityNote = 'تنبيه: لم يتم إدخال سعر الإغلاق - الحساب تم بدون سعر إغلاق';
    } else if (contributionHigh < 0) {
        feasibilityNote = 'تحذير: صافي العميل سالب - يحتاج العميل مبلغ إضافي';
    } else if (contributionLow < 0) {
        feasibilityNote = 'تنبيه: صافي العميل قد يكون سالباً في أدنى سعر إغلاق';
    } else {
        feasibilityNote = 'صافي العميل مناسب';
    }
    
    // Calculate additional details for the details panel
    const profitAmount = formData.carPrice * totalProfitPercent;
    
    // Bank details calculations
    // المعامل يتبع نسبة الربح الفعلية للمعاملة: 3% × 8 سنوات = 1.24، ومع
    // التخفيض 2% × 8 سنوات = 1.16، ويتغير تلقائياً بتغير المدة أو النسبة.
    const profitMultiplier = 1 + totalProfitPercent;
    const requiredSystemEntry = Math.floor(bankPayment / profitMultiplier); // بدون كسور
    const remainingPaymentForProfit = Math.round(bankPayment - requiredSystemEntry); // تقريب لرقم صحيح
    const murabhaFinancing = formData.carPrice - requiredSystemEntry;
    const automaticCalculatedProfit = profitAmount - remainingPaymentForProfit;
    const monthlyInstallmentWithoutProfit = murabhaFinancing / months;
    const monthlyProfitValue = monthlyInstallment - monthlyInstallmentWithoutProfit;
    
    displayResults({
        monthlyInstallment,
        finalCarPrice,
        totalInstallments,
        bankPayment,
        // نطاقات (تتساوى حدودها عند القيمة الثابتة)
        hasClosing,
        isRange,
        closingLabel: describeClosing(closing),
        contributionLow,
        contributionHigh,
        lossLow,
        lossHigh,
        lossPercentLow,
        lossPercentHigh,
        note,
        feasibilityNote,
        rate,
        totalProfitPercent: totalProfitPercent * 100,
        // Additional details
        months,
        carPrice: formData.carPrice,
        profitAmount,
        years: formData.years,
        // Bank details
        requiredSystemEntry,
        remainingPaymentForProfit,
        murabhaFinancing,
        automaticCalculatedProfit,
        monthlyInstallmentWithoutProfit,
        monthlyProfitValue
    });
}

function displayResults(results) {
    const resultsContainer = document.getElementById('results');
    const resultsContent = document.getElementById('resultsContent');
    
    resultsContent.innerHTML = `
        <div class="result-item result-hero">
            <div class="label">
                <i class="fas fa-calendar-alt"></i>
                القسط الشهري
            </div>
            <div class="value">${formatNumber(results.monthlyInstallment)} <span class="unit">د.ل</span></div>
        </div>

        <div class="result-item">
            <div class="label">
                <i class="fas fa-car"></i>
                السعر النهائي للسيارة
            </div>
            <div class="value">${formatNumber(results.finalCarPrice)} د.ل</div>
        </div>
        
        <div class="result-item">
            <div class="label">
                <i class="fas fa-coins"></i>
                مجموع الأقساط
            </div>
            <div class="value">${formatNumber(results.totalInstallments)} د.ل</div>
        </div>
        
        <div class="result-item">
            <div class="label">
                <i class="fas fa-university"></i>
                دفعة المصرف
            </div>
            <div class="value">${formatNumber(results.bankPayment)} د.ل</div>
        </div>
        
        ${results.hasClosing ? `
            <div class="result-item">
                <div class="label">
                    <i class="fas fa-user"></i>
                    صافي للعميل${results.isRange ? ' <span class="range-badge">نطاق</span>' : ''}
                </div>
                <div class="value">${formatRange(results.contributionLow, results.contributionHigh, 'د.ل')}</div>
            </div>` : `
            <div class="result-item" style="border: 2px solid var(--warning-color); background: rgba(245, 158, 11, 0.05);">
                <div class="label" style="color: var(--warning-color);">
                    <i class="fas fa-info-circle"></i>
                    الحساب بدون سعر إغلاق
                </div>
                <div class="value" style="color: var(--warning-color);">لم يتم إدخال سعر الإغلاق</div>
            </div>`
        }
        
        ${results.hasClosing ? `
            <div class="result-item" style="border: 2px solid var(--danger-color); background: rgba(239, 68, 68, 0.05);">
                <div class="label" style="color: var(--danger-color);">
                    <i class="fas fa-exclamation-triangle"></i>
                    خسارة العميل${results.isRange ? ' <span class="range-badge">نطاق</span>' : ''}
                </div>
                <div class="value" style="color: var(--danger-color);">${formatRange(results.lossLow, results.lossHigh, 'د.ل')}</div>
            </div>

            <div class="result-item" style="border: 2px solid var(--danger-color); background: rgba(239, 68, 68, 0.05);">
                <div class="label" style="color: var(--danger-color);">
                    <i class="fas fa-chart-pie"></i>
                    نسبة الخسارة${results.isRange ? ' <span class="range-badge">نطاق</span>' : ''}
                </div>
                <div class="value" style="color: var(--danger-color);">${formatRange(results.lossPercentLow, results.lossPercentHigh, '%')}</div>
            </div>` : ''
        }
        
        <div class="result-item">
            <div class="label">
                <i class="fas fa-percentage"></i>
                هامش الربح المطبق
            </div>
            <div class="value">${results.rate}% سنوياً</div>
        </div>
        
        <!-- Details Panel -->
        <div class="details-panel">
            <div class="details-header" onclick="toggleDetails()">
                <h4>
                    <i class="fas fa-info-circle"></i>
                    تفاصيل الحساب والبنك
                    <span style="font-size: 0.8rem; font-weight: 400; opacity: 0.9; margin-right: 0.5rem;">(اضغط لإظهار التفاصيل)</span>
                </h4>
                <i class="fas fa-chevron-down details-toggle" id="detailsToggle"></i>
            </div>
            <div class="details-content hidden" id="detailsContent">
                <div class="result-item">
                    <div class="label">
                        <i class="fas fa-calendar"></i>
                        عدد الأشهر
                    </div>
                    <div class="value">${results.months} شهر</div>
                </div>
                
                <div class="result-item">
                    <div class="label">
                        <i class="fas fa-tag"></i>
                        سعر شراء السيارة
                    </div>
                    <div class="value">${formatNumber(results.carPrice)} د.ل</div>
                </div>
                
                <div class="result-item">
                    <div class="label">
                        <i class="fas fa-percentage"></i>
                        نسبة هامش الربح
                    </div>
                    <div class="value">${formatNumber(results.totalProfitPercent)}%</div>
                </div>
                
                <div class="result-item">
                    <div class="label">
                        <i class="fas fa-money-bill-wave"></i>
                        قيمة هامش الربح
                    </div>
                    <div class="value">${formatNumber(results.profitAmount)} د.ل</div>
                </div>
                
                <hr style="margin: 1.5rem 0; border: none; border-top: 2px solid var(--border-color);">
                
                <h5 style="margin: 1rem 0 0.5rem 0; color: var(--primary-color); font-weight: 600;">
                    <i class="fas fa-university"></i>
                    تفاصيل البنك
                    <span style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 400;">📋 يمكن التمرير لأسفل</span>
                </h5>
                
                <div class="result-item">
                    <div class="label">
                        <i class="fas fa-keyboard"></i>
                        الدفعة المطلوب إدخالها في الشاشة
                    </div>
                    <div class="value">${formatNumber(results.requiredSystemEntry)} د.ل</div>
                </div>
                
                <div class="result-item">
                    <div class="label">
                        <i class="fas fa-coins"></i>
                        باقي الدفعة (للربح)
                    </div>
                    <div class="value">${formatNumber(results.remainingPaymentForProfit)} د.ل</div>
                </div>
                
                <div class="result-item">
                    <div class="label">
                        <i class="fas fa-chart-line"></i>
                        تمويل المرابحة
                    </div>
                    <div class="value">${formatNumber(results.murabhaFinancing)} د.ل</div>
                </div>
                
                <div class="result-item">
                    <div class="label">
                        <i class="fas fa-robot"></i>
                        الربح المحتسب آليا
                    </div>
                    <div class="value">${formatNumber(results.automaticCalculatedProfit)} د.ل</div>
                </div>
                
                <div class="result-item">
                    <div class="label">
                        <i class="fas fa-calendar-minus"></i>
                        القسط الشهري بدون هامش الربح
                    </div>
                    <div class="value">${results.monthlyInstallmentWithoutProfit.toFixed(2)} د.ل</div>
                </div>
                
                <div class="result-item">
                    <div class="label">
                        <i class="fas fa-percent"></i>
                        قيمة هامش الربح في الشهر
                    </div>
                    <div class="value">${formatNumber(results.monthlyProfitValue)} د.ل</div>
                </div>
            </div>
        </div>
        
        <div class="result-note">
            <i class="fas fa-info-circle"></i>
            ${results.note}
        </div>
        
        ${results.feasibilityNote !== 'صافي العميل مناسب' ? 
            `<div class="result-note" style="background: ${!results.hasClosing ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-color: ${!results.hasClosing ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${!results.hasClosing ? 'var(--warning-color)' : 'var(--danger-color)'};">
                <i class="fas ${!results.hasClosing ? 'fa-info-circle' : 'fa-exclamation-triangle'}"></i>
                ${results.feasibilityNote}
            </div>` : ''
        }
    `;
    
    resultsContainer.classList.remove('hidden');
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
    
    // Show a toast message to guide user to details panel
    setTimeout(() => {
        showToast('💡 اضغط على "تفاصيل الحساب والبنك" أسفل النتائج لمشاهدة جميع التفاصيل', 'success');
    }, 2000);
}

// Cars Management
async function loadCars() {
    const cars = await API.getCars();
    appState.cars = cars;
    renderCarsList();
    refreshCarSelect();
}

function renderCarsList() {
    const carsList = document.getElementById('carsList');
    
    if (appState.cars.length === 0) {
        carsList.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-car" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>لا توجد سيارات محفوظة بعد</p>
            </div>
        `;
        return;
    }
    
    carsList.innerHTML = appState.cars.map((car, index) => `
        <div class="car-item">
            ${car.imageUrl
                ? `<img class="car-thumb" src="${escapeAttr(car.imageUrl)}" alt="${escapeAttr(car.name)}" loading="lazy">`
                : `<div class="car-thumb car-thumb-empty"><i class="fas fa-car"></i></div>`}
            <div class="car-info">
                <div class="car-name">${escapeHtml(car.name)}</div>
                <div class="car-price">${formatNumber(car.price)} د.ل</div>
                <div class="car-closing">${describeCarClosing(car)}</div>
            </div>
            <div class="car-actions">
                <button class="btn btn-primary btn-small" onclick="useCar(${index})">
                    <i class="fas fa-calculator"></i>
                    استخدم
                </button>
                <button class="btn btn-outline btn-small" onclick="editCar(${index})">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteCar(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// ملخّص مختصر داخل القائمة، فتُعرض الأسعار بأرقام صحيحة بلا كسور
function describeCarClosing(car) {
    if (car.closingType === 'fixed') {
        return `إغلاق: ${formatWhole(car.closingPrice)} د.ل`;
    }
    if (car.closingType === 'range') {
        return `إغلاق: ${formatWhole(car.closingMin)} – ${formatWhole(car.closingMax)} د.ل`;
    }
    return 'بدون سعر إغلاق';
}

// ————— اختيار السيارة داخل الحاسبة —————

function refreshCarSelect() {
    const select = document.getElementById('carSelect');
    const previous = select.value;

    select.innerHTML = '<option value="">إدخال يدوي</option>' +
        appState.cars.map((car, i) =>
            `<option value="${i}">${escapeHtml(car.name)} — ${formatNumber(car.price)} د.ل</option>`
        ).join('');

    // نحافظ على الاختيار السابق ما دام ما يزال موجوداً
    if (previous && appState.cars[Number(previous)]) {
        select.value = previous;
    } else if (previous) {
        clearCarSelection();
    }
}

function applyCarSelection() {
    const index = document.getElementById('carSelect').value;
    const preview = document.getElementById('carPreview');

    if (index === '') {
        preview.classList.add('hidden');
        updateYearAvailability();
        return;
    }

    const car = appState.cars[Number(index)];
    if (!car) return;

    document.getElementById('carPrice').value = car.price;

    // سعر الإغلاق يُملأ من بيانات السيارة
    const modeSelect = document.getElementById('closingMode');
    if (car.closingType === 'range') {
        modeSelect.value = 'range';
        document.getElementById('closingMin').value = car.closingMin;
        document.getElementById('closingMax').value = car.closingMax;
        document.getElementById('closingPrice').value = '';
    } else if (car.closingType === 'fixed') {
        modeSelect.value = 'fixed';
        document.getElementById('closingPrice').value = car.closingPrice;
        document.getElementById('closingMin').value = '';
        document.getElementById('closingMax').value = '';
    } else {
        modeSelect.value = 'fixed';
        ['closingPrice', 'closingMin', 'closingMax']
            .forEach(id => { document.getElementById(id).value = ''; });
    }
    updateClosingMode();

    const image = document.getElementById('carPreviewImage');
    if (car.imageUrl) {
        image.src = car.imageUrl;
        image.classList.remove('hidden');
    } else {
        image.removeAttribute('src');
        image.classList.add('hidden');
    }
    document.getElementById('carPreviewName').textContent = car.name;
    document.getElementById('carPreviewClosing').textContent = describeCarClosing(car);
    preview.classList.remove('hidden');

    updateYearAvailability();
}

function clearCarSelection() {
    document.getElementById('carSelect').value = '';
    document.getElementById('carPreview').classList.add('hidden');
    updateYearAvailability();
}

function updateClosingMode() {
    const isRange = document.getElementById('closingMode').value === 'range';
    document.getElementById('closingFixedWrap').classList.toggle('hidden', isRange);
    document.getElementById('closingRangeWrap').classList.toggle('hidden', !isRange);
}

function readCarClosingInput() {
    const mode = document.getElementById('carClosingMode').value;

    if (mode === 'fixed') {
        const value = parseFloat(document.getElementById('carClosingPrice').value);
        if (isNaN(value) || value <= 0) return { error: 'أدخل سعر إغلاق صحيح' };
        return { closingType: 'fixed', closingPrice: value };
    }

    if (mode === 'range') {
        const min = parseFloat(document.getElementById('carClosingMin').value);
        const max = parseFloat(document.getElementById('carClosingMax').value);
        if (isNaN(min) || isNaN(max) || min <= 0 || max <= 0) {
            return { error: 'أدخل حدّي النطاق' };
        }
        return { closingType: 'range', closingMin: Math.min(min, max), closingMax: Math.max(min, max) };
    }

    return { closingType: 'none' };
}

async function addCar() {
    const name = document.getElementById('carName').value.trim();
    const price = parseFloat(document.getElementById('carPriceAdd').value);

    if (!name) {
        showToast('يرجى إدخال اسم السيارة', 'error');
        return;
    }

    if (isNaN(price) || price <= 0) {
        showToast('يرجى إدخال سعر صحيح للسيارة', 'error');
        return;
    }

    const closing = readCarClosingInput();
    if (closing.error) {
        showToast(closing.error, 'error');
        return;
    }

    // عند التعديل نستثني السيارة نفسها من فحص التكرار
    const duplicate = appState.cars.find((car, i) =>
        i !== carEditIndex && car.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
        showToast('السيارة موجودة مسبقاً', 'error');
        return;
    }

    const car = { name, price, ...closing };
    if (chosenImageUrl) car.imageUrl = chosenImageUrl;

    const editing = carEditIndex >= 0;
    if (editing) {
        appState.cars[carEditIndex] = car;
    } else {
        appState.cars.push(car);
    }

    const success = await API.saveCars(appState.cars);
    if (success) {
        resetCarForm();
        renderCarsList();
        refreshCarSelect();
        showToast(editing ? 'تم تعديل السيارة بنجاح' : 'تم إضافة السيارة بنجاح', 'success');
    } else if (editing) {
        await loadCars(); // تراجع عن التعديل المحلي بعد فشل الحفظ
    } else {
        appState.cars.pop();
    }
}

// «استخدم» من قائمة الإعدادات: يختار السيارة في الحاسبة ويعود إليها
function useCar(index) {
    const car = appState.cars[index];
    if (!car) return;

    document.getElementById('carSelect').value = String(index);
    applyCarSelection();
    closeSettingsPanel();
    showToast(`تم استخدام بيانات ${car.name}`, 'success');
    document.querySelector('.calculator-section').scrollIntoView({ behavior: 'smooth' });
}

function editCar(index) {
    const car = appState.cars[index];
    carEditIndex = index;

    document.getElementById('carName').value = car.name;
    document.getElementById('carPriceAdd').value = car.price;
    document.getElementById('carClosingMode').value = car.closingType || 'none';
    document.getElementById('carClosingPrice').value = car.closingPrice || '';
    document.getElementById('carClosingMin').value = car.closingMin || '';
    document.getElementById('carClosingMax').value = car.closingMax || '';
    updateCarClosingFields();

    setChosenImage(car.imageUrl || '');
    document.getElementById('carFormSubmitLabel').textContent = 'حفظ التعديل';
    document.getElementById('carFormCancel').classList.remove('hidden');
    document.getElementById('carName').focus();
}

function cancelCarEdit() {
    resetCarForm();
    showToast('أُلغي التعديل', 'success');
}

function resetCarForm() {
    carEditIndex = -1;
    ['carName', 'carPriceAdd', 'carClosingPrice', 'carClosingMin', 'carClosingMax']
        .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('carClosingMode').value = 'none';
    updateCarClosingFields();
    setChosenImage('');
    document.getElementById('imageResults').classList.add('hidden');
    document.getElementById('carFormSubmitLabel').textContent = 'إضافة السيارة';
    document.getElementById('carFormCancel').classList.add('hidden');
}

function updateCarClosingFields() {
    const mode = document.getElementById('carClosingMode').value;
    document.getElementById('carClosingFixedGroup').style.display = mode === 'fixed' ? '' : 'none';
    document.getElementById('carClosingRangeGroup').style.display = mode === 'range' ? '' : 'none';
}

async function deleteCar(index) {
    if (!confirm('هل أنت متأكد من حذف هذه السيارة؟')) return;

    const removed = appState.cars.splice(index, 1);
    const success = await API.saveCars(appState.cars);
    if (success) {
        if (carEditIndex === index) resetCarForm();
        renderCarsList();
        refreshCarSelect();
        showToast('تم حذف السيارة بنجاح', 'success');
    } else {
        appState.cars.splice(index, 0, ...removed);
    }
}

async function clearAllData() {
    if (!confirm('هل أنت متأكد من مسح جميع السيارات؟ هذا الإجراء غير قابل للتراجع.')) return;

    const backup = appState.cars;
    appState.cars = [];
    const success = await API.saveCars(appState.cars);
    if (success) {
        resetCarForm();
        renderCarsList();
        refreshCarSelect();
        showToast('تم مسح جميع السيارات', 'success');
    } else {
        appState.cars = backup;
    }
}

// ————— صور السيارات: بحث Google ثم حفظ في Firebase Storage —————

let carEditIndex = -1;      // -1 يعني إضافة سيارة جديدة
let chosenImageUrl = '';    // رابط الصورة المختارة بعد رفعها إلى Storage

function searchConfigured() {
    const c = window.SEARCH_CONFIG;
    return !!(c && c.apiKey && c.searchEngineId);
}

function setChosenImage(url) {
    chosenImageUrl = url || '';
    const wrap = document.getElementById('carImageChosen');
    const preview = document.getElementById('carImageChosenPreview');

    if (chosenImageUrl) {
        preview.src = chosenImageUrl;
        wrap.classList.remove('hidden');
    } else {
        preview.removeAttribute('src');
        wrap.classList.add('hidden');
    }
}

function clearChosenImage() {
    setChosenImage('');
}

// مسار لا يحتاج Storage ولا مفاتيح بحث — يعمل فوراً
function promptImageUrl() {
    const current = chosenImageUrl || '';
    const url = (prompt('الصق رابط صورة السيارة:', current) || '').trim();
    if (!url) return;

    if (!/^https?:\/\//i.test(url)) {
        showToast('الرابط يجب أن يبدأ بـ http أو https', 'error');
        return;
    }

    setChosenImage(url);
    showToast('تم اعتماد رابط الصورة', 'success');
}

// مزوّد افتراضي بلا مفاتيح ولا حصة يومية، ويسمح بالوصول من المتصفح.
// صوره حرة الترخيص فيجوز عرضها في التطبيق دون قلق.
async function searchWikimedia(query) {
    const url = 'https://commons.wikimedia.org/w/api.php'
        + '?action=query&generator=search&gsrnamespace=6&gsrlimit=12'
        + `&gsrsearch=${encodeURIComponent(query)}`
        + '&prop=imageinfo&iiprop=url|mime&iiurlwidth=500'
        + '&format=json&origin=*';

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const pages = (data.query && data.query.pages) || {};

    return Object.values(pages)
        .map(page => {
            const info = (page.imageinfo || [])[0] || {};
            return {
                title: String(page.title || '').replace(/^File:/, ''),
                thumb: info.thumburl,
                full: info.url,
                mime: info.mime
            };
        })
        // نستبعد الرسوم المتجهة والصيغ التي لا تُعرض جيداً كصورة سيارة
        .filter(item => item.thumb && /^image\/(jpeg|png|webp)$/.test(item.mime || ''));
}

// مزوّد اختياري أدق للموديلات الحديثة، يحتاج مفاتيح وحصة يومية
async function searchGoogleImages(query) {
    const { apiKey, searchEngineId } = window.SEARCH_CONFIG;
    const url = 'https://www.googleapis.com/customsearch/v1'
        + `?key=${encodeURIComponent(apiKey)}`
        + `&cx=${encodeURIComponent(searchEngineId)}`
        + `&q=${encodeURIComponent(query + ' سيارة')}`
        + '&searchType=image&num=8&imgSize=large&safe=active';

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error((data.error && data.error.message) || `HTTP ${response.status}`);
    }

    return (data.items || []).map(item => ({
        title: item.title || '',
        thumb: item.link,
        full: item.link
    }));
}

async function searchCarImages() {
    const query = document.getElementById('carName').value.trim();
    const results = document.getElementById('imageResults');

    if (!query) {
        showToast('اكتب اسم السيارة والموديل أولاً', 'error');
        document.getElementById('carName').focus();
        return;
    }

    const useGoogle = searchConfigured();
    const sourceLabel = useGoogle ? 'صور Google' : 'Wikimedia Commons';

    results.classList.remove('hidden');
    results.innerHTML = '<div class="image-results-status"><i class="fas fa-spinner fa-spin"></i> جارٍ البحث…</div>';

    let items;
    try {
        items = useGoogle ? await searchGoogleImages(query) : await searchWikimedia(query);
    } catch (error) {
        console.error('فشل البحث عن الصور:', error);
        results.innerHTML = `<div class="image-results-status error">تعذّر البحث: ${escapeHtml(error.message)}</div>`;
        return;
    }

    if (items.length === 0) {
        results.innerHTML = `<div class="image-results-status">
            لا توجد نتائج في ${sourceLabel} — جرّب الاسم بالإنجليزية مثل "Toyota Camry 2024"
        </div>`;
        return;
    }

    results.innerHTML = `
        <div class="image-results-status">
            اختر صورة — ${items.length} نتيجة من ${sourceLabel}
        </div>
        <div class="image-grid">
            ${items.map((item, i) => `
                <button type="button" class="image-option" data-index="${i}" title="${escapeAttr(item.title)}">
                    <img src="${escapeAttr(item.thumb)}" alt="" loading="lazy">
                </button>
            `).join('')}
        </div>
    `;

    results.querySelectorAll('.image-option').forEach(button => {
        button.addEventListener('click', () => {
            const item = items[Number(button.dataset.index)];
            pickSearchResult(item.thumb, button);
        });
    });
}

// الصورة المختارة تُنسخ إلى Firebase Storage حتى لا تعتمد على بقاء
// الموقع المصدر ولا يمنعها حظر الوصل المباشر لاحقاً
async function pickSearchResult(imageUrl, button) {
    if (!cloudEnabled()) {
        setChosenImage(imageUrl);
        showToast('حُفظ رابط الصورة (Firebase غير مفعّل فلا يمكن نسخها)', 'success');
        return;
    }

    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        const extension = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
        const stored = await window.CloudStore.uploadImageBlob(blob, extension);

        setChosenImage(stored);
        document.getElementById('imageResults').classList.add('hidden');
        showToast('تم اختيار الصورة وحفظها', 'success');
    } catch (error) {
        console.error('تعذّر نسخ الصورة:', error);
        // بعض المواقع تمنع الجلب من المتصفح، فنستخدم الرابط مباشرة
        setChosenImage(imageUrl);
        document.getElementById('imageResults').classList.add('hidden');
        showToast('تعذّر نسخ الصورة إلى التخزين — استُخدم الرابط المباشر', 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = original;
    }
}

async function handleImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('اختر ملف صورة', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة يتجاوز 5 ميجابايت', 'error');
        return;
    }

    if (!cloudEnabled()) {
        showToast('رفع الصور يتطلب تفعيل Firebase', 'error');
        return;
    }

    showToast('جارٍ رفع الصورة…', 'success');
    try {
        const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const url = await window.CloudStore.uploadImageBlob(file, extension);
        setChosenImage(url);
        showToast('تم رفع الصورة', 'success');
    } catch (error) {
        console.error('فشل رفع الصورة:', error);
        showToast(`فشل الرفع — ${window.CloudStore.describeStoreError(error)}`, 'error');
    } finally {
        event.target.value = '';
    }
}

// Details Panel Toggle
function toggleDetails() {
    const detailsContent = document.getElementById('detailsContent');
    const detailsToggle = document.getElementById('detailsToggle');
    
    if (detailsContent.classList.contains('hidden')) {
        detailsContent.classList.remove('hidden');
        detailsToggle.style.transform = 'rotate(180deg)';
    } else {
        detailsContent.classList.add('hidden');
        detailsToggle.style.transform = 'rotate(0deg)';
    }
}

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    // Longer duration for guidance messages
    const duration = message.includes('💡') ? 8000 : 5000;
    
    setTimeout(() => {
        hideToast();
    }, duration);
}

function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('hidden');
}

// Form Event Handlers
function setupEventListeners() {
    // Calculator form
    document.getElementById('calculatorForm').addEventListener('submit', (e) => {
        e.preventDefault();
        calculate();
    });
    
    // Car form
    document.getElementById('carForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addCar();
    });
    
    // Remove auto-fill for closing price when car price changes
    // User requested to remove this functionality
    
    // Form validation on input
    const requiredFields = ['salary', 'years', 'carPrice', 'closingPrice'];
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        field.addEventListener('input', () => {
            field.classList.remove('error');
        });
    });

    // إعادة حساب المدد المتاحة عند تغير أي مدخل يؤثر عليها
    ['salary', 'carPrice'].forEach(fieldId => {
        document.getElementById(fieldId).addEventListener('input', updateYearAvailability);
    });
    document.getElementById('hasDiscount').addEventListener('change', updateYearAvailability);

    // اختيار السيارة يملأ السعر وسعر الإغلاق ويعرض الصورة
    document.getElementById('carSelect').addEventListener('change', applyCarSelection);
    document.getElementById('closingMode').addEventListener('change', updateClosingMode);

    // تعديل السعر يدوياً يعني خروجاً عن السيارة المختارة
    document.getElementById('carPrice').addEventListener('input', () => {
        const select = document.getElementById('carSelect');
        const selected = appState.cars[Number(select.value)];
        if (selected && parseFloat(document.getElementById('carPrice').value) !== selected.price) {
            clearCarSelection();
        }
    });

    // نموذج إضافة السيارة داخل الإعدادات
    document.getElementById('carClosingMode').addEventListener('change', updateCarClosingFields);
    document.getElementById('carImageUpload').addEventListener('change', handleImageUpload);
}

// Loading Management
function hideLoadingScreen() {
    const loading = document.getElementById('loading');
    setTimeout(() => {
        loading.classList.add('hidden');
    }, 1000);
}

// Application Initialization
// وحدة Firebase تُحمَّل كـmodule فتنتهي تهيئتها بعد DOMContentLoaded،
// لذا ننتظر إشارتها قبل قراءة أي بيانات. المهلة تمنع التعليق إن تعذّر
// تحميل الوحدة، فيرجع التطبيق للتخزين المحلي.
function waitForCloudStore(timeoutMs = 6000) {
    if (window.__cloudStoreReady) return Promise.resolve();

    return new Promise(resolve => {
        const finish = () => {
            clearTimeout(timer);
            resolve();
        };
        const timer = setTimeout(finish, timeoutMs);
        window.addEventListener('cloud-store-ready', finish, { once: true });
    });
}

function setupCloudAccountBar() {
    if (!cloudEnabled()) return;

    window.CloudStore.onAuthChange(user => {
        const bar = document.querySelector('.cloud-account-bar');
        if (!bar) return;

        bar.classList.toggle('hidden', !user);
        if (user) {
            document.getElementById('cloudUserEmail').textContent = user.email;
        } else {
            closeSettingsPanel(); // رسالة تسجيل الخروج تكفي
        }
    });
}

async function initializeApp() {
    try {
        // Initialize theme
        initializeTheme();

        await waitForCloudStore();
        setupCloudAccountBar();

        // Load data
        await Promise.all([
            loadSettings(),
            loadCars()
        ]);
        
        // Setup event listeners
        setupEventListeners();
        
        // Hide loading screen
        hideLoadingScreen();
        
        console.log('تم تهيئة التطبيق بنجاح');
    } catch (error) {
        console.error('خطأ في تهيئة التطبيق:', error);
        showToast('حدث خطأ في تحميل التطبيق', 'error');
        hideLoadingScreen();
    }
}

// Make functions globally available
window.toggleTheme = toggleTheme;
window.toggleSettings = toggleSettings;
window.saveSettings = saveSettings;
window.calculate = calculate;
window.addCar = addCar;
window.useCar = useCar;
window.deleteCar = deleteCar;
window.clearAllData = clearAllData;
window.hideToast = hideToast;
window.submitLogin = submitLogin;
window.adminSignOut = adminSignOut;
window.closeSettings = closeSettings;
window.editCar = editCar;
window.cancelCarEdit = cancelCarEdit;
window.clearCarSelection = clearCarSelection;
window.searchCarImages = searchCarImages;
window.clearChosenImage = clearChosenImage;
window.promptImageUrl = promptImageUrl;

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp); 