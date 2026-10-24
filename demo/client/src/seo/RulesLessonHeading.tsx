import React from 'react';

export function LessonHeading({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return <header className="lesson-heading"><span className="lesson-number" aria-hidden="true">{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></header>;
}
