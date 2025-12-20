# Replyte Chrome Extension

A Chrome extension to help users reply faster on X with high-quality, reusable responses and nicknames.

## Features

- **Quick Reply Insertion**: Insert saved responses directly into X compose/reply boxes
- **Template Variables**: Use `{{nickname}}`, `{{handle}}`, `{{displayName}}` placeholders
- **Nickname Management**: Save nicknames for X handles for personalized responses
- **Web Manager**: Full CRUD interface for managing responses and nicknames
- **Import/Export**: Backup and share your response library
- **Search & Favorites**: Quickly find and access your most-used responses

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" and select the `x-reply-helper` folder
4. The extension should now appear in your extensions list

## Usage

### On X.com
1. Navigate to any X page with a compose/reply box
2. Look for the "💬 Replies" button near the composer
3. Click to see your saved responses
4. Click any response to insert it into the composer

### Extension Popup
- Click the extension icon to see favorites and search responses
- Click "Manage" to open the full web manager

### Web Manager
- Access via extension popup or directly at `chrome-extension://[id]/manager.html`
- Create, edit, delete responses
- Manage nicknames for X handles
- Import/export your data

## Template Variables

- `{{nickname}}` - Saved nickname for the user (falls back to display name)
- `{{handle}}` - X handle without @
- `{{displayName}}` - User's display name
- `{{hashtag}}` - Your default hashtag (configurable)

## File Structure

```
x-reply-helper/
├── manifest.json       # Extension configuration
├── background.js       # Service worker for storage
├── content.js         # X page integration
├── styles.css         # Extension UI styles
├── popup.html         # Extension popup
├── popup.js           # Popup functionality
├── manager.html       # Web manager interface
├── manager.js         # Manager functionality
└── icons/            # Extension icons
```

## Development

The extension uses:
- Chrome Storage API for data persistence
- Content scripts for X integration
- Manifest V3 service worker architecture
- Vanilla JavaScript (no frameworks)

## Privacy

- No data leaves your device
- No credentials collected
- No DM access
- Uses only Chrome's built-in storage