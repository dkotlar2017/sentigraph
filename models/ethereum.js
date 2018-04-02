const Web3 = require('web3');
const solc = require('solc');
const md5 = require('md5')
const fs = require('fs');
const config = require(__dirname + "/../../config.js").config;
var contractInstance;
const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
const lib = require(__dirname + "/../libs/functions.js");

exports.createContract = function(){
	var deployedContract,
	RecordContract;

	RecordContract = web3.eth.contract(config.ethereum.abi);
	contractInstance = RecordContract.at(config.ethereum.address);

	return contractInstance;
};

exports.setData = function(data, q) {
	var num = lib.getDateForNames();

	contractInstance.addRecord(parseInt(num), q.toString(), {from: web3.eth.accounts[0]});
};

exports.getData = function(num) {
	var x = contractInstance.searchRecords(parseInt(num));
	return x.toLocaleString();
};
