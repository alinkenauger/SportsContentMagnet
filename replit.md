# VidMagnet - Video-to-Lead-Magnet SAAS for Content Creators

## Overview

VidMagnet is a comprehensive SAAS application that transforms YouTube videos into high-converting lead magnets for content creators across multiple niches including fitness, sports, how-to skill teaching, cooking, and coding. The platform automatically extracts video content, transcribes it, uses AI to analyze expertise and insights, and generates branded practice guides with customizable landing pages for lead capture with optional SMS collection and legal compliance features.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: TailwindCSS with shadcn/ui component library for consistent design
- **State Management**: TanStack Query (React Query) for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with custom styling through shadcn/ui

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: Replit Auth integration with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage

### Project Structure
```
├── client/              # Frontend React application
├── server/              # Backend Express server
├── shared/              # Shared types and schemas
├── migrations/          # Database migration files
└── attached_assets/     # Project documentation
```

## Key Components

### Video Processing Pipeline
- **YouTube Integration**: Extracts video metadata, thumbnails, and basic information
- **Transcription Service**: Converts video audio to text with timestamps
- **AI Analysis**: Uses OpenAI GPT-4o to identify key coaching insights, drills, and techniques
- **Content Generation**: Creates structured practice guides from analyzed content

### Lead Capture System
- **Landing Pages**: Customizable templates with branding options
- **Form Builder**: Dynamic form creation with custom fields
- **Lead Management**: Stores and tracks lead information and engagement
- **Delivery System**: Automated guide delivery after email capture

### User Management
- **Authentication**: Secure login through Replit's OAuth system
- **User Profiles**: Stores user preferences and branding settings
- **Session Handling**: Persistent sessions with database storage

### Analytics & Tracking
- **Conversion Metrics**: Tracks views, downloads, and conversion rates
- **Performance Analytics**: Monitors guide performance and user engagement
- **QR Code Generation**: Creates scannable codes for easy guide sharing

## Data Flow

1. **Content Creation**: User submits YouTube URL through dashboard
2. **Processing Pipeline**: 
   - Extract video metadata using YouTube API
   - Transcribe video content
   - Analyze content with OpenAI for coaching insights
   - Generate structured practice guide
   - Create customized landing page
3. **Lead Capture**: Visitors access landing page, submit contact information
4. **Delivery**: System delivers branded guide and tracks engagement
5. **Analytics**: Real-time tracking of conversions and user behavior

## External Dependencies

### APIs and Services
- **YouTube Data API v3**: Video metadata extraction and validation
- **OpenAI API**: GPT-4o for content analysis and guide generation
- **QRCode Library**: Generate QR codes for guide sharing
- **Neon Database**: Serverless PostgreSQL hosting

### Authentication
- **Replit Auth**: OAuth-based authentication system
- **OpenID Connect**: Industry-standard authentication protocol

### Frontend Libraries
- **TanStack Query**: Server state management and caching
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Wouter**: Lightweight routing solution

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Hot module replacement and fast builds
- **TypeScript**: Full type safety across frontend and backend
- **ESLint/Prettier**: Code quality and formatting standards

### Production Build
- **Frontend**: Vite build with optimized bundles
- **Backend**: esbuild for server bundling
- **Database**: Drizzle migrations for schema management

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `YOUTUBE_API_KEY`: YouTube Data API credentials
- `OPENAI_API_KEY`: OpenAI API credentials
- `REPLIT_DOMAINS`: Allowed domains for OAuth

## Changelog

```
Changelog:
- July 01, 2025. Initial setup
- July 01, 2025. Updated app name to "VidMagnet"
- July 01, 2025. Added SMS collection feature with legal compliance:
  * Added phone and smsConsent fields to leads table
  * Added collectSms and smsConsentText fields to landing pages
  * Updated guide creation form with SMS collection toggle
  * Added legal consent checkbox requirement for phone collection
  * Updated landing page forms to conditionally show SMS fields
- July 01, 2025. Implemented AMG-style landing page template as default:
  * Clean, professional design with header navigation
  * YouTube thumbnail with lock overlay visual
  * Benefit points with green checkmarks
  * Centered form with professional styling
  * Legal disclaimer footer matching industry standards
  * Responsive design for mobile and desktop
- July 01, 2025. Fixed landing page form and added public library:
  * Removed duplicate email field from landing page forms
  * Created public library page for browsing all public guides
  * Added form validation requiring at least email OR phone number
  * Ensured default landing page forms include First Name (required) and Email (required)
  * Added backend routes for public guide discovery
  * Updated guide delivery page with library navigation
- July 01, 2025. Enhanced AI training language and clarity:
  * Updated knowledgebase descriptions to emphasize AI bot training for fitness content
  * Clarified that system helps train AI with workouts, training programs, coaching philosophy
  * Improved UI text to focus on helping AI provide better guidance to viewers
  * Added specific examples like exercise tutorials, nutrition guides, and coaching materials
- July 01, 2025. Added AI training templates for quick start:
  * Created 4 coaching style templates: Beginner-Friendly, Advanced Performance, Fitness & Wellness, and Youth Sports
  * Each template includes customized prompts for analysis, guide generation, and personalization
  * Templates auto-populate all training fields with coaching-specific instructions
  * Collapsible template selector with one-click application
- July 01, 2025. Expanded platform beyond fitness to multiple niches:
  * Added templates for sport-specific coaching, how-to skill teaching, cooking, and coding
  * Expanded platform scope from fitness-only to comprehensive content creator tool
  * Updated project description to reflect multi-niche capabilities
  * Created 8 total templates covering diverse content creation needs
- July 01, 2025. Built comprehensive enhanced guide editor with advanced drag-and-drop:
  * Implemented precise element positioning with drop zones between existing elements
  * Created aesthetic column system with draggable separators for width adjustment
  * Added direct toolbar-to-canvas dragging with visual feedback
  * Built nested drag-and-drop functionality for elements within columns
  * Enhanced column design with clean borders and intuitive resize handles
  * Added drop zone indicators and smooth positioning animations
- July 01, 2025. Expanded settings menu with comprehensive user management:
  * Added Profile tab with personal information, avatar, and contact details
  * Implemented Billing tab with subscription management and payment methods
  * Created Security tab with 2FA, password management, and session controls
  * Built Notifications tab with email, SMS, and push notification preferences
  * Added Integrations tab with API keys, webhooks, and connected services
  * Included Advanced tab with data export and account deletion options
- July 01, 2025. Fixed critical drag-and-drop element rendering issue:
  * Resolved issue where dropped elements appeared as empty "Click to configure" boxes
  * Added complete rendering logic for image, video, audio, and button element types
  * Elements now display actual content immediately when dropped onto canvas
  * Implemented proper fallback states for empty elements with intuitive placeholder designs
  * Added pen icon editing functionality - click element to edit instead of auto-edit
  * Enhanced user experience with smooth, professional element interactions
  * Confirmed drag-and-drop precision and element positioning working correctly
- July 01, 2025. Enhanced content personalization and video integration:
  * Added channel title field to guides schema for channel-specific attribution
  * Modified AI content generation to include YouTube channel references in introductions
  * Implemented responsive YouTube video embeds in guide previews above Next Steps section
  * Fixed delete functionality for dropped elements using proper functional state updates
  * Cleaned up debug console logs for improved user experience
  * Guides now properly attribute original content creators in introduction paragraphs
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```