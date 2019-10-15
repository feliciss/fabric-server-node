const express = require('express')
const http = require('http');
const https = require('https');
const app = express()
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const Client = require('../app/client');

const fs = require('fs');

// the key and certificate for enabling https protocol
const privateKey = fs.readFileSync('../network/config/privateKey.key', 'utf8');
const certificate = fs.readFileSync('../network/config/certificate.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

let proposalBytes;
const client = new Client();

// testing connection
const url = 'https://localhost:7054'
const enrollmentID = 'admin'
const enrollmentSecret = 'adminpw'
const profile = 'tls'

// testing proposal
const fcn = 'move'
const args = ['a', 'b', '100']
const chaincodeId = 'end2endnodesdk'
const mspId = 'Org1MSP'
const peerAddress = 'localhost:7051'
const channelId = 'mychannel';

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

app.get('/setupChannel', async (req, res) => {
    const channelId = req.query.id;
    console.debug(channelId);

    try {
        client.setupChannel(channelId);
        res.status(200).send("channel setup success");
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
})

app.get('/setupPeer', async (req, res) => {
    const peerCertPath = req.query.cert;
    const peerListenAddress = req.query.address;
    const peerName = req.query.name;
    console.debug(peerCertPath);
    console.debug(peerListenAddress);
    console.debug(peerName);

    try {
        const peer = client.setupPeer(peerCertPath, peerListenAddress, peerName);
        const channel = client.getChannel();
        channel.addPeer(peer);
        res.status(200).send("Successfully added peer to channel: " + channel._name);
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
})

app.get('/setupOrderer', async (req, res) => {
    const ordererCertPath = req.query.cert;
    const ordererListenAddress = req.query.address;
    const ordererName = req.query.name;
    console.debug(ordererCertPath);
    console.debug(ordererListenAddress);
    console.debug(ordererName);

    try {
        const orderer = client.setupOrderer(ordererCertPath, ordererListenAddress, ordererName);
        const channel = client.getChannel();
        channel.addOrderer(orderer);
        res.status(200).send("Successfully added orderer to channel: " + channel._name);
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
})

app.post('/generateUnsignedProposal', async (req, res) => {
    const certPem = req.body.cert;
    console.debug(certPem);

    try {
        const transactionProposalReq = {
            fcn: fcn,
            args: args,
            chaincodeId: chaincodeId,
            channelId: channelId,
        };

        const channel = client.getChannel();
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
        const signatureBytes = Buffer.from(signature, 'hex');
        const channel = client.getChannel();
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