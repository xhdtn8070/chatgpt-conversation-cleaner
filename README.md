# ChatGPT Bulk Delete

A Manifest V3 Chrome extension that adds a stable bulk-selection overlay to the ChatGPT sidebar. Delete and archive actions try ChatGPT's same-origin web API first, then fall back to scoped UI automation only inside active ChatGPT menus and dialogs.

![UX mockup](docs/ux-mockup.png)

## Goals

- Show a dedicated checkbox lane in the ChatGPT sidebar only when Bulk mode is enabled.
- Keep checkbox clicks separate from conversation row navigation.
- In Bulk mode, clicking a conversation row toggles selection instead of navigating.
- Require an explicit confirmation before destructive actions.
- Prefer same-origin ChatGPT web API actions over UI clicking.
- Keep UI fallback constrained to active menus and dialogs.
- Store only local extension settings with `chrome.storage.local`.

## Development

```bash
npm install
npm run typecheck
npm run test
npm run build
```

Load `dist/` as an unpacked extension from `chrome://extensions`.

## Verification

```bash
npm run test:browser
```

The browser test uses a local mock sidebar fixture and injects the built content script to verify overlay rendering, selection, API-first actions, scoped UI fallback, and click isolation.

## Privacy

This extension only sends selected conversation IDs to ChatGPT's own same-origin web API when applying archive/delete actions. It does not send data to any third-party server. See `PRIVACY.md`.
