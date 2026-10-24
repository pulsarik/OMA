import React from 'react';

// Native radio controls also work in prerendered HTML without JavaScript.
export function Choices({ name, legend, items }: { name: string; legend: string; items: { label: string; body: React.ReactNode }[] }) {
  return <fieldset className="rules-choice"><legend>{legend}</legend>
    <div className="rules-choice-options">{items.map((item, index) => <label key={item.label}>
      <input type="radio" name={name} value={index} defaultChecked={index === 0} aria-controls={`${name}-${index}`} />{item.label}
    </label>)}</div>
    {items.map((item, index) => <div key={item.label} id={`${name}-${index}`} className="rules-choice-panel" data-index={index}>{item.body}</div>)}
  </fieldset>;
}
