'use client';

import { useEffect } from 'react';

const TAWK_PROPERTY_ID = '6a396cb6dbc2651d48d4bf67';
const TAWK_WIDGET_ID = 'default';

export default function TawkTo() {
  useEffect(() => {
    if (!TAWK_PROPERTY_ID) return;

    const s1 = document.createElement('script');
    s1.async = true;
    s1.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`;
    s1.setAttribute('crossorigin', '*');
    const s0 = document.getElementsByTagName('script')[0];
    s0?.parentNode?.insertBefore(s1, s0);

    return () => {
      s1.remove();
    };
  }, []);

  return null;
}
