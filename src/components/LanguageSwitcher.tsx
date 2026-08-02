// src/components/LanguageSwitcher.tsx
import { useI18n, LANGUAGES, type Language } from "@/lib/i18n";

interface Props {
  /** "dropdown" (default) shows a select box; "pills" shows buttons inline */
  variant?: "dropdown" | "pills";
  className?: string;
}

export function LanguageSwitcher({ variant = "dropdown", className = "" }: Props) {
  const { language, setLanguage, t } = useI18n();

  if (variant === "pills") {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code as Language)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              language === lang.code
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
            title={lang.name}
            aria-pressed={language === lang.code}
          >
            <span className="mr-1">{lang.flag}</span>
            {lang.nativeName}
          </button>
        ))}
      </div>
    );
  }

  // Default: dropdown
  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      <span className="text-sm text-muted-foreground hidden sm:inline">
        {t("language")}:
      </span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="appearance-none bg-background border border-border rounded-lg px-3 py-1.5 pr-8 text-sm font-medium cursor-pointer hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        aria-label="Select language"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.nativeName}
          </option>
        ))}
      </select>
      {/* Custom dropdown arrow */}
      <span className="pointer-events-none absolute right-2 text-muted-foreground text-xs">
        ▾
      </span>
    </div>
  );
}
