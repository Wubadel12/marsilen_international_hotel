import { memo, useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import DietBadge from './DietBadge';
import QuantityStepper from './QuantityStepper';

function MenuCard({ item }) {
  const { t, loc, money, cart, addItem, setQty } = useApp();
  const [imgOk, setImgOk] = useState(Boolean(item.img));
  const qty = cart[item.id]?.qty || 0;
  const name = loc(item.name);
  const soldOut = item.available === false;
  const allergens = item.allergens ?? [];

  return (
    <article className={`card group flex h-full w-full flex-col overflow-hidden ${soldOut ? 'opacity-80' : ''}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-amber-100 dark:bg-navy-900">
        {imgOk ? (
          <img src={item.img} alt={name} loading="lazy" onError={() => setImgOk(false)} className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${soldOut ? 'grayscale' : ''}`} />
        ) : (
          <div role="img" aria-label={`${name}. ${t('menu.imageUnavailable')}`} className="grid h-full w-full place-items-center text-6xl">{item.emoji ?? '🍽️'}</div>
        )}
        {(item.tags ?? []).length > 0 && (
          <ul className="absolute left-3 top-3 flex flex-wrap gap-1.5" aria-label={t('menu.dietary')}>
            {(item.tags ?? []).map((tag) => <li key={tag}><DietBadge tag={tag} /></li>)}
          </ul>
        )}
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-navy-900/90 px-2.5 py-1 text-xs font-semibold text-white shadow" aria-label={t('menu.minutes', { min: item.prep })}>
          <Clock className="h-3.5 w-3.5" aria-hidden />{t('menu.minutes', { min: item.prep })}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-base font-bold leading-snug sm:text-lg">{name}</h3>
          <p className="shrink-0 text-lg font-extrabold tabular-nums text-brand">{money(item.price)}</p>
        </div>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-700 dark:text-slate-300">{loc(item.desc)}</p>
        {allergens.length > 0 && <p className="mt-2 text-xs font-semibold text-red-800 dark:text-red-300">{t('menu.contains')}: {allergens.map((a) => t(`allergen.${a}`)).join(', ')}</p>}
        <div className="mt-auto pt-4">
          {soldOut ? (
            <span className="flex min-h-[44px] items-center justify-center rounded-xl bg-slate-200 px-3 text-sm font-semibold text-slate-800 dark:bg-white/10 dark:text-slate-200">{t('menu.soldOut')}<span className="sr-only"> {name}</span></span>
          ) : qty === 0 ? (
            <button type="button" className="btn-gold w-full" onClick={() => addItem(item.id)}>
              <Plus className="h-4 w-4" aria-hidden />{t('menu.add')}<span className="sr-only"> {name}</span>
            </button>
          ) : <div className="flex justify-center"><QuantityStepper qty={qty} name={name} onChange={(n) => setQty(item.id, n)} /></div>}
        </div>
      </div>
    </article>
  );
}

export default memo(MenuCard);
