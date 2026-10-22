import { useEffect, useRef, useState } from 'react';
import { Save, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ALLERGENS, CATEGORIES, DIETARY_TAGS } from '../../data/mock';
import { CHANNELS } from '../../data/accounts';
import { Field, Switch, inputCls } from '../ui';

const FOOD_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'all' && c.id !== 'amenities');

const toForm = (i) => ({
  nameEn: i?.name?.en ?? '',
  nameAm: i?.name?.am ?? '',
  descEn: i?.desc?.en ?? '',
  descAm: i?.desc?.am ?? '',
  price: i ? String(i.price) : '',
  cat: i?.cat ?? FOOD_CATEGORIES[0].id,
  img: i?.img ?? '',
  prep: i ? String(i.prep) : '',
  tags: i?.tags ?? [],
  allergens: i?.allergens ?? [],
  available: i ? i.available !== false : true,
  everywhere: !i?.channels,
  channels: i?.channels ?? [],
});

const isHttpUrl = (s) => {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function CheckGroup({ legend, hint, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{legend}</legend>
      {hint && <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.id}
            className={`chip cursor-pointer has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-amber-600/50 ${value.includes(o.id) ? 'chip-on' : 'chip-off'}`}
          >
            <input type="checkbox" className="sr-only" checked={value.includes(o.id)} onChange={() => onChange(toggle(value, o.id))} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Add / edit one menu item. Demo only: saved in this browser, not on a server. */
export default function MenuEditor({ item, onSave, onCancel }) {
  const { t, loc } = useApp();
  const [f, setF] = useState(() => toForm(item));
  const [errors, setErrors] = useState({});
  const nameRef = useRef(null);
  const wrapRef = useRef(null);
  const isNew = !item;

  useEffect(() => {
    wrapRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    nameRef.current?.focus({ preventScroll: true });
  }, []);

  const set = (k) => (e) => setF((cur) => ({ ...cur, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (f.nameEn.trim().length < 2) err.nameEn = t('val.nameRequired');
    const price = Number(f.price);
    if (f.price === '' || !Number.isFinite(price) || price < 0 || price > 100000) err.price = t('val.price');
    const prep = Number(f.prep);
    if (f.prep === '' || !Number.isInteger(prep) || prep < 1 || prep > 180) err.prep = t('val.prep');
    if (f.img.trim() && !isHttpUrl(f.img.trim())) err.img = t('val.imageUrl');
    if (!f.everywhere && f.channels.length === 0) err.channels = t('val.channels');
    setErrors(err);
    if (Object.keys(err).length) {
      // Move focus to the first problem so keyboard and screen-reader users land on it.
      const first = ['nameEn', 'price', 'prep', 'img', 'channels'].find((k) => err[k]);
      wrapRef.current?.querySelector(`[data-field="${first}"]`)?.focus();
      return;
    }
    const out = {
      ...(item?.id ? { id: item.id } : {}),
      cat: f.cat,
      price: Math.round(price),
      prep,
      tags: f.tags,
      allergens: f.allergens,
      available: f.available,
      img: f.img.trim(),
      emoji: item?.emoji ?? '🍽️',
      name: { en: f.nameEn.trim(), ...(f.nameAm.trim() ? { am: f.nameAm.trim() } : {}) },
      desc: { en: f.descEn.trim(), ...(f.descAm.trim() ? { am: f.descAm.trim() } : {}) },
      ...(f.everywhere ? {} : { channels: f.channels }),
    };
    onSave(out, isNew);
  };

  const imgOk = f.img.trim() && isHttpUrl(f.img.trim());

  return (
    <section ref={wrapRef} aria-labelledby="editor-title" className="card border-2 border-amber-700 p-5 dark:border-amber-400">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="editor-title" className="text-lg font-bold">{isNew ? t('menuAdmin.addTitle') : t('menuAdmin.editTitle', { name: loc(item.name) })}</h2>
          <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">{t('stays.required')} {t('demo.local')}</p>
        </div>
        <button type="button" onClick={onCancel} aria-label={t('common.cancel')} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-5" noValidate>
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="rounded-xl border border-red-700 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900 dark:bg-red-500/10 dark:text-red-200">
            {t('val.fixErrors', { count: Object.keys(errors).length })}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t('menuAdmin.nameEn')} error={errors.nameEn} required>
            {(p) => <input {...p} data-field="nameEn" ref={nameRef} className={inputCls} value={f.nameEn} onChange={set('nameEn')} maxLength={60} />}
          </Field>
          <Field label={t('menuAdmin.nameAm')} hint={t('menuAdmin.amHint')}>
            {(p) => <input {...p} lang="am" className={inputCls} value={f.nameAm} onChange={set('nameAm')} maxLength={60} />}
          </Field>
          <Field label={t('menuAdmin.descEn')}>
            {(p) => <textarea {...p} rows={3} className={`${inputCls} resize-y py-2`} value={f.descEn} onChange={set('descEn')} maxLength={200} />}
          </Field>
          <Field label={t('menuAdmin.descAm')}>
            {(p) => <textarea {...p} lang="am" rows={3} className={`${inputCls} resize-y py-2`} value={f.descAm} onChange={set('descAm')} maxLength={200} />}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('menuAdmin.priceEtb')} error={errors.price} required>
            {(p) => <input {...p} data-field="price" className={`${inputCls} text-right tabular-nums`} type="number" inputMode="numeric" min="0" step="5" value={f.price} onChange={set('price')} />}
          </Field>
          <Field label={t('menuAdmin.prep')} error={errors.prep} hint={t('menuAdmin.prepHint')} required>
            {(p) => <input {...p} data-field="prep" className={`${inputCls} text-right tabular-nums`} type="number" inputMode="numeric" min="1" max="180" value={f.prep} onChange={set('prep')} />}
          </Field>
          <Field label={t('menuAdmin.category')} required>
            {(p) => (
              <select {...p} className={inputCls} value={f.cat} onChange={set('cat')}>
                {FOOD_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{t(c.key)}</option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <div className="grid items-start gap-4 sm:grid-cols-[1fr_96px]">
          <Field label={t('menuAdmin.image')} hint={t('menuAdmin.imageHint')} error={errors.img}>
            {(p) => <input {...p} data-field="img" className={inputCls} type="url" inputMode="url" placeholder="https://" value={f.img} onChange={set('img')} />}
          </Field>
          <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-xl bg-amber-100 text-3xl dark:bg-navy-900" aria-hidden>
            {imgOk ? <img src={f.img.trim()} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : (item?.emoji ?? '🍽️')}
          </div>
        </div>

        <CheckGroup
          legend={t('menuAdmin.dietary')}
          options={DIETARY_TAGS.map((d) => ({ id: d, label: t(`diet.${d}`) }))}
          value={f.tags}
          onChange={(tags) => setF((c) => ({ ...c, tags }))}
        />
        <CheckGroup
          legend={t('menuAdmin.allergens')}
          hint={t('menuAdmin.allergensHint')}
          options={ALLERGENS.map((a) => ({ id: a, label: t(`allergen.${a}`) }))}
          value={f.allergens}
          onChange={(allergens) => setF((c) => ({ ...c, allergens }))}
        />

        <fieldset>
          <legend className="text-sm font-semibold">{t('menuAdmin.offeredAt')}</legend>
          <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">{t('menuAdmin.offeredHint')}</p>
          <label className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-5 w-5 accent-amber-700"
              checked={f.everywhere}
              onChange={(e) => setF((c) => ({ ...c, everywhere: e.target.checked }))}
            />
            {t('menuAdmin.allPlaces')}
          </label>
          {!f.everywhere && (
            <div className="mt-1">
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('menuAdmin.offeredAt')}>
                {CHANNELS.map((c, idx) => (
                  <label
                    key={c.id}
                    className={`chip cursor-pointer has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-amber-600/50 ${f.channels.includes(c.id) ? 'chip-on' : 'chip-off'}`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      data-field={idx === 0 ? 'channels' : undefined}
                      checked={f.channels.includes(c.id)}
                      onChange={() => setF((cur) => ({ ...cur, channels: toggle(cur.channels, c.id) }))}
                    />
                    {loc(c.name)}
                  </label>
                ))}
              </div>
              {errors.channels && <p role="alert" className="mt-1 text-xs font-semibold text-red-700 dark:text-red-400">{errors.channels}</p>}
            </div>
          )}
        </fieldset>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-100 p-3 dark:bg-white/5">
          <div>
            <p className="text-sm font-semibold">{t('menuAdmin.available')}</p>
            <p className="text-xs text-slate-700 dark:text-slate-300">{f.available ? t('menuAdmin.availOn') : t('menuAdmin.availOff')}</p>
          </div>
          <Switch checked={f.available} onChange={(v) => setF((c) => ({ ...c, available: v }))} label={t('menuAdmin.available')} />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onCancel}>{t('common.cancel')}</button>
          <button type="submit" className="btn-gold">
            <Save className="h-4 w-4" aria-hidden />
            {isNew ? t('menuAdmin.addSave') : t('menuAdmin.save')}
          </button>
        </div>
      </form>
    </section>
  );
}
