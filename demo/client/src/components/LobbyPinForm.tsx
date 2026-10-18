import React, { useState } from 'react';

export function LobbyPinForm({ language, connected, onSubmit }: {
  language: 'en' | 'ru';
  connected: boolean;
  onSubmit: (pin: string) => void;
}) {
  const [pin, setPin] = useState('');
  const russian = language === 'ru';

  return (
    <form className="lobby-join-form" onSubmit={(event) => {
      event.preventDefault();
      if (connected && /^\d{4}$/.test(pin)) onSubmit(pin);
    }}>
      <p className="lobby-join-notice" style={{ margin: 0 }}>
        {russian
          ? 'Попросите у ведущего текущий PIN или новое приглашение.'
          : 'Ask the host for the current PIN or a new invitation.'}
      </p>
      <label htmlFor="lobby-access-pin">{russian ? 'PIN стола' : 'Table PIN'}</label>
      <input
        id="lobby-access-pin"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        pattern="[0-9]{4}"
        value={pin}
        onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
      />
      <button type="submit" disabled={!connected || pin.length !== 4}>
        {russian ? 'Открыть стол' : 'Open table'}
      </button>
    </form>
  );
}
