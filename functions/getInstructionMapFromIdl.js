const fs = require('fs');
const crypto = require('crypto');
const instructionMap = {};

function camelToUnderscore(input) {
    return input.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}


function loadInstructionMap(idlPath) {
    console.log("in loadInstructionMap");
    const idlContent = fs.readFileSync(idlPath, 'utf-8');
    const idl = JSON.parse(idlContent);
    // Build the mapping table
    idl.instructions.forEach(instruction => {
        // Compute discriminator (SHA-256 hash of "global:<instruction_name>")
        const hash = crypto.createHash('sha256').update(`global:${camelToUnderscore(instruction.name)}`).digest();
        const discriminator = hash.slice(0, 8).toString('hex');

        //console.log("discriminator: ", discriminator);
        // Store instruction name and account metadata
        instructionMap[discriminator] = {
            name: camelToUnderscore(instruction.name),
            accounts: instruction.accounts, // Account roles from IDL
        };
    });
    console.log(JSON.stringify(instructionMap, null, 2));
    console.log("done!");
}


async function initialize() {
    await loadInstructionMap('./auction_house_idl.json');
}


initialize().catch(error => {
    console.error("Error loading instruction map:", error);
});