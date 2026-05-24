# Scroll Rep Input Design

## Goal

Replace the browser's default spin-button arrows on per-set rep inputs with a scroll/swipe gesture: scroll wheel on desktop, touch-drag on mobile. The `<input type="number">` element stays; only the interaction layer and visual style change.

## Context

Each exercise section in the log form renders N set rows via `buildExSectionInnerHTML`. Each row contains an `<input type="number" class="log-set-input">`. The current browser spin buttons (↑↓ arrows) are small and awkward, especially on mobile.

## Design

### CSS (`styles.css`)

Add to the existing `.log-set-input` rule:
- `-moz-appearance: textfield` — hides Firefox spin buttons
- `cursor: ns-resize` — communicates vertical scroll interaction on desktop

Add a new rule to hide WebKit spin buttons:
```css
.log-set-input::-webkit-outer-spin-button,
.log-set-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
```

### JS (`app.js`)

New function `applyInputGestures(root)`:

```js
function applyInputGestures(root) {
  root.querySelectorAll('.log-set-input').forEach(inp => {
    inp.addEventListener('wheel', e => {
      e.preventDefault();
      inp.value = Math.max(1, Math.min(99, (parseInt(inp.value, 10) || 0) + (e.deltaY < 0 ? 1 : -1)));
    }, { passive: false });

    let touchStartY, touchStartVal;
    inp.addEventListener('touchstart', e => {
      touchStartY = e.touches[0].clientY;
      touchStartVal = parseInt(inp.value, 10) || 0;
    }, { passive: true });
    inp.addEventListener('touchmove', e => {
      e.preventDefault();
      const delta = Math.round((touchStartY - e.touches[0].clientY) / 8);
      inp.value = Math.max(1, Math.min(99, touchStartVal + delta));
    }, { passive: false });
  });
}
```

Behavior:
- **Wheel**: `deltaY < 0` (scroll up) → increment; `deltaY > 0` → decrement. Clamped 1–99.
- **Touch drag**: drag up → increment, drag down → decrement. 8 px per 1 rep (tunable). Clamped 1–99.
- Both prevent default to avoid accidental page scroll while adjusting a value.

### Call sites

`applyInputGestures` must be called after every innerHTML replacement that creates new `.log-set-input` elements. There are three such sites in `attachStrengthLogHandlers`:

1. **Initial form render** — at the end of `attachStrengthLogHandlers`, after the wrapper HTML is set and before/after the click listener is attached. Call `applyInputGestures(wrapper)`.

2. **Per-exercise edit** (`log-ex-edit` handler) — after `section.innerHTML = buildExSectionInnerHTML(...)`. Call `applyInputGestures(section)`.

3. **Full form re-render** (`log-edit` handler) — after `wrapper.innerHTML = buildStrengthFormHTML(...)`. Call `applyInputGestures(wrapper)`.

### What does NOT change

- `buildExSectionInnerHTML` — input markup unchanged
- `buildStrengthFormHTML` — unchanged
- Data model — values are still read with `parseInt(inp.value, 10)`
- Save/Skip logic — unchanged

## File Map

| File | Change |
|------|--------|
| `styles.css` | Hide spin buttons on `.log-set-input`; add `cursor: ns-resize` |
| `app.js` | Add `applyInputGestures(root)`; call it at 3 sites in `attachStrengthLogHandlers` |
