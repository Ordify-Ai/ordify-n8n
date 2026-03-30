import { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';
export declare class OrdifyApi implements ICredentialType {
    name: string;
    displayName: string;
    icon: "file:Ordify_icon_transparent.png";
    documentationUrl: string;
    properties: INodeProperties[];
    authenticate: IAuthenticateGeneric;
    test: ICredentialTestRequest;
}
