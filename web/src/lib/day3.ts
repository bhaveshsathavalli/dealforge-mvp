// Day 3 utilities for claims extraction, embedding generation, and clustering

export type Claim = {
  text: string;
  kind: "objection" | "benefit" | "comparison";
  polarity?: "pro" | "con";
};

export type Day3Result = {
  claims: Claim[];
  embedding: number[] | null;
  clusters?: {
    id: string;
    label: string;
    score: number | null;
    count: number | null;
    items: {
      rawHitId: string;
      claimText: string | null;
    }[];
  }[];
};

/**
 * Extract claims from raw hit content
 */
export async function extractClaims(rawHit: {
  title: string;
  snippet?: string | null;
  html?: string | null;
}): Promise<Claim[]> {
  try {
    // Simple mock implementation - in real scenario, this would use AI/ML
    const content = `${rawHit.title} ${rawHit.snippet || ""}`.toLowerCase();
    const claims: Claim[] = [];

    // Mock claim extraction based on keywords
    if (
      content.includes("expensive") ||
      content.includes("cost") ||
      content.includes("price")
    ) {
      claims.push({
        text: "Mentions pricing concerns",
        kind: "objection",
        polarity: "con",
      });
    }

    if (
      content.includes("fast") ||
      content.includes("quick") ||
      content.includes("speed")
    ) {
      claims.push({
        text: "Highlights speed benefits",
        kind: "benefit",
        polarity: "pro",
      });
    }

    if (
      content.includes("better than") ||
      content.includes("vs") ||
      content.includes("compared to")
    ) {
      claims.push({
        text: "Makes comparison claims",
        kind: "comparison",
        polarity: "pro",
      });
    }

    // Default claim if no specific patterns found
    if (claims.length === 0) {
      claims.push({
        text: rawHit.title.substring(0, 100),
        kind: "benefit",
        polarity: "pro",
      });
    }

    return claims;
  } catch (error) {
    console.error("Error extracting claims:", error);
    return [];
  }
}

/**
 * Generate embedding for raw hit content
 */
export async function generateEmbedding(rawHit: {
  title: string;
  snippet?: string | null;
  html?: string | null;
}): Promise<number[] | null> {
  try {
    // Mock embedding generation - in real scenario, this would use OpenAI/Cohere/etc.
    const content = `${rawHit.title} ${rawHit.snippet || ""}`;

    // Generate a mock 1536-dimensional vector based on content hash
    const hash = content.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    const embedding = Array.from({ length: 1536 }, (_, i) => {
      return Math.sin(hash + i) * 0.1; // Normalize to small values
    });

    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

/**
 * Perform clustering on embeddings
 */
export async function performClustering(
  rawHits: Array<{ id: string; embedding: number[] | null; claims: Claim[] }>,
): Promise<Day3Result["clusters"]> {
  try {
    const validHits = rawHits.filter((hit) => hit.embedding !== null);

    if (validHits.length < 2) {
      return [];
    }

    // Simple mock clustering - in real scenario, this would use K-means, DBSCAN, etc.
    const clusters: Day3Result["clusters"] = [];

    // Group by claim types
    const claimGroups = new Map<string, typeof validHits>();

    validHits.forEach((hit) => {
      hit.claims.forEach((claim) => {
        const key = `${claim.kind}-${claim.polarity || "neutral"}`;
        if (!claimGroups.has(key)) {
          claimGroups.set(key, []);
        }
        claimGroups.get(key)!.push(hit);
      });
    });

    // Create clusters from groups
    let clusterId = 1;
    for (const [label, hits] of claimGroups) {
      if (hits.length > 0) {
        clusters.push({
          id: `cluster-${clusterId++}`,
          label: label.replace("-", " "),
          score: Math.random() * 0.5 + 0.5, // Mock score between 0.5-1.0
          count: hits.length,
          items: hits.map((hit) => ({
            rawHitId: hit.id,
            claimText: hit.claims[0]?.text || null,
          })),
        });
      }
    }

    return clusters;
  } catch (error) {
    console.error("Error performing clustering:", error);
    return [];
  }
}

/**
 * Check if clustering feature is enabled
 */
export function isClusteringEnabled(): boolean {
  return process.env.ENABLE_CLUSTERS === "true";
}
