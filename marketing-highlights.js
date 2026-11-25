(function () {
  'use strict';
  const root = document.getElementById('marketing-highlights');
  if (!root) return;
  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  let previous;

  function activate(tab) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      root.querySelector('#' + item.getAttribute('aria-controls')).hidden = !selected;
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : undefined;
      if (next !== undefined) { event.preventDefault(); activate(tabs[next]); tabs[next].focus(); }
    });
  });

  const number = value => Number(value).toLocaleString('en-US');
  const duration = value => {
    const seconds = Math.round(value);
    return seconds < 60 ? seconds + ' sec' : Math.floor(seconds / 60) + ' min ' + (seconds % 60) + ' sec';
  };
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function write(key, value) {
    root.querySelectorAll('[data-metric="' + key + '"]').forEach(node => { node.textContent = value; });
  }
  function date(value) {
    return new Date(value + 'T12:00:00Z').toLocaleDateString('en-US', {timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric'});
  }
  function period(provider) {
    return provider?.dateRange ? 'Cumulative · ' + date(provider.dateRange.startDate) + '–' + date(provider.dateRange.endDate) : 'Cumulative campaign reporting';
  }
  function connection(label, provider) {
    if (!provider?.updatedAt) return label + ': awaiting ' + (provider?.reason === 'reporting_period_required' ? 'reporting start date' : 'connection');
    const time = new Date(provider.updatedAt).toLocaleString('en-US', {timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
    return label + ': ' + (provider.status === 'connected' && provider.mode === 'live' ? 'connected · refreshed ' : 'saved data · updated ') + time + ' PT';
  }
  function render(data) {
    if (!data || typeof data.website !== 'object' || typeof data.ads !== 'object') throw new Error('Invalid report');
    const website = data.website, ads = data.ads, ga4 = website.ga4;
    for (const key of ['impressions', 'reach', 'linkClicks', 'landingPageViews']) {
      const value = ads.metrics?.[key];
      write(key, typeof value === 'number' && Number.isFinite(value) && value >= 0 ? number(value) : '—');
    }
    const hasWebsite = ga4 && Array.isArray(ga4.sources) && Number.isFinite(ga4.totals?.sessions) && Number.isFinite(ga4.totals?.totalUsers);
    write('sessions', hasWebsite ? number(ga4.totals.sessions) : '—');
    write('totalUsers', hasWebsite ? number(ga4.totals.totalUsers) : '—');
    write('websitePeriod', period(website));
    write('adsPeriod', period(ads));
    write('websiteCaption', hasWebsite ? 'Visits starting on the Lowell page' : 'Awaiting website connection');
    write('adsCaption', ads.metrics ? 'Cumulative Lowell campaign totals' : 'Awaiting ad connection');
    const bars = [], rows = [];
    if (hasWebsite && ga4.totals.sessions) for (const source of ga4.sources) {
      const line = element('div', 'lh-source'), label = element('div', 'lh-source-label');
      label.append(element('span', '', source.label), element('span', 'lh-source-value', number(source.sessions)));
      const bar = element('div', 'lh-bar'), fill = element('div', 'lh-fill');
      fill.style.width = Math.min(100, Math.max(0, source.share * 100)) + '%';
      bar.append(fill); line.append(label, bar); bars.push(line);
      const row = element('tr');
      [source.label, number(source.sessions), (source.engagementRate * 100).toFixed(1) + '%', duration(source.averageSessionDuration)].forEach(value => row.append(element('td', '', value)));
      rows.push(row);
    }
    const empty = hasWebsite ? 'No measured landing visits in this period.' : 'Traffic sources will appear when website reporting is connected.';
    if (!bars.length) bars.push(element('p', 'lh-pending', empty));
    if (!rows.length) {
      const row = element('tr'), cell = element('td', 'lh-pending', hasWebsite ? empty : 'Visitor engagement will appear when website reporting is connected.');
      cell.colSpan = 4; row.append(cell); rows.push(row);
    }
    root.querySelector('#lh-source-bars').replaceChildren(...bars);
    root.querySelector('#lh-quality-rows').replaceChildren(...rows);
    write('websiteNote', 'Website visits are sessions starting on Brook & Jill’s Lowell Heights community page. Facebook / Instagram includes paid and organic traffic.' + (ga4?.sourceTotalsDiffer ? ' Google’s estimated source counts may differ slightly from the headline total.' : '') + (ga4?.thresholded ? ' Google privacy thresholds limit some data.' : ''));
    write('connection', connection('Website', website) + '. ' + connection('Ads', ads) + '.');
    root.dataset.websiteStatus = website.mode || 'pending';
    root.dataset.adsStatus = ads.mode || 'pending';
  }
  async function refresh() {
    try {
      const response = await fetch('/api/marketing-analytics', {cache: 'no-store', signal: AbortSignal.timeout(28000)});
      if (!response.ok) throw new Error('Report unavailable');
      const data = await response.json();
      render(data); previous = data;
    } catch (_) {
      root.dataset.websiteStatus = 'unavailable';
      root.dataset.adsStatus = 'unavailable';
      write('connection', previous ? 'Automatic refresh is temporarily unavailable. Showing the last loaded values and their reporting periods.' : 'Website and ad reporting are awaiting connection.');
    } finally {
      setTimeout(refresh, 300000);
    }
  }
  refresh();
})();
