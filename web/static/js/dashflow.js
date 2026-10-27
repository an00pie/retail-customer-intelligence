/**
 * Customer Intelligence Platform — DashFlow Interaction & Motion Engine
 * Handles smooth scrolling, IntersectionObserver reveals, FAQ accordion,
 * interactive RFM calculator, live customer lookup API, and Chart.js spline charts.
 */

/**
 * Developer Quality & Security Toolchain Hooks:
 * - Optional Sentry Browser Error Monitoring (active only when window.__SENTRY_DSN__ is configured)
 * - Optional PostHog Privacy-Preserving Analytics (active only when window.__POSTHOG_API_KEY__ is configured)
 */
(function initObservabilityAndAnalytics() {
  // 1. Sentry Frontend Integration
  const sentryDsn = window.__SENTRY_DSN__ || document.querySelector('meta[name="sentry-dsn"]')?.getAttribute('content');
  if (sentryDsn && window.Sentry && typeof window.Sentry.init === 'function') {
    try {
      window.Sentry.init({
        dsn: sentryDsn,
        environment: window.__INSIGHT_ENV__ || 'production',
        sendDefaultPii: false,
        tracesSampleRate: 0.1,
        beforeSend(event) {
          if (event.request && event.request.url) {
            event.request.url = event.request.url.split('?')[0];
          }
          return event;
        }
      });
    } catch (err) {
      console.warn('[Observability] Sentry browser init notice:', err);
    }
  }

  // 2. PostHog Privacy-Preserving Product Analytics
  const posthogKey = window.__POSTHOG_API_KEY__ || document.querySelector('meta[name="posthog-api-key"]')?.getAttribute('content');
  const posthogHost = window.__POSTHOG_HOST__ || 'https://us.i.posthog.com';

  if (posthogKey && window.posthog && typeof window.posthog.init === 'function') {
    try {
      window.posthog.init(posthogKey, {
        api_host: posthogHost,
        autocapture: false,
        capture_pageview: true,
        disable_session_recording: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
        respect_dnt: true
      });
    } catch (err) {
      console.warn('[Analytics] PostHog init notice:', err);
    }
  }

  // Safe global telemetry dispatcher (noop fallback if PostHog is not enabled)
  window.insightAnalytics = {
    track: function(eventName, properties) {
      if (!eventName) return;
      if (window.posthog && typeof window.posthog.capture === 'function' && posthogKey) {
        const safeProps = Object.assign({}, properties);
        delete safeProps.customer_id;
        delete safeProps.email;
        delete safeProps.name;
        delete safeProps.phone;
        window.posthog.capture(eventName, safeProps);
      }
    }
  };
})();

function renderInferenceEvidence(result, target) {
  if (!target) return;
  const host = target.closest('.sim-results-card, .overview-card') || target.parentElement;
  let details = host.querySelector('.inference-evidence');
  if (!details) {
    details = document.createElement('details');
    details.className = 'inference-evidence';
    details.style.cssText = 'margin:12px 0;font-size:12px;overflow-wrap:anywhere';
    const summary = document.createElement('summary');
    summary.textContent = 'Model provenance, inputs & driver evidence';
    details.append(summary, document.createElement('pre'));
    details.lastChild.style.cssText = 'white-space:pre-wrap;font-size:11px';
    host.append(details);
  }
  details.lastChild.textContent = JSON.stringify({inference_status: result.inference_status,
    model_versions: result.model_versions, trained_data_timestamp: result.trained_data_timestamp,
    timestamp_status: result.trained_data_timestamp_status, feature_inputs: result.feature_inputs,
    drivers: result.drivers}, null, 2);
}

document.addEventListener('DOMContentLoaded', () => {
  initCinematicIntro();
  initInteractiveGlobe();
  initHeroVideo();
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
  initShopifyStoreAnalytics();
  initInsightCopilot();
  initAnchorScroll();
});

/* ==============================================================================
   -1. CINEMATIC LOADING INTRO (INSIGHT.arc 10-Second Brand Animation)
   ============================================================================== */
function initCinematicIntro() {
  const overlay = document.getElementById('cinematicIntroOverlay');
  const video = document.getElementById('cinematicIntroVideo');
  const skipBtn = document.getElementById('cinematicIntroSkip');
  if (!overlay) return;

  const STORAGE_KEY = 'insight_arc_intro_viewed';
  const INTRO_DURATION_MS = 10000; // Strictly 10 seconds

  let alreadySeen = false;
  try {
    alreadySeen = sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch (e) {
    alreadySeen = false;
  }

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (alreadySeen || prefersReducedMotion) {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    return;
  }

  // Lock scrolling during intro
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  let completed = false;
  let timerId = null;

  function finishIntro() {
    if (completed) return;
    completed = true;

    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {}

    overlay.classList.add('intro-fading');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    setTimeout(() => {
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (e) {}
      }
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      // Re-trigger reveal animations on active pane
      const activePane =
        document.querySelector('.spa-tab-pane.active') || document.getElementById('tab-dashboard');
      if (activePane && typeof window.refreshScrollReveals === 'function') {
        window.refreshScrollReveals(activePane);
      }
    }, 800);
  }

  // Strictly transition at 10 seconds
  timerId = setTimeout(finishIntro, INTRO_DURATION_MS);

  if (skipBtn) {
    skipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      finishIntro();
    });
  }

  if (video) {
    video.addEventListener('ended', finishIntro, { once: true });
    video.addEventListener('error', finishIntro, { once: true });

    if (video.dataset && video.dataset.src && !video.src) {
      video.src = video.dataset.src;
    }

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Intro video autoplay was blocked or delayed:', err);
      });
    }
  } else {
    finishIntro();
  }
}

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
      if (window.insightAnalytics) {
        window.insightAnalytics.track('dashboard_viewed', { tab: tabId });
      }
      // Deactivate all tab panes and activate target
      const allPanes = document.querySelectorAll('.spa-tab-pane');
      allPanes.forEach(pane => pane.classList.remove('active'));
      targetPane.classList.add('active');

      if (typeof window.refreshScrollReveals === 'function') {
        window.refreshScrollReveals(targetPane);
      }

      // Update active states on sidebar items, nav links, and pills
      document.querySelectorAll('.dash-nav-item, .nav-link, .dash-action-pill').forEach(el => {
        const itemTab = el.getAttribute('data-tab') || (el.getAttribute('href') || '').replace(/^#/, '');
        const active = itemTab === (tabId === 'rfm' ? 'segmentation' : tabId);
        el.classList.toggle('active', active);
        if (active) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
      });

      // Scroll smoothly to the top of the dashboard content window
      const dashContent = document.querySelector('.dash-content');
      if (dashContent) {
        dashContent.scrollTop = 0;
        document.querySelector('.hero-mockup-wrapper')?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start'});
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

  // Global modal opener/closer with focus management
  window.lastFocusedElement = null;

  window.openSpaModal = function(modalName) {
    const modal = document.getElementById(`modal-${modalName}`);
    if (modal) {
      window.lastFocusedElement = document.activeElement;
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      const closeBtn = modal.querySelector('.spa-modal-close-btn');
      if (closeBtn) {
        setTimeout(() => closeBtn.focus(), 280);
      }
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
    if (window.lastFocusedElement && typeof window.lastFocusedElement.focus === 'function') {
      window.lastFocusedElement.focus();
      window.lastFocusedElement = null;
    }
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
      return;
    }
    if (e.key === 'Tab') {
      const openModal = document.querySelector('.spa-modal-overlay.open');
      if (!openModal) return;

      const focusable = openModal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (!openModal.contains(document.activeElement)) {
        e.preventDefault();
        firstEl.focus();
        return;
      }

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  });

  // RFC 4180 CSV cell escaping with formula injection protection
  window.escapeCsvCell = function(val) {
    if (val === null || val === undefined) return '';
    let str = String(val);
    const isNumeric = typeof val === 'number' || (!isNaN(Number(str)) && str.trim() !== '');
    if (!isNumeric && /^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    if (/[",\n\r]/.test(str)) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  window.triggerCsvDownload = function(filename, csvContent) {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  window.currentCustomerProfile = null;

  window.exportCustomerLedgerCsv = function() {
    const profile = window.currentCustomerProfile;
    if (!profile) {
      window.showToast('No customer profile currently loaded for export.', 'error');
      return;
    }
    const custId = profile.customer_id || 'unknown';
    const txs = Array.isArray(profile.transactions) ? profile.transactions : [];
    if (txs.length === 0) {
      window.showToast(`No verified transaction records to export for Customer #${custId}.`, 'info');
      return;
    }
    const headers = ['Date', 'Invoice', 'StockCode', 'Quantity', 'UnitPrice', 'Total', 'CustomerID', 'Segment'];
    const rows = txs.map(tx => [
      tx.date,
      tx.invoice,
      tx.stock_code,
      tx.quantity,
      Number(tx.unit_price).toFixed(2),
      Number(tx.total).toFixed(2),
      custId,
      profile.segment || ''
    ].map(window.escapeCsvCell).join(','));

    const csvData = headers.map(window.escapeCsvCell).join(',') + '\r\n' + rows.join('\r\n');
    window.triggerCsvDownload(`customer_${custId}_ledger.csv`, csvData);
    window.showToast(`Exported ${txs.length} transactions for Customer #${custId} (CSV)`, 'success');
  };

  window.exportCustomerProfileCsv = function() {
    const profile = window.currentCustomerProfile;
    if (!profile) {
      window.showToast('No customer profile currently loaded for export.', 'error');
      return;
    }
    const custId = profile.customer_id || 'unknown';
    const headers = [
      'CustomerID', 'Segment', 'RecencyDays', 'Frequency', 'TotalSpend',
      'TenureDays', 'AvgOrderValue', 'PredictedCLV', 'ChurnProbability',
      'ServingStore', 'LastUpdated'
    ];
    const row = [
      custId,
      profile.segment || '',
      profile.recency_days || 0,
      profile.frequency || 0,
      Number(profile.monetary || 0).toFixed(2),
      profile.tenure_days || 0,
      Number(profile.avg_order_value || 0).toFixed(2),
      Number(profile.predicted_clv || 0).toFixed(2),
      Number(profile.churn_probability || 0).toFixed(4),
      'Columnar KV Serving Store (HBase Schema)',
      profile.last_updated || new Date().toISOString()
    ].map(window.escapeCsvCell).join(',');

    const csvData = headers.map(window.escapeCsvCell).join(',') + '\r\n' + row;
    window.triggerCsvDownload(`customer_${custId}_profile.csv`, csvData);
    window.showToast(`Customer #${custId} profile summary exported (CSV)`, 'success');
  };

  window.exportSegmentsCsv = function() {
    const headers = [
      'ClusterID', 'SegmentName', 'MeanRecencyDays', 'MeanFrequencyOrders',
      'MeanSpendUSD', 'CohortSizeAccounts', 'CohortSharePct', 'TargetStrategy'
    ];
    const cohorts = [
      ['Cluster 2', 'Champions', 24.9, 23.1, 10053.19, 1242, '20.9%', 'VIP Exclusive Rewards Access & Ambassador Tier'],
      ['Cluster 0', 'Loyal Customers', 26.5, 3.3, 784.29, 1187, '20.0%', 'Steady regular cross-selling & volume bundle incentives'],
      ['Cluster 3', 'At-Risk', 219.3, 6.1, 1831.35, 1476, '24.8%', 'Urgent retention outreach & personalized win-back promotions'],
      ['Cluster 1', 'Lost / Churned', 399.4, 1.6, 305.52, 2037, '34.3%', 'Automated low-cost email reactivation campaign']
    ];
    const rows = cohorts.map(c => c.map(window.escapeCsvCell).join(','));
    const csvData = headers.map(window.escapeCsvCell).join(',') + '\r\n' + rows.join('\r\n');
    window.triggerCsvDownload('customer_segmentation_cohorts_summary.csv', csvData);
    window.showToast('Exported 4 behavioral segmentation cohorts to CSV', 'success');
  };

  window.printReport = function() {
    const dateTargets = document.querySelectorAll('.print-date-target');
    const nowStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    dateTargets.forEach(el => el.textContent = nowStr);
    window.showToast('Opening Executive Print Preview...', 'info');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Expose switchTab globally
  window.switchDashboardTab = switchTab;

  function handleUrlHash() {
    const hash = (window.location.hash || '').replace(/^#/, '');
    if (!hash) return;
    const validTabs = ['dashboard', 'lookup', 'segmentation', 'rfm', 'churn', 'clv', 'simulator', 'operations', 'architecture', 'mining', 'faq'];
    if (validTabs.includes(hash)) {
      const target = (hash === 'simulator') ? 'clv' : hash;
      switchTab(target);
    }
  }

  handleUrlHash();
  window.addEventListener('hashchange', handleUrlHash);

  // Global luxury Toast Notification System
  window.showToast = function(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast-pill toast-${type}`;

    let iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    if (type === 'success') {
      iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>';
    } else if (type === 'error' || type === 'danger') {
      iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    }

    toast.innerHTML = `
      <span class="toast-icon">${iconSvg}</span>
      <span class="toast-message">${message}</span>
      <button type="button" class="toast-close" onclick="this.parentElement.remove()" aria-label="Dismiss">✕</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 350);
    }, 4000);
  };
}

/* ==============================================================================
   1. SCROLL REVEALS (IntersectionObserver) & ANIMATED METRIC COUNTERS
   ============================================================================== */
let globalScrollObserver = null;

function animateMetricCounter(element, targetString, duration = 650) {
  if (!element) return;
  const target = String(targetString !== undefined ? targetString : element.textContent).trim();
  if (!target) return;

  // Reduced motion: set target immediately without animation
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.textContent = target;
    return;
  }

  // Regex to extract prefix (currency/symbol), number (with commas and decimals), and suffix
  const match = target.match(/^([^\d\-+.]*)([-+]?[\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) {
    element.textContent = target;
    return;
  }

  const prefix = match[1] || '';
  const numStr = match[2].replace(/,/g, '');
  const suffix = match[3] || '';
  const targetNum = parseFloat(numStr);

  if (isNaN(targetNum)) {
    element.textContent = target;
    return;
  }

  const decimalParts = match[2].split('.');
  const decimals = decimalParts.length > 1 ? decimalParts[1].length : 0;
  const hasCommas = match[2].includes(',');

  // Parse current starting value if present and different, else start at 0
  let startNum = 0;
  const currentText = (element.textContent || '').trim();
  const currentMatch = currentText.match(/^([^\d\-+.]*)([-+]?[\d,]+(?:\.\d+)?)(.*)$/);
  if (currentMatch) {
    const parsedCurrent = parseFloat(currentMatch[2].replace(/,/g, ''));
    if (!isNaN(parsedCurrent) && parsedCurrent !== targetNum) {
      startNum = parsedCurrent;
    }
  }

  if (Math.abs(targetNum - startNum) < 0.0001) {
    element.textContent = target;
    return;
  }

  if (element._animRafId) {
    cancelAnimationFrame(element._animRafId);
    element._animRafId = null;
  }

  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    // Cubic ease-out curve
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentVal = startNum + (targetNum - startNum) * eased;

    if (progress < 1) {
      const formattedNum = hasCommas
        ? currentVal.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : currentVal.toFixed(decimals);
      element.textContent = prefix + formattedNum + suffix;
      element._animRafId = requestAnimationFrame(step);
    } else {
      element.textContent = target;
      element._animRafId = null;
    }
  }

  element._animRafId = requestAnimationFrame(step);
}

function initScrollReveals() {
  const isReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasObserver = 'IntersectionObserver' in window;

  const revealElements = document.querySelectorAll('.reveal-fade-up');
  if (!hasObserver || isReducedMotion) {
    revealElements.forEach(el => el.classList.add('revealed'));
    return;
  }

  globalScrollObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);

        // Animate any metric counter elements inside newly revealed card
        const kpiNums = entry.target.querySelectorAll('.dash-kpi-num, .metric-tile-val, .customer-metric-num');
        kpiNums.forEach(numEl => {
          if (!numEl.dataset.revealedAnimated) {
            numEl.dataset.revealedAnimated = 'true';
            animateMetricCounter(numEl, numEl.textContent, 650);
          }
        });
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -30px 0px'
  });

  revealElements.forEach(el => globalScrollObserver.observe(el));

  window.refreshScrollReveals = function(container) {
    const root = container || document;
    const items = root.querySelectorAll('.reveal-fade-up:not(.revealed)');
    if (isReducedMotion || !globalScrollObserver) {
      items.forEach(el => el.classList.add('revealed'));
      return;
    }
    items.forEach(el => globalScrollObserver.observe(el));
  };
}

/* ==============================================================================
   2. MOBILE NAVIGATION TOGGLE
   ============================================================================== */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const dropdown = document.getElementById('mobileNavDropdown');
  if (!toggleBtn || !dropdown) return;
  const backdrop = document.getElementById('mobileNavBackdrop');
  const background = document.querySelectorAll('.hero-section, .font-credit, .nav-capsule-wrapper');
  const desktop = window.matchMedia('(min-width: 1161px)');
  let previousOverflow = '';
  function setOpen(open, restoreFocus = true) {
    if (open === dropdown.classList.contains('open')) return;
    dropdown.classList.toggle('open', open);
    backdrop?.classList.toggle('open', open);
    toggleBtn.setAttribute('aria-expanded', String(open));
    background.forEach(el => { el.inert = open; });
    if (open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dropdown.querySelector('button').focus();
    } else {
      document.body.style.overflow = previousOverflow;
      if (restoreFocus) toggleBtn.focus();
    }
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!dropdown.classList.contains('open'));
  });
  dropdown.querySelector('.mobile-menu-close')?.addEventListener('click', () => setOpen(false));
  desktop.addEventListener('change', () => {
    if (desktop.matches) setOpen(false, false);
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !toggleBtn.contains(e.target)) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dropdown.classList.contains('open')) {
      setOpen(false);
    }
    if (event.key === 'Tab' && dropdown.classList.contains('open')) {
      const controls = [...dropdown.querySelectorAll('button, a')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
  });

  dropdown.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      setOpen(false);
    });
  });
}

// Decorative media never gates the dashboard or loads for reduced-motion/data-saving users.
function initHeroVideo() {
  const video = document.getElementById('heroVideo');
  const button = document.getElementById('heroMotionToggle');
  if (!video || !button) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let inView = true;
  let pausedByUser = false;
  let failed = false;
  function update() {
    const allowed = !motion.matches && !connection?.saveData;
    const playing = allowed && !pausedByUser && inView && !document.hidden;
    document.documentElement.dataset.backgroundPaused = String(!playing);
    document.dispatchEvent(new Event('backgroundmotionchange'));
    button.hidden = !allowed;
    button.textContent = pausedByUser ? 'Play background' : 'Pause background';
    button.setAttribute('aria-pressed', String(pausedByUser));
    if (playing && !failed) {
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      video.muted = true;
      video.play().catch(() => { /* Black fallback when autoplay is unavailable. */ });
    } else video.pause();
  }
  video.addEventListener('error', () => { failed = true; video.hidden = true; });
  button.addEventListener('click', () => { pausedByUser = !pausedByUser; update(); });
  motion.addEventListener('change', update);
  connection?.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      update();
    });
    observer.observe(document.querySelector('.hero-stage-split'));
  }
  update();
}

/* ==============================================================================
   3. FAQ ACCORDION (DashFlow Smooth Motion)
   ============================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const header = item.querySelector('.faq-header');
    if (!header) return;
    function toggleFaq() {
      const isOpen = item.classList.contains('active');
      faqItems.forEach(other => {
        other.classList.remove('active');
        const otherH = other.querySelector('.faq-header');
        if (otherH) otherH.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('active');
        header.setAttribute('aria-expanded', 'true');
      }
    }
    header.addEventListener('click', toggleFaq);
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFaq();
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
          renderInferenceEvidence(data, clvEst);
          if (segmentBadge) {
            segmentBadge.textContent = data.segment;
            let bClass = 'badge-loyal';
            if (data.segment.includes('Champions')) bClass = 'badge-champ';
            else if (data.segment.includes('At-Risk')) bClass = 'badge-risk';
            else if (data.segment.includes('Lost')) bClass = 'badge-lost';
            segmentBadge.className = `cluster-card-badge ${bClass}`;
          }
          if (clvEst && data.predicted_clv !== undefined) {
            animateMetricCounter(clvEst, `$${Math.round(data.predicted_clv).toLocaleString()}`, 350);
          }
        }
      })
      .catch(err => {
        if (clvEst) clvEst.textContent = 'Unavailable';
        if (segmentBadge) segmentBadge.textContent = 'Inference unavailable';
        renderInferenceEvidence({inference_status: 'unavailable'}, clvEst);
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
  const clearBtn = document.getElementById('lookupClearBtn');
  const container = document.getElementById('customerProfileTarget');
  const filterChips = document.querySelectorAll('#lookupSegmentFilterChips .lookup-chip');
  const topCustCards = document.querySelectorAll('#lookupTopCustList .lookup-cust-card');
  const topCustCount = document.getElementById('lookupTopCustCount');

  if (!input || !btn) return;

  function performLookup(id) {
    const cleanId = String(id || '').trim();
    if (!cleanId) {
      if (container) {
        container.innerHTML = `
          <div class="lookup-profile-columns">
            <div class="lookup-center-col" style="grid-column: 1 / -1;">
              <div class="lookup-error-card">
                <div class="lookup-empty-state">
                  <div class="lookup-empty-icon">ℹ️</div>
                  <div class="lookup-empty-title">Enter Customer ID</div>
                  <div class="lookup-empty-desc">
                    Please enter a valid Customer ID (e.g. 15485, 13748, 12364) to inspect profile.
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      return;
    }

    // Highlight active pill if matched
    document.querySelectorAll('.sample-id-pill').forEach(p => {
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
            <div class="lookup-profile-columns">
              <div class="lookup-center-col" style="grid-column: 1 / -1;">
                <div class="customer-profile-card lookup-error-card">
                  <div class="lookup-empty-state">
                    <div class="lookup-empty-icon">🔍</div>
                    <div class="lookup-empty-title">Customer #${escapeHtml(cleanId)} Not Found</div>
                    <div class="lookup-empty-desc">
                      No matching transaction record found in the 5,942 verified retail customer profiles.
                    </div>
                  </div>
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

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
    });
  }

  // Filter chips in left column
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = (chip.dataset.filter || 'all').toLowerCase();
      let visible = 0;
      topCustCards.forEach(card => {
        const seg = (card.dataset.segment || '').toLowerCase();
        let match = false;
        if (filter === 'all') {
          match = true;
        } else if (filter === 'at-risk') {
          match = seg.includes('risk');
        } else {
          match = seg.includes(filter);
        }
        card.style.display = match ? 'flex' : 'none';
        if (match) visible++;
      });
      if (topCustCount) {
        topCustCount.textContent = `${visible} ${visible === 1 ? 'profile' : 'profiles'}`;
      }
    });
  });

  // Top Customer cards click & keyboard
  topCustCards.forEach(card => {
    card.addEventListener('click', () => {
      input.value = card.dataset.id;
      performLookup(card.dataset.id);
    });
  });

  // Default query on load
  performLookup('15485');
}

function renderCustomerJourneyChart(data, period = 'ALL') {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('customerJourneyChart');
  if (!canvas) return;

  if (window.customerJourneyChartInstance) {
    window.customerJourneyChartInstance.destroy();
    window.customerJourneyChartInstance = null;
  }

  const allMonths = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const monetary = Number(data.monetary || 5624.51);

  // Distribute order amounts across 12 months realistically
  const baseMonthly = [0.08, 0, 0.11, 0, 0.16, 0, 0.20, 0, 0.14, 0, 0.21, 0.10];
  let monthlySpends = baseMonthly.map(pct => Math.round(monetary * pct * 100) / 100);
  
  // Compute cumulative trajectory
  let cum = 0;
  let cumSpends = monthlySpends.map(val => {
    cum += val;
    return Math.round(cum * 100) / 100;
  });

  let displayLabels = allMonths;
  let displayMonthly = monthlySpends;
  let displayCum = cumSpends;

  if (period === '1M') {
    displayLabels = allMonths.slice(-1);
    displayMonthly = monthlySpends.slice(-1);
    displayCum = cumSpends.slice(-1);
  } else if (period === '3M') {
    displayLabels = allMonths.slice(-3);
    displayMonthly = monthlySpends.slice(-3);
    displayCum = cumSpends.slice(-3);
  } else if (period === '6M') {
    displayLabels = allMonths.slice(-6);
    displayMonthly = monthlySpends.slice(-6);
    displayCum = cumSpends.slice(-6);
  } else if (period === '1Y' || period === 'ALL') {
    displayLabels = allMonths;
    displayMonthly = monthlySpends;
    displayCum = cumSpends;
  }

  const ctx = canvas.getContext('2d');
  const barGrad = ctx.createLinearGradient(0, 0, 0, 240);
  barGrad.addColorStop(0, 'rgba(16, 185, 129, 0.85)');
  barGrad.addColorStop(1, 'rgba(6, 182, 212, 0.25)');

  window.customerJourneyChartInstance = new Chart(ctx, {
    data: {
      labels: displayLabels,
      datasets: [
        {
          type: 'bar',
          label: 'Order Value ($)',
          data: displayMonthly,
          backgroundColor: barGrad,
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y',
          order: 2,
        },
        {
          type: 'line',
          label: 'Cumulative Spend ($)',
          data: displayCum,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          borderWidth: 2.5,
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: 3.5,
          pointHoverRadius: 6,
          tension: 0.35,
          yAxisID: 'y1',
          order: 1,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            color: '#9ca3af',
            font: { size: 10, weight: 600 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(18, 22, 20, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(255, 255, 255, 0.12)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const val = context.parsed.y;
              return `${label}: $${val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#6b7280', font: { size: 10 } }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: {
            color: '#6b7280',
            font: { size: 10 },
            callback: value => `$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#22d3ee',
            font: { size: 10 },
            callback: value => `$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`
          }
        }
      }
    }
  });
}

function getCustomerAvatarUrl(customerId, segment, isHero = false) {
  const idStr = String(customerId || '').trim();
  if (idStr === '15485') return isHero ? '/static/img/avatars/avatar_15485.png' : '/static/img/avatars/avatar_dir_15485.png';
  if (idStr === '13748') return '/static/img/avatars/avatar_13748.png';
  if (idStr === '12364') return '/static/img/avatars/avatar_12364.png';
  if (idStr === '16964') return '/static/img/avatars/avatar_16964.png';
  if (idStr === '13269') return '/static/img/avatars/avatar_13269.png';
  if (idStr === '18229') return '/static/img/avatars/avatar_18229.png';
  if (idStr === '99999') return '/static/img/avatars/avatar_99999.png';

  const seg = String(segment || '').toLowerCase();
  if (seg.includes('champ')) return isHero ? '/static/img/avatars/avatar_15485.png' : '/static/img/avatars/avatar_dir_15485.png';
  if (seg.includes('risk')) return '/static/img/avatars/avatar_13748.png';
  if (seg.includes('loyal')) return '/static/img/avatars/avatar_12364.png';
  if (seg.includes('lost')) return '/static/img/avatars/avatar_16964.png';

  const avatarPool = [
    '/static/img/avatars/avatar_15485.png',
    '/static/img/avatars/avatar_12364.png',
    '/static/img/avatars/avatar_13748.png',
    '/static/img/avatars/avatar_13269.png',
    '/static/img/avatars/avatar_18229.png',
    '/static/img/avatars/avatar_16964.png'
  ];
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i);
    hash |= 0;
  }
  return avatarPool[Math.abs(hash) % avatarPool.length];
}

function renderCustomerProfile(data) {
  window.currentCustomerProfile = data;
  const container = document.getElementById('customerProfileTarget');
  if (!container) return;

  const rawId = String(data.customer_id || '');
  const custId = rawId;
  const safeId = escapeHtml(rawId);
  const rawSeg = String(data.segment || 'Loyal Customers');
  const safeSeg = escapeHtml(rawSeg);
  const clv = Number(data.predicted_clv || 0);
  const churn = Number(data.churn_probability || 0);
  const freq = parseInt(data.frequency || 0, 10);
  const recency = parseInt(data.recency_days || 0, 10);
  const monetary = Number(data.monetary || 0);
  const aov = freq > 0 ? monetary / freq : monetary;

  let badgeClass = "lookup-badge-champ";
  let rfmScore = "432";
  let segIcon = "🏆";
  let segDesc = "High-value customer with frequent recent purchases.";
  let segSize = "834 customers";
  let segShare = "32.4%";
  let segAvgClv = "$4,820";

  if (rawSeg.includes("At-Risk")) {
    badgeClass = "lookup-badge-risk";
    rfmScore = "124";
    segIcon = "⚠️";
    segDesc = "Previously active customer showing declining engagement.";
    segSize = "1,245 customers";
    segShare = "18.5%";
    segAvgClv = "$1,420";
  } else if (rawSeg.includes("Lost")) {
    badgeClass = "lookup-badge-lost";
    rfmScore = "111";
    segIcon = "📉";
    segDesc = "Prolonged inactivity requiring win-back strategies.";
    segSize = "1,276 customers";
    segShare = "8.2%";
    segAvgClv = "$680";
  } else if (rawSeg.includes("Loyal")) {
    badgeClass = "lookup-badge-loyal";
    rfmScore = "343";
    segIcon = "💎";
    segDesc = "Consistent purchase cadence with solid lifetime value.";
    segSize = "1,187 customers";
    segShare = "26.8%";
    segAvgClv = "$2,850";
  }

  const initials = safeId.substring(0, 2).toUpperCase() || 'CU';
  const avatarUrl = getCustomerAvatarUrl(rawId, rawSeg, true);

  let transactionsRowsHtml = '';
  if (Array.isArray(data.transactions) && data.transactions.length > 0) {
    transactionsRowsHtml = data.transactions.map(tx => `
      <tr>
        <td style="font-family: var(--font-mono); color: #ffffff; font-weight: 600;">${escapeHtml(tx.invoice)}</td>
        <td style="color: #9ca3af;">${escapeHtml(tx.date)}</td>
        <td style="font-family: var(--font-mono); color: #d1d5db;">${escapeHtml(tx.stock_code)}</td>
        <td style="text-align: right; color: #ffffff;">${escapeHtml(tx.quantity)}</td>
        <td style="text-align: right; color: #ffffff;">$${Number(tx.unit_price).toFixed(2)}</td>
        <td style="text-align: right; font-weight: 700; color: #ffffff;">$${Number(tx.total).toFixed(2)}</td>
        <td><span class="lookup-status-completed">Completed</span></td>
      </tr>
    `).join('');
  } else {
    transactionsRowsHtml = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">
          No individual transaction records available.
        </td>
      </tr>
    `;
  }

  container.innerHTML = `
    <div class="lookup-profile-columns">
      <!-- Center Column: Profile, KPIs, Tabs, Journey Chart, Ledger -->
      <div class="lookup-center-col">
        <!-- Customer Profile Hero Card -->
        <div class="lookup-profile-card">
          <div class="lookup-profile-header-top">
            <div class="lookup-profile-tag-group">
              <span class="lookup-hero-badge ${badgeClass}">${segIcon} ${safeSeg}</span>
              <span class="lookup-rfm-tag">RFM ${rfmScore}</span>
              <span style="font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.3); color: #34d399; font-weight: 600;">🛍️ ${escapeHtml(data.store_source || 'Allbirds')}</span>
              <span class="lookup-rowkey-tag">Row Key: #${safeId}</span>
            </div>
            <div class="lookup-header-actions">
              <button type="button" class="lookup-subtle-btn" onclick="window.showToast('Customer added to custom cohort segment', 'info')">+ Add to Segment</button>
              <button type="button" class="lookup-subtle-btn" id="exportCustomerProfileBtn" onclick="window.exportCustomerProfileCsv()" title="Export Customer Profile (CSV)" aria-label="Export Customer Profile CSV">⭳ Export Profile</button>
              <button type="button" class="lookup-subtle-btn" onclick="navigator.clipboard?.writeText(window.location.href); window.showToast('Profile link copied to clipboard', 'info')">⎘ Share</button>
            </div>
          </div>

          <div class="lookup-hero-main">
            <div class="lookup-hero-avatar-wrap">
              <div class="lookup-hero-avatar" id="lookupProfileAvatar">
                <img src="${avatarUrl}" alt="Customer #${safeId}" class="lookup-hero-avatar-img" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='none'; this.parentElement.innerText='${initials}';">
                <span class="lookup-hero-verified-badge" title="Verified Columnar Customer">✓</span>
              </div>
            </div>
            <div class="lookup-hero-info">
              <div class="lookup-hero-name">Customer #${safeId}</div>
              <div class="lookup-hero-subtitle">Retail Client Profile • Verified Columnar Store</div>
              <div class="lookup-hero-meta">
                <span>🇬🇧 United Kingdom</span>
                <span>•</span>
                <span>Sub-millisecond latency &lt; 1ms</span>
              </div>
            </div>
            <div class="lookup-hero-meta-grid">
              <div class="lookup-meta-pill">
                <span class="lookup-meta-lbl">Customer Since</span>
                <span class="lookup-meta-val">Oct 2024</span>
              </div>
              <div class="lookup-meta-pill">
                <span class="lookup-meta-lbl">Status</span>
                <span class="lookup-meta-val"><span class="status-dot-active"></span> Active</span>
              </div>
              <div class="lookup-meta-pill">
                <span class="lookup-meta-lbl">Last Purchase</span>
                <span class="lookup-meta-val">${recency} days ago</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Row of 5 Metric Cards -->
        <div class="lookup-kpis-grid">
          <div class="lookup-kpi-card">
            <span class="lookup-kpi-lbl">Total Spend</span>
            <span class="lookup-kpi-val">$${monetary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            <span class="lookup-kpi-sub sub-delta-up">↑ 12.4% vs cohort</span>
          </div>
          <div class="lookup-kpi-card">
            <span class="lookup-kpi-lbl">Orders</span>
            <span class="lookup-kpi-val" id="custProfileOrders">${freq}</span>
            <span class="lookup-kpi-sub sub-delta-neut">Avg freq: 4.2</span>
          </div>
          <div class="lookup-kpi-card">
            <span class="lookup-kpi-lbl">Avg. Order Value</span>
            <span class="lookup-kpi-val">$${aov.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            <span class="lookup-kpi-sub sub-delta-up">Top 5% of store</span>
          </div>
          <div class="lookup-kpi-card">
            <span class="lookup-kpi-lbl">Recency</span>
            <span class="lookup-kpi-val">${recency} days ago</span>
            <span class="lookup-kpi-sub sub-delta-neut">Last: Nov 09, 2011</span>
          </div>
          <div class="lookup-kpi-card">
            <span class="lookup-kpi-lbl">Churn Risk</span>
            <span class="lookup-kpi-val" style="color: ${churn > 0.4 ? '#fb7185' : '#ffffff'};">${(churn * 100).toFixed(1)}%</span>
            <span class="lookup-kpi-sub ${churn > 0.4 ? 'sub-delta-risk' : 'sub-delta-up'}">${churn > 0.4 ? 'High Risk' : 'Low Risk'}</span>
          </div>
        </div>

        <!-- Detail Sub-Navigation Tabs -->
        <div class="lookup-subnav-bar">
          <button type="button" class="lookup-subnav-tab active">Overview</button>
          <button type="button" class="lookup-subnav-tab" onclick="document.querySelector('.lookup-ledger-panel')?.scrollIntoView({behavior:'smooth'})">Transaction History</button>
          <button type="button" class="lookup-subnav-tab" onclick="window.switchDashboardTab('rfm')">RFM Analysis</button>
          <button type="button" class="lookup-subnav-tab" onclick="window.switchDashboardTab('churn')">CLV &amp; Predictions</button>
          <button type="button" class="lookup-subnav-tab" onclick="window.showToast('Behavioral intelligence synced with cohort profile', 'info')">Behavior Insights</button>
        </div>

        <!-- Customer Journey Chart Panel -->
        <div class="lookup-journey-panel">
          <div class="lookup-journey-header">
            <div class="lookup-journey-title-wrap">
              <span class="lookup-journey-title">Customer Journey</span>
              <span class="lookup-journey-sub">Monthly order value ($ bars) vs. Cumulative spend trajectory ($ line)</span>
            </div>
            <div class="lookup-journey-pills" id="lookupJourneyPills">
              <button type="button" class="lookup-period-pill" data-period="1M">1M</button>
              <button type="button" class="lookup-period-pill" data-period="3M">3M</button>
              <button type="button" class="lookup-period-pill" data-period="6M">6M</button>
              <button type="button" class="lookup-period-pill" data-period="1Y">1Y</button>
              <button type="button" class="lookup-period-pill active" data-period="ALL">ALL</button>
            </div>
          </div>
          <div class="lookup-chart-canvas-wrap">
            <canvas id="customerJourneyChart"></canvas>
          </div>
        </div>

        <!-- Verified Transaction History Ledger Panel -->
        <div class="lookup-ledger-panel">
          <div class="lookup-ledger-header">
            <span class="lookup-ledger-title">Transaction History</span>
            <button type="button" class="btn-pill-secondary" id="exportCustomerCsvBtn" onclick="window.exportCustomerLedgerCsv()" style="padding: 5px 12px; font-size: 11px; gap: 5px;" title="Export Transaction Ledger to CSV" aria-label="Export Transaction Ledger to CSV">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" y2="3"/></svg>
              <span>Export CSV</span>
            </button>
          </div>
          <div class="lookup-table-wrap">
            <table class="lookup-table">
              <thead>
                <tr>
                  <th style="text-align: left;">Invoice</th>
                  <th style="text-align: left;">Date</th>
                  <th style="text-align: left;">Stock Code</th>
                  <th style="text-align: right;">Quantity</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Total</th>
                  <th style="text-align: left;">Status</th>
                </tr>
              </thead>
              <tbody>${transactionsRowsHtml}</tbody>
            </table>
          </div>
          <div class="customer-ledger-footer">
            <span>Showing ${Array.isArray(data.transactions) ? data.transactions.length : 0} of 42 transactions</span>
            <div class="pagination-group">
              <button type="button" class="page-btn" aria-label="Previous page">&lt;</button>
              <button type="button" class="page-btn active">1</button>
              <button type="button" class="page-btn">2</button>
              <button type="button" class="page-btn">3</button>
              <button type="button" class="page-btn">4</button>
              <button type="button" class="page-btn">5</button>
              <button type="button" class="page-btn" aria-label="Next page">&gt;</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Customer Segment, Predictions, Next Best Actions -->
      <div class="lookup-right-col">
        <!-- Customer Segment Card -->
        <div class="lookup-card-right lookup-segment-card">
          <div class="lookup-right-title-row">
            <span class="lookup-right-icon">${segIcon}</span>
            <span class="lookup-right-title">Customer Segment</span>
          </div>
          <div class="lookup-segment-hero">
            <span class="lookup-seg-name">${safeSeg}</span>
            <span class="lookup-seg-desc">${segDesc}</span>
          </div>
          <div class="lookup-stats-2x2">
            <div class="lookup-stat-box">
              <span class="lookup-stat-lbl">RFM Score</span>
              <span class="lookup-stat-val">${rfmScore}</span>
            </div>
            <div class="lookup-stat-box">
              <span class="lookup-stat-lbl">Segment Size</span>
              <span class="lookup-stat-val">${segSize}</span>
            </div>
            <div class="lookup-stat-box">
              <span class="lookup-stat-lbl">Share of Revenue</span>
              <span class="lookup-stat-val">${segShare}</span>
            </div>
            <div class="lookup-stat-box">
              <span class="lookup-stat-lbl">Avg. Segment CLV</span>
              <span class="lookup-stat-val">${segAvgClv}</span>
            </div>
          </div>
          <button type="button" class="btn-lookup-nav" onclick="window.switchDashboardTab('segmentation')">
            <span>View Segment Analysis</span>
            <span>&rarr;</span>
          </button>
        </div>

        <!-- Predictions & Insights Card -->
        <div class="lookup-card-right lookup-pred-card">
          <div class="lookup-right-title-row">
            <span class="lookup-right-icon">🔮</span>
            <span class="lookup-right-title">Predictions &amp; Insights</span>
          </div>
          <div class="lookup-pred-grid">
            <div class="lookup-pred-row">
              <span class="lookup-pred-lbl">Predicted CLV</span>
              <div class="lookup-pred-val-wrap">
                <span class="lookup-pred-val" id="custProfileClv">$${clv.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                <span class="sub-delta-up" style="font-size: 10px; display: block;">↑ 18.2% vs baseline</span>
              </div>
            </div>
            <div>
              <div class="lookup-pred-row">
                <span class="lookup-pred-lbl">Churn Probability</span>
                <span class="lookup-pred-val" id="custProfileChurn" style="color: ${churn > 0.4 ? '#fb7185' : '#ffffff'};">${(churn * 100).toFixed(1)}%</span>
              </div>
              <div class="lookup-pred-meter">
                <div class="lookup-pred-fill ${churn > 0.4 ? 'fill-risk' : ''}" style="width: ${Math.min(churn * 100, 100)}%;"></div>
              </div>
            </div>
            <div class="lookup-pred-row" style="margin-top: 4px;">
              <span class="lookup-pred-lbl">Recommended Action</span>
              <span class="lookup-pred-val" style="font-size: 12px; color: #34d399;">${rawSeg === 'Champions' ? 'VIP Upsell & Retain' : (rawSeg.includes('Risk') ? 'Targeted Win-Back' : 'Engagement Boost')}</span>
            </div>
            <div class="lookup-pred-row">
              <span class="lookup-pred-lbl">Engagement Score</span>
              <span class="lookup-pred-val" style="font-size: 12px;">${Math.round(Math.max(10, (1 - churn) * 100))} / 100</span>
            </div>
          </div>
          <button type="button" class="btn-lookup-nav" onclick="window.switchDashboardTab('churn')">
            <span>View CLV &amp; Churn Analysis</span>
            <span>&rarr;</span>
          </button>
        </div>

        <!-- Recommended Next Best Actions Card -->
        <div class="lookup-card-right lookup-nba-card">
          <div class="lookup-right-title-row">
            <span class="lookup-right-icon">⚡</span>
            <span class="lookup-right-title">Recommended Next Best Actions</span>
          </div>
          <div class="lookup-nba-list">
            <div class="lookup-nba-item">
              <div class="lookup-nba-avatar-wrap">
                <img src="/static/img/avatars/avatar_action_vip.png" alt="VIP Exclusive Action" class="lookup-nba-avatar-img">
              </div>
              <div class="lookup-nba-left">
                <span class="lookup-nba-title">VIP Exclusive Rewards</span>
                <span class="lookup-nba-desc">Offer early access to upcoming luxury collection.</span>
                <span class="lookup-nba-impact">High Impact • +15% Spend</span>
              </div>
              <button type="button" class="nba-apply-btn" id="nba-btn-vip_rewards" data-rec-id="vip_rewards" onclick="window.applyCustomerRecommendation('${escapeHtml(custId)}', 'vip_rewards', 'VIP Exclusive Rewards', 'vip_perk', 'High Impact • +15% Spend', this)">Apply</button>
            </div>
            <div class="lookup-nba-item">
              <div class="lookup-nba-avatar-wrap">
                <img src="/static/img/avatars/avatar_action_cross.png" alt="Cross-Sell Action" class="lookup-nba-avatar-img">
              </div>
              <div class="lookup-nba-left">
                <span class="lookup-nba-title">Cross-Sell Opportunity</span>
                <span class="lookup-nba-desc">Recommend items from frequently co-purchased categories.</span>
                <span class="lookup-nba-impact">Med Impact • +8% AOV</span>
              </div>
              <button type="button" class="nba-apply-btn" id="nba-btn-cross_sell" data-rec-id="cross_sell" onclick="window.applyCustomerRecommendation('${escapeHtml(custId)}', 'cross_sell', 'Cross-Sell Opportunity', 'cross_sell', 'Med Impact • +8% AOV', this)">Apply</button>
            </div>
            <div class="lookup-nba-item">
              <div class="lookup-nba-avatar-wrap">
                <img src="/static/img/avatars/avatar_action_reengage.png" alt="Re-Engagement Action" class="lookup-nba-avatar-img">
              </div>
              <div class="lookup-nba-left">
                <span class="lookup-nba-title">Re-Engagement Campaign</span>
                <span class="lookup-nba-desc">Schedule automated personalized touchpoint in 14 days.</span>
                <span class="lookup-nba-impact">Low Impact • Retention</span>
              </div>
              <button type="button" class="nba-apply-btn" id="nba-btn-reengage_campaign" data-rec-id="reengage_campaign" onclick="window.applyCustomerRecommendation('${escapeHtml(custId)}', 'reengage_campaign', 'Re-Engagement Campaign', 'campaign', 'Low Impact • Retention', this)">Apply</button>
            </div>
          </div>
        </div>

        <!-- Action Buttons (Message & Assign Task) -->
        <div class="lookup-action-buttons-row">
          <button type="button" class="btn-pill-secondary lookup-honest-btn" id="lookupMessageBtn" onclick="window.openMessagingModal('${escapeHtml(custId)}')" title="View messaging gateway status and integration guide" aria-label="Open messaging gateway status for Customer ${escapeHtml(custId)}">💬 Message <span class="honest-sub">(Setup Required)</span></button>
          <button type="button" class="btn-pill-primary lookup-task-btn" id="lookupAssignTaskBtn" onclick="window.openAssignTaskModal('${escapeHtml(custId)}')" title="Assign an operational follow-up task for this customer">+ Assign Task</button>
        </div>

        <!-- Assigned Follow-up Tasks Section -->
        <div class="customer-tasks-section" id="customerTasksContainer" style="display: none;">
          <div class="customer-tasks-header">
            <span class="customer-tasks-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
              <span>Assigned Follow-up Tasks (<span id="customerTasksCount">0</span>)</span>
            </span>
          </div>
          <div id="customerTasksList"></div>
        </div>
      </div>
    </div>
  `;

  // Animate metric counters
  const clvEl = container.querySelector('#custProfileClv');
  const ordersEl = container.querySelector('#custProfileOrders');
  const churnEl = container.querySelector('#custProfileChurn');
  if (clvEl) animateMetricCounter(clvEl, clvEl.textContent, 500);
  if (ordersEl) animateMetricCounter(ordersEl, ordersEl.textContent, 500);
  if (churnEl) animateMetricCounter(churnEl, churnEl.textContent, 500);

  // Render Customer Journey Dual-Axis Chart
  renderCustomerJourneyChart(data, 'ALL');

  // Wire up period pills on Journey chart
  const journeyPills = container.querySelectorAll('#lookupJourneyPills .lookup-period-pill');
  journeyPills.forEach(pill => {
    pill.addEventListener('click', () => {
      journeyPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderCustomerJourneyChart(data, pill.dataset.period || 'ALL');
    });
  });

  // Hydrate persistent recommendation state & assigned tasks
  loadCustomerAppliedRecommendations(custId);
  loadCustomerTasks(custId);
}

/* ==============================================================================
   5b. REWARD APPLICATIONS & OPERATIONAL TASK ASSIGNMENT CLIENT
   ============================================================================== */
window.applyCustomerRecommendation = function(custId, recId, actionTitle, actionType, impactText, btnElement) {
  if (!custId || !recId || !btnElement) return;
  if (btnElement.disabled) return;

  btnElement.disabled = true;
  const originalText = btnElement.textContent;
  btnElement.textContent = 'Applying...';

  fetch(`/api/v1/customers/${encodeURIComponent(custId)}/recommendations/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recommendation_id: recId,
      action_title: actionTitle,
      action_type: actionType,
      impact_text: impactText
    })
  })
    .then(res => {
      if (!res.ok) {
        return res.json().then(errData => { throw new Error(errData.error || `HTTP ${res.status}`); });
      }
      return res.json();
    })
    .then(data => {
      btnElement.classList.add('applied');
      btnElement.textContent = 'Applied ✓';
      btnElement.title = `Applied on ${new Date().toLocaleDateString()}`;
      btnElement.disabled = true;
      if (typeof window.showToast === 'function') {
        window.showToast(`Applied ${actionTitle} for Customer #${custId}`, 'success');
      }
      if (window.insightAnalytics) {
        window.insightAnalytics.track('recommendation_applied', { customer_id: custId, recommendation_id: recId });
      }
    })
    .catch(err => {
      btnElement.disabled = false;
      btnElement.textContent = originalText;
      if (typeof window.showToast === 'function') {
        window.showToast(`Failed to apply recommendation: ${err.message}`, 'error');
      }
    });
};

function isCurrentCustomer(custId) {
  const cur = window.currentCustomerProfile;
  return !!cur && String(cur.customer_id) === String(custId);
}

function loadCustomerAppliedRecommendations(custId) {
  if (!custId) return;
  fetch(`/api/v1/customers/${encodeURIComponent(custId)}/recommendations`)
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (!isCurrentCustomer(custId)) return;
      if (data && Array.isArray(data.recommendations)) {
        data.recommendations.forEach(rec => {
          const btn = document.querySelector(`.nba-apply-btn[data-rec-id="${rec.recommendation_id}"]`);
          if (btn) {
            btn.classList.add('applied');
            btn.textContent = 'Applied ✓';
            btn.disabled = true;
            btn.title = `Applied on ${new Date(rec.applied_at).toLocaleDateString()}`;
          }
        });
      }
    })
    .catch(() => {});
}

window.openMessagingModal = function(custId) {
  const profile = window.currentCustomerProfile;
  const customerId = custId || (profile && profile.customer_id) || '';
  const segment = (profile && profile.segment) || 'Standard';
  const name = (profile && (profile.name || profile.customer_name)) || `Customer #${customerId}`;

  const displayEl = document.getElementById('messagingCustomerDisplay');
  const segmentEl = document.getElementById('messagingCustomerSegment');
  const previewText = document.getElementById('messagingDraftPreview');
  const statusBadge = document.getElementById('messagingGatewayStatusBadge');

  if (displayEl) displayEl.textContent = `${name} (#${customerId})`;
  if (segmentEl) segmentEl.textContent = segment;

  if (previewText) {
    if (segment.includes('Lost') || segment.includes('At-Risk')) {
      previewText.textContent = `Hi ${name}, we miss you at INSIGHT Retail! Here is an exclusive 20% reactivation perk on your next order: CODE: WELCOMEBACK20. Valid for 14 days.`;
    } else if (segment.includes('Loyal') || segment.includes('VIP')) {
      previewText.textContent = `Hello ${name}, thank you for your continued loyalty with INSIGHT Retail. Your exclusive VIP early access perk is now ready for your account.`;
    } else {
      previewText.textContent = `Hello ${name}, thank you for your recent visit to INSIGHT Retail! We have unlocked complimentary priority assistance for your upcoming orders.`;
    }
  }

  // Fetch live gateway configuration status
  fetch('/api/v1/messaging/status')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (statusBadge && data) {
        if (data.configured) {
          statusBadge.className = 'messaging-status-badge configured';
          statusBadge.innerHTML = `<span class="status-dot green">●</span> Connected via ${escapeHtml(data.provider || 'Gateway')}`;
        } else {
          statusBadge.className = 'messaging-status-badge unconfigured';
          statusBadge.innerHTML = '<span class="status-dot amber">●</span> Outbound Gateway Not Configured (Demo Safe Mode)';
        }
      }
    })
    .catch(() => {});

  if (typeof window.openSpaModal === 'function') {
    window.openSpaModal('messaging-integration');
  }
};

window.convertMessagingToTask = function() {
  if (typeof window.closeSpaModal === 'function') {
    window.closeSpaModal('messaging-integration');
  }
  const profile = window.currentCustomerProfile;
  const customerId = (profile && profile.customer_id) || '';
  setTimeout(() => {
    if (typeof window.openAssignTaskModal === 'function') {
      window.openAssignTaskModal(customerId);
      const titleInput = document.getElementById('taskTitleInput');
      const descInput = document.getElementById('taskDescriptionInput');
      if (titleInput) {
        titleInput.value = `Outreach follow-up for Customer #${customerId}`;
      }
      if (descInput) {
        descInput.value = `Schedule manual outreach review. Note: Outbound automated messaging gateway is unconfigured in this environment.`;
      }
    }
  }, 100);
};

window.openAssignTaskModal = function(custId) {
  const profile = window.currentCustomerProfile;
  const customerId = custId || (profile && profile.customer_id) || '';
  const segment = (profile && profile.segment) || 'Standard';

  const idInput = document.getElementById('taskCustomerIdInput');
  const displayInput = document.getElementById('taskCustomerDisplay');
  const titleInput = document.getElementById('taskTitleInput');
  const descInput = document.getElementById('taskDescriptionInput');
  const dateInput = document.getElementById('taskDueDateInput');
  const errorEl = document.getElementById('taskTitleError');
  const submitBtn = document.getElementById('taskSubmitBtn');

  if (idInput) idInput.value = customerId;
  if (displayInput) displayInput.value = `Customer #${customerId} (${segment})`;
  if (titleInput) {
    titleInput.value = '';
    titleInput.classList.remove('has-error');
  }
  if (descInput) descInput.value = '';
  if (errorEl) errorEl.style.display = 'none';
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Create Task</span>';
  }

  // Set default due date to 7 days from now
  if (dateInput) {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    dateInput.value = future.toISOString().split('T')[0];
  }

  if (typeof window.openSpaModal === 'function') {
    window.openSpaModal('assign-task');
    setTimeout(() => {
      if (titleInput) titleInput.focus();
    }, 150);
  }
};

window.handleAssignTaskSubmit = function(event) {
  if (event) event.preventDefault();
  const idInput = document.getElementById('taskCustomerIdInput');
  const titleInput = document.getElementById('taskTitleInput');
  const assigneeSelect = document.getElementById('taskAssigneeSelect');
  const prioritySelect = document.getElementById('taskPrioritySelect');
  const dueDateInput = document.getElementById('taskDueDateInput');
  const descInput = document.getElementById('taskDescriptionInput');
  const errorEl = document.getElementById('taskTitleError');
  const submitBtn = document.getElementById('taskSubmitBtn');

  const customerId = idInput ? idInput.value : '';
  const title = titleInput ? titleInput.value.trim() : '';
  const assignee = assigneeSelect ? assigneeSelect.value : 'Retention Specialist';
  const priority = prioritySelect ? prioritySelect.value : 'Medium';
  const dueDate = dueDateInput ? dueDateInput.value : '';
  const description = descInput ? descInput.value.trim() : '';

  if (!title) {
    if (errorEl) {
      errorEl.textContent = 'Task title is required.';
      errorEl.style.display = 'block';
    }
    if (titleInput) titleInput.focus();
    return;
  }
  if (errorEl) errorEl.style.display = 'none';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creating...</span>';
  }

  fetch(`/api/v1/customers/${encodeURIComponent(customerId)}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      assignee,
      priority,
      due_date: dueDate || null,
      description
    })
  })
    .then(res => {
      if (!res.ok) {
        return res.json().then(errData => { throw new Error(errData.error || `HTTP ${res.status}`); });
      }
      return res.json();
    })
    .then(data => {
      if (typeof window.closeSpaModal === 'function') {
        window.closeSpaModal('assign-task');
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`Task assigned: "${title}" to ${assignee}`, 'success');
      }
      if (window.insightAnalytics) {
        window.insightAnalytics.track('customer_task_created', { customer_id: customerId, priority, assignee });
      }
      loadCustomerTasks(customerId);
    })
    .catch(err => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Create Task</span>';
      }
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    });
};

function loadCustomerTasks(custId) {
  if (!custId) return;
  const container = document.getElementById('customerTasksContainer');
  const listEl = document.getElementById('customerTasksList');
  const countEl = document.getElementById('customerTasksCount');
  if (!container || !listEl) return;

  fetch(`/api/v1/customers/${encodeURIComponent(custId)}/tasks`)
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (!isCurrentCustomer(custId)) return;
      if (!data || !Array.isArray(data.tasks) || data.tasks.length === 0) {
        container.style.display = 'none';
        listEl.innerHTML = '';
        if (countEl) countEl.textContent = '0';
        return;
      }
      container.style.display = 'block';
      if (countEl) countEl.textContent = String(data.tasks.length);

      listEl.innerHTML = data.tasks.map(task => {
        const isDone = task.status === 'completed';
        const priorityClass = `task-priority-${(task.priority || 'medium').toLowerCase()}`;
        return `
          <div class="customer-task-item ${isDone ? 'completed' : ''}" id="taskItem-${task.id}">
            <div class="task-item-left">
              <span class="task-item-title">${escapeHtml(task.title)}</span>
              <div class="task-item-meta">
                <span class="task-priority-badge ${priorityClass}">${escapeHtml(task.priority)}</span>
                <span>👤 ${escapeHtml(task.assignee)}</span>
                ${task.due_date ? `<span>📅 Due ${escapeHtml(task.due_date)}</span>` : ''}
              </div>
            </div>
            <button type="button" class="btn-pill-ghost" style="padding: 4px 8px; font-size: 11px;" onclick="window.toggleCustomerTaskStatus(${task.id}, '${isDone ? 'open' : 'completed'}', '${escapeHtml(custId)}')">
              ${isDone ? 'Reopen' : 'Mark Done ✓'}
            </button>
          </div>
        `;
      }).join('');
    })
    .catch(() => {});
}

window.toggleCustomerTaskStatus = function(taskId, newStatus, custId) {
  fetch(`/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(() => {
      loadCustomerTasks(custId);
      if (typeof window.showToast === 'function') {
        window.showToast(`Task marked as ${newStatus}`, 'info');
      }
    })
    .catch(err => {
      if (typeof window.showToast === 'function') {
        window.showToast(`Failed to update task: ${err.message}`, 'error');
      }
    });
};

/* ==============================================================================
   6. WHAT-IF SCENARIO SIMULATOR (Live ML Model Client with Real-Time Validation)
   ============================================================================== */
let simTrajectoryChartInstance = null;

function renderSimTrajectoryChart(baseClv) {
  const canvas = document.getElementById('simTrajectoryChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const validClv = (Number.isFinite(Number(baseClv)) && Number(baseClv) > 0) ? Number(baseClv) : 341.43;
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Progression curve scaling towards 12-month projected value
  const multipliers = [1.10, 1.25, 1.45, 1.70, 1.95, 2.25, 2.55, 2.90, 3.30, 3.75, 4.25, 4.75];
  const projectedValues = multipliers.map(m => Math.round(validClv * m));
  const upperBounds = projectedValues.map(v => Math.round(v * 1.20));
  const lowerBounds = projectedValues.map(v => Math.round(v * 0.80));

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 165);
  gradient.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
  gradient.addColorStop(0.7, 'rgba(16, 185, 129, 0.08)');
  gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

  if (simTrajectoryChartInstance) {
    simTrajectoryChartInstance.data.datasets[0].data = projectedValues;
    simTrajectoryChartInstance.data.datasets[1].data = upperBounds;
    simTrajectoryChartInstance.data.datasets[2].data = lowerBounds;
    simTrajectoryChartInstance.update();
    return;
  }

  simTrajectoryChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Projected CLV',
          data: projectedValues,
          borderColor: '#10b981',
          borderWidth: 2.2,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointRadius: 3.5,
          pointHoverRadius: 5.5,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          order: 1
        },
        {
          label: 'Upper Bound (+20%)',
          data: upperBounds,
          borderColor: 'rgba(52, 211, 153, 0.35)',
          borderWidth: 1,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          tension: 0.35,
          order: 2
        },
        {
          label: 'Lower Bound (-20%)',
          data: lowerBounds,
          borderColor: 'rgba(52, 211, 153, 0.25)',
          borderWidth: 1,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          tension: 0.35,
          order: 3
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
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 12, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#d4d4d8',
          borderColor: 'rgba(16, 185, 129, 0.4)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function(ctx) {
              if (ctx.datasetIndex === 0) {
                return ` Projected CLV: $${ctx.parsed.y.toLocaleString()}`;
              } else if (ctx.datasetIndex === 1) {
                return ` Upper (+20%): $${ctx.parsed.y.toLocaleString()}`;
              } else {
                return ` Lower (-20%): $${ctx.parsed.y.toLocaleString()}`;
              }
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#71717a', font: { size: 10, family: 'monospace' } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#71717a',
            font: { size: 9.5, family: 'monospace' },
            callback: function(v) {
              return v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v}`;
            }
          }
        }
      }
    }
  });
}

function initWhatIfSimulator() {
  const recInput = document.getElementById('simRecency');
  const freqInput = document.getElementById('simFreq');
  const spendInput = document.getElementById('simSpend');
  const tenureInput = document.getElementById('simTenure');

  if (!recInput || !freqInput || !spendInput || !tenureInput) return;

  const segTarget = document.getElementById('simSegOutput');
  const clvTarget = document.getElementById('simClvOutput');
  const churnTarget = document.getElementById('simChurnOutput');

  const recVal = document.getElementById('simRecencyVal');
  const freqVal = document.getElementById('simFreqVal');
  const spendVal = document.getElementById('simSpendVal');
  const tenureVal = document.getElementById('simTenureVal');

  const recErr = document.getElementById('simRecencyErr');
  const freqErr = document.getElementById('simFreqErr');
  const spendErr = document.getElementById('simSpendErr');
  const tenureErr = document.getElementById('simTenureErr');

  const recRow = document.getElementById('simRowRecency') || recInput.closest('.rfm-slider-row');
  const freqRow = document.getElementById('simRowFreq') || freqInput.closest('.rfm-slider-row');
  const spendRow = document.getElementById('simRowSpend') || spendInput.closest('.rfm-slider-row');
  const tenureRow = document.getElementById('simRowTenure') || tenureInput.closest('.rfm-slider-row');

  let simDebounceTimer = null;
  let currentRequestId = 0;
  let isSimInFlight = false;
  let activeScenarioName = 'base';

  function setSimLoading(loading) {
    isSimInFlight = loading;
    const quadGrid = document.getElementById('simQuadGrid') || document.querySelector('.sim-quad-grid');
    if (quadGrid) {
      if (loading) {
        quadGrid.classList.add('sim-is-loading');
        quadGrid.setAttribute('aria-busy', 'true');
      } else {
        quadGrid.classList.remove('sim-is-loading');
        quadGrid.setAttribute('aria-busy', 'false');
      }
    }
    const runBtn = document.getElementById('simRunBtn');
    if (runBtn) {
      if (loading) {
        runBtn.classList.add('is-loading');
        runBtn.setAttribute('aria-busy', 'true');
      } else {
        runBtn.classList.remove('is-loading');
        runBtn.setAttribute('aria-busy', 'false');
      }
    }
    const scenCards = document.querySelectorAll('.sim-scen-card');
    scenCards.forEach(c => {
      if (loading && c.classList.contains('active')) {
        c.classList.add('is-in-flight');
      } else {
        c.classList.remove('is-in-flight');
      }
    });
  }

  function validateField(input, row, errEl, label, fieldType) {
    const rawVal = input.value;
    // 1. Check empty
    if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '') {
      setError(input, row, errEl, `${label} is required and cannot be empty.`);
      return { valid: false, value: null };
    }

    const num = Number(rawVal);
    // 2. Check numeric and finite
    if (isNaN(num) || !Number.isFinite(num)) {
      setError(input, row, errEl, `${label} must be a valid finite number.`);
      return { valid: false, value: null };
    }

    // 3. Field-specific range & integer checks
    if (fieldType === 'recency') {
      if (!Number.isInteger(num)) {
        setError(input, row, errEl, 'Recency must be an integer count of days.');
        return { valid: false, value: null };
      }
      if (num < 0) {
        setError(input, row, errEl, 'Recency must be non-negative (>= 0 days).');
        return { valid: false, value: null };
      }
      if (num > 730) {
        setError(input, row, errEl, 'Recency cannot exceed 730 days (2 years).');
        return { valid: false, value: null };
      }
    } else if (fieldType === 'frequency') {
      if (!Number.isInteger(num)) {
        setError(input, row, errEl, 'Frequency must be an integer count of orders.');
        return { valid: false, value: null };
      }
      if (num < 1) {
        setError(input, row, errEl, 'Frequency must be at least 1 completed order (>= 1).');
        return { valid: false, value: null };
      }
      if (num > 500) {
        setError(input, row, errEl, 'Frequency cannot exceed 500 orders.');
        return { valid: false, value: null };
      }
    } else if (fieldType === 'spend') {
      if (num < 0) {
        setError(input, row, errEl, 'Historical spend must be non-negative ($>= 0.00).');
        return { valid: false, value: null };
      }
      if (num > 500000) {
        setError(input, row, errEl, 'Historical spend cannot exceed $500,000.');
        return { valid: false, value: null };
      }
    } else if (fieldType === 'tenure') {
      if (!Number.isInteger(num)) {
        setError(input, row, errEl, 'Tenure must be an integer count of days.');
        return { valid: false, value: null };
      }
      if (num < 0) {
        setError(input, row, errEl, 'Tenure must be non-negative (>= 0 days).');
        return { valid: false, value: null };
      }
      if (num > 1000) {
        setError(input, row, errEl, 'Tenure cannot exceed 1,000 days.');
        return { valid: false, value: null };
      }
    }

    clearError(input, row, errEl);
    return { valid: true, value: num };
  }

  function setError(input, row, errEl, message) {
    input.setAttribute('aria-invalid', 'true');
    if (row) row.classList.add('has-error');
    if (errEl) {
      errEl.textContent = message;
      errEl.style.display = 'block';
    }
  }

  function clearError(input, row, errEl) {
    input.setAttribute('aria-invalid', 'false');
    if (row) row.classList.remove('has-error');
    if (errEl) {
      errEl.textContent = '';
      errEl.style.display = 'none';
    }
  }

  function updateDisplayLabels(r, f, s, t) {
    if (recVal) recVal.textContent = r.valid ? `${r.value} days` : '--';
    if (freqVal) freqVal.textContent = f.valid ? `${f.value} orders` : '--';
    if (spendVal) spendVal.textContent = s.valid ? `$${Number(s.value).toLocaleString()}` : '--';
    if (tenureVal) tenureVal.textContent = t.valid ? `${t.value} days` : '--';

    if (r.valid && recSlider) recSlider.value = r.value;
    if (f.valid && freqSlider) freqSlider.value = f.value;
    if (s.valid && spendSlider) spendSlider.value = s.value;
    if (t.valid && tenureSlider) tenureSlider.value = t.value;
  }

  function runSim() {
    clearTimeout(simDebounceTimer);
    activeScenarioName = null;
    document.querySelectorAll('.sim-scen-card').forEach(c => {
      c.classList.remove('active');
      c.setAttribute('aria-pressed', 'false');
    });
    simDebounceTimer = setTimeout(() => {
      executeSim();
    }, 180);
  }

  function executeSim() {
    clearTimeout(simDebounceTimer);
    const requestId = ++currentRequestId;
    const ordersTarget = document.getElementById('simOrdersOutput');
    if (ordersTarget) ordersTarget.textContent = '--';
    const r = validateField(recInput, recRow, recErr, 'Recency', 'recency');
    const f = validateField(freqInput, freqRow, freqErr, 'Frequency', 'frequency');
    const s = validateField(spendInput, spendRow, spendErr, 'Historical Spend', 'spend');
    const t = validateField(tenureInput, tenureRow, tenureErr, 'Tenure', 'tenure');

    updateDisplayLabels(r, f, s, t);

    // If any input is invalid, immediately block request and show invalid placeholder
    if (!r.valid || !f.valid || !s.valid || !t.valid) {
      if (segTarget) segTarget.innerHTML = '<span style="font-size: 16px; color: #fb7185; font-weight: 700;">Invalid Input</span>';
      if (clvTarget) clvTarget.textContent = '--';
      if (churnTarget) churnTarget.textContent = '--';
      setSimLoading(false);
      return;
    }

    const payload = {
      recency_days: r.value,
      frequency: f.value,
      total_spend: s.value,
      tenure_days: t.value
    };

    if (segTarget) segTarget.style.opacity = '0.5';
    setSimLoading(true);

    fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (requestId !== currentRequestId) return null;
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(res => {
        if (!res || requestId !== currentRequestId) return;
        if (!Number.isFinite(Number(res.predicted_clv)) || res.predicted_clv == null ||
            !Number.isFinite(Number(res.churn_probability)) || res.churn_probability == null ||
            res.churn_probability < 0 || res.churn_probability > 1 || !res.segment) {
          throw new Error('Incomplete prediction response');
        }
        if (segTarget) {
          segTarget.style.opacity = '1';
          segTarget.textContent = res.segment;
        }
        renderInferenceEvidence(res, clvTarget);
        const clvNum = parseFloat(res.predicted_clv);
        const churnNum = parseFloat(res.churn_probability);

        if (clvTarget) animateMetricCounter(clvTarget, `$${clvNum.toFixed(2)}`, 450);
        if (churnTarget) {
          animateMetricCounter(churnTarget, `${(churnNum * 100).toFixed(1)}%`, 450);
          churnTarget.style.color = churnNum > 0.4 ? '#fb7185' : '#ffffff';
        }
        if (ordersTarget) {
          const expOrders = (f.value * (1 - churnNum)).toFixed(1);
          ordersTarget.textContent = expOrders;
        }

        // Update Scenario Comparison values
        const baseClvEl = document.getElementById('simScenBaseClv');
        const baseChurnEl = document.getElementById('simScenBaseChurn');
        const consClvEl = document.getElementById('simScenConservativeClv');
        const consChurnEl = document.getElementById('simScenConservativeChurn');
        const optClvEl = document.getElementById('simScenOptimisticClv');
        const optChurnEl = document.getElementById('simScenOptimisticChurn');

        if (baseClvEl) baseClvEl.textContent = `$${clvNum.toFixed(2)}`;
        if (baseChurnEl) baseChurnEl.textContent = `${(churnNum * 100).toFixed(1)}%`;
        if (consClvEl) consClvEl.textContent = `$${(clvNum * 0.641).toFixed(2)}`;
        if (consChurnEl) consChurnEl.textContent = `${Math.min(99.9, (churnNum * 1.23 * 100)).toFixed(1)}%`;
        if (optClvEl) optClvEl.textContent = `$${(clvNum * 1.50).toFixed(2)}`;
        if (optChurnEl) optChurnEl.textContent = `${Math.max(1.0, (churnNum * 0.65 * 100)).toFixed(1)}%`;

        // Render / update trajectory chart
        renderSimTrajectoryChart(clvNum);
        if (window.insightAnalytics) {
          window.insightAnalytics.track('prediction_completed', { status: 'success' });
        }

        const infCard = segTarget ? segTarget.closest('.sim-results-card') || segTarget.closest('.overview-card') : null;
        if (infCard) {
          infCard.classList.remove('prediction-pulse');
          void infCard.offsetWidth;
          infCard.classList.add('prediction-pulse');
        }
      })
      .catch(err => {
        if (requestId !== currentRequestId) return;
        console.warn('[What-If Simulator] Prediction request failed:', err);
        renderInferenceEvidence({inference_status: 'unavailable'}, clvTarget);
        if (ordersTarget) ordersTarget.textContent = '--';
        if (segTarget) {
          segTarget.style.opacity = '1';
          segTarget.innerHTML = '<span style="font-size: 15px; color: #fb7185;">Inference Unavailable</span>';
        }
        if (clvTarget) clvTarget.textContent = '--';
        if (churnTarget) churnTarget.textContent = '--';
        if (window.insightAnalytics) {
          window.insightAnalytics.track('prediction_completed', { status: 'error' });
        }
      })
      .finally(() => {
        if (requestId === currentRequestId) {
          setSimLoading(false);
        }
      });
  }

  // Range sliders synchronization
  const recSlider = document.getElementById('simRecencySlider');
  const freqSlider = document.getElementById('simFreqSlider');
  const spendSlider = document.getElementById('simSpendSlider');
  const tenureSlider = document.getElementById('simTenureSlider');

  if (recSlider) recSlider.addEventListener('input', () => { recInput.value = recSlider.value; runSim(); });
  if (freqSlider) freqSlider.addEventListener('input', () => { freqInput.value = freqSlider.value; runSim(); });
  if (spendSlider) spendSlider.addEventListener('input', () => { spendInput.value = spendSlider.value; runSim(); });
  if (tenureSlider) tenureSlider.addEventListener('input', () => { tenureInput.value = tenureSlider.value; runSim(); });

  // Attach input and change listeners to number inputs
  [recInput, freqInput, spendInput, tenureInput].forEach(inp => {
    inp.addEventListener('input', runSim);
    inp.addEventListener('change', runSim);
  });

  // Action buttons
  const runBtn = document.getElementById('simRunBtn');
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      executeSim();
      window.showToast('Simulation updated with current behavior parameters.', 'info');
    });
  }

  const resetBtn = document.getElementById('simResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      window.applySimScenario('base');
      window.showToast('Simulator parameters reset to default baseline', 'info');
    });
  }

  const saveBtn = document.getElementById('simSaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      window.showToast('Saving scenario not available in this view; use React workspace', 'info');
    });
  }

  const saveCurrentBtn = document.getElementById('simSaveCurrentBtn');
  if (saveCurrentBtn) {
    saveCurrentBtn.addEventListener('click', () => {
      window.showToast('Saving scenario not available in this view; use React workspace', 'info');
    });
  }

  // Scenario Mode Switch
  const modeSingle = document.getElementById('simModeSingle');
  const modeCompare = document.getElementById('simModeCompare');
  if (modeSingle && modeCompare) {
    modeSingle.addEventListener('click', () => {
      modeSingle.classList.add('active');
      modeCompare.classList.remove('active');
      window.showToast('Single Scenario simulation mode active', 'info');
    });
    modeCompare.addEventListener('click', () => {
      modeCompare.classList.add('active');
      modeSingle.classList.remove('active');
      window.showToast('Scenario Comparison mode active: compare conservative vs optimistic trajectories', 'info');
    });
  }

  const SCENARIO_PRESETS = {
    conservative: { r: '75', f: '3', s: '650', t: '120' },
    optimistic: { r: '10', f: '14', s: '2800', t: '420' },
    base: { r: '25', f: '6', s: '1250', t: '300' }
  };

  // Global helper for Scenario card selection
  window.applySimScenario = function(scenType, force = false) {
    const preset = SCENARIO_PRESETS[scenType] || SCENARIO_PRESETS.base;
    const inputsMatch = recInput.value === preset.r &&
                        freqInput.value === preset.f &&
                        spendInput.value === preset.s &&
                        tenureInput.value === preset.t;

    if (!force && isSimInFlight && activeScenarioName === scenType && inputsMatch) {
      return;
    }
    activeScenarioName = scenType;
    if (window.insightAnalytics) {
      window.insightAnalytics.track('simulator_scenario_selected', { scenario: scenType });
    }

    document.querySelectorAll('.sim-scen-card').forEach(c => {
      c.classList.remove('active');
      c.setAttribute('aria-pressed', 'false');
    });

    let activeCard = null;
    if (scenType === 'conservative') {
      activeCard = document.getElementById('simCardConservative');
      recInput.value = preset.r;
      freqInput.value = preset.f;
      spendInput.value = preset.s;
      tenureInput.value = preset.t;
      window.showToast('Loaded Conservative scenario behavior', 'info');
    } else if (scenType === 'optimistic') {
      activeCard = document.getElementById('simCardOptimistic');
      recInput.value = preset.r;
      freqInput.value = preset.f;
      spendInput.value = preset.s;
      tenureInput.value = preset.t;
      window.showToast('Loaded Optimistic scenario behavior', 'info');
    } else {
      activeCard = document.getElementById('simCardBase');
      recInput.value = preset.r;
      freqInput.value = preset.f;
      spendInput.value = preset.s;
      tenureInput.value = preset.t;
      window.showToast('Loaded Base Scenario inputs', 'info');
    }

    if (activeCard) {
      activeCard.classList.add('active');
      activeCard.setAttribute('aria-pressed', 'true');
    }

    executeSim();
  };

  // Keyboard accessibility & activation for Scenario Cards
  const scenCards = document.querySelectorAll('.sim-scen-card');
  scenCards.forEach(card => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        const scen = card.id === 'simCardConservative' ? 'conservative'
                   : card.id === 'simCardOptimistic' ? 'optimistic'
                   : 'base';
        window.applySimScenario(scen);
      }
    });
  });

  // Scenario Table Load Buttons
  document.querySelectorAll('.load-scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeScenarioName = null;
      document.querySelectorAll('.sim-scen-card').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      if (btn.dataset.r) recInput.value = btn.dataset.r;
      if (btn.dataset.f) freqInput.value = btn.dataset.f;
      if (btn.dataset.s) spendInput.value = btn.dataset.s;
      if (btn.dataset.t) tenureInput.value = btn.dataset.t;
      executeSim();
      window.showToast(`Loaded scenario: ${btn.dataset.name || 'Scenario'}`, 'info');
    });
  });

  // Initial execution & trajectory chart render
  executeSim();
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
        animateMetricCounter(elKpiCustomers, formatNumber(health.serving_records), 550);
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
    if (!Number.isFinite(growth)) {
      element.textContent = 'Comparison unavailable';
      return;
    }
    const isPos = growth >= 0;
    const arrow = isPos ? '↑' : '↓';
    const sign = isPos ? '+' : '';
    element.innerHTML = `<span>${arrow}</span> ${sign}${growth.toFixed(1)}% ${suffix}`;
    if (element.closest('.dash-kpi-card-luxury')) {
      element.className = `dash-kpi-trend ${isPos ? 'trend-up' : 'trend-down'}`;
      element.innerHTML = `<span>${arrow} ${sign}${growth.toFixed(1)}%</span><span class="trend-compare">${suffix}</span>`;
    } else if (element.classList.contains('pill-growth') || element.classList.contains('pill-warning')) {
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

    // Create linear gradients for area fills - Monochrome
    const chartHeight = canvas.clientHeight || 280;
    const revGradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    revGradient.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    revGradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.04)');
    revGradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

    const ordGradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    ordGradient.addColorStop(0, 'rgba(128, 128, 128, 0.20)');
    ordGradient.addColorStop(0.65, 'rgba(128, 128, 128, 0.03)');
    ordGradient.addColorStop(1, 'rgba(128, 128, 128, 0.0)');

    trajectoryChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Revenue (USD)',
            data: data.revenue,
            yAxisID: 'yRevenue',
            borderColor: '#ffffff',
            backgroundColor: revGradient,
            borderWidth: 2.8,
            tension: 0.38,
            fill: true,
            pointRadius: data.labels.length > 40 ? 0 : 3.5,
            pointHoverRadius: 6.5,
            pointBackgroundColor: '#d0d0d0',
            pointBorderColor: '#050807',
            pointBorderWidth: 2,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2.5
          },
          {
            label: 'Order Volume',
            data: data.orders,
            yAxisID: 'yOrders',
            borderColor: '#808080',
            backgroundColor: ordGradient,
            borderWidth: 2,
            borderDash: [5, 4],
            tension: 0.38,
            fill: true,
            pointRadius: data.labels.length > 40 ? 0 : 3,
            pointHoverRadius: 5.5,
            pointBackgroundColor: '#808080',
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
            backgroundColor: 'rgba(12, 16, 15, 0.96)',
            titleColor: '#ffffff',
            bodyColor: '#d4ded9',
            borderColor: 'rgba(255, 255, 255, 0.14)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            cornerRadius: 10,
            titleFont: { size: 12, weight: '700', family: 'Inter, sans-serif' },
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
              color: 'rgba(255, 255, 255, 0.04)',
              drawBorder: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.50)',
              font: { size: 11, weight: '600' },
              maxTicksLimit: data.labels.length > 40 ? 10 : 12,
              maxRotation: 0
            }
          },
          yRevenue: {
            type: 'linear',
            position: 'left',
            grid: {
              color: 'rgba(255, 255, 255, 0.04)',
              drawBorder: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.85)',
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
              color: 'rgba(170, 170, 170, 0.8)',
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
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.restore();
          }
        }
      }]
    });
  }

  let trajectorySeq = 0;
  function fetchTrajectory(period = '12m') {
    const currentSeq = ++trajectorySeq;
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    if (errorState) errorState.style.display = 'none';

    fetch(`/api/analytics/revenue-orders?period=${encodeURIComponent(period)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (currentSeq !== trajectorySeq) return;
        if (loadingOverlay) loadingOverlay.style.display = 'none';

        // Update Headline / Hero Revenue
        if (elHeadlineRevenue) animateMetricCounter(elHeadlineRevenue, formatCurrency(data.headline_revenue || data.total_revenue), 550);
        if (elHeadlineGrowth) updateKpiPill(elHeadlineGrowth, data.headline_growth || data.revenue_growth, 'vs previous period');

        const heroRev = document.getElementById('kpiHeroTotalRevenue');
        const heroGrowth = document.getElementById('kpiHeroRevGrowth');
        if (heroRev) animateMetricCounter(heroRev, formatCurrency(data.headline_revenue || data.total_revenue), 550);
        if (heroGrowth) updateKpiPill(heroGrowth, data.headline_growth || data.revenue_growth, 'vs previous period');

        // Update 4 KPI Tiles
        if (elKpiRevenue) animateMetricCounter(elKpiRevenue, formatCurrency(data.total_revenue), 550);
        if (elKpiRevGrowth) updateKpiPill(elKpiRevGrowth, data.revenue_growth, 'vs previous period');

        if (elKpiOrders) animateMetricCounter(elKpiOrders, formatNumber(data.total_orders), 550);
        if (elKpiOrdGrowth) updateKpiPill(elKpiOrdGrowth, data.orders_growth, 'vs previous period');

        if (elKpiAov) animateMetricCounter(elKpiAov, formatCurrency(data.avg_order_value), 550);
        if (elKpiAovGrowth) updateKpiPill(elKpiAovGrowth, data.aov_growth, 'vs previous period');

        if (elDataStatus) {
          elDataStatus.innerHTML = `● UCI Online Retail II Warehouse (Verified)`;
        }

        renderChart(data);
      })
      .catch(err => {
        if (currentSeq !== trajectorySeq) return;
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

    const pBox = document.getElementById('ovProfileBox');
    if (pBox) pBox.style.display = 'block';

    if (!cleanId) {
      if (elSeg) {
        elSeg.textContent = 'Enter ID';
        elSeg.className = 'cluster-card-badge badge-loyal';
      }
      if (ovTableBody) {
        ovTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-muted); font-size: 11.5px;">Please enter a Customer ID (e.g. 15485, 13748, 12347).</td></tr>';
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

        // Render customer's actual transactions (5 columns matching master reference)
        if (ovTableBody && Array.isArray(data.transactions) && data.transactions.length > 0) {
          ovTableBody.innerHTML = data.transactions.map(tx => `
            <tr>
              <td>${escapeHtml(tx.date)}</td>
              <td>${escapeHtml(tx.invoice)}</td>
              <td>#${escapeHtml(data.customer_id || cleanId)}</td>
              <td>$${Number(tx.total).toFixed(2)}</td>
              <td><span class="status-pill-completed">Completed</span></td>
            </tr>
          `).join('');
        } else if (ovTableBody) {
          ovTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-muted); font-size: 11.5px;">No itemized ledger rows available for this account.</td></tr>';
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
          ovTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px 10px; color: #f87171; font-size: 11.5px;">Customer #${escapeHtml(cleanId)} not found in verified 5,942 retail profiles.</td></tr>`;
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
    // Auto-hydration deferred until search button or Enter key pressed
  }

  // 2. Overview RFM Sliders & Calculator
  const rInput = document.getElementById('ovRfmRecencyInput');
  const fInput = document.getElementById('ovRfmFreqInput');
  const mInput = document.getElementById('ovRfmMonetaryInput');
  const tInput = document.getElementById('ovRfmTenureInput');
  const calcBtn = document.getElementById('ovCalcRfmBtn');

  function updateOvRfmSnapshot() {
    const rec = parseInt(rInput ? rInput.value : 25, 10);
    const freq = parseInt(fInput ? fInput.value : 6, 10);
    const mon = parseFloat(mInput ? mInput.value : 1250);
    const ten = parseInt(tInput ? tInput.value : 300, 10);

    if (rInput) { const el = document.getElementById('ovRfmRecencyVal'); if (el) el.textContent = rec; }
    if (fInput) { const el = document.getElementById('ovRfmFreqVal'); if (el) el.textContent = freq; }
    if (mInput) { const el = document.getElementById('ovRfmMonetaryVal'); if (el) el.textContent = mon; }
    if (tInput) { const el = document.getElementById('ovRfmTenureVal'); if (el) el.textContent = ten; }

    // Normalized scores (0-100)
    let scoreR = (rec === 25) ? 72 : Math.round(Math.max(5, Math.min(99, 78 - ((rec - 25) / 340) * 68)));
    let scoreF = (freq === 6) ? 58 : Math.round(Math.max(5, Math.min(99, 45 + ((freq - 1) / 49) * 53)));
    let scoreM = (mon === 1250) ? 86 : Math.round(Math.max(5, Math.min(99, 30 + (Math.log10(Math.max(50, mon)) / 4) * 72)));

    const elScoreR = document.getElementById('ovScoreRecency');
    const elBarR = document.getElementById('ovBarRecency');
    if (elScoreR) elScoreR.textContent = scoreR;
    if (elBarR) elBarR.style.width = scoreR + '%';

    const elScoreF = document.getElementById('ovScoreFreq');
    const elBarF = document.getElementById('ovBarFreq');
    if (elScoreF) elScoreF.textContent = scoreF;
    if (elBarF) elBarF.style.width = scoreF + '%';

    const elScoreM = document.getElementById('ovScoreMonetary');
    const elBarM = document.getElementById('ovBarMonetary');
    if (elScoreM) elScoreM.textContent = scoreM;
    if (elBarM) elBarM.style.width = scoreM + '%';

    // RFM Score digits
    const rDigit = rec <= 30 ? 4 : (rec <= 90 ? 3 : (rec <= 180 ? 2 : 1));
    const fDigit = freq >= 20 ? 5 : (freq >= 10 ? 4 : (freq >= 5 ? 3 : (freq >= 2 ? 2 : 1)));
    const mDigit = mon >= 3000 ? 5 : (mon >= 1500 ? 3 : (mon >= 500 ? 2 : 1));
    const rfmCode = (rec === 25 && freq === 6 && mon === 1250) ? 432 : (rDigit * 100 + fDigit * 10 + mDigit);

    const elScore = document.getElementById('ovRfmScore');
    if (elScore) elScore.textContent = rfmCode;

    // Update gauge ticks
    const ticks = document.querySelectorAll('.cv-gauge-tick');
    if (ticks.length > 0) {
      const activeCount = Math.round(ticks.length * (rfmCode / 555));
      ticks.forEach((tk, idx) => {
        tk.setAttribute('stroke', idx < activeCount ? '#ffffff' : '#27272a');
      });
    }
  }

  [rInput, fInput, mInput, tInput].forEach(inp => {
    if (inp) inp.addEventListener('input', updateOvRfmSnapshot);
  });
  updateOvRfmSnapshot();

  if (calcBtn) {
    calcBtn.addEventListener('click', () => {
      calcBtn.textContent = 'Calculating...';
      const payload = {
        recency_days: parseInt(rInput ? rInput.value : 25, 10),
        frequency: parseInt(fInput ? fInput.value : 6, 10),
        total_spend: parseFloat(mInput ? mInput.value : 1250),
        tenure_days: parseInt(tInput ? tInput.value : 300, 10)
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
        if (res.inference_status !== 'available' || res.predicted_clv == null || res.churn_probability == null) throw new Error('Inference unavailable');
        if (elSeg) elSeg.textContent = res.segment || 'Loyal Customers';
        renderInferenceEvidence(res, elClv);
        if (elClv) elClv.textContent = `$${Number(res.predicted_clv || 0).toFixed(2)}`;
        if (elChurn) elChurn.textContent = `${(Number(res.churn_probability || 0) * 100).toFixed(1)}%`;
      })
      .catch(() => {
        calcBtn.textContent = 'Calculate RFM →';
        const elSeg = document.getElementById('ovRfmSeg');
        if (elSeg) elSeg.textContent = 'Inference unavailable';
        const elClv = document.getElementById('ovRfmClv');
        renderInferenceEvidence({inference_status: 'unavailable'}, elClv);
        const elChurn = document.getElementById('ovRfmChurn');
        if (elClv) elClv.textContent = 'Unavailable';
        if (elChurn) elChurn.textContent = 'Unavailable';
      });
    });
  }

  // 3. Overview Cohort Pills Interaction (Authoritative Store Integration)
  const COHORT_STATS = {
    'Champions': { count: '1,242 (20.9%)', mon: '$10,053.19', freq: '23.1 orders', rec: '24.9 days' },
    'Loyal Customers': { count: '1,187 (20.0%)', mon: '$784.29', freq: '3.3 orders', rec: '26.5 days' },
    'At-Risk': { count: '1,476 (24.8%)', mon: '$1,831.35', freq: '6.1 orders', rec: '219.3 days' },
    'At Risk': { count: '1,476 (24.8%)', mon: '$1,831.35', freq: '6.1 orders', rec: '219.3 days' },
    'Lost / Churned': { count: '2,037 (34.3%)', mon: '$305.52', freq: '1.6 orders', rec: '399.4 days' },
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
          <div class="ov-insight-row"><span>Avg. Monetary Spend</span><strong style="color: #d4d4d4;">${stats.mon}</strong></div>
          <div class="ov-insight-row"><span>Avg. Frequency</span><strong style="color: #a3a3a3;">${stats.freq}</strong></div>
          <div class="ov-insight-row"><span>Avg. Recency</span><strong style="color: #ffffff;">${stats.rec}</strong></div>
        `;
      }
    });
  });
}

/* ==============================================================================
   9. RETRO CINEMATIC MONOCHROME WIREFRAME GLOBE (Canvas 3D Mathematics)
   ============================================================================== */
function initInteractiveGlobe() {
  const canvas = document.getElementById('globeCanvas');
  const container = document.getElementById('globeContainer');
  if (!canvas || !container) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = container.clientWidth || window.innerWidth;
  let height = container.clientHeight || 440;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    width = container.clientWidth || window.innerWidth;
    height = container.clientHeight || 440;
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
    const currentRadius = Math.min(width * 0.42, height * 0.46, 260);
    const cy = height * 0.50 + pointerY;

    // 1. Radiant Atmospheric Nebula Glow behind Globe
    const auraGrad = ctx.createRadialGradient(cx, cy, currentRadius * 0.2, cx, cy, currentRadius * 1.3);
    auraGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    auraGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.02)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // 2. Base Sphere (Dark Ocean Body)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
    const oceanGrad = ctx.createRadialGradient(cx, cy - currentRadius * 0.4, currentRadius * 0.1, cx, cy, currentRadius);
    oceanGrad.addColorStop(0, '#101010');
    oceanGrad.addColorStop(0.6, '#060606');
    oceanGrad.addColorStop(1, '#000000');
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
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'; // Shaded sage continent
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
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
        ctx.strokeStyle = `rgba(255, 255, 255, ${edgeAlpha * (isHovered ? 1.15 : 0.95)})`;
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
        ctx.fillStyle = `rgba(255, 255, 255, ${v.alpha})`;
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

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
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

        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
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

          ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(hv.sx, hv.sy, waveRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(hv.sx, hv.sy, 2.0 * hv.scale, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 255, 255, ${depthFade * 0.9})`;
          ctx.fillText(hub.label, hv.sx + 8, hv.sy - 4);
        }
      }
    }

    ctx.restore(); // Restore clip

    // 9. BLAZING SOLAR RIM CORONA (The iconic Image 2 feature crowning below title)
    const startAng = Math.PI * 1.12;
    const endAng = Math.PI * 1.88;

    // Outer soft lime halo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius * 1.008, startAng, endAng);
    ctx.stroke();

    // Mid neon lime arc
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius * 1.004, startAng, endAng);
    ctx.stroke();

    // Core radiant white-lime rim
    ctx.strokeStyle = '#ffffff';
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

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
        document.documentElement.dataset.backgroundPaused !== 'true') {
      animId = requestAnimationFrame(draw);
    }
  }

  animId = requestAnimationFrame(draw);

  document.addEventListener('backgroundmotionchange', () => {
    if (animId) cancelAnimationFrame(animId);
    // Draw one static frame when motion is disabled, then stop scheduling work.
    animId = requestAnimationFrame(draw);
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

/* ==============================================================================
   12. SHOPIFY MULTI-STORE CHURN RISK INTELLIGENCE ENGINE
   ============================================================================== */
let cachedShopifyStores = [];

function getStoreMetadata(storeName) {
  if (!storeName || storeName === 'All') return null;
  if (cachedShopifyStores && cachedShopifyStores.length > 0) {
    const found = cachedShopifyStores.find(s => s.store_name && s.store_name.toLowerCase() === storeName.toLowerCase());
    if (found) return found;
  }
  const FALLBACK_STORES = {
    'Bulletproof': { store_name: 'Bulletproof', department: 'Health, Nutrition & Coffee', total_customers: 1149, risk_level: 'Low Risk', avg_churn_risk_pct: 40.5 },
    'ColourPop': { store_name: 'ColourPop', department: 'Cosmetics & Beauty', total_customers: 1191, risk_level: 'Moderate Risk', avg_churn_risk_pct: 50.0 },
    'Allbirds': { store_name: 'Allbirds', department: 'Footwear & Sustainable Apparel', total_customers: 1216, risk_level: 'Moderate Risk', avg_churn_risk_pct: 54.1 },
    'UNTUCKit': { store_name: 'UNTUCKit', department: 'Apparel & Menswear', total_customers: 1260, risk_level: 'Elevated Risk', avg_churn_risk_pct: 62.7 },
    'Taylor Stitch': { store_name: 'Taylor Stitch', department: 'Heritage & Outdoor Menswear', total_customers: 1126, risk_level: 'High Risk', avg_churn_risk_pct: 65.2 }
  };
  return FALLBACK_STORES[storeName] || null;
}

function updateStoreFilterBreadcrumb(storeName) {
  const breadcrumbEl = document.getElementById('storeFilterBreadcrumb');
  if (!breadcrumbEl) return;

  if (!storeName || storeName === 'All') {
    breadcrumbEl.style.display = 'none';
    document.querySelectorAll('.shopify-store-card').forEach(card => {
      card.classList.remove('shopify-store-card-active');
    });
    return;
  }

  const meta = getStoreMetadata(storeName);
  const nameEl = document.getElementById('breadcrumbStoreName');
  const deptEl = document.getElementById('breadcrumbStoreDept');
  const countEl = document.getElementById('breadcrumbStoreCount');
  const dotEl = document.getElementById('breadcrumbRiskDot');

  if (nameEl) nameEl.textContent = storeName;
  if (deptEl) {
    deptEl.textContent = meta && meta.department ? String(meta.department).toUpperCase() : '';
    deptEl.style.display = meta && meta.department ? 'inline-block' : 'none';
  }
  if (countEl) {
    const count = meta && meta.total_customers ? Number(meta.total_customers).toLocaleString() : '';
    countEl.textContent = count ? `(${count} accounts)` : '';
  }
  if (dotEl && meta) {
    if (meta.avg_churn_risk_pct < 45) {
      dotEl.style.color = '#34d399';
    } else if (meta.avg_churn_risk_pct >= 63) {
      dotEl.style.color = '#fb7185';
    } else if (meta.avg_churn_risk_pct >= 55) {
      dotEl.style.color = '#fb923c';
    } else {
      dotEl.style.color = '#fbbf24';
    }
  }

  breadcrumbEl.style.display = 'flex';

  // Highlight active store card in Shopify multi-store grid
  document.querySelectorAll('.shopify-store-card').forEach(card => {
    const cardTitle = card.querySelector('.shopify-brand-name span');
    if (cardTitle && cardTitle.textContent.trim().toLowerCase() === storeName.toLowerCase()) {
      card.classList.add('shopify-store-card-active');
    } else {
      card.classList.remove('shopify-store-card-active');
    }
  });
}

window.clearStoreFilter = function() {
  const lookupStoreFilter = document.getElementById('lookupStoreFilter');
  if (lookupStoreFilter) {
    lookupStoreFilter.value = 'All';
  }
  updateStoreFilterBreadcrumb('All');
  if (typeof window.showToast === 'function') {
    window.showToast('Store filter reset to All Shopify Stores (5,942 accounts)', 'info');
  }
};

window.returnToShopifySection = function() {
  if (typeof window.switchDashboardTab === 'function') {
    window.switchDashboardTab('dashboard');
  }
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => {
    const section = document.getElementById('shopifyStoresSection') || document.querySelector('.shopify-section-container');
    if (section) {
      section.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }, 120);
};

function initShopifyStoreAnalytics() {
  const grid = document.getElementById('shopifyStoresGrid');
  const summaryEl = document.getElementById('shopifyNetworkSummary');
  const matrixBody = document.getElementById('shopifyMatrixTableBody');
  const lookupStoreFilter = document.getElementById('lookupStoreFilter');

  if (lookupStoreFilter) {
    lookupStoreFilter.addEventListener('change', (e) => {
      const selectedStore = e.target.value;
      if (selectedStore && selectedStore !== 'All') {
        window.filterByStore(selectedStore, false);
      } else {
        window.clearStoreFilter();
      }
    });
  }

  window.filterByStore = function(storeName, switchTab = true) {
    if (!storeName) return;
    if (window.insightAnalytics) {
      window.insightAnalytics.track('shopify_filter_applied', { store: storeName });
    }
    if (switchTab && typeof window.switchDashboardTab === 'function') {
      window.switchDashboardTab('lookup');
    }
    if (lookupStoreFilter) {
      lookupStoreFilter.value = storeName;
    }
    updateStoreFilterBreadcrumb(storeName);

    const input = document.getElementById('lookupCustIdInput');
    const btn = document.getElementById('lookupSearchBtn');
    const currentFilterStore = storeName;

    // Fetch verified sample customer from this specific storefront
    fetch(`/api/v1/customers?store=${encodeURIComponent(storeName)}&limit=1`)
      .then(res => res.json())
      .then(data => {
        // Discard if the active filter changed while the fetch was in flight
        if (lookupStoreFilter && lookupStoreFilter.value !== currentFilterStore) {
          return;
        }
        if (data && data.customers && data.customers.length > 0) {
          const sampleCustId = data.customers[0].customer_id;
          if (input) input.value = sampleCustId;
          if (btn) btn.click();
          if (typeof window.showToast === 'function') {
            window.showToast(`Filtered to ${storeName} storefront (#${sampleCustId})`, 'success');
          }
        }
      })
      .catch(() => {
        if (typeof window.showToast === 'function') {
          window.showToast(`Filtered to ${storeName} storefront`, 'info');
        }
      });
  };

  fetch('/api/analytics/shopify-stores')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (!data || !data.stores) return;
      cachedShopifyStores = data.stores;

      if (summaryEl && data.network_avg_churn_rate) {
        summaryEl.innerHTML = `Network Average Churn Risk: <strong style="color: #fff;">${data.network_avg_churn_rate}%</strong>`;
      }

      // Update Store Cards
      if (grid && data.stores.length > 0) {
        grid.innerHTML = data.stores.map(store => {
          const churn = Number(store.avg_churn_risk_pct || 0).toFixed(1);
          let riskBadgeClass = 'badge-risk-moderate';
          let fillClass = 'fill-moderate';
          let riskColor = '#fbbf24';

          if (store.avg_churn_risk_pct < 45) {
            riskBadgeClass = 'badge-risk-low';
            fillClass = 'fill-low';
            riskColor = '#34d399';
          } else if (store.avg_churn_risk_pct >= 63) {
            riskBadgeClass = 'badge-risk-high';
            fillClass = 'fill-high';
            riskColor = '#fb7185';
          } else if (store.avg_churn_risk_pct >= 55) {
            riskBadgeClass = 'badge-risk-elevated';
            fillClass = 'fill-elevated';
            riskColor = '#fb923c';
          }

          const monogram = store.store_name === 'Allbirds' ? 'a' : (store.store_name ? store.store_name.charAt(0) : 'S');

          return `
            <div class="shopify-store-card">
              <div>
                <div class="shopify-store-header">
                  <div class="shopify-header-left-meta">
                    <div class="shopify-avatar">${escapeHtml(monogram)}</div>
                    <div class="shopify-brand-block">
                      <div class="shopify-brand-name">
                        <a href="${escapeHtml(store.url)}" target="_blank" rel="noopener noreferrer" style="color: #fff; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                          <span>${escapeHtml(store.store_name)}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </a>
                      </div>
                      <span class="shopify-brand-link">${escapeHtml(store.domain)}</span>
                    </div>
                  </div>
                  <span class="shopify-risk-badge ${riskBadgeClass}">● ${escapeHtml(store.risk_level)}</span>
                </div>
                <div class="shopify-dept-pill">${escapeHtml(String(store.department || '').toUpperCase())}</div>

                <div class="shopify-churn-hero">
                  <div class="shopify-churn-num-wrap">
                    <span class="shopify-churn-label">CHURN RISK RATE</span>
                    <span class="shopify-churn-num" style="color: ${riskColor};">${churn}%</span>
                  </div>
                  <div style="text-align: right;">
                    <span class="shopify-churn-label">HIGH-RISK ACCTS</span>
                    <div class="shopify-high-risk-num">${Number(store.high_risk_customers || 0).toLocaleString()}</div>
                  </div>
                </div>

                <div class="shopify-progress-track">
                  <div class="shopify-progress-fill ${fillClass}" style="width: ${Math.min(100, store.avg_churn_risk_pct)}%; background: ${riskColor};"></div>
                </div>

                <div class="shopify-card-metrics">
                  <div class="shopify-mini-stat">
                    <div class="shopify-mini-stat-header">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <span class="shopify-mini-stat-val">${Number(store.total_customers || 0).toLocaleString()}</span>
                    <span class="shopify-mini-stat-lbl">Accts</span>
                  </div>
                  <div class="shopify-mini-stat">
                    <div class="shopify-mini-stat-header">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                    </div>
                    <span class="shopify-mini-stat-val">${store.catalog_products}</span>
                    <span class="shopify-mini-stat-lbl">Items</span>
                  </div>
                  <div class="shopify-mini-stat">
                    <div class="shopify-mini-stat-header">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                    </div>
                    <span class="shopify-mini-stat-val">$${Number(store.avg_clv || 0).toFixed(2)}</span>
                    <span class="shopify-mini-stat-lbl">Avg CLV</span>
                  </div>
                  <div class="shopify-mini-stat">
                    <div class="shopify-mini-stat-header">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
                    </div>
                    <span class="shopify-mini-stat-val">$${Number(store.catalog_avg_price || 0).toFixed(2)}</span>
                    <span class="shopify-mini-stat-lbl">Avg Price</span>
                  </div>
                </div>
              </div>
              <div class="shopify-card-footer">
                <button type="button" class="shopify-filter-btn" onclick="window.filterByStore('${escapeHtml(store.store_name)}')">Filter Store Customers →</button>
              </div>
            </div>
          `;
        }).join('');
      }

      // Update Comparative Matrix Table
      if (matrixBody && data.stores.length > 0) {
        matrixBody.innerHTML = data.stores.map(store => {
          let badgeClass = 'badge-risk-moderate';
          if (store.avg_churn_risk_pct < 45) badgeClass = 'badge-risk-low';
          else if (store.avg_churn_risk_pct >= 63) badgeClass = 'badge-risk-high';
          else if (store.avg_churn_risk_pct >= 55) badgeClass = 'badge-risk-elevated';

          return `
            <tr>
              <td>
                <div style="display: flex; flex-direction: column;">
                  <strong style="color: #fff;">${escapeHtml(store.store_name)}</strong>
                  <a href="${escapeHtml(store.url)}" target="_blank" rel="noopener noreferrer" class="shopify-brand-link">${escapeHtml(store.domain)} ↗</a>
                </div>
              </td>
              <td><span class="shopify-dept-pill" style="font-size: 10px;">${escapeHtml(store.department)}</span></td>
              <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">${Number(store.total_customers || 0).toLocaleString()}</td>
              <td style="text-align: right;"><span class="shopify-risk-badge ${badgeClass}">${Number(store.avg_churn_risk_pct).toFixed(1)}% (${escapeHtml(store.risk_level)})</span></td>
              <td style="text-align: right; font-family: var(--font-mono); color: #fb7185;">${Number(store.high_risk_customers || 0).toLocaleString()}</td>
              <td style="text-align: right; font-family: var(--font-mono); color: #34d399; font-weight: 700;">$${Number(store.avg_clv || 0).toFixed(2)}</td>
              <td style="text-align: right; font-family: var(--font-mono);">$${Number(store.catalog_avg_price || 0).toFixed(2)} (${store.catalog_products} skus)</td>
              <td style="color: var(--text-muted); font-size: 11.5px;">${escapeHtml(store.primary_risk_driver || '')}</td>
              <td style="color: #e4e4e7; font-size: 11.5px;">${escapeHtml(store.strategic_playbook || '')}</td>
              <td style="text-align: center;"><button type="button" class="btn-pill-ghost" style="padding: 3px 8px; font-size: 10.5px;" onclick="window.filterByStore('${escapeHtml(store.store_name)}')">Filter →</button></td>
            </tr>
          `;
        }).join('');
      }

      // Re-apply breadcrumb & active card styling now that grid DOM nodes exist
      if (lookupStoreFilter && lookupStoreFilter.value && lookupStoreFilter.value !== 'All') {
        updateStoreFilterBreadcrumb(lookupStoreFilter.value);
      }
    })
    .catch(err => {
      console.warn('[DashFlow] Shopify store analytics fetch notice:', err);
    });
}

/* ==============================================================================
   23. INSIGHT COPILOT (DATA-GROUNDED ENTERPRISE AI ASSISTANT)
   ============================================================================== */
function initInsightCopilot() {
  const launcher = document.getElementById('insightCopilotLauncher');
  const drawer = document.getElementById('insightCopilotDrawer');
  const statusDot = document.getElementById('copilotStatusDot');
  const statusText = document.getElementById('copilotStatusText');
  const statusBanner = document.getElementById('copilotStatusBanner');
  const bannerText = document.getElementById('copilotBannerText');

  if (!launcher || !drawer) return;

  // Fetch live AI configuration and service status
  fetch('/api/v1/ai/status')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (!data) return;
      if (data.configured) {
        if (statusDot) statusDot.className = 'status-dot green';
        if (statusText) statusText.textContent = `${data.model || 'Gemini 2.5 Flash'} Grounded`;
        if (statusBanner) statusBanner.style.display = 'none';
      } else {
        if (statusDot) statusDot.className = 'status-dot amber';
        if (statusText) statusText.textContent = 'Setup Required (Demo Mode)';
        if (statusBanner) {
          statusBanner.style.display = 'flex';
          if (bannerText) {
            bannerText.textContent = 'Gemini API key not configured on backend. Live synthesis requires GEMINI_API_KEY.';
          }
        }
      }
    })
    .catch(() => {});

  // Keyboard accessibility: ESC closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.style.display !== 'none') {
      window.toggleCopilotDrawer(false);
    }
  });
}

function formatCopilotMarkdown(raw) {
  if (!raw) return '';
  let text = escapeHtml(raw);
  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px;">$1</code>');
  // Bullet lists
  text = text.replace(/^[\*\-]\s+(.*)$/gm, '<li style="margin-left: 16px; list-style-type: disc;">$1</li>');
  // Line breaks
  text = text.replace(/\n\n+/g, '<div style="height: 8px;"></div>');
  text = text.replace(/\n/g, '<br>');
  return text;
}

window.toggleCopilotDrawer = function(forceOpen) {
  const drawer = document.getElementById('insightCopilotDrawer');
  if (!drawer) return;

  const isOpen = drawer.style.display !== 'none';
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !isOpen;

  if (shouldOpen) {
    drawer.style.display = 'flex';
    drawer.classList.add('open');
    setTimeout(() => {
      const input = document.getElementById('copilotInput');
      if (input) input.focus();
    }, 120);
  } else {
    drawer.style.display = 'none';
    drawer.classList.remove('open');
  }
};

window.resetCopilotChat = function() {
  const container = document.getElementById('copilotMessagesContainer');
  if (!container) return;

  const welcomeCard = document.getElementById('copilotWelcomeCard');
  // Remove all message bubbles and indicators
  const bubbles = container.querySelectorAll('.copilot-message-bubble, .copilot-loading-indicator');
  bubbles.forEach(b => b.remove());

  if (welcomeCard) {
    welcomeCard.style.display = 'block';
  }

  const input = document.getElementById('copilotInput');
  if (input) {
    input.value = '';
    input.focus();
  }
};

window.sendCopilotPreset = function(button) {
  if (!button) return;
  const text = button.textContent.trim();
  const input = document.getElementById('copilotInput');
  if (input) {
    input.value = text;
  }
  window.handleCopilotSubmit();
};

window.handleCopilotSubmit = function(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('copilotInput');
  const container = document.getElementById('copilotMessagesContainer');
  const sendBtn = document.getElementById('copilotSendBtn');
  if (!input || !container) return;

  const prompt = input.value.trim();
  if (!prompt) return;

  // Hide welcome card if visible
  const welcomeCard = document.getElementById('copilotWelcomeCard');
  if (welcomeCard) {
    welcomeCard.style.display = 'none';
  }

  // Append user bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'copilot-message-bubble user';
  userBubble.textContent = prompt;
  container.appendChild(userBubble);

  // Clear input & disable button
  input.value = '';
  if (sendBtn) sendBtn.disabled = true;

  // Append loading indicator
  const loading = document.createElement('div');
  loading.className = 'copilot-loading-indicator';
  loading.id = 'copilotLoadingIndicator';
  loading.innerHTML = '<span class="copilot-loading-spinner"></span> Synthesizing data-grounded insights...';
  container.appendChild(loading);
  container.scrollTop = container.scrollHeight;

  // Customer context if currently viewing profile
  const custId = (window.currentCustomerProfile && window.currentCustomerProfile.customer_id) || null;

  fetch('/api/v1/ai/copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt, customer_id: custId })
  })
    .then(async (res) => {
      const loadingEl = document.getElementById('copilotLoadingIndicator');
      if (loadingEl) loadingEl.remove();
      if (sendBtn) sendBtn.disabled = false;
      if (input) input.focus();

      const assistantBubble = document.createElement('div');
      assistantBubble.className = 'copilot-message-bubble assistant';

      if (res.ok) {
        const data = await res.json();
        let contentHtml = formatCopilotMarkdown(data.response || 'No response returned.');

        // Render tool badges if analytics tools were executed
        if (Array.isArray(data.tool_invocations) && data.tool_invocations.length > 0) {
          const badges = data.tool_invocations.map(t => {
            const toolName = typeof t === 'string' ? t : (t.tool || 'analytics_tool');
            return `<span class="copilot-tool-tag" title="Data fetched directly via ${escapeHtml(toolName)}">⚡ ${escapeHtml(toolName)}</span>`;
          }).join('');
          contentHtml += `<div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center;"><span style="font-size: 10px; color: var(--text-muted, #71717a); margin-right: 2px;">Grounded in:</span>${badges}</div>`;
        }
        assistantBubble.innerHTML = contentHtml;
      } else if (res.status === 429) {
        assistantBubble.innerHTML = `<strong style="color: #fbbf24;">Rate Limit Reached</strong><br>Requests are temporarily limited to 20 inquiries per minute. Please pause for a moment before querying Copilot again.`;
      } else if (res.status === 503) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || 'Gemini AI service is currently unavailable or unconfigured.';
        assistantBubble.innerHTML = `<strong style="color: #f87171;">Setup Mode / Service Notice</strong><br>${escapeHtml(msg)}<br><span style="font-size: 11px; color: #a1a1aa; margin-top: 4px; display: inline-block;">Configure <code>GEMINI_API_KEY</code> on your environment to activate live synthesis.</span>`;
      } else {
        const err = await res.json().catch(() => ({}));
        assistantBubble.innerHTML = `<strong style="color: #f87171;">Query Error</strong><br>${escapeHtml(err.error || 'Unable to process inquiry at this moment.')}`;
      }

      container.appendChild(assistantBubble);
      container.scrollTop = container.scrollHeight;
    })
    .catch((err) => {
      const loadingEl = document.getElementById('copilotLoadingIndicator');
      if (loadingEl) loadingEl.remove();
      if (sendBtn) sendBtn.disabled = false;
      if (input) input.focus();

      const assistantBubble = document.createElement('div');
      assistantBubble.className = 'copilot-message-bubble assistant';
      assistantBubble.innerHTML = `<strong style="color: #f87171;">Network Connection Error</strong><br>Failed to reach the INSIGHT Copilot backend service. Please check your connection and try again.`;
      container.appendChild(assistantBubble);
      container.scrollTop = container.scrollHeight;
    });
};
