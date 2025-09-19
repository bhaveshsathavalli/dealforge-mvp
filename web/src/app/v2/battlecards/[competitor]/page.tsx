import { BattlecardLayout } from '@/components/templates/BattlecardLayout';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/Chip';
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import { buildBattlecard, addUserCitation } from '@/lib/battlecard';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

interface AddCitationFormProps {
  competitor: string;
  runId: string;
}

function AddCitationForm({ competitor, runId }: AddCitationFormProps) {
  return (
    <form action={async (formData) => {
      'use server';
      const result = await addUserCitation(runId, competitor, {
        source_url: formData.get('source_url') as string,
        anchor_text: formData.get('anchor_text') as string,
        quote: formData.get('quote') as string || undefined
      });
      
      if (result.success) {
        // Refresh the page to show the new citation
        redirect(`/v2/battlecards/${competitor}?runId=${runId}`);
      }
    }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">
          Source URL
        </label>
        <input
          name="source_url"
          type="url"
          required
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          placeholder="https://example.com"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">
          Title/Anchor Text
        </label>
        <input
          name="anchor_text"
          type="text"
          required
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          placeholder="Article title or description"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">
          Quote (Optional)
        </label>
        <textarea
          name="quote"
          rows={3}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          placeholder="Relevant quote from the source"
        />
      </div>
      
      <div className="flex gap-2">
        <Button type="submit" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Citation
        </Button>
      </div>
    </form>
  );
}

export default async function BattlecardV2Page({ 
  params, 
  searchParams 
}: { 
  params: { competitor: string };
  searchParams: { runId?: string };
}) {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  if (!orgId) {
    redirect('/welcome');
  }

  const runId = searchParams.runId || 'demo';
  const battlecard = await buildBattlecard(runId, params.competitor, { userId });

  if ('error' in battlecard) {
    return (
      <BattlecardLayout title="Error">
        <Card className="p-6">
          <p className="text-[var(--danger)]">{battlecard.error}</p>
        </Card>
      </BattlecardLayout>
    );
  }

  const { competitor, sections } = battlecard;

  return (
    <BattlecardLayout 
      title={`Battlecard - ${competitor}`}
      toolbar={
        <>
          <Button variant="outline" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Section
          </Button>
        </>
      }
    >
      {sections.map((section) => (
        <Card key={section.id} className="p-6">
          <SectionHeader 
            title={section.title}
            subtitle={section.content}
          >
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Plus className="h-3 w-3" />
                Add Citation
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Edit className="h-3 w-3" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1 text-[var(--danger)] hover:text-[var(--danger)]">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </SectionHeader>
          
          <div className="mt-4">
            <h4 className="font-medium text-[var(--text)] mb-2">Citations</h4>
            <div className="space-y-2">
              {section.citations.map((citation) => (
                <div key={citation.id} className="flex items-center justify-between p-2 bg-[var(--surface-alt)] rounded">
                  <div className="flex items-center gap-2">
                    <a 
                      href={citation.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[var(--text)] hover:underline flex items-center gap-1"
                    >
                      {citation.anchor_text}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {citation.user_added && (
                      <Chip variant="primary" size="sm">User-added</Chip>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {/* Add Citation Form */}
              <div className="mt-4 p-4 border border-[var(--border)] rounded-lg">
                <h5 className="font-medium text-[var(--text)] mb-3">Add New Citation</h5>
                <AddCitationForm competitor={competitor} runId={runId} />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </BattlecardLayout>
  );
}
