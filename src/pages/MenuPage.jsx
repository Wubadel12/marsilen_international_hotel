import { useEffect, useMemo, useState } from 'react';
import {
  BedDouble, Bell, Search, ShoppingBag, Store, TriangleAlert, UtensilsCrossed, X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, DIETARY_TAGS } from '../data/mock';
import { deskChannel, offeredAt } from '../data/accounts';
import { useDesk } from '../hooks/useDesk';
import { usePageTitle } from '../hooks/usePageTitle';
import Header from '../components/Header';
import CategoryTabs from '../components/CategoryTabs';
import MenuCard from '../components/MenuCard';
import ServiceRequests from '../components/ServiceRequests';
import CartDrawer from '../components/CartDrawer';
import GuestLogin from './GuestLogin';
import { DemoNotice, SourceBadge, inputCls } from '../components/ui';

const FOOD_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'all' && c.id !== 'amenities');

/** Says, in one place, which flow the customer is in and where their order will go. */
function ContextBar({ onRequests, onSignIn }) {
  const { t, loc, qr, customerContext } = useApp();
  const { guest, visitor } = useAuth();
  const desk = useDesk();

  let Icon = BedDouble;
  let kind = customerContext.mode === 'room' ? 'room' : (desk?.kind ?? 'table');
  let title = customerContext.mode === 'room' ? t('header.room', { room: guest?.room ?? customerContext.room }) : (desk ? loc(desk.name) : t('ctx.restaurant'));
  let lines = customerContext.mode === 'room' ? [t('ctx.roomDeliver'), t('ctx.roomBilling')] : [t('ctx.visitorServe', { place: desk ? loc(desk.name) : t('ctx.restaurant') }), t('ctx.tableBilling')];
  let requests = customerContext.mode === 'room' ? t('ctx.roomRequests') : t('ctx.deskRequests');

  if (customerContext.mode === 'table' && desk) {
    kind = desk.kind;
    Icon = desk.kind === 'table' ? UtensilsCrossed : Store;
    title = loc(desk.name);
    requests = t('ctx.deskRequests');
    lines = guest
      ? [t('ctx.guestDeskServe'), t('ctx.guestDeskBilling', { room: guest.room })]
      : [t('ctx.visitorServe', { place: loc(desk.name) }), t('ctx.tableBilling')];
  }

  const mismatch = customerContext.mode === 'room' && guest && qr?.type === 'room' && qr.id !== guest.room;

  return (
    <section aria-label={t('ctx.heading')} className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-900 text-amber-400 dark:bg-white/10">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <SourceBadge kind={visitor ? 'walkin' : kind} />
            {visitor && desk && <SourceBadge kind={desk.kind} />}
          </p>
          <p className="mt-1 text-lg font-bold leading-snug">{title}</p>
          <ul className="mt-0.5 space-y-0.5 text-sm text-slate-700 dark:text-slate-300">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={onRequests} className="btn-ghost">
          <Bell className="h-4 w-4" aria-hidden />
          {requests}
        </button>
      </div>
      {customerContext.mode === 'table' && !guest && (
        <div className="border-t border-slate-200 px-4 py-2 text-right text-sm dark:border-white/10">
          <button type="button" onClick={onSignIn} className="font-semibold text-brand underline underline-offset-2">{t('entry.hotelSignIn')}</button>
        </div>
      )}
      {mismatch && (
        <p role="alert" className="flex items-start gap-2 border-t border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t('guest.qrMismatch', { qr: qr.id, room: guest.room })}
        </p>
      )}
    </section>
  );
}

export default function MenuPage() {
  const { t, loc, menuItems, cart, setQty, cartCount, subtotalEtb, money, customerContext } = useApp();
  const { guest, visitor } = useAuth();
  const desk = useDesk();
  const channel = customerContext.mode === 'room' ? 'room' : desk ? deskChannel(desk.id) : 'restaurant';
  usePageTitle(customerContext.mode === 'table' ? `${t('menu.menuAt')} ${desk ? loc(desk.name) : t('ctx.restaurant')}` : `${t('menu.title')} - ${t('header.room', { room: guest?.room ?? customerContext.room })}`);

  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [diet, setDiet] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  // Only items the admin offers on this menu (room service, restaurant, or this venue).
  const offered = useMemo(() => menuItems.filter((i) => offeredAt(i, channel)), [menuItems, channel]);

  // A cart carried over from another place must not keep items this menu does not offer.
  useEffect(() => {
    Object.keys(cart).forEach((id) => {
      const it = menuItems.find((i) => i.id === id);
      if (it && !offeredAt(it, channel)) setQty(id, 0);
    });
  }, [cart, menuItems, channel, setQty]);

  const q = query.trim().toLowerCase();
  const matches = (i) =>
    diet.every((d) => (i.tags ?? []).includes(d)) &&
    (!q || [i.name?.en, i.name?.am, i.desc?.en, i.desc?.am].some((s) => s?.toLowerCase().includes(q)));
  const filtered = useMemo(() => offered.filter(matches), [offered, q, diet]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useMemo(() => {
    const list = [{ id: 'all', label: t('cat.all'), count: filtered.length }];
    FOOD_CATEGORIES.forEach((c) => {
      if (offered.some((i) => i.cat === c.id)) {
        list.push({ id: c.id, label: t(c.key), count: filtered.filter((i) => i.cat === c.id).length });
      }
    });
    list.push({ id: 'requests', label: customerContext.mode === 'table' ? t('cat.deskRequests') : t('cat.roomRequests') });
    return list;
  }, [offered, filtered, desk, customerContext.mode, t]);

  const active = categories.some((c) => c.id === category) ? category : 'all';
  const showFood = active !== 'requests';
  const items = active === 'all' ? filtered : filtered.filter((i) => i.cat === active);
  const toggleDiet = (d) => setDiet((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  const filtering = Boolean(q) || diet.length > 0;
  const clearFilters = () => {
    setQuery('');
    setDiet([]);
  };

  return (
    <div className="min-h-screen">
      <Header mode="guest" onCartClick={() => setCartOpen(true)} onSignIn={() => setSignInOpen(true)} />

      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 pb-32 pt-5 outline-none sm:px-6 lg:pb-12">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {guest || visitor
            ? t('guest.hello', { name: guest?.firstName ?? visitor?.name })
            : customerContext.mode === 'table' ? (desk ? loc(desk.name) : t('ctx.restaurant')) : t('menu.title')}
        </h1>
        <p className="mb-4 mt-1 text-slate-700 dark:text-slate-300">
          {customerContext.mode === 'table' ? t('menu.subtitleDesk', { place: desk ? loc(desk.name) : t('ctx.restaurant') }) : t('menu.subtitle')}
        </p>

        <ContextBar onRequests={() => setCategory('requests')} onSignIn={() => setSignInOpen(true)} />

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600 dark:text-slate-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('menu.search')}
            placeholder={t('menu.search')}
            className={`${inputCls} pl-11 pr-11`}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t('menu.clearSearch')}
              className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        {/* Category navigation stays on screen while scrolling the menu */}
        <div className="sticky top-16 z-30 -mx-4 mt-2 bg-surface/95 px-4 backdrop-blur dark:bg-ink/95 sm:mx-0 sm:px-0">
          <CategoryTabs categories={categories} active={active} onChange={setCategory} />
        </div>

        {showFood ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label={t('menu.filterBy')}>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('menu.filterBy')}:</span>
              {DIETARY_TAGS.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={diet.includes(d)}
                  onClick={() => toggleDiet(d)}
                  className={`chip min-h-[40px] px-3 text-xs ${diet.includes(d) ? 'chip-on' : 'chip-off'}`}
                >
                  {t(`diet.${d}`)}
                </button>
              ))}
              {filtering && (
                <button type="button" onClick={clearFilters} className="text-sm font-semibold text-brand underline underline-offset-2">
                  {t('menu.clearFilters')}
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{t('menu.allergenNote')}</p>

            <p role="status" className="sr-only">{t('menu.resultCount', { count: items.length })}</p>

            {items.length > 0 ? (
              <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <li key={item.id} className="flex">
                    <div className="flex w-full flex-col [&>article]:flex-1">
                      <MenuCard item={item} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="card mt-4 p-8 text-center">
                <p className="font-semibold">{offered.length === 0 ? t('menu.noneHere') : t('menu.empty')}</p>
                {filtering && (
                  <button type="button" className="btn-ghost mt-3" onClick={clearFilters}>
                    {t('menu.clearFilters')}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <ServiceRequests />
        )}

        <DemoNotice scope="customer" className="mt-8" />
      </main>

      {/* Phone cart bar: item count and subtotal, always one tap away */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 p-3 lg:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="btn-gold w-full justify-between px-5 py-3 text-base shadow-lift"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" aria-hidden />
              {t('menu.viewCart')} · {t('menu.items', { count: cartCount })}
            </span>
            <span className="tabular-nums">{money(subtotalEtb)}</span>
          </button>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onSignIn={() => setSignInOpen(true)} />
      <GuestLogin open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}
