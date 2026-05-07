import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(rootDir, "docs");
const outputPath = path.join(docsDir, "readme-hero.png");
const iconSvg = await readFile(path.join(rootDir, "public/icons/icon.svg"), "utf8");
const iconDataUri = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}`;

const conversations = [
  ["프로젝트 정리 플로우", true],
  ["긴 대화 성능 점검", true],
  ["회의록 요약", false],
  ["이미지 변환 방법", false],
  ["배포 체크리스트", false],
  ["사이드바 UI 조정", false],
  ["README 개선 방향", false]
];

const html = String.raw`
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #070909;
        color: #f6f7f8;
      }

      * {
        box-sizing: border-box;
      }

      body {
        width: 1672px;
        height: 941px;
        margin: 0;
        overflow: hidden;
        background:
          radial-gradient(circle at 18% 12%, rgba(15, 122, 85, 0.22), transparent 28%),
          radial-gradient(circle at 88% 88%, rgba(234, 74, 170, 0.2), transparent 26%),
          linear-gradient(135deg, #060707 0%, #101312 52%, #070808 100%);
      }

      .stage {
        position: relative;
        width: 100%;
        height: 100%;
        padding: 58px 72px;
      }

      .orbital-line {
        position: absolute;
        inset: auto -140px -110px -120px;
        height: 280px;
        border-top: 1px solid rgba(91, 214, 164, 0.22);
        border-radius: 50%;
        transform: rotate(5deg);
        opacity: 0.75;
      }

      .browser {
        position: relative;
        width: 1364px;
        height: 782px;
        margin: 0 auto;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 22px;
        background: #171817;
        box-shadow: 0 38px 100px rgba(0, 0, 0, 0.5);
      }

      .browser-bar {
        height: 76px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: #2a2a29;
      }

      .tabs {
        display: flex;
        align-items: center;
        height: 38px;
        padding: 0 18px;
        gap: 8px;
      }

      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }

      .red { background: #ff5f57; }
      .yellow { background: #febc2e; }
      .green { background: #28c840; }

      .tab {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 238px;
        height: 30px;
        margin-left: 12px;
        padding: 0 10px;
        border-radius: 9px 9px 0 0;
        background: #111312;
        color: rgba(255, 255, 255, 0.82);
        font-size: 12px;
        font-weight: 700;
      }

      .tab img {
        width: 18px;
        height: 18px;
        border-radius: 5px;
      }

      .address-row {
        display: flex;
        align-items: center;
        height: 38px;
        padding: 0 18px;
        gap: 12px;
      }

      .chrome-icon {
        width: 18px;
        height: 18px;
        border-radius: 5px;
        border: 1px solid rgba(255,255,255,.14);
      }

      .address {
        flex: 1;
        height: 26px;
        border-radius: 99px;
        background: #3a3a39;
        color: rgba(255, 255, 255, 0.76);
        display: flex;
        align-items: center;
        padding: 0 16px;
        font-size: 12px;
      }

      .app {
        display: grid;
        grid-template-columns: 286px 1fr;
        height: calc(100% - 76px);
        background: #1f201f;
      }

      .sidebar {
        position: relative;
        padding: 20px 10px 14px;
        border-right: 1px solid rgba(255, 255, 255, 0.09);
        background: #1e1f1e;
      }

      .brand {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0 8px 22px;
        font-size: 22px;
        font-weight: 750;
      }

      .nav-row,
      .project-row,
      .chat-row {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 34px;
        padding: 0 8px;
        border-radius: 9px;
        color: rgba(255, 255, 255, 0.82);
        font-size: 14px;
      }

      .glyph {
        display: inline-flex;
        width: 18px;
        height: 18px;
        align-items: center;
        justify-content: center;
        color: rgba(255,255,255,.9);
      }

      .section-title {
        margin: 18px 8px 8px;
        color: rgba(255, 255, 255, 0.68);
        font-size: 12px;
        font-weight: 750;
      }

      .inline-panel {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 40px;
        margin: 20px 0 12px;
        padding: 0 10px;
        border: 1px solid rgba(255, 255, 255, 0.13);
        border-radius: 9px;
        background: #111211;
        color: #f4f4f3;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
        font-size: 13px;
        font-weight: 800;
      }

      .toggle {
        position: relative;
        width: 44px;
        height: 24px;
        border-radius: 99px;
        background: #2d2f2e;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.16);
      }

      .toggle::after {
        content: "";
        position: absolute;
        top: 3px;
        left: 3px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #f5f5f2;
      }

      .toggle.on {
        background: #0f7a55;
      }

      .toggle.on::after {
        left: 23px;
      }

      .recent {
        margin: 0 8px 8px;
        color: #f4f4f2;
        font-size: 13px;
        font-weight: 750;
      }

      .chat-list {
        display: grid;
        gap: 2px;
      }

      .chat-row {
        height: 35px;
        padding: 0 10px;
        justify-content: space-between;
        white-space: nowrap;
      }

      .chat-row.active {
        background: #343534;
      }

      .pin {
        color: rgba(255,255,255,.42);
      }

      .main {
        position: relative;
        padding: 28px 48px;
        background:
          linear-gradient(90deg, rgba(31,32,31,1) 0%, rgba(23,24,23,1) 70%, rgba(20,21,20,1) 100%);
      }

      .speed-bar {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        min-height: 42px;
        padding: 0 12px 0 16px;
        border: 1px solid rgba(255, 255, 255, 0.11);
        border-radius: 12px;
        background: rgba(14, 15, 14, 0.92);
        box-shadow: 0 14px 35px rgba(0,0,0,.26);
        color: rgba(255,255,255,.78);
        font-size: 13px;
        font-weight: 700;
      }

      .speed-bar button {
        height: 28px;
        padding: 0 12px;
        border: 1px solid rgba(255,255,255,.13);
        border-radius: 8px;
        background: #252726;
        color: #f6f6f4;
        font-weight: 800;
      }

      .message-stack {
        display: grid;
        gap: 20px;
        width: 620px;
        margin-top: 58px;
      }

      .message {
        border-radius: 24px;
        background: rgba(255,255,255,.045);
        padding: 20px 22px;
      }

      .line {
        height: 12px;
        margin: 9px 0;
        border-radius: 99px;
        background: rgba(255,255,255,.14);
      }

      .line.short { width: 56%; }
      .line.mid { width: 72%; }
      .line.long { width: 92%; }

      .popup {
        position: absolute;
        top: 105px;
        right: 56px;
        width: 340px;
        padding: 12px;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 14px;
        background: #101110;
        color: #f7f7f5;
        box-shadow: 0 28px 80px rgba(0,0,0,.52);
      }

      .popup-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }

      .popup-header img {
        width: 36px;
        height: 36px;
        border-radius: 10px;
      }

      .eyebrow {
        margin: 0 0 2px;
        color: rgba(255,255,255,.58);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .04em;
      }

      .popup-title {
        font-size: 21px;
        font-weight: 850;
        line-height: 1;
      }

      .language {
        min-width: 42px;
        min-height: 28px;
        margin-left: auto;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 99px;
        background: #1d1f1e;
        color: #f7f7f5;
        font-size: 12px;
        font-weight: 850;
      }

      .popup-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        min-height: 70px;
        margin-top: 8px;
        padding: 9px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 8px;
        background: #1b1c1b;
      }

      .popup-row strong,
      .support strong {
        display: block;
        margin-bottom: 3px;
        font-size: 13px;
      }

      .popup-row span,
      .support p,
      .hint {
        margin: 0;
        color: rgba(255,255,255,.64);
        font-size: 11px;
        line-height: 1.38;
      }

      .speed-settings {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 8px;
        padding: 10px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 8px;
        background: #171817;
      }

      .field {
        display: grid;
        gap: 5px;
        color: rgba(255,255,255,.64);
        font-size: 11px;
        font-weight: 800;
      }

      .field div {
        height: 32px;
        padding: 7px 9px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 7px;
        color: white;
        background: #0f100f;
        font-size: 13px;
      }

      .metric {
        grid-column: 1 / -1;
        color: rgba(255,255,255,.64);
        font-size: 11px;
        font-weight: 800;
      }

      .save {
        grid-column: 1 / -1;
        min-height: 32px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 7px;
        background: #202220;
        color: white;
        font-size: 12px;
        font-weight: 850;
      }

      .hint {
        margin-top: 10px;
      }

      .support {
        display: grid;
        gap: 8px;
        margin-top: 10px;
        padding: 10px;
        border: 1px solid rgba(234, 74, 170, .42);
        border-radius: 8px;
        background: rgba(234, 74, 170, .08);
      }

      .sponsor {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 32px;
        border-radius: 7px;
        background: #ea4aaa;
        color: white;
        font-size: 12px;
        font-weight: 850;
      }

      .source {
        text-align: center;
        color: rgba(255,255,255,.72);
        font-size: 11px;
        font-weight: 800;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

    </style>
  </head>
  <body>
    <main class="stage">
      <div class="orbital-line"></div>
      <section class="browser" aria-label="Conversation Cleaner preview">
        <div class="browser-bar">
          <div class="tabs">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
            <div class="tab"><img src="${iconDataUri}" alt="" /> ChatGPT</div>
          </div>
          <div class="address-row">
            <span class="chrome-icon"></span>
            <div class="address">chatgpt.com</div>
          </div>
        </div>

        <section class="app">
          <aside class="sidebar">
            <div class="brand">ChatGPT <span>▯</span></div>
            <div class="nav-row"><span class="glyph">✎</span> 새 채팅</div>
            <div class="nav-row"><span class="glyph">⌕</span> 채팅 검색</div>
            <div class="nav-row"><span class="glyph">◇</span> Codex</div>
            <div class="section-title">프로젝트</div>
            <div class="project-row"><span class="glyph">▱</span> 수연</div>
            <div class="project-row"><span class="glyph">▱</span> 게임 기획서 만들기</div>
            <div class="project-row"><span class="glyph">▱</span> 면접준비</div>

            <div class="inline-panel">
              <span>일괄 정리 꺼짐</span>
              <span class="toggle"></span>
            </div>

            <div class="recent">최근</div>
            <div class="chat-list">
              ${conversations
                .map(
                  ([title, pinned], index) =>
                    `<div class="chat-row ${index === 0 ? "active" : ""}"><span>${title}</span><span class="pin">${pinned ? "◆" : ""}</span></div>`
                )
                .join("")}
            </div>
          </aside>

          <section class="main">
            <div class="speed-bar">
              <span>이전 52개 접힘 · 10개 표시 중 · 5.26초</span>
              <button>5개 더 보기</button>
              <button>전체 보기</button>
            </div>

            <div class="message-stack">
              <div class="message">
                <div class="line long"></div>
                <div class="line mid"></div>
                <div class="line short"></div>
              </div>
              <div class="message">
                <div class="line mid"></div>
                <div class="line long"></div>
                <div class="line short"></div>
              </div>
              <div class="message">
                <div class="line long"></div>
                <div class="line mid"></div>
              </div>
            </div>

            <section class="popup">
              <div class="popup-header">
                <img src="${iconDataUri}" alt="" />
                <div>
                  <p class="eyebrow">CHATGPT</p>
                  <div class="popup-title">정리</div>
                </div>
                <button class="language">EN</button>
                <span class="toggle on"></span>
              </div>

              <div class="popup-row">
                <div>
                  <strong>좌측 패널</strong>
                  <span>ChatGPT 사이드바 안에 일괄 컨트롤을 표시합니다.</span>
                </div>
                <span class="toggle on"></span>
              </div>

              <div class="popup-row">
                <div>
                  <strong>정리 모드</strong>
                  <span>사이드바 선택과 정리 작업을 활성화합니다.</span>
                </div>
                <span class="toggle"></span>
              </div>

              <div class="popup-row">
                <div>
                  <strong>속도 모드</strong>
                  <span>긴 대화는 최근 메시지를 먼저 보여줍니다.<br />최근 10개 · 더보기 5개씩</span>
                </div>
                <span class="toggle on"></span>
              </div>

              <div class="speed-settings">
                <div class="field">최근 표시<div>10</div></div>
                <div class="field">더보기 개수<div>5</div></div>
                <div class="metric">렌더 5.26초</div>
                <button class="save">저장</button>
              </div>

              <p class="hint">정리 모드를 켜면 사이드바 대화를 선택할 수 있습니다.</p>

              <div class="support">
                <div>
                  <strong>프로젝트 응원하기</strong>
                  <p>무료 오픈소스 유지를 GitHub Sponsors로 응원해주세요.</p>
                </div>
                <div class="sponsor">GitHub Sponsors로 후원하기</div>
                <div class="source">GitHub에서 소스 보기</div>
              </div>
            </section>
          </section>
        </section>
      </section>

    </main>
  </body>
</html>`;

await mkdir(docsDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1672, height: 941 },
  deviceScaleFactor: 1
});

await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: outputPath, fullPage: false });
await browser.close();

console.log(`Rendered ${path.relative(rootDir, outputPath)}`);
