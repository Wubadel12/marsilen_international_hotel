import { useMemo, useState } from 'react';
import { Pencil, Plus, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CATEGORIES } from '../../data/mock';
import { CHANNELS } from '../../data/accounts';
import { Badge, Switch, inputCls } from '../ui';
import MenuEditor from './MenuEditor';

const FOOD_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'all' && c.id !== 'amenities');

export default function MenuTab() {
  const { t, loc, menuItems, updateMenuItem, saveMenuItem, money } = useApp();
  const [editing, setEditing] = useState(null); // null | 'new' | item id
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');
  const [saved, setSaved] = useState(null);

  const q = query.trim().toLowerCase();
  const list = useMemo(
    () =>
      menuItems.filter(
        (i) =>
          (cat === 'all' || i.cat === cat) &&
          (!q || [i.name?.en, i.name?.am].some((s) => s?.toLowerCase().includes(q))),
      ),
    [menuItems, cat, q],
  );
  const editingItem = editing && editing !== 'new' ? menuItems.find((i) => i.id === editing) : null;
  const channelName = (id) => loc(CHANNELS.find((c) => c.id === id)?.name) || id;

  const onSave = (item, isNew) => {
    const s = saveMenuItem(item);
    setSaved({ name: loc(s.name), isNew });
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-lg font-bold">{t('admin.tab.menu')}</h2>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t('menuAdmin.help')}</p>
        </div>
        <button type="button" className="btn-gold" onClick={() => { setSaved(null); setEditing('new'); }}>
          <Plus className="h-4 w-4" aria-hidden />
          {t('menuAdmin.add')}
        </button>
      </div>

      {saved && (
        <p role="status" className="rounded-xl border border-emerald-600/40 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-100">
          {t(saved.isNew ? 'menuAdmin.addedMsg' : 'menuAdmin.savedMsg', { name: saved.name })} {t('demo.local')}
        </p>
      )}

      {editing && (
        <MenuEditor
          key={editing}
          item={editingItem}
          onSave={onSave}
          onCancel={() => setEditing(null)}
        />
      )}

      <section aria-labelledby="menu-list-title" className="card p-5">
        <h3 id="menu-list-title" className="sr-only">{t('menuAdmin.listTitle')}</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600 dark:text-slate-400" aria-hidden />
            <input
              type="search"
              className={`${inputCls} pl-11`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('menu.search')}
              aria-label={t('menu.search')}
            />
          </div>
          <select className={`${inputCls} w-auto`} value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t('menuAdmin.category')}>
            <option value="all">{t('cat.all')}</option>
            {FOOD_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{t(c.key)}</option>
            ))}
          </select>
          <p role="status" className="text-sm font-semibold">{t('menuAdmin.count', { count: list.length })}</p>
        </div>

        {list.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-100 p-6 text-center text-sm dark:bg-white/5">{t('menuAdmin.noMatch')}</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200 dark:divide-white/10">
            {list.map((item) => {
              const name = loc(item.name);
              const available = item.available !== false;
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-amber-100 text-2xl dark:bg-navy-900" aria-hidden>
                    {item.img ? <img src={item.img} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : item.emoji}
                  </div>
                  <div className="min-w-0 flex-1 basis-48">
                    <p className={`font-semibold ${available ? '' : 'text-slate-600 line-through dark:text-slate-400'}`}>{name}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      {t(`cat.${item.cat}`)} · {money(item.price, 'ETB')} · {t('menu.minutes', { min: item.prep })}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1">
                      {item.channels ? (
                        item.channels.map((c) => <Badge key={c} tone="venue">{channelName(c)}</Badge>)
                      ) : (
                        <Badge>{t('menuAdmin.allPlaces')}</Badge>
                      )}
                      {(item.allergens?.length ?? 0) > 0 && (
                        <Badge tone="danger">{t('menuAdmin.allergenCount', { count: item.allergens.length })}</Badge>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-xs font-semibold">
                      <Switch
                        checked={available}
                        onChange={(v) => updateMenuItem(item.id, { available: v })}
                        label={`${t('menuAdmin.available')}: ${name}`}
                      />
                      <span className="w-16">{available ? t('menuAdmin.availOnShort') : t('menu.soldOut')}</span>
                    </span>
                    <button type="button" className="btn-ghost px-3" onClick={() => { setSaved(null); setEditing(item.id); }}>
                      <Pencil className="h-4 w-4" aria-hidden />
                      {t('menuAdmin.edit')}
                      <span className="sr-only"> {name}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
