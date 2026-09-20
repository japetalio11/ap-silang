# Frontend Guidelines

## Core Philosophy
We maintain a compact, high-density, application-like feel. The UI favors precise typography, subtle border treatments, and high-contrast inversions for emphasis over heavy shadows or complex gradients. The design closely mirrors native mobile application behavior with swipe gestures, drag-to-dismiss functionality, and unified sticky toolbars.

## Typography (Compact Style)

### Base Typography
- **Family:** Inter Variable (sans-serif)
- **Base Style:** Standard tracking, sleek presentation.

### Font Weights
We rely on color contrast and lighter weights to establish hierarchy rather than heavy bolding.
- **`font-normal` (400):** Standard body text, subtext, descriptions, and structural UI elements.
- **`font-medium` (500):** H2 section titles, standard buttons, tabs, secondary headers, and micro-text badges.
- **`font-semibold` (600):** Reserved for H1 Page Titles, Metric Values (KPIs), Sidepeek Titles, and highlighted card titles.
- **`font-bold` / `font-extrabold` (700+):** **Actively Avoided.** Do not use these to prevent a "blocky" UI feel.

### Hierarchy & Scale
The design intentionally favors a compact, high-density layout. Font sizes heavily skew toward smaller scales.
- **H1 (Page Titles):** `text-3xl font-semibold tracking-tight text-foreground`
- **Metric Values (KPIs):** `text-2xl font-semibold mb-4`
- **Brand/Logos:** `text-xl`
- **Sidepeek Titles:** `text-base font-semibold text-foreground`
- **H2 (Section Titles):** `text-sm font-medium text-foreground`
- **Body & Subtext (Workhorse):** `text-xs font-normal text-foreground` or `text-muted-foreground`. Used heavily for descriptions, locations, times, properties, and standard inputs/buttons (`h-8`).
- **Helper Text:** `text-[11px] text-muted-foreground` for microcopy below inputs or activity logs.
- **Micro-text (Badges, Timestamps, Labels):** `text-[10px] font-medium` or `font-semibold`. Must be rigidly consistent across both web panels and mobile overlays.

## Colors & Theming

### Backgrounds & Borders
- **Standard Cards:** `bg-card` or `bg-white dark:bg-[#111]` with `border-sidebar-border`.
- **App Background:** `bg-background dark:bg-[#1a1a1a]`.
- **Sticky Headers:** When resting on top of content, use a solid `bg-background dark:bg-black` to cleanly overlay scrolling lists.
- **Inverted / Emphasized Cards:** Pure contrast for primary items. Light mode: `bg-black text-white`. Dark mode: `bg-white text-black`. Borders match the background for a solid block feel.
- **Grays:** Use `text-muted-foreground` for all secondary text to ensure cross-theme consistency.
- **Solid Status Badges:** Maintain solid, vibrant colors (e.g., `bg-[#22C55E]` for success, `bg-[#F59E0B]` for warning) with crisp `text-white` for status indicators in BOTH light and dark modes to preserve a bold, uniform design aesthetic.

## Component Design

### Cards & Containers
- **Metric Cards:** `shadow-none`, standard `rounded-xl`, tight header padding (`pb-2`), with internal content gaps of `gap-1`.
- **Event Cards:** `rounded-[14px]`, `p-6`, `aspect-square`. Designed to act as a horizontal snapping carousel on mobile (`snap-x snap-mandatory`, `w-[80%]`) and a standard `grid-cols-3` on desktop.
- **Badges:** Tightly padded `px-1.5 py-0.5 rounded-sm` with `text-[10px]` for a pill-like but structured appearance.

### Modals, Popovers, & Drawers
- **Desktop Overlays & Modals:** Floating, `rounded-xl border border-border shadow-lg` with fixed widths. For sidepeeks, slide out smoothly from the right side.
- **Mobile Responsive Drawers:** Use `vaul` Drawer instead of standard sheets/dialogs to enable native mobile swipe/drag-to-dismiss gestures. 
- **Mobile Drawer Height:** Cap the drawer heights strictly to `!h-[80dvh]` to account for native browser overlays (like iOS bottom URL bars). Avoid full `100vh` to prevent UI cutoffs, and ensure the inner content container has adequate bottom padding (e.g. `pb-8`) so internal footers are safely within reach.
- **Internal Lists:** Use `border-t border-border` to separate list items without bottom padding on the parent container (`pt-4 px-4 pb-0`), ensuring the final item sits perfectly flush at the bottom edge.

## Layout & Navigation

### Sticky Headers & Tabs
- **Sticky Toolbars:** Group top-level navigation, tabs, and toolbars into a single `sticky top-0 z-10` container to allow card lists and tables to seamlessly scroll underneath.
- **Header Borders:** Give sticky headers a separating bottom border on mobile screens (`border-b border-sidebar-border`), but drop the border entirely on desktop (`md:border-b-0`) for a modern, floating borderless appearance.
- **Horizontal Scroll & Swipe:** For mobile tabs, forcefully wrap containers in `w-max` and `overflow-x-auto` to prevent tab squishing. Attach manual `onTouch` swipe handlers to main content containers to allow users to flick left/right to rapidly switch active tabs.

### Action Controls
- **Buttons & Inputs:** Standardize core action inputs to a strict height of `h-8` (for elements like Quick Create, Filter, Approve, Request Changes) to maintain a razor-sharp, uniform toolbar footprint across both web and mobile.

### Z-Index Management
- **Standard Tailwind Stack:** Strictly use standard Tailwind z-index utilities (`z-10`, `z-20`, `z-30`, `z-40`, `z-50`).
- **Active Avoidance:** Do NOT use arbitrary hardcoded z-indexes like `z-[100]`. If an element needs to float above everything else, `z-50` should be sufficient, assuming the stacking context is handled correctly.

### Pagination Strategies
- **Web (Desktop):** Place traditional full-featured pagination (with rows-selected text and full dropdowns) firmly at the absolute bottom of data tables.
- **Mobile:** Teleport pagination capabilities strictly to the Top Sticky Header! Use stripped-down UI (e.g. just "Page 1 of 1" and core chevron arrows) and place it neatly beneath the action toolbar to save mobile users from endlessly scrolling through lists to reach the next page.

## Layout & Spacing
- **Main Wrapper:** `max-w-[900px] mx-auto` to keep dashboard content focused and readable on ultra-wide screens.
- **Page Padding:** Heavy horizontal padding (`px-12 lg:px-24`) to frame the content beautifully on desktop, with `py-10`. On mobile, rely heavily on `p-4` with smart top/bottom padding (`pb-24`) to give scrolling elements massive breathing room.
- **Section Spacing:** Generous `gap-12` between major layout sections (e.g., Greeting -> Metrics -> Events) to provide visual breathing room.
- **Flex Alignments:** Use `items-end` to align bottom baselines (like dates next to badges) instead of top-aligning, giving a more grounded architectural feel.
