// DEMO DATA. Accounts, PINs and passwords live in the browser (localStorage),
// so none of this is secure. In production, authenticate on a server
// (hashed credentials, server-side sessions, rate limiting) and read stays
// from your property-management system.

export const ROLES = ['kitchen', 'frontdesk', 'admin'];

// Service points other than guest rooms. Each has its own QR: /menu?desk=<id>
// kind: 'table' = a restaurant table, 'venue' = a named venue (bar, lounge, spa, terrace).
export const DESKS = [
  { id: 'lobby', kind: 'venue', name: { en: 'Lobby Lounge', am: 'የሎቢ ላውንጅ' } },
  { id: 'pool', kind: 'venue', name: { en: 'Pool Bar', am: 'የመዋኛ ገንዳ ባር' } },
  // One QR per restaurant table so staff know exactly where to serve.
  { id: 'table-1', kind: 'table', name: { en: 'Restaurant · Table 1', am: 'ምግብ ቤት · ጠረጴዛ 1' } },
  { id: 'table-2', kind: 'table', name: { en: 'Restaurant · Table 2', am: 'ምግብ ቤት · ጠረጴዛ 2' } },
  { id: 'table-3', kind: 'table', name: { en: 'Restaurant · Table 3', am: 'ምግብ ቤት · ጠረጴዛ 3' } },
  { id: 'table-4', kind: 'table', name: { en: 'Restaurant · Table 4', am: 'ምግብ ቤት · ጠረጴዛ 4' } },
  { id: 'table-5', kind: 'table', name: { en: 'Restaurant · Table 5', am: 'ምግብ ቤት · ጠረጴዛ 5' } },
  { id: 'table-6', kind: 'table', name: { en: 'Restaurant · Table 6', am: 'ምግብ ቤት · ጠረጴዛ 6' } },
  { id: 'spa', kind: 'venue', name: { en: 'Spa Reception', am: 'የስፓ መቀበያ' } },
  { id: 'terrace', kind: 'venue', name: { en: 'Terrace Café', am: 'የሰገነት ካፌ' } },
];
export const DESKS_BY_ID = Object.fromEntries(DESKS.map((d) => [d.id, d]));

/**
 * Menu "channels": which menu an item is offered on. An item with no `channels` list is offered
 * everywhere. 'room' = room-service menu, 'restaurant' = all restaurant tables, others = one venue.
 */
export const deskChannel = (deskId) => (DESKS_BY_ID[deskId]?.kind === 'table' ? 'restaurant' : deskId);
export const CHANNELS = [
  { id: 'room', name: { en: 'Room service menu', am: 'የክፍል አገልግሎት ሜኑ' } },
  { id: 'restaurant', name: { en: 'Restaurant (all tables)', am: 'ምግብ ቤት (ሁሉም ጠረጴዛዎች)' } },
  ...DESKS.filter((d) => d.kind === 'venue').map((d) => ({ id: d.id, name: d.name })),
];
export const offeredAt = (item, channel) => !item.channels || item.channels.includes(channel);

/** Where an order is delivered: 'room' | 'table' | 'venue'. */
export const orderPlace = (o) =>
  o.delivery?.type === 'desk' ? DESKS_BY_ID[o.delivery.id]?.kind ?? 'venue' : 'room';

export function seedStaff() {
  return [
    { id: 'staff-kitchen', name: 'Kitchen Team', username: 'kitchen', password: 'kitchen123', role: 'kitchen' },
    { id: 'staff-desk', name: 'Front Desk', username: 'frontdesk', password: 'frontdesk123', role: 'frontdesk' },
    { id: 'staff-admin', name: 'Hotel Admin', username: 'admin', password: 'admin123', role: 'admin' },
  ];
}

const DAY = 24 * 3600 * 1000;

// A "stay" is one guest's booking. The guest signs in with room + last name + PIN
// while status is 'in-house'; checking out disables sign-in immediately.
export function seedStays() {
  const stay = (room, firstName, lastName, pin, daysAgo, nights) => ({
    id: `stay-${room}`, room, firstName, lastName, pin,
    status: 'in-house', checkedInAt: Date.now() - daysAgo * DAY, nights,
  });
  return [
    stay('304', 'Abebe', 'Bekele', '4821', 1, 3),
    stay('103', 'Hana', 'Tesfaye', '5210', 2, 4),
    stay('107', 'Daniel', 'Mekonnen', '3384', 1, 2),
    stay('204', 'Yonas', 'Alemu', '2095', 0, 5),
    stay('205', 'Meron', 'Haile', '6843', 3, 6),
    stay('301', 'Liya', 'Assefa', '9072', 1, 3),
    stay('302', 'Kebede', 'Worku', '4468', 2, 4),
    stay('306', 'Tigist', 'Desta', '3109', 0, 2),
  ];
}

/** Total of this stay's food orders charged to the room folio (ETB). */
export function folioBalance(orders, stay) {
  return orders
    .filter((o) => o.type === 'food' && o.payment === 'folio' && o.stayId === stay.id)
    .reduce((sum, o) => sum + o.total, 0);
}
