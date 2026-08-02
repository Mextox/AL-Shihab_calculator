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
                showToast('تعذّر تحميل الإعدادات من Firebase — يتم استخدام القيم الافتراضية', 'error');
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
                showToast('فشل الحفظ — تأكد من تسجيل دخولك كمسؤول', 'error');
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
                showToast('فشل الحفظ — تأكد من تسجيل دخولك كمسؤول', 'error');
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

// Calculator Functions
function calculate() {
    const formData = {
        salary: parseFloat(document.getElementById('salary').value),
        years: parseInt(document.getElementById('years').value),
        carPrice: parseFloat(document.getElementById('carPrice').value),
        closingPrice: parseFloat(document.getElementById('closingPrice').value) || 0, // اختياري
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
    const customerContribution = formData.closingPrice - bankPayment;
    
    // خسارة العميل = الفرق بين السعر النهائي بعد الربح وسعر الإغلاق.
    // الصيغة السابقة (totalInstallments - customerContribution) تختصر جبرياً
    // إلى هذه المعادلة نفسها لأن حد الأقساط يُلغى، فكُتبت هنا صريحة.
    const customerLoss = finalCarPrice - formData.closingPrice;
    const lossPercentage = (customerLoss / formData.carPrice) * 100;
    
    // Check feasibility
    let feasibilityNote = '';
    if (formData.closingPrice === 0) {
        feasibilityNote = 'تنبيه: لم يتم إدخال سعر الإغلاق - الحساب تم بدون سعر إغلاق';
    } else if (customerContribution < 0) {
        feasibilityNote = 'تحذير: صافي العميل سالب - يحتاج العميل مبلغ إضافي';
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
        customerContribution,
        customerLoss,
        lossPercentage,
        note,
        feasibilityNote,
        rate,
        totalProfitPercent: totalProfitPercent * 100,
        // Additional details
        months,
        carPrice: formData.carPrice,
        profitAmount,
        years: formData.years,
        closingPrice: formData.closingPrice,
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
        <div class="result-item">
            <div class="label">
                <i class="fas fa-calendar-alt"></i>
                القسط الشهري
            </div>
            <div class="value">${formatNumber(results.monthlyInstallment)} د.ل</div>
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
        
        ${results.closingPrice > 0 ? `
            <div class="result-item">
                <div class="label">
                    <i class="fas fa-user"></i>
                    صافي للعميل
                </div>
                <div class="value">${formatNumber(results.customerContribution)} د.ل</div>
            </div>` : `
            <div class="result-item" style="border: 2px solid var(--warning-color); background: rgba(245, 158, 11, 0.05);">
                <div class="label" style="color: var(--warning-color);">
                    <i class="fas fa-info-circle"></i>
                    الحساب بدون سعر إغلاق
                </div>
                <div class="value" style="color: var(--warning-color);">لم يتم إدخال سعر الإغلاق</div>
            </div>`
        }
        
        ${results.closingPrice > 0 ? `
            <div class="result-item" style="border: 2px solid var(--danger-color); background: rgba(239, 68, 68, 0.05);">
                <div class="label" style="color: var(--danger-color);">
                    <i class="fas fa-exclamation-triangle"></i>
                    خسارة العميل
                </div>
                <div class="value" style="color: var(--danger-color);">${formatNumber(results.customerLoss)} د.ل</div>
            </div>
            
            <div class="result-item" style="border: 2px solid var(--danger-color); background: rgba(239, 68, 68, 0.05);">
                <div class="label" style="color: var(--danger-color);">
                    <i class="fas fa-chart-pie"></i>
                    نسبة الخسارة
                </div>
                <div class="value" style="color: var(--danger-color);">${formatNumber(results.lossPercentage)}%</div>
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
            `<div class="result-note" style="background: ${results.closingPrice === 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-color: ${results.closingPrice === 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${results.closingPrice === 0 ? 'var(--warning-color)' : 'var(--danger-color)'};">
                <i class="fas ${results.closingPrice === 0 ? 'fa-info-circle' : 'fa-exclamation-triangle'}"></i>
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
            <div class="car-info">
                <div class="car-name">${car.name}</div>
                <div class="car-price">${formatNumber(car.price)} د.ل</div>
            </div>
            <div class="car-actions">
                <button class="btn btn-primary btn-small" onclick="useCar(${index})">
                    <i class="fas fa-calculator"></i>
                    استخدم
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteCar(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
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
    
    const existingCar = appState.cars.find(car => 
        car.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingCar) {
        showToast('السيارة موجودة مسبقاً', 'error');
        return;
    }
    
    appState.cars.push({ name, price });
    
    const success = await API.saveCars(appState.cars);
    if (success) {
        document.getElementById('carName').value = '';
        document.getElementById('carPriceAdd').value = '';
        renderCarsList();
        showToast('تم إضافة السيارة بنجاح', 'success');
    }
}

function useCar(index) {
    const car = appState.cars[index];
    document.getElementById('carPrice').value = car.price;
    // Remove auto-fill for closing price as requested by user
    updateYearAvailability();
    showToast(`تم استخدام بيانات ${car.name}`, 'success');
    
    // Scroll to calculator
    document.querySelector('.calculator-section').scrollIntoView({ behavior: 'smooth' });
}

async function deleteCar(index) {
    if (confirm('هل أنت متأكد من حذف هذه السيارة؟')) {
        appState.cars.splice(index, 1);
        const success = await API.saveCars(appState.cars);
        if (success) {
            renderCarsList();
            showToast('تم حذف السيارة بنجاح', 'success');
        }
    }
}

async function clearAllData() {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟ هذا الإجراء غير قابل للتراجع.')) {
        appState.cars = [];
        const success = await API.saveCars(appState.cars);
        if (success) {
            renderCarsList();
            showToast('تم مسح جميع البيانات', 'success');
        }
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

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp); 