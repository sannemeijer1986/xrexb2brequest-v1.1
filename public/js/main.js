// Helper function to get fee rate based on current page
function getFeeRate() {
  const isRequestPayment = window.location.pathname.includes('request-payment');
  return isRequestPayment ? 0.005 : 0.01; // 0.50% for request-payment, 1.00% for send-payment
}

// Service fee bounds (USD)
const MIN_SERVICE_FEE = 25;
const MAX_SERVICE_FEE = 2500;

// Helper function to calculate fees with minimum fee logic (global scope)
function calculateFees(amount, payerRate, receiverRate, feeRate) {
  // If feeRate is not provided, get it based on current page
  if (feeRate === undefined) {
    feeRate = getFeeRate();
  }
  const calculatedServiceFee = amount * feeRate;
  let actualServiceFee;
  if (amount === 0 || (calculatedServiceFee > 0 && calculatedServiceFee < MIN_SERVICE_FEE)) {
    actualServiceFee = MIN_SERVICE_FEE;
  } else if (calculatedServiceFee > MAX_SERVICE_FEE) {
    actualServiceFee = MAX_SERVICE_FEE;
  } else {
    actualServiceFee = calculatedServiceFee;
  }
  const isBelowMinimum = amount === 0 || (calculatedServiceFee > 0 && calculatedServiceFee < MIN_SERVICE_FEE);
  const isAboveMaximum = calculatedServiceFee > MAX_SERVICE_FEE;

  // Distribute the actual service fee according to fee distribution rates
  // payerRate and receiverRate are proportions of the feeRate (e.g., 0.01, 0.005, 0)
  // The total of payerRate + receiverRate always equals feeRate
  let payerFee, receiverFee;
  if (payerRate === 0 && receiverRate === 0) {
    payerFee = 0;
    receiverFee = 0;
  } else {
    // Distribute proportionally based on the ratio of each rate to the total feeRate
    payerFee = actualServiceFee * (payerRate / feeRate);
    receiverFee = actualServiceFee * (receiverRate / feeRate);
  }

  return { payerFee, receiverFee, isBelowMinimum, isAboveMaximum, actualServiceFee };
}

const PROTOTYPE_STATE_KEY = 'xrexb2b.state.v1';
const ADD_BANK_RETURN_KEY = 'xrexb2b.addBankReturnUrl';
const ADD_CUSTOMER_RETURN_KEY = 'xrexb2b.addCustomerReturnUrl';
const SEND_PAYMENT_RETURN_KEY = 'xrexb2b.sendPaymentReturnUrl';
const REQUEST_PAYMENT_RETURN_KEY = 'xrexb2b.requestPaymentReturnUrl';
const CUSTOMER_DETAILS_RETURN_KEY = 'xrexb2b.customerDetailsReturnUrl';
const PROTOTYPE_STATE_MIN = 1;
const PROTOTYPE_STATE_MAX = 6;
const PROTOTYPE_STATE_LABELS = {
  1: 'No customers',
  2: 'Customer invited',
  3: 'Customer verified',
  4: 'Awaiting payment',
  5: 'Partially paid',
  6: 'Completed',
};

const REVIEW_SUPPORT_LINK_HTML = '<a href="#" target="_blank" rel="noopener noreferrer">Contact Support</a>';
const REVIEW_INLINE_ERROR_DEFAULT = `Go back and try again, or ${REVIEW_SUPPORT_LINK_HTML} for further assistance.`;
const REVIEW_SNACKBAR_FALLBACK = 'Payment failed: No charge applied';
const REVIEW_ERROR_SCENARIOS_CONFIG = [
  {
    key: 'create-unexpected',
    title: '10001 Unexpected error (Connection timed out)',
    badgeLabel: 'Unexpected error',
    disablePrimary: true,
    snackbar: 'Payment failed: No charge applied',
  },
  {
    key: 'api-general',
    title: '10015 API error (API timed out)',
    badgeLabel: 'General API error',
    disablePrimary: true,
    snackbar: 'Payment failed: No charge applied',
  },
  {
    key: 'kyc-status',
    title: '202512 KYC status error',
    badgeLabel: 'KYC blocked',
    snackbar: 'Payment failed: No charge applied',
    disablePrimary: true,
    alertMessage: 'Your KYC status is not approved. Please complete verification before using payments.',
  },
  {
    key: 'cp-bank-invalid',
    title: '202512 Payout create failed (Receiver bank account is not valid)',
    badgeLabel: 'Bank invalid',
    snackbar: 'Payment failed: No charge applied',
    disablePrimary: true,
  },
  {
    key: 'cp-invalid',
    title: '202512 Payout create failed (Counterparty is not valid)',
    badgeLabel: 'Counterparty invalid',
    snackbar: 'Payment failed: No charge applied',
    disablePrimary: true,
  },
  {
    key: 'doc-not-found',
    title: '202512 Payout create failed (Document not found for documentUploadId: XXX)',
    badgeLabel: 'Document missing',
    snackbar: 'Payment failed: No charge applied',
    disablePrimary: true,
  },
  {
    key: 'doc-pre-required',
    title: '202512 Payout create failed (pre-shipment requires file PROFORMA_INVOICE or PURCHASE_ORDER)',
    badgeLabel: 'Pre-shipment doc',
    snackbar: 'Payment failed: No charge applied',
    disablePrimary: true,
  },
  {
    key: 'doc-post-ci',
    title: '202512 Payout create failed (post-shipment requires file COMMERCIAL_INVOICE)',
    badgeLabel: 'Commercial invoice',
    snackbar: 'Payment failed: No charge applied',
    disablePrimary: true,
  },
  {
    key: 'doc-post-transport',
    title: '202512 Payout create failed (post-shipment requires file TRANSPORT_DOCUMENT)',
    badgeLabel: 'Transport document',
    snackbar: 'Payment failed: No charge applied',
    disablePrimary: true,
  },
  {
    key: 'doc-post-packing',
    title: '202512 Payout create failed (post-shipment requires file PACKING_LIST)',
    badgeLabel: 'Packing list',
    snackbar: 'Payment failed: No charge applied',
    disablePrimary: true,
  },
  {
    key: 'order-preview-amount',
    title: '202512 Payout create failed (preview amount is not correct)',
    badgeLabel: 'Preview amount',
    snackbar: 'Payment failed: No charge applied',
    disablePrimary: true,
  },
  {
    key: 'order-preview-fee',
    title: '202512 Payout create failed (preview fee amount is not correct)',
    badgeLabel: 'Preview fee',
    snackbar: 'Payment failed: No charge applied',
    disablePrimary: true,
  },
  {
    key: 'order-payable-range',
    title: '202512 Payout create failed (payable amount should between min/max limit)',
    badgeLabel: 'Out of range',
    snackbar: 'Payment failed: No charge applied',
    disablePrimary: true,
  },
  {
    key: 'order-fee-rate',
    title: '202512 Payout create failed (fee rate is not correct)',
    badgeLabel: 'Fee rate mismatch',
    snackbar: 'Payment failed: No charge applied',
    disablePrimary: true,
  },
];

try { window.REVIEW_ERROR_SCENARIOS = REVIEW_ERROR_SCENARIOS_CONFIG; } catch (_) { }

const clampPrototypeState = (value) => {
  const safe = parseInt(value, 10);
  if (Number.isNaN(safe)) return PROTOTYPE_STATE_MIN;
  return Math.min(PROTOTYPE_STATE_MAX, Math.max(PROTOTYPE_STATE_MIN, safe));
};

let prototypeState = (() => {
  try {
    const stored = window.localStorage ? window.localStorage.getItem(PROTOTYPE_STATE_KEY) : null;
    if (stored !== null) return clampPrototypeState(stored);
  } catch (_) { }
  return PROTOTYPE_STATE_MIN;
})();

document.documentElement.dataset.prototypeState = `state-${prototypeState}`;

const prototypeStateListeners = new Set();

const notifyPrototypeStateChange = () => {
  prototypeStateListeners.forEach((listener) => {
    try { listener(prototypeState); } catch (err) { console.error(err); }
  });
  try {
    document.dispatchEvent(new CustomEvent('prototypeStateChange', { detail: { state: prototypeState } }));
  } catch (_) { }
};

function getPrototypeState() {
  return prototypeState;
}

function setPrototypeState(next, opts = {}) {
  const clamped = clampPrototypeState(next);
  if (!opts.force && clamped === prototypeState) return clamped;
  prototypeState = clamped;
  try {
    if (window.localStorage) window.localStorage.setItem(PROTOTYPE_STATE_KEY, String(clamped));
  } catch (_) { }
  document.documentElement.dataset.prototypeState = `state-${clamped}`;
  notifyPrototypeStateChange();
  return clamped;
}

function changePrototypeState(delta) {
  return setPrototypeState(getPrototypeState() + (delta || 0));
}

function onPrototypeStateChange(listener) {
  if (typeof listener !== 'function') return () => { };
  prototypeStateListeners.add(listener);
  try { listener(prototypeState); } catch (err) { console.error(err); }
  return () => prototypeStateListeners.delete(listener);
}

function getPrototypeStateLabel(value) {
  return PROTOTYPE_STATE_LABELS[value] || '';
}

try {
  window.getPrototypeState = getPrototypeState;
  window.setPrototypeState = setPrototypeState;
  window.changePrototypeState = changePrototypeState;
  window.onPrototypeStateChange = onPrototypeStateChange;
  window.getPrototypeStateLabel = getPrototypeStateLabel;
} catch (_) { }

// Global header request button dropdown (desktop only)
(function initHeaderRequestDropdown() {
  try {
    const DESKTOP_BP = 1280;
    const btn = document.getElementById('headerRequestBtn');
    const dropdown = document.getElementById('headerRequestDropdown');
    if (!btn || !dropdown) return;

    // Format date as DD/MM/YYYY, HH:MM:SS
    const formatDateTime = (date) => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
    };

    // Update date timestamp in dropdown items
    const updateRequestDates = () => {
      const dateElements = dropdown.querySelectorAll('.header__request-dropdown__item-date');
      const currentDate = formatDateTime(new Date());
      dateElements.forEach(el => {
        el.textContent = currentDate;
      });
    };

    // Update dropdown content based on state
    const updateDropdownContent = (state) => {
      const titleEl = dropdown.querySelector('.header__request-dropdown__title');
      const statusEl = dropdown.querySelector('.header__request-dropdown__item-status');
      const amountEl = dropdown.querySelector('.header__request-dropdown__item-amount');

      if (state === 2) {
        // Customer invitation requests
        if (titleEl) titleEl.textContent = 'Customer invitation requests';
        if (statusEl) statusEl.textContent = 'Awaiting response';
        // Hide payment amount at state 2
        if (amountEl) amountEl.style.display = 'none';
      } else if (state === 4 || state === 5) {
        // Payment requests
        if (titleEl) titleEl.textContent = 'Payment requests';
        if (statusEl) statusEl.textContent = 'Awaiting payment';
        // Show and populate payment amount at state 4
        if (amountEl) {
          // Remove inline style completely so CSS can control it
          amountEl.removeAttribute('style');
          // Get payment amount from receiptData
          try {
            const raw = window.sessionStorage && window.sessionStorage.getItem('receiptData');
            if (raw) {
              const data = JSON.parse(raw);
              const amount = data.amountPayableFmt || data.toBeDeducted || '-';
              amountEl.textContent = amount;
            } else {
              amountEl.textContent = '-';
            }
          } catch (_) {
            amountEl.textContent = '-';
          }
        }
      }
    };

    // Set date and update content when state becomes 2 or 4
    const handleStateChange = (state) => {
      if (state === 2 || state === 4 || state === 5) {
        updateRequestDates();
        updateDropdownContent(state);
      }
    };

    // Add click handler to dropdown items for navigation
    const item = dropdown.querySelector('.header__request-dropdown__item');
    if (item) {
      item.style.cursor = 'pointer';
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
          if (typeof getPrototypeState === 'function') {
            const state = getPrototypeState();
            if (state === 2) {
              // Real entrypoint: header request dropdown -> simplify back to home
              try {
                if (window.sessionStorage) {
                  window.sessionStorage.setItem(CUSTOMER_DETAILS_RETURN_KEY, 'index.html');
                }
              } catch (_) { }
              window.location.href = 'customer-details.html';
            } else if (state === 4 || state === 5) {
              window.location.href = 'payment-request-details.html';
            }
          }
        } catch (_) { }
      });
    }

    // Check initial state and update if already at state 2 or 4
    if (typeof getPrototypeState === 'function') {
      const currentState = getPrototypeState();
      if (currentState === 2 || currentState === 4 || currentState === 5) {
        updateRequestDates();
        updateDropdownContent(currentState);
      }
      // Listen for state changes
      if (typeof onPrototypeStateChange === 'function') {
        onPrototypeStateChange(handleStateChange);
      }
    }

    // Also update on page load/visibility change to ensure state 4 amount is visible
    const ensureState4AmountVisible = () => {
      if (typeof getPrototypeState === 'function') {
        const state = getPrototypeState();
        if (state === 4 || state === 5) {
          const amountEl = dropdown.querySelector('.header__request-dropdown__item-amount');
          if (amountEl && amountEl.hasAttribute('style')) {
            amountEl.removeAttribute('style');
          }
        }
      }
    };

    // Run on load and visibility change
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureState4AmountVisible);
    } else {
      ensureState4AmountVisible();
    }
    document.addEventListener('visibilitychange', ensureState4AmountVisible);

    // Get button text for modal title
    const getModalTitle = () => {
      const btnText = btn.querySelector('.header__request-btn__text');
      return btnText ? btnText.textContent : 'Active requests';
    };

    // Create mobile modal if it doesn't exist
    let mobileModal = document.getElementById('headerRequestModal');
    if (!mobileModal) {
      mobileModal = document.createElement('div');
      mobileModal.id = 'headerRequestModal';
      mobileModal.className = 'modal modal--dialog header__request-modal';
      mobileModal.setAttribute('aria-hidden', 'true');
      mobileModal.setAttribute('role', 'dialog');
      mobileModal.setAttribute('aria-modal', 'true');
      mobileModal.innerHTML = `
        <div class="modal__dialog">
          <div class="modal__content">
            <div class="modal__header header__request-modal__header">
              <button class="modal__close" data-modal-close aria-label="Close modal">
                <img src="assets/icon_close.svg" width="24" height="24" alt="close" />
              </button>
              <h2 class="header__request-modal__title">${getModalTitle()}</h2>
            </div>
            <div class="modal__body header__request-modal__body">
              ${dropdown.innerHTML}
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(mobileModal);

      // Wire up close button
      const closeBtn = mobileModal.querySelector('[data-modal-close]');
      if (closeBtn && typeof window.__closeModal === 'function') {
        closeBtn.addEventListener('click', () => {
          window.__closeModal(mobileModal);
        });
      }

      // Close on overlay click
      mobileModal.addEventListener('click', (e) => {
        if (e.target === mobileModal && typeof window.__closeModal === 'function') {
          window.__closeModal(mobileModal);
        }
      });

      // Add click handlers to modal items
      const modalItems = mobileModal.querySelectorAll('.header__request-dropdown__item');
      modalItems.forEach((item) => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          try {
            if (typeof getPrototypeState === 'function') {
              const state = getPrototypeState();
              if (state === 2) {
                // Real entrypoint: header request dropdown -> simplify back to home
                try {
                  if (window.sessionStorage) {
                    window.sessionStorage.setItem(CUSTOMER_DETAILS_RETURN_KEY, 'index.html');
                  }
                } catch (_) { }
                window.location.href = 'customer-details.html';
              } else if (state === 4 || state === 5) {
                window.location.href = 'payment-request-details.html';
              }
            }
          } catch (_) { }
        });
      });
    }

    // Sync modal content with dropdown content
    const syncModalContent = () => {
      if (mobileModal) {
        const modalBody = mobileModal.querySelector('.header__request-modal__body');
        const modalTitle = mobileModal.querySelector('.header__request-modal__title');
        if (modalBody) {
          modalBody.innerHTML = dropdown.innerHTML;

          // Update title
          if (modalTitle) {
            modalTitle.textContent = getModalTitle();
          }

          // Re-add click handlers to new items
          const modalItems = modalBody.querySelectorAll('.header__request-dropdown__item');
          modalItems.forEach((item) => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', (e) => {
              e.stopPropagation();
              try {
                if (typeof getPrototypeState === 'function') {
                  const state = getPrototypeState();
                  if (state === 2) {
                    // Real entrypoint: header request dropdown -> simplify back to home
                    try {
                      if (window.sessionStorage) {
                        window.sessionStorage.setItem(CUSTOMER_DETAILS_RETURN_KEY, 'index.html');
                      }
                    } catch (_) { }
                    window.location.href = 'customer-details.html';
                  } else if (state === 4 || state === 5) {
                    window.location.href = 'payment-request-details.html';
                  }
                }
              } catch (_) { }
            });
          });
        }
      }
    };

    const toggleDropdown = (e) => {
      e.stopPropagation();

      // On mobile, open modal instead
      if (window.innerWidth < DESKTOP_BP) {
        syncModalContent();
        if (typeof window.__openModal === 'function') {
          window.__openModal(mobileModal);
        }
        return;
      }

      // Desktop: show dropdown
      const isOpen = dropdown.classList.contains('is-open');

      if (isOpen) {
        dropdown.classList.remove('is-open');
      } else {
        // Close other dropdowns if any
        document.querySelectorAll('.header__request-dropdown.is-open').forEach(el => {
          if (el !== dropdown) el.classList.remove('is-open');
        });
        dropdown.classList.add('is-open');
      }
    };

    btn.addEventListener('click', toggleDropdown);

    // Sync modal content when state changes
    if (typeof onPrototypeStateChange === 'function') {
      onPrototypeStateChange(() => {
        syncModalContent();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.remove('is-open');
      }
    });

    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdown.classList.contains('is-open')) {
        dropdown.classList.remove('is-open');
      }
    });

    // Close dropdown / modal on resize when crossing breakpoints
    window.addEventListener('resize', () => {
      const isDesktop = window.innerWidth >= DESKTOP_BP;
      if (!isDesktop) {
        // Mobile/tablet: dropdown should never be open
        dropdown.classList.remove('is-open');
        return;
      }

      // Desktop: if the mobile modal is open, close it (prevents "stuck open" modal on desktop)
      try {
        if (mobileModal && mobileModal.getAttribute('aria-hidden') === 'false') {
          if (typeof window.__closeModal === 'function') window.__closeModal(mobileModal);
          else mobileModal.setAttribute('aria-hidden', 'true');
        }
      } catch (_) { }
    });
  } catch (_) { }
})();

// Global header account-chip behaviour (for all pages)
(function initAccountChipLink() {
  try {
    var chip = document.getElementById('accountChipLink');
    if (!chip) return;
    var mqDesktop = window.matchMedia('(min-width: 1280px)');
    var isDesktop = function () { return mqDesktop.matches; };
    var RETURN_KEY = 'xrexb2b.settingsReturnUrl';
    var setChipHref = function () {
      if (!chip) return;
      // Desktop: go directly to Account content, Mobile/Tablet: go to Settings menu
      chip.setAttribute('href', isDesktop() ? 'settings.html?view=content&page=account' : 'settings.html?view=menu');
    };
    setChipHref();
    mqDesktop.addEventListener('change', setChipHref);

    // Remember the page we came from so Settings can return there on Close menu
    chip.addEventListener('click', function () {
      try {
        var path = window.location.pathname || '/index.html';
        var search = window.location.search || '';
        var from = path + search;
        if (window.sessionStorage) {
          window.sessionStorage.setItem(RETURN_KEY, from);
        }
      } catch (_) { }
    });
  } catch (_) { }
})();

function initSendPayment() {
  // Mobile quick menu toggle
  const tabMenu = document.getElementById('tab-menu');
  const tabHome = document.getElementById('tab-home');
  const tabConvert = document.getElementById('tab-convert');
  const tabOTC = document.getElementById('tab-otc');
  const tabTrans = document.getElementById('tab-transactions');
  const homeView = document.getElementById('homeView');
  const quickView = document.getElementById('quickView');
  const transactionsView = document.getElementById('transactionsView');

  const setActiveTab = (btn) => {
    document.querySelectorAll('.tabbar__btn').forEach(b => {
      const icon = b.querySelector('.tabbar__icon');
      const activeSrc = icon && icon.getAttribute('data-icon-active');
      const inactiveSrc = icon && icon.getAttribute('data-icon-inactive');
      if (b === btn) {
        b.classList.add('is-active');
        if (icon && activeSrc) icon.setAttribute('src', activeSrc);
      } else {
        b.classList.remove('is-active');
        if (icon && inactiveSrc) icon.setAttribute('src', inactiveSrc);
      }
    });
  };

  const showHome = () => {
    if (homeView) homeView.hidden = false;
    if (quickView) quickView.hidden = true;
    if (transactionsView) transactionsView.hidden = true;
    hideTransactions();
  };
  const showQuick = () => {
    if (homeView) homeView.hidden = true;
    if (transactionsView) transactionsView.hidden = true;
    if (quickView) quickView.hidden = false;
    hideTransactions();
  };
  const showTransactions = () => {
    if (homeView) homeView.hidden = true;
    if (quickView) quickView.hidden = true;
    if (transactionsView) transactionsView.hidden = false;
    document.body.classList.add('transactions-active');
  };
  const hideTransactions = () => {
    document.body.classList.remove('transactions-active');
  };

  // Render shared quick actions from template into all targets
  const qaTpl = document.getElementById('quickActionsTemplate');
  const qaHeaderTpl = document.getElementById('quickActionsHeaderTemplate');
  if (qaTpl) {
    document.querySelectorAll('[data-qa-target]').forEach((host) => {
      host.innerHTML = '';
      const frag = qaTpl.content.cloneNode(true);
      host.appendChild(frag);
    });
  }
  if (qaHeaderTpl) {
    document.querySelectorAll('[data-qa-header-target]').forEach((host) => {
      host.innerHTML = '';
      const frag = qaHeaderTpl.content.cloneNode(true);
      host.appendChild(frag);
    });
  }

  // Ensure correct view when crossing responsive breakpoints
  const transactionsTemplate = document.getElementById('transactionsTemplate');

  const initTransactionsSection = (section) => {
    if (!section) return;
    const tabs = Array.from(section.querySelectorAll('.transactions__tab'));
    const panels = Array.from(section.querySelectorAll('.transactions__panel'));

    let activeTabName = 'deposit';

    const activateTab = (name) => {
      if (!name) return;
      activeTabName = name;
      tabs.forEach((btn) => {
        const tabName = btn.getAttribute('data-tab');
        btn.classList.toggle('is-active', tabName === name);
      });
      panels.forEach((panel) => {
        panel.classList.toggle('is-active', panel.getAttribute('data-panel') === name);
      });
    };

    tabs.forEach((btn) => {
      const tabName = btn.getAttribute('data-tab');
      const isDisabled = btn.hasAttribute('data-disabled');
      btn.addEventListener('click', () => {
        if (isDisabled) return;
        // Prevent "Send payment" tab from being clickable
        if (tabName === 'payment-send') return;
        if (tabName) {
          activateTab(tabName);
          try {
            if (window.sessionStorage) {
              window.sessionStorage.setItem('transactionsActiveTab', tabName);
            }
          } catch (_) { }
        }
      });
    });

    // Restore last selected tab, defaulting to deposit
    let initialTab = 'deposit';
    try {
      if (window.sessionStorage) {
        const saved = window.sessionStorage.getItem('transactionsActiveTab');
        const availableTabNames = tabs.map((btn) => btn.getAttribute('data-tab')).filter(Boolean);
        if (saved && availableTabNames.includes(saved)) {
          initialTab = saved;
        }
      }
    } catch (_) { }
    activateTab(initialTab);

    section.querySelectorAll('.transactions__item').forEach((item) => {
      const action = item.getAttribute('data-action');
      if (action === 'deposit') {
        item.addEventListener('click', () => {
          if (window.showSnackbar) window.showSnackbar('Not in prototype', 2000);
        });
      } else if (action === 'payment') {
        item.addEventListener('click', () => {
          try {
            if (window.sessionStorage) {
              const tabToPersist = activeTabName || 'payment';
              window.sessionStorage.setItem('transactionsActiveTab', tabToPersist);
              window.sessionStorage.setItem('openTransactions', '1');
              // Ensure the Payment details page "Back" crumb returns to Home
              window.sessionStorage.setItem('xrexb2b.paymentDetailsReturnUrl', 'index.html');
            }
          } catch (_) { }
          const href = item.getAttribute('data-href') || 'payment-details.html';
          window.location.href = href;
        });
      }
    });
  };

  const renderTransactions = () => {
    if (!transactionsTemplate) return;
    document.querySelectorAll('[data-transactions-target]').forEach((target) => {
      const frag = transactionsTemplate.content.cloneNode(true);
      target.innerHTML = '';
      target.appendChild(frag);
      const section = target.querySelector('.transactions');
      hydrateTransactionsFromState(section);
      initTransactionsSection(section);
    });
    if (transactionsView) {
      const frag = transactionsTemplate.content.cloneNode(true);
      transactionsView.innerHTML = '';
      transactionsView.appendChild(frag);
      const section = transactionsView.querySelector('.transactions');
      if (section) section.classList.add('transactions--full');
      hydrateTransactionsFromState(section);
      initTransactionsSection(section);
    }
  };

  const hydrateTransactionsFromState = (section) => {
    if (!section) return;
    let state = 1;
    try {
      if (typeof getPrototypeState === 'function') {
        state = getPrototypeState();
      }
    } catch (_) { }

    const paymentPanels = Array.from(section.querySelectorAll('[data-panel="payment-send"], [data-panel="payment-request"]'));
    if (!paymentPanels.length) return;

    // States 4-5: show payment row with data from receiptData
    let data = null;
    try {
      const raw = window.sessionStorage && window.sessionStorage.getItem('receiptData');
      if (raw) data = JSON.parse(raw);
    } catch (_) { }

    paymentPanels.forEach((panel) => {
      const paymentList = panel && panel.querySelector('.transactions__list');
      if (!paymentList) return;
      const li = paymentList.querySelector('.transactions__item');
      if (!li) return;
      const isSendPanel = panel.getAttribute('data-panel') === 'payment-send';
      const isRequestPanel = panel.getAttribute('data-panel') === 'payment-request';

      const titleEl = li.querySelector('.transactions__item-title');
      const amountEl = li.querySelector('.transactions__cell--amount');
      const receiveTotalEl = li.querySelector('.transactions__cell--receive-total');
      const receivedAmountCell = li.querySelector('.transactions__cell--received-amount');
      const receivedAmountValueEl = receivedAmountCell ? receivedAmountCell.querySelector('.transactions__item-purpose') : null;
      const receivedAmountTotalEl = receivedAmountCell ? receivedAmountCell.querySelector('.transactions__item-purpose-sub') : null;
      const purposeEl = li.querySelector('.transactions__cell--type .transactions__item-purpose');
      const purposeSubEl = li.querySelector('.transactions__cell--type .transactions__item-purpose-sub');
      const statusEls = li.querySelectorAll('.transactions__item-status');
      const dateCell = li.querySelector('.transactions__cell--date');
      const dateMainEl = dateCell ? dateCell.querySelector('.transactions__item-date-main') : null;
      const dateSubEl = dateCell ? dateCell.querySelector('.transactions__item-date-sub') : null;

      const setNoData = () => {
        if (titleEl) {
          titleEl.textContent = 'No data';
          titleEl.style.color = '#797A7B';
        }
        if (amountEl) amountEl.textContent = '';
        if (receiveTotalEl) receiveTotalEl.textContent = '';
        if (receivedAmountValueEl) receivedAmountValueEl.textContent = '';
        if (receivedAmountTotalEl) receivedAmountTotalEl.textContent = '';
        if (purposeEl) purposeEl.textContent = '';
        if (purposeSubEl) purposeSubEl.textContent = '';
        if (dateMainEl) dateMainEl.textContent = '';
        if (dateSubEl) dateSubEl.textContent = '';
        statusEls.forEach((el) => { if (el) el.textContent = ''; el && el.classList.remove('transactions__item-status--processing', 'transactions__item-status--completed', 'transactions__item-status--awaiting'); });
      };

      // "Send payment" panel always shows "No data", regardless of state
      if (isSendPanel) {
        setNoData();
        return;
      }

      // States 1-3: "No data"
      if (state <= 3) {
        setNoData();
        return;
      }

      if (titleEl) titleEl.style.color = '';

      if (data) {
        if (titleEl) titleEl.textContent = data.receiverName || 'NovaQuill Ltd';

        // For payment request panel: use same logic as payment-request-details page
        if (isRequestPanel) {
          // Payment amount (customer pays) - same as payment-request-details
          if (amountEl) {
            const paymentAmount = data.amountPayableFmt || data.receiverGets || '100,000.00 USD';
            amountEl.textContent = paymentAmount;
          }

          // Receive total (you receive) - same as payment-request-details
          if (receiveTotalEl) {
            const receiverGets = data.receiverGets || '100,000.00 USD';
            receiveTotalEl.textContent = receiverGets;
          }

          // Received amount - calculate based on state (same as payment-request-details)
          if (receivedAmountValueEl && receivedAmountTotalEl) {
            const receiverGets = data.receiverGets || '100,000.00 USD';
            // Parse amount (remove " USD" and commas)
            const parseAmount = (str) => {
              const num = Number(str.replace(/[^\d.]/g, ''));
              return isNaN(num) ? 0 : num;
            };
            const formatUsd = (n) => {
              try {
                return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              } catch (_) {
                return '0.00';
              }
            };
            const total = parseAmount(receiverGets);
            // State-based percentage: state 4 = 0%, state 5 = 25%, state 6 = 100%
            const pct = (state >= 6) ? 1 : (state >= 5) ? 0.25 : 0;
            const received = total * pct;
            const pctFromValue = total > 0 ? (received / total) : 0;

            // Display: "+ X USD / Y USD (Z%)"
            receivedAmountValueEl.textContent = '+ ' + formatUsd(received) + ' USD';

            // Prefer split elements when available (keeps percent styling lightweight)
            const receivedCell = receivedAmountValueEl.closest('.transactions__cell--received-amount');
            const totalEl = receivedCell ? receivedCell.querySelector('.transactions__received-total') : null;
            const pctEl = receivedCell ? receivedCell.querySelector('.transactions__received-pct') : null;
            if (totalEl && pctEl) {
              totalEl.textContent = '/ ' + receiverGets;
              pctEl.textContent = '(' + Math.round(pctFromValue * 100) + '%)';
            } else {
              receivedAmountTotalEl.textContent = '/ ' + receiverGets + ' (' + Math.round(pctFromValue * 100) + '%)';
            }
          }

          // Purpose - same as payment-request-details
          if (purposeEl) purposeEl.textContent = data.nature || 'Pre-shipment advance';
          if (purposeSubEl) purposeSubEl.textContent = data.docNumber || 'PI-001234';

          // Submission date - same as payment-request-details
          if (dateMainEl && dateSubEl) {
            const submissionDate = data.dateTime || '31/08/2022, 12:00:00';
            const [datePart, timePart] = submissionDate.split(', ');
            if (datePart) dateMainEl.textContent = datePart.trim();
            if (timePart) dateSubEl.textContent = timePart.trim();
          }
        } else {
          // For send payment panel, keep original logic
          if (amountEl) {
            amountEl.textContent = data.amountPayableFmt || '50,000.00 USD';
          }
          if (purposeEl) purposeEl.textContent = data.nature || 'Goods purchase';
          if (purposeSubEl) purposeSubEl.textContent = data.docNumber || 'PI-001234';
          if (dateMainEl && dateSubEl) {
            const dateTimeStr = data.dateTime || '25/11/2025, 15:19:09';
            const [datePart, timePart] = dateTimeStr.split(', ');
            if (datePart) dateMainEl.textContent = datePart.trim();
            if (timePart) dateSubEl.textContent = timePart.trim();
          }
        }
      }

      // Status - same logic as payment-request-details page
      statusEls.forEach((el) => {
        if (!el) return;
        if (isRequestPanel) {
          // Payment request status based on state
          if (state >= 6) {
            el.textContent = 'Completed';
            el.classList.remove('transactions__item-status--processing', 'transactions__item-status--completed', 'transactions__item-status--awaiting');
            el.classList.add('transactions__item-status--completed');
          } else if (state >= 5) {
            el.textContent = 'Partially paid';
            el.classList.remove('transactions__item-status--processing', 'transactions__item-status--completed', 'transactions__item-status--awaiting');
            el.classList.add('transactions__item-status--processing');
          } else if (state === 4) {
            el.textContent = 'Awaiting payment';
            el.classList.remove('transactions__item-status--processing', 'transactions__item-status--completed', 'transactions__item-status--awaiting');
            el.classList.add('transactions__item-status--awaiting');
          } else {
            el.textContent = '';
            el.classList.remove('transactions__item-status--processing', 'transactions__item-status--completed', 'transactions__item-status--awaiting');
          }
        } else {
          // Send payment panel
          el.textContent = state >= 5 ? 'Sent' : 'Processing';
          el.classList.remove('transactions__item-status--processing', 'transactions__item-status--completed', 'transactions__item-status--awaiting');
          el.classList.add(state >= 5 ? 'transactions__item-status--completed' : 'transactions__item-status--processing');
        }
      });

      // Apply mobile layout for payment request panel
      if (isRequestPanel) {
        applyMobileLayout(li, statusEls);
      }
    });
  };

  // Function to apply/remove mobile layout for payment request items
  const applyMobileLayout = (li, statusEls) => {
    if (!li) return;
    const isMobile = window.innerWidth < 1280;
    const metaEl = li.querySelector('.transactions__item-meta');
    const wrapperEl = li.querySelector('.transactions__item-meta-right');
    const amountEl = li.querySelector('.transactions__cell--amount');
    const dateEl = li.querySelector('.transactions__cell--date');
    const receiveTotalEl = li.querySelector('.transactions__cell--receive-total');
    const statusEl = statusEls && statusEls.length > 0 ? statusEls[0] : null;

    if (isMobile) {
      // Mobile layout: move status into meta, wrap amount/date
      if (metaEl && statusEl) {
        // Remove any existing status clones in meta
        const existingStatusInMeta = metaEl.querySelector('.transactions__item-status');
        if (existingStatusInMeta) existingStatusInMeta.remove();

        // Add status to meta
        const statusClone = statusEl.cloneNode(true);
        metaEl.appendChild(statusClone);
      }

      // Wrap amount and date if not already wrapped
      if (!wrapperEl && amountEl && dateEl && amountEl.parentNode === li && dateEl.parentNode === li) {
        const wrapper = document.createElement('div');
        wrapper.className = 'transactions__item-meta-right';
        li.insertBefore(wrapper, amountEl);
        wrapper.appendChild(amountEl);
        wrapper.appendChild(dateEl);
      }
    } else {
      // Desktop layout: cleanup mobile modifications
      if (metaEl) {
        // Remove status from meta
        const statusInMeta = metaEl.querySelector('.transactions__item-status');
        if (statusInMeta) statusInMeta.remove();
      }

      // Unwrap amount and date - restore to correct positions in grid
      if (wrapperEl && amountEl && dateEl) {
        // Grid order: activity, amount, receive-total, received-amount, type, status, date
        // Amount should be after activity (before receive-total)
        // Date should be after status (at the end)

        // Move amount back to correct position (before receive-total)
        if (amountEl.parentNode === wrapperEl && receiveTotalEl && receiveTotalEl.parentNode === li) {
          li.insertBefore(amountEl, receiveTotalEl);
        } else if (amountEl.parentNode === wrapperEl) {
          // Fallback: insert after activity
          const activityCell = li.querySelector('.transactions__cell--activity');
          if (activityCell && activityCell.nextSibling) {
            li.insertBefore(amountEl, activityCell.nextSibling);
          } else {
            wrapperEl.parentNode.insertBefore(amountEl, wrapperEl);
          }
        }

        // Move date back to correct position (after status, at the end)
        if (dateEl.parentNode === wrapperEl) {
          const statusCell = li.querySelector('.transactions__cell--status');
          if (statusCell) {
            // Insert after status
            if (statusCell.nextSibling) {
              li.insertBefore(dateEl, statusCell.nextSibling);
            } else {
              li.appendChild(dateEl);
            }
          } else {
            // Fallback: append at the end
            li.appendChild(dateEl);
          }
        }

        // Remove wrapper
        wrapperEl.remove();
      }
    }
  };

  renderTransactions();

  // Fix transaction item layout when resizing between breakpoints
  const fixTransactionLayout = () => {
    const sections = document.querySelectorAll('.transactions');
    sections.forEach((section) => {
      const paymentPanels = Array.from(section.querySelectorAll('[data-panel="payment-request"]'));
      paymentPanels.forEach((panel) => {
        const paymentList = panel && panel.querySelector('.transactions__list');
        if (!paymentList) return;
        const li = paymentList.querySelector('.transactions__item');
        if (!li) return;
        const statusEls = li.querySelectorAll('.transactions__cell--status .transactions__item-status');
        applyMobileLayout(li, statusEls);
      });
    });
  };

  const DESKTOP_BP = 1280;
  const syncResponsiveState = () => {
    if (!homeView || !quickView) return;
    if (window.innerWidth >= DESKTOP_BP) {
      // On desktop, always show the home layout (with sidebar) and mark Assets active
      showHome();
      if (tabHome) setActiveTab(tabHome);
    }
    // Below desktop we keep the current view (assets / quick / transactions)

    // Fix transaction item layout when resizing between breakpoints
    fixTransactionLayout();
  };
  window.addEventListener('resize', syncResponsiveState);
  // Run once on load to guarantee a consistent state
  syncResponsiveState();

  if (tabHome) tabHome.addEventListener('click', () => { showHome(); setActiveTab(tabHome); });
  if (tabMenu) tabMenu.addEventListener('click', () => { showQuick(); setActiveTab(tabMenu); });

  // Prototype only supports Assets, Transactions, and Quick menu tabs.
  // Keep Convert / OTC clickable but do not change active state or content.
  if (tabConvert) tabConvert.addEventListener('click', (e) => { e.preventDefault(); });
  if (tabOTC) tabOTC.addEventListener('click', (e) => { e.preventDefault(); });

  if (tabTrans) tabTrans.addEventListener('click', () => { showTransactions(); setActiveTab(tabTrans); });

  // Initialize icons based on default active tab
  setActiveTab(document.querySelector('.tabbar__btn.is-active') || tabHome);
  document.addEventListener('prototypeStateChange', () => {
    renderTransactions();
  });
  // If coming back with request to open quick menu on mobile/tablet, honor it
  const shouldOpenQuick =
    window.innerWidth < DESKTOP_BP &&
    (window.location.hash === '#quick' || sessionStorage.getItem('openQuick') === '1');
  if (shouldOpenQuick && tabMenu) {
    showQuick();
    setActiveTab(tabMenu);
    sessionStorage.removeItem('openQuick');
  }

  // If coming back from payment details via Transactions entrypoint,
  // only handle this on the home page (where the Transactions UI exists).
  const hasOpenTransactionsFlag = sessionStorage.getItem('openTransactions') === '1';
  if (hasOpenTransactionsFlag && homeView) {
    if (window.innerWidth < DESKTOP_BP && tabTrans) {
      // Mobile/tablet: reopen the Transactions view
      showTransactions();
      setActiveTab(tabTrans);
    } else if (window.innerWidth >= DESKTOP_BP) {
      // Desktop: scroll back to the Transactions section on the home layout (no animation)
      try {
        const homeTransactionsSection = document.querySelector('.home-transactions');
        if (homeTransactionsSection && typeof homeTransactionsSection.scrollIntoView === 'function') {
          homeTransactionsSection.scrollIntoView({ behavior: 'auto', block: 'start' });
        } else if (homeTransactionsSection) {
          window.scrollTo(0, homeTransactionsSection.offsetTop || 0);
        }
      } catch (_) { }
    }
    sessionStorage.removeItem('openTransactions');
  }

  const form = document.querySelector('.form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    hasTriedSubmit = true;
    if (typeof validateSendForm === 'function') validateSendForm();
    const primaryBtn = confirmBtn || document.getElementById('confirm-send');
    // Only allow open when valid (based on aria-disabled managed by validateSendForm)
    const isDisabled = primaryBtn ? primaryBtn.getAttribute('aria-disabled') === 'true' : true;
    if (isDisabled) {
      setConfirmErrorVisible(true);
      return;
    }
    const modal = document.getElementById('confirmPaymentModal');
    if (modal) {
      modal.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
    }
  });

  // ---- Live summary calculations (Amount + Fees) ----
  const amountInput = document.getElementById('amount');
  const feeRadios = document.querySelectorAll('input[type="radio"][name="fee"]');
  const deductRadios = document.querySelectorAll('input[type="radio"][name="deduct"]');
  const natureSelect = document.getElementById('nature');
  const purposeSelect = document.getElementById('purpose');
  let lastNatureVal = natureSelect ? natureSelect.value : '';

  const summaryContainer = document.querySelector('.card--summary');
  const findSummaryRow = (labelText) => {
    let row = null;
    const scope = summaryContainer || document;
    scope.querySelectorAll('.summary-pair, .summary-pair.summary-pair--large').forEach((pair) => {
      const labelEl = pair.querySelector('.muted');
      if (labelEl && labelEl.textContent.trim().toLowerCase() === labelText.toLowerCase()) {
        row = pair;
      }
    });
    return row;
  };
  const findSummaryRowStartsWith = (prefixText) => {
    let row = null;
    const scope = summaryContainer || document;
    scope.querySelectorAll('.summary-pair').forEach((pair) => {
      const labelEl = pair.querySelector('.muted');
      if (labelEl && labelEl.textContent.trim().toLowerCase().startsWith(prefixText.toLowerCase())) {
        row = pair;
      }
    });
    return row;
  };

  const summaryRows = {
    subtotal: findSummaryRow('Your subtotal'),
    serviceTitle: (summaryContainer || document).querySelector('.summary-pair[data-summary="service-title"]'),
    servicePayer: (summaryContainer || document).querySelector('[data-summary="service-payer"]'),
    servicePayee: (summaryContainer || document).querySelector('[data-summary="service-payee"]'),
    amountPayable: findSummaryRow('Payment amount'),
    deductFrom: findSummaryRow('Receive funds in') || findSummaryRow('Deduct from'),
    nature: findSummaryRow('Nature'),
    purpose: findSummaryRow('Purpose'),
    youPay: findSummaryRow('Customer pays') || findSummaryRow('You pay'),
    payeeReceives: findSummaryRow('You receive') || findSummaryRow('Send to receiver'),
    // Conversion row label starts with \"Conversion\" (e.g. \"Conversion rate\")
    conversion: findSummaryRowStartsWith('Conversion'),
  };

  const getPayerCurrency = () => {
    const selected = Array.from(deductRadios).find(r => r.checked);
    return selected ? selected.value : 'USD';
  };
  const payeeCurrency = 'USD';

  const formatAmount = (value, suffix) => {
    const formatted = Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} ${suffix}`;
  };

  const syncAccountDisplay = () => { };

  // Mobile summary fixed fallback: pin when near "Amount and fees"
  (function initMobileSummaryPin() {
    const root = document.querySelector('main.page--send');
    if (!root) return;
    const summaryCard = document.querySelector('.card--summary');
    if (!summaryCard) return;
    const getHeaderH = () => {
      const h = document.querySelector('.site-header .header__content');
      return h ? h.offsetHeight : 64;
    };
    const getAmtTitle = () => {
      const nodes = Array.from(document.querySelectorAll('h2.card__title'));
      return nodes.find(n => (n.textContent || '').trim().toLowerCase().includes('amount and fees'));
    };
    const onScroll = () => {
      const isMobile = window.innerWidth < DESKTOP_BP;
      if (!isMobile) {
        summaryCard.classList.remove('is-fixed-mobile');
        return;
      }
      const t = getAmtTitle();
      if (!t) return;
      const headerH = getHeaderH();
      const top = t.getBoundingClientRect().top;
      // If the section header has reached the viewport (under the header), fix it
      if (top <= headerH + 8) {
        summaryCard.classList.add('is-fixed-mobile');
        summaryCard.style.top = `${headerH}px`;
      } else {
        summaryCard.classList.remove('is-fixed-mobile');
        summaryCard.style.top = '';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  })();

  // Add-bank back link: return to captured entrypoint (index, select-counterparty, settings)
  // Add-customer back link: return to captured entrypoint (index, select-customer)
  (function initAddBankBackLink() {
    try {
      var backLink = document.getElementById('abBackLink');
      if (!backLink) return;

      // Check if this is the add-customer page
      var isAddCustomer = document.querySelector('main.page--addcustomer');
      if (isAddCustomer) {
        // For add-customer, use entrypoint logic
        var key = ADD_CUSTOMER_RETURN_KEY;
        var target = null;
        if (window.sessionStorage) {
          target = window.sessionStorage.getItem(key);
        }
        var href = 'index.html'; // default to index
        if (target === 'select-customer') href = 'select-customer.html';
        if (target === 'settings-customers') href = 'settings.html?view=content&page=customers';
        backLink.setAttribute('href', href);
        return;
      }

      // For add-bank, use entrypoint logic
      var key = ADD_BANK_RETURN_KEY;
      var target = null;
      if (window.sessionStorage) {
        target = window.sessionStorage.getItem(key);
      }
      var href = 'select-customer.html';
      if (target === 'index') href = 'index.html';
      if (target === 'settings') href = 'settings.html?view=content&page=banks';
      backLink.setAttribute('href', href);
    } catch (_) { }
  })();

  // ---- Enable/disable Confirm send based on filled inputs/selects ----
  const confirmBtn = document.getElementById('confirm-send');
  const confirmBtnSticky = document.getElementById('confirm-send-sticky');
  const REQUIRED_ERROR_TEXT = 'This field is required';
  let hasTriedSubmit = false;
  let amountRequiredActive = false;
  const setConfirmErrorVisible = (visible) => {
    document.body.classList.toggle('has-cta-error', !!visible);
    [document.getElementById('confirm-error'), document.getElementById('confirm-error-mobile')].forEach((node) => {
      if (!node) return;
      node.hidden = !visible;
      if (visible) {
        node.textContent = 'Please check all required fields/errors';
      }
    });
  };
  const isElementVisible = (el) => {
    if (!el) return false;
    if (el.hidden) return false;
    if (el.closest('[hidden]')) return false;
    const rect = el.getBoundingClientRect();
    return !(rect.width === 0 && rect.height === 0);
  };
  const setConfirmDisabled = (disabled) => {
    // Keep buttons clickable; reflect state via aria attributes only
    [confirmBtn, confirmBtnSticky].forEach((btn) => {
      if (!btn) return;
      btn.disabled = false;
      btn.removeAttribute('disabled');
      btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    });
  };
  setConfirmDisabled(true);
  const validateSendForm = () => {
    const natureEl = document.getElementById('nature');
    const purposeEl = document.getElementById('purpose');
    const amountEl = document.getElementById('amount');
    const expiresEl = document.getElementById('expiresAfter');
    const pre = document.getElementById('docs-pre');
    const post = document.getElementById('docs-post');

    const isFilledText = (el) => !!(el && String(el.value || '').trim().length >= 1);
    const isFilledSelect = (el) => !!(el && String(el.value || '') !== '');

    const natureOk = isFilledSelect(natureEl);
    const purposeElValue = purposeEl ? purposeEl.value : '';
    const purposeOthersEl = document.getElementById('purposeOthers');
    // Purpose is valid if it's selected
    // If "others" is selected, the purposeOthers field becomes required and must be filled
    const purposeBaseOk = isFilledSelect(purposeEl);
    let purposeOk = purposeBaseOk;
    if (purposeOk && purposeElValue === 'others') {
      // When "Others" is selected, the purposeOthers field is required
      purposeOk = purposeOthersEl && isFilledText(purposeOthersEl);
    }
    // Expires on is required for request-payment pages (input is readonly but must be filled)
    const isRequestPaymentPage = (window.location.pathname || '').includes('request-payment');
    const expiresOk = !isRequestPaymentPage || isFilledText(expiresEl);
    // Amount must be a positive number; treat empty or 0 as not filled
    let amountOk = false;
    if (amountEl) {
      const amtRaw = String(amountEl.value || '').replace(/,/g, '').trim();
      const amtNum = parseFloat(amtRaw);
      amountOk = Number.isFinite(amtNum) && amtNum > 0;
    }

    const shouldShowErrors = hasTriedSubmit;

    // Inline error helpers
    const setError = (id, active) => {
      const el = document.getElementById(id);
      if (!el) return;
      // Toggle helper class on the surrounding doc-miss-row to control spacing on mobile
      const missRow = el.closest('.doc-miss-row');
      if (missRow) {
        if (active) {
          missRow.classList.remove('no-error');
        } else {
          missRow.classList.add('no-error');
        }
      }
      if (!active) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      el.textContent = REQUIRED_ERROR_TEXT;
    };

    let docsOk = true;
    const postDocErrorIds = ['doc-post-error-ci', 'doc-post-error-transport', 'doc-post-error-packing'];
    const hideAllDocErrors = () => {
      setError('doc-type-error', false);
      setError('doc-upload-error', false);
      postDocErrorIds.forEach((id) => setError(id, false));
    };
    if (natureOk) {
      if (pre && !pre.hidden) {
        const docType = document.getElementById('docType');
        const uploads = document.querySelectorAll('#docs-pre .upload-item');
        const docTypeOk = isFilledSelect(docType);
        const uploadsOk = Array.from(uploads).every(item => item.classList.contains('is-uploaded'));
        docsOk = docTypeOk && uploadsOk;
        setError('doc-type-error', shouldShowErrors && !docTypeOk);
        setError('doc-upload-error', shouldShowErrors && !uploadsOk);
        postDocErrorIds.forEach((id) => setError(id, false));
      } else if (post && !post.hidden) {
        const uploads = document.querySelectorAll('#docs-post .upload-item');
        let uploadsOk = true;
        uploads.forEach((item) => {
          const uploaded = item.classList.contains('is-uploaded');
          // Treat the adjacent \"I don't have this document\" checkbox as a valid alternative
          let missedOk = false;
          const maybeMissRow = item.nextElementSibling;
          if (maybeMissRow && maybeMissRow.classList && maybeMissRow.classList.contains('doc-miss-row')) {
            const missChk = maybeMissRow.querySelector('input[type=\"checkbox\"]');
            if (missChk) missedOk = !!missChk.checked;
          }
          const valid = uploaded || missedOk;
          uploadsOk = uploadsOk && valid;
          const key = item.getAttribute('data-doc-key');
          if (key) {
            setError(`doc-post-error-${key}`, shouldShowErrors && !valid);
          }
        });
        docsOk = uploadsOk;
        setError('doc-type-error', false);
        setError('doc-upload-error', false);
      } else {
        hideAllDocErrors();
      }
    } else {
      docsOk = false;
      hideAllDocErrors();
    }

    // Inline errors present?
    const amountWrap = document.querySelector('.amount-input');
    const domAmountError = document.getElementById('amount-error');

    // Nature
    setError('nature-error', shouldShowErrors && !natureOk);

    // Purpose + purpose-others
    const purposeMissing = !purposeBaseOk;
    const purposeOthersMissing = purposeBaseOk && purposeElValue === 'others' && !(purposeOthersEl && isFilledText(purposeOthersEl));
    setError('purpose-error', shouldShowErrors && purposeMissing);
    setError('purpose-others-error', shouldShowErrors && purposeOthersMissing);

    // Expires on (request-payment only)
    setError('expiresAfter-error', shouldShowErrors && !expiresOk);

    // Amount required (only when user attempted submit)
    amountRequiredActive = shouldShowErrors && !amountOk;

    // Conversion terms checkbox validation (required when USDT is selected)
    const payerCurrency = getPayerCurrency();
    const conversionTermsCheckbox = document.getElementById('conversionTermsCheckbox');
    const conversionTermsOk = payerCurrency !== 'USDT' || (conversionTermsCheckbox && conversionTermsCheckbox.checked);
    setError('conversion-terms-error', shouldShowErrors && !conversionTermsOk);

    const hasInlineError =
      amountRequiredActive ||
      (amountWrap && amountWrap.classList.contains('is-error')) ||
      (domAmountError && domAmountError.hidden === false);

    const allValid = natureOk && purposeOk && expiresOk && amountOk && docsOk && !hasInlineError && conversionTermsOk;

    setConfirmDisabled(!allValid);
    if (allValid) {
      setConfirmErrorVisible(false);
    } else if (hasTriedSubmit) {
      // If user has previously tried to submit, keep CTA error visible
      setConfirmErrorVisible(true);
    }
    updateSummary();
  };

  const getFeeMode = () => {
    const selected = Array.from(feeRadios).find(r => r.checked);
    return selected ? selected.value : 'you';
  };

  const setServiceBreakdown = (payerPctAbs, payeePctAbs, hidePercentage = false, isRequestPayment = false) => {
    // Re-query elements to ensure we have fresh references
    const payerRow = (summaryContainer || document).querySelector('[data-summary="service-payer"]');
    const payeeRow = (summaryContainer || document).querySelector('[data-summary="service-payee"]');
    const payerLabel = payerRow && payerRow.querySelector('.muted');
    const payeeLabel = payeeRow && payeeRow.querySelector('.muted');
    const receiverLabel = isRequestPayment ? 'customer' : 'receiver';
    if (payerLabel) {
      // Request-payment wants simplified labels (no percentages) + bullets.
      if (isRequestPayment) {
        payerLabel.textContent = '• Paid by you';
      } else if (hidePercentage) {
        payerLabel.textContent = 'Paid by you';
      } else {
        payerLabel.textContent = `${Number(payerPctAbs).toFixed(2)}% paid by you`;
      }
    }
    if (payeeLabel) {
      // Request-payment wants simplified labels (no percentages) + bullets.
      if (isRequestPayment) {
        payeeLabel.textContent = '• Paid by customer';
      } else if (hidePercentage) {
        payeeLabel.textContent = `Paid by ${receiverLabel}`;
      } else {
        payeeLabel.textContent = `${Number(payeePctAbs).toFixed(2)}% paid by ${receiverLabel}`;
      }
    }
  };

  const updateSummary = () => {
    if (!amountInput) return;
    const raw = (amountInput.value || '').toString().replace(/,/g, '');
    const amount = parseFloat(raw) || 0;
    const mode = getFeeMode();

    // Determine fee shares
    const feeRate = getFeeRate();
    let payerRate = 0, receiverRate = 0;
    if (mode === 'you') { payerRate = feeRate; receiverRate = 0; }
    else if (mode === 'receiver') { payerRate = 0; receiverRate = feeRate; }
    else { payerRate = feeRate / 2; receiverRate = feeRate / 2; }

    // Calculate fees with minimum and maximum fee logic
    const { payerFee, receiverFee, isBelowMinimum, isAboveMaximum } = calculateFees(amount, payerRate, receiverRate, feeRate);

    // For request-payment: logic is inverted (you receive, customer pays)
    // For send-payment: you pay, receiver gets
    const isRequestPayment = window.location.pathname.includes('request-payment');
    const youPay = isRequestPayment ? amount + receiverFee : amount + payerFee; // Customer pays (request) or You pay (send)
    let payeeGets = isRequestPayment ? amount - payerFee : amount - receiverFee; // You receive (request) or Receiver gets (send)
    // Prevent "You receive" from going negative (clamp to 0)
    if (isRequestPayment && payeeGets < 0) {
      payeeGets = 0;
    }
    const subtotal = amount; // before fees

    // Update labels and values
    // Percentages shown are absolute share of the amount (e.g., 0.5%)
    const payerPctAbs = payerRate * 100;   // Convert to percentage (e.g., 0.0025 -> 0.25)
    const payeePctAbs = receiverRate * 100;
    // Request-payment uses simplified labels; send-payment keeps percentage labels unless min/max clamps.
    setServiceBreakdown(payerPctAbs, payeePctAbs, isRequestPayment || isBelowMinimum || isAboveMaximum, isRequestPayment);

    const payerCurrency = getPayerCurrency();
    const showConversion = payerCurrency !== payeeCurrency;
    // Keep the select display in sync with currency
    syncAccountDisplay();
    // Toggle USDT rate helper
    const deductRate = document.getElementById('deduct-rate');
    if (deductRate) {
      deductRate.hidden = payerCurrency !== 'USDT';
    }
    // Toggle conversion terms checkbox section
    const conversionTerms = document.getElementById('conversion-terms');
    if (conversionTerms) {
      conversionTerms.hidden = payerCurrency !== 'USDT';
      // Reset checkbox when hidden
      if (payerCurrency !== 'USDT') {
        const checkbox = document.getElementById('conversionTermsCheckbox');
        if (checkbox) {
          checkbox.checked = false;
        }
      }
    }
    // Amount per-tx limit inline error + input underline color
    const MIN_TX_LIMIT = 50;
    const PER_TX_LIMIT = 1000000;
    // For request-payment: always use 60 as minimum per transaction
    // For send-payment: use 50 as minimum per transaction
    const minAmountForRequest = isRequestPayment ? 60 : MIN_TX_LIMIT;
    const amountBelowMinTx = amount > 0 && amount < minAmountForRequest;
    const amountOverPerTx = amount >= PER_TX_LIMIT;
    const amountMeta = document.querySelector('.amount-meta');
    const amountMetaText = amountMeta?.querySelector('.amount-meta__text');
    const amountInputWrap = document.querySelector('.amount-input');
    const amountMetaHasLimitError = amountBelowMinTx || amountOverPerTx;
    if (amountMeta) {
      amountMeta.classList.toggle('is-error', amountRequiredActive || amountMetaHasLimitError);
    }
    if (amountMetaText) {
      const formatLimit = (value) => Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      if (amountRequiredActive) {
        amountMetaText.textContent = REQUIRED_ERROR_TEXT;
      } else if (amountBelowMinTx) {
        const minLimit = isRequestPayment ? minAmountForRequest : MIN_TX_LIMIT;
        amountMetaText.textContent = `Amount is below ${formatLimit(minLimit)} minimum per transaction`;
      } else if (amountOverPerTx) {
        amountMetaText.textContent = `Amount exceeds ${formatLimit(PER_TX_LIMIT)} maximum per transaction`;
      } else {
        const minLimit = isRequestPayment ? minAmountForRequest : MIN_TX_LIMIT;
        amountMetaText.textContent = `Min/max per transaction ${formatLimit(minLimit)} - ${formatLimit(PER_TX_LIMIT)}`;
      }
    }
    // Inline error for amount exceeding selected account balance (consider payer fee share)
    const amountError = document.getElementById('amount-error');
    const selectedRadio = Array.from(document.querySelectorAll('.fee-options--deduct input[type="radio"]')).find(r => r.checked);
    const balanceText = selectedRadio?.closest('.fee-option')?.querySelector('.fee-option__content .muted')?.textContent || '';
    const balanceNum = (() => {
      const m = balanceText.replace(/[^0-9.]/g, '');
      return parseFloat(m || '0') || 0;
    })();
    const overBalance = youPay > balanceNum;
    if (amountError) {
      amountError.hidden = !overBalance;
      if (overBalance) {
        // Compose message: show Amount + fee (computed total) exceeds balance
        const totalStr = Number(youPay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        amountError.textContent = `Amount + fee (${totalStr}) exceeds balance`;
      }
    }
    // Clear previous error highlights, then mark selected
    document.querySelectorAll('.fee-options--deduct .fee-option .fee-option__content .muted').forEach(el => el.classList.remove('is-error'));
    if (overBalance && selectedRadio) {
      const small = selectedRadio.closest('.fee-option')?.querySelector('.fee-option__content .muted');
      if (small) small.classList.add('is-error');
    }
    // Amount input red underline if any error active
    const anyAmountError = amountRequiredActive || amountMetaHasLimitError || overBalance;
    if (amountInputWrap) {
      amountInputWrap.classList.toggle('is-error', anyAmountError);
    }

    if (summaryRows.subtotal) {
      const v = summaryRows.subtotal.querySelector('strong');
      if (v) v.textContent = formatAmount(subtotal, payerCurrency);
    }
    if (summaryRows.serviceTitle) {
      // Only show the label; totals are displayed in the breakdown rows.
      // Styling is handled via CSS using the `.service-fee--min` and `.service-fee--max` classes.
      const row = summaryRows.serviceTitle;
      const pctEl = row.querySelector('.service-fee__percentage');
      const minEl = row.querySelector('.service-fee__minimum');
      const maxEl = row.querySelector('.service-fee__maximum');

      if (pctEl) {
        // Handle minimum fee state
        if (minEl) {
          if (isBelowMinimum) {
            row.classList.add('service-fee--min');
            row.classList.remove('service-fee--max');
            pctEl.textContent = `${(feeRate * 100).toFixed(2)}%`;
            // Use the fixed minimum service fee amount for display
            minEl.textContent = `${formatAmount(MIN_SERVICE_FEE, 'USD')}`;
          } else {
            row.classList.remove('service-fee--min');
          }
        }

        // Handle maximum fee state
        if (maxEl) {
          if (isAboveMaximum) {
            row.classList.add('service-fee--max');
            row.classList.remove('service-fee--min');
            pctEl.textContent = `${(feeRate * 100).toFixed(2)}%`;
            // Use the fixed maximum service fee amount for display
            maxEl.textContent = `${formatAmount(MAX_SERVICE_FEE, 'USD')}`;
          } else {
            row.classList.remove('service-fee--max');
            if (!isBelowMinimum) {
              pctEl.textContent = `${(feeRate * 100).toFixed(2)}%`;
            }
          }
        }
      }
    }
    // Re-query elements to ensure we have fresh references
    const payerRow = (summaryContainer || document).querySelector('[data-summary="service-payer"]');
    const payeeRow = (summaryContainer || document).querySelector('[data-summary="service-payee"]');
    if (payerRow) {
      const v = payerRow.querySelector('strong');
      if (v) v.textContent = formatAmount(payerFee, payerCurrency);
    }
    if (payeeRow) {
      const v = payeeRow.querySelector('strong');
      if (v) v.textContent = formatAmount(receiverFee, payeeCurrency);
    }
    if (summaryRows.amountPayable) {
      const v = summaryRows.amountPayable.querySelector('strong');
      if (v) v.textContent = formatAmount(amount, payeeCurrency); // always USD
    }
    if (summaryRows.youPay) {
      const v = summaryRows.youPay.querySelector('strong');
      if (v) {
        const payerCurrency = getPayerCurrency();
        v.textContent = formatAmount(youPay, payerCurrency);
      }
    }
    if (summaryRows.deductFrom) {
      const v = summaryRows.deductFrom.querySelector('strong');
      if (v) v.textContent = `${getPayerCurrency()} account`;
      // Show/hide "See convert details" button based on USDT selection
      const convertDetailsBtn = document.getElementById('fees-details-open');
      if (convertDetailsBtn) {
        convertDetailsBtn.style.display = showConversion ? '' : 'none';
      }
    }
    if (summaryRows.payeeReceives) {
      const v = summaryRows.payeeReceives.querySelector('strong');
      if (v) v.textContent = formatAmount(payeeGets, payeeCurrency);
    }
    // Update mobile sticky amount
    const stickyAmt = document.getElementById('mobileStickyAmount');
    if (stickyAmt) {
      // Preserve the chevron image if it exists
      const chevron = stickyAmt.querySelector('.ms-chevron');
      const chevronClone = chevron ? chevron.cloneNode(true) : null;
      stickyAmt.textContent = formatAmount(payeeGets, payeeCurrency);
      if (chevronClone) {
        stickyAmt.appendChild(chevronClone);
      }
    }
    if (summaryRows.conversion) {
      // Show only if payer currency differs from payee currency
      if (showConversion) {
        summaryRows.conversion.style.display = '';
        const v = summaryRows.conversion.querySelector('strong');
        if (v) v.textContent = `1 ${payerCurrency} = 1 ${payeeCurrency}`;
      } else {
        summaryRows.conversion.style.display = 'none';
      }
    }
    // Populate Convert details modal (populate whatever fields exist)
    (function populateConvertModal() {
      const cvFromEl = document.getElementById('cv-from');
      const cvFeePctEl = document.getElementById('cv-fee-pct');
      const cvFeeAmtEl = document.getElementById('cv-fee-amt');
      const cvNetEl = document.getElementById('cv-net');
      const cvRateEl = document.getElementById('cv-rate');
      const cvToEl = document.getElementById('cv-to');
      // Currently 0% conversion fee and 1:1 rate
      const convertFeePct = 0.00;
      const convertFeeAmt = 0.00;
      const convertFrom = amount; // amount is in payeeCurrency; rate is 1:1
      if (cvFromEl) cvFromEl.textContent = formatAmount(convertFrom, payerCurrency);
      if (cvFeePctEl) cvFeePctEl.textContent = `${convertFeePct.toFixed(2)}%`;
      if (cvFeeAmtEl) cvFeeAmtEl.textContent = convertFeeAmt ? formatAmount(convertFeeAmt, payerCurrency) : '--';
      if (cvNetEl) cvNetEl.textContent = formatAmount(convertFrom - convertFeeAmt, payerCurrency);
      if (cvRateEl) cvRateEl.textContent = `1 ${payerCurrency} = 1 ${payeeCurrency}`;
      if (cvToEl) cvToEl.textContent = formatAmount(amount, payeeCurrency);
    })();
    // Update Fees Details modal fields when present
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('fd-subtotal', formatAmount(subtotal, payeeCurrency)); // subtotal is in USD
    setText('fd-payer', formatAmount(payerFee, payerCurrency));
    setText('fd-receiver', formatAmount(receiverFee, payeeCurrency));
    setText('fd-youpay', formatAmount(youPay, payerCurrency));
    setText('fd-getspaid', formatAmount(payeeGets, payeeCurrency));
    const payerPctStr = (payerRate * 100).toFixed(2);
    const recvPctStr = (receiverRate * 100).toFixed(2);
    const receiverLabel = isRequestPayment ? 'customer' : 'receiver';
    setText('fd-payer-label', `${payerPctStr}% paid by you`);
    setText('fd-receiver-label', `${recvPctStr}% paid by ${receiverLabel}`);
  };

  const updateNaturePurpose = () => {
    if (summaryRows.nature && natureSelect) {
      const v = summaryRows.nature.querySelector('strong');
      const label = natureSelect.selectedOptions?.[0]?.textContent?.trim() || '';
      const filled = !!(natureSelect.value);
      if (v) v.textContent = filled ? label : '- -';
      natureSelect.classList.toggle('is-filled', !!natureSelect.value);
    }
    if (summaryRows.purpose && purposeSelect) {
      const v = summaryRows.purpose.querySelector('strong');
      const label = purposeSelect.selectedOptions?.[0]?.textContent?.trim() || '';
      const filled = !!(purposeSelect.value);
      if (v) v.textContent = filled ? label : '- -';
      purposeSelect.classList.toggle('is-filled', !!purposeSelect.value);
    }

    // Toggle supporting docs section based on nature selection
    const docsTitle = document.getElementById('docs-title');
    const docsWrap = document.getElementById('docs');
    const spanNature = docsTitle?.querySelector('[data-docs-nature]');
    const pre = document.getElementById('docs-pre');
    const post = document.getElementById('docs-post');
    if (!natureSelect || !docsTitle || !docsWrap || !pre || !post) return;
    const natureVal = natureSelect.value;
    const natureTxt = natureSelect.selectedOptions?.[0]?.textContent?.trim() || '';
    const isChosen = !!natureVal;
    docsTitle.hidden = !isChosen;
    docsWrap.hidden = !isChosen;
    if (!isChosen) return;
    if (spanNature) spanNature.textContent = natureTxt.toLowerCase();
    const isPre = natureVal === 'pre_shipment';
    const isNatureChanged = natureVal !== lastNatureVal;
    pre.hidden = !isPre;
    post.hidden = isPre;

    // Reset and sync doc-type card
    const docTypeSelect = document.getElementById('docType');
    const card = document.querySelector('.doc-type-card');
    const badge = card?.querySelector('.doc-type__badge');
    const title = card?.querySelector('.doc-type__title');
    const desc = card?.querySelector('.doc-type__texts small');
    const syncDocCard = () => {
      if (!docTypeSelect || !card) return;
      const val = docTypeSelect.value;
      const numField = document.getElementById('docNumberField');
      const numLabel = document.getElementById('docNumberLabel');
      const uploadBlock = document.getElementById('docUploadBlock');
      const upTitle = document.getElementById('docUploadTitle');
      const upDesc = document.getElementById('docUploadDesc');
      const upBadge = document.getElementById('docUploadBadge');
      const upIcon = document.getElementById('docUploadIcon');

      if (!val) {
        if (badge) badge.classList.add('is-hidden');
        if (title) { title.textContent = 'Select'; title.classList.add('is-placeholder'); }
        card.classList.add('is-placeholder');
        if (desc) desc.textContent = '';
        if (numField) numField.hidden = true;
        if (uploadBlock) uploadBlock.hidden = true;
      } else if (val === 'PI') {
        if (badge) { badge.classList.remove('is-hidden'); }
        if (title) { title.textContent = 'Proforma invoice (PI)'; title.classList.remove('is-placeholder'); }
        card.classList.remove('is-placeholder');
        if (desc) desc.textContent = 'A preliminary invoice issued by the seller before delivery';
        if (numField) numField.hidden = false;
        if (numLabel) numLabel.textContent = 'Proforma invoice number';
        if (uploadBlock) uploadBlock.hidden = false;
        if (upTitle) upTitle.textContent = 'Proforma invoice (PI)';
        if (upDesc) upDesc.textContent = 'Must include Proforma Invoice (PI) number';
        if (upIcon) upIcon.src = 'assets/icon_upload_1.svg';
      } else if (val === 'PO') {
        if (badge) { badge.classList.remove('is-hidden'); }
        if (title) { title.textContent = 'Purchase order (PO)'; title.classList.remove('is-placeholder'); }
        card.classList.remove('is-placeholder');
        if (desc) desc.textContent = 'A buyer-issued document requesting goods or services';
        if (numField) numField.hidden = false;
        if (numLabel) numLabel.textContent = 'Purchase order number';
        if (uploadBlock) uploadBlock.hidden = false;
        if (upTitle) upTitle.textContent = 'Purchase order (PO)';
        if (upDesc) upDesc.textContent = 'Must include Purchase order (PO) number';
        if (upIcon) upIcon.src = 'assets/icon_upload_1.svg';
      } else if (val === 'CC') {
        if (badge) { badge.classList.remove('is-hidden'); }
        if (title) { title.textContent = 'Commercial contract (CC)'; title.classList.remove('is-placeholder'); }
        card.classList.remove('is-placeholder');
        if (desc) desc.textContent = 'A written agreement outlining the terms of a business deal';
        if (numField) numField.hidden = false;
        if (numLabel) numLabel.textContent = 'Commercial contract number';
        if (uploadBlock) uploadBlock.hidden = false;
        if (upTitle) upTitle.textContent = 'Commercial contract (CC)';
        if (upDesc) upDesc.textContent = '';
        if (upIcon) upIcon.src = 'assets/icon_upload_1.svg';
      }
    };
    const syncOptionalDocsSectionVisibility = () => {
      try {
        // Only evaluate the currently visible docs variant
        const activeVariant = docsWrap.querySelector('.docs-variant:not([hidden])');
        if (!activeVariant) return;

        const optionalGroups = activeVariant.querySelectorAll('.docs-group--optional');
        optionalGroups.forEach((group) => {
          const section = group.querySelector('.docs-section');
          const content = group.querySelector('.docs-group__content');
          if (!section || !content) return;

          const fields = Array.from(content.querySelectorAll('.form__field'));
          const hasVisibleField = fields.some((el) => {
            if (!el) return false;
            if (el.closest('[hidden]')) return false;
            return el.getClientRects().length > 0;
          });

          section.hidden = !hasVisibleField;
        });
      } catch (_) { }
    };
    if (docTypeSelect) {
      // set default to placeholder on show
      if (isPre && isNatureChanged) docTypeSelect.value = '';
      docTypeSelect.addEventListener('change', () => {
        // Reset any existing upload state for the pre-shipment document when type changes
        const preUploadItem = document.querySelector('#docs-pre .upload-item');
        if (preUploadItem) {
          preUploadItem.classList.remove('is-uploaded');
          // Reset badge icon
          const badgeImg = preUploadItem.querySelector('.upload-item__badge img');
          if (badgeImg) badgeImg.src = 'assets/icon_upload_1.svg';
          // Reset main button appearance/text
          const actions = preUploadItem.querySelector('.upload-item__actions');
          const mainBtn = actions ? actions.querySelector('.btn') : null;
          if (mainBtn) {
            mainBtn.classList.add('btn--primary');
            mainBtn.classList.remove('btn--secondary');
            mainBtn.textContent = 'Upload';
          }
          // Clear any uploaded filename subtitle; new instructions will be set by syncDocCard
          const subEl = preUploadItem.querySelector('.upload-item__meta small');
          if (subEl) subEl.textContent = '';
        }

        // Sync the card UI for the newly selected document type
        syncDocCard();

        // Clear the document number whenever the document type changes
        // (e.g. switching between PI, PO, and CC should reset `piNumber`).
        if (typeof piNumber !== 'undefined' && piNumber) {
          piNumber.value = '';
        }
        if (typeof updateDocNumberCounters === 'function') {
          updateDocNumberCounters();
        }

        if (typeof validateSendForm === 'function') validateSendForm();
        syncOptionalDocsSectionVisibility();
      });
    }
    syncDocCard();
    syncOptionalDocsSectionVisibility();
    if (typeof validateSendForm === 'function') validateSendForm();
    lastNatureVal = natureVal;

    // Attach validation to docs inputs so changing them re-validates immediately
    const piNumber = document.getElementById('piNumber');
    const piNumberCounter = document.getElementById('piNumberCounter');
    const ciNumber = document.getElementById('ciNumber');
    const ciNumberCounter = document.getElementById('ciNumberCounter');
    const docNotes = document.getElementById('docNotes');
    const notesCounter = document.getElementById('docNotesCounter');
    const docNotesPost = document.getElementById('docNotesPost');
    const notesCounterPost = document.getElementById('docNotesPostCounter');
    const updateNotesCounter = () => {
      if (docNotes && notesCounter) {
        const len = String(docNotes.value || '').length;
        const capped = Math.min(40, len);
        notesCounter.textContent = `${capped}/40`;
        docNotes.classList.toggle('is-filled', capped > 0);
      }
      if (docNotesPost && notesCounterPost) {
        const len2 = String(docNotesPost.value || '').length;
        const capped2 = Math.min(40, len2);
        notesCounterPost.textContent = `${capped2}/40`;
        docNotesPost.classList.toggle('is-filled', capped2 > 0);
      }
    };
    const updateDocNumberCounters = () => {
      if (piNumber && piNumberCounter) {
        const len = String(piNumber.value || '').length;
        const capped = Math.min(50, len);
        piNumberCounter.textContent = `${capped}/50`;
        piNumber.classList.toggle('is-filled', capped > 0);
      } else if (piNumberCounter) {
        piNumberCounter.textContent = '0/50';
      }
      if (ciNumber && ciNumberCounter) {
        const len2 = String(ciNumber.value || '').length;
        const capped2 = Math.min(50, len2);
        ciNumberCounter.textContent = `${capped2}/50`;
        ciNumber.classList.toggle('is-filled', capped2 > 0);
      } else if (ciNumberCounter) {
        ciNumberCounter.textContent = '0/50';
      }
    };
    if (piNumber) {
      piNumber.addEventListener('input', () => {
        updateDocNumberCounters();
        if (typeof validateSendForm === 'function') validateSendForm();
      }, { passive: true });
      piNumber.addEventListener('change', () => {
        updateDocNumberCounters();
        if (typeof validateSendForm === 'function') validateSendForm();
      });
      updateDocNumberCounters();
    } else if (piNumberCounter) {
      piNumberCounter.textContent = '0/50';
    }
    if (ciNumber) {
      ciNumber.addEventListener('input', () => {
        updateDocNumberCounters();
        if (typeof validateSendForm === 'function') validateSendForm();
      }, { passive: true });
      ciNumber.addEventListener('change', () => {
        updateDocNumberCounters();
        if (typeof validateSendForm === 'function') validateSendForm();
      });
      updateDocNumberCounters();
    } else if (ciNumberCounter) {
      ciNumberCounter.textContent = '0/50';
    }
    if (docNotes) {
      docNotes.addEventListener('input', () => { updateNotesCounter(); if (typeof validateSendForm === 'function') validateSendForm(); }, { passive: true });
      docNotes.addEventListener('change', () => { updateNotesCounter(); if (typeof validateSendForm === 'function') validateSendForm(); });
      updateNotesCounter();
    } else if (notesCounter) {
      notesCounter.textContent = '0/25';
    }
    if (docNotesPost) {
      docNotesPost.addEventListener('input', () => { updateNotesCounter(); if (typeof validateSendForm === 'function') validateSendForm(); }, { passive: true });
      docNotesPost.addEventListener('change', () => { updateNotesCounter(); if (typeof validateSendForm === 'function') validateSendForm(); });
      updateNotesCounter();
    } else if (notesCounterPost) {
      notesCounterPost.textContent = '0/25';
    }
  };

  // Ensure purpose select gets filled styling and summary even when selected first
  const updatePurposeOnly = () => {
    if (!purposeSelect || !summaryRows.purpose) return;
    const v = summaryRows.purpose.querySelector('strong');
    const label = purposeSelect.selectedOptions?.[0]?.textContent?.trim() || '';
    const filled = !!purposeSelect.value;
    if (v) v.textContent = filled ? label : '- -';
    purposeSelect.classList.toggle('is-filled', filled);
  };

  if (amountInput) {
    const formatCurrencyInput = (e) => {
      const input = e.target;
      const prev = input.value || '';
      // Allow only digits, comma, and dot
      let raw = prev.replace(/[^\d.,]/g, '');
      const hadTrailingDot = /\.\s*$/.test(prev);
      // Remove thousands separators
      raw = raw.replace(/,/g, '');
      // Keep only first dot as decimal separator
      const firstDot = raw.indexOf('.');
      if (firstDot !== -1) {
        const head = raw.slice(0, firstDot);
        const tail = raw.slice(firstDot + 1).replace(/\./g, '');
        raw = `${head}.${tail}`;
      }
      // Cap to maximum allowed numeric value (1,000,000)
      const MAX_CAP = 1000000;
      if (raw !== '' && !isNaN(parseFloat(raw)) && parseFloat(raw) > MAX_CAP) {
        raw = String(MAX_CAP);
      }
      if (raw === '') {
        input.value = '';
        updateSummary();
        if (typeof validateSendForm === 'function') validateSendForm();
        return;
      }
      // Track number of digits before caret to restore position after formatting
      const selStart = input.selectionStart || 0;
      const digitsBefore = prev.slice(0, selStart).replace(/[^\d]/g, '').length;
      // Split integer/fraction and insert thousands separators
      const [intRaw, fracRaw = ''] = raw.split('.');
      const intStr = intRaw.replace(/^0+(?=\d)/, '') || '0';
      const intFormatted = Number(intStr).toLocaleString('en-US');
      const fracStr = fracRaw.slice(0, 2);
      let next = fracStr ? `${intFormatted}.${fracStr}` : intFormatted;
      if (!fracStr && hadTrailingDot) next = `${intFormatted}.`;
      if (next !== prev) {
        input.value = next;
        // Restore caret position based on digit count
        try {
          let count = 0, pos = 0;
          while (pos < next.length) {
            if (/\d/.test(next[pos])) {
              count++;
              if (count > digitsBefore) break;
            }
            pos++;
          }
          input.setSelectionRange(pos, pos);
        } catch (err) { /* ignore */ }
      }
      updateSummary();
      if (typeof validateSendForm === 'function') validateSendForm();
    };
    amountInput.addEventListener('input', formatCurrencyInput, { passive: true });
    amountInput.addEventListener('change', formatCurrencyInput);
  }
  feeRadios.forEach(r => r.addEventListener('change', () => { updateSummary(); if (typeof validateSendForm === 'function') validateSendForm(); }));
  deductRadios.forEach(r => r.addEventListener('change', () => { updateSummary(); if (typeof validateSendForm === 'function') validateSendForm(); }));
  const conversionTermsCheckbox = document.getElementById('conversionTermsCheckbox');
  if (conversionTermsCheckbox) {
    conversionTermsCheckbox.addEventListener('change', () => { if (typeof validateSendForm === 'function') validateSendForm(); });
  }
  if (natureSelect) natureSelect.addEventListener('change', () => { updateNaturePurpose(); if (typeof validateSendForm === 'function') validateSendForm(); });
  const purposeOthersField = document.getElementById('purpose-others-field');
  const purposeOthersInput = document.getElementById('purposeOthers');
  if (purposeSelect) {
    purposeSelect.addEventListener('change', () => {
      const isOthers = purposeSelect.value === 'others';
      if (purposeOthersField) {
        purposeOthersField.style.display = isOthers ? '' : 'none';
      }
      if (isOthers && purposeOthersInput) {
        // Auto-focus when "Others" is selected
        setTimeout(() => {
          purposeOthersInput.focus();
        }, 10);
      } else if (purposeOthersInput) {
        // Clear the field when switching away from "Others"
        purposeOthersInput.value = '';
        purposeOthersInput.classList.remove('is-filled');
      }
      if (typeof updatePurposeOnly === 'function') updatePurposeOnly();
      if (typeof validateSendForm === 'function') validateSendForm();
    });
  }
  // Handle input styling for purposeOthers field
  if (purposeOthersInput) {
    purposeOthersInput.addEventListener('input', () => {
      const hasValue = purposeOthersInput.value.trim().length > 0;
      purposeOthersInput.classList.toggle('is-filled', hasValue);
      if (typeof validateSendForm === 'function') validateSendForm();
    }, { passive: true });
    purposeOthersInput.addEventListener('change', () => {
      if (typeof validateSendForm === 'function') validateSendForm();
    });
  }
  // Initialize purposeOthers field visibility on page load
  if (purposeSelect && purposeOthersField) {
    const isOthers = purposeSelect.value === 'others';
    purposeOthersField.style.display = isOthers ? '' : 'none';
  }
  // Generic listeners so clearing any field re-validates immediately
  const attachValidationListeners = () => {
    const formRoot = document.querySelector('.form');
    if (!formRoot) return;
    formRoot.querySelectorAll('input[type="text"], input[type="email"], textarea').forEach((el) => {
      el.addEventListener('input', () => { if (typeof validateSendForm === 'function') validateSendForm(); }, { passive: true });
      el.addEventListener('change', () => { if (typeof validateSendForm === 'function') validateSendForm(); });
    });
    formRoot.querySelectorAll('select').forEach((el) => {
      el.addEventListener('change', () => { if (typeof validateSendForm === 'function') validateSendForm(); });
    });
  };
  attachValidationListeners();
  // Initial compute
  updateSummary();
  updateNaturePurpose();
  if (typeof updatePurposeOnly === 'function') updatePurposeOnly();
  syncAccountDisplay();
  if (typeof validateSendForm === 'function') validateSendForm();

  // ---- Upload item interactions ----
  const initUploadItems = () => {
    const ensureActions = (item) => {
      let actions = item.querySelector('.upload-item__actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'upload-item__actions';
        const btn = item.querySelector('.btn');
        if (btn) {
          item.replaceChild(actions, btn);
          actions.appendChild(btn);
        } else {
          item.appendChild(actions);
        }
      }
      return actions;
    };
    // Update doc-miss-row disabled state based on upload-item state
    const updateDocMissRowState = (item) => {
      const nextSibling = item.nextElementSibling;
      const missRow = nextSibling && nextSibling.classList.contains('doc-miss-row') ? nextSibling : null;
      if (missRow) {
        const checkbox = missRow.querySelector('input[type="checkbox"]');
        const isUploaded = item.classList.contains('is-uploaded');
        if (checkbox) {
          checkbox.disabled = isUploaded;
          if (isUploaded) {
            checkbox.checked = false; // Uncheck if uploaded
            missRow.classList.add('is-disabled');
          } else {
            missRow.classList.remove('is-disabled');
          }
        }
      }
    };
    const setNotUploaded = (item) => {
      item.classList.remove('is-uploaded');
      const badgeImg = item.querySelector('.upload-item__badge img');
      if (badgeImg) badgeImg.src = 'assets/icon_upload_1.svg';
      const subEl = item.querySelector('.upload-item__meta small');
      const inPre = !!item.closest('#docs-pre');
      const inPost = !!item.closest('#docs-post');
      if (subEl) {
        if (inPre) {
          // Keep instructional subtitle based on selected doc type for pre-shipment
          const docTypeSel = document.getElementById('docType');
          const val = docTypeSel ? docTypeSel.value : '';
          if (val === 'PI') {
            subEl.textContent = 'Must include Proforma Invoice (PI) number';
          } else if (val === 'PO') {
            subEl.textContent = 'Must include Purchase order (PO) number';
          } else if (val === 'CC') {
            subEl.textContent = '';
          } else {
            subEl.textContent = '';
          }
        } else if (inPost) {
          const titleTxt = (item.querySelector('.upload-item__title')?.textContent || '').toLowerCase();
          let desc = '';
          if (titleTxt.includes('commercial invoice')) {
            desc = 'The official invoice issued by the seller after shipment';
          } else if (titleTxt.includes('transport')) {
            desc = 'Proof of shipment e.g., bill of lading, airway bill, or courier waybill';
          } else if (titleTxt.includes('packing')) {
            desc = 'Detailed list of goods included in the shipment';
          }
          subEl.textContent = desc;
        } else {
          subEl.textContent = '';
        }
      }
      const actions = ensureActions(item);
      const mainBtn = actions.querySelector('.btn');
      if (mainBtn) {
        mainBtn.classList.add('btn--primary');
        mainBtn.classList.remove('btn--secondary');
        mainBtn.textContent = 'Upload';
      }
      const resetBtn = actions.querySelector('.upload-reset');
      if (resetBtn) resetBtn.remove();
      // Re-enable doc-miss-row when not uploaded
      updateDocMissRowState(item);
      if (typeof validateSendForm === 'function') validateSendForm();
    };
    const setUploaded = (item) => {
      item.classList.add('is-uploaded');
      const actions = ensureActions(item);
      // Subtitle per context
      const subEl = item.querySelector('.upload-item__meta small');
      const inPre = !!item.closest('#docs-pre');
      const inPost = !!item.closest('#docs-post');
      if (subEl) {
        let filename = '';
        if (inPre) {
          filename = 'Invoice123.pdf';
        } else if (inPost) {
          const list = Array.from(item.parentElement?.querySelectorAll('.upload-item') || []);
          const idx = Math.max(0, list.indexOf(item));
          const labels = ['AInvoice123.pdf', 'BInvoice123.pdf', 'CInvoice123.pdf'];
          filename = labels[idx] || 'Document123.pdf';
        } else {
          filename = 'Document123.pdf';
        }
        // Wrap filename in a link for prototype realism
        subEl.innerHTML = `<a href="#" target="_blank">${filename}</a>`;
      }
      // Badge icon success
      const badgeImg = item.querySelector('.upload-item__badge img');
      if (badgeImg) badgeImg.src = 'assets/icon_snackbar_success.svg';
      // Main button shows "Remove file" while uploaded
      let mainBtn = actions.querySelector('.btn');
      if (mainBtn) {
        mainBtn.classList.remove('btn--primary');
        mainBtn.classList.add('btn--secondary');
        mainBtn.textContent = 'Remove file';
      }
      // Disable doc-miss-row when uploaded
      updateDocMissRowState(item);
      if (typeof validateSendForm === 'function') validateSendForm();
    };
    // Ensure initial structure and default subtitles per context
    document.querySelectorAll('.upload-item').forEach((item) => {
      ensureActions(item);
      setNotUploaded(item);
    });
    // Wire main buttons: toggle state on click
    document.querySelectorAll('.upload-item .upload-item__actions .btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.upload-item');
        if (!item) return;
        if (item.classList.contains('is-uploaded')) {
          setNotUploaded(item);
          // Snackbar: File removed
          if (typeof window.showSnackbar === 'function') {
            window.showSnackbar('File removed');
          } else {
            // fallback
            const el = document.createElement('div');
            el.className = 'snackbar snackbar--success';
            el.innerHTML = '<img class="snackbar__icon" src="assets/icon_snackbar_success.svg" alt=""/><span>File removed</span>';
            document.body.appendChild(el);
            requestAnimationFrame(() => el.classList.add('is-visible'));
            setTimeout(() => {
              el.classList.remove('is-visible');
              setTimeout(() => el.remove(), 250);
            }, 2000);
          }
        } else {
          setUploaded(item);
        }
      }, { passive: true });
    });
  };
  initUploadItems();

  // Prevent default link behavior for uploaded file name links (prototype only)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.upload-item.is-uploaded .upload-item__meta .muted a');
    if (link) {
      e.preventDefault();
    }
  }, { passive: false });

  // Revalidate + UI when post-shipment missing-document checkboxes change
  const updateMissingDocsUI = () => {
    const post = document.getElementById('docs-post');
    if (!post) return;
    const declare = post.querySelector('#docsDeclare');
    const missRows = Array.from(post.querySelectorAll('.doc-miss-row'));
    const missingTypes = [];
    missRows.forEach((row) => {
      const cb = row.querySelector('input[type="checkbox"]');
      const prev = row.previousElementSibling;
      const item = (prev && prev.classList && prev.classList.contains('upload-item')) ? prev : null;
      if (!cb || !item) return;
      const titleEl = item.querySelector('.upload-item__title');
      const title = (titleEl && titleEl.textContent || '').trim();
      const isTransport = /transport/i.test(title);
      const isPacking = /pack/i.test(title);
      if (cb.checked) {
        // Mark as missing and reset to default
        item.classList.add('is-missing');
        // reset upload state
        item.classList.remove('is-uploaded');
        const badgeImg = item.querySelector('.upload-item__badge img');
        if (badgeImg) badgeImg.src = 'assets/icon_upload_1.svg';
        const subEl = item.querySelector('.upload-item__meta small');
        if (subEl) {
          const lower = title.toLowerCase();
          if (lower.includes('commercial invoice')) {
            subEl.textContent = 'The official invoice issued by the seller after shipment';
          } else if (isTransport) {
            subEl.textContent = 'Proof of shipment e.g., bill of lading, airway bill, or courier waybill';
          } else if (isPacking) {
            subEl.textContent = 'Detailed list of goods included in the shipment';
          } else {
            subEl.textContent = '';
          }
        }
        // disable actions and normalize main button
        const actions = item.querySelector('.upload-item__actions');
        if (actions) {
          const mainBtn = actions.querySelector('.btn:not(.upload-reset)');
          if (mainBtn) {
            mainBtn.classList.add('btn--primary');
            mainBtn.classList.remove('btn--secondary');
            mainBtn.textContent = 'Upload';
            mainBtn.disabled = true;
          }
          const resetBtn = actions.querySelector('.upload-reset');
          if (resetBtn) resetBtn.remove();
        }
        // Remove disabled state from doc-miss-row since item is now not uploaded
        row.classList.remove('is-disabled');
        cb.disabled = false;
        if (isTransport) missingTypes.push('transport document');
        if (isPacking) missingTypes.push('packing list');
      } else {
        // unmark missing and re-enable actions
        item.classList.remove('is-missing');
        const actions = item.querySelector('.upload-item__actions');
        if (actions) {
          actions.querySelectorAll('button').forEach(b => { b.disabled = false; });
        }
        // Update disabled state of doc-miss-row based on upload state
        const nextSibling = item.nextElementSibling;
        const missRow = nextSibling && nextSibling.classList.contains('doc-miss-row') ? nextSibling : null;
        if (missRow) {
          const missCb = missRow.querySelector('input[type="checkbox"]');
          const isUploaded = item.classList.contains('is-uploaded');
          if (missCb) {
            missCb.disabled = isUploaded;
            if (isUploaded) {
              missCb.checked = false;
              missRow.classList.add('is-disabled');
            } else {
              missRow.classList.remove('is-disabled');
            }
          }
        }
      }
    });
    const unique = Array.from(new Set(missingTypes));
    if (declare) {
      if (unique.length > 0) {
        // Singular label for legacy span (as originally designed)
        const singularText = unique.length === 1 ? unique[0] : unique.slice(0, 2).join(' or ');
        // Pluralize each type for title sentence variant
        const pluralized = unique.map(t => t.endsWith('s') ? t : `${t}s`);
        const pluralText = pluralized.length === 1 ? pluralized[0] : pluralized.slice(0, 2).join(' or ');
        const span = declare.querySelector('#docsDeclareTypes');
        if (span) span.textContent = singularText;
        const titleEl = declare.querySelector('.docs-declare__title');
        if (titleEl) {
          titleEl.textContent = `By proceeding, I confirm that this payment does not involve any ${pluralText}`;
        }
        declare.hidden = false;
      } else {
        declare.hidden = true;
      }
    }
    if (typeof validateSendForm === 'function') validateSendForm();
  };
  document.querySelectorAll('#docs-post .doc-miss-row input[type=\"checkbox\"]').forEach((chk) => {
    chk.addEventListener('change', updateMissingDocsUI, { passive: true });
    // Prevent clicks on disabled checkboxes
    chk.addEventListener('click', (e) => {
      if (chk.disabled) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, { passive: false });
    // Also prevent clicks on the label when checkbox is disabled
    const label = chk.closest('.doc-miss');
    if (label) {
      label.addEventListener('click', (e) => {
        if (chk.disabled) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, { passive: false });
    }
  });
  // run once on init
  updateMissingDocsUI();

  // Open convert/fees details modal
  // const feesOpen = document.getElementById('fees-details-open');
  // if (feesOpen) {
  //   feesOpen.addEventListener('click', (e) => {
  //     e.preventDefault();
  //     const modal = document.getElementById('convertDetailsModal') || document.getElementById('feesDetailsModal');
  //     if (!modal) return;
  //     modal.setAttribute('aria-hidden', 'false');
  //     document.documentElement.classList.add('modal-open');
  //     document.body.classList.add('modal-open');
  //     try {
  //       const y = window.scrollY || window.pageYOffset || 0;
  //       document.body.dataset.scrollY = String(y);
  //       document.body.style.top = `-${y}px`;
  //       document.body.classList.add('modal-locked');
  //     } catch (_) {}
  //   });
  // }
  // Mobile summary modal open
  const mobileSummaryOpen = document.getElementById('mobileSummaryOpen');
  if (mobileSummaryOpen) {
    mobileSummaryOpen.addEventListener('click', (e) => {
      e.preventDefault();
      // Ensure summary is up to date before cloning
      updateSummary();
      // Small delay to ensure DOM updates
      setTimeout(() => {
        const host = document.getElementById('mobileSummaryContent');
        const card = document.querySelector('.card--summary');
        const recip = document.querySelector('.summary-recipient');
        const modal = document.getElementById('mobileSummaryModal');
        if (host && card) {
          const sectionHead = card.querySelector('.summary-section-head');
          // Prefer the amount & fees box; fall back to second summary-box, then any
          let box = card.querySelector('#summaryBoxAmount');
          if (!box) {
            const allBoxes = card.querySelectorAll('.summary-box');
            if (allBoxes.length > 1) {
              box = allBoxes[1];
            } else {
              box = allBoxes[0] || null;
            }
          }
          host.innerHTML = '';
          // Outer wrapper for modal layout
          const wrap = document.createElement('div');
          wrap.className = 'summary-modal-copy';
          // Card wrapper that mimics desktop summary card but without .card--summary
          const modalCard = document.createElement('div');
          modalCard.className = 'card card--section summary-modal-card';
          // Clone recipient chip
          if (recip) {
            const r = recip.cloneNode(true);
            modalCard.appendChild(r);
          }
          // Clone section head if it exists - force it visible
          if (sectionHead) {
            const sh = sectionHead.cloneNode(true);
            sh.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
            modalCard.appendChild(sh);
          }
          if (box) {
            const b = box.cloneNode(true);
            // Ensure the box itself is visible
            b.style.display = 'block';
            b.style.visibility = 'visible';
            b.style.opacity = '1';
            // Remove any inline styles that hide items
            b.querySelectorAll('[style]').forEach(el => {
              const style = el.getAttribute('style');
              if (style && (style.includes('display:none') || style.includes('display: none'))) {
                el.removeAttribute('style');
              }
            });
            // Force ALL summary pairs and content to be visible with inline styles
            const pairs = b.querySelectorAll('.summary-pair');
            pairs.forEach(el => {
              el.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
              el.classList.remove('is-hidden');
              // Make all children visible too
              el.querySelectorAll('*').forEach(child => {
                child.style.cssText += 'visibility: visible !important; opacity: 1 !important;';
              });
            });
            b.querySelectorAll('.summary-separator').forEach(el => {
              el.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            });
            b.querySelectorAll('.summary-note').forEach(el => {
              el.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            });
            // Hide conversion rate element if USD is selected (after cloning, check current state)
            const payerCurrency = getPayerCurrency();
            const showConversion = payerCurrency !== payeeCurrency;
            const clonedConvertDetails = b.querySelector('#fees-details-open');
            if (clonedConvertDetails) {
              clonedConvertDetails.style.display = showConversion ? '' : 'none';
            }
            modalCard.appendChild(b);
          } else {
            console.warn('Summary box not found for cloning');
          }
          // Clone summary-note if it exists (it's outside the summary-box)
          const summaryNote = card.querySelector('.summary-note');
          if (summaryNote) {
            const noteClone = summaryNote.cloneNode(true);
            noteClone.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
            modalCard.appendChild(noteClone);
          }
          wrap.appendChild(modalCard);
          host.appendChild(wrap);

          if (modal) {
            modal.setAttribute('aria-hidden', 'false');
            document.documentElement.classList.add('modal-open');
            document.body.classList.add('modal-open');
            try {
              const y = window.scrollY || window.pageYOffset || 0;
              document.body.dataset.scrollY = String(y);
              document.body.style.top = `-${y}px`;
              document.body.classList.add('modal-locked');
            } catch (_) { }
          }
        }
      }, 10); // Small delay to ensure DOM updates
    });
  }
  const proceedToReview = () => {
    try {
      const getText = (sel) => (document.querySelector(sel)?.textContent || '').trim();
      const amountInput = document.getElementById('amount');
      const rawAmt = (amountInput?.value || '').replace(/,/g, '');
      const amount = parseFloat(rawAmt) || 0;
      const feeRate = getFeeRate();
      // Fee mode
      const feeSel = Array.from(document.querySelectorAll('input[type="radio"][name="fee"]')).find(r => r.checked)?.value || 'you';
      let payerRate = 0, receiverRate = 0;
      if (feeSel === 'you') { payerRate = feeRate; receiverRate = 0; }
      else if (feeSel === 'receiver') { payerRate = 0; receiverRate = feeRate; }
      else { payerRate = feeRate / 2; receiverRate = feeRate / 2; }
      // Payer currency
      const payerCurrency = Array.from(document.querySelectorAll('input[type="radio"][name="deduct"]')).find(r => r.checked)?.value || 'USD';
      const payeeCurrency = 'USD';
      // Calculate fees with minimum and maximum fee logic
      const { payerFee, receiverFee, isBelowMinimum, isAboveMaximum, actualServiceFee } = calculateFees(amount, payerRate, receiverRate, feeRate);
      // For request-payment: logic is inverted (you receive, customer pays)
      // For send-payment: you pay, receiver gets
      const isRequestPayment = window.location.pathname.includes('request-payment');
      const youPay = isRequestPayment ? amount + receiverFee : amount + payerFee; // Customer pays (request) or You pay (send)
      let payeeGets = isRequestPayment ? amount - payerFee : amount - receiverFee; // You receive (request) or Receiver gets (send)
      // Prevent "You receive" from going negative (clamp to 0)
      if (isRequestPayment && payeeGets < 0) {
        payeeGets = 0;
      }
      const fmt = (v, cur) => `${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;
      // Nature/Purpose labels
      const natureSel = document.getElementById('nature');
      const purposeSel = document.getElementById('purpose');
      const natureLabel = natureSel?.selectedOptions?.[0]?.textContent?.trim() || '';
      const purposeLabel = purposeSel?.selectedOptions?.[0]?.textContent?.trim() || '';
      // Doc numbers and attached docs (vary by nature)
      const piNumber = document.getElementById('piNumber')?.value || '';
      const ciNumber = document.getElementById('ciNumber')?.value || '';
      const docNotes = document.getElementById('docNotes')?.value || document.getElementById('docNotesPost')?.value || '';
      let docNumber = '';
      let docNumLabel = '';
      let attached = [];
      let docsDetail = [];
      const natureVal = natureSel?.value || '';
      if (natureVal === 'pre_shipment') {
        const docTypeSel = document.getElementById('docType');
        const docTypeVal = docTypeSel ? docTypeSel.value : '';
        if (docTypeVal === 'PI') {
          attached = ['Proforma invoice (PI)'];
          docsDetail = [{ title: 'Proforma invoice (PI)', declared: false }];
          docNumLabel = 'Proforma invoice number';
          docNumber = piNumber || '';
        } else if (docTypeVal === 'PO') {
          attached = ['Purchase order (PO)'];
          docsDetail = [{ title: 'Purchase order (PO)', declared: false }];
          docNumLabel = 'Purchase order number';
          docNumber = piNumber || '';
        } else if (docTypeVal === 'CC') {
          attached = ['Commercial contract (CC)'];
          docsDetail = [{ title: 'Commercial contract (CC)', declared: false }];
          docNumLabel = 'Commercial contract number';
          docNumber = piNumber || '';
        } else {
          attached = [];
          docsDetail = [];
          docNumLabel = '';
          docNumber = '';
        }
      } else {
        // Post-shipment: list uploaded or declared-missing docs
        document.querySelectorAll('#docs-post .upload-item').forEach((it) => {
          const title = it.querySelector('.upload-item__title')?.textContent?.trim();
          if (!title) return;
          const uploaded = it.classList.contains('is-uploaded');
          let missedOk = false;
          const maybeMissRow = it.nextElementSibling;
          if (maybeMissRow && maybeMissRow.classList && maybeMissRow.classList.contains('doc-miss-row')) {
            const missChk = maybeMissRow.querySelector('input[type="checkbox"]');
            if (missChk) missedOk = !!missChk.checked;
          }
          if (uploaded || missedOk) {
            attached.push(title);
            docsDetail.push({ title, declared: !uploaded && !!missedOk });
          }
        });
        docNumLabel = 'Commercial invoice number';
        docNumber = ciNumber || '';
      }
      const paymentId = "PYT-20251118-f2d3fa4e";

      const data = {
        // Some pages render the preview label as "From <name>" while others use "To <name>".
        // Normalize so downstream pages always get the raw counterparty name.
        receiverName: (getText('.summary-recipient .recipient-select__title') || '').replace(/^(To|From)\s+/i, ''),
        receiverBank: getText('.summary-recipient .recipient-select__subtitle'),
        amountPayableFmt: fmt(amount, payeeCurrency),
        deductedFrom: `${payerCurrency} account`,
        feePct: `${(feeRate * 100).toFixed(2)}%`,
        payerShareLabel: isRequestPayment ? '• Paid by you' : ((isBelowMinimum || isAboveMaximum) ? 'Paid by you' : `${(payerRate * 100).toFixed(2)}% paid by you`),
        payerShareAmt: fmt(payerFee, payerCurrency),
        receiverShareLabel: isRequestPayment ? '• Paid by customer' : ((isBelowMinimum || isAboveMaximum) ? `Paid by ${isRequestPayment ? 'customer' : 'receiver'}` : `${(receiverRate * 100).toFixed(2)}% paid by ${isRequestPayment ? 'customer' : 'receiver'}`),
        receiverShareAmt: fmt(receiverFee, payeeCurrency),
        toBeDeducted: fmt(youPay, payerCurrency),
        receiverGets: fmt(payeeGets, payeeCurrency),
        serviceMinApplied: !!isBelowMinimum,
        serviceMaxApplied: !!isAboveMaximum,
        serviceMinAmount: actualServiceFee,
        serviceMaxAmount: actualServiceFee,
        conversion: payerCurrency !== payeeCurrency ? `1 ${payerCurrency} = 1 ${payeeCurrency}` : '',
        nature: natureLabel,
        purpose: purposeLabel,
        docNumLabel,
        docNumber,
        docNotes,
        expiresAfter: isRequestPayment ? (document.getElementById('expiresAfter')?.value || '') : undefined,
        attachedDocs: attached.join(', '),
        docsDetail,
        paymentId,
        dateTime: new Date().toLocaleString('en-GB', { hour12: false }),
        status: 'Processing',
      };
      sessionStorage.setItem('receiptData', JSON.stringify(data));
    } catch (_) { }
    // Show loading then navigate to review page
    const loading = document.getElementById('loadingModal');
    if (loading) {
      loading.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
      try {
        const y = window.scrollY || window.pageYOffset || 0;
        document.body.dataset.scrollY = String(y);
        document.body.style.top = `-${y}px`;
        document.body.classList.add('modal-locked');
      } catch (_) { }
    }
    // Determine redirect URL based on current page
    const isRequestPayment = window.location.pathname.includes('request-payment');
    const reviewUrl = isRequestPayment ? 'review-payment-request.html' : 'review-payment.html';
    setTimeout(() => { window.location.href = reviewUrl; }, 600);
  };

  // Request-payment: "expires on" quick-fill (design-in-progress)
  (function initRequestPaymentExpiresOn() {
    try {
      const isRequestPayment = (window.location.pathname || '').includes('request-payment');
      if (!isRequestPayment) return;
      const input = document.getElementById('expiresAfter');
      if (!input) return;

      const formatUtc8 = () => {
        const now = new Date();
        const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
        const utc8 = new Date(utcMs + 8 * 60 * 60 * 1000);
        const dd = String(utc8.getUTCDate()).padStart(2, '0');
        const mm = String(utc8.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = String(utc8.getUTCFullYear());
        return `${dd}/${mm}/${yyyy} (UTC+8)`;
      };

      const fill = () => {
        if ((input.value || '').trim()) return;
        input.value = formatUtc8();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      input.addEventListener('click', fill);
      input.addEventListener('focus', fill);
    } catch (_) { }
  })();
  // Review payment navigation (button is outside <form>)
  const confirmTrigger = document.getElementById('confirm-send');
  if (confirmTrigger) {
    confirmTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      hasTriedSubmit = true;
      // Re-validate on click so inline errors and aria-disabled are up to date
      if (typeof validateSendForm === 'function') validateSendForm();

      const isValid = confirmTrigger.getAttribute('aria-disabled') === 'false';
      if (!isValid) {
        setConfirmErrorVisible(true);
        return;
      }
      setConfirmErrorVisible(false);
      proceedToReview();
    });
  }

  // Mobile sticky confirm ("Review") button
  const confirmTriggerInline = document.getElementById('confirm-send-sticky');
  if (confirmTriggerInline) {
    confirmTriggerInline.addEventListener('click', (e) => {
      e.preventDefault();
      hasTriedSubmit = true;
      if (typeof validateSendForm === 'function') validateSendForm();
      const isValidInline = confirmTriggerInline.getAttribute('aria-disabled') === 'false';
      if (!isValidInline) {
        setConfirmErrorVisible(true);
        return;
      }
      setConfirmErrorVisible(false);
      proceedToReview();
    });
  }
  // Send Payment: dev tools (Fill / Clear) in build-badge
  (function initSendDevTools() {
    const root = document.querySelector('main.page--send');
    if (!root) return;
    const fillBtn = document.getElementById('sp-fill');
    const clearBtn = document.getElementById('sp-clear');
    if (!fillBtn || !clearBtn) return;

    const amountEl = document.getElementById('amount');
    const natureEl = document.getElementById('nature');
    const purposeEl = document.getElementById('purpose');
    const expiresEl = document.getElementById('expiresAfter');
    const docTypeEl = document.getElementById('docType');
    const piNumberEl = document.getElementById('piNumber');
    const ciNumberEl = document.getElementById('ciNumber');
    const deductUSD = root.querySelector('input[type="radio"][name="deduct"][value="USD"]');
    const deductUSDT = root.querySelector('input[type="radio"][name="deduct"][value="USDT"]');
    const preUpload = root.querySelector('#docs-pre .upload-item');
    const postUploads = Array.from(root.querySelectorAll('#docs-post .upload-item'));

    const trigger = (el) => { if (!el) return; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    const clickMainUploadBtn = (item) => {
      const btn = item?.querySelector('.upload-item__actions .btn') || item?.querySelector('.btn');
      if (btn) btn.click();
    };
    const clickResetBtn = (item) => {
      const btn = item?.querySelector('.upload-item__actions .upload-reset');
      if (btn) btn.click();
    };

    fillBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Expires on (request-payment)
      if (expiresEl) {
        const now = new Date();
        const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
        const utc8 = new Date(utcMs + 8 * 60 * 60 * 1000);
        const dd = String(utc8.getUTCDate()).padStart(2, '0');
        const mm = String(utc8.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = String(utc8.getUTCFullYear());
        expiresEl.value = `${dd}/${mm}/${yyyy} (UTC+8)`;
        trigger(expiresEl);
      }
      // Basic fields
      if (natureEl) { natureEl.value = 'pre_shipment'; trigger(natureEl); }
      if (purposeEl) { purposeEl.value = 'goods_purchase'; trigger(purposeEl); }
      if (amountEl) { amountEl.value = '50000'; trigger(amountEl); }
      if (deductUSD) { deductUSD.checked = true; trigger(deductUSD); }
      // Docs (pre-shipment)
      if (docTypeEl) { docTypeEl.value = 'PI'; trigger(docTypeEl); }
      if (piNumberEl) { piNumberEl.value = 'PI-001234'; trigger(piNumberEl); }
      // Upload PI in pre-shipment group
      if (preUpload) {
        // toggle to uploaded via main button
        if (!preUpload.classList.contains('is-uploaded')) clickMainUploadBtn(preUpload);
        // ensure display name with link (after setUploaded creates the link structure)
        setTimeout(() => {
          const sub = preUpload.querySelector('.upload-item__meta small');
          if (sub && preUpload.classList.contains('is-uploaded')) {
            sub.innerHTML = `<a href="#" target="_blank">PI-001234.pdf</a>`;
          }
        }, 10);
      }
      // For demo, also upload all post-shipment documents with A/B/C names
      postUploads.forEach((it) => {
        if (!it.classList.contains('is-uploaded')) clickMainUploadBtn(it);
      });
      // Ensure validation runs
      if (typeof validateSendForm === 'function') validateSendForm();
    });

    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (expiresEl) { expiresEl.value = ''; trigger(expiresEl); }
      if (amountEl) { amountEl.value = ''; trigger(amountEl); }
      if (natureEl) { natureEl.value = ''; trigger(natureEl); }
      if (purposeEl) { purposeEl.value = ''; trigger(purposeEl); }
      const purposeOthersEl = document.getElementById('purposeOthers');
      if (purposeOthersEl) { purposeOthersEl.value = ''; trigger(purposeOthersEl); }
      if (deductUSD) { deductUSD.checked = true; trigger(deductUSD); }
      if (docTypeEl) { docTypeEl.value = ''; trigger(docTypeEl); }
      if (piNumberEl) { piNumberEl.value = ''; trigger(piNumberEl); }
      if (ciNumberEl) { ciNumberEl.value = ''; trigger(ciNumberEl); }
      // Reset uploads to 'not uploaded' state via reset button if present
      if (preUpload && preUpload.classList.contains('is-uploaded')) clickResetBtn(preUpload);
      postUploads.forEach((it) => { if (it.classList.contains('is-uploaded')) clickResetBtn(it); });
      // Clear inline errors if any
      const amountError = document.getElementById('amount-error');
      if (amountError) amountError.hidden = true;
      const amountWrap = document.querySelector('.amount-input');
      if (amountWrap) amountWrap.classList.remove('is-error');
      document.querySelectorAll('.fee-options--deduct .fee-option .fee-option__content .muted').forEach(el => el.classList.remove('is-error'));
      if (typeof validateSendForm === 'function') validateSendForm();
    });
  })();

  // Close mobile summary modal when resizing from mobile to desktop
  let previousWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    const currentWidth = window.innerWidth;
    const wasMobile = previousWidth < DESKTOP_BP;
    const isDesktop = currentWidth >= DESKTOP_BP;

    // If transitioning from mobile to desktop, close the modal
    if (wasMobile && isDesktop) {
      const modal = document.getElementById('mobileSummaryModal');
      if (modal && modal.getAttribute('aria-hidden') === 'false') {
        const close = (el) => {
          if (!el) return;
          el.setAttribute('aria-hidden', 'true');
          document.documentElement.classList.remove('modal-open');
          document.body.classList.remove('modal-open');
          try {
            const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
            document.body.classList.remove('modal-locked');
            document.body.style.top = '';
            delete document.body.dataset.scrollY;
            window.scrollTo(0, y);
          } catch (_) { }
        };
        close(modal);
      }
    }
    previousWidth = currentWidth;
  });
}

// Run immediately if DOM is already parsed (defer), otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSendPayment);
} else {
  initSendPayment();
}

// Payment Methods Modal - Open on link click
(function initPaymentMethodsModal() {
  const link = document.getElementById('paymentMethodsLink');
  const modal = document.getElementById('paymentMethodsModal');
  if (!link || !modal) return;

  link.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof window.__openModal === 'function') {
      window.__openModal(modal);
    } else {
      modal.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
    }
  });
})();

// Confirm modal actions
(function initConfirmModalActions() {
  const modal = document.getElementById('confirmPaymentModal');
  if (!modal) return;
  const confirm = document.getElementById('unlinkConfirm');
  const input = document.getElementById('unlinkCodeInput');
  const clearBtn = document.getElementById('unlinkClearBtn');
  const err = document.getElementById('unlinkCodeError');
  function syncAuthState() {
    const v = (input && input.value || '').trim();
    const ok = /^\d{6}$/.test(v);
    if (confirm) confirm.disabled = !ok;
    if (err) err.hidden = ok;
    if (clearBtn) clearBtn.classList.toggle('is-hidden', v.length === 0);
  }
  if (input) {
    input.addEventListener('input', syncAuthState, { passive: true });
    input.addEventListener('change', syncAuthState);
  }
  if (clearBtn && input) {
    clearBtn.addEventListener('click', () => { input.value = ''; syncAuthState(); input.focus(); });
  }
  if (confirm) {
    confirm.addEventListener('click', () => {
      // Capture or preserve receipt data before leaving
      try {
        const isSendPage = !!document.querySelector('main.page--send');
        const isReviewPage = !!document.querySelector('main.page--review');
        if (isSendPage) {
          const getText = (sel) => (document.querySelector(sel)?.textContent || '').trim();
          const amountInput = document.getElementById('amount');
          const rawAmt = (amountInput?.value || '').replace(/,/g, '');
          const amount = parseFloat(rawAmt) || 0;
          const feeRate = getFeeRate();
          // Fee mode
          const feeSel = Array.from(document.querySelectorAll('input[type="radio"][name="fee"]')).find(r => r.checked)?.value || 'you';
          let payerRate = 0, receiverRate = 0;
          if (feeSel === 'you') { payerRate = feeRate; receiverRate = 0; }
          else if (feeSel === 'receiver') { payerRate = 0; receiverRate = feeRate; }
          else { payerRate = feeRate / 2; receiverRate = feeRate / 2; }
          // Payer currency
          const payerCurrency = Array.from(document.querySelectorAll('input[type="radio"][name="deduct"]')).find(r => r.checked)?.value || 'USD';
          const payeeCurrency = 'USD';
          // Calculate fees with minimum and maximum fee logic
          const { payerFee, receiverFee, isBelowMinimum, isAboveMaximum, actualServiceFee } = calculateFees(amount, payerRate, receiverRate, feeRate);
          // For request-payment: logic is inverted (you receive, customer pays)
          // For send-payment: you pay, receiver gets
          const isRequestPayment = window.location.pathname.includes('request-payment');
          const youPay = isRequestPayment ? amount + receiverFee : amount + payerFee; // Customer pays (request) or You pay (send)
          let payeeGets = isRequestPayment ? amount - payerFee : amount - receiverFee; // You receive (request) or Receiver gets (send)
          // Prevent "You receive" from going negative (clamp to 0)
          if (isRequestPayment && payeeGets < 0) {
            payeeGets = 0;
          }
          const fmt = (v, cur) => `${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;
          const data = {
            // Some pages render the preview label as "From <name>" while others use "To <name>".
            // Normalize so downstream pages always get the raw counterparty name.
            receiverName: (getText('.summary-recipient .recipient-select__title') || '').replace(/^(To|From)\s+/i, ''),
            receiverBank: getText('.summary-recipient .recipient-select__subtitle'),
            amountPayableFmt: fmt(amount, payeeCurrency),
            deductedFrom: `${payerCurrency} account`,
            feePct: `${(feeRate * 100).toFixed(2)}%`,
            payerShareLabel: isRequestPayment ? '• Paid by you' : ((isBelowMinimum || isAboveMaximum) ? 'Paid by you' : `${(payerRate * 100).toFixed(2)}% paid by you`),
            payerShareAmt: fmt(payerFee, payerCurrency),
            receiverShareLabel: isRequestPayment ? '• Paid by customer' : ((isBelowMinimum || isAboveMaximum) ? `Paid by ${isRequestPayment ? 'customer' : 'receiver'}` : `${(receiverRate * 100).toFixed(2)}% paid by ${isRequestPayment ? 'customer' : 'receiver'}`),
            receiverShareAmt: fmt(receiverFee, payeeCurrency),
            toBeDeducted: fmt(youPay, payerCurrency),
            receiverGets: fmt(payeeGets, payeeCurrency),
            serviceMinApplied: !!isBelowMinimum,
            serviceMaxApplied: !!isAboveMaximum,
            serviceMinAmount: actualServiceFee,
            serviceMaxAmount: actualServiceFee,
            conversion: payerCurrency !== payeeCurrency ? `1 ${payerCurrency} = 1 ${payeeCurrency}` : '',
            dateTime: new Date().toLocaleString('en-GB', { hour12: false }),
            status: 'Processing',
          };
          sessionStorage.setItem('receiptData', JSON.stringify(data));
        } else if (isReviewPage) {
          // Preserve existing review data; only refresh timestamp
          const raw = sessionStorage.getItem('receiptData');
          const d = raw ? JSON.parse(raw) : {};
          d.dateTime = new Date().toLocaleString('en-GB', { hour12: false });
          sessionStorage.setItem('receiptData', JSON.stringify(d));
        }
      } catch (_) { }
      try {
        if (typeof window.getPrototypeState === 'function' && typeof window.setPrototypeState === 'function') {
          if (window.getPrototypeState() < 4) window.setPrototypeState(4);
        }
      } catch (_) { }
      // Close confirm modal
      modal.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
      // Show loading modal for 2s then redirect
      const loading = document.getElementById('loadingModal');
      if (loading) {
        loading.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        try {
          const y = window.scrollY || window.pageYOffset || 0;
          document.body.dataset.scrollY = String(y);
          document.body.style.top = `-${y}px`;
          document.body.classList.add('modal-locked');
        } catch (_) { }
      }
      setTimeout(() => {
        window.location.href = 'payment-submitted.html';
      }, 2000);
    });
  }
  // Ensure initial visibility of clear matches content
  syncAuthState();
})();

// Select Counterparty page behavior (state-aware)
(function initSelectCounterparty() {
  // Check for both select-customer page and settings page customer panel
  const page = document.querySelector('main.page--cp');
  const settingsPanel = document.getElementById('panel-customers');
  const isSettingsPage = !!settingsPanel;

  if (!page && !isSettingsPage) return;

  const list = page ? page.querySelector('.cp-list') : (settingsPanel ? settingsPanel.querySelector('.cp-list') : null);
  const filter = page ? document.getElementById('filter-verified') : (settingsPanel ? document.getElementById('filter-verified-customers') : null);
  const toolbar = page ? page.querySelector('.cp-toolbar') : (settingsPanel ? settingsPanel.querySelector('.cp-toolbar') : null);
  const sticky = page ? page.querySelector('.cp-sticky') : (settingsPanel ? settingsPanel.querySelector('.cp-sticky') : null);
  if (!list) return;

  // Check if this is the select-customer page
  const isSelectCustomer = window.location.pathname.indexOf('select-customer.html') !== -1;
  // Settings "Customer management" panel should reuse the customer list behavior/data
  const isCustomerListMode = isSelectCustomer || isSettingsPage;

  // Add class to page for CSS targeting
  if (isSelectCustomer) {
    page.classList.add('page--select-customer');

  }

  const STATUS_META = {
    verified: { className: 'cp-status--ok', label: 'Verified' },
    review: { className: 'cp-status--review', label: isCustomerListMode ? 'Awaiting response' : 'Under review' },
    danger: { className: 'cp-status--danger', label: 'Rejected' },
  };

  const STATE_ITEMS = {
    2: isCustomerListMode
      ? [
        { title: 'NovaQuill Ltd', email: 'payments@novaquill.com', status: 'review', href: '#' },
      ]
      : [
        { title: 'NovaQuill Ltd', bank: 'DBS Bank', account: '012-345678-9', status: 'review', href: '#' },
      ],
    3: isCustomerListMode
      ? [
        { title: 'NovaQuill Ltd', email: 'payments@novaquill.com', status: 'verified', href: 'request-payment.html' },
        { title: 'Customer X', email: 'payments@novaquill.com', status: 'verified', href: 'request-payment.html' },
        { title: 'Customer Y', email: 'payments@novaquill.com', status: 'verified', href: 'request-payment.html' },
        { title: 'Customer Z', email: 'payments@novaquill.com', status: 'danger', href: '#' },
      ]
      : [
        { title: 'NovaQuill Ltd', bank: 'DBS Bank', account: '012-345678-9', status: 'verified', href: 'send-payment.html' },
        { title: 'Counterparty X', bank: 'CIMB', account: '012-345678-9', status: 'review', href: '#' },
        { title: 'Counterparty Y', bank: 'CIMB', account: '012-345678-9', status: 'review', href: '#' },
        { title: 'Counterparty Z', bank: 'CIMB', account: '012-345678-9', status: 'danger', href: '#' },
      ],
  };

  const getItemsForState = (state) => {
    if (state <= 1) return [];
    if (state === 2) return STATE_ITEMS[2];
    if (state >= 3) {
      const items = STATE_ITEMS[3];
      // For customer list mode (select-customer + settings customers panel),
      // filter out Customer X, Y, Z when state is 3 or higher
      if (isCustomerListMode && state >= 3) {
        return items.filter((item) => {
          const title = item.title || '';
          return title !== 'Customer X' && title !== 'Customer Y' && title !== 'Customer Z';
        });
      }
      return items;
    }
    return [];
  };

  const renderEmpty = () => {
    if (toolbar) toolbar.classList.add('is-hidden');

    // Hide subheader for select-customer page when empty
    if (isSelectCustomer) {
      const subheader = page.querySelector('.page__subheader');
      if (subheader) subheader.classList.add('is-hidden');
    }

    // Hide cp-sticky on breakpoints below desktop when empty state is visible
    const DESKTOP_BP = 1280;
    if (sticky && window.innerWidth < DESKTOP_BP) {
      sticky.setAttribute('hidden', '');
    }

    const emptyTitle = isCustomerListMode ? 'No customers found' : 'No counterparty accounts yet';
    const emptyText = isCustomerListMode
      ? 'Customers must be added to start requesting payments'
      : 'Add a counterparty bank account before sending a payment.';
    const emptyBtnText = isCustomerListMode ? 'Add customer' : 'Add counterparty account';
    const emptyBtnHref = isCustomerListMode ? 'add-customer.html' : 'add-bank.html';

    const emptyImage = isCustomerListMode
      ? 'assets/Illustration_ No customers.svg'
      : 'assets/icon_bankaccount_blue.svg';
    const emptyImageWidth = isCustomerListMode ? 229 : 48;
    const emptyImageHeight = isCustomerListMode ? 138 : 48;

    list.innerHTML = `
      <li class="cp-empty">
        <img src="${emptyImage}" alt="" width="${emptyImageWidth}" height="${emptyImageHeight}" />
        <p class="cp-empty__title">${emptyTitle}</p>
        <p class="cp-empty__text">${emptyText}</p>
        <a class="btn btn--primary btn--md" href="${emptyBtnHref}">
          ${emptyBtnText}
        </a>
      </li>`;
  };

  const renderNoVerified = () => {
    list.innerHTML = `
      <li class="cp-empty">
        <p class="cp-empty__title">No verified accounts</p>
        <p class="cp-empty__text">Remove the filter or wait for the review to complete.</p>
      </li>`;
  };

  const renderList = () => {
    // Settings page: only activate this logic when the customers panel is the current page
    if (isSettingsPage) {
      try {
        const p = new URLSearchParams(window.location.search).get('page') || '';
        if (p !== 'customers') {
          if (sticky) sticky.setAttribute('hidden', '');
          return;
        }
      } catch (_) { }
    }

    const state = typeof getPrototypeState === 'function' ? getPrototypeState() : PROTOTYPE_STATE_MIN;
    const baseItems = getItemsForState(state);
    const subheader = page ? page.querySelector('.page__subheader') : null;
    const DESKTOP_BP = 1280;

    if (!baseItems.length) {
      if (filter) {
        filter.checked = false;
        filter.disabled = true;
        filter.closest('.cp-filter')?.classList.add('is-disabled');
      }
      renderEmpty();
      return;
    }

    // Show subheader when there are items (for select-customer page)
    if (isSelectCustomer && subheader) {
      subheader.classList.remove('is-hidden');
    }

    // Show cp-sticky when items are available (on breakpoints below desktop)
    if (sticky && window.innerWidth < DESKTOP_BP) {
      sticky.removeAttribute('hidden');
    }

    const hasVerified = baseItems.some((item) => item.status === 'verified');
    if (filter) {
      filter.disabled = !hasVerified;
      const label = filter.closest('.cp-filter');
      if (filter.disabled) {
        filter.checked = false;
        if (label) label.classList.add('is-disabled');
      } else if (label) {
        label.classList.remove('is-disabled');
      }
    }

    if (toolbar) toolbar.classList.remove('is-hidden');

    const onlyVerified = !!(filter && filter.checked);
    const items = onlyVerified ? baseItems.filter((item) => item.status === 'verified') : baseItems.slice();

    if (!items.length) {
      renderNoVerified();
      return;
    }

    const html = items.map((item) => {
      const meta = STATUS_META[item.status] || STATUS_META.review;
      const isVerified = item.status === 'verified';
      const classes = ['cp-item', isVerified ? 'is-verified' : 'is-unverified'];
      let defaultHref;
      if (isSettingsPage) {
        defaultHref = 'customer-details.html';
      } else {
        defaultHref = isSelectCustomer ? 'request-payment.html' : 'send-payment.html';
      }
      // Settings customer management: always go to customer details first
      // For settings page, allow navigation even for unverified items
      const href = isSettingsPage
        ? defaultHref
        : (isVerified
          ? (item.href || defaultHref)
          : '#');
      const mobileLabel = isCustomerListMode
        ? [item.email || 'payments@novaquill.com'].filter(Boolean).join(' ')
        : [`(${item.bank})`, item.account].filter(Boolean).join(' ');
      const metablack = isCustomerListMode ? (item.email || 'payments@novaquill.com') : `(${item.bank})`;
      const metaText = isCustomerListMode ? '' : item.account;
      const email = isCustomerListMode ? (item.email || 'payments@novaquill.com') : '';

      // For select-customer page, add email and customer number inside content on mobile
      const customerContent = isCustomerListMode
        ? `
              <strong class="cp-item__title">${item.title}</strong>
              <span class="cp-item__email">${email}</span>
              <small class="cp-status ${meta.className}">${meta.label}</small>`
        : `
              <strong class="cp-item__title">${item.title}</strong>
              <small class="cp-status ${meta.className}" ${mobileLabel ? `data-mobile-label="${mobileLabel}"` : ''}>${meta.label}</small>`;

      return `
        <li>
          <a class="${classes.join(' ')}" href="${href}" data-status="${item.status}" ${isVerified ? '' : 'aria-disabled="true"'}>
            <span class="cp-item__icon"><img src="assets/outline_office_new.svg" alt="" /></span>
            <span class="cp-item__content">
              ${customerContent}
            </span>
            <span class="cp-item__metablack">${metablack}</span>
            ${metaText ? `<span class="cp-item__meta">${metaText}</span>` : ''}
            <img class="cp-item__chev" src="assets/icon_chevron_right.svg" width="20" height="20" alt="" />
          </a>
        </li>`;
    }).join('');
    list.innerHTML = html;
  };

  if (filter) {
    filter.addEventListener('change', () => renderList());
  }

  // Handle window resize to show/hide sticky footer appropriately
  window.addEventListener('resize', () => {
    // Settings page: only activate this logic when the customers panel is the current page
    if (isSettingsPage) {
      try {
        const p = new URLSearchParams(window.location.search).get('page') || '';
        if (p !== 'customers') {
          if (sticky) sticky.setAttribute('hidden', '');
          return;
        }
      } catch (_) { }
    }

    const state = typeof getPrototypeState === 'function' ? getPrototypeState() : PROTOTYPE_STATE_MIN;
    const baseItems = getItemsForState(state);
    const DESKTOP_BP = 1280;

    if (sticky && window.innerWidth < DESKTOP_BP) {
      // Hide sticky if empty state is visible, show if items are available
      if (baseItems.length > 0) sticky.removeAttribute('hidden');
      else sticky.setAttribute('hidden', '');
    } else if (sticky) {
      // On desktop, sticky is hidden via CSS, so ensure no hidden attr blocks future
      sticky.removeAttribute('hidden');
    }
  });

  document.addEventListener('prototypeStateChange', renderList);
  renderList();
})();

// Modal helpers (reused lightweight pattern)
(function initModalLogic() {
  const open = (el) => {
    if (!el) return;
    el.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    // Lock scroll (iOS safe)
    try {
      const y = window.scrollY || window.pageYOffset || 0;
      document.body.dataset.scrollY = String(y);
      document.body.style.top = `-${y}px`;
      document.body.classList.add('modal-locked');
    } catch (_) { }
  };
  const close = (el) => {
    if (!el) return;
    el.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    // Unlock scroll
    try {
      const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
      document.body.classList.remove('modal-locked');
      document.body.style.top = '';
      delete document.body.dataset.scrollY;
      window.scrollTo(0, y);
    } catch (_) { }
  };

  // Wire close buttons and overlay click
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close(modal);
    });
    modal.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => close(modal));
    });
  });

  window.__openModal = open;
  window.__closeModal = close;

  // Global snackbar helper (idempotent)
  // type: 'success' | 'error' | 'info' (default: 'success')
  window.showSnackbar = function (message, durationMs = 2000, type) {
    try {
      let el = document.getElementById('app-snackbar');
      if (!el) {
        el = document.createElement('div');
        el.id = 'app-snackbar';
        el.className = 'snackbar';
        el.innerHTML = '<img class="snackbar__icon" alt=""/><span class="snackbar__text"></span>';
        document.body.appendChild(el);
      }
      var variant = type === 'error' ? 'error' : (type === 'info' ? 'info' : 'success');
      el.className = 'snackbar snackbar--' + variant;
      var iconEl = el.querySelector('.snackbar__icon');
      if (iconEl) {
        iconEl.setAttribute(
          'src',
          variant === 'error'
            ? 'assets/icon_snackbar_error.svg'
            : (variant === 'info' ? 'assets/snackbar-info.svg' : 'assets/icon_snackbar_success.svg')
        );
      }
      const text = el.querySelector('.snackbar__text');
      if (text) text.textContent = message || '';
      // show
      requestAnimationFrame(() => el.classList.add('is-visible'));
      // hide after duration
      clearTimeout(el._hideTimer);
      el._hideTimer = setTimeout(() => {
        el.classList.remove('is-visible');
      }, durationMs);
    } catch (_) { /* noop */ }
  };

  // Select-counterparty: block unverified items via delegation
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.cp-item');
    if (!link || !link.closest('.cp-list')) return;
    const cpPage = document.querySelector('main.page--cp');
    const settingsPanel = document.getElementById('panel-customers');
    if (!cpPage && !settingsPanel) return;
    const modal = document.getElementById('accountNotVerifiedModal');
    if (!modal) return;
    const statusAttr = link.getAttribute('data-status') || '';
    const isVerified = statusAttr === 'verified' || link.classList.contains('is-verified');
    // On settings customer page, allow navigation even for unverified items
    const isSettingsCustomerPage = !!settingsPanel;
    if (!isVerified && !isSettingsCustomerPage) {
      e.preventDefault();

      // Populate "Awaiting response" modal with clicked customer data (best-effort)
      try {
        const name =
          (link.querySelector('.cp-item__title')?.textContent || '').trim() ||
          (link.querySelector('.transactions__item-title')?.textContent || '').trim() ||
          'NovaQuill Ltd';
        const email =
          (link.querySelector('.cp-item__email')?.textContent || '').trim() ||
          (link.querySelector('.cp-item__metablack')?.textContent || '').trim() ||
          'payments@novaquill.com';

        const nameEl = modal.querySelector('#arCustomerName');
        const emailEl = modal.querySelector('#arCustomerEmail');
        const alertNameEl = modal.querySelector('#arAlertName');
        if (nameEl) nameEl.textContent = name;
        if (emailEl) emailEl.textContent = email;
        if (alertNameEl) alertNameEl.textContent = name;

        const detailsLink = modal.querySelector('#arViewDetails');
        if (detailsLink) {
          detailsLink.addEventListener('click', () => {
            try {
              if (window.sessionStorage && typeof CUSTOMER_DETAILS_RETURN_KEY !== 'undefined') {
                window.sessionStorage.setItem(CUSTOMER_DETAILS_RETURN_KEY, 'select-customer.html');
              }
            } catch (_) { }
          }, { once: true });
        }

        const inviteLink = modal.querySelector('#arInviteLink');
        if (inviteLink && !inviteLink.textContent.trim()) {
          inviteLink.textContent = 'xrexpay.io/invitation-business?type=1234567';
        }
      } catch (_) { }

      open(modal);
      return;
    }

    // For verified items that navigate to send-payment, remember entrypoint
    try {
      const href = link.getAttribute('href') || '';
      if (href.indexOf('send-payment.html') !== -1 && window.sessionStorage && typeof SEND_PAYMENT_RETURN_KEY !== 'undefined') {
        window.sessionStorage.setItem(SEND_PAYMENT_RETURN_KEY, 'select-counterparty');
      }
    } catch (_) {
      // ignore
    }
  });
})();

// Select Counterparty: back crumb routes to quick menu on tablet and below
(function initCpBackNavigation() {
  const isCpPage = document.querySelector('main.page--cp');
  if (!isCpPage) return;
  const crumb = document.querySelector('.page__header--crumb .crumb');
  const title = document.getElementById('cp-back-title');
  if (!crumb) return;
  const handleBack = (e) => {
    const DESKTOP_BP = 1280;
    if (window.innerWidth < DESKTOP_BP) {
      e.preventDefault();
      // Use session flag; index.js will switch to quick tab
      try { sessionStorage.setItem('openQuick', '1'); } catch (_) { }
      window.location.href = 'index.html#quick';
    }
  };
  crumb.addEventListener('click', handleBack);
  if (title) {
    title.addEventListener('click', handleBack);
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') handleBack(e);
    });
  }
})();

// Awaiting response modal: copy invitation link + keyboard support
(function initAwaitingResponseModal() {
  try {
    const modal = document.getElementById('accountNotVerifiedModal');
    if (!modal) return;

    const getInviteText = () => {
      const el = modal.querySelector('#arInviteLink');
      return (el?.textContent || '').trim();
    };

    const copyInvite = async () => {
      const text = getInviteText();
      if (!text) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        }
      } catch (_) { }
      try {
        if (typeof window.showSnackbar === 'function') {
          window.showSnackbar('Link copied to clipboard', 2000);
        }
      } catch (_) { }
    };

    const copyBtn = modal.querySelector('#arCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        void copyInvite();
      });
    }

    const linkBox = modal.querySelector('.ar-linkbox');
    if (linkBox) {
      linkBox.addEventListener('click', (e) => {
        // Ignore clicks on the explicit copy button
        if (e.target && e.target.closest && e.target.closest('#arCopyBtn')) return;
        void copyInvite();
      });
      linkBox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void copyInvite();
        }
      });
    }
  } catch (_) { }
})();

// Send Payment: back crumb/link target based on entrypoint + mobile behavior
(function initSendBackNavigation() {
  const isSendPage = document.querySelector('main.page--send');
  if (!isSendPage) return;
  const crumb = document.querySelector('.page__header--crumb .crumb');
  const title = document.getElementById('sp-back-title');
  if (!crumb) return;
  const isRequestPayment = (window.location.pathname || '').indexOf('request-payment') !== -1;

  // Determine back target from stored entrypoint (default: select-counterparty)
  (function initSendBackLink() {
    try {
      var href = 'select-customer.html';
      if (window.sessionStorage) {
        if (isRequestPayment && typeof REQUEST_PAYMENT_RETURN_KEY !== 'undefined') {
          var fromReq = window.sessionStorage.getItem(REQUEST_PAYMENT_RETURN_KEY);
          if (fromReq === 'customer-details') href = 'customer-details.html';
        } else if (typeof SEND_PAYMENT_RETURN_KEY !== 'undefined') {
          var from = window.sessionStorage.getItem(SEND_PAYMENT_RETURN_KEY);
          if (from === 'cp-detail') href = 'counterparty-bank-details.html';
          else if (from === 'select-counterparty') href = 'select-counterparty.html';
        }
      }
      crumb.setAttribute('href', href);
    } catch (_) { }
  })();

  const handleBack = (e) => {
    const DESKTOP_BP = 1280;
    if (window.innerWidth < DESKTOP_BP) {
      e.preventDefault();
      const target = crumb.getAttribute('href') || 'select-counterparty.html';
      window.location.href = target;
    }
  };
  crumb.addEventListener('click', handleBack);
  if (title) {
    title.addEventListener('click', handleBack);
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') handleBack(e);
    });
  }
})();

// Add Bank: back crumb and title go to Select counterparty on tablet and below
(function initAddBankBackNavigation() {
  const isAddBank = document.querySelector('main.page--addbank, main.page--addcustomer');
  if (!isAddBank) return;
  const crumb = document.querySelector('.page__header--crumb .crumb');
  const title = document.getElementById('ab-back-title');
  if (!crumb) return;

  // Back navigation is now handled by initAddBankSteps for step management
  // This handler only manages mobile title click
  const handleBack = (e) => {
    const DESKTOP_BP = 1280;
    if (window.innerWidth < DESKTOP_BP) {
      // On mobile, check if we're on step 2+ via the steps handler
      const step2Form = document.getElementById('step2-form');
      const step1Form = document.getElementById('step1-form');
      const isStep1 = step1Form && !step1Form.hasAttribute('hidden') && step1Form.style.display !== 'none';

      if (step2Form && !step2Form.hasAttribute('hidden')) {
        // Step 2+, show modal
        e.preventDefault();
        const cancelModal = document.getElementById('cancelConfirmModal');
        if (cancelModal) {
          cancelModal.setAttribute('aria-hidden', 'false');
          document.documentElement.classList.add('modal-open');
          document.body.classList.add('modal-open');
          try {
            const y = window.scrollY || window.pageYOffset || 0;
            document.body.dataset.scrollY = String(y);
            document.body.style.top = `-${y}px`;
            document.body.classList.add('modal-locked');
          } catch (_) { }
        }
      } else if (isStep1) {
        // Step 1, navigate back using the back link href
        e.preventDefault();
        const backLink = document.getElementById('abBackLink');
        if (backLink && backLink.href) {
          window.location.href = backLink.href;
        } else {
          // Fallback: use entrypoint for add-customer, select-counterparty for add-bank
          const isAddCustomer = document.querySelector('main.page--addcustomer');
          if (isAddCustomer) {
            const target = window.sessionStorage ? window.sessionStorage.getItem(ADD_CUSTOMER_RETURN_KEY) : null;
            const href = target === 'select-customer'
              ? 'select-customer.html'
              : (target === 'settings-customers' ? 'settings.html?view=content&page=customers' : 'index.html');
            window.location.href = href;
          } else {
            window.location.href = 'select-counterparty.html';
          }
        }
      }
    }
  };

  // Crumb is handled by initAddBankSteps, only handle title on mobile
  if (title) {
    title.addEventListener('click', handleBack);
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') handleBack(e);
    });
  }
})();

// Review Payment: back crumb and title go to Send payment on tablet and below
(function initReviewBackNavigation() {
  const isReview = document.querySelector('main.page--review');
  if (!isReview) return;
  const crumb = document.querySelector('.page__header--crumb .crumb');
  const title = document.getElementById('rv-back-title');
  if (!crumb) return;
  const handleBack = (e) => {
    const DESKTOP_BP = 1280;
    if (window.innerWidth < DESKTOP_BP) {
      e.preventDefault();
      // Determine redirect URL based on current page
      const isRequestPayment = window.location.pathname.includes('review-payment-request');
      const backUrl = isRequestPayment ? 'request-payment.html' : 'send-payment.html';
      window.location.href = backUrl;
    }
  };
  crumb.addEventListener('click', handleBack);
  if (title) {
    title.addEventListener('click', handleBack);
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') handleBack(e);
    });
  }
})();

(function initReviewErrorSimulation() {
  const page = document.querySelector('main.page--review');
  if (!page) return;

  const controls = document.getElementById('reviewErrorControls');
  const simulateLink = document.getElementById('reviewSimulateTrigger');
  const resetLink = document.getElementById('reviewResetErrors');
  if (!controls || !simulateLink || !resetLink) return;

  const scenariosSource = Array.isArray(window.REVIEW_ERROR_SCENARIOS) && window.REVIEW_ERROR_SCENARIOS.length
    ? window.REVIEW_ERROR_SCENARIOS
    : REVIEW_ERROR_SCENARIOS_CONFIG;
  const scenarios = Array.isArray(scenariosSource) ? scenariosSource.filter(Boolean) : [];
  if (!scenarios.length) {
    simulateLink.classList.add('is-disabled');
    simulateLink.setAttribute('aria-disabled', 'true');
    return;
  }

  const valueEl = controls.querySelector('[data-error-value]');
  const nameEl = controls.querySelector('[data-error-name]');
  const downBtn = controls.querySelector('[data-error-action="down"]');
  const upBtn = controls.querySelector('[data-error-action="up"]');
  const panel = document.getElementById('reviewErrorPanel');
  const titleEl = document.getElementById('reviewErrorTitle');
  const messageEl = document.getElementById('reviewErrorMessage');
  const primaryBtn = document.getElementById('review-confirm');

  let index = 0;
  let isBusy = false;

  const setPrimaryDisabled = (disabled) => {
    if (!primaryBtn) return;
    const state = !!disabled;
    primaryBtn.disabled = state;
    primaryBtn.setAttribute('aria-disabled', state ? 'true' : 'false');
    primaryBtn.classList.toggle('is-disabled', state);
  };

  const scrollPanelIntoView = () => {
    if (!panel || panel.hidden) return;
    try {
      const rect = panel.getBoundingClientRect();
      const top = Math.max((rect.top + window.scrollY) - 80, 0);
      window.scrollTo({ top, behavior: 'auto' });
    } catch (_) { }
  };

  const resetInlineError = () => {
    if (!panel) return;
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('has-review-inline-error');
    document.body.removeAttribute('data-review-error-key');
  };

  const applyInlineError = (scenario) => {
    if (!panel) return;
    panel.hidden = false;
    panel.removeAttribute('aria-hidden');
    document.body.classList.add('has-review-inline-error');
    if (scenario && scenario.key) {
      document.body.setAttribute('data-review-error-key', scenario.key);
    } else {
      document.body.removeAttribute('data-review-error-key');
    }
    const label = scenario && scenario.title ? scenario.title : 'Unknown error';
    if (titleEl) {
      titleEl.textContent = 'Failed to create payment request';
    }
    if (messageEl) {
      const baseMessage = (scenario && scenario.inlineMessage) || REVIEW_INLINE_ERROR_DEFAULT;
      const prefix = label ? `${label}. ` : '';
      messageEl.innerHTML = prefix + baseMessage;
    }
  };

  const syncControls = () => {
    if (valueEl) valueEl.textContent = String(index + 1);
    const scenario = scenarios[index];
    if (nameEl) {
      nameEl.textContent = scenario && (scenario.badgeLabel || scenario.title)
        ? (scenario.badgeLabel || scenario.title)
        : '';
    }
    if (downBtn) downBtn.disabled = index <= 0;
    if (upBtn) upBtn.disabled = index >= (scenarios.length - 1);
  };

  const openLoadingModal = () => {
    const modal = document.getElementById('loadingModal');
    if (!modal) return () => { };
    if (typeof window.__openModal === 'function' && typeof window.__closeModal === 'function') {
      window.__openModal(modal);
      return () => window.__closeModal(modal);
    }
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    return () => {
      modal.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
    };
  };

  const applyScenario = (scenario) => {
    if (!scenario) return;
    applyInlineError(scenario);
    setPrimaryDisabled(!!scenario.disablePrimary);
    // Snackbar disabled for error simulation
    // const snackbarText = scenario.snackbar || REVIEW_SNACKBAR_FALLBACK;
    // if (typeof window.showSnackbar === 'function') {
    //   window.showSnackbar(snackbarText, 4000, 'error');
    // }
    if (scenario.alertMessage && scenario.key !== 'kyc-status') {
      try {
        window.alert(scenario.alertMessage);
      } catch (_) { }
    }
  };

  const toggleLinkDisabled = (link, disabled) => {
    if (!link) return;
    link.classList.toggle('is-disabled', disabled);
    link.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  };

  const setControlsBusy = (state) => {
    isBusy = state;
    toggleLinkDisabled(simulateLink, state);
    toggleLinkDisabled(resetLink, state);
  };

  const clearErrorState = () => {
    resetInlineError();
    setPrimaryDisabled(false);
  };

  controls.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-error-action]');
    if (!btn) return;
    e.preventDefault();
    if (isBusy) return;
    const action = btn.getAttribute('data-error-action');
    if (action === 'up' && index < scenarios.length - 1) {
      index += 1;
    } else if (action === 'down' && index > 0) {
      index -= 1;
    }
    syncControls();
  });

  simulateLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (isBusy) return;
    setControlsBusy(true);
    const closeLoading = openLoadingModal();
    setTimeout(() => {
      closeLoading();
      applyScenario(scenarios[index]);
      scrollPanelIntoView();
      setControlsBusy(false);
    }, 1200);
  });

  resetLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (isBusy) return;
    clearErrorState();
  });

  clearErrorState();
  syncControls();
  setControlsBusy(false);
})();

// Add Bank: Step navigation and state management
(function initAddBankSteps() {
  const root = document.querySelector('main.page--addbank, main.page--addcustomer');
  if (!root) return;

  let currentStep = 1;
  const stepData = { step1: {}, step2: {} };

  const step1Form = document.getElementById('step1-form');
  const step2Form = document.getElementById('step2-form');
  const step3Summary = document.getElementById('step3-summary');
  const nextBtn = document.getElementById('ab-next');
  const nextBtnStep2 = document.getElementById('ab-next-step2');
  const backBtnStep2 = document.getElementById('ab-back');
  const cancelModal = document.getElementById('cancelConfirmModal');
  const cancelContinueBtn = document.getElementById('cancelConfirmContinue');
  const cancelCancelBtn = document.getElementById('cancelConfirmCancel');
  const crumb = document.querySelector('.page__header--crumb .crumb');
  const cancelBtnStep3 = document.getElementById('ab-cancel-step3');
  const submitBtnStep3 = document.getElementById('ab-submit-step3');
  const editStep1Btn = document.getElementById('ab-edit-step1');
  const editStep2Btn = document.getElementById('ab-edit-step2');
  const editStep1FromStep2Btn = document.getElementById('ab-edit-step1-from-step2');
  const cancelBtnStep1 = document.getElementById('ab-cancel-step1');

  if (!step1Form || !step2Form || !step3Summary) return;

  // Scroll to top instantly when changing steps (no smooth animation)
  const scrollToTopInstant = () => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.scrollBehavior;
    const prevBody = body.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    body.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    // Restore any previous inline scroll-behavior
    html.style.scrollBehavior = prevHtml;
    body.style.scrollBehavior = prevBody;
  };

  // Store step 1 data
  const storeStep1Data = () => {
    const isAddCustomer = document.querySelector('main.page--addcustomer');
    if (isAddCustomer) {
      // For add-customer page, only store companyName and email
      stepData.step1 = {
        companyName: document.getElementById('companyName')?.value || '',
        email: document.getElementById('email')?.value || ''
      };
    } else {
      // For add-bank page, store all fields
      stepData.step1 = {
        companyName: document.getElementById('companyName')?.value || '',
        regDate: document.getElementById('regDate')?.value || '',
        country: document.getElementById('country')?.value || '',
        regNum: document.getElementById('regNum')?.value || '',
        businessAddress: document.getElementById('businessAddress')?.value || '',
        operationCountry: document.getElementById('operationCountry')?.value || '',
        email: document.getElementById('email')?.value || ''
      };
    }
  };

  // Store step 2 data
  const storeStep2Data = () => {
    const bankCountryEl = document.getElementById('bankCountry');
    const bankNameEl = document.getElementById('bankName');
    const bankCityEl = document.getElementById('bankCity');
    const swiftCodeEl = document.getElementById('swiftCode');
    const accountNumberEl = document.getElementById('accountNumber');
    const ibanNumberEl = document.getElementById('ibanNumber');
    const nickIbanEl = document.getElementById('accountNickname');
    const nickSwiftEl = document.getElementById('accountNicknameSwift');
    const accountHolderNameEl = document.getElementById('accountHolderName');

    const accountUsedForEl = document.getElementById('accountUsedFor');
    const declarationPurposeEl = document.getElementById('declarationPurpose');
    const avgTransactionsEl = document.getElementById('avgTransactions');
    const avgVolumeEl = document.getElementById('avgVolume');

    const getUploadedName = () => {
      if (typeof window.getBankProofUploaded === 'function') {
        return window.getBankProofUploaded();
      }
      return null;
    };

    stepData.step2 = {
      bankCountry: bankCountryEl?.value || '',
      bankName: bankNameEl?.value || '',
      bankCity: bankCityEl?.value || '',
      swiftCode: swiftCodeEl?.value || '',
      accountNumber: accountNumberEl?.value || '',
      ibanNumber: ibanNumberEl?.value || '',
      accountNickname: nickIbanEl?.value || nickSwiftEl?.value || '',
      accountHolderName: accountHolderNameEl?.value || '',
      accountUsedFor: accountUsedForEl?.value || '',
      declarationPurpose: declarationPurposeEl?.value || '',
      avgTransactions: avgTransactionsEl?.value || '',
      avgVolume: avgVolumeEl?.value || '',
      bankProofFileName: getUploadedName(),
    };
  };

  const getAccountUsedForLabel = (value) => {
    const map = {
      incoming: 'Send payments to this account',
      outgoing: 'Receive payments from this account',
      both: 'Both send and receive payments',
    };
    return map[value] || '';
  };

  const formatOrDash = (value) => {
    const v = (value || '').toString().trim();
    return v ? v : '—';
  };

  const renderStep3Summary = () => {
    const s1 = stepData.step1 || {};
    const s2 = stepData.step2 || {};
    const isAddCustomer = document.querySelector('main.page--addcustomer');

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatOrDash(value);
    };

    const setVisibility = (id, visible) => {
      const rowId = `${id}-row`;
      const row = document.getElementById(rowId);
      if (row) {
        row.style.display = visible ? '' : 'none';
      }
    };

    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };

    // Format number with thousand separators for summary display
    const formatVolume = (value) => {
      if (!value) return '';
      const normalized = value.toString().replace(/,/g, '');
      const num = parseFloat(normalized);
      if (isNaN(num)) return value;
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    // Step 1 fields
    setText('ab-summary-companyName', s1.companyName);
    setText('ab-summary-email', s1.email);

    if (isAddCustomer) {
      // For add-customer page, only show companyName and email
      // Hide other fields
      setVisibility('ab-summary-regDate', false);
      setVisibility('ab-summary-country', false);
      setVisibility('ab-summary-regNum', false);
      setVisibility('ab-summary-businessAddress', false);
      setVisibility('ab-summary-operationCountry', false);
    } else {
      // For add-bank page, show all fields
      setText('ab-summary-regDate', formatDate(s1.regDate));
      setText('ab-summary-country', s1.country);
      setText('ab-summary-regNum', s1.regNum);
      setText('ab-summary-businessAddress', s1.businessAddress);
      setText('ab-summary-operationCountry', s1.operationCountry);
    }

    // Step 2 - bank details
    setText('ab-summary-accountNickname', s2.accountNickname || s2.accountNicknameSwift);
    setText('ab-summary-bankName', s2.bankName);
    setText('ab-summary-bankCountry', s2.bankCountry);
    setText('ab-summary-bankCity', s2.bankCity);
    setText('ab-summary-accountHolderName', s2.accountHolderName);

    // Determine country type and show/hide IBAN vs SWIFT fields
    const IBAN_COUNTRIES = [
      'Albania', 'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Czech Republic',
      'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
      'Iceland', 'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania',
      'Luxembourg', 'Malta', 'Netherlands', 'Norway', 'Poland', 'Portugal',
      'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
      'United Kingdom'
    ];
    const isIBAN = s2.bankCountry && IBAN_COUNTRIES.includes(s2.bankCountry);

    if (isIBAN) {
      setText('ab-summary-ibanNumber', s2.ibanNumber);
      setVisibility('ab-summary-ibanNumber', true);
      setVisibility('ab-summary-swiftCode', false);
      setVisibility('ab-summary-accountNumber', false);
    } else {
      setText('ab-summary-swiftCode', s2.swiftCode);
      setText('ab-summary-accountNumber', s2.accountNumber);
      setVisibility('ab-summary-ibanNumber', false);
      setVisibility('ab-summary-swiftCode', true);
      setVisibility('ab-summary-accountNumber', true);
    }

    // Document proof
    const docProofEl = document.getElementById('ab-summary-docProof');
    if (docProofEl) {
      if (s2.bankProofFileName) {
        docProofEl.textContent = 'Uploaded';
        docProofEl.classList.add('step3-kv__value--uploaded');
      } else {
        docProofEl.textContent = 'Not uploaded';
        docProofEl.classList.remove('step3-kv__value--uploaded');
      }
    }

    // Declaration / transaction information
    const usedForLabel = getAccountUsedForLabel(s2.accountUsedFor);
    setText('ab-summary-accountUsedFor', usedForLabel || s2.accountUsedFor);
    setText('ab-summary-declarationPurpose', s2.declarationPurpose || '');
    setText('ab-summary-avgTransactions', s2.avgTransactions ? `${s2.avgTransactions} Transactions / month` : '');
    if (s2.avgVolume) {
      const formattedVolume = formatVolume(s2.avgVolume);
      setText('ab-summary-avgVolume', `${formattedVolume} USD / month`);
    } else {
      setText('ab-summary-avgVolume', '');
    }
  };

  // Update step indicator
  const updateStepIndicator = (step) => {
    [1, 2, 3].forEach((s) => {
      const indicator = document.getElementById(`step-indicator-${s}`);
      if (!indicator) return;
      const dot = indicator.querySelector('.ab-dot');
      const title = indicator.querySelector('.ab-step__title');
      const label = indicator.querySelector('.ab-step__label');

      if (s === step) {
        // Current/Active step - green and primary colors
        indicator.classList.add('is-active');
        if (dot) dot.style.background = '#3FAE64';
        if (title) {
          title.classList.remove('is-muted');
          title.style.fontWeight = '700';
          title.style.color = '#2D2F2F';
        }
        if (label) label.style.color = '#3FAE64';
      } else {
        // Completed or future step - placeholder colors
        indicator.classList.remove('is-active');
        if (dot) dot.style.background = '#DBDBDC';
        if (title) {
          title.classList.add('is-muted');
          title.style.fontWeight = '';
          title.style.color = '#BCBDBD';
        }
        if (label) label.style.color = '#BCBDBD';
      }
    });
  };

  // Show step
  const showStep = (step) => {
    const isAddCustomer = root.classList.contains('page--addcustomer');
    const step1Actions = document.getElementById('step1-actions');
    const step2Actions = document.getElementById('step2-actions');
    const step2FooterText = document.getElementById('step2-footer-text');

    if (step === 1) {
      step1Form.removeAttribute('hidden');
      step1Form.style.display = '';
      step2Form.setAttribute('hidden', '');
      step2Form.style.display = 'none';
      step3Summary.setAttribute('hidden', '');
      step3Summary.style.display = 'none';

      // Show/hide action buttons and footer text for add-customer
      if (isAddCustomer) {
        if (step1Actions) {
          step1Actions.removeAttribute('hidden');
          step1Actions.style.display = '';
        }
        if (step2Actions) {
          step2Actions.setAttribute('hidden', '');
          step2Actions.style.display = 'none';
        }
        if (step2FooterText) {
          step2FooterText.setAttribute('hidden', '');
          step2FooterText.style.display = 'none';
        }
      }
    } else if (step === 2) {
      step1Form.setAttribute('hidden', '');
      step1Form.style.display = 'none';
      step2Form.removeAttribute('hidden');
      step2Form.style.display = '';
      step3Summary.setAttribute('hidden', '');
      step3Summary.style.display = 'none';

      // Show/hide action buttons and footer text for add-customer
      if (isAddCustomer) {
        if (step1Actions) {
          step1Actions.setAttribute('hidden', '');
          step1Actions.style.display = 'none';
        }
        if (step2Actions) {
          step2Actions.removeAttribute('hidden');
          step2Actions.style.display = '';
        }
        if (step2FooterText) {
          step2FooterText.removeAttribute('hidden');
          step2FooterText.style.display = '';
        }
      }
    } else if (step === 3) {
      step1Form.setAttribute('hidden', '');
      step1Form.style.display = 'none';
      step2Form.setAttribute('hidden', '');
      step2Form.style.display = 'none';
      step3Summary.removeAttribute('hidden');
      step3Summary.style.display = '';

      // Hide action buttons and footer text for add-customer (step 3 doesn't exist)
      if (isAddCustomer) {
        if (step1Actions) {
          step1Actions.setAttribute('hidden', '');
          step1Actions.style.display = 'none';
        }
        if (step2Actions) {
          step2Actions.setAttribute('hidden', '');
          step2Actions.style.display = 'none';
        }
        if (step2FooterText) {
          step2FooterText.setAttribute('hidden', '');
          step2FooterText.style.display = 'none';
        }
      }
    }
    currentStep = step;
    updateStepIndicator(step);
    scrollToTopInstant();
  };

  // Navigate to step 2
  const goToStep2 = () => {
    storeStep1Data();
    // Populate Step 2 display fields with Step 1 data
    const s1 = stepData.step1 || {};
    const step2CompanyName = document.getElementById('step2-companyName');
    const step2Email = document.getElementById('step2-email');
    if (step2CompanyName) step2CompanyName.textContent = s1.companyName || '—';
    if (step2Email) step2Email.textContent = s1.email || '—';

    // For add-customer page, ensure Step 2 button is enabled (it's a review step)
    const isAddCustomer = root.classList.contains('page--addcustomer');
    if (isAddCustomer && nextBtnStep2) {
      nextBtnStep2.disabled = false;
      nextBtnStep2.removeAttribute('aria-disabled');
    }

    showStep(2);
  };

  // Navigate to step 3
  const goToStep3 = () => {
    storeStep1Data();
    storeStep2Data();
    renderStep3Summary();
    showStep(3);
  };

  // Navigate back to step 1
  const goToStep1 = () => {
    showStep(1);
  };

  // Handle header back button
  const handleHeaderBack = (e) => {
    const DESKTOP_BP = 1280;
    const isMobile = window.innerWidth < DESKTOP_BP;

    if (currentStep > 1) {
      e.preventDefault();
      if (cancelModal) {
        cancelModal.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        try {
          const y = window.scrollY || window.pageYOffset || 0;
          document.body.dataset.scrollY = String(y);
          document.body.style.top = `-${y}px`;
          document.body.classList.add('modal-locked');
        } catch (_) { }
      }
    } else if (currentStep === 1 && isMobile) {
      // On step 1 mobile, allow normal navigation (don't prevent default)
      // The href will handle navigation
    }
  };

  // Handle cancel button step 1
  const handleCancelStep1 = (e) => {
    const DESKTOP_BP = 1280;
    const isMobile = window.innerWidth < DESKTOP_BP;

    if (isMobile) {
      // On mobile, navigate back using the back link href
      e.preventDefault();
      const backLink = document.getElementById('abBackLink');
      if (backLink && backLink.href) {
        window.location.href = backLink.href;
      } else {
        // Fallback: use entrypoint for add-customer, select-counterparty for add-bank
        const isAddCustomer = document.querySelector('main.page--addcustomer');
        if (isAddCustomer) {
          const target = window.sessionStorage ? window.sessionStorage.getItem(ADD_CUSTOMER_RETURN_KEY) : null;
          const href = target === 'select-customer'
            ? 'select-customer.html'
            : (target === 'settings-customers' ? 'settings.html?view=content&page=customers' : 'index.html');
          window.location.href = href;
        } else {
          window.location.href = 'select-counterparty.html';
        }
      }
    } else {
      // On desktop, show cancel modal
      e.preventDefault();
      if (cancelModal) {
        cancelModal.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        try {
          const y = window.scrollY || window.pageYOffset || 0;
          document.body.dataset.scrollY = String(y);
          document.body.style.top = `-${y}px`;
          document.body.classList.add('modal-locked');
        } catch (_) { }
      }
    }
  };

  // Next button step 1
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      goToStep2();
    });
  }

  // Next button step 2
  if (nextBtnStep2) {
    nextBtnStep2.addEventListener('click', (e) => {
      e.preventDefault();
      const isAddCustomer = root.classList.contains('page--addcustomer');

      // For add-customer page, behave like submit button (Step 2 is final step)
      if (isAddCustomer) {
        try {
          if (typeof window.getPrototypeState === 'function' && typeof window.setPrototypeState === 'function') {
            const current = window.getPrototypeState();
            if (current < 2) window.setPrototypeState(2);
          }
        } catch (_) { }

        // Show loading modal for 1.5s then redirect
        const loading = document.getElementById('loadingModal');
        if (loading) {
          loading.setAttribute('aria-hidden', 'false');
          document.documentElement.classList.add('modal-open');
          document.body.classList.add('modal-open');
          try {
            const y = window.scrollY || window.pageYOffset || 0;
            document.body.dataset.scrollY = String(y);
            document.body.style.top = `-${y}px`;
            document.body.classList.add('modal-locked');
          } catch (_) { }
        }
        setTimeout(() => {
          window.location.href = 'add-customer-submitted.html';
        }, 1500);
      } else {
        // For add-bank page, go to step 3 as usual
        goToStep3();
      }
    });
  }

  // Back button step 2
  if (backBtnStep2) {
    backBtnStep2.addEventListener('click', (e) => {
      e.preventDefault();
      goToStep1();
    });
  }

  // Cancel button step 1
  if (cancelBtnStep1) {
    cancelBtnStep1.addEventListener('click', handleCancelStep1);
  }

  // Edit buttons in step 3
  if (editStep1Btn) {
    editStep1Btn.addEventListener('click', (e) => {
      e.preventDefault();
      showStep(1);
    });
  }
  if (editStep2Btn) {
    editStep2Btn.addEventListener('click', (e) => {
      e.preventDefault();
      showStep(2);
    });
  }

  // Edit button in step 2 (goes back to step 1)
  if (editStep1FromStep2Btn) {
    editStep1FromStep2Btn.addEventListener('click', (e) => {
      e.preventDefault();
      showStep(1);
    });
  }

  // Cancel button in step 3 opens the same cancel confirmation dialog
  if (cancelBtnStep3) {
    cancelBtnStep3.addEventListener('click', (e) => {
      e.preventDefault();
      if (cancelModal) {
        cancelModal.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        try {
          const y = window.scrollY || window.pageYOffset || 0;
          document.body.dataset.scrollY = String(y);
          document.body.style.top = `-${y}px`;
          document.body.classList.add('modal-locked');
        } catch (_) { }
      }
    });
  }

  // Submit button in step 3 – go to application submitted page
  if (submitBtnStep3) {
    submitBtnStep3.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        if (typeof window.getPrototypeState === 'function' && typeof window.setPrototypeState === 'function') {
          const current = window.getPrototypeState();
          if (current < 2) window.setPrototypeState(2);
        }
      } catch (_) { }

      // Show loading modal for 1.5s then redirect
      const loading = document.getElementById('loadingModal');
      if (loading) {
        loading.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        try {
          const y = window.scrollY || window.pageYOffset || 0;
          document.body.dataset.scrollY = String(y);
          document.body.style.top = `-${y}px`;
          document.body.classList.add('modal-locked');
        } catch (_) { }
      }
      setTimeout(() => {
        window.location.href = 'add-bank-submitted.html';
      }, 1500);
    });
  }

  // Cancel modal handlers
  if (cancelContinueBtn) {
    cancelContinueBtn.addEventListener('click', () => {
      if (cancelModal) {
        cancelModal.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        try {
          const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
          document.body.classList.remove('modal-locked');
          document.body.style.top = '';
          delete document.body.dataset.scrollY;
          window.scrollTo(0, y);
        } catch (_) { }
      }
    });
  }

  if (cancelCancelBtn) {
    cancelCancelBtn.addEventListener('click', () => {
      // Check if this is the add-customer page
      const isAddCustomer = document.querySelector('main.page--addcustomer');
      if (isAddCustomer) {
        const target = window.sessionStorage ? window.sessionStorage.getItem(ADD_CUSTOMER_RETURN_KEY) : null;
        const href = target === 'select-customer'
          ? 'select-customer.html'
          : (target === 'settings-customers' ? 'settings.html?view=content&page=customers' : 'index.html');
        window.location.href = href;
      } else {
        window.location.href = 'select-counterparty.html';
      }
    });
  }

  // Close modal on backdrop click
  if (cancelModal) {
    cancelModal.addEventListener('click', (e) => {
      if (e.target === cancelModal) {
        cancelModal.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        try {
          const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
          document.body.classList.remove('modal-locked');
          document.body.style.top = '';
          delete document.body.dataset.scrollY;
          window.scrollTo(0, y);
        } catch (_) { }
      }
    });

    cancelModal.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        cancelModal.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        try {
          const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
          document.body.classList.remove('modal-locked');
          document.body.style.top = '';
          delete document.body.dataset.scrollY;
          window.scrollTo(0, y);
        } catch (_) { }
      });
    });
  }

  // Update header back button handler
  if (crumb) {
    crumb.addEventListener('click', handleHeaderBack);
  }

  // Initialize step indicator and ensure step 1 is visible
  updateStepIndicator(1);
  showStep(1); // Ensure step 1 is visible on load

  // Step 2 form validation
  const accountHolderName = document.getElementById('accountHolderName');
  if (nextBtnStep2 && accountHolderName) {
    const isAddCustomer = root.classList.contains('page--addcustomer');
    const validateStep2 = () => {
      // For add-customer page, Step 2 is just a review step, so always enable the button
      if (isAddCustomer) {
        nextBtnStep2.disabled = false;
        nextBtnStep2.removeAttribute('aria-disabled');
        return;
      }

      // For add-bank page, validate all fields
      const hasName = accountHolderName.value && accountHolderName.value.trim() !== '';
      const bankDetailsFilled = document.getElementById('bankDetailsDisplay')?.style.display !== 'none';
      const accountDeclarationFilled = document.getElementById('accountDeclarationDisplay')?.style.display !== 'none';
      const uploadFilled = typeof window.getBankProofUploaded === 'function' && window.getBankProofUploaded() !== null;

      const isValid = hasName && bankDetailsFilled && accountDeclarationFilled && uploadFilled;
      nextBtnStep2.disabled = !isValid;
      nextBtnStep2.setAttribute('aria-disabled', String(!isValid));
    };

    // Expose globally for upload handler
    window.validateStep2Form = validateStep2;

    accountHolderName.addEventListener('input', validateStep2);
    accountHolderName.addEventListener('change', validateStep2);

    // Watch for bank details and account declaration changes
    const bankDetailsInput = document.getElementById('bankDetails');
    const accountDeclarationInput = document.getElementById('accountDeclaration');
    if (bankDetailsInput) {
      bankDetailsInput.addEventListener('input', validateStep2);
      bankDetailsInput.addEventListener('change', validateStep2);
    }
    if (accountDeclarationInput) {
      accountDeclarationInput.addEventListener('input', validateStep2);
      accountDeclarationInput.addEventListener('change', validateStep2);
    }

    validateStep2();
  }
})();

// Add Bank: enable Next when all fields are filled (reusable helper)
(function initAddBankFormState() {
  const root = document.querySelector('main.page--addbank, main.page--addcustomer');
  if (!root) return;
  const form = document.getElementById('step1-form');
  const nextBtn = document.getElementById('ab-next');
  if (!form || !nextBtn) return;

  const isAddCustomer = root.classList.contains('page--addcustomer');
  const EMAIL_HINT_TEXT = 'Customer must have access to this email';
  const EMAIL_ERROR_INVALID = 'Invalid email address';
  const EMAIL_ERROR_LEN = 'Contact email address limited to 128 characters';
  const COMPANY_ERROR_LEN = 'Company legal name is limited to 120 characters';

  const getFields = () => {
    if (isAddCustomer) {
      // For add-customer page, only check companyName and email
      return [
        form.querySelector('#companyName'),
        form.querySelector('#email'),
      ];
    }
    // For add-bank page, check all fields
    return [
      form.querySelector('#companyName'),
      form.querySelector('#regDate'),
      form.querySelector('#regNum'),
      form.querySelector('#country'),
      form.querySelector('#businessAddress'),
      form.querySelector('#operationCountry'),
      form.querySelector('#email'),
    ];
  };

  const setDisabled = (btn, disabled) => {
    btn.disabled = !!disabled;
    if (disabled) btn.setAttribute('aria-disabled', 'true');
    else btn.removeAttribute('aria-disabled');
  };

  const isFilled = (el) => {
    if (!el) return false;
    const v = (el.value || '').trim();
    if (el.type === 'email') {
      // Relaxed email validation: allow typing in progress (e.g., trailing periods)
      // Basic check: has @ and at least one character before and after
      if (v.length === 0) return false;
      const atIndex = v.indexOf('@');
      if (atIndex <= 0 || atIndex >= v.length - 1) return false;
      // Allow trailing periods and other characters during typing
      // Just check that there's at least one non-@ character after the @
      const afterAt = v.substring(atIndex + 1);
      return afterAt.length > 0 && afterAt.replace(/[^a-zA-Z0-9.]/g, '').length > 0;
    }
    return v.length > 0;
  };

  const update = () => {
    // Add-customer: custom validation (length + email validity) with inline messages
    if (isAddCustomer) {
      const companyEl = form.querySelector('#companyName');
      const emailEl = form.querySelector('#email');
      const companyErr = document.getElementById('companyNameError');
      const emailHint = document.getElementById('emailHint');

      const companyVal = (companyEl?.value || '').trim();
      const emailVal = (emailEl?.value || '').trim();

      // Company: only show inline error when length exceeds 120
      const companyTooLong = companyVal.length > 120;
      const companyOk = companyVal.length > 0 && !companyTooLong;
      if (companyErr) {
        companyErr.textContent = COMPANY_ERROR_LEN;
        companyErr.hidden = !companyTooLong;
      }

      // Email: replace hint paragraph with inline error when invalid/too long
      const emailTooLong = emailVal.length > 124; // show error once it gets long (limit is 128)
      const emailFormatOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
      const emailOk = emailVal.length > 0 && !emailTooLong && emailFormatOk;

      if (emailHint) {
        if (emailVal.length === 0) {
          emailHint.textContent = EMAIL_HINT_TEXT;
          emailHint.classList.remove('is-error');
        } else if (emailTooLong) {
          emailHint.textContent = EMAIL_ERROR_LEN;
          emailHint.classList.add('is-error');
        } else if (!emailFormatOk) {
          emailHint.textContent = EMAIL_ERROR_INVALID;
          emailHint.classList.add('is-error');
        } else {
          emailHint.textContent = EMAIL_HINT_TEXT;
          emailHint.classList.remove('is-error');
        }
      }

      setDisabled(nextBtn, !(companyOk && emailOk));
      return;
    }

    // Add-bank: existing "filled" validation
    const fields = getFields();
    const allOk = fields.every(isFilled);
    setDisabled(nextBtn, !allOk);
    // toggle filled style for registration and operation country selects (only for add-bank)
    if (!isAddCustomer) {
      const regCountrySel = form.querySelector('#country');
      if (regCountrySel) {
        regCountrySel.classList.toggle('is-filled', !!regCountrySel.value);
      }
      const opCountrySel = form.querySelector('#operationCountry');
      if (opCountrySel) {
        opCountrySel.classList.toggle('is-filled', !!opCountrySel.value);
      }
    }
  };

  // Listen for changes
  getFields().forEach((el) => {
    if (!el) return;
    el.addEventListener('input', update, { passive: true });
    el.addEventListener('change', update);
  });
  // Initial
  update();
})();

// Add Bank: dev tools (Fill / Clear) in build-badge
(function initAddBankDevTools() {
  const root = document.querySelector('main.page--addbank, main.page--addcustomer');
  if (!root) return;
  const fillBtn = document.getElementById('ab-fill');
  const clearBtn = document.getElementById('ab-clear');
  if (!fillBtn || !clearBtn) return;

  const isAddCustomer = root.classList.contains('page--addcustomer');

  // Get current active step
  const getCurrentStep = () => {
    const step1Form = document.getElementById('step1-form');
    const step2Form = document.getElementById('step2-form');
    if (step1Form && !step1Form.hasAttribute('hidden') && step1Form.style.display !== 'none') {
      return 1;
    }
    if (step2Form && !step2Form.hasAttribute('hidden') && step2Form.style.display !== 'none') {
      return 2;
    }
    return 1; // Default to step 1
  };

  // Get step 1 fields
  const getStep1Fields = () => {
    if (isAddCustomer) {
      // For add-customer page, only return companyName and email
      return {
        companyName: document.getElementById('companyName'),
        email: document.getElementById('email'),
      };
    }
    // For add-bank page, return all fields
    return {
      companyName: document.getElementById('companyName'),
      regDate: document.getElementById('regDate'),
      country: document.getElementById('country'),
      regNum: document.getElementById('regNum'),
      businessAddress: document.getElementById('businessAddress'),
      operationCountry: document.getElementById('operationCountry'),
      email: document.getElementById('email'),
    };
  };

  // Get step 2 fields
  const getStep2Fields = () => ({
    accountHolderName: document.getElementById('accountHolderName'),
    bankDetails: document.getElementById('bankDetails'),
    accountDeclaration: document.getElementById('accountDeclaration'),
  });

  const trigger = (el) => {
    if (!el) return;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  fillBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const currentStep = getCurrentStep();

    if (currentStep === 1) {
      // Fill step 1 fields
      const f = getStep1Fields();
      if (f.companyName) f.companyName.value = 'NovaQuill Ltd';
      if (f.email) f.email.value = 'accounts@novaquill.com';

      if (isAddCustomer) {
        // For add-customer, only fill companyName and email
        Object.values(f).forEach(trigger);
      } else {
        // For add-bank, fill all fields
        if (f.regDate) f.regDate.value = '2024-01-15';
        if (f.country) f.country.value = 'Singapore';
        if (f.regNum) f.regNum.value = '202401234N';
        if (f.businessAddress) {
          f.businessAddress.value = '5 Battery Road, Singapore 049901';
          // Update icon after setting value
          const businessAddressIcon = document.getElementById('businessAddressIcon');
          if (businessAddressIcon) businessAddressIcon.src = 'assets/icon_edit.svg';
        }
        if (f.operationCountry) f.operationCountry.value = 'Singapore';
        Object.values(f).forEach(trigger);

        // Also fill modal fields
        const modal = document.getElementById('businessAddressModal');
        if (modal) {
          const addressCountry = modal.querySelector('#addressCountry');
          const addressState = modal.querySelector('#addressState');
          const addressCity = modal.querySelector('#addressCity');
          const addressLine1 = modal.querySelector('#addressLine1');
          const addressLine2 = modal.querySelector('#addressLine2');
          const addressPostal = modal.querySelector('#addressPostal');

          if (addressCountry) addressCountry.value = 'Singapore';
          if (addressState) addressState.value = 'Central Region';
          if (addressCity) addressCity.value = 'Singapore';
          if (addressLine1) addressLine1.value = '5 Battery Road';
          if (addressLine2) addressLine2.value = 'Suite 1001';
          if (addressPostal) addressPostal.value = '049901';

          // Trigger change events to update is-filled classes and validate
          [addressCountry, addressState, addressCity, addressLine1, addressLine2, addressPostal].forEach((el) => {
            if (el) {
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });

          // Trigger validation for save button after a short delay to ensure events have fired
          setTimeout(() => {
            if (typeof window.updateBusinessAddressSaveButton === 'function') {
              window.updateBusinessAddressSaveButton();
            }
          }, 10);
        }
      }
    } else if (currentStep === 2) {
      // Fill step 2 fields
      const f = getStep2Fields();
      if (f.accountHolderName) f.accountHolderName.value = 'NovaQuill Ltd';
      Object.values(f).forEach(trigger);

      // Fill bank details modal fields and trigger save
      const bankDetailsModal = document.getElementById('bankDetailsModal');
      if (bankDetailsModal) {
        const bankCountry = bankDetailsModal.querySelector('#bankCountry');
        const bankName = bankDetailsModal.querySelector('#bankName');
        const bankCity = bankDetailsModal.querySelector('#bankCity');
        const swiftCode = bankDetailsModal.querySelector('#swiftCode');
        const accountNumber = bankDetailsModal.querySelector('#accountNumber');
        const accountNicknameSwift = bankDetailsModal.querySelector('#accountNicknameSwift');
        const ibanNumber = bankDetailsModal.querySelector('#ibanNumber');
        const accountNickname = bankDetailsModal.querySelector('#accountNickname');

        // Fill with SWIFT/BIC example (Singapore)
        if (bankCountry) {
          bankCountry.value = 'Singapore';
          // Trigger change first to update field visibility
          bankCountry.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Wait a bit for field visibility to update, then fill other fields
        setTimeout(() => {
          if (bankName) bankName.value = 'DBS Bank';
          if (bankCity) bankCity.value = 'Singapore';
          if (swiftCode) swiftCode.value = 'DBSSSGSG';
          if (accountNumber) accountNumber.value = '012-345678-9';
          if (accountNicknameSwift) accountNicknameSwift.value = 'NovaQuill Ltd';

          // Trigger change events for all fields
          [bankName, bankCity, swiftCode, accountNumber, accountNicknameSwift, ibanNumber, accountNickname].forEach((el) => {
            if (el) {
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });

          // Trigger save to update filled state UI
          setTimeout(() => {
            const saveBtn = document.getElementById('saveBankDetails');
            if (saveBtn && !saveBtn.disabled) {
              saveBtn.click();
            }
          }, 50);
        }, 50);
      }

      // Fill account declaration modal fields and trigger save
      const accountDeclarationModal = document.getElementById('accountDeclarationModal');
      if (accountDeclarationModal) {
        const accountUsedFor = accountDeclarationModal.querySelector('#accountUsedFor');
        const declarationPurpose = accountDeclarationModal.querySelector('#declarationPurpose');
        const avgTransactions = accountDeclarationModal.querySelector('#avgTransactions');
        const avgVolume = accountDeclarationModal.querySelector('#avgVolume');

        if (accountUsedFor) accountUsedFor.value = 'both';
        if (declarationPurpose) declarationPurpose.value = 'Payments';
        if (avgTransactions) avgTransactions.value = '50';
        if (avgVolume) avgVolume.value = '100000';

        // Trigger change events so validation and filled-state update
        [accountUsedFor, declarationPurpose, avgTransactions, avgVolume].forEach((el) => {
          if (el) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });

        // Trigger save to update filled state UI
        setTimeout(() => {
          const saveBtn = document.getElementById('saveAccountDeclaration');
          if (saveBtn && !saveBtn.disabled) {
            saveBtn.click();
          }
        }, 100);
      }

      // Fill upload
      setTimeout(() => {
        if (typeof window.setBankProofUploaded === 'function') {
          window.setBankProofUploaded('Proof1.jpg');
        }
      }, 150);
    }
  });

  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const currentStep = getCurrentStep();

    if (currentStep === 1) {
      // Clear step 1 fields
      const f = getStep1Fields();
      Object.values(f).forEach((el) => { if (el) el.value = ''; trigger(el); });

      if (isAddCustomer) {
        // For add-customer, only clear companyName and email (already done above)
      } else {
        // For add-bank, also clear business address and reset icon
        const businessAddress = document.getElementById('businessAddress');
        const businessAddressIcon = document.getElementById('businessAddressIcon');
        if (businessAddress) businessAddress.value = '';
        if (businessAddressIcon) businessAddressIcon.src = 'assets/icon_add.svg';

        // Also clear modal fields
        const modal = document.getElementById('businessAddressModal');
        if (modal) {
          const addressCountry = modal.querySelector('#addressCountry');
          const addressState = modal.querySelector('#addressState');
          const addressCity = modal.querySelector('#addressCity');
          const addressLine1 = modal.querySelector('#addressLine1');
          const addressLine2 = modal.querySelector('#addressLine2');
          const addressPostal = modal.querySelector('#addressPostal');

          if (addressCountry) addressCountry.value = '';
          if (addressState) addressState.value = '';
          if (addressCity) addressCity.value = '';
          if (addressLine1) addressLine1.value = '';
          if (addressLine2) addressLine2.value = '';
          if (addressPostal) addressPostal.value = '';

          // Trigger change events to update is-filled classes and validate
          [addressCountry, addressState, addressCity, addressLine1, addressLine2, addressPostal].forEach((el) => {
            if (el) {
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });

          // Trigger validation for save button after a short delay to ensure events have fired
          setTimeout(() => {
            if (typeof window.updateBusinessAddressSaveButton === 'function') {
              window.updateBusinessAddressSaveButton();
            }
          }, 10);
        }
      }
    } else if (currentStep === 2) {
      // Clear step 2 fields
      const f = getStep2Fields();
      Object.values(f).forEach((el) => { if (el) el.value = ''; trigger(el); });

      // Clear bank details filled state UI
      const bankDetailsDisplay = document.getElementById('bankDetailsDisplay');
      const bankDetailsEmpty = document.getElementById('bankDetailsEmpty');
      if (bankDetailsDisplay) bankDetailsDisplay.style.display = 'none';
      if (bankDetailsEmpty) bankDetailsEmpty.style.display = 'flex';

      // Clear account declaration filled state UI
      const accountDeclarationDisplay = document.getElementById('accountDeclarationDisplay');
      const accountDeclarationEmpty = document.getElementById('accountDeclarationEmpty');
      if (accountDeclarationDisplay) accountDeclarationDisplay.style.display = 'none';
      if (accountDeclarationEmpty) accountDeclarationEmpty.style.display = 'flex';

      // Also clear bank details modal fields
      const bankDetailsModal = document.getElementById('bankDetailsModal');
      if (bankDetailsModal) {
        const bankCountry = bankDetailsModal.querySelector('#bankCountry');
        const bankName = bankDetailsModal.querySelector('#bankName');
        const bankCity = bankDetailsModal.querySelector('#bankCity');
        const swiftCode = bankDetailsModal.querySelector('#swiftCode');
        const accountNumber = bankDetailsModal.querySelector('#accountNumber');
        const accountNicknameSwift = bankDetailsModal.querySelector('#accountNicknameSwift');
        const ibanNumber = bankDetailsModal.querySelector('#ibanNumber');
        const accountNickname = bankDetailsModal.querySelector('#accountNickname');

        // Clear country first to trigger field visibility update
        if (bankCountry) {
          bankCountry.value = '';
          bankCountry.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Clear other fields
        if (bankName) bankName.value = '';
        if (bankCity) bankCity.value = '';
        if (swiftCode) swiftCode.value = '';
        if (accountNumber) accountNumber.value = '';
        if (accountNicknameSwift) accountNicknameSwift.value = '';
        if (ibanNumber) ibanNumber.value = '';
        if (accountNickname) accountNickname.value = '';

        // Trigger change events for all fields
        [bankName, bankCity, swiftCode, accountNumber, accountNicknameSwift, ibanNumber, accountNickname].forEach((el) => {
          if (el) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }

      // Also clear account declaration modal fields
      const accountDeclarationModal = document.getElementById('accountDeclarationModal');
      if (accountDeclarationModal) {
        const accountUsedFor = accountDeclarationModal.querySelector('#accountUsedFor');
        const declarationPurpose = accountDeclarationModal.querySelector('#declarationPurpose');
        const avgTransactions = accountDeclarationModal.querySelector('#avgTransactions');
        const avgVolume = accountDeclarationModal.querySelector('#avgVolume');

        if (accountUsedFor) accountUsedFor.value = '';
        if (declarationPurpose) declarationPurpose.value = 'Remittance';
        if (avgTransactions) avgTransactions.value = '';
        if (avgVolume) avgVolume.value = '';

        // Trigger change events
        [accountUsedFor, declarationPurpose, avgTransactions, avgVolume].forEach((el) => {
          if (el) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }

      // Clear upload
      if (typeof window.setBankProofNotUploaded === 'function') {
        window.setBankProofNotUploaded();
      }
    }
  });
})();

// Track entrypoint for add-bank page (index, select-counterparty, settings)
(function initAddBankEntrypointTracking() {
  try {
    var links = document.querySelectorAll('a[href="add-bank.html"], a[href="add-bank.html"]');
    if (!links.length) return;
    links.forEach(function (link) {
      link.addEventListener('click', function () {
        try {
          if (!window.sessionStorage) return;
          var from = (window.location.pathname || '').toLowerCase();
          var name = 'index';
          if (from.indexOf('settings.html') !== -1) name = 'settings';
          else if (from.indexOf('select-counterparty.html') !== -1) name = 'select-counterparty';
          else if (from.indexOf('index.html') !== -1) name = 'index';
          window.sessionStorage.setItem(ADD_BANK_RETURN_KEY, name);
        } catch (_) { }
      }, { capture: true });
    });
  } catch (_) { }
})();

// Capture entrypoint for add-customer page (index, select-customer)
(function initAddCustomerEntrypointTracking() {
  try {
    var links = document.querySelectorAll('a[href="add-customer.html"], a[href*="add-customer.html"]');
    if (!links.length) return;
    links.forEach(function (link) {
      link.addEventListener('click', function () {
        try {
          if (!window.sessionStorage) return;
          var from = (window.location.pathname || '').toLowerCase();
          var name = 'index';
          if (from.indexOf('select-customer.html') !== -1) name = 'select-customer';
          else if (from.indexOf('settings.html') !== -1) name = 'settings-customers';
          else if (from.indexOf('index.html') !== -1) name = 'index';
          window.sessionStorage.setItem(ADD_CUSTOMER_RETURN_KEY, name);
        } catch (_) { }
      }, { capture: true });
    });
  } catch (_) { }
})();

// Capture entrypoint for customer-details page (only real entrypoints)
(function initCustomerDetailsEntrypointTracking() {
  try {
    if (!window.sessionStorage) return;
    document.addEventListener('click', function (e) {
      try {
        var link = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!link) return;
        var href = (link.getAttribute('href') || '').trim();
        if (!href || href.indexOf('customer-details.html') === -1) return;

        var path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('customer-details.html') !== -1) return;

        // Real entrypoint #1: Settings -> Customer management
        if (path.indexOf('settings.html') !== -1) {
          var page = '';
          try { page = new URLSearchParams(window.location.search).get('page') || ''; } catch (_) { }
          if (page === 'customers') {
            window.sessionStorage.setItem(CUSTOMER_DETAILS_RETURN_KEY, 'settings.html?view=content&page=customers');
          }
        }
      } catch (_) { }
    }, { capture: true });
  } catch (_) { }
})();

// Add Bank: Bank details modal handler
(function initBankDetailsModal() {
  const root = document.querySelector('main.page--addbank');
  if (!root) return;

  const bankDetailsInput = document.getElementById('bankDetails');
  const bankDetailsBtn = document.getElementById('bankDetailsBtn');
  const bankDetailsIcon = document.getElementById('bankDetailsIcon');
  const bankDetailsWrapper = document.getElementById('bankDetailsWrapper');
  const bankDetailsDisplay = document.getElementById('bankDetailsDisplay');
  const bankDetailsEmpty = document.getElementById('bankDetailsEmpty');
  const bankDetailsTitle = document.getElementById('bankDetailsTitle');
  const bankDetailsDetails = document.getElementById('bankDetailsDetails');
  const modal = document.getElementById('bankDetailsModal');

  if (!bankDetailsInput || !bankDetailsWrapper || !modal) return;

  // Store bank details data
  let bankDetailsData = null;

  // Countries that use IBAN (European countries and some others)
  const IBAN_COUNTRIES = [
    'Albania', 'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Czech Republic',
    'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
    'Iceland', 'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania',
    'Luxembourg', 'Malta', 'Netherlands', 'Norway', 'Poland', 'Portugal',
    'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
    'United Kingdom'
  ];

  // Get country type (IBAN or SWIFT)
  const getCountryType = (country) => {
    if (!country) return null;
    return IBAN_COUNTRIES.includes(country) ? 'IBAN' : 'SWIFT';
  };

  // Show/hide fields based on country selection
  const updateFieldsVisibility = () => {
    const bankCountry = document.getElementById('bankCountry')?.value || '';
    const countryType = getCountryType(bankCountry);
    const swiftFields = document.getElementById('swiftFields');
    const ibanFields = document.getElementById('ibanFields');
    const swiftNicknameRow = document.getElementById('swiftNicknameRow');

    if (!swiftFields || !ibanFields || !swiftNicknameRow) return;

    if (!bankCountry || bankCountry === '') {
      // Hide all fields if no country selected
      swiftFields.style.display = 'none';
      ibanFields.style.display = 'none';
      swiftNicknameRow.style.display = 'none';
    } else if (countryType === 'IBAN') {
      // Show IBAN fields
      swiftFields.style.display = 'none';
      ibanFields.style.display = 'grid';
      swiftNicknameRow.style.display = 'none';
    } else {
      // Show SWIFT/BIC fields
      swiftFields.style.display = 'grid';
      ibanFields.style.display = 'none';
      swiftNicknameRow.style.display = 'grid';
    }
  };

  // Format bank details from modal fields
  const formatBankDetails = (data) => {
    bankDetailsData = data;
    const parts = [];
    if (data.bankName) parts.push(data.bankName);

    const countryType = getCountryType(data.bankCountry);
    if (countryType === 'IBAN') {
      if (data.ibanNumber) parts.push(`IBAN: ${data.ibanNumber}`);
    } else {
      if (data.accountNumber) parts.push(`Account: ${data.accountNumber}`);
      if (data.swiftCode) parts.push(`SWIFT: ${data.swiftCode}`);
    }

    if (data.bankCity && data.bankCountry) {
      parts.push(`${data.bankCity}, ${data.bankCountry}`);
    }
    return parts.join(' • ') || '';
  };

  // Render filled state UI
  const renderFilledState = () => {
    if (!bankDetailsData) return;

    const countryType = getCountryType(bankDetailsData.bankCountry);
    const nickname = countryType === 'IBAN'
      ? (bankDetailsData.accountNickname || bankDetailsData.bankName || 'Bank Account')
      : (bankDetailsData.accountNicknameSwift || bankDetailsData.bankName || 'Bank Account');

    const title = nickname;
    const details = [];
    if (bankDetailsData.bankName) details.push(`Bank: ${bankDetailsData.bankName}`);
    if (bankDetailsData.bankCountry) details.push(`Country : ${bankDetailsData.bankCountry}`);
    if (bankDetailsData.bankCity) details.push(`City: ${bankDetailsData.bankCity}`);

    if (countryType === 'IBAN') {
      if (bankDetailsData.ibanNumber) details.push(`IBAN : ${bankDetailsData.ibanNumber}`);
    } else {
      if (bankDetailsData.swiftCode) details.push(`SWIFT : ${bankDetailsData.swiftCode}`);
      if (bankDetailsData.accountNumber) details.push(`Account number : ${bankDetailsData.accountNumber}`);
    }

    if (bankDetailsTitle) bankDetailsTitle.textContent = title;
    if (bankDetailsDetails) {
      bankDetailsDetails.innerHTML = details.map(d => `<p style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${d}</p>`).join('');
    }

    if (bankDetailsDisplay) bankDetailsDisplay.style.display = 'flex';
    if (bankDetailsEmpty) bankDetailsEmpty.style.display = 'none';
    if (bankDetailsInput) bankDetailsInput.value = formatBankDetails(bankDetailsData);
  };

  // Render empty state UI
  const renderEmptyState = () => {
    bankDetailsData = null;
    if (bankDetailsDisplay) bankDetailsDisplay.style.display = 'none';
    if (bankDetailsEmpty) bankDetailsEmpty.style.display = 'flex';
    if (bankDetailsInput) bankDetailsInput.value = '';
  };

  // Open modal
  const openModal = () => {
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    try {
      const y = window.scrollY || window.pageYOffset || 0;
      document.body.dataset.scrollY = String(y);
      document.body.style.top = `-${y}px`;
      document.body.classList.add('modal-locked');
    } catch (_) { }
    // Ensure field visibility is updated when modal opens (e.g., if Singapore is default)
    updateFieldsVisibility();
    updateSaveButton();
  };

  // Close modal
  const closeModal = () => {
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    try {
      const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
      document.body.classList.remove('modal-locked');
      document.body.style.top = '';
      delete document.body.dataset.scrollY;
      window.scrollTo(0, y);
    } catch (_) { }
  };

  // Save bank details
  const saveBankDetails = () => {
    const bankCountry = document.getElementById('bankCountry')?.value || '';
    const bankName = document.getElementById('bankName')?.value || '';
    const bankCity = document.getElementById('bankCity')?.value || '';
    const countryType = getCountryType(bankCountry);

    let data = { bankCountry, bankName, bankCity };

    if (countryType === 'IBAN') {
      const ibanNumber = document.getElementById('ibanNumber')?.value || '';
      const accountNickname = document.getElementById('accountNickname')?.value || '';

      // Validate required fields for IBAN
      if (!bankCountry || !bankName || !ibanNumber) {
        return;
      }

      data.ibanNumber = ibanNumber;
      data.accountNickname = accountNickname;
    } else {
      const swiftCode = document.getElementById('swiftCode')?.value || '';
      const accountNumber = document.getElementById('accountNumber')?.value || '';
      const accountNicknameSwift = document.getElementById('accountNicknameSwift')?.value || '';

      // Validate required fields for SWIFT/BIC
      if (!bankCountry || !bankName || !accountNumber) {
        return;
      }

      data.swiftCode = swiftCode;
      data.accountNumber = accountNumber;
      data.accountNicknameSwift = accountNicknameSwift;
    }

    // Format and set bank details
    formatBankDetails(data);
    renderFilledState();

    // Trigger change event
    bankDetailsInput.dispatchEvent(new Event('input', { bubbles: true }));
    bankDetailsInput.dispatchEvent(new Event('change', { bubbles: true }));

    closeModal();
  };

  // Event listeners
  if (bankDetailsBtn) {
    bankDetailsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });
  }

  if (bankDetailsWrapper) {
    bankDetailsWrapper.style.cursor = 'pointer';
    bankDetailsWrapper.addEventListener('click', (e) => {
      // Don't open if clicking the edit icon (it has its own handler)
      if (e.target === bankDetailsBtn || e.target.closest('#bankDetailsBtn')) {
        return;
      }
      // Open modal when clicking anywhere on the wrapper, display, or empty state
      if (e.target === bankDetailsWrapper ||
        e.target.closest('.clickable-input__empty') ||
        e.target.closest('.clickable-input__display') ||
        e.target.closest('.clickable-input__display-content')) {
        openModal();
      }
    });
  }

  // Also make the display content clickable
  if (bankDetailsDisplay) {
    bankDetailsDisplay.style.cursor = 'pointer';
    bankDetailsDisplay.addEventListener('click', (e) => {
      // Don't open if clicking the edit icon (it has its own handler)
      if (e.target === bankDetailsBtn || e.target.closest('#bankDetailsBtn')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });
  }

  // Initialize state
  if (bankDetailsInput.value && bankDetailsInput.value.trim()) {
    // If there's existing data, try to parse it (for Fill/Clear)
    renderFilledState();
  } else {
    renderEmptyState();
  }

  // Validation function
  const validateBankDetailsForm = () => {
    const bankCountry = document.getElementById('bankCountry')?.value || '';
    const bankName = document.getElementById('bankName')?.value || '';

    if (!bankCountry || bankCountry.trim() === '' || !bankName || bankName.trim() === '') {
      return false;
    }

    const countryType = getCountryType(bankCountry);

    if (countryType === 'IBAN') {
      const ibanNumber = document.getElementById('ibanNumber')?.value || '';
      return ibanNumber && ibanNumber.trim() !== '';
    } else {
      const accountNumber = document.getElementById('accountNumber')?.value || '';
      return accountNumber && accountNumber.trim() !== '';
    }
  };

  // Update save button state
  const updateSaveButton = () => {
    const saveBtn = document.getElementById('saveBankDetails');
    if (!saveBtn) return;
    const isValid = validateBankDetailsForm();
    saveBtn.disabled = !isValid;
    saveBtn.setAttribute('aria-disabled', String(!isValid));
  };

  // Save button
  const saveBtn = document.getElementById('saveBankDetails');
  if (saveBtn) {
    // Initially disable
    saveBtn.disabled = true;
    saveBtn.setAttribute('aria-disabled', 'true');

    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!validateBankDetailsForm()) return;
      saveBankDetails();
    });

    // Add validation listeners to all relevant fields
    const allFields = ['bankCountry', 'bankName', 'bankCity', 'swiftCode', 'accountNumber', 'ibanNumber', 'accountNickname', 'accountNicknameSwift'];
    allFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', () => {
          updateFieldsVisibility();
          updateSaveButton();
        });
        field.addEventListener('change', () => {
          updateFieldsVisibility();
          updateSaveButton();
        });
      }
    });

    // Watch for country changes specifically
    const bankCountryField = document.getElementById('bankCountry');
    if (bankCountryField) {
      bankCountryField.addEventListener('change', () => {
        updateFieldsVisibility();
        updateSaveButton();
        // Clear fields when country changes
        const swiftCode = document.getElementById('swiftCode');
        const accountNumber = document.getElementById('accountNumber');
        const ibanNumber = document.getElementById('ibanNumber');
        if (swiftCode) swiftCode.value = '';
        if (accountNumber) accountNumber.value = '';
        if (ibanNumber) ibanNumber.value = '';
      });
    }

    // Initial validation and field visibility
    updateFieldsVisibility();
    updateSaveButton();
  }

  // Close button handlers
  modal.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal());
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Toggle is-filled class on modal inputs and selects when they have values
  const toggleFilled = (el) => {
    if (!el) return;
    if (el.tagName === 'SELECT') {
      const hasValue = el.value && el.value !== '';
      el.classList.toggle('is-filled', hasValue);
    } else {
      el.classList.toggle('is-filled', el.value && el.value.trim() !== '');
    }
  };

  // Get all inputs and selects in the modal
  const modalInputs = modal.querySelectorAll('input[type="text"], input[type="number"], select');
  modalInputs.forEach((input) => {
    toggleFilled(input);
    const updateField = () => {
      toggleFilled(input);
      updateFieldsVisibility();
      updateSaveButton();
    };
    input.addEventListener('input', updateField);
    input.addEventListener('change', updateField);
  });
})();

// Add Bank: Account declaration modal handler
(function initAccountDeclarationModal() {
  const root = document.querySelector('main.page--addbank');
  if (!root) return;

  const accountDeclarationInput = document.getElementById('accountDeclaration');
  const accountDeclarationBtn = document.getElementById('accountDeclarationBtn');
  const accountDeclarationIcon = document.getElementById('accountDeclarationIcon');
  const accountDeclarationWrapper = document.getElementById('accountDeclarationWrapper');
  const accountDeclarationDisplay = document.getElementById('accountDeclarationDisplay');
  const accountDeclarationEmpty = document.getElementById('accountDeclarationEmpty');
  const accountDeclarationTitle = document.getElementById('accountDeclarationTitle');
  const accountDeclarationDetails = document.getElementById('accountDeclarationDetails');
  const modal = document.getElementById('accountDeclarationModal');

  if (!accountDeclarationInput || !accountDeclarationWrapper || !modal) return;

  // Store account declaration data
  let accountDeclarationData = null;

  // Map account used for values to display text
  const getAccountUsedForText = (value) => {
    const map = {
      'incoming': 'Send payments to this account',
      'outgoing': 'Receive payments from this account',
      'both': 'Both send and receive payments'
    };
    return map[value] || value;
  };

  // Format account declaration from modal fields
  const formatAccountDeclaration = (data) => {
    accountDeclarationData = data;
    const parts = [];
    if (data.accountUsedFor) parts.push(`Used for: ${getAccountUsedForText(data.accountUsedFor)}`);
    if (data.purpose) parts.push(`Purpose: ${data.purpose}`);
    if (data.avgTransactions) parts.push(`Avg transactions: ${data.avgTransactions}/month`);
    if (data.avgVolume) parts.push(`Avg volume: ${data.avgVolume} USD/month`);
    return parts.join(' • ') || '';
  };

  // Render filled state UI
  const renderFilledState = () => {
    if (!accountDeclarationData) return;

    const title = getAccountUsedForText(accountDeclarationData.accountUsedFor) || 'Account Declaration';
    const details = [];
    if (accountDeclarationData.purpose) details.push(accountDeclarationData.purpose);
    if (accountDeclarationData.avgTransactions) details.push(`${accountDeclarationData.avgTransactions} Transactions / month`);
    if (accountDeclarationData.avgVolume) {
      const volumeNum = parseFloat(accountDeclarationData.avgVolume);
      if (!isNaN(volumeNum)) {
        details.push(`${volumeNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD / month`);
      }
    }

    if (accountDeclarationTitle) accountDeclarationTitle.textContent = title;
    if (accountDeclarationDetails) {
      accountDeclarationDetails.innerHTML = details.map(d => `<p style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${d}</p>`).join('');
    }

    if (accountDeclarationDisplay) accountDeclarationDisplay.style.display = 'flex';
    if (accountDeclarationEmpty) accountDeclarationEmpty.style.display = 'none';
    if (accountDeclarationInput) accountDeclarationInput.value = formatAccountDeclaration(accountDeclarationData);
  };

  // Render empty state UI
  const renderEmptyState = () => {
    accountDeclarationData = null;
    if (accountDeclarationDisplay) accountDeclarationDisplay.style.display = 'none';
    if (accountDeclarationEmpty) accountDeclarationEmpty.style.display = 'flex';
    if (accountDeclarationInput) accountDeclarationInput.value = '';
  };

  // Format number with thousand separators and .00 decimals
  const formatNumber = (value) => {
    if (!value || value === '') return '';
    const cleaned = value.toString().replace(/[^\d]/g, '');
    if (!cleaned) return '';
    const num = parseInt(cleaned, 10);
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Parse formatted number for storage/validation:
  // - remove thousands separators
  // - ignore any decimal part and keep only the integer portion
  const parseNumber = (value) => {
    if (!value || value === '') return '';
    const normalized = value.toString().replace(/,/g, '');
    const dotIndex = normalized.indexOf('.');
    const integerPart = dotIndex >= 0 ? normalized.slice(0, dotIndex) : normalized;
    return integerPart.replace(/[^\d]/g, '');
  };

  // Live thousand-separator formatting directly in the avgVolume input
  const setupAvgVolumeFormatting = () => {
    const field = document.getElementById('avgVolume');
    if (!field) return;
    if (field.dataset.enhanced === 'true') return;
    field.dataset.enhanced = 'true';

    let rawDigits = parseNumber(field.value); // underlying integer value as string

    const render = () => {
      if (!rawDigits) {
        field.value = '';
        toggleFilled(field);
        updateSaveButton();
        return;
      }
      const formatted = formatNumber(rawDigits);
      field.value = formatted;

      // Place caret just before the decimal point
      const dotIndex = formatted.indexOf('.');
      const caretPos = dotIndex >= 0 ? dotIndex : formatted.length;
      requestAnimationFrame(() => {
        field.setSelectionRange(caretPos, caretPos);
      });

      toggleFilled(field);
      updateSaveButton();
    };

    const insertDigit = (digit) => {
      rawDigits = (rawDigits || '') + digit;
      render();
    };

    const backspaceDigit = () => {
      if (!rawDigits) return;
      rawDigits = rawDigits.slice(0, -1);
      render();
    };

    // Handle keydown to fully control the value
    field.addEventListener('keydown', (e) => {
      const { key } = e;

      // Allow navigation keys / tab / escape
      if (['Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
        return;
      }

      // Digits
      if (/^\d$/.test(key)) {
        e.preventDefault();
        insertDigit(key);
        return;
      }

      // Backspace
      if (key === 'Backspace') {
        e.preventDefault();
        backspaceDigit();
        return;
      }

      // Delete clears everything for simplicity
      if (key === 'Delete') {
        e.preventDefault();
        rawDigits = '';
        render();
        return;
      }

      // Block any other character (no minus, no letters, etc.)
      e.preventDefault();
    });

    // Prevent default text changes from other input events; we control value
    field.addEventListener('input', () => {
      render();
    });

    // Initial render if there is a pre-filled value (e.g. from Fill shortcut)
    if (rawDigits) {
      render();
    }
  };

  // Live thousand-separator formatting for avgTransactions (integer only)
  const setupAvgTransactionsFormatting = () => {
    const field = document.getElementById('avgTransactions');
    if (!field) return;
    if (field.dataset.enhanced === 'true') return;
    field.dataset.enhanced = 'true';

    let rawDigits = parseNumber(field.value);

    const render = () => {
      if (!rawDigits) {
        field.value = '';
        toggleFilled(field);
        updateSaveButton();
        return;
      }
      const cleaned = rawDigits.replace(/[^\d]/g, '');
      const num = cleaned ? parseInt(cleaned, 10) : NaN;
      if (isNaN(num)) {
        field.value = '';
      } else {
        field.value = num.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
      }
      toggleFilled(field);
      updateSaveButton();
    };

    const insertDigit = (digit) => {
      rawDigits = (rawDigits || '') + digit;
      render();
    };

    const backspaceDigit = () => {
      if (!rawDigits) return;
      rawDigits = rawDigits.slice(0, -1);
      render();
    };

    field.addEventListener('keydown', (e) => {
      const { key } = e;

      // Allow navigation keys / tab / escape
      if (['Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
        return;
      }

      // Digits
      if (/^\d$/.test(key)) {
        e.preventDefault();
        insertDigit(key);
        return;
      }

      // Backspace
      if (key === 'Backspace') {
        e.preventDefault();
        backspaceDigit();
        return;
      }

      // Delete clears everything for simplicity
      if (key === 'Delete') {
        e.preventDefault();
        rawDigits = '';
        render();
        return;
      }

      // Block any other character
      e.preventDefault();
    });

    // Keep formatting stable if any non-keyboard change happens
    field.addEventListener('input', () => {
      // Re-derive digits from current value for safety
      rawDigits = parseNumber(field.value);
      render();
    });

    if (rawDigits) {
      render();
    }
  };

  // Open modal
  const openModal = () => {
    // Setup formatting for avgVolume and avgTransactions fields
    setupAvgVolumeFormatting();
    setupAvgTransactionsFormatting();

    // Populate fields if there's existing data
    if (accountDeclarationData) {
      const accountUsedForField = document.getElementById('accountUsedFor');
      const declarationPurposeField = document.getElementById('declarationPurpose');
      const avgTransactionsField = document.getElementById('avgTransactions');
      const avgVolumeField = document.getElementById('avgVolume');

      if (accountUsedForField) accountUsedForField.value = accountDeclarationData.accountUsedFor || '';
      if (declarationPurposeField) declarationPurposeField.value = accountDeclarationData.purpose || '';
      if (avgTransactionsField) avgTransactionsField.value = accountDeclarationData.avgTransactions || '';
      if (avgVolumeField && accountDeclarationData.avgVolume) {
        // Format the volume value when populating
        const volumeNum = parseFloat(accountDeclarationData.avgVolume);
        if (!isNaN(volumeNum)) {
          avgVolumeField.value = volumeNum.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        } else {
          avgVolumeField.value = '';
        }
      }

      // Trigger filled state updates
      if (accountUsedForField) toggleFilled(accountUsedForField);
      if (declarationPurposeField) toggleFilled(declarationPurposeField);
      if (avgTransactionsField) toggleFilled(avgTransactionsField);
      if (avgVolumeField) toggleFilled(avgVolumeField);
      updateSaveButton();
    }

    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    try {
      const y = window.scrollY || window.pageYOffset || 0;
      document.body.dataset.scrollY = String(y);
      document.body.style.top = `-${y}px`;
      document.body.classList.add('modal-locked');
    } catch (_) { }
  };

  // Close modal
  const closeModal = () => {
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    try {
      const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
      document.body.classList.remove('modal-locked');
      document.body.style.top = '';
      delete document.body.dataset.scrollY;
      window.scrollTo(0, y);
    } catch (_) { }
  };

  // Save account declaration
  const saveAccountDeclaration = () => {
    const accountUsedFor = document.getElementById('accountUsedFor')?.value || '';
    const purpose = document.getElementById('declarationPurpose')?.value || '';
    const avgTransactions = document.getElementById('avgTransactions')?.value || '';
    const avgVolumeField = document.getElementById('avgVolume');
    let avgVolume = '';
    if (avgVolumeField) {
      const raw = avgVolumeField.value || '';
      const normalized = raw.toString().replace(/,/g, '');
      const num = parseFloat(normalized);
      if (!isNaN(num)) {
        avgVolume = String(num);
      }
    }

    // Validate required fields
    if (!accountUsedFor || !purpose) {
      // In a real app, show validation errors
      return;
    }

    // Format and set account declaration (use numeric value for storage, formatted for display)
    formatAccountDeclaration({ accountUsedFor, purpose, avgTransactions, avgVolume });
    renderFilledState();

    // Trigger change event
    accountDeclarationInput.dispatchEvent(new Event('input', { bubbles: true }));
    accountDeclarationInput.dispatchEvent(new Event('change', { bubbles: true }));

    closeModal();
  };

  // Event listeners
  if (accountDeclarationBtn) {
    accountDeclarationBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });
  }

  if (accountDeclarationWrapper) {
    accountDeclarationWrapper.style.cursor = 'pointer';
    accountDeclarationWrapper.addEventListener('click', (e) => {
      // Don't open if clicking the edit icon (it has its own handler)
      if (e.target === accountDeclarationBtn || e.target.closest('#accountDeclarationBtn')) {
        return;
      }
      // Open modal when clicking anywhere on the wrapper, display, or empty state
      if (e.target === accountDeclarationWrapper ||
        e.target.closest('.clickable-input__empty') ||
        e.target.closest('.clickable-input__display') ||
        e.target.closest('.clickable-input__display-content')) {
        openModal();
      }
    });
  }

  // Also make the display content clickable
  if (accountDeclarationDisplay) {
    accountDeclarationDisplay.style.cursor = 'pointer';
    accountDeclarationDisplay.addEventListener('click', (e) => {
      // Don't open if clicking the edit icon (it has its own handler)
      if (e.target === accountDeclarationBtn || e.target.closest('#accountDeclarationBtn')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });
  }

  // Initialize state
  if (accountDeclarationInput.value && accountDeclarationInput.value.trim()) {
    // If there's existing data, try to parse it (for Fill/Clear)
    renderFilledState();
  } else {
    renderEmptyState();
  }

  // Validation function
  const validateAccountDeclarationForm = () => {
    const accountUsedFor = document.getElementById('accountUsedFor')?.value || '';
    const purpose = document.getElementById('declarationPurpose')?.value || '';
    return accountUsedFor && accountUsedFor.trim() !== '' &&
      purpose && purpose.trim() !== '';
  };

  // Update save button state
  const updateSaveButton = () => {
    const saveBtn = document.getElementById('saveAccountDeclaration');
    if (!saveBtn) return;
    const isValid = validateAccountDeclarationForm();
    saveBtn.disabled = !isValid;
    saveBtn.setAttribute('aria-disabled', String(!isValid));
  };

  // Save button
  const saveBtn = document.getElementById('saveAccountDeclaration');
  if (saveBtn) {
    // Initially disable
    saveBtn.disabled = true;
    saveBtn.setAttribute('aria-disabled', 'true');

    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!validateAccountDeclarationForm()) return;
      saveAccountDeclaration();
    });

    // Add validation listeners to required fields
    const requiredFields = ['accountUsedFor', 'declarationPurpose'];
    requiredFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', updateSaveButton);
        field.addEventListener('change', updateSaveButton);
      }
    });

    // Initial validation
    updateSaveButton();
  }

  // Close button handlers
  modal.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal());
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Toggle is-filled class on modal inputs and selects when they have values
  const toggleFilled = (el) => {
    if (!el) return;
    if (el.tagName === 'SELECT') {
      const hasValue = el.value && el.value !== '';
      el.classList.toggle('is-filled', hasValue);
    } else {
      el.classList.toggle('is-filled', el.value && el.value.trim() !== '');
    }
  };

  // Get all inputs and selects in the modal (excluding avgVolume which has custom handler)
  const modalInputs = modal.querySelectorAll('input[type="text"]:not(#avgVolume), input[type="number"], select');
  modalInputs.forEach((input) => {
    toggleFilled(input);
    const updateField = () => {
      toggleFilled(input);
      updateSaveButton();
    };
    input.addEventListener('input', updateField);
    input.addEventListener('change', updateField);
  });
})();

// Add Bank: Bank proof upload handler
(function initBankProofUpload() {
  const root = document.querySelector('main.page--addbank');
  if (!root) return;

  const uploadArea = document.getElementById('bankProofUpload');
  const uploadEmpty = document.getElementById('bankProofUploadEmpty');
  const uploadFilled = document.getElementById('bankProofUploadFilled');
  const uploadBtn = document.getElementById('bankProofUploadBtn');
  const removeBtn = document.getElementById('bankProofRemoveBtn');
  const fileNameEl = document.getElementById('bankProofFileName');

  if (!uploadArea || !uploadEmpty || !uploadFilled || !uploadBtn || !removeBtn || !fileNameEl) return;

  let uploadedFileName = null;

  // Set uploaded state
  const setUploaded = (fileName = 'Proof1.jpg') => {
    uploadedFileName = fileName;
    fileNameEl.textContent = fileName;
    uploadEmpty.style.display = 'none';
    uploadFilled.style.display = 'flex';

    // Trigger validation update
    const nextBtn = document.getElementById('ab-next-step2');
    if (nextBtn && typeof window.validateStep2Form === 'function') {
      window.validateStep2Form();
    }
  };

  // Set not uploaded state
  const setNotUploaded = () => {
    uploadedFileName = null;
    uploadEmpty.style.display = 'flex';
    uploadFilled.style.display = 'none';

    // Show snackbar
    if (typeof window.showSnackbar === 'function') {
      window.showSnackbar('File removed');
    } else {
      const el = document.createElement('div');
      el.className = 'snackbar snackbar--success';
      el.innerHTML = '<img class="snackbar__icon" src="assets/icon_snackbar_success.svg" alt=""/><span>File removed</span>';
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('is-visible'));
      setTimeout(() => {
        el.classList.remove('is-visible');
        setTimeout(() => el.remove(), 250);
      }, 2000);
    }

    // Trigger validation update
    const nextBtn = document.getElementById('ab-next-step2');
    if (nextBtn && typeof window.validateStep2Form === 'function') {
      window.validateStep2Form();
    }
  };

  // Upload button handler
  uploadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // In a real app, this would open a file picker
    // For prototype, just set uploaded state
    setUploaded('Proof1.jpg');
  });

  // Remove button handler
  removeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    setNotUploaded();
  });

  // Expose functions for Fill/Clear
  window.setBankProofUploaded = setUploaded;
  window.setBankProofNotUploaded = setNotUploaded;
  window.getBankProofUploaded = () => uploadedFileName;
})();

// Add Bank: Business address modal handler
(function initBusinessAddressModal() {
  const root = document.querySelector('main.page--addbank');
  if (!root) {
    console.log('Business address modal: page--addbank not found');
    return;
  }

  console.log('Business address modal: Initializing...');

  const businessAddressInput = document.getElementById('businessAddress');
  const businessAddressBtn = document.getElementById('businessAddressBtn');
  const businessAddressIcon = document.getElementById('businessAddressIcon');
  const businessAddressWrapper = document.getElementById('businessAddressWrapper');
  const modal = document.getElementById('businessAddressModal');

  // Debug: log which elements are missing
  if (!businessAddressInput) console.warn('businessAddressInput not found');
  if (!businessAddressBtn) console.warn('businessAddressBtn not found');
  if (!businessAddressIcon) console.warn('businessAddressIcon not found');
  if (!modal) console.warn('businessAddressModal not found');

  if (!businessAddressInput || !businessAddressBtn || !businessAddressIcon || !modal) {
    console.warn('Business address modal initialization failed - missing elements');
    return;
  }

  console.log('Business address modal: All elements found, setting up event listeners');

  // Format address from modal fields
  const formatAddress = (data) => {
    const parts = [];
    if (data.line1) parts.push(data.line1);
    if (data.line2) parts.push(data.line2);
    if (data.city) parts.push(data.city);
    if (data.state) parts.push(data.state);
    if (data.postal) parts.push(data.postal);
    if (data.country) parts.push(data.country);
    return parts.join(', ');
  };

  // Update icon based on field state
  const updateIcon = () => {
    if (businessAddressInput.value && businessAddressInput.value.trim()) {
      businessAddressIcon.src = 'assets/icon_edit.svg';
    } else {
      businessAddressIcon.src = 'assets/icon_add.svg';
    }
  };

  // Open modal
  const openModal = () => {
    console.log('openModal called, modal element:', modal);
    // Pre-fill modal if address exists
    const currentValue = businessAddressInput.value;
    if (currentValue) {
      // Try to parse existing address (simple approach - in real app would need better parsing)
      // For now, just clear and let user re-enter
    }
    console.log('Setting modal aria-hidden to false');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    console.log('Modal classes added, checking if modal is visible');
    try {
      const y = window.scrollY || window.pageYOffset || 0;
      document.body.dataset.scrollY = String(y);
      document.body.style.top = `-${y}px`;
      document.body.classList.add('modal-locked');
    } catch (_) { }
    console.log('Modal should now be visible. aria-hidden:', modal.getAttribute('aria-hidden'));
  };

  // Close modal
  const closeModal = () => {
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    try {
      const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
      document.body.classList.remove('modal-locked');
      document.body.style.top = '';
      delete document.body.dataset.scrollY;
      window.scrollTo(0, y);
    } catch (_) { }
  };

  // Save address
  const saveAddress = () => {
    const country = document.getElementById('addressCountry')?.value || '';
    const state = document.getElementById('addressState')?.value || '';
    const city = document.getElementById('addressCity')?.value || '';
    const line1 = document.getElementById('addressLine1')?.value || '';
    const line2 = document.getElementById('addressLine2')?.value || '';
    const postal = document.getElementById('addressPostal')?.value || '';

    // Validate required fields
    if (!country || !city || !line1 || !postal) {
      // In a real app, show validation errors
      return;
    }

    // Format and set address
    const formatted = formatAddress({ country, state, city, line1, line2, postal });
    businessAddressInput.value = formatted;
    updateIcon();

    // Trigger change event for form validation
    businessAddressInput.dispatchEvent(new Event('input', { bubbles: true }));
    businessAddressInput.dispatchEvent(new Event('change', { bubbles: true }));

    closeModal();
  };

  // Event listeners - make the entire field clickable
  businessAddressBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Business address button clicked, opening modal');
    openModal();
  });

  businessAddressInput.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Business address input clicked, opening modal');
    openModal();
  });

  // Also handle pointer events on the wrapper
  if (businessAddressWrapper) {
    businessAddressWrapper.style.cursor = 'pointer';
    businessAddressWrapper.addEventListener('click', (e) => {
      // Only handle if click is directly on wrapper, not on children
      if (e.target === businessAddressWrapper) {
        console.log('Business address wrapper clicked, opening modal');
        openModal();
      }
    });
  }

  // Validation function to check if all required fields are filled
  const validateModalForm = () => {
    const country = document.getElementById('addressCountry')?.value || '';
    const city = document.getElementById('addressCity')?.value || '';
    const line1 = document.getElementById('addressLine1')?.value || '';
    const postal = document.getElementById('addressPostal')?.value || '';

    // All required fields must have values
    const isValid = country && country.trim() !== '' &&
      city && city.trim() !== '' &&
      line1 && line1.trim() !== '' &&
      postal && postal.trim() !== '';

    return isValid;
  };

  // Update save button state (expose globally so Fill/Clear can call it)
  window.updateBusinessAddressSaveButton = () => {
    const saveBtn = document.getElementById('saveBusinessAddress');
    if (!saveBtn) return;

    const isValid = validateModalForm();
    saveBtn.disabled = !isValid;
    saveBtn.setAttribute('aria-disabled', String(!isValid));
  };

  const updateSaveButton = window.updateBusinessAddressSaveButton;

  // Save button
  const saveBtn = document.getElementById('saveBusinessAddress');
  if (saveBtn) {
    // Initially disable the button
    saveBtn.disabled = true;
    saveBtn.setAttribute('aria-disabled', 'true');

    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!validateModalForm()) return; // Double-check before saving
      saveAddress();
    });
  }

  // Close button handlers (using existing modal close logic)
  modal.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal());
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Initialize icon state
  updateIcon();

  // Watch for external changes (e.g., from Fill/Clear buttons)
  businessAddressInput.addEventListener('input', updateIcon);
  businessAddressInput.addEventListener('change', updateIcon);

  // Toggle is-filled class on modal inputs and selects when they have values
  const toggleFilled = (el) => {
    if (!el) return;
    if (el.tagName === 'SELECT') {
      // For selects, only mark as filled if value exists and is not empty string (placeholder)
      const hasValue = el.value && el.value !== '';
      el.classList.toggle('is-filled', hasValue);
    } else {
      el.classList.toggle('is-filled', el.value && el.value.trim() !== '');
    }
  };

  // Get all inputs and selects in the modal
  const modalInputs = modal.querySelectorAll('input[type="text"], select');
  modalInputs.forEach((input) => {
    // Initialize state
    toggleFilled(input);
    // Update on change
    const updateField = () => {
      toggleFilled(input);
      updateSaveButton(); // Also validate form when field changes
    };
    input.addEventListener('input', updateField);
    input.addEventListener('change', updateField);
  });

  // Initial validation when modal opens
  updateSaveButton();
})();

(function initPrototypeStateBadge() {
  const badge = document.querySelector('.build-badge');
  if (!badge || badge.querySelector('.build-badge__state')) return;
  const tool = document.createElement('div');
  tool.className = 'build-badge__state';
  tool.innerHTML = `
    <span class="build-badge__state-label">State</span>
    <button type="button" class="build-badge__state-btn" data-state-action="down" aria-label="Previous state">−</button>
    <span class="build-badge__state-value" data-state-value></span>
    <button type="button" class="build-badge__state-btn" data-state-action="up" aria-label="Next state">+</button>
    <span class="build-badge__state-name" data-state-name></span>
  `;
  badge.prepend(tool);

  const valueEl = tool.querySelector('[data-state-value]');
  const nameEl = tool.querySelector('[data-state-name]');
  const downBtn = tool.querySelector('[data-state-action="down"]');
  const upBtn = tool.querySelector('[data-state-action="up"]');

  const update = (state) => {
    if (valueEl) valueEl.textContent = state;
    if (nameEl) nameEl.textContent = typeof getPrototypeStateLabel === 'function' ? getPrototypeStateLabel(state) : '';
    if (downBtn) downBtn.disabled = state <= PROTOTYPE_STATE_MIN;
    if (upBtn) upBtn.disabled = state >= PROTOTYPE_STATE_MAX;
  };

  if (downBtn) {
    downBtn.addEventListener('click', () => {
      try { changePrototypeState(-1); } catch (_) { }
    });
  }
  if (upBtn) {
    upBtn.addEventListener('click', () => {
      try { changePrototypeState(1); } catch (_) { }
    });
  }

  update(typeof getPrototypeState === 'function' ? getPrototypeState() : PROTOTYPE_STATE_MIN);
  if (typeof onPrototypeStateChange === 'function') onPrototypeStateChange(update);
})();

(function initSendPaymentEntryGate() {
  const modal = document.getElementById('needCounterpartyModal');
  const openModal = () => {
    if (!modal) return;
    if (typeof window.__openModal === 'function') {
      window.__openModal(modal);
    } else {
      modal.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
    }
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-send-payment-entry]');
    if (!trigger) return;
    const state = typeof getPrototypeState === 'function' ? getPrototypeState() : PROTOTYPE_STATE_MIN;
    if (state <= 1) {
      e.preventDefault();
      openModal();
    }
  });
})();

(function initRequestPaymentEntryGate() {
  const modal = document.getElementById('addCustomerModal');
  const openModal = () => {
    if (!modal) return;
    if (typeof window.__openModal === 'function') {
      window.__openModal(modal);
    } else {
      modal.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
    }
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-request-payment-entry]');
    if (!trigger) return;
    const state = typeof getPrototypeState === 'function' ? getPrototypeState() : PROTOTYPE_STATE_MIN;
    if (state <= 1) {
      e.preventDefault();
      openModal();
    } else if (state >= 2) {
      // If state is 2 or higher, navigate to select-customer.html
      e.preventDefault();
      window.location.href = 'select-customer.html';
    }
  });
})();


