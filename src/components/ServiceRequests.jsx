import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlarmClock, BedDouble, Bath, BellRing, Check, HandHelping, Receipt, UtensilsCrossed, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useDesk } from '../hooks/useDesk';
import { DESKS, DESKS_BY_ID } from '../data/accounts';
import { SERVICES } from '../data/mock';
import { inputCls } from './ui';

const ICONS = { Bath, BedDouble, Wrench, AlarmClock, BellRing, Receipt, UtensilsCrossed, HandHelping };

export default function ServiceRequests() {
  const { t, loc, requestService, customerContext } = useApp();
  const { guest } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const desk = useDesk();
  const roomFlow = customerContext.mode === 'room';
  const scope = roomFlow ? 'room' : 'desk';
  const list = SERVICES.filter((s) => (s.scope ?? 'room') === scope);
  const [name, setName] = useState('');
  const [chosenDeskId, setChosenDeskId] = useState('');
  const [sent, setSent] = useState({});
  const [wakeTime, setWakeTime] = useState('06:30');
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const activeDesk = desk ?? DESKS_BY_ID[chosenDeskId] ?? null;
  const canRequest = roomFlow ? Boolean(guest) : Boolean(activeDesk && (guest || name.trim().length >= 2));
  const send = (key) => {
    const customer = guest ?? { name: name.trim(), deskId: activeDesk?.id };
    requestService(key, key === 'wakeup' ? wakeTime : '', customer, roomFlow ? { type: 'room', id: guest?.room ?? customerContext.room } : { type: 'desk', id: activeDesk?.id });
    setSent((s) => ({ ...s, [key]: true }));
    timers.current.push(setTimeout(() => setSent((s) => ({ ...s, [key]: false })), 2500));
  };

  return (
    <>
      <section aria-labelledby="svc-title" className="mt-6">
        <h2 id="svc-title" className="text-xl font-bold tracking-tight">{roomFlow ? t('svc.title') : t('svc.deskTitle', { place: activeDesk ? loc(activeDesk.name) : t('ctx.restaurant') })}</h2>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{roomFlow ? t('svc.subtitle') : t('svc.deskSubtitle')}</p>

        {!roomFlow && !desk && (
          <label className="mt-4 block max-w-md text-sm font-semibold">
            {t('entry.pickVenue')} <span className="font-normal text-slate-600 dark:text-slate-400">— {t('entry.pickVenueDemo')}</span>
            <select className={`${inputCls} mt-1`} value={chosenDeskId} onChange={(e) => setChosenDeskId(e.target.value)}>
              <option value="">{t('entry.pickPlaceholder')}</option>
              {DESKS.map((d) => <option key={d.id} value={d.id}>{loc(d.name)}</option>)}
            </select>
          </label>
        )}
        {!guest && roomFlow && (
          <div className="mt-4 rounded-xl border border-amber-500/50 bg-amber-50 p-4 text-sm dark:bg-amber-500/10">
            <p>{t('cart.signInRequired')}</p>
            <button type="button" className="mt-2 font-bold text-brand underline underline-offset-2" onClick={() => navigate({ pathname: '/login', search: location.search })}>{t('login.submit')}</button>
          </div>
        )}
        {!guest && !roomFlow && (
          <label className="mt-4 block max-w-md text-sm font-semibold">
            {t('cart.customerName')}
            <input className={`${inputCls} mt-1`} autoComplete="name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((s) => {
            const Icon = ICONS[s.icon];
            const done = sent[s.key];
            return (
              <li key={s.key} className="card flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-amber-400 dark:bg-white/10"><Icon className="h-5 w-5" aria-hidden /></span>
                  <div className="min-w-0"><h3 className="font-semibold leading-snug">{loc(s.name)}</h3><p className="text-xs text-slate-700 dark:text-slate-300">{loc(s.desc)}</p></div>
                </div>
                {s.key === 'wakeup' && <label className="flex items-center justify-between gap-2 text-sm"><span>{t('svc.wakeupTime')}</span><input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-white/15 dark:bg-navy-900" /></label>}
                <button type="button" disabled={done || !canRequest} onClick={() => send(s.key)} className={`mt-auto ${done ? 'btn bg-emerald-700 text-white' : 'btn-ghost'}`}>
                  {done ? <Check className="h-4 w-4" aria-hidden /> : null}{done ? t('svc.sent') : t('svc.request')}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
