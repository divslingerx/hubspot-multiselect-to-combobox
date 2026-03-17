# Multiselect to Combobox

Converts HubSpot `hsfc-CheckboxFieldGroup` multi-select checkboxes into searchable, accessible combobox dropdowns with multi-select capability.

Designed to be dropped into a HubSpot form as a single JS snippet — no build tools, no dependencies.

## Features

- **Searchable dropdown** — filter options by typing
- **Multi-select with pills** — selected items display as removable tags
- **Automatic initialization** — watches the DOM for HubSpot form elements to load, then converts them
- **Mobile friendly** — 44px touch targets, viewport-aware dropdown height, "Done" button on touch devices
- **Accessible** — full keyboard navigation, ARIA attributes, screen reader announcements via live region
- **Configurable** — target specific checkbox groups by ID, customize pill colors
- **Non-destructive** — original checkboxes are hidden but still toggled, so HubSpot form submission works normally

## Usage

### As an external script

```html
<script src="multiselect-to-combobox.js"></script>
```

### As an inline snippet (HubSpot custom code)

Copy the contents of `multiselect-to-combobox.js` into a `<script>` tag in your HubSpot form's custom code section.

## Configuration

Edit the `CONFIG` object at the top of the file:

```js
const CONFIG = {
  targetIds: [],    // empty = convert all, or ['id-of-group-1', 'id-of-group-2']
  pillBg: "",       // pill background color, e.g. '#0091ae'
  pillColor: "",    // pill text color, e.g. '#fff'
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `targetIds` | `string[]` | `[]` | IDs of specific `hsfc-CheckboxFieldGroup` elements to convert. Empty array converts all. |
| `pillBg` | `string` | `""` | Background color for selected item pills. Uses default light gray when empty. |
| `pillColor` | `string` | `""` | Text color for selected item pills. Inherits from parent when empty. |

Pill colors can also be overridden via CSS custom properties `--mscombo-pill-bg` and `--mscombo-pill-color`.

## Keyboard Navigation

| Key | Action |
|---|---|
| `Enter` / `Space` | Open/close dropdown (on trigger), toggle option (in list) |
| `Arrow Down` | Open dropdown or move to next option |
| `Arrow Up` | Move to previous option |
| `Home` / `End` | Jump to first/last option |
| `Escape` | Close dropdown and return focus to trigger |
| `Tab` | Close dropdown and move to next form field |

## Accessibility

- `role="combobox"` on trigger with `aria-expanded`, `aria-controls`, and `aria-label` pulled from the HubSpot field label
- `role="listbox"` with `aria-multiselectable="true"` on the options container
- `role="option"` with `aria-selected` on each option row
- `aria-activedescendant` tracks the keyboard-focused option
- Pill remove buttons have `role="button"`, `tabindex="0"`, and descriptive `aria-label`
- Live region (`aria-live="polite"`) announces selections and removals to screen readers
- Visible focus indicators on all interactive elements

## How It Works

1. The script runs immediately and begins watching the DOM with a `MutationObserver`
2. When `.hsfc-CheckboxFieldGroup` elements appear (i.e., the HubSpot form finishes loading), they are converted
3. The original checkbox inputs are hidden but remain in the DOM — clicking a combobox option toggles the underlying checkbox and fires `change`/`input` events
4. HubSpot's form submission picks up the checkbox values as normal
5. The observer disconnects after conversion (or after 30 seconds as a safety timeout)
