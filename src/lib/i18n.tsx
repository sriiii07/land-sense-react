// src/lib/i18n.ts
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

export type Language = "en" | "hi" | "ml" | "kn" | "ta" | "te";

export const LANGUAGES = [
  { code: "en" as Language, name: "English",   nativeName: "English",    flag: "GB" },
  { code: "hi" as Language, name: "Hindi",     nativeName: "हिन्दी",      flag: "IN" },
  { code: "ml" as Language, name: "Malayalam", nativeName: "മലയാളം",     flag: "ML" },
  { code: "kn" as Language, name: "Kannada",   nativeName: "ಕನ್ನಡ",      flag: "KN" },
  { code: "ta" as Language, name: "Tamil",     nativeName: "தமிழ்",      flag: "TA" },
  { code: "te" as Language, name: "Telugu",    nativeName: "తెలుగు",     flag: "TE" },
];

export type TranslationKey =
  | "app_name" | "app_tagline" | "emergency_check" | "find_shelter"
  | "authority_login" | "check_risk_now" | "your_location_safe"
  | "danger_move_now" | "warning_be_ready" | "rainfall_mm" | "soil_moisture"
  | "slope_angle" | "submit_check" | "checking" | "risk_level" | "high_risk"
  | "medium_risk" | "low_risk" | "evacuate_immediately" | "find_nearest_shelter"
  | "shelter_name" | "shelter_capacity" | "shelter_distance" | "shelter_contact"
  | "get_directions" | "your_location" | "detecting_location" | "location_error"
  | "enter_manually" | "latitude" | "longitude" | "language" | "back_home"
  | "call_emergency" | "share_location" | "prediction_reason" | "stay_calm"
  | "move_to_higher_ground" | "do_not_use_roads" | "call_100" | "village_name"
  | "state" | "check_area" | "shelters_nearby" | "no_shelters_found"
  | "probability" | "confidence" | "last_updated" | "powered_by_ai"
  | "free_service" | "emergency_contacts" | "ndrf_number" | "police_number"
  | "ambulance_number" | "loading" | "error_occurred" | "try_again" | "open_in_maps";

const en: Record<TranslationKey, string> = {
  app_name: "SAFEGROUND", app_tagline: "AI-Powered Landslide Early Warning",
  emergency_check: "Check Your Area Now", find_shelter: "Find Nearest Shelter",
  authority_login: "Authority Login", check_risk_now: "Check Risk Now",
  your_location_safe: "Your area appears safe", danger_move_now: "DANGER - MOVE NOW",
  warning_be_ready: "WARNING - Be Ready to Evacuate",
  rainfall_mm: "Rainfall (mm) in last 24 hours", soil_moisture: "Soil Moisture (%)",
  slope_angle: "Slope Angle (degrees)", submit_check: "Check My Area",
  checking: "Checking...", risk_level: "Risk Level", high_risk: "HIGH RISK",
  medium_risk: "MEDIUM RISK", low_risk: "LOW RISK",
  evacuate_immediately: "EVACUATE IMMEDIATELY", find_nearest_shelter: "Find Nearest Shelter",
  shelter_name: "Shelter Name", shelter_capacity: "Capacity", shelter_distance: "Distance",
  shelter_contact: "Contact", get_directions: "Get Directions",
  your_location: "Your Location", detecting_location: "Detecting your location...",
  location_error: "Could not detect location", enter_manually: "Enter location manually",
  latitude: "Latitude", longitude: "Longitude", language: "Language",
  back_home: "Back to Home", call_emergency: "Call Emergency",
  share_location: "Share My Location", prediction_reason: "Why this prediction?",
  stay_calm: "Stay calm and act quickly",
  move_to_higher_ground: "Move to higher ground immediately",
  do_not_use_roads: "Do NOT use roads near slopes",
  call_100: "Call 100 for Police", village_name: "Village / Area Name",
  state: "State", check_area: "Check This Area", shelters_nearby: "Shelters Nearby",
  no_shelters_found: "No shelters found nearby", probability: "Probability",
  confidence: "Confidence", last_updated: "Last updated",
  powered_by_ai: "Powered by AI", free_service: "Free public service",
  emergency_contacts: "Emergency Contacts", ndrf_number: "NDRF: 011-24363260",
  police_number: "Police: 100", ambulance_number: "Ambulance: 108",
  loading: "Loading...", error_occurred: "An error occurred",
  try_again: "Try Again", open_in_maps: "Open in Maps",
};

const hi: Record<TranslationKey, string> = { ...en,
  app_name: "सेफग्राउंड", app_tagline: "AI-संचालित भूस्खलन पूर्व चेतावनी",
  emergency_check: "अभी अपना क्षेत्र जांचें", find_shelter: "नजदीकी आश्रय खोजें",
  authority_login: "अधिकारी लॉगिन", high_risk: "उच्च जोखिम",
  medium_risk: "मध्यम जोखिम", low_risk: "कम जोखिम",
  evacuate_immediately: "तुरंत निकासी करें", back_home: "मुख्य पृष्ठ पर वापस",
};

const ml: Record<TranslationKey, string> = { ...en,
  app_name: "സേഫ്ഗ്രൗണ്ട്", emergency_check: "ഇപ്പോൾ നിങ്ങളുടെ പ്രദേശം പരിശോധിക്കുക",
  find_shelter: "ഏറ്റവും അടുത്ത അഭയം കണ്ടെത്തുക", high_risk: "ഉയർന്ന അപകടസാധ്യത",
  medium_risk: "മധ്യ അപകടസാധ്യത", low_risk: "കുറഞ്ഞ അപകടസാധ്യത",
};

const kn: Record<TranslationKey, string> = { ...en,
  app_name: "ಸೇಫ್‌ಗ್ರೌಂಡ್", emergency_check: "ಈಗ ನಿಮ್ಮ ಪ್ರದೇಶ ಪರಿಶೀಲಿಸಿ",
  find_shelter: "ಹತ್ತಿರದ ಆಶ್ರಯ ಹುಡುಕಿ", high_risk: "ಹೆಚ್ಚಿನ ಅಪಾಯ",
};

const ta: Record<TranslationKey, string> = { ...en,
  app_name: "சேஃப்கிரவுண்ட்", emergency_check: "இப்போது உங்கள் பகுதியை சரிபாருங்கள்",
  find_shelter: "அருகிலுள்ள தங்குமிடம் கண்டறியுங்கள்", high_risk: "அதிக அபாயம்",
};

const te: Record<TranslationKey, string> = { ...en,
  app_name: "సేఫ్‌గ్రౌండ్", emergency_check: "ఇప్పుడు మీ ప్రాంతాన్ని తనిఖీ చేయండి",
  find_shelter: "సమీప ఆశ్రయం కనుగొనండి", high_risk: "అధిక ప్రమాదం",
};

const translations: Record<Language, Record<TranslationKey, string>> = {
  en, hi, ml, kn, ta, te,
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);
const STORAGE_KEY = "safeground_language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ["en", "hi", "ml", "kn", "ta", "te"].includes(saved)) {
        return saved as Language;
      }
    } catch {}
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: TranslationKey): string => {
    return translations[language][key] ?? translations.en[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
