const fs = require('fs');
const path = require('path');
const solc = require('solc');

console.log('Compiling SUTRA contracts with solc', solc.version(), '...');

const contractsToCompile = [
  { file: 'SutraDocumentRegistry.sol', name: 'SutraDocumentRegistry', artifact: 'SutraDocumentRegistry.json' },
  { file: 'SutraStudentIdentityNFT.sol', name: 'SutraStudentIdentityNFT', artifact: 'SutraStudentIdentityNFT.json' },
];

const sources = {};
for (const c of contractsToCompile) {
  const filePath = path.join(__dirname, c.file);
  if (fs.existsSync(filePath)) {
    sources[c.file] = { content: fs.readFileSync(filePath, 'utf8') };
  }
}

const input = {
  language: 'Solidity',
  sources: sources,
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

for (const c of contractsToCompile) {
  if (output.contracts && output.contracts[c.file] && output.contracts[c.file][c.name]) {
    const contract = output.contracts[c.file][c.name];
    const artifact = {
      contractName: c.name,
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
    };
    const artifactPath = path.join(__dirname, c.artifact);
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), 'utf8');
    console.log(`✓ Compiled ${c.name} -> ${c.artifact} (ABI items: ${artifact.abi.length}, bytecode: ${artifact.bytecode.length} chars)`);
    if (c.name === 'SutraDocumentRegistry') {
      const publicContractsDir = path.join(__dirname, '..', 'frontend', 'public', 'contracts');
      fs.mkdirSync(publicContractsDir, { recursive: true });
      fs.writeFileSync(path.join(publicContractsDir, c.artifact), JSON.stringify(artifact, null, 2), 'utf8');
      console.log(`✓ Published public deployment artifact -> frontend/public/contracts/${c.artifact}`);
    }
  }
}

console.log('\nCompilation completed successfully for all contracts.');
