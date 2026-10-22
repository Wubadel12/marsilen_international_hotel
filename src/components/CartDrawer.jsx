import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2, CreditCard, Receipt, ShoppingBag, Trash2, X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { DESKS_BY_ID } from '../data/accounts';
import { useDesk } from '../hooks/useDesk';
import { CURRENCIES, DIETARY_REQUIREMENTS, TAX_RATE, TIP_OPTIONS } from '../data/mock';
import { calcTotals } from '../data/pricing';
import QuantityStepper from './QuantityStepper';
import { DemoNotice, SourceBadge, inputCls } from './ui';
import GuestLogin from '../pages/GuestLogin';

const METHODS = [
  { id: 'card', key: 'cart.methodCard' },
  { id: 'telebirr', key: 'cart.methodTelebirr' },
  { id: 'cbe', key: 'cart.methodCbe' },
];

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const focusRing = 'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-amber-600/50';

/** A radio styled as a card. Real <input type="radio">, so arrow keys and screen readers just work. */
function Choice({ name, checked, onChange, title, desc, Icon }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 transition ${focusRing} ${
        checked
          ? 'border-amber-700 bg-amber-50 dark:border-amber-400 dark:bg-amber-500/10'
          : 'border-slate-300 bg-white hover:border-amber-600 dark:border-white/15 dark:bg-navy-800'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {Icon && (
        <span
          aria-hidden
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            checked ? 'bg-amber-700 text-white dark:bg-amber-400 dark:text-navy-900' : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200'
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <span>
        <span className="block font-semibold">{title}</span>
        {desc && <span className="block text-xs text-slate-600 dark:text-slate-300">{desc}</span>}
      </span>
    </label>
  );
}

function ChoiceChip({ name, checked, onChange, children }) {
  return (
    <label className={`chip cursor-pointer ${focusRing} ${checked ? 'chip-on' : 'chip-off'}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

export default function CartDrawer({ open, onClose }) {
  const {
    t, loc, cartLines, subtotalEtb, setQty, setNote, currency, setCurrency,
    money, fmt, placeOrder,
  } = useApp();
  const { guest } = useAuth();
  const { customerContext } = useApp();
  const desk = useDesk();
  const isRoomFlow = customerContext.mode === 'room';
  const isTableFlow = !isRoomFlow;
  const room = guest?.room;
  const [guestSignInOpen, setGuestSignInOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [selectedDeskId, setSelectedDeskId] = useState('');
  const placeDesk = desk ?? DESKS_BY_ID[selectedDeskId] ?? null;
  const needsPlaceChoice = isTableFlow && !desk;
  const needsDeliveryChoice = Boolean(guest && isTableFlow && desk);

  const [delivery, setDelivery] = useState(null); // 'room' | 'here' (hotel guest at a table/venue QR)
  const [tip, setTip] = useState(null); // null = not chosen. Never preselected.
  const [payment, setPayment] = useState(null); // 'online' | 'folio' | 'cash'
  const [method, setMethod] = useState(null);
  const [dietary, setDietary] = useState([]);
  const [allergies, setAllergies] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [phase, setPhase] = useState('cart'); // 'cart' | 'sending' | 'done'
  const [placed, setPlaced] = useState(null);
  const panelRef = useRef(null);
  const sendTimer = useRef(null);

  const effPayment = payment;
  const effDelivery = isRoomFlow ? 'room' : needsDeliveryChoice ? delivery : 'here';
  const deliveryTarget =
    effDelivery === 'here' && placeDesk ? { type: 'desk', id: placeDesk.id } : { type: 'room', id: room };

  const totals = calcTotals(subtotalEtb, tip ?? 0, currency);
  const empty = cartLines.length === 0;
  const hasCustomer = isRoomFlow ? Boolean(guest) : Boolean(guest || customerName.trim().length >= 2);
  const missing = [
    needsPlaceChoice && !selectedDeskId && t('cart.needPlace'),
    effDelivery === null && t('cart.needDelivery'),
    effPayment === null && t('cart.needPayment'),
    isTableFlow && !guest && customerName.trim().length < 2 && t('cart.needName'),
    effPayment === 'online' && !method && t('cart.needMethod'),
  ].filter(Boolean);
  const canSubmit = hasCustomer && (!isRoomFlow || Boolean(guest)) && !empty && phase === 'cart' && missing.length === 0;

  const close = useCallback(() => {
    if (phase === 'sending') return;
    onClose();
    if (phase === 'done') {
      setTimeout(() => {
        setPhase('cart');
        setPlaced(null);
      }, 350);
    }
  }, [onClose, phase]);

  // Scroll lock, Escape to close, focus trap, restore focus on close.
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => panelRef.current?.focus());

    const onKey = (e) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, close]);

  useEffect(() => () => clearTimeout(sendTimer.current), []);

  const toggleDiet = (d) => setDietary((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const submit = () => {
    if (!canSubmit) return;
    setPhase('sending');
    const longestPrep = Math.max(...cartLines.map((l) => l.item.prep || 0));
    // Simulated latency. Nothing leaves this browser.
    sendTimer.current = setTimeout(() => {
      const order = placeOrder({
        payment: effPayment === 'online' ? 'paid' : effPayment === 'cash' ? 'cash' : 'folio',
        method: effPayment === 'online' ? method : effPayment,
        tipPct: tip ?? 0,
        dietary,
        allergies,
        note: orderNote.trim(),
        guest,
        visitor: guest ? null : { name: customerName.trim(), deskId: placeDesk?.id },
        delivery: deliveryTarget,
      });
      if (!order) {
        setPhase('cart');
        return;
      }
      setPlaced({ ...order, longestPrep });
      setPhase('done');
      setDietary([]);
      setAllergies('');
      setOrderNote('');
      setTip(null);
      setPayment(null);
      setDelivery(null);
    }, 900);
  };

  const submitLabel =
    phase === 'sending'
      ? t('cart.sending')
      : effPayment === 'folio'
        ? t('cart.placeFolio')
        : effPayment === 'cash'
          ? t('cart.placeCash', { amount: fmt(totals.total) })
          : t('cart.placeOnline', { amount: fmt(totals.total) });

  const placedDesk = placed?.delivery?.type === 'desk' ? DESKS_BY_ID[placed.delivery.id] : null;

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div
        onClick={close}
        aria-hidden
        className={`absolute inset-0 bg-navy-900/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />

      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        {...(!open ? { inert: '' } : {})}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-surface shadow-2xl outline-none transition-[transform,visibility] duration-300 ease-out dark:bg-ink ${
          open ? 'visible translate-x-0' : 'invisible translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 id="cart-title" className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag className="h-5 w-5 text-brand" aria-hidden />
            {t('cart.title')}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={t('common.close')}
            className="grid h-11 w-11 place-items-center rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {phase === 'done' && placed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-8 text-center">
            <span className="grid h-20 w-20 animate-pop place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <CheckCircle2 className="h-11 w-11" aria-hidden />
            </span>
            <h3 className="text-2xl font-bold">{t('cart.successTitle')}</h3>
            <p className="text-slate-700 dark:text-slate-300">
              {placed.payment === 'cash'
                ? t('cart.cashSuccess', { id: placed.id, place: placedDesk ? loc(placedDesk.name) : '' })
                : t('cart.successDemo', { id: placed.id })}
            </p>
            <dl className="card w-full space-y-2 p-4 text-left text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600 dark:text-slate-400">{t('cart.destination')}</dt>
                <dd className="text-right font-semibold">
                  {placedDesk ? loc(placedDesk.name) : t('header.room', { room: placed.room })}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600 dark:text-slate-400">{t('cart.payment')}</dt>
                <dd className="text-right font-semibold">
                  {placed.payment === 'paid' ? t('cart.paidDemo') : placed.payment === 'cash' ? t('cart.cashDue') : t('cart.folioDemo', { room: placed.room })}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600 dark:text-slate-400">{t('cart.total')}</dt>
                <dd className="text-right font-bold tabular-nums">{money(placed.total, 'ETB')}</dd>
              </div>
              {placed.longestPrep > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-600 dark:text-slate-400">{t('cart.prepTime')}</dt>
                  <dd className="text-right font-semibold">{t('menu.minutes', { min: placed.longestPrep })}</dd>
                </div>
              )}
            </dl>
            <button type="button" className="btn-gold w-full" onClick={close}>
              {t('cart.backToMenu')}
            </button>
          </div>
        ) : empty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <ShoppingBag className="h-8 w-8" aria-hidden />
            </span>
            <p className="text-lg font-semibold">{t('cart.empty')}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('cart.emptyDesc')}</p>
            <button type="button" className="btn-ghost mt-3" onClick={close}>{t('cart.backToMenu')}</button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              {/* 1. Where it goes and who pays */}
              <section aria-labelledby="dest-title" className="space-y-3">
                <h3 id="dest-title" className="text-sm font-semibold">{t('cart.destination')}</h3>
                <div className="rounded-2xl bg-navy-900 px-4 py-3 text-white dark:bg-white/10">
                  <p className="flex flex-wrap items-center gap-2">
                    <SourceBadge kind={isRoomFlow ? 'room' : (placeDesk?.kind ?? 'table')} />
                  </p>
                  <p className="mt-1 font-semibold">
                    {isRoomFlow
                      ? t('cart.deliveringTo', { room: room ?? customerContext.room })
                      : t('cart.serveAt', { place: placeDesk ? loc(placeDesk.name) : t('ctx.restaurant') })}
                  </p>
                  <p className="text-xs text-slate-200">
                    {guest
                      ? t('cart.chargedTo', { room, name: `${guest.firstName} ${guest.lastName}` })
                      : isRoomFlow ? t('cart.signInRequired') : t('cart.cashOnlineNote')}
                  </p>
                </div>

                {needsPlaceChoice && (
                  <label className="block text-sm font-semibold">
                    {t('entry.pickVenue')} <span className="font-normal text-slate-600 dark:text-slate-400">— {t('entry.pickVenueDemo')}</span>
                    <select className={`${inputCls} mt-1`} value={selectedDeskId} onChange={(e) => setSelectedDeskId(e.target.value)}>
                      <option value="">{t('entry.pickPlaceholder')}</option>
                      {Object.values(DESKS_BY_ID).map((d) => <option key={d.id} value={d.id}>{loc(d.name)}</option>)}
                    </select>
                  </label>
                )}

                {isTableFlow && !guest && (
                  <label className="block text-sm font-semibold">
                    {t('cart.customerName')}
                    <input className={`${inputCls} mt-1`} value={customerName} autoComplete="name" maxLength={40} onChange={(e) => setCustomerName(e.target.value)} />
                  </label>
                )}
                {isRoomFlow && !guest && (
                  <div className="rounded-xl border border-amber-500/50 bg-amber-50 p-3 text-sm dark:bg-amber-500/10">
                    <p>{t('cart.signInRequired')}</p>
                    <button type="button" className="mt-2 font-bold text-brand underline underline-offset-2" onClick={() => setGuestSignInOpen(true)}>{t('login.submit')}</button>
                  </div>
                )}

                {needsDeliveryChoice && (
                  <fieldset className="grid gap-2">
                    <legend className="mb-1 text-sm font-semibold">{t('cart.deliverTo')}</legend>
                    <Choice
                      name="delivery"
                      checked={delivery === 'here'}
                      onChange={() => setDelivery('here')}
                      title={t('cart.deliverHere', { place: loc(desk.name) })}
                    />
                    <Choice
                      name="delivery"
                      checked={delivery === 'room'}
                      onChange={() => { setDelivery('room'); if (payment === 'cash') setPayment(null); }}
                      title={t('cart.deliverRoom', { room })}
                    />
                  </fieldset>
                )}
              </section>

              {/* 2. Items */}
              <ul className="space-y-3" aria-label={t('cart.items')}>
                {cartLines.map(({ item, qty, note }) => {
                  const name = loc(item.name);
                  return (
                    <li key={item.id} className="card space-y-3 p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold leading-snug">{name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {money(item.price)} × {qty}
                          </p>
                        </div>
                        <p className="font-bold tabular-nums">{money(item.price * qty)}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <QuantityStepper compact qty={qty} name={name} onChange={(n) => setQty(item.id, n)} />
                        <button
                          type="button"
                          onClick={() => setQty(item.id, 0)}
                          aria-label={t('cart.remove', { name })}
                          className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-300 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={note}
                        maxLength={120}
                        onChange={(e) => setNote(item.id, e.target.value)}
                        placeholder={t('cart.itemNote')}
                        aria-label={`${t('cart.itemNote')}: ${name}`}
                        className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-500 dark:border-white/15 dark:bg-navy-900 dark:placeholder:text-slate-400"
                      />
                    </li>
                  );
                })}
              </ul>

              {/* 3. Allergies, diet and kitchen notes: shown prominently to staff */}
              <section aria-labelledby="kitchen-title" className="space-y-3">
                <h3 id="kitchen-title" className="text-sm font-semibold">{t('cart.kitchenInfo')}</h3>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">{t('cart.allergies')}</span>
                  <input
                    type="text"
                    maxLength={120}
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder={t('cart.allergiesPlaceholder')}
                    className={inputCls}
                  />
                </label>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-semibold">{t('cart.dietary')}</legend>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_REQUIREMENTS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={dietary.includes(d)}
                        onClick={() => toggleDiet(d)}
                        className={`chip ${dietary.includes(d) ? 'chip-on' : 'chip-off'}`}
                      >
                        {t(`diet.${d}`)}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">{t('cart.orderNote')}</span>
                  <textarea
                    rows={2}
                    maxLength={240}
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder={t('cart.orderNotePlaceholder')}
                    className={`${inputCls} resize-none py-2`}
                  />
                </label>
              </section>

              {/* 4. Currency + tip (tip is never preselected) */}
              <section aria-labelledby="tipcur-title" className="space-y-4">
                <h3 id="tipcur-title" className="sr-only">{t('cart.currency')} / {t('cart.tip')}</h3>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-semibold">{t('cart.currency')}</legend>
                  <div className="inline-flex rounded-xl border border-slate-300 bg-slate-100/80 p-0.5 dark:border-white/15 dark:bg-white/5">
                    {Object.values(CURRENCIES).map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        aria-pressed={currency === c.code}
                        onClick={() => setCurrency(c.code)}
                        className={`min-h-[40px] rounded-[10px] px-4 text-sm font-semibold transition ${
                          currency === c.code ? 'bg-navy-900 text-white shadow dark:bg-amber-400 dark:text-navy-900' : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {currency !== 'ETB' && (
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {t('cart.rateNote', { rate: Math.round(1 / CURRENCIES[currency].rate) })}
                    </p>
                  )}
                </fieldset>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-semibold">
                    {t('cart.tip')} <span className="font-normal text-slate-600 dark:text-slate-400">({t('common.optional')})</span>
                  </legend>
                  <div className="flex flex-wrap gap-1.5">
                    {TIP_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={tip === p}
                        onClick={() => setTip(tip === p ? null : p)}
                        className={`chip px-4 ${tip === p ? 'chip-on' : 'chip-off'}`}
                      >
                        {p === 0 ? t('cart.tipNone') : `${p}%`}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </section>

              {/* 5. Payment */}
              <section aria-labelledby="pay-title">
                <h3 id="pay-title" className="mb-2 text-sm font-semibold">{t('cart.payment')}</h3>
                {isRoomFlow && guest ? (
                  <fieldset className="grid gap-2">
                    <legend className="sr-only">{t('cart.payment')}</legend>
                    <Choice
                      name="payment"
                      checked={payment === 'online'}
                      onChange={() => setPayment('online')}
                      Icon={CreditCard}
                      title={t('cart.payNow')}
                      desc={t('cart.payNowDesc')}
                    />
                    <Choice
                      name="payment"
                      checked={payment === 'folio'}
                      onChange={() => setPayment('folio')}
                      Icon={Receipt}
                      title={t('cart.folio', { room })}
                      desc={t('cart.folioDesc')}
                    />
                  </fieldset>
                ) : isTableFlow ? (
                  <fieldset className="grid gap-2">
                    <legend className="sr-only">{t('cart.payment')}</legend>
                    <Choice name="payment" checked={payment === 'online'} onChange={() => setPayment('online')} Icon={CreditCard} title={t('cart.payNow')} desc={t('cart.payNowDesc')} />
                    {(!guest || delivery !== 'room') && <Choice name="payment" checked={payment === 'cash'} onChange={() => setPayment('cash')} Icon={Receipt} title={t('cart.payCash')} desc={t('cart.payCashDesc')} />}
                    {guest && <Choice name="payment" checked={payment === 'folio'} onChange={() => setPayment('folio')} Icon={Receipt} title={t('cart.folio', { room })} desc={t('cart.folioDesc')} />}
                  </fieldset>
                ) : <p className="text-sm text-slate-700 dark:text-slate-300">{t('cart.signInRequired')}</p>}

                {effPayment === 'online' && (
                  <fieldset className="mt-3 rounded-2xl border border-dashed border-slate-400 p-3.5 dark:border-white/25">
                    <legend className="px-1 text-sm font-semibold">{t('cart.method')}</legend>
                    <div className="flex flex-wrap gap-2">
                      {METHODS.map((m) => (
                        <ChoiceChip key={m.id} name="method" checked={method === m.id} onChange={() => setMethod(m.id)}>
                          {t(m.key)}
                        </ChoiceChip>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{t('cart.mockNote')}</p>
                  </fieldset>
                )}
              </section>

              {/* 6. Itemized totals */}
              <dl className="card space-y-2 p-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-700 dark:text-slate-300">{t('cart.subtotal')}</dt>
                  <dd className="tabular-nums">{fmt(totals.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-700 dark:text-slate-300">{t('cart.tax', { rate: Math.round(TAX_RATE * 100) })}</dt>
                  <dd className="tabular-nums">{fmt(totals.tax)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-700 dark:text-slate-300">
                    {tip === null ? t('cart.tipNotAdded') : tip === 0 ? t('cart.tipLineNone') : t('cart.tipLine', { pct: tip })}
                  </dt>
                  <dd className="tabular-nums">{fmt(totals.tip)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold dark:border-white/10">
                  <dt>{t('cart.totalIn', { cur: currency })}</dt>
                  <dd className="tabular-nums text-brand">{fmt(totals.total)}</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-2 border-t border-slate-200 bg-white/90 p-4 backdrop-blur dark:border-white/10 dark:bg-navy-900/90">
              <DemoNotice scope="checkout" />
              {missing.length > 0 && (
                <p role="status" className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {missing.join(' · ')}
                </p>
              )}
              <button type="button" className="btn-gold w-full text-base" disabled={!canSubmit} onClick={submit}>
                {submitLabel}
              </button>
            </div>
          </>
        )}
      </aside>
      <GuestLogin open={guestSignInOpen} onClose={() => setGuestSignInOpen(false)} />
    </div>
  );
}
