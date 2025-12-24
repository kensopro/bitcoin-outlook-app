const API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true';
const priceEl = document.getElementById('price');
const changeEl = document.getElementById('change');
const updatedEl = document.getElementById('updated');
const previousEl = document.getElementById('previous');
const directionEl = document.getElementById('direction');
const statusText = document.getElementById('status-text');
const statusDot = document.querySelector('.dot');
const refreshBtn = document.getElementById('refresh');

let previousPrice = null;
let timerId = null;

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

async function fetchPrice() {
  setStatus('Updating...', '#22c55e');

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error('Request failed');
    }

    const data = await response.json();
    const price = data?.bitcoin?.usd;
    const change24h = data?.bitcoin?.usd_24h_change;

    if (typeof price !== 'number') {
      throw new Error('Price missing from response');
    }

    updateUI(price, change24h);
    scheduleNext();
  } catch (error) {
    console.error(error);
    setStatus('Could not load data. Retrying in 30s.', '#ef4444');
    setTimeout(fetchPrice, 30000);
  }
}

function updateUI(price, change24h) {
  const formattedPrice = formatter.format(price);
  priceEl.textContent = formattedPrice;

  const formattedPercent = change24h !== undefined
    ? `${change24h >= 0 ? '+' : ''}${percentFormatter.format(change24h)}%`
    : 'N/A';

  changeEl.textContent = formattedPercent;
  changeEl.classList.toggle('negative', change24h < 0);

  const now = new Date();
  updatedEl.textContent = `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

  if (previousPrice !== null) {
    previousEl.textContent = formatter.format(previousPrice);
    const movement = price > previousPrice ? 'up' : price < previousPrice ? 'down' : 'flat';
    const movementText = movement === 'flat' ? 'Price is flat since last check.' : `BTC moved ${movement} since the last refresh.`;
    directionEl.textContent = `${movementText} Current 24h change: ${formattedPercent}`;
  }

  previousPrice = price;
  setStatus('Live • Auto-refreshing', '#22c55e');
}

function setStatus(text, color) {
  statusText.textContent = text;
  if (color) {
    statusDot.style.background = color;
    statusDot.style.boxShadow = `0 0 0 6px ${color}33`;
  }
}

function scheduleNext() {
  clearTimeout(timerId);
  timerId = setTimeout(fetchPrice, 30000);
}

refreshBtn.addEventListener('click', () => {
  clearTimeout(timerId);
  fetchPrice();
});

fetchPrice();
