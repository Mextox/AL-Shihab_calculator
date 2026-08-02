// ترجمة أسماء السيارات من العربية إلى الإنجليزية قبل البحث.
// أسماء ملفات Wikimedia Commons لاتينية، فالبحث بالعربية لا يجد شيئاً.
//
// لإضافة سيارة غير موجودة: أضف سطراً في CAR_TERMS بالصيغة
//   'الاسم العربي': 'English Name'
// وتُقبل الصيغ المتعددة للاسم نفسه بأسطر منفصلة.

(function () {
    const CAR_TERMS = {
        // ————— الشركات —————
        'تويوتا': 'Toyota', 'تيوتا': 'Toyota',
        'هيونداي': 'Hyundai', 'هيوانداي': 'Hyundai', 'هونداي': 'Hyundai',
        'كيا': 'Kia',
        'نيسان': 'Nissan',
        'ميتسوبيشي': 'Mitsubishi', 'متسوبيشي': 'Mitsubishi',
        'هوندا': 'Honda',
        'مازدا': 'Mazda',
        'شيفروليه': 'Chevrolet', 'شفروليه': 'Chevrolet', 'شيفرولية': 'Chevrolet',
        'فورد': 'Ford',
        'مرسيدس': 'Mercedes-Benz', 'مرسيدس بنز': 'Mercedes-Benz', 'مرسيديس': 'Mercedes-Benz',
        'بي ام دبليو': 'BMW', 'بي ام دبليو': 'BMW', 'بمو': 'BMW',
        'اودي': 'Audi', 'أودي': 'Audi',
        'فولكس واجن': 'Volkswagen', 'فولكسفاجن': 'Volkswagen', 'فولكس فاجن': 'Volkswagen',
        'بيجو': 'Peugeot',
        'رينو': 'Renault',
        'شيري': 'Chery',
        'جيلي': 'Geely',
        'ام جي': 'MG',
        'هافال': 'Haval',
        'شانجان': 'Changan', 'تشانجان': 'Changan',
        'سوزوكي': 'Suzuki',
        'ايسوزو': 'Isuzu', 'إيسوزو': 'Isuzu',
        'لاند روفر': 'Land Rover',
        'رينج روفر': 'Range Rover',
        'جيب': 'Jeep',
        'لكزس': 'Lexus', 'لكسس': 'Lexus',
        'انفينيتي': 'Infiniti', 'إنفينيتي': 'Infiniti',
        'جينيسيس': 'Genesis',
        'سكودا': 'Skoda',
        'فيات': 'Fiat',
        'اوبل': 'Opel', 'أوبل': 'Opel',
        'داسيا': 'Dacia',
        'سوبارو': 'Subaru',
        'دايهاتسو': 'Daihatsu',
        'جي ام سي': 'GMC',
        'دودج': 'Dodge',
        'كاديلاك': 'Cadillac',
        'بورش': 'Porsche',
        'فولفو': 'Volvo',
        'تسلا': 'Tesla',
        'بي واي دي': 'BYD',
        'سيات': 'Seat',
        'ميني': 'Mini',
        'شاحنة': 'truck',

        // ————— تويوتا —————
        'كامري': 'Camry', 'كمري': 'Camry',
        'كورولا': 'Corolla', 'كرولا': 'Corolla',
        'يارس': 'Yaris', 'ياريس': 'Yaris',
        'هايلكس': 'Hilux', 'هيلوكس': 'Hilux',
        'لاند كروزر': 'Land Cruiser', 'لاندكروزر': 'Land Cruiser',
        'برادو': 'Land Cruiser Prado',
        'رافو': 'RAV4', 'راف فور': 'RAV4',
        'افالون': 'Avalon', 'أفالون': 'Avalon',
        'فورتشنر': 'Fortuner',
        'هايس': 'Hiace',
        'كوستر': 'Coaster',
        'بريوس': 'Prius',
        'هايلاندر': 'Highlander',

        // ————— هيونداي —————
        'النترا': 'Elantra', 'إلنترا': 'Elantra', 'الانترا': 'Elantra',
        'سوناتا': 'Sonata',
        'توسان': 'Tucson', 'توسون': 'Tucson',
        'سنتافي': 'Santa Fe', 'سانتافي': 'Santa Fe', 'سانتا في': 'Santa Fe',
        'اكسنت': 'Accent', 'أكسنت': 'Accent',
        'كريتا': 'Creta',
        'ازيرا': 'Azera',
        'باليسيد': 'Palisade',
        'فيرنا': 'Verna',
        'ستاريا': 'Staria',

        // ————— كيا —————
        'سيراتو': 'Cerato',
        'سبورتاج': 'Sportage', 'سبورتيج': 'Sportage',
        'سورينتو': 'Sorento',
        'ريو': 'Rio',
        'اوبتيما': 'Optima', 'أوبتيما': 'Optima',
        'سيلتوس': 'Seltos',
        'بيكانتو': 'Picanto',
        'كارنيفال': 'Carnival',
        'كادينزا': 'Cadenza',

        // ————— نيسان —————
        'صني': 'Sunny',
        'التيما': 'Altima',
        'باترول': 'Patrol',
        'اكستريل': 'X-Trail', 'إكستريل': 'X-Trail',
        'سنترا': 'Sentra',
        'ماكسيما': 'Maxima',
        'كيكس': 'Kicks',
        'نافارا': 'Navara',

        // ————— أخرى شائعة —————
        'سيفيك': 'Civic',
        'اكورد': 'Accord', 'أكورد': 'Accord',
        'لانسر': 'Lancer',
        'باجيرو': 'Pajero',
        'اوتلاندر': 'Outlander',
        'اتراج': 'Attrage',
        'كروز': 'Cruze',
        'ماليبو': 'Malibu',
        'تاهو': 'Tahoe',
        'سلفرادو': 'Silverado',
        'فوكس': 'Focus',
        'اكسبلورر': 'Explorer',
        'رينجر': 'Ranger',
        'موستنج': 'Mustang',
        'جولف': 'Golf',
        'باسات': 'Passat',
        'تيجوان': 'Tiguan',
        'طوارق': 'Touareg',
        'شيراد': 'Cherokee',
        'رانجلر': 'Wrangler'
    };

    // توحيد صور الحروف العربية حتى تطابق الكلمة مهما كُتبت
    function normalizeArabic(text) {
        return String(text)
            .replace(/[\u064B-\u0652\u0670\u0640]/g, '')      // تشكيل وتطويل
            .replace(/[أإآٱ]/g, 'ا')
            .replace(/ى/g, 'ي')
            .replace(/ؤ/g, 'و')
            .replace(/ئ/g, 'ي')
            .replace(/ة/g, 'ه')
            .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660)) // أرقام هندية
            .replace(/\s+/g, ' ')
            .trim();
    }

    // العبارات الأطول أولاً حتى لا تبتلع كلمةٌ مفردةٌ عبارةً مركّبة
    const NORMALIZED = Object.keys(CAR_TERMS).reduce((map, key) => {
        map[normalizeArabic(key)] = CAR_TERMS[key];
        return map;
    }, {});
    const PHRASES = Object.keys(NORMALIZED).sort((a, b) => b.split(' ').length - a.split(' ').length
        || b.length - a.length);

    // يترجم ما يعرفه ويُبقي الباقي، محافظاً على ترتيب الكلمات كما كُتبت.
    // الاستبدال يكون بمسافات بنفس الطول حتى تبقى المواضع صالحة بعد كل مطابقة.
    function toEnglishQuery(input) {
        let text = ' ' + normalizeArabic(input) + ' ';
        const parts = [];

        for (const phrase of PHRASES) {
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`(?<=\\s)${escaped}(?=\\s)`, 'g');

            let match;
            while ((match = pattern.exec(text)) !== null) {
                parts.push({ at: match.index, text: NORMALIZED[phrase], known: true });
                text = text.slice(0, match.index)
                    + ' '.repeat(phrase.length)
                    + text.slice(match.index + phrase.length);
                pattern.lastIndex = match.index + phrase.length;
            }
        }

        // ما تبقّى: أرقام السنة والكلمات اللاتينية المكتوبة أصلاً
        const leftover = /(?<=\s)([0-9A-Za-z][0-9A-Za-z\-+.]*)(?=\s)/g;
        let word;
        while ((word = leftover.exec(text)) !== null) {
            parts.push({ at: word.index, text: word[1], known: false });
        }

        parts.sort((a, b) => a.at - b.at);

        const known = parts.filter(p => p.known).map(p => p.text);
        const query = parts.map(p => p.text).join(' ').trim();

        return {
            query: query || input.trim(),
            translated: known.length > 0,
            makes: known
        };
    }

    window.CarTerms = { toEnglishQuery, normalizeArabic, TERMS: CAR_TERMS };
})();
