"use client";

type Props = {
  orgName: string;
  planType: string;
  maxUsers: number | null;
  maxCompetitors: number | null;
  competitorsUsed: number;
  usersUsed: number;
};

export default function PlanCard({
  orgName,
  planType,
  maxUsers,
  maxCompetitors,
  competitorsUsed,
  usersUsed,
}: Props) {
  const usersUsedValue = typeof usersUsed === "number" ? usersUsed : 0;
  const usersLimitValue = typeof maxUsers === "number" ? maxUsers : 0;
  const usersDisplay = `${usersUsedValue} / ${usersLimitValue}`;

  const compUsed = typeof competitorsUsed === "number" ? competitorsUsed : 0;
  const compMax  = typeof maxCompetitors === "number" ? maxCompetitors : 0;
  const compsDisplay = `${compUsed} / ${compMax}`;

  return (
    <div className="rounded-lg border p-4 space-y-2
           bg-white border-df-lightBorder
           dark:bg-[var(--df-dark-card)] dark:border-[var(--df-dark-border)]">
      <div className="text-sm text-muted-foreground">Organisation</div>
      <div className="text-lg font-medium">{orgName}</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-sm">
          <div className="text-muted-foreground">Users</div>
          <div className="font-medium">{usersDisplay}</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground">Competitors</div>
          <div className="font-medium">{compsDisplay}</div>
        </div>
      </div>
    </div>
  );
}
