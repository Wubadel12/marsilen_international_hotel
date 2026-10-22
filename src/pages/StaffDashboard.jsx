import { useMemo, useState } from 'react';
import { ChefHat, ClipboardList, HandHelping, Receipt, RotateCcw, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNow } from '../hooks/useNow';
import { usePageTitle } from '../hooks/usePageTitle';
import { DESKS_BY_ID, orderPlace } from '../data/accounts';
import Header from '../components/Header';
import OrderCard from '../components/staff/OrderCard';
import RoomMonitor from '../components/staff/RoomMonitor';
import { DemoNotice, inputCls } from '../components/ui';

const STATUS_FILTERS = ['active', 'new', 'preparing', 'ready', 'completed'];
const SOURCES = ['room', 'table', 'venue'];
const AGES = [0, 10, 20, 30];
const NO_FILTERS = { source: 'all', dest: 'all', age: 0, walkin: false };

const destKey = (o) => (o.delivery?.type === 'desk' ? `desk:${o.delivery.id}` : `room:${o.room}`);

/**
 * Operations screen. What you see depends on the role:
 *  - kitchen:   food orders only
 *  - frontdesk: food orders + service requests + room status
 *  - admin:     everything, plus demo controls
 */
export default function StaffDashboard() {
  const { t, loc, lang, orders: allOrders, advanceOrder, simulateOrder, resetDemo, money, notify } = useApp();
  const { staff, stays } = useAuth();
  const now = useNow(15000);
  usePageTitle(t('nav.dashboard'));
  const [status, setStatus] = useState('active');
  const [filters, setFilters] = useState(NO_FILTERS);

  const isKitchen = staff.role === 'kitchen';
  const isAdmin = staff.role === 'admin';

  const orders = useMemo(
    () => (isKitchen ? allOrders.filter((o) => o.type === 'food') : allOrders),
    [allOrders, isKitchen],
  );

  const counts = useMemo(() => {
    const c = { new: 0, preparing: 0, ready: 0, completed: 0 };
    orders.forEach((o) => {
      c[o.status] += 1;
    });
    c.active = c.new + c.preparing + c.ready;
    return c;
  }, [orders]);

  const openRequests = useMemo(
    () => orders.filter((o) => o.type === 'service' && o.status !== 'completed').length,
    [orders],
  );
  const folioTotal = useMemo(
    () => orders.filter((o) => o.type === 'food' && o.payment === 'folio').reduce((s, o) => s + o.total, 0),
    [orders],
  );
  const paidTotal = useMemo(() => orders.filter((o) => o.type === 'food' && o.payment === 'paid').reduce((s, o) => s + o.total, 0), [orders]);
  const cashDue = useMemo(() => orders.filter((o) => o.type === 'food' && o.payment === 'cash' && !o.cashReceived).reduce((s, o) => s + o.total, 0), [orders]);
  const cashCollected = useMemo(() => orders.filter((o) => o.type === 'food' && o.payment === 'cash' && o.cashReceived).reduce((s, o) => s + o.total, 0), [orders]);

  // Destinations that actually appear in the queue: rooms first, then tables, then venues.
  const destinations = useMemo(() => {
    const seen = new Map();
    orders.forEach((o) => {
      const k = destKey(o);
      if (seen.has(k)) return;
      const desk = o.delivery?.type === 'desk' ? DESKS_BY_ID[o.delivery.id] : null;
      const rank = { room: 0, table: 1, venue: 2 }[orderPlace(o)];
      seen.set(k, { key: k, rank, sort: desk ? desk.id : o.room, label: desk ? loc(desk.name) : t('header.room', { room: o.room }) });
    });
    return [...seen.values()].sort((a, b) => a.rank - b.rank || a.sort.localeCompare(b.sort, undefined, { numeric: true }));
  }, [orders, loc, t]);

  const visible = useMemo(() => {
    const list = orders.filter((o) => {
      if (status === 'active' ? o.status === 'completed' : o.status !== status) return false;
      if (filters.source !== 'all' && orderPlace(o) !== filters.source) return false;
      if (filters.dest !== 'all' && destKey(o) !== filters.dest) return false;
      if (filters.walkin && o.guestType !== 'visitor') return false;
      const age = Math.floor(((o.completedAt ?? now) - o.createdAt) / 60000);
      return age >= filters.age;
    });
    return [...list].sort((a, b) => (status === 'completed' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
  }, [orders, status, filters, now]);

  const food = visible.filter((o) => o.type === 'food');
  const requests = visible.filter((o) => o.type === 'service');
  const filtering = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: k === 'age' ? Number(e.target.value) : e.target.value }));

  const onAdvance = (o) => {
    advanceOrder(o.id);
    const next = o.type === 'service' && o.status === 'preparing' ? 'completed' : { new: 'preparing', preparing: 'ready', ready: 'completed' }[o.status];
    const label = o.type === 'service' && next === 'preparing' ? t('status.inprogress') : t(`status.${next}`);
    notify(t('staff.advanced', { id: o.id, status: label }));
  };

  const clock = new Intl.DateTimeFormat(lang === 'am' ? 'am-ET' : 'en-GB', { hour: '2-digit', minute: '2-digit' }).format(now);

  const stats = [
    { key: 'new', label: t('status.new'), value: counts.new, tone: 'text-indigo-800 dark:text-indigo-300' },
    { key: 'preparing', label: t('status.preparing'), value: counts.preparing, tone: 'text-amber-800 dark:text-amber-300' },
    { key: 'ready', label: t('status.ready'), value: counts.ready, tone: 'text-emerald-800 dark:text-emerald-300' },
    ...(isKitchen
      ? []
      : [
          { key: 'requests', label: t('staff.openRequests'), value: openRequests, tone: 'text-navy-900 dark:text-slate-100' },
          { key: 'folio', label: t('staff.statFolio'), value: money(folioTotal, 'ETB'), tone: 'text-brand' },
        ]),
  ];

  const grid = `grid gap-4 md:grid-cols-2 ${isKitchen ? 'xl:grid-cols-3' : '2xl:grid-cols-3'}`;

  return (
    <div className="min-h-dvh">
      <Header mode="staff" />

      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 pb-12 pt-6 outline-none sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {isKitchen ? t('role.kitchen') : t('staff.title')}
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200">
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping2 rounded-full bg-emerald-500" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                {t('staff.live')} · <span className="tabular-nums">{clock}</span>
              </span>
            </h1>
            <p className="mt-1 text-slate-700 dark:text-slate-300">{isKitchen ? t('staff.subtitleKitchen') : t('staff.subtitle')}</p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-gold" onClick={() => simulateOrder(stays.filter((s) => s.status === 'in-house'))}>
                <Sparkles className="h-4 w-4" aria-hidden />
                {t('staff.simulate')}
              </button>
              <button type="button" className="btn-ghost" onClick={() => { resetDemo(); notify(t('staff.resetDone')); }}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                {t('staff.reset')}
              </button>
            </div>
          )}
        </div>

        <DemoNotice scope="staff" className="mt-4" />

        <dl className={`mt-5 grid grid-cols-2 gap-3 ${isKitchen ? 'lg:grid-cols-3' : 'lg:grid-cols-5'}`}>
          {stats.map((s) => (
            <div key={s.key} className="card p-4">
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                {s.key === 'folio' && <Receipt className="h-3.5 w-3.5" aria-hidden />}
                {s.label}
              </dt>
              <dd className={`mt-1 text-2xl font-extrabold tabular-nums ${s.tone}`}>{s.value}</dd>
            </div>
          ))}
        </dl>

        <section aria-label={t('staff.salesBreakdown')} className="card mt-4 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">{t('staff.salesBreakdown')}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><dt className="text-xs text-slate-700 dark:text-slate-300">{t('staff.paidOnline')}</dt><dd className="font-bold tabular-nums">{money(paidTotal, 'ETB')}</dd></div>
            <div><dt className="text-xs text-slate-700 dark:text-slate-300">{t('staff.statFolio')}</dt><dd className="font-bold tabular-nums">{money(folioTotal, 'ETB')}</dd></div>
            <div><dt className="text-xs text-slate-700 dark:text-slate-300">{t('staff.cashCollected')}</dt><dd className="font-bold tabular-nums">{money(cashCollected, 'ETB')}</dd></div>
            <div><dt className="text-xs font-semibold text-amber-800 dark:text-amber-300">{t('staff.cashToCollect')}</dt><dd className="font-extrabold tabular-nums text-amber-800 dark:text-amber-300">{money(cashDue, 'ETB')}</dd></div>
          </dl>
        </section>

        <div className={`mt-6 grid gap-6 ${isKitchen ? '' : 'lg:grid-cols-[minmax(0,1fr)_340px]'}`}>
          <div className="min-w-0 space-y-6">
            {/* Filters: status, source, destination, age */}
            <section aria-labelledby="queue-title" className="card space-y-3 p-4">
              <h2 id="queue-title" className="flex items-center gap-2 text-lg font-bold">
                <ClipboardList className="h-5 w-5 text-brand" aria-hidden />
                {t('staff.queue')}
              </h2>
              <div role="group" aria-label={t('staff.filterStatus')} className="scrollbar-none flex gap-1.5 overflow-x-auto py-1">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={status === f}
                    onClick={() => setStatus(f)}
                    className={`chip px-3 text-xs ${status === f ? 'chip-on' : 'chip-off'}`}
                  >
                    {f === 'active' ? t('staff.filterActive') : t(`status.${f}`)}
                    <span className="tabular-nums opacity-80">{counts[f]}</span>
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm font-semibold">
                  {t('staff.filterSource')}
                  <select className={`${inputCls} mt-1`} value={filters.source} onChange={setF('source')}>
                    <option value="all">{t('staff.allSources')}</option>
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>{t(`src.${s}`)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  {t('staff.filterDest')}
                  <select className={`${inputCls} mt-1`} value={filters.dest} onChange={setF('dest')}>
                    <option value="all">{t('staff.allDest')}</option>
                    {destinations.map((d) => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  {t('staff.filterAge')}
                  <select className={`${inputCls} mt-1`} value={filters.age} onChange={setF('age')}>
                    {AGES.map((a) => (
                      <option key={a} value={a}>{a === 0 ? t('staff.anyAge') : t('staff.olderThan', { min: a })}</option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    aria-pressed={filters.walkin}
                    onClick={() => setFilters((f) => ({ ...f, walkin: !f.walkin }))}
                    className={`chip min-h-[46px] flex-1 justify-center ${filters.walkin ? 'chip-on' : 'chip-off'}`}
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden />
                    {t('staff.walkinOnly')}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p role="status" className="font-semibold">{t('staff.showing', { count: visible.length })}</p>
                {filtering && (
                  <button type="button" className="font-semibold text-brand underline underline-offset-2" onClick={() => setFilters(NO_FILTERS)}>
                    {t('staff.clearFilters')}
                  </button>
                )}
              </div>
            </section>

            {/* Food orders (kitchen work) */}
            <section aria-labelledby="food-title">
              <h2 id="food-title" className="mb-3 flex items-center gap-2 text-lg font-bold">
                <ChefHat className="h-5 w-5 text-brand" aria-hidden />
                {t('staff.foodOrders')} <span className="text-slate-600 dark:text-slate-300">({food.length})</span>
              </h2>
              {food.length ? (
                <div className={grid}>
                  {food.map((o) => (
                    <OrderCard key={o.id} order={o} now={now} onAdvance={onAdvance} />
                  ))}
                </div>
              ) : (
                <p className="card p-8 text-center text-slate-700 dark:text-slate-300">{filtering ? t('staff.noMatch') : t('staff.noOrders')}</p>
              )}
            </section>

            {/* Service requests (front desk work, never mixed into the kitchen list) */}
            {!isKitchen && (
              <section aria-labelledby="req-title">
                <h2 id="req-title" className="mb-3 flex items-center gap-2 text-lg font-bold">
                  <HandHelping className="h-5 w-5 text-brand" aria-hidden />
                  {t('staff.serviceRequests')} <span className="text-slate-600 dark:text-slate-300">({requests.length})</span>
                </h2>
                {requests.length ? (
                  <div className={grid}>
                    {requests.map((o) => (
                      <OrderCard key={o.id} order={o} now={now} onAdvance={onAdvance} />
                    ))}
                  </div>
                ) : (
                  <p className="card p-8 text-center text-slate-700 dark:text-slate-300">{filtering ? t('staff.noMatch') : t('staff.noRequests')}</p>
                )}
              </section>
            )}
          </div>

          {!isKitchen && (
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <RoomMonitor />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
