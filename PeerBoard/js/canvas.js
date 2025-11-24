// 画布管理
"use strict";
const Canvas = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,

    // 视口信息
    viewport: {
        x: 0,
        y: 0,
        zoom: 1
    },

    // 画布状态
    isPanning: false,
    lastPanX: 0,
    lastPanY: 0,

    // 对象列表
    objects: [],
    stickies: [],
    selectedObjects: [],
    tempObjects: [],

    // 历史记录
    history: [],
    historyIndex: -1,
    maxHistory: 50,

    // 网格设置
    gridSize: 20,
    gridEnabled: true,

    // 性能监控
    fps: 60,
    lastFrameTime: 0,

    // 初始化画布
    init() {
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.render();
        this.startFPSCounter();
    },

    // 调整画布大小
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.render();
    },

    // 渲染画布
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        ctx.save();

        // 应用视口变换
        ctx.translate(this.viewport.x, this.viewport.y);
        ctx.scale(this.viewport.zoom, this.viewport.zoom);

        // 绘制网格
        if (this.gridEnabled) {
            this.drawGrid();
        }

        // 绘制所有对象
        this.objects.forEach(obj => this.drawObject(obj));

        // 绘制所有贴纸
        this.stickies.forEach(sticky => this.drawSticky(sticky));

        // 绘制临时对象（实时预览/流式绘制）
        if (this.tempObjects && this.tempObjects.length > 0) {
            this.tempObjects.forEach(obj => this.drawObject(obj));
        }

        // 绘制选中状态
        this.selectedObjects.forEach(obj => this.drawSelection(obj));

        // 绘制锁定指示器
        if (typeof ObjectLock !== 'undefined') {
            ObjectLock.renderLockIndicators(ctx);
        }

        // 绘制其他用户的光标
        if (typeof Peers !== 'undefined') {
            Peers.renderCursors(ctx);
        }

        ctx.restore();
    },

    // 绘制网格
    drawGrid() {
        const ctx = this.ctx;
        const startX = Math.floor(-this.viewport.x / this.viewport.zoom / this.gridSize) * this.gridSize;
        const startY = Math.floor(-this.viewport.y / this.viewport.zoom / this.gridSize) * this.gridSize;
        const endX = startX + (this.width / this.viewport.zoom) + this.gridSize;
        const endY = startY + (this.height / this.viewport.zoom) + this.gridSize;

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1 / this.viewport.zoom;

        // 垂直线
        for (let x = startX; x < endX; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        // 水平线
        for (let y = startY; y < endY; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    },

    // 绘制对象
    drawObject(obj) {
        const ctx = this.ctx;

        ctx.save();
        ctx.strokeStyle = obj.color || '#000000';
        ctx.fillStyle = obj.color || '#000000';
        ctx.lineWidth = obj.strokeWidth || 2;
        ctx.globalAlpha = obj.opacity || 1;

        if (obj.type === 'pencil' || obj.type === 'marker') {
            this.drawPath(obj);
        } else if (obj.type === 'line') {
            this.drawLine(obj);
        } else if (obj.type === 'arrow') {
            this.drawArrow(obj);
        } else if (obj.type === 'rectangle') {
            this.drawRectangle(obj);
        } else if (obj.type === 'circle') {
            this.drawCircle(obj);
        } else if (obj.type === 'text') {
            this.drawText(obj);
        }

        ctx.restore();
    },

    // 绘制路径
    drawPath(obj) {
        if (!obj.points || obj.points.length < 2) return;

        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(obj.points[0].x, obj.points[0].y);

        for (let i = 1; i < obj.points.length; i++) {
            ctx.lineTo(obj.points[i].x, obj.points[i].y);
        }

        ctx.stroke();
    },

    // 绘制直线
    drawLine(obj) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(obj.startX, obj.startY);
        ctx.lineTo(obj.endX, obj.endY);
        ctx.stroke();
    },

    // 绘制箭头
    drawArrow(obj) {
        const ctx = this.ctx;
        const headSize = 10;
        const angle = Math.atan2(obj.endY - obj.startY, obj.endX - obj.startX);

        // 绘制线
        ctx.beginPath();
        ctx.moveTo(obj.startX, obj.startY);
        ctx.lineTo(obj.endX, obj.endY);
        ctx.stroke();

        // 绘制箭头
        ctx.beginPath();
        ctx.moveTo(obj.endX, obj.endY);
        ctx.lineTo(
            obj.endX - headSize * Math.cos(angle - Math.PI / 6),
            obj.endY - headSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(obj.endX, obj.endY);
        ctx.lineTo(
            obj.endX - headSize * Math.cos(angle + Math.PI / 6),
            obj.endY - headSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    },

    // 绘制矩形
    drawRectangle(obj) {
        const ctx = this.ctx;
        if (obj.filled) {
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        } else {
            ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        }
    },

    // 绘制圆形
    drawCircle(obj) {
        const ctx = this.ctx;
        const radius = Math.sqrt(obj.width ** 2 + obj.height ** 2) / 2;
        ctx.beginPath();
        ctx.arc(obj.x + obj.width / 2, obj.y + obj.height / 2, radius, 0, Math.PI * 2);
        if (obj.filled) {
            ctx.fill();
        } else {
            ctx.stroke();
        }
    },

    // 绘制文本
    drawText(obj) {
        const ctx = this.ctx;
        ctx.font = `${obj.fontSize || 16}px Arial`;
        ctx.fillStyle = obj.color || '#000000';

        if (obj.backgroundColor) {
            const metrics = ctx.measureText(obj.text);
            const padding = 8;
            ctx.fillStyle = obj.backgroundColor;
            ctx.fillRect(
                obj.x - padding,
                obj.y - obj.fontSize - padding,
                metrics.width + padding * 2,
                obj.fontSize + padding * 2
            );
            ctx.fillStyle = obj.color || '#000000';
        }

        ctx.fillText(obj.text, obj.x, obj.y);
    },

    // 绘制贴纸
    drawSticky(sticky) {
        const ctx = this.ctx;
        const width = sticky.width || 160;
        const height = sticky.height || 160;
        const x = sticky.x;
        const y = sticky.y;
        const radius = 12;
        const padding = 14;

        ctx.save();

        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();

        ctx.fillStyle = sticky.color || '#fff3cd';
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = sticky.borderColor || '#ffc107';
        ctx.lineWidth = 3;
        ctx.stroke();

        const foldSize = 26;
        ctx.beginPath();
        ctx.moveTo(x + width, y);
        ctx.lineTo(x + width - foldSize, y);
        ctx.lineTo(x + width, y + foldSize);
        ctx.closePath();
        ctx.fillStyle = Utils.shadeColor(sticky.color || '#fff3cd', -10);
        ctx.fill();

        ctx.fillStyle = '#222';
        ctx.font = '15px Arial';
        const lines = this.wrapText(ctx, sticky.text, width - padding * 2);
        lines.forEach((line, index) => {
            ctx.fillText(line, x + padding, y + padding + 22 + index * 20);
        });

        if (sticky.completed) {
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            const lineY = y + padding + 10;
            ctx.beginPath();
            ctx.moveTo(x + padding, lineY);
            ctx.lineTo(x + width - padding, lineY);
            ctx.stroke();
            ctx.fillStyle = '#4caf50';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('✓', x + width - 30, y + 30);
        }

        if (sticky.assignee) {
            ctx.fillStyle = '#555';
            ctx.font = '12px Arial';
            ctx.fillText(`@${sticky.assignee}`, x + padding, y + height - padding);
        }

        ctx.restore();
    },

    // 文本换行
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    },

    // 绘制选中状态
    drawSelection(obj) {
        const ctx = this.ctx;
        ctx.save();

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / this.viewport.zoom;
        ctx.setLineDash([5 / this.viewport.zoom, 5 / this.viewport.zoom]);

        const bounds = this.getObjectBounds(obj);
        if (bounds) {
            ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
        }

        ctx.restore();
    },

    // 获取对象边界
    getObjectBounds(obj) {
        if (obj.type === 'text' || obj.type === 'sticky') {
            return {
                x: obj.x,
                y: obj.y,
                width: obj.width || 100,
                height: obj.height || 50
            };
        } else if (obj.type === 'rectangle' || obj.type === 'circle') {
            return {
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height
            };
        } else if (obj.type === 'line' || obj.type === 'arrow') {
            const minX = Math.min(obj.startX, obj.endX);
            const minY = Math.min(obj.startY, obj.endY);
            const maxX = Math.max(obj.startX, obj.endX);
            const maxY = Math.max(obj.startY, obj.endY);
            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        } else if (obj.type === 'pencil' || obj.type === 'marker') {
            if (!obj.points || obj.points.length === 0) return null;
            const xs = obj.points.map(p => p.x);
            const ys = obj.points.map(p => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);
            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        }

        return null;
    },

    // 屏幕坐标转画布坐标
    screenToCanvas(screenX, screenY) {
        return {
            x: (screenX - this.viewport.x) / this.viewport.zoom,
            y: (screenY - this.viewport.y) / this.viewport.zoom
        };
    },

    // 画布坐标转屏幕坐标
    canvasToScreen(canvasX, canvasY) {
        return {
            x: canvasX * this.viewport.zoom + this.viewport.x,
            y: canvasY * this.viewport.zoom + this.viewport.y
        };
    },

    // 缩放画布
    zoom(delta, centerX, centerY) {
        const oldZoom = this.viewport.zoom;
        const zoomFactor = 1.1;

        if (delta > 0) {
            this.viewport.zoom *= zoomFactor;
        } else {
            this.viewport.zoom /= zoomFactor;
        }

        // 限制缩放范围
        this.viewport.zoom = Utils.clamp(this.viewport.zoom, 0.1, 5);

        // 调整视口以保持缩放中心不变
        const zoomRatio = this.viewport.zoom / oldZoom;
        this.viewport.x = centerX - (centerX - this.viewport.x) * zoomRatio;
        this.viewport.y = centerY - (centerY - this.viewport.y) * zoomRatio;

        this.render();
        UI.updateZoomLevel();
    },

    // 平移画布
    pan(dx, dy) {
        this.viewport.x += dx;
        this.viewport.y += dy;
        this.render();
    },

    // 添加对象到历史记录
    addToHistory() {
        // 移除当前索引之后的历史
        this.history = this.history.slice(0, this.historyIndex + 1);

        // 添加当前状态
        const state = {
            objects: Utils.deepClone(this.objects),
            stickies: Utils.deepClone(this.stickies)
        };

        this.history.push(state);

        // 限制历史记录数量
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    },

    // 撤销
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const state = this.history[this.historyIndex];
            this.objects = Utils.deepClone(state.objects);
            this.stickies = Utils.deepClone(state.stickies);
            this.render();
            this.saveAll();
        }
    },

    // 重做
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const state = this.history[this.historyIndex];
            this.objects = Utils.deepClone(state.objects);
            this.stickies = Utils.deepClone(state.stickies);
            this.render();
            this.saveAll();
        }
    },

    // 保存所有对象到存储
    async saveAll() {
        const roomId = Room.getRoomId();

        const storedObjects = await Storage.getRoomObjects(roomId) || [];
        const currentObjectIds = new Set(this.objects.map(o => o.id));
        const toDeleteObjectIds = storedObjects.filter(so => !currentObjectIds.has(so.id)).map(so => so.id);

        const storedStickies = await Storage.getRoomStickies(roomId) || [];
        const currentStickyIds = new Set(this.stickies.map(s => s.id));
        const toDeleteStickyIds = storedStickies.filter(ss => !currentStickyIds.has(ss.id)).map(ss => ss.id);

        if (toDeleteObjectIds.length > 0) {
            await Storage.deleteManyObjects(toDeleteObjectIds);
        }
        if (toDeleteStickyIds.length > 0) {
            await Storage.deleteManyStickies(toDeleteStickyIds);
        }

        const objectsToSave = this.objects.map(obj => { obj.roomId = roomId; return obj; });
        const stickiesToSave = this.stickies.map(sticky => { sticky.roomId = roomId; return sticky; });

        if (objectsToSave.length > 0) {
            await Storage.saveManyObjects(objectsToSave);
        }
        if (stickiesToSave.length > 0) {
            await Storage.saveManyStickies(stickiesToSave);
        }

        UI.updateObjectCount();
    },

    // 从存储加载所有对象
    async loadAll() {
        const roomId = Room.getRoomId();
        this.objects = await Storage.getRoomObjects(roomId) || [];
        this.stickies = await Storage.getRoomStickies(roomId) || [];
        this.render();
        UI.updateObjectCount();
    },

    // FPS计数器
    startFPSCounter() {
        let frames = 0;
        let lastTime = performance.now();

        const count = () => {
            frames++;
            const now = performance.now();

            if (now >= lastTime + 1000) {
                this.fps = Math.round(frames * 1000 / (now - lastTime));
                UI.updateFPS();
                frames = 0;
                lastTime = now;
            }

            requestAnimationFrame(count);
        };

        count();
    },

    // 清空画布
    clear() {
        this.objects = [];
        this.stickies = [];
        this.selectedObjects = [];
        this.addToHistory();
        this.render();
        this.saveAll();
    }
};
