import { useApp } from '../context/AppContext';

const OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'አማርኛ' },
];

export default function LanguageToggle() {
  const { lang, setLang, t } = useApp();
  return (
    <div
      role="group"
      aria-label={t('header.language')}
      className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 dark:border-white/10 dark:bg-white/5"
    >
      {OPTIONS.map((o) => {
        const active = lang === o.code;
        return (
          <button
            key={o.code}
            type="button"
            lang={o.code}
            aria-pressed={active}
            onClick={() => setLang(o.code)}
            className={`min-h-[36px] rounded-[10px] px-2.5 text-xs font-semibold transition duration-200 sm:px-3 sm:text-sm ${
              active
                ? 'bg-navy-900 text-white shadow dark:bg-amber-400 dark:text-navy-900'
                : 'text-slate-600 hover:text-navy-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
