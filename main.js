const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.page-section');
const proToggle = document.getElementById('pro-mode');
const stripPrice = document.getElementById('strip-price');
const stripChange = document.getElementById('strip-change');
const stripVol = document.getElementById('strip-vol');
const stripUpdated = document.getElementById('strip-updated');
const priceDisplay = document.getElementById('price-display');
const spreadDisplay = document.getElementById('spread-display');
const priceUpdated = document.getElementById('price-updated');
const copyPriceBtn = document.getElementById('copy-price');
const tradeSize = document.getElementById('trade-size');
const slippageDisplay = document.getElementById('slippage-display');
const depthDisplay = document.getElementById('depth-display');
const rv7 = document.getElementById('rv7');
const rv30 = document.getElementById('rv30');
const regime = document.getElementById('regime');
const volUpdated = document.getElementById('vol-updated');
const alertList = document.getElementById('alert-list');
const addAlertBtn = document.getElementById('add-alert');
const alertUpdated = document.getElementById('alert-updated');
const healthGrid = document.getElementById('health-grid');
const indicatorToggles = document.getElementById('indicator-toggles');
const sparklineSvg = document.getElementById('sparkline-svg');
const sparklineTooltip = document.getElementById('sparkline-tooltip');
const sparklineTime = document.getElementById('sparkline-time');
const sparklinePrice = document.getElementById('sparkline-price');
const chartUpdated = document.getElementById('chart-updated');
const watchlistItems = document.getElementById('watchlist-items');
const refreshWatchBtn = document.getElementById('refresh-watch');
const derivBody = document.getElementById('derivatives-body');
const derivUpdated = document.getElementById('deriv-updated');
const missionGrid = document.getElementById('mission-grid');
const startMissionBtn = document.getElementById('start-mission');
const quizBody = document.getElementById('quiz-body');
const submitQuizBtn = document.getElementById('submit-quiz');
const quizResult = document.getElementById('quiz-result');
const stripVolBadge = document.getElementById('strip-vol');

let ws;
let reconnectTimeout;
let lastRestPrice = null;
const restEndpoint =
  'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&sparkline=false';

const missions = [
  {
    title: 'Funding rate basics',
    objective: 'See when perp longs are paying shorts.',
    steps: ['Toggle funding overlay', 'Move threshold slider to 0.05%', 'Notice frequency of spikes'],
    liveTie: 'Compare current funding vs. your alert rule.',
  },
  {
    title: 'Volatility regimes',
    objective: 'Spot compression before expansion.',
    steps: ['Check 7D vs 30D realized', 'Mark “Calm” vs “Expansion” zones', 'Queue a volatility breakout alert'],
    liveTie: 'Use current RV bands to choose a regime label.',
  },
  {
    title: 'Order book liquidity',
    objective: 'Estimate slippage for your trade size.',
    steps: ['Drag trade size slider', 'Watch bps impact update', 'Note when depth is thin'],
    liveTie: 'Apply the calc before hitting market buy.',
  },
];

const quiz = [
  {
    question: 'When 7D RV is far below 30D RV and funding is positive, what is likely happening?',
    options: ['Compression with bullish tilt', 'High panic volatility', 'Neutral chop'],
    answer: 0,
  },
  {
    question: 'If the Binance WebSocket drops, what should the UI show?',
    options: ['Keep stale data without warning', 'Show fallback status and last known timestamp', 'Hide the widget entirely'],
    answer: 1,
  },
  {
    question: 'Why monitor order book depth before a large market order?',
    options: ['It sets your transaction fee', 'It reveals how much slippage you might cause', 'It changes network hashrate'],
    answer: 1,
  },
];

const indicatorList = ['VWAP', 'MA', 'RSI', 'Volume'];

function formatUSD(value, digits = 0) {
  return `$${Number(value).toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}`;
}

function formatCompact(value) {
  return `$${new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)}`;
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function switchSection(targetId) {
  sections.forEach((section) => section.classList.toggle('active', section.id === targetId));
  navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.target === targetId));
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => switchSection(btn.dataset.target));
});

proToggle.addEventListener('change', () => {
  document.body.classList.toggle('pro-enabled', proToggle.checked);
});

function updateHealth(status, lastUpdated) {
  const items = [
    { name: 'Binance WebSocket', status: status.ws ? 'pass' : 'fail', updated: lastUpdated.ws },
    { name: 'CoinGecko REST', status: status.rest ? 'pass' : 'fail', updated: lastUpdated.rest },
    { name: 'Education missions', status: 'pass', updated: nowLabel() },
  ];

  healthGrid.innerHTML = '';
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'health-card';
    const statusClass = item.status === 'pass' ? 'status-pass' : 'status-fail';
    card.innerHTML = `
      <p class="label">${item.name}</p>
      <p class="metric-value ${statusClass}">${item.status === 'pass' ? 'Healthy' : 'Issue'}</p>
      <p class="muted">Last updated ${item.updated || '—'}</p>
    `;
    healthGrid.appendChild(card);
  });
}

const healthState = {
  ws: false,
  rest: false,
};
const healthUpdated = {
  ws: null,
  rest: null,
};

function connectWebSocket() {
  clearTimeout(reconnectTimeout);
  ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@miniTicker');

  ws.onopen = () => {
    healthState.ws = true;
    healthUpdated.ws = nowLabel();
    updateHealth(healthState, healthUpdated);
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const price = Number(data.c);
    lastRestPrice = price;
    renderLivePrice(price);
    chartUpdated.textContent = `Live • ${nowLabel()}`;
  };

  ws.onerror = () => {
    ws.close();
  };

  ws.onclose = () => {
    healthState.ws = false;
    updateHealth(healthState, healthUpdated);
    reconnectTimeout = setTimeout(connectWebSocket, 1500);
  };
}

async function fetchRestMetrics() {
  try {
    const res = await fetch(restEndpoint);
    if (!res.ok) throw new Error('REST failed');
    const json = await res.json();
    const market = json.market_data;
    healthState.rest = true;
    healthUpdated.rest = nowLabel();
    updateHealth(healthState, healthUpdated);

    const price = market.current_price.usd;
    if (!lastRestPrice) lastRestPrice = price;
    stripChange.textContent = `${market.price_change_percentage_24h.toFixed(2)}%`;
    stripChange.classList.toggle('positive', market.price_change_percentage_24h >= 0);
    stripChange.classList.toggle('negative', market.price_change_percentage_24h < 0);

    spreadDisplay.textContent = `${(price - lastRestPrice).toFixed(2)} vs. ref`;
    updateDepthEstimate();

    stripUpdated.textContent = `REST • ${nowLabel()}`;
    renderLivePrice(price);
    chartUpdated.textContent = `REST • ${nowLabel()}`;
  } catch (error) {
    healthState.rest = false;
    updateHealth(healthState, healthUpdated);
    stripUpdated.textContent = 'REST fallback failed';
    console.error(error);
  }
}

function renderLivePrice(price) {
  if (!priceDisplay) return;
  priceDisplay.textContent = formatUSD(price, 2);
  stripPrice.textContent = formatUSD(price, 2);
  spreadDisplay.textContent = 'tight (<$2)';
  priceUpdated.textContent = `Live • ${nowLabel()}`;
  stripUpdated.textContent = `WS • ${nowLabel()}`;
  addPointToSparkline(price);
}

function updateDepthEstimate() {
  const tradeValue = Number(tradeSize.value);
  const depthUsd = Math.max(8000, tradeValue * 5);
  const slippage = Math.min(120, (tradeValue / depthUsd) * 10000).toFixed(1);
  depthDisplay.textContent = formatCompact(depthUsd);
  slippageDisplay.textContent = `${slippage} bps`;
}

tradeSize.addEventListener('input', updateDepthEstimate);

function seedVolatility() {
  const val7 = (Math.random() * 0.04 + 0.01) * 100;
  const val30 = val7 + (Math.random() * 0.06 - 0.03) * 100;
  rv7.textContent = `${val7.toFixed(2)}%`;
  rv30.textContent = `${val30.toFixed(2)}%`;
  const diff = val7 - val30;
  const regimeLabel = diff > 2 ? 'Expansion' : diff < -2 ? 'Compression' : 'Calm';
  regime.textContent = regimeLabel;
  stripVol.textContent = regimeLabel;
  volUpdated.textContent = nowLabel();
}

function addAlert() {
  const templates = [
    'Price crosses $70k (cooldown 10m)',
    'Funding > 0.05% (dedup 1h)',
    '7D RV > 30D RV (vol breakout)'
  ];
  const text = templates[Math.floor(Math.random() * templates.length)];
  const li = document.createElement('li');
  li.className = 'alert-item';
  li.innerHTML = `
    <span class="pill">Active</span>
    <strong>${text}</strong>
    <span class="muted">Last evaluated ${nowLabel()}</span>
  `;
  alertList.prepend(li);
  alertUpdated.textContent = nowLabel();
}

addAlertBtn.addEventListener('click', addAlert);

function buildIndicators() {
  indicatorList.forEach((ind) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = ind === 'VWAP';
    input.addEventListener('change', () => {
      chartUpdated.textContent = `${ind} ${input.checked ? 'on' : 'off'} • ${nowLabel()}`;
    });
    label.appendChild(input);
    label.append(ind);
    indicatorToggles.appendChild(label);
  });
}

const sparkPoints = [];

function addPointToSparkline(price) {
  const now = Date.now();
  sparkPoints.push({ time: now, price });
  const maxPoints = 80;
  if (sparkPoints.length > maxPoints) sparkPoints.shift();
  renderSparkline();
}

function renderSparkline() {
  sparklineSvg.innerHTML = '';
  if (sparkPoints.length < 2) return;
  const width = 800;
  const height = 240;
  const padding = 20;
  const minPrice = Math.min(...sparkPoints.map((p) => p.price));
  const maxPrice = Math.max(...sparkPoints.map((p) => p.price));
  const range = maxPrice - minPrice || 1;

  const points = sparkPoints.map((pt, idx) => {
    const x = padding + (idx / (sparkPoints.length - 1)) * (width - padding * 2);
    const y = height - padding - ((pt.price - minPrice) / range) * (height - padding * 2);
    return { ...pt, x, y };
  });

  const pathD = points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x} ${pt.y}`).join(' ');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathD);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'url(#spark-grad)');
  path.setAttribute('stroke-width', '3');
  path.setAttribute('stroke-linecap', 'round');

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  grad.id = 'spark-grad';
  grad.setAttribute('x1', '0%');
  grad.setAttribute('x2', '100%');
  grad.setAttribute('y1', '0%');
  grad.setAttribute('y2', '0%');
  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', '#fbbf24');
  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', '#22d3ee');
  grad.append(stop1, stop2);
  defs.appendChild(grad);
  sparklineSvg.appendChild(defs);
  sparklineSvg.appendChild(path);

  points.forEach((pt) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    node.setAttribute('cx', pt.x);
    node.setAttribute('cy', pt.y);
    node.setAttribute('r', 6);
    node.setAttribute('fill', '#0f172a');
    node.setAttribute('stroke', '#fbbf24');
    node.setAttribute('stroke-width', 2);
    node.addEventListener('mouseenter', () => showSparkTooltip(pt));
    node.addEventListener('focus', () => showSparkTooltip(pt));
    sparklineSvg.appendChild(node);
  });

  sparklineSvg.addEventListener('mouseleave', () => {
    sparklineTooltip.hidden = true;
  });
}

function showSparkTooltip(pt) {
  sparklineTooltip.hidden = false;
  sparklineTime.textContent = new Date(pt.time).toLocaleTimeString();
  sparklinePrice.textContent = formatUSD(pt.price, 2);
  sparklineTooltip.style.left = `${(pt.x / 800) * 100}%`;
  sparklineTooltip.style.top = `${(pt.y / 240) * 100}%`;
}

function seedWatchlist() {
  const items = [
    { label: 'BTCUSD', value: stripPrice.textContent || '—', tag: 'Spot' },
    { label: 'Funding', value: '0.012%', tag: '8h' },
    { label: 'OI', value: '$12.4B', tag: 'Agg' },
    { label: 'Vol regime', value: stripVolBadge.textContent, tag: 'RV' },
  ];
  watchlistItems.innerHTML = '';
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'watch-card';
    card.innerHTML = `
      <div class="meta-row"><span class="badge">${item.tag}</span><span class="muted">Pin</span></div>
      <strong>${item.label}</strong>
      <span class="muted">${item.value}</span>
    `;
    watchlistItems.appendChild(card);
  });
}

refreshWatchBtn.addEventListener('click', seedWatchlist);

function seedDerivatives() {
  const rows = [
    { ex: 'Binance', funding: '0.018%', oi: '$5.2B', trend: 'Rising' },
    { ex: 'Bybit', funding: '0.011%', oi: '$3.1B', trend: 'Flat' },
    { ex: 'OKX', funding: '-0.004%', oi: '$2.7B', trend: 'Cooling' },
  ];
  derivBody.innerHTML = '';
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.ex}</td><td>${row.funding}</td><td>${row.oi}</td><td>${row.trend}</td>`;
    derivBody.appendChild(tr);
  });
  derivUpdated.textContent = nowLabel();
}

function renderMissions() {
  missionGrid.innerHTML = '';
  missions.forEach((mission) => {
    const card = document.createElement('div');
    card.className = 'mission-card';
    card.innerHTML = `
      <p class="badge">Mission</p>
      <strong>${mission.title}</strong>
      <p class="muted">Objective: ${mission.objective}</p>
      <ul>${mission.steps.map((s) => `<li>${s}</li>`).join('')}</ul>
      <p class="muted">Apply: ${mission.liveTie}</p>
    `;
    missionGrid.appendChild(card);
  });
}

startMissionBtn.addEventListener('click', () => {
  const rand = missions[Math.floor(Math.random() * missions.length)];
  quizResult.textContent = `Loaded: ${rand.title}. Apply it to the live price.`;
});

function renderQuiz() {
  quizBody.innerHTML = '';
  quiz.forEach((q, idx) => {
    const container = document.createElement('div');
    container.className = 'quiz-question';
    const title = document.createElement('p');
    title.textContent = q.question;
    container.appendChild(title);

    q.options.forEach((opt, optIndex) => {
      const label = document.createElement('label');
      label.style.display = 'block';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `quiz-${idx}`;
      input.value = optIndex;
      label.appendChild(input);
      label.append(` ${opt}`);
      container.appendChild(label);
    });

    quizBody.appendChild(container);
  });
}

submitQuizBtn.addEventListener('click', () => {
  let correct = 0;
  quiz.forEach((q, idx) => {
    const chosen = quizBody.querySelector(`input[name="quiz-${idx}"]:checked`);
    if (chosen && Number(chosen.value) === q.answer) correct += 1;
  });
  quizResult.textContent = `You nailed ${correct}/${quiz.length}. Keep iterating.`;
});

copyPriceBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(priceDisplay.textContent);
  copyPriceBtn.textContent = 'Copied';
  setTimeout(() => (copyPriceBtn.textContent = 'Copy'), 900);
});

function initWatchStrip() {
  stripVol.textContent = 'Calm';
  stripPrice.textContent = '—';
  stripUpdated.textContent = 'Waiting…';
}

function bootstrap() {
  initWatchStrip();
  connectWebSocket();
  fetchRestMetrics();
  setInterval(fetchRestMetrics, 60_000);
  seedVolatility();
  setInterval(seedVolatility, 45_000);
  updateDepthEstimate();
  addAlert();
  buildIndicators();
  seedWatchlist();
  seedDerivatives();
  renderMissions();
  renderQuiz();
}

bootstrap();
