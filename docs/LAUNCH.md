# Deployment and launch notes

The requested first four product experiences are implemented. The broader features remain explicitly marked coming soon. This source delivery has not been operated at production scale or submitted to app stores.

## Before an external release

1. Run the migration and integration suite against the target MySQL version. Validate database backups and a restore. Configure persistent media storage for an expanded catalog.
2. Deploy FastAPI and the Vite assets behind HTTPS. Generate a random JWT_SECRET (for example, `python -c "import secrets; print(secrets.token_urlsafe(64))"`), set ENVIRONMENT=production and COOKIE_SECURE=true, and restrict CORS_ORIGINS to exact trusted origins. Never expose the development database port publicly.
3. Apply a shared rate limit at the gateway, establish log retention, monitor error rates, prune expired refresh sessions/abandoned guests under a published retention policy, and use a secrets manager. Add verified-email and password-recovery flows before offering persistent public accounts.
4. Replace the local-edition legal text with the operator’s identified legal entity/contact details, jurisdiction-specific rights and retention practices. The included policies accurately describe the supplied local code but cannot identify an operator that has not been supplied.
5. Have qualified educators review the seed content and license a validated anatomical model if a clinical atlas is needed. The included procedural model is intentionally schematic.
6. Test responsive pages at 320, 375, 768, 1024, and 1440 pixels, 200% zoom, keyboard navigation, screen readers, and reduced motion. Test a supported iPhone and Android device for GL rendering, video playback, pinch gestures, motion denial, app backgrounding, safe areas, and slow/offline connections.
7. Generate signed development/release builds with your Apple/Google accounts. SDK 54 is pinned; upgrades should be deliberate and revalidated with Expo’s compatibility checker. Replace development HTTP URLs with your production HTTPS origin.

## Current scope limits

- No password reset/email verification, moderation, push notifications, purchases, or medical data ingestion.
- No live timetable/college synchronization. The Home schedule is an example and the full planner is a roadmap screen.
- No AI model connection, full SRS scheduler, analytics dashboard, community posting, or paid/downloadable resource flow.
- Starter content: 12 MCQs, three clips, six heart structures.
- There is a progress ring and simple first-step/streak badge data. A full unlockable badge catalog is not implemented.
- Native tab transitions use React Navigation fade and stack motion. A cross-platform shared-element navigation system is not included.
- Daily count update happens after recorded actions or a refresh. This is not a websocket-based realtime collaboration service.
