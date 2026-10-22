import {
  Bell, Coffee, CakeSlice, LayoutGrid, Soup, Sunrise,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const ICONS = {
  all: LayoutGrid,
  breakfast: Sunrise,
  main: Soup,
  drinks: Coffee,
  desserts: CakeSlice,
  requests: Bell,
};

/**
 * Category navigation. Plain buttons with aria-current (these filter one list, they are not tabs).
 * categories = [{ id, label, count? }]. A fade on the right edge hints that the row scrolls on phones.
 */
export default function CategoryTabs({ categories, active, onChange }) {
  const { t } = useApp();
  return (
    <nav aria-label={t('menu.categories')} className="relative">
      <ul className="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0">
        {categories.map((c) => {
          const Icon = ICONS[c.id] ?? LayoutGrid;
          const on = active === c.id;
          return (
            <li key={c.id} className="snap-start">
              <button
                type="button"
                aria-current={on ? 'true' : undefined}
                onClick={() => onChange(c.id)}
                className={`chip ${on ? 'chip-on' : 'chip-off'}`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {c.label}
                {typeof c.count === 'number' && <span className="text-xs tabular-nums opacity-80">{c.count}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent dark:from-ink sm:hidden"
      />
    </nav>
  );
}
