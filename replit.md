# Overview

VoterVault is a comprehensive contact management system designed for political organizations and campaigns. It provides secure, role-based access to voter and supporter databases with advanced search capabilities, audit tracking, and multi-user collaboration features. The application allows users to search contacts using intelligent name matching (including nicknames), manage contact details, import data from Excel files, and maintain complete audit trails of all changes.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built using React with TypeScript and follows a component-based architecture. It uses Wouter for client-side routing and TanStack Query for server state management. The UI is styled with Tailwind CSS and utilizes shadcn/ui components for consistent design. The application implements a responsive design with modular components organized into logical sections (admin, search, profile, layout).

## Backend Architecture  
The backend is built with Express.js and TypeScript, following a RESTful API pattern. The server implements a layered architecture with separate concerns for routing, business logic (services), and data access (storage). Key services include:
- **Search Service**: Handles intelligent contact searching with nickname matching and fuzzy search capabilities
- **Excel Service**: Manages bulk data imports from Excel files with validation and duplicate detection
- **Audit Service**: Tracks all data changes for compliance and accountability

## Database Design
The system uses PostgreSQL with Drizzle ORM for type-safe database operations. The schema includes:
- **Users table**: Stores user authentication and role information
- **Contacts table**: Main entity storing contact information with privacy-compliant voter ID handling
- **Related tables**: Contact phones, emails, and aliases for flexible contact management
- **Audit logs**: Complete change tracking with user attribution
- **Sessions table**: Secure session management for authentication

## Authentication & Authorization
Implements Replit's OpenID Connect (OIDC) authentication with role-based access control (RBAC). Three user roles are supported:
- **Admin**: Full system access including user management and data imports
- **Editor**: Can search and modify contact information
- **Viewer**: Read-only access to contact data

Session management uses PostgreSQL-backed sessions with secure cookie configuration.

## Data Security & Privacy
The system implements privacy-first design principles:
- Voter IDs are hashed for duplicate detection while maintaining privacy
- Redacted display of sensitive identifiers
- Role-based data access controls
- Comprehensive audit logging for compliance
- Secure file upload handling with type validation

# External Dependencies

## Database
- **Neon Database**: PostgreSQL hosting service accessed via `@neondatabase/serverless`
- **Drizzle ORM**: Type-safe database operations and migrations

## Authentication
- **Replit Auth**: OpenID Connect authentication provider
- **Express Session**: Session management with PostgreSQL storage via `connect-pg-simple`

## UI Framework
- **React**: Frontend framework with TypeScript
- **Radix UI**: Accessible component primitives for the design system
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built component library

## Data Processing
- **xlsx**: Excel file parsing and processing for bulk imports
- **Fuse.js**: Fuzzy search implementation for intelligent contact matching

## Development Tools
- **Vite**: Build tool and development server
- **TanStack Query**: Server state management and caching
- **Zod**: Runtime type validation for API schemas