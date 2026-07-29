---
name: build-check
description: Run lint and build to verify code quality
---

Full build verification:

1. Run `npm run lint` 
   - Report any errors (must be fixed)
   - Report any warnings (can note but continue)
2. Run `npm run build`
   - Verify production build succeeds
   - Report any build errors
3. Report bundle size from dist/:
   - JS bundle size
   - CSS bundle size
   - Total size
4. Summary: PASS if no errors, FAIL if any errors
