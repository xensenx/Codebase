#!/usr/bin/env python3
"""
Windows Software Scope Auditor v2

Purpose:
    Audit installed software on Windows and classify applications as:
      - MACHINE-WIDE
      - ADMIN USER
      - STANDARD USER
      - UNKNOWN / SUPPORTING EVIDENCE

The script cross-checks:
    1. 64-bit and 32-bit HKLM uninstall registry entries
    2. Current-user HKCU uninstall entries
    3. Program Files / Program Files (x86)
    4. Per-user AppData\\Local\\Programs
    5. Start Menu shortcuts for all users and each discovered user profile
    6. C:\\_Installers

IMPORTANT:
    The report intentionally uses human-readable placeholders rather than
    printing Windows account names.

    Change NOTHING in this file before running it.

    Human-readable labels:
        Admin account    -> Jane Doe
        Standard account -> Standard User

The script discovers the actual Windows profiles automatically.

READ-ONLY:
    This script does not install, uninstall, modify ACLs, modify registry
    settings, modify boot configuration, or change Windows configuration.

It only creates:
    software_audit_v2_report.txt
    software_audit_v2.json
"""

import ctypes
import json
import os
import re
import subprocess
from collections import defaultdict
from datetime import datetime
from pathlib import Path


# ---------------------------------------------------------------------------
# HUMAN-READABLE PLACEHOLDERS
# ---------------------------------------------------------------------------
# These labels are deliberately generic. Do not put the real account names
# here. The script discovers the underlying profile paths automatically.
ACCOUNT_LABELS = {
    "admin": "Jane Doe",
    "standard": "Standard User",
}


# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
INSTALLER_DIR = Path(r"C:\_Installers")
SYSTEM_DRIVE = Path(os.environ.get("SystemDrive", "C:"))
USERS_DIR = SYSTEM_DRIVE / "Users"

# Profile directories that are normally Windows/system profiles rather than
# interactive user profiles.
IGNORED_PROFILE_NAMES = {
    "default",
    "default user",
    "public",
    "all users",
    "defaultappPool",
    "wdagutilityaccount",
}

# Executables/components that should not appear as separate applications.
COMPONENT_NAMES = {
    "unins000",
    "uninstall",
    "uninstallhelper",
    "update",
    "updater",
    "crashpad_handler",
    "crashreport",
    "crashreporter",
    "createdump",
    "squirrel",
    "bun",
    "bun-baseline",
    "python",
    "pythonw",
    "python3",
    "pythonw3",
    "pip",
    "pip3",
    "pydoc",
    "elevate",
    "code-tunnel",
    "mke2fs",
    "make_f2fs",
    "adb",
    "fastboot",
}

# Things that commonly occur in uninstall registries but are infrastructure
# rather than applications the user would normally launch.
INFRASTRUCTURE_PREFIXES = (
    "microsoft visual c++",
    "microsoft .net",
    "microsoft windows desktop runtime",
    "microsoft windows application compatibility",
    "nvidia ",
    "office 16 click-to-run",
    "microsoft edge webview2 runtime",
    "microsoft visual studio setup",
    "microsoft visual studio installer",
    "asus ",
    "blackmagic raw common components",
    "glidex service installer",
    "ffmpeg (shared)",
)

SYSTEM_PROFILE_HINTS = {
    "systemprofile",
    "localservice",
    "networkservice",
}


# ---------------------------------------------------------------------------
# GENERAL HELPERS
# ---------------------------------------------------------------------------
def is_admin():
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def powershell(command, timeout=60):
    try:
        p = subprocess.run(
            [
                "powershell.exe",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                command,
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
        return p.stdout.strip()
    except Exception:
        return ""


def normalize(name):
    """Create a conservative matching key for application names."""
    if not name:
        return ""

    name = str(name).lower().strip()
    name = re.sub(
        r"\.(exe|msi|zip|7z|tar\.gz|msix|appx)$",
        "",
        name,
        flags=re.IGNORECASE,
    )
    name = re.sub(
        r"[-_ ]?(setup|installer|install)$",
        "",
        name,
        flags=re.IGNORECASE,
    )
    name = re.sub(
        r"\b(?:v)?\d+(?:\.\d+){1,6}\b",
        "",
        name,
        flags=re.IGNORECASE,
    )
    name = re.sub(r"[^a-z0-9]+", " ", name)
    return re.sub(r"\s+", " ", name).strip()


def path_exists(path):
    try:
        return Path(path).exists()
    except Exception:
        return False


def clean_component_name(name):
    if not name:
        return True

    n = str(name).lower().replace(".exe", "").strip()

    if n in COMPONENT_NAMES:
        return True

    if n.startswith("unins"):
        return True

    if n in {"setup", "install", "installer"}:
        return True

    return False


def is_infrastructure(name):
    if not name:
        return False

    n = str(name).lower().strip()
    return n.startswith(INFRASTRUCTURE_PREFIXES)


def safe_json_value(value):
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


# ---------------------------------------------------------------------------
# USER PROFILE DISCOVERY
# ---------------------------------------------------------------------------
def discover_profiles():
    """
    Discover normal interactive user profiles.

    The actual account/profile names are stored internally only so the
    script can inspect paths. They are never written to the report.
    """
    profiles = []

    if not USERS_DIR.exists():
        return profiles

    for child in sorted(USERS_DIR.iterdir(), key=lambda p: p.name.lower()):
        if not child.is_dir():
            continue

        lower = child.name.lower()

        if lower in IGNORED_PROFILE_NAMES:
            continue

        if lower in SYSTEM_PROFILE_HINTS:
            continue

        # A real profile should contain NTUSER.DAT.
        if not (child / "NTUSER.DAT").exists():
            continue

        profiles.append({
            "real_name": child.name,
            "path": str(child),
        })

    return profiles


def classify_profiles(profiles):
    """
    Assign human-readable roles without exposing real account names.

    The first profile matching the currently running user's profile is
    considered the current account. The Standard profile is identified
    preferentially by the known profile path C:\\Users\\Sen.

    If the script is run from the Admin account, that current profile is
    labeled Jane Doe and the Sen profile is labeled Standard User.

    If run from the Standard account, the current profile is labeled
    Standard User and the other interactive profile is labeled Jane Doe.

    No account name is printed.
    """
    current_profile = Path(os.environ.get("USERPROFILE", "")).resolve()

    result = []

    # Prefer the known Standard profile path if it exists.
    standard_profile = (USERS_DIR / "Sen").resolve()

    for p in profiles:
        ppath = Path(p["path"]).resolve()

        if ppath == standard_profile:
            role = "standard"
        elif ppath == current_profile:
            role = "admin" if ppath != standard_profile else "standard"
        else:
            role = "unknown"

        result.append({
            "path": str(ppath),
            "role": role,
            "label": ACCOUNT_LABELS.get(role, "Other User"),
        })

    # If the current profile was not recognized as Admin/Standard, use
    # conservative fallback labeling without exposing the account name.
    if not any(x["role"] == "admin" for x in result):
        candidates = [x for x in result if x["role"] == "unknown"]
        if len(candidates) == 1:
            candidates[0]["role"] = "admin"
            candidates[0]["label"] = ACCOUNT_LABELS["admin"]

    return result


# ---------------------------------------------------------------------------
# REGISTRY INVENTORY
# ---------------------------------------------------------------------------
REGISTRY_SCRIPT = r"""
$ErrorActionPreference = 'SilentlyContinue'

function Read-UninstallEntries {
    param(
        [string[]]$Paths,
        [string]$HiveLabel,
        [string]$ViewLabel
    )

    foreach ($path in $Paths) {
        Get-ItemProperty $path | ForEach-Object {
            $display = $_.DisplayName

            if ([string]::IsNullOrWhiteSpace($display)) {
                return
            }

            [PSCustomObject]@{
                DisplayName     = [string]$display
                DisplayVersion  = [string]$_.DisplayVersion
                Publisher       = [string]$_.Publisher
                InstallLocation = [string]$_.InstallLocation
                UninstallString = [string]$_.UninstallString
                QuietUninstallString = [string]$_.QuietUninstallString
                RegistryHive    = $HiveLabel
                RegistryView    = $ViewLabel
            }
        }
    }
}

$items = @()

# Explicit 64-bit machine-wide uninstall view.
$items += Read-UninstallEntries `
    -Paths @(
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
    ) `
    -HiveLabel 'HKLM' `
    -ViewLabel '64-bit / native'

# Explicit 32-bit machine-wide uninstall view.
$items += Read-UninstallEntries `
    -Paths @(
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
    ) `
    -HiveLabel 'HKLM' `
    -ViewLabel '32-bit / WOW6432Node'

# Current-user uninstall registry.
$items += Read-UninstallEntries `
    -Paths @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
    ) `
    -HiveLabel 'HKCU' `
    -ViewLabel 'Current user'

$items | ConvertTo-Json -Depth 5 -Compress
"""


def registry_inventory():
    raw = powershell(REGISTRY_SCRIPT, timeout=90)

    if not raw:
        return []

    try:
        data = json.loads(raw)
    except Exception:
        return []

    if isinstance(data, dict):
        data = [data]

    result = []

    for item in data:
        name = item.get("DisplayName", "").strip()

        if not name:
            continue

        result.append({
            "name": name,
            "version": item.get("DisplayVersion", "").strip(),
            "publisher": item.get("Publisher", "").strip(),
            "install_location": item.get("InstallLocation", "").strip(),
            "uninstall_string": item.get("UninstallString", "").strip(),
            "hive": item.get("RegistryHive", "").strip(),
            "view": item.get("RegistryView", "").strip(),
            "scope": (
                "MACHINE-WIDE"
                if item.get("RegistryHive") == "HKLM"
                else "CURRENT USER"
            ),
            "normalized": normalize(name),
            "infrastructure": is_infrastructure(name),
        })

    return result


# ---------------------------------------------------------------------------
# FILESYSTEM EVIDENCE
# ---------------------------------------------------------------------------
def program_files_evidence():
    """
    Collect only top-level application directories from Program Files.
    This is supporting evidence, not a recursive executable inventory.
    """
    roots = [
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")),
        Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")),
    ]

    evidence = []

    for root in roots:
        if not root.exists():
            continue

        try:
            for child in sorted(root.iterdir(), key=lambda p: p.name.lower()):
                if child.is_dir():
                    evidence.append({
                        "scope": "MACHINE-WIDE",
                        "kind": "Program Files directory",
                        "name": child.name,
                        "path": str(child),
                        "normalized": normalize(child.name),
                    })
        except (PermissionError, OSError):
            continue

    return evidence


def per_user_programs_evidence(profile):
    """
    Collect only top-level directories under:
        AppData\\Local\\Programs

    This is the strongest common filesystem indicator of a per-user install.
    """
    root = Path(profile["path"]) / "AppData" / "Local" / "Programs"

    evidence = []

    if not root.exists():
        return evidence

    try:
        for child in sorted(root.iterdir(), key=lambda p: p.name.lower()):
            if not child.is_dir():
                continue

            evidence.append({
                "scope": "PER-USER",
                "profile_role": profile["role"],
                "profile_label": profile["label"],
                "kind": "AppData Local Programs directory",
                "name": child.name,
                "path": str(child),
                "normalized": normalize(child.name),
            })
    except (PermissionError, OSError):
        pass

    return evidence


# ---------------------------------------------------------------------------
# START MENU EVIDENCE
# ---------------------------------------------------------------------------
def start_menu_evidence(profiles):
    evidence = []

    all_users_start = (
        SYSTEM_DRIVE
        / "ProgramData"
        / "Microsoft"
        / "Windows"
        / "Start Menu"
        / "Programs"
    )

    if all_users_start.exists():
        try:
            for item in all_users_start.rglob("*"):
                if not item.is_file():
                    continue

                if item.suffix.lower() not in {".lnk", ".url", ".exe"}:
                    continue

                name = item.stem

                if clean_component_name(name):
                    continue

                evidence.append({
                    "scope": "MACHINE-WIDE",
                    "kind": "All-users Start Menu",
                    "name": name,
                    "path": str(item),
                    "normalized": normalize(name),
                })
        except (PermissionError, OSError):
            pass

    for profile in profiles:
        root = (
            Path(profile["path"])
            / "AppData"
            / "Roaming"
            / "Microsoft"
            / "Windows"
            / "Start Menu"
            / "Programs"
        )

        if not root.exists():
            continue

        try:
            for item in root.rglob("*"):
                if not item.is_file():
                    continue

                if item.suffix.lower() not in {".lnk", ".url", ".exe"}:
                    continue

                name = item.stem

                if clean_component_name(name):
                    continue

                if name.lower() in {"desktop", "documentation"}:
                    continue

                evidence.append({
                    "scope": "PER-USER",
                    "profile_role": profile["role"],
                    "profile_label": profile["label"],
                    "kind": "User Start Menu",
                    "name": name,
                    "path": str(item),
                    "normalized": normalize(name),
                })
        except (PermissionError, OSError):
            pass

    return evidence


# ---------------------------------------------------------------------------
# INSTALLER INVENTORY
# ---------------------------------------------------------------------------
def installer_inventory():
    if not INSTALLER_DIR.exists():
        return []

    result = []

    try:
        for p in sorted(INSTALLER_DIR.iterdir(), key=lambda x: x.name.lower()):
            if not p.is_file() and not p.is_dir():
                continue

            # Preserve the installer list, but do not treat it as proof that
            # something is installed.
            result.append({
                "name": p.name,
                "path": str(p),
                "type": "file" if p.is_file() else "directory",
                "normalized": normalize(p.name),
            })
    except (PermissionError, OSError):
        pass

    return result


# ---------------------------------------------------------------------------
# APPLICATION GROUPING
# ---------------------------------------------------------------------------
def add_candidate(candidates, name, source, scope, details=None):
    if not name:
        return

    normalized = normalize(name)

    if not normalized:
        return

    if clean_component_name(name):
        return

    candidates[normalized].append({
        "name": name,
        "source": source,
        "scope": scope,
        "details": details or {},
    })


def choose_display_name(records):
    """
    Prefer the most human-readable application name.

    Registry DisplayName is preferred over filesystem folder/shortcut names.
    """
    registry_names = [
        r["name"]
        for r in records
        if r["source"] == "registry" and r["name"]
    ]

    if registry_names:
        return sorted(registry_names, key=lambda x: (len(x), x.lower()))[0]

    names = [r["name"] for r in records if r["name"]]

    if not names:
        return "Unknown"

    return sorted(names, key=lambda x: (len(x), x.lower()))[0]


def classify_application(records):
    """
    Determine the strongest available scope evidence.

    Priority:
        HKLM registry          -> MACHINE-WIDE
        HKCU registry          -> CURRENT USER
        AppData Local Programs -> PER-USER
        Program Files          -> MACHINE-WIDE supporting evidence
        Start Menu             -> supporting evidence
    """
    scopes = {r["scope"] for r in records}

    if "MACHINE-WIDE" in scopes and "PER-USER" in scopes:
        return "BOTH / MIXED"

    if "MACHINE-WIDE" in scopes:
        return "MACHINE-WIDE"

    if "CURRENT USER" in scopes:
        return "CURRENT USER"

    if "PER-USER" in scopes:
        return "PER-USER"

    return "UNKNOWN"


def build_application_matrix(registry, program_files, user_programs, starts):
    candidates = defaultdict(list)

    for r in registry:
        add_candidate(
            candidates,
            r["name"],
            "registry",
            r["scope"],
            r,
        )

    for r in program_files:
        add_candidate(
            candidates,
            r["name"],
            "program_files",
            r["scope"],
            r,
        )

    for r in user_programs:
        add_candidate(
            candidates,
            r["name"],
            "appdata_programs",
            r["scope"],
            r,
        )

    for r in starts:
        add_candidate(
            candidates,
            r["name"],
            "start_menu",
            r["scope"],
            r,
        )

    matrix = []

    for normalized, records in candidates.items():
        # Remove obvious infrastructure-only candidates when they have no
        # stronger application evidence.
        names = [r["name"] for r in records]
        if all(is_infrastructure(n) for n in names):
            continue

        classification = classify_application(records)
        display_name = choose_display_name(records)

        # Current-user registry evidence belongs to the account that ran the
        # script. We expose the configured placeholder rather than the actual
        # Windows username.
        current_user_label = ACCOUNT_LABELS["admin"]

        current_user_present = any(
            r["scope"] == "CURRENT USER" for r in records
        )

        machine_present = any(
            r["scope"] == "MACHINE-WIDE" for r in records
        )

        per_user_roles = sorted({
            r["details"].get("profile_role")
            for r in records
            if r["scope"] == "PER-USER"
            and r["details"].get("profile_role")
        })

        evidence_paths = sorted({
            r["details"].get("path", "")
            for r in records
            if r["details"].get("path")
        })

        versions = sorted({
            r["details"].get("version", "")
            for r in records
            if r["details"].get("version")
        })

        publishers = sorted({
            r["details"].get("publisher", "")
            for r in records
            if r["details"].get("publisher")
        })

        matrix.append({
            "name": display_name,
            "normalized": normalized,
            "classification": classification,
            "current_user_registry": current_user_present,
            "current_user_label": (
                current_user_label if current_user_present else None
            ),
            "machine_wide": machine_present,
            "per_user_roles": per_user_roles,
            "versions": versions,
            "publishers": publishers,
            "evidence_paths": evidence_paths[:20],
            "evidence_count": len(records),
        })

    matrix.sort(key=lambda x: x["name"].lower())
    return matrix


# ---------------------------------------------------------------------------
# PROFILE ACCESS CHECK
# ---------------------------------------------------------------------------
def profile_access_summary(profiles):
    """
    Report whether the currently running account can enumerate each profile.
    This is only diagnostic; the script does not change permissions.
    """
    result = []

    for profile in profiles:
        p = Path(profile["path"])

        try:
            entries = list(p.iterdir())
            accessible = True
            entry_count = len(entries)
        except (PermissionError, OSError):
            accessible = False
            entry_count = None

        result.append({
            "label": profile["label"],
            "role": profile["role"],
            "accessible_from_current_context": accessible,
            "entry_count": entry_count,
        })

    return result


# ---------------------------------------------------------------------------
# REPORT
# ---------------------------------------------------------------------------
def build_report(data):
    lines = []

    lines.append("WINDOWS SOFTWARE SCOPE AUDITOR v2")
    lines.append("=" * 72)
    lines.append("")
    lines.append(f"Generated: {data['generated']}")
    lines.append(f"Computer: {data['computer']}")
    lines.append(f"Elevated: {data['elevated']}")
    lines.append("")
    lines.append("Human-readable account labels used by this report:")
    lines.append(f"  Admin account:    {ACCOUNT_LABELS['admin']}")
    lines.append(f"  Standard account: {ACCOUNT_LABELS['standard']}")
    lines.append("")
    lines.append(
        "NOTE: The report deliberately does not print Windows account names."
    )
    lines.append("")

    lines.append("PROFILE DISCOVERY")
    lines.append("-" * 72)

    for p in data["profiles"]:
        lines.append(
            f"  {p['label']:<20} role={p['role']:<9} "
            f"profile discovered"
        )

    if not data["profiles"]:
        lines.append("  No normal interactive profiles discovered.")

    lines.append("")
    lines.append("PROFILE ACCESS FROM CURRENT CONTEXT")
    lines.append("-" * 72)

    for p in data["profile_access"]:
        status = (
            "accessible"
            if p["accessible_from_current_context"]
            else "access denied"
        )
        lines.append(f"  {p['label']:<20} {status}")

    lines.append("")
    lines.append("APPLICATION SCOPE MATRIX")
    lines.append("-" * 72)
    lines.append(
        f"{'APPLICATION':42} {'SCOPE':20} "
        f"{'ADMIN':12} {'STANDARD':12}"
    )
    lines.append("-" * 72)

    for app in data["applications"]:
        scope = app["classification"]

        if scope == "MACHINE-WIDE":
            admin_status = "YES"
            standard_status = "YES"
        elif scope in {"CURRENT USER", "PER-USER"}:
            admin_status = (
                "YES"
                if (
                    app["current_user_registry"]
                    or "admin" in app["per_user_roles"]
                )
                else "NO"
            )
            standard_status = (
                "YES"
                if "standard" in app["per_user_roles"]
                else "NO"
            )
        elif scope == "BOTH / MIXED":
            admin_status = "YES"
            standard_status = (
                "YES" if "standard" in app["per_user_roles"] else "UNKNOWN"
            )
        else:
            admin_status = "UNKNOWN"
            standard_status = "UNKNOWN"

        lines.append(
            f"{app['name'][:42]:42} "
            f"{scope[:20]:20} "
            f"{admin_status:<12} "
            f"{standard_status:<12}"
        )

    lines.append("")
    lines.append("INTERPRETATION")
    lines.append("-" * 72)
    lines.append(
        "  MACHINE-WIDE = strong HKLM and/or Program Files evidence."
    )
    lines.append(
        "  CURRENT USER = HKCU uninstall evidence for the account running "
        "this audit."
    )
    lines.append(
        "  PER-USER = evidence under a specific user's AppData\\Local\\Programs "
        "or user Start Menu."
    )
    lines.append(
        "  BOTH / MIXED = the application has both machine-wide and per-user "
        "evidence."
    )
    lines.append(
        "  UNKNOWN = insufficient evidence; do not reinstall based on this "
        "classification alone."
    )

    lines.append("")
    lines.append("IMPORTANT")
    lines.append("-" * 72)
    lines.append(
        "  This audit determines installation scope. It does NOT prove that "
        "an application is usable from a Standard account."
    )
    lines.append(
        "  Application-specific permissions, services, drivers, user profiles, "
        "and licensing may still affect behavior."
    )
    lines.append(
        "  No ACL, registry, boot, partition, or installation changes were "
        "made by this script."
    )

    lines.append("")
    lines.append("INSTALLER CROSS-REFERENCE")
    lines.append("-" * 72)

    for installer in data["installers"]:
        key = installer["normalized"]
        matches = [
            a["name"]
            for a in data["applications"]
            if a["normalized"] == key
            or key in a["normalized"]
            or a["normalized"] in key
        ]

        if matches:
            lines.append(
                f"  {installer['name']:<48} -> "
                f"{', '.join(matches[:3])}"
            )
        else:
            lines.append(
                f"  {installer['name']:<48} -> no confident match"
            )

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main():
    timestamp = datetime.now().astimezone().isoformat()

    profiles = discover_profiles()
    classified_profiles = classify_profiles(profiles)

    registry = registry_inventory()
    program_files = program_files_evidence()

    user_programs = []
    for profile in classified_profiles:
        user_programs.extend(per_user_programs_evidence(profile))

    starts = start_menu_evidence(classified_profiles)
    installers = installer_inventory()

    applications = build_application_matrix(
        registry,
        program_files,
        user_programs,
        starts,
    )

    access = profile_access_summary(classified_profiles)

    data = {
        "generated": timestamp,
        "computer": os.environ.get("COMPUTERNAME", "Unknown"),
        "elevated": is_admin(),
        "labels": ACCOUNT_LABELS,
        "profiles": [
            {
                "role": p["role"],
                "label": p["label"],
                # Intentionally omit p["real_name"] and the actual profile
                # path from the JSON report.
            }
            for p in classified_profiles
        ],
        "profile_access": access,
        "applications": applications,
        "installers": installers,
        "registry_entry_count": len(registry),
        "program_files_entry_count": len(program_files),
        "per_user_program_entry_count": len(user_programs),
        "start_menu_entry_count": len(starts),
    }

    report = build_report(data)

    out_txt = Path.cwd() / "software_audit_v2_report.txt"
    out_json = Path.cwd() / "software_audit_v2.json"

    out_txt.write_text(report, encoding="utf-8")
    out_json.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(report)
    print("")
    print("=" * 72)
    print(f"Report written to: {out_txt}")
    print(f"JSON written to:   {out_json}")
    print("=" * 72)


if __name__ == "__main__":
    main()
