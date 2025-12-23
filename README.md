# Replyte

[![Docker Hub Server](https://img.shields.io/docker/v/rjchicago/replyte-server?label=Server)](https://hub.docker.com/r/rjchicago/replyte-server)
[![Docker Hub Web](https://img.shields.io/docker/v/rjchicago/replyte-web?label=Web)](https://hub.docker.com/r/rjchicago/replyte-web)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/rjchicago/replyte/workflows/Build%20and%20Test/badge.svg)](https://github.com/rjchicago/replyte/actions)

A Chrome extension for quick X (Twitter) replies with customizable templates and nickname management.

## Overview

Replyte streamlines your X (Twitter) interactions by providing:

- 🚀 **Quick Replies**: Access favorite responses with one click
- 👥 **Nickname Management**: Assign custom nicknames to X handles
- 📝 **Template System**: Create reusable response templates with placeholders
- 🔄 **Cross-Device Sync**: Keep data synchronized across Chrome instances
- 🌐 **Web Dashboard**: Manage templates and nicknames via web interface
- 📦 **Data Export/Import**: Backup and restore your configurations

## Quick Start

### Chrome Extension

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the `src` folder
5. The extension icon should appear in your toolbar

### Web Dashboard (Optional)

```bash
# Start the full stack
docker compose up -d

# Access web interface
open https://replyte.localtest.me
```

## Usage

### Chrome Extension

1. **Management Interface**: Click the extension icon to open the manager
   - Add/edit response templates
   - Manage user nicknames and emojis
   - Import/export your data

2. **On X (Twitter)**: 
   - Click in any reply box to see the 💬 trigger button
   - Click it to access your favorite responses
   - Edit nicknames for users you interact with

### Template Placeholders

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
- **Sync**: Data syncs across Chrome instances when signed in

## Development

### Local Setup

```bash
# Generate SSL certificates
./scripts/mkcert.sh

# Start development environment
docker compose up -d

# Run tests
./scripts/test-ci.sh
```

### Architecture

- **Chrome Extension** (`src/`): Content scripts and popup interface
- **Web Dashboard** (`web/`): React frontend for template management
- **API Server** (`server/`): Node.js backend with PostgreSQL
- **Authentication**: TinyAuth for web dashboard access
- **Proxy**: Traefik for SSL termination and routing

### Testing

```bash
# Run all tests
./scripts/test-ci.sh

# Server tests only
docker compose -f docker-compose.ci.yml run --rm server-test

# Web tests only
docker compose -f docker-compose.ci.yml run --rm web-test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.