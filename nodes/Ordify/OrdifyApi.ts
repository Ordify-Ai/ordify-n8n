import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

export interface OrdifyCredentials {
	baseUrl: string;
	apiKey: string;
}

export interface OrdifyChatPayload extends IDataObject {
	message: string;
	sessionId?: string;
	context?: string;
	use_thinking?: boolean;
	use_grounding?: boolean;
	rag_enabled?: boolean;
	agent_mode?: boolean;
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
			const responseBody = error?.response?.body;
			const detail =
				responseBody?.detail ??
				responseBody?.message ??
				(typeof responseBody === 'string' ? responseBody : undefined) ??
				error?.message ??
				'Request failed';
			throw new Error(`Ordify API ${method} ${path} failed (${statusCode}): ${detail}`);
		}
	}

	private async requestRaw(method: 'GET' | 'POST', path: string, body?: IDataObject): Promise<string> {
		const url = `${this.creds.baseUrl.replace(/\/+$/, '')}${path}`;
		const options: IHttpRequestOptions = {
			method,
			url,
			headers: {
				'api-key': this.creds.apiKey,
				'content-type': 'application/json',
			},
			json: false,
			returnFullResponse: false,
		};

		if (body && method === 'POST') {
			options.body = JSON.stringify(body);
		}

		try {
			const raw = await this.ctx.helpers.httpRequest(options);
			return typeof raw === 'string' ? raw : JSON.stringify(raw);
		} catch (error: any) {
			const statusCode = error?.response?.statusCode ?? error?.statusCode ?? 'unknown';
			const responseBody = error?.response?.body;
			const detail =
				responseBody?.detail ??
				responseBody?.message ??
				(typeof responseBody === 'string' ? responseBody : undefined) ??
				error?.message ??
				'Request failed';
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
		message: string | undefined,
		data: IDataObject | undefined,
		includeDataPart = false,
		sessionId?: string,
	): Promise<IDataObject> {
		const parts: IDataObject[] = [];
		if (typeof message === 'string' && message.trim().length > 0) {
			parts.push({
				kind: 'text',
				text: message,
			});
		}

		if (data && (Object.keys(data).length > 0 || includeDataPart)) {
			parts.push({
				kind: 'data',
				data,
			});
		}

		if (parts.length === 0) {
			parts.push({ kind: 'data', data: {} });
		}

		const payload: IDataObject = {
			role: 'user',
			parts,
		};

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

	async chat(payload: OrdifyChatPayload): Promise<IDataObject> {
		const raw = await this.requestRaw('POST', '/chat', payload);
		const parsed = this.parseSseText(raw);
		return {
			mode: 'sse',
			text: parsed.text,
			chunk_count: parsed.chunks.length,
			chunks: parsed.chunks,
			raw,
		};
	}

	async listAvailableAgents(): Promise<IDataObject> {
		return await this.request<IDataObject>('GET', '/chat/agents');
	}

	async chatWithAgent(agentId: string, payload: OrdifyChatPayload): Promise<IDataObject> {
		const raw = await this.requestRaw('POST', `/chat/agents/${encodeURIComponent(agentId)}`, payload);
		const parsed = this.parseSseText(raw);
		return {
			mode: 'sse',
			agent_id: agentId,
			text: parsed.text,
			chunk_count: parsed.chunks.length,
			chunks: parsed.chunks,
			raw,
		};
	}

	private parseSseText(raw: string): { text: string; chunks: string[] } {
		const chunks: string[] = [];
		let text = '';
		for (const line of raw.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed.startsWith('data:')) continue;
			const payload = trimmed.slice(5).trim();
			if (!payload || payload === '[DONE]') continue;
			try {
				const parsed = JSON.parse(payload);
				const chunkText = parsed?.text;
				if (typeof chunkText === 'string' && chunkText.length > 0) {
					chunks.push(chunkText);
					text += chunkText;
				}
			} catch {
				// Ignore non-JSON SSE lines
			}
		}
		return { text, chunks };
	}

	static getNormalizedJobStatus(statusPayload: IDataObject): string {
		const asObj = statusPayload as IDataObject;
		const statusValue = asObj.status;
		const stateValue = asObj.state;

		if (typeof statusValue === 'string' && statusValue.trim()) {
			return statusValue.trim().toLowerCase();
		}
		if (typeof stateValue === 'string' && stateValue.trim()) {
			return stateValue.trim().toLowerCase();
		}

		if (statusValue && typeof statusValue === 'object') {
			const nested = statusValue as IDataObject;
			const nestedState = nested.state;
			const nestedValue = nested.value;
			if (typeof nestedState === 'string' && nestedState.trim()) {
				return nestedState.trim().toLowerCase();
			}
			if (typeof nestedValue === 'string' && nestedValue.trim()) {
				return nestedValue.trim().toLowerCase();
			}
		}
		if (stateValue && typeof stateValue === 'object') {
			const nested = stateValue as IDataObject;
			const nestedState = nested.state;
			const nestedValue = nested.value;
			if (typeof nestedState === 'string' && nestedState.trim()) {
				return nestedState.trim().toLowerCase();
			}
			if (typeof nestedValue === 'string' && nestedValue.trim()) {
				return nestedValue.trim().toLowerCase();
			}
		}

		if (typeof asObj.final_status === 'string' && asObj.final_status.trim()) {
			return asObj.final_status.trim().toLowerCase();
		}

		return 'unknown';
	}

	static isTerminalStatus(status: string): boolean {
		return [
			'complete',
			'completed',
			'succeeded',
			'success',
			'done',
			'finished',
			'failed',
			'error',
			'cancelled',
			'canceled',
		].includes(status);
	}

	static isSuccessfulTerminalStatus(status: string): boolean {
		return ['complete', 'completed', 'succeeded', 'success', 'done', 'finished'].includes(status);
	}
}
