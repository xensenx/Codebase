

# This Project is Archievd. 












````
# Minimal Text Editor - Desktop Application

A lightweight, fast-loading desktop text editor built with Neutralino.js for Windows.

## Features

- **Lightweight**: Native-like performance with minimal resource usage
- **Native Window**: Proper Windows application with native controls
- **Native File Dialogs**: Open and save files using Windows native dialogs
- **Dark Themes**: 4 beautiful dark themes to choose from
- **Auto-save**: Automatic saving to persistent storage
- **Customizable**: Font size, line spacing, and word wrap controls
- **Keyboard Shortcuts**: Ctrl+N, Ctrl+O, Ctrl+S support

## System Requirements

- Windows 7 or later (64-bit)
- Minimum 100 MB free disk space
- Minimum 100 MB RAM

## Installation & Setup

### Method 1: Download Pre-built Binary (Recommended)

1. Download the latest release from the releases page
2. Extract the ZIP file to your desired location
3. Run `minimal-text-editor.exe`

### Method 2: Build from Source

#### Prerequisites

1. **Install Node.js** (v14 or later)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version` and `npm --version`

2. **Install Neutralino.js CLI**
   ```bash
   npm install -g @neutralinojs/neu
   ```

#### Build Steps

1. **Navigate to the project directory**
   ```bash
   cd neutralino-text-editor
   ```

2. **Download Neutralino binaries**
   ```bash
   neu update
   ```
   This downloads the required Neutralino runtime binaries for Windows.

3. **Build the application**
   ```bash
   neu build
   ```
   This creates the application bundle in the `dist` folder.

4. **Run the application**
   ```bash
   neu run
   ```
   Or directly run the executable from `dist/minimal-text-editor/`

## Project Structure

```
neutralino-text-editor/
├── neutralino.config.json    # Neutralino configuration
├── resources/                 # Application resources
│   ├── index.html            # Main HTML file
│   ├── style.css             # Stylesheet
│   ├── script.js             # Application logic with Neutralino API
│   ├── icons/                # Application icons
│   │   └── appIcon.png       # App icon (256x256)
│   └── js/                   # Neutralino client library (auto-generated)
│       └── neutralino.js
├── .tmp/                     # Temporary build files (auto-generated)
└── dist/                     # Distribution folder (auto-generated)
    └── minimal-text-editor/  # Final application
        ├── minimal-text-editor.exe  # Windows executable
        ├── resources.neu            # Application resources bundle
        └── WebView2Loader.dll       # WebView2 runtime
```

## Development

### Running in Development Mode

```bash
neu run
```

### Building for Distribution

```bash
neu build
```

The built application will be in `dist/minimal-text-editor/`

### Making Changes

1. Edit files in the `resources/` directory:
   - `index.html` - UI structure
   - `style.css` - Styling
   - `script.js` - Application logic

2. Save your changes

3. Restart the application to see changes:
   ```bash
   neu run
   ```

## Configuration

Edit `neutralino.config.json` to customize:

- **Window size**: Modify `modes.window.width` and `modes.window.height`
- **App title**: Change `modes.window.title`
- **Minimum size**: Adjust `modes.window.minWidth` and `minHeight`
- **App ID**: Update `applicationId`

## Building a Standalone Installer

To create an installer for distribution:

1. **Install Inno Setup** (Windows)
   - Download from: https://jrsoftware.org/isinfo.php

2. **Create an installer script** (example):
   ```
   [Setup]
   AppName=Minimal Text Editor
   AppVersion=1.0.0
   DefaultDirName={pf}\MinimalTextEditor
   DefaultGroupName=Minimal Text Editor
   OutputDir=installer
   OutputBaseFilename=MinimalTextEditor-Setup
   
   [Files]
   Source: "dist\minimal-text-editor\*"; DestDir: "{app}"; Flags: recursesubdirs
   
   [Icons]
   Name: "{group}\Minimal Text Editor"; Filename: "{app}\minimal-text-editor.exe"
   ```

3. **Compile the installer** using Inno Setup

## Keyboard Shortcuts

- `Ctrl + N` - New document
- `Ctrl + O` - Open file
- `Ctrl + S` - Save file
- `Esc` - Close settings panel

## Storage

The application uses Neutralino's storage API to save:
- Editor content (auto-saved every 2 seconds)
- Theme preference
- Font size
- Line spacing
- Word wrap setting

Storage is persistent and survives app restarts.

## Troubleshooting

### Application won't start

1. Make sure you've run `neu update` to download binaries
2. Check if Windows Defender is blocking the executable
3. Ensure you have the required Visual C++ redistributables

### File dialogs not working

1. The app requires Windows 7 or later
2. Ensure the app has proper file system permissions

### Changes not saving

1. Check if the app has write permissions to its directory
2. Look for errors in the console (run with `neu run --verbose`)

## Performance

- **Bundle size**: ~5 MB (including runtime)
- **Memory usage**: ~50-80 MB
- **Startup time**: <1 second
- **No internet required**: Runs completely offline

## License

MIT License - feel free to use and modify.

## Credits

- Built with [Neutralino.js](https://neutralino.js.org/)
- Icons: Feather Icons style
- Font: System default monospace

## Support

For issues or questions, please create an issue in the repository.
