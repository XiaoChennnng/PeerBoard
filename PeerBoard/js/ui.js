"use strict";
// UI 交互管理
const UI = {
    // 初始化UI
    init() {
        this.initToolbar();
        this.initRoomInfo();
        this.initModals();
        this.initCollaborateModal();
        this.initBottomToolbar();
        this.initStickyPanel();
        this.initKeyboardShortcuts();
        this.initCanvasEvents();
    },

    // 初始化工具条
    initToolbar() {
        const toolbarToggle = document.getElementById('toolbar-toggle');
        const toolbar = document.getElementById('toolbar');

        // 默认展开工具条
        toolbar.classList.add('expanded');

        // 切换工具条展开/收起
        toolbarToggle.addEventListener('click', () => {
            toolbar.classList.toggle('expanded');
        });

        // 工具按钮点击事件
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.getAttribute('data-tool');
                if (tool) {
                    // 移除所有active类
                    toolButtons.forEach(b => b.classList.remove('active'));
                    // 添加active类到当前按钮
                    btn.classList.add('active');
                    // 设置工具
                    Tools.setTool(tool);
                }
            });
        });

        // 颜色选择器
        const colorInput = document.getElementById('color-input');
        colorInput.addEventListener('input', (e) => {
            Tools.setColor(e.target.value);
        });

        // 笔触粗细
        const strokeWidth = document.getElementById('stroke-width');
        const strokeWidthValue = document.getElementById('stroke-width-value');
        strokeWidth.addEventListener('input', (e) => {
            Tools.setStrokeWidth(parseInt(e.target.value));
            strokeWidthValue.textContent = e.target.value;
        });
    },

    // 初始化房间信息
    initRoomInfo() {
        const collaborateBtn = document.getElementById('collaborate-btn');
        const exportBtn = document.getElementById('export-btn');
        const importBtn = document.getElementById('import-btn');

        collaborateBtn.addEventListener('click', () => this.showCollaborateModal());
        exportBtn.addEventListener('click', () => this.showExportModal());
        importBtn.addEventListener('click', () => this.showImportModal());

        // 更新房间ID显示
        this.updateRoomId();
    },

    // 初始化模态框
    initModals() {
        // 保留协作、导出、导入模态框

        // 导出模态框
        const exportModal = document.getElementById('export-modal');
        const closeExportModal = document.getElementById('close-export-modal');
        const doExportBtn = document.getElementById('do-export-btn');
        const cancelExportBtn = document.getElementById('cancel-export-btn');

        closeExportModal.addEventListener('click', () => {
            exportModal.classList.add('hidden');
        });

        cancelExportBtn.addEventListener('click', () => {
            exportModal.classList.add('hidden');
        });

        doExportBtn.addEventListener('click', () => {
            this.handleExport();
        });

        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                exportModal.classList.add('hidden');
            }
        });

        // 导入模态框
        const importModal = document.getElementById('import-modal');
        const closeImportModal = document.getElementById('close-import-modal');
        const importArea = document.getElementById('import-area');
        const importFileInput = document.getElementById('import-file-input');
        const doImportBtn = document.getElementById('do-import-btn');
        const cancelImportBtn = document.getElementById('cancel-import-btn');

        closeImportModal.addEventListener('click', () => {
            importModal.classList.add('hidden');
        });

        cancelImportBtn.addEventListener('click', () => {
            importModal.classList.add('hidden');
        });

        importArea.addEventListener('click', () => {
            importFileInput.click();
        });

        importFileInput.addEventListener('change', (e) => {
            this.handleImportFile(e.target.files[0]);
        });

        importArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            importArea.style.borderColor = '#3b82f6';
        });

        importArea.addEventListener('dragleave', () => {
            importArea.style.borderColor = '#e0e0e0';
        });

        importArea.addEventListener('drop', (e) => {
            e.preventDefault();
            importArea.style.borderColor = '#e0e0e0';
            const file = e.dataTransfer.files[0];
            this.handleImportFile(file);
        });

        doImportBtn.addEventListener('click', () => {
            this.handleImport();
        });

        importModal.addEventListener('click', (e) => {
            if (e.target === importModal) {
                importModal.classList.add('hidden');
            }
        });

        const clearModal = document.getElementById('clear-modal');
        const closeClearModal = document.getElementById('close-clear-modal');
        const doClearBtn = document.getElementById('do-clear-btn');
        const cancelClearBtn = document.getElementById('cancel-clear-btn');

        closeClearModal.addEventListener('click', () => {
            clearModal.classList.add('hidden');
        });

        cancelClearBtn.addEventListener('click', () => {
            clearModal.classList.add('hidden');
        });

        doClearBtn.addEventListener('click', () => {
            Canvas.clear();
            UI.updateStickyList();
            if (typeof Sync !== 'undefined' && Sync.enabled) {
                Sync.syncClearCanvas();
            }
            clearModal.classList.add('hidden');
        });

        clearModal.addEventListener('click', (e) => {
            if (e.target === clearModal) {
                clearModal.classList.add('hidden');
            }
        });

        const stickyEditModal = document.getElementById('sticky-edit-modal');
        const closeStickyEditModal = document.getElementById('close-sticky-edit-modal');
        const stickyEditText = document.getElementById('sticky-edit-text');
        const doStickyEdit = document.getElementById('do-sticky-edit');
        const cancelStickyEdit = document.getElementById('cancel-sticky-edit');

        closeStickyEditModal.addEventListener('click', () => {
            stickyEditModal.classList.add('hidden');
            this.editingSticky = null;
        });

        cancelStickyEdit.addEventListener('click', () => {
            stickyEditModal.classList.add('hidden');
            this.editingSticky = null;
        });

        doStickyEdit.addEventListener('click', async () => {
            if (this.editingSticky) {
                this.editingSticky.text = stickyEditText.value || '';
                Canvas.render();
                await Storage.saveSticky(this.editingSticky);
                this.updateStickyList();
                if (typeof Sync !== 'undefined' && Sync.enabled) {
                    Sync.syncUpdateSticky(this.editingSticky.id, { text: this.editingSticky.text });
                }
            }
            stickyEditModal.classList.add('hidden');
            this.editingSticky = null;
        });

        stickyEditModal.addEventListener('click', (e) => {
            if (e.target === stickyEditModal) {
                stickyEditModal.classList.add('hidden');
                this.editingSticky = null;
            }
        });
    },

    // 初始化底部工具栏
    initBottomToolbar() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        const clearBtn = document.getElementById('clear-btn');
        const deleteSelectedBtn = document.getElementById('delete-selected-btn');

        undoBtn.addEventListener('click', () => Canvas.undo());
        redoBtn.addEventListener('click', () => Canvas.redo());
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showClearModal();
        });

        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => {
                Tools.deleteSelected();
                this.updateSelectionActions();
            });
        }
    },

    // 初始化贴纸面板
    initStickyPanel() {
        const stickyPanel = document.getElementById('sticky-panel');
        const panelToggle = document.getElementById('sticky-panel-toggle');

        panelToggle.addEventListener('click', () => {
            stickyPanel.classList.toggle('collapsed');
            this.layoutOverlays();
        });

        // 筛选按钮
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateStickyList();
                this.layoutOverlays();
            });
        });

        this.updateStickyList();
        this.layoutOverlays();
        window.addEventListener('resize', () => this.layoutOverlays());
    },

    // 布局浮层，避免贴纸与在线用户重叠
    layoutOverlays() {
        const stickyPanel = document.getElementById('sticky-panel');
        const onlineUsers = document.getElementById('online-users');
        const roomInfo = document.getElementById('room-info');

        if (!stickyPanel || !onlineUsers) return;

        const baseTop = 80; // 基础顶部偏移
        const gap = 12; // 浮层间距

        // 房间信息固定在右上角（若存在）
        if (roomInfo) {
            roomInfo.style.top = '16px';
            roomInfo.style.right = '16px';
        }

        // 贴纸面板位置
        stickyPanel.style.top = `${baseTop}px`;
        stickyPanel.style.right = '16px';

        // 在线用户放在贴纸面板下方
        const stickyHeight = stickyPanel.offsetHeight || 0;
        const onlineTop = baseTop + stickyHeight + gap;
        onlineUsers.style.top = `${onlineTop}px`;
        onlineUsers.style.right = '16px';
    },

    // 初始化键盘快捷键
    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Z: 撤销
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                Canvas.undo();
            }

            // Ctrl/Cmd + Y 或 Ctrl/Cmd + Shift + Z: 重做
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                Canvas.redo();
            }

            // Delete: 删除选中对象
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (Canvas.selectedObjects.length > 0) {
                    e.preventDefault();
                    Tools.deleteSelected();
                }
            }

            // Ctrl/Cmd + D: 复制选中对象
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                if (Canvas.selectedObjects.length > 0) {
                    Tools.duplicateSelected();
                }
            }

            // Space: 切换到抓手工具
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                if (Tools.currentTool !== 'pan') {
                    Tools.previousTool = Tools.currentTool;
                    Tools.setTool('pan');
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            // 释放Space: 切换回之前的工具
            if (e.code === 'Space') {
                e.preventDefault();
                if (Tools.previousTool) {
                    Tools.setTool(Tools.previousTool);
                    Tools.previousTool = null;
                }
            }
        });
    },

    // 初始化画布事件
    initCanvasEvents() {
        const canvas = document.getElementById('main-canvas');

        // 指针事件
        canvas.addEventListener('pointerdown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const canvasPos = Canvas.screenToCanvas(screenX, screenY);
            Tools.startDrawing(canvasPos.x, canvasPos.y);
        });

        canvas.addEventListener('pointermove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const canvasPos = Canvas.screenToCanvas(screenX, screenY);
            Tools.continueDrawing(canvasPos.x, canvasPos.y);
        });

        canvas.addEventListener('pointerup', (e) => {
            const rect = canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const canvasPos = Canvas.screenToCanvas(screenX, screenY);
            Tools.endDrawing(canvasPos.x, canvasPos.y);
        });

        // 双击贴纸标记完成
        canvas.addEventListener('dblclick', (e) => {
            const rect = canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const canvasPos = Canvas.screenToCanvas(screenX, screenY);

            for (const sticky of Canvas.stickies) {
                if (Tools.isPointInObject(canvasPos.x, canvasPos.y, sticky)) {
                    sticky.completed = !sticky.completed;
                    Canvas.render();
                    Canvas.saveAll();
                    this.updateStickyList();
                    break;
                }
            }
        });

        // 滚轮缩放
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const centerX = e.clientX - rect.left;
            const centerY = e.clientY - rect.top;
            Canvas.zoom(-e.deltaY, centerX, centerY);
        }, { passive: false });
    },

    

    // 显示导出模态框
    showExportModal() {
        const modal = document.getElementById('export-modal');
        const filenameInput = document.getElementById('export-filename');
        filenameInput.value = `peerboard-${Room.getRoomId()}`;
        modal.classList.remove('hidden');
    },

    // 显示导入模态框
    showImportModal() {
        const modal = document.getElementById('import-modal');
        const importPreview = document.getElementById('import-preview');
        const importArea = document.getElementById('import-area');
        importPreview.classList.add('hidden');
        importArea.classList.remove('hidden');
        modal.classList.remove('hidden');
    },

    // 处理导出
    async handleExport() {
        const exportType = document.querySelector('input[name="export-type"]:checked').value;
        const filename = document.getElementById('export-filename').value || 'peerboard';

        if (exportType === 'png') {
            await this.exportToPNG(filename);
        } else if (exportType === 'json') {
            await this.exportToJSON(filename);
        }

        document.getElementById('export-modal').classList.add('hidden');
    },

    // 导出为PNG
    async exportToPNG(filename) {
        // 创建临时画布
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Canvas.width;
        tempCanvas.height = Canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // 绘制白色背景
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // 复制主画布内容
        tempCtx.drawImage(Canvas.canvas, 0, 0);

        // 转换为图片并下载
        tempCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    },

    // 导出为JSON
    async exportToJSON(filename) {
        const data = await Room.exportToJSON();
        const json = JSON.stringify(data, null, 2);
        Utils.downloadFile(json, `${filename}.json`, 'application/json');
    },

    // 处理导入文件
    handleImportFile(file) {
        if (!file || !file.name.endsWith('.json')) {
            alert('请选择JSON文件');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.importData = data;

                // 显示预览
                document.getElementById('import-area').classList.add('hidden');
                document.getElementById('import-preview').classList.remove('hidden');
                document.getElementById('import-filename').textContent = file.name;
                document.getElementById('import-object-count').textContent = data.objectCount || 0;
            } catch (error) {
                alert('无效的JSON文件');
                console.error(error);
            }
        };
        reader.readAsText(file);
    },

    // 处理导入
    async handleImport() {
        if (!this.importData) return;

        const strategy = document.querySelector('input[name="import-strategy"]:checked').value;
        const success = await Room.importFromJSON(this.importData, strategy);

        if (success) {
            alert('导入成功!');
            this.updateStickyList();
            this.updateObjectCount();
        } else {
            alert('导入失败');
        }

        document.getElementById('import-modal').classList.add('hidden');
        this.importData = null;
    },

    // 更新房间ID显示
    updateRoomId() {
        const roomIdElement = document.getElementById('current-room-id');
        roomIdElement.textContent = Room.getRoomId();
    },

    // 更新缩放级别显示
    updateZoomLevel() {
        const zoomElement = document.getElementById('zoom-level');
        zoomElement.textContent = `${Math.round(Canvas.viewport.zoom * 100)}%`;
    },

    // 更新对象数量显示
    updateObjectCount() {
        const countElement = document.getElementById('object-count');
        countElement.textContent = Canvas.objects.length + Canvas.stickies.length;
    },

    // 更新选中操作栏显示状态
    updateSelectionActions() {
        const actions = document.getElementById('selection-actions');
        if (!actions) return;
        if (Canvas.selectedObjects.length > 0) {
            actions.classList.remove('hidden');
        } else {
            actions.classList.add('hidden');
        }
    },

    // 更新FPS显示
    updateFPS() {
        const fpsElement = document.getElementById('fps-count');
        fpsElement.textContent = Canvas.fps;
    },

    // 更新贴纸列表
    updateStickyList() {
        const stickyList = document.getElementById('sticky-list');
        const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');

        let filteredStickies = Canvas.stickies;

        if (activeFilter === 'pending') {
            filteredStickies = Canvas.stickies.filter(s => !s.completed);
        } else if (activeFilter === 'completed') {
            filteredStickies = Canvas.stickies.filter(s => s.completed);
        }

        stickyList.innerHTML = '';

        filteredStickies.forEach(sticky => {
            const item = document.createElement('div');
            item.className = `sticky-item ${sticky.completed ? 'completed' : ''}`;
            item.style.backgroundColor = sticky.color;
            item.style.borderLeftColor = sticky.borderColor;

            const text = document.createElement('div');
            text.className = 'sticky-item-text';
            text.textContent = sticky.text;

            const meta = document.createElement('div');
            meta.className = 'sticky-item-meta';
            meta.textContent = sticky.assignee ? `负责人: ${sticky.assignee}` : '';

            item.appendChild(text);
            item.appendChild(meta);

            item.addEventListener('click', () => {
                const screenPos = Canvas.canvasToScreen(sticky.x, sticky.y);
                Canvas.viewport.x = Canvas.width / 2 - sticky.x * Canvas.viewport.zoom;
                Canvas.viewport.y = Canvas.height / 2 - sticky.y * Canvas.viewport.zoom;
                Canvas.selectedObjects = [sticky];
                Canvas.render();
                this.updateSelectionActions();
            });

            item.addEventListener('dblclick', () => {
                this.showStickyEditModal(sticky);
            });

            stickyList.appendChild(item);
        });
    },

    // 初始化协作与分享模态框
    initCollaborateModal() {
        const modal = document.getElementById('collaborate-modal');
        const closeBtn = document.getElementById('close-collaborate-modal');

        // 关闭模态框
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        // 标签切换
        const tabButtons = document.querySelectorAll('.collaborate-tabs .tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');

                // 更新标签按钮
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 更新标签内容
                document.querySelectorAll('#collaborate-modal .tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`${tab}-tab`).classList.add('active');
            });
        });

        // 创建会话
        const createSessionBtn = document.getElementById('create-session-btn');
        createSessionBtn.addEventListener('click', async () => {
            try {
                // 创建房间
                await WebRTC.createRoom();

                // 创建Offer
                const signalData = await WebRTC.createOffer();
                const encoded = Signaling.encode(signalData);

                // 显示房间链接
                document.getElementById('host-room-link').value = Room.getShareLink();

                // 显示信令
                document.getElementById('host-signal-output').value = encoded;
                document.getElementById('host-signal-area').classList.remove('hidden');
                createSessionBtn.disabled = true;
            } catch (error) {
                console.error('创建会话失败:', error);
                alert('创建会话失败: ' + error.message);
            }
        });

        // 复制房间链接
        const copyRoomLinkBtn = document.getElementById('copy-room-link-btn');
        copyRoomLinkBtn.addEventListener('click', async () => {
            const link = document.getElementById('host-room-link').value;
            const success = await Utils.copyToClipboard(link);
            if (success) {
                copyRoomLinkBtn.textContent = '已复制!';
                setTimeout(() => {
                    copyRoomLinkBtn.textContent = '复制链接';
                }, 2000);
            }
        });

        // 复制主持人信令
        const copyHostSignalBtn = document.getElementById('copy-host-signal-btn');
        copyHostSignalBtn.addEventListener('click', async () => {
            const signal = document.getElementById('host-signal-output').value;
            const success = await Utils.copyToClipboard(signal);
            if (success) {
                copyHostSignalBtn.textContent = '已复制!';
                setTimeout(() => {
                    copyHostSignalBtn.textContent = '复制连接信令';
                }, 2000);
            }
        });

        // 处理参与者应答
        const processAnswerBtn = document.getElementById('process-answer-btn');
        processAnswerBtn.addEventListener('click', async () => {
            try {
                const encoded = document.getElementById('answer-signal-input').value.trim();
                if (!encoded) {
                    alert('请输入应答信令');
                    return;
                }

                const answerData = Signaling.decode(encoded);
                if (!answerData) {
                    alert('无效的信令数据');
                    return;
                }

                await WebRTC.handleAnswer(answerData);

                // 启用同步
                Sync.enable();

                alert('✅ 连接成功! 已建立协作会话，可以开始实时协作了！');
                document.getElementById('answer-signal-input').value = '';

                // 更新步骤指示器
                document.querySelectorAll('.step').forEach((step, index) => {
                    if (index <= 2) step.classList.add('active');
                });
            } catch (error) {
                console.error('处理应答失败:', error);
                alert('处理应答失败: ' + error.message);
            }
        });

        // 更新参与者当前房间显示
        const joinTab = document.querySelector('[data-tab="join"]');
        joinTab.addEventListener('click', () => {
            document.getElementById('join-current-room').textContent = Room.getRoomId();
        });

        // 处理主持人邀请
        const processOfferBtn = document.getElementById('process-offer-btn');
        processOfferBtn.addEventListener('click', async () => {
            try {
                const encoded = document.getElementById('offer-signal-input').value.trim();
                if (!encoded) {
                    alert('请输入邀请信令');
                    return;
                }

                const offerData = Signaling.decode(encoded);
                if (!offerData) {
                    alert('无效的信令数据');
                    return;
                }

                const answerData = await WebRTC.handleOffer(offerData);
                const encodedAnswer = Signaling.encode(answerData);

                // 显示应答信令
                document.getElementById('answer-signal-output').value = encodedAnswer;
                document.getElementById('join-signal-area').classList.remove('hidden');

                // 启用同步
                Sync.enable();

                processOfferBtn.disabled = true;
            } catch (error) {
                console.error('处理邀请失败:', error);
                alert('处理邀请失败: ' + error.message);
            }
        });

        // 复制参与者应答
        const copyAnswerSignalBtn = document.getElementById('copy-answer-signal-btn');
        copyAnswerSignalBtn.addEventListener('click', async () => {
            const signal = document.getElementById('answer-signal-output').value;
            const success = await Utils.copyToClipboard(signal);
            if (success) {
                copyAnswerSignalBtn.textContent = '已复制!';
                setTimeout(() => {
                    copyAnswerSignalBtn.textContent = '复制应答信令';
                }, 2000);
            }
        });

        // 仅分享房间 - 复制链接
        const shareTab = document.querySelector('[data-tab="share"]');
        shareTab.addEventListener('click', () => {
            document.getElementById('simple-share-link').value = Room.getShareLink();
        });

        const copySimpleLinkBtn = document.getElementById('copy-simple-link-btn');
        copySimpleLinkBtn.addEventListener('click', async () => {
            const link = document.getElementById('simple-share-link').value;
            const success = await Utils.copyToClipboard(link);
            if (success) {
                copySimpleLinkBtn.textContent = '已复制!';
                setTimeout(() => {
                    copySimpleLinkBtn.textContent = '复制链接';
                }, 2000);
            }
        });
    },

    // 显示协作与分享模态框
    showCollaborateModal() {
        const modal = document.getElementById('collaborate-modal');
        modal.classList.remove('hidden');
    },

    // 显示连接模态框 (废弃，使用showCollaborateModal)
    showConnectModal() {
        this.showCollaborateModal();
    },

    // 显示分享模态框 (废弃，使用showCollaborateModal)
    showShareModal() {
        this.showCollaborateModal();
        // 自动切换到"仅分享房间"标签
        const shareTabBtn = document.querySelector('[data-tab="share"]');
        if (shareTabBtn) shareTabBtn.click();
    },

    showClearModal() {
        const modal = document.getElementById('clear-modal');
        modal.classList.remove('hidden');
    },

    showStickyEditModal(sticky) {
        const stickyEditModal = document.getElementById('sticky-edit-modal');
        const stickyEditText = document.getElementById('sticky-edit-text');
        this.editingSticky = sticky;
        stickyEditText.value = sticky.text || '';
        stickyEditModal.classList.remove('hidden');
    }
};
