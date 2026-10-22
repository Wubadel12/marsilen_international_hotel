import { useId } from 'react';
import {
  BedDouble, Footprints, FlaskConical, Store, UtensilsCrossed,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

/** Shared form + badge pieces so customer, staff and admin screens look and behave the same. */
export const inputCls =
  'min-h-[46px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base placeholder:text-slate-500 read-only:bg-slate-100 read-only:text-slate-600 dark:border-white/15 dark:bg-navy-900 dark:placeholder:text-slate-400 dark:read-only:bg-white/5 aria-[invalid=true]:border-red-600 sm:text-sm';

/**
 * Label + control + hint + error, wired together for screen readers.
 * children is a render function receiving the props to spread on the control.
 */
export function Field({ label, hint, error, required = false, className = '', children }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
        {required && <span aria-hidden className="text-red-700 dark:text-red-400"> *</span>}
      </label>
      <div className="mt-1.5">
        {children({
          id,
          'aria-describedby': describedBy,
          'aria-invalid': error ? true : undefined,
          'aria-required': required || undefined,
        })}
      </div>
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600 dark:text-slate-400">{hint}</p>}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-semibold text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        checked ? 'bg-emerald-700' : 'bg-slate-400 dark:bg-white/25'
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  );
}

const TONES = {
  neutral: 'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-200',
  ok: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200',
  warn: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200',
  danger: 'bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200',
  info: 'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200',
  room: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-200',
  venue: 'bg-teal-100 text-teal-900 dark:bg-teal-500/20 dark:text-teal-200',
};

export function Badge({ tone = 'neutral', Icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}>
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {children}
    </span>
  );
}

const SOURCES = {
  room: { Icon: BedDouble, tone: 'room', key: 'src.room' },
  table: { Icon: UtensilsCrossed, tone: 'warn', key: 'src.table' },
  venue: { Icon: Store, tone: 'venue', key: 'src.venue' },
  walkin: { Icon: Footprints, tone: 'info', key: 'src.walkin' },
};

/** What kind of place an order or QR belongs to: room, restaurant table, named venue, or walk-in. */
export function SourceBadge({ kind, className }) {
  const { t } = useApp();
  const s = SOURCES[kind];
  if (!s) return null;
  return (
    <Badge tone={s.tone} Icon={s.Icon} className={className}>
      {t(s.key)}
    </Badge>
  );
}

/** Slim, always-visible reminder that nothing here is real. */
export function DemoNotice({ scope = 'staff', className = '' }) {
  const { t } = useApp();
  return (
    <p
      role="note"
      className={`flex items-start gap-2 rounded-xl border border-dashed border-amber-600/60 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100 ${className}`}
    >
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        <strong>{t('demo.label')}.</strong> {t(`demo.${scope}`)}
      </span>
    </p>
  );
}
