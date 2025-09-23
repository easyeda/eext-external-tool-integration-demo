import * as extensionConfig from '../extension.json';

/**
 * 通用仿真工具配置数据
 * 可根据实际需要配置第三方仿真工具的相关信息
 */
enum SimulationToolConfig {
	// 示例配置，实际使用时可替换为具体的仿真工具信息
	Default_Port = 8080,
	Default_Host = 'localhost',
	Default_Scheme = 'simulation-tool://',
}

/**
 * 关于信息展示
 * 展示扩展的基本信息和使用说明
 */
export function about(): void {
	const aboutContent = eda.sys_I18n.text('About Content', extensionConfig.uuid, undefined, extensionConfig.version);
	eda.sys_Dialog.showInformationMessage(aboutContent, eda.sys_I18n.text('About', extensionConfig.uuid));
}

/**
 * 导出ODB++文件到仿真工具
 * 这是主要的文件推送功能入口
 *
 * ODB++文件包含完整的PCB制造数据：
 * - 层信息和层叠结构
 * - 钻孔数据和过孔信息
 * - 元件位置和封装信息
 * - 走线和铜箔数据
 * - 阻焊层和丝印层数据
 */
export function exportODBFile() {
	console.log(eda.sys_I18n.text('Export ODB File', extensionConfig.uuid));
	simulationFileManager.exportToSimulationTool('odb');
}

/**
 * 导出原理图网表文件到仿真工具
 * 支持多种网表格式的导出
 *
 * 原理图网表文件包含电路连接信息：
 * - 元件列表和参数
 * - 网络连接关系
 * - 引脚对应关系
 * - 电气规则信息
 */
export function exportNetlistFile() {
	console.log(eda.sys_I18n.text('Export Netlist File', extensionConfig.uuid));
	simulationFileManager.exportToSimulationTool('netlist');
}

/**
 * 通用仿真文件管理器
 * 支持多种文件格式的导出和推送到第三方仿真工具
 *
 * 主要功能：
 * 1. ODB++文件导出和推送 - 用于PCB制造和仿真分析
 * 2. 原理图网表文件导出和推送 - 用于电路仿真和验证
 * 3. 通用的客户端检测机制 - 自动检测仿真工具运行状态
 * 4. 可配置的文件传输方式 - 支持HTTP API和URL Scheme
 * 5. 智能重试和错误处理 - 确保文件传输的可靠性
 *
 */
export class SimulationFileManager {
	// 定时器管理 - 用于控制各种异步操作的时序
	private sendDataTimer = 'sendData'; // 数据发送定时器
	private clientCheckTimer = 'clientCheckTimer'; // 客户端检测定时器
	private focusTimer = 'focusTimer'; // 窗口焦点检测定时器
	private timeoutTimer = 'timeoutTimer'; // 超时处理定时器

	// 配置参数 - 可通过updateConfig方法动态调整
	private config = {
		port: SimulationToolConfig.Default_Port, // 仿真工具HTTP服务端口
		host: SimulationToolConfig.Default_Host, // 仿真工具主机地址
		scheme: SimulationToolConfig.Default_Scheme, // URL Scheme用于启动应用
		clientPath: 'simulation-tool://launch', // 客户端启动路径
		checkInterval: 3000, // 检测间隔(ms) - 定期检查传输状态
		timeout: 10000, // 超时时间(ms) - 防止长时间等待
		focusDelay: 2000, // 焦点检测延迟(ms) - 等待用户操作完成
		blurDelay: 600, // 失焦检测延迟(ms) - 检测用户是否在处理对话框
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
	public async exportToSimulationTool(fileType: 'odb' | 'netlist') {
		this.clearAllTimers();

		// 显示进度条，让用户知道操作正在进行
		eda.sys_LoadingAndProgressBar.showProgressBar(1, 'exportFile');

		// 获取文件数据
		const fileData = await this.getFileData(fileType);
		console.log(`SimulationTool--${fileType}File`, fileData);

		if (!fileData) {
			const fileTypeName =
				fileType === 'odb' ? eda.sys_I18n.text('ODB File', extensionConfig.uuid) : eda.sys_I18n.text('Netlist File', extensionConfig.uuid);
			console.log(eda.sys_I18n.text('File Get Failed', extensionConfig.uuid, undefined, fileTypeName));
			eda.sys_LoadingAndProgressBar.showProgressBar(100, 'exportFile');
			return;
		}

		// 检测客户端是否已运行
		try {
			const clientUrl = `http://${this.config.host}:${this.config.port}/api/test`;
			const isClientRunning = await eda.sys_ClientUrl.request(clientUrl);
			if (isClientRunning.ok) {
				// 客户端已运行，直接发送数据
				this.sendFileData(fileData);
				return;
			}
		} catch (err) {
			console.log(eda.sys_I18n.text('Client Not Running', extensionConfig.uuid));
		}

		// 客户端未运行，尝试启动并监听状态变化
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
	public updateConfig(newConfig: Partial<typeof this.config>) {
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
	private handleClientStartup(fileData: FormData) {
		let currentState: string | null = 'initial';

		// 窗口事件处理器 - 监听用户的窗口切换行为
		const eventHandler = {
			// 处理窗口失去焦点事件
			handleBlur: () => {
				if (currentState === 'initial') {
					currentState = 'blurred';
					console.log(eda.sys_I18n.text('Page Blur', extensionConfig.uuid));
				}
			},
			// 处理窗口重新获得焦点事件
			handleFocus: async () => {
				if (currentState === 'blurred') {
					currentState = 'focused';
					console.log(eda.sys_I18n.text('Page Focus', extensionConfig.uuid));

					// 延迟检测，给客户端启动时间
					eda.sys_Timer.setTimeoutTimer(this.focusTimer, this.config.focusDelay, async () => {
						try {
							const clientUrl = `http://${this.config.host}:${this.config.port}/api/test`;
							const isClientRunning = await eda.sys_ClientUrl.request(clientUrl);
							if (isClientRunning.ok) {
								console.log(eda.sys_I18n.text('Client Started', extensionConfig.uuid));
								this.sendFileData(fileData);
							} else {
								console.log(eda.sys_I18n.text('User Cancelled', extensionConfig.uuid));
								eda.sys_LoadingAndProgressBar.showProgressBar(100, 'exportFile');
							}
						} catch (err) {
							console.log(eda.sys_I18n.text('User Cancelled', extensionConfig.uuid));
							eda.sys_LoadingAndProgressBar.showProgressBar(100, 'exportFile');
						}
					});
				}
			},
		};

		// 注册窗口事件监听
		eda.sys_Window.addEventListener(ESYS_WindowEventType.BLUR, eventHandler.handleBlur);
		eda.sys_Window.addEventListener(ESYS_WindowEventType.FOCUS, eventHandler.handleFocus);

		// 显示确认对话框
		const confirmMessage = eda.sys_I18n.text('Confirm Launch', extensionConfig.uuid, undefined, this.config.clientPath);
		const confirmTitle = eda.sys_I18n.text('Launch Client', extensionConfig.uuid);

		eda.sys_Dialog.showConfirmationMessage(
			confirmMessage,
			confirmTitle,
			eda.sys_I18n.text('Confirm', extensionConfig.uuid),
			eda.sys_I18n.text('Cancel', extensionConfig.uuid),
			(mainButtonClicked) => {
				if (mainButtonClicked) {
					// 用户确认启动，执行启动命令
					console.log(eda.sys_I18n.text('User Confirmed', extensionConfig.uuid));
					eda.sys_Window.open(this.config.clientPath);
				} else {
					// 用户取消启动
					console.log(eda.sys_I18n.text('User Cancelled', extensionConfig.uuid));
					eda.sys_LoadingAndProgressBar.showProgressBar(100, 'exportFile');
				}
			},
		);

		// 设置超时检测 - 处理用户没有切换窗口的情况
		eda.sys_Timer.setTimeoutTimer(this.clientCheckTimer, this.config.blurDelay, async () => {
			if (currentState === 'initial') {
				// 延迟后再次检测客户端状态
				eda.sys_Timer.setTimeoutTimer(this.timeoutTimer, this.config.focusDelay, async () => {
					try {
						const clientUrl = `http://${this.config.host}:${this.config.port}/api/test`;
						const testClient = await eda.sys_ClientUrl.request(clientUrl);
						if (testClient.ok) {
							console.log(eda.sys_I18n.text('Client Started', extensionConfig.uuid));
							currentState = null;
							this.sendFileData(fileData);
							return;
						} else {
							console.log(eda.sys_I18n.text('Client Install Failed', extensionConfig.uuid));
							this.showInstallDialog();
							currentState = null;
							eda.sys_LoadingAndProgressBar.showProgressBar(100, 'exportFile');
						}
					} catch (err) {
						console.log(eda.sys_I18n.text('Client Install Failed', extensionConfig.uuid));
						this.showInstallDialog();
						currentState = null;
						eda.sys_LoadingAndProgressBar.showProgressBar(100, 'exportFile');
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
	private sendFileData(fileData: FormData) {
		let isSuccess = false;

		// 定期发送数据，直到成功
		eda.sys_Timer.setIntervalTimer(this.sendDataTimer, this.config.checkInterval, async () => {
			if (isSuccess) {
				return;
			}

			const uploadUrl = `http://${this.config.host}:${this.config.port}/api/upload`;
			try {
				// 使用EDA提供的HTTP接口发送文件
				const response = await eda.sys_ClientUrl.request(uploadUrl, 'POST', fileData);

				if (!response.ok) {
					const errorText = await response.text();
					console.log(eda.sys_I18n.text('Upload Failed', extensionConfig.uuid, undefined, errorText));
					this.showErrorDialog(eda.sys_I18n.text('Upload Failed', extensionConfig.uuid, undefined, errorText));
					this.clearAllTimers();
					eda.sys_LoadingAndProgressBar.showProgressBar(100, 'exportFile');
					return;
				}

				// 解析响应结果
				const result = await response.json();
				if (result.msg === 'success' || result.success) {
					console.log(eda.sys_I18n.text('Upload Success', extensionConfig.uuid));
					isSuccess = true;
					this.clearAllTimers();
					eda.sys_LoadingAndProgressBar.showProgressBar(100, 'exportFile');
					this.showSuccessMessage();
				}
			} catch (error) {
				console.log(eda.sys_I18n.text('Connection Failed', extensionConfig.uuid, undefined, error));
				this.showErrorDialog(eda.sys_I18n.text('Connection Failed', extensionConfig.uuid, undefined, error));
				this.clearAllTimers();
				eda.sys_LoadingAndProgressBar.showProgressBar(100, 'exportFile');
			}
		});

		// 设置超时处理 - 防止无限重试
		eda.sys_Timer.setTimeoutTimer(this.timeoutTimer, this.config.timeout, () => {
			if (!isSuccess) {
				this.clearAllTimers();
				this.showInstallDialog();
				eda.sys_LoadingAndProgressBar.showProgressBar(100, 'exportFile');
				console.log(eda.sys_I18n.text('Transfer Timeout', extensionConfig.uuid));
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
	private async getFileData(fileType: 'odb' | 'netlist'): Promise<FormData | null> {
		// 生成带时间戳的文件名，避免冲突
		const fileName = `${fileType}_pcb_${this.formatDate(new Date())}.${fileType === 'odb' ? 'zip' : 'net'}`;
		let fileData: File | undefined;

		try {
			if (fileType === 'odb') {
				// 获取ODB++文件 - 包含完整的PCB制造数据
				fileData = await eda.pcb_ManufactureData.getOpenDatabaseDoublePlusFile(fileName);
			} else if (fileType === 'netlist') {
				// 获取原理图网表文件 - 包含电路连接信息
				fileData = await eda.sch_ManufactureData.getNetlistFile(fileName);
			}

			if (!fileData) {
				return null;
			}

			console.log(`SimulationTool--${fileType}Data`, fileData);

			// 可选：保存到本地文件系统用于测试和备份
			// eda.sys_FileSystem.saveFile(fileData);

			// 构建FormData用于HTTP传输
			const formData = new FormData();
			formData.append('file', fileData);
			formData.append('type', fileType);
			formData.append('timestamp', Date.now().toString());
			return formData;
		} catch (error) {
			console.error(eda.sys_I18n.text('File Get Error', extensionConfig.uuid, undefined, fileType, error));
			return null;
		}
	}

	/**
	 * 清空所有定时器
	 * 防止内存泄漏和定时器冲突
	 */
	private clearAllTimers() {
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
	private formatDate(date: string | number | Date): string {
		function pad(num: number): string {
			return num >= 10 ? num.toString() : '0' + num;
		}

		let targetDate: Date;

		if (date instanceof Date) {
			// 处理毫秒时间戳的情况
			targetDate = date.getTime().toString().length > 13 ? new Date(date.getTime() / 1000) : date;
		} else if (!Number.isNaN(Number(date))) {
			const timestamp = Number(date);
			// 自动识别秒级和毫秒级时间戳
			targetDate = timestamp.toString().length > 13 ? new Date(timestamp / 1000) : new Date(timestamp);
		} else {
			targetDate = new Date(date);
		}

		if (Number.isNaN(targetDate.getTime())) {
			return 'unknown';
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
	private showInstallDialog() {
		const content = eda.sys_I18n.text('Warn Tip', extensionConfig.uuid) + '\n' + eda.sys_I18n.text('Warn Tip1', extensionConfig.uuid);

		eda.sys_Dialog.showConfirmationMessage(
			content,
			eda.sys_I18n.text('Install Dialog Title', extensionConfig.uuid),
			eda.sys_I18n.text('View Help', extensionConfig.uuid),
			eda.sys_I18n.text('Download Tool', extensionConfig.uuid),
			(mainButtonClicked) => {
				if (mainButtonClicked) {
					// 查看工具介绍或帮助文档
					eda.sys_Window.open('https://example.com/simulation-tool-help');
				} else {
					// 下载仿真工具
					eda.sys_Window.open('https://example.com/simulation-tool-download');
				}
			},
		);
	}

	/**
	 * 显示错误对话框
	 * 提供用户友好的错误信息
	 *
	 * @param message - 错误消息
	 */
	private showErrorDialog(message: string) {
		eda.sys_Dialog.showInformationMessage(
			eda.sys_I18n.text('Operation Failed', extensionConfig.uuid, undefined, message),
			eda.sys_I18n.text('Error', extensionConfig.uuid),
		);
	}

	/**
	 * 显示成功消息
	 * 使用Toast消息提供即时反馈
	 */
	private showSuccessMessage() {
		eda.sys_Message.showToastMessage(eda.sys_I18n.text('Send Success', extensionConfig.uuid), 'success');
	}
}

/**
 * 创建全局仿真文件管理器实例
 * 这是扩展的主要工作对象，负责处理所有文件导出和传输操作
 */
export const simulationFileManager = new SimulationFileManager();
