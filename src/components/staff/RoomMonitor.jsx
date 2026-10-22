import { useMemo, useState } from 'react';
import { BedDouble } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const STATUS_CLASS = {
  occupied: 'border-indigo-400 bg-indigo-50 text-indigo-950 hover:bg-indigo-100 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-100',
  available: 'border-emerald-500 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100',
  cleaning: 'border-amber-500 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100',
};
const DOT = { occupied: 'bg-indigo-600', available: 'bg-emerald-600', cleaning: 'bg-amber-600' };
const STATUSES = ['available', 'occupied', 'cleaning'];

/**
 * Guest rooms only, grouped by floor and filterable by status. Restaurant tables and venues are
 * not rooms; they appear on orders. Occupied rooms change only through check-in / check-out.
 */
export default function RoomMonitor() {
  const { t, rooms, setRoomStatus, orders, notify } = useApp();
  const [statusFilter, setStatusFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const byFloor = useMemo(() => {
    const out = {};
    Object.keys(rooms)
      .sort()
      .forEach((num) => {
        (out[num.charAt(0)] ||= []).push(num);
      });
    return out;
  }, [rooms]);
  const floors = Object.keys(byFloor);

  const openByRoom = useMemo(() => {
    const m = {};
    orders
      .filter((o) => o.status !== 'completed' && o.room)
      .forEach((o) => {
        m[o.room] = (m[o.room] || 0) + 1;
      });
    return m;
  }, [orders]);

  const counts = useMemo(
    () => STATUSES.reduce((acc, s) => ({ ...acc, [s]: Object.values(rooms).filter((v) => v === s).length }), {}),
    [rooms],
  );

  const change = (num, status) => {
    setRoomStatus(num, status);
    notify(t('rooms.changed', { room: num, status: t(`room.${status}`) }));
    setSelected(null);
  };

  const sel = selected && rooms[selected] ? { num: selected, status: rooms[selected] } : null;

  return (
    <section aria-labelledby="rooms-title" className="card p-5">
      <div className="flex items-center gap-2">
        <BedDouble className="h-5 w-5 text-brand" aria-hidden />
        <h2 id="rooms-title" className="text-lg font-bold">{t('staff.rooms')}</h2>
      </div>
      <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{t('rooms.scope')}</p>

      {/* Status filter doubles as the legend */}
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={t('rooms.filterStatus')}>
        <button
          type="button"
          aria-pressed={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
          className={`chip min-h-[40px] px-3 text-xs ${statusFilter === 'all' ? 'chip-on' : 'chip-off'}`}
        >
          {t('common.all')} <span className="tabular-nums opacity-80">{Object.keys(rooms).length}</span>
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={statusFilter === s}
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            className={`chip min-h-[40px] px-3 text-xs ${statusFilter === s ? 'chip-on' : 'chip-off'}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${DOT[s]}`} aria-hidden />
            {t(`room.${s}`)} <span className="tabular-nums opacity-80">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t('rooms.filterFloor')}>
        {['all', ...floors].map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={floorFilter === f}
            onClick={() => setFloorFilter(f)}
            className={`chip min-h-[40px] px-3 text-xs ${floorFilter === f ? 'chip-on' : 'chip-off'}`}
          >
            {f === 'all' ? t('rooms.allFloors') : t('staff.floor', { n: f })}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {floors
          .filter((f) => floorFilter === 'all' || f === floorFilter)
          .map((floor) => {
            const nums = byFloor[floor].filter((n) => statusFilter === 'all' || rooms[n] === statusFilter);
            if (nums.length === 0) return null;
            return (
              <div key={floor}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  {t('staff.floor', { n: floor })}
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {nums.map((num) => {
                    const status = rooms[num];
                    const open = openByRoom[num] || 0;
                    return (
                      <button
                        key={num}
                        type="button"
                        aria-pressed={selected === num}
                        onClick={() => setSelected(selected === num ? null : num)}
                        aria-label={`${t('header.room', { room: num })}, ${t(`room.${status}`)}${open ? `, ${t('staff.openCount', { count: open })}` : ''}`}
                        className={`relative flex min-h-[56px] flex-col items-center justify-center rounded-xl border px-1 py-1.5 transition active:scale-95 ${STATUS_CLASS[status]} ${
                          selected === num ? 'ring-2 ring-navy-900 ring-offset-2 dark:ring-amber-400 dark:ring-offset-navy-800' : ''
                        }`}
                      >
                        <span className="text-sm font-bold tabular-nums">{num}</span>
                        <span className="text-[10px] font-semibold leading-tight">{t(`room.${status}`)}</span>
                        {open > 0 && (
                          <span
                            aria-hidden
                            className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-amber-700 px-1 text-[11px] font-bold text-white"
                          >
                            {open}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        {Object.values(byFloor).flat().filter((n) => (statusFilter === 'all' || rooms[n] === statusFilter) && (floorFilter === 'all' || n.charAt(0) === floorFilter)).length === 0 && (
          <p className="rounded-xl bg-slate-100 p-4 text-center text-sm dark:bg-white/5">{t('rooms.none')}</p>
        )}
      </div>

      {sel && (
        <div role="region" aria-label={t('header.room', { room: sel.num })} className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-3 dark:border-white/15 dark:bg-white/5">
          <p className="font-bold">
            {t('header.room', { room: sel.num })} · {t(`room.${sel.status}`)}
          </p>
          {sel.status === 'occupied' ? (
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t('rooms.occupiedNote')}</p>
          ) : (
            <button
              type="button"
              className="btn-gold mt-2 w-full"
              onClick={() => change(sel.num, sel.status === 'cleaning' ? 'available' : 'cleaning')}
            >
              {sel.status === 'cleaning' ? t('rooms.markAvailable') : t('rooms.markCleaning')}
            </button>
          )}
          <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">{t('demo.local')}</p>
        </div>
      )}
    </section>
  );
}
