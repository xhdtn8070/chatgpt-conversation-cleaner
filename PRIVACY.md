# Privacy

Conversation Cleaner for ChatGPT runs locally in the browser.

- No third-party network requests are made by the extension.
- Selected conversation IDs are sent only to ChatGPT's own same-origin web API to apply archive/delete actions.
- Conversation IDs and titles are read from the visible ChatGPT page to render the checkbox lane and execute selected actions.
- Bulk mode, Speed mode, Speed mode counts, language, and sidebar panel preferences are stored in `chrome.storage.local`.
- When Speed mode is enabled, the current conversation detail API response is kept in the page's JavaScript memory only so older messages can be revealed without repeated API calls.
- The Speed mode page-memory cache is not written to `chrome.storage.local`, not persisted across refreshes, and not sent anywhere outside ChatGPT.
- Conversation content is not transmitted, sold, or sent to third-party servers.
- If the same-origin API is unavailable, the extension falls back to ChatGPT's visible menu/dialog controls without sending data anywhere else.
