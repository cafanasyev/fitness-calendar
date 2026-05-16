// Exercise icons — simple stick figures.
(function () {
  const SVG = (c) =>
    '<svg viewBox="0 0 100 70" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">' +
    c +
    "</svg>";

  const FLOOR = '<line x1="2" y1="62" x2="98" y2="62" opacity="0.35" stroke-width="1.5"/>';
  const BAR   = '<line x1="2" y1="15" x2="98" y2="15" stroke-width="3"/>';

  const ICONS = {};

  // Push-up — at the top of the rep, body straight, arms straight
  ICONS.pushup = SVG(FLOOR + `
    <line x1="85" y1="58" x2="34" y2="40"/>
    <line x1="85" y1="58" x2="88" y2="62"/>
    <circle cx="26" cy="38" r="4.5"/>
    <line x1="34" y1="40" x2="34" y2="62"/>
  `);

  // Pull-up — hanging from bar with chin near top
  ICONS.pullup = SVG(BAR + `
    <line x1="40" y1="15" x2="46" y2="22"/>
    <line x1="60" y1="15" x2="54" y2="22"/>
    <circle cx="50" cy="13" r="4.5"/>
    <line x1="50" y1="22" x2="50" y2="42"/>
    <line x1="50" y1="42" x2="44" y2="60"/>
    <line x1="50" y1="42" x2="56" y2="60"/>
  `);

  // Squat — at the bottom, knees bent, body upright
  ICONS.squat = SVG(FLOOR + `
    <circle cx="50" cy="14" r="4.5"/>
    <line x1="50" y1="18" x2="50" y2="36"/>
    <line x1="50" y1="36" x2="36" y2="46"/>
    <line x1="36" y1="46" x2="38" y2="62"/>
    <line x1="50" y1="36" x2="64" y2="46"/>
    <line x1="64" y1="46" x2="62" y2="62"/>
  `);

  // Crunch — lying on back, shoulders lifted, knees bent up
  ICONS.crunch = SVG(FLOOR + `
    <circle cx="18" cy="44" r="4.5"/>
    <line x1="22" y1="48" x2="50" y2="58"/>
    <line x1="50" y1="58" x2="68" y2="40"/>
    <line x1="68" y1="40" x2="82" y2="62"/>
  `);

  // Jump rope — figure with rope over head
  ICONS.jumpRope = SVG(FLOOR + `
    <circle cx="50" cy="20" r="4.5"/>
    <line x1="50" y1="24" x2="50" y2="44"/>
    <line x1="50" y1="28" x2="34" y2="42"/>
    <line x1="50" y1="28" x2="66" y2="42"/>
    <line x1="50" y1="44" x2="44" y2="58"/>
    <line x1="50" y1="44" x2="56" y2="58"/>
    <path d="M 34 42 Q 50 0 66 42" stroke-width="1.5" opacity="0.6"/>
  `);

  // Walk — simple stick figure standing
  ICONS.walk = SVG(FLOOR + `
    <circle cx="50" cy="14" r="4.5"/>
    <line x1="50" y1="18" x2="50" y2="38"/>
    <line x1="50" y1="38" x2="42" y2="60"/>
    <line x1="50" y1="38" x2="58" y2="58"/>
    <line x1="50" y1="22" x2="42" y2="32"/>
    <line x1="50" y1="22" x2="58" y2="34"/>
  `);

  function iconFor(name) {
    if (!name) return null;
    const n = name.toLowerCase();
    if (n.includes("push-up")) return ICONS.pushup;
    if (n.includes("pull-up")) return ICONS.pullup;
    if (n.includes("squat"))   return ICONS.squat;
    if (n.includes("crunch"))  return ICONS.crunch;
    if (n.includes("jump rope")) return ICONS.jumpRope;
    if (n.includes("walk"))    return ICONS.walk;
    return null;
  }

  window.iconFor = iconFor;
  window.ICONS = ICONS;
})();
