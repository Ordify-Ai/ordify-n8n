import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OrdifyApi implements ICredentialType {
	name = 'ordifyApi';

	displayName = 'Ordify API';

	documentationUrl = 'https://ordify.ai';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://r.ordify.ai/',
			placeholder: 'https://r.ordify.ai/',
			required: true,
			description: 'Ordify API base URL',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'API key generated from Ordify settings',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/a2a/available',
			method: 'GET',
			headers: {
				'api-key': '={{$credentials.apiKey}}',
			},
		},
	};
}
