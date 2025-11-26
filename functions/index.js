const express = require('express');
const admin = require('firebase-admin');
const { onRequest } = require("firebase-functions/v2/https");
const functions = require('firebase-functions');
const logger = require("firebase-functions/logger");
const cors = require('cors');
const fs = require('fs');
const bs58 = require('bs58').default;
const { Connection, clusterApiUrl, PublicKey } = require("@solana/web3.js");
const { createNoopSigner, publicKey, createSignerFromKeypair, signerIdentity } = require('@metaplex-foundation/umi');
const { verifyCollectionV1, findMetadataPda, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { base64 } = require('@metaplex-foundation/umi/serializers');
const instructionMap = require('./instructionMap.json');

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const secretKey = JSON.parse(fs.readFileSync('./collection_KeyPair.json', 'utf8')); //this have to be modified to use .env for production
const umi = createUmi(clusterApiUrl('devnet'))
let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
const signer = createSignerFromKeypair(umi, keypair);
umi.use(mplTokenMetadata()).use(signerIdentity(signer));


admin.initializeApp();
const db = admin.firestore();
const LAST_SIGNATURE_DOC = "settings/lastSignature";
const ACTIVE_LISTINGS_COLLECTION = "activeListings";


async function getLastSignatureFromDb() {
    const doc = await db.doc(LAST_SIGNATURE_DOC).get();
    return doc.exists ? doc.data().lastSignature : null;
}


// async function setLastSignatureToDb(signature) {
//     await db.doc(LAST_SIGNATURE_DOC).set({ lastSignature: signature });
// }


function identifyInstructionWithRoles(dataBase58, accountKeys) {
    const dataBytes = bs58.decode(dataBase58);
    // Extract the discriminator (first 8 bytes)
    const discriminatorBytes = dataBytes.slice(0, 8); // Get the first 8 bytes
    const discriminatorHex = Array.from(discriminatorBytes)
        .map(byte => byte.toString(16).padStart(2, '0')) // Convert each byte to a 2-character hex
        .join('');
    // Lookup the instruction in the mapping table
    const instructionInfo = instructionMap[discriminatorHex];
    if (!instructionInfo) {
        return { instruction: 'Unknown Instruction', accounts: [] };
    }
    // Map accounts to roles
    const accountsWithRoles = instructionInfo.accounts.map((accountMeta, index) => ({
        role: accountMeta.name,
        publicKey: accountKeys[index],
    }));
    return {
        instruction: instructionInfo.name,
        accounts: accountsWithRoles,
    };
}


// async function updateActiveListingsToDb(dbChanges) {
//     const batch = db.batch(); // Use Firestore batch for atomic operations.
//     for (const [receiptPublicKey, change] of Object.entries(dbChanges)) {
//         const docRef = db.collection(ACTIVE_LISTINGS_COLLECTION).doc(receiptPublicKey);

//         if (change === 1) {
//             // Add receipt address (set a document with a dummy field or timestamp)
//             batch.set(docRef, {});
//         } else if (change === -1) {
//             // Remove receipt address
//             batch.delete(docRef);
//         }
//     }
//     // Commit the batch update
//     await batch.commit();
//     console.log("Database successfully updated with changes:", dbChanges);
// }


async function parseTransaction(transaction, dbChanges) {
    console.log("in parsing");
    let instructionWithRoles = [];
    for (const instruction of transaction.transaction.message.instructions) {
        if (instruction.programId.toString() === 'hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk') {
            instructionWithRoles.push(identifyInstructionWithRoles(instruction.data, instruction.accounts));
        }
    }
    if (instructionWithRoles.length > 0) {
        if (instructionWithRoles[0].instruction === "sell" && instructionWithRoles[1].instruction === "print_listing_receipt") {
            for (const account of instructionWithRoles[1].accounts) {
                if (account.role === "receipt") {
                    if (account.publicKey.toString() in dbChanges) {
                        dbChanges[account.publicKey.toString()] += 1;
                    }
                    else {
                        dbChanges[account.publicKey.toString()] = 1;
                    }
                    console.log("receipt: " + account.publicKey.toString());
                }
            }
        }
        else if (instructionWithRoles[0].instruction === "cancel" && instructionWithRoles[1].instruction === "cancel_listing_receipt") {
            console.log("it is a cancel");
            for (const account of instructionWithRoles[1].accounts) {
                if (account.role === "receipt") {
                    if (account.publicKey.toString() in dbChanges) {
                        dbChanges[account.publicKey.toString()] -= 1;
                    }
                    else {
                        dbChanges[account.publicKey.toString()] = -1;
                    }
                    console.log("receipt: " + account.publicKey.toString());
                }
            }
        }
        else if (instructionWithRoles[0].instruction === "buy" && instructionWithRoles[1].instruction === "print_bid_receipt"
            && instructionWithRoles[2].instruction === "execute_sale" && instructionWithRoles[3].instruction === "print_purchase_receipt") {
            console.log("it is a buy");
            for (const account of instructionWithRoles[3].accounts) {
                if (account.role === "listingReceipt") {
                    if (account.publicKey.toString() in dbChanges) {
                        dbChanges[account.publicKey.toString()] -= 1;
                    }
                    else {
                        dbChanges[account.publicKey.toString()] = -1;
                    }
                    console.log("receipt: " + account.publicKey.toString());
                }
            }
        }
        else {
            console.log("unknown instruction");
        }
    }
}


async function getActiveListingsFromDb() {
    const snapshot = await db.collection(ACTIVE_LISTINGS_COLLECTION).get();
    return snapshot.docs.map(doc => doc.id);
}


async function updateActiveListingsAndLastSignature(dbChanges, signature) {
    const batch = db.batch();

    // Update active listings
    for (const [receiptPublicKey, change] of Object.entries(dbChanges)) {
        const docRef = db.collection(ACTIVE_LISTINGS_COLLECTION).doc(receiptPublicKey);
        if (change === 1) {
            batch.set(docRef, {}); // you can add a dummy field or timestamp if needed
        } else if (change === -1) {
            batch.delete(docRef);
        }
    }

    // Update the last signature document in the same batch
    const lastSignatureDocRef = db.doc(LAST_SIGNATURE_DOC);
    batch.set(lastSignatureDocRef, { lastSignature: signature.signature });

    // Commit the batch atomically
    await batch.commit();
    console.log("Database updated atomically with changes:", dbChanges, "and lastSignature:", signature.signature);
}


const AH_ADDRESS = new PublicKey("DL2iSuy2oTD7HpfhChGai4nahMyGKW9r1vWy5W8CWMQe"); //this have to be modified to use .env for production
const FIRST_SIGNATURE = "5D5rTXjmukB9ScuR3WtakZDGEZXRhkAHGhS6v5jAbEoH9Emfxj9pR5YusmJ9E3F6NkhZohPcXso1qzyA7pa1D2tU"; //this have to be modified to use .env for production
async function parseInstructionsAndUpdateDb() {
    let lastSignature = await getLastSignatureFromDb();
    if (!lastSignature) {
        lastSignature = FIRST_SIGNATURE;
    }
    let signatures = await connection.getSignaturesForAddress(AH_ADDRESS, { until: lastSignature });
    if (signatures.length === 0) {
        console.log("no new signatures");
        return;
    }
    signatures.reverse();
    for (const signature of signatures) {
        let dbChanges = {};
        const transaction = await connection.getParsedTransaction(signature.signature);
        await parseTransaction(transaction, dbChanges);
        console.log(dbChanges);
        await updateActiveListingsAndLastSignature(dbChanges, signature);
    }
}


// async function logActiveListings() {
//     const activeListings = await getActiveListingsFromDb();
//     console.log(activeListings);
// }
//this is for testing, remove this after testing
// exports.logActiveListings = functions.pubsub.schedule('every 10 minutes').onRun(async (context) => {
//     try {
//         await logActiveListings();
//         logger.info('Successfully logged active listings.');
//     } catch (error) {
//         logger.error('Error logging active listings:', error);
//     }
// });

// async function setLastSignatureToNull() {
//     await db.doc(LAST_SIGNATURE_DOC).set({ lastSignature: null });
// }
//this is for testing, to clear the last signature, remove this after testing
// exports.setLastSignatureToNull = functions.pubsub.schedule('every 10 minutes').onRun(async (context) => {
//     try {
//         await setLastSignatureToNull();
//         logger.info('Successfully set last signature to null.');
//     } catch (error) {
//         logger.error('Error setting last signature to null:', error);
//     }
// });

exports.parseInstructionsAndUpdateDb = functions.runWith({
    timeoutSeconds: 270, // Set a timeout (max 540s)
    memory: '512MB', // Increase memory if needed
    maxInstances: 1 // Ensures only 1 instance runs at a time
}).pubsub.schedule('every 5 minutes').onRun(async () => {
    try {
        await parseInstructionsAndUpdateDb();
        logger.info('Successfully parsed auction house instructions and updated to DB.');
    } catch (error) {
        logger.error('Error parsing auction house instructions:', error);
    }
});


const app = express();
app.use(cors());
app.use(express.json());
// Middleware to log requests
app.use((req, res, next) => {
    logger.info(`Request: ${req.method} ${req.url}`);
    next();
});


app.post('/api/nft/verify', async (req, res) => {
    const { mint, userPublickey } = req.body;
    if (!mint) {
        return res.status(400).json({ status: 'error', message: 'mint is required' });
    }
    else if (!userPublickey) {
        return res.status(400).json({ status: 'error', message: 'userPublickey is required' });
    }
    try {
        console.log("in verify");
        const metadata = await findMetadataPda(umi, { mint: publicKey(mint) });
        const metadataPublicKey = publicKey(metadata[0]);
        const collectionMintPublicKey = publicKey('EEgojeZwhAZrS4xH5sq82CQpG4nicvhz7fhJmmA6kZY4');

        let txBuilder = await verifyCollectionV1(umi, {
            metadata: metadataPublicKey,
            collectionMint: collectionMintPublicKey,
            authority: signer
        });
        //console.log(txBuilder);
        const frontendSigner = createNoopSigner(publicKey(userPublickey));
        txBuilder = txBuilder.setFeePayer(frontendSigner);
        const tx = await txBuilder.buildAndSign(umi);
        //console.log(tx);
        const serializedTx = umi.transactions.serialize(tx);
        //console.log(serializedTx);
        const serializedTxAsString = base64.deserialize(serializedTx)[0];
        //console.log(serializedTxAsString);
        //const result = await txBuilder.sendAndConfirm(umi, {send:{skipPreflight:true}});
        //console.log(result);

        res.json({ status: 'success', serializedTxAsString: serializedTxAsString });
    } catch (error) {
        console.error('Error verifying NFT:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

app.get('/api/nft/activeListings', async (req, res) => {
    try {
        const activeListings = await getActiveListingsFromDb();
        res.json({ status: 'success', activeListings: activeListings });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});


exports.api = onRequest(app);
