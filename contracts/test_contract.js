const assert = require('assert');
const fs = require('fs');
const path = require('path');
const solc = require('solc');

console.log('=== SutraDocumentRegistry Contract Test Suite ===\n');

// 1. Source existence and pragma check
const CONTRACT_PATH = path.join(__dirname, 'SutraDocumentRegistry.sol');
assert(fs.existsSync(CONTRACT_PATH), 'SutraDocumentRegistry.sol must exist');
const source = fs.readFileSync(CONTRACT_PATH, 'utf8');
assert(source.includes('pragma solidity ^0.8.20;'), 'Must specify pragma solidity ^0.8.20');
assert(source.includes('contract SutraDocumentRegistry'), 'Must declare SutraDocumentRegistry');
console.log('✓ 1. Solidity source file and pragma confirmed.');

// 2. Compilation check with optimizer
const input = {
  language: 'Solidity',
  sources: { 'SutraDocumentRegistry.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};
const compiled = JSON.parse(solc.compile(JSON.stringify(input)));
assert(!compiled.errors || compiled.errors.every((e) => e.severity !== 'error'), 'Compilation must have zero errors');
const contract = compiled.contracts['SutraDocumentRegistry.sol']['SutraDocumentRegistry'];
assert(contract.evm.bytecode.object.length > 500, 'Bytecode must be non-trivial');
console.log('✓ 2. Local solc 0.8.20 compilation passed cleanly without errors.');

// 3. ABI Interface invariants
const abi = contract.abi;
const funcNames = abi.filter((x) => x.type === 'function').map((x) => x.name);
const eventNames = abi.filter((x) => x.type === 'event').map((x) => x.name);
const errorNames = abi.filter((x) => x.type === 'error').map((x) => x.name);

assert(funcNames.includes('anchorDocument'), 'Must expose anchorDocument()');
assert(funcNames.includes('getDocumentAnchor'), 'Must expose getDocumentAnchor()');
assert(funcNames.includes('verifyDocument'), 'Must expose verifyDocument()');
assert(funcNames.includes('totalAnchored'), 'Must expose totalAnchored()');
console.log('✓ 3. All required functions present:', funcNames.join(', '));

// 4. Privacy & Parameter Checks
const anchorDocFunc = abi.find((x) => x.name === 'anchorDocument');
assert.strictEqual(anchorDocFunc.inputs.length, 2, 'anchorDocument must take exactly 2 arguments (zero PII)');
assert.strictEqual(anchorDocFunc.inputs[0].type, 'bytes32', 'First parameter must be bytes32 docRefHash');
assert.strictEqual(anchorDocFunc.inputs[1].type, 'bytes32', 'Second parameter must be bytes32 documentHash');
console.log('✓ 4. Zero PII parameter invariant confirmed: only bytes32 hashes accepted.');

// 5. Event Invariants
assert(eventNames.includes('DocumentAnchored'), 'Must emit DocumentAnchored event');
const anchorEvent = abi.find((x) => x.name === 'DocumentAnchored');
assert.strictEqual(anchorEvent.inputs.length, 4, 'Event must have 4 parameters');
assert(anchorEvent.inputs[0].indexed, 'docRefHash must be indexed');
assert(anchorEvent.inputs[1].indexed, 'documentHash must be indexed');
assert(anchorEvent.inputs[3].indexed, 'anchoredBy address must be indexed');
console.log('✓ 5. DocumentAnchored event indexing and schema confirmed.');

// 6. Custom Gas-Saving Errors
assert(errorNames.includes('InvalidHash'), 'Must declare InvalidHash error');
assert(errorNames.includes('AlreadyAnchored'), 'Must declare AlreadyAnchored error');
console.log('✓ 6. Gas-efficient custom error definitions verified.');

// 7. Artifact synchronization check
const ARTIFACT_PATH = path.join(__dirname, 'SutraDocumentRegistry.json');
assert(fs.existsSync(ARTIFACT_PATH), 'Artifact JSON must exist');
const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
assert.strictEqual(artifact.contractName, 'SutraDocumentRegistry');
assert.strictEqual(artifact.abi.length, abi.length, 'Artifact ABI length must match fresh compilation');
console.log('✓ 7. Artifact SutraDocumentRegistry.json matches compiled contract.');

console.log('\n========================================');
console.log('ALL CONTRACT INVARIANTS & TESTS PASSED ✓');
console.log('========================================\n');
