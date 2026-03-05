<div align="center">
  <img src="build/icon.png" width="128">
</div>

<h1 align="center">AYAPlus</h1>

<div align="center">

An enhanced fork of [AYA](https://github.com/liriliri/aya) — Android ADB desktop app with additional features.

**English** | [中文](README_ZH.md)

</div>

## Screenshots

<table>
  <tr>
    <td><img src="screencap/home.png" width="100%"></td>
    <td><img src="screencap/remote_tv.png" width="100%"></td>
  </tr>
  <tr>
    <td align="center">Logcat Viewer</td>
    <td align="center">Remote Control</td>
  </tr>
  <tr>
    <td><img src="screencap/mirror.png" width="100%"></td>
    <td><img src="screencap/http_proxy.png" width="100%"></td>
  </tr>
  <tr>
    <td align="center">Screen Mirroring</td>
    <td align="center">HTTP Proxy</td>
  </tr>
</table>

## New in AYAPlus

* **Screencast keyboard input**: Full keyboard support during screen mirroring — letters, digits, arrow keys, ESC (as Back), F1–F12, Tab, and more.
* **Independent remote controller window**: TV remote runs as a separate window, allowing simultaneous operation with the main interface.
* **Permanent toolbar actions**: ADB CLI, restart ADB, root, port mapping, HTTP proxy, and remote controller are always accessible from the top toolbar.
* **Logcat filter history**: Package, tag, and keyword filter inputs remember history with autocomplete dropdown, supporting keyboard navigation and fuzzy matching.
* **Color-coded log levels**: Logcat log level dropdown colors match the log output for quick visual identification.
* **Proxy status indicator**: When an HTTP proxy is set on the device, a warning badge is displayed in the status bar for easy awareness.
* **Status bar app actions**: Quick actions (clear data, restart) for the current foreground app in the status bar.
* **Update checker**: Auto-checks for new versions via GitHub Releases with status bar indicator and one-click download.

## Download

| Platform | File |
|----------|------|
| macOS (Intel) | `AYAPlus-x.x.x-mac-x64.dmg` |
| macOS (Apple Silicon) | `AYAPlus-x.x.x-mac-arm64.dmg` |
| Windows | `AYAPlus-x.x.x-win-x64.exe` |
| Linux | `AYAPlus-x.x.x-linux-x64.AppImage` |

Download from [GitHub Releases](https://github.com/danweiyuancircle/aya_plus/releases).

## Acknowledgements

AYAPlus is built on top of [AYA](https://github.com/liriliri/aya) by [surunzi](https://github.com/liriliri). Huge thanks for creating such a great open-source ADB GUI tool!

---

## Original AYA Features

<img src="https://aya.liriliri.io/screenshot.png" style="width:100%">

* Screen mirror
* File explorer
* Application manager
* Process monitor
* Layout inspector
* CPU, memory and FPS monitor
* Logcat viewer
* Interactive shell

For more detailed usage instructions, please read the documentation at [aya.liriliri.io](https://aya.liriliri.io)!

## Related Projects

* [licia](https://github.com/liriliri/licia): Utility library used by AYA.
* [luna](https://github.com/liriliri/luna): UI components used by AYA.
* [vivy](https://github.com/liriliri/vivy): Icon image generation.
* [echo](https://github.com/liriliri/echo): Harmony OS version of AYA.

## Contribution

Read [Contributing Guide](https://aya.liriliri.io/guide/contributing.html) for development setup instructions.
