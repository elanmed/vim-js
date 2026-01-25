# vim-js

My take on a minimalist [vimium](https://github.com/philc/vimium)

- No dependencies
- Two javascript files
- ~400 lines of code

### Build

#### Chrome

- `node gen-manifest.js chrome`
- Click `Load unpacked` at `chrome://extensions/` upload the entire directory
- Set shortcuts at `chrome://extensions/shortcuts`

#### Firefox

- `node gen-manifest.js firefox`
- Click `Load Temporary Add-on` at `about:debugging#/runtime/this-firefox` and upload the `manifest.json`
- Set `xpinstall.signatures.required` to `false` at `about:config` to persist the extension after closing firefox
- Set shortcuts by clicking on the gear, `Manage extension shortcuts` at `about:addons`

### Supported extension keymaps

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

### Builtin Keymaps

> For now, these can only be disabled by editing the source code

- `G`: `scroll-to-bottom`
- `gg`: `scroll-to-top`
- `yy`: `copy-href-to-clipboard`
- `Escape`: `unfocus`
- `l`: `switch-to-right-tab`
- `h`: `switch-to-left-tab`
- `H`: `switch-to-first-tab`
- `L`: `switch-to-last-tab`
