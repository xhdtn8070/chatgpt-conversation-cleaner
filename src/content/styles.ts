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
  z-index: 2;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  pointer-events: auto;
  transition: background-color 120ms ease, transform 120ms ease;
}

.row-hit-target {
  position: fixed;
  z-index: 1;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
}

.row-hit-target:hover {
  background: color-mix(in srgb, CanvasText 7%, transparent);
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
  transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}

.checkbox-target[aria-checked="true"] .checkbox-visual {
  border-color: #0f7a55;
  background: #0f7a55;
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
  display: grid;
  gap: 6px;
  padding: 6px;
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, CanvasText 12%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, Canvas 94%, transparent);
  overflow: hidden;
  pointer-events: auto;
}

.action-bar[data-mode="off"] {
  grid-template-rows: 1fr;
  min-height: 36px;
}

.action-bar[data-mode="on"] {
  grid-template-rows: auto auto;
  min-height: 78px;
}

.toolbar-top {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.toolbar-actions {
  display: grid;
  grid-template-columns:
    minmax(0, 0.6fr) minmax(0, 0.85fr)
    minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 6px;
  min-width: 0;
}

.selected-count {
  flex: 1 1 auto;
  min-width: 0;
  color: CanvasText;
  font: 600 12px/1.2 ui-sans-serif, system-ui, sans-serif;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-bar button,
.dialog button {
  flex: 0 0 auto;
  min-width: 0;
  min-height: 28px;
  border: 1px solid color-mix(in srgb, CanvasText 12%, transparent);
  border-radius: 7px;
  background: color-mix(in srgb, CanvasText 5%, Canvas);
  color: CanvasText;
  cursor: pointer;
  font: 600 12px/1 ui-sans-serif, system-ui, sans-serif;
  padding: 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mode-toggle {
  min-width: 50px !important;
  border-radius: 999px !important;
}

.mode-toggle[aria-checked="true"] {
  border-color: #0f7a55 !important;
  background: color-mix(in srgb, #0f7a55 22%, Canvas) !important;
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
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: none !important;
}

[data-gptbd-toolbar-spacer="true"][data-gptbd-mode="off"] {
  flex: 0 0 44px !important;
  height: 44px !important;
  min-height: 44px !important;
}

[data-gptbd-toolbar-spacer="true"][data-gptbd-mode="on"] {
  flex: 0 0 86px !important;
  height: 86px !important;
  min-height: 86px !important;
}
`;
