/**
 * JanSetu AI - Core Client Application Script
 * Features:
 * - Bilingual (English & Hindi) Client-Side Translation Engine
 * - Active page navigation & mobile drawer
 * - Material Symbols Toast notifications
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initLanguageSwitcher();
});

/**
 * Responsive mobile navigation toggle and active page highlighting.
 */
function initNavigation() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const menuIcon = document.getElementById('mobileMenuIcon');
    const navLinks = document.getElementById('navLinks');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('active');
            menuBtn.setAttribute('aria-expanded', isOpen);
            if (menuIcon) {
                menuIcon.textContent = isOpen ? 'close' : 'menu';
            }
        });
    }

    // Highlight current active route
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
            link.classList.add('active');
        }
    });
}

/**
 * Enterprise Toast Notification System
 * @param {string} message 
 * @param {'info' | 'success' | 'warning' | 'error'} type 
 */
function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };

    const iconColors = {
        success: 'var(--accent-green)',
        error: 'var(--accent-red)',
        warning: 'var(--accent-amber)',
        info: 'var(--primary-blue)'
    };

    const iconName = icons[type] || 'info';
    const iconColor = iconColors[type] || 'var(--primary-blue)';

    toast.innerHTML = `
        <span class="material-symbols-outlined icon-20" style="color: ${iconColor}; flex-shrink: 0;">${iconName}</span>
        <span style="font-size: 0.88rem; font-weight: 500; color: var(--text-primary); flex: 1; line-height: 1.4;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => toast.remove(), 260);
    }, 3500);
}

/**
 * Comprehensive Bilingual Translation Dictionary (English & Hindi)
 */
const i18nData = {
    en: {
        // Navigation & Top Bar
        topBarBanner: '<span class="material-symbols-outlined icon-16">assured_workload</span><strong>Digital Public Good</strong> &bull; Citizen Infrastructure Intelligence Platform',
        brandSubtext: 'Citizen Infrastructure Intelligence',
        navHome: 'Home',
        navReport: 'Report Issue',
        navReports: 'Public Reports',
        navAdmin: 'Admin Insights',
        navCta: 'Report Problem',

        // Landing Page: Hero Section
        heroBadge: 'AI-Powered Civic Infrastructure Platform',
        heroTitle: 'Turning Citizen Voices into <br><span style="color: var(--primary-blue);">Infrastructure Intelligence</span>',
        heroSubtitle: 'Consolidate grassroots citizen development requests across India. Using multilingual AI and demographic data, JanSetu AI identifies priority infrastructure demand hotspots for transparent public works.',
        heroCtaReport: 'Report an Issue',
        heroCtaInsights: 'Explore Insights',
        heroTrustVoice: 'Speech in Hindi & English',
        heroTrustMap: 'OpenStreetMap Spatial Engine',
        heroTrustDpg: 'Digital Public Good Standard',

        // Preview Window
        previewWindowBar: 'JanSetu Command Center &bull; UP Regional Intelligence',
        previewLiveFeed: 'Live Feed',
        previewActiveReports: 'ACTIVE REPORTS',
        previewHighPriority: 'HIGH PRIORITY',
        previewHotspots: 'HOTSPOTS',
        previewHotspotTitle: 'Geospatial Hotspot #1: Prayagraj Rural',
        previewHotspotScore: 'Need Score: 80.2/100',
        previewPolicyTitle: 'Gemini Policy Synthesis',
        previewPolicyText: 'Roads and water infrastructure complaints converge in eastern UP where baseline indices indicate an elevated deficit.',
        previewActivityText: 'Road collapse after heavy rainfall',
        previewActivityTime: '2 min ago',

        // Capabilities Section
        capTag: 'Platform Capabilities',
        capTitle: 'Bridging Grassroots Feedback & Evidence-Based Planning',
        capDesc: 'Traditional grievance systems collect reports into isolated queues. JanSetu AI transforms citizen input into transparent geospatial intelligence.',
        card1Title: 'Multilingual Voice Intake',
        card1Text: 'Citizens speak naturally in Hindi or English using in-browser Web Speech API. Voice inputs are automatically transcribed and normalized without jargon barriers.',
        card1Link: 'Open Citizen Portal',
        card2Title: 'Gemini NLU Extraction',
        card2Text: 'Google Gemini extracts infrastructure domain, severity level, urgency rating, English synthesis, and community impact into structured JSON database records.',
        card2Link: 'View Classified Reports',
        card3Title: '4-Factor Need Index',
        card3Text: 'Combines 30% citizen demand density, 25% population impact, 25% baseline infrastructure deficit, and 20% severity into an explainable 0–100 priority score.',
        card3Link: 'Examine Decision Matrix',

        // Process Architecture Workflow
        flowTag: 'Process Architecture',
        flowTitle: 'How Information Flows Through JanSetu AI',
        flowDesc: 'From raw audio or vernacular text to prioritized administrative intervention.',
        step1Title: 'Citizen Voice',
        step1Desc: 'Grievance submitted via speech-to-text or typed input with geolocation.',
        step2Title: 'Gemini AI NLU',
        step2Desc: 'Zero-shot classification, severity evaluation, and semantic summary extraction.',
        step3Title: 'Data Joins',
        step3Desc: 'Reports are normalized per 10k population and joined with infrastructure baselines.',
        step4Title: 'Hotspot Clustering',
        step4Desc: 'Spatial density algorithms surface acute demand clusters on GIS layers.',
        step5Title: 'Policy Action',
        step5Desc: 'Administrators inspect ranked hotspots and verify projects with clear evidence.',

        // Metrics Banner
        stat1Label: 'UP Districts Indexed',
        stat2Label: 'Infrastructure Domains',
        stat3Label: 'Explainable Need Index',
        stat4Label: 'Open DPG Architecture'
    },
    hi: {
        // Navigation & Top Bar
        topBarBanner: '<span class="material-symbols-outlined icon-16">assured_workload</span><strong>डिजिटल पब्लिक गुड</strong> &bull; नागरिक अवसंरचना सूचना मंच',
        brandSubtext: 'नागरिक अवसंरचना सूचना मंच',
        navHome: 'होम',
        navReport: 'शिकायत दर्ज करें',
        navReports: 'सार्वजनिक रिपोर्ट',
        navAdmin: 'प्रशासनिक डैशबोर्ड',
        navCta: 'समस्या बताएं',

        // Landing Page: Hero Section
        heroBadge: 'एआई-संचालित नागरिक अवसंरचना मंच',
        heroTitle: 'नागरिकों की आवाज़ को बनाएं <br><span style="color: var(--primary-blue);">अवसंरचना बुद्धिमत्ता</span>',
        heroSubtitle: 'भारत भर में जमीनी स्तर की नागरिक विकास मांगों को समेकित करें। बहुभाषी एआई और जनसांख्यिकीय डेटा का उपयोग कर, जनसेतु एआई पारदर्शी सार्वजनिक कार्यों हेतु प्राथमिकता वाले बुनियादी ढांचा हॉटस्पॉट की पहचान करता है।',
        heroCtaReport: 'समस्या दर्ज करें',
        heroCtaInsights: 'डैशबोर्ड देखें',
        heroTrustVoice: 'हिंदी और अंग्रेजी में वॉइस इनपुट',
        heroTrustMap: 'ओपनस्ट्रीटमैप भू-स्थानिक इंजन',
        heroTrustDpg: 'डिजिटल पब्लिक गुड मानक',

        // Preview Window
        previewWindowBar: 'जनसेतु कमांड सेंटर &bull; उत्तर प्रदेश क्षेत्रीय सूचना',
        previewLiveFeed: 'लाइव फीड',
        previewActiveReports: 'सक्रिय शिकायतें',
        previewHighPriority: 'उच्च प्राथमिकता',
        previewHotspots: 'सक्रिय हॉटस्पॉट',
        previewHotspotTitle: 'भू-स्थानिक हॉटस्पॉट #1: प्रयागराज ग्रामीण',
        previewHotspotScore: 'आवश्यकता स्कोर: 80.2/100',
        previewPolicyTitle: 'जेमिनी नीतिगत सारांश',
        previewPolicyText: 'सड़क और पेयजल की शिकायतें पूर्वी उत्तर प्रदेश में केंद्रित हैं, जहां बुनियादी ढांचा सूचकांक उच्च कमी दर्शाते हैं।',
        previewActivityText: 'भारी बारिश के बाद मुख्य सड़क टूटी',
        previewActivityTime: '2 मिनट पहले',

        // Capabilities Section
        capTag: 'मंच की मुख्य क्षमताएं',
        capTitle: 'नागरिक प्रतिक्रिया और साक्ष्य-आधारित योजना का समन्वय',
        capDesc: 'पारंपरिक शिकायत प्रणालियां समस्याओं को अलग-अलग फाइलों में रखती हैं। जनसेतु एआई नागरिक इनपुट को पारदर्शी भू-स्थानिक सूचना में बदलता है।',
        card1Title: 'बहुभाषी आवाज़ इनपुट',
        card1Text: 'नागरिक ब्राउज़र में हिंदी या अंग्रेजी में स्वाभाविक रूप से बोल सकते हैं। प्रशासनिक भाषा की बाधा के बिना आवाज़ स्वतः स्पष्ट पाठ में बदल जाती है।',
        card1Link: 'नागरिक पोर्टल खोलें',
        card2Title: 'जेमिनी एआई विश्लेषण',
        card2Text: 'गूगल जेमिनी बुनियादी ढांचा श्रेणी, गंभीरता, तात्कालिकता और सामाजिक प्रभाव का विश्लेषण कर व्यवस्थित डेटाबेस में रिकॉर्ड करता है।',
        card2Link: 'वर्गीकृत रिपोर्ट देखें',
        card3Title: '4-कारक आवश्यकता सूचकांक',
        card3Text: '30% मांग घनत्व, 25% जनसंख्या प्रभाव, 25% बुनियादी ढांचा कमी और 20% गंभीरता को मिलाकर 0–100 का पारदर्शी प्राथमिकता स्कोर तैयार करता है।',
        card3Link: 'निर्णय मैट्रिक्स देखें',

        // Process Architecture Workflow
        flowTag: 'प्रक्रिया वास्तुकला',
        flowTitle: 'जनसेतु एआई में सूचना का सुरक्षित प्रवाह',
        flowDesc: 'स्थानीय भाषा की आवाज़ से लेकर प्रशासनिक समाधान और परियोजना निर्माण तक।',
        step1Title: 'नागरिक आवाज़',
        step1Desc: 'भू-स्थान (GPS) के साथ बोलकर या लिखकर शिकायत आसानी से दर्ज की जाती है।',
        step2Title: 'जेमिनी एआई समझ',
        step2Desc: 'स्वचालित श्रेणी वर्गीकरण, गंभीरता मूल्यांकन और समस्या सारांश निष्कर्षण।',
        step3Title: 'डेटा एकीकरण',
        step3Desc: 'प्रति 10,000 आबादी पर शिकायतों को बुनियादी ढांचे के सरकारी आंकड़ों से जोड़ा जाता है।',
        step4Title: 'हॉटस्पॉट क्लस्टरिंग',
        step4Desc: 'स्थानिक घनत्व एल्गोरिदम गंभीर मांग वाले क्षेत्रों को मानचित्र पर लाते हैं।',
        step5Title: 'प्रशासनिक कार्रवाई',
        step5Desc: 'अधिकारी सत्यापित साक्ष्यों के आधार पर प्राथमिकता और बजट तय करते हैं।',

        // Metrics Banner
        stat1Label: 'यूपी जिले सम्मिलित',
        stat2Label: 'अवसंरचना क्षेत्र',
        stat3Label: 'पारदर्शी आवश्यकता सूचकांक',
        stat4Label: 'ओपन डीपीजी वास्तुकला'
    }
};

/**
 * Apply selected language translations across the document
 * @param {'en' | 'hi'} lang 
 * @param {boolean} notifyUser 
 */
function applyLanguage(lang, notifyUser = false) {
    const selectedLang = (lang === 'hi') ? 'hi' : 'en';
    const dict = i18nData[selectedLang];

    if (!dict) return;

    // Update all elements with data-i18n
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            if (dict[key].includes('<')) {
                el.innerHTML = dict[key];
            } else {
                el.textContent = dict[key];
            }
        }
    });

    // Update document language
    document.documentElement.lang = selectedLang;

    // Update active state on language switcher buttons
    const langBtns = document.querySelectorAll('.lang-btn');
    langBtns.forEach(btn => {
        if (btn.dataset.lang === selectedLang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // If on citizen portal page, sync the form language dropdown
    const citizenLangSelect = document.getElementById('reportLanguage');
    if (citizenLangSelect) {
        const targetValue = selectedLang === 'hi' ? 'Hindi' : 'English';
        if (citizenLangSelect.value !== targetValue) {
            citizenLangSelect.value = targetValue;
            citizenLangSelect.dispatchEvent(new Event('change'));
        }
    }

    // Persist preference in localStorage
    localStorage.setItem('jansetu_preferred_lang', selectedLang);

    if (notifyUser) {
        const toastMsg = selectedLang === 'hi' 
            ? 'भाषा सफलतापूर्वक हिंदी में बदली गई।' 
            : 'Language switched to English.';
        showToast(toastMsg, 'success');
    }
}

/**
 * Initialize Language Switcher Buttons & Auto-load Saved Preference
 */
function initLanguageSwitcher() {
    const langBtns = document.querySelectorAll('.lang-btn');
    langBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lang = e.currentTarget.dataset.lang;
            if (lang) {
                applyLanguage(lang, true);
            }
        });
    });

    // Load saved language on startup (default: English)
    const savedLang = localStorage.getItem('jansetu_preferred_lang') || 'en';
    applyLanguage(savedLang, false);
}
