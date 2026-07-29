---
name: test-changes
user-invocable: false
---

# Test Changes Skill

**CRITICAL**: Use this skill BEFORE committing any code changes or announcing completion.

## When to Use
- After implementing any feature
- After fixing any bug
- Before marking tasks as completed
- Before committing code

## Testing Workflow

### 1. Run Lint
```bash
npm run lint
```
- Must pass with no new errors
- Existing warnings are acceptable if documented

### 2. Start/Check Dev Server
```bash
# If not running
npm run dev

# Check which port it's using (check output or tasks file)
```

### 3. Open Browser and Test Manually
```bash
open http://localhost:5174/  # or whatever port
```

### 4. Read Browser Console Logs
```bash
# Take screenshot to see visual state + console errors
# Or use browser automation to capture console
```

### 5. Test Core Functionality
For Flower Power specifically:
- [ ] Game loads without errors
- [ ] Can draw cards from deck
- [ ] Can play flower cards to table
- [ ] Score updates correctly
- [ ] Can use action cards (Water, Pest, Prune, Fertilize)
- [ ] AI takes its turn automatically
- [ ] Game over triggers at 20 points
- [ ] Can restart game

### 6. Test New Feature Specifically
- [ ] New feature works as intended
- [ ] No console errors related to new code
- [ ] No visual glitches
- [ ] Animations are smooth (if applicable)

### 7. Run AI Simulation (for game logic changes)
```bash
# In browser console
runSim(100)
```
- Check win rates are 40-60%
- Check for errors during simulation

## Never Skip Testing
- Do NOT mark tasks completed without testing
- Do NOT commit without verifying code runs
- Do NOT assume hot-reload worked - check console
- Read actual error messages, don't guess

## Proper Task Flow
1. Implement feature
2. Run this test skill
3. Fix any issues found
4. Re-test
5. Mark task completed
6. Commit with confidence
