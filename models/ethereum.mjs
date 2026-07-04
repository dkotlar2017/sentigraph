import fs from 'fs';
import md5 from 'md5';
import { createRequire } from 'module';
import lib from '../libs/functions.js';

const require = createRequire(import.meta.url);
const Web3 = require('web3');
const solc = require('solc');
const { config } = require('../../config.js');

/**
 * Ethereum contract wrapper for storing joy-distance records on-chain.
 */

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
let contractInstance;

/** Attach to the deployed Record contract. */
export function createContract() {
  const RecordContract = web3.eth.contract(config.ethereum.abi);
  contractInstance = RecordContract.at(config.ethereum.address);
  return contractInstance;
}

/** Write a joy-distance reading for the current date bucket. */
export function setData(data, q) {
  const num = lib.getDateForNames();
  contractInstance.addRecord(parseInt(num, 10), q.toString(), { from: web3.eth.accounts[0] });
}

/** Read stored records for a date bucket. */
export function getData(num) {
  const records = contractInstance.searchRecords(parseInt(num, 10));
  return records.toLocaleString();
}

export default { createContract, setData, getData };
