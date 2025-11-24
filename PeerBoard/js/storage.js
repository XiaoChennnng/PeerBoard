"use strict";
// 本地存储管理
const Storage = {
    DB_NAME: 'PeerBoardDB',
    DB_VERSION: 1,
    STORES: {
        ROOMS: 'rooms',
        OBJECTS: 'objects',
        STICKIES: 'stickies',
        CONTACTS: 'contacts',
        SETTINGS: 'settings'
    },
    db: null,

    // 初始化IndexedDB
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 创建房间存储
                if (!db.objectStoreNames.contains(this.STORES.ROOMS)) {
                    db.createObjectStore(this.STORES.ROOMS, { keyPath: 'id' });
                }

                // 创建对象存储
                if (!db.objectStoreNames.contains(this.STORES.OBJECTS)) {
                    const objectStore = db.createObjectStore(this.STORES.OBJECTS, { keyPath: 'id' });
                    objectStore.createIndex('roomId', 'roomId', { unique: false });
                }

                // 创建贴纸存储
                if (!db.objectStoreNames.contains(this.STORES.STICKIES)) {
                    const stickyStore = db.createObjectStore(this.STORES.STICKIES, { keyPath: 'id' });
                    stickyStore.createIndex('roomId', 'roomId', { unique: false });
                }

                // 创建联系人存储
                if (!db.objectStoreNames.contains(this.STORES.CONTACTS)) {
                    db.createObjectStore(this.STORES.CONTACTS, { keyPath: 'id' });
                }

                // 创建设置存储
                if (!db.objectStoreNames.contains(this.STORES.SETTINGS)) {
                    db.createObjectStore(this.STORES.SETTINGS, { keyPath: 'key' });
                }
            };
        });
    },

    // 保存数据
    async save(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async saveMany(storeName, dataArray) {
        if (!dataArray || dataArray.length === 0) return;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            for (const data of dataArray) {
                store.put(data);
            }
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    // 获取数据
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // 获取所有数据
    async getAll(storeName, indexName = null, indexValue = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            let request;

            if (indexName && indexValue !== null) {
                const index = store.index(indexName);
                request = index.getAll(indexValue);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // 删除数据
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async deleteMany(storeName, keys) {
        if (!keys || keys.length === 0) return;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            for (const key of keys) {
                store.delete(key);
            }
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    // 清空存储
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // 保存房间信息
    async saveRoom(roomData) {
        return this.save(this.STORES.ROOMS, roomData);
    },

    // 获取房间信息
    async getRoom(roomId) {
        return this.get(this.STORES.ROOMS, roomId);
    },

    // 保存对象
    async saveObject(objectData) {
        return this.save(this.STORES.OBJECTS, objectData);
    },

    async saveManyObjects(objects) {
        return this.saveMany(this.STORES.OBJECTS, objects);
    },

    // 获取房间的所有对象
    async getRoomObjects(roomId) {
        return this.getAll(this.STORES.OBJECTS, 'roomId', roomId);
    },

    // 删除对象
    async deleteObject(objectId) {
        return this.delete(this.STORES.OBJECTS, objectId);
    },

    async deleteManyObjects(objectIds) {
        return this.deleteMany(this.STORES.OBJECTS, objectIds);
    },

    // 保存贴纸
    async saveSticky(stickyData) {
        return this.save(this.STORES.STICKIES, stickyData);
    },

    async saveManyStickies(stickies) {
        return this.saveMany(this.STORES.STICKIES, stickies);
    },

    // 获取房间的所有贴纸
    async getRoomStickies(roomId) {
        return this.getAll(this.STORES.STICKIES, 'roomId', roomId);
    },

    // 删除贴纸
    async deleteSticky(stickyId) {
        return this.delete(this.STORES.STICKIES, stickyId);
    },

    async deleteManyStickies(stickyIds) {
        return this.deleteMany(this.STORES.STICKIES, stickyIds);
    },

    // 保存设置
    async saveSetting(key, value) {
        return this.save(this.STORES.SETTINGS, { key, value });
    },

    // 获取设置
    async getSetting(key, defaultValue = null) {
        const result = await this.get(this.STORES.SETTINGS, key);
        return result ? result.value : defaultValue;
    }
};
