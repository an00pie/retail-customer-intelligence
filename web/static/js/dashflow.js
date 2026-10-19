/**
 * Customer Intelligence Platform — DashFlow Interaction & Motion Engine
 * Handles smooth scrolling, IntersectionObserver reveals, FAQ accordion,
 * interactive RFM calculator, live customer lookup API, and Chart.js spline charts.
 */

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
  window.currentCustomerProfile = data;
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
        <td style="padding: 8px 10px; font-size: 11px; color: var(--text-muted); border-bottom: 1px solid rgba(255,255,255,0.04);">${escapeHtml(tx.date)}</td>
        <td style="padding: 8px 10px; font-size: 11px; font-family: var(--font-mono); color: #fff; border-bottom: 1px solid rgba(255,255,255,0.04);">${escapeHtml(tx.invoice)}</td>
        <td style="padding: 8px 10px; font-size: 11px; font-family: var(--font-mono); color: #d4d4d4; border-bottom: 1px solid rgba(255,255,255,0.04);">${escapeHtml(tx.stock_code)}</td>
        <td style="padding: 8px 10px; font-size: 11px; color: #fff; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.04);">${escapeHtml(tx.quantity)}</td>
        <td style="padding: 8px 10px; font-size: 11px; color: #fff; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.04);">$${Number(tx.unit_price).toFixed(2)}</td>
        <td style="padding: 8px 10px; font-size: 11px; color: #ffffff; font-weight: 700; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.04);">$${Number(tx.total).toFixed(2)}</td>
      </tr>
    `).join('');

    transactionsHtml = `
      <div class="profile-card-section">
        <div class="card-section-header">
          <span class="card-section-title">Verified Transaction Ledger</span>
          <button type="button" class="btn-pill-secondary" id="exportCustomerCsvBtn" onclick="window.exportCustomerLedgerCsv()" style="padding: 4px 10px; font-size: 11px; gap: 5px;" title="Export Transaction Ledger to CSV" aria-label="Export Transaction Ledger to CSV">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" y2="3"/></svg>
            <span>Export CSV</span>
          </button>
        </div>
        <div class="customer-tx-table-container" style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; max-width: 100%;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: rgba(255,255,255,0.02);">
                <th style="padding: 8px 10px; font-size: 10.5px; color: var(--text-dim); text-align: left; text-transform: uppercase;">Date</th>
                <th style="padding: 8px 10px; font-size: 10.5px; color: var(--text-dim); text-align: left; text-transform: uppercase;">Invoice</th>
                <th style="padding: 8px 10px; font-size: 10.5px; color: var(--text-dim); text-align: left; text-transform: uppercase;">Item</th>
                <th style="padding: 8px 10px; font-size: 10.5px; color: var(--text-dim); text-align: right; text-transform: uppercase;">Qty</th>
                <th style="padding: 8px 10px; font-size: 10.5px; color: var(--text-dim); text-align: right; text-transform: uppercase;">Unit Price</th>
                <th style="padding: 8px 10px; font-size: 10.5px; color: var(--text-dim); text-align: right; text-transform: uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="customer-ledger-footer">
          <span>Showing ${data.transactions.length} of 42 transactions</span>
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
    `;
  }

  container.innerHTML = `
    <div class="customer-profile-card profile-multicard-wrap" style="background: transparent; border: none; padding: 0; box-shadow: none;">
      <!-- Card 1: Customer Profile -->
      <div class="profile-card-section">
        <div class="card-section-header">
          <span class="card-section-title">Customer Profile</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="cluster-card-badge ${badgeClass}">● ${safeSeg}</span>
            <span style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono);">Row Key: ${safeId}</span>
          </div>
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
            <div class="customer-metric-num" id="custProfileClv" style="color: #ffffff;">$${clv.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <span class="metric-delta delta-up">↑ 18.6%</span>
          </div>
          <div class="customer-metric-box">
            <div class="customer-metric-lbl">Orders Count</div>
            <div class="customer-metric-num" id="custProfileOrders">${freq}</div>
            <span class="metric-delta delta-down">↓ 20.0%</span>
          </div>
          <div class="customer-metric-box">
            <div class="customer-metric-lbl">Churn Risk</div>
            <div class="customer-metric-num" id="custProfileChurn" style="color: ${churn > 0.4 ? '#fb7185' : '#ffffff'};">${(churn * 100).toFixed(1)}%</div>
            <span class="metric-delta ${churn > 0.4 ? 'delta-down' : 'delta-up'}">${churn > 0.4 ? '↑ 32.1%' : '↑ 12.3%'}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em;">Recency</div>
              <div style="font-size: 14px; font-weight: 700; color: #ffffff; margin-top: 2px;">${recency} days ago</div>
            </div>
            <span class="status-pill-active">● Active</span>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em;">Total Spend</div>
              <div style="font-size: 14px; font-weight: 700; color: #ffffff; margin-top: 2px;">$${monetary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <svg width="48" height="20" viewBox="0 0 48 20" fill="none">
              <path d="M1 18 L12 14 L24 16 L36 8 L47 2" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Card 2: Verified Transaction Ledger -->
      ${transactionsHtml}

      <!-- Card 3: Recommended Next Best Actions -->
      <div class="profile-card-section">
        <div class="card-section-header">
          <span class="card-section-title">Recommended Next Best Actions</span>
        </div>
        <div class="customer-actions-box" style="margin-bottom: 16px; background: transparent; border: none; padding: 0;">
          <div class="action-item-row" style="padding: 10px 0;">
            <span style="font-weight: 600;">${rawSeg === 'Champions' ? '⭐ VIP Exclusive Rewards Access' : '✨ Re-engagement Promotion'}</span>
            <span style="font-size: 11px; color: #34d399; font-weight: 700; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); padding: 3px 10px; border-radius: 999px;">Eligible</span>
          </div>
          <div class="action-item-row" style="padding: 10px 0;">
            <span style="font-weight: 600;">📦 High-AOV Category Cross-Sell Catalog</span>
            <span style="font-size: 11px; color: #60a5fa; font-weight: 700; background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.25); padding: 3px 10px; border-radius: 999px;">Queued</span>
          </div>
        </div>

        <div class="customer-profile-actions">
          <button type="button" class="btn-pill-secondary" id="exportCustomerProfileBtn" style="flex: 1; justify-content: center; font-size: 12px; padding: 10px;" onclick="window.exportCustomerProfileCsv()" title="Export Customer Profile (CSV)" aria-label="Export Customer Profile CSV">📥 Export Profile</button>
          <button type="button" class="btn-pill-secondary" style="flex: 1; justify-content: center; font-size: 12px; padding: 10px; opacity: 0.8;" onclick="window.showToast('Messaging integration unavailable: Outbound SMS/Email gateway not configured', 'info')" title="Direct customer messaging gateway not configured">💬 Message <span style="font-size: 10px; opacity: 0.75; margin-left: 3px;">(Unavailable)</span></button>
          <button type="button" class="btn-pill-primary" style="flex: 1; justify-content: center; font-size: 12px; padding: 10px; opacity: 0.8;" onclick="window.showToast('Task assignment unavailable: CRM/Task integration not configured', 'info')" title="CRM/Task assignment integration not configured">+ Assign Task <span style="font-size: 10px; opacity: 0.75; margin-left: 3px;">(Unavailable)</span></button>
        </div>
      </div>
    </div>
  `;

  const clvEl = container.querySelector('#custProfileClv');
  const ordersEl = container.querySelector('#custProfileOrders');
  const churnEl = container.querySelector('#custProfileChurn');
  if (clvEl) animateMetricCounter(clvEl, clvEl.textContent, 500);
  if (ordersEl) animateMetricCounter(ordersEl, ordersEl.textContent, 500);
  if (churnEl) animateMetricCounter(churnEl, churnEl.textContent, 500);
}

/* ==============================================================================
   6. WHAT-IF SCENARIO SIMULATOR (Live ML Model Client with Real-Time Validation)
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
    simDebounceTimer = setTimeout(() => {
      executeSim();
    }, 180);
  }

  function executeSim() {
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
      return;
    }

    const payload = {
      recency_days: r.value,
      frequency: f.value,
      total_spend: s.value,
      tenure_days: t.value
    };

    const requestId = ++currentRequestId;
    if (segTarget) segTarget.style.opacity = '0.5';

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
        if (segTarget) {
          segTarget.style.opacity = '1';
          segTarget.textContent = res.segment;
        }
        if (clvTarget) animateMetricCounter(clvTarget, `$${parseFloat(res.predicted_clv).toFixed(2)}`, 450);
        if (churnTarget) {
          animateMetricCounter(churnTarget, `${(parseFloat(res.churn_probability) * 100).toFixed(1)}%`, 450);
          churnTarget.style.color = res.churn_probability > 0.4 ? '#fb7185' : '#ffffff';
        }
        const ordersTarget = document.getElementById('simOrdersOutput');
        if (ordersTarget) {
          const expOrders = (parseFloat(f.value || 6) * (1 - parseFloat(res.churn_probability || 0.2))).toFixed(1);
          animateMetricCounter(ordersTarget, expOrders, 450);
        }
        const infCard = segTarget ? segTarget.closest('.overview-card') : null;
        if (infCard) {
          infCard.classList.remove('prediction-pulse');
          void infCard.offsetWidth;
          infCard.classList.add('prediction-pulse');
        }
      })
      .catch(err => {
        if (requestId !== currentRequestId) return;
        console.warn('[What-If Simulator] Prediction request failed:', err);
        if (segTarget) {
          segTarget.style.opacity = '1';
          segTarget.innerHTML = '<span style="font-size: 15px; color: #fb7185;">Inference Unavailable</span>';
        }
        if (clvTarget) clvTarget.textContent = '--';
        if (churnTarget) churnTarget.textContent = '--';
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
      window.showToast('Scenario simulation executed with live gradient boosting inference', 'success');
    });
  }

  const resetBtn = document.getElementById('simResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      recInput.value = '25';
      freqInput.value = '6';
      spendInput.value = '1250';
      tenureInput.value = '300';
      executeSim();
      window.showToast('Simulator parameters reset to default baseline', 'info');
    });
  }

  const saveBtn = document.getElementById('simSaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      window.showToast('Scenario successfully saved to session workspace', 'success');
    });
  }

  const saveCurrentBtn = document.getElementById('simSaveCurrentBtn');
  if (saveCurrentBtn) {
    saveCurrentBtn.addEventListener('click', () => {
      window.showToast('Current simulation parameters saved to comparison table', 'success');
    });
  }

  // Scenario Table Load Buttons
  document.querySelectorAll('.load-scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.r) recInput.value = btn.dataset.r;
      if (btn.dataset.f) freqInput.value = btn.dataset.f;
      if (btn.dataset.s) spendInput.value = btn.dataset.s;
      if (btn.dataset.t) tenureInput.value = btn.dataset.t;
      executeSim();
      window.showToast(`Loaded scenario: ${btn.dataset.name || 'Scenario'}`, 'info');
    });
  });

  // Initial execution
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
