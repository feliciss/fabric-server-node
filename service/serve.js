const port = 8080;
const {app} = require('khala-nodeutils/baseApp').run(port);

const {
	unsignedTransactionProposal, sendSignedProposal,
	unsignedTransaction, sendSignedTransaction,
} = require('khala-fabric-sdk-node/offline/chaincode');
const {
	serializeProposal, deserializeProposal,
	serializeToHex, deserializeFromHex,
	serializeProposalResponse, deserializeProposalResponse,
} = require('khala-fabric-sdk-node/offline/serialize');
const {emptyChannel} = require('khala-fabric-sdk-node/offline/channel');
const EventHub = require('khala-fabric-sdk-node/eventHub');
const PeerUtil = require('khala-fabric-sdk-node/peer');
const OrdererUtil = require('khala-fabric-sdk-node/orderer');

const peerBuilder = config => {
	const {port, host, certificate: pem} = config;
	return PeerUtil.new({peerPort: port, peerHostName: host, host, pem});
};

app.post('/generateUnsignedProposal', async (req, res) => {

	const {channelName, fcn, args, chaincodeId, mspId, certificate} = req.body;

	const {proposal, transactionID} = unsignedTransactionProposal(channelName, {
		chaincodeId,
		fcn,
		args
	}, mspId, certificate);
	const {bytes: proposalBytes, proposal: proposalHex} = serializeProposal(proposal);

	const result = {
		proposal_bytes: serializeToHex(proposalBytes),
		proposal: proposalHex,
		transactionID
	};

	res.status(200).json(result);
});


app.post('/sendSignedProposal', async (req, res) => {
	const {signature: signatureHex, proposal_bytes: proposalBytesHex, peers: peerConfigs} = req.body;

	const signedProposal = {
		signature: deserializeFromHex(signatureHex),
		proposal_bytes: deserializeFromHex(proposalBytesHex)
	};
	const peers = peerConfigs.map(peerBuilder);


	const proposalResponses = await sendSignedProposal(peers, signedProposal);


	for (const proposalResponse of proposalResponses) {
		if (proposalResponse instanceof Error) {
			throw proposalResponse;
		}
	}
	const result = {
		proposalResponses: proposalResponses.map(serializeProposalResponse)
	};

	res.status(200).json(result);
});

app.post('/generateUnsignedTransaction', async (req, res) => {
	const {proposalResponses: proposalResponsesHex, channelName, proposal: proposalHex} = req.body;
	const proposalResponses = proposalResponsesHex.map(deserializeProposalResponse);
	const unsignedTransaction = unsignedTransaction(channelName, proposalResponses, deserializeProposal(proposalHex));

	const result = {
		unsignedTransaction: serializeToHex(unsignedTransaction.toBuffer())
	};
	res.status(200).json(result);
});

app.post('/sendSignedTransaction', async (req, res) => {
	const {signature: signatureHex, proposal_bytes: proposalBytesHex, orderer: ordererConfig} = req.body;

	const signedTransaction = {
		signature: deserializeFromHex(signatureHex),
		proposal_bytes: deserializeFromHex(proposalBytesHex)
	};
	const {port, host, certificate: pem} = ordererConfig;
	const orderer = OrdererUtil.new({ordererPort: port, pem, ordererHostName: host, host});
	const response = await sendSignedTransaction(signedTransaction, orderer);
	const result = {
		broadcastResponse: response
	};
	res.status(200).json(result);
});
app.post('/generateUnsignedRegistration', async (req, res) => {
	const {channelName, peer: peerConfig, mspId, certificate} = req.body;
	const peer = peerBuilder(peerConfig);
	const channel = emptyChannel(channelName);
	const eventHub = new EventHub(channel, peer);
	const unsignedEvent = eventHub.unsignedRegistration(certificate, mspId);
	const result = {
		unsignedEvent: serializeToHex(unsignedEvent)
	};
	res.status(200).json(result);
});
app.post('/registerTxEvent', async (req, res) => {
	const {signature: signatureHex, payload: payloadHex, channelName, transactionID, peer: peerConfig} = req.body;

	const signedEvent = {
		signature: deserializeFromHex(signatureHex),
		payload: deserializeFromHex(payloadHex)
	};

	const peer = peerBuilder(peerConfig);
	const channel = emptyChannel(channelName);
	const eventHub = new EventHub(channel, peer);
	await eventHub.connect({signedEvent});
	const result = await new Promise((resolve, reject) => {
		eventHub.txEvent({transactionID}, undefined, (tx, code, blockNum) => {
			resolve({tx, code, blockNum});
		}, (err) => {
			reject(err);
		});
	});
	res.status(200).json(result);

});