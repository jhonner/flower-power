---
name: implement-feature
description: Implement a new feature with full testing and documentation
---

# Feature Implementation Workflow

## Inputs
- `feature_name`: Name of the feature
- `feature_description`: What the feature should do

## Steps

### 1. Research Phase
- Read relevant existing code files
- Check roadmap for requirements and dependencies
- Identify all files that need modification
- Look for existing patterns to follow

### 2. Implementation Phase
- Create or modify necessary files
- Follow existing code patterns and style
- Add new constants/config to `src/data/constants.js`
- Update stores if new state is needed
- Update GameLogicManager if game logic changes

### 3. Testing Phase
- Run `npm run lint` - fix any errors
- Run `npm run build` - verify build succeeds
- Test in browser if UI changes
- Run AI simulation (`runSim(100)`) if game logic changes
- Verify win rates remain balanced (40-60%)

### 4. Documentation Phase
- Update README.md if user-facing changes
- Update roadmap memory file (mark task complete, add notes)
- Add code comments only for non-obvious logic

### 5. Commit Phase
- Stage all changes with `git add`
- Write descriptive commit message following pattern:
  ```
  Add [feature name]
  
  - Detail 1
  - Detail 2
  ```
- Push if requested by user
