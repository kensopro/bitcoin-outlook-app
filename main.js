const API_URL = 'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false';
const REFRESH_INTERVAL = 15000;

const priceEl = document.getElementById('price');
const changeEl = document.getElementById('change');
const updatedEl = document.getElementById('updated');
const updatedDetailedEl = document.getElementById('updated-detailed');
const previousEl = document.getElementById('previous');
const priceDirectionEl = document.getElementById('price-direction');
const statusText = document.getElementById('status-text');
const statusDot = document.querySelector('.dot');
const refreshBtn = document.getElementById('refresh');
const errorBanner = document.getElementById('error-banner');
const rankEl = document.getElementById('rank');
const marketCapEl = document.getElementById('market-cap');
const volumeEl = document.getElementById('volume');
const fdvEl = document.getElementById('fdv');
const volMcEl = document.getElementById('vol-mc');
const watchlistEl = document.getElementById('watchlist');
const low24El = document.getElementById('low-24h');
const high24El = document.getElementById('high-24h');
const rangeLabelEl = document.getElementById('range-label');
const rangeFillEl = document.getElementById('range-fill');
const supplyLabelEl = document.getElementById('supply-label');
const supplyFillEl = document.getElementById('supply-fill');
const circulatingEl = document.getElementById('circulating');
const maxSupplyEl = document.getElementById('max-supply');
const btcInput = document.getElementById('btc-input');
const usdInput = document.getElementById('usd-input');
const converterPriceEl = document.getElementById('converter-price');
const athEl = document.getElementById('ath');
const athDateEl = document.getElementById('ath-date');
const atlEl = document.getElementById('atl');
const atlDateEl = document.getElementById('atl-date');
const distanceEl = document.getElementById('distance');

let previousPrice = null;
let timerId = null;
let lastPrice = null;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

async function fetchPrice() {
  setStatus('Updating…', '#22c55e');
  clearError();

  try {
    const response = await fetch(API_URL, { cache: 'no-store' });
    if (!response.ok) {
      const bodySnippet = await safeReadSnippet(response);
      const statusLabel = `${response.status} ${response.statusText || ''}`.trim();
      throw new Error(`HTTP ${statusLabel}${bodySnippet ? ` • ${bodySnippet}` : ''}`);
    }

    const data = await response.json();
    const marketData = data?.market_data;

    if (!marketData || typeof marketData.current_price?.usd !== 'number') {
      throw new Error('Market data missing from response');
    }

    updateUI(data);
    scheduleNext();
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    showError(`Failed to refresh price. ${message}`);
    setStatus('Could not load data. Retrying in 30s.', '#ef4444');
    timerId = setTimeout(fetchPrice, 30000);
  }
}

function updateUI(data) {
  const marketData = data.market_data;
  const price = marketData.current_price.usd;
  const change24h = marketData.price_change_percentage_24h;

  lastPrice = price;
  priceEl.textContent = currencyFormatter.format(price);

  const formattedPercent = `${change24h >= 0 ? '+' : ''}${percentFormatter.format(change24h)}%`;
  changeEl.textContent = formattedPercent;
  changeEl.classList.toggle('negative', change24h < 0);

  const now = new Date(data.last_updated || Date.now());
  updatedEl.textContent = `Last update at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  updatedDetailedEl.textContent = `${now.toLocaleString()} • ${timeAgo(now)} ago`;

  if (previousPrice !== null) {
    previousEl.textContent = currencyFormatter.format(previousPrice);
    const movement = price > previousPrice ? 'up' : price < previousPrice ? 'down' : 'flat';
    const movementText = movement === 'flat'
      ? 'Price is unchanged since the last refresh.'
      : `BTC moved ${movement === 'up' ? 'up' : 'down'} since the last check.`;
    priceDirectionEl.textContent = `${movementText} 24h change: ${formattedPercent}`;
  } else {
    priceDirectionEl.textContent = 'Awaiting a second reading to show movement.';
  }

  previousPrice = price;
  setStatus('Live • Auto-refreshing every 15s', '#22c55e');

  renderStats(data);
  renderRange(marketData);
  renderSupply(marketData);
  renderPerformance(marketData);
  renderConverter();
}

function renderStats(data) {
  const { market_data: marketData } = data;
  rankEl.textContent = data.market_cap_rank ? `#${data.market_cap_rank}` : 'N/A';
  marketCapEl.textContent = marketData.market_cap?.usd ? currencyFormatter.format(marketData.market_cap.usd) : 'N/A';
  volumeEl.textContent = marketData.total_volume?.usd ? currencyFormatter.format(marketData.total_volume.usd) : 'N/A';
  fdvEl.textContent = marketData.fully_diluted_valuation?.usd
    ? currencyFormatter.format(marketData.fully_diluted_valuation.usd)
    : 'N/A';

  if (marketData.total_volume?.usd && marketData.market_cap?.usd) {
    const ratio = marketData.total_volume.usd / marketData.market_cap.usd;
    volMcEl.textContent = `${percentFormatter.format(ratio * 100)}%`;
  } else {
    volMcEl.textContent = 'N/A';
  }

  watchlistEl.textContent = data.watchlist_portfolio_users
    ? compactFormatter.format(data.watchlist_portfolio_users)
    : 'N/A';
}

function renderRange(marketData) {
  const low = marketData.low_24h?.usd;
  const high = marketData.high_24h?.usd;
  const price = marketData.current_price.usd;

  if (typeof low === 'number') low24El.textContent = currencyFormatter.format(low);
  if (typeof high === 'number') high24El.textContent = currencyFormatter.format(high);

  if (typeof low === 'number' && typeof high === 'number' && high > low) {
    const position = Math.min(Math.max((price - low) / (high - low), 0), 1);
    rangeFillEl.style.width = `${position * 100}%`;
    rangeLabelEl.textContent = `${currencyFormatter.format(price)} within today’s range`;
  } else {
    rangeLabelEl.textContent = 'Range unavailable';
    rangeFillEl.style.width = '0%';
  }
}

function renderSupply(marketData) {
  const circulating = marketData.circulating_supply;
  const maxSupply = marketData.max_supply || marketData.total_supply;

  circulatingEl.textContent = typeof circulating === 'number'
    ? `${compactFormatter.format(circulating)} BTC`
    : 'N/A';
  maxSupplyEl.textContent = typeof maxSupply === 'number'
    ? `${compactFormatter.format(maxSupply)} BTC`
    : 'N/A';

  if (typeof circulating === 'number' && typeof maxSupply === 'number' && maxSupply > 0) {
    const pct = Math.min((circulating / maxSupply) * 100, 100);
    supplyFillEl.style.width = `${pct}%`;
    supplyLabelEl.textContent = `${percentFormatter.format(pct)}% of supply is circulating`;
  } else {
    supplyLabelEl.textContent = 'Supply information unavailable';
    supplyFillEl.style.width = '0%';
  }
}

function renderPerformance(marketData) {
  const ath = marketData.ath?.usd;
  const atl = marketData.atl?.usd;
  const athDate = marketData.ath_date?.usd;
  const atlDate = marketData.atl_date?.usd;
  const price = marketData.current_price.usd;

  athEl.textContent = typeof ath === 'number' ? currencyFormatter.format(ath) : 'N/A';
  atlEl.textContent = typeof atl === 'number' ? currencyFormatter.format(atl) : 'N/A';
  athDateEl.textContent = athDate ? `Set on ${formatDate(athDate)}` : 'Date unavailable';
  atlDateEl.textContent = atlDate ? `Set on ${formatDate(atlDate)}` : 'Date unavailable';

  if (typeof ath === 'number' && typeof atl === 'number') {
    const belowAth = ((ath - price) / ath) * 100;
    const aboveAtl = ((price - atl) / atl) * 100;
    distanceEl.textContent = `${percentFormatter.format(belowAth)}% below ATH • ${percentFormatter.format(aboveAtl)}% above ATL`;
  } else {
    distanceEl.textContent = 'Distance information unavailable';
  }
}

function renderConverter() {
  if (lastPrice === null) return;
  converterPriceEl.textContent = `1 BTC = ${currencyFormatter.format(lastPrice)}`;
  const btcValue = parseFloat(btcInput.value) || 0;
  usdInput.value = (btcValue * lastPrice).toFixed(2);
}

function updateFromUsd() {
  if (lastPrice === null) return;
  const usdValue = parseFloat(usdInput.value) || 0;
  btcInput.value = (usdValue / lastPrice).toFixed(8);
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
  timerId = setTimeout(fetchPrice, REFRESH_INTERVAL);
}

function timeAgo(date) {
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

refreshBtn.addEventListener('click', () => {
  clearTimeout(timerId);
  fetchPrice();
});

btcInput.addEventListener('input', renderConverter);
usdInput.addEventListener('input', updateFromUsd);

fetchPrice();
