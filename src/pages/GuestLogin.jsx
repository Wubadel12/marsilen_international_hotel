import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BedDouble, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNow } from '../hooks/useNow';
import { usePageTitle } from '../hooks/usePageTitle';
import Header from '../components/Header';
import { Field, inputCls } from '../components/ui';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 30000;

/** Standalone hotel guest sign-in page. */
export default function GuestLogin() {
  const { t, customerContext } = useApp();
  const { guest, guestLogin, stays } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const now = useNow(1000);
  const lockedRoom = customerContext.mode === 'room' ? customerContext.room : '';
  const [room, setRoom] = useState(lockedRoom);
  const [firstName, setFirstName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [fails, setFails] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const firstNameRef = useRef(null);

  usePageTitle(t('entry.guestForm'));
  useEffect(() => { if (lockedRoom) setRoom(lockedRoom); }, [lockedRoom]);
  useEffect(() => { firstNameRef.current?.focus(); }, []);

  if (guest) return <NavigateGuestToMenu search={location.search} />;

  const lockSec = Math.max(0, Math.ceil((lockUntil - now) / 1000));
  const locked = lockSec > 0;
  const demoGuests = stays.filter((stay) => stay.status === 'in-house' && (!lockedRoom || stay.room === lockedRoom)).slice(0, 4);
  const submit = (event) => {
    event.preventDefault();
    if (locked) return;
    const result = guestLogin({ room, firstName, pin });
    if (result.ok) {
      navigate({ pathname: '/menu', search: location.search }, { replace: true });
      return;
    }
    setError(true);
    setPin('');
    if (fails + 1 >= MAX_ATTEMPTS) { setLockUntil(Date.now() + LOCK_MS); setFails(0); }
    else setFails((n) => n + 1);
  };

  return (
    <div className="min-h-dvh">
      <Header mode="public" />
      <main id="main" tabIndex={-1} className="mx-auto flex max-w-md flex-col px-4 py-8 outline-none sm:py-10">
        <form onSubmit={submit} className="card space-y-5 p-5 shadow-lift sm:p-6" noValidate>
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-navy-900 text-amber-400 dark:bg-white/10">
              <BedDouble className="h-7 w-7" aria-hidden />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">{t('entry.guestForm')}</h1>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t('entry.roomSignInHint')}</p>
          </div>

          <Field label={t('login.room')} hint={lockedRoom ? t('entry.roomFromQr') : undefined} required>
            {(p) => <input {...p} className={inputCls} inputMode="numeric" autoComplete="off" value={room} readOnly={Boolean(lockedRoom)} onChange={(e) => setRoom(e.target.value)} />}
          </Field>
          <Field label={t('login.firstName')} required>
            {(p) => <input {...p} ref={firstNameRef} className={inputCls} autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
          </Field>
          <Field label={t('login.pin')} hint={t('login.pinHint')} required>
            {(p) => <input {...p} className={inputCls} type="password" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />}
          </Field>

          {locked ? <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">{t('login.locked', { sec: lockSec })}</p> : error && <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">{t('login.error')}</p>}
          <button type="submit" className="btn-gold w-full" disabled={locked || !room || !firstName.trim() || pin.length !== 4}>
            <Lock className="h-4 w-4" aria-hidden />{t('login.submit')}
          </button>
        </form>

        {demoGuests.length > 0 && (
          <details className="card mt-4 p-4 text-sm">
            <summary className="cursor-pointer font-semibold">{t('login.demo')}</summary>
            <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">{t('login.demoNote')}</p>
            <ul className="mt-3 space-y-2">
          {demoGuests.map((stay) => <li key={stay.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0">{stay.firstName} {stay.lastName} · {t('header.room', { room: stay.room })}</span>
                <button type="button" className="btn-ghost min-h-[40px] shrink-0 px-3 text-xs" onClick={() => { setRoom(stay.room); setFirstName(stay.firstName); setPin(stay.pin); setError(false); }}>{t('login.demoUse')}<span className="sr-only"> {stay.firstName} {stay.lastName}</span></button>
              </li>)}
            </ul>
          </details>
        )}

        <Link to={{ pathname: '/menu', search: location.search }} className="btn-ghost mt-4 self-start">
          <ArrowLeft className="h-4 w-4" aria-hidden />{t('cart.backToMenu')}
        </Link>
      </main>
    </div>
  );
}

