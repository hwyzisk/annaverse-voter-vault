# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
AnnaVerse (formerly VoterVault) is a comprehensive contact management system for political organizations. It provides secure, role-based access to voter/supporter databases with intelligent search, audit tracking, and multi-user collaboration.

## Development Commands

### Core Development
- `npm run dev` - Start development server (runs backend on port 3000, frontend via Vite)
- `npm run build` - Build for production (Vite build + esbuild for server)
- `npm start` - Start production server
- `npm run check` - TypeScript type checking

### Database Operations
- `npm run db:push` - Push schema changes to database using Drizzle Kit
- Database schema is defined in `shared/schema.ts`
- Uses Neon PostgreSQL with connection via `DATABASE_URL` environment variable

## Architecture Overview

### Monorepo Structure
```
├── client/          # React frontend (Vite)
│   └── src/
│       ├── components/  # UI components organized by feature
│       │   ├── admin/   # Admin-specific components
│       │   ├── layout/  # Layout and navigation
│       │   ├── profile/ # User profile management
│       │   ├── search/  # Contact search functionality
│       │   └── ui/      # Reusable UI components (shadcn/ui)
│       └── pages/       # Main application pages
├── server/          # Express.js backend
│   ├── services/    # Business logic services
│   │   ├── auditService.ts     # Change tracking
│   │   ├── optimizedExcelService.ts # Excel import/export with high performance
│   │   └── searchService.ts    # Intelligent contact search
│   ├── routes.ts    # API route definitions
│   ├── storage.ts   # Database operations layer
│   └── authService.ts # Authentication logic
└── shared/          # Shared types and schemas
    └── schema.ts    # Drizzle database schema + Zod validation
```

### Key Technologies
- **Frontend**: React 18 + TypeScript, Wouter (routing), TanStack Query (server state), Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript, session-based auth with Passport.js
- **Database**: PostgreSQL via Neon, Drizzle ORM for type-safe operations
- **Authentication**: Replit OpenID Connect + local email/password
- **Build**: Vite (frontend), esbuild (backend), TypeScript compilation

### Authentication & Authorization
- Three user roles: `admin`, `editor`, `viewer`
- Session-based authentication using PostgreSQL session store
- Users go through approval workflow (pending → approved/rejected)
- Replit Auth integration for hosted environments

### Data Management
- Contact search with fuzzy matching and nickname support (Fuse.js)
- Excel import/export with duplicate detection and validation
- Comprehensive audit logging for all data changes
- Privacy-compliant voter ID hashing

## Development Patterns

### API Structure
- RESTful endpoints in `server/routes.ts`
- Request/response validation using Zod schemas from `shared/schema.ts`
- Error handling with consistent JSON error responses
- Authentication middleware for protected routes

### Frontend State Management
- TanStack Query for server state (caching, background updates)
- React hooks for local component state
- Context providers for global app state (auth, theme)

### Database Operations
- Type-safe queries using Drizzle ORM
- Schema changes via migrations in `migrations/` directory
- Connection pooling via `@neondatabase/serverless`

### Component Architecture
- Feature-based component organization
- Reusable UI components from shadcn/ui
- Form handling with react-hook-form + Zod validation
- Responsive design with Tailwind CSS

## Common Development Tasks

### Adding New Features
1. Define database schema changes in `shared/schema.ts`
2. Run `npm run db:push` to apply schema changes
3. Add API endpoints in `server/routes.ts`
4. Create service functions in appropriate `server/services/` file
5. Build frontend components in `client/src/components/`
6. Add pages in `client/src/pages/` if needed

### Working with Database
- Schema definitions use Drizzle ORM syntax
- Generate Zod schemas with `createInsertSchema`/`createSelectSchema`
- Database operations go through `server/storage.ts` abstraction layer
- Always use transactions for multi-table operations

### Styling and UI
- Use existing shadcn/ui components when possible
- Custom styles with Tailwind utility classes
- Theme support via `next-themes` (light/dark mode)
- Icons from `lucide-react` and `react-icons`

### File Upload Handling
- Excel imports via `multer` middleware
- File validation and processing in `optimizedExcelService.ts`
- Temporary file cleanup after processing

## Environment Configuration
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPLIT_DB_URL` - Replit Auth configuration
- Production deployment expects these in environment variables