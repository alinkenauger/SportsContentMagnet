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
- July 01, 2025. Fixed content accuracy and enhanced guide interactivity:
  * Resolved critical issue where guide content showed generic sports training instead of actual video content
  * Updated golf guide with authentic golf instruction content matching "Correcting the Top 3 Misleading Golf Swing Cues"
  * Added prominent timestamp buttons to left of section headlines for video navigation
  * Implemented smooth scrolling to video player when timestamp buttons are clicked
  * Removed distracting thumbnail images in favor of clean, functional timestamp navigation
  * Enhanced button styling with blue background, shadows, and hover effects for better visibility
- July 01, 2025. Improved content library interface with condensed layout and table format:
  * Converted guides display from card layout to structured table format
  * Added table columns for thumbnail, guide name, views, leads, landing page link, guide preview link, and edit actions
  * Condensed filters and stats sections to reduce vertical space and improve screen utilization
  * Streamlined guide metadata display to show only creation date (removed category information)
  * Enhanced table styling with hover effects and responsive design for better user experience
  * Changed stats cards layout from 2 columns on mobile to 4 columns across all screen sizes
- July 01, 2025. Enhanced dashboard layout with consistent table format and centered performance section:
  * Restructured dashboard to use table format for Recent Guides matching Content Library design
  * Moved Performance Overview section below Recent Guides in centered layout with 2-column grid
  * Added same table columns structure: guide info, views, leads, landing page links, and actions
  * Improved visual consistency across dashboard and content library pages
  * Enhanced space utilization with streamlined layout design
- July 01, 2025. Added visual drill breakdowns for enhanced practice guidance:
  * Created automatic drill analysis system that parses content to extract key drill components
  * Built visual drill breakdown cards showing Pain Point, Technique, Repetitions, Duration, and Key Focus
  * Implemented intelligent content parsing using pattern matching to identify drill elements
  * Added color-coded icons for each drill component (red alert, blue lightning, green repeat, purple clock, orange check)
  * Enhanced drill sections with structured visual format making practice instructions more actionable and clear
- July 01, 2025. Fixed video transcription system and identified YouTube API limitations:
  * Implemented real transcription using youtube-transcript library with OpenAI Whisper fallback
  * Identified that YouTube's anti-bot measures block programmatic access to most videos
  * Added proper error handling and user guidance for videos without accessible captions
  * Transcription works for videos with public captions, but many modern videos are blocked
  * System provides clear error messages directing users to try videos with captions enabled
  * **CRITICAL DISCOVERY**: YouTube Data API v3 captions endpoint requires OAuth2 authentication (not API key)
  * Confirmed that successful tools like Glasp.co use browser extension approach to leverage user's authenticated session
  * Updated error messaging to explain OAuth2 limitation and suggest alternative approaches
- July 01, 2025. Implemented Google OAuth integration for YouTube access:
  * Added complete Google OAuth authentication system using passport-google-oauth20
  * Created GoogleAuthButton component with multiple variants (card, button, hero, header)
  * Updated landing page to use Google OAuth as primary authentication method
  * Replaced traditional lead capture forms with Google sign-in flow
  * Added database schema for Google connections with access/refresh tokens
  * Configured YouTube API scopes for authenticated caption access
  * Updated authentication callbacks to redirect to dashboard after successful login
- July 01, 2025. Restructured authentication to use Google OAuth as primary method:
  * Made Google OAuth the main authentication system instead of secondary connection
  * Updated all auth routes to prioritize Google OAuth over Replit Auth
  * Created hybrid authentication system supporting both Google and Replit users
  * Simplified OAuth scopes to basic profile/email to avoid verification requirements
  * Added universal logout functionality that works with both authentication methods
  * Maintained backward compatibility with existing Replit Auth users
- July 01, 2025. Expanded platform to comprehensive multi-format content transformation system:
  * **COMPLETE CONTENT TYPE EXPANSION**: Added support for YouTube URLs, manual transcripts, PDFs, audio files, and streaming links
  * **ADVANCED DRAG-AND-DROP UI**: Implemented intuitive file upload system with visual feedback and auto-title detection
  * **INTELLIGENT INPUT VALIDATION**: Added comprehensive validation for each content type with specific error messaging
  * **FILE PROCESSING INFRASTRUCTURE**: Configured multer for file uploads with 100MB limit and proper MIME type filtering
  * **BACKEND API EXPANSION**: Enhanced guide creation endpoint to handle multiple input methods including FormData for file uploads
  * **GRACEFUL ERROR HANDLING**: Implemented informative error messages for unsupported features with clear user guidance
  * **UI/UX ENHANCEMENTS**: Created distinct input interfaces for each content type with emojis, descriptions, and visual cues
  * **FUTURE-READY ARCHITECTURE**: Built extensible system ready for audio transcription and streaming video processing
- July 01, 2025. Refined UI color scheme and maintained professional design:
  * Experimented with various glass effects and transparent designs but reverted to original blue scheme
  * Maintained sleek, readable blue gradient design with proper contrast ratios
  * Preserved clean professional appearance with `from-primary to-blue-600` gradient
  * Ensured text readability with `text-blue-100` on blue backgrounds
- July 01, 2025. Implemented whisper-youtube integration for enhanced YouTube transcription:
  * **WHISPER-YOUTUBE INTEGRATION**: Added complete integration based on ArthurFDLR/whisper-youtube project
  * **MULTI-LAYERED TRANSCRIPTION**: Implemented whisper-youtube as primary method with comprehensive fallback system
  * **AUDIO EXTRACTION PIPELINE**: Created yt-dlp + Whisper transcription system that bypasses YouTube subtitle restrictions
  * **ENHANCED ERROR HANDLING**: Added specific error messaging for age-restricted, private, and unavailable videos
  * **PRODUCTION-READY INFRASTRUCTURE**: Built scalable architecture ready for deployment in resource-sufficient environments
  * **FALLBACK MECHANISMS**: Maintained existing yt-dlp and youtube-transcript methods as backup options
  * **CLEAR USER GUIDANCE**: Implemented informative error messages directing users to working alternatives when videos lack accessible content
- July 02, 2025. Added automated screenshot extraction system for visual guide enhancement:
  * **VIDEO SCREENSHOT EXTRACTION**: Implemented FFmpeg + yt-dlp pipeline for extracting screenshots at precise timestamps
  * **SMART VISUAL SELECTION**: Automatically generates 3 screenshots per section (start, middle, key moment) based on timestamped content
  * **SCALABLE ARCHITECTURE**: Built cost-effective system designed for thousands of users with minimal API costs
  * **DATABASE INTEGRATION**: Added screenshots field to guides schema with metadata storage for each extracted image
  * **PRODUCTION-READY STORAGE**: Configured static file serving with automatic cleanup and optimization for 640px web delivery
  * **SEAMLESS INTEGRATION**: Screenshots automatically extracted during guide creation for YouTube videos with timestamp data
  * **EDITOR-READY FORMAT**: Screenshots stored with metadata enabling future selection/replacement functionality in guide editor
- July 02, 2025. Implemented professional AI-powered copywriting system for high-converting landing pages:
  * **CONVERSION-FOCUSED COPY**: Added professional copywriter service that analyzes guide content to generate compelling, benefit-driven headlines
  * **PAIN POINT TARGETING**: AI identifies specific drills and techniques to create urgency and highlight transformation outcomes
  * **PROFESSIONAL COPY ELEMENTS**: Enhanced database schema with subheadlines, bullet points, social proof, urgency text, disclaimers, and CTA buttons
  * **CATEGORY-SPECIFIC MESSAGING**: Generates tailored copy for different niches (golf, fitness, cooking, coding) with relevant pain points and outcomes
  * **SOCIAL PROOF INTEGRATION**: Automatically attributes content to original YouTube channels for credibility building
  * **URGENCY AND SCARCITY**: Creates time-sensitive copy elements to drive immediate action from landing page visitors
  * **COMPLIANCE READY**: Includes professional disclaimers and legal copy appropriate for fitness and educational content marketing
- July 02, 2025. Built comprehensive multi-brand architecture with workspace isolation:
  * **MULTI-BRAND DATABASE SCHEMA**: Added brands table with brand-specific guides, settings, training prompts, and knowledge bases
  * **BRAND SWITCHER DRAWER**: Implemented left-side navigation drawer that appears when users have multiple brands for instant workspace switching
  * **ISOLATED WORKSPACES**: Each brand maintains separate guides, branding settings, AI training configurations, and knowledge base entries
  * **BRAND MANAGEMENT API**: Complete CRUD operations for brand creation, switching, updating, and deletion with ownership verification
  * **SEAMLESS BRAND SWITCHING**: React hooks and components for brand management with automatic cache invalidation across all brand-specific data
  * **MIGRATION-SAFE SCHEMA**: Implemented nullable brand references to support gradual migration from single-brand to multi-brand architecture
  * **SCALABLE PRICING MODEL**: Architecture ready for tiered pricing where users can purchase additional brand workspaces
- July 02, 2025. Implemented professional branded PDF downloads for all guides:
  * **PUPPETEER PDF GENERATION**: Built complete PDF generation service using Puppeteer with professional branded templates
  * **HANDLEBARS TEMPLATING**: Created responsive PDF templates with custom branding, colors, logos, and company information
  * **DRILL BREAKDOWN FORMATTING**: PDF includes visual drill breakdowns with color-coded icons and structured practice instructions
  * **DOWNLOAD API ENDPOINT**: Added secure download route with ownership verification and analytics tracking
  * **FRONTEND INTEGRATION**: Added download buttons to content library with progress feedback and error handling
  * **BRANDED CUSTOMIZATION**: PDFs automatically include brand colors, logos, company names, and professional disclaimers
  * **ANALYTICS TRACKING**: PDF downloads tracked in analytics system for user engagement metrics
- July 02, 2025. Added automatic knowledge base training feature with user control:
  * **AUTOMATIC TRANSCRIPTION STORAGE**: Guide creation now automatically adds content transcriptions to brand knowledge base by default
  * **USER CONTROL TOGGLE**: Added checkbox in guide creation form to opt-out for one-off guides that shouldn't be stored long-term
  * **INTELLIGENT CATEGORIZATION**: Transcriptions automatically tagged with relevant categories and source information
  * **BRAND-SPECIFIC ISOLATION**: Knowledge base entries are isolated per brand workspace for proper multi-brand support
  * **GRACEFUL ERROR HANDLING**: Knowledge base addition failure doesn't prevent guide creation, ensuring reliable operation
  * **COMPREHENSIVE BRAND MANAGEMENT**: Added complete brand management interface in settings with creation, switching, and deletion capabilities
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```