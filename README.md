# Planyway Calendar Sync Chrome Extension

This Chrome extension allows you to synchronize tasks from Planyway to Google Calendar seamlessly.

## Features

- Sync tasks from Planyway to Google Calendar
- Handle time adjustments to ensure accurate scheduling
- Easy-to-use interface with a simple sync button

## Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd Planyway-Calendar-Sync
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" and select the `dist` folder from this project

## Usage

1. Click the extension icon in your Chrome toolbar.
2. Use the "Sync to Google Calendar" button to start syncing tasks.
3. Check your Google Calendar for the synced events.

## Setting Up Google API Credentials

To use this extension, you need to set up your Google API credentials:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Navigate to "APIs & Services" > "Credentials".
4. Click "Create Credentials" and select "OAuth client ID".
5. Configure the consent screen if prompted.
6. Set the application type to "Chrome App" and provide the necessary details.
7. Note the Client ID generated.
8. Replace the placeholder in your code with your actual Client ID.

## Important

- Do not share your Client ID publicly.
- Ensure your Google Cloud project is properly secured.

## Contributing

Feel free to submit issues or pull requests if you have suggestions or improvements.

## License

This project is licensed under the MIT License.
