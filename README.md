# vim-js

My take on a minimal [vimium](https://github.com/philc/vimium)

- No dependencies
- Two javascript files
- ~600 lines of code

![demo](https://elanmed.dev/nvim-plugins/vim-js.png)

### Build

#### Chrome

- `npm run gen-manifest chrome`
- Click `Load unpacked` at `chrome://extensions/` upload the entire directory
- Set extension shortcuts at `chrome://extensions/shortcuts`

#### Firefox

- `npm run gen-manifest firefox`
- Click `Load Temporary Add-on` at `about:debugging#/runtime/this-firefox` and upload the `manifest.json`
- Set `xpinstall.signatures.required` to `false` at `about:config` to persist the extension after closing firefox
- Set extension shortcuts by clicking on the gear, `Manage extension shortcuts` at `about:addons`

### Keymaps

There are two kinds of keymaps in chrome extensions: command keymaps and content script keymaps.

Command keymaps are first-class: they're set in a browser UI, detected by the browser itself, and can run on any page. However, content keymaps must include either a `ctrl`/`alt` and have several other [limitations](https://developer.chrome.com/docs/extensions/reference/api/commands#supported_keys).

Content script keymaps are set up entirely by the extension author: a script is injected into the page with an event listener for certain keys. Content script keymaps can handle any key combination the browser can listen for, but they can only run on a web page - empty browser pages like new tabs can't be scripted.

All `vim-js` keymaps can be set as either a command or content script keymap. Command keymaps can be set in the browser's extension UI (see `Build` instructions) while content script keymaps can be set in a local `content-keymaps.json` file.

### Supported keymaps

- `toggle-label-click`
  - Overlays two character labels on clickable elements on the page, typing the characters of a label simulates a click on the element
  - DOM changes and navigations retrigger the labels allowing multiple sequential clicks. The labels can be removed at any time by re-executing `toggle-label-click`
  - The first label (`fj`) is always the root `document.documentElement`
- `toggle-label-focus`
  - Similar to `toggle-label-click`, overlays labels on scrollable containers and focuses the selected element
  - Sequential focusing is not enabled
- `scroll-down`
- `scroll-up`
- `scroll-to-bottom`
- `scroll-to-top`
  - All scroll actions first check if a modal is open - if yes, scroll within it
  - If no modal is present but the currently focused element has a scrollable parent, that parent is scrolled
  - Otherwise, `toggle-label-focus` is triggered, selecting a label focuses the element and scrolls
- `switch-to-prev-tab`
- `switch-to-right-tab`
- `switch-to-left-tab`
- `switch-to-first-tab`
- `switch-to-last-tab`
- `blur`
- `copy-href-to-clipboard`
- `history-back`
- `history-forward`

### Default Content Script Keymaps

- `G`: `scroll-to-bottom`
- `gg`: `scroll-to-top`
- `yy`: `copy-href-to-clipboard`
- `Escape`: `blur`

<!-- ### Available ctrl remaps -->
<!-- - bcdghijkopsuxyz -->
