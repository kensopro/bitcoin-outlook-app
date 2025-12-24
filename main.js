const supplyNumber = document.getElementById('supply-number');
const replaySupplyBtn = document.getElementById('replay-supply');
const supplySteps = document.getElementById('supply-steps');
const stepExplainer = document.getElementById('step-explainer');
const chartSvg = document.getElementById('chart-svg');
const chartTooltip = document.getElementById('chart-tooltip');
const tooltipEra = document.getElementById('tooltip-era');
const tooltipValue = document.getElementById('tooltip-value');
const chartCaption = document.getElementById('chart-caption');
const chapterList = document.getElementById('chapter-list');
const chapterLabel = document.getElementById('chapter-label');
const chapterTitle = document.getElementById('chapter-title');
const chapterBlurb = document.getElementById('chapter-blurb');
const lessonPills = document.getElementById('lesson-pills');
const prevChapterBtn = document.getElementById('previous-chapter');
const nextChapterBtn = document.getElementById('next-chapter');
const timelineEvents = document.getElementById('timeline-events');
const timelineNote = document.getElementById('timeline-note');
const startTourBtn = document.getElementById('start-tour');
const priceValue = document.getElementById('price-value');
const priceSub = document.getElementById('price-sub');
const changeValue = document.getElementById('change-value');
const changeSub = document.getElementById('change-sub');
const marketCapValue = document.getElementById('market-cap-value');
const marketCapSub = document.getElementById('market-cap-sub');
const volumeValue = document.getElementById('volume-value');
const volumeSub = document.getElementById('volume-sub');
const lastUpdated = document.getElementById('last-updated');

const SUPPLY_CAP = 21_000_000;
const supplyStart = 19_700_000; // approximate circulating supply anchor for the animation

const missions = [
  {
    id: 'funding-basics',
    title: 'Mission: Funding Rate Basics',
    summary: 'See how positive funding can pressure long positioning.',
    label: 'Perps 101',
    steps: [
      'Watch the live price feed; funding updates every tick as an estimate.',
      'Toggle Pro Mode to reveal the VWAP gap and watch how it impacts the risk gauge.',
      'Apply: If funding is positive and spread widens, consider fade-rally scenario.'
    ],
    question: 'When funding is high and price is above VWAP, what is the usual risk?',
    options: [
      'Longs pay shorts; risk of long squeeze if liquidity thins.',
      'Nothing changes; funding has no impact.',
      'Shorts pay longs; squeezes always happen up only.'
    ],
    answer: 0
  },
];

const quiz = [
  {
    id: 'volatility-regime',
    title: 'Mission: Volatility Regimes',
    summary: 'Use 24h change + volume pulse to label compression or expansion.',
    label: 'Volatility',
    steps: [
      'Look at 24h change alongside volume to gauge expansion.',
      'If change is inside ±1% and volume is muted, expect compression.',
      'Apply: Alerts on volatility breakout need higher volume confirmation.'
    ],
    question: 'Which combo hints at expansion risk?',
    options: [
      'Large 24h move with rising volume',
      'Flat price and flat volume',
      'Falling price and falling volume only'
    ],
    answer: 0
  },
  {
    id: 'spread-sanity',
    title: 'Mission: Spread Sanity Check',
    summary: 'Use the spread tile to detect exchange premium/discount risk.',
    label: 'Market Quality',
    steps: [
      'Watch spread vs index; above 0.25% means dislocation risk.',
      'If Pro filter is on, alerts only fire when spread is healthy (< 0.2%).',
      'Apply: widen slippage assumptions when spread is elevated.'
    ],
    question: 'Why does a wide spread matter?',
    options: [
      'It can distort fills and trigger unwanted liquidations.',
      'It makes trading free of fees.',
      'It guarantees arbitrage profits instantly.'
    ],
    answer: 0
  }
];

function formatCurrency(value) {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatCompact(value) {
  return `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`;
}

function updateStatus(text) {
  if (lastUpdated) {
    lastUpdated.textContent = text;
  }
}

async function fetchMetrics() {
  updateStatus('Fetching live market data…');
  const response = await fetch(
    'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&sparkline=false'
  );
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}

function setChangeTone(value) {
  changeValue.classList.toggle('positive', value >= 0);
  changeValue.classList.toggle('negative', value < 0);
  changeSub.textContent = value >= 0 ? 'Green day for the orange coin.' : 'Pullback on the boards.';
}

function updateMetricCards(data) {
  const marketData = data.market_data;
  priceValue.textContent = formatCurrency(marketData.current_price.usd);
  priceSub.textContent = `Cap change ${marketData.market_cap_change_percentage_24h.toFixed(2)}% over 24h`;

  const change = marketData.price_change_percentage_24h;
  changeValue.textContent = `${change.toFixed(2)}%`;
  setChangeTone(change);

  marketCapValue.textContent = formatCompact(marketData.market_cap.usd);
  marketCapSub.textContent = `${marketData.circulating_supply.toLocaleString('en-US')} BTC circulating`;

  volumeValue.textContent = formatCompact(marketData.total_volume.usd);
  volumeSub.textContent = '24h exchange and on-chain turnover';

  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  updateStatus(`Live • updated ${timestamp}`);
}

async function hydrateMetrics() {
  try {
    const data = await fetchMetrics();
    updateMetricCards(data);
  } catch (error) {
    updateStatus('Could not load live data. Retry in a moment.');
    priceSub.textContent = 'Check your connection and refresh.';
    console.error('Error fetching metrics', error);
  }
}

function animateSupplyCounter() {
  cancelAnimationFrame(supplyAnimationFrame);
  const start = performance.now();
  const duration = 1200;

  const update = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const value = Math.floor(progress * SUPPLY_CAP);
    supplyNumber.textContent = value.toLocaleString('en-US');

    if (progress < 1) {
      supplyAnimationFrame = requestAnimationFrame(update);
    } else {
      supplyNumber.textContent = SUPPLY_CAP.toLocaleString('en-US');
    }
  };

function formatUSD(value, digits = 0) {
  return `$${Number(value).toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}`;
}

function formatCompact(value) {
  return `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`;
}

function setChangeTone(value) {
  changeValue.classList.toggle('positive', value >= 0);
  changeValue.classList.toggle('negative', value < 0);
  changeSub.textContent = value >= 0 ? 'Green day for the orange coin.' : 'Pullback on the boards.';
}

function setConnectionStatus(text, healthy = false) {
  connectionStatus.textContent = text;
  connectionStatus.classList.toggle('healthy', healthy);
}

function updateStatusBadge(timestamp) {
  lastUpdated.textContent = `Live • updated ${timestamp}`;
}

function updateMicroLast(timestamp) {
  microLast.textContent = `Last updated: ${timestamp}`;
}

function computeSpread(livePrice) {
  if (!referencePrice || !livePrice) return null;
  const spread = ((livePrice - referencePrice) / referencePrice) * 100;
  return spread;
}

function refreshRiskGauge(ticker) {
  if (!ticker) return;
  const price = Number(ticker.c);
  const changePct = Number(ticker.P);
  const volumeUsd = Number(ticker.q);
  const spread = computeSpread(price);
  const riskScore = [
    Math.min(Math.abs(changePct) / 5, 1),
    spread ? Math.min(Math.abs(spread) / 0.3, 1) : 0,
    volumeUsd > 1_000_000_000 ? 0.2 : 0.5
  ].reduce((a, b) => a + b, 0) / 3;

  const label = riskScore > 0.6 ? 'High' : riskScore > 0.3 ? 'Moderate' : 'Calm';
  riskValue.textContent = `${label} (${(riskScore * 100).toFixed(0)}%)`;
  riskNote.textContent = `Factors: |Δ| ${changePct.toFixed(2)}% · spread ${spread ? spread.toFixed(2) : '—'}% · volume ${
    volumeUsd > 0 ? 'active' : 'muted'
  }`;
}

function updateVWAPGap(ticker) {
  if (!ticker) return;
  const price = Number(ticker.c);
  const open = Number(ticker.o);
  const avg = (price + open) / 2;
  const gap = ((price - avg) / avg) * 100;
  vwapValue.textContent = `${gap.toFixed(2)}%`;
  vwapNote.textContent = gap > 0 ? 'Price above rolling VWAP' : 'Price below VWAP';
}

function updateFunding(ticker) {
  if (!ticker) return;
  const rate = Number(ticker.P) / 100 / 24; // rough proxy: convert 24h change to hourly drift
  fundingValue.textContent = `${(rate * 100).toFixed(4)}% est.`;
  fundingNote.textContent = rate > 0 ? 'Longs likely paying shorts.' : 'Shorts likely paying longs.';
}

function applyTickerUpdate(ticker) {
  lastTicker = ticker;
  const price = Number(ticker.c);
  const changePct = Number(ticker.P);
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  priceValue.textContent = formatCurrency(price);
  priceSub.textContent = `24h open ${formatCurrency(ticker.o)}`;
  changeValue.textContent = `${changePct.toFixed(2)}%`;
  setChangeTone(changePct);
  changeSource.textContent = `Source: Binance WS @ ${timestamp}`;
  priceSource.textContent = `Source: Binance WS @ ${timestamp}`;
  updateStatusBadge(timestamp);

  const spread = computeSpread(price);
  if (spread !== null) {
    spreadValue.textContent = `${spread.toFixed(3)}%`;
    spreadSub.textContent = spread > 0 ? 'Exchange premium vs index' : 'Trading at discount to index';
    spreadSource.textContent = `Index from CoinGecko @ ${timestamp}`;
  }

  updateVWAPGap(ticker);
  updateFunding(ticker);
  refreshRiskGauge(ticker);
  updateMicroLast(timestamp);
  evaluateAlert();
}

async function fetchReferenceMetrics() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&sparkline=false'
    );
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    const market = data.market_data;
    referencePrice = market.current_price.usd;
    volumeValue.textContent = formatCompact(market.total_volume.usd);
    volumeSub.textContent = `${market.price_change_percentage_24h.toFixed(2)}% vs 24h price move`;
    volumeSource.textContent = `Source: CoinGecko @ ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const spread = computeSpread(lastTicker ? Number(lastTicker.c) : null);
    if (spread !== null) {
      spreadValue.textContent = `${spread.toFixed(3)}%`;
      spreadSub.textContent = spread > 0 ? 'Exchange premium vs index' : 'Trading at discount to index';
      spreadSource.textContent = `Index from CoinGecko @ ${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    }
  } catch (error) {
    console.error('Error fetching metrics', error);
    volumeSub.textContent = 'Could not load CoinGecko metrics';
  }
}

function connectWebSocket() {
  if (ws) {
    ws.close();
  }
  ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@miniTicker');

  ws.addEventListener('open', () => {
    setConnectionStatus('Connected to Binance WebSocket', true);
    wsHeartbeat = setInterval(() => ws.send(JSON.stringify({ method: 'PING' })), 30_000);
  });

  ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (!data.c) return;
      applyTickerUpdate(data);
    } catch (error) {
      console.error('Error parsing ticker', error);
    }
  });

  ws.addEventListener('close', () => {
    setConnectionStatus('WebSocket disconnected. Reconnecting…');
    clearInterval(wsHeartbeat);
    setTimeout(connectWebSocket, 2000);
  });

  ws.addEventListener('error', () => {
    setConnectionStatus('WebSocket error. Falling back to polling…');
    clearInterval(wsHeartbeat);
  });
}

function animateSupply() {
  let progress = 0;
  const duration = 2000;
  const start = performance.now();

  const tick = (now) => {
    progress = Math.min(1, (now - start) / duration);
    const current = Math.floor(supplyStart + (SUPPLY_CAP - supplyStart) * progress * 0.8);
    supplyNumber.textContent = current.toLocaleString('en-US');
    supplyProgress.textContent = `${((current / SUPPLY_CAP) * 100).toFixed(2)}% of cap issued`;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
}

function attachCopyHandlers() {
  document.querySelectorAll('.stat-card').forEach((card) => {
    const targetId = card.dataset.copyTarget;
    const target = document.getElementById(targetId);
    card.addEventListener('click', () => {
      if (!target) return;
      navigator.clipboard.writeText(target.textContent.trim());
      card.classList.add('copied');
      setTimeout(() => card.classList.remove('copied'), 900);
    });
  });
}

function wireTooltipHover() {
  document.querySelectorAll('[data-tooltip]').forEach((el) => {
    el.setAttribute('tabindex', '0');
  });
}

function toggleProMode() {
  proEnabled = !proEnabled;
  proToggle.textContent = proEnabled ? 'Pro Mode enabled' : 'Enable Pro Mode';
  proToggle.setAttribute('aria-pressed', String(proEnabled));
  document.body.classList.toggle('pro', proEnabled);
  vwapNote.textContent = proEnabled ? 'VWAP deviation visible.' : 'Toggle Pro Mode to reveal.';
  riskNote.textContent = proEnabled ? 'Risk gauge shows composite mix.' : 'Turn on Pro Mode to inspect components.';
  evaluateAlert();
}

function evaluateAlert() {
  if (!alertConfig || !lastTicker) return;
  const price = Number(lastTicker.c);
  const changePct = Number(lastTicker.P);
  const spread = computeSpread(price);
  const priceTriggered = alertConfig.price && price >= alertConfig.price;
  const changeTriggered = alertConfig.change && changePct >= alertConfig.change;
  const spreadOk = !alertConfig.pro || (spread !== null && Math.abs(spread) < 0.2);

  if ((priceTriggered || changeTriggered) && spreadOk) {
    alertStatus.textContent = `ALERT: Price ${formatCurrency(price)} · Δ ${changePct.toFixed(2)}% · Spread ${
      spread ? spread.toFixed(2) : '—'
    }%`;
    alertStatus.classList.add('active');
  }
}

function saveAlert() {
  const price = Number(alertPrice.value);
  const changePct = Number(alertChange.value);
  alertConfig = {
    price: Number.isFinite(price) ? price : null,
    change: Number.isFinite(changePct) ? changePct : null,
    pro: alertPro.checked
  };
  alertStatus.textContent = `Alert armed: price >= ${alertConfig.price || '—'} | 24h change >= ${
    alertConfig.change || '—'
  }%${alertConfig.pro ? ' with Pro filter' : ''}`;
  alertStatus.classList.remove('active');
}

function renderMissions() {
  missions.forEach((mission, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mission-pill';
    button.textContent = mission.title;
    button.dataset.index = index;
    button.addEventListener('click', () => loadMission(index));
    missionList.appendChild(button);
  });
  loadMission(0);
}

function loadMission(index) {
  const mission = missions[index];
  if (!mission) return;

  missionLabel.textContent = mission.label;
  missionTitle.textContent = mission.title;
  missionSummary.textContent = mission.summary;
  missionSteps.innerHTML = '';
  mission.steps.forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
    missionSteps.appendChild(li);
  });

  quizQuestion.textContent = mission.question;
  quizOptions.innerHTML = '';
  mission.options.forEach((opt, idx) => {
    const label = document.createElement('label');
    label.className = 'checkbox';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'quiz';
    input.value = idx;
    label.appendChild(input);
    label.appendChild(document.createTextNode(opt));
    quizOptions.appendChild(label);
  });

  quizResult.textContent = '';
  missionList.querySelectorAll('.mission-pill').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.index) === index);
  });
  submitQuiz.dataset.answer = mission.answer;
}

function attachMetricCopy() {
  document.querySelectorAll('.stat-card').forEach((card) => {
    const targetId = card.dataset.copyTarget;
    const target = document.getElementById(targetId);
    card.addEventListener('click', () => {
      if (!target) return;
      navigator.clipboard.writeText(target.textContent.trim());
      card.classList.add('copied');
      setTimeout(() => card.classList.remove('copied'), 800);
    });
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

animateSupplyCounter();
wireSupplySteps();
renderChart();
renderChapters();
renderTimeline();
attachChapterControls();
animateTourCTA();
attachMetricCopy();
hydrateMetrics();
setInterval(hydrateMetrics, 60_000);

animateSupply();
attachCopyHandlers();
wireTooltipHover();
renderMissions();
connectWebSocket();
fetchReferenceMetrics();
setInterval(fetchReferenceMetrics, 60_000);

proToggle.addEventListener('click', toggleProMode);
saveAlertBtn.addEventListener('click', saveAlert);
submitQuiz.addEventListener('click', gradeQuiz);
