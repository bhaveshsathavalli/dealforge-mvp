# DealForge Diagrams

## Data Pipelines

### Legacy Pipeline
```mermaid
flowchart LR
  A[User Query] --> B[SerpAPI Search]
  B --> C[raw_hits Table]
  C --> D[LLM Classification]
  D --> E[claims + citations]
  E --> F[Results/Compare UI]
```

### Facts Pipeline
```mermaid
flowchart LR
  A[Trigger] --> B[Direct Web Crawl]
  B --> C[vendors/sources/facts]
  C --> D[compare_runs/rows]
  D --> E[Compare UI + Battlecards]
```

## UI Navigation Flow
```mermaid
graph TD
  Sidebar[Sidebar] --> Dashboard
  Sidebar --> Competitors
  Sidebar --> Battlecards
  Sidebar --> Runs
  Sidebar --> Updates
  Sidebar --> Settings
  Dashboard --> StartRun
  Runs --> Compare
```

## Authentication Flow
```mermaid
sequenceDiagram
  participant U as User
  participant C as Clerk
  participant A as App
  participant S as Supabase
  
  U->>C: Sign in
  C->>A: JWT token
  A->>S: Service role request
  S->>A: Data with RLS
  A->>U: Authenticated content
```

## Database Relationships
```mermaid
erDiagram
  VENDORS ||--o{ SOURCES : has
  VENDORS ||--o{ FACTS : contains
  VENDORS ||--o{ UPDATE_EVENTS : generates
  COMPARE_RUNS ||--o{ COMPARE_ROWS : contains
  COMPARE_RUNS ||--o{ BATTLECARD_BULLETS : generates
  COMPARE_RUNS ||--o{ PERSONAL_SAVES : saves
  COMPARE_RUNS ||--o{ ORG_SNAPSHOTS : saves
  
  VENDORS {
    uuid id PK
    uuid org_id FK
    string name
    string website
    int official_site_confidence
  }
  
  SOURCES {
    uuid id PK
    uuid vendor_id FK
    string metric
    string url
    string title
    text body
    timestamp fetched_at
  }
  
  FACTS {
    uuid id PK
    uuid vendor_id FK
    string metric
    string key
    string value
    jsonb citations
    float fact_score
  }
  
  COMPARE_RUNS {
    uuid id PK
    uuid org_id FK
    uuid you_vendor_id FK
    uuid comp_vendor_id FK
    int version
    timestamp created_at
  }
```

## Web Crawling Process
```mermaid
flowchart TD
  A[Start Crawl] --> B[Seed URLs]
  B --> C[Fetch Page]
  C --> D{Is HTML?}
  D -->|No| E[Skip]
  D -->|Yes| F[Extract Content]
  F --> G[Classify Page]
  G --> H{Target Metric?}
  H -->|No| I[Extract Links]
  H -->|Yes| J[Save Source]
  I --> K[Add to Queue]
  K --> L{Max Depth?}
  L -->|No| C
  L -->|Yes| M[Finish]
  J --> M
```

## Facts Extraction Pipeline
```mermaid
flowchart TD
  A[Source Page] --> B[Parse HTML]
  B --> C[Extract Pricing]
  B --> D[Extract Features]
  B --> E[Extract Integrations]
  C --> F[Validate Facts]
  D --> F
  E --> F
  F --> G{Confidence > 0.7?}
  G -->|Yes| H[Save to Facts Table]
  G -->|No| I[Skip]
  H --> J[Generate Citations]
  J --> K[Update Compare Rows]
```

## API Request Flow
```mermaid
sequenceDiagram
  participant C as Client
  participant A as API Route
  participant Auth as Clerk Auth
  participant DB as Supabase
  participant Ext as External API
  
  C->>A: POST /api/runs/start
  A->>Auth: Verify user/org
  Auth->>A: Return auth context
  A->>DB: Insert run record
  DB->>A: Return run ID
  A->>Ext: Start collection (async)
  A->>C: Return run ID
  Ext->>DB: Update run status
```

## Component Hierarchy
```mermaid
graph TD
  RootLayout[RootLayout] --> ClerkProvider[ClerkProvider]
  ClerkProvider --> AppLayout[AppLayout]
  AppLayout --> Sidebar[Sidebar]
  AppLayout --> MainContent[MainContent]
  MainContent --> DashboardPage[DashboardPage]
  MainContent --> CompetitorsPage[CompetitorsPage]
  MainContent --> ComparePage[ComparePage]
  ComparePage --> CompareTable[CompareTable]
  CompareTable --> AnswerScoreBadge[AnswerScoreBadge]
  CompareTable --> CitationChip[CitationChip]
```
