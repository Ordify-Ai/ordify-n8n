import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

import { ORDIFY_DEFAULT_BASE_URL } from '../utils/shared';

export class OrdifyApi implements ICredentialType {
	name = 'ordifyApi';

	displayName = 'Ordify API';

	icon = 'file:Ordify_icon_transparent.png' as const;

	documentationUrl = 'https://ordify.ai';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: ORDIFY_DEFAULT_BASE_URL,
			placeholder: ORDIFY_DEFAULT_BASE_URL,
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
		},
	};
}
