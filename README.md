<div align="center">

# ACKS Markdown Editor

**面向 Markdown 写作者的本地优先文章编辑器与公众号排版工作台**

[English](README_EN.md) · **简体中文**

[![Release](https://img.shields.io/github/v/release/shynloc/ACKS-Markdown-Editor?style=flat-square&color=F04B00)](https://github.com/shynloc/ACKS-Markdown-Editor/releases)
[![Live](https://img.shields.io/badge/在线体验-mdeditor.acks.com.cn-111111?style=flat-square)](https://mdeditor.acks.com.cn/)
[![License](https://img.shields.io/github/license/shynloc/ACKS-Markdown-Editor?style=flat-square&color=111111)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)](Dockerfile)
[![Local First](https://img.shields.io/badge/数据-Local--First-F04B00?style=flat-square)](#数据存储与隐私)
[![Tests](https://img.shields.io/badge/tests-88%20passed-2E7D32?style=flat-square)](#开发与测试)

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](#技术栈)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](#技术栈)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=111111)](#技术栈)
[![Marked](https://img.shields.io/badge/Marked-18-111111?style=flat-square)](#技术栈)
[![DOMPurify](https://img.shields.io/badge/DOMPurify-3-0B7A75?style=flat-square)](#技术栈)
[![IndexedDB](https://img.shields.io/badge/IndexedDB-local-5A45FF?style=flat-square)](#数据存储与隐私)
[![Python](https://img.shields.io/badge/Python-3-3776AB?style=flat-square&logo=python&logoColor=white)](#开发与测试)
[![Nginx](https://img.shields.io/badge/Nginx-Unprivileged-009639?style=flat-square&logo=nginx&logoColor=white)](#生产部署)
[![Caddy](https://img.shields.io/badge/Caddy-HTTPS-1F88C0?style=flat-square)](#生产部署)

</div>

![ACKS Markdown Editor 封面](src/default-assets/article-cover.webp)

## 项目简介

ACKS Markdown Editor 是一个**本地优先、单文件可发布、面向公众号工作流**的 Markdown 编辑器。它把写作、源码编辑、主题渲染、文档导入、本机文章管理和公众号 HTML 输出放在同一个界面中。

在线体验：**<https://mdeditor.acks.com.cn/>**

项目标签：`markdown` `wechat` `editor` `local-first` `docx` `html` `themes` `indexeddb` `docker` `caddy` `single-file-app`

## 为什么会有这个项目

公众号后台提供的是常规富文本编辑器，对 Markdown 和已经整理好的 HTML 都不算友好。习惯 Markdown 工作流的写作者经常遇到这些问题：

- 在笔记软件或代码编辑器中排好的标题、列表、引用和代码块，粘贴后样式发生变化；
- 图片、表格、段落间距需要重新处理；
- 一篇文章在 Markdown、公众号和其他平台之间难以复用；
- 每次发布都要重复做一遍格式劳动；
- 普通富文本工具又无法保留一份干净、可版本管理的 Markdown 源码。

ACKS Markdown Editor 因此诞生：**保留 Markdown 作为正文源数据，在本机完成主题渲染和发布前整理，再输出适合公众号继续编辑的 HTML。**

项目最初只是一个单页原型，经过多轮 UX、主题、导入、图片资源、存储冲突和生产部署审计后，逐步形成现在的完整工作台。

## 核心能力

| 能力          | 说明                                                                |
| ------------- | ------------------------------------------------------------------- |
| 三种工作模式  | 写作画布、完整 Markdown 源码、主题成稿与公众号输出                  |
| 本机文章柜    | 新建、保存、自动保存、多文章切换、单篇备份和保护性删除              |
| 43 款渲染主题 | 19 款 ACKS 主题与 24 款 Milestone 明暗版本                          |
| 32 组视觉家族 | 不同主题使用各自的装饰语言，减少素材和图案重复                      |
| 9 个排版配方  | 面向教程、观点、数据、清单、随笔、技术、新闻和产品文章              |
| 完整格式工具  | 标题、列表、任务、引用、代码、表格、链接、图片及扩展文字格式        |
| 多格式导入    | Markdown、TXT、DOCX、ACKS JSON 和 Markdown 图片包 ZIP               |
| DOCX 本机转换 | 保留常见语义格式与图片，导入前展示预览和简化提示                    |
| 图片资源模型  | 源码只显示 `asset:img-*` 短引用，避免 Base64 编码淹没正文           |
| 多种导出      | Markdown/图片包、完整 ACKS 文档、公众号 HTML                        |
| 冲突保护      | Web Locks、版本比较、恢复副本与当前文章版本历史                     |
| 响应式界面    | 桌面文章柜、移动端抽屉、键盘操作和无横向溢出布局                    |
| 单文件发布    | 核心依赖、图标、主题和素材构建进 `md-editor.html`，运行时不依赖 CDN |

## 界面与工作流

![ACKS Markdown Editor 架构与工作流](src/default-assets/article-workflow.jpg)

典型使用流程：

```text
新建或导入文章
  → 写作画布 / Markdown 源码
  → 选择主题与排版配方
  → 检查完整成稿和公众号输出
  → 下载完整备份
  → 复制到公众号并重新上传图片
```

### 写作、源码与成稿

- **写作：**按 Markdown 块编辑，适合集中处理内容和使用格式工具。
- **源码：**直接编辑完整 Markdown，适合熟悉语法的写作者。
- **成稿：**查看主题完整效果，或切换到经过内联化处理的公众号输出。

### 本机文章柜

- 点击顶部 **新建** 创建空白文章，当前文章不会被删除；
- 点击 **保存** 明确写入当前浏览器，编辑期间仍会自动保存；
- 左侧文章柜显示标题、修改时间和占用空间；
- 可以切换文章、下载单篇完整备份，或在二次确认后删除；
- 移动端通过文档栏左侧按钮打开文章柜抽屉；
- 从 v1.0 升级时，原有当前稿会自动迁移进文章柜。

> [!WARNING]
> 文章不会上传到 ACKS 服务器。它们保存在当前浏览器的 IndexedDB 与本地恢复存储中。清理浏览器缓存或网站数据、使用无痕模式、更换浏览器或设备、以及浏览器主动回收存储，都可能造成文章丢失。重要内容请定期使用“下载当前全文”。

## 快速开始

### 在线使用

直接访问：**<https://mdeditor.acks.com.cn/>**

### 本地启动

建议通过 localhost 运行，以获得稳定的浏览器存储和 Web Locks 支持：

```bash
git clone https://github.com/shynloc/ACKS-Markdown-Editor.git
cd ACKS-Markdown-Editor
python3 -m http.server 8080 --bind 127.0.0.1
```

打开：<http://127.0.0.1:8080/md-editor.html>

不建议把直接双击 `file://` 作为正式使用方式，不同浏览器对文件页面的存储和锁行为并不一致。

## 使用方法

### 创建和保存文章

1. 点击 **新建**；
2. 从标题或任意 Markdown 内容开始写作；
3. 点击 **保存**，或使用 `Cmd/Ctrl + S`；
4. 从左侧文章柜切换历史文章；
5. 重要文章点击 **下载当前全文** 保存 `.acks.json` 备份。

### 使用格式工具

浮动工具栏提供粗体、斜体、标题、列表、链接和图片。完整工具面板还包含：

- H1–H4 标题；
- 有序列表、无序列表、任务列表；
- 引用、代码块、表格向导；
- 删除线、下划线、高亮；
- 字体类别、字号、文字颜色、波浪线和重点号。

### 选择渲染主题

1. 点击顶部 **文章主题** 或底部 **主题**；
2. 从三个快速主题开始，或点击展开全部主题；
3. 按 ACKS/Milestone、明亮/深色筛选；
4. 选择排版配方；
5. 调整字号、行距、段首缩进和装饰元素；
6. 应用排版并进入成稿检查。

### 导入文档

点击顶部 **导入**，或使用 **更多 → 导入 Markdown / 文档**。

| 文件                | 处理方式                                        |
| ------------------- | ----------------------------------------------- |
| `.md` / `.markdown` | 作为 Markdown 导入                              |
| `.txt`              | 作为纯文本导入，支持 UTF-8、UTF-16、GBK/GB18030 |
| `.docx`             | 在浏览器本机转换，预览后替换或追加              |
| `.acks.json`        | 恢复正文、图片资源与排版元数据                  |
| ACKS `.zip`         | 恢复 Markdown、图片文件与排版元数据             |

DOCX 导入重点保留标题、段落、粗体、斜体、下划线、删除线、上下标、列表、链接、表格和常见图片。页眉页脚、分页分栏、浮动对象、精确字体、复杂公式、图表与嵌入对象可能被简化或忽略，编辑器会在确认导入前说明已知变化。

旧 `.doc`、宏启用、加密、损坏或包含危险实体的 DOCX 不会导入。

### 导出和发布

| 操作                   | 输出                                             |
| ---------------------- | ------------------------------------------------ |
| 复制到公众号           | 富文本 HTML 和纯文本剪贴板内容                   |
| 下载 Markdown / 图片包 | 无图片时为 `.md`，有图片时为 Markdown + 图片 ZIP |
| 下载当前全文           | `.acks.json`，包含正文、图片、主题和排版设置     |
| 下载公众号 HTML        | 可离线检查的内联样式 HTML                        |

公众号后台仍会清洗 HTML，浏览器本地图片也不能直接随剪贴板成为公众号素材。因此公众号输出会把图片显示为明确的重新上传占位提示。发布前请在公众号后台重新上传图片并检查最终排版。

体验地址和源码地址卡片：

![ACKS Markdown Editor 体验与源码地址](src/default-assets/article-links.jpg)

## 技术架构

```text
Markdown
  → Marked 18 解析
  → DOMPurify 3 安全清洗
  → ACKS / Milestone 主题渲染
  → 完整成稿 / 公众号 HTML / JSON / ZIP

浏览器本地层
  → IndexedDB 多文章存储
  → LocalStorage 活动稿与恢复元数据
  → Web Locks 多标签页冲突保护

生产访问层
  → Cloudflare
  → Caddy HTTPS
  → 127.0.0.1:5703
  → 非 root Nginx 容器
  → 单文件 md-editor.html
```

## 技术栈

| 层级             | 技术                               |
| ---------------- | ---------------------------------- |
| 界面             | HTML5、CSS3、Vanilla JavaScript    |
| Markdown         | Marked 18                          |
| 安全清洗         | DOMPurify 3                        |
| DOCX 转换        | Mammoth 1.12                       |
| ZIP 与资源包     | fflate 0.8                         |
| 图标             | Phosphor Icons                     |
| 多文章存储       | IndexedDB                          |
| 活动稿与冲突保护 | LocalStorage、Web Locks            |
| 构建             | Python 3                           |
| 测试             | Node.js assertions、真实浏览器验收 |
| 容器             | Nginx Unprivileged、Docker Compose |
| HTTPS 与反向代理 | Caddy、Cloudflare                  |

## 数据存储与隐私

- 文稿、图片和文章柜保存在浏览器 IndexedDB；
- 活动稿镜像、主题、版本与恢复信息使用 LocalStorage；
- DOCX、TXT 和图片处理在浏览器本机进行；
- 导入预览不会主动加载外部 Markdown 图片；接受导入并渲染后，远程图片可能访问其原始服务器；
- 可选主题模型只发送用户填写的主题描述，API Key 只保留在当前页面内存；
- 多标签页发生版本冲突时，自动保存暂停并保留恢复副本；
- 存储或锁不可用时，编辑器会失败关闭并要求下载备份；
- ACKS 服务器不接收、保存或同步用户文章。

## 开发与测试

要求：Python 3、Node.js 20+、npm 10+。

```bash
npm install
npm test
```

`npm test` 会重新构建单文件应用并运行八组、共 88 项断言。格式与依赖检查：

```bash
npm run format:check
npm audit --audit-level=moderate
```

重新构建：

```bash
python3 build.py
```

维护源码位于 `src/`。以下文件由构建流程生成，不应直接编辑：

- `md-editor.html`
- `src/app.compiled.js`
- `src/theme-catalog.compiled.js`

主要目录：

```text
src/                 编辑器、主题、存储、导入和界面源码
tests/               Node 回归测试
vendor/              固定版本的浏览器端依赖
deploy/              Nginx、Compose、Caddy 与部署文档
scripts/             主题适配辅助脚本
md-editor.html       构建完成的单文件应用
```

## 生产部署

### Docker Compose

```bash
cp deploy/deployment.env.example deployment.env

# 填写 VERSION、VCS_REF、IMAGE_TAG 和 APP_PORT

docker compose \
  --project-name acks-markdown-editor \
  --env-file deployment.env \
  -f deploy/compose.production.yml \
  up -d --build
```

默认配置将容器端口限制在回环地址：

```text
127.0.0.1:5703 → Nginx:8080
```

容器使用：

- 非 root 用户 `101:101`；
- 只读根文件系统；
- `cap_drop: ALL`；
- `no-new-privileges`；
- 独立临时文件系统；
- `/healthz` 健康检查。

启动后先验证：

```bash
curl --fail http://127.0.0.1:5703/healthz
```

### Caddy 与 HTTPS

仓库提供 [`deploy/mdeditor.Caddyfile`](deploy/mdeditor.Caddyfile)。在重新加载 Caddy 前必须验证配置：

```bash
caddy validate --config /etc/caddy/Caddyfile
sudo caddy reload --config /etc/caddy/Caddyfile
```

应用端口应保持为回环地址，只允许 Caddy 对外提供 HTTP/HTTPS。

完整的发布、验收和回滚顺序见 [`deploy/DEPLOYMENT.md`](deploy/DEPLOYMENT.md)。

## 浏览器支持

推荐使用当前版本的 Safari、Chrome、Edge 或 Firefox，并通过 HTTPS 或 localhost 访问。

真实 iPhone 输入法、文件选择、公众号后台粘贴和最终发布效果仍应在目标设备与目标平台做人工检查。

## 问题反馈与安全报告

提交普通问题前请阅读 [`SUPPORT.md`](SUPPORT.md)，然后创建：

- [Bug report](https://github.com/shynloc/ACKS-Markdown-Editor/issues/new?template=bug_report.yml)

反馈时请包含：

- ACKS Markdown Editor 版本；
- 浏览器、操作系统和访问方式；
- 最小复现步骤；
- 预期结果与实际结果；
- 如涉及导入导出，请提供脱敏后的最小测试文件。

不要在公开 Issue 中提交 API Key、Token、私人文章或个人信息。安全问题请使用 GitHub Private Vulnerability Reporting，并参考 [`SECURITY.md`](SECURITY.md)。

## 版本与许可证

当前稳定版：[v1.2.0](https://github.com/shynloc/ACKS-Markdown-Editor/releases/tag/v1.2.0)

更新记录：[`CHANGELOG.md`](CHANGELOG.md)

本项目采用 [MIT License](LICENSE)，© 2026 ACKS。
