export const SHADOW_CSS = `
:host {
  all: initial;
  color-scheme: light dark;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.overlay-root {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
}

.checkbox-target {
  position: fixed;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  pointer-events: auto;
  transition: background-color 120ms ease, transform 120ms ease;
}

.checkbox-target:hover {
  background: color-mix(in srgb, CanvasText 10%, transparent);
}

.checkbox-target:focus-visible {
  outline: 2px solid #0f7a55;
  outline-offset: 1px;
}

.checkbox-visual {
  width: var(--gptbd-visible-size);
  height: var(--gptbd-visible-size);
  border: 1.5px solid color-mix(in srgb, CanvasText 42%, transparent);
  border-radius: 4px;
  box-sizing: border-box;
  background: color-mix(in srgb, Canvas 92%, transparent);
  box-shadow: 0 1px 3px color-mix(in srgb, CanvasText 12%, transparent);
  transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}

.checkbox-target[aria-checked="true"] .checkbox-visual {
  border-color: #0f7a55;
  background: #0f7a55;
  box-shadow: 0 1px 4px color-mix(in srgb, #0f7a55 36%, transparent);
}

.checkbox-target[aria-checked="true"] .checkbox-visual::after {
  content: "";
  display: block;
  width: 5px;
  height: 9px;
  margin: 1px auto 0;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.action-bar {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 4px;
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, CanvasText 12%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, Canvas 94%, transparent);
  box-shadow: 0 8px 26px color-mix(in srgb, CanvasText 18%, transparent);
  backdrop-filter: blur(14px);
  pointer-events: auto;
}

.selected-count {
  flex: 1 1 auto;
  min-width: 72px;
  color: CanvasText;
  font: 600 12px/1.2 ui-sans-serif, system-ui, sans-serif;
  white-space: nowrap;
}

.action-bar button,
.dialog button {
  flex: 0 0 auto;
  min-height: 28px;
  border: 1px solid color-mix(in srgb, CanvasText 12%, transparent);
  border-radius: 7px;
  background: color-mix(in srgb, CanvasText 5%, Canvas);
  color: CanvasText;
  cursor: pointer;
  font: 600 12px/1 ui-sans-serif, system-ui, sans-serif;
  padding: 0 9px;
  white-space: nowrap;
}

.action-bar button:hover,
.dialog button:hover {
  background: color-mix(in srgb, CanvasText 9%, Canvas);
}

.action-bar button:disabled,
.dialog button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.danger {
  border-color: color-mix(in srgb, #d93025 34%, transparent) !important;
  background: #d93025 !important;
  color: white !important;
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, CanvasText 28%, transparent);
  pointer-events: auto;
}

.dialog {
  width: min(360px, calc(100vw - 32px));
  border: 1px solid color-mix(in srgb, CanvasText 14%, transparent);
  border-radius: 8px;
  background: Canvas;
  box-shadow: 0 18px 50px color-mix(in srgb, CanvasText 30%, transparent);
  color: CanvasText;
  padding: 18px;
  box-sizing: border-box;
}

.dialog h2 {
  margin: 0 0 8px;
  font: 700 16px/1.25 ui-sans-serif, system-ui, sans-serif;
}

.dialog p {
  margin: 0 0 16px;
  color: color-mix(in srgb, CanvasText 72%, transparent);
  font: 400 13px/1.45 ui-sans-serif, system-ui, sans-serif;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.notice {
  position: fixed;
  max-width: 360px;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, Canvas 94%, transparent);
  border: 1px solid color-mix(in srgb, CanvasText 12%, transparent);
  color: CanvasText;
  box-shadow: 0 10px 30px color-mix(in srgb, CanvasText 16%, transparent);
  font: 500 12px/1.35 ui-sans-serif, system-ui, sans-serif;
  pointer-events: none;
}
`;

export const DOCUMENT_CSS = `
html.gptbd-bulk-active [data-gptbd-row="true"] a[href*="/c/"] {
  padding-left: max(44px, 2.75rem) !important;
}

html.gptbd-bulk-active [data-gptbd-row-selected="true"] {
  background: color-mix(in srgb, #0f7a55 14%, transparent) !important;
  border-radius: 8px !important;
}

html.gptbd-bulk-active [data-gptbd-row-selected="true"] a {
  background: transparent !important;
}

[data-gptbd-toolbar-spacer="true"] {
  display: block !important;
  flex: 0 0 46px !important;
  width: 100% !important;
  height: 46px !important;
  min-height: 46px !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: none !important;
}
`;
