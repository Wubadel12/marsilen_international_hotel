import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { HOTEL } from '../data/mock';

/** "<page> · Aurora Grand Hotel": one consistent title format across customer, staff and admin pages. */
export function usePageTitle(title) {
  const { loc } = useApp();
  const hotel = loc(HOTEL.name);
  useEffect(() => {
    document.title = title ? `${title} · ${hotel}` : hotel;
  }, [title, hotel]);
}
