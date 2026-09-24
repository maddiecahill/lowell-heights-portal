(() => {
  "use strict";

  const APP_NAME = "LowellHeightsWeeklyOps-679732813";
  const ACTION_TABLE = "Action Items";
  const APP_URL = "https://www.appsheet.com/start/2cb19058-9b48-47c5-abc0-77f497b531b6";
  const ACTION_PHOTO_COPIES = {
    "ac-e4bb6537.photo link.014308.jpg": "/action-photos/gap-between-fence-and-wall.jpg",
    "ac-3697d845.photo link.215152.jpg": "/action-photos/roof-update.jpg"
  };
  // Photos are from the named community's builder page or a matching property listing.
  // A Photo URL in the live sheet overrides these selections.
  const COMPETITION_PHOTOS = {
    "greenview heights": ["https://b3630071.assetcdn.net/2.0/3630071/wp-content/uploads/2026/03/03_CH-Greenview-Heights-EN-Dusk-Rev_TH-Bldg-9_CS-03-1-768x384.jpg", "https://www.connerhomes.com/project/greenview-heights/", "Conner Homes rendering"],
    "tambark 15": ["https://wpadmin.msrcommunities.com/wp-content/uploads/2025/10/kitchen-3.webp", "https://www.msrcommunities.com/property/tambark15", "MSR Communities"],
    "gordon homes - single family": ["https://listing-images.mainview.com/2549424/85b63b46f2c681bae555911d0d764964-960w.webp", "https://www.wicklundre.com/listing/5577537/2223-124th-St-Se-St-SE-Everett-WA-98208", "Property listing"],
    "ambleside - single family": ["https://www.kbhome.com/globalassets/images/community-images/washington/seattle-tacoma-area/silver-lakes-ambleside/hero/silver-lakes-ambleside-streetscene_web.jpg?preset=large", "https://www.kbhome.com/new-homes-seattle-tacoma-area/silver-lakes-ambleside", "KB Home rendering"],
    "fern at lockwood": ["https://cdn.lennar.com/api/images/contentassets/47a692bd33b3476f8f62771d7d33e229/sea_1611_pic_fern_great_1of2_f2_base2.jpg?d=20260423T171114&w=738", "https://www.lennar.com/new-homes/washington/seattle/everett/lockwood-lane-townhomes/fern/65170510017", "Lennar"],
    "snohomish gardens": ["https://cdn.lennar.com/api/images/contentassets/917206b1d3ba45f5b3dd6c314a7d6af6/sea_horizon_snohomishgardens_pic_gardenia_exterior_3of3.jpg?d=20260804T174943&w=738", "https://www.lennar.com/new-homes/washington/seattle/snohomish/snohomish-garden-townhomes", "Lennar"],
    "moray village": ["https://www.westcotthomes.com/wp-content/uploads/2026/01/Moray-at-Maltby-Village-Kitchen-1.jpg", "https://www.westcotthomes.com/moray-at-maltby-village/", "Westcott Homes"],
    "elmbrook": ["https://mainvuecdn.azureedge.net/prod/washington/images/tourmodels/elm/model-list/willow.webp?ver=7", "https://www.mainvuehomes.com/wa/elmbrook-display-homes", "MainVue Homes"],
    "4 new construction homes in silver lake": ["https://m.cbhomes.com/p/277/2585943/c40b404ed960421/original.webp", "https://www.coldwellbankerhomes.com/wa/everett/1414-126th-street-se-b/pid_73867319/", "Property listing"]
  };
  const BUDGET_CATEGORIES = [
    "Social Media",
    "Events",
    "Digital Ad Spend",
    "Grand Opening",
    "COF Campaigns",
    "Local Business Pop-Ups",
    "Print, Mailers & Signage",
    "Other"
  ];
  const state = {
    budget: [],
    competitors: [],
    marketing: [],
    calendarDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  };

  const hasText = value => value !== undefined && value !== null && String(value).trim() !== "";

  const esc = value => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  function parseNumber(value) {
    if (!hasText(value)) return 0;
    const raw = String(value).trim();
    const negative = /^\(.*\)$/.test(raw);
    const number = Number(raw.replace(/[$,%()\s,]/g, ""));
    if (!Number.isFinite(number)) return 0;
    return negative ? -number : number;
  }

  function currency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function parseDate(value) {
    if (!hasText(value)) return null;
    const text = String(value).trim();
    let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (match) {
      let year = Number(match[3]);
      if (year < 100) year += 2000;
      return new Date(year, Number(match[1]) - 1, Number(match[2]), 12);
    }
    match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function dateLabel(value, options = { month: "short", day: "numeric" }) {
    const date = value instanceof Date ? value : parseDate(value);
    return date ? date.toLocaleDateString("en-US", options) : "—";
  }

  function statusClass(value) {
    return String(value || "pending").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
  }

  function filterForPeriod(rows, field) {
    try {
      if (typeof LH_filterByDate === "function") return LH_filterByDate(rows || [], field);
    } catch (_) {}
    return rows || [];
  }

  function renderBudget(rows) {
    const clean = (rows || []).filter(row => {
      const values = Object.values(row).map(value => String(value || "").trim().toLowerCase());
      return !values.includes("example") && (hasText(row["Budget ID"]) || hasText(row["Approved Amount"]) || hasText(row["Paid Amount"]));
    });
    state.budget = clean;

    const total = clean.reduce((sum, row) => sum + parseNumber(row["Approved Amount"]), 0);
    const spent = clean.reduce((sum, row) => sum + parseNumber(row["Paid Amount"]), 0);
    const remaining = total - spent;
    const percent = total > 0 ? Math.max(0, Math.min(100, (spent / total) * 100)) : 0;

    document.getElementById("budgetTotal").textContent = currency(total);
    document.getElementById("budgetSpent").textContent = currency(spent);
    document.getElementById("budgetRemaining").textContent = currency(remaining);
    document.getElementById("budgetProgressBar").style.width = `${percent}%`;

    const categoryLookup = new Map(BUDGET_CATEGORIES.map(category => [category.toLowerCase(), category]));
    const categoryTotals = new Map(BUDGET_CATEGORIES.map(category => [category, { approved: 0, spent: 0 }]));
    clean.forEach(row => {
      const category = categoryLookup.get(String(row["Category"] || "").trim().toLowerCase()) || "Other";
      const totals = categoryTotals.get(category);
      totals.approved += parseNumber(row["Approved Amount"]);
      totals.spent += parseNumber(row["Paid Amount"]);
    });

    const breakdown = document.getElementById("budgetBreakdown");
    if (breakdown) {
      breakdown.innerHTML = BUDGET_CATEGORIES.map(category => {
        const totals = categoryTotals.get(category);
        const categoryPercent = totals.approved > 0
          ? Math.max(0, Math.min(100, (totals.spent / totals.approved) * 100))
          : 0;
        return `
          <article class="budget-category-card">
            <div class="budget-category-copy">
              <span>${esc(category)}</span>
              <strong>${esc(currency(totals.spent))}<small> / ${esc(currency(totals.approved))}</small></strong>
            </div>
            <div class="budget-category-bar" aria-label="${esc(category)} ${Math.round(categoryPercent)}% spent">
              <span style="width:${categoryPercent}%"></span>
            </div>
          </article>`;
      }).join("");
    }

  }

  function priceRange(row) {
    if (hasText(row["Floor Plan with Price Point"])) return row["Floor Plan with Price Point"];
    const low = row["Price Range Low"];
    const high = row["Price Range High"];
    if (hasText(low) && hasText(high)) return `${low} – ${high}`;
    return low || high || "Not entered";
  }

  function externalUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch (_) { return ""; }
  }

  function competitionPhoto(row) {
    const override = externalUrl(row["Photo URL"] || row["Image URL"]);
    if (override.startsWith("https://")) {
      return [override, externalUrl(row["Photo Source URL"]) || externalUrl(row["Source URL"]), "Community photo"];
    }
    return COMPETITION_PHOTOS[String(row["Community Name"] || "").trim().toLowerCase()];
  }

  function updateCompetitionSlider() {
    const track = document.getElementById("competitionGrid");
    const previous = document.getElementById("competitionPrev");
    const next = document.getElementById("competitionNext");
    const count = document.getElementById("competitionSlideCount");
    if (!track || !previous || !next || !count) return;
    const cards = [...track.querySelectorAll(".competition-card")];
    const frame = track.getBoundingClientRect();
    const start = cards.findIndex(card => card.getBoundingClientRect().right > frame.left + 8);
    const visible = cards.filter(card => {
      const edge = card.getBoundingClientRect();
      return edge.left >= frame.left - 8 && edge.right <= frame.right + 8;
    }).length;
    count.textContent = cards.length ? `${Math.max(start, 0) + 1}–${Math.min(cards.length, Math.max(start, 0) + Math.max(visible, 1))} of ${cards.length}` : "";
    previous.disabled = track.scrollLeft < 8;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
  }

  function setupCompetitionSlider() {
    const track = document.getElementById("competitionGrid");
    if (!track) return;
    const move = direction => {
      const card = track.querySelector(".competition-card");
      if (!card) return;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
    };
    document.getElementById("competitionPrev")?.addEventListener("click", () => move(-1));
    document.getElementById("competitionNext")?.addEventListener("click", () => move(1));
    track.addEventListener("scroll", updateCompetitionSlider, { passive: true });
    track.addEventListener("error", event => {
      if (event.target.matches(".competition-photo img")) event.target.closest(".competition-photo")?.classList.add("photo-unavailable");
    }, true);
    window.addEventListener("resize", updateCompetitionSlider);
  }

  function renderCompetition(rows) {
    const container = document.getElementById("competitionGrid");
    if (!container) return;

    const clean = (rows || []).filter(row => {
      const name = String(row["Community Name"] || "").trim();
      return name && !/^example$/i.test(name) && !/^lowell heights$/i.test(name);
    });
    state.competitors = clean;

    if (!clean.length) {
      container.innerHTML = '<div class="empty-state">No competitor snapshots have been entered yet.</div>';
      updateCompetitionSlider();
      window.LowellCompetitionMap?.update([]);
      return;
    }

    container.innerHTML = clean.map((row, index) => {
      const incentive = row["Current Incentive"] || row["Financing Incentive"] || row["Primary Incentive"] || "Not entered";
      const notes = row["Notes"] || "No general notes yet.";
      const weeklyTraffic = row["Weekly Traffic"] || "Not entered";
      const address = String(row["Community Address"] || "").trim();
      const source = externalUrl(row["Source URL"]);
      const destination = source || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "");
      const photo = competitionPhoto(row);
      return `
        <article class="competition-card" data-competition-index="${index}">
          <div class="competition-photo${photo ? "" : " photo-unavailable"}">
            ${photo ? `<img src="${esc(photo[0])}" alt="${esc(row["Community Name"])} community" loading="lazy">` : ""}
            <span class="competition-photo-fallback">Photo coming soon</span>
            ${photo?.[1] ? `<a class="competition-photo-credit" href="${esc(photo[1])}" target="_blank" rel="noopener noreferrer">${esc(photo[2])} ↗</a>` : ""}
          </div>
          <div class="competition-card-body">
          <div class="competition-head">
            <div>
              <h3>${esc(row["Community Name"])}</h3>
              <p>${esc(row["Builder"] || "Builder not entered")}${hasText(row["City"]) ? ` · ${esc(row["City"])}` : ""}</p>
            </div>
            <span class="panel-count">Updated ${esc(dateLabel(row["Snapshot Date"]))}</span>
          </div>
          <div class="competition-stats">
            <div class="competition-stat"><small>Active</small><strong>${esc(row["Available Inventory"] || "0")}</strong></div>
            <div class="competition-stat"><small>Pending</small><strong>${esc(row["Pending"] || "0")}</strong></div>
            <div class="competition-stat"><small>Sold</small><strong>${esc(row["Units Sold"] || "0")}</strong></div>
          </div>
          <div class="competition-details">
            <div class="competition-detail"><small>Floor plan + price point</small>${esc(priceRange(row))}</div>
            <div class="competition-detail"><small>Current incentive</small>${esc(incentive)}</div>
          </div>
          <details class="competition-more">
            <summary>Full snapshot</summary>
            <div class="competition-detail"><small>Weekly traffic</small>${esc(weeklyTraffic)}</div>
            <div class="competition-detail"><small>Comments / general notes</small>${esc(notes)}</div>
          </details>
          <div class="competition-card-actions">
            <span class="competition-address">${address ? esc(address) : "Address needed to place on map"}</span>
            <div>
              ${address ? `<button type="button" class="competition-locate" data-competition-index="${index}" aria-label="Show ${esc(row["Community Name"])} on map">Show on map</button>` : ""}
              ${destination ? `<a href="${esc(destination)}" target="_blank" rel="noopener noreferrer">${source ? "View listing ↗" : "View location ↗"}</a>` : ""}
            </div>
          </div>
          </div>
        </article>`;
    }).join("");
    container.scrollLeft = 0;
    window.requestAnimationFrame(updateCompetitionSlider);
    window.LowellCompetitionMap?.update(clean);
  }

  function mergeFeedback(formalRows, trafficRows) {
    const formal = (formalRows || []).map(row => ({ ...row }));
    const byTrafficId = new Map();
    formal.forEach((row, index) => {
      if (hasText(row["Traffic ID"])) byTrafficId.set(String(row["Traffic ID"]).trim(), index);
    });

    (trafficRows || []).filter(row => hasText(row["Notes"])).forEach((row, index) => {
      const trafficId = String(row["Traffic ID"] || "").trim();
      const existingIndex = trafficId ? byTrafficId.get(trafficId) : undefined;
      const name = row["Event or Agent Name"] || row["Traffic Type"] || "Buyer showing";
      if (existingIndex !== undefined) {
        const target = formal[existingIndex];
        const notes = String(row["Notes"] || "").trim();
        const detail = String(target["Feedback Detail"] || "").trim();
        if (notes && !detail.includes(notes)) target["Feedback Detail"] = detail ? `${detail} — ${notes}` : `${name} — ${notes}`;
        if (!hasText(target["Level of Interest"])) target["Level of Interest"] = row["Level of Interest"] || "";
        if (!hasText(target["Buyer or Visitor Type"])) target["Buyer or Visitor Type"] = row["Buyer Type"] || row["Traffic Type"] || "Showing";
        return;
      }
      formal.push({
        "Feedback Date": row["Activity Date"] || "",
        "Feedback ID": `SHOWING-${trafficId || index}`,
        "Unit ID": row["Unit ID"] || "",
        "Traffic ID": trafficId,
        "Feedback Category": row["Traffic Type"] || "Buyer Showing",
        "Sentiment": "Showing Note",
        "Feedback Detail": `${name} — ${row["Notes"]}`,
        "Buyer or Visitor Type": row["Buyer Type"] || row["Traffic Type"] || "Showing",
        "Level of Interest": row["Level of Interest"] || ""
      });
    });

    return formal.sort((a, b) => (parseDate(b["Feedback Date"]) || 0) - (parseDate(a["Feedback Date"]) || 0));
  }

  function renderFeedback(rows) {
    const card = document.getElementById("feedbackList");
    const count = document.getElementById("feedbackCount");
    if (!card) return;
    if (count) count.textContent = `${rows.length} note${rows.length === 1 ? "" : "s"}`;

    if (!rows.length) {
      card.innerHTML = '<div class="empty-state">No buyer feedback in this reporting period.</div>';
      return;
    }

    card.innerHTML = rows.map(row => {
      const sentiment = row["Sentiment"] || "Note";
      const sentimentKey = String(sentiment).toLowerCase();
      const sentimentStyle = sentimentKey === "positive" ? "positive" : (sentimentKey === "negative" || sentimentKey === "concern") ? "concern" : "mixed";
      const interest = row["Level of Interest"] || "";
      const meta = [row["Buyer or Visitor Type"], row["Unit ID"] && `Unit ${row["Unit ID"]}`].filter(Boolean).join(" · ");
      return `
        <div class="quote">
          <div class="quote-type">
            <span class="sentiment ${sentimentStyle}">${esc(sentiment)}</span>
            ${interest ? `<span class="interest-pill interest-${statusClass(interest)}">${esc(interest)} interest</span>` : ""}
          </div>
          <q>${esc(row["Feedback Detail"] || "—")}</q>
          <div class="quote-date">${esc(dateLabel(row["Feedback Date"]))}${meta ? ` · ${esc(meta)}` : ""}</div>
        </div>`;
    }).join("");
  }

  function renderLeads(rows) {
    const list = document.getElementById("leadList");
    const count = document.getElementById("leadCount");
    if (!list) return;
    if (count) count.textContent = `${rows.length} lead${rows.length === 1 ? "" : "s"}`;

    if (!rows.length) {
      list.innerHTML = '<div class="empty-state">No leads in this reporting period.</div>';
      return;
    }

    list.innerHTML = rows
      .slice()
      .sort((a, b) => (parseDate(b["Lead Date"]) || 0) - (parseDate(a["Lead Date"]) || 0))
      .map(row => {
        const name = [row["First Name"], row["Last Name"]].filter(Boolean).join(" ") || row["Lead ID"] || "Unnamed lead";
        const contact = [row["Email"], row["Phone"]].filter(Boolean).join(" · ") || "Not entered";
        return `
          <div class="lead-row">
            <div><small>Date / name</small><div class="lead-name">${esc(name)}</div><span>${esc(dateLabel(row["Lead Date"]))}</span></div>
            <div><small>Contact info</small><span>${esc(contact)}</span></div>
            <div><small>Lead source</small><span>${esc(row["Lead Source"] || "Not entered")}</span></div>
            <div><small>Last contact</small><span>${esc(dateLabel(row["Last Contact Date"]))}</span></div>
            ${hasText(row["Notes"]) ? `<div class="lead-notes"><small>Notes</small>${esc(row["Notes"])}</div>` : ""}
          </div>`;
      }).join("");
  }

  function renderActivity() {
    try {
      if (typeof LH_reportingData === "undefined" || !LH_reportingData || !LH_reportingData.ready) return;
      const traffic = filterForPeriod(LH_reportingData.traffic, "Activity Date");
      const feedback = filterForPeriod(LH_reportingData.feedback, "Feedback Date");
      const leads = filterForPeriod(LH_reportingData.leads, "Lead Date");
      const merged = mergeFeedback(feedback, traffic);
      renderFeedback(merged);
      renderLeads(leads);

      const metrics = document.querySelectorAll(".metric");
      if (metrics[3]) {
        const value = metrics[3].querySelector(".metric-value");
        const sub = metrics[3].querySelector(".metric-sub");
        if (value) value.textContent = merged.length;
        if (sub) sub.textContent = `${feedback.length} formal · ${traffic.filter(row => hasText(row["Notes"])).length} showing notes`;
      }
    } catch (error) {
      console.warn("Unable to render combined activity", error);
    }
  }

  function actionPhotoUrl(value) {
    if (!hasText(value)) return "";
    const file = String(value).trim();
    const fileName = file.split(/[\\/]/).pop().split("?")[0].toLowerCase();
    if (ACTION_PHOTO_COPIES[fileName]) return ACTION_PHOTO_COPIES[fileName];
    if (/^https?:\/\//i.test(file)) return file;
    const params = new URLSearchParams({ appName: APP_NAME, tableName: ACTION_TABLE, fileName: file });
    return `https://www.appsheet.com/template/gettablefileurl?${params.toString()}`;
  }

  function renderActions(actions) {
    const list = document.querySelector(".action-list");
    if (!list) return;
    const rows = (actions || []).filter(row => hasText(row["Action ID"]) || hasText(row["Description"]));
    const order = { pending: 0, "in progress": 1, closed: 2 };
    rows.sort((a, b) => {
      const aStatus = String(a["Status"] || "Pending").toLowerCase();
      const bStatus = String(b["Status"] || "Pending").toLowerCase();
      return (order[aStatus] ?? 3) - (order[bStatus] ?? 3) || (parseDate(a["Due Date"]) || Infinity) - (parseDate(b["Due Date"]) || Infinity);
    });

    const open = rows.filter(row => !["closed", "completed", "complete", "done"].includes(String(row["Status"] || "").toLowerCase())).length;
    const high = rows.filter(row => String(row["Priority"] || "").toLowerCase() === "high" && !["closed", "completed", "complete", "done"].includes(String(row["Status"] || "").toLowerCase())).length;
    const summary = document.querySelector("#actions .section-head p");
    if (summary) summary.textContent = `${open} open · ${high} high priority`;
    const actionMetric = document.querySelectorAll(".metric")[4];
    if (actionMetric) {
      const value = actionMetric.querySelector(".metric-value");
      const sub = actionMetric.querySelector(".metric-sub");
      if (value) value.textContent = open;
      if (sub) sub.textContent = high ? `${high} high priority` : (open ? "Open items" : "None open");
    }

    if (!rows.length) {
      list.innerHTML = '<div class="empty-state">No action items logged.</div>';
      return;
    }

    const header = `
      <div class="action-row action-header">
        <span>Action item</span><span>FAM owner</span><span>Green City</span><span>Due</span><span>Status</span><span>Priority</span><span>Photo</span>
      </div>`;
    list.innerHTML = header + rows.map(row => {
      const title = row["Description"] || row["Action ID"] || "Action";
      const context = [row["Category"], row["Unit ID or Location"]].filter(Boolean).join(" · ");
      const status = row["Status"] || "Pending";
      const priority = row["Priority"] || "Medium";
      const photo = row["Photo Link"] || "";
      const photoUrl = actionPhotoUrl(photo);
      return `
        <div class="action-row">
          <strong class="action-title">${esc(title)}${context ? `<small>${esc(context)}</small>` : ""}</strong>
          <span>${esc(row["Owner"] || "—")}</span>
          <span>${esc(row["Green City Owner"] || "—")}</span>
          <span>${esc(dateLabel(row["Due Date"]))}</span>
          <span class="status-pill status-${statusClass(status)}">${esc(status)}</span>
          <span class="priority ${String(priority).toLowerCase() === "high" ? "high" : "medium"}">${esc(priority)}</span>
          <button type="button" class="photo-button${photo ? " has-photo" : ""}" data-action-photo="${esc(photo)}" data-action-title="${esc(title)}" aria-label="${photo ? `Enlarge photo for ${esc(title)}` : `No photo for ${esc(title)}`}" ${photo ? "" : "disabled"}>
            ${photo ? `<img src="${esc(photoUrl)}" alt="" loading="lazy"><span class="photo-expand" aria-hidden="true">↗</span>` : '<span class="photo-empty" aria-hidden="true">—</span>'}
          </button>
        </div>`;
    }).join("");
  }

  window.LH_renderModernActions = renderActions;

  function renderMarketingPriority(rows) {
    const container = document.getElementById("marketingPriority");
    if (!container) return;
    const priorityRows = (rows || [])
      .filter(row => ["active", "in progress"].includes(String(row["Status"] || "").toLowerCase()))
      .sort((a, b) => (parseDate(a["Activity Date"]) || Infinity) - (parseDate(b["Activity Date"]) || Infinity));

    if (!priorityRows.length) {
      container.innerHTML = '<div class="empty-state">No Active or In Progress marketing items right now.</div>';
      return;
    }

    container.innerHTML = priorityRows.map(row => {
      const name = row["Campaign or Activity"] || row["Marketing Type"] || "Marketing activity";
      const status = row["Status"] || "Active";
      const meta = [row["Marketing Type"], row["Channel"], dateLabel(row["Activity Date"])].filter(value => hasText(value) && value !== "—").join(" · ");
      return `
        <article class="marketing-priority-card">
          <span class="status-pill status-${statusClass(status)}">${esc(status)}</span>
          <h3>${esc(name)}</h3>
          <p>${esc(meta || row["Goal"] || "Marketing Roadmap")}</p>
        </article>`;
    }).join("");
  }

  function sameDay(a, b) {
    return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function renderCalendar() {
    const container = document.getElementById("marketingCalendar");
    const title = document.getElementById("calendarMonth");
    if (!container || !title) return;

    const month = state.calendarDate.getMonth();
    const year = state.calendarDate.getFullYear();
    title.textContent = state.calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const first = new Date(year, month, 1, 12);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay());
    const today = new Date();
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const pieces = weekdays.map(day => `<div class="calendar-weekday">${day}</div>`);

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const events = state.marketing.filter(row => sameDay(parseDate(row["Activity Date"]), date));
      pieces.push(`
        <div class="calendar-day ${date.getMonth() === month ? "" : "is-outside"} ${sameDay(date, today) ? "is-today" : ""}">
          <span class="calendar-date">${date.getDate()}</span>
          ${events.map(row => {
            const status = row["Status"] || "Planned";
            const name = row["Campaign or Activity"] || row["Marketing Type"] || "Marketing";
            return `<span class="calendar-event status-${statusClass(status)}" title="${esc(status)} · ${esc(name)}">${esc(name)}</span>`;
          }).join("")}
        </div>`);
    }
    container.innerHTML = pieces.join("");
  }

  function updateMarketingMetric() {
    const count = state.marketing.filter(row => ["active", "in progress"].includes(String(row["Status"] || "").toLowerCase())).length;
    const metric = document.querySelectorAll(".metric")[5];
    if (!metric) return;
    const value = metric.querySelector(".metric-value");
    const sub = metric.querySelector(".metric-sub");
    if (value) value.textContent = count;
    if (sub) sub.textContent = count ? "Active or in progress" : "No active items";
  }

  function renderMarketing(rows) {
    state.marketing = (rows || []).filter(row => hasText(row["Marketing ID"]) || hasText(row["Campaign or Activity"]) || hasText(row["Marketing Type"]));
    const sub = document.querySelector("#marketing .section-head p");
    if (sub) sub.textContent = `${state.marketing.length} item${state.marketing.length === 1 ? "" : "s"} from Marketing Roadmap`;
    renderMarketingPriority(state.marketing);
    renderCalendar();
    updateMarketingMetric();
  }

  function openActionPhoto(file, title) {
    const modal = document.getElementById("actionImageModal");
    const heading = document.getElementById("actionImageTitle");
    const stage = document.getElementById("actionImageStage");
    if (!modal || !stage || !file) return;
    if (heading) heading.textContent = title || "Action item photo";
    stage.innerHTML = '<div class="image-error">Loading photo…</div>';
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    modal.scrollTop = 0;
    modal.querySelector(".image-modal-card")?.scrollTo(0, 0);
    document.documentElement.classList.add("action-photo-open");
    document.body.classList.add("action-photo-open");

    const image = new Image();
    image.alt = title || "Action item photo";
    image.onload = () => {
      stage.innerHTML = "";
      stage.appendChild(image);
    };
    image.onerror = () => {
      stage.innerHTML = `<div class="image-error">This AppSheet photo could not be loaded in the portal.<br><br><a class="text-link" href="${APP_URL}" target="_blank" rel="noopener">Open AppSheet to view it ↗</a></div>`;
    };
    image.src = actionPhotoUrl(file);
  }

  function closeActionPhoto() {
    const modal = document.getElementById("actionImageModal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("action-photo-open");
    document.body.classList.remove("action-photo-open");
  }

  function setupModal() {
    document.addEventListener("click", event => {
      const trigger = event.target.closest("[data-action-photo]");
      if (trigger && !trigger.disabled) openActionPhoto(trigger.dataset.actionPhoto, trigger.dataset.actionTitle);
      if (event.target.id === "actionImageClose" || event.target.id === "actionImageModal") closeActionPhoto();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeActionPhoto();
    });
  }

  function mostRecentCompletedWednesday() {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const difference = (end.getDay() - 3 + 7) % 7;
    end.setDate(end.getDate() - difference);
    if (difference === 0) end.setDate(end.getDate() - 7);
    return end;
  }

  function inputDate(value) {
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function applyReportingRange(start, end) {
    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    const periodText = document.getElementById("periodText");
    if (startInput) startInput.value = inputDate(start);
    if (endInput) endInput.value = inputDate(end);
    if (periodText) {
      const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      periodText.textContent = `${startLabel} — ${endLabel}`;
    }
  }

  function setupPeriodControls() {
    document.querySelectorAll(".quick-periods button[data-range]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();

        const range = button.dataset.range;
        const isThirtyDays = range === "30";
        const end = isThirtyDays ? new Date() : mostRecentCompletedWednesday();
        end.setHours(0, 0, 0, 0);
        const start = new Date(end);
        start.setDate(end.getDate() - (isThirtyDays ? 29 : 7));
        applyReportingRange(start, end);
        document.getElementById("periodPop")?.classList.remove("open");

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("range", range);
        window.history.replaceState({}, "", nextUrl);

        try {
          if (typeof LH_renderSelectedPeriod === "function") LH_renderSelectedPeriod();
        } catch (_) {}
        window.setTimeout(renderActivity, 25);
      }, true);
    });

    const requestedRange = new URLSearchParams(window.location.search).get("range");
    const isThirtyDays = requestedRange === "30";
    const end = isThirtyDays ? new Date() : mostRecentCompletedWednesday();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(end.getDate() - (isThirtyDays ? 29 : 7));
    applyReportingRange(start, end);
  }

  function setupCalendar() {
    document.getElementById("calendarPrev")?.addEventListener("click", () => {
      state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
      renderCalendar();
    });
    document.getElementById("calendarNext")?.addEventListener("click", () => {
      state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
      renderCalendar();
    });
  }

  async function loadSupplementalData() {
    try {
      const [budgetText, competitorText] = await Promise.all([
        typeof fetchSheet === "function" ? fetchSheet("budget") : null,
        typeof fetchSheet === "function" ? fetchSheet("competitors") : null
      ]);
      renderBudget(typeof parseCSV === "function" ? parseCSV(budgetText || "") : []);
      renderCompetition(typeof parseCSV === "function" ? parseCSV(competitorText || "") : []);
    } catch (error) {
      console.warn("Unable to load budget or competition data", error);
      renderBudget([]);
      renderCompetition([]);
    }
  }

  function wrapReportingHooks() {
    try {
      if (typeof updateActionsList === "function") updateActionsList = renderActions;
      if (typeof updateMarketing === "function") updateMarketing = renderMarketing;

      if (typeof updateTraffic === "function") {
        const originalUpdateTraffic = updateTraffic;
        updateTraffic = function modernTrafficUpdate(rows) {
          originalUpdateTraffic(rows);
          window.setTimeout(renderActivity, 25);
        };
      }

      if (typeof LH_renderSelectedPeriod === "function") {
        const originalPeriodRender = LH_renderSelectedPeriod;
        LH_renderSelectedPeriod = function modernPeriodRender() {
          originalPeriodRender();
          window.setTimeout(renderActivity, 25);
        };
      }
    } catch (error) {
      console.warn("Unable to attach modern dashboard renderers", error);
    }
  }

  wrapReportingHooks();

  function initialize() {
    setupPeriodControls();
    setupCalendar();
    setupCompetitionSlider();
    setupModal();
    loadSupplementalData();
    renderCalendar();
    window.setTimeout(() => {
      renderActivity();
      try {
        if (typeof LH_reportingData !== "undefined" && LH_reportingData?.ready) renderActions(LH_reportingData.actions || []);
      } catch (_) {}
    }, 1250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
