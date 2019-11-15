const FabricClient = require('fabric-client');
const FabricCAService = require('fabric-ca-client');

const path = require("path");
const fs = require('fs');

// Client for interacting with Hyperledger Fabric
const Client = class {

    // construct a client
    constructor() {
        this._client = new FabricClient();
    }

    // setup CA by url and tlsoptions
    setupCA(url, tlsOptions) {
        const caService = new FabricCAService(url, tlsOptions);
        return caService;
    }

    // enroll an identity with Fabric CA 
    async enrollWithCA(caService, req) {
        const enrollment = await caService.enroll(req);
        return enrollment;
    }

    // setup TLS client cert and key by enrollment
    setTlsClientCertAndKey(enrollment) {
        this._client.setTlsClientCertAndKey(enrollment.certificate, enrollment.key.toBytes());
    };

    // setup channel by channel id
    setupChannel(channelId) {
        const channel = this._client.newChannel(channelId);
        return channel;
    }

    // setup peer by cert path, peer listen address, and peer name
    setupPeer(certPath, listenAddress, name) {
        const peerTLSCertPath = path.resolve(__dirname, certPath);
        const peerPEMCert = fs.readFileSync(peerTLSCertPath, 'utf8');
        const peer = this._client.newPeer(
            listenAddress,
            {
                pem: peerPEMCert,
                'ssl-target-name-override': name,
            }
        );
        return peer;
    }

    // setup orderer by cert path, orderer listen address, and orderer name
    setupOrderer(certPath, listenAddress, name) {
        const ordererTLSCertPath = path.resolve(__dirname, certPath);
        const ordererPEMCert = fs.readFileSync(ordererTLSCertPath, 'utf8');
        const orderer = this._client.newOrderer(
            listenAddress,
            {
                pem: ordererPEMCert,
                'ssl-target-name-override': name,
            }
        );
        return orderer;
    }
}

module.exports = Client;