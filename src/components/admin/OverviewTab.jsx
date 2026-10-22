import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNow } from '../../hooks/useNow';
import { DESKS_BY_ID, folioBalance, orderPlace } from '../../data/accounts';
import { Badge, SourceBadge } from '../ui';

const HOUR = 3600 * 1000;
const RANGES = { '1h': HOUR, '24h': 24 * HOUR, '7d': 7 * 24 * HOUR };
const LATE_MIN = 20;

function Tile({ label, value, hint, big = false }) {
  return (
    <div className={`card ${big ? 'p-5' : 'p-4'}`}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">{label}</dt>
      <dd className={`mt-1 font-extrabold tabular-nums text-brand ${big ? 'text-3xl' : 'text-2xl'}`}>{value}</dd>
      {hint && <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{hint}</p>}
    </div>
  );
}

export default function OverviewTab() {
  const { t, loc, orders, menuItems, rooms, money } = useApp();
  const { stays } = useAuth();
  const now = useNow(30000);
  const [range, setRange] = useState('24h');

  const d = useMemo(() => {
    const since = now - RANGES[range];
    const inRange = orders.filter((o) => o.createdAt >= since);
    const food = inRange.filter((o) => o.type === 'food');
    const inHouse = stays.filter((s) => s.status === 'in-house');
    const open = orders.filter((o) => o.status !== 'completed');
    const late = open.filter((o) => (now - o.createdAt) / 60000 >= LATE_MIN);
    const roomCounts = { available: 0, occupied: 0, cleaning: 0 };
    Object.values(rooms).forEach((s) => {
      roomCounts[s] += 1;
    });
    const sources = { room: 0, table: 0, venue: 0 };
    inRange.forEach((o) => {
      sources[orderPlace(o)] += 1;
    });
    return {
      inRange: inRange.length,
      food: food.length,
      sales: food.reduce((s, o) => s + o.total, 0),
      paid: food.filter((o) => o.payment === 'paid').reduce((s, o) => s + o.total, 0),
      folioSales: food.filter((o) => o.payment === 'folio').reduce((s, o) => s + o.total, 0),
      cashCollected: food.filter((o) => o.payment === 'cash' && o.cashReceived).reduce((s, o) => s + o.total, 0),
      cashDue: food.filter((o) => o.payment === 'cash' && !o.cashReceived).reduce((s, o) => s + o.total, 0),
      walkins: inRange.filter((o) => o.guestType === 'visitor').length,
      sources,
      inHouse: inHouse.length,
      open: open.length,
      late: late.length,
      openFolios: inHouse.reduce((s, st) => s + folioBalance(orders, st), 0),
      roomCounts,
      soldOut: menuItems.filter((i) => i.available === false),
    };
  }, [orders, stays, rooms, menuItems, range, now]);

  const recent = useMemo(() => [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6), [orders]);
  const maxSource = Math.max(1, ...Object.values(d.sources), d.walkins);

  const attention = [
    d.late > 0 && t('admin.attn.late', { count: d.late, min: LATE_MIN }),
    d.roomCounts.cleaning > 0 && t('admin.attn.cleaning', { count: d.roomCounts.cleaning }),
    d.soldOut.length > 0 && t('admin.attn.soldOut', { count: d.soldOut.length, names: d.soldOut.slice(0, 3).map((i) => loc(i.name)).join(', ') }),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{t('admin.tab.overview')}</h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {t('admin.showingRange', { range: t(`admin.range.${range}`) })} · <Badge tone="warn">{t('demo.dataBadge')}</Badge>
          </p>
        </div>
        <div role="group" aria-label={t('admin.timeRange')} className="inline-flex rounded-xl border border-slate-300 bg-slate-100/80 p-0.5 dark:border-white/15 dark:bg-white/5">
          {Object.keys(RANGES).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={`min-h-[44px] rounded-[10px] px-4 text-sm font-semibold transition ${
                range === r ? 'bg-navy-900 text-white shadow dark:bg-amber-400 dark:text-navy-900' : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              {t(`admin.range.${r}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Right now: not affected by the time range */}
      <section aria-labelledby="now-title">
        <h3 id="now-title" className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">{t('admin.rightNow')}</h3>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile big label={t('admin.stat.openOrders')} value={d.open} hint={t('admin.hint.open')} />
          <Tile big label={t('admin.stat.inHouse')} value={d.inHouse} hint={t('admin.hint.inHouse')} />
          <Tile big label={t('admin.stat.roomsAvailable')} value={`${d.roomCounts.available} / ${Object.keys(rooms).length}`} hint={t('admin.hint.rooms', { occ: d.roomCounts.occupied, clean: d.roomCounts.cleaning })} />
          <Tile big label={t('admin.stat.folio')} value={money(d.openFolios, 'ETB')} hint={t('admin.hint.folio')} />
        </dl>
      </section>

      {/* For the selected time range */}
      <section aria-labelledby="range-title">
        <h3 id="range-title" className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          {t('admin.inRange', { range: t(`admin.range.${range}`) })}
        </h3>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Tile label={t('admin.stat.sales')} value={money(d.sales, 'ETB')} hint={t('admin.hint.sales', { paid: money(d.paid, 'ETB'), folio: money(d.folioSales, 'ETB'), cash: money(d.cashCollected, 'ETB'), due: money(d.cashDue, 'ETB') })} />
          <Tile label={t('staff.cashToCollect')} value={money(d.cashDue, 'ETB')} hint={t('staff.cashCollectedHint', { amount: money(d.cashCollected, 'ETB') })} />
          <Tile label={t('admin.stat.foodOrders')} value={d.food} />
          <Tile label={t('admin.stat.requests')} value={d.inRange - d.food} />
          <Tile label={t('admin.stat.walkins')} value={d.walkins} hint={t('admin.hint.walkins')} />
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="attn-title" className="card p-5">
          <h3 id="attn-title" className="text-lg font-bold">{t('admin.attention')}</h3>
          {attention.length === 0 ? (
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{t('admin.attentionNone')}</p>
          ) : (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
              {attention.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="src-title" className="card p-5">
          <h3 id="src-title" className="text-lg font-bold">{t('admin.bySource')}</h3>
          <ul className="mt-3 space-y-2.5">
            {[...['room', 'table', 'venue'].map((k) => [k, d.sources[k]]), ['walkin', d.walkins]].map(([k, n]) => (
              <li key={k} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0"><SourceBadge kind={k} /></span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" aria-hidden>
                  <span className="block h-full rounded-full bg-amber-700 dark:bg-amber-400" style={{ width: `${(n / maxSource) * 100}%` }} />
                </span>
                <span className="w-6 text-right font-bold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-700 dark:text-slate-300">{t('admin.bySourceNote')}</p>
        </section>
      </div>

      <section aria-labelledby="recent-title" className="card p-5">
        <h3 id="recent-title" className="text-lg font-bold">{t('admin.recent')}</h3>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{t('admin.noActivity')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 dark:divide-white/10">
            {recent.map((o) => {
              const desk = o.delivery?.type === 'desk' ? DESKS_BY_ID[o.delivery.id] : null;
              return (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="flex flex-wrap items-center gap-2">
                    <SourceBadge kind={orderPlace(o)} />
                    <span className="font-semibold">
                      #{o.id} · {desk ? loc(desk.name) : t('header.room', { room: o.room })}
                    </span>
                    {o.guestName && <span className="text-slate-700 dark:text-slate-300">· {o.guestName}</span>}
                    {o.guestType === 'visitor' && <SourceBadge kind="walkin" />}
                  </span>
                  <span className="flex items-center gap-3">
                    <Badge>{o.type === 'service' && o.status === 'preparing' ? t('status.inprogress') : t(`status.${o.status}`)}</Badge>
                    <span className="min-w-[5rem] text-right font-bold tabular-nums">
                      {o.type === 'food' ? money(o.total, 'ETB') : t('staff.service')}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
