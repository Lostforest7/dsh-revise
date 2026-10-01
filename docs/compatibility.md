# 兼容性与排障

首版验证日期：2026-09-30；真实模型复核：2026-10-01。DSH API 仍处于预览阶段，版本变化可能需要修改接入层。

| 项目 | 首版支持/验证情况 |
|---|---|
| DSH | Web `0.2.0-rc.2`，真实宿主安装、界面加载、读写与消息发送已验证 |
| 前端 | Vite `8.3.1` + React `18.3.1`；JSX/TSX DOM 元素源码提示 |
| Node | 声明支持 22.x 的 22.19+ 或 24+；实际使用 24.19.0 验证 |
| 真实模型 | DeepSeek V4 Pro / Max 完成示例的两项 CSS 修改、构建与截图验收；只代表这一轮验证 |
| 系统/浏览器 | Windows，实际使用本机 Google Chrome；CI 配置使用 Ubuntu 与 Playwright Chromium，远程 CI 尚未运行 |
| 界面语言 | 中文；README 提供中英双语 |
| 桌面端/其他框架/其他 DSH 版本 | 尚未验证，不应视为支持 |

系统 Node 20.20.2 在本机通过了原有 10 项单元测试；这不等于 DSH 完整运行时兼容，Node 版本声明仍按官方开发环境要求保留。

## 没有看到入口

确认插件加入 `web` profile，停止并重新启动 `dsh web`，再选择一个有项目目录的会话。先完成或跳过 DSH 自带的首次使用弹窗。右下角应出现 **Revise 改稿台**。

如果使用自定义 `DSH_HOME`，安装插件与启动 DSH 必须使用同一个值。只有 Web 客户端在包中声明，不能把 Desktop 安装结果当作 Web 验证。

## 一直提示“等待 Vite 插件连接”

检查被修改项目是否安装 `dsh-revise`、是否加入 `revise()`、是否重启 Vite。填入终端打印的实际地址，首版建议固定端口并设 `strictPort: true`。

HTTPS、远程域名、缺少端口的 URL、URL 用户名密码均不接受。也不能连接生产构建的静态页；选择桥只在 Vite 开发模式生效。`X-Frame-Options` 或 CSP `frame-ancestors` 禁止嵌入时，需要调整开发环境配置。

## 无法启动截图浏览器

在运行 DSH 的同一操作系统用户下执行：

```sh
npx playwright-core@1.63.0 install chromium
```

也可以指定已有 Chrome/Chromium 可执行文件，必须在启动 DSH **之前**设置。Windows 示例：

```powershell
$env:REVISE_CHROMIUM_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
dsh web
```

Linux 示例：

```sh
REVISE_CHROMIUM_PATH=/usr/bin/chromium dsh web
```

浏览器进程运行在 DSH 宿主所在机器上，因此目标开发服务器也必须在那台机器的本地端口可达。

## 截图缺少字体、图片或数据

截图只加载目标地址的同源资源，不带你日常浏览器的登录状态。示例全部使用本地内容。真实项目如使用 CDN、跨端口后端或登录态，建议在开发环境采用 Vite 同源代理、同源素材及不需要真实账号的展示页。

截图仅包含视口内内容，采集时会关闭动画，移动视口改变的是宽高，不模拟特定手机的 User-Agent、触摸或硬件。

图像比较使用差异阈值和抗锯齿过滤，比例并非逐字节差异或修改质量分数。2026-10-01 修正了相近亮度的绿色→紫色按钮变化被漏计的问题；打开旧记录与导出报告时会重新计算这项派生数据，不修改原截图、源码快照与验收决定。

## “源码变化，需重新采集”

请等待 DSH 完成改稿和 Vite 热更新，再点击 **采集修改后**。接受的是明确的采集版本，重新采集会把每条意见重置为待验收。插件检查其声明范围内的文本源码；二进制图片、外部数据和未纳入范围的文件变化不能由这个检查发现。

## 历史记录、请求和报告在哪里

```text
<前端项目>/.dsh-revise/<round-id>/
  round.json                 # 记录、源码快照和内嵌截图
  <snapshot-id>-desktop.png
  <snapshot-id>-mobile.png
  request.md                 # 点击发送时准备的请求
  report.md                  # Markdown，图片引用同目录 PNG
  report.html                # 截图内嵌，可单文件分享
```

同一项目的不同 DSH 会话不会互相显示改稿记录。大项目超出快照限制会明确报错，源码符号链接不支持。记录不做自动清理；确定不再需要的旧轮次可以手工删除。请把 `.dsh-revise/` 加入项目 `.gitignore`。

## 发送失败或模型没有按意见修改

先确认 DSH 的模型配置与普通聊天可用。Revise 把意见、元素信息和截图路径发送给会话，不管理模型密钥，不承诺模型改稿质量，也不自动附加图片消息。请求失败时会显示错误；可复制请求到 DSH 对话中排查。

请求成功但本地记录更新失败时，先检查 DSH 对话，避免盲目重发造成重复消息。2026-09-30 的接入检查使用本地模拟模型，浏览器测试仍使用夹具修改；2026-10-01 另外完成一轮真实 DeepSeek V4 Pro / Max 改稿，记录见 [真实模型验证](real-model-validation.md)。

Windows 实测中，DSH 的受限沙箱拦截了 Vite 构建派生子进程（`spawn EPERM`）。模型请求后，一次性批准 `npm run build`，构建通过。以另一个受限进程启动 DSH，还可能出现测试目录 ACL 配置失败；本次改为正常用户启动 DSH 后解决，DSH 会话仍使用 `workspace-write`。这两项属于 DSH 运行环境问题，Revise 不会替用户关闭沙箱。
