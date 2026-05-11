# 外部工具集成扩展示例 / External Tool Integration Extension Example

[English](./README.en.md)

这是一个基于嘉立创EDA的通用文件推送扩展示例，为开发者提供了一个可扩展的框架，用于将设计文件导出并推送到第三方工具进行使用或查看等。 / This is a generic file push extension example based on JLCPCB EDA (EasyEDA), providing developers with an extensible framework to export design files and push them to third-party tools for usage, viewing, etc.

场景应用： / Use cases:  
1、把仿真网表推送到第三方仿真工具 / 1. Push simulation netlist to third-party simulation tools  
2、把PCB制造文件推送到第三方DFM/CAM/SI/PI/EMI等工具 / 2. Push PCB manufacturing files to third-party DFM/CAM/SI/PI/EMI tools  
3、把3D文件推到第三方三维设计工具 / 3. Push 3D files to third-party 3D design tools  
4、把3D文件推送到第三方渲染工具 / 4. Push 3D files to third-party rendering tools  
5、把网表推送到第三方EDA工具 / 5. Push netlist to third-party EDA tools  
6、把元件信息推送到第三方PDF查看工具进行定位 / 6. Push component information to third-party PDF viewers for positioning  
7、唤起外部工具进行运行 / 7. Launch external tools to run  
8、与外部上位机对接 / 8. Interface with external host computers  
9、调用外部自动布线工具 / 9. Invoke external auto-routing tools  
等等非常多的场景 / And many more scenarios

本扩展采用模块化设计，支持二次开发和定制化集成。 / This extension adopts a modular design and supports secondary development and customized integration.

## 扩展特性 / Extension Features

- **通用框架设计**：提供标准化的文件导出和传输接口，便于集成各种仿真工具 / **Generic Framework Design**: Provides standardized file export and transfer interfaces for easy integration of various simulation tools
- **智能客户端检测**：自动检测仿真工具运行状态，支持URL Scheme启动机制 / **Intelligent Client Detection**: Automatically detects simulation tool running status and supports URL Scheme launch mechanism
- **可靠传输机制**：基于HTTP API的文件传输，具备重试机制和超时保护 / **Reliable Transfer Mechanism**: HTTP API based file transfer with retry mechanism and timeout protection
- **灵活配置系统**：支持动态配置仿真工具的连接参数和传输方式 / **Flexible Configuration System**: Supports dynamic configuration of connection parameters and transfer methods for simulation tools

## 开发环境配置 / Development Environment Setup

### 安装依赖 / Install Dependencies

```bash
npm install
```

### 开发构建 / Development Build

```bash
npm run build
```

## 二次开发指南 / Secondary Development Guide

### 1. 核心架构 / 1. Core Architecture

扩展基于 `FileManager` 类构建，提供以下核心功能： / The extension is built upon the `FileManager` class, providing the following core functionalities:

```typescript
class FileManager {   
	// 配置管理 / Configuration management
	updateConfig(newConfig: Partial<Config>): void;

	// 导出文件到外部工具 / Export files to external tools
	exportToExternalTool(fileType: 'odb' | 'netlist'): Promise<void>;
}

// 全局实例 / Global instance
export const fileManager = new FileManager();
```

### 2. 自定义外部工具集成 / 2. Custom External Tool Integration

要集成外部工具，需要实现以下接口： / To integrate an external tool, the following interface needs to be implemented:

```typescript
interface ExternalToolAPI {
	// 状态检测端点 / Status check endpoint
	testEndpoint: string; // 默认: /api/test / Default: /api/test

	// 文件上传端点 / File upload endpoint
	uploadEndpoint: string; // 默认: /api/upload / Default: /api/upload

	// URL Scheme (用于启动外部工具这个应用) / URL Scheme (used to launch the external tool application)
	urlScheme: string; // 例如: "your-tool://" / Example: "your-tool://"

	// 连接配置 / Connection configuration
	host: string; // 默认: localhost / Default: localhost
	port: number; // 默认: 8080 / Default: 8080
	timeout: number; // 默认: 10000ms / Default: 10000ms
}
```

### 3. 配置示例 / 3. Configuration Example

```typescript
// 基础配置 / Basic configuration
fileManager.updateConfig({   
	port: 9090, // 外部工具HTTP服务端口 / External tool HTTP service port
	host: '192.168.1.100', // 外部工具主机地址 / External tool host address
	scheme: 'your-tool://', // URL Scheme用于启动应用 / URL Scheme to launch the application
	timeout: 15000, // 传输超时时间(ms) / Transfer timeout (ms)
});

// 高级配置 / Advanced configuration
fileManager.updateConfig({
	port: 8080,
	host: 'localhost',
	scheme: 'your-tool://',
	timeout: 20000,
	checkInterval: 2000, // 检测间隔(ms) / Check interval (ms)
	focusDelay: 3000, // 焦点检测延迟(ms) / Focus detection delay (ms)
});
```

### 4. 本地文件上传示例（客户端） / 4. Local File Upload Example (Client)

演示如何使用 `sys_FileSystem.readFileFromFileSystem` 接口读取本地文件并上传。 / Demonstrates how to use the `sys_FileSystem.readFileFromFileSystem` API to read a local file and upload it.

```typescript
export async function uploadLocalFile() {
    const fileUri = 'd:/path/to/your/file.txt'; // 填入本地文件的URL / Fill in the local file URL
    const file = await eda.sys_FileSystem.readFileFromFileSystem(fileUri);//需开启外部交互 / External interaction must be enabled
}
```

## 外部工具集成要求 / External Tool Integration Requirements

### HTTP API规范 / HTTP API Specification

外部工具需要提供以下HTTP端点; 你也可以使用websocket进行通讯。可以外部工具本身或其他工具提供http服务并进行数据转发。 / The external tool needs to provide the following HTTP endpoints; you can also use WebSocket for communication. The HTTP service can be provided by the external tool itself or by another tool for data forwarding.

1. **状态检测端点**  / **Status Check Endpoint**
   
`GET /api/test`

    ```json
    // 响应格式 / Response format
    {
    	"status": "ok",
    	"version": "1.0.0",
    	"ready": true
    }
    ```

3. **文件上传端点**  / **File Upload Endpoint**

`POST /api/upload`

    使用 `multipart/form-data` 格式上传： / Upload using `multipart/form-data` format:

    - `file`: 文件内容 (Binary) / - `file`: File content (Binary)
    - `type`: 文件类型 ("odb" 或 "netlist") / - `type`: File type ("odb" or "netlist")
    - `timestamp`: 时间戳 / - `timestamp`: Timestamp

    ```json
    // 响应格式 / Response format
    {
      "success": true,
      "message": "文件上传成功 / File uploaded successfully",
      "fileId": "unique-file-id"
    }
    ```

4. **API需要允许跨域请求** / 3. **API must allow cross-origin requests**

    ```javascript
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    ```

### URL Scheme支持 / URL Scheme Support

如果你希望插件可以唤起外部工具，比如浏览器启动百度网盘，迅雷等工具，你的外部工具应注册[自定义URL Scheme](https://zhuanlan.zhihu.com/p/648300882)以支持自动启动： / If you want the plugin to launch external tools, such as launching Baidu Netdisk or Thunder from a browser, your external tool should register a [custom URL Scheme](https://zhuanlan.zhihu.com/p/648300882) to support automatic startup:

```
your-tool://open?project=<project-id>
```

## 涉及API / APIs Involved

本项目主要使用了以下嘉立创EDA扩展API： / This project mainly uses the following JLCPCB EDA extension APIs:

### 界面交互 / UI Interaction

- `eda.sys_I18n.text`: 获取多语言文本 / Get multilingual text
- `eda.sys_Dialog.showInformationMessage`: 显示信息提示框 / Show information message box
- `eda.sys_Dialog.showConfirmationMessage`: 显示确认对话框 / Show confirmation dialog
- `eda.sys_LoadingAndProgressBar.showProgressBar`: 控制进度条显示与隐藏 / Control progress bar display/hide
- `eda.sys_Message.showToastMessage`: 显示Toast轻提示消息 / Show Toast message

### 系统功能 / System Functions

- `eda.sys_ClientUrl.request`: 发起跨域HTTP请求（用于与外部工具通信） / Make cross-origin HTTP requests (for communicating with external tools)
- `eda.sys_Window.open`: 打开URL链接或唤起外部应用（URL Scheme） / Open URL links or launch external applications (URL Scheme)
- `eda.sys_Window.addEventListener`: 监听窗口焦点变化事件 / Listen to window focus change events

### 定时器管理 / Timer Management

- `eda.sys_Timer.setTimeoutTimer`: 设置延时定时器 / Set a delay timer
- `eda.sys_Timer.setIntervalTimer`: 设置循环定时器 / Set an interval timer
- `eda.sys_Timer.clearIntervalTimer`: 清除循环定时器 / Clear an interval timer
- `eda.sys_Timer.clearTimeoutTimer`: 清除延时定时器 / Clear a delay timer

### 数据获取 / Data Retrieval

- `eda.pcb_ManufactureData.getOpenDatabaseDoublePlusFile`: 获取PCB ODB++制造文件数据 / Get PCB ODB++ manufacturing file data
- `eda.sch_ManufactureData.getNetlistFile`: 获取原理图网表文件数据 / Get schematic netlist file data
