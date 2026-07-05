---
description: Enforce responsive design standards across mobile, sm, md, lg, and xl screens using Tailwind CSS.
globs: src/**/*.{tsx,jsx,ts,js,css}
---

# Responsive Design Standards

Enforce mobile-first responsiveness and ensure layouts are fluid and functional across all standard breakpoints.

## Core Principles

- **Mobile-First**: Always define the base styles for mobile and use prefix modifiers (`sm:`, `md:`, `lg:`, `xl:`) for larger screens.
- **Fluid Layouts**: Use relative units (%, vw, vh) or Tailwind's layout utilities (`flex`, `grid`, `container`) instead of fixed pixel widths.
- **Grid/Flex Consistency**: Prefer `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` patterns for content lists.
- **Padding & Spacing**: Use responsive padding (e.g., `p-4 sm:p-6 lg:p-8`) to maintain visual breathing room on larger displays.

## Breakpoints Reference

| Breakpoint | Prefix | Minimum Width | Usage Strategy |
| :--- | :--- | :--- | :--- |
| **Mobile** | (default) | 0px | Single column, stacked elements, full-width buttons. |
| **Small** | `sm:` | 640px | Two-column grids, optimized form layouts. |
| **Medium** | `md:` | 768px | Sidebar visibility, navigation adjustments. |
| **Large** | `lg:` | 1024px | Multi-column layouts (3+), expanded dashboards. |
| **Extra Large** | `xl:` | 1280px | Maximum container widths, high-density data views. |

## Implementation Rules

1.  **Forms**: Use `grid grid-cols-1 md:grid-cols-2 gap-4` for form fields to avoid long, hard-to-read lines on desktop.
2.  **Navigation**: Ensure menus collapse into a "hamburger" or bottom-tab navigation on mobile.
3.  **Typography**: Use responsive text sizes (e.g., `text-base sm:text-lg lg:text-xl`) for headings.
4.  **Components**: Avoid `hidden` unless absolutely necessary; prefer layout shifts that maintain context.
5.  **Images**: Use `w-full h-auto` or `aspect-ratio` utilities to prevent overflow or stretching.

## Prohibited Patterns

- Avoid `w-[1200px]` or other arbitrary fixed widths.
- Avoid nesting complex flexbox containers without defining their behavior on mobile.
