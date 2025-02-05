'use strict';
const MCMStateModel = require('../../../lib/model/MCMStateModel');
const hubCertsResource = require('./resources/hubCerts');
const { HubCertificateModel } = require('@pm4ml/mcm-client');

describe('MCMState Model:', () => {

    class Logger {
        constructor() {}

        push() {
            return new Logger();
        }
        async log() {
        }
    }

    const logger = new Logger();

    class Vault {
        constructor(dfspCA, dfspKey) {
            this.dfspCA = dfspCA;
            this.dfspKey = dfspKey;
        }

        async signHubCSR() {
            return { certificate: '' };
        }

        async setClientCert() {

        }

        async createClientCSR() {

        }

        async getSSLCerts() {
            return this.dfspCA;
        }
    }


    class Cache {
        constructor() {}

        get() {
            return '';
        }
    }

    const mockCache = new Cache();

    const mockDB = {redisCache: mockCache};

    afterEach( () => {
        jest.clearAllMocks();
    });

    describe('download Hub csr, sign and create certificate, upload it to mcm', () => {

        test('when outbound enrollment list from mcm comes empty then it does not call upload', async () => {

            const vault = new Vault('MOCK CA', 'MOCK KEY');
            const mcmState = new MCMStateModel({
                dfspId: 'dfsptest',
                hubEndpoint: 'localhost',
                refreshIntervalSeconds: 1000,
                mojaloopConnectorFQDN: 'connector.example.com',
                vault,
                logger,
                db: mockDB
            });

            const getCertificatesSpy = jest.spyOn(HubCertificateModel.prototype, 'getUnprocessedCerts')
                .mockImplementation(() => []);

            const uploadServerCertificateSpy = jest.spyOn(HubCertificateModel.prototype, 'uploadServerCertificate')
                .mockImplementation(() => []);

            await mcmState.hubCSRExchangeProcess();

            expect(getCertificatesSpy).toHaveBeenCalledTimes(1);

            expect(uploadServerCertificateSpy).toHaveBeenCalledTimes(0);

        });

        test('when outbound enrollment list comes with one csr in CSR_LOADED state and there is no DFSP CA then fails', async () => {

            const vault = new Vault(null, 'MOCK KEY');

            const mcmState = new MCMStateModel({
                dfspId: 'dfsptest',
                hubEndpoint: 'localhost',
                refreshIntervalSeconds: 1000,
                mojaloopConnectorFQDN: 'connector.example.com',
                vault,
                logger,
                db: mockDB
            });

            const getCertificatesSpy = jest.spyOn(HubCertificateModel.prototype, 'getUnprocessedCerts')
                .mockImplementation(() => hubCertsResource.csrLoadedCertList);

            await mcmState.hubCSRExchangeProcess();

            expect(getCertificatesSpy).toHaveBeenCalledTimes(1);
        });

        test('when outbound enrollment list comes with one csr in CSR_LOADED and there is one DFSP CA then sign and upload', async () => {

            const vault = new Vault('MOCK CA', 'MOCK KEY');

            const mcmState = new MCMStateModel({
                dfspId: 'dfsptest',
                hubEndpoint: 'localhost',
                refreshIntervalSeconds: 1000,
                mojaloopConnectorFQDN: 'connector.example.com',
                vault,
                logger,
                db: mockDB
            });

            const getCertificatesSpy = jest.spyOn(HubCertificateModel.prototype, 'getUnprocessedCerts')
                .mockImplementation(() => hubCertsResource.csrLoadedCertList);

            const uploadServerCertificateSpy = jest.spyOn(HubCertificateModel.prototype, 'uploadServerCertificate')
                .mockImplementation(() => []);

            await mcmState.hubCSRExchangeProcess();

            expect(getCertificatesSpy).toHaveBeenCalledTimes(1);

            expect(uploadServerCertificateSpy).toHaveBeenCalledTimes(1);

            const certificateToUpload = uploadServerCertificateSpy.mock.calls[0][0];

            expect(certificateToUpload.enId).toStrictEqual(11);

        });
    });

});
