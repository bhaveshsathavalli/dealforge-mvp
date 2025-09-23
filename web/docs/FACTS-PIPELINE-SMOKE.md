# Facts Pipeline Smoke Tests

This document provides copy-paste commands for testing the facts pipeline collectors.

## Pricing

```bash
DRY_RUN=1 npm run dev-pricing -- "https://www.shopify.com/pricing" shopify.com
```

**Expected**: `parsed >= 3, saved >= 3, confidence >= 0.70`

## Features

```bash
DRY_RUN=1 npm run dev-features -- "https://www.intercom.com/features" intercom.com
```

**Expected**: `parsed >= 8, sections >= 2, confidence >= 0.70`

## Integrations (no headless → expect JSON)

```bash
DRY_RUN=1 npm run dev-integrations -- "https://slack.com/apps" slack.com
```

**Expected**: `parsed >= 40, json >= 20, confidence >= 0.95`

## Force headless on JS-heavy

```bash
FACTS_HEADLESS_ENABLED=1 DRY_RUN=1 npm run dev-integrations -- "https://slack.com/apps" slack.com
```

**Expected**: `parsed >= 100, confidence >= 0.98`

## Additional Test Cases

### Pricing (Alternative)
```bash
DRY_RUN=1 npm run dev-pricing -- "https://www.stripe.com/pricing" stripe.com
```

**Expected**: `parsed >= 2, saved >= 2, confidence >= 0.70`

### Features (Alternative)
```bash
DRY_RUN=1 npm run dev-features -- "https://www.hubspot.com/features" hubspot.com
```

**Expected**: `parsed >= 5, confidence >= 0.70`

### Integrations (Alternative)
```bash
DRY_RUN=1 npm run dev-integrations -- "https://www.hubspot.com/integrations" hubspot.com
```

**Expected**: `parsed >= 10, confidence >= 0.70`

## Smoke Test All Collectors

```bash
npm run smoke:facts
```

**Expected**: All collectors run successfully with reasonable parsed counts

## Notes

- `DRY_RUN=1` prevents actual database writes and shows what would be saved
- `FACTS_HEADLESS_ENABLED=1` enables JavaScript rendering for JS-heavy sites
- Confidence scores are based on page structure, recency, and first-party status
- Parsed counts may vary based on website structure and content changes