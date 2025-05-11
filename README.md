# Gmail Smart Sidebar

A Chrome extension that adds an intelligent sidebar to Gmail that automatically summarizes emails and extracts calendar events.

## Features

- **Automatic Email Detection**: Detects when you open an email in Gmail
- **Email Summarization**: Uses OpenAI GPT-4o to generate concise 3-5 bullet point summaries
- **Calendar Event Extraction**: Identifies dates, times, and events mentioned in emails
- **Google Calendar Integration**: One-click "Add to Calendar" links for each detected event
- **Robust Error Handling**: Fallback options if API calls fail
- **Toggle Visibility**: Hide or show sidebar with a click on the extension icon

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `extension` folder from this repository

## Configuration

Before using the extension, you need to:

1. Get an OpenAI API key from [OpenAI's platform](https://platform.openai.com/api-keys)
2. Create a `config.js` file by copying the template:
   ```
   cp extension/js/config.template.js extension/js/config.js
   ```
3. Edit `extension/js/config.js` to include your API key:
   ```js
   const CONFIG = {
     openai: {
       apiKey: "YOUR_OPENAI_API_KEY_HERE", // Replace with actual key
       model: "gpt-4o"
     },
     // other settings...
   };
   ```

The `config.js` file is included in `.gitignore` to prevent your API keys from being committed to the repository.

## Usage

1. After installation, navigate to Gmail in Chrome
2. Open any email
3. The Smart Sidebar will appear on the right side of the screen
4. View the automatically generated summary and any calendar events
5. Click "Add to Calendar" to add events to Google Calendar

### Controlling the Sidebar

- **Toggle Visibility**: Click the extension icon in the Chrome toolbar to show/hide the sidebar
- **Close Button**: Click the × in the top-right corner of the sidebar to hide it
- **Debug Mode**: Click "Debug" in the sidebar header to see technical details about calendar event parsing

## Implementation Details

- Built as a Chrome extension with vanilla JavaScript
- Uses the OpenAI API with GPT-4o for intelligent email processing
- No OAuth or direct Google API access required - all data extraction is client-side
- Robust DOM element detection for Gmail's dynamic interface

## Development

The extension consists of:

- `manifest.json`: Extension configuration
- `background.js`: Handles API calls to OpenAI
- `content.js`: Manages sidebar UI and email detection
- `sidebar.css`: Styling for the sidebar
- `config.template.js`: Template for configuration (safe to commit)
- `config.js`: Local configuration with API keys (gitignored)

## Known Issues

- Gmail's interface changes may occasionally affect the sidebar positioning
- Date parsing for calendar events may not handle all date/time formats perfectly

## License

This project is released under the MIT License. 