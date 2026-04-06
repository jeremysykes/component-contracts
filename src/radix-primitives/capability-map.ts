import type { PrimitiveCapability } from "../shared/schemas.js";

export const CAPABILITY_MAP: Record<string, PrimitiveCapability> = {
  Dialog: {
    name: "Dialog",
    radixPackage: "@radix-ui/react-dialog",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "dialog",
      keyboardInteractions: [
        "Escape closes the dialog",
        "Tab moves focus within the dialog (focus trap)",
        "Shift+Tab moves focus backwards within the dialog",
      ],
      ariaAttributes: [
        "aria-modal",
        "aria-labelledby",
        "aria-describedby",
      ],
    },
    compositionPattern:
      "Dialog.Root > Dialog.Trigger + Dialog.Portal > Dialog.Overlay + Dialog.Content > Dialog.Title + Dialog.Description + Dialog.Close",
    caveats: [
      "Must include Dialog.Title for accessibility — use VisuallyHidden if no visible title",
      "Dialog.Portal renders outside the DOM hierarchy — z-index stacking context resets",
      "Nested dialogs require separate Root instances",
      "Scroll lock is applied to body by default — can conflict with custom scroll implementations",
    ],
    recommendedFor: ["Modal", "ConfirmationDialog", "Sheet", "Drawer"],
    avoidFor: ["Tooltip", "Toast", "InlineAlert"],
    version: "1.1.4",
  },

  Popover: {
    name: "Popover",
    radixPackage: "@radix-ui/react-popover",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "dialog",
      keyboardInteractions: [
        "Escape closes the popover",
        "Tab moves focus into the popover content",
        "Focus returns to trigger on close",
      ],
      ariaAttributes: [
        "aria-expanded",
        "aria-haspopup",
        "aria-controls",
      ],
    },
    compositionPattern:
      "Popover.Root > Popover.Trigger + Popover.Portal > Popover.Content > Popover.Arrow + Popover.Close",
    caveats: [
      "Positioning uses Floating UI under the hood — collision detection may override explicit side/align",
      "Arrow component must be a direct child of Content",
      "Content does not trap focus by default unlike Dialog",
    ],
    recommendedFor: [
      "DropdownContent",
      "ColorPicker",
      "DatePicker",
      "FilterPanel",
    ],
    avoidFor: ["Tooltip", "Menu", "Select"],
    version: "1.1.4",
  },

  Tooltip: {
    name: "Tooltip",
    radixPackage: "@radix-ui/react-tooltip",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "tooltip",
      keyboardInteractions: [
        "Focus on trigger shows tooltip",
        "Escape dismisses tooltip",
        "Tooltip appears on hover with configurable delay",
      ],
      ariaAttributes: ["aria-describedby"],
    },
    compositionPattern:
      "Tooltip.Provider > Tooltip.Root > Tooltip.Trigger + Tooltip.Portal > Tooltip.Content > Tooltip.Arrow",
    caveats: [
      "Requires Tooltip.Provider wrapper at app root for shared delay behavior",
      "Tooltip content is not interactive — use Popover for interactive overlays",
      "Touch devices: tooltip shows on long press, not hover",
      "delayDuration on Provider sets the global default, per-instance overrides on Root",
    ],
    recommendedFor: ["IconButton labels", "Truncated text", "Help hints"],
    avoidFor: [
      "Interactive content",
      "Forms",
      "Critical information users must see",
    ],
    version: "1.1.6",
  },

  Select: {
    name: "Select",
    radixPackage: "@radix-ui/react-select",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "listbox",
      keyboardInteractions: [
        "ArrowDown/ArrowUp navigates options",
        "Enter/Space selects the focused option",
        "Home/End jumps to first/last option",
        "Type-ahead: typing characters jumps to matching option",
      ],
      ariaAttributes: [
        "aria-expanded",
        "aria-activedescendant",
        "aria-labelledby",
        "role=option on items",
      ],
    },
    compositionPattern:
      "Select.Root > Select.Trigger > Select.Value + Select.Icon + Select.Portal > Select.Content > Select.ScrollUpButton + Select.Viewport > Select.Group > Select.Label + Select.Item > Select.ItemText + Select.ItemIndicator + Select.ScrollDownButton",
    caveats: [
      "Does not support multi-select — use a custom listbox for that",
      "Select.Value renders the selected item text, not a custom component",
      "Native mobile behavior differs: may render native select on iOS Safari",
      "Positioning uses a custom implementation, not Floating UI — behavior may differ from Popover",
    ],
    recommendedFor: ["Form select fields", "Settings dropdowns", "Sort controls"],
    avoidFor: [
      "Multi-select",
      "Combobox (use Combobox primitive or custom)",
      "Navigation menus",
    ],
    version: "2.1.5",
  },

  Tabs: {
    name: "Tabs",
    radixPackage: "@radix-ui/react-tabs",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "tablist",
      keyboardInteractions: [
        "ArrowLeft/ArrowRight navigates between tabs",
        "Home/End jumps to first/last tab",
        "Tab key moves focus from tab to panel",
      ],
      ariaAttributes: [
        "role=tab on triggers",
        "role=tabpanel on content",
        "aria-selected",
        "aria-controls",
        "aria-labelledby",
      ],
    },
    compositionPattern:
      "Tabs.Root > Tabs.List > Tabs.Trigger* + Tabs.Content*",
    caveats: [
      "Tab panels are unmounted when inactive by default — use forceMount to keep state",
      "Orientation prop controls arrow key direction (horizontal vs vertical)",
      "activationMode: automatic (default) vs manual changes when tab activates",
    ],
    recommendedFor: [
      "Tabbed interfaces",
      "Settings panels",
      "Dashboard sections",
    ],
    avoidFor: ["Step wizards", "Accordion-style content", "Navigation bars"],
    version: "1.1.2",
  },

  Accordion: {
    name: "Accordion",
    radixPackage: "@radix-ui/react-accordion",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "region",
      keyboardInteractions: [
        "ArrowDown/ArrowUp navigates between headers",
        "Home/End jumps to first/last header",
        "Enter/Space toggles the focused section",
      ],
      ariaAttributes: [
        "aria-expanded on triggers",
        "aria-controls",
        "aria-labelledby",
        "role=region on content",
      ],
    },
    compositionPattern:
      "Accordion.Root > Accordion.Item* > Accordion.Header > Accordion.Trigger + Accordion.Content",
    caveats: [
      "type=single allows only one panel open, type=multiple allows many",
      "collapsible prop (single mode) allows closing all panels — false by default",
      "Content height animation requires CSS transition on data-state attribute or Radix animation props",
    ],
    recommendedFor: ["FAQ sections", "Settings groups", "Sidebar navigation"],
    avoidFor: ["Tabs", "Form sections that should all be visible"],
    version: "1.2.2",
  },

  Checkbox: {
    name: "Checkbox",
    radixPackage: "@radix-ui/react-checkbox",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "checkbox",
      keyboardInteractions: ["Space toggles checked state"],
      ariaAttributes: [
        "aria-checked (true/false/mixed)",
        "aria-required",
        "aria-invalid",
      ],
    },
    compositionPattern: "Checkbox.Root > Checkbox.Indicator",
    caveats: [
      "Renders a button element, not an input — form libraries may need the name/value props",
      "Supports indeterminate state via checked='indeterminate'",
      "Must associate with a label for accessibility — use the asChild pattern or an external label",
    ],
    recommendedFor: [
      "Form checkboxes",
      "Multi-select lists",
      "Terms acceptance",
    ],
    avoidFor: ["Toggle switches (use Switch)", "Radio selection (use RadioGroup)"],
    version: "1.1.3",
  },

  RadioGroup: {
    name: "RadioGroup",
    radixPackage: "@radix-ui/react-radio-group",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "radiogroup",
      keyboardInteractions: [
        "ArrowDown/ArrowRight selects next radio",
        "ArrowUp/ArrowLeft selects previous radio",
        "Tab moves focus into/out of the group as a single stop",
      ],
      ariaAttributes: [
        "role=radio on items",
        "aria-checked",
        "aria-required",
        "aria-labelledby",
      ],
    },
    compositionPattern:
      "RadioGroup.Root > RadioGroup.Item* > RadioGroup.Indicator",
    caveats: [
      "Roving tabindex: only the selected item is in the tab order",
      "Orientation prop affects which arrow keys navigate",
      "Required prop sets aria-required on the group, not individual items",
    ],
    recommendedFor: [
      "Single selection from a list",
      "Plan selection",
      "Setting choices",
    ],
    avoidFor: [
      "Multi-select (use Checkbox)",
      "Binary toggle (use Switch)",
      "Long lists (use Select)",
    ],
    version: "1.2.2",
  },

  Switch: {
    name: "Switch",
    radixPackage: "@radix-ui/react-switch",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "switch",
      keyboardInteractions: ["Space toggles the switch", "Enter toggles the switch"],
      ariaAttributes: ["aria-checked", "aria-required", "aria-label"],
    },
    compositionPattern: "Switch.Root > Switch.Thumb",
    caveats: [
      "Semantically different from Checkbox: switches apply immediately, checkboxes are submitted with forms",
      "Renders a button element — use name/value props for form submission",
      "Thumb is purely visual — the toggle logic is on Root",
    ],
    recommendedFor: [
      "Instant toggle settings",
      "Feature flags",
      "Dark mode toggle",
    ],
    avoidFor: [
      "Form checkboxes that submit",
      "Multi-option selection",
    ],
    version: "1.1.2",
  },

  Slider: {
    name: "Slider",
    radixPackage: "@radix-ui/react-slider",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "slider",
      keyboardInteractions: [
        "ArrowRight/ArrowUp increases value",
        "ArrowLeft/ArrowDown decreases value",
        "Home sets to minimum",
        "End sets to maximum",
        "Page Up/Page Down increases/decreases by larger step",
      ],
      ariaAttributes: [
        "aria-valuemin",
        "aria-valuemax",
        "aria-valuenow",
        "aria-valuetext",
        "aria-orientation",
      ],
    },
    compositionPattern:
      "Slider.Root > Slider.Track > Slider.Range + Slider.Thumb*",
    caveats: [
      "Supports multiple thumbs for range selection — pass an array to value/defaultValue",
      "step prop controls granularity but also keyboard increment",
      "minStepsBetweenThumbs prevents range thumbs from overlapping",
      "Orientation: horizontal (default) or vertical — vertical requires explicit height",
    ],
    recommendedFor: [
      "Volume controls",
      "Price range filters",
      "Opacity/size adjusters",
    ],
    avoidFor: [
      "Precise numeric input (use NumberInput)",
      "Date ranges (use DatePicker)",
    ],
    version: "1.2.2",
  },

  DropdownMenu: {
    name: "DropdownMenu",
    radixPackage: "@radix-ui/react-dropdown-menu",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "menu",
      keyboardInteractions: [
        "ArrowDown/ArrowUp navigates menu items",
        "Enter/Space activates the focused item",
        "ArrowRight opens a submenu",
        "ArrowLeft closes a submenu",
        "Escape closes the menu",
        "Type-ahead: typing jumps to matching item",
      ],
      ariaAttributes: [
        "role=menuitem on items",
        "role=menuitemcheckbox on checkbox items",
        "role=menuitemradio on radio items",
        "aria-expanded",
        "aria-haspopup",
      ],
    },
    compositionPattern:
      "DropdownMenu.Root > DropdownMenu.Trigger + DropdownMenu.Portal > DropdownMenu.Content > DropdownMenu.Item | DropdownMenu.CheckboxItem | DropdownMenu.RadioGroup > DropdownMenu.RadioItem | DropdownMenu.Sub > DropdownMenu.SubTrigger + DropdownMenu.SubContent | DropdownMenu.Separator | DropdownMenu.Label",
    caveats: [
      "Use DropdownMenu for actions, not navigation — use NavigationMenu for nav links",
      "Submenus add complexity — limit nesting depth to 2 levels",
      "CheckboxItem and RadioItem manage their own state — controlled via checked/onCheckedChange",
      "Content receives focus on open — Trigger re-receives focus on close",
    ],
    recommendedFor: [
      "Action menus",
      "Context actions",
      "Settings with sub-options",
    ],
    avoidFor: [
      "Navigation links (use NavigationMenu)",
      "Select/Combobox patterns",
      "Simple popovers",
    ],
    version: "2.1.5",
  },

  AlertDialog: {
    name: "AlertDialog",
    radixPackage: "@radix-ui/react-alert-dialog",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "alertdialog",
      keyboardInteractions: [
        "Escape does NOT close (unlike Dialog) — user must confirm or cancel",
        "Tab moves focus within the dialog (focus trap)",
        "Shift+Tab moves focus backwards within the dialog",
      ],
      ariaAttributes: [
        "aria-modal",
        "aria-labelledby",
        "aria-describedby",
        "role=alertdialog",
      ],
    },
    compositionPattern:
      "AlertDialog.Root > AlertDialog.Trigger + AlertDialog.Portal > AlertDialog.Overlay + AlertDialog.Content > AlertDialog.Title + AlertDialog.Description + AlertDialog.Cancel + AlertDialog.Action",
    caveats: [
      "Unlike Dialog, Escape does not close AlertDialog — enforces explicit user decision",
      "Must include both Cancel and Action for proper UX — Action should be the destructive/confirming button",
      "AlertDialog.Cancel auto-closes without callback — use Action for the confirming behavior",
      "Title and Description are required for accessibility",
    ],
    recommendedFor: [
      "Delete confirmation",
      "Destructive action confirmation",
      "Unsaved changes warning",
    ],
    avoidFor: [
      "Informational modals (use Dialog)",
      "Non-blocking alerts (use Toast)",
    ],
    version: "1.1.4",
  },

  Toggle: {
    name: "Toggle",
    radixPackage: "@radix-ui/react-toggle",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "button",
      keyboardInteractions: [
        "Enter/Space toggles the pressed state",
      ],
      ariaAttributes: ["aria-pressed"],
    },
    compositionPattern: "Toggle.Root",
    caveats: [
      "Single element component — no children composition parts",
      "aria-pressed is set automatically based on pressed state",
      "For grouped toggles, use ToggleGroup instead",
    ],
    recommendedFor: [
      "Bold/italic/underline toolbar buttons",
      "Favorite/bookmark toggle",
      "View mode toggle",
    ],
    avoidFor: [
      "On/off settings (use Switch)",
      "Multi-option selection (use ToggleGroup)",
    ],
    version: "1.1.1",
  },

  ToggleGroup: {
    name: "ToggleGroup",
    radixPackage: "@radix-ui/react-toggle-group",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "group",
      keyboardInteractions: [
        "ArrowRight/ArrowLeft navigates between items",
        "Enter/Space toggles the focused item",
        "Tab moves focus into/out of the group as a single stop",
      ],
      ariaAttributes: [
        "role=group on root",
        "aria-pressed on items",
        "aria-label on root",
      ],
    },
    compositionPattern: "ToggleGroup.Root > ToggleGroup.Item*",
    caveats: [
      "type=single allows one active, type=multiple allows many",
      "Roving tabindex: only one item is in the tab order at a time",
      "Requires aria-label on Root for group context",
    ],
    recommendedFor: [
      "Text alignment toolbar",
      "View mode switcher (grid/list)",
      "Multi-option formatting bar",
    ],
    avoidFor: [
      "Navigation (use Tabs)",
      "Form radio groups (use RadioGroup)",
    ],
    version: "1.1.1",
  },

  Separator: {
    name: "Separator",
    radixPackage: "@radix-ui/react-separator",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "separator",
      keyboardInteractions: [],
      ariaAttributes: [
        "role=separator",
        "aria-orientation (horizontal/vertical)",
      ],
    },
    compositionPattern: "Separator.Root",
    caveats: [
      "Purely semantic and visual — renders a div with role=separator",
      "decorative prop removes from accessibility tree when set to true",
      "No children — use CSS for styling (border, margin, color)",
    ],
    recommendedFor: [
      "Section dividers",
      "Menu item separators",
      "Toolbar dividers",
    ],
    avoidFor: ["Decorative lines with no semantic meaning (use CSS border)"],
    version: "1.1.1",
  },

  Label: {
    name: "Label",
    radixPackage: "@radix-ui/react-label",
    vuePackage: "radix-vue",
    accessibilityContract: {
      role: "label",
      keyboardInteractions: [
        "Click on label focuses the associated control",
      ],
      ariaAttributes: ["for (htmlFor in React)"],
    },
    compositionPattern: "Label.Root",
    caveats: [
      "Use htmlFor prop to associate with a form control by id",
      "Can wrap the control as a child instead of using htmlFor",
      "Does not render as a semantic <label> when using asChild with a non-label element",
    ],
    recommendedFor: [
      "Form field labels",
      "Checkbox labels",
      "Input descriptions",
    ],
    avoidFor: [
      "Decorative text",
      "Headings (use proper heading elements)",
    ],
    version: "2.1.2",
  },
};
