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

1. **Create a Google Cloud Project**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new project.

2. **Enable APIs**
   - Navigate to "APIs & Services" > "Library".
   - Enable the following APIs:
     - Google Calendar API
     - Identity API
     - Identity Management API

3. **Create OAuth Credentials**
   - Go to "APIs & Services" > "Credentials".
   - Click "Create Credentials" and select "OAuth client ID".
   - Configure the consent screen if prompted.
   - Set the application type to "Chrome Extension" and provide the necessary details.
   - Note the Client ID generated.

4. **Replace the Placeholder**
   - Replace the `YOUR_CLIENT_ID_HERE` placeholder in the `manifest.json` file with your actual Client ID.

5. **Security Note**
   - Keep your Client ID secure and do not share it publicly.

This setup is necessary for the extension to authenticate with Google services and sync your tasks to Google Calendar.

## Important

- Do not share your Client ID publicly.
- Ensure your Google Cloud project is properly secured.

## Contributing

Feel free to submit issues or pull requests if you have suggestions or improvements.

## License

This project is licensed under the MIT License.
