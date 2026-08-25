const LP_URL =
  "https://lp-data-syndication-production.s3.amazonaws.com/v1/7dcaf7ae-44ff-46d5-92e5-15e990b91eca/properties.json";

module.exports = async function handler(req, res) {
  try {
    const upstream = await fetch(
      `${LP_URL}?_=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (!upstream.ok) {
      throw new Error(
        `Luxury Presence returned ${upstream.status}`
      );
    }

    const text = await upstream.text();

    res.statusCode = 200;

    res.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "no-store, max-age=0, must-revalidate"
    );

    res.setHeader(
      "CDN-Cache-Control",
      "no-store"
    );

    res.setHeader(
      "Vercel-CDN-Cache-Control",
      "no-store"
    );

    return res.end(text);

  } catch (error) {
    console.error(
      "Lowell Luxury Presence proxy error:",
      error
    );

    res.statusCode = 502;

    res.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "no-store, max-age=0"
    );

    return res.end(
      JSON.stringify({
        error:
          "Unable to load live Luxury Presence listings"
      })
    );
  }
};
