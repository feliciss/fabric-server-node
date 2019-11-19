# Fabric Server Node: Hyperledger Fabric server which serves for [Fabric Client Flutter](https://github.com/5sWind/fabric-client-flutter)

Hyperledger Fabric offline signing server built with Node.js and Express.js.

*Note*: this is sibling project that only serves as the backend. Uses it at your own risk.

## Environment Guide

To run this application server, you need to open serve.js and replace with your own settings.

On the client side, you need some inputs to serve the request, for example:

### Setting up Fabric channel ID

```bash
Channel ID: <the unique id for the channel>, etc. mychannel
```

### Setting up Fabric peer or orderer

```bash
Certificate Path: <peer or orderer msp tlscacerts>, etc. .../crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
Listen Address: <peer or orderer listen address>, etc. grpcs://localhost:7050
Name: <the name of the peer or orderer>, etc. orderer.example.com
```

We assume that you are using the temporary test environment such as [fabric-sdk-node](https://github.com/hyperledger/fabric-sdk-node/tree/master) project's `gulp run-end-to-end` command to prepare the test environment for this project.

Otherwise you need to replace the code for your own environment configuration. The code starting from line 22:

```javascript
// testing connection
```

and line 28:

```javascript
// testing proposal
```

## Quick Start

### Install

```javascript
npm i
```

After configuring your local environment, we can go to `service` folder, and run directly. Since the server is constructured for testing currently.

### Run with Node

```javascript
node serve.js
```

All your needs is to configure Node.js environment.
