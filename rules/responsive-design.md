---
description: Enforce responsive design standards across mobile and larger screens using Tailwind CSS.
globs: src/**/*.{tsx,jsx,ts,js,css}
paths:
  - "src/**/*.{tsx,jsx,ts,js,css}"
---

# Responsive Design Standards

- Style mobile first. Base styles are the mobile layout, with `sm:`, `md:`, `lg:`, `xl:` for larger screens.
- Use relative units and layout utilities (`flex`, `grid`, `container`), not fixed pixel widths. Avoid arbitrary widths like `w-[1200px]`.
- Don't use `hidden` or `md:hidden` to drop content on small screens. Reflow or collapse it instead.
- Forms: `grid grid-cols-1 md:grid-cols-2 gap-4`.
- Don't nest complex flex containers without defining how they behave on mobile.
