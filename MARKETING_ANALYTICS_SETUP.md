# Lowell Heights marketing analytics

Adds the Church Creek marketing highlights pattern immediately above the existing Marketing section. The existing inventory, budget, activity, competition, actions and calendar code stays intact.

## Sources and reporting scope

Website: the existing Greencity GA4 property (`520225657`) under the FIRST AND MAIN Analytics account (`380775153`), measuring Brook & Jill’s website. The numeric property was identified from the existing Analytics property list; the current chat connection also confirmed it is connected but not selected. Live reporting access still needs to be verified. Requests require both the hostname `brookandjillhometeam.com` (or its www variant) and the session landing page `/greencity` (optional trailing slash). The consumer page was verified as the Lowell Heights community page on November 24, 2026. Visits to the developer dashboard and unrelated brokerage pages are excluded. `/rsvp` is not included until its current purpose and attribution are verified.

Ads: one Meta account-level Insights report filtered to an explicit list of Lowell campaign IDs. This preserves deduplicated reach across included campaigns. Never sum daily or campaign reach. Add future Lowell campaign IDs to that list to continue the cumulative project totals. No campaign names, cost, spend or revenue are requested or returned by this endpoint.

The reporting start date must be verified from the project/campaign history before activation. Both sources cover that fixed start through the current date. Headline website users come from an aggregated GA4 report; source engagement and duration are weighted by sessions.

## Server configuration

Set these on the existing Lowell Vercel project. Keep credentials in environment variables; never commit them or include them in the frontend.

| Variable | Value to verify |
| --- | --- |
| `LOWELL_ANALYTICS_START_DATE` | Confirmed project reporting start date, YYYY-MM-DD |
| `LOWELL_GA4_PROPERTY_ID` | `520225657` — existing Greencity property |
| `LOWELL_GOOGLE_SERVICE_ACCOUNT_JSON` | Reporting service account with Viewer access to that property |
| `LOWELL_META_AD_ACCOUNT_ID` | Meta account running the Lowell campaigns |
| `LOWELL_META_CAMPAIGN_IDS` | Comma-separated Lowell campaign IDs, including older/inactive campaigns in scope |
| `LOWELL_META_ACCESS_TOKEN` | Reporting token with access to those campaigns |
| `LOWELL_META_API_VERSION` | Optional; default v27.0 from current Meta documentation |

Check the GA4 property and Meta account timezones against America/Los_Angeles before activation.

## Direct connection without a paid connector

The implementation reads Google's Analytics Data API directly from the existing Lowell Vercel project. It does not require adding Greencity to a paid HYPD plan, replacing FAM's selected property, or changing either site's tracking tags.

The existing Church Creek reporting principal is `church-creek-dashboard@church-creek-dashboard.iam.gserviceaccount.com`. Reuse that principal only with approval to grant it Viewer on the Greencity property, limited to property `520225657`, and authorization for the existing reporting credential to be used by the Lowell Vercel project. Do not grant account-wide access. Configure the verified credential as `LOWELL_GOOGLE_SERVICE_ACCOUNT_JSON`; configure the property as `LOWELL_GA4_PROPERTY_ID=520225657`.

After configuration, use the deployed direct endpoint to verify totals against Google Analytics. No HYPD property selection is required for dashboard refreshes. The current GitHub connection still rejects writes, so release access to the existing Lowell project remains a separate requirement.

Meta reporting is also implemented as a direct Insights API call. Its account, explicit Lowell campaign IDs, reporting token, timezone and start date still need verification and authorization. Do not present GA4 social referrals as Meta impressions or reach.

Any new GA4 Viewer grant or new Meta reporting credential must receive the applicable user authorization before it is created. Existing reporting credentials can be reused when already authorized for this property and project.

## Behavior and verification

The module refreshes every five minutes. Website and ads have independent status and caches, so a failure in one does not block the other. Successful reports can remain visible as explicitly dated saved data after a refresh failure within a running server instance. No historical Church Creek values or fabricated sample counts are included. Before the first successful connection, metrics show an em dash. Missing configuration never triggers a broad, unfiltered report.

Run `node --test tests/marketing-analytics.test.js` and `node --check marketing-highlights.js`. Open `analytics-preview.html` for the standalone layout, or the existing dashboard at `#marketing-highlights` to inspect placement. The standalone preview intentionally shows pending values until the verified connections are configured.

This branch is a review draft. Do not merge or publish production before checking live figures against each platform and obtaining the user’s review of the preview.

Primary API references:
- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
- https://developers.facebook.com/docs/graph-api/reference/adaccount/insights/
