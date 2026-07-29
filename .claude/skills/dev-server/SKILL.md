---
name: dev-server
description: Start or check the Vite development server
user-invocable: true
---

Check if dev server is running, start it if not:

1. Check if port 5173 is in use: `lsof -i :5173`
2. If not running, start with: `npm run dev` (run in background)
3. Report the URL: http://localhost:5173
4. Optionally open in browser if requested
