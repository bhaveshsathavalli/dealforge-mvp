export type FeatureSlug =
  | 'sso' | 'idp_okta' | 'idp_azuread' | 'idp_google'
  | 'scim' | 'audit_logs' | 'api' | 'webhooks'
  | 'data_residency' | 'hipaa_baa' | 'soc2' | 'iso27001'
  | 'sla' | 'mfa' | 'okta_scim' | 'search_export' | 'roles_permissions';

export const Canonical: Record<FeatureSlug, RegExp[]> = {
  sso: [/sso|single\s*sign/i, /saml/i],
  idp_okta: [/okta/i],
  idp_azuread: [/azure\s*ad|entra/i],
  idp_google: [/google\s*workspace|gsuite/i],
  scim: [/scim|provision/i],
  audit_logs: [/audit log/i],
  api: [/\bapi\b/i],
  webhooks: [/webhook/i],
  data_residency: [/data\s*residen|eu\s*data|region/i],
  hipaa_baa: [/hipaa|baa/i],
  soc2: [/soc\s*2/i],
  iso27001: [/iso\s*27001/i],
  sla: [/\bsla\b|uptime/i],
  mfa: [/\bmfa\b|multi[-\s]?factor/i],
  okta_scim: [/okta.*scim/i],
  search_export: [/export|ediscovery|legal hold/i],
  roles_permissions: [/role|permission|rbac/i],
};

export function canonicalizeFeature(text: string): FeatureSlug | null {
  const s = text.toLowerCase();
  for (const [slug, res] of Object.entries(Canonical) as [FeatureSlug, RegExp[]][]) {
    if (res.some(r => r.test(s))) return slug;
  }
  return null;
}

export type Support = 'native'|'via_integration'|'limited'|'paid_addon'|'no';

export function inferSupport(text: string): Support {
  const s = text.toLowerCase();
  if (/no\b|not\s+available|unsupported/.test(s)) return 'no';
  if (/via|through|with\s+zapier|integration/i.test(s)) return 'via_integration';
  if (/enterprise|business\+|pro\s+only|add[-\s]?on|coming soon/i.test(s)) return /add[-\s]?on/.test(s) ? 'paid_addon' : 'limited';
  return 'native';
}

export function parsePlansFromText(text: string): string[] {
  const matches = new Set<string>();
  (text.match(/(free|pro|team|business\+?|enterprise|essentials)/gi) || []).forEach(x => matches.add(x[0].toUpperCase()+x.slice(1).toLowerCase()));
  return Array.from(matches);
}
