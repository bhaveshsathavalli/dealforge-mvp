-- Idempotent backfill: only update rows with empty/null product fields
UPDATE orgs
SET product_name   = COALESCE(NULLIF(TRIM(product_name), ''), 'Slack'),
    product_website= COALESCE(NULLIF(TRIM(product_website), ''), 'https://www.slack.com')
WHERE (product_name IS NULL OR TRIM(product_name) = '')
   OR (product_website IS NULL OR TRIM(product_website) = '');
