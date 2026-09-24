const SHEET_PUB =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSc8vL1cAkmtftqD_qWZiUIrBOzool2EmG-3LwDiQD_8-JtQZJ4kZOactTmSWCDUAxQMnNwlHf_991k/pub";

const TAB_GIDS = {
  inventory: "1397988016",
  traffic: "696309813",
  leads: "827444638",
  feedback: "776649459",
  actions: "964868991",
  marketing: "17998325",
  budget: "1146982907",
  competitors: "1788712917"
};

module.exports = async function handler(req, res) {
  try {
    const tab = String(req.query?.tab || "").toLowerCase();
    const gid = TAB_GIDS[tab];

    if (!gid) {
      res.status(400).json({ error: "Invalid tab" });
      return;
    }

    const url =
      `${SHEET_PUB}?gid=${gid}&single=true&output=csv&_=${Date.now()}`;

    const response = await fetch(url, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Google Sheets returned ${response.status}`);
    }

    const csv = await response.text();

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "no-store, max-age=0, must-revalidate"
    );
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");

    res.status(200).send(csv);
  } catch (error) {
    console.error("Lowell sheet proxy error:", error);

    res
      .status(502)
      .json({ error: "Unable to load live dashboard data" });
  }
};
