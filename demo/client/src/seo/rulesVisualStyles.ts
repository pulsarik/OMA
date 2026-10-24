export const RULES_VISUAL_STYLES = `
 .rules-guide { --lesson-green:#075c40; --lesson-gold:#f4cd72; }
 .rules-guide .rules-nav { gap:8px; margin:22px 0 30px; }
 .rules-guide .rules-nav a { padding:9px 13px; border-radius:100px; background:#edf5f0; text-decoration:none; font-size:13px; font-weight:700; }
 .rules-guide .rules-nav a:hover { background:#d7ebdf; }
 .rules-guide .rules-lead { max-width:620px; font-size:18px; }
 .lesson { margin:36px 0; scroll-margin-top:20px; }
 .lesson-heading { display:flex; gap:14px; align-items:center; margin-bottom:16px; }
 .lesson-number { flex:none; display:grid; place-items:center; width:40px; height:40px; border:1px solid #bdd3c6; border-radius:50%; color:#075c40; font-size:13px; font-weight:800; }
 .rules-guide .lesson-heading h2 { margin:0; font-size:clamp(22px,4vw,29px); letter-spacing:-.025em; }
 .rules-guide .lesson-heading p { margin:4px 0 0; font-size:14px; }
 .rules-formula { display:flex; align-items:center; justify-content:center; gap:clamp(8px,3vw,28px); margin:22px 0; text-align:center; }
 .rules-formula strong { display:block; font-size:38px; line-height:1.1; color:#075c40; }
 .rules-formula small { display:block; font-size:12px; margin-top:5px; color:#526159; }
 .rules-formula > b { font-size:24px; color:#7a8b81; }
 .rules-choice { padding:0; border:0; margin:18px 0 0; min-width:0; }
 .rules-choice legend { padding:0; margin-bottom:10px; font-size:13px; font-weight:700; color:#526159; }
 .rules-choice-options { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
 .rules-choice-options label { position:relative; cursor:pointer; border:1px solid #b9cec1; border-radius:100px; padding:10px 17px; font-size:14px; font-weight:700; }
 .rules-choice-options label:has(input:checked) { background:#075c40; border-color:#075c40; color:white; }
 .rules-choice-options label:has(input:focus-visible) { outline:3px solid #b87913; outline-offset:3px; }
 .rules-choice-options input { position:absolute; width:1px; height:1px; opacity:0; }
 .rules-choice-panel { display:none; }
 .rules-choice:has(input[value="0"]:checked) .rules-choice-panel[data-index="0"],
 .rules-choice:has(input[value="1"]:checked) .rules-choice-panel[data-index="1"],
 .rules-choice:has(input[value="2"]:checked) .rules-choice-panel[data-index="2"],
 .rules-choice:has(input[value="3"]:checked) .rules-choice-panel[data-index="3"],
 .rules-choice:has(input[value="4"]:checked) .rules-choice-panel[data-index="4"] { display:block; }
 .rules-felt { border-radius:20px; background:radial-gradient(ellipse at top,#197654,#064932); padding:clamp(16px,4vw,28px); color:white; border:1px solid #174e3a; box-shadow:inset 0 0 0 5px #ffffff08; }
 .rules-felt-row + .rules-felt-row { margin-top:20px; padding-top:18px; border-top:1px solid #ffffff25; }
 .rules-felt-label { display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:13px; font-weight:700; }
 .rules-felt-label small { color:#f4cd72; }
 .rules-guide .rules-felt p { color:#d9ece1; font-size:13px; margin:12px 0 0; }
 .rules-result { margin-top:20px; padding:14px 16px; border-radius:12px; background:#f4cd72; color:#3c2c0c; }
 .rules-result strong { display:block; font-size:20px; }
 .rules-result small { display:block; margin-top:4px; }
 .illustrated-cards.rules-cards { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0 0; }
 .rules-card.playing-card { position:relative; display:inline-block; box-sizing:border-box; flex:none; width:clamp(36px,10.5vw,54px); height:auto; aspect-ratio:5/7; min-width:0; padding:0; border-radius:7px; border:1px solid #c7cec8; background:linear-gradient(135deg,#fff,#f6f4ed); color:#20362b; box-shadow:0 3px 0 #00000020; font-weight:800; }
 .rules-card.playing-card--red { color:#b32e3d; }
 .playing-card-corner { position:absolute; left:5px; top:3px; line-height:1; font-size:clamp(13px,3vw,18px); }
 .playing-card-corner small { display:block; font-size:10px; margin-top:2px; }
 .playing-card-pip { position:absolute; top:42%; left:50%; transform:translateX(-50%); font-size:clamp(19px,4vw,27px); line-height:1; }
 .playing-card-foot { position:absolute; bottom:3px; right:5px; transform:rotate(180deg); font-size:11px; }
 .rules-card.playing-card--chosen { outline:3px solid #f4cd72; outline-offset:1px; transform:translateY(-3px); }
 .rules-card.playing-card--unused { opacity:.5; }
 .rules-low-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:18px; }
 .rules-low-example { padding:16px; border:1px solid #d6e3da; background:#f4f8f5; border-radius:15px; min-width:0; }
 .rules-low-example:last-child { background:#fff6ef; border-color:#eed7c6; }
 .rules-low-example strong { display:block; font-size:14px; }
 .rules-low-example .playing-card { width:calc((100% - 24px)/5); max-width:46px; }
 .rules-low-example .playing-card-corner { font-size:13px; }
 .rules-low-example .playing-card-corner small { display:none; }
 .rules-low-example .playing-card-pip { font-size:19px; }
 .rules-low-example .playing-card-foot { font-size:9px; }
 .rules-guide .rules-low-example p { font-size:13px; line-height:1.5; margin-top:12px; }
 .rules-note { padding:14px 18px; border-left:3px solid #d3a34b; background:#fff9eb; border-radius:0 12px 12px 0; font-size:14px; }
 .rules-pot-scene { background:#f3f7f4; border:1px solid #d6e3da; border-radius:18px; padding:clamp(16px,3vw,24px); }
 .rules-pot-total { display:flex; align-items:center; gap:12px; font-size:14px; }
 .rules-chip { display:grid; place-items:center; flex:none; width:56px; height:56px; border:5px dashed #edcf85; outline:3px solid #075c40; outline-offset:1px; border-radius:50%; background:#075c40; color:#fff; font-weight:800; }
 .rules-pot-bar { display:flex; overflow:hidden; border-radius:12px; height:62px; margin:22px 0 14px; gap:3px; }
 .rules-pot-bar span { display:grid; place-items:center; font-size:22px; font-weight:800; }
 .rules-pot-bar span:nth-child(1) { background:#075c40; color:white; }
 .rules-pot-bar span:nth-child(2) { background:#f4cd72; color:#45320d; }
 .rules-pot-bar span:nth-child(3) { background:#c8d9f1; color:#243b62; }
 .rules-pot-key { display:flex; flex-wrap:wrap; gap:8px 20px; font-size:13px; }
 .rules-pot-key span:before { content:''; display:inline-block; width:9px; height:9px; margin-right:6px; border-radius:50%; background:#075c40; }
 .rules-pot-key span:nth-child(2):before { background:#d5a22e; }
 .rules-pot-key span:nth-child(3):before { background:#7599cd; }
 .rules-guide .rules-pot-scene p { margin-top:16px; font-size:14px; }
 .rules-bet-steps { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin:18px 0; }
 .rules-bet-steps > div { border:1px solid #d6e3da; border-radius:14px; padding:18px; background:#f4f8f5; }
 .rules-bet-steps small { display:block; color:#526159; font-size:12px; }
 .rules-bet-steps strong { display:block; font-size:30px; color:#075c40; margin:8px 0; }
 .rules-guide .rules-bet-steps p { font-size:13px; line-height:1.5; margin:0; }
 .rules-bet-steps > div:last-child { background:#fff4d9; border-color:#ecd39c; }
 .rules-reference { border-top:1px solid #d6e3da; padding-top:20px; margin-top:32px; }
 .rules-reference details { border-bottom:1px solid #d6e3da; padding:14px 0; }
 .rules-reference summary { cursor:pointer; font-weight:700; font-size:15px; }
 .rules-reference summary:focus-visible { outline:3px solid #b87913; outline-offset:4px; }
 .rules-guide .rules-reference p { font-size:14px; }
 .rules-guide .rules-ranks { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; padding:0; list-style:none; counter-reset:rank; }
 .rules-guide .rules-ranks > li { counter-increment:rank; padding:16px; border:1px solid #d6e3da; border-radius:14px; background:#f8faf7; }
 .rules-guide .rules-ranks > li > strong:before { content:counter(rank,decimal-leading-zero) '  '; color:#71897b; font-size:12px; white-space:pre; }
 .rules-blind-definitions { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
 .rules-blind-definitions > div { padding:18px; border:1px solid #d6e3da; border-radius:15px; background:#f4f8f5; }
 .rules-blind-definitions strong { display:block; margin-top:10px; }
 .rules-guide .rules-blind-definitions p { font-size:14px; }
 .rules-position { display:inline-grid; place-items:center; width:40px; height:40px; border-radius:50%; background:#075c40; color:white; font-weight:800; }
 .rules-position--gold { background:#f4cd72; color:#45320d; }
 .rules-blind-figure { margin:22px 0; padding:clamp(12px,3vw,24px); border:1px solid #d6e3da; border-radius:20px; background:#f4f8f5; }
 .rules-blind-figure figcaption { text-align:center; font-size:13px; font-weight:700; color:#526159; margin-bottom:18px; }
 .rules-blind-table { position:relative; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); grid-template-rows:repeat(3,auto); gap:12px 8px; max-width:510px; margin:auto; align-items:center; }
 .rules-blind-table:before { content:''; position:absolute; inset:40px 20px; border:6px solid #d1b276; border-radius:50%; background:radial-gradient(ellipse,#197654,#064932); box-shadow:0 5px 0 #00000012; }
 .rules-seat { position:relative; text-align:center; justify-self:center; width:100%; max-width:118px; box-sizing:border-box; padding:10px 4px; border:1px solid #d6e3da; border-radius:14px; background:#fff; }
 .rules-seat b { display:inline-grid; place-items:center; min-width:30px; height:30px; border-radius:50%; background:#edf5f0; font-size:12px; }
 .rules-seat strong,.rules-seat small { display:block; margin-top:4px; }
 .rules-seat strong { font-size:14px; } .rules-seat small { font-size:11px; color:#526159; }
 .rules-seat--dealer { grid-area:1/2; } .rules-seat--small { grid-area:2/3; } .rules-seat--big { grid-area:3/2; } .rules-seat--first { grid-area:2/1; border-color:#d3a34b; }
 .rules-seat--small b { background:#075c40; color:#fff; } .rules-seat--big b { background:#f4cd72; color:#45320d; }
 .rules-blind-pot { grid-area:2/2; position:relative; text-align:center; color:#fff; }
 .rules-blind-pot span,.rules-blind-pot strong,.rules-blind-pot small { display:block; }
 .rules-blind-pot span { font-size:26px; color:#f4cd72; line-height:1; } .rules-blind-pot strong { font-size:30px; } .rules-blind-pot small { font-size:11px; }
 .rules-blind-levels,.rules-raise-chain { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; padding:0; list-style:none; margin:18px 0; }
 .rules-blind-levels li,.rules-raise-chain li { padding:16px 12px; border:1px solid #d6e3da; border-radius:14px; background:#f4f8f5; text-align:center; }
 .rules-blind-levels small,.rules-raise-chain small,.rules-blind-levels span,.rules-raise-chain span { display:block; font-size:12px; color:#526159; }
 .rules-blind-levels strong,.rules-raise-chain strong { display:block; font-size:28px; margin:10px 0; color:#075c40; }
 .rules-blind-levels li+li { border-top:4px solid #d1b276; }
 .rules-raise-chain li:last-child { background:#fff4d9; border-color:#d1b276; }
 .rules-raise-example { padding:18px; border:1px solid #d6e3da; border-radius:18px; }
 .rules-raise-example h3 { font-size:16px; margin:0; }
 .rules-guide .rules-raise-example p { font-size:14px; }
 .rules-raise-reset { display:flex; gap:14px; align-items:center; padding:12px 18px; background:#edf5f0; border-radius:12px; margin:14px 0; }
 .rules-raise-reset > span { font-size:36px; color:#075c40; }
 .rules-guide .rules-raise-reset p { font-size:14px; }
 .rules-sizing-scene { border:1px solid #d6e3da; border-radius:18px; background:#f4f8f5; padding:clamp(12px,3vw,24px); }
 .rules-sizing-facts { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin:0 0 18px; }
 .rules-sizing-facts dt { font-size:12px; color:#526159; } .rules-sizing-facts dd { font-size:24px; font-weight:800; color:#075c40; margin:5px 0 0; }
 .rules-sizing-options { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
 .rules-sizing-options > div { min-width:0; padding:14px 10px; border:1px solid #d6e3da; border-radius:12px; background:#fff; text-align:center; }
 .rules-sizing-options h4 { margin:0 0 14px; color:#075c40; font-size:14px; }
 .rules-sizing-options small { display:block; color:#526159; font-size:12px; }
 .rules-sizing-target { display:block; margin:4px 0 10px; font-size:32px; color:#075c40; }
 .rules-sizing-added { display:block; padding:6px 2px; border-radius:6px; background:#edf5f0; font-size:12px; }
 .rules-sizing-allin { display:inline-block; margin-top:8px; padding:4px 10px; border-radius:100px; background:#f4cd72; font-size:12px; color:#45320d; }
 .rules-guide .rules-sizing-scene p { font-size:14px; margin-top:18px; }
 @media(max-width:540px) { .rules-sizing-facts,.rules-sizing-options { grid-template-columns:1fr 1fr; } }
 @media(max-width:540px) { .rules-blind-definitions { grid-template-columns:1fr; } .rules-blind-levels,.rules-raise-chain { grid-template-columns:1fr 1fr; } .rules-raise-example { padding:14px; } }
 @media(min-width:760px) { .rules-felt { display:grid; grid-template-columns:.85fr 1.15fr; gap:24px; } .rules-felt-row + .rules-felt-row { margin:0; padding:0 0 0 24px; border-top:0; border-left:1px solid #ffffff25; } .rules-result,.rules-felt > p { grid-column:1/-1; } .rules-felt .rules-result,.rules-guide .rules-felt > p { margin-top:0; } }
 @media(max-width:700px) { .rules-low-grid { grid-template-columns:1fr; } .rules-low-example .playing-card { width:clamp(36px,10.5vw,46px); } }
 @media(max-width:540px) { .rules-bet-steps { grid-template-columns:1fr; gap:8px; } .rules-bet-steps > div { padding:14px 16px; } .rules-bet-steps strong { margin:4px 0; } .rules-guide .rules-ranks { grid-template-columns:1fr; } .rules-felt-label { font-size:12px; } .playing-card-corner small { display:none; } .playing-card-foot { font-size:9px; } }
`;
