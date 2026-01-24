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

### Builtin Keymaps

> For now, these can only be disabled by editing the source code

- `G`: `scroll-to-bottom`
- `gg`: `scroll-to-top`
- `yy`: `copy-href-to-clipboard`
- `L`: `switch-to-first-tab`
- `H`: `switch-to-last-tab`

### TODO

- Navigate back in history stack
- Navigate forward in history stack

- Keymap to initiate [seek](https://github.com/elanmed/seek.nvim)-like labels
