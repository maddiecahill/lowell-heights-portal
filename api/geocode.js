/* Geocode newly added competitor addresses after the current verified points.
   Reject Census matches on a different street (e.g. Ave versus Pl). */
module.exports = async function handler(req, res) {
  const address = String(req.query?.address || "").trim();
  if (address.length < 12 || address.length > 220 || !/\bWA\b|Washington/i.test(address)) {
    return res.status(400).json({ error: "A Washington street address is required" });
  }
  try {
    const params = new URLSearchParams({
      address, benchmark: "Public_AR_Current", format: "json"
    });
    const response = await fetch(`https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${params}`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
    const result = await response.json();
    const street = value => String(value).split(",")[0].toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim().split(" ").slice(0, 3).join(" ");
    const match = result.result?.addressMatches?.find(item => street(item.matchedAddress) === street(address));
    const lat = Number(match?.coordinates?.y);
    const lng = Number(match?.coordinates?.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 47.4 || lat > 48.3 || lng < -122.7 || lng > -121.6) {
      return res.status(404).json({ error: "No verified location for this address" });
    }
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({ lat, lng });
  } catch (error) {
    console.error("Competition geocoding error:", error);
    return res.status(502).json({ error: "Location lookup is unavailable" });
  }
};
