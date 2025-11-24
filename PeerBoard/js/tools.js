"use strict";
// 绘制工具
const Tools = {
    currentTool: 'select',
    color: '#000000',
    strokeWidth: 2,

    // 当前正在绘制的对象
    currentObject: null,
    isDrawing: false,
    startX: 0,
    startY: 0,

    // 选择工具状态
    selectionStart: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },

    // 设置当前工具
    setTool(tool) {
        this.currentTool = tool;
        this.isDrawing = false;
        this.currentObject = null;

        // 更新光标样式
        const container = document.getElementById('canvas-container');
        container.className = '';

        if (tool === 'pan') {
            container.classList.add('cursor-pan');
        } else if (tool === 'text') {
            container.classList.add('cursor-text');
        } else if (tool === 'select') {
            container.style.cursor = 'default';
        } else {
            container.classList.add('cursor-crosshair');
        }
    },

    // 设置颜色
    setColor(color) {
        this.color = color;
    },

    // 设置笔触粗细
    setStrokeWidth(width) {
        this.strokeWidth = width;
    },

    // 开始绘制
    startDrawing(canvasX, canvasY) {
        this.isDrawing = true;
        this.startX = canvasX;
        this.startY = canvasY;

        if (this.currentTool === 'select') {
            this.handleSelect(canvasX, canvasY);
        } else if (this.currentTool === 'pan') {
            Canvas.isPanning = true;
            Canvas.lastPanX = canvasX;
            Canvas.lastPanY = canvasY;
        } else if (this.currentTool === 'pencil') {
            this.startPencil(canvasX, canvasY);
        } else if (this.currentTool === 'marker') {
            this.startMarker(canvasX, canvasY);
        } else if (this.currentTool === 'text') {
            this.createText(canvasX, canvasY);
        } else if (this.currentTool === 'sticky') {
            this.createSticky(canvasX, canvasY);
        }
    },

    // 继续绘制
    continueDrawing(canvasX, canvasY) {
        if (!this.isDrawing) return;

        if (this.currentTool === 'pan') {
            const dx = (canvasX - Canvas.lastPanX) * Canvas.viewport.zoom;
            const dy = (canvasY - Canvas.lastPanY) * Canvas.viewport.zoom;
            Canvas.pan(dx, dy);
            Canvas.lastPanX = canvasX;
            Canvas.lastPanY = canvasY;
        } else if (this.currentTool === 'pencil' || this.currentTool === 'marker') {
            this.continuePath(canvasX, canvasY);
        } else if (this.currentTool === 'line' || this.currentTool === 'arrow') {
            this.updateLinePreview(canvasX, canvasY);
        } else if (this.currentTool === 'rectangle' || this.currentTool === 'circle') {
            this.updateShapePreview(canvasX, canvasY);
        } else if (this.currentTool === 'select' && this.isDragging) {
            this.dragSelectedObjects(canvasX, canvasY);
        }
    },

    // 结束绘制
    endDrawing(canvasX, canvasY) {
        if (!this.isDrawing) return;

        this.isDrawing = false;

        if (this.currentTool === 'pan') {
            Canvas.isPanning = false;
        } else if (this.currentTool === 'line') {
            this.finishLine(canvasX, canvasY);
        } else if (this.currentTool === 'arrow') {
            this.finishArrow(canvasX, canvasY);
        } else if (this.currentTool === 'rectangle') {
            this.finishRectangle(canvasX, canvasY);
        } else if (this.currentTool === 'circle') {
            this.finishCircle(canvasX, canvasY);
        } else if (this.currentTool === 'pencil' || this.currentTool === 'marker') {
            this.finishPath();
        } else if (this.currentTool === 'select') {
            this.isDragging = false;
        }

        this.currentObject = null;
    },

    // 铅笔工具
    startPencil(x, y) {
        this.currentObject = {
            id: Utils.generateId('pencil'),
            type: 'pencil',
            points: [{ x, y }],
            color: this.color,
            strokeWidth: this.strokeWidth,
            opacity: 1
        };
        if (typeof Sync !== 'undefined' && Sync.enabled) {
            Sync.syncStartPath(this.currentObject);
        }
    },

    // 标记笔工具
    startMarker(x, y) {
        this.currentObject = {
            id: Utils.generateId('marker'),
            type: 'marker',
            points: [{ x, y }],
            color: this.color,
            strokeWidth: this.strokeWidth * 2,
            opacity: 0.5
        };
        if (typeof Sync !== 'undefined' && Sync.enabled) {
            Sync.syncStartPath(this.currentObject);
        }
    },

    // 继续路径
    continuePath(x, y) {
        if (this.currentObject && this.currentObject.points) {
            this.currentObject.points.push({ x, y });
            Canvas.render();
            Canvas.drawObject(this.currentObject);
            if (typeof Sync !== 'undefined' && Sync.enabled) {
                Sync.syncAppendPath(this.currentObject.id, { x, y });
            }
        }
    },

    // 完成路径
    finishPath() {
        if (this.currentObject && this.currentObject.points.length > 1) {
            Canvas.objects.push(this.currentObject);
            Canvas.addToHistory();
            Canvas.render();
            Canvas.saveAll();

            if (typeof Sync !== 'undefined' && Sync.enabled) {
                Sync.syncFinishPath(this.currentObject);
            }
        }
    },

    // 更新直线预览
    updateLinePreview(x, y) {
        this.currentObject = {
            type: 'line',
            startX: this.startX,
            startY: this.startY,
            endX: x,
            endY: y,
            color: this.color,
            strokeWidth: this.strokeWidth
        };
        Canvas.render();
        Canvas.drawObject(this.currentObject);
    },

    // 完成直线
    finishLine(x, y) {
        const obj = {
            id: Utils.generateId('line'),
            type: 'line',
            startX: this.startX,
            startY: this.startY,
            endX: x,
            endY: y,
            color: this.color,
            strokeWidth: this.strokeWidth
        };
        Canvas.objects.push(obj);
        Canvas.addToHistory();
        Canvas.render();
        Canvas.saveAll();

        // 同步到其他用户
        if (typeof Sync !== 'undefined' && Sync.enabled) {
            Sync.syncAddObject(obj);
        }
    },

    // 完成箭头
    finishArrow(x, y) {
        const obj = {
            id: Utils.generateId('arrow'),
            type: 'arrow',
            startX: this.startX,
            startY: this.startY,
            endX: x,
            endY: y,
            color: this.color,
            strokeWidth: this.strokeWidth
        };
        Canvas.objects.push(obj);
        Canvas.addToHistory();
        Canvas.render();
        Canvas.saveAll();

        // 同步到其他用户
        if (typeof Sync !== 'undefined' && Sync.enabled) {
            Sync.syncAddObject(obj);
        }
    },

    // 更新形状预览
    updateShapePreview(x, y) {
        const width = x - this.startX;
        const height = y - this.startY;

        this.currentObject = {
            type: this.currentTool,
            x: width < 0 ? x : this.startX,
            y: height < 0 ? y : this.startY,
            width: Math.abs(width),
            height: Math.abs(height),
            color: this.color,
            strokeWidth: this.strokeWidth,
            filled: false
        };
        Canvas.render();
        Canvas.drawObject(this.currentObject);
    },

    // 完成矩形
    finishRectangle(x, y) {
        const width = x - this.startX;
        const height = y - this.startY;

        if (Math.abs(width) > 5 && Math.abs(height) > 5) {
            const obj = {
                id: Utils.generateId('rectangle'),
                type: 'rectangle',
                x: width < 0 ? x : this.startX,
                y: height < 0 ? y : this.startY,
                width: Math.abs(width),
                height: Math.abs(height),
                color: this.color,
                strokeWidth: this.strokeWidth,
                filled: false
            };
            Canvas.objects.push(obj);
            Canvas.addToHistory();
            Canvas.render();
            Canvas.saveAll();

            // 同步到其他用户
            if (typeof Sync !== 'undefined' && Sync.enabled) {
                Sync.syncAddObject(obj);
            }
        } else {
            Canvas.render();
        }
    },

    // 完成圆形
    finishCircle(x, y) {
        const width = x - this.startX;
        const height = y - this.startY;

        if (Math.abs(width) > 5 && Math.abs(height) > 5) {
            const obj = {
                id: Utils.generateId('circle'),
                type: 'circle',
                x: width < 0 ? x : this.startX,
                y: height < 0 ? y : this.startY,
                width: Math.abs(width),
                height: Math.abs(height),
                color: this.color,
                strokeWidth: this.strokeWidth,
                filled: false
            };
            Canvas.objects.push(obj);
            Canvas.addToHistory();
            Canvas.render();
            Canvas.saveAll();

            // 同步到其他用户
            if (typeof Sync !== 'undefined' && Sync.enabled) {
                Sync.syncAddObject(obj);
            }
        } else {
            Canvas.render();
        }
    },

    // 创建文本
    createText(x, y) {
        const text = prompt('输入文本:', '');
        if (text && text.trim()) {
            const obj = {
                id: Utils.generateId('text'),
                type: 'text',
                x: x,
                y: y,
                text: text.trim(),
                color: this.color,
                fontSize: 16,
                width: 200,
                height: 30
            };
            Canvas.objects.push(obj);
            Canvas.addToHistory();
            Canvas.render();
            Canvas.saveAll();

            // 同步到其他用户
            if (typeof Sync !== 'undefined' && Sync.enabled) {
                Sync.syncAddObject(obj);
            }
        }
        this.isDrawing = false;
    },

    // 创建贴纸
    createSticky(x, y) {
        const baseColor = this.color || '#fff3cd';
        const sticky = {
            id: Utils.generateId('sticky'),
            type: 'sticky',
            x: x,
            y: y,
            text: '新贴纸',
            color: baseColor,
            borderColor: Utils.shadeColor(baseColor, -20),
            width: 180,
            height: 180,
            completed: false,
            assignee: null,
            createdAt: new Date().toISOString()
        };
        Canvas.stickies.push(sticky);
        Canvas.addToHistory();
        Canvas.render();
        Canvas.saveAll();
        UI.updateStickyList();

        if (typeof Sync !== 'undefined' && Sync.enabled) {
            Sync.syncAddSticky(sticky);
        }
        if (typeof UI !== 'undefined') {
            UI.showStickyEditModal(sticky);
        }
        this.isDrawing = false;
    },

    // 处理选择
    handleSelect(x, y) {
        // 检查是否点击了已选中的对象
        let clickedSelected = false;
        for (const obj of Canvas.selectedObjects) {
            if (this.isPointInObject(x, y, obj)) {
                clickedSelected = true;
                this.isDragging = true;
                this.dragOffset = { x: x, y: y };
                break;
            }
        }

        if (!clickedSelected) {
            // 查找点击的对象
            Canvas.selectedObjects = [];

            // 检查贴纸
            for (let i = Canvas.stickies.length - 1; i >= 0; i--) {
                if (this.isPointInObject(x, y, Canvas.stickies[i])) {
                    Canvas.selectedObjects.push(Canvas.stickies[i]);
                    this.isDragging = true;
                    this.dragOffset = { x: x, y: y };
                    break;
                }
            }

            // 检查普通对象
            if (Canvas.selectedObjects.length === 0) {
                for (let i = Canvas.objects.length - 1; i >= 0; i--) {
                    if (this.isPointInObject(x, y, Canvas.objects[i])) {
                        Canvas.selectedObjects.push(Canvas.objects[i]);
                        this.isDragging = true;
                        this.dragOffset = { x: x, y: y };
                        break;
                    }
                }
            }

            Canvas.render();
            UI.updateSelectionActions();
        }
    },

    // 判断点是否在对象内
    isPointInObject(x, y, obj) {
        const bounds = Canvas.getObjectBounds(obj);
        if (!bounds) return false;

        return Utils.isPointInRect(
            x, y,
            bounds.x, bounds.y,
            bounds.width, bounds.height
        );
    },

    // 拖动选中的对象
    dragSelectedObjects(x, y) {
        const dx = x - this.dragOffset.x;
        const dy = y - this.dragOffset.y;

        for (const obj of Canvas.selectedObjects) {
            if (obj.type === 'line' || obj.type === 'arrow') {
                obj.startX += dx;
                obj.startY += dy;
                obj.endX += dx;
                obj.endY += dy;
            } else if (obj.type === 'pencil' || obj.type === 'marker') {
                obj.points.forEach(point => {
                    point.x += dx;
                    point.y += dy;
                });
            } else {
                obj.x += dx;
                obj.y += dy;
            }

            // 同步移动
            if (typeof Sync !== 'undefined' && Sync.enabled) {
                const updates = {};
                if (obj.type === 'line' || obj.type === 'arrow') {
                    updates.startX = obj.startX;
                    updates.startY = obj.startY;
                    updates.endX = obj.endX;
                    updates.endY = obj.endY;
                } else if (obj.type === 'pencil' || obj.type === 'marker') {
                    updates.points = obj.points;
                } else {
                    updates.x = obj.x;
                    updates.y = obj.y;
                }

                if (obj.type === 'sticky') {
                    Sync.syncUpdateSticky(obj.id, updates);
                } else {
                    Sync.syncUpdateObject(obj.id, updates);
                }
            }
        }

        this.dragOffset = { x, y };
        Canvas.render();
    },

    // 删除选中的对象
    deleteSelected() {
        for (const obj of Canvas.selectedObjects) {
            if (obj.type === 'sticky') {
                const index = Canvas.stickies.indexOf(obj);
                if (index > -1) {
                    Canvas.stickies.splice(index, 1);
                    Storage.deleteSticky(obj.id);

                    // 同步删除
                    if (typeof Sync !== 'undefined' && Sync.enabled) {
                        Sync.syncDeleteSticky(obj.id);
                    }
                }
            } else {
                const index = Canvas.objects.indexOf(obj);
                if (index > -1) {
                    Canvas.objects.splice(index, 1);
                    Storage.deleteObject(obj.id);

                    // 同步删除
                    if (typeof Sync !== 'undefined' && Sync.enabled) {
                        Sync.syncDeleteObject(obj.id);
                    }
                }
            }
        }

        Canvas.selectedObjects = [];
        Canvas.addToHistory();
        Canvas.render();
        Canvas.saveAll();
        UI.updateStickyList();
        UI.updateSelectionActions();
    },

    // 复制选中的对象
    duplicateSelected() {
        const newObjects = [];

        for (const obj of Canvas.selectedObjects) {
            const newObj = Utils.deepClone(obj);
            newObj.id = Utils.generateId(obj.type);
            newObj.x += 20;
            newObj.y += 20;

            if (obj.type === 'sticky') {
                Canvas.stickies.push(newObj);
            } else {
                Canvas.objects.push(newObj);
            }

            newObjects.push(newObj);
        }

        Canvas.selectedObjects = newObjects;
        Canvas.addToHistory();
        Canvas.render();
        Canvas.saveAll();
        UI.updateStickyList();
        UI.updateSelectionActions();
    }
};
