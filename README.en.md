# External Tool Integration Extension Example

[中文](./README.md)

This is a generic file push extension example based on JLCPCB EDA (EasyEDA), providing developers with an extensible framework to export design files and push them to third-party tools for usage, viewing, etc.

Use cases:  
1. Push simulation netlist to third-party simulation tools  
2. Push PCB manufacturing files to third-party DFM/CAM/SI/PI/EMI tools  
3. Push 3D files to third-party 3D design tools  
4. Push 3D files to third-party rendering tools  
5. Push netlist to third-party EDA tools  
6. Push component information to third-party PDF viewers for positioning  
7. Launch external tools to run  
8. Interface with external host computers  
9. Invoke external auto-routing tools  
And many more scenarios

This extension adopts a modular design and supports secondary development and customized integration.

## Extension Features

- **Generic Framework Design**: Provides standardized file export and transfer interfaces for easy integration of various simulation tools
- **Intelligent Client Detection**: Automatically detects simulation tool running status and supports URL Scheme launch mechanism
- **Reliable Transfer Mechanism**: HTTP API based file transfer with retry mechanism and timeout protection
- **Flexible Configuration System**: Supports dynamic configuration of connection parameters and transfer methods for simulation tools

## Development Environment Setup

### Install Dependencies

```bash
npm install
```

### Development Build

```bash
npm run build
```

## Secondary Development Guide

### 1. Core Architecture

The extension is built upon the `FileManager` class, providing the following core functionalities:

```typescript
class FileManager {   
	// Configuration management
	updateConfig(newConfig: Partial<Config>): void;

	// Export files to external tools
	exportToExternalTool(fileType: 'odb' | 'netlist'): Promise<void>;
}

// Global instance
export const fileManager = new FileManager();
```

### 2. Custom External Tool Integration

To integrate an external tool, the following interface needs to be implemented:

```typescript
interface ExternalToolAPI {
	// Status check endpoint
	testEndpoint: string; // Default: /api/test

	// File upload endpoint
	uploadEndpoint: string; // Default: /api/upload

	// URL Scheme (used to launch the external tool application)
	urlScheme: string; // Example: "your-tool://"

	// Connection configuration
	host: string; // Default: localhost
	port: number; // Default: 8080
	timeout: number; // Default: 10000ms
}
```

### 3. Configuration Example

```typescript
// Basic configuration
fileManager.updateConfig({   
	port: 9090, // External tool HTTP service port
	host: '192.168.1.100', // External tool host address
	scheme: 'your-tool://', // URL Scheme to launch the application
	timeout: 15000, // Transfer timeout (ms)
});

// Advanced configuration
fileManager.updateConfig({
	port: 8080,
	host: 'localhost',
	scheme: 'your-tool://',
	timeout: 20000,
	checkInterval: 2000, // Check interval (ms)
	focusDelay: 3000, // Focus detection delay (ms)
});
```

### 4. Local File Upload Example (Client)

Demonstrates how to use the `sys_FileSystem.readFileFromFileSystem` API to read a local file and upload it.

```typescript
export async function uploadLocalFile() {
    const fileUri = 'd:/path/to/your/file.txt'; // Fill in the local file URL
    const file = await eda.sys_FileSystem.readFileFromFileSystem(fileUri);// External interaction must be enabled
}
```

## External Tool Integration Requirements

### HTTP API Specification

The external tool needs to provide the following HTTP endpoints; you can also use WebSocket for communication. The HTTP service can be provided by the external tool itself or by another tool for data forwarding.

1. **Status Check Endpoint**

`GET /api/test`

    ```json
    // Response format
    {
    	"status": "ok",
    	"version": "1.0.0",
    	"ready": true
    }
    ```

3. **File Upload Endpoint**

`POST /api/upload`

    Upload using `multipart/form-data` format:

    - `file`: File content (Binary)
    - `type`: File type ("odb" or "netlist")
    - `timestamp`: Timestamp

    ```json
    // Response format
    {
      "success": true,
      "message": "File uploaded successfully",
      "fileId": "unique-file-id"
    }
    ```

4. **API must allow cross-origin requests**

    ```javascript
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    ```

### URL Scheme Support

If you want the plugin to launch external tools, such as launching Baidu Netdisk or Thunder from a browser, your external tool should register a [custom URL Scheme](https://zhuanlan.zhihu.com/p/648300882) to support automatic startup:

```
your-tool://open?project=<project-id>
```

## APIs Involved

This project mainly uses the following JLCPCB EDA extension APIs:

### UI Interaction

- `eda.sys_I18n.text`: Get multilingual text
- `eda.sys_Dialog.showInformationMessage`: Show information message box
- `eda.sys_Dialog.showConfirmationMessage`: Show confirmation dialog
- `eda.sys_LoadingAndProgressBar.showProgressBar`: Control progress bar display/hide
- `eda.sys_Message.showToastMessage`: Show Toast message

### System Functions

- `eda.sys_ClientUrl.request`: Make cross-origin HTTP requests (for communicating with external tools)
- `eda.sys_Window.open`: Open URL links or launch external applications (URL Scheme)
- `eda.sys_Window.addEventListener`: Listen to window focus change events

### Timer Management

- `eda.sys_Timer.setTimeoutTimer`: Set a delay timer
- `eda.sys_Timer.setIntervalTimer`: Set an interval timer
- `eda.sys_Timer.clearIntervalTimer`: Clear an interval timer
- `eda.sys_Timer.clearTimeoutTimer`: Clear a delay timer

### Data Retrieval

- `eda.pcb_ManufactureData.getOpenDatabaseDoublePlusFile`: Get PCB ODB++ manufacturing file data
- `eda.sch_ManufactureData.getNetlistFile`: Get schematic netlist file data
