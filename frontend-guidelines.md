# Silang Frontend Guidelines

Use this document as the design reference when adding or changing UI in the main Silang clinic system. It describes the maternal and birth-monitoring product, its established layout patterns, and the shared component defaults. Prefer existing shadcn components and semantic theme tokens over one-off styles.

## Product and Interface Principles

- Silang supports maternal records, prenatal and postpartum care, appointments, referrals, staff workflows, messaging, and facility settings.
- Keep the interface calm and operational: clear hierarchy, compact readable information, restrained surfaces, and color reserved for primary actions, clinical risk, and state.
- Reuse patterns across features. Tabs, filters, tables, badges, forms, drawers, empty states, and loading states should behave and look like their established counterparts.
- Preserve the information hierarchy and spacing of the source pattern when adapting it. Do not add nested cards, redundant copy, decorative separators, or repeated patient metadata just to fill space.
- Responsive design is part of the pattern. Keep desktop tables dense and aligned; on phones use stacked records, bottom sheets, and controls sized for touch.

## Main-System Structure

The normal application surface follows this hierarchy:

1. **App shell:** collapsible sidebar, compact top bar, and route content area.
2. **Top bar:** breadcrumbs on the left; global online/sync status, notifications, theme control, and Quick Create on the right.
3. **Feature content:** tabs and page actions, then search and filters, then the table, calendar, or other main content.
4. **Details and forms:** profile pages, drawers, dialogs, or mobile bottom sheets, depending on the task.

- The sidebar groups destinations by workflow and keeps facility identity near the top and the account switcher at the bottom.
- Breadcrumbs identify the current page. Do not repeat a large page heading when it adds no information or conflicts with the established content layout.
- Keep global navigation in the shell. Feature pages should not add a second global navigation bar.
- Align breadcrumbs, tabs, toolbars, tables, and pagination to shared left and right edges. Avoid nested horizontal padding that makes sibling rows start or end at different positions.

## Source of Truth

- Global theme variables, typography, base element styles, radius tokens, and responsive sheet rules live in `src/index.css`.
- shadcn is configured in `components.json`. Use existing primitives in `src/components/ui/` and `cn` from `@/lib/utils`.
- Feature UI lives in `src/features/<feature>/components/`. Check the nearest established feature before introducing a new pattern.
- The shared shell is implemented by `AppHeader`, `AppSidebar`, and `DashboardLayout`.
- Shared primitives include `Button`, `Input`, `Textarea`, `Select`, `Tabs`, `Card`, `Dialog`, `Sheet`, `ResponsiveModal`, `StatusBadge`, table action menus, empty states, pagination, skeletons, tooltips, and Sonner toasts.
- Theme switching uses the `.dark` class and semantic CSS variables. Prefer theme tokens over literal surface colors. Preserve a local color only when it represents an intentional brand or status treatment already used by the feature.

## Typography

### Font and Rendering

- Use **Inter Variable** (`font-sans`) for web interface text. It is loaded in `src/index.css`.
- Global text rendering applies grayscale antialiasing, optimized text rendering, and disables variable optical sizing. Do not add page-specific font-smoothing overrides.
- The Silang wordmark may use the bundled **Etna** face (`font-etna`) and its established brand treatment. Do not use Etna for general interface copy.
- Use **JetBrains Mono** (`font-mono`) for transfer codes and other machine-readable identifiers. Role labels and ordinary names use the interface font.

### Three Interface Sizes

Use only these three sizes for web interface text. Build hierarchy with these sizes, the three approved weights, color, and spacing rather than one-off font sizes:

| Level | Tailwind | Use |
| --- | --- | --- |
| Compact | `text-xs` (12px) | Labels, inputs, buttons, table content, tabs, helper copy, navigation, badges, and metadata |
| Standard | `text-sm` (14px) | Body/supporting copy, row titles, and section/card headings |
| Emphasis | `text-base` (16px) | Dialog/drawer titles and the strongest short headings or values |

- Use only three weights: `font-normal` for body and supporting text, `font-medium` for controls and labels, and `font-semibold` for titles or key values. Do not use `font-bold` or lighter/heavier weights.
- Keep most operational UI compact, as in Maternal Records and the top bar. Use the emphasis level sparingly.
- Do not use `text-[10px]` or other sub-12px exceptions. Use color, spacing, or an icon to distinguish compact metadata instead.
- Keep default tracking for body copy. If a short compact label looks crowded, use a subtle positive tracking adjustment on that label only.
- Use `text-foreground` for primary content and `text-muted-foreground` for secondary content. Do not make every label compete with a heading by increasing weight.

## Color, Theme, and Radius

### Semantic Surfaces

- `bg-background` is the page canvas and standard app surface.
- `bg-card` is for a distinct card or raised content region. Avoid putting cards inside cards without a clear grouping need.
- `bg-muted` and `bg-secondary` are quiet gray group backgrounds, table headers, and secondary controls.
- Shared shadcn inputs use `bg-background`, a subtle `border-input`, and `placeholder:text-muted-foreground` in light mode; dark mode uses the established `dark:bg-input/30` treatment.
- Shared selects use the same surface and height as inputs. Their option menu uses `bg-popover` and `text-popover-foreground`.
- Use `border-border` or `border-sidebar-border` for outlines and separators. Use the sidebar token for shell/navigation divisions where established.
- Use `text-foreground` and `text-muted-foreground` for primary and supporting text.
- Use `bg-primary text-primary-foreground` for primary actions. The shared web primary palette is neutral black/white; Silang green is a brand accent, not the default button color.

### Light and Dark Themes

- Light mode uses a white canvas and cards, restrained light-gray secondary surfaces, noticeable input surfaces, and readable placeholders.
- Dark mode uses dark neutral canvas/card surfaces, slightly lighter input fills that read as editable, and muted placeholders. Text uses semantic foreground tokens.
- Do not add a literal `dark:bg-[#...]` when a semantic token expresses the same surface. Retain an existing explicit dark surface only when it is a deliberate part of that feature's established treatment.
- Segmented view tabs use a muted group surface. In light mode the selected tab is black with white text; unselected tabs use muted text. Keep the dark equivalent theme-aware.
- Avoid adding gradients, colored shadows, or large decorative color blocks to ordinary operational UI.

### Brand and Status Colors

- Use Silang green `#003f2c` for the established brand mark/wordmark treatment and selected brand illustrations. Do not substitute it for the neutral primary action palette.
- Use the shared `StatusBadge` for clinical risk, referral, appointment, delivery, staffing, and availability states.
- Keep badge shape compact (`rounded-sm`), with tight padding, medium text, and an appropriate icon. Use green for positive/completed states, orange for pending or in-progress states, red for urgent or blocked states, and neutral gray for inactive or archived states. Badge labels use normal title capitalization, never all caps.
- Preserve the distinction between a status badge and a neutral role/identifier badge. Role badges use the compact muted treatment; transfer codes use the same compact visual family with monospace type.
- Use color with a text label and, where appropriate, an icon. Meaning must not depend on color alone.
- Progress bars that communicate completion use the established red-to-orange-to-green progression; do not show a completed green state before progress warrants it.
- Status colors should come from the shared mapping or semantic tokens. Avoid new per-page hex values for statuses.

## Spacing, Placement, and Alignment

- Use the regular Tailwind spacing scale. Common spacing is `gap-2` between controls, `gap-4` between related groups, and `gap-6` between sections or cards.
- Standard feature pages use `px-4` on phones and usually `md:px-6` or `md:px-8` on larger screens. Use a centered max-width only when it improves the content; data-heavy pages should retain the width needed by their columns. The Dashboard overview is intentionally narrower than list pages.
- Keep shared horizontal padding on sibling wrappers. Tabs, toolbars, tables, and pagination should align to the same page gutter without extra nested padding.
- The common operational control height is `h-8`. Inputs, select triggers, filter buttons, and neighboring standard buttons should match. Use smaller controls only when the whole compact group uses that size.
- Keep labels close to their controls with a consistent `gap-1.5` to `space-y-2` rhythm. Do not let a label touch its input or create a larger gap for one field in an otherwise aligned form.
- In two-column forms, align labels and controls row by row. If a field is intentionally full-width, span the full row; passwords and long text inputs should not appear arbitrarily narrower than adjacent fields.
- Use `rounded-md` for controls and compact elements. Use the established card/overlay radius for larger surfaces. Avoid mixing several radii in one view.
- Prefer subtle borders and row separators over heavy shadows. Most cards are flat, with a semantic surface and light outline.
- Check all four edges of cards and overlays. Padding at the bottom and right should match the top and left unless the layout deliberately anchors a footer or action.
- Avoid redundant information. If the surrounding page identifies a selected mother, do not repeat serial number, age, or other profile details beneath the selected name unless that information helps distinguish choices.

## Forms and Validation

- Use the shared shadcn `Button`, `Input`, `Textarea`, `Select`, and form primitives rather than recreating focus, disabled, or invalid states.
- Select triggers should match adjacent inputs in height, width, typography, border, and surface. Do not use a narrow select beside a full-width input unless the field itself is genuinely short.
- For backend-connected forms, mark every required field with a red asterisk in its label. Validate with Zod and React Hook Form through the shared shadcn form components. Keep field errors accessible and use the shared invalid state.
- Mark optional fields with subtle `(Optional)` text. Do not infer a required field from placeholder text.
- For UI-only work, do not add validation behavior unless requested. Keep visual required markers distinct from form functionality.
- Use the shared `DateInput` in `src/components/ui/date-input.tsx` for single-date entry. Show `MM/DD/YYYY`, accept typed digits with automatic slash insertion, and allow calendar selection. Store valid values as ISO `yyyy-MM-dd` when needed.
- Date-specific limits belong to the field (for example, birth date and LMP cannot be in the future); preserve the shared date-input pattern. Date-range selection may use the range calendar UI.

## Tabs, Filters, and List Toolbars

- Use `Tabs`, `TabsList`, and `TabsTrigger` from `@/components/ui/tabs` for stateful view switching.
- Keep tab labels text-only. Put icons in navigation, actions, filters, and status badges—not tabs.
- Counts appear in parentheses, such as `Appointments (3)`. Do not add count badges or other extra tab decorations.
- Use the shared `Button` filter variant with `size="filter"` for filter pills. This is the Maternal Records reference for height, dashed border, plus icon, spacing, and theme colors.
- Reuse the muted segmented background for related views. On phone widths, use the shared labeled select treatment for long tab groups instead of compressing them.
- Use tabs to switch related views, not as a replacement for primary navigation.

### Standard Two-Row List Hierarchy

Use this layout for list/table pages unless a specific workflow has an established variation:

1. **View/action row:** tabs on the left; utility actions and one primary action aligned to the far right.
2. **Query row:** search first, filter buttons directly beside it, and `Reset Filter` only while search or filters are active.
3. **Data area:** table directly below the query row, with pagination immediately underneath.

- Keep the two rows and data area aligned to the same horizontal edges.
- Use compact `h-8` controls and the shared filter variant. Do not place a separate Clear button inside each filter menu; one Reset Filter clears active search and filters.
- Keep labels concise and stable. Do not add per-filter count suffixes unless the feature already has that convention.
- Avoid a third toolbar row or unpredictable wrapping. At narrow widths, reflow or use the established mobile controls rather than allowing isolated actions to wrap onto their own row.
- Appointment lists may place their action group inline with the view tabs as an established variant. Calendar navigation remains at the upper left, with actions/view controls at the upper right and filters below.

## Tables, Cards, Empty States, and Loading

- Use compact table typography, concise headings, subtle row dividers, and consistent row heights. Keep related values together as primary and muted secondary lines.
- Every table starts with a selection checkbox column at the far left, including profile sub-tabs. Include a matching select-all checkbox in the header.
- Put row actions at the far right with a compact vertical-ellipsis trigger and the shared `TableRowActions` menu. Do not show an `Actions` header.
- Row menus begin with concise, row-specific commands; do not add an “Actions” label above them. Use separators only between meaningful command groups, with destructive actions in the final group.
- A row click should open its associated profile/detail view where the workflow calls for it. Stop event propagation on checkboxes, links, and row action triggers.
- On phones, replace dense tables with stacked cards that follow the Inter-Clinic Referrals mobile record pattern: primary record detail first, compact secondary information, clear status, selection when needed, and equivalent row actions. Do not force horizontal desktop-table scrolling on a phone.
- Keep an appropriate mobile card skeleton while loading. For desktop, use the shared table skeleton. Loading placeholders should be quiet, compact, and shaped like the content they replace.
- For empty tables, retain the column headers and show the empty state in the table body. Use `TableEmptyState`/`EmptyStateContent`: muted icon tile, concise feature-specific title and description, and one relevant action when useful. Filtered-empty states should explain that the search or filters can be adjusted.
- Place `TablePaginationFooter` directly below the table with no separator line. Selection count stays at the left; rows-per-page, page count, and navigation stay grouped at the right. Keep it aligned to the table edges and use the shared component.
- Keep table header and row heights proportionate. Headers should not be taller than the content rows without a clear reason.

## Badges and Identifiers

- Use `StatusBadge` for clinical risk, referral lifecycle, appointments, deliveries, pregnancy outcome, staff status, and availability.
- Use the standard title capitalization in every badge (for example, `High Risk`, `Pending`, `Delivered`). Do not render all-caps status labels.
- A “Not Assessed” or role-like classification should use the neutral badge style, not the visual treatment of a clinical warning.
- The delivered pregnancy state uses the positive green/check treatment; alive newborn state also uses positive green/check; deceased uses neutral gray.
- Codes and machine-readable identifiers use JetBrains Mono only when they function as codes (for example, transfer codes). Do not apply monospace to staff roles or ordinary labels.

## Modals, Drawers, and Bottom Sheets

### Shared Behavior

- Use `ResponsiveModal` for content that should be a centered dialog on desktop and a bottom sheet on mobile. Use `Dialog` or `Drawer` directly only when the workflow needs specialized behavior.
- Every drawer header should share the main-system header alignment: title and optional description aligned consistently, close control at the far right, and a bottom border that lines up with the shell/content edge.
- A title icon is optional. Use one only when it adds clear context; do not add a decorative icon beside every title.
- Do not add a top border to the first section below a drawer header; the header’s bottom border already separates it. Later section separators span the full drawer width, edge to edge inside the panel, while content remains inset.
- Standard right-side drawers use the Inter-Clinic Referrals width: 75% of the viewport, capped at 24rem (384px). Keep explicitly designed exceptions, such as Appointment Details, at their established width.
- Do not wrap every section in a card. Use spacing and clear typography for hierarchy; use a surface or border only when it distinguishes a meaningful group.

### Scrolling and Actions

- Keep the header fixed and the body/content region scrollable. Keep primary and dismissive actions visible in a fixed footer when the sheet is long enough to scroll.
- On mobile, use a full-width bottom sheet with safe-area spacing and rounded top corners. The content—not the header—must scroll.
- Match internal padding across all four sides. Check footer alignment and bottom padding so actions are not clipped or crowded.
- Do not use separators between modal action buttons or add a border above the footer. Use whitespace, alignment, and distinct button variants to establish hierarchy.
- Put secondary/dismissive actions to the left and the primary action to the right when the footer has room. Use a 12–16px gap; intentionally stack or expand actions on narrow screens.
- Destructive or high-impact actions require a confirmation dialog before execution. State the exact record and consequence, require password confirmation when the flow calls for it, and use a clearly worded destructive action.
- Preserve keyboard focus, Escape behavior, and accessible names. Do not remove close behavior unless the workflow explicitly requires a non-dismissible step.

## Navigation, Tooltips, and Feedback

- Keep breadcrumbs and global actions in the top bar. Sidebar labels, active states, icon sizes, and section spacing should match the shared shell.
- On mobile, selecting any sidebar destination or action closes the sidebar bottom sheet before navigating or opening the next surface.
- Use Lucide icons from `lucide-react` unless the feature has an established branded asset. Keep icon size and stroke treatment consistent inside a group; do not use emoji for core actions.
- Give every icon-only `Button` a concise `aria-label`; the shared button shows that label in a shadcn tooltip on hover and keyboard focus. Use `tooltip` when the visible explanation should differ from the accessible label. Keep explicit tooltips for controls outside the shared button primitive.
- Use the contextual guide pattern for task walkthroughs. Tours dim the surrounding interface, explain one real control at a time, and reset to the first step when closed or completed.
- Reserve a separate control slot for the guide in every overlay header. Place the guide immediately left of the close button, keep at least a 4px gap, and reserve enough right padding in the title so neither control overlaps text. When a surface provides its own close button, position the guide to its left rather than adding another close button.
- Clamp tour popovers to the visible viewport or overlay, and keep the guide controls reachable on narrow screens.
- Use the shared Sonner toaster for successful creates, updates, deletes, incoming patient messages, and transient system outcomes. Show success only after completion. Keep field-specific validation inline and avoid duplicating the same error in a toast.
- Do not add persistent reminder banners or extra page UI for transient action/API errors; use a toast unless the user needs to correct a specific field.

## Main Feature References

Use these as the first references when a new pattern is needed:

1. **Maternal Records** — list hierarchy, toolbar rows, filters, checkboxes, status badges, empty states, mobile records, and pagination.
2. **Create Maternal Record** — field labels, required markers, form spacing, sectioning, and guided flow.
3. **Mother Profile** — patient identity, obstetric summary, clinical risk context, and patient-specific history.
4. **Inter-Clinic Referral drawer** — transfer lifecycle, detail hierarchy, status presentation, and drawer structure.
5. **Settings modal** — section navigation within a responsive overlay.
6. **Dashboard** — compact overview metrics and upcoming appointment list.
7. **Calendar** — date navigation, weekday grid, appointment pills, and closed-day behavior.
8. **Messages** — two-column conversation list/chat and independent scroll regions.

## Before Adding a New Pattern

1. Check the matching feature and shared primitive for an existing implementation.
2. Confirm the pattern’s hierarchy: what is global, what belongs to the current tab, and what belongs to the record or row.
3. Prefer semantic theme tokens and shared components over local colors and duplicate controls.
4. Match typography, spacing, control height, badge meaning, radius, and alignment with the nearest reference.
5. Check light and dark themes, loading/empty/error states, keyboard access, and narrow mobile layouts.
6. Update this guide when a deliberate system-wide decision changes.
