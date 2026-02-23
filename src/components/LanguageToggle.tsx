import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const toggle = () => {
    i18n.changeLanguage(currentLang === "sr" ? "en" : "sr");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className={className}
    >
      <Globe className="h-4 w-4 mr-1" />
      {currentLang === "sr" ? "EN" : "SR"}
    </Button>
  );
}
