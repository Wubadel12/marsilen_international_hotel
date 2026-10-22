import { useMemo, useState } from 'react';
import { Copy, ExternalLink, Printer, TriangleAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';
import { DESKS } from '../../data/accounts';
import { Field, SourceBadge, inputCls } from '../ui';

const GROUPS = ['room', 'table', 'venue'];

/** One printable QR. Always dark-on-white so it scans in dark mode and prints cleanly. */
function QrCard({ kind, title, url, flow, requests }) {
  const { t, notify } = useApp();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      notify(t('qr.copied'));
    } catch {
      notify(t('qr.copyFailed'));
    }
  };

  return (
    <figure className="card flex break-inside-avoid flex-col gap-3 p-4 print:border print:bg-white print:text-black print:shadow-none">
      <div className="flex items-start justify-between gap-2">
        <SourceBadge kind={kind} />
      </div>
      <div className="mx-auto rounded-xl bg-white p-2">
        <QRCodeSVG value={url} size={132} level="M" marginSize={1} title={`${title}: ${url}`} />
      </div>
      <figcaption className="space-y-1.5">
        <p className="text-center text-lg font-bold leading-tight">{title}</p>
        <p className="text-center text-xs font-semibold text-slate-700 print:text-black dark:text-slate-300">{t('qr.scanTo')}</p>
        <dl className="space-y-1 rounded-lg bg-slate-100 p-2 text-xs print:hidden dark:bg-white/5">
          <div>
            <dt className="font-semibold">{t('qr.flow')}</dt>
            <dd className="text-slate-700 dark:text-slate-300">{flow}</dd>
          </div>
          <div>
            <dt className="font-semibold">{t('qr.offers')}</dt>
            <dd className="text-slate-700 dark:text-slate-300">{requests}</dd>
          </div>
        </dl>
        <div className="flex items-center justify-center gap-1 print:hidden">
          <button type="button" onClick={copy} className="btn-ghost min-h-[40px] px-3 text-xs">
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {t('qr.copy')}
            <span className="sr-only"> {title}</span>
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="btn-ghost min-h-[40px] px-3 text-xs">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            {t('qr.preview')}
            <span className="sr-only"> {title} ({t('common.newTab')})</span>
          </a>
        </div>
      </figcaption>
    </figure>
  );
}

export default function QrTab() {
  const { t, loc, rooms } = useApp();
  const [base, setBase] = useState(() => window.location.origin);
  const [group, setGroup] = useState('all');

  const parsed = useMemo(() => {
    try {
      const u = new URL(base.trim());
      return u.protocol === 'http:' || u.protocol === 'https:' ? u : null;
    } catch {
      return null;
    }
  }, [base]);
  const baseError = parsed ? '' : t('qr.baseInvalid');
  const cleanBase = (parsed ? parsed.origin + parsed.pathname : window.location.origin).replace(/\/+$/, '');
  const isLocal = parsed && /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(parsed.hostname);

  const roomNumbers = useMemo(() => Object.keys(rooms).sort(), [rooms]);
  const tables = DESKS.filter((d) => d.kind === 'table');
  const venues = DESKS.filter((d) => d.kind === 'venue');

  const sections = {
    room: { title: t('qr.rooms'), desc: t('qr.roomsDesc'), count: roomNumbers.length },
    table: { title: t('qr.tables'), desc: t('qr.tablesDesc'), count: tables.length },
    venue: { title: t('qr.venues'), desc: t('qr.venuesDesc'), count: venues.length },
  };
  const show = (g) => group === 'all' || group === g;

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-5 print:hidden">
        <div>
          <h2 className="text-lg font-bold">{t('admin.tab.qr')}</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-700 dark:text-slate-300">{t('qr.help')}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t('qr.baseUrl')} error={baseError} hint={t('qr.baseHint')} className="min-w-[260px] flex-1">
            {(p) => <input {...p} className={inputCls} type="url" value={base} onChange={(e) => setBase(e.target.value)} />}
          </Field>
          <button type="button" className="btn-gold" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden />
            {t('qr.print')}
          </button>
        </div>
        {isLocal && (
          <p role="note" className="flex items-start gap-2 rounded-xl border border-amber-600/50 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t('qr.localWarn')}
          </p>
        )}
        <div role="group" aria-label={t('qr.filter')} className="flex flex-wrap gap-2">
          {['all', ...GROUPS].map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={group === g}
              onClick={() => setGroup(g)}
              className={`chip ${group === g ? 'chip-on' : 'chip-off'}`}
            >
              {g === 'all' ? t('common.all') : sections[g].title}
              {g !== 'all' && <span className="tabular-nums opacity-80">{sections[g].count}</span>}
            </button>
          ))}
        </div>
      </div>

      {show('room') && (
        <section aria-labelledby="qr-rooms">
          <h3 id="qr-rooms" className="text-lg font-bold">{sections.room.title}</h3>
          <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">{sections.room.desc}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {roomNumbers.map((n) => (
              <QrCard
                key={n}
                kind="room"
                title={t('header.room', { room: n })}
                url={`${cleanBase}/menu?room=${n}`}
                flow={t('qr.flowRoom')}
                requests={t('qr.offersRoom')}
              />
            ))}
          </div>
        </section>
      )}

      {show('table') && (
        <section aria-labelledby="qr-tables">
          <h3 id="qr-tables" className="text-lg font-bold">{sections.table.title}</h3>
          <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">{sections.table.desc}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {tables.map((d) => (
              <QrCard
                key={d.id}
                kind="table"
                title={loc(d.name)}
                url={`${cleanBase}/menu?desk=${d.id}`}
                flow={t('qr.flowVenue')}
                requests={t('qr.offersDesk')}
              />
            ))}
          </div>
        </section>
      )}

      {show('venue') && (
        <section aria-labelledby="qr-venues">
          <h3 id="qr-venues" className="text-lg font-bold">{sections.venue.title}</h3>
          <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">{sections.venue.desc}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {venues.map((d) => (
              <QrCard
                key={d.id}
                kind="venue"
                title={loc(d.name)}
                url={`${cleanBase}/menu?desk=${d.id}`}
                flow={t('qr.flowVenue')}
                requests={t('qr.offersDesk')}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
