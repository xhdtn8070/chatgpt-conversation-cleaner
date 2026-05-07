# Privacy

Conversation Cleaner for ChatGPT runs locally in the browser.

- No third-party network requests are made by the extension.
- Selected conversation IDs are sent only to ChatGPT's own same-origin web API to apply archive/delete actions.
- Conversation IDs and titles are read from the visible ChatGPT page to render the checkbox lane and execute selected actions.
- Bulk mode, Speed mode, Speed mode counts, language, and sidebar panel preferences are stored in local browser storage.
- When Speed mode is enabled, older ChatGPT message turn elements are hidden locally with CSS and revealed in place on demand.
- Speed mode does not send conversation content to third-party servers and does not patch ChatGPT's private conversation API response.
- Conversation content is not transmitted, sold, or sent to third-party servers.
- If the same-origin API is unavailable, the extension falls back to ChatGPT's visible menu/dialog controls without sending data anywhere else.
