import React, { useEffect, useState } from 'react';

const CITY_CARDS: Record<string, string> = {
  berlin: '/city-cards/berlin.svg',
  'берлин': '/city-cards/berlin.svg',
  paris: '/city-cards/paris.svg',
  'париж': '/city-cards/paris.svg',
  tokyo: '/city-cards/tokyo.svg',
  'токио': '/city-cards/tokyo.svg',
};

export function cityCardUrl(city: string) {
  return CITY_CARDS[city.trim().toLocaleLowerCase()] ?? null;
}

export function CityInfo({ city, language = 'en' }: { city: string; language?: 'en' | 'ru' }) {
  const [open, setOpen] = useState(false);
  const cardUrl = cityCardUrl(city);
  const closeLabel = language === 'ru' ? 'Закрыть информацию о городе' : 'Close city information';
  const openLabel = language === 'ru' ? `Информация о городе ${city}` : `Information about ${city}`;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!cardUrl) return null;

  return (
    <>
      <button
        type="button"
        aria-label={openLabel}
        title={openLabel}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        style={{
          display: 'inline-grid',
          flex: '0 0 28px',
          placeItems: 'center',
          width: 28,
          height: 28,
          border: '1.5px solid currentColor',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, .14)',
          color: 'inherit',
          font: 'italic 900 17px/1 Georgia, serif',
          cursor: 'pointer',
        }}
      >
        i
      </button>

      {open ? (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          style={{
            position: 'fixed',
            zIndex: 1300,
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: 18,
            background: 'rgba(1, 25, 19, .78)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={openLabel}
            style={{ position: 'relative', width: 'min(92vw, 560px)', maxHeight: '92vh' }}
          >
            <button
              type="button"
              aria-label={closeLabel}
              onClick={() => setOpen(false)}
              style={{
                position: 'absolute',
                zIndex: 1,
                top: 14,
                right: 14,
                display: 'grid',
                placeItems: 'center',
                width: 38,
                height: 38,
                border: '1px solid #d7ddd9',
                borderRadius: '50%',
                background: 'rgba(255,255,255,.94)',
                color: '#17352a',
                fontSize: 25,
                lineHeight: 1,
                boxShadow: '0 3px 12px rgba(0,0,0,.2)',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
            <img
              src={cardUrl}
              alt={openLabel}
              style={{ display: 'block', width: '100%', maxHeight: '92vh', borderRadius: 20, objectFit: 'contain', boxShadow: '0 28px 80px rgba(0,0,0,.45)' }}
            />
          </section>
        </div>
      ) : null}
    </>
  );
}
