"use client";

/**
 * Renders the DealForge shield.
 * - Serves SVG from /public (fast, cacheable)
 * - Falls back to PNG if the SVG 404s or fails to decode
 */
export function Logo({ size = 24, className = "" }: { size?: number; className?: string }) {
  // We use <img> (not next/image) so we can do onError fallback for SVG reliably.
  return (
    <img
      src="/brand/dealforge-shield.svg"
      width={size}
      height={size}
      alt="DealForge"
      className={className}
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        if (!img.dataset.fallback) {
          img.dataset.fallback = "1";
          img.src = "/brand/dealforge-shield.png";
        }
      }}
    />
  );
}
