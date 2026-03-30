import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { OrdifyApiClient, type OrdifyChatPayload } from './OrdifyApi';

const sleep = async (ms: number): Promise<void> =>
	await new Promise((resolve) => setTimeout(resolve, ms));

const operationFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'listAvailableCrews',
		options: [
			{
				name: 'Chat',
				value: 'chat',
				description: 'Chat with Ordify via POST /chat',
				action: 'Send a chat message',
			},
			{
				name: 'List Available Agents',
				value: 'listAvailableAgents',
				description: 'Get available ADK agents from /chat/agents',
				action: 'List available agents',
			},
			{
				name: 'List Available Crews',
				value: 'listAvailableCrews',
				description: 'Get available crews from /a2a/available',
				action: 'List available crews',
			},
			{
				name: 'Get Crew Schema',
				value: 'getCrewSchema',
				description: 'Get crew schema from /a2a/{crew_id}',
				action: 'Get crew schema',
			},
			{
				name: 'Execute Crew',
				value: 'executeCrew',
				description: 'Execute a crew using /a2a/{crew_id}',
				action: 'Execute a crew',
			},
			{
				name: 'Get Job Status',
				value: 'getJobStatus',
				description: 'Get job status from /jobs/{job_id}',
				action: 'Get a job status',
			},
			{
				name: 'Get Job Result',
				value: 'getJobResult',
				description: 'Get completed job result from /jobs/{job_id}/result',
				action: 'Get a job result',
			},
		],
	},
	{
		displayName: 'Chat Message',
		name: 'chatMessage',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['chat'],
			},
		},
	},
	{
		displayName: 'Chat Mode',
		name: 'chatMode',
		type: 'options',
		default: 'general',
		options: [
			{
				name: 'General Chat',
				value: 'general',
				description: 'Use POST /chat',
			},
			{
				name: 'Specific Agent Chat',
				value: 'agent',
				description: 'Use POST /chat/agents/{agent_id}',
			},
		],
		displayOptions: {
			show: {
				operation: ['chat'],
			},
		},
	},
	{
		displayName: 'Agent ID',
		name: 'chatAgentId',
		type: 'string',
		default: '',
		required: true,
		description: 'Agent ID from List Available Agents output',
		displayOptions: {
			show: {
				operation: ['chat'],
				chatMode: ['agent'],
			},
		},
	},
	{
		displayName: 'Context',
		name: 'chatContext',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		default: '',
		description: 'Optional additional context',
		displayOptions: {
			show: {
				operation: ['chat'],
			},
		},
	},
	{
		displayName: 'Use Thinking',
		name: 'chatUseThinking',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['chat'],
			},
		},
	},
	{
		displayName: 'Use Grounding',
		name: 'chatUseGrounding',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['chat'],
			},
		},
	},
	{
		displayName: 'RAG Enabled',
		name: 'chatRagEnabled',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['chat'],
			},
		},
	},
	{
		displayName: 'Agent Mode',
		name: 'chatAgentMode',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['chat'],
			},
		},
	},
	{
		displayName: 'Crew ID',
		name: 'crewId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['getCrewSchema', 'executeCrew'],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		required: false,
		description: 'Optional for schema-driven jobs when using Input Data JSON',
		displayOptions: {
			show: {
				operation: ['executeCrew'],
			},
		},
	},
	{
		displayName: 'Input Data JSON',
		name: 'inputData',
		type: 'json',
		default: '{}',
		description: 'Optional structured data passed to the crew',
		displayOptions: {
			show: {
				operation: ['executeCrew'],
			},
		},
	},
	{
		displayName: 'Execution Mode',
		name: 'executionMode',
		type: 'options',
		default: 'async',
		options: [
			{
				name: 'Async (Return Job ID Immediately)',
				value: 'async',
				description: 'Returns execute response without waiting for completion',
			},
			{
				name: 'Wait For Completion',
				value: 'wait',
				description: 'Poll job status until complete, failed, cancelled, or timeout',
			},
		],
		displayOptions: {
			show: {
				operation: ['executeCrew'],
			},
		},
	},
	{
		displayName: 'Poll Interval Seconds',
		name: 'pollIntervalSeconds',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 60,
			numberStepSize: 1,
		},
		default: 5,
		description: 'Seconds between status checks in wait mode',
		displayOptions: {
			show: {
				operation: ['executeCrew'],
				executionMode: ['wait'],
			},
		},
	},
	{
		displayName: 'Timeout Seconds',
		name: 'timeoutSeconds',
		type: 'number',
		typeOptions: {
			minValue: 5,
			maxValue: 3600,
			numberStepSize: 1,
		},
		default: 300,
		description: 'Maximum time to wait for terminal status in wait mode',
		displayOptions: {
			show: {
				operation: ['executeCrew'],
				executionMode: ['wait'],
			},
		},
	},
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['getJobStatus', 'getJobResult'],
			},
		},
	},
];

export class Ordify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ordify',
		name: 'ordify',
		icon: 'file:Ordify_icon_transparent.png',
		group: ['transform'],
		version: 1,
		description: 'Run Ordify jobs through A2A and Jobs APIs',
		defaults: {
			name: 'Ordify',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'ordifyApi',
				required: true,
			},
		],
		properties: operationFields,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const results: INodeExecutionData[] = [];

		const creds = await this.getCredentials('ordifyApi');
		const client = new OrdifyApiClient(this, {
			baseUrl: String(creds.baseUrl),
			apiKey: String(creds.apiKey),
		});

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				let response: IDataObject | IDataObject[];
				let normalized: IDataObject;

				if (operation === 'chat') {
					const message = this.getNodeParameter('chatMessage', i) as string;
					const chatMode = this.getNodeParameter('chatMode', i, 'general') as string;
					const context = this.getNodeParameter('chatContext', i, '') as string;
					const useThinking = this.getNodeParameter('chatUseThinking', i, false) as boolean;
					const useGrounding = this.getNodeParameter('chatUseGrounding', i, false) as boolean;
					const ragEnabled = this.getNodeParameter('chatRagEnabled', i, false) as boolean;
					const agentMode = this.getNodeParameter('chatAgentMode', i, false) as boolean;
					if (!message.trim()) {
						throw new NodeOperationError(this.getNode(), 'Chat Message is required', {
							itemIndex: i,
						});
					}
					const payload: OrdifyChatPayload = {
						message,
						use_thinking: useThinking,
						use_grounding: useGrounding,
						rag_enabled: ragEnabled,
						agent_mode: agentMode,
					};
					if (context.trim()) payload.context = context;

					if (chatMode === 'agent') {
						const agentId = this.getNodeParameter('chatAgentId', i) as string;
						response = await client.chatWithAgent(agentId, payload);
					} else {
						response = await client.chat(payload);
					}
					normalized = {
						operation,
						chat_mode: chatMode,
						...response,
					};
				} else if (operation === 'listAvailableAgents') {
					response = await client.listAvailableAgents();
					const agents = Array.isArray((response as IDataObject).agents)
						? ((response as IDataObject).agents as IDataObject[])
						: [];
					normalized = {
						operation,
						total: (response as IDataObject).total ?? agents.length,
						agents,
						...response,
					};
				} else if (operation === 'listAvailableCrews') {
					response = await client.listAvailableCrews();
					normalized = {
						operation,
						count: Array.isArray(response) ? response.length : 0,
						items: response as IDataObject[],
					};
				} else if (operation === 'getCrewSchema') {
					const crewId = this.getNodeParameter('crewId', i) as string;
					response = await client.getCrewSchema(crewId);
					normalized = {
						operation,
						crew_id: crewId,
						...response,
					};
				} else if (operation === 'executeCrew') {
					const crewId = this.getNodeParameter('crewId', i) as string;
					const message = this.getNodeParameter('message', i) as string;
					const rawInputData = this.getNodeParameter('inputData', i, {}) as IDataObject | string;
					const executionMode = this.getNodeParameter('executionMode', i, 'async') as string;
					let inputData: IDataObject = {};
					let inputDataProvided = false;

					const messageText = message.trim();
					if (typeof rawInputData === 'string') {
						const trimmed = rawInputData.trim();
						if (trimmed.length > 0) {
							inputDataProvided = true;
							try {
								const parsed = JSON.parse(trimmed);
								if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
									throw new Error('parsed value is not an object');
								}
								inputData = parsed as IDataObject;
							} catch {
								throw new NodeOperationError(
									this.getNode(),
									'Input Data JSON must be a valid JSON object',
									{ itemIndex: i },
								);
							}
						}
					} else if (rawInputData && typeof rawInputData === 'object' && !Array.isArray(rawInputData)) {
						inputData = rawInputData;
						inputDataProvided = true;
					} else if (Array.isArray(rawInputData)) {
						throw new NodeOperationError(
							this.getNode(),
							'Input Data JSON must be a JSON object (arrays are not supported)',
							{ itemIndex: i },
						);
					}

					response = await client.executeCrew(
						crewId,
						messageText || undefined,
						inputData,
						inputDataProvided,
						undefined,
					);
					const jobId = String((response as IDataObject).job_id ?? '');
					if (!jobId) {
						throw new NodeOperationError(
							this.getNode(),
							'Execute response missing job_id. Cannot continue.',
							{ itemIndex: i },
						);
					}

					if (executionMode === 'wait') {
						const pollIntervalSeconds = Number(this.getNodeParameter('pollIntervalSeconds', i, 5));
						const timeoutSeconds = Number(this.getNodeParameter('timeoutSeconds', i, 300));
						const start = Date.now();
						let statusPayload = await client.getJobStatus(jobId);
						let normalizedStatus = OrdifyApiClient.getNormalizedJobStatus(statusPayload);

						while (!OrdifyApiClient.isTerminalStatus(normalizedStatus)) {
							const elapsedSeconds = (Date.now() - start) / 1000;
							if (elapsedSeconds >= timeoutSeconds) {
								throw new NodeOperationError(
									this.getNode(),
									`Timed out waiting for job ${jobId} after ${timeoutSeconds}s. Last status: ${normalizedStatus}`,
									{ itemIndex: i },
								);
							}

							await sleep(pollIntervalSeconds * 1000);
							statusPayload = await client.getJobStatus(jobId);
							normalizedStatus = OrdifyApiClient.getNormalizedJobStatus(statusPayload);
						}

						let resultPayload: IDataObject | null = null;
						if (OrdifyApiClient.isSuccessfulTerminalStatus(normalizedStatus)) {
							resultPayload = await client.getJobResult(jobId);
						}

						normalized = {
							operation,
							execution_mode: 'wait',
							crew_id: crewId,
							job_id: jobId,
							final_status: normalizedStatus,
							execute_response: response,
							status_response: statusPayload,
							result_response: resultPayload,
						};
					} else {
						normalized = {
							operation,
							execution_mode: 'async',
							crew_id: crewId,
							...response,
						};
					}
				} else if (operation === 'getJobStatus') {
					const jobId = this.getNodeParameter('jobId', i) as string;
					response = await client.getJobStatus(jobId);
					normalized = {
						operation,
						job_id: jobId,
						normalized_status: OrdifyApiClient.getNormalizedJobStatus(response as IDataObject),
						...response,
					};
				} else if (operation === 'getJobResult') {
					const jobId = this.getNodeParameter('jobId', i) as string;
					response = await client.getJobResult(jobId);
					normalized = {
						operation,
						job_id: jobId,
						...response,
					};
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
				}

				results.push({
					json: normalized,
				});
			} catch (error: any) {
				if (this.continueOnFail()) {
					results.push({
						json: {
							error: error.message,
						},
						pairedItem: i,
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
			}
		}

		return [results];
	}
}
