#!/usr/bin/env bash
# ==============================================================================
# INSIGHT.arc — OWASP ZAP Baseline Security Scan Automation
# Safe, passive security crawling against local or staging environments.
# NEVER run destructive scans or active attacks against live customer platforms.
# ==============================================================================

set -euo pipefail

TARGET_URL="${1:-http://localhost:5055}"
REPORT_DIR="${2:-reports/security}"
REPORT_HTML="zap_baseline_report.html"
REPORT_JSON="zap_baseline_report.json"

mkdir -p "${REPORT_DIR}"
REPORT_DIR_ABS="$(cd "${REPORT_DIR}" && pwd)"

echo "======================================================================"
echo "  INSIGHT.arc — OWASP ZAP Baseline Security Scanner"
echo "  Target: ${TARGET_URL}"
echo "  Report Directory: ${REPORT_DIR_ABS}"
echo "======================================================================"

if docker info >/dev/null 2>&1; then
  echo "[+] Docker daemon active. Pulling & launching official OWASP ZAP container..."
  docker run --rm \
    --network="host" \
    -u "$(id -u):$(id -g)" \
    -v "${REPORT_DIR_ABS}:/zap/wrk/:rw" \
    -t ghcr.io/zaproxy/zaproxy:stable \
    zap-baseline.py \
    -t "${TARGET_URL}" \
    -r "${REPORT_HTML}" \
    -J "${REPORT_JSON}" \
    -I
  echo "[✔] ZAP Scan completed. Report saved to: ${REPORT_DIR_ABS}/${REPORT_HTML}"
else
  echo "[!] Docker daemon is not running or unavailable."
  echo "    Running native local security baseline audit scanner (Python fallback)..."
  PYTHONPATH=. python3 scripts/security_baseline_scan.py --target "${TARGET_URL}" --output-dir "${REPORT_DIR_ABS}"
fi
