# ChatGPT Bulk Delete

A Manifest V3 Chrome extension that adds a stable bulk-selection overlay to the ChatGPT sidebar. The first version focuses on reliable selection and deletion through ChatGPT's existing web UI rather than private API calls.

![UX mockup](docs/ux-mockup.png)

## Goals

- Show a dedicated checkbox lane in the ChatGPT sidebar only when Bulk mode is enabled.
- Keep checkbox clicks separate from conversation row navigation.
- Require an explicit confirmation before destructive actions.
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

The browser test uses a local mock sidebar fixture and injects the built content script to verify overlay rendering, selection, and click isolation.

## Privacy

This extension does not send conversation titles, IDs, or settings to any external server. See `PRIVACY.md`.
