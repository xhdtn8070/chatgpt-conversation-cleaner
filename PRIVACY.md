# Privacy

Conversation Cleaner for ChatGPT runs locally in the browser.

- No third-party network requests are made by the extension.
- Selected conversation IDs are sent only to ChatGPT's own same-origin web API to apply archive/delete actions.
- Conversation IDs and titles are read from the visible ChatGPT page to render the checkbox lane and execute selected actions.
- Bulk mode and language preferences are stored in `chrome.storage.local`.
- Conversation content is not collected, stored, transmitted, or sold.
- If the same-origin API is unavailable, the extension falls back to ChatGPT's visible menu/dialog controls without sending data anywhere else.
