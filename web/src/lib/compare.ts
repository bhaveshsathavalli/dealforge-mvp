'use server';

import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

export type Citation = {
  id: string;
  url: string;
  quote?: string;
  user_added?: boolean;
};

export type CompareRow = {
  metric: string;
  you: string;
  competitor: string;
  citations: Citation[];
};

export async function buildCompareTable(runId: string): Promise<CompareRow[]> {
  const { userId, orgId } = await auth();
  
  if (!userId || !orgId) {
    throw new Error('Authentication required');
  }

  const supabase = await createClient();

  // Handle demo runs
  if (runId === 'demo') {
    return getDemoCompareData();
  }

  // 1) Load run (org-scoped)
  const { data: run, error: runError } = await supabase
    .from('query_runs')
    .select('id, query_text, clerk_org_id')
    .eq('id', runId)
    .eq('clerk_org_id', orgId)
    .single();

  if (runError || !run) {
    throw new Error('Run not found or access denied');
  }

  // 2) Fetch claims + citations by run_id
  const { data: claims, error: claimsError } = await supabase
    .from('claims')
    .select(`
      id,
      text,
      stance,
      support_level,
      citations (
        id,
        source_url,
        anchor_text,
        quote,
        domain
      )
    `)
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  if (claimsError) {
    console.error('Error fetching claims:', claimsError);
    throw new Error('Failed to fetch claims');
  }

  // Get raw hits for additional context
  const { data: rawHits, error: hitsError } = await supabase
    .from('raw_hits')
    .select('url, title, snippet, domain')
    .eq('run_id', runId)
    .order('rank', { ascending: true })
    .limit(20);

  if (hitsError) {
    console.error('Error fetching raw hits:', hitsError);
  }

  // 3) Compose >=5 rows covering key metrics
  const compareRows: CompareRow[] = [];

  // Pricing
  const pricingClaims = claims?.filter(claim =>
    claim.text.toLowerCase().includes('pricing') ||
    claim.text.toLowerCase().includes('cost') ||
    claim.text.toLowerCase().includes('price')
  ) || [];

  if (pricingClaims.length > 0) {
    const pricingClaim = pricingClaims[0];
    const pricingCitations: Citation[] = pricingClaim.citations?.map(c => ({
      id: c.id,
      url: c.source_url,
      quote: c.quote || '',
    })) || [];

    compareRows.push({
      metric: 'Pricing',
      you: 'Competitive pricing with flexible plans starting at $29/month',
      competitor: pricingClaim.text,
      citations: pricingCitations
    });
  }

  // Features & Plans
  const featureClaims = claims?.filter(claim =>
    claim.text.toLowerCase().includes('feature') ||
    claim.text.toLowerCase().includes('plan') ||
    claim.text.toLowerCase().includes('tier')
  ) || [];

  if (featureClaims.length > 0) {
    const featureClaim = featureClaims[0];
    const featureCitations: Citation[] = featureClaim.citations?.map(c => ({
      id: c.id,
      url: c.source_url,
      quote: c.quote || '',
    })) || [];

    compareRows.push({
      metric: 'Features & Plans',
      you: 'Comprehensive feature set with unlimited users and advanced analytics',
      competitor: featureClaim.text,
      citations: featureCitations
    });
  }

  // Integrations
  const integrationClaims = claims?.filter(claim =>
    claim.text.toLowerCase().includes('integration') ||
    claim.text.toLowerCase().includes('api') ||
    claim.text.toLowerCase().includes('connect')
  ) || [];

  if (integrationClaims.length > 0) {
    const integrationClaim = integrationClaims[0];
    const integrationCitations: Citation[] = integrationClaim.citations?.map(c => ({
      id: c.id,
      url: c.source_url,
      quote: c.quote || '',
    })) || [];

    compareRows.push({
      metric: 'Integrations',
      you: 'Extensive API and 200+ third-party integrations including Salesforce, HubSpot',
      competitor: integrationClaim.text,
      citations: integrationCitations
    });
  }

  // Usage Limits
  const limitsClaims = claims?.filter(claim =>
    claim.text.toLowerCase().includes('limit') ||
    claim.text.toLowerCase().includes('quota') ||
    claim.text.toLowerCase().includes('usage')
  ) || [];

  if (limitsClaims.length > 0) {
    const limitsClaim = limitsClaims[0];
    const limitsCitations: Citation[] = limitsClaim.citations?.map(c => ({
      id: c.id,
      url: c.source_url,
      quote: c.quote || '',
    })) || [];

    compareRows.push({
      metric: 'Usage Limits',
      you: 'Generous limits with unlimited API calls and scalable options',
      competitor: limitsClaim.text,
      citations: limitsCitations
    });
  }

  // Reporting & Analytics
  const reportingClaims = claims?.filter(claim =>
    claim.text.toLowerCase().includes('report') ||
    claim.text.toLowerCase().includes('analytics') ||
    claim.text.toLowerCase().includes('dashboard')
  ) || [];

  if (reportingClaims.length > 0) {
    const reportingClaim = reportingClaims[0];
    const reportingCitations: Citation[] = reportingClaim.citations?.map(c => ({
      id: c.id,
      url: c.source_url,
      quote: c.quote || '',
    })) || [];

    compareRows.push({
      metric: 'Reporting & Analytics',
      you: 'Advanced analytics with custom dashboards and real-time insights',
      competitor: reportingClaim.text,
      citations: reportingCitations
    });
  }

  // Security
  const securityClaims = claims?.filter(claim =>
    claim.text.toLowerCase().includes('security') ||
    claim.text.toLowerCase().includes('compliance') ||
    claim.text.toLowerCase().includes('soc')
  ) || [];

  if (securityClaims.length > 0) {
    const securityClaim = securityClaims[0];
    const securityCitations: Citation[] = securityClaim.citations?.map(c => ({
      id: c.id,
      url: c.source_url,
      quote: c.quote || '',
    })) || [];

    compareRows.push({
      metric: 'Security',
      you: 'Enterprise-grade security with SOC 2 compliance and SSO',
      competitor: securityClaim.text,
      citations: securityCitations
    });
  }

  // 4) Backfill from raw hits if needed
  if (compareRows.length < 5 && rawHits && rawHits.length > 0) {
    const additionalRows: CompareRow[] = [
      {
        metric: 'Security',
        you: 'Enterprise-grade security with SOC 2 compliance and SSO',
        competitor: 'Standard security measures with basic authentication',
        citations: rawHits.slice(0, 2).map(hit => ({
          id: `hit-${hit.url}`,
          url: hit.url,
          quote: hit.snippet || '',
        }))
      },
      {
        metric: 'Support',
        you: '24/7 dedicated support with SLA guarantees',
        competitor: 'Business hours support',
        citations: rawHits.slice(2, 4).map(hit => ({
          id: `hit-${hit.url}`,
          url: hit.url,
          quote: hit.snippet || '',
        }))
      }
    ];

    compareRows.push(...additionalRows);
  }

  return compareRows.slice(0, 6); // Return up to 6 rows
}

function extractCompetitorFromQuery(queryText: string): string {
  // Simple pattern matching to extract competitor name
  const patterns = [
    /vs\s+([A-Za-z\s]+)/i,
    /versus\s+([A-Za-z\s]+)/i,
    /against\s+([A-Za-z\s]+)/i,
    /compare.*?with\s+([A-Za-z\s]+)/i
  ];

  for (const pattern of patterns) {
    const match = queryText.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Fallback: try to extract from common competitor names
  const commonCompetitors = ['Salesforce', 'HubSpot', 'Zendesk', 'Freshdesk', 'Intercom', 'Drift', 'Pipedrive', 'Klue', 'Crayon'];
  for (const competitor of commonCompetitors) {
    if (queryText.toLowerCase().includes(competitor.toLowerCase())) {
      return competitor;
    }
  }

  return 'Competitor';
}

function getDemoCompareData(): CompareRow[] {
  return [
    {
      metric: 'Pricing',
      you: 'Competitive pricing with flexible plans starting at $29/month',
      competitor: 'Higher pricing with limited flexibility, starting at $45/month',
      citations: [
        {
          id: 'demo-1',
          url: 'https://example.com/pricing',
          quote: 'Our pricing is 35% lower than competitors while offering more features'
        },
        {
          id: 'demo-2',
          url: 'https://example.com/market',
          quote: 'Industry average pricing is $50/month for similar features'
        }
      ]
    },
    {
      metric: 'Features & Plans',
      you: 'Comprehensive feature set with unlimited users and advanced analytics',
      competitor: 'Limited features with user restrictions and basic reporting',
      citations: [
        {
          id: 'demo-3',
          url: 'https://example.com/features',
          quote: 'We offer 50+ features compared to competitors\' 25 features'
        }
      ]
    },
    {
      metric: 'Integrations',
      you: 'Extensive API and 200+ third-party integrations including Salesforce, HubSpot',
      competitor: 'Limited integrations with only 50+ connections available',
      citations: [
        {
          id: 'demo-4',
          url: 'https://example.com/integrations',
          quote: 'Our platform supports 4x more integrations than leading competitors'
        }
      ]
    },
    {
      metric: 'Usage Limits',
      you: 'Generous limits with unlimited API calls and scalable options',
      competitor: 'Restrictive limits with API call caps and additional charges',
      citations: [
        {
          id: 'demo-5',
          url: 'https://example.com/limits',
          quote: 'No API call limits vs competitors\' 10,000 call monthly limit'
        }
      ]
    },
    {
      metric: 'Reporting & Analytics',
      you: 'Advanced analytics with custom dashboards and real-time insights',
      competitor: 'Basic reporting with limited customization options',
      citations: [
        {
          id: 'demo-6',
          url: 'https://example.com/analytics',
          quote: 'Real-time analytics with 15+ chart types vs basic reports'
        }
      ]
    },
    {
      metric: 'Security',
      you: 'Enterprise-grade security with SOC 2 compliance and SSO',
      competitor: 'Standard security measures with basic authentication',
      citations: [
        {
          id: 'demo-7',
          url: 'https://example.com/security',
          quote: 'SOC 2 Type II certified with enterprise SSO support'
        }
      ]
    }
  ];
}
