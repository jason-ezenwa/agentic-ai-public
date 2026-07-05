---
alwaysApply: false
---

# File-Based Routing System Rules

## Page Creation Rule
- **ALWAYS** create new pages in the `src/pages/` directory following a file-based routing structure
- **NEVER** create routes or pages without first adding the route to `src/routes.tsx`
- **ALWAYS** follow the naming convention: `page-name.tsx` or `page-name/index.tsx`

## Route Registration Rule
- **AFTER** creating a new page component, update `src/routes.tsx` to include the new route
- **ALWAYS** ensure routes are properly nested and protected with appropriate guards
- **ALWAYS** import page components in `src/routes.tsx` after creating them