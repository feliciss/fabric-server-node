const express = require('express')
const http = require('http');
const https = require('https');
const app = express()
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const Client = require('../app/client');

const path = require("path");
const fs = require('fs');

// the key and certificate for enabling https protocol
const privateKey = fs.readFileSync('../network/config/privateKey.key', 'utf8');
const certificate = fs.readFileSync('../network/config/certificate.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

let channel;
let proposalBytes;
const client = new Client();

// testing connection
const url = 'http://localhost:7054'
const enrollmentID = 'admin'
const enrollmentSecret = 'adminpw'
const profile = 'tls'
const channelId = 'mychannel';

// config from your ca
const peerCertPath = '/Users/5swind/Downloads/gerrit/hyperledger/fabric-sdk-node/test/fixtures/crypto-material/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp/tlscacerts/tlsca.org1.example.com-cert.pem';
const peerListenAddress = 'grpcs://localhost:7051';
const peerName = 'peer0.org1.example.com';
const ordererCertPath = '/Users/5swind/Downloads/gerrit/hyperledger/fabric-sdk-node/test/fixtures/crypto-material/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem';
const ordererListenAddress = 'grpcs://localhost:7050'
const ordererName = 'orderer.example.com'

// testing proposal
const fcn = 'move'
const args = ['a', 'b', '100']
const chaincodeId = 'end2endnodesdk'
const mspId = 'Org1MSP'
const peerAddress = 'localhost:7051'

app.post('/requestCertificate', async (req, res) => {
    const csr = req.body.content;
    const filename = req.body.name;

    console.debug(csr);
    console.debug(filename);

    try {
        const tlsOptions = {
            trustedRoots: [],
            verify: false
        };
        const caService = client.setupCA(url, tlsOptions);
        const req = {
            enrollmentID: enrollmentID,
            enrollmentSecret: enrollmentSecret,
            profile: profile,
            csr: csr
        };
        const enrollment = await client.enrollWithCA(caService, req);

        client.setTlsClientCertAndKey(enrollment);

        // responsed with enrollment cert
        res.status(200).send(enrollment.certificate);
    } catch (err) {
        // if errored
        res.status(500).json({ error: err.toString() });
    }
})

app.post('/generateUnsignedProposal', async (req, res) => {
    const certPem = req.body.cert;
    console.debug(certPem);

    try {
        channel = client.setupChannel(channelId);

        const peer = client.setupPeer(peerCertPath, peerListenAddress, peerName);
        const orderer = client.setupOrderer(ordererCertPath, ordererListenAddress, ordererName);

        channel.addPeer(peer);
        channel.addOrderer(orderer);

        const transactionProposalReq = {
            fcn: fcn,
            args: args,
            chaincodeId: chaincodeId,
            channelId: channelId,
        };

        const { proposal, txId } = await channel.generateUnsignedProposal(transactionProposalReq, mspId, certPem);
        console.debug(proposal);
        console.debug(txId);

        proposalBytes = proposal.toBuffer();
        res.status(200).send(proposalBytes);
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
})


app.post('/sendSignedProposal', async (req, res) => {
    const signature = req.body.content;
    const filename = req.body.name;

    console.debug(signature);
    console.debug(filename);

    try {
        const signatureBytes = Buffer.from(signature);
        const peer = channel.getPeer(peerAddress);
        const targets = [peer];
        const signedProposal = { signatureBytes, proposal_bytes: proposalBytes }

        const sendSignedProposalReq = { signedProposal, targets };
        const proposalResponses = await channel.sendSignedProposal(sendSignedProposalReq);
        res.status(200).send(proposalResponses);
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(8080);
httpsServer.listen(8081);