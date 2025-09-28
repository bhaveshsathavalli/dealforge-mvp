"use client";

export default function ManageSubscription() {
  return (
    <div className="rounded-lg border p-4 space-y-2
           bg-white border-df-lightBorder
           dark:bg-[var(--df-dark-card)] dark:border-[var(--df-dark-border)]">
      <div className="text-sm text-muted-foreground">Billing</div>
      <div className="flex items-center justify-between">
        <div className="text-lg font-medium">Manage subscription</div>
        <button
          className="px-3 py-2 rounded bg-muted text-muted-foreground cursor-not-allowed"
          aria-disabled="true"
          title="Stripe coming soon"
        >
          Coming soon
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        You'll be able to manage your plan and payment details here once Stripe is connected.
      </p>
    </div>
  );
}
