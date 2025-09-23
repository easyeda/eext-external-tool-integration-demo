"use strict";
var edaEsbuildExportName = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    SimulationFileManager: () => SimulationFileManager,
    about: () => about,
    exportNetlistFile: () => exportNetlistFile,
    exportODBFile: () => exportODBFile,
    simulationFileManager: () => simulationFileManager
  });

  // extension.json
  var uuid = "a1i8t4u1l2a6t3i7o9n1f3i6l8e0p4u9";
  var version = "1.0.0";

  // src/index.ts
  function about() {
    const aboutContent = eda.sys_I18n.text("About Content", uuid, void 0, version);
    eda.sys_Dialog.showInformationMessage(
      aboutContent,
      eda.sys_I18n.text("About", uuid)
    );
  }
  function exportODBFile() {
    console.log(eda.sys_I18n.text("Export ODB File", uuid));
    simulationFileManager.exportToSimulationTool("odb");
  }
  function exportNetlistFile() {
    console.log(eda.sys_I18n.text("Export Netlist File", uuid));
    simulationFileManager.exportToSimulationTool("netlist");
  }
  var SimulationFileManager = class {
    // 定时器管理 - 用于控制各种异步操作的时序
    sendDataTimer = "sendData";
    // 数据发送定时器
    clientCheckTimer = "clientCheckTimer";
    // 客户端检测定时器
    focusTimer = "focusTimer";
    // 窗口焦点检测定时器
    timeoutTimer = "timeoutTimer";
    // 超时处理定时器
    // 配置参数 - 可通过updateConfig方法动态调整
    config = {
      port: 8080 /* Default_Port */,
      // 仿真工具HTTP服务端口
      host: "localhost" /* Default_Host */,
      // 仿真工具主机地址
      scheme: "simulation-tool://" /* Default_Scheme */,
      // URL Scheme用于启动应用
      clientPath: "simulation-tool://launch",
      // 客户端启动路径
      checkInterval: 3e3,
      // 检测间隔(ms) - 定期检查传输状态
      timeout: 1e4,
      // 超时时间(ms) - 防止长时间等待
      focusDelay: 2e3,
      // 焦点检测延迟(ms) - 等待用户操作完成
      blurDelay: 600
      // 失焦检测延迟(ms) - 检测用户是否在处理对话框
    };
    /**
     * 导出文件到仿真工具
     * 这是核心的文件导出方法，支持多种文件类型
     * 
     * 工作流程：
     * 1. 清理之前的定时器，避免冲突
     * 2. 显示进度条，提供用户反馈
     * 3. 获取指定类型的文件数据
     * 4. 检测仿真工具是否已运行
     * 5. 根据检测结果选择直接发送或启动客户端
     * 
     * @param fileType - 文件类型：'odb' | 'netlist'
     */
    async exportToSimulationTool(fileType) {
      this.clearAllTimers();
      eda.sys_LoadingAndProgressBar.showProgressBar(1, "exportFile");
      const fileData = await this.getFileData(fileType);
      console.log(`SimulationTool--${fileType}File`, fileData);
      if (!fileData) {
        const fileTypeName = fileType === "odb" ? eda.sys_I18n.text("ODB File", uuid) : eda.sys_I18n.text("Netlist File", uuid);
        console.log(eda.sys_I18n.text("File Get Failed", uuid, void 0, fileTypeName));
        eda.sys_LoadingAndProgressBar.showProgressBar(100, "exportFile");
        return;
      }
      try {
        const clientUrl = `http://${this.config.host}:${this.config.port}/api/test`;
        const isClientRunning = await eda.sys_ClientUrl.request(clientUrl);
        if (isClientRunning.ok) {
          this.sendFileData(fileData);
          return;
        }
      } catch (err) {
        console.log(eda.sys_I18n.text("Client Not Running", uuid));
      }
      this.handleClientStartup(fileData);
    }
    /**
     * 更新配置
     * 允许动态调整仿真工具的连接参数
     * 
     * 使用示例：
     * ```
     * simulationFileManager.updateConfig({
     *   port: 9090,
     *   host: '192.168.1.100',
     *   timeout: 15000
     * });
     * ```
     * 
     * @param newConfig - 新的配置参数（部分更新）
     */
    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
    }
    /**
     * 处理客户端启动流程
     * 
     * 状态转换：
     * initial -\> blurred: 用户可能在处理启动确认对话框
     * blurred -\> focused: 用户完成操作，返回到EDA界面
     * 
     * 包括URL Scheme调用和窗口焦点监听
     * 
     * @param fileData - 要传输的文件数据
     */
    handleClientStartup(fileData) {
      let currentState = "initial";
      const eventHandler = {
        // 处理窗口失去焦点事件
        handleBlur: () => {
          if (currentState === "initial") {
            currentState = "blurred";
            console.log(eda.sys_I18n.text("Page Blur", uuid));
          }
        },
        // 处理窗口重新获得焦点事件
        handleFocus: async () => {
          if (currentState === "blurred") {
            currentState = "focused";
            console.log(eda.sys_I18n.text("Page Focus", uuid));
            eda.sys_Timer.setTimeoutTimer(this.focusTimer, this.config.focusDelay, async () => {
              try {
                const clientUrl = `http://${this.config.host}:${this.config.port}/api/test`;
                const isClientRunning = await eda.sys_ClientUrl.request(clientUrl);
                if (isClientRunning.ok) {
                  console.log(eda.sys_I18n.text("Client Started", uuid));
                  this.sendFileData(fileData);
                } else {
                  console.log(eda.sys_I18n.text("User Cancelled", uuid));
                  eda.sys_LoadingAndProgressBar.showProgressBar(100, "exportFile");
                }
              } catch (err) {
                console.log(eda.sys_I18n.text("User Cancelled", uuid));
                eda.sys_LoadingAndProgressBar.showProgressBar(100, "exportFile");
              }
            });
          }
        }
      };
      eda.sys_Window.addEventListener(ESYS_WindowEventType.BLUR, eventHandler.handleBlur);
      eda.sys_Window.addEventListener(ESYS_WindowEventType.FOCUS, eventHandler.handleFocus);
      const confirmMessage = eda.sys_I18n.text("Confirm Launch", uuid, void 0, this.config.clientPath);
      const confirmTitle = eda.sys_I18n.text("Launch Client", uuid);
      eda.sys_Dialog.showConfirmationMessage(
        confirmMessage,
        confirmTitle,
        eda.sys_I18n.text("Confirm", uuid),
        eda.sys_I18n.text("Cancel", uuid),
        (mainButtonClicked) => {
          if (mainButtonClicked) {
            console.log(eda.sys_I18n.text("User Confirmed", uuid));
            eda.sys_Window.open(this.config.clientPath);
          } else {
            console.log(eda.sys_I18n.text("User Cancelled", uuid));
            eda.sys_LoadingAndProgressBar.showProgressBar(100, "exportFile");
          }
        }
      );
      eda.sys_Timer.setTimeoutTimer(this.clientCheckTimer, this.config.blurDelay, async () => {
        if (currentState === "initial") {
          eda.sys_Timer.setTimeoutTimer(this.timeoutTimer, this.config.focusDelay, async () => {
            try {
              const clientUrl = `http://${this.config.host}:${this.config.port}/api/test`;
              const testClient = await eda.sys_ClientUrl.request(clientUrl);
              if (testClient.ok) {
                console.log(eda.sys_I18n.text("Client Started", uuid));
                currentState = null;
                this.sendFileData(fileData);
                return;
              } else {
                console.log(eda.sys_I18n.text("Client Install Failed", uuid));
                this.showInstallDialog();
                currentState = null;
                eda.sys_LoadingAndProgressBar.showProgressBar(100, "exportFile");
              }
            } catch (err) {
              console.log(eda.sys_I18n.text("Client Install Failed", uuid));
              this.showInstallDialog();
              currentState = null;
              eda.sys_LoadingAndProgressBar.showProgressBar(100, "exportFile");
            }
          });
        }
      });
    }
    /**
     * 发送文件数据到仿真工具
     * 支持重试机制和超时处理，确保传输的可靠性
     * 
     * 重试策略：
     * - 定期尝试发送，直到成功
     * - 检查响应状态和内容
     * - 超时后自动停止尝试
     * 
     * @param fileData - 要发送的文件数据（FormData格式）
     */
    sendFileData(fileData) {
      let isSuccess = false;
      eda.sys_Timer.setIntervalTimer(this.sendDataTimer, this.config.checkInterval, async () => {
        if (isSuccess) {
          return;
        }
        const uploadUrl = `http://${this.config.host}:${this.config.port}/api/upload`;
        try {
          const response = await eda.sys_ClientUrl.request(uploadUrl, "POST", fileData);
          if (!response.ok) {
            const errorText = await response.text();
            console.log(eda.sys_I18n.text("Upload Failed", uuid, void 0, errorText));
            this.showErrorDialog(eda.sys_I18n.text("Upload Failed", uuid, void 0, errorText));
            this.clearAllTimers();
            eda.sys_LoadingAndProgressBar.showProgressBar(100, "exportFile");
            return;
          }
          const result = await response.json();
          if (result.msg === "success" || result.success) {
            console.log(eda.sys_I18n.text("Upload Success", uuid));
            isSuccess = true;
            this.clearAllTimers();
            eda.sys_LoadingAndProgressBar.showProgressBar(100, "exportFile");
            this.showSuccessMessage();
          }
        } catch (error) {
          console.log(eda.sys_I18n.text("Connection Failed", uuid, void 0, error));
          this.showErrorDialog(eda.sys_I18n.text("Connection Failed", uuid, void 0, error));
          this.clearAllTimers();
          eda.sys_LoadingAndProgressBar.showProgressBar(100, "exportFile");
        }
      });
      eda.sys_Timer.setTimeoutTimer(this.timeoutTimer, this.config.timeout, () => {
        if (!isSuccess) {
          this.clearAllTimers();
          this.showInstallDialog();
          eda.sys_LoadingAndProgressBar.showProgressBar(100, "exportFile");
          console.log(eda.sys_I18n.text("Transfer Timeout", uuid));
        }
      });
    }
    /**
     * 获取文件数据
     * 支持ODB++和原理图网表文件的获取，使用嘉立创EDA官方API
     * 
     * API参考：
     * - ODB++: https://prodocs.lceda.cn/cn/api/reference/pro-api.pcb_manufacturedata.getopendatabasedoubleplusfile.html
     * - 原理图网表: https://prodocs.lceda.cn/cn/api/reference/pro-api.sch_manufacturedata.getnetlistfile.html
     * 
     * @param fileType - 文件类型：'odb' | 'netlist'
     * @returns Promise\<FormData | null\> 格式化的文件数据或null
     */
    async getFileData(fileType) {
      const fileName = `${fileType}_pcb_${this.formatDate(/* @__PURE__ */ new Date())}.${fileType === "odb" ? "zip" : "net"}`;
      let fileData;
      try {
        if (fileType === "odb") {
          fileData = await eda.pcb_ManufactureData.getOpenDatabaseDoublePlusFile(fileName);
        } else if (fileType === "netlist") {
          fileData = await eda.sch_ManufactureData.getNetlistFile(fileName);
        }
        if (!fileData) {
          return null;
        }
        console.log(`SimulationTool--${fileType}Data`, fileData);
        const formData = new FormData();
        formData.append("file", fileData);
        formData.append("type", fileType);
        formData.append("timestamp", Date.now().toString());
        return formData;
      } catch (error) {
        console.error(eda.sys_I18n.text("File Get Error", uuid, void 0, fileType, error));
        return null;
      }
    }
    /**
     * 清空所有定时器
     * 防止内存泄漏和定时器冲突
     */
    clearAllTimers() {
      eda.sys_Timer.clearIntervalTimer(this.sendDataTimer);
      eda.sys_Timer.clearTimeoutTimer(this.clientCheckTimer);
      eda.sys_Timer.clearTimeoutTimer(this.focusTimer);
      eda.sys_Timer.clearTimeoutTimer(this.timeoutTimer);
    }
    /**
     * 格式化日期为文件名
     * 生成易读且唯一的文件名，便于文件管理
     * 
     * @param date - 日期对象、时间戳或日期字符串
     * @returns 格式化的日期字符串 (YYYY-MM-DD_HH-MM)
     */
    formatDate(date) {
      function pad(num) {
        return num >= 10 ? num.toString() : "0" + num;
      }
      let targetDate;
      if (date instanceof Date) {
        targetDate = date.getTime().toString().length > 13 ? new Date(date.getTime() / 1e3) : date;
      } else if (!Number.isNaN(Number(date))) {
        const timestamp = Number(date);
        targetDate = timestamp.toString().length > 13 ? new Date(timestamp / 1e3) : new Date(timestamp);
      } else {
        targetDate = new Date(date);
      }
      if (Number.isNaN(targetDate.getTime())) {
        return "unknown";
      }
      const year = targetDate.getFullYear();
      const month = pad(targetDate.getMonth() + 1);
      const day = pad(targetDate.getDate());
      const hour = pad(targetDate.getHours());
      const minute = pad(targetDate.getMinutes());
      return `${year}-${month}-${day}_${hour}-${minute}`;
    }
    /**
     * 显示安装提示对话框
     * 当仿真工具未安装或启动失败时，引导用户进行相应操作
     */
    showInstallDialog() {
      const content = eda.sys_I18n.text("Warn Tip", uuid) + "\n" + eda.sys_I18n.text("Warn Tip1", uuid);
      eda.sys_Dialog.showConfirmationMessage(
        content,
        eda.sys_I18n.text("Install Dialog Title", uuid),
        eda.sys_I18n.text("View Help", uuid),
        eda.sys_I18n.text("Download Tool", uuid),
        (mainButtonClicked) => {
          if (mainButtonClicked) {
            eda.sys_Window.open("https://example.com/simulation-tool-help");
          } else {
            eda.sys_Window.open("https://example.com/simulation-tool-download");
          }
        }
      );
    }
    /**
     * 显示错误对话框
     * 提供用户友好的错误信息
     * 
     * @param message - 错误消息
     */
    showErrorDialog(message) {
      eda.sys_Dialog.showInformationMessage(
        eda.sys_I18n.text("Operation Failed", uuid, void 0, message),
        eda.sys_I18n.text("Error", uuid)
      );
    }
    /**
     * 显示成功消息
     * 使用Toast消息提供即时反馈
     */
    showSuccessMessage() {
      eda.sys_Message.showToastMessage(
        eda.sys_I18n.text("Send Success", uuid),
        "success"
      );
    }
  };
  var simulationFileManager = new SimulationFileManager();
  return __toCommonJS(src_exports);
})();
