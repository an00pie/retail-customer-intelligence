"""
INSIGHT.arc — Passive Security Baseline Scanner
Evaluates web application security posture, HTTP headers, CORS, method safety,
and data exposure without destructive attacks or production writes.
"""

import os
import sys
import json
import argparse
import requests
from typing import Dict, Any, List

REQUIRED_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": ["DENY", "SAMEORIGIN"],
    "Referrer-Policy": ["strict-origin-when-cross-origin", "no-referrer", "same-origin"],
}

RECOMMENDED_HEADERS = [
    "Content-Security-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security"
]


def audit_target(target_url: str) -> Dict[str, Any]:
    findings: List[Dict[str, Any]] = []
    headers_passed = 0
    headers_audited = 0

    print(f"[*] Auditing target endpoint: {target_url}")
    try:
        res = requests.get(target_url, timeout=10, allow_redirects=True)
    except Exception as e:
        return {
            "target": target_url,
            "status": "ERROR",
            "error": str(e),
            "findings": [{"severity": "HIGH", "title": f"Target unreachable: {e}"}]
        }

    resp_headers = res.headers

    # 1. Header Auditing
    for header, expected in REQUIRED_SECURITY_HEADERS.items():
        headers_audited += 1
        val = resp_headers.get(header)
        if not val:
            findings.append({
                "severity": "MEDIUM",
                "category": "Headers",
                "title": f"Missing security header: {header}",
                "description": f"The response does not include the {header} security header.",
                "recommendation": f"Add '{header}: {expected}' to web server or proxy configuration."
            })
        else:
            headers_passed += 1

    for header in RECOMMENDED_HEADERS:
        headers_audited += 1
        val = resp_headers.get(header)
        if not val:
            findings.append({
                "severity": "LOW",
                "category": "Headers",
                "title": f"Missing recommended header: {header}",
                "description": f"Header {header} is not present.",
                "recommendation": f"Consider configuring {header} for defense-in-depth."
            })
        else:
            headers_passed += 1

    # 2. Server Information Disclosure
    server_header = resp_headers.get("Server", "")
    if any(s in server_header.lower() for s in ["apache", "nginx", "werkzeug", "python"]):
        findings.append({
            "severity": "LOW",
            "category": "Information Disclosure",
            "title": f"Verbose Server header disclosure: '{server_header}'",
            "description": "Server header discloses specific web server software and runtime version.",
            "recommendation": "Configure reverse proxy to mask or suppress the Server header."
        })

    # 3. CORS Policy Check
    cors_origin = resp_headers.get("Access-Control-Allow-Origin")
    cors_creds = resp_headers.get("Access-Control-Allow-Credentials")
    if cors_origin == "*" and cors_creds == "true":
        findings.append({
            "severity": "HIGH",
            "category": "CORS",
            "title": "Insecure CORS configuration (Wildcard Origin with Credentials)",
            "description": "Access-Control-Allow-Origin is set to '*' while allowing credentials.",
            "recommendation": "Restrict Access-Control-Allow-Origin to trusted explicit origins."
        })

    # 4. Insecure HTTP Methods (TRACE / TRACK)
    try:
        trace_res = requests.request("TRACE", target_url, timeout=5)
        if trace_res.status_code == 200:
            findings.append({
                "severity": "MEDIUM",
                "category": "HTTP Methods",
                "title": "TRACE method enabled (Cross-Site Tracing risk)",
                "description": "The web server responded with 200 OK to an HTTP TRACE request.",
                "recommendation": "Disable the TRACE HTTP method on the web server."
            })
    except Exception:
        pass

    # Severity summary count
    summary = {
        "HIGH": sum(1 for f in findings if f["severity"] == "HIGH"),
        "MEDIUM": sum(1 for f in findings if f["severity"] == "MEDIUM"),
        "LOW": sum(1 for f in findings if f["severity"] == "LOW"),
    }

    return {
        "target": target_url,
        "status_code": res.status_code,
        "headers_audited": headers_audited,
        "headers_passed": headers_passed,
        "summary": summary,
        "findings": findings
    }


def generate_html_report(report_data: Dict[str, Any], filepath: str):
    findings_rows = "".join(f"""
    <tr>
      <td><span class="badge badge-{f['severity'].lower()}">{f['severity']}</span></td>
      <td><strong>{f.get('title', '')}</strong></td>
      <td>{f.get('category', 'General')}</td>
      <td>{f.get('recommendation', '')}</td>
    </tr>
    """ for f in report_data.get("findings", []))

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>INSIGHT.arc Security Baseline Audit</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #090d0b; color: #e4e4e7; margin: 0; padding: 32px; }}
    h1 {{ color: #10b981; font-size: 22px; }}
    .summary-card {{ background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; margin-bottom: 24px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
    th, td {{ text-align: left; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 13px; }}
    th {{ color: #a1a1aa; font-weight: 600; text-transform: uppercase; font-size: 11px; }}
    .badge {{ padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase; }}
    .badge-high {{ background: rgba(244,63,94,0.2); color: #fb7185; border: 1px solid rgba(244,63,94,0.4); }}
    .badge-medium {{ background: rgba(245,158,11,0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4); }}
    .badge-low {{ background: rgba(59,130,246,0.2); color: #60a5fa; border: 1px solid rgba(59,130,246,0.4); }}
  </style>
</head>
<body>
  <h1>INSIGHT.arc Security Baseline Audit Report</h1>
  <div class="summary-card">
    <p><strong>Target URL:</strong> {report_data.get('target')}</p>
    <p><strong>Status:</strong> HTTP {report_data.get('status_code')}</p>
    <p><strong>Findings Summary:</strong> High: {report_data['summary']['HIGH']} | Medium: {report_data['summary']['MEDIUM']} | Low: {report_data['summary']['LOW']}</p>
  </div>
  <table>
    <thead>
      <tr><th>Severity</th><th>Finding</th><th>Category</th><th>Recommendation</th></tr>
    </thead>
    <tbody>
      {findings_rows}
    </tbody>
  </table>
</body>
</html>"""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)


def main():
    parser = argparse.ArgumentParser(description="INSIGHT.arc Security Baseline Scanner")
    parser.add_argument("--target", default="http://localhost:5055", help="Target URL to audit")
    parser.add_argument("--output-dir", default="reports/security", help="Output directory for reports")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    report = audit_target(args.target)

    json_path = os.path.join(args.output_dir, "security_baseline_report.json")
    html_path = os.path.join(args.output_dir, "security_baseline_report.html")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    generate_html_report(report, html_path)
    print(f"[✔] Security scan completed. High: {report['summary']['HIGH']}, Medium: {report['summary']['MEDIUM']}, Low: {report['summary']['LOW']}")
    print(f"    Reports: {json_path} and {html_path}")


if __name__ == "__main__":
    main()
