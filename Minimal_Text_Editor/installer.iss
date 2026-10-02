[Setup]
AppName=Minimal Text Editor
AppVersion=1.0
DefaultDirName={pf}\Minimal Text Editor
DefaultGroupName=Minimal Text Editor
OutputDir=installer
OutputBaseFilename=MinimalTextEditorSetup
Compression=lzma
SolidCompression=yes

[Files]
Source: "dist\minimal-text-editor\*"; DestDir: "{app}"; Flags: recursesubdirs

[Icons]
Name: "{group}\Minimal Text Editor"; Filename: "{app}\minimal-text-editor.exe"
Name: "{commondesktop}\Minimal Text Editor"; Filename: "{app}\minimal-text-editor.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"
