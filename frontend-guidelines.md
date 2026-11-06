# Silang Frontend Guidelines

Use this document as the design reference when adding or changing frontend UI. It records the shared system already present in the app and establishes defaults for new work. Prefer the existing shadcn components and semantic theme tokens over one-off Tailwind colors or new component styles.

## Product UI

- Silang is a compact, desktop-first operations workspace for campaigns, calendar availability, team management, analytics, and dashboard tasks.
- Keep the interface quiet and information-dense: clear labels, restrained borders, small controls, minimal decoration, and strong contrast for the primary action or selected item.
- Reuse familiar patterns across feature areas. A filter, tab, modal, table, or sidepeek should behave and look like its counterparts elsewhere in the app.
- Build responsive layouts deliberately. Preserve readable labels and usable control sizes on mobile; allow horizontal scrolling for dense tables or tab groups when needed rather than compressing their contents until they become hard to use.

## Source of Truth

- Global theme variables, font setup, base element styles, and calendar overrides live in `src/index.css`.
- shadcn is configured in `components.json` with the `radix-mira` style, neutral base colors, CSS variables, and Lucide icons. Use the existing components in `src/components/ui/` and `@/lib/utils` (`cn`) for composition.
- Feature UI lives in `src/features/<feature>/components/`. Check a nearby feature implementation before inventing a new pattern.
- Shared shell pieces are `AppHeader`, `AppSidebar`, and `DashboardLayout`. Shared primitives include `Button`, `Input`, `Textarea`, `Tabs`, `Card`, `Dialog`, and `ResponsiveModal`.
- Theme switching uses the `.dark` class and semantic CSS variables. Theme-aware classes should work in both modes; avoid hard-coded surface colors unless a deliberate brand or status color is needed.

## Typography

### Titles and Descriptions

- Use a consistent title hierarchy on every page, modal, drawer, and major content section. Page titles use `text-2xl font-semibold text-foreground`; modal and drawer titles use `text-base font-semibold text-foreground`; section and card titles use `text-sm font-semibold text-foreground`.
- Give primary page, modal, and drawer titles a concise supporting description directly beneath the title. Use `text-sm` for page-level descriptions and `text-xs` for modal/drawer descriptions, both `font-normal text-muted-foreground`. Descriptions should explain the purpose or context without repeating the title.
- Major content section titles should also have a short description when the section's purpose is not self-evident. Keep it directly below the title with the standard label-to-control spacing; omit filler copy for obvious utility groups and table column headers.
- Do not place decorative or redundant icons beside title text. Reserve icons for navigation, actions, status, and individual detail labels. Keep title color, weight, and spacing consistent across light and dark themes using semantic tokens.

### Font

- Use **Inter Variable** (`font-sans`) for interface text. It is loaded in `src/index.css`.
- Global rendering uses grayscale antialiasing, optimized text rendering, and disables variable optical sizing to keep Inter crisp in light and dark themes. Do not add per-page font-smoothing overrides.
- The Silang wordmark may use the bundled **Etna** face (`font-etna`) and its established dark green treatment. Do not use Etna for general interface copy.
- Use **JetBrains Mono** (`font-mono`) for codes and other machine-readable identifiers.

### Four UI Sizes

Use only these four interface text sizes throughout the system. The compact sizing used by the dashboard controls, maternal records, and top bar is the baseline; use the larger levels only for clear heading hierarchy. Use color, weight, and spacing instead of introducing one-off sizes:

| Size | Tailwind | Use |
| --- | --- | --- |
| Compact | `text-xs` (12px) | Labels, inputs, buttons, table content, tabs, helper copy, navigation, and metadata |
| Standard | `text-sm` (14px) | Section headings, card titles, and supporting copy |
| Strong | `text-base` (16px) | Modal and subsection titles |
| Page | `text-2xl` (24px) | Page titles and the strongest short heading |

- Use only three weights: `font-normal` for body and supporting text, `font-medium` for controls and labels, and `font-semibold` for titles or important values. Do not use `font-bold` or add lighter/heavier weights.
- If compact labels look crowded, add a small positive tracking adjustment to that label (for example, `tracking-wide` at `text-xs`). Keep normal body copy at standard tracking; do not apply wider tracking globally.
- Prefer `text-foreground` for primary content and `text-muted-foreground` for secondary content. Do not use weight alone to make every label compete with its heading.
- Chart ticks, calendar annotations, badges, and other dense interface details also use the four-size scale; do not add sub-12px text exceptions.

## Color and Theme

### Semantic Neutrals

Use semantic tokens so surfaces respond to light and dark mode:

- `bg-background` for the page canvas and standard app surfaces.
- `bg-card` for cards and raised content areas.
- `bg-muted` / `bg-secondary` for quiet gray group backgrounds, table headers, and secondary controls.
- Use the shared shadcn `Input` and `Textarea` colors everywhere: `bg-background` with a subtle `border-input` in light mode, `dark:bg-input/30` in dark mode, and `placeholder:text-muted-foreground`. Avoid page-level fill and placeholder color overrides; input groups may keep their transparent inner controls.
- Use the shared shadcn `SelectTrigger` surface to match inputs: `bg-background` in light mode and `dark:bg-input/30` in dark mode. Keep the option menu on `bg-popover` with `text-popover-foreground`; avoid local muted-fill overrides on select triggers.
- `border-border` or `border-sidebar-border` for separators and component outlines. Prefer the semantic token; use the sidebar token for shell/navigation divisions where it is already established.
- `text-foreground` and `text-muted-foreground` for primary and secondary text.
- Use `bg-primary text-primary-foreground` for primary actions. The base theme is neutral black/white, with the primary theme variables defined in `src/index.css`.

### Light and Dark Mode

- Light mode uses a white canvas and cards, restrained light-gray secondary surfaces, white inputs with subtle gray borders, and clear placeholder contrast.
- Dark mode uses dark neutral canvas/card surfaces, dark input fills with low-contrast neutral borders, and muted placeholders. Text reverses through the semantic foreground tokens.
- Do not hard-code `dark:bg-[#...]` for a new component when a semantic token expresses the same surface. Some existing shell and calendar areas still use explicit dark neutrals; retain them only when matching that established surface is necessary.
- Tabs that use the workspace/filter segmented style have a muted gray list background. In light mode, the selected tab is black with white text; unselected tabs use muted text. Keep the established dark-mode treatment for dark surfaces.
- The login workspace tabs follow that same selected black/white treatment in light mode. Apply it consistently to feature filter tabs.

### Brand and Status Color

- The Silang wordmark and brand mark use **Silang green `#003f2c`** in their established logo treatment. This is a brand accent, not a replacement for the neutral primary action palette across the app.
- Use brand green deliberately for logo/identity and selected small brand illustrations. Do not introduce additional competing accent colors for ordinary controls.
- Status colors (success, warning, error, information) should be consistent and legible in both themes. Prefer existing semantic status tokens or the same status color already used in the feature; do not invent a new shade per page. Pair color with readable text or an icon so meaning does not depend on color alone.
- Use the shared `StatusBadge` for record, campaign, staffing, and availability states. Keep the compact Referrals badge shape (`rounded-sm`, tight padding) with a status-specific Lucide icon and a consistent semantic color (green for positive, orange for ongoing or pending, red for urgent or blocked, and neutral for archived states).
- Workflow progress indicators should move through a red-to-orange-to-green gradient as completion advances; do not use solid green from the first step. Keep the percentage or step label in a color that matches the current progress stage.
- Avoid gradients, decorative color blocks, and colored shadows unless the existing screen or a clear product need calls for them.

## Spacing, Layout, and Shape

- Use Tailwind's regular spacing scale and align neighboring components to shared edges. Common app spacing is `gap-2` for controls, `gap-4` for related content, and `gap-6` for sections/cards; avoid arbitrary values unless a component needs precise alignment.
- Standard feature pages generally use compact mobile gutters (`px-4`) and wider desktop gutters (`md:px-6` or `md:px-8`). Use a centered max-width only when the content benefits from it. The dashboard overview is intentionally narrower than analytics and data-heavy pages; choose width based on the content, not a single global max-width.
- Align sticky tabs, toolbars, tables, and pagination to the same page gutter. Put the shared horizontal padding on their sibling wrappers and avoid adding another nested gutter that shifts the table or controls out of alignment.
- Keep form rows and filters compact. Standard action/filter inputs and buttons are usually `h-8`; smaller table or inline controls may be shorter when surrounding density requires it. Ensure touch targets remain comfortable on mobile.
- Select triggers and dropdown fields should match the height of adjacent inputs. Use the shared `h-8` default for standard fields, and only use a smaller height when all controls in that compact group share it.
- Keep field labels consistently separated from their input, select, or segmented control with `gap-1.5`, matching the maternal registration form. Avoid controls touching their labels or adding a second margin that makes the gap uneven.
- For backend-connected forms, mark every required field in its label with a red asterisk. Validate with Zod through React Hook Form and the shared shadcn `Form`, `FormField`, `FormControl`, and `FormMessage` components; expose field errors accessibly and use the shared input invalid state. Keep optional fields explicitly marked `(Optional)` and do not rely on browser-only validation.
- Use `rounded-md` for controls and compact elements; `rounded-lg` or `rounded-xl` for cards and overlays. Avoid mixing many radii in one view.
- Separate dense data with subtle borders, row dividers, or muted headers rather than heavy shadows. Cards are generally flat (`shadow-none` or a restrained shadow) with a semantic surface and light outline.
- Keep related labels and controls close together. Use consistent internal padding across sibling cards, form fields, drawers, and sidepeeks; check all four edges, especially the bottom edge near footers or actions.
- For horizontal card carousels, preserve the existing snap behavior and enough side padding for the next card to peek into view when that interaction is useful.

## Shared Components and Interaction

### Buttons and Inputs

- Use the shared shadcn `Button`, `Input`, `Textarea`, `Select`, and related primitives rather than recreating their focus, disabled, and invalid states.
- Keep button hierarchy clear: primary actions use the default primary variant; secondary actions use outline/secondary; low-priority actions use ghost; destructive actions use destructive styling.
- Maintain the shared compact control height and typography. Avoid making adjacent buttons different heights without a clear hierarchy or responsive reason.
- Inputs must look editable at a glance. Retain the light-gray fill and border in both themes, placeholder contrast, focus ring, disabled treatment, and invalid treatment from the shared primitive.
- Keep prefilled form selections concise: show the selected value once, and omit repeated metadata when the surrounding page already identifies the record (for example, do not repeat a mother's serial number and age beneath her preselected name).
- Do not add required-field validation or other behavior to a UI-only task unless requested. Keep visual affordance separate from unrequested form logic.

### Tooltips

- Add a shadcn tooltip to icon-only buttons and links when their purpose is not unmistakable from nearby context (for example, copy, export, refresh, pagination, theme, and close controls).
- Keep an accessible `aria-label` on every icon-only control; a tooltip supplements but does not replace its accessible name.
- Use concise action wording that matches the control. Avoid tooltips on controls that already have a clear visible text label, and do not repeat the same label unnecessarily.
- Use a short hover delay (around 500 ms) and avoid native `title` attributes when a shadcn tooltip is available.

### Toast Feedback

- Use the shared Sonner toaster for successful create, update, and delete actions, and for incoming patient messages.
- Use concise Sonner feedback for transient system outcomes such as an external sign-in popup being closed. Keep field validation inline with `FormMessage` and avoid duplicating the same error in both a toast and the form.
- Do not add persistent or inline page UI for general reminders, account/workspace mismatches, or action-level/API errors. Notify the user with a toast; reserve inline form messaging for field-specific validation errors.
- Show success feedback only after the action completes; do not toast when opening a form, advancing a step, or cancelling an action.
- Keep messages short and specific (for example, “Appointment created” or “Maternal record deleted”).

### Date Inputs

- Use the shared `DateInput` from `src/components/ui/date-input.tsx` for single-date entry throughout the system. It matches the maternal Date of Birth field: a compact `h-8` input with a calendar icon button and shadcn calendar popover.
- Always show the `MM/DD/YYYY` placeholder. Accept typed digits with automatic slash insertion and allow date selection from the calendar. Store valid dates as ISO `yyyy-MM-dd` strings where a value is needed.
- Keep future-date limits specific to the field (for example, Date of Birth and LMP cannot be in the future); do not change the shared visual pattern for those constraints.
- Date-range pickers remain range controls and may use the calendar range UI. Do not use native `type="date"` inputs, text-only date fields, date dropdowns, or calendar buttons that display a formatted date instead of the shared input for single-date entry.

### Tabs and Filters

- Use `Tabs`, `TabsList`, and `TabsTrigger` from `@/components/ui/tabs` for stateful tab navigation.
- Keep tab labels text-only throughout the system. Use icons in navigation, actions, filters, and status badges, not inside tabs.
- Use the shared `Button` `filter` variant with `size="filter"` for filter pills so height, dashed border, spacing, and theme colors match Maternal Records.
- Reuse the segmented muted background for peer filters or view switches. In light mode, selected is black/white and unselected is muted text; keep dark mode theme-aware.
- Keep labels concise. On narrow screens, let the group scroll horizontally or stack intentionally; do not let a large number of tabs become unreadably compressed.
- Use tabs for switching related views, not as a substitute for primary navigation.

### Table and List Toolbar Hierarchy

- Use a two-row toolbar for table and list pages. Row one places view tabs on the left and utility actions on the far right; keep the main page action with the related utility action when the workflow calls for it (for example, Create Maternal Record beside Scan QR).
- Row two places the search input first, with filter buttons directly beside it. Show `Reset Filter` only while a search or filter is active.
- Filter popovers use the same checkbox selection behavior and spacing. Do not place individual `Clear` buttons inside each filter popover; provide one `Reset Filter` control beside the filters to clear all active search and filter criteria at once. Keep filter labels stable without per-filter count suffixes.
- Keep both rows aligned to the table's horizontal edges. Use compact `h-8` controls, dashed outline filter buttons with the circular plus icon, and the shared muted input fill. Avoid adding a third toolbar row or letting controls wrap unpredictably; allow horizontal scrolling on narrow screens where necessary.
- For calendar-based appointment views, preserve the date navigation in the upper-left and filters in the lower-left. Place view controls and actions in the upper-right so the layout retains the same two-row hierarchy.

### Cards, Tables, and Data

- Use the shared `Card` primitives when their spacing and structure fit. If a feature uses a custom bordered panel, keep its surface, border, radius, and padding consistent with nearby cards.
- Data tables should favor compact typography, clear column headings, subtle row separators, aligned numbers, and responsive overflow. Keep table actions close to the relevant row or table toolbar.
- Every data table starts with a row-selection checkbox column at the far left, including tables in profile sub-tabs. Include a select-all checkbox in the header and matching row checkboxes; keep the action column at the far right without a visible header.
- Row action cells use a compact vertical-ellipsis trigger and the shared `TableRowActions` menu. Start directly with concise, row-specific commands; do not add an `Actions` heading or a separator above the first command. Use subtle separators only between distinct command groups, mark destructive commands with the destructive variant, and keep them in the final group. Stop row-click propagation from the trigger.
- Destructive or high-impact actions such as deleting a record, cancelling a transfer or appointment, or deactivating an account must open a confirmation dialog before proceeding. State the exact record and consequence, require password entry, and use a clearly worded destructive confirmation button. Never execute these actions directly from a context menu.
- When a table has no rows, keep its column headers visible and render a centered empty state inside the table body. Use the shared `TableEmptyState`/`EmptyStateContent` primitives: a quiet icon tile, short feature-specific title and description, and one relevant next action when useful. On mobile card lists, use the same content in a restrained bordered region. Use reset/filter guidance when the empty result comes from active search or filters.
- Put a consistent pagination footer directly below every data table with a `gap-4` (16px) and no separator line: selected-row count on the left; rows-per-page, page count, and first/previous/next/last controls grouped on the right. Use the shared `TablePaginationFooter` primitive so spacing, select sizing, and disabled states remain consistent.
- Use consistent status badges and compact metadata styles. Keep status text legible and avoid relying on a colored dot alone.
- Staff roles use the short labels `Nurse`, `Midwife`, and `Admin`. Render role badges with the compact bordered muted treatment used for referral codes, but use the standard interface font rather than monospace.
- Charts should use the existing chart primitives and theme-aware text/grid colors. Keep chart legends, axes, and tooltips readable at the smallest supported viewport.

### Modals, Drawers, and Sidepeeks

- Use `ResponsiveModal` for content that should become a dialog on desktop and a Vaul drawer on mobile. Use the underlying `Dialog` or `Drawer` when a screen needs specialized behavior.
- Use the shared `DrawerHeading` for drawer headers: a 32px rounded icon tile with a subtle sidebar-border ring, followed by a left-aligned title and supporting description. Keep the icon, title, and description vertically centered and use the same compact typography across drawers; place close or status controls at the far right without displacing the text.
- Standard right-side drawers use the Inter-Clinic Referrals width: 75% of the viewport, capped at 24rem (384px). Keep specialized wide detail drawers, such as Appointment Details, at their explicitly designed width.
- Do not add a top border to the first content section directly below `DrawerHeading`; its bottom border already separates the header. Add section separators only between later content sections, and avoid doubled borders at adjacent section edges.
- Desktop dialogs are centered, outlined, compact, and use a restrained shadow. Mobile drawers have rounded top corners, safe bottom spacing, and an internal scroll region when content exceeds the viewport.
- Match overlay padding on all sides and keep action buttons grouped consistently. Account for mobile safe areas and avoid placing the only action below an inaccessible edge.
- Modal action buttons must have clear space and hierarchy, never divider lines, borders, or boxed separators between buttons. Use distinct button variants for secondary and primary actions, with a 12–16px gap when grouped. Place the dismissive or secondary action on the left and the primary action on the right when the footer has room; stack or expand controls intentionally on narrow screens.
- Keep modal footers free of separator lines, including a border above the action row. Use clear padding, alignment, a 12–16px button gap, and distinct button styles to define the action area.
- Sidepeeks slide from the right on desktop and should align to the app shell without adding a second heavy card frame around the whole panel. On mobile, present the same content in the established drawer pattern.
- Drawer section separators span the full content width, edge to edge inside the drawer. Keep text and controls inset with section padding rather than shortening the separator to the content column width. Apply this to appointment, referral, and offline-sync drawers.
- Only remove a close control or prevent dismissal when the flow explicitly requires it. Preserve clear focus and keyboard behavior for normal dialogs.

## Application Shell and Responsive Behavior

- The dashboard shell consists of a collapsible sidebar, a compact top header, and a scrollable route content region. Preserve that separation so the shell stays stable while feature content changes.
- Keep sidebar navigation labels, active state, icon sizing, and dividers consistent. Use Lucide icons from `lucide-react` and match the neighboring icon size/stroke treatment.
- Keep breadcrumbs and shell actions in the header. Avoid duplicating global navigation inside feature pages.
- On mobile, use the existing sidebar/drawer behavior and place floating quick actions clear of bottom navigation and safe areas.
- For calendar, keep view controls, toolbar actions, event cards, and calendar grid styling aligned with the existing calendar components. Dense event details may use compact metadata so events remain scannable.
- Preserve keyboard focus visibility, accessible labels for icon-only controls, meaningful image alt text, and clear disabled/selected states.

## Icons, Motion, and Decoration

- Use `lucide-react` icons unless the feature already has a branded asset. Use consistent sizes within a control group and do not use emoji as a replacement for core interface icons.
- Motion should clarify state changes or navigation and remain brief. Follow existing shadcn enter/exit animations and avoid adding motion that delays routine actions.
- Avoid excessive shadows, ornamental borders, or decorative empty space that pushes important operational information below the fold.

## Before Adding a New Pattern

1. Check the matching feature and the shared primitives for an existing implementation.
2. Prefer a semantic theme token and shared component over a page-specific style.
3. Match typography, control height, border, radius, spacing, and selected/hover/focus states with the nearest existing UI.
4. Check both light and dark themes and a narrow viewport.
5. Keep this guide aligned when a deliberate system-wide design decision changes.
