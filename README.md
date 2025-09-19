# DealForge MVP

**AI-powered competitive intelligence platform with comprehensive design tokens system**

## 🚀 Overview

DealForge is a Next.js-based competitive intelligence platform that helps sales teams gather and analyze competitor information. This MVP includes a complete design tokens system, authentication, and core functionality for managing competitive research.

## ✨ Features

### 🎨 Design System
- **Complete Design Tokens**: CSS variables for light/dark themes
- **Tailwind Integration**: Custom color mappings with CSS variables
- **Accessibility**: Focus rings, reduced motion support, proper contrast
- **Theme Support**: Light/dark theme switching (ready for implementation)

### 🔐 Authentication & Security
- **Clerk Authentication**: Complete user management
- **Organization Support**: Multi-tenant architecture
- **Supabase Integration**: Secure database with RLS policies

### 📊 Core Functionality
- **Competitor Management**: Add, edit, and organize competitors
- **Search Runs**: Execute competitive research queries
- **Results Analysis**: View and analyze search results
- **Dashboard**: Overview of all activities

### 🛠 Technical Stack
- **Next.js 15**: App Router with TypeScript
- **Tailwind CSS**: Styled with design tokens
- **Supabase**: Database and authentication
- **Clerk**: User management and orgs
- **Prisma**: Database ORM (legacy)

## 📁 Project Structure

```
├── web/                          # Main application
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── (app)/           # Protected app routes
│   │   │   ├── (auth)/          # Authentication routes
│   │   │   ├── api/             # API routes
│   │   │   └── providers/       # React providers
│   │   ├── components/          # Reusable components
│   │   ├── lib/                 # Utilities and helpers
│   │   └── config/              # Configuration files
│   ├── styles/
│   │   └── tokens.css           # Design tokens CSS
│   ├── migrations/               # Database migrations
│   ├── docs/                    # Documentation
│   └── scripts/                 # Development scripts
├── web.backup-2025-09-06/       # Previous project backup
└── package.json                 # Root package configuration
```

## 🎨 Design Tokens

The design system includes comprehensive CSS variables for:

### Colors
- **Base**: `bg`, `surface`, `surface-alt`, `text`, `muted`, `subtle`
- **Borders**: `border`, `divider`
- **Primary**: `primary`, `primary-weak`, `primary-strong`
- **Status**: `success`, `warning`, `danger`, `info`
- **Accents**: `accent-dashboard`, `accent-competitors`, `accent-battlecards`, `accent-updates`, `accent-settings`

### Usage
```css
/* Use in CSS */
.my-component {
  background-color: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}
```

```tsx
// Use in Tailwind
<div className="bg-surface text-text border-border">
  Content with design tokens
</div>
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Clerk account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bhaveshsathavalli/dealforge-mvp.git
   cd dealforge-mvp
   ```

2. **Install dependencies**
   ```bash
   cd web
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.template .env.local
   # Fill in your Supabase and Clerk credentials
   ```

4. **Database setup**
   ```bash
   # Run migrations
   npm run db:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 📚 Documentation

- [Database Setup](web/DATABASE_SETUP.md)
- [Authentication Migration](web/docs/AUTH_MIGRATION.md)
- [DealForge MVP Spec](web/docs/DealForge_MVP.md)
- [UI Design Spec](web/docs/DealForge_UI.md)

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Design Token Development
The design tokens are defined in `web/styles/tokens.css` and integrated with Tailwind in `web/tailwind.config.ts`. All components should use these tokens instead of hardcoded colors.

## 📦 Backup Information

This repository includes:
- **Current Implementation**: Complete DealForge MVP with design tokens
- **Previous Backup**: `web.backup-2025-09-06/` contains the previous project state
- **Comprehensive History**: All development iterations preserved

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🔗 Links

- **Repository**: https://github.com/bhaveshsathavalli/dealforge-mvp
- **Live Demo**: [Coming Soon]

---

**DealForge MVP** - Building the future of competitive intelligence 🚀
