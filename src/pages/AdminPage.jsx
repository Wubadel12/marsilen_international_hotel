import { useState } from 'react';
import {
  BedDouble, ClipboardList, QrCode, ShieldCheck, UserCog, UtensilsCrossed,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePageTitle } from '../hooks/usePageTitle';
import Header from '../components/Header';
import { DemoNotice } from '../components/ui';
import OverviewTab from '../components/admin/OverviewTab';
import StaysTab from '../components/admin/StaysTab';
import MenuTab from '../components/admin/MenuTab';
import QrTab from '../components/admin/QrTab';
import StaffTab from '../components/admin/StaffTab';

const TABS = [
  { id: 'overview', key: 'admin.tab.overview', Icon: ClipboardList, Panel: OverviewTab },
  { id: 'stays', key: 'admin.tab.stays', Icon: BedDouble, Panel: StaysTab },
  { id: 'menu', key: 'admin.tab.menu', Icon: UtensilsCrossed, Panel: MenuTab },
  { id: 'qr', key: 'admin.tab.qr', Icon: QrCode, Panel: QrTab },
  { id: 'staff', key: 'admin.tab.staff', Icon: UserCog, Panel: StaffTab },
];

export default function AdminPage() {
  const { t } = useApp();
  usePageTitle(t('admin.title'));
  const [tab, setTab] = useState('overview');
  const active = TABS.find((x) => x.id === tab);

  // Arrow keys / Home / End move between tabs (roving tabindex).
  const onKeyDown = (e) => {
    const i = TABS.findIndex((x) => x.id === tab);
    let next = null;
    if (e.key === 'ArrowRight') next = TABS[(i + 1) % TABS.length];
    else if (e.key === 'ArrowLeft') next = TABS[(i - 1 + TABS.length) % TABS.length];
    else if (e.key === 'Home') next = TABS[0];
    else if (e.key === 'End') next = TABS[TABS.length - 1];
    if (!next) return;
    e.preventDefault();
    setTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <div className="min-h-screen">
      <Header mode="staff" />
      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 pb-12 pt-6 outline-none sm:px-6">
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl print:hidden">
          <ShieldCheck className="h-7 w-7 text-brand" aria-hidden />
          {t('admin.title')}
        </h1>
        <DemoNotice scope="admin" className="mt-3 print:hidden" />

        <div
          role="tablist"
          aria-label={t('admin.title')}
          onKeyDown={onKeyDown}
          className="scrollbar-none mt-5 flex gap-2 overflow-x-auto py-1 print:hidden"
        >
          {TABS.map(({ id, key, Icon }) => (
            <button
              key={id}
              id={`tab-${id}`}
              role="tab"
              type="button"
              tabIndex={tab === id ? 0 : -1}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={`chip ${tab === id ? 'chip-on' : 'chip-off'}`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {t(key)}
            </button>
          ))}
        </div>

        <div id={`panel-${active.id}`} role="tabpanel" aria-labelledby={`tab-${active.id}`} className="mt-6">
          <active.Panel />
        </div>
      </main>
    </div>
  );
}
