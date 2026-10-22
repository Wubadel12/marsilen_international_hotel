import { useMemo, useState } from 'react';
import { BedDouble, Eye, EyeOff, LogOut, Receipt, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { folioBalance } from '../../data/accounts';
import { Badge, Field, inputCls } from '../ui';

const DAY = 24 * 3600 * 1000;
const EMPTY = { firstName: '', lastName: '', room: '', nights: '1' };

export default function StaysTab() {
  const { t, lang, rooms, orders, money, notify } = useApp();
  const { stays, checkIn, checkOut } = useAuth();

  const freeRooms = useMemo(
    () => Object.entries(rooms).filter(([, s]) => s === 'available').map(([n]) => n).sort(),
    [rooms],
  );
  const counts = useMemo(() => {
    const c = { available: 0, occupied: 0, cleaning: 0 };
    Object.values(rooms).forEach((s) => {
      c[s] += 1;
    });
    return c;
  }, [rooms]);
  const freeByFloor = useMemo(() => {
    const out = {};
    freeRooms.forEach((n) => (out[n.charAt(0)] ||= []).push(n));
    return out;
  }, [freeRooms]);
  const inHouse = useMemo(
    () => stays.filter((s) => s.status === 'in-house').sort((a, b) => a.room.localeCompare(b.room)),
    [stays],
  );
  const recentOut = useMemo(
    () => stays.filter((s) => s.status === 'checked-out').sort((a, b) => (b.checkedOutAt ?? 0) - (a.checkedOutAt ?? 0)).slice(0, 5),
    [stays],
  );

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [issued, setIssued] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [confirmId, setConfirmId] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const room = form.room || freeRooms[0] || '';
  const nights = Math.min(60, Math.max(1, Number(form.nights) || 1));
  const date = (ms) => new Intl.DateTimeFormat(lang === 'am' ? 'am-ET' : 'en-GB', { day: 'numeric', month: 'short' }).format(ms);

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (form.firstName.trim().length < 2) next.firstName = t('val.nameShort');
    if (form.lastName.trim().length < 2) next.lastName = t('val.nameShort');
    if (!room) next.room = t('stays.noRooms');
    if (!(Number(form.nights) >= 1 && Number(form.nights) <= 60)) next.nights = t('val.nights');
    setErrors(next);
    if (Object.keys(next).length) return;
    const stay = checkIn({ ...form, room, nights });
    if (!stay) {
      setErrors({ room: t('stays.roomTaken') });
      return;
    }
    setIssued(stay);
    setForm(EMPTY);
  };

  const doCheckOut = (stay) => {
    const amount = money(folioBalance(orders, stay), 'ETB');
    checkOut(stay.id);
    setConfirmId(null);
    notify(t('stays.checkedOut', { room: stay.room, amount }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6 self-start">
        {/* Room availability: what can be assigned right now */}
        <section aria-labelledby="avail-title" className="card p-5">
          <h2 id="avail-title" className="flex items-center gap-2 text-lg font-bold">
            <BedDouble className="h-5 w-5 text-brand" aria-hidden />
            {t('stays.availability')}
          </h2>
          <ul className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ['available', 'ok'],
              ['occupied', 'room'],
              ['cleaning', 'warn'],
            ].map(([s, tone]) => (
              <li key={s} className="rounded-xl bg-slate-100 p-2 dark:bg-white/5">
                <p className="text-xl font-extrabold tabular-nums">{counts[s]}</p>
                <Badge tone={tone}>{t(`room.${s}`)}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-700 dark:text-slate-300">{t('stays.availabilityNote')}</p>
        </section>

        <section aria-labelledby="checkin-title" className="card p-5">
          <h2 id="checkin-title" className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="h-5 w-5 text-brand" aria-hidden />
            {t('stays.checkIn')}
          </h2>
          <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{t('stays.required')}</p>
          <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
            <Field label={t('stays.firstName')} error={errors.firstName} required>
              {(p) => <input {...p} className={inputCls} value={form.firstName} onChange={set('firstName')} autoComplete="off" />}
            </Field>
            <Field label={t('stays.lastName')} error={errors.lastName} required>
              {(p) => <input {...p} className={inputCls} value={form.lastName} onChange={set('lastName')} autoComplete="off" />}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('stays.assignRoom')} error={errors.room} hint={t('stays.assignHint', { count: freeRooms.length })} required>
                {(p) => (
                  <select {...p} className={inputCls} value={room} onChange={set('room')} disabled={!freeRooms.length}>
                    {freeRooms.length === 0 && <option value="">{t('stays.noRooms')}</option>}
                    {Object.entries(freeByFloor).map(([floor, nums]) => (
                      <optgroup key={floor} label={t('staff.floor', { n: floor })}>
                        {nums.map((n) => (
                          <option key={n} value={n}>{t('header.room', { room: n })}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </Field>
              <Field label={t('stays.nights')} error={errors.nights} required>
                {(p) => <input {...p} className={inputCls} type="number" min="1" max="60" value={form.nights} onChange={set('nights')} />}
              </Field>
            </div>
            {room && (
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {t('stays.summary', { room, out: date(Date.now() + nights * DAY) })}
              </p>
            )}
            <button type="submit" className="btn-gold w-full" disabled={!freeRooms.length}>
              {t('stays.create')}
            </button>
          </form>

          {issued && (
            <div role="status" className="mt-4 rounded-xl border border-emerald-600/40 bg-emerald-50 p-3 text-sm text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-100">
              {t('stays.pinIssued', { room: issued.room, name: `${issued.firstName} ${issued.lastName}` })}
              <strong className="mt-1 block text-2xl tracking-[0.3em] tabular-nums">{issued.pin}</strong>
              <span className="mt-1 block text-xs">{t('demo.local')}</span>
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section aria-labelledby="inhouse-title" className="card p-5">
          <h2 id="inhouse-title" className="text-lg font-bold">
            {t('stays.inHouse')} <span className="text-slate-600 dark:text-slate-300">({inHouse.length})</span>
          </h2>
          <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{t('stays.folioNote')}</p>
          {inHouse.length === 0 ? (
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{t('stays.empty')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200 dark:divide-white/10">
              {inHouse.map((s) => {
                const shown = revealed[s.id];
                const charges = orders.filter((o) => o.type === 'food' && o.payment === 'folio' && o.stayId === s.id);
                const balance = folioBalance(orders, s);
                return (
                  <li key={s.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-indigo-100 text-center text-indigo-950 dark:bg-indigo-500/20 dark:text-indigo-100">
                          <span>
                            <span className="block text-[10px] font-semibold uppercase leading-none">{t('stays.room')}</span>
                            <span className="block text-xl font-extrabold leading-tight tabular-nums">{s.room}</span>
                          </span>
                        </span>
                        <div>
                          <p className="font-semibold">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            {t('stays.stayDates', { from: date(s.checkedInAt), to: date(s.checkedInAt + s.nights * DAY), nights: s.nights })}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-sm font-bold tabular-nums">
                            <Receipt className="h-4 w-4 text-brand" aria-hidden />
                            {t('stays.folioLabel')}: {money(balance, 'ETB')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="btn-ghost px-3 tabular-nums"
                          aria-pressed={Boolean(shown)}
                          onClick={() => setRevealed((r) => ({ ...r, [s.id]: !r[s.id] }))}
                        >
                          {shown ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                          <span className="sr-only">{shown ? t('stays.hide') : t('stays.show')}</span>
                          PIN {shown ? s.pin : '••••'}
                        </button>
                        {confirmId === s.id ? (
                          <>
                            <button type="button" className="btn-danger" onClick={() => doCheckOut(s)}>
                              {t('stays.confirmAmount', { amount: money(balance, 'ETB') })}
                            </button>
                            <button type="button" className="btn-ghost" onClick={() => setConfirmId(null)}>
                              {t('common.cancel')}
                            </button>
                          </>
                        ) : (
                          <button type="button" className="btn-ghost" onClick={() => setConfirmId(s.id)}>
                            <LogOut className="h-4 w-4" aria-hidden />
                            {t('stays.checkOut')}
                            <span className="sr-only"> {t('header.room', { room: s.room })}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <details className="mt-3 rounded-xl bg-slate-100 p-3 text-sm dark:bg-white/5">
                      <summary className="cursor-pointer font-semibold">
                        {t('stays.folioDetails', { count: charges.length })}
                      </summary>
                      {charges.length === 0 ? (
                        <p className="mt-2 text-slate-700 dark:text-slate-300">{t('stays.noCharges')}</p>
                      ) : (
                        <ul className="mt-2 space-y-1">
                          {charges.map((o) => (
                            <li key={o.id} className="flex justify-between gap-3">
                              <span>#{o.id} · {date(o.createdAt)}</span>
                              <span className="font-semibold tabular-nums">{money(o.total, 'ETB')}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </details>

                    {confirmId === s.id && (
                      <p role="alert" className="mt-2 text-sm font-semibold text-red-800 dark:text-red-300">
                        {t('stays.confirmWarn', { room: s.room, amount: money(balance, 'ETB') })}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="out-title" className="card p-5">
          <h2 id="out-title" className="text-lg font-bold">{t('stays.recentOut')}</h2>
          {recentOut.length === 0 ? (
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{t('stays.noneOut')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200 text-sm dark:divide-white/10">
              {recentOut.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    {t('header.room', { room: s.room })} · {s.firstName} {s.lastName}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge>{t('stays.checkedOutTag')}</Badge>
                    <span className="font-semibold tabular-nums">{money(folioBalance(orders, s), 'ETB')}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
