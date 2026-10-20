import React, { useSyncExternalStore } from 'react';
import { getSoundSettings, setSoundSettings, subscribeSoundSettings, unlockSounds } from '../audio/sounds';
import './soundSettings.css';

export function SoundSettings({ t }: { t: (en: string, ru: string) => string }) {
  const settings = useSyncExternalStore(subscribeSoundSettings, getSoundSettings);
  return <div className="sound-settings">
    <h2>{t('Game sounds', 'Звуки игры')}</h2>
    <label className="sound-settings-toggle">
      <input type="checkbox" checked={settings.enabled} onChange={event => {
        setSoundSettings({ enabled: event.target.checked });
        if (event.target.checked) void unlockSounds();
      }} />
      {t('Enable game sounds', 'Включить звуки игры')}
    </label>
    <p>{t('Buttons, cards, chips, your turn and wins.', 'Кнопки, карты, фишки, ваш ход и выигрыш.')}</p>
    <label className="sound-settings-volume">
      {t('Game sound volume', 'Громкость звуков игры')}
      <span><input type="range" aria-label={t('Game sound volume', 'Громкость звуков игры')}
        min="0" max="1" step="0.05" value={settings.volume} disabled={!settings.enabled}
        onChange={event => { setSoundSettings({ volume: Number(event.target.value) }); void unlockSounds(); }} />
        <output>{Math.round(settings.volume * 100)}%</output></span>
    </label>
  </div>;
}
