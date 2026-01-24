# vim-js

My take on a minimalist [vimium](https://github.com/philc/vimium)

### Build

#### Chrome

- `node gen-manifest.js chrome`
- Click `Load unpacked` at <a href="chrome://extensions/">chrome://extensions/</a> and upload the entire directory
- Set shortcuts at <a href="chrome://extensions/shortcuts">chrome://extensions/shortcuts</a>

#### Firefox

- `node gen-manifest.js firefox`
- Set `xpinstall.signatures.required` to `false` at <a href="about:config">about:config</a>
- Click `Load Temporary Add-on` at <a href="about:debugging#/runtime/this-firefox">about:debugging#/runtime/this-firefox</a> and upload the `manifest.json`
- Set shortcuts by clicking on the gear, `Manage extension shortcuts` at <a href="about:addons">about:addons</a>

### Supported chrome extension keymaps

> Note that these keymaps need to be explicitly set in <a href="chrome://extensions/shortcuts">chrome://extensions/shortcuts</a>

- switch-to-prev-tab
- scroll-down
- scroll-up
- switch-to-right-tab
- switch-to-left-tab
- switch-to-first-tab
- switch-to-last-tab
- scroll-to-bottom
- scroll-to-top
- copy-href-to-clipboard

### Builtin Keymaps

> Disable these by editing the source code

- `G` scroll-to-bottom
- `gg` scroll-to-top
- `yy` copy-href-to-clipboard
- `L` switch-to-first-tab
- `H` switch-to-last-tab

### TODO

- Keymap to initiate [seek](https://github.com/elanmed/seek.nvim)-like labels
