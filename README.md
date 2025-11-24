# PeerBoard 本地协作白板

该项目在 **TRAE SOLO WorkSpace@兰州** 活动下demo制作环节产物（2小时）

![1213.jpg](https://youke1.picui.cn/s1/2025/11/24/69246e964f912.jpg)
![1212.jpg](https://youke1.picui.cn/s1/2025/11/24/69246e96d32ca.jpg)

一个无需后端、支持离线与局域网协作的白板应用。基于浏览器 Canvas 与 IndexedDB 数据持久化，支持手动信令的 WebRTC P2P 同步。

## 特性
- 离线可用：所有数据保存在浏览器 IndexedDB，本地刷新不丢失
- 批量持久化：大量对象下高效保存与批量删除（`PeerBoard/js/storage.js:71`, `PeerBoard/js/storage.js:127`）
- 贴纸与形状：矩形、圆形、直线、箭头、文本与贴纸管理
- 协作同步：无需服务器，使用手动信令建立 WebRTC 连接（`PeerBoard/js/webrtc.js:269`）

## 目录结构
```
├─ PeerBoard/
│  ├─ index.html         # 主页面
│  ├─ css/style.css      # 样式
│  └─ js/                # 前端逻辑（canvas、存储、协作等）
```

## 启动方式
- 使用 Python 本地启动：
  ```powershell
  python.exe -m http.server 8000 --bind 127.0.0.1 --directory d:\\PeerBoard
  ```
  - 打开：`http://127.0.0.1:8000/index.html`
  - 如端口占用，替换 `8000` 为其他端口
  - 局域网访问：将 `--bind 127.0.0.1` 改为本机 IP（详见下方“局域网访问”）

- 直接打开页面（简便方式）：
  - 双击 `d:\demo\PeerBoard\index.html`
  - 提示：某些浏览器在 `file:///` 模式下可能限制协作相关能力，优先使用上面的 Python 启动

- Vercel 部署（可选）：
  ```powershell
  npm i -g vercel
  vercel --prod
  ```
  - 首次执行按提示登录并关联项目，即可获得在线访问地址


## 局域网访问
- 将 `--bind 127.0.0.1` 改为本机局域网 IP，例如：`--bind 192.168.1.100`
- 防火墙提示时允许 Python 访问网络
- 其他设备通过 `http://<你的IP>:8000/index.html` 访问

## 协作流程（手动信令）
- 发起协作（主持人）：
  - 打开“协作 & 分享”，点击“创建协作会话”
  - 复制房间链接给参与者（`PeerBoard/js/ui.js:662`）
  - 复制主持人信令并发送（`PeerBoard/js/ui.js:675`）
- 加入协作（参与者）：
  - 粘贴主持人邀请信令并生成应答（`PeerBoard/js/ui.js:728`）
  - 将应答信令发回主持人（`PeerBoard/js/ui.js:688`）
- 主持人处理应答，通道建立，开始实时同步（`PeerBoard/js/webrtc.js:269`）

## 数据持久化与清理
- 保存：`Canvas.saveAll()` 负责差异化保存与删除（`PeerBoard/js/canvas.js:510`）
- 批量写入：`Storage.saveMany`（`PeerBoard/js/storage.js:71`）
- 批量删除：`Storage.deleteMany`（`PeerBoard/js/storage.js:127`）
- 清空画布：点击顶部工具栏“清空画布”并确认

## 常用快捷键
- 撤销：`Ctrl + Z`
- 重做：`Ctrl + Y` 或 `Shift + Ctrl + Z`
- 删除选中：`Delete`
- 平移：按住空格拖拽
- 选择工具：左上角工具栏切换

## 常见问题
- 刷新后被删除对象又出现？
  - 已修复：`saveAll()` 会同步批量删除已不存在的对象与贴纸（`PeerBoard/js/canvas.js:510`，`PeerBoard/js/storage.js:127`）
- 协作无法建立或掉线？
  - 确认双方浏览器支持 WebRTC；若在公司网络，可能需要允许 P2P 或使用更稳定网络环境

## 许可
- 个人/学习用途优先。若用于商业或分发，请自行评估并添加适当许可声明。
