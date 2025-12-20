# Replyte

A Chrome extension for quick X (Twitter) replies with customizable templates and nickname management.

## Getting Started

### Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the `src` folder
5. The extension icon should appear in your toolbar

### Usage

1. **Management Interface**: Click the extension icon to open the manager
   - Add/edit response templates
   - Manage user nicknames and emojis
   - Import/export your data

2. **On X (Twitter)**: 
   - Click in any reply box to see the 💬 trigger button
   - Click it to access your favorite responses
   - Edit nicknames for users you interact with

### Templates

Use these placeholders in your responses:
- `{{nickname}}` - User's custom nickname
- `{{handle}}` - User's X handle
- `{{displayName}}` - User's display name
- `{{emojis}}` - User's custom emojis
- `((option1|option2))` - Random selection

Example: `"Great work, {{nickname}}! {{emojis}}"`

### Data Management

- **Export**: Save your responses and nicknames as JSON
- **Import**: Load previously exported data
- Data syncs across Chrome instances when signed in