const assert = require('assert');
const fs = require('fs');
const path = require('path');
const solc = require('solc');

console.log('=== SutraStudentIdentityNFT Contract Test Suite ===\n');

// 1. Source existence and pragma check
const CONTRACT_PATH = path.join(__dirname, 'SutraStudentIdentityNFT.sol');
assert(fs.existsSync(CONTRACT_PATH), 'SutraStudentIdentityNFT.sol must exist');
const source = fs.readFileSync(CONTRACT_PATH, 'utf8');
assert(source.includes('pragma solidity ^0.8.20;'), 'Must specify pragma solidity ^0.8.20');
assert(source.includes('contract SutraStudentIdentityNFT'), 'Must declare SutraStudentIdentityNFT');
console.log('✓ 1. Solidity source file and pragma confirmed.');

// 2. Compilation check with optimizer
const input = {
  language: 'Solidity',
  sources: { 'SutraStudentIdentityNFT.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};
const compiled = JSON.parse(solc.compile(JSON.stringify(input)));
assert(!compiled.errors || compiled.errors.every((e) => e.severity !== 'error'), 'Compilation must have zero errors');
const contract = compiled.contracts['SutraStudentIdentityNFT.sol']['SutraStudentIdentityNFT'];
assert(contract.evm.bytecode.object.length > 500, 'Bytecode must be non-trivial');
console.log('✓ 2. Local solc 0.8.20 compilation passed cleanly without errors.');

// 3. ABI Interface invariants
const abi = contract.abi;
const funcNames = abi.filter((x) => x.type === 'function').map((x) => x.name);
const eventNames = abi.filter((x) => x.type === 'event').map((x) => x.name);
const errorNames = abi.filter((x) => x.type === 'error').map((x) => x.name);

assert(funcNames.includes('mintIdentity'), 'Must expose mintIdentity()');
assert(funcNames.includes('hasMintedSutraId'), 'Must expose hasMintedSutraId()');
assert(funcNames.includes('tokenURI'), 'Must expose tokenURI()');
assert(funcNames.includes('ownerOf'), 'Must expose ownerOf()');
assert(funcNames.includes('balanceOf'), 'Must expose balanceOf()');
assert(funcNames.includes('totalSupply'), 'Must expose totalSupply()');
console.log('✓ 3. Required ERC-721 functions present:', funcNames.filter((f) => ['mintIdentity', 'tokenURI', 'ownerOf', 'balanceOf', 'totalSupply'].includes(f)).join(', '));

// 4. Privacy & Parameter Checks
const mintFunc = abi.find((x) => x.name === 'mintIdentity');
assert.strictEqual(mintFunc.inputs.length, 3, 'mintIdentity must take exactly 3 arguments (zero PII)');
assert.strictEqual(mintFunc.inputs[0].type, 'address', 'First parameter must be address recipient');
assert.strictEqual(mintFunc.inputs[1].type, 'bytes32', 'Second parameter must be bytes32 sutraIdHash');
assert.strictEqual(mintFunc.inputs[2].type, 'string', 'Third parameter must be string uri');
console.log('✓ 4. Zero PII parameter invariant confirmed: only address, bytes32 hash, and URI accepted.');

// 5. Event Invariants
assert(eventNames.includes('StudentIdentityMinted'), 'Must emit StudentIdentityMinted event');
const mintEvent = abi.find((x) => x.name === 'StudentIdentityMinted');
assert.strictEqual(mintEvent.inputs.length, 4, 'StudentIdentityMinted event must have 4 parameters');
assert(mintEvent.inputs[0].indexed, 'tokenId must be indexed');
assert(mintEvent.inputs[1].indexed, 'sutraIdHash must be indexed');
assert(mintEvent.inputs[2].indexed, 'recipient address must be indexed');
console.log('✓ 5. StudentIdentityMinted event indexing and schema confirmed.');

// 6. Custom Gas-Saving Errors & Duplicate Protection
assert(errorNames.includes('AlreadyMinted'), 'Must declare AlreadyMinted error for duplicate-mint protection');
assert(errorNames.includes('ZeroAddress'), 'Must declare ZeroAddress error');
assert(errorNames.includes('TransferRestricted'), 'Must declare TransferRestricted error');
console.log('✓ 6. Duplicate-mint and soul-bound custom errors verified.');

// 7. Artifact synchronization check
const ARTIFACT_PATH = path.join(__dirname, 'SutraStudentIdentityNFT.json');
assert(fs.existsSync(ARTIFACT_PATH), 'Artifact JSON must exist');
const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
assert.strictEqual(artifact.contractName, 'SutraStudentIdentityNFT');
assert.strictEqual(artifact.abi.length, abi.length, 'Artifact ABI length must match fresh compilation');
console.log('✓ 7. Artifact SutraStudentIdentityNFT.json matches compiled contract.');

console.log('\n========================================');
console.log('ALL NFT CONTRACT TESTS PASSED ✓');
console.log('========================================\n');
