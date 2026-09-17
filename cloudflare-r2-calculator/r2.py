import os
import sys
import json
import urllib.request
import urllib.error
import re
from datetime import datetime, timezone

# --- CONFIGURATION ---
ACCOUNT_ID = os.environ.get("CF_ACCOUNT_ID", "YOUR_ACCOUNT_ID")
API_TOKEN = os.environ.get("CF_API_TOKEN", "YOUR_API_TOKEN")

# Free Tier Limits
LIMIT_STORAGE_GB = 10
LIMIT_CLASS_A = 1_000_000
LIMIT_CLASS_B = 10_000_000

# ANSI Escape Colors
C_CYAN = "\033[96m"
C_GREEN = "\033[92m"
C_YELLOW = "\033[93m"
C_RED = "\033[91m"
C_MAGENTA = "\033[95m"
C_DIM = "\033[2m"
C_RESET = "\033[0m"
C_BOLD = "\033[1m"

CLASS_A_OPS = {"PutObject", "CopyObject", "CreateMultipartUpload", "UploadPart", "CompleteMultipartUpload", "ListObjects", "ListBuckets", "PutBucket"}
CLASS_B_OPS = {"GetObject", "HeadObject", "HeadBucket", "UsageSummary"}

def strip_ansi(text):
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)

def pad(text, width, align='left'):
    visible_len = len(strip_ansi(text))
    space = max(0, width - visible_len)
    if align == 'left':
        return text + (' ' * space)
    if align == 'right':
        return (' ' * space) + text
    if align == 'center':
        left = space // 2
        right = space - left
        return (' ' * left) + text + (' ' * right)
    return text

def fetch_graphql(query):
    url = "https://api.cloudflare.com/client/v4/graphql"
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }
    data = json.dumps({"query": query}).encode("utf-8")
    
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"{C_RED}HTTP Error {e.code}: {e.reason}{C_RESET}")
        try:
            err_data = json.loads(e.read().decode("utf-8"))
            print(json.dumps(err_data, indent=2))
        except:
            print(e.read().decode("utf-8"))
        sys.exit(1)

def main():
    if ACCOUNT_ID == "YOUR_ACCOUNT_ID" or API_TOKEN == "YOUR_API_TOKEN":
        print(f"{C_RED}Error: Set CF_ACCOUNT_ID and CF_API_TOKEN in the script or environment.{C_RESET}")
        return

    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    start_iso = start_of_month.strftime("%Y-%m-%dT%H:%M:%SZ")
    now_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    query = f"""
    query {{
      viewer {{
        accounts(filter: {{accountTag: "{ACCOUNT_ID}"}}) {{
          operations: r2OperationsAdaptiveGroups(
            limit: 10000,
            filter: {{datetime_geq: "{start_iso}", datetime_leq: "{now_iso}"}}
          ) {{
            sum {{ requests }}
            dimensions {{ actionType }}
          }}
          storage: r2StorageAdaptiveGroups(
            limit: 1,
            filter: {{datetime_geq: "{start_iso}", datetime_leq: "{now_iso}"}},
            orderBy: [datetime_DESC]
          ) {{
            max {{ payloadSize }}
            dimensions {{ datetime }}
          }}
        }}
      }}
    }}
    """
    
    print(f"{C_CYAN}Fetching R2 metrics from Cloudflare...{C_RESET}\n")
    data = fetch_graphql(query)
    
    if data.get("errors") or not data.get("data"):
        print(f"{C_RED}Cloudflare API Error:{C_RESET}")
        print(json.dumps(data.get("errors", "Unknown error"), indent=2))
        return

    try:
        account_data = data["data"]["viewer"]["accounts"]
        if not account_data:
            print(f"{C_RED}No account data found.{C_RESET}")
            return
        metrics = account_data[0]
    except (KeyError, TypeError):
        print(f"{C_RED}Unexpected API response format.{C_RESET}")
        return
    
    # Aggregate Metrics
    ops_data = metrics.get("operations", [])
    class_a_total = 0
    class_b_total = 0
    other_total = 0
    
    for op in ops_data:
        count = op.get("sum", {}).get("requests", 0)
        action = op.get("dimensions", {}).get("actionType", "")
        if action in CLASS_A_OPS:
            class_a_total += count
        elif action in CLASS_B_OPS:
            class_b_total += count
        else:
            other_total += count

    storage_data = metrics.get("storage", [])
    storage_bytes = storage_data[0]["max"]["payloadSize"] if storage_data else 0
    storage_gb = storage_bytes / (10**9)

    pct_storage = (storage_gb / LIMIT_STORAGE_GB) * 100
    pct_class_a = (class_a_total / LIMIT_CLASS_A) * 100
    pct_class_b = (class_b_total / LIMIT_CLASS_B) * 100
    max_pct = max(pct_storage, pct_class_a, pct_class_b)

    # Fixed Column Dimensions (Exact character count between cell borders)
    # Total row content = C1 + C2 + C3 + C4 + C5 + 4 internal delimiters ("│") = 85
    C1, C2, C3, C4, C5 = 15, 17, 18, 24, 11
    TOTAL_WIDTH = C1 + C2 + C3 + C4 + C5 + 4

    DIVIDER_ROW = (
        f"{'─' * C1}┼"
        f"{'─' * C2}┼"
        f"{'─' * C3}┼"
        f"{'─' * C4}┼"
        f"{'─' * C5}"
    )

    def render_row(c1_val, c2_val, c3_val, c4_val, c5_val):
        return (
            f" {C_MAGENTA}│{C_RESET}"
            f"{c1_val}"
            f"{C_MAGENTA}│{C_RESET}"
            f"{c2_val}"
            f"{C_MAGENTA}│{C_RESET}"
            f"{c3_val}"
            f"{C_MAGENTA}│{C_RESET}"
            f"{c4_val}"
            f"{C_MAGENTA}│{C_RESET}"
            f"{c5_val}"
            f"{C_MAGENTA}│{C_RESET}"
        )

    # Header Box
    print(f" {C_MAGENTA}┌{'─' * TOTAL_WIDTH}┐{C_RESET}")
    title_text = f"{C_BOLD}Cloudflare R2 Usage (As of right now!){C_RESET}"
    print(f" {C_MAGENTA}│{C_RESET}{pad(title_text, TOTAL_WIDTH, 'center')}{C_MAGENTA}│{C_RESET}")
    print(f" {C_MAGENTA}├{DIVIDER_ROW}┤{C_RESET}")

    # Column Titles
    h1 = pad(f"{C_DIM}METRIC{C_RESET}", C1, 'center')
    h2 = pad(f"{C_DIM}USAGE{C_RESET}", C2, 'center')
    h3 = pad(f"{C_DIM}LIMIT{C_RESET}", C3, 'center')
    h4 = pad(f"{C_DIM}PROGRESS{C_RESET}", C4, 'center')
    h5 = pad(f"{C_DIM}PERCENT{C_RESET}", C5, 'center')
    print(render_row(h1, h2, h3, h4, h5))
    print(f" {C_MAGENTA}├{DIVIDER_ROW}┤{C_RESET}")

    def format_metric(name, cur, lim, unit, pct):
        tier_color = C_CYAN if pct < 25 else (C_GREEN if pct < 60 else (C_YELLOW if pct < 90 else C_RED))
        
        # Usage & Limit
        cur_str = f"{cur:,.2f} {unit}" if isinstance(cur, float) else f"{cur:,} {unit}"
        lim_str = f"{lim:,} {unit}"
        
        # 18-step reliable monospaced progress bar
        bar_len = 18
        filled = int((min(pct, 100) / 100) * bar_len)
        empty = bar_len - filled
        bar_content = f"{tier_color}{'■' * filled}{C_DIM}{'·' * empty}{C_RESET}"
        bar_box = f"[{bar_content}]"
        
        pct_str = f"{tier_color}{pct:>7.3f}%{C_RESET}"

        c1 = pad(f" {name}", C1, 'left')
        c2 = pad(f"{cur_str} ", C2, 'right')
        c3 = pad(f"{lim_str} ", C3, 'right')
        c4 = pad(bar_box, C4, 'center')
        c5 = pad(f"{pct_str} ", C5, 'right')
        return render_row(c1, c2, c3, c4, c5)

    # Data Rows
    print(format_metric("Storage", storage_gb, LIMIT_STORAGE_GB, "GB", pct_storage))
    print(format_metric("Class A Ops", class_a_total, LIMIT_CLASS_A, "ops", pct_class_a))
    print(format_metric("Class B Ops", class_b_total, LIMIT_CLASS_B, "ops", pct_class_b))

    if other_total > 0:
        c1 = pad(" Free / Misc", C1, 'left')
        c2 = pad(f"{other_total:,} ops ", C2, 'right')
        c3 = pad("- ", C3, 'center')
        c4 = pad("", C4, 'center')
        c5 = pad("- ", C5, 'center')
        print(render_row(c1, c2, c3, c4, c5))

    # Bottom Verdict Section
    print(f" {C_MAGENTA}├{'─' * TOTAL_WIDTH}┤{C_RESET}")

    if max_pct >= 100:
        verdict = f"{C_RED}[!] Limit exceeded! Charges may apply. Consider cleaning or upgrading.{C_RESET}"
    elif max_pct >= 95:
        verdict = f"{C_RED}[!] Danger zone! You are right on the edge of the free tier.{C_RESET}"
    elif max_pct >= 90:
        verdict = f"{C_YELLOW}[!] Cutting it close. Keep an eye on ongoing requests.{C_RESET}"
    elif max_pct >= 80:
        verdict = f"{C_YELLOW}[~] Approaching the limit, still comfortably within free tier.{C_RESET}"
    elif max_pct >= 65:
        verdict = f"{C_YELLOW}[~] Past the halfway mark, perfectly healthy for now.{C_RESET}"
    elif max_pct >= 50:
        verdict = f"{C_GREEN}[✓] Safely inside free tier. Plenty of headroom left.{C_RESET}"
    elif max_pct >= 30:
        verdict = f"{C_GREEN}[✓] Cruising along! Over two-thirds of free tier unused.{C_RESET}"
    elif max_pct >= 15:
        verdict = f"{C_CYAN}[✓] Good news! You're comfortably within the free tier.{C_RESET}"
    elif max_pct >= 5:
        verdict = f"{C_CYAN}[✓] Barely scratched the surface. Tons of room available.{C_RESET}"
    elif max_pct >= 1:
        verdict = f"{C_CYAN}[✓] Whisper quiet. Operations are barely registering.{C_RESET}"
    elif max_pct > 0:
        verdict = f"{C_CYAN}[✓] Just getting started. Usage is almost undetectable.{C_RESET}"
    else:
        verdict = f"{C_CYAN}[✓] Zero activity recorded this month. Completely clean.{C_RESET}"

    print(f" {C_MAGENTA}│{C_RESET}{pad(verdict, TOTAL_WIDTH, 'center')}{C_MAGENTA}│{C_RESET}")
    print(f" {C_MAGENTA}└{'─' * TOTAL_WIDTH}┘{C_RESET}")

if __name__ == '__main__':
    main()
