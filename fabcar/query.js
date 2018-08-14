'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode query
 */

var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');
var fs = require('fs');

//
var fabric_client = new Fabric_Client();

// var options = {                                                                 
//     tls_cert: {                                                                 
// 		pem: fs.readFileSync(path.join(__dirname, './tls') + '/tlsca.org1.example.com-cert.pem').toString(),
// 		//Ordererpem: fs.readFileSync(path.join(__dirname, './tls') + '/tlsca.example.com-cert.pem').toString(),
// 		clientKey: fs.readFileSync(path.join(__dirname, './tls') + '/client.crt').toString(),
// 		clientCert: fs.readFileSync(path.join(__dirname, './tls') + '/client.key').toString(),
// 		clientCa: fs.readFileSync(path.join(__dirname, './tls') + '/ca.crt').toString()
//     }                                                                           
// };
var options = {                                                                 
    tls_cert: {                                                                 
		pem: fs.readFileSync(path.join(__dirname, './tls') + '/tlsca.example.com-cert.pem').toString(),
		Ordererpem: fs.readFileSync(path.join(__dirname, './tls') + '/tlsca.example.com-cert.pem').toString(),
		'request-timeout': 100000,
		'ssl-target-name-override': 'peer0.org1.example.com',
		clientCert: fs.readFileSync(path.join(__dirname, './tls') + '/ca.crt').toString(),
		clientKey: fs.readFileSync(path.join(__dirname, './tls') + '/server.key').toString(),
    }                                                                           
}; 
// setup the fabric network
var channel = fabric_client.newChannel('mychannel');
var peer = fabric_client.newPeer('grpcs://192.168.1.92:7051',{
	"pem": options.tls_cert.pem,
	"ssl-target-name-override" : "peer0.Org1.example.com",
	"request-timeout" :10000,
	  clientKey: options.tls_cert.clientKey,
      clientCert: options.tls_cert.clientCert

});
// channel.clientCert = options.tls_cert.clientCert;
// channel.clientKey = options.tls_cert.clientkey;
channel.addPeer(peer);

//
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Store path:'+store_path);
var tx_id = null;

// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {
	// assign the store to the fabric client
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	// use the same location for the state store (where the users' certificate are kept)
	// and the crypto store (where the users' keys are kept)
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	// get the enrolled user from persistence, this user will sign all requests
	return fabric_client.getUserContext('User1', true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
		console.log('Successfully loaded User1 from persistence');
		member_user = user_from_store;
	} else {
		throw new Error('Failed to get User1.... run registerUser.js');
	}

	// queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
	// queryAllCars chaincode function - requires no arguments , ex: args: [''],
	const request = {
		//targets : --- letting this default to the peers assigned to the channel
		chaincodeId: 'marblesp',
		fcn: 'query',
		args: ['readMarble','marble1']
		
	};

	// send the query proposal to the peer
	return channel.queryByChaincode(request);
}).then((query_responses) => {
	console.log("Query has completed, checking results");
	// query_responses could have more than one  results if there multiple peers were used as targets
	if (query_responses && query_responses.length == 1) {
		if (query_responses[0] instanceof Error) {
			console.error("error from query = ", query_responses[0]);
		} else {
			console.log("Response is ", query_responses[0].toString());
		}
	} else {
		console.log("No payloads were returned from query");
	}
}).catch((err) => {
	console.error('Failed to query successfully :: ' + err);
});
