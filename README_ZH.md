<div align="center">
  <img src="build/icon.png" width="128">
</div>

<h1 align="center">AYAPlus</h1>

<div align="center">

[AYA](https://github.com/liriliri/aya) 的增强版 — 带有更多功能的 Android ADB 桌面应用。

**中文** | [English](README.md)

</div>

## 截图

<table>
  <tr>
    <td><img src="screencap/home.png" width="100%"></td>
    <td><img src="screencap/remote_tv.png" width="100%"></td>
  </tr>
  <tr>
    <td align="center">Logcat 日志查看器</td>
    <td align="center">遥控器</td>
  </tr>
  <tr>
    <td><img src="screencap/mirror.png" width="100%"></td>
    <td><img src="screencap/http_proxy.png" width="100%"></td>
  </tr>
  <tr>
    <td align="center">屏幕投射</td>
    <td align="center">HTTP 代理</td>
  </tr>
</table>

## AYAPlus 新增功能

* **投屏键盘输入**：屏幕投射时支持完整键盘输入 — 字母、数字、方向键、ESC（返回）、F1–F12、Tab 等。
* **独立遥控器窗口**：电视遥控器作为独立窗口运行，可与主界面同时操作。
* **常驻工具栏**：ADB 命令行、重启 ADB、Root、端口映射、HTTP 代理、遥控器等功能始终可从顶部工具栏访问。
* **Logcat 过滤历史**：包名、标签、关键词过滤输入框支持历史记录和自动补全下拉，支持键盘导航和模糊匹配。
* **彩色日志级别**：Logcat 日志级别下拉框颜色与日志输出颜色一致，便于快速识别。
* **代理状态指示器**：当设备设置了 HTTP 代理时，状态栏显示警告标识，方便感知。
* **状态栏应用操作**：状态栏显示当前前台应用，支持快速清除数据和重启操作。
* **检查更新**：通过 GitHub Releases 自动检查新版本，状态栏提示，一键下载。

## 下载

| 平台 | 文件名 |
|------|--------|
| macOS (Intel) | `AYAPlus-x.x.x-mac-x64.dmg` |
| macOS (Apple Silicon) | `AYAPlus-x.x.x-mac-arm64.dmg` |
| Windows | `AYAPlus-x.x.x-win-x64.exe` |
| Linux | `AYAPlus-x.x.x-linux-x64.AppImage` |

从 [GitHub Releases](https://github.com/danweiyuancircle/aya_plus/releases) 下载。

## 致谢

AYAPlus 基于 [surunzi](https://github.com/liriliri) 开发的 [AYA](https://github.com/liriliri/aya) 构建。感谢创建了如此优秀的开源 ADB GUI 工具！

---

## 原版 AYA 功能

<img src="https://aya.liriliri.io/screenshot.png" style="width:100%">

* 屏幕投射
* 文件管理器
* 应用管理
* 进程监控
* 布局检查器
* CPU、内存和 FPS 监控
* Logcat 日志查看器
* 交互式终端

更多详细使用说明，请访问 [aya.liriliri.io](https://aya.liriliri.io)！

## 相关项目

* [licia](https://github.com/liriliri/licia)：AYA 使用的工具库。
* [luna](https://github.com/liriliri/luna)：AYA 使用的 UI 组件库。
* [vivy](https://github.com/liriliri/vivy)：图标生成工具。
* [echo](https://github.com/liriliri/echo)：AYA 的鸿蒙版。

## 贡献

阅读 [贡献指南](https://aya.liriliri.io/guide/contributing.html) 了解开发环境配置。
