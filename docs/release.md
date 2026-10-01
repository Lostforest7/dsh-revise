# GitHub 发布准备

仓库名：`dsh-revise`

简短介绍：**Visual frontend revisions for DeepSeek Harness: point at elements, send changes, and review screenshots + code diffs.**

中文介绍：**DeepSeek Harness 前端可视化改稿与验收插件：选元素提意见，发送到当前会话，对照前后截图与代码差异逐项验收。**

建议 Topics：`deepseek`、`deepseek-harness`、`dsh-plugin`、`vite`、`react`、`visual-review`、`developer-tools`。

首个 Release：`v0.1.0-pre`，标记 Pre-release。附件使用 `dsh-revise-0.1.0.tgz`，同时提供真实模型运行截图、64 秒截图演示及验收报告。项目尚未发布 npm；README 不能宣称 `npm install dsh-revise` 已可用。

仓库：[Lostforest7/dsh-revise](https://github.com/Lostforest7/dsh-revise)。README 与 package.json 的仓库、首页、问题反馈地址均使用这一实际发布账号。包版本保持 `0.1.0`；GitHub 标签 `v0.1.0-pre` 与 Pre-release 标记明确表示其预览状态。

## 首版 Release 文案

DSH Revise adds a visual review loop to DeepSeek Harness Web. Select a React page element, send a concrete revision request to the current session, and compare captured screenshots and source diffs before accepting each item.

This preview includes desktop/mobile captures, source hints, local round history, stale-candidate protection, follow-up requests, and self-contained HTML reports. Verified locally with DSH Web 0.2.0-rc.2 and Vite 8 + React 18 on Windows. The current interface is Chinese.

On October 1, 2026, a real DeepSeek V4 Pro / Max session located the example's CSS from JSX element hints, made both requested changes, and passed the build. Independent desktop/mobile style checks, screenshot capture, code review and report export passed. The turn took 127 seconds including a Windows build approval. A visible color-change metric issue found in this run was fixed with regression coverage.

This is an independent community plugin. Desktop and other frameworks are not yet verified. The real run establishes a simple example workflow, not a guarantee of model editing quality. Automated browser regression tests continue to use fixture edits. The demo is a sequence of actual run screenshots, not continuous video.

## 后续优先级

1. 英文界面与报告，扩大海外开发者可用性。
2. 复杂用户项目与多轮反馈实测。
3. 安装简化、Windows 运行环境排障与示例源码格式化。
4. 跟随 DSH API 迭代；按需求验证 Desktop 与其他框架。

先用可靠安装流程与真实演示建立可信度，再扩展功能。Star 数量无法保证，应以安装成功率和实际改稿体验作为第一轮反馈指标。
