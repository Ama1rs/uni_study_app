Supabase Integration: Comprehensive Master Plan
This plan consolidates the initial feature requirements, architectural security hardening, and local-first sync requirements into a single production-ready integration strategy.

Technical Goals
Local-First with Sync: Local SQLite is the primary database. Supabase provides cloud sync, backup, and multi-device support.
Bi-directional Switching: Users can enable/disable sync at any time without data loss.
Hardened Security: Mandatory RLS, private storage buckets, and signed URLs.
Premium Tiering: Cloud sync is gated as a paid feature.
1. Environment & Technical Boundaries
Ensures strict separation between Local and Cloud modes to prevent data leaks.

[MODIFY] 
supabase.ts
: Support dynamic initialization from user-provided credentials.
[NEW] 
.env.example
: Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
[NEW] Backend Capability Flags:
type BackendCapabilities = {
  auth: boolean;
  sync: boolean;
  cloudStorage: boolean;
}
UI features will auto-disable if a capability is false (e.g., if subscription is invalid).
Local Security (Encryption): Decided to use SQLCipher for local SQLite encryption, derived from a device-stable key, ensuring data-at-rest security for sensitive PDFs and notes.
2. Authentication & Entitlements
[MODIFY] 
AuthScreen.tsx
:
Integrate Supabase Auth.
Bypass entirely if in "Local Only" mode.
[MODIFY] 
useAppInitialization.ts
: Handle session persistence and initial entitlement check.
[NEW] Hardened Subscription Check: Entitlements are read from a server-owned subscriptions table. RLS enforces that users can read but never write their own subscription status.
[NEW] Device Identity & Revocation:
Every installation generates a stable device_id (stored in a local sync_state table).
Registration Handshake: On first sync, the app registers the device_id with metadata (platform, name) in a cloud devices table.
Kill Switch: User can revoke devices; revoked devices are immediately forced into Local-Only mode.
3. Database Sync & Security
[NEW] 
supabase_schema.sql
:
Ownership: user_id uuid references auth.users(id) not null.
RLS Policy: create policy "User Access" on [table] for all using (auth.uid() = user_id).
Versioning & Safety: Include schema_version and sync_protocol_version. Client must refuse sync if cloud schema is newer and incompatible (Fail Loud).
Migration Guard: Implement a "First-Time Sync" guard to detect uninitialized cloud states, pushing local data exactly once to prevent duplication.
[NEW] Sync Engine (SyncManager.ts):
Soft Deletes (Tombstones): All synced tables must use deleted_at timestamptz. Rows are never hard-deleted.
Tombstone & Storage GC: Purge tombstones (30-90 days) and orphaned storage objects once all devices have synced past deletion points.
Conflict Resolution: Apply LWW based on Server-assigned timestamps (Supabase now()).
Idempotency & Recovery: Transactions advance only after full Upload+Download success.
Sync Order: Deterministic (Repositories -> Notes -> Resources).
Sync Trigger Policy: App launch, Resume, Manual, or Periodic (throttled). No background sync on mobile.
Conflict Transparency: Log LWW resolutions locally; provide a "Recent Conflicts" debug screen and a Conflict Audit Trail.
Resilience: Exponential backoff, batching, and reconnect cooldowns.
[MODIFY] 
MainViewRouter.tsx
: Ensure components receive a unified data interface regardless of sync status.
4. Resource & Storage Management
[MODIFY] 
import_resource (Rust)
:
Integrity: Calculate SHA-256 content hashes locally; store in cloud metadata to detect corruption and skip redundant uploads.
Storage RLS: Enforce user-id prefixing in buckets (bucket/user_id/resource_id).
Always maintain a local copy in the app resources folder as a fault fallback.
[MODIFY] Resource Display:
Generate Signed URLs (5-15 min expiry) for cloud resources.
Refresh Logic: Auto-refresh URLs on access failure; fallback to local copy gracefully.
Quota & Cost Guardrails:
Enforce max object size for storage uploads.
Warning UI before large sync operations (>50MB).
Soft-enforcement of per-user storage quotas.
5. Deployment & Reliability
Health Check: Ping Auth, Database, and Storage during onboarding/activation.
Fault Fallback: If heartbeats to Supabase fail:
Local State: Remains Read-Write.
Cloud State: Explicitly Disabled/Paused.
UI: Visual indicator clearly separates local confidence from cloud sync status.
Observability: Implement local sync_logs and a "Last Synced" status UI.
UX Controls:
Manual "Force Re-sync" button.
"Account Unlink" flow (disconnect Supabase without wiping local data).
Data Export: Implement an "Escape Hatch" (ZIP/JSON) allowing users to export all synced/local data.
6. Backup & Restore Policy
Backup: Automated and continuous via the Sync Engine.
Restore:
Type: Manual process triggered by the user in Settings.
Behavior: Replace Local. To ensure data integrity, a formal Restore will archive the current local SQLite database and replace it with a full fresh pull from Supabase.
Integrity: Post-restore, a full SHA-256 verification of all resources is performed.
Verification Plan
1. Data Integrity & Sync
Conflict Test: Simulate edits on Windows and Mobile; verify LWW resolution.
Fault Fallback: Manually break the internet; ensure the app stays writable locally and syncs after re-connect.
One-Way Migration: When first enabling sync, verify all local data is correctly pushed to Supabase.
2. Security & Boundaries
RLS Verification: Manual cross-user leak test (attempting to query other user IDs).
Entitlement Test: Ensure Sync cannot be enabled for accounts lacking is_premium metadata.
Leak Test: Ensure supabase client is null when in Local-Only mode.
3. Multi-platform
Verify restoration of session across device restarts (Cold Start).
Verify sync speed and consistency across Desktop (Tauri) and Mobile targets.


Task: Incorporate Supabase into Uni Study App
 Research current database architecture
 Create implementation plan
 1. Security & Identity Foundation
  Implement SQLCipher for Local Encryption [ ]
  Implement Device Identity & sync_state tracking [✓]
  Implement Device Registration Handshake [✓]
Register device_id in cloud on first sync
Store device metadata (platform, name, created_at)
Validate device status (active/revoked) before sync
  Implement Device Revocation & Kill-switch check [✓]
 2. Infrastructure & Schema
  Set up Supabase Project & Tables (with deleted_at tombstones) [✓]
  Implement Hardened Subscription Logic (Server-side RLS) [✓]
  Implement Schema Migration Runner [ ]
SQLite migration runner
Supabase migration application
Sync blocking if versions mismatch or are incompatible
 3. Sync Engine (The Heart)
  Implement First-Time Sync Migration Guard [ ]
Detect "sync not yet initialized"
Push full local DB -> cloud exactly once
Prevent accidental double-push / duplication
  Implement SyncManager with Explicit Phases (Bootstrap -> Commit) [✓]
  Implement Deterministic Sync Order (Repos -> Notes -> Resources) [✓]
  Implement Server-side Timestamping for Clock Skew Protection [ ]
  Implement Idempotent Recovery & Transactional Cursor logic [ ]
  Define & Implement Sync Trigger Policy [✓]
App launch / Resume
Manual trigger
Periodic throttled sync
  Implement Rate-Limit & Exponential Backoff Safeguards [ ]
 4. Storage & Reliability
  Implement SHA-256 Storage Integrity & Storage RLS [ ]
  Implement Private bucket storage, Signed URLs & Auto-refresh [ ]
  Implement Tombstone & Storage Object GC [ ]
Purge outdated tombstones (30-90 days)
Delete orphaned storage objects after GC window
  Implement Sync-Protocol Versioning & Safety Checks [ ]
  Implement Conflict Logging, Audit Trail & Debug UI [✓]
  Implement User Data Export / Escape Hatch [ ]
  Implement Manual Cloud Restore Flow (Archive Local -> Pull Remote) [ ]
 5. Verification
  Verify Cross-platform Sync (Desktop/Mobile) [ ]
  Verify RLS & Premium Security [ ]
  Verify Offline Fallback & Reliability [ ]
  Implement Sync Dry-Run / Diagnostic Mode [ ]

## ✅ COMPLETED PRIMARY FUNCTIONALITY

### What's Been Implemented:

1. **Enhanced Supabase Client Configuration**
   - Dynamic initialization with error handling
   - Backend capabilities system (auth, sync, cloudStorage)
   - Environment configuration support

2. **Device Identity & Sync State Management**
   - Rust backend with device registration and tracking
   - Database tables for device_identity and sync_state
   - Functions: get_device_id, get_sync_state, set_sync_state, update_device_last_seen, revoke_device
   - TypeScript bindings and types

3. **Authentication Integration**
   - Updated AuthScreen with Supabase Auth support
   - Local/Cloud toggle functionality
   - Device identity integration during auth
   - Premium status checking

4. **Supabase Schema with RLS**
   - Complete SQL schema with all core tables
   - Row Level Security policies for user isolation
   - Tombstone support (deleted_at columns)
   - Storage bucket policies with user-prefixed paths
   - Indexes for performance

5. **Basic SyncManager**
   - Upload/Download phases with progress tracking
   - LWW (Last Writer Wins) conflict resolution
   - Deterministic sync order (repositories first)
   - Progress callbacks and error handling
   - Sync state management

6. **Sync Status UI**
   - Real-time sync progress display
   - Manual sync controls
   - Enable/disable sync functionality
   - Detailed sync status information
   - Visual indicators and timestamps

### Next Steps (Secondary Priority):
- Resource storage with signed URLs
- SQLCipher local encryption
- Complete entity synchronization (resources, links, etc.)
- Exponential backoff and retry logic
- Cross-platform verification
