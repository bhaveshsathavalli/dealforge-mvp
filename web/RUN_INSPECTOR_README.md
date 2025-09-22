# Run Inspector Debug Tool

This debug inspector helps understand why Compare shows blanks or weak sources by analyzing run artifacts.

## Files Created

- `src/server/runInspector.ts` - Server-side function to analyze run data
- `src/app/api/debug/run/[id]/summary/route.ts` - API endpoint to view run summary
- `test-run-inspector.js` - Test script to verify the implementation

## Usage

### 1. Get a Run ID
First, get a run ID from the debug runs endpoint:
```bash
curl http://localhost:3000/api/debug/runs
```

### 2. Inspect a Run
Use the API endpoint to inspect a specific run:
```bash
curl http://localhost:3000/api/debug/run/<RUN_ID>/summary
```

Or use the test script:
```bash
node test-run-inspector.js <RUN_ID>
```

### 3. What to Look For

The inspector returns:

- **run.run_context**: Contains `you_site` and `competitor_site` URLs
- **counts.vendorYou**: Number of claims with citations from your vendor site
- **counts.vendorComp**: Number of claims with citations from competitor site  
- **counts.totalClaims**: Total number of claims found
- **rows[]**: Array of claims with:
  - `metric`: The category (Pricing, Features, etc.)
  - `side`: "you", "competitor", or null
  - `text`: The claim text
  - `citationHosts`: Array of unique hostnames from citations

### 4. Common Issues to Check

1. **Empty run_context**: If `you_site` or `competitor_site` are missing, the system can't identify vendor domains
2. **Low vendor counts**: If `vendorYou` or `vendorComp` are 0, there are no citations from vendor sites
3. **Missing claims**: If `totalClaims` is 0, no claims were generated from the raw hits
4. **Weak citations**: Check if `citationHosts` contains authoritative domains vs forums/blogs

### 5. Example Output

```json
{
  "run": {
    "query_text": "Klue vs Crayon pricing",
    "run_context": {
      "you_site": "https://klue.com",
      "competitor_site": "https://crayon.co"
    }
  },
  "counts": {
    "vendorYou": 3,
    "vendorComp": 2, 
    "totalClaims": 8
  },
  "rows": [
    {
      "metric": "Pricing",
      "side": "you",
      "text": "Klue offers three pricing tiers...",
      "citationHosts": ["klue.com", "salesforce.com"]
    }
  ]
}
```

This helps identify whether the issue is with data collection, claim generation, or citation quality.
