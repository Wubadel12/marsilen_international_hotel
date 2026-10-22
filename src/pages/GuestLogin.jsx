import { useEffect, useRef, useState } from 'react';
import { BedDouble, Lock, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNow } from '../hooks/useNow';
import { Field, inputCls } from '../components/ui';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 30000;
const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Optional hotel guest sign-in. The menu remains visible behind this panel. */
export default function GuestLogin({ open = true, onClose = () => {} }) {
  const { t, customerContext } = useApp();
  const { guest, guestLogin, stays } = useAuth();
  const now = useNow(1000);
  const lockedRoom = customerContext.mode === 'room' ? customerContext.room : '';
  const [room, setRoom] = useState(lockedRoom);
  const [lastName, setLastName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [fails, setFails] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const panelRef = useRef(null);

  useEffect(() => { if (lockedRoom) setRoom(lockedRoom); }, [lockedRoom]);
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const raf = requestAnimationFrame(() => panelRef.current?.querySelector('input:not([readonly])')?.focus());
    const onKey = (event) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((node) => node.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const lockSec = Math.max(0, Math.ceil((lockUntil - now) / 1000));
  const locked = lockSec > 0;
  const demoGuests = stays.filter((stay) => stay.status === 'in-house' && (!lockedRoom || stay.room === lockedRoom)).slice(0, 4);
  const submit = (event) => {
    event.preventDefault();
    if (locked) return;
    const result = guestLogin({ room, lastName, pin });
    if (result.ok) { onClose(); return; }
    setError(true);
    setPin('');
    if (fails + 1 >= MAX_ATTEMPTS) { setLockUntil(Date.now() + LOCK_MS); setFails(0); }
    else setFails((n) => n + 1);
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-navy-900/55 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="guest-signin-title" className="card my-auto w-full max-w-md p-5 shadow-lift">
        <div className="flex items-start justify-between gap-3">
          <h2 id="guest-signin-title" className="flex items-center gap-2 text-lg font-bold">
            <BedDouble className="h-5 w-5 text-brand" aria-hidden />
            {t('entry.guestForm')}
          </h2>
          <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10" onClick={onClose} aria-label={t('common.close')}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t('entry.roomSignInHint')}</p>
        <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
          <Field label={t('login.room')} hint={lockedRoom ? t('entry.roomFromQr') : undefined} required>
            {(p) => <input {...p} className={inputCls} inputMode="numeric" autoComplete="off" value={room} readOnly={Boolean(lockedRoom)} onChange={(e) => setRoom(e.target.value)} />}
          </Field>
          <Field label={t('login.lastName')} required>
            {(p) => <input {...p} className={inputCls} autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />}
          </Field>
          <Field label={t('login.pin')} hint={t('login.pinHint')} required>
            {(p) => <input {...p} className={inputCls} type="password" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />}
          </Field>
          {locked ? <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">{t('login.locked', { sec: lockSec })}</p> : error && <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">{t('login.error')}</p>}
          <button type="submit" className="btn-gold w-full" disabled={locked || !room || !lastName || pin.length !== 4}>
            <Lock className="h-4 w-4" aria-hidden />{t('login.submit')}
          </button>
          {guest && <p className="text-center text-xs text-slate-600 dark:text-slate-400">{t('entry.signedInRoom', { room: guest.room })}</p>}
        </form>
        {demoGuests.length > 0 && (
          <details className="mt-5 rounded-xl border border-dashed border-slate-300 p-3 text-sm dark:border-white/20">
            <summary className="cursor-pointer font-semibold">{t('login.demo')}</summary>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{t('login.demoNote')}</p>
            <ul className="mt-3 space-y-2">
              {demoGuests.map((stay) => <li key={stay.id} className="flex items-center justify-between gap-3">
                <span>{stay.firstName} {stay.lastName} · {t('header.room', { room: stay.room })}</span>
                <button type="button" className="btn-ghost min-h-[40px] px-3 text-xs" onClick={() => { setRoom(stay.room); setLastName(stay.lastName); setPin(stay.pin); setError(false); }}>{t('login.demoUse')}<span className="sr-only"> {stay.firstName} {stay.lastName}</span></button>
              </li>)}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
