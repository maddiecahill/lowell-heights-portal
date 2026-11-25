const {createMarketingService} = require('../lib/marketing-analytics');
const getMarketingAnalytics = createMarketingService();

module.exports = async function marketingAnalytics(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  const data = await getMarketingAnalytics();
  return req.method === 'HEAD' ? res.status(200).end() : res.status(200).json(data);
};
