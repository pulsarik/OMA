import React from 'react';

/** A quiet felt watermark that stays behind the community cards. */
export function TableEmblem() {
  return (
    <div className="table-emblem" aria-hidden="true">
      <svg viewBox="0 0 360 132" role="presentation">
        <g className="table-emblem__ornament" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 66c28-36 74-54 158-54s130 18 158 54c-28 36-74 54-158 54S50 102 22 66Z" />
          <path d="M43 66c23-24 67-37 137-37s114 13 137 37c-23 24-67 37-137 37S66 90 43 66Z" />
          <path d="M78 66h-25M307 66h-25" />
        </g>
        <g className="table-emblem__suits" fill="currentColor">
          <text x="66" y="72">♠</text>
          <text x="101" y="72">♣</text>
          <text x="259" y="72">♦</text>
          <text x="294" y="72">♥</text>
        </g>
        <text className="table-emblem__title" x="180" y="61" textAnchor="middle">OMAHA</text>
        <text className="table-emblem__subtitle" x="180" y="80" textAnchor="middle">H I  ·  L O</text>
      </svg>
    </div>
  );
}
