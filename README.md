# 外部工具集成扩展示例

这是一个基于嘉立创EDA的通用仿真文件推送扩展示例，为开发者提供了一个可扩展的框架，用于将设计文件导出并推送到第三方工具进行使用或查看等。

场景应用：  
1、把仿真网表推送到第三方仿真工具   
2、把PCB制造文件推送到第三方DFM/CAM/SI/PI/EMI仿真等工具  
3、把3D文件推到第三方三维设计工具  
4、把3D文件推送到第三方渲染工具  
5、把网表推送到第三方EDA工具  
6、把元件信息推送到第三方PDF查看工具进行定位  
7、唤起外部工具进行运行  
8、与外部上位机对接
9、调用外部自动布线工具
等等非常多的场景

本扩展采用模块化设计，支持二次开发和定制化集成。

## 扩展特性

- **通用框架设计**：提供标准化的文件导出和传输接口，便于集成各种仿真工具
- **智能客户端检测**：自动检测仿真工具运行状态，支持URL Scheme启动机制
- **可靠传输机制**：基于HTTP API的文件传输，具备重试机制和超时保护
- **灵活配置系统**：支持动态配置仿真工具的连接参数和传输方式

## 开发环境配置

### 安装依赖

```bash
npm install
```

### 开发构建

```bash
npm run build
```

## 二次开发指南

### 1. 核心架构

扩展基于 `SimulationFileManager` 类构建，提供以下核心功能：

```typescript
class SimulationFileManager {   
	// 配置管理
	updateConfig(newConfig: Partial<Config>): void;

	// 导出文件到仿真工具
	exportToSimulationTool(fileType: 'odb' | 'netlist'): Promise<void>;
}

// 全局实例
export const simulationFileManager = new SimulationFileManager();
```

### 2. 自定义外部工具集成

要集成外部工具，需要实现以下接口：

```typescript
interface ExternalToolAPI {
	// 状态检测端点
	testEndpoint: string; // 默认: /api/test

	// 文件上传端点
	uploadEndpoint: string; // 默认: /api/upload

	// URL Scheme (用于启动外部工具这个应用)
	urlScheme: string; // 例如: "your-tool://"

	// 连接配置
	host: string; // 默认: localhost
	port: number; // 默认: 8080
	timeout: number; // 默认: 10000ms
}
```

### 3. 配置示例

```typescript
// 基础配置
simulationFileManager.updateConfig({   
	port: 9090, // 仿真工具HTTP服务端口
	host: '192.168.1.100', // 仿真工具主机地址
	scheme: 'your-tool://', // URL Scheme用于启动应用
	timeout: 15000, // 传输超时时间(ms)
});

// 高级配置
simulationFileManager.updateConfig({
	port: 8080,
	host: 'localhost',
	scheme: 'your-tool://',
	timeout: 20000,
	checkInterval: 2000, // 检测间隔(ms)
	focusDelay: 3000, // 焦点检测延迟(ms)
});
```

## 外部工具集成要求

### HTTP API规范

外部工具需要提供以下HTTP端点; 你也可以使用websocket进行通讯。可以外部工具本身或其他工具提供http服务并进行数据转发。

1. **状态检测端点** `GET /api/test`

    ```json
    // 响应格式
    {
    	"status": "ok",
    	"version": "1.0.0",
    	"ready": true
    }
    ```

2. **文件上传端点** `POST /api/upload`

    使用 `multipart/form-data` 格式上传：

    - `file`: 文件内容 (Binary)
    - `type`: 文件类型 ("odb" 或 "netlist")
    - `timestamp`: 时间戳

    ```json
    // 响应格式
    {
      "success": true,
      "message": "文件上传成功",
      "fileId": "unique-file-id"
    }
    ```
 3. **API需要允许跨域请求**

  ```json
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  ```

### URL Scheme支持

如果你希望插件可以唤起外部工具，比如浏览器启动百度网盘，迅雷等工具，你的外部工具应注册[自定义URL Scheme](https://zhuanlan.zhihu.com/p/648300882)以支持自动启动：

```
your-tool://open?project=<project-id>
```

## 涉及API

本项目主要使用了以下嘉立创EDA扩展API：

### 界面交互
- `eda.sys_I18n.text`: 获取多语言文本
- `eda.sys_Dialog.showInformationMessage`: 显示信息提示框
- `eda.sys_Dialog.showConfirmationMessage`: 显示确认对话框
- `eda.sys_LoadingAndProgressBar.showProgressBar`: 控制进度条显示与隐藏
- `eda.sys_Message.showToastMessage`: 显示Toast轻提示消息

### 系统功能
- `eda.sys_ClientUrl.request`: 发起跨域HTTP请求（用于与外部工具通信）
- `eda.sys_Window.open`: 打开URL链接或唤起外部应用（URL Scheme）
- `eda.sys_Window.addEventListener`: 监听窗口焦点变化事件

### 定时器管理
- `eda.sys_Timer.setTimeoutTimer`: 设置延时定时器
- `eda.sys_Timer.setIntervalTimer`: 设置循环定时器
- `eda.sys_Timer.clearIntervalTimer`: 清除循环定时器
- `eda.sys_Timer.clearTimeoutTimer`: 清除延时定时器

### 数据获取
- `eda.pcb_ManufactureData.getOpenDatabaseDoublePlusFile`: 获取PCB ODB++制造文件数据
- `eda.sch_ManufactureData.getNetlistFile`: 获取原理图网表文件数据
