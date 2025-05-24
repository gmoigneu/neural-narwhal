# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Package Manager**: pnpm (required)

```bash
# Install dependencies
pnpm install

# Development mode with hot reload
pnpm dev

# Type checking (both main + renderer processes)
pnpm typecheck

# Build for production
pnpm build

# Platform-specific builds
pnpm build:win    # Windows
pnpm build:mac    # macOS
pnpm build:linux  # Linux

# Linting & formatting
pnpm lint
pnpm format
```

## Architecture Overview

**Neural Narwhal** is a local-first prompt manager built with Electron + React + TanStack Router. The application follows the Prompty specification for prompt storage and management.

### Tech Stack
- **Framework**: Electron 35+ with Vite for bundling
- **Frontend**: React 19 with TypeScript in strict mode
- **Routing**: TanStack Router with file-based routing and auto-code splitting
- **Styling**: TailwindCSS v4 + shadcn/ui components
- **Storage**: Local file system (Prompty .md files) + electron-store for app settings

### Key Architecture Components

**Main Process** (`src/main/index.ts`):
- Manages vault directory selection and persistence via electron-store
- Indexes .md files in folder structure, parsing YAML frontmatter
- Handles IPC for vault setup, folder indexing, and variable management
- Uses slugify for folder/prompt URL generation

**Preload Script** (`src/preload/index.ts`):
- Exposes secure IPC APIs via `window.api` with TypeScript safety
- Implements cleanup functions for event listeners (React useEffect friendly)
- Type definitions mirrored in `src/types/shared.d.ts`

**Renderer Process** (`src/renderer/src/`):
- React app with TanStack Router for navigation
- Global sidebar layout with folders, search, variables management
- Routes: `/`, `/folders/$folderSlug`, `/folders/$folderSlug/$promptSlug`, `/variable`

### Core Data Structures

```typescript
interface PromptFile {
  name: string        // "example.md"
  path: string        // Full file path
  slug: string        // URL-safe slugified name
  frontmatter?: Record<string, unknown>  // YAML metadata
  contentBody?: string  // Prompt content
  lastIndexed: number   // Timestamp
}

interface IndexedFolder {
  name: string        // Folder display name
  path: string        // Full folder path  
  slug: string        // URL-safe folder slug
  prompts: PromptFile[]
}
```

## Development Guidelines from .cursorrules

### Project Overview
- **App Name**: Prompt Manager
- **Platform**: Electron with Vite
- **Storage**: Local folder storage (user-selected) using Prompty specification
- **Configuration Storage**: Uses `electron-store` for persistent application settings, managed in the main process

### Key Features Implementation
- **Prompt Management**: Create, edit, delete, and duplicate prompts with complete Prompty specification support
- **Partials System**: Support for partial prompts that can be included in others, with global and folder-specific partials
- **Variables Management**: Global and folder-level variables with {{variable}} and ${env:VAR_NAME} syntax
- **Versioning System**: Track changes to each prompt with automatic versioning
- **Categorization**: Hierarchical folder structure with tags and custom attributes
- **Search Capabilities**: Full-text search with fuzzy search and filtering

### TypeScript Standards
- Use TypeScript for all code with strict mode enabled
- Create comprehensive type definitions for all data structures, especially for preload script APIs
- Avoid using `any` type except where absolutely necessary
- `tsconfig.node.json` configured with `"moduleResolution": "nodenext"` and `"module": "nodenext"` for ESM compatibility
- `package.json` includes `"type": "module"`

### IPC Communication Patterns
- Define clear message types for IPC:
  - `invoke/handle` for: `get-vault-path`, `select-native-folder`, `save-vault-directory`
  - `send/on` for: `show-vault-setup-dialog`, `vault-ready`, `vault-set-success`
- Document all IPC messages and payloads via the `window.api` types in `preload.d.ts`
- Implement proper error handling for IPC failures
- Use typed interfaces for IPC messages

### Preload Script Best Practices
- Bridges main and renderer processes by exposing specific functionalities
- Uses `contextBridge.exposeInMainWorld('api', { ... })` to provide controlled IPC channels
- For `ipcRenderer.on` listeners, return cleanup functions for easy removal in React `useEffect` hooks
- Must have corresponding type definition file (`src/renderer/src/preload.d.ts`) for TypeScript safety

### Component Architecture
- Follow atomic design principles (atoms, molecules, organisms, templates, pages)
- Create pure functional components where possible
- Use React hooks for state and side effects
- Keep components focused on a single responsibility
- Key component locations:
  - Reusable UI components: `src/renderer/src/components/ui/`
  - Feature-specific components: `src/renderer/src/components/`

### Security Considerations
- Follow Electron security best practices
- Disable Node integration in renderer processes
- Use contextIsolation and sandbox options
- Validate all user inputs
- Implement proper content security policies

### Error Handling and Data Integrity
- Implement error boundaries at key component boundaries
- Use try/catch for all async operations
- Provide meaningful error messages to users
- Validate all data before writing to disk
- Implement atomic write operations when possible

### Performance Optimization Targets
- Sub-100ms response time for UI interactions
- Instant search results for up to 10,000 prompts
- Virtual scrolling for long lists
- Incremental loading of prompt content
- Background indexing of prompt content

### Prompty Specification Support
The application implements the complete Prompty specification with YAML frontmatter support including:
- Model configuration with API endpoints and parameters
- Variable substitution with {{variable}} syntax
- Environment variable support with ${env:VAR_NAME} syntax
- Sample data for testing
- Full prompt content structure

### Module Organization
**Core Modules**:
- `PromptStorage` - Manages reading/writing prompts to disk
- `PromptIndex` - Handles search indexing and querying
- `VersionControl` - Manages prompt versions and history
- `CategoryManager` - Handles prompt organization
- `SettingsManager` - Manages user preferences and configuration
- `PartialsManager` - Handles partial prompts resolution and tracking
- `VariableManager` - Manages global and folder-level variables

**UI Modules**:
- `PromptEditor` - Rich editing interface for prompts
- `PromptBrowser` - List and grid views of prompt collections
- `SearchInterface` - Advanced search and filtering UI
- `HistoryViewer` - Interface for browsing version history
- `CategoryExplorer` - UI for navigating prompt categories
- `PartialsEditor` - Specialized editor for partial prompts
- `VariableEditor` - Interface for editing variables at different scopes