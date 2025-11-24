"use strict";
// 对等节点管理
const Peers = {
    // 对等节点列表 peerId -> { id, name, color, isLocal, status, cursor, lockedObjects }
    peers: new Map(),

    // 添加对等节点
    addPeer(peerId, name, color, isLocal = false) {
        const peer = {
            id: peerId,
            name: name,
            color: color,
            isLocal: isLocal,
            status: 'connecting', // connecting, connected, disconnected
            cursor: { x: 0, y: 0, visible: false },
            lockedObjects: new Set(),
            lastSeen: Date.now()
        };

        this.peers.set(peerId, peer);
        this.updateUI();

        console.log('添加对等节点:', peer);
    },

    // 移除对等节点
    removePeer(peerId) {
        this.peers.delete(peerId);
        this.updateUI();

        console.log('移除对等节点:', peerId);
    },

    // 更新对等节点状态
    updatePeerStatus(peerId, status) {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.status = status;
            peer.lastSeen = Date.now();
            this.updateUI();
        }
    },

    // 更新对等节点光标
    updatePeerCursor(peerId, x, y, visible = true) {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.cursor = { x, y, visible };
            peer.lastSeen = Date.now();

            // 触发光标渲染
            Canvas.render();
        }
    },

    // 获取对等节点
    getPeer(peerId) {
        return this.peers.get(peerId);
    },

    // 获取所有对等节点
    getAllPeers() {
        return Array.from(this.peers.values());
    },

    // 获取在线对等节点
    getOnlinePeers() {
        return Array.from(this.peers.values()).filter(p => p.status === 'connected');
    },

    // 清空所有对等节点
    clearAll() {
        this.peers.clear();
        this.updateUI();
    },

    // 更新UI
    updateUI() {
        const container = document.getElementById('online-users');
        if (!container) return;

        container.innerHTML = '';

        const onlinePeers = this.getOnlinePeers();

        // 显示在线人数
        const count = document.createElement('div');
        count.className = 'online-count';
        count.textContent = `${onlinePeers.length} 人在线`;
        container.appendChild(count);

        // 显示每个用户
        onlinePeers.forEach(peer => {
            const userEl = document.createElement('div');
            userEl.className = 'online-user';
            userEl.style.borderLeftColor = peer.color;

            const avatar = document.createElement('div');
            avatar.className = 'user-avatar';
            avatar.style.backgroundColor = peer.color;
            avatar.textContent = peer.name.charAt(0).toUpperCase();

            const nameEl = document.createElement('div');
            nameEl.className = 'user-name';
            nameEl.textContent = peer.name;
            if (peer.isLocal) {
                nameEl.textContent += ' (我)';
            }

            userEl.appendChild(avatar);
            userEl.appendChild(nameEl);
            container.appendChild(userEl);
        });
    },

    // 渲染光标
    renderCursors(ctx) {
        ctx.save();

        for (const peer of this.peers.values()) {
            if (peer.cursor.visible && !peer.isLocal && peer.status === 'connected') {
                this.renderCursor(ctx, peer);
            }
        }

        ctx.restore();
    },

    // 渲染单个光标
    renderCursor(ctx, peer) {
        const { x, y } = peer.cursor;

        // 绘制光标箭头
        ctx.fillStyle = peer.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 12, y + 12);
        ctx.lineTo(x + 7, y + 14);
        ctx.lineTo(x + 10, y + 20);
        ctx.lineTo(x + 6, y + 21);
        ctx.lineTo(x + 3, y + 15);
        ctx.lineTo(x, y + 17);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        // 绘制用户名标签
        ctx.font = '12px Arial';
        const nameWidth = ctx.measureText(peer.name).width;
        const padding = 6;

        ctx.fillStyle = peer.color;
        ctx.fillRect(x + 15, y + 5, nameWidth + padding * 2, 20);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(peer.name, x + 15 + padding, y + 18);
    }
};
