# Build Instructions - Minimal Text Editor

## Complete Step-by-Step Guide for Windows

### Prerequisites Installation

#### 1. Install Node.js

1. Go to https://nodejs.org/
2. Download the **LTS version** (recommended for most users)
3. Run the installer
4. Follow the installation wizard:
   - Accept the license agreement
   - Choose default installation path
   - Select "Automatically install necessary tools" (if prompted)
   - Click "Install"
5. **Restart your computer** after installation

#### 2. Verify Node.js Installation

Open Command Prompt (Win + R → type `cmd` → Enter):

```cmd
node --version
```

You should see: `v18.x.x` or similar

```cmd
npm --version
```

You should see: `9.x.x` or similar

If you see these versions, Node.js is installed correctly! ✅

#### 3. Install Neutralino CLI

In the same Command Prompt window:

```cmd
npm install -g @neutralinojs/neu
```

Wait for installation to complete (1-2 minutes).

Verify installation:

```cmd
neu --version
```

You should see: `@neutralinojs/neu 10.x.x` or similar ✅

---

### Project Setup

#### Method 1: Using the Setup Script (Easiest)

1. **Navigate to the project folder**
   - Open File Explorer
   - Go to your project folder
   - In the address bar, type `cmd` and press Enter

2. **Run the setup script**
   ```cmd
   setup.bat
   ```

3. **Follow the prompts**
   - The script will check prerequisites
   - Download Neutralino binaries
   - Give you options to run or build

#### Method 2: Manual Setup

1. **Navigate to the project folder**
   ```cmd
   cd C:\path\to\neutralino-text-editor
   ```

2. **Download Neutralino binaries**
   ```cmd
   neu update
   ```
   
   This downloads the Neutralino runtime (~10 MB).
   
   You should see:
   ```
   [INFO] Downloading Neutralino binaries...
   [INFO] Neutralino binaries downloaded successfully
   ```

---

### Building the Application

#### Option 1: Quick Build (Using Batch File)

Simply double-click `build.bat` in the project folder.

OR run in Command Prompt:
```cmd
build.bat
```

#### Option 2: Manual Build

```cmd
neu build
```

**What happens during build:**

1. Creates `.tmp/` directory
2. Bundles all resources into `resources.neu`
3. Copies the executable to `dist/minimal-text-editor/`
4. Includes WebView2Loader.dll

**Build output location:**
```
dist/
└── minimal-text-editor/
    ├── minimal-text-editor.exe  ← Your app!
    ├── resources.neu
    └── WebView2Loader.dll
```

**Build time:** ~5-10 seconds

**Output size:** ~5 MB total

---

### Running the Application

#### Development Mode

For testing and development:

```cmd
neu run
```

OR double-click `run.bat`

**Advantages:**
- Faster startup
- See console logs
- Easy to test changes

#### Production Mode

After building, run the executable:

1. Navigate to `dist\minimal-text-editor\`
2. Double-click `minimal-text-editor.exe`

**Advantages:**
- Runs as a real Windows app
- No console window
- Can create shortcuts
- Can distribute to others

---

### Distribution

#### Distributing the Application

To share your app with others:

1. **Build the application:**
   ```cmd
   neu build
   ```

2. **Copy the entire folder:**
   ```
   dist\minimal-text-editor\
   ```

3. **Share the folder** (via ZIP, cloud storage, etc.)

4. **Users can run it** by double-clicking `minimal-text-editor.exe`
   - No installation needed!
   - All files must stay together

#### Creating a ZIP for Distribution

1. Navigate to the `dist` folder
2. Right-click on `minimal-text-editor` folder
3. Send to → Compressed (zipped) folder
4. Rename to: `MinimalTextEditor-v1.0.0.zip`
5. Share this ZIP file

**Recipients:**
1. Extract the ZIP
2. Run `minimal-text-editor.exe`
3. That's it!

---

### Creating an Installer (Optional)

For a professional installer, use Inno Setup:

#### 1. Install Inno Setup

1. Download from: https://jrsoftware.org/isinfo.php
2. Install Inno Setup Compiler
3. Run Inno Setup

#### 2. Create Installer Script

Create a file called `installer.iss`:

```ini
[Setup]
AppName=Minimal Text Editor
AppVersion=1.0.0
AppPublisher=Your Name
DefaultDirName={autopf}\MinimalTextEditor
DefaultGroupName=Minimal Text Editor
OutputDir=installer
OutputBaseFilename=MinimalTextEditor-Setup-v1.0.0
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64

[Files]
Source: "dist\minimal-text-editor\*"; DestDir: "{app}"; Flags: recursesubdirs

[Icons]
Name: "{group}\Minimal Text Editor"; Filename: "{app}\minimal-text-editor.exe"
Name: "{autodesktop}\Minimal Text Editor"; Filename: "{app}\minimal-text-editor.exe"

[Run]
Filename: "{app}\minimal-text-editor.exe"; Description: "Launch Minimal Text Editor"; Flags: postinstall nowait skipifsilent
```

#### 3. Compile the Installer

1. Open Inno Setup
2. File → Open → Select `installer.iss`
3. Build → Compile
4. Find the installer in the `installer/` folder

---

### Making Changes

#### Modifying the Application

1. **Edit files in `resources/` folder:**
   - `index.html` - UI structure
   - `style.css` - Styling
   - `script.js` - Logic

2. **Test your changes:**
   ```cmd
   neu run
   ```

3. **Build new version:**
   ```cmd
   neu build
   ```

#### Hot Reload (for CSS changes)

For CSS-only changes:
1. Keep the app running (`neu run`)
2. Edit `resources/style.css`
3. Save the file
4. Refresh the app window (Ctrl + R)

---

### Troubleshooting

#### "neu: command not found"

**Solution:**
```cmd
npm install -g @neutralinojs/neu
```

#### "Neutralino binaries not found"

**Solution:**
```cmd
neu update
```

#### App won't start after building

**Checklist:**
- [ ] Did you run `neu update`?
- [ ] Did you run `neu build`?
- [ ] Are all files in dist/ folder together?
- [ ] Is Windows Defender blocking it?

**Fix for Windows Defender:**
1. Click "More info"
2. Click "Run anyway"

#### Changes not appearing

**Solution:**
1. Make sure you edited files in `resources/` not `dist/`
2. Rebuild: `neu build`
3. Run the new executable

#### Build fails

**Common causes:**
1. Missing `neu update` - run it first
2. Permission issues - run Command Prompt as Administrator
3. Antivirus blocking - temporarily disable

---

### Advanced Configuration

#### Customizing Window Size

Edit `neutralino.config.json`:

```json
"modes": {
  "window": {
    "width": 1200,      // Change width
    "height": 800,      // Change height
    "minWidth": 800,    // Minimum width
    "minHeight": 600    // Minimum height
  }
}
```

#### Changing App Name

Edit `neutralino.config.json`:

```json
"modes": {
  "window": {
    "title": "My Custom Editor"
  }
}
```

#### Adding Custom Icon

1. Replace `resources/icons/appIcon.png`
2. Use a 256x256 PNG image
3. Rebuild: `neu build`

---

### Performance Optimization

#### Reducing Bundle Size

The app is already optimized, but you can:

1. **Minify CSS** (optional):
   - Use an online CSS minifier
   - Replace `style.css` with minified version

2. **Minify JavaScript** (optional):
   - Use an online JS minifier
   - Replace `script.js` with minified version

**Note:** Minification makes code harder to read. Do this only for final distribution.

---

### Version Control

#### Recommended .gitignore

Already included in the project:
```
.tmp/
dist/
resources/js/neutralino.js
*.log
.storage/
```

#### Committing to Git

Only commit:
- `resources/` folder (your source files)
- `neutralino.config.json`
- `README.md`, `QUICKSTART.md`
- `.gitignore`

Don't commit:
- `.tmp/` (build artifacts)
- `dist/` (executables)
- `resources/js/neutralino.js` (auto-generated)

---

### Build Verification Checklist

Before distributing, verify:

- [ ] App starts without errors
- [ ] All features work (new, open, save)
- [ ] Settings panel works
- [ ] Themes change correctly
- [ ] File dialogs appear
- [ ] Auto-save works
- [ ] Keyboard shortcuts work
- [ ] App closes cleanly

---

### Support Resources

- **Neutralino.js Docs:** https://neutralino.js.org/docs/
- **Neutralino.js GitHub:** https://github.com/neutralinojs/neutralinojs
- **This Project's README:** See `README.md` in project folder

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `neu update` | Download Neutralino binaries |
| `neu run` | Run in development mode |
| `neu build` | Build executable |
| `neu --help` | Show all commands |

| File | Purpose |
|------|---------|
| `setup.bat` | Automated setup |
| `run.bat` | Quick run in dev mode |
| `build.bat` | Quick build |
| `neutralino.config.json` | App configuration |

---

**That's it! You're ready to build and distribute your text editor!** 🎉
