import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { OrdifyApiClient } from './OrdifyApi';

const operationFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'listAvailableCrews',
		options: [
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
		required: true,
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
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		default: '',
		description: 'Optional session ID attached to execution metadata',
		displayOptions: {
			show: {
				operation: ['executeCrew'],
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

				if (operation === 'listAvailableCrews') {
					response = await client.listAvailableCrews();
				} else if (operation === 'getCrewSchema') {
					const crewId = this.getNodeParameter('crewId', i) as string;
					response = await client.getCrewSchema(crewId);
				} else if (operation === 'executeCrew') {
					const crewId = this.getNodeParameter('crewId', i) as string;
					const message = this.getNodeParameter('message', i) as string;
					const inputData = this.getNodeParameter('inputData', i, {}) as IDataObject;
					const sessionId = this.getNodeParameter('sessionId', i, '') as string;
					response = await client.executeCrew(crewId, message, inputData, sessionId || undefined);
				} else if (operation === 'getJobStatus') {
					const jobId = this.getNodeParameter('jobId', i) as string;
					response = await client.getJobStatus(jobId);
				} else if (operation === 'getJobResult') {
					const jobId = this.getNodeParameter('jobId', i) as string;
					response = await client.getJobResult(jobId);
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
				}

				results.push({
					json: Array.isArray(response) ? { items: response } : response,
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
