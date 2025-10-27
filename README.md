# 仿真文件推送工具扩展

这是一个基于嘉立创EDA的通用仿真文件推送扩展，为开发者提供了一个可扩展的框架，用于将设计文件导出并推送到第三方工具进行使用或查看等。

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
- **ODB++文件导出**：完整的PCB制造数据导出，包含层信息、钻孔数据、元件位置等
- **原理图网表导出**：从原理图提取电路连接信息，包含元件列表、网络关系、引脚对应等
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
	updateConfig(config: SimulationConfig): void;

	// 文件导出
	exportODBFile(): Promise<void>;
	exportNetlistFile(): Promise<void>;

	// 客户端检测
	checkClientStatus(): Promise<boolean>;

	// 文件传输
	sendFileData(data: any, type: string): Promise<void>;
}
```

### 2. 自定义仿真工具集成

要集成新的仿真工具，需要实现以下接口：

```typescript
interface SimulationToolAPI {
	// 状态检测端点
	testEndpoint: string; // 默认: /api/test

	// 文件上传端点
	uploadEndpoint: string; // 默认: /api/upload

	// URL Scheme (用于启动应用)
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
	scheme: 'my-simulation-tool://', // URL Scheme用于启动应用
	timeout: 15000, // 传输超时时间(ms)
});

// 高级配置
simulationFileManager.updateConfig({
	port: 8080,
	host: 'localhost',
	scheme: 'advanced-sim://',
	timeout: 20000,
	retryCount: 3, // 重试次数
	retryDelay: 2000, // 重试间隔(ms)
});
```

## 仿真工具集成要求

### HTTP API规范

仿真工具需要提供以下HTTP端点：

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

    ```json
    // 请求格式
    {
      "fileType": "odb" | "netlist",
      "fileName": "design.odb",
      "fileData": "base64编码的文件数据",
      "metadata": {
        "projectName": "项目名称",
        "timestamp": "2024-01-01T00:00:00Z"
      }
    }

    // 响应格式
    {
      "success": true,
      "message": "文件上传成功",
      "fileId": "unique-file-id"
    }
    ```

### URL Scheme支持

仿真工具应注册自定义URL Scheme以支持自动启动：

```
your-tool://open?project=<project-id>
```
