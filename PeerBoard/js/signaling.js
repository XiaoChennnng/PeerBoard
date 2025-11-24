"use strict";
// 信令交换管理
const Signaling = {
    // 压缩和编码信令数据
    encode(data) {
        const json = JSON.stringify(data);
        // 使用Base64编码
        return btoa(encodeURIComponent(json));
    },

    // 解码信令数据
    decode(encoded) {
        try {
            const json = decodeURIComponent(atob(encoded));
            return JSON.parse(json);
        } catch (error) {
            console.error('解码失败:', error);
            return null;
        }
    },

    // 生成邀请链接
    generateInviteLink(signalData) {
        const encoded = this.encode(signalData);
        const url = new URL(window.location.href);
        url.searchParams.set('signal', encoded);
        return url.toString();
    },

    // 从URL解析信令数据
    parseSignalFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const signal = urlParams.get('signal');

        if (signal) {
            return this.decode(signal);
        }

        return null;
    },

    // 清除URL中的信令参数
    clearSignalFromUrl() {
        const url = new URL(window.location.href);
        url.searchParams.delete('signal');
        window.history.replaceState({}, '', url);
    }
};
