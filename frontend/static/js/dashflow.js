/**
 * Customer Intelligence Platform — DashFlow Interaction & Motion Engine
 * Handles smooth scrolling, IntersectionObserver reveals, FAQ accordion,
 * interactive RFM calculator, live customer lookup API, and Chart.js spline charts.
 */

document.addEventListener('DOMContentLoaded', () => {
  initInteractiveGlobe();
  initSpaDashboardNavigation();
  initGlobalSearch();
  initScrollReveals();
  initMobileNav();
  initFaqAccordion();
  initRfmCalculator();
  initCustomerLookup();
  initWhatIfSimulator();
  initDashboardCharts();
  initOverviewModules();
  initAnchorScroll();
});

/* ==============================================================================
   0. SPA DASHBOARD VIEW SWITCHER & MODAL DRAWER SYSTEM
   ============================================================================== */
function initSpaDashboardNavigation() {
  function switchTab(rawTabId) {
    if (!rawTabId) return;
    const tabId = String(rawTabId).trim().replace(/^#/, '');

    // Check if it's a modal overlay tab
    if (tabId === 'architecture' || tabId === 'mining' || tabId === 'faq') {
      openSpaModal(tabId);
      return;
    }

    // Otherwise switch main content pane
    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) {
      // Deactivate all tab panes and activate target
      const allPanes = document.querySelectorAll('.spa-tab-pane');
      allPanes.forEach(pane => pane.classList.remove('active'));
      targetPane.classList.add('active');

      // Update active states on sidebar items, nav links, and pills
      document.querySelectorAll('.dash-nav-item, .nav-link, .dash-action-pill').forEach(el => {
        const itemTab = el.getAttribute('data-tab') || (el.getAttribute('href') || '').replace(/^#/, '');
        el.classList.toggle('active', itemTab === tabId);
      });

      // Scroll smoothly to the top of the dashboard content window
      const dashContent = document.querySelector('.dash-content');
      if (dashContent) {
        dashContent.scrollTop = 0;
      }

      // If switching back to dashboard or chart view, trigger resize to ensure proper rendering
      if (tabId === 'dashboard' && window.trajectoryChartInstance) {
        setTimeout(() => {
          try {
            window.trajectoryChartInstance.resize();
          } catch (e) {
            console.warn('Chart resize err:', e);
          }
        }, 80);
      }
    } else {
      console.warn(`Tab pane #tab-${tabId} not found.`);
    }
  }

  // Delegated document-level click listener for ALL elements with data-tab or matching nav links
  document.addEventListener('click', (e) => {
    // 1. Check for explicit data-tab trigger
    const tabEl = e.target.closest('[data-tab]');
    if (tabEl) {
      e.preventDefault();
      e.stopPropagation();
      const tab = tabEl.getAttribute('data-tab');
      if (tab) switchTab(tab);
      return;
    }

    // 2. Check for sidebar items or navbar links with href="#..."
    const linkEl = e.target.closest('.dash-nav-item, .nav-capsule .nav-link, .nav-mobile-dropdown .nav-link');
    if (linkEl && linkEl.getAttribute('href') && linkEl.getAttribute('href').startsWith('#')) {
      const hrefVal = linkEl.getAttribute('href').substring(1);
      if (hrefVal && hrefVal !== 'hero') {
        e.preventDefault();
        e.stopPropagation();
        switchTab(hrefVal);
        return;
      }
    }
  });

  // Global modal opener/closer
  window.openSpaModal = function(modalName) {
    const modal = document.getElementById(`modal-${modalName}`);
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeSpaModal = function(modalName) {
    if (modalName) {
      const modal = document.getElementById(`modal-${modalName}`);
      if (modal) modal.classList.remove('open');
    } else {
      document.querySelectorAll('.spa-modal-overlay').forEach(m => m.classList.remove('open'));
    }
    document.body.style.overflow = '';
  };

  // Close modals on overlay backdrop click or Escape key
  document.querySelectorAll('.spa-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        window.closeSpaModal();
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeSpaModal();
    }
  });

  // Expose switchTab globally
  window.switchDashboardTab = switchTab;
}

/* ==============================================================================
   1. SCROLL REVEALS (IntersectionObserver)
   ============================================================================== */
function initScrollReveals() {
  const revealElements = document.querySelectorAll('.reveal-fade-up');
  if (!('IntersectionObserver' in window)) {
    revealElements.forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

/* ==============================================================================
   2. MOBILE NAVIGATION TOGGLE
   ============================================================================== */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const dropdown = document.getElementById('mobileNavDropdown');
  if (!toggleBtn || !dropdown) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !toggleBtn.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });

  dropdown.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      dropdown.classList.remove('open');
    });
  });
}

/* ==============================================================================
   3. FAQ ACCORDION (DashFlow Smooth Motion)
   ============================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const header = item.querySelector('.faq-header');
    if (!header) return;
    header.addEventListener('click', () => {
      const isOpen = item.classList.contains('active');
      faqItems.forEach(other => other.classList.remove('active'));
      if (!isOpen) {
        item.classList.add('active');
      }
    });
  });
}

/* ==============================================================================
   4. INTERACTIVE RFM CALCULATOR
   ============================================================================== */
function initRfmCalculator() {
  const rSlider = document.getElementById('rfmRecencySlider');
  const fSlider = document.getElementById('rfmFreqSlider');
  const mSlider = document.getElementById('rfmMonetarySlider');

  const rVal = document.getElementById('rfmRecencyVal');
  const fVal = document.getElementById('rfmFreqVal');
  const mVal = document.getElementById('rfmMonetaryVal');

  const scoreBadge = document.getElementById('rfmScoreBadge');
  const segmentBadge = document.getElementById('rfmSegmentBadge');
  const clvEst = document.getElementById('rfmClvEst');

  if (!rSlider || !fSlider || !mSlider) return;

  let rfmDebounceTimer = null;

  function recalculate() {
    const recency = parseInt(rSlider.value, 10);
    const freq = parseInt(fSlider.value, 10);
    const monetary = parseFloat(mSlider.value);

    if (rVal) rVal.textContent = `${recency} days`;
    if (fVal) fVal.textContent = `${freq} orders`;
    if (mVal) mVal.textContent = `$${monetary.toLocaleString()}`;

    // Composite score
    const rScore = Math.max(1, Math.min(5, Math.ceil(5 - (recency / 100))));
    const fScore = Math.max(1, Math.min(5, Math.ceil(freq / 5)));
    const mScore = Math.max(1, Math.min(5, Math.ceil(monetary / 1000)));

    if (scoreBadge) scoreBadge.textContent = `RFM: ${rScore}-${fScore}-${mScore}`;

    // Initial heuristic state while waiting for API
    let segment = "Loyal Customers";
    let badgeClass = "badge-loyal";
    if (recency < 60 && (freq >= 12 || monetary >= 5000)) {
      segment = "Champions";
      badgeClass = "badge-champ";
    } else if (recency > 180 && monetary >= 1500) {
      segment = "At-Risk";
      badgeClass = "badge-risk";
    } else if (recency > 250) {
      segment = "Lost / Churned";
      badgeClass = "badge-lost";
    }
    if (segmentBadge) {
      segmentBadge.textContent = segment;
      segmentBadge.className = `cluster-card-badge ${badgeClass}`;
    }

    // Call live backend ML pipeline with debounce
    clearTimeout(rfmDebounceTimer);
    rfmDebounceTimer = setTimeout(() => {
      fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recency_days: recency,
          frequency: freq,
          total_spend: monetary,
          tenure_days: 300
        })
      })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && data.segment) {
          if (segmentBadge) {
            segmentBadge.textContent = data.segment;
            let bClass = 'badge-loyal';
            if (data.segment.includes('Champions')) bClass = 'badge-champ';
            else if (data.segment.includes('At-Risk')) bClass = 'badge-risk';
            else if (data.segment.includes('Lost')) bClass = 'badge-lost';
            segmentBadge.className = `cluster-card-badge ${bClass}`;
          }
          if (clvEst && data.predicted_clv !== undefined) {
            clvEst.textContent = `$${Math.round(data.predicted_clv).toLocaleString()}`;
          }
        }
      })
      .catch(err => {
        // Fallback approximation
        const aov = monetary / Math.max(freq, 1);
        const est = Math.max(50, (aov * freq * 0.45 * (1 - recency / 800)) + 120);
        if (clvEst) clvEst.textContent = `$${Math.round(est).toLocaleString()}`;
      });
    }, 150);
  }

  rSlider.addEventListener('input', recalculate);
  fSlider.addEventListener('input', recalculate);
  mSlider.addEventListener('input', recalculate);
  recalculate();
}

/* ==============================================================================
   5. CUSTOMER INTELLIGENCE LOOKUP (Verified Serving Store Integration)
   ============================================================================== */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initCustomerLookup() {
  const input = document.getElementById('lookupCustIdInput');
  const btn = document.getElementById('lookupSearchBtn');
  const samplePills = document.querySelectorAll('.sample-id-pill');
  const container = document.getElementById('customerProfileTarget');

  if (!input || !btn) return;

  function performLookup(id) {
    const cleanId = String(id || '').trim();
    if (!cleanId) {
      if (container) {
        container.innerHTML = `
          <div class="customer-profile-card">
            <div style="padding: 28px 16px; text-align: center; color: var(--text-muted); font-size: 13px;">
              Please enter a valid Customer ID (e.g. 15485, 13748, 12347) to inspect profile.
            </div>
          </div>
        `;
      }
      return;
    }

    // Highlight active pill if matched
    samplePills.forEach(p => {
      p.classList.toggle('active', p.dataset.id === cleanId);
    });

    btn.textContent = 'Searching...';
    btn.disabled = true;

    fetch(`/api/customer/${encodeURIComponent(cleanId)}`)
      .then(res => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`Customer #${cleanId} not found`);
          }
          throw new Error(`HTTP error ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        renderCustomerProfile(data);
      })
      .catch(err => {
        if (container) {
          container.innerHTML = `
            <div class="customer-profile-card">
              <div style="text-align: center; padding: 36px 16px;">
                <div style="font-size: 28px; margin-bottom: 8px;">🔍</div>
                <div style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px;">Customer #${escapeHtml(cleanId)} Not Found</div>
                <div style="font-size: 12px; color: var(--text-muted); max-width: 380px; margin: 0 auto; line-height: 1.5;">
                  No matching transaction record found in the 5,942 verified retail customer profiles.
                </div>
              </div>
            </div>
          `;
        }
      })
      .finally(() => {
        btn.textContent = 'Search';
        btn.disabled = false;
      });
  }

  btn.addEventListener('click', () => performLookup(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performLookup(input.value);
  });

  samplePills.forEach(pill => {
    pill.addEventListener('click', () => {
      input.value = pill.dataset.id;
      performLookup(pill.dataset.id);
    });
  });

  // Default query on load
  performLookup('15485');
}

function renderCustomerProfile(data) {
  const container = document.getElementById('customerProfileTarget');
  if (!container) return;

  const rawId = String(data.customer_id || '');
  const safeId = escapeHtml(rawId);
  const rawSeg = String(data.segment || 'Loyal Customers');
  const safeSeg = escapeHtml(rawSeg);
  const clv = Number(data.predicted_clv || 0);
  const churn = Number(data.churn_probability || 0);
  const freq = parseInt(data.frequency || 0, 10);
  const recency = parseInt(data.recency_days || 0, 10);
  const monetary = Number(data.monetary || 0);

  let badgeClass = "badge-champ";
  if (rawSeg.includes("At-Risk")) badgeClass = "badge-risk";
  else if (rawSeg.includes("Lost")) badgeClass = "badge-lost";
  else if (rawSeg.includes("Loyal")) badgeClass = "badge-loyal";

  const initials = safeId.substring(0, 2).toUpperCase() || 'CU';

  let transactionsHtml = '';
  if (Array.isArray(data.transactions) && data.transactions.length > 0) {
    const rows = data.transactions.map(tx => `
      <tr>
        <td style="padding: 6px 8px; font-size: 11px; color: var(--text-muted); border-bottom: 1px solid rgba(255,255,255,0.04);">${escapeHtml(tx.date)}</td>
        <td style="padding: 6px 8px; font-size: 11px; font-family: var(--font-mono); color: #fff; border-bottom: 1px solid rgba(255,255,255,0.04);">${escapeHtml(tx.invoice)}</td>
        <td style="padding: 6px 8px; font-size: 11px; font-family: var(--font-mono); color: #34d399; border-bottom: 1px solid rgba(255,255,255,0.04);">${escapeHtml(tx.stock_code)}</td>
        <td style="padding: 6px 8px; font-size: 11px; color: #fff; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.04);">${escapeHtml(tx.quantity)}</td>
        <td style="padding: 6px 8px; font-size: 11px; color: #fff; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.04);">$${Number(tx.unit_price).toFixed(2)}</td>
        <td style="padding: 6px 8px; font-size: 11px; color: #34d399; font-weight: 700; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.04);">$${Number(tx.total).toFixed(2)}</td>
      </tr>
    `).join('');

    transactionsHtml = `
      <div style="margin-top: 16px; margin-bottom: 16px;">
        <div style="font-size: 11px; font-weight: 700; color: #fff; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">Verified Transaction Ledger</div>
        <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: rgba(255,255,255,0.02);">
                <th style="padding: 6px 8px; font-size: 10px; color: var(--text-dim); text-align: left;">Date</th>
                <th style="padding: 6px 8px; font-size: 10px; color: var(--text-dim); text-align: left;">Invoice</th>
                <th style="padding: 6px 8px; font-size: 10px; color: var(--text-dim); text-align: left;">Item</th>
                <th style="padding: 6px 8px; font-size: 10px; color: var(--text-dim); text-align: right;">Qty</th>
                <th style="padding: 6px 8px; font-size: 10px; color: var(--text-dim); text-align: right;">Unit</th>
                <th style="padding: 6px 8px; font-size: 10px; color: var(--text-dim); text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="customer-profile-card">
      <div class="customer-card-top">
        <span class="cluster-card-badge ${badgeClass}">● ${safeSeg}</span>
        <span style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono);">Row Key: ${safeId}</span>
      </div>

      <div class="customer-avatar-header">
        <div class="customer-avatar-circle">${initials}</div>
        <div class="customer-name-heading">Customer #${safeId}</div>
        <div class="customer-subheading">Retail Client Profile · Verified Columnar Store</div>
        <div style="font-size: 11px; color: #71717a; margin-top: 4px;">📍 United Kingdom · Sub-millisecond latency &lt; 1ms</div>
      </div>

      <div class="customer-metrics-row">
        <div class="customer-metric-box">
          <div class="customer-metric-lbl">Predicted CLV</div>
          <div class="customer-metric-num" style="color: var(--accent-emerald-bright);">$${clv.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div class="customer-metric-box">
          <div class="customer-metric-lbl">Orders Count</div>
          <div class="customer-metric-num">${freq}</div>
        </div>
        <div class="customer-metric-box">
          <div class="customer-metric-lbl">Churn Risk</div>
          <div class="customer-metric-num" style="color: ${churn > 0.4 ? '#fb7185' : '#34d399'};">${(churn * 100).toFixed(1)}%</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px 12px;">
          <div style="font-size: 11px; color: var(--text-muted);">Recency</div>
          <div style="font-size: 14px; font-weight: 700; color: #ffffff;">${recency} days ago</div>
        </div>
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px 12px;">
          <div style="font-size: 11px; color: var(--text-muted);">Total Spend</div>
          <div style="font-size: 14px; font-weight: 700; color: #ffffff;">$${monetary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
      </div>

      ${transactionsHtml}

      <div class="customer-actions-box">
        <div class="actions-box-title">Recommended Next Best Actions</div>
        <div class="action-item-row">
          <span>${rawSeg === 'Champions' ? '⭐ VIP Exclusive Rewards Access' : '✨ Re-engagement Promotion'}</span>
          <span style="font-size: 11px; color: #34d399; font-weight: 700;">Eligible</span>
        </div>
        <div class="action-item-row">
          <span>📦 High-AOV Category Cross-Sell Catalog</span>
          <span style="font-size: 11px; color: #60a5fa; font-weight: 700;">Queued</span>
        </div>
      </div>

      <div style="display: flex; gap: 12px;">
        <button type="button" class="btn-pill-secondary" style="flex: 1; justify-content: center; font-size: 13px; padding: 10px;" onclick="alert('Notification sent to customer account #' + encodeURIComponent('${safeId}'))">💬 Message Account</button>
        <button type="button" class="btn-pill-primary" style="flex: 1; justify-content: center; font-size: 13px; padding: 10px;" onclick="alert('Retention task assigned for Customer #' + encodeURIComponent('${safeId}'))">+ Assign Task</button>
      </div>
    </div>
  `;
}

/* ==============================================================================
   6. WHAT-IF SCENARIO SIMULATOR (Live ML Model Client)
   ============================================================================== */
function initWhatIfSimulator() {
  const recInput = document.getElementById('simRecency');
  const freqInput = document.getElementById('simFreq');
  const spendInput = document.getElementById('simSpend');
  const tenureInput = document.getElementById('simTenure');

  if (!recInput || !freqInput || !spendInput || !tenureInput) return;

  const segTarget = document.getElementById('simSegOutput');
  const clvTarget = document.getElementById('simClvOutput');
  const churnTarget = document.getElementById('simChurnOutput');

  function runSim() {
    const payload = {
      recency_days: parseInt(recInput.value, 10),
      frequency: parseInt(freqInput.value, 10),
      total_spend: parseFloat(spendInput.value),
      tenure_days: parseInt(tenureInput.value, 10)
    };

    fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(res => {
        if (segTarget) segTarget.textContent = res.segment;
        if (clvTarget) clvTarget.textContent = `$${parseFloat(res.predicted_clv).toFixed(2)}`;
        if (churnTarget) {
          churnTarget.textContent = `${(parseFloat(res.churn_probability) * 100).toFixed(1)}%`;
          churnTarget.style.color = res.churn_probability > 0.4 ? '#fb7185' : '#34d399';
        }
      })
      .catch(() => {
        // Fallback computation
        const r = payload.recency_days;
        const f = payload.frequency;
        const s = payload.total_spend;
        let seg = "Loyal Customers";
        if (r < 30 && (f >= 10 || s > 3000)) seg = "Champions";
        else if (r > 180) seg = "At-Risk";
        else if (r > 300) seg = "Lost / Churned";

        const clv = Math.max(0, s * 0.42 + 210 * (1 - r / 600));
        const churn = Math.min(0.95, Math.max(0.05, (r / 300) * 0.7));

        if (segTarget) segTarget.textContent = seg;
        if (clvTarget) clvTarget.textContent = `$${clv.toFixed(2)}`;
        if (churnTarget) {
          churnTarget.textContent = `${(churn * 100).toFixed(1)}%`;
          churnTarget.style.color = churn > 0.4 ? '#fb7185' : '#34d399';
        }
      });
  }

  [recInput, freqInput, spendInput, tenureInput].forEach(inp => {
    inp.addEventListener('input', runSim);
  });
  runSim();
}

/* ==============================================================================
   7. DASHBOARD CHARTS — REAL DATA REVENUE & ORDER TRAJECTORY
   Dual-Axis Area & Spline Chart powered by UCI Online Retail II Warehouse API
   ============================================================================== */
let trajectoryChartInstance = null;

function initDashboardCharts() {
  const canvas = document.getElementById('dashTrajectoryChart');
  if (!canvas) return;

  const periodSelect = document.getElementById('trajectoryPeriodSelect');
  const loadingOverlay = document.getElementById('chartLoadingOverlay');
  const errorState = document.getElementById('chartErrorState');

  // KPI DOM elements
  const elHeadlineRevenue = document.getElementById('trajectoryHeadlineRevenue');
  const elHeadlineGrowth  = document.getElementById('trajectoryHeadlineGrowth');
  const elKpiRevenue      = document.getElementById('kpiTotalRevenue');
  const elKpiRevGrowth    = document.getElementById('kpiRevenueGrowth');
  const elKpiOrders       = document.getElementById('kpiTotalOrders');
  const elKpiOrdGrowth    = document.getElementById('kpiOrdersGrowth');
  const elKpiAov          = document.getElementById('kpiAvgOrderValue');
  const elKpiAovGrowth    = document.getElementById('kpiAovGrowth');
  const elKpiCustomers    = document.getElementById('kpiTotalCustomers');
  const elDataStatus      = document.getElementById('trajectoryDataStatus');

  // Populate verified customer count from live health endpoint
  fetch('/api/health')
    .then(res => res.json())
    .then(health => {
      if (elKpiCustomers && health && health.serving_records) {
        elKpiCustomers.textContent = formatNumber(health.serving_records);
      }
    })
    .catch(() => {});

  function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(val);
  }

  function formatNumber(val) {
    return new Intl.NumberFormat('en-US').format(val);
  }

  function updateKpiPill(element, growth, suffix = 'vs prev') {
    if (!element) return;
    const isPos = growth >= 0;
    const arrow = isPos ? '↑' : '↓';
    const sign = isPos ? '+' : '';
    element.innerHTML = `<span>${arrow}</span> ${sign}${growth.toFixed(1)}% ${suffix}`;
    if (element.classList.contains('pill-growth') || element.classList.contains('pill-warning')) {
      element.className = `dash-kpi-pill ${isPos ? 'pill-growth' : 'pill-warning'}`;
    } else {
      element.className = `kpi-tile-sub ${isPos ? '' : 'negative'}`;
    }
  }

  function renderChart(data) {
    const ctx = canvas.getContext('2d');

    if (trajectoryChartInstance) {
      trajectoryChartInstance.destroy();
      trajectoryChartInstance = null;
    }

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
      console.error('Chart.js library not loaded yet');
      return;
    }

    // Create linear gradients for area fills - Luxury Emerald & Cyan
    const chartHeight = canvas.clientHeight || 280;
    const revGradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    revGradient.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
    revGradient.addColorStop(0.65, 'rgba(16, 185, 129, 0.04)');
    revGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const ordGradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    ordGradient.addColorStop(0, 'rgba(56, 189, 248, 0.20)');
    ordGradient.addColorStop(0.65, 'rgba(56, 189, 248, 0.03)');
    ordGradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    trajectoryChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Revenue (USD)',
            data: data.revenue,
            yAxisID: 'yRevenue',
            borderColor: '#10B981',
            backgroundColor: revGradient,
            borderWidth: 2.8,
            tension: 0.38,
            fill: true,
            pointRadius: data.labels.length > 40 ? 0 : 3.5,
            pointHoverRadius: 6.5,
            pointBackgroundColor: '#34D399',
            pointBorderColor: '#050807',
            pointBorderWidth: 2,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2.5
          },
          {
            label: 'Order Volume',
            data: data.orders,
            yAxisID: 'yOrders',
            borderColor: '#38BDF8',
            backgroundColor: ordGradient,
            borderWidth: 2,
            borderDash: [5, 4],
            tension: 0.38,
            fill: true,
            pointRadius: data.labels.length > 40 ? 0 : 3,
            pointHoverRadius: 5.5,
            pointBackgroundColor: '#38BDF8',
            pointBorderColor: '#050807',
            pointBorderWidth: 2,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        animation: {
          duration: 900,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false // Using our custom legend matching DashFlow UI
          },
          tooltip: {
            backgroundColor: 'rgba(5, 14, 10, 0.92)',
            titleColor: '#ffffff',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(16, 185, 129, 0.22)',
            borderWidth: 1,
            padding: 10,
            boxPadding: 5,
            usePointStyle: true,
            cornerRadius: 8,
            titleFont: { size: 11, weight: '700', family: 'Inter, sans-serif' },
            bodyFont: { size: 11, weight: '500', family: 'Inter, sans-serif' },
            callbacks: {
              label: function(context) {
                if (context.datasetIndex === 0) {
                  return ` Revenue:  ${formatCurrency(context.parsed.y)}`;
                } else {
                  return ` Orders:   ${formatNumber(context.parsed.y)} txns`;
                }
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(16, 185, 129, 0.04)',
              drawBorder: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.45)',
              font: { size: 11, weight: '600' },
              maxTicksLimit: data.labels.length > 40 ? 10 : 12,
              maxRotation: 0
            }
          },
          yRevenue: {
            type: 'linear',
            position: 'left',
            grid: {
              color: 'rgba(16, 185, 129, 0.04)',
              drawBorder: false
            },
            ticks: {
              color: 'rgba(52, 211, 153, 0.85)',
              font: { size: 11, weight: '600' },
              callback: function(val) {
                if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
                if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
                return `$${val}`;
              }
            }
          },
          yOrders: {
            type: 'linear',
            position: 'right',
            grid: {
              drawOnChartArea: false,
              drawBorder: false
            },
            ticks: {
              color: 'rgba(45, 212, 191, 0.8)',
              font: { size: 11, weight: '600' },
              callback: function(val) {
                if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
                return val;
              }
            }
          }
        }
      },
      plugins: [{
        id: 'verticalGuideLine',
        afterDraw: (chart) => {
          if (chart.tooltip && chart.tooltip.getActiveElements && chart.tooltip.getActiveElements().length) {
            const activePoint = chart.tooltip.getActiveElements()[0];
            const ctx = chart.ctx;
            const x = activePoint.element.x;
            const topY = chart.scales.yRevenue ? chart.scales.yRevenue.top : 0;
            const bottomY = chart.scales.yRevenue ? chart.scales.yRevenue.bottom : chart.height;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, topY);
            ctx.lineTo(x, bottomY);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.restore();
          }
        }
      }]
    });
  }

  function fetchTrajectory(period = '12m') {
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    if (errorState) errorState.style.display = 'none';

    fetch(`/api/analytics/revenue-orders?period=${encodeURIComponent(period)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (loadingOverlay) loadingOverlay.style.display = 'none';

        // Update Headline / Hero Revenue
        if (elHeadlineRevenue) elHeadlineRevenue.textContent = formatCurrency(data.headline_revenue || data.total_revenue);
        if (elHeadlineGrowth) updateKpiPill(elHeadlineGrowth, data.headline_growth || data.revenue_growth, 'vs previous period');

        const heroRev = document.getElementById('kpiHeroTotalRevenue');
        const heroGrowth = document.getElementById('kpiHeroRevGrowth');
        if (heroRev) heroRev.textContent = formatCurrency(data.headline_revenue || data.total_revenue);
        if (heroGrowth) updateKpiPill(heroGrowth, data.headline_growth || data.revenue_growth, 'vs previous period');

        // Update 4 KPI Tiles
        if (elKpiRevenue) elKpiRevenue.textContent = formatCurrency(data.total_revenue);
        if (elKpiRevGrowth) updateKpiPill(elKpiRevGrowth, data.revenue_growth, 'vs previous period');

        if (elKpiOrders) elKpiOrders.textContent = formatNumber(data.total_orders);
        if (elKpiOrdGrowth) updateKpiPill(elKpiOrdGrowth, data.orders_growth, 'vs previous period');

        if (elKpiAov) elKpiAov.textContent = formatCurrency(data.avg_order_value);
        if (elKpiAovGrowth) updateKpiPill(elKpiAovGrowth, data.aov_growth, 'vs previous period');

        if (elDataStatus) {
          const ptCount = data.data_points || (data.labels ? data.labels.length : 12);
          elDataStatus.innerHTML = `● UCI Online Retail II Warehouse &mdash; ${data.granularity === 'daily' ? 'Daily' : 'Monthly'} (${ptCount} points)`;
        }

        renderChart(data);
      })
      .catch(err => {
        console.error('Error loading trajectory data:', err);
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (errorState) errorState.style.display = 'flex';
      });
  }

  // Hook period pills (7D 30D 3M 6M 1Y All) matching reference
  const periodPills = document.querySelectorAll('.period-pill');
  periodPills.forEach(pill => {
    pill.addEventListener('click', () => {
      periodPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const chosen = pill.dataset.period || '12m';
      if (periodSelect) periodSelect.value = chosen;
      fetchTrajectory(chosen);
    });
  });

  window.reloadTrajectoryChart = function() {
    const activePill = document.querySelector('.period-pill.active');
    const period = activePill ? activePill.dataset.period : (periodSelect ? periodSelect.value : '12m');
    fetchTrajectory(period);
  };

  if (periodSelect) {
    periodSelect.addEventListener('change', (e) => {
      fetchTrajectory(e.target.value);
    });
  }

  // Initial load
  fetchTrajectory('12m');
}

/* ==============================================================================
   8. SMOOTH ANCHOR SCROLLING (Filtered for non-SPA elements)
   ============================================================================== */
function initAnchorScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      // Skip if this anchor is managed by SPA navigation or modal
      if (
        this.dataset.tab ||
        this.closest('.dash-sidebar') ||
        this.closest('.nav-capsule') ||
        this.closest('.nav-mobile-dropdown') ||
        this.classList.contains('dash-action-pill') ||
        this.classList.contains('nav-link') ||
        this.classList.contains('dash-nav-item')
      ) {
        return;
      }

      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#' || targetId.startsWith('#tab-')) return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const navOffset = 110;
        const elPosition = targetEl.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: elPosition - navOffset,
          behavior: 'smooth'
        });
      }
    });
  });
}

/* ==============================================================================
   8B. DASHBOARD OVERVIEW THREE MODULES (Live Lookup, RFM, & Segmentation Preview)
   ============================================================================== */
function initOverviewModules() {
  // 1. Overview Customer Lookup
  const ovInput = document.getElementById('ovLookupInput');
  const ovBtn = document.getElementById('ovLookupBtn');
  const ovTableBody = document.getElementById('ovTableBody');

  function runOvLookup(id) {
    const cleanId = String(id || '').trim();
    const elId = document.getElementById('ovProfileId');
    const elSeg = document.getElementById('ovProfileSegment');
    const elClv = document.getElementById('ovProfileClv');
    const elRec = document.getElementById('ovProfileRecency');
    const elFreq = document.getElementById('ovProfileFreq');
    const elMon = document.getElementById('ovProfileMonetary');
    const elTen = document.getElementById('ovProfileTenure');

    if (!cleanId) {
      if (elSeg) {
        elSeg.textContent = 'Enter ID';
        elSeg.className = 'cluster-card-badge badge-loyal';
      }
      if (ovTableBody) {
        ovTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-muted); font-size: 11.5px;">Please enter a Customer ID (e.g. 15485, 13748, 12347).</td></tr>';
      }
      return;
    }

    if (ovBtn) {
      ovBtn.textContent = 'Searching...';
      ovBtn.disabled = true;
    }

    fetch(`/api/customer/${encodeURIComponent(cleanId)}`)
      .then(res => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('NOT_FOUND');
          throw new Error('API_ERROR');
        }
        return res.json();
      })
      .then(data => {
        if (elId) elId.textContent = `#${escapeHtml(data.customer_id || cleanId)}`;
        if (elSeg) {
          const segName = data.segment || 'Loyal Customers';
          elSeg.textContent = escapeHtml(segName);
          let bClass = 'badge-loyal';
          if (segName.includes('Champions')) bClass = 'badge-champ';
          else if (segName.includes('At-Risk') || segName.includes('At Risk')) bClass = 'badge-risk';
          else if (segName.includes('Lost')) bClass = 'badge-lost';
          elSeg.className = `cluster-card-badge ${bClass}`;
        }
        if (elClv) elClv.textContent = `$${Number(data.predicted_clv || 0).toFixed(2)}`;
        if (elRec) elRec.textContent = `${data.recency_days || 0} days`;
        if (elFreq) elFreq.textContent = `${data.frequency || 0} orders`;
        if (elMon) elMon.textContent = `$${Number(data.monetary || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        if (elTen) elTen.textContent = `${data.tenure_days || 0} days`;

        // Render customer's actual transactions
        if (ovTableBody && Array.isArray(data.transactions) && data.transactions.length > 0) {
          ovTableBody.innerHTML = data.transactions.map(tx => `
            <tr>
              <td>${escapeHtml(tx.date)}</td>
              <td>${escapeHtml(tx.invoice)}</td>
              <td>${escapeHtml(tx.stock_code)}</td>
              <td>${escapeHtml(tx.quantity)}</td>
              <td>$${Number(tx.unit_price).toFixed(2)}</td>
              <td>$${Number(tx.total).toFixed(2)}</td>
            </tr>
          `).join('');
        } else if (ovTableBody) {
          ovTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-muted); font-size: 11.5px;">No itemized ledger rows available for this account.</td></tr>';
        }
      })
      .catch(err => {
        if (elId) elId.textContent = `#${escapeHtml(cleanId)}`;
        if (elSeg) {
          elSeg.textContent = 'Not Found';
          elSeg.className = 'cluster-card-badge badge-risk';
        }
        if (elClv) elClv.textContent = '$0.00';
        if (elRec) elRec.textContent = '--';
        if (elFreq) elFreq.textContent = '0 orders';
        if (elMon) elMon.textContent = '$0.00';
        if (elTen) elTen.textContent = '--';

        if (ovTableBody) {
          ovTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px 10px; color: #f87171; font-size: 11.5px;">Customer #${escapeHtml(cleanId)} not found in verified 5,942 retail profiles.</td></tr>`;
        }
      })
      .finally(() => {
        if (ovBtn) {
          ovBtn.textContent = 'Search';
          ovBtn.disabled = false;
        }
      });
  }

  if (ovBtn && ovInput) {
    ovBtn.addEventListener('click', () => runOvLookup(ovInput.value));
    ovInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runOvLookup(ovInput.value);
    });
  }

  // 2. Overview RFM Sliders & Calculator
  const rInput = document.getElementById('ovRfmRecencyInput');
  const fInput = document.getElementById('ovRfmFreqInput');
  const mInput = document.getElementById('ovRfmMonetaryInput');
  const tInput = document.getElementById('ovRfmTenureInput');
  const calcBtn = document.getElementById('ovCalcRfmBtn');

  function updateOvRfmLabels() {
    if (rInput) { const el = document.getElementById('ovRfmRecencyVal'); if (el) el.textContent = rInput.value; }
    if (fInput) { const el = document.getElementById('ovRfmFreqVal'); if (el) el.textContent = fInput.value; }
    if (mInput) { const el = document.getElementById('ovRfmMonetaryVal'); if (el) el.textContent = mInput.value; }
    if (tInput) { const el = document.getElementById('ovRfmTenureVal'); if (el) el.textContent = tInput.value; }
  }

  [rInput, fInput, mInput, tInput].forEach(inp => {
    if (inp) inp.addEventListener('input', updateOvRfmLabels);
  });

  if (calcBtn) {
    calcBtn.addEventListener('click', () => {
      calcBtn.textContent = 'Calculating...';
      const payload = {
        recency_days: parseInt(rInput ? rInput.value : 25),
        frequency: parseInt(fInput ? fInput.value : 6),
        total_spend: parseFloat(mInput ? mInput.value : 1250),
        tenure_days: parseInt(tInput ? tInput.value : 300)
      };

      fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(res => {
        calcBtn.textContent = 'Calculate RFM →';
        const elSeg = document.getElementById('ovRfmSeg');
        const elClv = document.getElementById('ovRfmClv');
        const elChurn = document.getElementById('ovRfmChurn');
        if (elSeg) elSeg.textContent = res.segment || 'Loyal Customers';
        if (elClv) elClv.textContent = `$${Number(res.predicted_clv || 0).toFixed(2)}`;
        if (elChurn) elChurn.textContent = `${(Number(res.churn_probability || 0) * 100).toFixed(1)}%`;
      })
      .catch(() => {
        calcBtn.textContent = 'Calculate RFM →';
      });
    });
  }

  // 3. Overview Cohort Pills Interaction
  const COHORT_STATS = {
    'Champions': { count: '1,242 (20.9%)', mon: '$10,053.19', freq: '23.1 orders', rec: '24.9 days' },
    'Loyal Customers': { count: '1,187 (20.0%)', mon: '$784.29', freq: '3.3 orders', rec: '26.5 days' },
    'At Risk': { count: '1,476 (24.8%)', mon: '$1,831.35', freq: '6.1 orders', rec: '219.3 days' },
    'Hibernating': { count: '2,037 (34.3%)', mon: '$305.52', freq: '1.6 orders', rec: '399.4 days' }
  };

  const cohortPills = document.querySelectorAll('.ov-cohort-pill');
  cohortPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      cohortPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const name = pill.querySelector('.ov-cohort-name') ? pill.querySelector('.ov-cohort-name').textContent.trim() : 'Loyal Customers';
      const stats = COHORT_STATS[name] || COHORT_STATS['Loyal Customers'];
      const container = document.querySelector('.ov-cluster-insights-list');
      if (container) {
        container.innerHTML = `
          <div style="font-size: 11px; font-weight: 700; color: #ffffff; margin-bottom: 2px;">Cluster Insights (${name})</div>
          <div class="ov-insight-row"><span>Customer Count</span><strong style="color: #ffffff;">${stats.count}</strong></div>
          <div class="ov-insight-row"><span>Avg. Monetary Spend</span><strong style="color: #34d399;">${stats.mon}</strong></div>
          <div class="ov-insight-row"><span>Avg. Frequency</span><strong style="color: #38bdf8;">${stats.freq}</strong></div>
          <div class="ov-insight-row"><span>Avg. Recency</span><strong style="color: #ffffff;">${stats.rec}</strong></div>
        `;
      }
    });
  });
}

/* ==============================================================================
   9. WEB3-VERSE INTERACTIVE EMERALD WIREFRAME GLOBE (Canvas 3D Mathematics)
   ============================================================================== */
function initInteractiveGlobe() {
  const canvas = document.getElementById('globeCanvas');
  const container = document.getElementById('globeContainer');
  if (!canvas || !container) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = container.clientWidth || window.innerWidth;
  let height = container.clientHeight || 720;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    width = container.clientWidth || window.innerWidth;
    height = container.clientHeight || 720;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // 1. Continent Polygons (lat, lon degrees) for realistic shaded landmasses
  const CONTINENT_POLYS = [
    // North America
    [ [70,-165],[72,-130],[70,-85],[60,-65],[48,-55],[43,-70],[30,-80],[25,-80],[18,-96],[15,-92],[8,-78],[14,-86],[20,-105],[32,-118],[38,-124],[49,-125],[60,-140],[65,-168] ],
    // South America
    [ [12,-73],[7,-55],[-3,-36],[-12,-37],[-23,-42],[-34,-53],[-55,-67],[-54,-73],[-40,-73],[-20,-70],[-5,-80],[5,-77] ],
    // Europe
    [ [71,28],[68,44],[60,30],[55,38],[46,48],[40,27],[36,22],[36,-5],[43,-9],[48,-4],[54,8],[58,6],[62,5],[70,20] ],
    // Africa
    [ [37,10],[32,32],[28,34],[12,44],[10,51],[-5,40],[-26,33],[-34,18],[-34,26],[-18,12],[5,9],[5,-1],[15,-17],[28,-13],[35,-6] ],
    // Asia
    [ [76,100],[73,140],[66,170],[58,162],[52,141],[43,132],[38,118],[22,114],[20,107],[10,105],[1,104],[8,77],[22,69],[25,57],[12,44],[30,35],[40,27],[55,38],[58,55],[68,75],[73,80] ],
    // Australia
    [ [-12,136],[-12,142],[-24,153],[-37,150],[-38,140],[-35,116],[-22,114],[-15,125] ],
    // UK
    [ [58,-5],[58,-2],[51,1],[50,-5],[55,-5] ]
  ];

  // Map continent polygons to 3D unit sphere coordinates
  const continentPaths3D = CONTINENT_POLYS.map(poly => {
    return poly.map(([latDeg, lonDeg]) => {
      const lat = latDeg * Math.PI / 180;
      const lon = lonDeg * Math.PI / 180;
      return {
        x: Math.cos(lat) * Math.sin(lon),
        y: Math.sin(lat),
        z: Math.cos(lat) * Math.cos(lon)
      };
    });
  });

  // 2. Geodesic Sphere Vertices & Triangulated Mesh (22 rings x 44 points)
  const numRings = 22;
  const pointsPerRing = 44;
  const sphereVerts = [];

  for (let i = 0; i < numRings; i++) {
    const phi = (Math.PI * (i + 0.5)) / numRings;
    const ringRadius = Math.sin(phi);
    const y = Math.cos(phi);

    for (let j = 0; j < pointsPerRing; j++) {
      const theta = (2 * Math.PI * j) / pointsPerRing;
      const x = ringRadius * Math.cos(theta);
      const z = ringRadius * Math.sin(theta);
      sphereVerts.push({
        origX: x,
        origY: y,
        origZ: z,
        x: x,
        y: y,
        z: z,
        sx: 0,
        sy: 0,
        scale: 0,
        alpha: 0
      });
    }
  }

  // Precompute triangulated geodesic edges
  const edges = [];
  for (let i = 0; i < numRings; i++) {
    for (let j = 0; j < pointsPerRing; j++) {
      const curr = i * pointsPerRing + j;
      const right = i * pointsPerRing + ((j + 1) % pointsPerRing);
      edges.push([curr, right]);

      if (i < numRings - 1) {
        const down = (i + 1) * pointsPerRing + j;
        const diag = (i + 1) * pointsPerRing + ((j + 1) % pointsPerRing);
        edges.push([curr, down]);
        edges.push([curr, diag]); // Triangulation!
      }
    }
  }

  // Commercial retail intelligence hubs
  const hubs = [
    { ring: 6, index: 12, label: 'LON' },
    { ring: 7, index: 24, label: 'NYC' },
    { ring: 8, index: 38, label: 'TYO' },
    { ring: 7, index: 15, label: 'FRA' },
    { ring: 12, index: 3, label: 'SIN' },
    { ring: 10, index: 19, label: 'DXB' }
  ];

  // Geodesic transaction arcs between hubs
  const arcs = [
    { from: 1, to: 0 }, // NYC -> LON
    { from: 0, to: 3 }, // LON -> FRA
    { from: 3, to: 5 }, // FRA -> DXB
    { from: 5, to: 4 }, // DXB -> SIN
    { from: 4, to: 2 }  // SIN -> TYO
  ];

  // Rotation and Parallax Physics
  let rotX = -0.42; // Forward tilt so top hemisphere crowns prominently
  let rotY = -0.60;
  let targetRotSpeedY = prefersReducedMotion ? 0 : 0.0035;
  let curRotSpeedY = targetRotSpeedY;
  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;
  let isHovered = false;
  let animId = null;

  window.addEventListener('mousemove', (e) => {
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    const normY = (e.clientY / window.innerHeight) * 2 - 1;
    targetPointerX = normX * 24;
    targetPointerY = normY * 16;

    if (e.clientY < 680) {
      isHovered = true;
      targetRotSpeedY = prefersReducedMotion ? 0 : 0.006;
    } else {
      isHovered = false;
      targetRotSpeedY = prefersReducedMotion ? 0 : 0.0035;
    }
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    isHovered = false;
    targetPointerX = 0;
    targetPointerY = 0;
    targetRotSpeedY = prefersReducedMotion ? 0 : 0.0035;
  });

  function projectPoint(x, y, z, cx, cy, R) {
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    // Y rotation
    const x1 = x * cosY - z * sinY;
    const z1 = z * cosY + x * sinY;
    // X rotation
    const y2 = y * cosX - z1 * sinX;
    const z2 = z1 * cosX + y * sinX;

    const fov = 650;
    const scale = fov / (fov + z2 * R * 0.45);
    return {
      x: x1,
      y: y2,
      z: z2,
      scale: scale,
      sx: cx + x1 * R * scale,
      sy: cy - y2 * R * scale
    };
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    pointerX += (targetPointerX - pointerX) * 0.06;
    pointerY += (targetPointerY - pointerY) * 0.06;
    curRotSpeedY += (targetRotSpeedY - curRotSpeedY) * 0.05;
    rotY += curRotSpeedY;

    // Center position of the globe (Matching Image 2: prominent, centered, crowning gracefully below title)
    const cx = width * 0.50 + pointerX;
    const currentRadius = Math.min(width * 0.44, 430);
    const cy = Math.min(height * 0.82, 630) + pointerY;

    // 1. Radiant Atmospheric Nebula Glow behind Globe
    const auraGrad = ctx.createRadialGradient(cx, cy - currentRadius * 0.35, currentRadius * 0.2, cx, cy, currentRadius * 1.35);
    auraGrad.addColorStop(0, isHovered ? 'rgba(189, 255, 115, 0.35)' : 'rgba(189, 255, 115, 0.25)');
    auraGrad.addColorStop(0.35, 'rgba(82, 246, 67, 0.16)');
    auraGrad.addColorStop(0.65, 'rgba(16, 185, 129, 0.05)');
    auraGrad.addColorStop(1, 'rgba(3, 6, 4, 0.0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // 2. Base Sphere (Dark Ocean Body)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
    const oceanGrad = ctx.createRadialGradient(cx, cy - currentRadius * 0.4, currentRadius * 0.1, cx, cy, currentRadius);
    oceanGrad.addColorStop(0, '#0a2211');
    oceanGrad.addColorStop(0.5, '#041308');
    oceanGrad.addColorStop(1, '#020603');
    ctx.fillStyle = oceanGrad;
    ctx.fill();
    ctx.clip();

    // 3. Shaded Continents (From Image 2: Sage-mint landmasses)
    continentPaths3D.forEach(path => {
      const proj = path.map(pt => projectPoint(pt.x, pt.y, pt.z, cx, cy, currentRadius));
      const frontCount = proj.filter(p => p.z > -0.2).length;
      if (frontCount > 2) {
        ctx.beginPath();
        let started = false;
        proj.forEach(p => {
          if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
          else { ctx.lineTo(p.sx, p.sy); }
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(168, 198, 168, 0.85)'; // Shaded sage continent
        ctx.fill();
        ctx.strokeStyle = 'rgba(189, 255, 115, 0.35)';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
    });

    // 4. Project Geodesic Vertices
    sphereVerts.forEach(v => {
      const p = projectPoint(v.origX, v.origY, v.origZ, cx, cy, currentRadius);
      v.x = p.x; v.y = p.y; v.z = p.z;
      v.sx = p.sx; v.sy = p.sy;
      v.scale = p.scale;
      v.alpha = Math.max(0.05, Math.min(0.65, (p.z + 0.3) * 0.5));
    });

    // 5. Draw Triangulated Geodesic Wireframe Mesh
    ctx.lineWidth = 0.8;
    for (let i = 0; i < edges.length; i++) {
      const p1 = sphereVerts[edges[i][0]];
      const p2 = sphereVerts[edges[i][1]];

      if (p1.z > -0.15 && p2.z > -0.15) {
        const edgeAlpha = Math.max(0.06, Math.min(0.55, (p1.z + p2.z) * 0.35));
        ctx.strokeStyle = `rgba(167, 251, 95, ${edgeAlpha * (isHovered ? 1.2 : 1.0)})`;
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }
    }

    // 6. Draw Glowing Geodesic Nodes
    for (let i = 0; i < sphereVerts.length; i++) {
      const v = sphereVerts[i];
      if (v.z > 0.08) {
        ctx.fillStyle = `rgba(189, 255, 115, ${v.alpha})`;
        ctx.beginPath();
        const nodeRadius = (v.z > 0.4 ? 1.5 : 1.0) * v.scale;
        ctx.arc(v.sx, v.sy, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 7. Draw Geodesic Arcs connecting hubs
    const now = Date.now();
    for (let a = 0; a < arcs.length; a++) {
      const hFrom = hubs[arcs[a].from];
      const hTo = hubs[arcs[a].to];
      const vFrom = sphereVerts[hFrom.ring * pointsPerRing + hFrom.index];
      const vTo = sphereVerts[hTo.ring * pointsPerRing + hTo.index];

      if (vFrom && vTo && (vFrom.z > -0.1 || vTo.z > -0.1)) {
        const midX = (vFrom.sx + vTo.sx) * 0.5;
        const midY = (vFrom.sy + vTo.sy) * 0.5 - 28 * vFrom.scale;

        ctx.strokeStyle = 'rgba(189, 255, 115, 0.40)';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(vFrom.sx, vFrom.sy);
        ctx.quadraticCurveTo(midX, midY, vTo.sx, vTo.sy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Traveling packet
        const t = (now / 2400 + a * 0.22) % 1;
        const ptX = (1 - t) * (1 - t) * vFrom.sx + 2 * (1 - t) * t * midX + t * t * vTo.sx;
        const ptY = (1 - t) * (1 - t) * vFrom.sy + 2 * (1 - t) * t * midY + t * t * vTo.sy;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ptX, ptY, 1.8 * vFrom.scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(167, 251, 95, 0.45)';
        ctx.beginPath();
        ctx.arc(ptX, ptY, 4.5 * vFrom.scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 8. Draw Commercial Hubs with Radar Pulses
    ctx.font = '600 8.5px "JetBrains Mono", monospace';
    for (let h = 0; h < hubs.length; h++) {
      const hub = hubs[h];
      const hubIdx = hub.ring * pointsPerRing + hub.index;
      if (hubIdx < sphereVerts.length) {
        const hv = sphereVerts[hubIdx];
        if (hv.z > 0.0) {
          const depthFade = Math.max(0.2, Math.min(0.85, (hv.z + 0.2) * 0.85));
          const wavePhase = (now / 1500 + h * 0.25) % 1;
          const waveRadius = wavePhase * 15 * hv.scale;
          const waveAlpha = (1 - wavePhase) * 0.55 * depthFade;

          ctx.strokeStyle = `rgba(189, 255, 115, ${waveAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(hv.sx, hv.sy, waveRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(hv.sx, hv.sy, 2.0 * hv.scale, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(189, 255, 115, ${depthFade * 0.9})`;
          ctx.fillText(hub.label, hv.sx + 8, hv.sy - 4);
        }
      }
    }

    ctx.restore(); // Restore clip

    // 9. BLAZING SOLAR RIM CORONA (The iconic Image 2 feature crowning below title)
    const startAng = Math.PI * 1.12;
    const endAng = Math.PI * 1.88;

    // Outer soft lime halo
    ctx.strokeStyle = 'rgba(167, 251, 95, 0.45)';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius * 1.008, startAng, endAng);
    ctx.stroke();

    // Mid neon lime arc
    ctx.strokeStyle = 'rgba(189, 255, 115, 0.85)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius * 1.004, startAng, endAng);
    ctx.stroke();

    // Core radiant white-lime rim
    ctx.strokeStyle = '#f0fff1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius * 1.001, startAng + 0.08, endAng - 0.08);
    ctx.stroke();

    // Apex crown highlight
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius * 1.0, Math.PI * 1.38, Math.PI * 1.62);
    ctx.stroke();

    animId = requestAnimationFrame(draw);
  }

  animId = requestAnimationFrame(draw);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animId) cancelAnimationFrame(animId);
    } else {
      animId = requestAnimationFrame(draw);
    }
  });
}

/* ==============================================================================
   10. GLOBAL SEARCH & KEYBOARD NAVIGATION (⌘K / Ctrl+K & Customer Routing)
   ============================================================================== */
function initGlobalSearch() {
  const container = document.getElementById('dashGlobalSearchContainer');
  const input = document.getElementById('dashGlobalSearchInput');
  const dropdown = document.getElementById('dashSearchDropdown');
  if (!container || !input) return;

  const NAV_TARGETS = [
    { label: 'Dashboard Overview', tab: 'dashboard', desc: 'Command center, KPIs & Trajectory', keywords: ['dash', 'overview', 'home', 'kpi', 'revenue', 'orders'] },
    { label: 'Customer Lookup', tab: 'lookup', desc: 'Direct HBase columnar customer ledger', keywords: ['lookup', 'customer', 'search', 'account', 'profile', 'find', 'tx', 'invoice'] },
    { label: 'RFM Analytics & Calculator', tab: 'rfm', desc: 'Recency, Frequency, Monetary scoring', keywords: ['rfm', 'calc', 'calculator', 'recency', 'frequency', 'monetary'] },
    { label: 'Customer Segmentation', tab: 'segmentation', desc: 'K-Means clustering & behavioral cohorts', keywords: ['segment', 'cohort', 'cluster', 'kmeans', 'champions', 'loyal', 'at-risk'] },
    { label: 'CLV Scenario Simulator', tab: 'clv', desc: 'Gradient Boosting CLV prediction', keywords: ['clv', 'lifetime', 'forecast', 'simulate', 'whatif', 'value', 'spend'] },
    { label: 'Churn Risk ML', tab: 'churn', desc: 'Random Forest churn classifier', keywords: ['churn', 'risk', 'lapse', 'dormancy', 'classifier'] },
    { label: 'Big Data Architecture', tab: 'architecture', desc: 'HDFS, Hive, Spark & HBase pipeline', keywords: ['arch', 'architecture', 'hdfs', 'hive', 'spark', 'hbase', 'pipeline'] },
    { label: 'Data Mining Catalog', tab: 'mining', desc: 'Automated catalog web scraper', keywords: ['mining', 'scrape', 'scraper', 'spider', 'catalog', 'products'] },
    { label: 'Technical FAQ & Docs', tab: 'faq', desc: 'Platform specifications & architecture Q&A', keywords: ['faq', 'docs', 'help', 'specs', 'question'] }
  ];

  function openDropdown(itemsHtml) {
    if (!dropdown) return;
    dropdown.innerHTML = itemsHtml;
    dropdown.style.display = 'block';
  }

  function closeDropdown() {
    if (dropdown) dropdown.style.display = 'none';
  }

  function handleQuery(q) {
    const query = String(q || '').trim();
    if (!query) {
      closeDropdown();
      return;
    }

    const isNumeric = /^[0-9]+$/.test(query);
    if (isNumeric) {
      openDropdown(`
        <div class="dash-search-result-item" data-action="lookup" data-id="${escapeHtml(query)}">
          <div class="dash-search-result-icon">🔍</div>
          <div>
            <div class="dash-search-result-title">Look up Customer #${escapeHtml(query)}</div>
            <div class="dash-search-result-sub">Query verified NoSQL columnar serving store (Press Enter)</div>
          </div>
          <span class="dash-search-result-enter">↵ Enter</span>
        </div>
      `);
      return;
    }

    const lower = query.toLowerCase();
    const matches = NAV_TARGETS.filter(t => 
      t.label.toLowerCase().includes(lower) || 
      t.keywords.some(k => k.includes(lower))
    );

    if (matches.length > 0) {
      const html = matches.slice(0, 5).map(m => `
        <div class="dash-search-result-item" data-action="navigate" data-tab="${escapeHtml(m.tab)}">
          <div class="dash-search-result-icon">⚡</div>
          <div>
            <div class="dash-search-result-title">${escapeHtml(m.label)}</div>
            <div class="dash-search-result-sub">${escapeHtml(m.desc)}</div>
          </div>
          <span class="dash-search-result-enter">Jump →</span>
        </div>
      `).join('');
      openDropdown(html);
    } else {
      openDropdown(`
        <div class="dash-search-result-empty">
          No matching views or profiles for "<strong>${escapeHtml(query)}</strong>". Try customer ID (e.g. 15485) or "rfm", "clv", "churn", "architecture".
        </div>
      `);
    }
  }

  input.addEventListener('input', (e) => handleQuery(e.target.value));

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (!q) return;
      if (/^[0-9]+$/.test(q)) {
        closeDropdown();
        window.switchDashboardTab('lookup');
        const lookupInput = document.getElementById('lookupCustIdInput');
        const lookupBtn = document.getElementById('lookupSearchBtn');
        if (lookupInput) lookupInput.value = q;
        if (lookupBtn) lookupBtn.click();
      } else {
        const lower = q.toLowerCase();
        const match = NAV_TARGETS.find(t => 
          t.label.toLowerCase().includes(lower) || 
          t.keywords.some(k => k.includes(lower))
        );
        if (match) {
          closeDropdown();
          window.switchDashboardTab(match.tab);
        }
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  if (dropdown) {
    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.dash-search-result-item');
      if (!item) return;
      const action = item.dataset.action;
      if (action === 'lookup') {
        const id = item.dataset.id;
        closeDropdown();
        window.switchDashboardTab('lookup');
        const lookupInput = document.getElementById('lookupCustIdInput');
        const lookupBtn = document.getElementById('lookupSearchBtn');
        if (lookupInput) lookupInput.value = id;
        if (lookupBtn) lookupBtn.click();
      } else if (action === 'navigate') {
        const tab = item.dataset.tab;
        closeDropdown();
        window.switchDashboardTab(tab);
      }
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      closeDropdown();
    }
  });

  // Global keyboard shortcut ⌘K / Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}

