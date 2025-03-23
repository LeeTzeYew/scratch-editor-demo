(function(Scratch) {
    'use strict';
    
    // 通知父页面编辑器已加载完成
    window.parent.postMessage({ type: 'scratchReady' }, '*');
    
    // 获取Scratch VM实例
    const vm = Scratch.vm;
    
    // 监听来自父页面的消息
    window.addEventListener('message', (event) => {
        console.log('扩展收到消息:', event.data);
        
        try {
            if (event.data.type === 'insertBlock') {
                insertBlock(event.data.blockType, event.data.inputs);
                
                // 通知父页面积木已插入
                window.parent.postMessage({
                    type: 'blockInserted',
                    blockType: event.data.blockType
                }, '*');
            } else if (event.data.type === 'runProject') {
                vm.greenFlag();
                
                window.parent.postMessage({
                    type: 'projectStarted'
                }, '*');
            } else if (event.data.type === 'stopProject') {
                vm.stopAll();
                
                window.parent.postMessage({
                    type: 'projectStopped'
                }, '*');
            } else if (event.data.type === 'getProjectJSON') {
                exportProject();
            }
        } catch (error) {
            console.error('处理消息时出错:', error);
            window.parent.postMessage({
                type: 'error',
                message: error.message
            }, '*');
        }
    });
    
    // 插入积木函数
    function insertBlock(blockType, inputs) {
        // 获取当前选中的角色
        const target = vm.editingTarget;
        if (!target) {
            throw new Error('没有选中角色');
        }
        
        // 生成唯一ID
        const blockId = `block_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // 创建积木JSON
        const blockJSON = {
            id: blockId,
            opcode: blockType,
            inputs: inputs || {},
            fields: {},
            next: null,
            topLevel: true,
            parent: null,
            shadow: false,
            x: 100,
            y: Math.floor(Math.random() * 100) + 100 // 随机位置，避免堆叠
        };
        
        // 添加积木到目标角色
        vm.shareBlocksToTarget([blockJSON], target.id);
        
        // 触发工作区更新
        vm.emitWorkspaceUpdate();
        
        return blockId;
    }
    
    // 导出项目函数
    function exportProject() {
        vm.saveProjectSb3()
            .then(projectBinary => {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const projectJSON = JSON.parse(reader.result);
                        window.parent.postMessage({
                            type: 'projectData',
                            projectJSON: projectJSON
                        }, '*');
                    } catch (e) {
                        console.error('解析项目数据时出错', e);
                    }
                };
                reader.readAsText(new Blob([projectBinary]));
            })
            .catch(error => {
                console.error('保存项目时出错', error);
                window.parent.postMessage({
                    type: 'error',
                    message: '无法导出项目: ' + error.message
                }, '*');
            });
    }
    
    // 定义扩展
    class MyWebsiteExtension {
        getInfo() {
            return {
                id: 'mywebsite',
                name: '我的网站控制器',
                docsURI: 'https://您的网站.com/docs',
                blocks: [
                    {
                        opcode: 'sendMessage',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '发送消息 [MESSAGE] 到网站',
                        arguments: {
                            MESSAGE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '你好世界'
                            }
                        }
                    },
                    {
                        opcode: 'getValueFromWebsite',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '从网站获取 [KEY] 的值',
                        arguments: {
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'dataKeys',
                                defaultValue: 'score'
                            }
                        }
                    }
                ],
                menus: {
                    dataKeys: {
                        acceptReporters: true,
                        items: ['score', 'level', 'username', 'lives']
                    }
                }
            };
        }
        
        // 从Scratch向父网页发送消息
        sendMessage(args) {
            const message = args.MESSAGE;
            window.parent.postMessage({
                type: 'messageFromScratch',
                message: message
            }, '*');
        }
        
        // 从父网页获取数据
        getValueFromWebsite(args) {
            const key = args.KEY;
            
            // 这里向父页面请求数据
            window.parent.postMessage({
                type: 'getData',
                key: key
            }, '*');
            
            // 返回存储的数据或默认值
            return window.websiteData?.[key] || 0;
        }
    }
    
    // 初始化接收数据的全局对象
    window.websiteData = {
        score: 0,
        level: 1,
        username: 'player',
        lives: 3
    };
    
    // 接收来自父页面的数据更新
    window.addEventListener('message', (event) => {
        if (event.data.type === 'updateData' && event.data.data) {
            window.websiteData = {
                ...window.websiteData,
                ...event.data.data
            };
        }
    });
    
    // 注册扩展
    Scratch.extensions.register(new MyWebsiteExtension());
})(window.Scratch);