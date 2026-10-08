# G-Link style guide (F-01)

One page for the whole team. The look lives in `src/styles/tokens.css`. Use the variables there (for example `var(--color-primary)`), never raw colours or pixel sizes.
See every part working: run `npm run dev` and open http://localhost:5173.

## Colours
| Use | Variable | Hex |
|---|---|---|
| Main colour, buttons, headings | `--color-primary` | #2e4a7a |
| Soft background of the main colour | `--color-primary-soft` | #e3ebf6 |
| Success, Approved | `--color-success` | #1e7b34 |
| Error, Rejected, danger | `--color-danger` | #b03a3a |
| Warning, Pending | `--color-warning` | #b45309 |
| Information | `--color-info` | #3b5b92 |
| Text / muted text | `--color-text` / `--color-muted` | #1a1a1a / #666666 |
| Borders / page background | `--color-border` / `--color-bg` | #c8ceda / #f5f7fb |

Booking status colours: `--status-pending`, `--status-approved`, `--status-rejected`, `--status-cancelled`, `--status-completed`.

## Fonts and sizes
System font (`--font-body`): nothing to download. Sizes: `--text-sm` 0.875rem, `--text-md` 1rem (body), `--text-lg` 1.25rem, `--text-xl` 1.625rem, `--text-2xl` 2rem.

## Spacing and shape
Spacing is in steps of 4px: `--space-1` (4px) to `--space-7` (48px). Corners: `--radius` 6px, `--radius-lg` 10px.

## Ready-made parts (`src/components/ui/`)
| Part | Use it like |
|---|---|
| Button | `<Button variant="primary" \| "secondary" \| "danger" loading disabled>` |
| TextInput | `<TextInput label="Email" type="email" error="..." help="..." />` |
| PasswordInput | `<PasswordInput label="Password" error="..." />` (has Show / Hide) |
| Select | `<Select label="Gender" options={[{ value, label }]} placeholder="Choose..." />` |
| DatePicker | `<DatePicker label="Check-in" min="2026-10-20" />` (dates are YYYY-MM-DD) |
| Table | `<Table columns={[{ key, header, render? }]} rows={[...]} emptyMessage="..." />` |
| Modal | `<Modal open title onClose footer>...</Modal>` (Escape closes it) |
| Toast | `const toast = useToast(); toast.success('Saved')` |

## Rules
1. Build pages from these parts. If a part is missing, add it to `components/ui/` and show it on the style guide page.
2. Show errors in red under the box, using the `error` prop. Never use `alert()`.
3. Every box has a label.
4. Check each page on a phone-size screen: nothing may be cut off.
