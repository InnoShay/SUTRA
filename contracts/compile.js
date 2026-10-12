const fs = require('fs');
const path = require('path');
const solc = require('solc');

const CONTRACT_PATH = path.join(__dirname, 'SutraDocumentRegistry.sol');
const ARTIFACT_PATH = path.join(__dirname, 'SutraDocumentRegistry.json');

console.log('Compiling SutraDocumentRegistry.sol with solc', solc.version(), '...');

const source = fs.readFileSync(CONTRACT_PATH, 'utf8');
const input = {
  language: 'Solidity',
  sources: {
    'SutraDocumentRegistry.sol': {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === 'error');
  if (fatal.length > 0) {
    console.error('Compilation failed with errors:');
    fatal.forEach((e) => console.error(e.formattedMessage || e.message));
    process.exit(1);
  }
  const warnings = output.errors.filter((e) => e.severity === 'warning');
  if (warnings.length > 0) {
    console.warn('Warnings encountered:');
    warnings.forEach((w) => console.warn(w.formattedMessage || w.message));
  }
}

const contract = output.contracts['SutraDocumentRegistry.sol']['SutraDocumentRegistry'];
const artifact = {
  contractName: 'SutraDocumentRegistry',
  abi: contract.abi,
  bytecode: contract.evm.bytecode.object,
};

fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(artifact, null, 2), 'utf8');

console.log('Compilation succeeded! Artifact written to SutraDocumentRegistry.json');
console.log('ABI items:', artifact.abi.length);
console.log('Bytecode length:', artifact.bytecode.length, 'hex chars');
