"use strict";
// 房间管理
const Room = {
    currentRoomId: null,
    createdAt: null,

    // 初始化房间
    async init() {
        // 从URL获取房间ID
        let roomId = Utils.getUrlParam('room');

        if (!roomId) {
            // 如果没有房间ID，创建新房间
            roomId = Utils.generateRoomId();
            Utils.setUrlParam('room', roomId);
        }

        this.currentRoomId = roomId;
        this.createdAt = new Date();

        // 尝试从本地存储加载房间数据
        const roomData = await Storage.getRoom(roomId);
        if (!roomData) {
            // 如果是新房间，保存到存储
            await this.saveRoomData();
        } else {
            this.createdAt = new Date(roomData.createdAt);
        }

        return roomId;
    },

    // 保存房间数据
    async saveRoomData() {
        const roomData = {
            id: this.currentRoomId,
            createdAt: this.createdAt.toISOString(),
            lastModified: new Date().toISOString()
        };

        await Storage.saveRoom(roomData);
    },

    // 获取房间ID
    getRoomId() {
        return this.currentRoomId;
    },

    // 获取分享链接
    getShareLink() {
        const url = new URL(window.location.href);
        url.searchParams.set('room', this.currentRoomId);
        return url.toString();
    },

    // 导出房间数据为JSON
    async exportToJSON() {
        const objects = await Storage.getRoomObjects(this.currentRoomId);
        const stickies = await Storage.getRoomStickies(this.currentRoomId);
        const roomData = await Storage.getRoom(this.currentRoomId);

        return {
            version: '1.0.0',
            roomId: this.currentRoomId,
            createdAt: roomData?.createdAt || this.createdAt.toISOString(),
            exportedAt: new Date().toISOString(),
            viewport: {
                x: Canvas.viewport.x,
                y: Canvas.viewport.y,
                zoom: Canvas.viewport.zoom
            },
            objects: objects || [],
            stickies: stickies || [],
            objectCount: (objects?.length || 0) + (stickies?.length || 0)
        };
    },

    // 从JSON导入房间数据
    async importFromJSON(data, strategy = 'merge') {
        try {
            if (strategy === 'replace') {
                // 清空当前房间的数据
                await this.clearRoomData();
            }

            // 导入对象
            if (data.objects) {
                for (const obj of data.objects) {
                    // 如果是合并策略，重新生成ID以避免冲突
                    if (strategy === 'merge') {
                        obj.id = Utils.generateId(obj.type);
                    }
                    obj.roomId = this.currentRoomId;
                    await Storage.saveObject(obj);
                    Canvas.objects.push(obj);
                }
            }

            // 导入贴纸
            if (data.stickies) {
                for (const sticky of data.stickies) {
                    if (strategy === 'merge') {
                        sticky.id = Utils.generateId('sticky');
                    }
                    sticky.roomId = this.currentRoomId;
                    await Storage.saveSticky(sticky);
                    Canvas.stickies.push(sticky);
                }
            }

            // 如果是覆盖策略，恢复视口
            if (strategy === 'replace' && data.viewport) {
                Canvas.viewport.x = data.viewport.x;
                Canvas.viewport.y = data.viewport.y;
                Canvas.viewport.zoom = data.viewport.zoom;
            }

            await this.saveRoomData();
            Canvas.render();

            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    },

    // 清空房间数据
    async clearRoomData() {
        // 清空内存中的对象
        Canvas.objects = [];
        Canvas.stickies = [];

        // 从数据库删除所有对象
        const objects = await Storage.getRoomObjects(this.currentRoomId);
        for (const obj of objects) {
            await Storage.deleteObject(obj.id);
        }

        // 从数据库删除所有贴纸
        const stickies = await Storage.getRoomStickies(this.currentRoomId);
        for (const sticky of stickies) {
            await Storage.deleteSticky(sticky.id);
        }
    }
};
