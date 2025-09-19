# DealForge — UI Design (MVP)

**Default Launch UI:** **Option A – Light Mode** (clean, modern).  
**Option B – Dark Mode** ships later as a toggle. Branding uses the **DealForge Shield**.

## Navigation (left sidebar)
- Dashboard
- Competitors
- Battlecards
- Updates Feed
- Settings  
(Order and labels are fixed for MVP.)

## App Shell
Two-column layout: left sidebar (brand/title + nav), main content on the right. Light theme as default; hide dark-mode toggle in MVP.

## Pages

### Dashboard
- Light theme cards for quick stats (runs today, avg p95, cost), plus primary search box.

### Competitors
- Card/list of competitors (seed set: **Klue, Crayon, Kompyte, Gong, Highspot**). Clicking a competitor opens its battlecard. Enforce caps messaging when attempting a 6th on Starter.

### Results (from run)
- Bullets: concise + persuasive; **≥2 citation chips per bullet** with modal showing quote + deep link. CTAs: Compare, Battlecard.

### Compare (X vs Y)
- Two-column table (tiers/limits/renewal/integrations), each cell has a citation popover; **≥5 populated rows**.

### Battlecard
- Sections: Positioning, Strengths, Weaknesses, Landmines, Objection Counters, Pricing Snapshot; supports **user-added citations** (flagged).

### Updates Feed
- Chronological cards linking into battlecards; show mini-citations.

### Settings
- Org name, plan, caps (`max_users`, `max_competitors`), member invites (email), billing placeholder; verify **RLS** isolation.

## Data & Security Expectations (for UI)
- UI assumes **RLS per org**; all reads/writes scoped via membership.
- Plan caps enforced by backend (Starter: users=5, competitors=5). Show helpful blocking messages in UI.

## Acceptance (click-tests)
- Bullets show **≥2** citation chips.  
- Compare has **≥5** rows with primary sources.  
- Battlecard accepts **user-added citations** (visually flagged).  
- RLS isolation holds when inviting users to another org.
