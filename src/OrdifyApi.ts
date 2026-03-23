import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

export interface OrdifyCredentials {
	baseUrl: string;
	apiKey: string;
}

export class OrdifyApiClient {
	constructor(
		private readonly ctx: IExecuteFunctions,
		private readonly creds: OrdifyCredentials,
	) {}

	private async request<T = IDataObject>(method: 'GET' | 'POST', path: string, body?: IDataObject): Promise<T> {
		const url = `${this.creds.baseUrl.replace(/\/+$/, '')}${path}`;
		const options: IHttpRequestOptions = {
			method,
			url,
			headers: {
				'api-key': this.creds.apiKey,
				'content-type': 'application/json',
			},
			json: true,
		};

		if (body && method === 'POST') {
			options.body = body;
		}

		try {
			return (await this.ctx.helpers.httpRequest(options)) as T;
		} catch (error: any) {
			const statusCode = error?.response?.statusCode ?? error?.statusCode ?? 'unknown';
			const detail = error?.response?.body?.detail ?? error?.message ?? 'Request failed';
			throw new Error(`Ordify API ${method} ${path} failed (${statusCode}): ${detail}`);
		}
	}

	async listAvailableCrews(): Promise<IDataObject[]> {
		return await this.request<IDataObject[]>('GET', '/a2a/available');
	}

	async getCrewSchema(crewId: string): Promise<IDataObject> {
		return await this.request<IDataObject>('GET', `/a2a/${encodeURIComponent(crewId)}`);
	}

	async executeCrew(
		crewId: string,
		message: string,
		data: IDataObject | undefined,
		sessionId?: string,
	): Promise<IDataObject> {
		const payload: IDataObject = {
			role: 'user',
			parts: [
				{
					kind: 'text',
					text: message,
				},
			],
		};

		if (data && Object.keys(data).length > 0) {
			(payload.parts as IDataObject[]).push({
				kind: 'data',
				data,
			});
		}

		if (sessionId) {
			payload.metadata = { session_id: sessionId };
		}

		return await this.request<IDataObject>('POST', `/a2a/${encodeURIComponent(crewId)}`, payload);
	}

	async getJobStatus(jobId: string): Promise<IDataObject> {
		return await this.request<IDataObject>('GET', `/jobs/${encodeURIComponent(jobId)}`);
	}

	async getJobResult(jobId: string): Promise<IDataObject> {
		return await this.request<IDataObject>('GET', `/jobs/${encodeURIComponent(jobId)}/result`);
	}
}
