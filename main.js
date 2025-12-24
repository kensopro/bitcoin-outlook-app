const API_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&price_change_percentage=1h,24h,7d';
const API_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&price_change_percentage=1h,24h,7d';

// Dashboard elements
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
const jumpToLearn = document.getElementById('jump-to-learn');

// Learning lab elements
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
const learnSection = document.getElementById('learn');

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
  if (!priceEl) return;
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
@@ -85,133 +112,461 @@ function updateUI(entry) {
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
  lastUpdatedEl.textContent = `Last updated: ${updatedAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`;

  if (previousPrice !== null) {
    previousEl.textContent = currencyFormatter.format(previousPrice);
    const movement = price > previousPrice ? 'up' : price < previousPrice ? 'down' : 'flat';
    const movementText = movement === 'flat'
      ? 'Price is flat since the last check.'
      : `BTC moved ${movement} since the prior refresh.`;
    const movementText =
      movement === 'flat'
        ? 'Price is flat since the last check.'
        : `BTC moved ${movement} since the prior refresh.`;
    directionEl.textContent = `${movementText} Current 24h change: ${changeEl.textContent}.`;
  }

  previousPrice = price;
  setStatus('Live • Auto-refreshing', '#22c55e');
  setCountdown(15);
}

function applyPercent(element, value) {
  if (!element) return;
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
  if (!statusText || !statusDot) return;
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
  if (!nextRefreshAt || !countdownEl) return;
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
// --- Learning lab interactions ---
const SUPPLY_CAP = 21_000_000;
let supplyAnimationFrame = null;

const supplyNarrative = {
  Genesis: '2009: 50 BTC per block. Digital scarcity begins.',
  'First halving': '2012: Rewards drop to 25 BTC. Supply growth halves.',
  Today: 'Today: 6.25 BTC. Inflation rate keeps shrinking.',
  '2140-ish': 'Around 2140: block subsidy ≈ 0. Fees secure the network.',
};

const priceStory = [
  { era: '2009', value: 0.0008, note: 'Pizza was still a dream.' },
  { era: '2011', value: 1, note: 'Parity with the dollar.' },
  { era: '2013', value: 200, note: 'First big rally and learning loop.' },
  { era: '2017', value: 19000, note: 'The original mania run.' },
  { era: '2020', value: 10000, note: 'Halving meets macro chaos.' },
  { era: '2021', value: 69000, note: 'ATH driven by institutions & memes.' },
  { era: '2022', value: 16000, note: 'Reset. Builders keep building.' },
  { era: '2024', value: 43000, note: 'ETF era. Block subsidy = 3.125 BTC.' },
];

const chapters = [
  {
    label: 'Chapter 1',
    title: 'Why Bitcoin exists',
    blurb: 'Fiat currencies can be inflated at will. Bitcoin hard-codes scarcity and verification.',
    lessons: ['Digital scarcity 101', 'Open-source money', 'Trust minimization'],
  },
  {
    label: 'Chapter 2',
    title: 'How blocks tick',
    blurb: 'Miners assemble transactions, solve puzzles, and anchor new blocks to the longest chain.',
    lessons: ['Proof-of-Work basics', 'Difficulty adjustments', 'Block headers & hashes'],
  },
  {
    label: 'Chapter 3',
    title: 'Halvings & supply',
    blurb: 'Every ~4 years, new issuance halves. The countdown to 21 million is baked in.',
    lessons: ['Reward schedule', 'Security incentives', '2140 endgame'],
  },
  {
    label: 'Chapter 4',
    title: 'Owning bitcoin',
    blurb: 'Not your keys, not your coins. Wallets sign transactions without revealing secrets.',
    lessons: ['Keys & seeds', 'On-chain vs. Lightning', 'Self-custody hygiene'],
  },
  {
    label: 'Chapter 5',
    title: 'Cultural vibes',
    blurb: 'From cypherpunks to ETFs, culture drives adoption and the memes keep shipping.',
    lessons: ['Communities & memes', 'Narratives over time', 'Builders vs. speculators'],
  },
];

const timeline = [
  { year: '2008', title: 'Whitepaper drop', detail: 'Satoshi publishes the blueprint for peer-to-peer cash.' },
  { year: '2009', title: 'Genesis block', detail: 'Block 0: “Chancellor on brink of second bailout for banks.”' },
  { year: '2012', title: 'First halving', detail: 'Reward halves to 25 BTC. Scarcity goes on autopilot.' },
  { year: '2017', title: 'Scaling debates', detail: 'SegWit activates, paving the way for Lightning.' },
  { year: '2021', title: 'Taproot upgrade', detail: 'Better privacy and smart contract flexibility.' },
  { year: '2024', title: 'ETF era', detail: 'Traditional finance meets censorship-resistant rails.' },
];

function animateSupplyCounter() {
  if (!supplyNumber) return;
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

  supplyAnimationFrame = requestAnimationFrame(update);
}

function wireSupplySteps() {
  if (!supplySteps || !stepExplainer) return;
  supplySteps.querySelectorAll('button').forEach((btn) => {
    const updateText = () => {
      const label = btn.dataset.step;
      stepExplainer.textContent = supplyNarrative[label] || 'Scarcity is enforced every block.';
      btn.classList.add('active');
    };

    const reset = () => btn.classList.remove('active');

    btn.addEventListener('mouseenter', updateText);
    btn.addEventListener('focus', updateText);
    btn.addEventListener('mouseleave', reset);
    btn.addEventListener('blur', reset);
  });
}

function renderChart() {
  if (!chartSvg) return;
  const width = 700;
  const height = 280;
  chartSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  chartSvg.innerHTML = '';

  const values = priceStory.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = 36;
  const xStep = (width - padding * 2) / (priceStory.length - 1);

  const points = priceStory.map((point, index) => {
    const x = padding + index * xStep;
    const normalized = (point.value - min) / (max - min);
    const y = height - padding - normalized * (height - padding * 2);
    return { ...point, x, y };
  });

  const pathD = points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
    .join(' ');

  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  gradient.id = 'line-gradient';
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('x2', '100%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('y2', '0%');

  const stopA = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stopA.setAttribute('offset', '0%');
  stopA.setAttribute('stop-color', '#fbbf24');
  gradient.appendChild(stopA);

  const stopB = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stopB.setAttribute('offset', '100%');
  stopB.setAttribute('stop-color', '#22d3ee');
  gradient.appendChild(stopB);

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.appendChild(gradient);
  chartSvg.appendChild(defs);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathD);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'url(#line-gradient)');
  path.setAttribute('stroke-width', '4');
  path.setAttribute('stroke-linecap', 'round');
  chartSvg.appendChild(path);

  points.forEach((point) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    node.setAttribute('cx', point.x);
    node.setAttribute('cy', point.y);
    node.setAttribute('r', '8');
    node.setAttribute('fill', '#0f172a');
    node.setAttribute('stroke', 'url(#line-gradient)');
    node.setAttribute('stroke-width', '3');
    node.classList.add('chart-dot');

    node.addEventListener('mouseenter', () => showTooltip(point));
    node.addEventListener('focus', () => showTooltip(point));

    chartSvg.appendChild(node);
  });

  chartSvg.addEventListener('mouseleave', hideTooltip);
}

function showTooltip(point) {
  if (!chartTooltip || !tooltipEra || !tooltipValue || !chartCaption) return;
  chartTooltip.hidden = false;
  tooltipEra.textContent = point.era;
  tooltipValue.textContent = `$${point.value.toLocaleString('en-US')}`;
  chartCaption.textContent = point.note;

  const left = (point.x / 700) * 100;
  const top = (point.y / 280) * 100;
  chartTooltip.style.left = `${left}%`;
  chartTooltip.style.top = `${top}%`;
}

function hideTooltip() {
  if (!chartTooltip || !chartCaption) return;
  chartTooltip.hidden = true;
  chartCaption.textContent = 'Hover to explore each era.';
}

function renderChapters() {
  if (!chapterList) return;
  chapters.forEach((chapter, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = chapter.title;
    button.dataset.index = index;
    button.className = 'chapter-item';
    button.addEventListener('click', () => loadChapter(index));
    chapterList.appendChild(button);
  });

  loadChapter(0);
}

function loadChapter(index) {
  const chapter = chapters[index];
  if (!chapter || !chapterLabel || !chapterTitle || !chapterBlurb || !lessonPills || !chapterList) return;

  chapterLabel.textContent = chapter.label;
  chapterTitle.textContent = chapter.title;
  chapterBlurb.textContent = chapter.blurb;

  lessonPills.innerHTML = '';
  chapter.lessons.forEach((lesson) => {
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = lesson;
    lessonPills.appendChild(pill);
  });

  chapterList.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.index) === index);
  });

  lessonPills.scrollLeft = 0;
}

function renderTimeline() {
  if (!timelineEvents || !timelineNote) return;
  timelineEvents.innerHTML = '';
  timeline.forEach((event, index) => {
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'timeline-marker';
    marker.dataset.index = index;
    marker.innerHTML = `<span>${event.year}</span>`;

    const label = document.createElement('div');
    label.className = 'timeline-label';
    label.innerHTML = `<strong>${event.title}</strong><p>${event.detail}</p>`;

    const container = document.createElement('div');
    container.className = 'timeline-node';
    container.appendChild(marker);
    container.appendChild(label);

    marker.addEventListener('mouseenter', () => highlightEvent(index));
    marker.addEventListener('focus', () => highlightEvent(index));
    marker.addEventListener('click', () => highlightEvent(index));

    timelineEvents.appendChild(container);
  });

  highlightEvent(0);
}

function highlightEvent(index) {
  if (!timelineEvents || !timelineNote) return;
  timelineEvents.querySelectorAll('.timeline-marker').forEach((marker) => {
    marker.classList.toggle('active', Number(marker.dataset.index) === index);
  });

  timelineEvents.querySelectorAll('.timeline-label').forEach((label, labelIndex) => {
    label.classList.toggle('visible', labelIndex === index);
  });

  const active = timeline[index];
  if (active) {
    timelineNote.textContent = `${active.year}: ${active.detail}`;
  }
}

function cycleChapter(step) {
  if (!chapterList) return;
  const activeIndex = Array.from(chapterList.children).findIndex((btn) => btn.classList.contains('active'));
  const nextIndex = (activeIndex + step + chapters.length) % chapters.length;
  loadChapter(nextIndex);
}

function attachChapterControls() {
  if (prevChapterBtn) {
    prevChapterBtn.addEventListener('click', () => cycleChapter(-1));
  }
  if (nextChapterBtn) {
    nextChapterBtn.addEventListener('click', () => cycleChapter(1));
  }
}

function animateTourCTA() {
  if (startTourBtn && learnSection) {
    startTourBtn.addEventListener('click', () => {
      learnSection.scrollIntoView({ behavior: 'smooth' });
    });
  }
  if (jumpToLearn && learnSection) {
    jumpToLearn.addEventListener('click', () => learnSection.scrollIntoView({ behavior: 'smooth' }));
  }
}

function initLearningLab() {
  animateSupplyCounter();
  wireSupplySteps();
  renderChart();
  renderChapters();
  renderTimeline();
  attachChapterControls();
  animateTourCTA();

  if (replaySupplyBtn) {
    replaySupplyBtn.addEventListener('click', animateSupplyCounter);
  }
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    clearTimeout(timerId);
    fetchPrice();
  });
}

fetchPrice();
fetchPrice();
initLearningLab();