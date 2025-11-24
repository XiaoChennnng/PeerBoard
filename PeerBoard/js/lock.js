"use strict";
// 对象锁定管理
const ObjectLock = {
    // 锁定映射 objectId -> peerId
    locks: new Map(),

    // 请求锁定对象
    requestLock(objectId, peerId) {
        const currentLock = this.locks.get(objectId);

        // 如果没有锁定或已被同一用户锁定
        if (!currentLock || currentLock === peerId) {
            this.locks.set(objectId, peerId);

            // 添加到对等节点的锁定列表
            const peer = Peers.getPeer(peerId);
            if (peer) {
                peer.lockedObjects.add(objectId);
            }

            return true;
        }

        return false;
    },

    // 释放锁定
    releaseLock(objectId, peerId) {
        const currentLock = this.locks.get(objectId);

        // 只有锁定者才能释放
        if (currentLock === peerId) {
            this.locks.delete(objectId);

            // 从对等节点的锁定列表移除
            const peer = Peers.getPeer(peerId);
            if (peer) {
                peer.lockedObjects.delete(objectId);
            }

            return true;
        }

        return false;
    },

    // 检查对象是否被锁定
    isLocked(objectId, excludePeerId = null) {
        const lockHolder = this.locks.get(objectId);

        if (!lockHolder) return false;

        if (excludePeerId && lockHolder === excludePeerId) {
            return false;
        }

        return true;
    },

    // 获取锁定者
    getLockHolder(objectId) {
        return this.locks.get(objectId);
    },

    // 释放用户的所有锁定
    releaseAllLocks(peerId) {
        const toRelease = [];

        for (const [objectId, lockHolder] of this.locks.entries()) {
            if (lockHolder === peerId) {
                toRelease.push(objectId);
            }
        }

        toRelease.forEach(objectId => {
            this.locks.delete(objectId);
        });

        const peer = Peers.getPeer(peerId);
        if (peer) {
            peer.lockedObjects.clear();
        }

        console.log(`释放用户 ${peerId} 的 ${toRelease.length} 个锁定`);
    },

    // 尝试锁定对象（本地用户）
    async tryLock(objectId) {
        const localUserId = WebRTC.localUser.id;

        // 先尝试本地锁定
        if (this.requestLock(objectId, localUserId)) {
            // 如果启用了同步，请求远程锁定
            if (Sync.enabled && WebRTC.getConnectionCount() > 0) {
                const message = {
                    type: 'lock_request',
                    senderId: localUserId,
                    objectId: objectId,
                    timestamp: Date.now()
                };

                WebRTC.broadcast(message);
            }

            return true;
        }

        return false;
    },

    // 释放对象锁定（本地用户）
    unlock(objectId) {
        const localUserId = WebRTC.localUser.id;

        if (this.releaseLock(objectId, localUserId)) {
            // 如果启用了同步，通知远程释放
            if (Sync.enabled && WebRTC.getConnectionCount() > 0) {
                const message = {
                    type: 'lock_release',
                    senderId: localUserId,
                    objectId: objectId,
                    timestamp: Date.now()
                };

                WebRTC.broadcast(message);
            }

            return true;
        }

        return false;
    },

    // 渲染锁定指示器
    renderLockIndicators(ctx) {
        ctx.save();

        for (const [objectId, peerId] of this.locks.entries()) {
            const peer = Peers.getPeer(peerId);
            if (!peer || peer.isLocal) continue;

            // 找到对象
            let obj = Canvas.objects.find(o => o.id === objectId);
            if (!obj) {
                obj = Canvas.stickies.find(s => s.id === objectId);
            }

            if (obj) {
                this.renderLockIndicator(ctx, obj, peer);
            }
        }

        ctx.restore();
    },

    // 渲染单个锁定指示器
    renderLockIndicator(ctx, obj, peer) {
        const bounds = Canvas.getObjectBounds(obj);
        if (!bounds) return;

        // 绘制边框
        ctx.strokeStyle = peer.color;
        ctx.lineWidth = 3 / Canvas.viewport.zoom;
        ctx.setLineDash([8 / Canvas.viewport.zoom, 4 / Canvas.viewport.zoom]);
        ctx.strokeRect(
            bounds.x - 3,
            bounds.y - 3,
            bounds.width + 6,
            bounds.height + 6
        );

        // 绘制标签
        ctx.setLineDash([]);
        ctx.fillStyle = peer.color;
        ctx.font = `${12 / Canvas.viewport.zoom}px Arial`;

        const label = `${peer.name} 正在编辑`;
        const metrics = ctx.measureText(label);
        const padding = 4 / Canvas.viewport.zoom;

        ctx.fillRect(
            bounds.x,
            bounds.y - 20 / Canvas.viewport.zoom,
            metrics.width + padding * 2,
            16 / Canvas.viewport.zoom
        );

        ctx.fillStyle = '#ffffff';
        ctx.fillText(
            label,
            bounds.x + padding,
            bounds.y - 6 / Canvas.viewport.zoom
        );
    }
};
