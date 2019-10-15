const Client = require('fabric-client');

const CryptoKit = class {

    constructor(setting) {
        this._cryptoSuite = Client.newCryptoSuite(setting);
    }

    initStore(obj) {
        this._cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore(obj));
    }

    async genKey(opts) {
        const key = await this._cryptoSuite.generateKey(opts);
        return key;
    }

    async signKey(key, digest) {
        const sig = this._cryptoSuite.sign(key, this._cryptoSuite.hash(digest));
        return sig;
    }

    async verifyKey(key, sig, digest) {
        const verified = this._cryptoSuite.verify(key, sig, digest);
        return verified;
    }
}

module.exports = CryptoKit;