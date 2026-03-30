"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdifyApi = void 0;
const shared_1 = require("../utils/shared");
class OrdifyApi {
    constructor() {
        this.name = 'ordifyApi';
        this.displayName = 'Ordify API';
        this.icon = 'file:Ordify_icon_transparent.png';
        this.documentationUrl = 'https://ordify.ai';
        this.properties = [
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: shared_1.ORDIFY_DEFAULT_BASE_URL,
                placeholder: shared_1.ORDIFY_DEFAULT_BASE_URL,
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
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    'api-key': '={{$credentials.apiKey}}',
                },
            },
        };
        this.test = {
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
}
exports.OrdifyApi = OrdifyApi;
//# sourceMappingURL=OrdifyApi.credentials.js.map