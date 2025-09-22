import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SavesPage() {
  const sb = await createClient();
  
  const { data: personalSaves } = await sb
    .from("personal_saves")
    .select(`
      id,
      name,
      created_at,
      base_run_id,
      base_run:compare_runs(
        you_vendor:vendors!compare_runs_you_vendor_id_fkey(name),
        comp_vendor:vendors!compare_runs_comp_vendor_id_fkey(name)
      )
    `)
    .order("created_at", { ascending: false });
    
  const { data: orgSnapshots } = await sb
    .from("org_snapshots")
    .select(`
      id,
      name,
      created_at,
      base_run_id,
      base_run:compare_runs(
        you_vendor:vendors!compare_runs_you_vendor_id_fkey(name),
        comp_vendor:vendors!compare_runs_comp_vendor_id_fkey(name)
      )
    `)
    .order("created_at", { ascending: false });
  
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-6">Saved Comparisons & Snapshots</h1>
      
      <section className="mb-8">
        <h2 className="text-xl font-medium mb-3">Your Personal Saves</h2>
        {personalSaves?.length === 0 ? (
          <p className="text-gray-500">No personal saves yet. Run a comparison and click "Save (Personal)".</p>
        ) : (
          <ul className="space-y-3">
            {personalSaves?.map((save: any) => (
              <li key={save.id} className="border rounded-lg p-4 shadow-sm flex items-center justify-between">
                <div>
                  <Link href={`/app/compare/${save.base_run_id}`} className="text-blue-600 hover:underline font-medium text-lg">
                    {save.name}
                  </Link>
                  <p className="text-sm text-gray-600">
                    {save.base_run?.you_vendor?.name} vs {save.base_run?.comp_vendor?.name}
                  </p>
                  <p className="text-xs text-gray-500">Saved: {new Date(save.created_at).toLocaleString()}</p>
                </div>
                <Link href={`/app/compare/${save.base_run_id}`} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      
      <section>
        <h2 className="text-xl font-medium mb-3">Organization Snapshots</h2>
        {orgSnapshots?.length === 0 ? (
          <p className="text-gray-500">No organization snapshots yet. Run a comparison and click "Save (Org)".</p>
        ) : (
          <ul className="space-y-3">
            {orgSnapshots?.map((snapshot: any) => (
              <li key={snapshot.id} className="border rounded-lg p-4 shadow-sm flex items-center justify-between">
                <div>
                  <Link href={`/app/compare/${snapshot.base_run_id}`} className="text-green-600 hover:underline font-medium text-lg">
                    {snapshot.name}
                  </Link>
                  <p className="text-sm text-gray-600">
                    {snapshot.base_run?.you_vendor?.name} vs {snapshot.base_run?.comp_vendor?.name}
                  </p>
                  <p className="text-xs text-gray-500">Saved: {new Date(snapshot.created_at).toLocaleString()}</p>
                </div>
                <Link href={`/app/compare/${snapshot.base_run_id}`} className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}