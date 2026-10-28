import React from 'react';

export type UiLanguage = 'en' | 'ru';

export function storedLanguage(): UiLanguage {
  try { return localStorage.getItem('omaha-language') === 'ru' ? 'ru' : 'en'; }
  catch { return 'en'; }
}

export function LanguageSettings({ language, onChange }: { language: UiLanguage; onChange: (language: UiLanguage) => void }) {
  return <div className="training-advice-settings">
    <label>{language === 'ru' ? 'Язык интерфейса и подсказок' : 'Interface and advice language'}
      <select value={language} onChange={event => {
        const next = event.target.value as UiLanguage;
        try { localStorage.setItem('omaha-language', next); } catch { /* private browsing */ }
        onChange(next);
      }} style={{ minHeight: 44 }}>
        <option value="en">English</option><option value="ru">Русский</option>
      </select>
    </label>
  </div>;
}
