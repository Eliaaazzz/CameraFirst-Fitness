import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // 注册命令：My Private AI
    let disposable = vscode.commands.registerCommand('extension.askPrivateAI', async () => {
        
        // 1. 获取当前选中的代码
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const selection = editor.selection;
        const text = editor.document.getText(selection);

        if (!text) {
            vscode.window.showInformationMessage("先选中一点代码再问我！");
            return;
        }

        // 2. 你的私有配置
        const API_URL = "https://api.242243.xyz/v1/chat/completions";
        const API_KEY = "sk-4G4fZvHLI65r7DYA1EgT99rn4EdaEBsoftD1q5PszMrWbXXd"; // ⚠️ 替换这里 ⚠️

        // 显示进度条
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "正在询问 AI (私有接口)...",
            cancellable: false
        }, async () => {
            try {
                // 3. 发送纯 HTTP 请求
                // 强制关闭 stream，避免协议兼容问题
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o", 
                        messages: [
                            { role: "system", content: "You are a helpful coding assistant. Answer briefly." },
                            { role: "user", content: `Explain or fix this code:\n${text}` }
                        ],
                        stream: false 
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }

                const data = await response.json() as any;
                const reply = data.choices[0].message.content;

                // 4. 将结果插入到编辑器里
                editor.edit(editBuilder => {
                    editBuilder.insert(selection.end, `\n\n/* AI Reply: */\n${reply}\n`);
                });

            } catch (error) {
                vscode.window.showErrorMessage(`调用失败: ${error}`);
            }
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}