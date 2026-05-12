export const SHADOW_CSS = `
:host {
  all: initial;
  color-scheme: light dark;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  pointer-events: none;
}

.overlay-root {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
}

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

.dialog button:hover {
  background: color-mix(in srgb, CanvasText 9%, Canvas);
}

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
  z-index: 4;
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

.notice[hidden] {
  display: none;
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
html.gptbd-bulk-active [data-gptbd-row="true"][href*="/c/"],
html.gptbd-bulk-active [data-gptbd-row="true"] a[href*="/c/"] {
  position: relative !important;
  padding-left: max(44px, 2.75rem) !important;
  user-select: none !important;
  -webkit-user-select: none !important;
}

html.gptbd-bulk-active [data-gptbd-checkbox-target="true"] {
  position: absolute !important;
  top: 50% !important;
  left: 6px !important;
  z-index: 2 !important;
  display: grid !important;
  place-items: center !important;
  width: 32px !important;
  height: 32px !important;
  margin: 0 !important;
  padding: 0 !important;
  transform: translateY(-50%) !important;
  border: 0 !important;
  border-radius: 8px !important;
  background: transparent !important;
  box-sizing: border-box !important;
  color: CanvasText !important;
  cursor: pointer !important;
  pointer-events: auto !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  transition: background-color 120ms ease !important;
}

html.gptbd-bulk-active [data-gptbd-checkbox-target="true"]:hover {
  background: color-mix(in srgb, CanvasText 10%, transparent) !important;
}

html.gptbd-bulk-active [data-gptbd-checkbox-target="true"]:focus-visible {
  outline: 2px solid #0f7a55 !important;
  outline-offset: 1px !important;
}

html.gptbd-bulk-active [data-gptbd-checkbox-target="true"].is-pinned {
  cursor: not-allowed !important;
  opacity: 0.6 !important;
}

html.gptbd-bulk-active [data-gptbd-checkbox-target="true"] .gptbd-checkbox-visual {
  position: relative !important;
  display: block !important;
  width: 16px !important;
  height: 16px !important;
  border: 1.5px solid color-mix(in srgb, CanvasText 42%, transparent) !important;
  border-radius: 4px !important;
  box-sizing: border-box !important;
  background: color-mix(in srgb, Canvas 92%, transparent) !important;
  transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease !important;
}

html.gptbd-bulk-active [data-gptbd-checkbox-target="true"][aria-checked="true"] .gptbd-checkbox-visual {
  border-color: #0f7a55 !important;
  background: #0f7a55 !important;
}

html.gptbd-bulk-active [data-gptbd-checkbox-target="true"][aria-checked="true"] .gptbd-checkbox-visual::after {
  content: "" !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  display: block !important;
  width: 5px !important;
  height: 9px !important;
  margin: 0 !important;
  border: solid white !important;
  border-width: 0 2px 2px 0 !important;
  transform: translate(-50%, -58%) rotate(45deg) !important;
}

html.gptbd-bulk-active [data-gptbd-checkbox-target="true"].is-pinned .gptbd-checkbox-visual {
  border-style: dashed !important;
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

[data-gptbd-action-bar="true"] {
  position: relative !important;
  z-index: 1 !important;
  display: grid !important;
  gap: 6px !important;
  width: calc(100% - 16px) !important;
  max-width: none !important;
  min-width: 0 !important;
  margin: 4px 8px 8px !important;
  padding: 6px !important;
  box-sizing: border-box !important;
  flex: 0 0 calc(100% - 16px) !important;
  grid-column: 1 / -1 !important;
  align-self: stretch !important;
  border: 1px solid color-mix(in srgb, CanvasText 12%, transparent) !important;
  border-radius: 8px !important;
  background: color-mix(in srgb, Canvas 94%, transparent) !important;
  color: CanvasText !important;
  overflow: hidden !important;
  pointer-events: auto !important;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}

:where(nav, aside, section, div):has(> [data-gptbd-action-bar="true"] + .text-token-text-tertiary) {
  flex-wrap: wrap !important;
}

[data-gptbd-action-bar="true"] + .text-token-text-tertiary {
  flex: 0 0 100% !important;
  width: 100% !important;
  max-width: 100% !important;
}

[data-gptbd-action-bar="true"][hidden] {
  display: none !important;
}

[data-gptbd-action-bar="true"][data-mode="off"] {
  grid-template-rows: 1fr !important;
  min-height: 38px !important;
}

[data-gptbd-action-bar="true"][data-mode="on"] {
  grid-template-rows: auto auto !important;
  min-height: 76px !important;
}

[data-gptbd-action-bar="true"][data-mode="on"][data-density="compact"] {
  min-height: 110px !important;
}

[data-gptbd-action-bar="true"] .toolbar-top {
  display: flex !important;
  min-width: 0 !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
}

[data-gptbd-action-bar="true"] .toolbar-actions {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 6px !important;
  min-width: 0 !important;
}

[data-gptbd-action-bar="true"][data-density="compact"] .toolbar-actions {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
}

[data-gptbd-action-bar="true"] .selected-count {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  color: CanvasText !important;
  font: 700 12.5px/1.2 ui-sans-serif, system-ui, sans-serif !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

[data-gptbd-action-bar="true"] button {
  appearance: none !important;
  flex: 0 0 auto !important;
  min-width: 0 !important;
  min-height: 30px !important;
  border: 1px solid color-mix(in srgb, CanvasText 12%, transparent) !important;
  border-radius: 7px !important;
  background: color-mix(in srgb, CanvasText 5%, Canvas) !important;
  color: CanvasText !important;
  cursor: pointer !important;
  font: 600 12px/1 ui-sans-serif, system-ui, sans-serif !important;
  padding: 0 8px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

[data-gptbd-action-bar="true"] button:hover {
  background: color-mix(in srgb, CanvasText 9%, Canvas) !important;
}

[data-gptbd-action-bar="true"] button:disabled {
  cursor: not-allowed !important;
  opacity: 0.55 !important;
}

[data-gptbd-action-bar="true"] .mode-toggle {
  position: relative !important;
  display: block !important;
  width: 36px !important;
  min-width: 36px !important;
  height: 20px !important;
  min-height: 20px !important;
  box-sizing: border-box !important;
  border-radius: 999px !important;
  padding: 0 !important;
  line-height: 0 !important;
  background: color-mix(in srgb, CanvasText 9%, Canvas) !important;
}

[data-gptbd-action-bar="true"] .mode-toggle-thumb {
  position: absolute !important;
  top: 50% !important;
  left: 2px !important;
  width: 16px !important;
  height: 16px !important;
  border-radius: 999px !important;
  background: CanvasText !important;
  box-shadow: 0 1px 4px color-mix(in srgb, CanvasText 24%, transparent) !important;
  transform: translateY(-50%) !important;
  transition: transform 140ms ease, background-color 140ms ease !important;
}

[data-gptbd-action-bar="true"] .mode-toggle[aria-checked="true"] {
  border-color: #0f7a55 !important;
  background: #0f7a55 !important;
}

[data-gptbd-action-bar="true"] .mode-toggle[aria-checked="true"] .mode-toggle-thumb {
  transform: translate(16px, -50%) !important;
  background: Canvas !important;
}

[data-gptbd-action-bar="true"] .danger {
  border-color: color-mix(in srgb, #d93025 34%, transparent) !important;
  background: #d93025 !important;
  color: white !important;
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

.gptbd-speed-hidden {
  display: none !important;
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

.gptbd-speed-toolbar[data-notice] {
  border-color: color-mix(in srgb, #d97706 36%, transparent) !important;
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

.gptbd-speed-toolbar[data-notice] .gptbd-speed-summary {
  color: color-mix(in srgb, #d97706 82%, CanvasText) !important;
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

.gptbd-speed-toast {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  z-index: 2147483645 !important;
  display: grid !important;
  gap: 4px !important;
  width: min(360px, calc(100vw - 40px)) !important;
  padding: 14px 16px !important;
  box-sizing: border-box !important;
  transform: translate(-50%, -50%) !important;
  border: 1px solid color-mix(in srgb, CanvasText 14%, transparent) !important;
  border-radius: 8px !important;
  background: color-mix(in srgb, Canvas 96%, transparent) !important;
  box-shadow: 0 18px 60px color-mix(in srgb, CanvasText 22%, transparent) !important;
  color: CanvasText !important;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  pointer-events: none !important;
}

.gptbd-speed-toast[hidden] {
  display: none !important;
}

.gptbd-speed-toast[data-state="complete"] {
  border-color: color-mix(in srgb, #0f7a55 38%, transparent) !important;
}

.gptbd-speed-toast-title {
  color: CanvasText !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  line-height: 1.25 !important;
}

.gptbd-speed-toast-body {
  color: color-mix(in srgb, CanvasText 68%, transparent) !important;
  font-size: 12px !important;
  font-weight: 650 !important;
  line-height: 1.35 !important;
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
