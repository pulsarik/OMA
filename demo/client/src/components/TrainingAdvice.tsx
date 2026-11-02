import React from 'react';
import { useTrainingAdvice } from '../training/useTrainingAdvice';
import './trainingAdvice.css';

type Controller = ReturnType<typeof useTrainingAdvice>;

export function TrainingAdvice({ controller, t }: { controller: Controller; t: (en: string, ru: string) => string }) {
  if (!controller.enabled || !controller.available || !controller.advice) return null;
  const separator = controller.advice.text.indexOf(' — ');
  const action = separator >= 0 ? controller.advice.text.slice(0, separator) : '';
  const explanation = separator >= 0 ? controller.advice.text.slice(separator + 3) : controller.advice.text;
  return <aside className="training-advice" role="status" aria-label={t('Training advice', 'Игровая подсказка')} data-testid="training-advice">
    <span aria-hidden="true">♠</span>
    <div><p>{action ? <><strong>{action}</strong>{` — ${explanation}`}</> : explanation}</p></div>
  </aside>;
}

export function TrainingAdviceSlot({ controller, t, compact = false }: { controller: Controller; t: (en: string, ru: string) => string; compact?: boolean }) {
  const [dismissedAdvice, setDismissedAdvice] = React.useState<Controller['advice']>(null);
  const advice = controller.advice;
  const dismissed = advice !== null && advice === dismissedAdvice;

  React.useEffect(() => {
    if (!advice || dismissed) return undefined;
    const dismiss = () => setDismissedAdvice(advice);
    document.addEventListener('click', dismiss, { once: true });
    return () => document.removeEventListener('click', dismiss);
  }, [advice, dismissed]);

  if (!controller.enabled || !controller.available || !advice || dismissed) return null;
  return <div className={`training-advice-slot${compact ? ' training-advice-slot--compact' : ''}`}>
    <TrainingAdvice controller={controller} t={t} />
  </div>;
}

export function TrainingAdviceSettings({ controller, t }: { controller: Controller; t: (en: string, ru: string) => string }) {
  if (!controller.available) return null;
  return <div className="training-advice-settings">
    <h2>{t('Coach', 'Тренер')}</h2>
    <label>
      <input type="checkbox" checked={controller.enabled} onChange={event => controller.setEnabled(event.target.checked)} />
      {t('Advice after 10 seconds', 'Подсказка через 10 секунд')}
    </label>
    <label>
      <input type="checkbox" checked={controller.soundEnabled}
        onChange={event => controller.setSoundEnabled(event.target.checked)} />
      {t('Read advice aloud', 'Озвучивать подсказки')}
    </label>
    <p>{t(
      'During games with bots, suggests an action in the interface language. Voice is optional.',
      'В игре с ботами советует действие на языке интерфейса. Озвучку можно включить отдельно.',
    )}</p>
  </div>;
}
