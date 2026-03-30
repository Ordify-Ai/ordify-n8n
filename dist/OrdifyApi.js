"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdifyApiClient = void 0;
class OrdifyApiClient {
    constructor(ctx, creds) {
        this.ctx = ctx;
        this.creds = creds;
    }
    async request(method, path, body) {
        const url = `${this.creds.baseUrl.replace(/\/+$/, '')}${path}`;
        const options = {
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
            return (await this.ctx.helpers.httpRequest(options));
        }
        catch (error) {
            const statusCode = error?.response?.statusCode ?? error?.statusCode ?? 'unknown';
            const responseBody = error?.response?.body;
            const detail = responseBody?.detail ??
                responseBody?.message ??
                (typeof responseBody === 'string' ? responseBody : undefined) ??
                error?.message ??
                'Request failed';
            throw new Error(`Ordify API ${method} ${path} failed (${statusCode}): ${detail}`);
        }
    }
    async requestRaw(method, path, body) {
        const url = `${this.creds.baseUrl.replace(/\/+$/, '')}${path}`;
        const options = {
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
        }
        catch (error) {
            const statusCode = error?.response?.statusCode ?? error?.statusCode ?? 'unknown';
            const responseBody = error?.response?.body;
            const detail = responseBody?.detail ??
                responseBody?.message ??
                (typeof responseBody === 'string' ? responseBody : undefined) ??
                error?.message ??
                'Request failed';
            throw new Error(`Ordify API ${method} ${path} failed (${statusCode}): ${detail}`);
        }
    }
    async listAvailableCrews() {
        return await this.request('GET', '/a2a/available');
    }
    async getCrewSchema(crewId) {
        return await this.request('GET', `/a2a/${encodeURIComponent(crewId)}`);
    }
    async executeCrew(crewId, message, data, includeDataPart = false, sessionId) {
        const parts = [];
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
        const payload = {
            role: 'user',
            parts,
        };
        if (sessionId) {
            payload.metadata = { session_id: sessionId };
        }
        return await this.request('POST', `/a2a/${encodeURIComponent(crewId)}`, payload);
    }
    async getJobStatus(jobId) {
        return await this.request('GET', `/jobs/${encodeURIComponent(jobId)}`);
    }
    async getJobResult(jobId) {
        return await this.request('GET', `/jobs/${encodeURIComponent(jobId)}/result`);
    }
    async chat(payload) {
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
    async listAvailableAgents() {
        return await this.request('GET', '/chat/agents');
    }
    async chatWithAgent(agentId, payload) {
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
    parseSseText(raw) {
        const chunks = [];
        let text = '';
        for (const line of raw.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:'))
                continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === '[DONE]')
                continue;
            try {
                const parsed = JSON.parse(payload);
                const chunkText = parsed?.text;
                if (typeof chunkText === 'string' && chunkText.length > 0) {
                    chunks.push(chunkText);
                    text += chunkText;
                }
            }
            catch {
                // Ignore non-JSON SSE lines
            }
        }
        return { text, chunks };
    }
    static getNormalizedJobStatus(statusPayload) {
        const asObj = statusPayload;
        const statusValue = asObj.status;
        const stateValue = asObj.state;
        // Common direct string forms: { status: "running" } or { state: "complete" }
        if (typeof statusValue === 'string' && statusValue.trim()) {
            return statusValue.trim().toLowerCase();
        }
        if (typeof stateValue === 'string' && stateValue.trim()) {
            return stateValue.trim().toLowerCase();
        }
        // Nested forms: { status: { state: "working" } } or { state: { value: "complete" } }
        if (statusValue && typeof statusValue === 'object') {
            const nested = statusValue;
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
            const nested = stateValue;
            const nestedState = nested.state;
            const nestedValue = nested.value;
            if (typeof nestedState === 'string' && nestedState.trim()) {
                return nestedState.trim().toLowerCase();
            }
            if (typeof nestedValue === 'string' && nestedValue.trim()) {
                return nestedValue.trim().toLowerCase();
            }
        }
        // Additional hints from some payload shapes
        if (typeof asObj.final_status === 'string' && asObj.final_status.trim()) {
            return asObj.final_status.trim().toLowerCase();
        }
        return 'unknown';
    }
    static isTerminalStatus(status) {
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
    static isSuccessfulTerminalStatus(status) {
        return ['complete', 'completed', 'succeeded', 'success', 'done', 'finished'].includes(status);
    }
}
exports.OrdifyApiClient = OrdifyApiClient;
//# sourceMappingURL=OrdifyApi.js.map