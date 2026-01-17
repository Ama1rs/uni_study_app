Optimization & Security Implementation Plan
Overview
This document outlines the remaining optimization and security tasks for the Uni Study App. The initial phase (Tasks 1-11) is complete. This next phase focuses on code hygiene, type safety, frontend testing, bundle optimization, and security hardening.

Total estimated effort: ~45-60 story points.

General Guidelines
Story Points: 1=trivial, 2=minor, 3=moderate, 5=integration, 8=major.
Validation: All tasks must be verified with tests or metrics.
Security: Security tasks are critical and should be prioritized alongside high-value optimizations.
Completed Tasks (Phase 1)
✅ 1. Fix GPU Acceleration Paradox
✅ 2. Parallelize Waterfall Data Fetch
✅ 3. Add Memoization for Component Logic
✅ 4. Address Missing Index Problem
✅ 5. Optimize Efficient Iteration & Deserialization
✅ 6. Resolve Database Lock Ping-Pong
✅ 7. Implement Structured Logging
✅ 8. Add Robustness & Error Resilience
✅ 9. Implement Defensive Programming Validation
✅ 10. Enable Single Source of Truth Type Syncing
✅ 11. Adopt Clean Architecture Service/Repository Pattern

Phase 2 Tasks
High Priority
12. Integrate Generated TypeScript Bindings (3 points)
Description: The ts-rs generated bindings in src/bindings/ are not being used. The frontend still relies on manually defined, duplicate interfaces which risks type mismatch.
Key Files: src/bindings/, src/pages/StudyRepository.tsx, src/pages/Grades.tsx
Steps:
Delete local interface definitions (e.g., interface Repository).
Import types from @/bindings instead.
Handle bigint vs number (ts-rs exports bigint for i64). Add a type adapter or update logic.
Validation: No duplicate interfaces; code compiles with strict type checks.
Progress: [ ] Not started [ ] In progress [ ] Completed

13. Remove Debug Console Logs (2 points)
Description: 45+ console.log statements exist in production code, cluttering output and potentially leaking info.
Key Files: Grades.tsx, BookReader.tsx, renderingOptimization.ts
Steps:
Create a src/lib/logger.ts utility.
Replace console.log with logger.debug().
Configure logger to be silent in production builds.
Validation: Clean console in production build.
Progress: [ ] Not started [ ] In progress [ ] Completed

14. Reduce 'any' Type Usage (3 points)
Description: 70+ usages of any type exist, particularly in graph rendering and settings, bypassing TypeScript safety.
Key Files: graphLayout.ts, react-force-graph-2d.d.ts
Steps:
Define proper interfaces for GraphNode, Link, and generic payloads.
Replace any with specific types or unknown with type guards.
Validation: build compiles with noImplicitAny (if enabled) or significantly fewer grep hits.
Progress: [ ] Not started [ ] In progress [ ] Completed

15. Harden Content Security Policy (CSP) (5 points)
Description: tauri.conf.json currently has "csp": null. This leaves the app vulnerable to XSS if external content is loaded.
Key Files: tauri.conf.json
Steps:
Define a strict CSP string (default-src 'self'; style-src 'unsafe-inline'; ...).
Allow only necessary external domains (e.g., youtube.com for embeds).
Test that usage of local assets and external resources still works.
Validation: App functions correctly with CSP enabled; browser console shows no CSP violations.
Progress: [ ] Not started [ ] In progress [ ] Completed

16. Add Frontend Unit Tests (5 points)
Description: No frontend tests exist. Critical logic in components and hooks is unverified.
Key Files: src/__tests__/
Steps:
Install Vitest and React Testing Library.
Create test files for Utils, Contexts, and complex Components (e.g., Grades).
Aim for 80% coverage on helper functions.
Validation: npm run test passes with coverage report.
Progress: [ ] Not started [ ] In progress [ ] Completed

Medium Priority
17. Scope Filesystem Access (3 points)
Description: tauri.conf.json allows scope: ["**"], granting access to the entire user disk. This should be restricted.
Key Files: tauri.conf.json
Steps:
Identify exactly which directories are needed (e.g., AppData, specific user folders).
Update assetProtocol.scope and fs.scope to generic paths ($APP/*, $DOCUMENT/*).
Verify file opening/saving still works.
Validation: App can access project files but is denied access to system root.
Progress: [ ] Not started [ ] In progress [ ] Completed

18. Code Splitting & Lazy Loading (5 points)
Description: Large pages like FlashcardsPage are bundled in the main chunk.
Key Files: MainViewRouter.tsx
Steps:
Use React.lazy() for route components.
Wrap MainViewRouter switch in <Suspense fallback={<Loading />}>.
Validation: Smaller initial bundle size (visualize with rollup-plugin-visualizer).
Progress: [ ] Not started [ ] In progress [ ] Completed

19. Add Loading States & Skeleton UI (3 points)
Description: App shows blank screens during loading (if (isLoading) return null).
Key Files: App.tsx, Dashboard.tsx
Steps:
Create reusable <Skeleton /> components (using tailwind animate-pulse).
Replace null returns with skeleton layouts matching the content shape.
Validation: Smooth transition from load -> content.
Progress: [ ] Not started [ ] In progress [ ] Completed

20. Optimize Large Component Files (3 points)
Description: Refactor monolithic files (FlashcardsPage.tsx: 550 lines) into smaller sub-components.
Key Files: FlashcardsPage.tsx, Grades.tsx
Steps:
Extract sub-components (e.g., FlashcardDeck, GradeTable).
Move business logic to custom hooks (useFlashcards, useGrades).
Validation: No file exceeds ~300 lines.
Progress: [ ] Not started [ ] In progress [ ] Completed

Low Priority
21. Environment Configuration (2 points)
Create .env.development and .env.production for configuration management.

22. Accessibility Audit (3 points)
Ensure WCAG 2.1 complaince (keyboard nav, contrast).

23. Bundle Analysis (2 points)
Analyze usage of heavy libraries.

Risks and Mitigations
Type Migration: Switching to generated types might break existing code. Do it incrementally.
CSP: Strict CSP might block inline styles or scripts. Test thoroughly.
Filesystem Scope: Restricting scope might break file opening if users store files outside standard folders. Provide clear errors.