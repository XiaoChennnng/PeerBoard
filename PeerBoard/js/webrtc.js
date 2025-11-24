"use strict";
// WebRTC 连接管理
const WebRTC = {
    // 本地对等连接列表
    peers: new Map(), // peerId -> RTCPeerConnection
    dataChannels: new Map(), // peerId -> RTCDataChannel

    // 本地用户信息
    localUser: {
        id: null,
        name: null,
        color: null
    },

    // ICE配置（空配置，仅使用本地候选）
    iceConfig: {
        iceServers: [] // 不使用STUN/TURN，仅本地网络
    },

    // 连接状态
    isHost: false,
    hostId: null,
    pendingOffers: new Map(), // 待处理的offer
    pendingAnswers: new Map(), // 待处理的answer

    // 初始化
    init() {
        // 生成本地用户ID
        this.localUser.id = Utils.generateId('user');
        this.localUser.name = this.generateUserName();
        this.localUser.color = this.generateUserColor();

        console.log('WebRTC初始化完成', this.localUser);
    },

    // 生成用户名
    generateUserName() {
        const stored = localStorage.getItem('peerboard_username');
        if (stored) return stored;

        const name = `用户${Math.floor(Math.random() * 9999)}`;
        localStorage.setItem('peerboard_username', name);
        return name;
    },

    // 生成用户颜色
    generateUserColor() {
        const colors = [
            '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
            '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    // 设置用户名
    setUserName(name) {
        this.localUser.name = name;
        localStorage.setItem('peerboard_username', name);
        this.broadcastUserInfo();
    },

    // 创建房间（成为主持人）
    async createRoom() {
        this.isHost = true;
        this.hostId = this.localUser.id;

        console.log('创建房间，成为主持人');

        // 通知UI更新
        Peers.addPeer(this.localUser.id, this.localUser.name, this.localUser.color, true);

        return {
            hostId: this.hostId,
            hostName: this.localUser.name
        };
    },

    // 创建Offer（主持人）
    async createOffer(peerId = null) {
        const targetPeerId = peerId || Utils.generateId('peer');

        // 创建对等连接
        const pc = new RTCPeerConnection(this.iceConfig);
        this.peers.set(targetPeerId, pc);

        // 创建数据通道
        const dc = pc.createDataChannel('canvas-sync', {
            ordered: false, // 无序传输以提高速度
            maxRetransmits: 0
        });

        dc.peerId = targetPeerId;
        this.setupDataChannel(dc, targetPeerId);
        this.dataChannels.set(targetPeerId, dc);

        // 设置ICE候选收集
        const iceCandidates = [];

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                iceCandidates.push(event.candidate);
            }
        };

        // 监听连接状态
        pc.onconnectionstatechange = () => {
            console.log(`连接状态变化 [${targetPeerId}]:`, pc.connectionState);

            if (pc.connectionState === 'connected') {
                Peers.updatePeerStatus(targetPeerId, 'connected');
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                this.handlePeerDisconnect(targetPeerId);
            }
        };

        // 创建Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // 等待ICE候选收集完成
        await new Promise(resolve => {
            if (pc.iceGatheringState === 'complete') {
                resolve();
            } else {
                pc.onicegatheringstatechange = () => {
                    if (pc.iceGatheringState === 'complete') {
                        resolve();
                    }
                };
            }
        });

        // 打包信令数据
        const signalData = {
            type: 'offer',
            peerId: targetPeerId,
            hostId: this.localUser.id,
            hostName: this.localUser.name,
            hostColor: this.localUser.color,
            roomId: Room.getRoomId(),
            offer: pc.localDescription,
            timestamp: Date.now()
        };

        this.pendingOffers.set(targetPeerId, signalData);

        return signalData;
    },

    // 处理Offer并创建Answer（参与者）
    async handleOffer(signalData) {
        try {
            const { peerId, hostId, hostName, hostColor, offer } = signalData;

            // 创建对等连接
            const pc = new RTCPeerConnection(this.iceConfig);
            this.peers.set(hostId, pc);

            // 监听数据通道
            pc.ondatachannel = (event) => {
                const dc = event.channel;
                dc.peerId = hostId;
                this.setupDataChannel(dc, hostId);
                this.dataChannels.set(hostId, dc);
            };

            // ICE候选收集
            const iceCandidates = [];

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    iceCandidates.push(event.candidate);
                }
            };

            // 监听连接状态
            pc.onconnectionstatechange = () => {
                console.log(`连接状态变化 [${hostId}]:`, pc.connectionState);

                if (pc.connectionState === 'connected') {
                    Peers.updatePeerStatus(hostId, 'connected');
                    // 发送当前用户信息
                    this.sendUserInfo(hostId);
                } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    this.handlePeerDisconnect(hostId);
                }
            };

            // 设置远程描述
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            // 创建Answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // 等待ICE候选收集完成
            await new Promise(resolve => {
                if (pc.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    pc.onicegatheringstatechange = () => {
                        if (pc.iceGatheringState === 'complete') {
                            resolve();
                        }
                    };
                }
            });

            // 添加主持人到对等列表
            Peers.addPeer(hostId, hostName, hostColor, false);

            // 打包Answer信令数据
            const answerData = {
                type: 'answer',
                peerId: this.localUser.id,
                userName: this.localUser.name,
                userColor: this.localUser.color,
                targetPeerId: peerId,
                answer: pc.localDescription,
                timestamp: Date.now()
            };

            return answerData;

        } catch (error) {
            console.error('处理Offer失败:', error);
            throw error;
        }
    },

    // 处理Answer（主持人）
    async handleAnswer(answerData) {
        try {
            const { peerId, userName, userColor, targetPeerId, answer } = answerData;

            const pc = this.peers.get(targetPeerId);
            if (!pc) {
                throw new Error('找不到对应的对等连接');
            }

            // 设置远程描述
            await pc.setRemoteDescription(new RTCSessionDescription(answer));

            // 更新peerId映射
            if (targetPeerId !== peerId) {
                this.peers.set(peerId, pc);
                this.peers.delete(targetPeerId);

                const dc = this.dataChannels.get(targetPeerId);
                if (dc) {
                    dc.peerId = peerId;
                    this.dataChannels.set(peerId, dc);
                    this.dataChannels.delete(targetPeerId);
                }
            }

            // 添加参与者到对等列表
            Peers.addPeer(peerId, userName, userColor, false);

            console.log('Answer处理完成，连接建立中...');

        } catch (error) {
            console.error('处理Answer失败:', error);
            throw error;
        }
    },

    // 设置数据通道
    setupDataChannel(dc, peerId) {
        dc.onopen = () => {
            const id = dc.peerId || peerId;
            console.log(`数据通道打开 [${id}]`);
            Peers.updatePeerStatus(id, 'connected');

            // 同步当前画布状态
            this.syncFullState(id);
        };

        dc.onclose = () => {
            const id = dc.peerId || peerId;
            console.log(`数据通道关闭 [${id}]`);
            this.handlePeerDisconnect(id);
        };

        dc.onerror = (error) => {
            const id = dc.peerId || peerId;
            console.error(`数据通道错误 [${id}]:`, error);
        };

        dc.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const id = dc.peerId || peerId;
                Sync.handleMessage(message, id);
            } catch (error) {
                console.error('处理消息失败:', error);
            }
        };
    },

    // 发送消息到指定对等节点
    sendToPeer(peerId, message) {
        const dc = this.dataChannels.get(peerId);
        if (dc && dc.readyState === 'open') {
            try {
                dc.send(JSON.stringify(message));
                return true;
            } catch (error) {
                console.error(`发送消息失败 [${peerId}]:`, error);
                return false;
            }
        }
        return false;
    },

    // 广播消息到所有连接的对等节点
    broadcast(message) {
        let successCount = 0;

        for (const [peerId, dc] of this.dataChannels) {
            if (dc.readyState === 'open') {
                if (this.sendToPeer(peerId, message)) {
                    successCount++;
                }
            }
        }

        return successCount;
    },

    // 同步完整状态
    syncFullState(peerId) {
        const state = {
            type: 'full_sync',
            senderId: this.localUser.id,
            objects: Canvas.objects,
            stickies: Canvas.stickies,
            viewport: Canvas.viewport,
            timestamp: Date.now()
        };

        this.sendToPeer(peerId, state);
    },

    // 发送用户信息
    sendUserInfo(peerId) {
        const message = {
            type: 'user_info',
            senderId: this.localUser.id,
            userName: this.localUser.name,
            userColor: this.localUser.color,
            timestamp: Date.now()
        };

        this.sendToPeer(peerId, message);
    },

    // 广播用户信息
    broadcastUserInfo() {
        const message = {
            type: 'user_info',
            senderId: this.localUser.id,
            userName: this.localUser.name,
            userColor: this.localUser.color,
            timestamp: Date.now()
        };

        this.broadcast(message);
    },

    // 处理对等节点断开
    handlePeerDisconnect(peerId) {
        console.log(`对等节点断开: ${peerId}`);

        // 清理连接
        const pc = this.peers.get(peerId);
        if (pc) {
            pc.close();
            this.peers.delete(peerId);
        }

        // 清理数据通道
        const dc = this.dataChannels.get(peerId);
        if (dc) {
            dc.close();
            this.dataChannels.delete(peerId);
        }

        // 从对等列表移除
        Peers.removePeer(peerId);

        // 释放该用户锁定的对象
        ObjectLock.releaseAllLocks(peerId);
    },

    // 断开所有连接
    disconnectAll() {
        for (const [peerId, pc] of this.peers) {
            pc.close();
        }

        for (const [peerId, dc] of this.dataChannels) {
            dc.close();
        }

        this.peers.clear();
        this.dataChannels.clear();
        Peers.clearAll();
    },

    // 获取连接数量
    getConnectionCount() {
        let count = 0;
        for (const dc of this.dataChannels.values()) {
            if (dc.readyState === 'open') {
                count++;
            }
        }
        return count;
    }
};
