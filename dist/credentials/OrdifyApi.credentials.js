"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdifyApi = void 0;
class OrdifyApi {
    constructor() {
        this.name = 'ordifyApi';
        this.displayName = 'Ordify API';
        this.properties = [
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
}
exports.OrdifyApi = OrdifyApi;
//# sourceMappingURL=OrdifyApi.credentials.js.map