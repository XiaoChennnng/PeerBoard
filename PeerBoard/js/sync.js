"use strict";
// 操作同步
const Sync = {
    // 同步启用标志
    enabled: false,

    // 操作队列
    operationQueue: [],
    processingQueue: false,

    // 启用同步
    enable() {
        this.enabled = true;
        console.log('同步已启用');
    },

    // 禁用同步
    disable() {
        this.enabled = false;
        console.log('同步已禁用');
    },

    // 处理接收到的消息
    handleMessage(message, peerId) {
        if (!message || !message.type) return;

        const peer = Peers.getPeer(peerId);
        if (peer) {
            peer.lastSeen = Date.now();
        }

        switch (message.type) {
            case 'full_sync':
                this.handleFullSync(message, peerId);
                break;

            case 'operation':
                this.handleOperation(message, peerId);
                break;

            case 'cursor_move':
                this.handleCursorMove(message, peerId);
                break;

            case 'user_info':
                this.handleUserInfo(message, peerId);
                break;

            case 'lock_request':
                this.handleLockRequest(message, peerId);
                break;

            case 'lock_release':
                this.handleLockRelease(message, peerId);
                break;

            case 'lock_response':
                this.handleLockResponse(message, peerId);
                break;

            default:
                console.warn('未知消息类型:', message.type);
        }
    },

    // 处理完整同步
    handleFullSync(message, peerId) {
        console.log('接收到完整同步数据');

        // 合并对象
        if (message.objects) {
            message.objects.forEach(obj => {
                // 检查是否已存在
                const exists = Canvas.objects.find(o => o.id === obj.id);
                if (!exists) {
                    Canvas.objects.push(obj);
                }
            });
        }

        // 合并贴纸
        if (message.stickies) {
            message.stickies.forEach(sticky => {
                const exists = Canvas.stickies.find(s => s.id === sticky.id);
                if (!exists) {
                    Canvas.stickies.push(sticky);
                }
            });
        }

        Canvas.render();
        Canvas.saveAll();
        UI.updateStickyList();
    },

    // 处理操作
    handleOperation(message, peerId) {
        if (!this.enabled) return;

        const { operation, data } = message;

        switch (operation) {
            case 'add_object':
                this.handleAddObject(data, peerId);
                break;

            case 'update_object':
                this.handleUpdateObject(data, peerId);
                break;

            case 'delete_object':
                this.handleDeleteObject(data, peerId);
                break;

            case 'add_sticky':
                this.handleAddSticky(data, peerId);
                break;

            case 'update_sticky':
                this.handleUpdateSticky(data, peerId);
                break;

            case 'delete_sticky':
                this.handleDeleteSticky(data, peerId);
                break;

            case 'clear_canvas':
                this.handleClearCanvas(peerId);
                break;

            case 'start_path':
                this.handleStartPath(data, peerId);
                break;

            case 'append_path':
                this.handleAppendPath(data, peerId);
                break;

            case 'finish_path':
                this.handleFinishPath(data, peerId);
                break;

            default:
                console.warn('未知操作类型:', operation);
        }
    },

    // 处理添加对象
    handleAddObject(data, peerId) {
        const { object } = data;

        // 检查是否已存在
        const exists = Canvas.objects.find(o => o.id === object.id);
        if (!exists) {
            object.roomId = Room.getRoomId();
            Canvas.objects.push(object);
            Canvas.render();
            Storage.saveObject(object);
        }
    },

    // 处理更新对象
    handleUpdateObject(data, peerId) {
        const { objectId, updates } = data;

        const obj = Canvas.objects.find(o => o.id === objectId);
        if (obj) {
            Object.assign(obj, updates);
            Canvas.render();
            Storage.saveObject(obj);
        }
    },

    // 处理删除对象
    handleDeleteObject(data, peerId) {
        const { objectId } = data;

        const index = Canvas.objects.findIndex(o => o.id === objectId);
        if (index > -1) {
            Canvas.objects.splice(index, 1);
            Canvas.render();
            Storage.deleteObject(objectId);
        }
    },

    // 处理添加贴纸
    handleAddSticky(data, peerId) {
        const { sticky } = data;

        const exists = Canvas.stickies.find(s => s.id === sticky.id);
        if (!exists) {
            sticky.roomId = Room.getRoomId();
            Canvas.stickies.push(sticky);
            Canvas.render();
            Storage.saveSticky(sticky);
            UI.updateStickyList();
        }
    },

    // 处理更新贴纸
    handleUpdateSticky(data, peerId) {
        const { stickyId, updates } = data;

        const sticky = Canvas.stickies.find(s => s.id === stickyId);
        if (sticky) {
            Object.assign(sticky, updates);
            Canvas.render();
            Storage.saveSticky(sticky);
            UI.updateStickyList();
        }
    },

    // 处理删除贴纸
    handleDeleteSticky(data, peerId) {
        const { stickyId } = data;

        const index = Canvas.stickies.findIndex(s => s.id === stickyId);
        if (index > -1) {
            Canvas.stickies.splice(index, 1);
            Canvas.render();
            Storage.deleteSticky(stickyId);
            UI.updateStickyList();
        }
    },

    // 处理清空画布
    handleClearCanvas(peerId) {
        Canvas.objects = [];
        Canvas.stickies = [];
        Canvas.render();
        Canvas.saveAll();
        UI.updateStickyList();
    },

    handleStartPath(data, peerId) {
        const { object } = data;
        const exists = Canvas.tempObjects.find(o => o.id === object.id);
        if (!exists) {
            Canvas.tempObjects.push(object);
            Canvas.render();
        }
    },

    handleAppendPath(data, peerId) {
        const { objectId, point } = data;
        const obj = Canvas.tempObjects.find(o => o.id === objectId);
        if (obj && obj.points) {
            obj.points.push(point);
            Canvas.render();
        }
    },

    handleFinishPath(data, peerId) {
        const { object } = data;
        // 从临时列表移除
        Canvas.tempObjects = Canvas.tempObjects.filter(o => o.id !== object.id);
        // 避免重复添加
        const exists = Canvas.objects.find(o => o.id === object.id);
        if (!exists) {
            Canvas.objects.push(object);
            Canvas.render();
            Storage.saveObject(object);
        }
    },

    // 处理光标移动
    handleCursorMove(message, peerId) {
        const { x, y } = message;
        Peers.updatePeerCursor(peerId, x, y, true);
    },

    // 处理用户信息
    handleUserInfo(message, peerId) {
        const { userName, userColor } = message;

        const peer = Peers.getPeer(peerId);
        if (peer) {
            peer.name = userName;
            peer.color = userColor;
            Peers.updateUI();
        }
    },

    // 处理锁定请求
    handleLockRequest(message, peerId) {
        const { objectId } = message;
        const granted = ObjectLock.requestLock(objectId, peerId);

        // 发送响应
        const response = {
            type: 'lock_response',
            senderId: WebRTC.localUser.id,
            objectId: objectId,
            granted: granted,
            timestamp: Date.now()
        };

        WebRTC.sendToPeer(peerId, response);
    },

    // 处理锁定释放
    handleLockRelease(message, peerId) {
        const { objectId } = message;
        ObjectLock.releaseLock(objectId, peerId);
    },

    // 处理锁定响应
    handleLockResponse(message, peerId) {
        const { objectId, granted } = message;

        if (!granted) {
            console.log('对象已被其他用户锁定:', objectId);
            // 取消当前操作
            Canvas.selectedObjects = Canvas.selectedObjects.filter(obj => obj.id !== objectId);
            Canvas.render();
        }
    },

    // 广播操作
    broadcastOperation(operation, data) {
        if (!this.enabled) return;

        const message = {
            type: 'operation',
            senderId: WebRTC.localUser.id,
            operation: operation,
            data: data,
            timestamp: Date.now()
        };

        WebRTC.broadcast(message);
    },

    // 广播光标位置
    broadcastCursor: Utils.throttle(function(x, y) {
        if (!Sync.enabled) return;

        const message = {
            type: 'cursor_move',
            senderId: WebRTC.localUser.id,
            x: x,
            y: y,
            timestamp: Date.now()
        };

        WebRTC.broadcast(message);
    }, 50), // 每50ms最多发送一次

    // 同步添加对象
    syncAddObject(object) {
        this.broadcastOperation('add_object', { object });
    },

    // 同步更新对象
    syncUpdateObject(objectId, updates) {
        this.broadcastOperation('update_object', { objectId, updates });
    },

    // 同步删除对象
    syncDeleteObject(objectId) {
        this.broadcastOperation('delete_object', { objectId });
    },

    // 同步添加贴纸
    syncAddSticky(sticky) {
        this.broadcastOperation('add_sticky', { sticky });
    },

    // 同步更新贴纸
    syncUpdateSticky(stickyId, updates) {
        this.broadcastOperation('update_sticky', { stickyId, updates });
    },

    // 同步删除贴纸
    syncDeleteSticky(stickyId) {
        this.broadcastOperation('delete_sticky', { stickyId });
    },

    // 同步清空画布
    syncClearCanvas() {
        this.broadcastOperation('clear_canvas', {});
    },

    syncStartPath(object) {
        const payload = {
            id: object.id,
            type: object.type,
            points: object.points ? [object.points[0]] : [],
            color: object.color,
            strokeWidth: object.strokeWidth,
            opacity: object.opacity
        };
        this.broadcastOperation('start_path', { object: payload });
    },

    syncAppendPath: Utils.throttle(function(objectId, point) {
        Sync.broadcastOperation('append_path', { objectId, point });
    }, 20),

    syncFinishPath(object) {
        this.broadcastOperation('finish_path', { object });
    }
};
