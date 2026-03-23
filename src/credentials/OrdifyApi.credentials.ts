import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OrdifyApi implements ICredentialType {
	name = 'ordifyApi';

	displayName = 'Ordify API';

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
}
