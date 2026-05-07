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

.checkbox-target.is-pinned {
  cursor: not-allowed;
  opacity: 0.6;
}

.checkbox-target.is-pinned .checkbox-visual {
  border-style: dashed;
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

.action-bar[hidden] {
  display: none;
}

.action-bar[data-mode="off"] {
  grid-template-rows: 1fr;
  min-height: 38px;
}

.action-bar[data-mode="on"] {
  grid-template-rows: auto auto;
  min-height: 76px;
}

.action-bar[data-mode="on"][data-density="compact"] {
  min-height: 110px;
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  min-width: 0;
}

.action-bar[data-density="compact"] .toolbar-actions {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.selected-count {
  flex: 1 1 auto;
  min-width: 0;
  color: CanvasText;
  font: 700 12.5px/1.2 ui-sans-serif, system-ui, sans-serif;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-bar button,
.dialog button {
  flex: 0 0 auto;
  min-width: 0;
  min-height: 30px;
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
  position: relative;
  display: block;
  width: 36px;
  min-width: 36px !important;
  height: 20px;
  min-height: 20px !important;
  box-sizing: border-box;
  border-radius: 999px !important;
  padding: 0 !important;
  line-height: 0 !important;
  background: color-mix(in srgb, CanvasText 9%, Canvas) !important;
}

.mode-toggle-thumb {
  position: absolute;
  top: 50%;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: CanvasText;
  box-shadow: 0 1px 4px color-mix(in srgb, CanvasText 24%, transparent);
  transform: translateY(-50%);
  transition: transform 140ms ease, background-color 140ms ease;
}

.mode-toggle[aria-checked="true"] {
  border-color: #0f7a55 !important;
  background: #0f7a55 !important;
}

.mode-toggle[aria-checked="true"] .mode-toggle-thumb {
  transform: translate(16px, -50%);
  background: Canvas;
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

.busy-shield {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: grid;
  place-items: end center;
  padding: 0 16px 24px;
  box-sizing: border-box;
  background: color-mix(in srgb, CanvasText 14%, transparent);
  color: CanvasText;
  pointer-events: auto;
  font: 600 13px/1.35 ui-sans-serif, system-ui, sans-serif;
}

.busy-shield:not([hidden]) {
  display: grid;
}

.busy-shield[hidden] {
  display: none;
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

html.gptbd-bulk-active [data-gptbd-force-menu="true"] button[aria-label*="대화 옵션"],
html.gptbd-bulk-active [data-gptbd-force-menu="true"] button[aria-label*="conversation options" i],
html.gptbd-bulk-active [data-gptbd-force-menu="true"] button[aria-label*="options" i] {
  opacity: 1 !important;
  pointer-events: auto !important;
  visibility: visible !important;
}

[data-gptbd-toolbar-spacer="true"] {
  display: block !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: none !important;
}

[data-gptbd-toolbar-spacer="true"][data-gptbd-mode="off"] {
  flex: 0 0 48px !important;
  height: 48px !important;
  min-height: 48px !important;
}

[data-gptbd-toolbar-spacer="true"][data-gptbd-mode="on"] {
  flex: 0 0 88px !important;
  height: 88px !important;
  min-height: 88px !important;
}

[data-gptbd-toolbar-spacer="true"][data-gptbd-mode="on"][data-gptbd-density="compact"] {
  flex: 0 0 122px !important;
  height: 122px !important;
  min-height: 122px !important;
}

.gptbd-speed-panel {
  display: grid !important;
  gap: 8px !important;
  width: min(100%, 760px) !important;
  margin: 8px auto 14px !important;
  padding: 0 16px !important;
  box-sizing: border-box !important;
  color: var(--text-primary, CanvasText) !important;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}

.gptbd-speed-toolbar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
  min-width: 0 !important;
  padding: 8px !important;
  border: 1px solid color-mix(in srgb, CanvasText 12%, transparent) !important;
  border-radius: 8px !important;
  background: color-mix(in srgb, Canvas 94%, transparent) !important;
}

.gptbd-speed-summary {
  min-width: 0 !important;
  overflow: hidden !important;
  color: color-mix(in srgb, CanvasText 72%, transparent) !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  line-height: 1.25 !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.gptbd-speed-actions {
  display: inline-flex !important;
  flex: 0 0 auto !important;
  gap: 6px !important;
}

.gptbd-speed-actions button {
  min-height: 30px !important;
  min-width: 0 !important;
  padding: 0 10px !important;
  border: 1px solid color-mix(in srgb, CanvasText 12%, transparent) !important;
  border-radius: 7px !important;
  background: color-mix(in srgb, CanvasText 5%, Canvas) !important;
  color: CanvasText !important;
  cursor: pointer !important;
  font: 700 12px/1 ui-sans-serif, system-ui, sans-serif !important;
  white-space: nowrap !important;
}

.gptbd-speed-actions button:hover:not(:disabled) {
  background: color-mix(in srgb, CanvasText 9%, Canvas) !important;
}

.gptbd-speed-actions button:disabled {
  cursor: not-allowed !important;
  opacity: 0.55 !important;
}

.gptbd-speed-older-list {
  display: grid !important;
  gap: 8px !important;
}

.gptbd-speed-turn {
  display: grid !important;
  gap: 6px !important;
  padding: 10px 12px !important;
  border: 1px solid color-mix(in srgb, CanvasText 10%, transparent) !important;
  border-radius: 8px !important;
  background: color-mix(in srgb, CanvasText 4%, Canvas) !important;
}

.gptbd-speed-role {
  color: color-mix(in srgb, CanvasText 62%, transparent) !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  line-height: 1.2 !important;
}

.gptbd-speed-body {
  margin: 0 !important;
  color: CanvasText !important;
  font-size: 13px !important;
  line-height: 1.5 !important;
  overflow-wrap: anywhere !important;
  white-space: pre-wrap !important;
}

.gptbd-speed-truncated {
  color: color-mix(in srgb, CanvasText 58%, transparent) !important;
  font-size: 11px !important;
  line-height: 1.3 !important;
}

@media (max-width: 640px) {
  .gptbd-speed-panel {
    padding: 0 10px !important;
  }

  .gptbd-speed-toolbar {
    align-items: stretch !important;
    flex-direction: column !important;
  }

  .gptbd-speed-actions {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
  }
}
`;
