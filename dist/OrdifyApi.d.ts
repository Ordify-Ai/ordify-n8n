import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
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
export declare class OrdifyApiClient {
    private readonly ctx;
    private readonly creds;
    constructor(ctx: IExecuteFunctions, creds: OrdifyCredentials);
    private request;
    private requestRaw;
    listAvailableCrews(): Promise<IDataObject[]>;
    getCrewSchema(crewId: string): Promise<IDataObject>;
    executeCrew(crewId: string, message: string | undefined, data: IDataObject | undefined, includeDataPart?: boolean, sessionId?: string): Promise<IDataObject>;
    getJobStatus(jobId: string): Promise<IDataObject>;
    getJobResult(jobId: string): Promise<IDataObject>;
    chat(payload: OrdifyChatPayload): Promise<IDataObject>;
    listAvailableAgents(): Promise<IDataObject>;
    chatWithAgent(agentId: string, payload: OrdifyChatPayload): Promise<IDataObject>;
    private parseSseText;
    static getNormalizedJobStatus(statusPayload: IDataObject): string;
    static isTerminalStatus(status: string): boolean;
    static isSuccessfulTerminalStatus(status: string): boolean;
}
