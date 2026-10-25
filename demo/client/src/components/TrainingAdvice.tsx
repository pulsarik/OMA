import React from 'react';
import { useTrainingAdvice } from '../training/useTrainingAdvice';
import './trainingAdvice.css';

type Controller = ReturnType<typeof useTrainingAdvice>;

export function TrainingAdvice({ controller, t }: { controller: Controller; t: (en: string, ru: string) => string }) {
  if (!controller.enabled || !controller.available || !controller.advice) return null;
  return <aside className="training-advice" role="status" data-testid="training-advice">
    <span aria-hidden="true">♠</span>
    <div><strong>{t('Coach', 'Тренер')}</strong><p>{controller.advice.text}</p></div>
  </aside>;
}

export function TrainingAdviceSettings({ controller, t }: { controller: Controller; t: (en: string, ru: string) => string }) {
  if (!controller.available) return null;
  return <div className="training-advice-settings">
    <h2>{t('Voice coach', 'Голосовой тренер')}</h2>
    <label>
      <input type="checkbox" checked={controller.enabled} onChange={event => controller.setEnabled(event.target.checked)} />
      {t('Advice after 10 seconds', 'Совет после 10 секунд')}
    </label>
    <p>{t(
      'During games with bots, suggests an action in the commentator language and briefly explains it aloud.',
      'В игре с ботами предлагает действие на языке ведущего и коротко объясняет его вслух.',
    )}</p>
  </div>;
}
