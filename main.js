const API_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&price_change_percentage=1h,24h,7d';
const priceEl = document.getElementById('price');
const changeEl = document.getElementById('change');
const change1hEl = document.getElementById('change-1h');
const change24hEl = document.getElementById('change-24h');
const change7dEl = document.getElementById('change-7d');
const lastUpdatedEl = document.getElementById('last-updated');
const previousEl = document.getElementById('previous');
const directionEl = document.getElementById('direction');
const marketCapEl = document.getElementById('market-cap');
const fdvEl = document.getElementById('fdv');
const volumeEl = document.getElementById('volume');
const high24hEl = document.getElementById('high-24h');
const low24hEl = document.getElementById('low-24h');
const circulatingEl = document.getElementById('circulating');
const maxSupplyEl = document.getElementById('max-supply');
const athEl = document.getElementById('ath');
const athDateEl = document.getElementById('ath-date');
const atlEl = document.getElementById('atl');
const atlDateEl = document.getElementById('atl-date');
const statusText = document.getElementById('status-text');
const statusDot = document.querySelector('.dot');
const countdownEl = document.getElementById('countdown');
const refreshBtn = document.getElementById('refresh');
const errorBanner = document.getElementById('error-banner');

let previousPrice = null;
let timerId = null;
let countdownTimer = null;
let nextRefreshAt = null;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
  notation: 'compact',
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat('en-US');

async function fetchPrice() {
  setStatus('Updating now…', '#22c55e');
  clearError();
  stopCountdown();

  try {
    const response = await fetch(API_URL, { cache: 'no-store' });
    if (!response.ok) {
      const bodySnippet = await safeReadSnippet(response);
      const statusLabel = `${response.status} ${response.statusText || ''}`.trim();
      throw new Error(`HTTP ${statusLabel}${bodySnippet ? ` • ${bodySnippet}` : ''}`);
    }

    const data = await response.json();
    const entry = Array.isArray(data) ? data[0] : null;

    if (!entry || typeof entry.current_price !== 'number') {
      throw new Error('Price missing from response');
    }

    updateUI(entry);
    scheduleNext();
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    showError(`Failed to refresh price. ${message}`);
    setStatus('Could not load data. Retrying in 30s.', '#ef4444');
    setCountdown(30);
    timerId = setTimeout(fetchPrice, 30000);
  }
}

function updateUI(entry) {
  const price = entry.current_price;
  const change24h = entry.price_change_percentage_24h;
  const change1h = entry.price_change_percentage_1h_in_currency;
  const change7d = entry.price_change_percentage_7d_in_currency;

  priceEl.textContent = currencyFormatter.format(price);

  applyPercent(changeEl, change24h);
  applyPercent(change1hEl, change1h);
  applyPercent(change24hEl, change24h);
  applyPercent(change7dEl, change7d);

  marketCapEl.textContent = formatCurrency(entry.market_cap, compactCurrencyFormatter);
  fdvEl.textContent = formatCurrency(entry.fully_diluted_valuation, compactCurrencyFormatter);
  volumeEl.textContent = formatCurrency(entry.total_volume, compactCurrencyFormatter);
  high24hEl.textContent = formatCurrency(entry.high_24h, currencyFormatter);
  low24hEl.textContent = formatCurrency(entry.low_24h, currencyFormatter);
  circulatingEl.textContent = formatNumber(entry.circulating_supply);
  maxSupplyEl.textContent = entry.max_supply ? formatNumber(entry.max_supply) : '—';
  athEl.textContent = formatCurrency(entry.ath, currencyFormatter);
  athDateEl.textContent = formatDate(entry.ath_date);
  atlEl.textContent = formatCurrency(entry.atl, currencyFormatter);
  atlDateEl.textContent = formatDate(entry.atl_date);

  const updatedAt = entry.last_updated ? new Date(entry.last_updated) : new Date();
  lastUpdatedEl.textContent = `Last updated: ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

  if (previousPrice !== null) {
    previousEl.textContent = currencyFormatter.format(previousPrice);
    const movement = price > previousPrice ? 'up' : price < previousPrice ? 'down' : 'flat';
    const movementText = movement === 'flat'
      ? 'Price is flat since the last check.'
      : `BTC moved ${movement} since the prior refresh.`;
    directionEl.textContent = `${movementText} Current 24h change: ${changeEl.textContent}.`;
  }

  previousPrice = price;
  setStatus('Live • Auto-refreshing', '#22c55e');
  setCountdown(15);
}

function applyPercent(element, value) {
  const valid = typeof value === 'number' && Number.isFinite(value);
  if (!valid) {
    element.textContent = 'N/A';
    element.classList.remove('negative', 'positive');
    return;
  }

  const formatted = `${value >= 0 ? '+' : ''}${percentFormatter.format(value)}%`;
  element.textContent = formatted;
  element.classList.toggle('negative', value < 0);
  element.classList.toggle('positive', value >= 0);
}

function formatCurrency(value, formatter) {
  if (typeof value !== 'number') return 'N/A';
  return formatter.format(value);
}

function formatNumber(value) {
  if (typeof value !== 'number') return 'N/A';
  return `${integerFormatter.format(value)} BTC`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

async function safeReadSnippet(response) {
  try {
    const text = await response.text();
    const condensed = text.replace(/\s+/g, ' ').trim();
    return condensed ? `Body: ${condensed.slice(0, 120)}${condensed.length > 120 ? '…' : ''}` : '';
  } catch (error) {
    console.warn('Could not read response body', error);
    return '';
  }
}

function setStatus(text, color) {
  statusText.textContent = text;
  if (color) {
    statusDot.style.background = color;
    statusDot.style.boxShadow = `0 0 0 6px ${color}33`;
  }
}

function setCountdown(seconds) {
  nextRefreshAt = Date.now() + seconds * 1000;
  updateCountdownLabel();
  stopCountdown();
  countdownTimer = setInterval(updateCountdownLabel, 1000);
}

function updateCountdownLabel() {
  if (!nextRefreshAt) return;
  const remainingMs = nextRefreshAt - Date.now();
  const remaining = Math.max(0, Math.round(remainingMs / 1000));
  countdownEl.textContent = `${remaining}s to next refresh`;
}

function stopCountdown() {
  clearInterval(countdownTimer);
}

function showError(text) {
  if (!errorBanner) return;
  errorBanner.textContent = text;
  errorBanner.style.display = 'block';
  errorBanner.hidden = false;
}

function clearError() {
  if (!errorBanner) return;
  errorBanner.textContent = '';
  errorBanner.style.display = 'none';
  errorBanner.hidden = true;
}

function scheduleNext() {
  clearTimeout(timerId);
  timerId = setTimeout(fetchPrice, 15000);
}

refreshBtn.addEventListener('click', () => {
  clearTimeout(timerId);
  fetchPrice();
});

fetchPrice();