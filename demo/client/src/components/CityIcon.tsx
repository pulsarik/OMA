import React from 'react';

type CityLandmark =
  | 'atomium'
  | 'clock'
  | 'domes'
  | 'eiffel'
  | 'gate'
  | 'kremlin'
  | 'monument'
  | 'pagoda'
  | 'pyramid'
  | 'ship'
  | 'temple'
  | 'torii'
  | 'tower'
  | 'windmill';

const CITY_LANDMARKS: Partial<Record<string, CityLandmark>> = {
  'abu dhabi': 'tower',
  amsterdam: 'windmill',
  astana: 'tower',
  athens: 'temple',
  baghdad: 'monument',
  baku: 'tower',
  bangkok: 'pagoda',
  beijing: 'pagoda',
  berlin: 'gate',
  brussels: 'atomium',
  bucharest: 'gate',
  budapest: 'domes',
  'buenos aires': 'monument',
  cairo: 'pyramid',
  canberra: 'monument',
  copenhagen: 'ship',
  dublin: 'monument',
  doha: 'tower',
  helsinki: 'domes',
  jerusalem: 'domes',
  kyiv: 'domes',
  'kuala lumpur': 'tower',
  'kuwait city': 'tower',
  lisbon: 'ship',
  london: 'clock',
  madrid: 'gate',
  'mexico city': 'monument',
  minsk: 'monument',
  monaco: 'tower',
  moscow: 'kremlin',
  'москва': 'kremlin',
  'new delhi': 'gate',
  oslo: 'ship',
  paris: 'eiffel',
  'phnom penh': 'pagoda',
  prague: 'clock',
  reykjavik: 'tower',
  riga: 'tower',
  riyadh: 'tower',
  rome: 'domes',
  santiago: 'monument',
  seoul: 'gate',
  singapore: 'tower',
  'saint petersburg': 'ship',
  'st petersburg': 'ship',
  'st. petersburg': 'ship',
  'санкт-петербург': 'ship',
  'санкт петербург': 'ship',
  'петербург': 'ship',
  'питер': 'ship',
  stockholm: 'ship',
  tallinn: 'tower',
  tbilisi: 'monument',
  tehran: 'tower',
  tokyo: 'torii',
  'vatican city': 'domes',
  vienna: 'domes',
  warsaw: 'tower',
  yerevan: 'monument',
};

function cityLandmark(city: string): CityLandmark {
  return CITY_LANDMARKS[city.trim().toLocaleLowerCase()] ?? 'monument';
}
function CityLandmarkDrawing({ kind }: { kind: CityLandmark }) {
  switch (kind) {
    case 'kremlin':
      return (
        <>
          <path d="M5 29h26M7 29V17h7v12m8 0V17h7v12M14 29V12h8v17" />
          <path d="m7 17 3.5-4 3.5 4m0-5 4-5 4 5m0 5 3.5-4 3.5 4M18 7V3m-2 2h4" />
          <path d="M9.5 22h2m5.5-5h2m5.5 5h2" />
        </>
      );
    case 'ship':
      return (
        <>
          <path d="M4 26c4 3 8 3 12 0 4 3 8 3 12 0 1.4 1 2.7 1.5 4 1.5" />
          <path d="M8 22h20l-3 4H11l-3-4Zm10 0V6m0 2-8 11h8m1-10 8 10h-8" />
          <path d="M18 6h5l-2.5-2L18 6Z" />
        </>
      );
    case 'eiffel':
      return (
        <>
          <path d="M18 4 10 30m8-26 8 26M7 30h22M12 23h12M14 16h8M16 9h4" />
          <path d="M11 30c2-4 4-6 7-6s5 2 7 6" />
        </>
      );
    case 'clock':
      return (
        <>
          <path d="M12 31h12M14 31V13h8v18M13 13h10l-2-4h-6l-2 4Zm3-4 2-5 2 5" />
          <circle cx="18" cy="17.5" r="2.7" />
          <path d="M18 15.7v2l1.4 1" />
        </>
      );
    case 'temple':
      return (
        <>
          <path d="m5 13 13-7 13 7H5Zm2 16h22M9 15v11m6-11v11m6-11v11m6-11v11M5 29v-3h26v3" />
        </>
      );
    case 'gate':
      return (
        <>
          <path d="M4 29h28M7 29V16h22v13M5 16h26l-2-4H7l-2 4Zm4-4 2-5h14l2 5M12 18v11m6-11v11m6-11v11" />
          <path d="M14 7c1-2 2.3-3 4-3s3 1 4 3" />
        </>
      );
    case 'pyramid':
      return (
        <>
          <path d="m3 29 10-18 10 18H3Zm14 0 7-13 9 13H17Z" />
          <path d="m13 11 4 18M7 22h12m2 0h8" />
          <circle cx="28" cy="8" r="3" fill="currentColor" stroke="none" opacity=".2" />
        </>
      );
    case 'pagoda':
      return (
        <>
          <path d="M18 4v4M10 29h16M13 25v4m10-4v4M11 25h14l-3-4h-8l-3 4Zm2-8h10v4H13v-4Zm-4 0h18l-4-4H13l-4 4Zm5-8h8v4h-8V9Zm-3 0h14l-7-5-7 5Z" />
        </>
      );
    case 'torii':
      return (
        <>
          <path d="M7 31h6m10 0h6M11 31l2-21m12 21-2-21M5 9c8 2 18 2 26 0l-1-4c-8 2-16 2-24 0L5 9Zm4 5h18M11 18h14" />
          <circle cx="29" cy="23" r="3" fill="currentColor" stroke="none" opacity=".18" />
        </>
      );
    case 'windmill':
      return (
        <>
          <path d="m12 30 2-15h8l2 15H12Zm3-7h6m-3 0v7M18 15V5m0 10L8 9m10 6 10-6M18 15 9 22m9-7 9 7" />
          <circle cx="18" cy="15" r="2" fill="currentColor" stroke="none" />
        </>
      );
    case 'atomium':
      return (
        <>
          <path d="m10 9 8 9 8-9M10 27l8-9 8 9M10 9v18m16-18v18" />
          <circle cx="10" cy="9" r="3" /><circle cx="26" cy="9" r="3" />
          <circle cx="18" cy="18" r="3.5" /><circle cx="10" cy="27" r="3" /><circle cx="26" cy="27" r="3" />
        </>
      );
    case 'domes':
      return (
        <>
          <path d="M5 30h26M8 30V20h20v10M12 20c0-5 2-9 6-9s6 4 6 9M18 11V5m-2 2h4M10 20v-4m16 4v-4" />
          <path d="M6 16h8c0-3-1.3-5-4-5s-4 2-4 5Zm16 0h8c0-3-1.3-5-4-5s-4 2-4 5Z" />
        </>
      );
    case 'tower':
      return (
        <>
          <path d="M11 30h14L21 8h-6l-4 22Zm4-22 3-5 3 5M14 19h8m-9 6h10M18 3v-1" />
          <path d="M16 12h4m-3 3h2" />
        </>
      );
    default:
      return (
        <>
          <path d="M7 31h22M10 31v-4h16v4M13 27v-3h10v3M15 24 17 9h2l2 15M18 9V5" />
          <path d="m18 3 .8 1.4 1.7.3-1.2 1.2.2 1.7L18 6.8l-1.5.8.3-1.7-1.3-1.2 1.7-.3L18 3Z" />
          <circle cx="28" cy="7" r="3" fill="currentColor" stroke="none" opacity=".18" />
        </>
      );
  }
}

export function CityIcon({ city, size = 48 }: { city: string; size?: number }) {
  const seed = Array.from(city).reduce((hash, char) => ((hash * 31) + (char.codePointAt(0) ?? 0)) >>> 0, 0);
  const hue = seed % 360;

  return (
    <span
      aria-hidden="true"
      style={{
        display: 'grid',
        flex: `0 0 ${size}px`,
        placeItems: 'center',
        width: size,
        height: size,
        overflow: 'hidden',
        border: `1px solid hsl(${hue} 42% 78%)`,
        borderRadius: Math.round(size * .29),
        background: `linear-gradient(145deg, hsl(${hue} 70% 95%), hsl(${hue} 54% 87%))`,
        color: `hsl(${hue} 54% 30%)`,
      }}
    >
      <svg
        width={Math.round(size * .72)}
        height={Math.round(size * .72)}
        viewBox="0 0 36 36"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <CityLandmarkDrawing kind={cityLandmark(city)} />
      </svg>
    </span>
  );
}
