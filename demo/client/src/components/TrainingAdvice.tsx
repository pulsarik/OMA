import React from 'react';
import { useTrainingAdvice } from '../training/useTrainingAdvice';
import './trainingAdvice.css';

type Controller = ReturnType<typeof useTrainingAdvice>;

export function TrainingAdvice({ controller, t, compact = false }: { controller: Controller; t: (en: string, ru: string) => string; compact?: boolean }) {
  if (!controller.enabled || !controller.available || !controller.advice) return null;
  return <aside className="training-advice" role="status" aria-label={t('Coach', 'Тренер')} data-testid="training-advice">
    <span aria-hidden="true">♠</span>
    <div>{!compact ? <strong>{t('Coach', 'Тренер')}</strong> : null}<p>{controller.advice.text}</p></div>
  </aside>;
}

export function TrainingAdviceSlot({ controller, t, compact = false }: { controller: Controller; t: (en: string, ru: string) => string; compact?: boolean }) {
  if (!controller.enabled || !controller.available) return null;
  return <div className={`training-advice-slot${compact ? ' training-advice-slot--compact' : ''}`}>
    <TrainingAdvice controller={controller} t={t} compact={compact} />
  </div>;
}

export function TrainingAdviceSettings({ controller, t }: { controller: Controller; t: (en: string, ru: string) => string }) {
  if (!controller.available) return null;
  return <div className="training-advice-settings">
    <h2>{t('Voice coach', 'Голосовой тренер')}</h2>
    <label>
      <input type="checkbox" checked={controller.enabled} onChange={event => controller.setEnabled(event.target.checked)} />
      {t('Advice after 10 seconds', 'Подсказка через 10 секунд')}
    </label>
    <p>{t(
      'During games with bots, suggests an action in the interface language and briefly explains it aloud.',
      'В игре с ботами советует действие и коротко объясняет его вслух на языке интерфейса.',
    )}</p>
  </div>;
}
