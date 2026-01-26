# vim-js

My take on a minimal [vimium](https://github.com/philc/vimium)

- No dependencies
- Two javascript files
- ~500 lines of code

![demo](https://elanmed.dev/nvim-plugins/vim-js.png)

### Build

#### Chrome

- `node gen-manifest.js chrome`
- Click `Load unpacked` at `chrome://extensions/` upload the entire directory
- Set extension shortcuts at `chrome://extensions/shortcuts`

#### Firefox

- `node gen-manifest.js firefox`
- Click `Load Temporary Add-on` at `about:debugging#/runtime/this-firefox` and upload the `manifest.json`
- Set `xpinstall.signatures.required` to `false` at `about:config` to persist the extension after closing firefox
- Set extension shortcuts by clicking on the gear, `Manage extension shortcuts` at `about:addons`

### Supported extension keymaps

> Note that extension shortcuts must include either a `ctrl`/`alt` and include several other [limitations](https://developer.chrome.com/docs/extensions/reference/api/commands#supported_keys)

- `switch-to-prev-tab`
- `scroll-down`
- `scroll-up`
- `switch-to-right-tab`
- `switch-to-left-tab`
- `switch-to-first-tab`
- `switch-to-last-tab`
- `scroll-to-bottom`
- `scroll-to-top`
- `copy-href-to-clipboard`
- `seek-initiate`
  - Place labels on clickable elements on the page
- `unfocus`
- `history-back`
- `history-forward`

### Default Content Script Keymaps

> Note that content script keymaps are only availabe once a page is visited (i.e. not empty tabs) since they're run by a script injected into the page itself

- `G`: `scroll-to-bottom`
- `gg`: `scroll-to-top`
- `yy`: `copy-href-to-clipboard`
- `Escape`: `unfocus`

These can be updated in the local `content-keymaps.json` file.

<!-- ### Available ctrl remaps -->
<!-- - bcdghijkopsuxyz -->
