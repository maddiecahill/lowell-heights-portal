(() => {
  const hasValue = (value) =>
    value !== undefined &&
    value !== null &&
    String(value).trim() !== "";

  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const prettyLabel = {
    "Activity Date": "Date",
    "Traffic ID": "Traffic ID",
    "Unit ID": "Unit",
    "Traffic Type": "Showing Type",
    "Event or Agent Name": "Buyer / Agent / Event",
    "Start Time": "Start Time",
    "End Time": "End Time",
    "Visitor Count": "Visitors",
    "Qualified Prospects": "Qualified Prospects",
    "Repeat Visitors": "Repeat Visitors",
    "Appointments Set": "Appointments Set",
    "Offers Generated": "Offers Generated",
    "Source Detail": "Source",
    "Entered By": "Entered By",
    "Last Updated": "Last Updated"
  };

  const preferredOrder = [
    "Activity Date",
    "Unit ID",
    "Traffic Type",
    "Event or Agent Name",
    "Start Time",
    "End Time",
    "Visitor Count",
    "Qualified Prospects",
    "Repeat Visitors",
    "Appointments Set",
    "Offers Generated",
    "Source Detail",
    "Entered By",
    "Last Updated",
    "Traffic ID"
  ];

  function renderTrafficDetail(rows, title) {
    const detail = document.getElementById("trafficDetail");
    if (!detail) return;

    detail.style.display = "block";

    if (!rows || !rows.length) {
      detail.innerHTML = `
        <div style="color:var(--muted);font-size:13px">
          No showing records found.
        </div>
      `;
      return;
    }

    detail.innerHTML = `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-end;
        gap:20px;
        margin-bottom:18px;
        padding-bottom:14px;
        border-bottom:1px solid var(--line);
      ">
        <div>
          <div class="eyebrow">Buyer Showing Detail</div>
          <div style="
            font-family:'Cormorant Garamond',Georgia,serif;
            font-size:26px;
            font-weight:500;
            margin-top:4px;
          ">
            ${esc(title)}
          </div>
        </div>
        <div style="font-size:12px;color:var(--muted)">
          ${rows.length} record${rows.length === 1 ? "" : "s"}
        </div>
      </div>

      ${rows.map((r) => {
        const name =
          r["Event or Agent Name"] ||
          r["Traffic Type"] ||
          "Buyer Showing";

        const notes = r["Notes"];

        const knownFields = preferredOrder
          .filter((key) => hasValue(r[key]))
          .map((key) => [key, r[key]]);

        // Automatically include any future logged columns too.
        Object.keys(r).forEach((key) => {
          if (
            key !== "Notes" &&
            !preferredOrder.includes(key) &&
            hasValue(r[key])
          ) {
            knownFields.push([key, r[key]]);
          }
        });

        return `
          <div style="
            background:var(--paper);
            border:1px solid var(--line);
            padding:22px;
            margin-bottom:16px;
          ">
            <div style="
              display:flex;
              justify-content:space-between;
              gap:18px;
              align-items:flex-start;
              margin-bottom:18px;
            ">
              <div>
                <div style="
                  font-family:'Cormorant Garamond',Georgia,serif;
                  font-size:22px;
                  font-weight:600;
                  line-height:1.2;
                ">
                  ${esc(name)}
                </div>

                <div style="
                  margin-top:5px;
                  color:var(--muted);
                  font-size:12px;
                ">
                  ${esc(r["Activity Date"] || "")}
                  ${hasValue(r["Unit ID"]) ? " · Unit " + esc(r["Unit ID"]) : ""}
                </div>
              </div>

              <div style="
                font-size:10px;
                letter-spacing:.12em;
                text-transform:uppercase;
                color:var(--bronze);
                white-space:nowrap;
              ">
                ${esc(r["Traffic Type"] || "Showing")}
              </div>
            </div>

            <div style="
              display:grid;
              grid-template-columns:repeat(auto-fit,minmax(175px,1fr));
              gap:1px;
              background:var(--line);
              border:1px solid var(--line);
              margin-bottom:${hasValue(notes) ? "18px" : "0"};
            ">
              ${knownFields.map(([key, value]) => `
                <div style="
                  background:var(--paper);
                  padding:13px 14px;
                  min-height:66px;
                ">
                  <div style="
                    font-size:9px;
                    color:var(--muted);
                    letter-spacing:.10em;
                    text-transform:uppercase;
                    margin-bottom:5px;
                  ">
                    ${esc(prettyLabel[key] || key)}
                  </div>

                  <div style="
                    font-size:13px;
                    color:var(--ink);
                    line-height:1.45;
                    overflow-wrap:anywhere;
                  ">
                    ${esc(value)}
                  </div>
                </div>
              `).join("")}
            </div>

            ${hasValue(notes) ? `
              <div style="
                border-left:3px solid var(--bronze);
                padding:4px 0 4px 16px;
              ">
                <div style="
                  font-size:9px;
                  letter-spacing:.12em;
                  text-transform:uppercase;
                  color:var(--bronze);
                  margin-bottom:7px;
                ">
                  Full Showing Notes
                </div>

                <div style="
                  font-size:14px;
                  line-height:1.65;
                  color:var(--ink-soft);
                  white-space:pre-wrap;
                ">
                  ${esc(notes)}
                </div>
              </div>
            ` : ""}
          </div>
        `;
      }).join("")}
    `;

    detail.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }

  function rebuildTrafficTypes() {
    if (typeof lastTraffic === "undefined") return;

    const firstRow = document.querySelector("#traffic .traffic-type");
    if (!firstRow) return;

    const card = firstRow.closest(".card");
    if (!card) return;

    const rows = Array.isArray(lastTraffic) ? lastTraffic : [];

    // Rename the card heading.
    const eyebrow = card.querySelector(".eyebrow");
    if (eyebrow) eyebrow.textContent = "Showing Breakdown";

    // Remove old hard-coded type rows.
    card.querySelectorAll(".traffic-type").forEach((row) => row.remove());

    const counts = {};
    rows.forEach((r) => {
      const type = r["Traffic Type"] || "Other";
      counts[type] = (counts[type] || 0) + 1;
    });

    function createRow(label, count, records) {
      const row = document.createElement("div");
      row.className = "row traffic-type";
      row.style.cursor = "pointer";

      row.innerHTML = `
        <span>${esc(label)}</span>
        <b>${count}</b>
      `;

      row.addEventListener("click", () => {
        renderTrafficDetail(records, label);

        card
          .querySelectorAll(".traffic-type")
          .forEach((r) => r.style.background = "");

        row.style.background = "#f9f6f0";
      });

      card.appendChild(row);
    }

    // First option shows every logged buyer showing.
    createRow(
      "All Buyer Showings",
      rows.length,
      rows
    );

    Object.keys(counts)
      .sort()
      .forEach((type) => {
        createRow(
          type,
          counts[type],
          rows.filter(
            (r) => (r["Traffic Type"] || "Other") === type
          )
        );
      });
  }

  function fixQuickNavigation() {
    const links = document.querySelectorAll(
      '.jumpnav a[href^="#"], .primary-nav a[href^="#"]'
    );

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const id = link.getAttribute("href");
        if (!id || id === "#") return;

        const target = document.querySelector(id);
        if (!target) return;

        event.preventDefault();

        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        document
          .querySelectorAll(".jumpnav a, .primary-nav a")
          .forEach((a) => a.classList.remove("active"));

        link.classList.add("active");

        try {
          history.replaceState(null, "", id);
        } catch (e) {}
      });
    });
  }

  function updateTrafficLabels() {
    const heading = document.querySelector("#traffic .section-head h2");
    if (heading) heading.textContent = "Buyer Showings";

    const total = document.querySelector("#traffic .traffic-total small");
    if (total) total.textContent = "Showing Groups";
  }

  // Keep the existing traffic calculations/chart,
  // but replace its old limited detail view afterward.
  if (typeof updateTraffic === "function") {
    const originalUpdateTraffic = updateTraffic;

    updateTraffic = function (traffic) {
      originalUpdateTraffic(traffic);

      window.setTimeout(() => {
        rebuildTrafficTypes();
      }, 0);
    };
  }

  function initPortalFixes() {
    updateTrafficLabels();
    fixQuickNavigation();

    if (
      typeof lastTraffic !== "undefined" &&
      Array.isArray(lastTraffic)
    ) {
      rebuildTrafficTypes();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initPortalFixes
    );
  } else {
    initPortalFixes();
  }
})();
