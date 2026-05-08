import { chromium } from "@playwright/test";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "release", "store-assets");
const iconSvg = await readFile(path.join(rootDir, "public", "icons", "icon.svg"), "utf8");
const iconDataUri = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}`;

const viewport = { width: 1280, height: 800 };

const chatRows = [
  ["Product research notes", true, false],
  ["Refactor planning checklist", true, true],
  ["Customer support draft", false, false],
  ["Weekly review summary", true, false],
  ["Long conversation audit", false, false],
  ["Release notes outline", false, false],
  ["Design feedback cleanup", false, false],
  ["Meeting transcript cleanup", false, false]
];

const messages = [
  ["User", "Can you summarize the latest release checklist and keep the important blockers visible?"],
  ["Assistant", "Here is a concise release pass: package uploaded, listing assets prepared, privacy fields saved, and final review still pending."],
  ["User", "Now keep only the recent context visible first so the page opens quickly."],
  ["Assistant", "Speed mode keeps the newest messages rendered first, then lets you reveal older messages in place when you need them."]
];

const screenshots = [
  {
    filename: "screenshot-01-bulk-cleanup-1280x800.png",
    title: "Bulk cleanup mode",
    subtitle: "Select many ChatGPT conversations without losing your place.",
    scene: "bulk"
  },
  {
    filename: "screenshot-02-safe-selection-1280x800.png",
    title: "No accidental navigation",
    subtitle: "A dedicated checkbox lane keeps row clicks and selection clicks separate.",
    scene: "safe"
  },
  {
    filename: "screenshot-03-confirm-actions-1280x800.png",
    title: "Archive or delete deliberately",
    subtitle: "Pinned chats are protected, and destructive actions require confirmation.",
    scene: "confirm"
  },
  {
    filename: "screenshot-04-speed-mode-1280x800.png",
    title: "Speed mode for long chats",
    subtitle: "Render recent messages first, then reveal older context when needed.",
    scene: "speed"
  },
  {
    filename: "screenshot-05-local-settings-1280x800.png",
    title: "Local-first settings",
    subtitle: "Korean and English UI, stored locally in your browser.",
    scene: "settings"
  }
];

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const checkedIcon = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.6 11.3 3.4 8.1l1.4-1.4 1.8 1.8 4.7-4.8 1.4 1.4-6.1 6.2Z"/></svg>`;
const pinIcon = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.9 1.6 14.4 5l-2 2 1.1 1.1-1.4 1.4-2.8-2.8-2.6 2.6.2 2.2-1.1 1.1-2.4-2.4-1.2-1.2 1.1-1.1 2.2.2 2.6-2.6-2.8-2.8 1.4-1.4 1.1 1.1 2.1-1.8Z"/></svg>`;
const dotsIcon = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8a1.5 1.5 0 1 1 0 .1V8Zm4.5 0a1.5 1.5 0 1 1 0 .1V8Zm4.5 0a1.5 1.5 0 1 1 0 .1V8Z"/></svg>`;

function chatList({ selected = true, compact = false } = {}) {
  return `
    <div class="recent-label">Recent</div>
    <div class="cleanup-card ${compact ? "compact" : ""}">
      <div class="cleanup-head">
        <strong>${selected ? "3 selected" : "Cleanup off"}</strong>
        <span class="mini-toggle on"><i></i></span>
      </div>
      <div class="cleanup-actions">
        <button>All</button>
        <button>Clear</button>
        <button>Archive</button>
        <button class="danger">Delete</button>
      </div>
    </div>
    <div class="chat-list">
      ${chatRows
        .map(([title, isSelected, pinned], index) => {
          const selectedClass = isSelected && selected ? "is-selected" : "";
          const activeClass = index === 1 ? "is-active" : "";
          return `
            <div class="chat-row ${selectedClass} ${activeClass}">
              <span class="checkbox">${isSelected && selected ? checkedIcon : ""}</span>
              <span class="chat-title">${escapeHtml(title)}</span>
              ${pinned ? `<span class="pin">${pinIcon}</span>` : ""}
              ${index === 0 ? `<span class="dots">${dotsIcon}</span>` : ""}
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function browserShell(inner, { wideSidebar = false } = {}) {
  return `
    <div class="browser">
      <div class="browser-bar">
        <div class="traffic"><span></span><span></span><span></span></div>
        <div class="tab-chip"><img src="${iconDataUri}" alt="">Conversation Cleaner</div>
        <div class="address">chatgpt.com</div>
      </div>
      <div class="app ${wideSidebar ? "wide-sidebar" : ""}">
        ${inner}
      </div>
    </div>
  `;
}

function sidebar() {
  return `
    <aside class="sidebar">
      <div class="sidebar-top">
        <span>ChatGPT</span>
        <button>New chat</button>
      </div>
      ${chatList()}
    </aside>
  `;
}

function mainPanel(content) {
  return `<main class="main-panel">${content}</main>`;
}

function sceneBulk() {
  return browserShell(`
    ${sidebar()}
    ${mainPanel(`
      <div class="hero-copy">
        <div class="badge">Bulk mode on</div>
        <h2>Select first. Clean up second.</h2>
        <p>Checkboxes sit in a stable lane, so selecting conversations does not push titles around or trigger navigation.</p>
      </div>
      <div class="floating-summary">
        <span class="count">3</span>
        <span>conversations selected</span>
      </div>
    `)}
  `);
}

function sceneSafe() {
  return browserShell(`
    <aside class="sidebar focus-sidebar">
      <div class="sidebar-top">
        <span>ChatGPT</span>
        <button>New chat</button>
      </div>
      ${chatList({ compact: true })}
      <div class="target-ring"></div>
      <div class="lane-note">32px click target</div>
    </aside>
    ${mainPanel(`
      <div class="split-proof">
        <div>
          <span class="proof-label">Selection lane</span>
          <strong>Checkbox clicks are handled separately.</strong>
          <p>The row remains stable while bulk mode intercepts selection actions.</p>
        </div>
        <div>
          <span class="proof-label">Conversation row</span>
          <strong>Links are protected during cleanup.</strong>
          <p>Clicking the title in bulk mode toggles selection instead of opening a chat.</p>
        </div>
      </div>
    `)}
  `);
}

function sceneConfirm() {
  return browserShell(`
    ${sidebar()}
    ${mainPanel(`
      <div class="confirm-backdrop">
        <div class="confirm-dialog">
          <div class="dialog-icon"><img src="${iconDataUri}" alt=""></div>
          <h2>Delete 3 conversations?</h2>
          <p>This action runs only after confirmation. Pinned conversations stay selected and ask you to unpin them first.</p>
          <div class="dialog-list">
            <span>Product research notes</span>
            <span>Weekly review summary</span>
            <span>Long conversation audit</span>
          </div>
          <div class="dialog-actions">
            <button>Cancel</button>
            <button class="danger">Delete selected</button>
          </div>
        </div>
      </div>
    `)}
  `);
}

function sceneSpeed() {
  return browserShell(`
    <aside class="sidebar thin">
      <div class="sidebar-top">
        <span>ChatGPT</span>
      </div>
      ${chatList({ selected: false, compact: true })}
    </aside>
    ${mainPanel(`
      <div class="speed-toolbar">
        <strong>139 hidden · 10 visible · initial 10</strong>
        <div>
          <button>Show 5 more</button>
          <button>Show all</button>
        </div>
      </div>
      <div class="message-stack">
        ${messages
          .slice(0, 3)
          .map(
            ([role, text]) => `
              <section class="message">
                <h3>${escapeHtml(role)}</h3>
                <p>${escapeHtml(text)}</p>
              </section>
            `
          )
          .join("")}
      </div>
    `)}
  `);
}

function sceneSettings() {
  return `
    <div class="settings-stage">
      <div class="popup">
        <header>
          <img src="${iconDataUri}" alt="">
          <div>
            <small>CHATGPT</small>
            <h2>Cleaner</h2>
          </div>
          <button class="lang">KO</button>
          <span class="big-toggle on"><i></i></span>
        </header>
        <section class="setting-row">
          <div>
            <strong>Cleanup mode</strong>
            <p>Enable sidebar selection and archive/delete controls.</p>
          </div>
          <span class="mini-toggle"><i></i></span>
        </section>
        <section class="setting-row active">
          <div>
            <strong>Left panel</strong>
            <p>Show controls inside the ChatGPT sidebar.</p>
          </div>
          <span class="mini-toggle on"><i></i></span>
        </section>
        <section class="setting-row speed">
          <div>
            <strong>Speed mode</strong>
            <p>Load recent messages first.</p>
            <div class="number-grid">
              <label>Initial <span>10</span></label>
              <label>More <span>5</span></label>
            </div>
          </div>
          <span class="mini-toggle on"><i></i></span>
        </section>
        <footer>Settings stay in chrome.storage.local. No remote code.</footer>
      </div>
      <div class="settings-copy">
        <div class="badge">Bilingual UI</div>
        <h2>Korean or English, one clean workflow.</h2>
        <p>Users can switch language in the popup while keeping all extension preferences local to the browser.</p>
      </div>
    </div>
  `;
}

function renderScene(scene) {
  if (scene === "bulk") return sceneBulk();
  if (scene === "safe") return sceneSafe();
  if (scene === "confirm") return sceneConfirm();
  if (scene === "speed") return sceneSpeed();
  return sceneSettings();
}

function htmlForScreenshot(screenshot) {
  return String.raw`
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", sans-serif;
        background: #0c0f0e;
        color: #f6f7f4;
      }

      * {
        box-sizing: border-box;
      }

      body {
        width: 1280px;
        height: 800px;
        margin: 0;
        overflow: hidden;
        background:
          linear-gradient(135deg, #101412 0%, #171b19 48%, #0b0d0c 100%);
      }

      button {
        height: 42px;
        padding: 0 18px;
        border: 1px solid rgba(255, 255, 255, 0.13);
        border-radius: 10px;
        background: #202321;
        color: #f4f5f2;
        font: inherit;
        font-weight: 800;
      }

      .stage {
        position: relative;
        width: 100%;
        height: 100%;
        padding: 34px 42px 40px;
      }

      .headline {
        display: flex;
        align-items: end;
        justify-content: space-between;
        height: 108px;
        margin-bottom: 22px;
      }

      .headline h1 {
        margin: 0;
        font-size: 52px;
        line-height: 0.98;
        letter-spacing: 0;
      }

      .headline p {
        width: 462px;
        margin: 0 0 6px;
        color: rgba(246, 247, 244, 0.72);
        font-size: 21px;
        line-height: 1.38;
        font-weight: 650;
      }

      .browser {
        overflow: hidden;
        height: 590px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        background: #1a1d1b;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.44);
      }

      .browser-bar {
        display: grid;
        grid-template-columns: 88px 240px 1fr;
        align-items: center;
        gap: 14px;
        height: 64px;
        padding: 0 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: #292b2a;
      }

      .traffic {
        display: flex;
        gap: 8px;
      }

      .traffic span {
        width: 13px;
        height: 13px;
        border-radius: 50%;
      }

      .traffic span:nth-child(1) { background: #ff6057; }
      .traffic span:nth-child(2) { background: #ffbd2e; }
      .traffic span:nth-child(3) { background: #28c840; }

      .tab-chip {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 38px;
        padding: 0 13px;
        border-radius: 12px;
        background: #121514;
        color: rgba(255, 255, 255, 0.88);
        font-size: 15px;
        font-weight: 800;
      }

      .tab-chip img {
        width: 24px;
        height: 24px;
        border-radius: 7px;
      }

      .address {
        display: flex;
        align-items: center;
        height: 34px;
        padding: 0 18px;
        border-radius: 999px;
        background: #3a3d3b;
        color: rgba(255, 255, 255, 0.64);
        font-size: 14px;
        font-weight: 700;
      }

      .app {
        display: grid;
        grid-template-columns: 330px 1fr;
        height: calc(100% - 64px);
      }

      .app.wide-sidebar {
        grid-template-columns: 390px 1fr;
      }

      .sidebar {
        position: relative;
        padding: 22px 14px 18px;
        border-right: 1px solid rgba(255, 255, 255, 0.08);
        background: #202220;
      }

      .sidebar.thin {
        padding-right: 10px;
      }

      .sidebar-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0 6px 16px;
      }

      .sidebar-top span {
        font-size: 24px;
        font-weight: 850;
      }

      .sidebar-top button {
        height: 32px;
        padding: 0 12px;
        border-radius: 8px;
        font-size: 13px;
      }

      .recent-label {
        margin: 6px 8px 9px;
        color: rgba(255, 255, 255, 0.58);
        font-size: 14px;
        font-weight: 800;
      }

      .cleanup-card {
        margin: 0 0 14px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        background: #111312;
      }

      .cleanup-card.compact {
        padding: 10px;
      }

      .cleanup-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .cleanup-head strong {
        font-size: 18px;
      }

      .cleanup-actions {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 7px;
      }

      .cleanup-actions button {
        height: 38px;
        padding: 0;
        border-radius: 9px;
        font-size: 13px;
      }

      .cleanup-actions .danger,
      .danger {
        border-color: rgba(190, 55, 45, 0.78);
        background: #a02b24;
      }

      .mini-toggle,
      .big-toggle {
        position: relative;
        flex: 0 0 auto;
        border-radius: 999px;
        background: #2a2d2b;
        box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.14);
      }

      .mini-toggle {
        width: 56px;
        height: 32px;
      }

      .big-toggle {
        width: 88px;
        height: 52px;
      }

      .mini-toggle i,
      .big-toggle i {
        position: absolute;
        display: block;
        border-radius: 50%;
        background: #f5f4ef;
      }

      .mini-toggle i {
        top: 5px;
        left: 5px;
        width: 22px;
        height: 22px;
      }

      .mini-toggle.on {
        background: #0d8060;
        box-shadow: inset 0 0 0 2px rgba(35, 226, 159, 0.18);
      }

      .mini-toggle.on i {
        left: 29px;
        background: #101211;
      }

      .big-toggle.on {
        background: #0d8060;
      }

      .big-toggle i {
        top: 6px;
        right: 6px;
        width: 40px;
        height: 40px;
        background: #101211;
      }

      .chat-list {
        display: grid;
        gap: 4px;
      }

      .chat-row {
        display: grid;
        grid-template-columns: 34px 1fr 24px 24px;
        align-items: center;
        min-width: 0;
        height: 42px;
        padding: 0 8px 0 0;
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.88);
        font-size: 15px;
        font-weight: 700;
      }

      .chat-row.is-active {
        background: rgba(255, 255, 255, 0.08);
      }

      .chat-row.is-selected {
        background: rgba(11, 119, 89, 0.18);
      }

      .checkbox {
        display: grid;
        place-items: center;
        width: 24px;
        height: 24px;
        margin-left: 5px;
        border: 2px solid rgba(255, 255, 255, 0.52);
        border-radius: 7px;
        background: #171a18;
        box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.03);
      }

      .checkbox svg {
        width: 15px;
        height: 15px;
        fill: #ffffff;
      }

      .is-selected .checkbox {
        border-color: #36c993;
        background: #0d8060;
      }

      .chat-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .pin svg,
      .dots svg {
        width: 18px;
        height: 18px;
        fill: rgba(255, 255, 255, 0.48);
      }

      .main-panel {
        position: relative;
        overflow: hidden;
        padding: 46px 56px;
        background:
          linear-gradient(180deg, #1d201f 0%, #171918 100%);
      }

      .hero-copy {
        width: 560px;
        margin-top: 28px;
      }

      .badge,
      .proof-label {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 12px;
        border: 1px solid rgba(57, 219, 158, 0.24);
        border-radius: 999px;
        background: rgba(15, 128, 96, 0.14);
        color: #8ef0c7;
        font-size: 13px;
        font-weight: 900;
      }

      .hero-copy h2,
      .settings-copy h2 {
        margin: 18px 0 12px;
        font-size: 50px;
        line-height: 1;
        letter-spacing: 0;
      }

      .hero-copy p,
      .settings-copy p {
        margin: 0;
        color: rgba(246, 247, 244, 0.72);
        font-size: 21px;
        line-height: 1.4;
        font-weight: 650;
      }

      .floating-summary {
        position: absolute;
        right: 48px;
        bottom: 118px;
        display: flex;
        align-items: center;
        gap: 16px;
        width: 300px;
        padding: 18px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 16px;
        background: #111312;
        font-size: 21px;
        font-weight: 850;
      }

      .count {
        display: grid;
        place-items: center;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #0d8060;
        font-size: 34px;
      }

      .focus-sidebar {
        overflow: hidden;
      }

      .target-ring {
        position: absolute;
        left: 14px;
        top: 256px;
        width: 36px;
        height: 36px;
        border: 3px solid #62d8a9;
        border-radius: 10px;
        box-shadow: 0 0 0 10px rgba(98, 216, 169, 0.13);
      }

      .lane-note {
        position: absolute;
        left: 96px;
        top: 238px;
        padding: 9px 12px;
        border-radius: 10px;
        background: #0d8060;
        color: #fff;
        font-size: 14px;
        font-weight: 900;
      }

      .split-proof {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 22px;
        margin-top: 210px;
      }

      .split-proof > div {
        min-height: 170px;
        padding: 24px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        background: #121514;
      }

      .split-proof strong {
        display: block;
        margin: 16px 0 9px;
        font-size: 25px;
        line-height: 1.13;
      }

      .split-proof p {
        margin: 0;
        color: rgba(246, 247, 244, 0.67);
        font-size: 17px;
        line-height: 1.42;
        font-weight: 650;
      }

      .confirm-backdrop {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background: rgba(7, 8, 8, 0.64);
      }

      .confirm-dialog {
        width: 520px;
        padding: 28px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 18px;
        background: #121514;
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.46);
      }

      .dialog-icon img {
        width: 52px;
        height: 52px;
        border-radius: 14px;
      }

      .confirm-dialog h2 {
        margin: 18px 0 9px;
        font-size: 34px;
      }

      .confirm-dialog p {
        margin: 0 0 18px;
        color: rgba(246, 247, 244, 0.72);
        font-size: 17px;
        line-height: 1.42;
        font-weight: 650;
      }

      .dialog-list {
        display: grid;
        gap: 8px;
        margin-bottom: 22px;
      }

      .dialog-list span {
        min-height: 36px;
        padding: 8px 12px;
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.07);
        color: rgba(255, 255, 255, 0.82);
        font-weight: 750;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .speed-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 74px;
        padding: 16px 18px;
        border: 1px solid rgba(255, 255, 255, 0.13);
        border-radius: 14px;
        background: #101312;
      }

      .speed-toolbar strong {
        font-size: 22px;
      }

      .speed-toolbar div {
        display: flex;
        gap: 10px;
      }

      .message-stack {
        display: grid;
        gap: 14px;
        margin-top: 18px;
      }

      .message {
        padding: 18px 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        background: #181b19;
      }

      .message h3 {
        margin: 0 0 8px;
        color: rgba(246, 247, 244, 0.7);
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0;
      }

      .message p {
        margin: 0;
        color: #f6f7f4;
        font-size: 20px;
        line-height: 1.36;
      }

      .settings-stage {
        display: grid;
        grid-template-columns: 560px 1fr;
        align-items: center;
        gap: 72px;
        height: 590px;
      }

      .popup {
        padding: 24px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 22px;
        background: #111312;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.44);
      }

      .popup header {
        display: grid;
        grid-template-columns: 64px 1fr 64px 88px;
        align-items: center;
        gap: 16px;
        margin-bottom: 22px;
      }

      .popup header img {
        width: 64px;
        height: 64px;
        border-radius: 16px;
      }

      .popup small {
        display: block;
        color: rgba(255, 255, 255, 0.62);
        font-size: 18px;
        font-weight: 900;
        letter-spacing: 0;
      }

      .popup h2 {
        margin: 0;
        font-size: 39px;
        line-height: 1;
      }

      .lang {
        height: 52px;
        border-radius: 999px;
      }

      .setting-row {
        display: grid;
        grid-template-columns: 1fr 66px;
        align-items: center;
        gap: 16px;
        min-height: 98px;
        margin-top: 14px;
        padding: 18px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 14px;
        background: #181b19;
      }

      .setting-row.active {
        border-color: rgba(57, 219, 158, 0.28);
        background: #18211d;
      }

      .setting-row strong {
        font-size: 22px;
      }

      .setting-row p {
        margin: 7px 0 0;
        color: rgba(246, 247, 244, 0.66);
        font-size: 16px;
        line-height: 1.34;
        font-weight: 650;
      }

      .number-grid {
        display: flex;
        gap: 10px;
        margin-top: 12px;
      }

      .number-grid label {
        display: flex;
        align-items: center;
        gap: 9px;
        height: 36px;
        padding: 0 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 9px;
        color: rgba(246, 247, 244, 0.68);
        font-size: 14px;
        font-weight: 800;
      }

      .number-grid span {
        color: #fff;
        font-size: 18px;
      }

      .popup footer {
        margin-top: 18px;
        color: rgba(246, 247, 244, 0.62);
        font-size: 16px;
        font-weight: 750;
      }

      .settings-copy {
        max-width: 500px;
      }
    </style>
  </head>
  <body>
    <div class="stage">
      <div class="headline">
        <h1>${escapeHtml(screenshot.title)}</h1>
        <p>${escapeHtml(screenshot.subtitle)}</p>
      </div>
      ${renderScene(screenshot.scene)}
    </div>
  </body>
</html>
`;
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();

try {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport
  });

  for (const screenshot of screenshots) {
    await page.setContent(htmlForScreenshot(screenshot), { waitUntil: "load" });
    await page.screenshot({
      path: path.join(outputDir, screenshot.filename),
      fullPage: false
    });
  }
} finally {
  await browser.close();
}

await copyFile(
  path.join(outputDir, screenshots[0].filename),
  path.join(outputDir, "screenshot-1280x800.png")
);
