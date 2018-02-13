var solc = require('solc');
var fs = require('fs');
var Web3 = require('web3');
var web3, code, contracts, contract, VotingContract, deployedContract;

web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
code = fs.readFileSync(__dirname + '/../contracts/Sentigraph.sol').toString();
contracts = solc.compile(code, 1);
console.log(contracts);

var inter = contracts.contracts['Sentigraph'].interface.toString();
VotingContract = web3.eth.contract(JSON.parse(contracts.contracts['Sentigraph'].interface))
deployedContract = VotingContract.new({data: contracts.contracts['Sentigraph'].bytecode, from: web3.eth.accounts[0], gas: 4700000});

setTimeout(function(){
	var s = 'exports.config = {ethereum : {"abi": ' + inter + ',  "address": \'' + deployedContract.address.toString() + '\'}};';
	fs.writeFile(__dirname + "/../../config.js", s);
}, 3000);
