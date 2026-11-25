const crypto = require('node:crypto');

const HOSTS = ['brookandjillhometeam.com', 'www.brookandjillhometeam.com'];
const LANDING_PATHS = ['/greencity', '/greencity/'];
const METRICS = ['sessions', 'totalUsers', 'engagedSessions', 'engagementRate', 'averageSessionDuration'];
const GROUPS = ['Facebook / Instagram', 'Google organic search', 'Direct', 'Other sources'];
const TIME_ZONE = 'America/Los_Angeles';
const CACHE_MS = 300000;

function dateInZone(timestamp) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(new Date(timestamp)).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function metric(row, key, integer = false) {
  const raw = row[key], value = Number(raw);
  if (!['string', 'number'].includes(typeof raw) || raw === '' || !Number.isFinite(value) || value < 0 || (integer && !Number.isSafeInteger(value))) throw new Error('invalid_metrics');
  return value;
}

function reportRows(report) {
  const dimensions = (report.dimensionHeaders || []).map(h => h.name || h);
  const metrics = (report.metricHeaders || []).map(h => h.name || h);
  if (!Array.isArray(report.rows || [])) throw new Error('invalid_metrics');
  return (report.rows || []).map(row => {
    if (!row.metricValues) return row;
    return Object.fromEntries([
      ...dimensions.map((key, i) => [key, row.dimensionValues?.[i]?.value]),
      ...metrics.map((key, i) => [key, row.metricValues[i]?.value])
    ]);
  });
}

function sourceGroup(value) {
  const [source = '', medium = ''] = String(value).toLowerCase().split(' / ');
  if (/^(fb|ig|facebook|instagram)$/.test(source) || /(^|\.)(facebook|instagram)\.com$/.test(source)) return GROUPS[0];
  if (source === 'google' && medium === 'organic') return GROUPS[1];
  if (source === '(direct)' && medium === '(none)') return GROUPS[2];
  return GROUPS[3];
}

function parseReports(totalsReport, sourcesReport) {
  const totalRows = reportRows(totalsReport), sourceRows = reportRows(sourcesReport);
  if (totalRows.length > 1 || Number(sourcesReport.rowCount || 0) > sourceRows.length) throw new Error('incomplete_report');
  const totalRow = totalRows[0] || Object.fromEntries(METRICS.map(name => [name, 0]));
  const totals = Object.fromEntries(METRICS.map(name => [name, metric(totalRow, name, ['sessions', 'totalUsers', 'engagedSessions'].includes(name))]));
  const groups = new Map(GROUPS.map(label => [label, {label, sessions: 0, engagedSessions: 0, duration: 0}]));
  for (const row of sourceRows) {
    if (typeof row.sessionSourceMedium !== 'string') throw new Error('incomplete_report');
    const group = groups.get(sourceGroup(row.sessionSourceMedium));
    const sessions = metric(row, 'sessions', true), engaged = metric(row, 'engagedSessions', true);
    if (engaged > sessions) throw new Error('invalid_metrics');
    group.sessions += sessions;
    group.engagedSessions += engaged;
    group.duration += metric(row, 'averageSessionDuration') * sessions;
  }
  const sourceSessions = [...groups.values()].reduce((sum, group) => sum + group.sessions, 0);
  if (Boolean(sourceSessions) !== Boolean(totals.sessions) || totals.engagementRate > 1 || totals.engagedSessions > totals.sessions) throw new Error('incomplete_report');
  const sources = [...groups.values()].map(({duration, ...group}) => ({
    ...group,
    share: sourceSessions ? group.sessions / sourceSessions : 0,
    engagementRate: group.sessions ? group.engagedSessions / group.sessions : 0,
    averageSessionDuration: group.sessions ? duration / group.sessions : 0
  }));
  return {totals, sources, sourceTotalsDiffer: sourceSessions !== totals.sessions, thresholded: Boolean(totalsReport.metadata?.subjectToThresholding || sourcesReport.metadata?.subjectToThresholding)};
}

function reportRequest(withSources, startDate, endDate) {
  return {
    dateRanges: [{startDate, endDate}],
    ...(withSources ? {dimensions: [{name: 'sessionSourceMedium'}]} : {}),
    metrics: METRICS.map(name => ({name})),
    dimensionFilter: {andGroup: {expressions: [
      {filter: {fieldName: 'hostName', inListFilter: {values: HOSTS, caseSensitive: false}}},
      {filter: {fieldName: 'landingPage', inListFilter: {values: LANDING_PATHS, caseSensitive: false}}}
    ]}},
    limit: withSources ? 1000 : 1
  };
}

function parseMeta(report) {
  if (!Array.isArray(report.data) || report.data.length > 1 || report.paging?.next) throw new Error('incomplete_report');
  if (!report.data.length) return {impressions: 0, reach: 0, linkClicks: 0, landingPageViews: 0};
  const row = report.data[0];
  const actions = row.actions || [];
  if (!Array.isArray(actions)) throw new Error('invalid_metrics');
  const landing = actions.filter(action => action.action_type === 'landing_page_view');
  if (landing.length > 1) throw new Error('incomplete_report');
  const values = {
    impressions: metric(row, 'impressions', true),
    reach: metric(row, 'reach', true),
    linkClicks: row.inline_link_clicks == null ? 0 : metric(row, 'inline_link_clicks', true),
    landingPageViews: landing.length ? metric(landing[0], 'value', true) : 0
  };
  if (values.reach > values.impressions) throw new Error('invalid_metrics');
  return values;
}

function createMarketingService({env = process.env, fetcher = fetch, now = Date.now} = {}) {
  let tokenCache;
  async function json(url, options, provider) {
    const response = await fetcher(url, {...options, signal: AbortSignal.timeout(10000)});
    const body = await response.json();
    if (!response.ok || body.error) {
      const error = new Error(response.status === 401 || response.status === 403 ? 'access_required' : 'refresh_failed');
      // Never return upstream error bodies, tokens, or credential values.
      error.provider = provider;
      throw error;
    }
    return body;
  }
  async function googleToken() {
    if (tokenCache && tokenCache.expires > now() + 60000) return tokenCache.value;
    const key = JSON.parse(env.LOWELL_GOOGLE_SERVICE_ACCOUNT_JSON);
    if (!key.client_email || !key.private_key) throw new Error('access_required');
    const iat = Math.floor(now() / 1000);
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const claim = encode({alg: 'RS256', typ: 'JWT'}) + '.' + encode({iss: key.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600});
    const assertion = claim + '.' + crypto.sign('RSA-SHA256', Buffer.from(claim), key.private_key).toString('base64url');
    const result = await json('https://oauth2.googleapis.com/token', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion})}, 'ga4');
    if (!result.access_token || !Number.isFinite(Number(result.expires_in))) throw new Error('access_required');
    tokenCache = {value: result.access_token, expires: now() + Number(result.expires_in) * 1000};
    return tokenCache.value;
  }
  function range() {
    const startDate = env.LOWELL_ANALYTICS_START_DATE, endDate = dateInZone(now());
    if (!validDate(startDate) || startDate > endDate) throw new Error('reporting_period_required');
    return {startDate, endDate, timeZone: TIME_ZONE};
  }
  function provider(refresh, configured) {
    let lastGood, active, nextRetry = 0, lastError;
    function unavailable(reason) {
      return lastGood ? {...lastGood, status: 'unavailable', mode: 'snapshot', reason} : {status: 'unavailable', mode: 'pending', updatedAt: null, reason};
    }
    return async () => {
      let dateRange;
      try { dateRange = range(); } catch (error) { return unavailable(error.message); }
      if (!configured()) return unavailable('access_required');
      if (lastGood && lastGood.dateRange.startDate === dateRange.startDate && lastGood.dateRange.endDate === dateRange.endDate && now() - Date.parse(lastGood.updatedAt) < CACHE_MS) return lastGood;
      if (now() < nextRetry) return unavailable(lastError);
      if (!active) active = (async () => {
        try {
          const data = await refresh(dateRange);
          lastGood = {status: 'connected', mode: 'live', updatedAt: new Date(now()).toISOString(), dateRange, ...data};
          nextRetry = 0;
          return lastGood;
        } catch (error) {
          const reasons = ['access_required', 'reporting_period_required', 'campaigns_required', 'invalid_configuration', 'incomplete_report', 'invalid_metrics'];
          lastError = reasons.includes(error.message) ? error.message : 'refresh_failed';
          nextRetry = now() + 60000;
          return unavailable(lastError);
        } finally { active = null; }
      })();
      return active;
    };
  }
  const google = provider(async ({startDate, endDate}) => {
    const property = String(env.LOWELL_GA4_PROPERTY_ID).replace(/^properties\//, '');
    if (!/^\d+$/.test(property)) throw new Error('invalid_configuration');
    const access = await googleToken();
    const reports = await Promise.all([false, true].map(withSources => json(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {method: 'POST', headers: {Authorization: `Bearer ${access}`, 'Content-Type': 'application/json'}, body: JSON.stringify(reportRequest(withSources, startDate, endDate))}, 'ga4')));
    return {ga4: parseReports(...reports)};
  }, () => Boolean(env.LOWELL_GA4_PROPERTY_ID && env.LOWELL_GOOGLE_SERVICE_ACCOUNT_JSON));
  const meta = provider(async ({startDate, endDate}) => {
    const account = String(env.LOWELL_META_AD_ACCOUNT_ID).replace(/^act_/, '');
    const campaigns = [...new Set(String(env.LOWELL_META_CAMPAIGN_IDS || '').split(',').map(value => value.trim()).filter(Boolean))];
    if (!campaigns.length) throw new Error('campaigns_required');
    const version = env.LOWELL_META_API_VERSION || 'v27.0';
    if (!/^\d+$/.test(account) || campaigns.some(id => !/^\d+$/.test(id)) || !/^v\d+\.\d+$/.test(version)) throw new Error('invalid_configuration');
    const url = new URL(`https://graph.facebook.com/${version}/act_${account}/insights`);
    url.searchParams.set('fields', 'impressions,reach,inline_link_clicks,actions');
    url.searchParams.set('level', 'account');
    url.searchParams.set('time_range', JSON.stringify({since: startDate, until: endDate}));
    url.searchParams.set('filtering', JSON.stringify([{field: 'campaign.id', operator: 'IN', value: campaigns}]));
    url.searchParams.set('limit', '1');
    // One account-level report deduplicates reach across all included campaigns.
    const report = await json(url.toString(), {headers: {Authorization: `Bearer ${env.LOWELL_META_ACCESS_TOKEN}`}}, 'meta');
    return {metrics: parseMeta(report)};
  }, () => Boolean(env.LOWELL_META_AD_ACCOUNT_ID && env.LOWELL_META_ACCESS_TOKEN));
  return async () => {
    const [website, ads] = await Promise.all([google(), meta()]);
    return {website, ads};
  };
}

module.exports = {HOSTS, LANDING_PATHS, METRICS, TIME_ZONE, dateInZone, reportRequest, parseReports, parseMeta, createMarketingService};
