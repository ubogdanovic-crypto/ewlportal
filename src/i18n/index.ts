import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./translations/en";
import { sr } from "./translations/sr";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    sr: { translation: sr },
  },
  lng: "sr", // Default to Serbian
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
