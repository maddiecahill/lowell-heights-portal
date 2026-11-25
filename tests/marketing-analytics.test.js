const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {METRICS, reportRequest, parseReports, parseMeta, dateInZone, createMarketingService} = require('../lib/marketing-analytics');

function report(rows, dimensions = []) {
  return {dimensionHeaders: dimensions.map(name => ({name})), metricHeaders: METRICS.map(name => ({name})), rowCount: rows.length, rows: rows.map(row => ({dimensionValues: dimensions.map(key => ({value: row[key]})), metricValues: METRICS.map(key => ({value: String(row[key])}))}))};
}
const totals = report([{sessions: 9, totalUsers: 6, engagedSessions: 4, engagementRate: 4 / 9, averageSessionDuration: 28}]);
const sources = report([
  {sessionSourceMedium: 'facebook.com / referral', sessions: 9, totalUsers: 6, engagedSessions: 3, engagementRate: 1 / 3, averageSessionDuration: 20},
  {sessionSourceMedium: 'l.instagram.com / referral', sessions: 1, totalUsers: 1, engagedSessions: 1, engagementRate: 1, averageSessionDuration: 100}
], ['sessionSourceMedium']);
const clock = Date.parse('2026-11-24T00:30:00Z');

test('Google requests are cumulative and restricted to Brook & Jill’s Lowell landing page', () => {
  for (const split of [false, true]) {
    const request = reportRequest(split, '2026-10-01', '2026-11-23');
    assert.deepEqual(request.dateRanges, [{startDate: '2026-10-01', endDate: '2026-11-23'}]);
    const filters = request.dimensionFilter.andGroup.expressions.map(item => item.filter);
    assert.deepEqual(filters.map(filter => filter.fieldName), ['hostName', 'landingPage']);
    assert.deepEqual(filters[0].inListFilter.values, ['brookandjillhometeam.com', 'www.brookandjillhometeam.com']);
    assert.deepEqual(filters[1].inListFilter.values, ['/greencity', '/greencity/']);
    assert.equal(/dashboard|firstandmainrealestate|rsvp|spend|cost|revenue/i.test(JSON.stringify(request)), false);
  }
  assert.equal(dateInZone(clock), '2026-11-23');
});

test('source estimates do not replace deduplicated totals; source quality is weighted', () => {
  const data = parseReports(totals, sources);
  assert.equal(data.totals.sessions, 9);
  assert.equal(data.totals.totalUsers, 6);
  assert.equal(data.sourceTotalsDiffer, true);
  assert.equal(data.sources[0].sessions, 10);
  assert.equal(data.sources[0].engagementRate, 0.4);
  assert.equal(data.sources[0].averageSessionDuration, 28);
  assert.equal(data.sources[0].share, 1);
  assert.equal(parseReports(report([]), report([], ['sessionSourceMedium'])).totals.sessions, 0);
  assert.throws(() => parseReports(totals, {...sources, rowCount: 1001}), /incomplete/);
  assert.throws(() => parseReports(totals, report([], ['sessionSourceMedium'])), /incomplete/);
  assert.throws(() => parseReports(report([{sessions: 'bad'}]), sources), /invalid/);
});

test('missing or invalid reporting setup cannot fetch broad data or show placeholder zeros', async () => {
  const fetcher = () => { throw new Error('Unexpected network request'); };
  for (const start of [undefined, '2026-02-31', '2099-01-01']) {
    const data = await createMarketingService({env: {LOWELL_ANALYTICS_START_DATE: start}, fetcher, now: () => clock})();
    assert.equal(data.website.reason, 'reporting_period_required');
    assert.equal(data.ads.reason, 'reporting_period_required');
    assert.equal(data.website.ga4, undefined);
    assert.equal(data.ads.metrics, undefined);
  }
  const data = await createMarketingService({env: {LOWELL_ANALYTICS_START_DATE: '2026-10-01'}, fetcher, now: () => clock})();
  assert.equal(data.website.mode, 'pending');
  assert.equal(data.ads.mode, 'pending');
});

test('Meta requests deduplicate reach across only the chosen Lowell campaigns', async () => {
  let requests = 0;
  const env = {LOWELL_ANALYTICS_START_DATE: '2026-10-01', LOWELL_META_AD_ACCOUNT_ID: 'act_123', LOWELL_META_ACCESS_TOKEN: 'private-meta-token', LOWELL_META_CAMPAIGN_IDS: '456,789,456'};
  const fetcher = async (input, options) => {
    requests++;
    const url = new URL(input);
    assert.equal(url.origin, 'https://graph.facebook.com');
    assert.equal(url.pathname, '/v27.0/act_123/insights');
    assert.equal(url.searchParams.get('level'), 'account');
    assert.deepEqual(JSON.parse(url.searchParams.get('filtering')), [{field: 'campaign.id', operator: 'IN', value: ['456', '789']}]);
    assert.deepEqual(JSON.parse(url.searchParams.get('time_range')), {since: '2026-10-01', until: '2026-11-23'});
    assert.equal(url.searchParams.has('time_increment'), false);
    assert.equal(/private-meta-token|spend|cost|revenue|campaign_name/.test(url.toString()), false);
    assert.equal(options.headers.Authorization, 'Bearer private-meta-token');
    return {ok: true, json: async () => ({data: [{impressions: '100', reach: '65', inline_link_clicks: '12', actions: [{action_type: 'landing_page_view', value: '9'}]}]})};
  };
  const get = createMarketingService({env, fetcher, now: () => clock});
  const [a, b] = await Promise.all([get(), get()]);
  assert.equal(requests, 1);
  assert.deepEqual(a.ads.metrics, {impressions: 100, reach: 65, linkClicks: 12, landingPageViews: 9});
  assert.equal(a.ads.status, 'connected');
  assert.equal(a.website.mode, 'pending');
  assert.deepEqual(a.ads, b.ads);
  assert.equal(JSON.stringify(a).includes('private-meta-token'), false);
  const noCampaigns = await createMarketingService({env: {...env, LOWELL_META_CAMPAIGN_IDS: ''}, fetcher: () => { throw new Error('Unfiltered request'); }, now: () => clock})();
  assert.equal(noCampaigns.ads.reason, 'campaigns_required');
});

test('missing Meta metrics, pagination, and unaggregated reach never become live results', () => {
  assert.deepEqual(parseMeta({data: []}), {impressions: 0, reach: 0, linkClicks: 0, landingPageViews: 0});
  assert.throws(() => parseMeta({data: [{impressions: '100'}]}), /invalid/);
  assert.throws(() => parseMeta({data: [{impressions: '10', reach: '20'}]}), /invalid/);
  assert.throws(() => parseMeta({data: [{}, {}]}), /incomplete/);
  assert.throws(() => parseMeta({data: [], paging: {next: 'more'}}), /incomplete/);
});

test('Google uses read-only authorization, shares refreshes, and preserves dated data after failure', async () => {
  const {privateKey} = crypto.generateKeyPairSync('rsa', {modulusLength: 2048});
  const env = {LOWELL_ANALYTICS_START_DATE: '2026-10-01', LOWELL_GA4_PROPERTY_ID: 'properties/1234', LOWELL_GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({client_email: 'reporter@example.invalid', private_key: privateKey.export({type: 'pkcs8', format: 'pem'})})};
  let now = clock, requests = 0, deny = false;
  const fetcher = async (url, options) => {
    requests++;
    if (url.includes('oauth2')) {
      const claim = JSON.parse(Buffer.from(options.body.get('assertion').split('.')[1], 'base64url').toString());
      assert.equal(claim.scope, 'https://www.googleapis.com/auth/analytics.readonly');
      return {ok: true, json: async () => ({access_token: 'private-google-token', expires_in: 3600})};
    }
    assert.equal(url, 'https://analyticsdata.googleapis.com/v1beta/properties/1234:runReport');
    if (deny) return {ok: false, status: 403, json: async () => ({error: {message: 'Do not disclose private-google-token'}})};
    return {ok: true, json: async () => JSON.parse(options.body).dimensions ? sources : totals};
  };
  const get = createMarketingService({env, fetcher, now: () => now});
  const [first, same] = await Promise.all([get(), get()]);
  assert.equal(requests, 3);
  assert.equal(first.website.status, 'connected');
  assert.deepEqual(first.website, same.website);
  await get();
  assert.equal(requests, 3);
  now += 301000; deny = true;
  const saved = await get();
  assert.equal(saved.website.mode, 'snapshot');
  assert.equal(saved.website.status, 'unavailable');
  assert.equal(saved.website.updatedAt, first.website.updatedAt);
  assert.equal(saved.website.ga4.totals.sessions, 9);
  assert.equal(saved.ads.mode, 'pending');
  assert.equal(JSON.stringify(saved).includes('private-google-token'), false);
  assert.equal(JSON.stringify(saved).includes('PRIVATE KEY'), false);
});
