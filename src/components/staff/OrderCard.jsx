import { memo } from 'react';
import {
  AlarmClock, BedDouble, Bath, BellRing, CheckCheck, ChefHat, Clock, CreditCard, HandHelping, Receipt,
  TriangleAlert, UtensilsCrossed, Wrench,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MENU_BY_ID, SERVICES_BY_KEY } from '../../data/mock';
import { DESKS_BY_ID, orderPlace } from '../../data/accounts';
import DietBadge from '../DietBadge';
import { Badge, SourceBadge } from '../ui';

const SERVICE_ICONS = { Bath, BedDouble, Wrench, AlarmClock, BellRing, Receipt, UtensilsCrossed, HandHelping };

const STATUS_STYLE = {
  new: { bar: 'bg-indigo-600', pill: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-200' },
  preparing: { bar: 'bg-amber-600', pill: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200' },
  ready: { bar: 'bg-emerald-600', pill: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200' },
  completed: { bar: 'bg-slate-400 dark:bg-slate-600', pill: 'bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-200' },
};

const FOOD_ACTIONS = {
  new: { key: 'action.preparing', Icon: ChefHat, cls: 'btn-gold' },
  preparing: { key: 'action.ready', Icon: BellRing, cls: 'btn bg-emerald-700 text-white hover:bg-emerald-800' },
  ready: { key: 'action.complete', Icon: CheckCheck, cls: 'btn bg-navy-900 text-white hover:bg-navy-800 dark:bg-white/15 dark:hover:bg-white/25' },
};
const SERVICE_ACTIONS = {
  new: { key: 'action.svcStart', Icon: ChefHat, cls: 'btn-gold' },
  preparing: { key: 'action.svcDone', Icon: CheckCheck, cls: 'btn bg-emerald-700 text-white hover:bg-emerald-800' },
};

function elapsedTone(min) {
  if (min >= 25) return 'text-red-700 dark:text-red-300';
  if (min >= 12) return 'text-amber-800 dark:text-amber-300';
  return 'text-emerald-800 dark:text-emerald-300';
}

function OrderCard({ order, now, onAdvance }) {
  const { t, loc, money, menuItems, markCashReceived, notify } = useApp();
  const done = order.status === 'completed';
  const isService = order.type === 'service';
  const minutes = Math.max(0, Math.floor(((order.completedAt ?? now) - order.createdAt) / 60000));
  const style = STATUS_STYLE[order.status];
  const action = (isService ? SERVICE_ACTIONS : FOOD_ACTIONS)[order.status];
  const desk = order.delivery?.type === 'desk' ? DESKS_BY_ID[order.delivery.id] : null;
  const place = orderPlace(order); // room | table | venue
  const walkIn = order.guestType === 'visitor';
  const destination = desk ? loc(desk.name) : t('header.room', { room: order.room });
  const service = isService ? SERVICES_BY_KEY[order.serviceKey] : null;
  const ServiceIcon = service ? SERVICE_ICONS[service.icon] : null;

  const nutAllergy = order.dietary?.includes('nut');
  const otherDiet = (order.dietary ?? []).filter((d) => d !== 'nut');
  const hasAllergy = Boolean(order.allergies) || nutAllergy;
  const statusLabel = isService && order.status === 'preparing' ? t('status.inprogress') : t(`status.${order.status}`);

  return (
    <article
      aria-label={`${destination}, #${order.id}`}
      className={`card relative flex flex-col gap-3 overflow-hidden p-4 pl-5 transition ${done ? 'opacity-80' : 'hover:shadow-lift'}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${style.bar}`} aria-hidden />

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5">
            <SourceBadge kind={place} />
            {walkIn && <SourceBadge kind="walkin" />}
          </p>
          <p className="mt-1.5 text-2xl font-extrabold leading-none tracking-tight">{destination}</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            #{order.id}
            {order.guestName ? ` · ${order.guestName}` : ''}
          </p>
          {!walkIn && desk && order.type === 'food' && order.room && (
            <p className="mt-1 text-xs font-semibold text-amber-900 dark:text-amber-200">
              {t('staff.hotelGuestBilled', { room: order.room })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.pill}`}>{statusLabel}</span>
          <span className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${done ? 'text-slate-700 dark:text-slate-300' : elapsedTone(minutes)}`}>
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {done ? t('staff.doneIn', { min: minutes }) : t('staff.waiting', { min: minutes })}
            {!done && minutes >= 25 && <span className="font-extrabold uppercase">· {t('staff.late')}</span>}
          </span>
        </div>
      </header>

      {isService ? (
        <div className="flex items-center gap-3 rounded-xl bg-slate-100 p-3 dark:bg-white/5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 text-amber-400 dark:bg-white/10">
            {ServiceIcon && <ServiceIcon className="h-5 w-5" aria-hidden />}
          </span>
          <div>
            <p className="font-semibold">{service ? loc(service.name) : order.serviceKey}</p>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {order.extra ? t('staff.wakeAt', { time: order.extra }) : place === 'room' ? t('staff.roomRequest') : t('staff.deskRequest')}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Allergies come first and cannot be missed */}
          {hasAllergy && (
            <div className="rounded-xl border-2 border-red-700 bg-red-50 p-3 text-red-950 dark:border-red-400 dark:bg-red-500/15 dark:text-red-100">
              <p className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wide">
                <TriangleAlert className="h-4 w-4" aria-hidden />
                {t('staff.allergy')}
              </p>
              <p className="mt-1 text-base font-semibold">
                {[nutAllergy && t('diet.nut'), order.allergies].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}

          <ul className="space-y-1.5 text-sm" aria-label={t('cart.items')}>
            {order.items.map((line) => {
              const name = line.name ?? menuItems.find((i) => i.id === line.id)?.name ?? MENU_BY_ID[line.id]?.name;
              if (!name) return null;
              return (
                <li key={line.id}>
                  <div className="flex gap-2">
                    <span className="min-w-[2rem] font-bold tabular-nums text-brand">{line.qty}×</span>
                    <span className="font-medium">{loc(name)}</span>
                  </div>
                  {line.note && (
                    <p className="ml-8 text-xs font-semibold italic text-amber-950 dark:text-amber-200">“{line.note}”</p>
                  )}
                </li>
              );
            })}
          </ul>

          {(otherDiet.length > 0 || order.note) && (
            <div className="space-y-1.5 rounded-xl border border-amber-500/60 bg-amber-50 p-2.5 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
              {otherDiet.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-xs font-bold uppercase">{t('staff.diet')}:</span>
                  {otherDiet.map((d) => (
                    <DietBadge key={d} tag={d} />
                  ))}
                </div>
              )}
              {order.note && (
                <p className="text-sm">
                  <strong className="uppercase">{t('staff.kitchenNote')}:</strong> {order.note}
                </p>
              )}
            </div>
          )}

          {order.payment === 'cash' ? (
            <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 ${order.cashReceived ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-100' : 'border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100'}`}>
              <span className="font-extrabold">{order.cashReceived ? t('staff.cashReceived') : t('staff.cashDue')}</span>
              <span className="text-lg font-extrabold tabular-nums">{money(order.total, 'ETB')}</span>
              {!order.cashReceived && <span className="w-full text-xs font-semibold">{t('staff.cashCollectAt', { place: destination })}</span>}
            </div>
          ) : (
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm dark:border-white/10">
              <Badge tone={order.payment === 'paid' ? 'ok' : 'warn'} Icon={order.payment === 'paid' ? CreditCard : Receipt}>
                {order.payment === 'paid' ? t('pay.paid') : t('pay.folio')}
              </Badge>
              <span className="font-bold tabular-nums">{money(order.total, 'ETB')}</span>
            </div>
          )}
        </>
      )}

      {action && (
        <button type="button" className={`${action.cls} w-full`} onClick={() => onAdvance(order)}>
          <action.Icon className="h-4 w-4" aria-hidden />
          {t(action.key)}
          <span className="sr-only"> — {destination}, #{order.id}</span>
        </button>
      )}
      {order.payment === 'cash' && !order.cashReceived && ['ready', 'completed'].includes(order.status) && (
        <button type="button" className="btn bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => { markCashReceived(order.id); notify(t('staff.cashMarked')); }}>
          {t('staff.markCashReceived')}<span className="sr-only"> — {destination}, #{order.id}</span>
        </button>
      )}
    </article>
  );
}

export default memo(OrderCard);
