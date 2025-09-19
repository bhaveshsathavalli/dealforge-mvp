import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 1) a demo project
  const project = await prisma.project.create({
    data: { name: "Demo Project", category: "test" },
  });

  // 2) a run under that project
  const run = await prisma.queryRun.create({
    data: { projectId: project.id, status: "done" },
  });

  // 3) a couple of raw hits
  const raw1 = await prisma.rawHit.create({
    data: {
      runId: run.id,
      source: "google",
      url: "https://example.com/1",
      title: "Example 1",
      snippet: "Price too high complaint",
    },
  });
  const raw2 = await prisma.rawHit.create({
    data: {
      runId: run.id,
      source: "google",
      url: "https://example.com/2",
      title: "Example 2",
      snippet: "Expensive for small teams",
    },
  });

  // 4) one cluster tying them together
  const cluster = await (prisma as any).cluster.create({
    data: { runId: run.id, label: "Price objections", score: 0.9, count: 2 },
  });

  await (prisma as any).clusterItem.create({
    data: {
      clusterId: cluster.id,
      rawHitId: raw1.id,
      claimText: "Too expensive",
    },
  });
  await (prisma as any).clusterItem.create({
    data: {
      clusterId: cluster.id,
      rawHitId: raw2.id,
      claimText: "Not affordable",
    },
  });

  console.log({ projectId: project.id, runId: run.id, clusterId: cluster.id });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
