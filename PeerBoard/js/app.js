"use strict";
// 主应用
const App = {
    // 初始化应用
    async init() {
        try {
            // 显示加载状态
            console.log('初始化 PeerBoard...');

            // 初始化存储
            await Storage.init();
            console.log('存储初始化完成');

            // 初始化房间
            const roomId = await Room.init();
            console.log('房间初始化完成:', roomId);

            // 初始化WebRTC
            WebRTC.init();
            console.log('WebRTC初始化完成');

            // 初始化Peers
            Peers.addPeer(WebRTC.localUser.id, WebRTC.localUser.name, WebRTC.localUser.color, true);
            console.log('Peers初始化完成');

            // 初始化画布
            Canvas.init();
            console.log('画布初始化完成');

            // 加载保存的数据
            await Canvas.loadAll();
            console.log('数据加载完成');

            // 初始化历史记录
            Canvas.addToHistory();

            // 初始化UI
            UI.init();
            console.log('UI初始化完成');

            // 启动光标广播
            this.startCursorBroadcast();

            // 初始化完成
            console.log('PeerBoard 初始化完成!');
            console.log('当前房间:', roomId);
            console.log('用户ID:', WebRTC.localUser.id);

            // 显示欢迎提示
            this.showWelcomeMessage();

        } catch (error) {
            console.error('初始化失败:', error);
            alert('应用初始化失败，请刷新页面重试');
        }
    },

    // 启动光标广播
    startCursorBroadcast() {
        const canvas = document.getElementById('main-canvas');

        canvas.addEventListener('pointermove', (e) => {
            if (!Sync.enabled) return;

            const rect = canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const canvasPos = Canvas.screenToCanvas(screenX, screenY);

            // 广播光标位置
            Sync.broadcastCursor(canvasPos.x, canvasPos.y);
        });
    },

    // 显示欢迎消息
    showWelcomeMessage() {
        const isNewRoom = Canvas.objects.length === 0 && Canvas.stickies.length === 0;

        if (isNewRoom) {
            console.log(`
╔═══════════════════════════════════════════╗
║   欢迎使用 PeerBoard 离线协作白板         ║
╠═══════════════════════════════════════════╣
║                                           ║
║   快捷键:                                 ║
║   - Space: 切换到抓手工具                ║
║   - Ctrl/Cmd+Z: 撤销                     ║
║   - Ctrl/Cmd+Y: 重做                     ║
║   - Ctrl/Cmd+D: 复制选中对象             ║
║   - Delete: 删除选中对象                 ║
║   - 双击贴纸: 标记完成                   ║
║   - 滚轮: 缩放画布                       ║
║                                           ║
║   多人协作:                               ║
║   - 点击右上角"连接协作"建立P2P连接      ║
║   - 通过信令与其他用户协作               ║
║   - 所有数据自动同步                     ║
║                                           ║
║   提示:                                   ║
║   - 点击右上角分享按钮分享房间           ║
║   - 所有数据自动保存在本地               ║
║   - 刷新页面不会丢失数据                 ║
║                                           ║
╚═══════════════════════════════════════════╝
            `);
        }
    },

    // 自动保存
    startAutoSave() {
        // 每30秒自动保存一次
        setInterval(() => {
            Canvas.saveAll();
        }, 30000);
    }
};

// 当页面加载完成后初始化应用
window.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// 页面卸载前保存数据
window.addEventListener('beforeunload', () => {
    Canvas.saveAll();
});
