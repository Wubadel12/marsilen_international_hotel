import { Link, useNavigate } from 'react-router-dom';
import {
  ConciergeBell, LayoutDashboard, LogIn, LogOut, MapPin, Moon, ShieldCheck, ShoppingBag, Sun,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { HOTEL } from '../data/mock';
import { useDesk } from '../hooks/useDesk';
import LanguageToggle from './LanguageToggle';

const iconBtn =
  'relative inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-2.5 text-sm font-medium text-navy-900 transition hover:bg-white active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10';

/**
 * mode = 'public' (login pages) | 'guest' (customer pages) | 'staff' (kitchen, front desk, admin)
 * Customer and staff headers are different on purpose: guests never see staff links.
 */
export default function Header({ mode = 'public', onCartClick, onSignIn }) {
  const { t, loc, cartCount, theme, setTheme } = useApp();
  const { guest, visitor, guestLogout, staff, staffLogout } = useAuth();
  const desk = useDesk();
  const navigate = useNavigate();
  const dark = theme === 'dark';
  const signedIn = Boolean(guest || visitor);

  const onGuestLogout = () => {
    guestLogout();
    navigate('/menu');
  };
  const onStaffLogout = () => {
    staffLogout();
    navigate('/staff/login');
  };

  return (
    <header className="glass sticky top-0 z-40 border-x-0 border-t-0 print:hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {t('a11y.skip')}
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-light to-gold text-white shadow-md shadow-amber-700/30">
            <ConciergeBell className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="flex items-center gap-1.5 truncate text-sm font-bold tracking-tight">
              <span className="hidden truncate min-[520px]:inline">{loc(HOTEL.name)}</span>
              <span className="hidden shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 min-[520px]:inline-flex dark:bg-amber-500/20 dark:text-amber-200">
                {t('demo.label')}
              </span>
            </p>
          {mode === 'guest' && (guest || visitor) && (
              <span className="mt-0.5 hidden max-w-full items-center gap-1 truncate rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 min-[520px]:inline-flex dark:bg-amber-500/15 dark:text-amber-300">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">
                  {guest
                    ? `${t('header.room', { room: guest.room })} · ${guest.firstName}`
                    : `${loc(desk?.name)} · ${visitor.name}`}
                </span>
              </span>
            )}
            {mode === 'staff' && staff && (
              <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                {t(staff.role === 'admin' ? 'area.admin' : 'area.staff')} · {staff.name} · {t(`role.${staff.role}`)}
              </p>
            )}
            {mode === 'public' && (
              <p className="hidden truncate text-xs text-slate-600 dark:text-slate-300 min-[420px]:block">{t('app.tagline')}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {mode === 'staff' && staff && (
            <>
              <Link to="/staff/dashboard" className={iconBtn} aria-label={t('nav.dashboard')}>
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t('nav.dashboard')}</span>
              </Link>
              {staff.role === 'admin' && (
                <Link to="/admin" className={iconBtn} aria-label={t('nav.admin')}>
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{t('nav.admin')}</span>
                </Link>
              )}
            </>
          )}

          <button
            type="button"
            className={iconBtn}
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            aria-label={dark ? t('header.themeToLight') : t('header.themeToDark')}
          >
            {dark ? <Sun className="h-[18px] w-[18px]" aria-hidden /> : <Moon className="h-[18px] w-[18px]" aria-hidden />}
          </button>

          <LanguageToggle />

          {mode === 'guest' && (
            <>
              <button type="button" className={iconBtn} onClick={onCartClick} aria-label={`${t('header.cart')} (${cartCount})`}>
                <ShoppingBag className="h-[18px] w-[18px]" aria-hidden />
                <span className="hidden sm:inline">{t('header.cart')}</span>
                {cartCount > 0 && (
                  <span
                    key={cartCount}
                    className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[20px] animate-pop place-items-center rounded-full bg-amber-700 px-1 text-[11px] font-bold text-white shadow"
                  >
                    {cartCount}
                  </span>
                )}
              </button>
              <button type="button" className={iconBtn} onClick={signedIn ? onGuestLogout : onSignIn} aria-label={signedIn ? t('logout') : t('login.submit')}>
                {signedIn ? <LogOut className="h-[18px] w-[18px]" aria-hidden /> : <LogIn className="h-[18px] w-[18px]" aria-hidden />}
                <span className="hidden sm:inline">{signedIn ? t('logout') : t('login.submit')}</span>
              </button>
            </>
          )}

          {mode === 'staff' && (
            <button type="button" className={iconBtn} onClick={onStaffLogout} aria-label={t('logout')}>
              <LogOut className="h-[18px] w-[18px]" aria-hidden />
              <span className="hidden md:inline">{t('logout')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
