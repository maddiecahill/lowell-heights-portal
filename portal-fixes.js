(() => {
  // ========================================================
  // LOWELL HEIGHTS — PORTAL FIXES
  // - Buyer Showings full detail
  // - Rolling last 7 days default
  // - Quick navigation fix
  // ========================================================

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

  // ========================================================
  // BUYER SHOWING DETAIL
  // ========================================================

  function renderTrafficDetail(rows, title) {
    const detail = document.getElementById("trafficDetail");

    if (!detail) return;

    detail.style.display = "block";

    if (!rows || !rows.length) {
      detail.innerHTML = `
        <div style="color:var(--muted);font-size:13px">
          No showing records found for this reporting period.
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

        <div style="
          font-size:12px;
          color:var(--muted);
        ">
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

        // Automatically include future fields added
        // to the Physical Traffic sheet.
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
                  ${
                    hasValue(r["Unit ID"])
                      ? " · Unit " + esc(r["Unit ID"])
                      : ""
                  }
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

            ${
              hasValue(notes)
                ? `
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
            `
                : ""
            }

          </div>
        `;
      }).join("")}
    `;

    detail.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }

  // ========================================================
  // BUILD BUYER SHOWING BREAKDOWN
  // ========================================================

  function rebuildTrafficTypes() {
    if (typeof lastTraffic === "undefined") return;

    const firstRow =
      document.querySelector("#traffic .traffic-type");

    if (!firstRow) return;

    const card = firstRow.closest(".card");

    if (!card) return;

    const rows =
      Array.isArray(lastTraffic)
        ? lastTraffic
        : [];

    const eyebrow =
      card.querySelector(".eyebrow");

    if (eyebrow) {
      eyebrow.textContent =
        "Showing Breakdown";
    }

    // Remove old hard-coded rows.
    card
      .querySelectorAll(".traffic-type")
      .forEach((row) => row.remove());

    const counts = {};

    rows.forEach((r) => {
      const type =
        r["Traffic Type"] || "Other";

      counts[type] =
        (counts[type] || 0) + 1;
    });

    function createRow(
      label,
      count,
      records
    ) {
      const row =
        document.createElement("div");

      row.className =
        "row traffic-type";

      row.style.cursor =
        "pointer";

      row.innerHTML = `
        <span>${esc(label)}</span>
        <b>${count}</b>
      `;

      row.addEventListener(
        "click",
        () => {
          renderTrafficDetail(
            records,
            label
          );

          card
            .querySelectorAll(
              ".traffic-type"
            )
            .forEach((r) => {
              r.style.background = "";
            });

          row.style.background =
            "#f9f6f0";
        }
      );

      card.appendChild(row);
    }

    // Show all showing records first.
    createRow(
      "All Buyer Showings",
      rows.length,
      rows
    );

    // Then break out by traffic type.
    Object.keys(counts)
      .sort()
      .forEach((type) => {
        createRow(
          type,
          counts[type],
          rows.filter(
            (r) =>
              (
                r["Traffic Type"] ||
                "Other"
              ) === type
          )
        );
      });
  }

  // ========================================================
  // QUICK NAVIGATION FIX
  // ========================================================

  function fixQuickNavigation() {
    const links =
      document.querySelectorAll(
        '.jumpnav a[href^="#"], .primary-nav a[href^="#"]'
      );

    links.forEach((link) => {
      link.addEventListener(
        "click",
        (event) => {
          const id =
            link.getAttribute("href");

          if (
            !id ||
            id === "#"
          ) {
            return;
          }

          const target =
            document.querySelector(id);

          if (!target) return;

          event.preventDefault();

          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

          document
            .querySelectorAll(
              ".jumpnav a, .primary-nav a"
            )
            .forEach((a) =>
              a.classList.remove(
                "active"
              )
            );

          link.classList.add(
            "active"
          );

          try {
            history.replaceState(
              null,
              "",
              id
            );
          } catch (e) {}
        }
      );
    });
  }

  // ========================================================
  // LABEL CHANGES
  // ========================================================

  function updateTrafficLabels() {
    const heading =
      document.querySelector(
        "#traffic .section-head h2"
      );

    if (heading) {
      heading.textContent =
        "Buyer Showings";
    }

    const total =
      document.querySelector(
        "#traffic .traffic-total small"
      );

    if (total) {
      total.textContent =
        "Showing Groups";
    }
  }

  // ========================================================
  // DEFAULT REPORTING PERIOD
  // LAST 7 CALENDAR DAYS INCLUDING TODAY
  //
  // Example:
  // Aug 25 = Aug 19 through Aug 25
  // ========================================================

  function setDefaultLast7Days() {
    const end =
      new Date();

    end.setHours(
      0,
      0,
      0,
      0
    );

    const start =
      new Date(end);

    start.setDate(
      end.getDate() - 6
    );

    if (
      typeof applyRange ===
      "function"
    ) {
      applyRange(
        start,
        end
      );
    }
  }

  // ========================================================
  // KEEP SHOWING BREAKDOWN UPDATED
  // WHEN REPORTING PERIOD CHANGES
  // ========================================================

  if (
    typeof updateTraffic ===
    "function"
  ) {
    const originalUpdateTraffic =
      updateTraffic;

    updateTraffic = function (
      traffic
    ) {
      originalUpdateTraffic(
        traffic
      );

      window.setTimeout(
        () => {
          rebuildTrafficTypes();
        },
        0
      );
    };
  }

  // The reporting-period code also directly
  // calls LH_renderSelectedPeriod().
  if (
    typeof LH_renderSelectedPeriod ===
    "function"
  ) {
    const originalReportingRender =
      LH_renderSelectedPeriod;

    LH_renderSelectedPeriod =
      function () {
        originalReportingRender();

        window.setTimeout(
          () => {
            rebuildTrafficTypes();
          },
          0
        );
      };
  }

  // ========================================================
  // INITIALIZE
  // ========================================================

  function initPortalFixes() {
    // Override old Tuesday–Tuesday default.
    setDefaultLast7Days();

    updateTrafficLabels();

    fixQuickNavigation();

    if (
      typeof lastTraffic !==
        "undefined" &&
      Array.isArray(lastTraffic)
    ) {
      rebuildTrafficTypes();
    }
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initPortalFixes
    );
  } else {
    initPortalFixes();
  }
})();
// ========================================================
// LOWELL HEIGHTS — MERGED BUYER FEEDBACK
//
// Combines:
// 1. Formal Buyer Feedback records
// 2. Notes logged with Buyer Showings / Physical Traffic
//
// No duplicate data entry required.
// ========================================================

(() => {

  function PF_hasText(value) {
    return (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    );
  }


  // --------------------------------------------------------
  // Convert a showing note into a Buyer Feedback-style record
  // --------------------------------------------------------

  function PF_showingToFeedback(row, index) {

    const name =
      row["Event or Agent Name"] ||
      row["Traffic Type"] ||
      "Buyer Showing";

    const note =
      row["Notes"] || "";

    return {
      "Feedback Date":
        row["Activity Date"] || "",

      "Feedback ID":
        "SHOWING-" +
        (
          row["Traffic ID"] ||
          index
        ),

      "Lead ID":
        "",

      "Unit ID":
        row["Unit ID"] || "",

      "Traffic ID":
        row["Traffic ID"] || "",

      "Feedback Category":
        row["Traffic Type"] ||
        "Buyer Showing",

      "Sentiment":
        "Showing Note",

      "Feedback Detail":
        name +
        " — " +
        note,

      "Action Recommended":
        "",

      "Buyer or Visitor Type":
        row["Traffic Type"] ||
        "Showing",

      "_fromTraffic":
        "1"
    };
  }


  // --------------------------------------------------------
  // Merge formal feedback + showing notes
  // --------------------------------------------------------

  function PF_mergeBuyerFeedback(
    formalFeedback,
    traffic
  ) {

    const formal =
      (formalFeedback || [])
        .map(row => ({ ...row }));

    const trafficRows =
      (traffic || [])
        .filter(
          row =>
            PF_hasText(
              row["Notes"]
            )
        );

    const formalByTrafficId =
      {};

    formal.forEach(
      (row, index) => {

        const trafficId =
          String(
            row["Traffic ID"] ||
            ""
          ).trim();

        if (trafficId) {
          formalByTrafficId[
            trafficId
          ] = index;
        }
      }
    );


    trafficRows.forEach(
      (row, index) => {

        const trafficId =
          String(
            row["Traffic ID"] ||
            ""
          ).trim();

        const notes =
          String(
            row["Notes"] ||
            ""
          ).trim();

        const name =
          row["Event or Agent Name"] ||
          row["Traffic Type"] ||
          "Buyer Showing";


        // ------------------------------------------
        // If a formal feedback record already exists
        // for this showing, keep it as the main record
        // and add any additional showing notes to it.
        // ------------------------------------------

        if (
          trafficId &&
          formalByTrafficId[
            trafficId
          ] !== undefined
        ) {

          const target =
            formal[
              formalByTrafficId[
                trafficId
              ]
            ];

          const currentDetail =
            String(
              target[
                "Feedback Detail"
              ] ||
              ""
            ).trim();


          if (
            notes &&
            !currentDetail.includes(
              notes
            )
          ) {

            target[
              "Feedback Detail"
            ] =
              currentDetail
                ? (
                    currentDetail +
                    " — Showing notes from " +
                    name +
                    ": " +
                    notes
                  )
                : (
                    name +
                    " — " +
                    notes
                  );
          }


          if (
            !PF_hasText(
              target[
                "Buyer or Visitor Type"
              ]
            )
          ) {
            target[
              "Buyer or Visitor Type"
            ] =
              row[
                "Traffic Type"
              ] ||
              "Showing";
          }

          return;
        }


        // ------------------------------------------
        // Otherwise create a feedback entry from
        // the showing notes.
        // ------------------------------------------

        formal.push(
          PF_showingToFeedback(
            row,
            index
          )
        );
      }
    );


    // Newest first.

    formal.sort(
      (a, b) => {

        const da =
          new Date(
            a["Feedback Date"] ||
            0
          );

        const db =
          new Date(
            b["Feedback Date"] ||
            0
          );

        return db - da;
      }
    );


    return formal;
  }


  // --------------------------------------------------------
  // Get only rows inside current Reporting Period
  // --------------------------------------------------------

  function PF_getCurrentFeedbackData() {

    if (
      typeof LH_reportingData ===
        "undefined" ||
      !LH_reportingData ||
      !LH_reportingData.ready
    ) {
      return null;
    }


    let formalFeedback =
      LH_reportingData.feedback ||
      [];

    let traffic =
      LH_reportingData.traffic ||
      [];


    if (
      typeof LH_filterByDate ===
      "function"
    ) {

      formalFeedback =
        LH_filterByDate(
          formalFeedback,
          "Feedback Date"
        );

      traffic =
        LH_filterByDate(
          traffic,
          "Activity Date"
        );
    }


    return {
      formalFeedback,
      traffic
    };
  }


  // --------------------------------------------------------
  // Render combined feedback on dashboard
  // --------------------------------------------------------

  function PF_renderMergedFeedback() {

    const data =
      PF_getCurrentFeedbackData();

    if (!data) {
      return;
    }


    const merged =
      PF_mergeBuyerFeedback(
        data.formalFeedback,
        data.traffic
      );


    // Use the dashboard's original feedback renderer
    // so the existing design stays intact.

    if (
      typeof LH_originalUpdateFeedbackList ===
      "function"
    ) {

      LH_originalUpdateFeedbackList(
        merged
      );

    } else if (
      typeof updateFeedbackList ===
      "function"
    ) {

      updateFeedbackList(
        merged
      );
    }


    // ------------------------------------------
    // Correct Buyer Conversations KPI
    // ------------------------------------------

    const metrics =
      document.querySelectorAll(
        ".metric"
      );

    if (metrics[3]) {

      const value =
        metrics[3]
          .querySelector(
            ".metric-value"
          );

      const sub =
        metrics[3]
          .querySelector(
            ".metric-sub"
          );


      if (value) {
        value.textContent =
          merged.length;
      }


      if (sub) {

        const formalCount =
          data.formalFeedback.length;

        const showingCount =
          data.traffic.filter(
            row =>
              PF_hasText(
                row["Notes"]
              )
          ).length;


        sub.textContent =
          formalCount +
          " formal · " +
          showingCount +
          " showing note" +
          (
            showingCount === 1
              ? ""
              : "s"
          );
      }
    }
  }


  // --------------------------------------------------------
  // Re-render after traffic/live data updates
  // --------------------------------------------------------

  if (
    typeof updateTraffic ===
    "function"
  ) {

    const PF_originalUpdateTraffic =
      updateTraffic;

    updateTraffic =
      function(traffic) {

        PF_originalUpdateTraffic(
          traffic
        );

        window.setTimeout(
          PF_renderMergedFeedback,
          0
        );
      };
  }


  // --------------------------------------------------------
  // Re-render after reporting period changes
  // --------------------------------------------------------

  if (
    typeof LH_renderSelectedPeriod ===
    "function"
  ) {

    const PF_originalPeriodRender =
      LH_renderSelectedPeriod;

    LH_renderSelectedPeriod =
      function() {

        PF_originalPeriodRender();

        window.setTimeout(
          PF_renderMergedFeedback,
          0
        );
      };
  }


  // Initial render after live data has had time to load.

  window.setTimeout(
    PF_renderMergedFeedback,
    750
  );

})();
// ========================================================
// ACTION ITEMS
// ========================================================

(() => {

  const safeText = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");


  // --------------------------------------------------------
  // ACTION ITEMS
  //
  // Shows:
  // Action Item
  // FAM Owner
  // GreenCity Owner
  // Due
  // Priority
  // --------------------------------------------------------

  function renderActionItemsWithGreenCity(
    actions
  ) {

    if (
      typeof window.LH_renderModernActions ===
        "function"
    ) {
      window.LH_renderModernActions(
        actions
      );
      return;
    }

    const list =
      document.querySelector(
        ".action-list"
      );

    if (!list) {
      return;
    }


    const rows =
      Array.isArray(actions)
        ? actions
        : [];


    if (!rows.length) {

      list.innerHTML = `
        <div style="
          padding:24px;
          color:var(--muted);
          font-size:13px;
        ">
          No action items logged.
        </div>
      `;

      return;
    }


    const grid =
      "minmax(260px,2.2fr) minmax(115px,.8fr) minmax(140px,.95fr) minmax(105px,.7fr) minmax(85px,.55fr)";


    list.innerHTML = `

      <div
        class="action-row"
        style="
          grid-template-columns:${grid};
          background:#f5f1e9;
          border-bottom:1px solid var(--line);
          padding-top:10px;
          padding-bottom:10px;
        "
      >

        <span style="
          font-size:9px;
          letter-spacing:.12em;
          text-transform:uppercase;
          color:var(--muted);
        ">
          Action Item
        </span>


        <span style="
          font-size:9px;
          letter-spacing:.12em;
          text-transform:uppercase;
          color:var(--muted);
        ">
          FAM Owner
        </span>


        <span style="
          font-size:9px;
          letter-spacing:.12em;
          text-transform:uppercase;
          color:var(--bronze);
        ">
          GreenCity Owner
        </span>


        <span style="
          font-size:9px;
          letter-spacing:.12em;
          text-transform:uppercase;
          color:var(--muted);
        ">
          Due
        </span>


        <span style="
          font-size:9px;
          letter-spacing:.12em;
          text-transform:uppercase;
          color:var(--muted);
        ">
          Priority
        </span>

      </div>


      ${rows.map(action => {

        const priority =
          String(
            action["Priority"] ||
            "Medium"
          ).toLowerCase();


        const priorityClass =
          (
            priority === "high" ||
            priority === "urgent"
          )
            ? "high"
            : "medium";


        const context =
          [
            action["Category"],
            action[
              "Unit ID or Location"
            ]
          ]
          .filter(Boolean)
          .join(" · ");


        return `

          <div
            class="action-row"
            style="
              grid-template-columns:${grid};
            "
          >

            <strong>

              ${safeText(
                action["Description"] ||
                action["Action ID"] ||
                "Action"
              )}

              ${
                context
                  ? `
                    <small style="
                      display:block;
                      margin-top:4px;
                      color:var(--muted);
                      font-size:10px;
                      font-weight:400;
                    ">
                      ${safeText(context)}
                    </small>
                  `
                  : ""
              }

            </strong>


            <span>
              ${safeText(
                action["Owner"] ||
                "—"
              )}
            </span>


            <span style="
              font-weight:500;
              color:var(--ink);
            ">
              ${safeText(
                action[
                  "Green City Owner"
                ] ||
                "—"
              )}
            </span>


            <span>
              ${
                action["Due Date"]
                  ? safeText(
                      action["Due Date"]
                    )
                  : "—"
              }
            </span>


            <span
              class="
                priority
                ${priorityClass}
              "
            >
              ${safeText(
                action["Priority"] ||
                "Medium"
              )}
            </span>

          </div>
        `;

      }).join("")}

    `;
  }


  // --------------------------------------------------------
  // REPLACE EXISTING ACTION ITEM RENDERER
  // --------------------------------------------------------

  if (
    typeof updateActionsList ===
    "function"
  ) {

    updateActionsList =
      function(actions) {

        renderActionItemsWithGreenCity(
          actions
        );

      };
  }


  // --------------------------------------------------------
  // ALSO RENDER FROM ALREADY-LOADED DATA
  // --------------------------------------------------------

  function refreshExistingActions() {

    if (
      typeof LH_reportingData !==
        "undefined" &&
      LH_reportingData &&
      LH_reportingData.ready &&
      Array.isArray(
        LH_reportingData.actions
      )
    ) {

      renderActionItemsWithGreenCity(
        LH_reportingData.actions
      );

    }

  }


  function initializeCurrentChanges() {

    refreshExistingActions();


    // One more pass after live data finishes loading.
    window.setTimeout(
      refreshExistingActions,
      1000
    );

  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeCurrentChanges
    );

  } else {

    initializeCurrentChanges();

  }

})();
