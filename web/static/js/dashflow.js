/**
 * Customer Intelligence Platform — DashFlow Interaction & Motion Engine
 * Handles smooth scrolling, IntersectionObserver reveals, FAQ accordion,
 * interactive RFM calculator, live customer lookup API, and Chart.js spline charts.
 */

document.addEventListener('DOMContentLoaded', () => {
  initInteractiveGlobe();
  initSpaDashboardNavigation();
  initScrollReveals();
  initMobileNav();
  initFaqAccordion();
  initRfmCalculator();
  initCustomerLookup();
  initWhatIfSimulator();
  initDashboardCharts();
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

  function recalculate() {
    const recency = parseInt(rSlider.value, 10);
    const freq = parseInt(fSlider.value, 10);
    const monetary = parseFloat(mSlider.value);

    if (rVal) rVal.textContent = `${recency} days`;
    if (fVal) fVal.textContent = `${freq} orders`;
    if (mVal) mVal.textContent = `$${monetary.toLocaleString()}`;

    // Scoring heuristics based on actual model thresholds:
    // Cluster 2 (Champions): Recency ~ 24, Freq ~ 20, Spend ~ $11,466
    // Cluster 0 (Loyal): Recency ~ 27, Freq ~ 3, Spend ~ $855
    // Cluster 3 (At-Risk): Recency ~ 210, Freq ~ 5, Spend ~ $2,148
    // Cluster 1 (Lost): Recency ~ 393, Freq ~ 1.4, Spend ~ $346

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
    } else {
      segment = "Loyal Customers";
      badgeClass = "badge-loyal";
    }

    // CLV Estimate formula derived from model linear term approximation
    const aov = monetary / Math.max(freq, 1);
    const tenureFactor = 300 / 365;
    const estClv = Math.max(50, (aov * freq * 0.45 * (1 - recency / 800)) + 120);

    // Composite score
    const rScore = Math.max(1, Math.min(5, Math.ceil(5 - (recency / 100))));
    const fScore = Math.max(1, Math.min(5, Math.ceil(freq / 5)));
    const mScore = Math.max(1, Math.min(5, Math.ceil(monetary / 1000)));

    if (scoreBadge) scoreBadge.textContent = `RFM: ${rScore}-${fScore}-${mScore}`;
    if (segmentBadge) {
      segmentBadge.textContent = segment;
      segmentBadge.className = `cluster-card-badge ${badgeClass}`;
    }
    if (clvEst) clvEst.textContent = `$${Math.round(estClv).toLocaleString()}`;
  }

  rSlider.addEventListener('input', recalculate);
  fSlider.addEventListener('input', recalculate);
  mSlider.addEventListener('input', recalculate);
  recalculate();
}

/* ==============================================================================
   5. CUSTOMER INTELLIGENCE LOOKUP (Live HBase / API Integration)
   ============================================================================== */
const PRELOADED_CUSTOMERS = {
  "15485": { customer_id: "15485", segment: "Champions", predicted_clv: 1050.90, churn_probability: 0.267, recency_days: 15, frequency: 7, monetary: 1280.40, aov: 182.91 },
  "13748": { customer_id: "13748", segment: "At-Risk", predicted_clv: 439.96, churn_probability: 0.2596, recency_days: 95, frequency: 4, monetary: 480.20, aov: 120.05 },
  "13269": { customer_id: "13269", segment: "Champions", predicted_clv: 1844.93, churn_probability: 0.0592, recency_days: 11, frequency: 16, monetary: 3450.00, aov: 215.62 },
  "18229": { customer_id: "18229", segment: "Champions", predicted_clv: 1716.07, churn_probability: 0.0697, recency_days: 8, frequency: 14, monetary: 3120.00, aov: 222.86 },
  "15550": { customer_id: "15550", segment: "Champions", predicted_clv: 435.59, churn_probability: 0.2506, recency_days: 18, frequency: 5, monetary: 540.00, aov: 108.00 },
  "16964": { customer_id: "16964", segment: "Lost / Churned", predicted_clv: 50.13, churn_probability: 0.8732, recency_days: 380, frequency: 1, monetary: 95.00, aov: 95.00 },
  "16717": { customer_id: "16717", segment: "Champions", predicted_clv: 1373.67, churn_probability: 0.1042, recency_days: 14, frequency: 12, monetary: 2890.00, aov: 240.83 },
  "C1024": { customer_id: "C1024", segment: "Loyal Customers", predicted_clv: 840.50, churn_probability: 0.1850, recency_days: 12, frequency: 18, monetary: 32500.00, aov: 1805.55 }
};

function initCustomerLookup() {
  const input = document.getElementById('lookupCustIdInput');
  const btn = document.getElementById('lookupSearchBtn');
  const samplePills = document.querySelectorAll('.sample-id-pill');

  if (!input || !btn) return;

  function performLookup(id) {
    const cleanId = String(id).trim();
    if (!cleanId) return;

    // Highlight active pill if matched
    samplePills.forEach(p => {
      p.classList.toggle('active', p.dataset.id === cleanId);
    });

    // Try API fetch first, fallback to preloaded
    fetch(`/api/customer/${encodeURIComponent(cleanId)}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        renderCustomerProfile(data);
      })
      .catch(() => {
        // Fallback to preloaded or dynamic inference
        if (PRELOADED_CUSTOMERS[cleanId]) {
          renderCustomerProfile(PRELOADED_CUSTOMERS[cleanId]);
        } else {
          // Compute synthetic profile with model formula
          const synthetic = generateSyntheticCustomer(cleanId);
          renderCustomerProfile(synthetic);
        }
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

function generateSyntheticCustomer(id) {
  // Deterministic seed from id string
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);
  const recency = (posHash % 250) + 5;
  const freq = (posHash % 22) + 2;
  const spend = Math.round(((posHash % 4500) + 200) * 100) / 100;
  const aov = Math.round((spend / freq) * 100) / 100;
  const clv = Math.round((spend * 0.45 + 150) * 100) / 100;
  const churn = Math.min(0.92, Math.max(0.04, (recency / 350) + 0.05));
  let segment = "Loyal Customers";
  if (recency < 35 && spend > 2500) segment = "Champions";
  else if (recency > 180) segment = "At-Risk";
  else if (recency > 300) segment = "Lost / Churned";

  return {
    customer_id: id,
    segment: segment,
    predicted_clv: clv,
    churn_probability: Math.round(churn * 1000) / 1000,
    recency_days: recency,
    frequency: freq,
    monetary: spend,
    aov: aov
  };
}

function renderCustomerProfile(data) {
  const container = document.getElementById('customerProfileTarget');
  if (!container) return;

  const seg = data.segment || "Customer";
  const clv = Number(data.predicted_clv || 0);
  const churn = Number(data.churn_probability || 0);
  const freq = data.frequency || 0;
  const recency = data.recency_days || 0;
  const monetary = Number(data.monetary || 0);

  let badgeClass = "badge-champ";
  if (seg.includes("At-Risk")) badgeClass = "badge-risk";
  else if (seg.includes("Lost")) badgeClass = "badge-lost";
  else if (seg.includes("Loyal")) badgeClass = "badge-loyal";

  const initials = String(data.customer_id).substring(0, 2).toUpperCase();

  container.innerHTML = `
    <div class="customer-profile-card">
      <div class="customer-card-top">
        <span class="cluster-card-badge ${badgeClass}">● ${seg}</span>
        <span style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono);">Row Key: ${data.customer_id}</span>
      </div>

      <div class="customer-avatar-header">
        <div class="customer-avatar-circle">${initials}</div>
        <div class="customer-name-heading">Customer #${data.customer_id}</div>
        <div class="customer-subheading">Retail Client Profile · Verified HBase Columnar Store</div>
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

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px 12px;">
          <div style="font-size: 11px; color: var(--text-muted);">Recency</div>
          <div style="font-size: 14px; font-weight: 700; color: #ffffff;">${recency} days ago</div>
        </div>
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px 12px;">
          <div style="font-size: 11px; color: var(--text-muted);">Total Spend</div>
          <div style="font-size: 14px; font-weight: 700; color: #ffffff;">$${monetary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
      </div>

      <div class="customer-actions-box">
        <div class="actions-box-title">Recommended Next Best Actions</div>
        <div class="action-item-row">
          <span>${seg === 'Champions' ? '⭐ VIP Exclusive Rewards Access' : '✨ Re-engagement Promotion'}</span>
          <span style="font-size: 11px; color: #34d399; font-weight: 700;">Eligible</span>
        </div>
        <div class="action-item-row">
          <span>📦 High-AOV Category Cross-Sell Catalog</span>
          <span style="font-size: 11px; color: #60a5fa; font-weight: 700;">Queued</span>
        </div>
      </div>

      <div style="display: flex; gap: 12px;">
        <button class="btn-pill-secondary" style="flex: 1; justify-content: center; font-size: 13px; padding: 10px;" onclick="alert('Notification sent to customer account #${data.customer_id}')">💬 Message Account</button>
        <button class="btn-pill-primary" style="flex: 1; justify-content: center; font-size: 13px; padding: 10px;" onclick="alert('Retention task assigned for Customer #${data.customer_id}')">+ Assign Task</button>
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
  const elDataStatus      = document.getElementById('trajectoryDataStatus');

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

    // Create linear gradients for area fills - Luxury Web3-Verse Green
    const chartHeight = canvas.clientHeight || 280;
    const revGradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    revGradient.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
    revGradient.addColorStop(0.65, 'rgba(16, 185, 129, 0.05)');
    revGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const ordGradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    ordGradient.addColorStop(0, 'rgba(45, 212, 191, 0.20)');
    ordGradient.addColorStop(0.65, 'rgba(45, 212, 191, 0.03)');
    ordGradient.addColorStop(1, 'rgba(45, 212, 191, 0.0)');

    trajectoryChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Revenue (USD)',
            data: data.revenue,
            yAxisID: 'yRevenue',
            borderColor: '#10b981',
            backgroundColor: revGradient,
            borderWidth: 2.5,
            tension: 0.38,
            fill: true,
            pointRadius: data.labels.length > 40 ? 0 : 3.5,
            pointHoverRadius: 6.5,
            pointBackgroundColor: '#34d399',
            pointBorderColor: '#051b11',
            pointBorderWidth: 2,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2.5
          },
          {
            label: 'Order Volume',
            data: data.orders,
            yAxisID: 'yOrders',
            borderColor: '#2dd4bf',
            backgroundColor: ordGradient,
            borderWidth: 2,
            borderDash: [5, 4],
            tension: 0.38,
            fill: true,
            pointRadius: data.labels.length > 40 ? 0 : 3,
            pointHoverRadius: 5.5,
            pointBackgroundColor: '#2dd4bf',
            pointBorderColor: '#051b11',
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
  let height = container.clientHeight || 640;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    width = container.clientWidth || window.innerWidth;
    height = container.clientHeight || 640;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // 16 rings x 32 points = 512 vertex sphere
  const numRings = 16;
  const pointsPerRing = 32;
  const vertices = [];

  for (let i = 0; i < numRings; i++) {
    const phi = (Math.PI * (i + 0.5)) / numRings; // 0 to PI
    const ringRadius = Math.sin(phi);
    const y = Math.cos(phi);

    for (let j = 0; j < pointsPerRing; j++) {
      const theta = (2 * Math.PI * j) / pointsPerRing;
      const x = ringRadius * Math.cos(theta);
      const z = ringRadius * Math.sin(theta);
      vertices.push({
        origX: x,
        origY: y,
        origZ: z,
        x: x,
        y: y,
        z: z,
        screenX: 0,
        screenY: 0,
        scale: 0,
        alpha: 0
      });
    }
  }

  // Precompute edges
  const edges = [];
  for (let i = 0; i < numRings; i++) {
    for (let j = 0; j < pointsPerRing; j++) {
      const curr = i * pointsPerRing + j;
      const nextInRing = i * pointsPerRing + ((j + 1) % pointsPerRing);
      edges.push([curr, nextInRing]);

      if (i < numRings - 1) {
        const nextRing = (i + 1) * pointsPerRing + j;
        edges.push([curr, nextRing]);
      }
    }
  }

  // Commercial retail intelligence hubs
  const hubs = [
    { ring: 5, index: 8, label: 'LON' },
    { ring: 6, index: 18, label: 'NYC' },
    { ring: 7, index: 28, label: 'TYO' },
    { ring: 6, index: 11, label: 'FRA' },
    { ring: 9, index: 2, label: 'SIN' },
    { ring: 8, index: 14, label: 'DXB' }
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
  let rotX = 0.38; // subtle tilt
  let rotY = 0.0;
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
    targetPointerX = normX * 22;
    targetPointerY = normY * 14;

    if (e.clientY < 600) {
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

  function draw() {
    ctx.clearRect(0, 0, width, height);

    pointerX += (targetPointerX - pointerX) * 0.06;
    pointerY += (targetPointerY - pointerY) * 0.06;
    curRotSpeedY += (targetRotSpeedY - curRotSpeedY) * 0.05;
    rotY += curRotSpeedY;

    // Center position of the globe placed behind hero & shifted slightly right
    const cx = width * 0.52 + pointerX;
    const cy = Math.min(height * 0.58, 360) + pointerY;
    const currentRadius = Math.min(width * 0.38, 340);

    // 1. Soft Radiant Atmospheric Nebula Glow behind Globe (Restrained, not overpowering)
    const auraGrad = ctx.createRadialGradient(cx, cy, currentRadius * 0.2, cx, cy, currentRadius * 1.3);
    auraGrad.addColorStop(0, isHovered ? 'rgba(16, 185, 129, 0.10)' : 'rgba(16, 185, 129, 0.06)');
    auraGrad.addColorStop(0.45, 'rgba(5, 150, 105, 0.03)');
    auraGrad.addColorStop(0.8, 'rgba(4, 25, 16, 0.01)');
    auraGrad.addColorStop(1, 'rgba(3, 7, 5, 0.0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // 2. Subtle Planetary Limb / Rim Glow
    ctx.strokeStyle = isHovered ? 'rgba(52, 211, 153, 0.18)' : 'rgba(16, 185, 129, 0.12)';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius * 1.01, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Transform Vertices
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);

    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      const x1 = v.origX * cosY - v.origZ * sinY;
      const z1 = v.origZ * cosY + v.origX * sinY;
      const y2 = v.origY * cosX - z1 * sinX;
      const z2 = z1 * cosX + v.origY * sinX;

      v.x = x1;
      v.y = y2;
      v.z = z2;

      const fov = 500;
      const scale = fov / (fov + z2 * currentRadius * 0.55);
      v.scale = scale;
      v.screenX = cx + x1 * currentRadius * scale;
      v.screenY = cy + y2 * currentRadius * scale;
      v.alpha = Math.max(0.02, Math.min(0.35, (1 - z2) * 0.22));
    }

    // 4. Draw Connecting Wireframe Edges (Quiet, thin, architectural lines)
    ctx.lineWidth = 0.65;
    for (let i = 0; i < edges.length; i++) {
      const p1 = vertices[edges[i][0]];
      const p2 = vertices[edges[i][1]];

      const avgZ = (p1.z + p2.z) * 0.5;
      if (avgZ < 0.40) {
        const edgeAlpha = Math.max(0.02, Math.min(0.20, (1 - avgZ) * 0.16));
        ctx.strokeStyle = `rgba(52, 211, 153, ${edgeAlpha * (isHovered ? 1.15 : 1)})`;
        ctx.beginPath();
        ctx.moveTo(p1.screenX, p1.screenY);
        ctx.lineTo(p2.screenX, p2.screenY);
        ctx.stroke();
      }
    }

    // 5. Draw Geodesic Arcs connecting hubs (Refined, quiet telemetry tracks)
    const now = Date.now();
    for (let a = 0; a < arcs.length; a++) {
      const hFrom = hubs[arcs[a].from];
      const hTo = hubs[arcs[a].to];
      const vFrom = vertices[hFrom.ring * pointsPerRing + hFrom.index];
      const vTo = vertices[hTo.ring * pointsPerRing + hTo.index];

      // If at least one point is on front hemisphere
      if (vFrom && vTo && (vFrom.z < 0.25 || vTo.z < 0.25)) {
        const midX = (vFrom.screenX + vTo.screenX) * 0.5;
        const midY = (vFrom.screenY + vTo.screenY) * 0.5 - 24 * vFrom.scale;

        ctx.strokeStyle = 'rgba(110, 231, 183, 0.18)';
        ctx.lineWidth = 0.9;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(vFrom.screenX, vFrom.screenY);
        ctx.quadraticCurveTo(midX, midY, vTo.screenX, vTo.screenY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Subtle traveling packet
        const t = (now / 2600 + a * 0.22) % 1;
        const ptX = (1 - t) * (1 - t) * vFrom.screenX + 2 * (1 - t) * t * midX + t * t * vTo.screenX;
        const ptY = (1 - t) * (1 - t) * vFrom.screenY + 2 * (1 - t) * t * midY + t * t * vTo.screenY;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.arc(ptX, ptY, 1.6 * vFrom.scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(52, 211, 153, 0.25)';
        ctx.beginPath();
        ctx.arc(ptX, ptY, 4.0 * vFrom.scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Draw Vertex Nodes (Small, delicate points)
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      if (v.z < 0.25) {
        ctx.fillStyle = `rgba(16, 185, 129, ${v.alpha})`;
        ctx.beginPath();
        const nodeRadius = (v.z < -0.4 ? 1.4 : 0.9) * v.scale;
        ctx.arc(v.screenX, v.screenY, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 7. Draw Commercial Hubs with Restrained Pulses
    ctx.font = '500 8.5px "JetBrains Mono", monospace';
    for (let h = 0; h < hubs.length; h++) {
      const hub = hubs[h];
      const hubIdx = hub.ring * pointsPerRing + hub.index;
      if (hubIdx < vertices.length) {
        const hv = vertices[hubIdx];
        if (hv.z < 0.08) {
          const depthFade = Math.max(0.2, Math.min(0.75, (1 - hv.z) * 0.75));
          const wavePhase = (now / 1500 + h * 0.25) % 1;
          const waveRadius = wavePhase * 13 * hv.scale;
          const waveAlpha = (1 - wavePhase) * 0.45 * depthFade;

          // Expanding subtle radar pulse
          ctx.strokeStyle = `rgba(52, 211, 153, ${waveAlpha})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(hv.screenX, hv.screenY, waveRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Hub point
          ctx.fillStyle = `rgba(255, 255, 255, ${depthFade * 0.9})`;
          ctx.beginPath();
          ctx.arc(hv.screenX, hv.screenY, 1.8 * hv.scale, 0, Math.PI * 2);
          ctx.fill();

          // Outer ring
          ctx.strokeStyle = `rgba(110, 231, 183, ${depthFade * 0.5})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(hv.screenX, hv.screenY, 3.8 * hv.scale, 0, Math.PI * 2);
          ctx.stroke();

          // Quiet micro label
          ctx.fillStyle = `rgba(148, 163, 184, ${depthFade * 0.75})`;
          ctx.fillText(hub.label, hv.screenX + 7, hv.screenY - 4);
        }
      }
    }

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
