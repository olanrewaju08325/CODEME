# CodeMe Academy (Nigeria)

Welcome to the CodeMe Academy learning platform!

## Overview
This platform is a comprehensive learning management system designed to teach programming to students in Nigeria. It features a robust role-based architecture supporting students, teachers, and administrators. 

### Recent Development (V5 - V10 implementation)
We have just completed a massive feature sprint implementing the core capabilities of the platform:

1. **V5 - Advanced Admin & Reporting**:
   - Developed a full metrics dashboard tracking student progress and enrollment statuses.
   - Added an **Instructor Management** tab for granular teacher assignment and monitoring.
   - Implemented an **Enterprise Settings** tab that handles broad platform configuration.

2. **V6 - Deeper Personal Experience**:
   - Integrated **Biometric Login** (WebAuthn/Fingerprint/FaceID) allowing seamless sign-ins.
   - Built a comprehensive **Notification Preferences** control panel, letting users toggle email, push, and in-app alerts independently.
   - Exposed all of this through a global Settings modal accessible from the Dashboard.

3. **V9 - Personalization & Scale**:
   - Developed an **Adaptive Learning Engine** ("Recommended For You") that unlocks courses automatically based on granular student performance metrics.
   - Example rules currently active: CSS unlocks after 4 HTML lessons, JS unlocks after 8 lessons, React unlocks after 3 passed quizzes.

4. **V10 - Full Academy Platform**:
   - **Enterprise Capabilities**: Deployed an API key generator, white-label configurations, and advanced security (rate-limit) views directly in the Admin Portal.
   - **Reporting**: Configured CSV export scaffolding for data portability.

## Environment Variables
> [!WARNING]
> Please do NOT commit API keys to version control!
> We have added `.env*` to `.gitignore`. Ensure your Supabase URL and Anon Keys are stored securely in `.env.local` and never pushed directly to GitHub.

## Getting Started for Collaborators (TechEng AI)
Hi! If you're picking up where we left off:

1. Run `npm install` to grab all dependencies.
2. Ensure you have your `.env` or `.env.local` file configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. To start the local server: `npm run dev`
4. The main entry point for the router and auth wrapper is `src/App.tsx`.
5. The Admin views are concentrated inside `src/views/AdminPortal.tsx`. We've added extensive state for managing certificates, manual student creation, enterprise features, etc. 
6. Database Migrations are available in `supabase/migrations/` and should be applied sequentially to update your local Supabase schema.

## Next Steps / Backlog
- Tie the "Generate API Key" UI explicitly to a backend RPC to create and return the secure token.
- Build out the actual CSV parser for the "Export Reports" feature in the Admin panel.
- Implement the Web Push API for the actual delivery of the "Push Notifications" user preference.

Happy coding!
