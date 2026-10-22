import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { useApp } from './AppContext';
import { DESKS_BY_ID, ROLES, seedStaff, seedStays } from '../data/accounts';

/**
 * Two separate sessions:
 *  - guest: an in-house stay, signed in with room + last name + PIN
 *  - staff: kitchen / front desk / admin, signed in with username + password
 *
 * DEMO ONLY: all of this lives in the browser. Use real server-side auth in production.
 * Must be rendered inside <AppProvider> (it updates room status and clears the cart).
 */
const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

const STAFF_TTL = 12 * 60 * 60 * 1000; // staff are signed out after 12 hours
const VISITOR_TTL = 4 * 60 * 60 * 1000; // walk-in visitors are signed out after 4 hours
const norm = (s) => String(s ?? '').trim().toLowerCase();
const randomPin = () => String(1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000));

export function AuthProvider({ children }) {
  const { setRoomStatus, clearCart } = useApp();

  const [stays, setStays] = usePersistentState('hms.stays.v3', seedStays);
  const [staffAccounts, setStaffAccounts] = usePersistentState('hms.staff.v3', seedStaff);
  const [guestSession, setGuestSession] = usePersistentState('hms.session.guest.v3', null);
  const [staffSession, setStaffSession] = usePersistentState('hms.session.staff.v3', null);

  // A guest session is valid only while that stay is still in-house, so a
  // check-out (even from another tab) ends access immediately.
  const guest = useMemo(
    () =>
      guestSession
        ? stays.find((s) => s.id === guestSession.stayId && s.status === 'in-house') ?? null
        : null,
    [guestSession, stays],
  );

  // The role always comes from the account list, never from what was stored.
  const staff = useMemo(() => {
    if (!staffSession || Date.now() - staffSession.at > STAFF_TTL) return null;
    const a = staffAccounts.find((x) => x.id === staffSession.id);
    return a ? { id: a.id, name: a.name, username: a.username, role: a.role } : null;
  }, [staffSession, staffAccounts]);

  // A visitor is a walk-in at a desk / table QR (no room, no folio). Name only; expires after 4 h.
  const visitor = useMemo(() => {
    const v = guestSession?.visitor;
    return v && guestSession.expiresAt > Date.now() ? v : null;
  }, [guestSession]);

  useEffect(() => {
    if (guestSession && !guest && !visitor) setGuestSession(null);
  }, [guestSession, guest, visitor, setGuestSession]);
  useEffect(() => {
    if (staffSession && !staff) setStaffSession(null);
  }, [staffSession, staff, setStaffSession]);

  // Never let one guest's cart leak to the next (sign-out, sign-in or check-out).
  const guestId = guest?.id ?? visitor?.id ?? '';
  const prevGuestId = useRef(guestId || guestSession?.stayId || guestSession?.visitor?.id || '');
  useEffect(() => {
    if (prevGuestId.current === guestId) return;
    const hadSession = prevGuestId.current !== '';
    prevGuestId.current = guestId;
    // Clear on sign-out, check-out or switching customer. A first sign-in keeps the cart.
    if (hadSession) clearCart();
  }, [guestId, clearCart]);

  /* ---------- guest ---------- */
  const guestLogin = useCallback(
    ({ room, lastName, pin }) => {
      const r = String(room).trim().toUpperCase();
      const stay = stays.find(
        (s) =>
          s.status === 'in-house' &&
          s.room.toUpperCase() === r &&
          norm(s.lastName) === norm(lastName) &&
          s.pin === String(pin).trim(),
      );
      // Same result for "no such room" and "wrong PIN" so nothing is revealed.
      if (!stay) return { ok: false };
      setGuestSession({ stayId: stay.id, at: Date.now() });
      return { ok: true };
    },
    [stays, setGuestSession],
  );
  const guestLogout = useCallback(() => setGuestSession(null), [setGuestSession]); // ends guest or visitor session

  const visitorLogin = useCallback(
    ({ name, deskId }) => {
      const n = String(name).trim().replace(/\s+/g, ' ');
      if (n.length < 2 || n.length > 40 || !DESKS_BY_ID[deskId]) return { ok: false };
      setGuestSession({
        visitor: { id: `visitor-${Date.now().toString(36)}`, name: n, deskId },
        at: Date.now(),
        expiresAt: Date.now() + VISITOR_TTL,
      });
      return { ok: true };
    },
    [setGuestSession],
  );

  /* ---------- staff ---------- */
  const staffLogin = useCallback(
    (username, password) => {
      const a = staffAccounts.find((x) => norm(x.username) === norm(username) && x.password === password);
      if (!a) return { ok: false };
      setStaffSession({ id: a.id, at: Date.now() });
      return { ok: true, role: a.role };
    },
    [staffAccounts, setStaffSession],
  );
  const staffLogout = useCallback(() => setStaffSession(null), [setStaffSession]);

  const addStaff = useCallback(
    ({ name, username, password, role }) => {
      const n = String(name).trim();
      const u = norm(username);
      if (!n || !u || String(password).length < 8 || !ROLES.includes(role)) return { ok: false, error: 'weak' };
      if (staffAccounts.some((a) => norm(a.username) === u)) return { ok: false, error: 'exists' };
      setStaffAccounts((cur) => [
        ...cur,
        { id: `staff-${Date.now().toString(36)}`, name: n, username: u, password, role },
      ]);
      return { ok: true };
    },
    [staffAccounts, setStaffAccounts],
  );

  /** Returns false when the account is the last administrator (or doesn't exist). */
  const removeStaff = useCallback(
    (id) => {
      const target = staffAccounts.find((a) => a.id === id);
      if (!target) return false;
      if (target.role === 'admin' && staffAccounts.filter((a) => a.role === 'admin').length <= 1) return false;
      setStaffAccounts((cur) => cur.filter((a) => a.id !== id));
      return true;
    },
    [staffAccounts, setStaffAccounts],
  );

  /** Change a staff member's role. The last administrator cannot be demoted. */
  const updateStaffRole = useCallback(
    (id, role) => {
      const target = staffAccounts.find((a) => a.id === id);
      if (!target || !ROLES.includes(role)) return { ok: false, error: 'invalid' };
      if (target.role === 'admin' && role !== 'admin' && staffAccounts.filter((a) => a.role === 'admin').length <= 1) {
        return { ok: false, error: 'lastAdmin' };
      }
      setStaffAccounts((cur) => cur.map((a) => (a.id === id ? { ...a, role } : a)));
      return { ok: true };
    },
    [staffAccounts, setStaffAccounts],
  );

  /* ---------- front desk: stays ---------- */
  const checkIn = useCallback(
    ({ firstName, lastName, room, nights }) => {
      const r = String(room).trim();
      const first = String(firstName).trim();
      const last = String(lastName).trim();
      if (!r || !first || !last) return null;
      if (stays.some((s) => s.status === 'in-house' && s.room === r)) return null; // already occupied
      const stay = {
        id: `stay-${r}-${Date.now().toString(36)}`,
        room: r, firstName: first, lastName: last, pin: randomPin(),
        status: 'in-house', checkedInAt: Date.now(),
        nights: Math.min(60, Math.max(1, Number(nights) || 1)),
      };
      setStays((cur) => [...cur, stay]);
      setRoomStatus(r, 'occupied');
      return stay;
    },
    [stays, setStays, setRoomStatus],
  );

  const checkOut = useCallback(
    (id) => {
      const stay = stays.find((s) => s.id === id);
      if (!stay) return;
      setStays((cur) => cur.map((s) => (s.id === id ? { ...s, status: 'checked-out', checkedOutAt: Date.now() } : s)));
      setRoomStatus(stay.room, 'cleaning');
    },
    [stays, setStays, setRoomStatus],
  );

  const value = {
    guest, guestLogin, guestLogout,
    visitor, visitorLogin,
    staff, staffLogin, staffLogout,
    staffAccounts, addStaff, removeStaff, updateStaffRole,
    stays, checkIn, checkOut,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
