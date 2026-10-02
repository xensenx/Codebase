# Quick Start Guide - Minimal Text Editor Desktop App

## For Windows Users

### Step 1: Install Prerequisites

1. **Download and Install Node.js**
   - Visit: https://nodejs.org/
   - Download the "LTS" (Long Term Support) version
   - Run the installer and follow the prompts
   - Keep all default settings
   - Restart your computer after installation

2. **Verify Node.js Installation**
   - Open Command Prompt (Press Win + R, type `cmd`, press Enter)
   - Type: `node --version` and press Enter
   - You should see something like: `v18.17.0`
   - Type: `npm --version` and press Enter
   - You should see something like: `9.6.7`

3. **Install Neutralino CLI**
   - In the same Command Prompt window, type:
     ```
     npm install -g @neutralinojs/neu
     ```
   - Press Enter and wait for installation to complete
   - This may take 1-2 minutes

### Step 2: Set Up the Project

1. **Extract the Project**
   - Extract the `neutralino-text-editor` folder to a location like:
     - `C:\Users\YourName\Desktop\neutralino-text-editor`
     - OR `C:\Projects\neutralino-text-editor`

2. **Open Command Prompt in Project Folder**
   - Navigate to the project folder in File Explorer
   - Click in the address bar and type `cmd`, then press Enter
   - OR: Hold Shift, right-click in the folder, select "Open PowerShell window here"

3. **Download Neutralino Binaries**
   - In the Command Prompt, type:
     ```
     neu update
     ```
   - Press Enter and wait (this downloads ~10 MB of files)
   - You should see: "Neutralino binaries downloaded successfully"

### Step 3: Run the Application

**Option A: Run in Development Mode**
```
neu run
```
- The text editor window will open immediately
- Perfect for testing and development

**Option B: Build and Run Executable**
```
neu build
```
- Wait for the build to complete
- Navigate to: `dist\minimal-text-editor\`
- Double-click `minimal-text-editor.exe`
- The app will start as a native Windows application

### Step 4: Use the Application

✅ **The app is now running!**

- Type anything in the editor
- Text auto-saves every 2 seconds
- Click the settings icon to change theme, font size, etc.
- Use Ctrl+O to open files, Ctrl+S to save files

---

## Common Commands Reference

| Command | Description |
|---------|-------------|
| `neu update` | Download/update Neutralino binaries |
| `neu run` | Run the app in development mode |
| `neu build` | Build the executable in dist/ folder |
| `neu --help` | Show all available commands |

---

## File Locations

After building, your executable is at:
```
neutralino-text-editor\
  └── dist\
      └── minimal-text-editor\
          ├── minimal-text-editor.exe  ← Double-click this!
          ├── resources.neu
          └── WebView2Loader.dll
```

---

## Creating a Desktop Shortcut

1. Navigate to: `dist\minimal-text-editor\`
2. Right-click on `minimal-text-editor.exe`
3. Select "Create shortcut"
4. Drag the shortcut to your Desktop

---

## Troubleshooting

### "neu is not recognized as an internal or external command"

**Solution**: Neutralino CLI not installed properly.
```
npm install -g @neutralinojs/neu
```

### "Cannot find module 'neutralino'"

**Solution**: Need to download binaries.
```
neu update
```

### Application won't start after building

**Solution**: Make sure all files in the dist folder are together:
- minimal-text-editor.exe
- resources.neu
- WebView2Loader.dll

Don't move or delete any of these files!

### Windows Defender blocks the app

**Solution**: 
1. Click "More info"
2. Click "Run anyway"
3. This is safe - it's your own app!

---

## Next Steps

✅ **You're all set!** The app should be running.

**Want to customize it?**
- Edit files in the `resources/` folder
- Run `neu run` to see your changes
- Run `neu build` when you're ready to create a new executable

**Want to distribute it?**
- Copy the entire `dist\minimal-text-editor\` folder
- Share it with others (no installation needed!)
- Or create an installer using Inno Setup (see README.md)

---

## Support

If you encounter issues:
1. Make sure Node.js is installed: `node --version`
2. Make sure Neutralino CLI is installed: `neu --version`
3. Make sure you've run: `neu update`
4. Check the README.md for detailed troubleshooting

**Still stuck?** Open an issue on GitHub or check Neutralino.js documentation at https://neutralino.js.org/
