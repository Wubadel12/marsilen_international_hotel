import { useState } from 'react';
import { Eye, EyeOff, Trash2, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../data/accounts';
import { Badge, Field, inputCls } from '../ui';

const EMPTY = { name: '', username: '', password: '', role: 'kitchen' };
const USERNAME_RE = /^[a-z0-9._-]{3,24}$/;
const ROLE_TONE = { kitchen: 'warn', frontdesk: 'info', admin: 'danger' };

export default function StaffTab() {
  const { t, notify } = useApp();
  const { staff, staffAccounts, addStaff, removeStaff, updateStaffRole } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [done, setDone] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (form.name.trim().length < 2) err.name = t('val.nameRequired');
    if (!USERNAME_RE.test(form.username.trim().toLowerCase())) err.username = t('val.username');
    if (form.password.length < 8) err.password = t('staffAdmin.weak');
    setErrors(err);
    setDone('');
    if (Object.keys(err).length) return;
    const res = addStaff(form);
    if (res.ok) {
      setDone(t('staffAdmin.created', { name: form.name.trim() }));
      setForm(EMPTY);
      setShowPw(false);
    } else {
      setErrors({ username: t(res.error === 'exists' ? 'staffAdmin.exists' : 'staffAdmin.weak') });
    }
  };

  const changeRole = (a, role) => {
    const res = updateStaffRole(a.id, role);
    notify(res.ok ? t('staffAdmin.roleChanged', { name: a.name, role: t(`role.${role}`) }) : t('staffAdmin.lastAdmin'));
  };

  const remove = (a) => {
    if (!removeStaff(a.id)) notify(t('staffAdmin.lastAdmin'));
    else notify(t('staffAdmin.removed', { name: a.name }));
    setConfirmId(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6 self-start">
        <section aria-labelledby="roles-title" className="card p-5">
          <h2 id="roles-title" className="text-lg font-bold">{t('staffAdmin.rolesTitle')}</h2>
          <dl className="mt-3 space-y-3 text-sm">
            {ROLES.map((r) => (
              <div key={r}>
                <dt><Badge tone={ROLE_TONE[r]}>{t(`role.${r}`)}</Badge></dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">{t(`roleinfo.${r}`)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="add-staff" className="card p-5">
          <h2 id="add-staff" className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="h-5 w-5 text-brand" aria-hidden />
            {t('staffAdmin.add')}
          </h2>
          <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{t('stays.required')}</p>
          <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
            <Field label={t('staffAdmin.name')} error={errors.name} required>
              {(p) => <input {...p} className={inputCls} value={form.name} onChange={set('name')} autoComplete="off" />}
            </Field>
            <Field label={t('staffLogin.username')} error={errors.username} hint={t('staffAdmin.usernameHint')} required>
              {(p) => <input {...p} className={inputCls} value={form.username} onChange={set('username')} autoComplete="off" autoCapitalize="none" />}
            </Field>
            <Field label={t('staffLogin.password')} error={errors.password} hint={t('staffAdmin.passwordHint')} required>
              {(p) => (
                <div className="relative">
                  <input {...p} className={`${inputCls} pr-12`} type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete="new-password" />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-pressed={showPw}
                    aria-label={showPw ? t('staffAdmin.hidePw') : t('staffAdmin.showPw')}
                    className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
              )}
            </Field>
            <Field label={t('staffAdmin.role')} hint={t(`roleinfo.${form.role}`)} required>
              {(p) => (
                <select {...p} className={inputCls} value={form.role} onChange={set('role')}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{t(`role.${r}`)}</option>
                  ))}
                </select>
              )}
            </Field>
            <button type="submit" className="btn-gold w-full">{t('staffAdmin.create')}</button>
            {done && (
              <p role="status" className="rounded-xl border border-emerald-600/40 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-100">
                {done} {t('demo.local')}
              </p>
            )}
          </form>
        </section>
      </div>

      <section aria-labelledby="staff-list" className="card self-start p-5">
        <h2 id="staff-list" className="text-lg font-bold">
          {t('admin.tab.staff')} <span className="text-slate-600 dark:text-slate-300">({staffAccounts.length})</span>
        </h2>
        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{t('staffAdmin.listNote')}</p>
        <ul className="mt-3 divide-y divide-slate-200 dark:divide-white/10">
          {staffAccounts.map((a) => {
            const self = staff?.id === a.id;
            return (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {a.name}
                    {self && <Badge tone="warn">{t('staffAdmin.you')}</Badge>}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300">@{a.username}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`role-${a.id}`}>{t('staffAdmin.roleFor', { name: a.name })}</label>
                  <select
                    id={`role-${a.id}`}
                    className={`${inputCls} min-h-[44px] w-auto`}
                    value={a.role}
                    disabled={self}
                    title={self ? t('staffAdmin.selfRole') : undefined}
                    onChange={(e) => changeRole(a, e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{t(`role.${r}`)}</option>
                    ))}
                  </select>
                  {confirmId === a.id ? (
                    <>
                      <button type="button" className="btn-danger" onClick={() => remove(a)}>{t('staffAdmin.confirmRemove')}</button>
                      <button type="button" className="btn-ghost" onClick={() => setConfirmId(null)}>{t('common.cancel')}</button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={self}
                      onClick={() => setConfirmId(a.id)}
                      aria-label={t('staffAdmin.remove', { name: a.name })}
                      title={self ? t('staffAdmin.selfRemove') : undefined}
                      className="grid h-11 w-11 place-items-center rounded-xl text-slate-700 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
