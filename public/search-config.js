// إعدادات البحث عن صور السيارات عبر Google Programmable Search.
//
// للتفعيل:
//   1. أنشئ محرك بحث على https://programmablesearchengine.google.com
//      فعّل "Search the entire web" و "Image search"، ثم انسخ Search engine ID
//   2. فعّل Custom Search API على
//      https://console.cloud.google.com/apis/library/customsearch.googleapis.com
//   3. أنشئ مفتاح API من Credentials وقيّده بـ:
//      - Application restrictions: HTTP referrers →  https://mextox.github.io/*
//      - API restrictions: Custom Search API فقط
//
// المفتاح يظهر في كود المتصفح كأي مفتاح واجهة، ولذلك التقييد أعلاه ضروري
// حتى لا يستهلك غيرك حصتك اليومية (100 بحث مجاناً في اليوم).
//
// ما دامت الحقول فارغة يبقى زر البحث معطّلاً ويعمل الرفع اليدوي فقط.

window.SEARCH_CONFIG = {
    apiKey: '',
    searchEngineId: ''
};
