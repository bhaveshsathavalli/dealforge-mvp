// web/src/app/api/clerk/webhook/route.ts
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';
import { ensureOrgProductDefaults } from '@/server/org';

function normalizeRole(r?: string): 'admin' | 'member' {
  if (!r) return 'member';
  const v = r.toLowerCase();
  // Clerk may return "org:admin" | "org:member" | "admin" | "member"
  if (v.includes('admin')) return 'admin';
  return 'member';
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const payload = await req.text();
  const h = await headers();
  const svixId = h.get('svix-id');
  const svixTimestamp = h.get('svix-timestamp');
  const svixSignature = h.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 });
  }

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let evt: any;
  try {
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const { type, data } = evt;

  try {
    switch (type) {
      case 'organization.created':
      case 'organization.updated': {
        const { id: clerk_org_id, name, slug } = data;
        const { data: orgData, error } = await supabase.from('orgs').upsert(
          { 
            clerk_org_id, 
            name, 
            slug, 
            plan_type: 'starter',
            updated_at: new Date().toISOString() 
          },
          { onConflict: 'clerk_org_id' }
        ).select('id').single();
        
        if (error) {
          console.error(`Webhook ${type} failed for org ${clerk_org_id}:`, error);
        } else {
          console.log(`Webhook ${type} success for org ${clerk_org_id}`);
          
          // Set default product values for new orgs
          if (orgData?.id) {
            try {
              await ensureOrgProductDefaults(supabase, orgData.id);
            } catch (e) {
              console.warn(`Failed to set default product values for org ${orgData.id}:`, e);
            }
          }
        }
        break;
      }
      case 'organization.deleted': {
        const { id: clerk_org_id } = data;
        // If you prefer soft delete, add a deleted_at column and set it here.
        await supabase.from('orgs').delete().eq('clerk_org_id', clerk_org_id);
        break;
      }
      case 'organizationMembership.created':
      case 'organizationMembership.updated': {
        const { organization, public_user_data, role } = data;
        const clerk_org_id = organization.id;
        const clerk_user_id = public_user_data.user_id;
        
        try {
          // 1) Upsert orgs by clerk_org_id (name/slug if present)
          const { error: orgError } = await supabase.from('orgs').upsert({
            clerk_org_id: organization.id,
            name: organization.name,
            slug: organization.slug,
            updated_at: new Date().toISOString()
          }, { onConflict: 'clerk_org_id' });
          
          if (orgError) {
            console.error(`Webhook ${type} org upsert failed for org ${clerk_org_id}:`, {
              code: orgError.code,
              message: orgError.message,
              details: orgError.details,
              hint: orgError.hint
            });
            return NextResponse.json({ ok: true }); // Don't retry storm
          }

          // 2) Upsert profiles by clerk_user_id (email/fullName/image)
          const { error: profileError } = await supabase.from('profiles').upsert({
            clerk_user_id,
            email: public_user_data.email_addresses?.[0]?.email_address,
            name: public_user_data.full_name,
            image_url: public_user_data.image_url,
            updated_at: new Date().toISOString()
          }, { onConflict: 'clerk_user_id' });
          
          if (profileError) {
            console.error(`Webhook ${type} profile upsert failed for user ${clerk_user_id}:`, {
              code: profileError.code,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint
            });
            return NextResponse.json({ ok: true }); // Don't retry storm
          }

          // 3) Upsert org_memberships with conflict target 'clerk_user_id' (one-org-per-user rule)
          const { error: membershipError } = await supabase.from('org_memberships').upsert(
            {
              clerk_org_id,
              clerk_user_id,
              role: normalizeRole(role),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'clerk_user_id' }
          );
          
          if (membershipError) {
            console.error(`Webhook ${type} membership upsert failed for user ${clerk_user_id} in org ${clerk_org_id}:`, {
              code: membershipError.code,
              message: membershipError.message,
              details: membershipError.details,
              hint: membershipError.hint
            });
            return NextResponse.json({ ok: true }); // Don't retry storm
          }

          console.log(`Webhook membership mirrored ok: {clerk_org_id: ${clerk_org_id}, clerk_user_id: ${clerk_user_id}, role: ${normalizeRole(role)}}`);
        } catch (e) {
          console.error(`Webhook ${type} failed for user ${clerk_user_id} in org ${clerk_org_id}:`, {
            error: e,
            message: e instanceof Error ? e.message : 'Unknown error'
          });
          return NextResponse.json({ ok: true }); // Don't retry storm
        }
        break;
      }
      case 'organizationMembership.deleted': {
        const { organization, public_user_data } = data;
        const clerk_org_id = organization.id;
        const clerk_user_id = public_user_data.user_id;
        await supabase.from('org_memberships').delete().match({ clerk_org_id, clerk_user_id });
        break;
      }
      case 'organizationInvitation.accepted': {
        const { organization, public_user_data, role } = data;
        const clerk_org_id = organization.id;
        const clerk_user_id = public_user_data.user_id;
        
        try {
          // 1) Upsert orgs by clerk_org_id (name/slug if present)
          const { error: orgError } = await supabase.from('orgs').upsert({
            clerk_org_id: organization.id,
            name: organization.name,
            slug: organization.slug,
            updated_at: new Date().toISOString()
          }, { onConflict: 'clerk_org_id' });
          
          if (orgError) {
            console.error(`Webhook ${type} org upsert failed for org ${clerk_org_id}:`, {
              code: orgError.code,
              message: orgError.message,
              details: orgError.details,
              hint: orgError.hint
            });
            return NextResponse.json({ ok: true }); // Don't retry storm
          }

          // 2) Upsert profiles by clerk_user_id (email/fullName/image)
          const { error: profileError } = await supabase.from('profiles').upsert({
            clerk_user_id,
            email: public_user_data.email_addresses?.[0]?.email_address,
            name: public_user_data.full_name,
            image_url: public_user_data.image_url,
            updated_at: new Date().toISOString()
          }, { onConflict: 'clerk_user_id' });
          
          if (profileError) {
            console.error(`Webhook ${type} profile upsert failed for user ${clerk_user_id}:`, {
              code: profileError.code,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint
            });
            return NextResponse.json({ ok: true }); // Don't retry storm
          }

          // 3) Upsert org_memberships with conflict target 'clerk_user_id' (one-org-per-user rule)
          const { error: membershipError } = await supabase.from('org_memberships').upsert(
            {
              clerk_org_id,
              clerk_user_id,
              role: normalizeRole(role),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'clerk_user_id' }
          );
          
          if (membershipError) {
            console.error(`Webhook ${type} membership upsert failed for user ${clerk_user_id} in org ${clerk_org_id}:`, {
              code: membershipError.code,
              message: membershipError.message,
              details: membershipError.details,
              hint: membershipError.hint
            });
            return NextResponse.json({ ok: true }); // Don't retry storm
          }

          console.log(`Webhook membership mirrored ok: {clerk_org_id: ${clerk_org_id}, clerk_user_id: ${clerk_user_id}, role: ${normalizeRole(role)}}`);
        } catch (e) {
          console.error(`Webhook ${type} failed for user ${clerk_user_id} in org ${clerk_org_id}:`, {
            error: e,
            message: e instanceof Error ? e.message : 'Unknown error'
          });
          return NextResponse.json({ ok: true }); // Don't retry storm
        }
        break;
      }
      case 'user.created':
      case 'user.updated': {
        const { id: clerk_user_id, email_addresses, primary_email_address_id, image_url, first_name, last_name } = data;
        const email = email_addresses?.find((e: any) => e.id === primary_email_address_id)?.email_address
          ?? email_addresses?.[0]?.email_address
          ?? null;
        const name = [first_name, last_name].filter(Boolean).join(' ') || null;
        const { error } = await supabase.from('profiles').upsert(
          { clerk_user_id, email, name, image_url, updated_at: new Date().toISOString() },
          { onConflict: 'clerk_user_id' }
        );
        if (error) {
          console.error(`Webhook ${type} failed for user ${clerk_user_id}:`, error);
        } else {
          console.log(`Webhook ${type} success for user ${clerk_user_id}`);
        }
        break;
      }
      case 'user.deleted': {
        const { id: clerk_user_id } = data;
        // Optional: cascade cleanups or soft-delete profile
        await supabase.from('profiles').delete().eq('clerk_user_id', clerk_user_id);
        await supabase.from('org_memberships').delete().eq('clerk_user_id', clerk_user_id);
        break;
      }
      default:
        // ignore other events
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Clerk webhook error', type, e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
