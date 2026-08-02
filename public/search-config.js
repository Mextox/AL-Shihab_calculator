// إعدادات البحث عن صور السيارات.
//
// البحث يعمل افتراضياً عبر Wikimedia Commons: بلا مفاتيح ولا حصة يومية،
// وصوره حرة الترخيص. لا حاجة لأي إعداد هنا إلا إن أردت نتائج أدق.
//
// ملء الحقول أدناه يبدّل المزوّد إلى صور Google، وهو أدق للموديلات
// الحديثة لكنه محدود بـ100 بحث يومياً ويحتاج الخطوات التالية:
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
// حتى لا يستهلك غيرك حصتك اليومية.

window.SEARCH_CONFIG = {
    apiKey: '',
    searchEngineId: ''
};
