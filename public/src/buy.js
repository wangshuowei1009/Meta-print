import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WebIrys } from '@irys/sdk';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata, createNft, fetchAllDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import { base64 } from '@metaplex-foundation/umi/serializers';
import { Metaplex, createListingBuilder, sol, walletAdapterIdentity as metaplexWalletAdapterIdentity } from "@metaplex-foundation/js";

const network_using = WalletAdapterNetwork.Devnet;
const endpoint = clusterApiUrl(network_using);

const wallet = new PhantomWalletAdapter();
const connection = new Connection(endpoint);
const umi = await createUmi(endpoint).use(web3JsRpc(connection)).use(walletAdapterIdentity(wallet)).use(mplTokenMetadata());

//const BASE_URL = 'http://127.0.0.1:5001/metaprint2-6/us-central1/api';
const BASE_URL = '';

const metaplex = new Metaplex(connection);
metaplex.use(metaplexWalletAdapterIdentity(wallet));
const AH_ADDRESS = new PublicKey("DL2iSuy2oTD7HpfhChGai4nahMyGKW9r1vWy5W8CWMQe");
const AH = await metaplex.auctionHouse().findByAddress({ address: AH_ADDRESS });
const COLLECTION_ADDRESS = "EEgojeZwhAZrS4xH5sq82CQpG4nicvhz7fhJmmA6kZY4"



const getWebIrys = async () => {
    await wallet.connect();
    const provider = wallet;
    const network = "devnet"; // Ensure this is "devnet"
    const token = "solana";
    const rpcUrl = clusterApiUrl('devnet'); // Ensure the RPC URL is for Devnet
    const walletObject = { rpcUrl: rpcUrl, name: "solana", provider: provider };
    const webIrys = new WebIrys({ network, token, wallet: walletObject });
    await webIrys.ready();

    return webIrys;
};


const checkBalance = async () => {
    try {
        const balance = await connection.getBalance(wallet.publicKey);
        console.log(`Wallet balance: ${balance / 1e9} SOL`);
        alert(`Wallet balance: ${balance / 1e9} SOL`);
    } catch (error) {
        console.error('Failed to get wallet balance:', error);
    }
};


const estimateCost = async (files) => {
    //***********************************************************
    //***********************************************************
    //Input array of files, return the estimated cost in lamports.
    //example usage:
    //document.getElementById('estimateButton').addEventListener('click', async () => {
    //  const stlInput = document.getElementById('stlInput').files[0];
    //  const objInput = document.getElementById('objInput').files[0];
    //  const threeMfInput = document.getElementById('3mfInput').files[0];
    //  const previewImageInput = document.getElementById('previewImageInput').files[0];
    //  const animationInput = document.getElementById('animationInput').files[0];

    //  const files = [stlInput, objInput, threeMfInput, previewImageInput, animationInput].filter(file => file);
    //  if (files.length > 0) {
    //      const cost = await estimateCost(files);
    //      alert(`Estimated cost to upload the files: ${cost / 1e9} SOL`);
    //  } else {
    //      alert('Please select at least one file to estimate the cost.');
    //}
    //});
    //***********************************************************
    //***********************************************************
    const webIrys = await getWebIrys();
    try {
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const totalCost = await webIrys.getPrice(totalSize);
        return totalCost;
    } catch (e) {
        console.error('Error estimating cost:', e);
    }
};


const uploadMetadata = async (metadata) => {
    const webIrys = await getWebIrys();
    try {
        const receipt = await webIrys.upload(metadata);
        //console.log(`https://gateway.irys.xyz/${receipt.id}`);
        return `https://gateway.irys.xyz/${receipt.id}`;
    } catch (e) {
        console.error('Error uploading metadata:', e);
    }
};


const createNftDataObject = () => ({
    basicInfo: {
        name: '',
        description: '',
        externalUrl: '',
        sellerFee: ''
    },
    dimensions: {
        width: '',
        height: '',
        depth: ''
    },
    printSpecs: {
        recommendedMaterial: '',
        recommendedLayerHeight: ''
    },
    files: {
        stl: {
            file: null,
            description: ''
        },
        obj: {
            file: null,
            description: ''
        },
        threeMf: {
            file: null,
            description: ''
        },
        previewImage: null,
        animation: null
    }
});


const validateNftData = (nftData) => {
    if (!nftData.files.previewImage) {
        throw new Error('Preview image is required');
    }
    if (!nftData.basicInfo.name) {
        throw new Error('NFT name is required');
    }
    if (!nftData.basicInfo.description) {
        throw new Error('NFT description is required');
    }
    if (!nftData.basicInfo.sellerFee) {
        throw new Error('Seller fee is required');
    }
    return true;
};


const uploadAndCreateNft = async (nftData) => {
    try {
        validateNftData(nftData);
        const files = [];
        const tags = [];

        if (nftData.files.stl.file) {
            files.push(nftData.files.stl.file);
            tags.push([{ name: 'Content-Type', value: nftData.files.stl.file.type }]);
        }
        if (nftData.files.obj.file) {
            files.push(nftData.files.obj.file);
            tags.push([{ name: 'Content-Type', value: nftData.files.obj.file.type }]);
        }
        if (nftData.files.threeMf.file) {
            files.push(nftData.files.threeMf.file);
            tags.push([{ name: 'Content-Type', value: nftData.files.threeMf.file.type }]);
        }
        if (nftData.files.previewImage) {
            files.push(nftData.files.previewImage);
            tags.push([{ name: 'Content-Type', value: nftData.files.previewImage.type }]);
        }
        if (nftData.files.animation) {
            files.push(nftData.files.animation);
            tags.push([{ name: 'Content-Type', value: nftData.files.animation.type }]);
        }

        const taggedFiles = files.map((file, i) => {
            file.tags = tags[i];
            return file;
        });

        const estimatedCost = await estimateCost(files);
        //console.log(`Estimated cost to upload the files: ${estimatedCost / 1e9} SOL`);

        const webIrys = await getWebIrys();
        console.log("Funding Irys...");
        await webIrys.fund(Math.ceil(estimatedCost * 1.2));
        console.log("Uploading files to Irys...");
        const irysResponse = await webIrys.uploadFolder(taggedFiles);
        console.log(irysResponse);
        const manifestId = irysResponse.manifestId;

        const attributes = [];
        if (nftData.dimensions.width && nftData.dimensions.height && nftData.dimensions.depth) {
            attributes.push({ trait_type: 'Dimensions', value: `${nftData.dimensions.width}x${nftData.dimensions.height}x${nftData.dimensions.depth} cm` });
        }
        if (nftData.printSpecs.recommendedMaterial) {
            attributes.push({ trait_type: 'Recommended Material', value: nftData.printSpecs.recommendedMaterial });
        }
        if (nftData.printSpecs.recommendedLayerHeight) {
            attributes.push({ trait_type: 'Recommended Layer Height', value: nftData.printSpecs.recommendedLayerHeight });
        }

        const metadata = {
            name: nftData.basicInfo.name,
            description: nftData.basicInfo.description,
            image: `https://gateway.irys.xyz/${manifestId}/${nftData.files.previewImage.name}`,
            external_url: nftData.basicInfo.externalUrl || '',
            attributes: attributes,
            animation_url: nftData.files.animation ? `https://gateway.irys.xyz/${manifestId}/${nftData.files.animation.name}` : '',
            model_files: [
                nftData.files.stl.file ? { uri: `https://gateway.irys.xyz/${manifestId}/${nftData.files.stl.file.name}`, type: 'model/stl', description: nftData.files.stl.description || '' } : null,
                nftData.files.obj.file ? { uri: `https://gateway.irys.xyz/${manifestId}/${nftData.files.obj.file.name}`, type: 'model/obj', description: nftData.files.obj.description || '' } : null,
                nftData.files.threeMf.file ? { uri: `https://gateway.irys.xyz/${manifestId}/${nftData.files.threeMf.file.name}`, type: 'model/3mf', description: nftData.files.threeMf.description || '' } : null,
            ].filter(Boolean),  // Filters out null entries
            creators: [
                {
                    address: wallet.publicKey.toString(),
                    share: 100
                }
            ]
        };

        const metadataUri = await uploadMetadata(JSON.stringify(metadata));
        const mint = generateSigner(umi);
        const result = await createNft(umi, {
            mint,
            name: nftData.basicInfo.name,
            uri: metadataUri,
            collection: { key: new PublicKey(COLLECTION_ADDRESS), verified: false },
            sellerFeeBasisPoints: percentAmount(nftData.basicInfo.sellerFee),
        }).sendAndConfirm(umi, { send: { skipPreflight: true }, confirm: { commitment: "finalized" } });
        const base58String = bs58.encode(result.signature);

        console.log("withdrawing the fund.");
        const tx = await webIrys.withdrawAll();
        console.log(tx);

        ////////for test
        console.log("the following is signature for create:");
        console.log(base58String);
        ////////for test
        alert('NFT created successfully.');
    } catch (error) {
        console.error('Error uploading files or creating NFT:', error);
    }
};


const getNftMintAddressesByOwner = async (owner) => {
    //***********************************************************
    //input: owner, a PublicKey object
    //output: an array of mint addresses
    //example usage:
    //const mintAddresses = await getNftMintAddressesByOwner(new PublicKey(wallet.publicKey.toString()));
    //***********************************************************
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID });
    const nftAccounts = tokenAccounts.value.filter(({ account }) => {
        const tokenAmount = account.data.parsed.info.tokenAmount;
        return tokenAmount.uiAmount === 1 && tokenAmount.decimals === 0;
    });
    const mintAddresses = nftAccounts.map(({ account }) => { return account.data.parsed.info.mint; });
    return mintAddresses;
};


function chunkArray(array, chunkSize) {
    //***********************************************************
    //input: an array and a chunk size
    //output: an array of arrays, each containing chunkSize elements
    //example usage:
    //const chunkedArray = chunkArray(array, 32);
    //***********************************************************
    const results = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        results.push(array.slice(i, i + chunkSize));
    }
    return results;
}


const fetchDigitalAssetInBatches = async (mintAddressBatches) => {
    //***********************************************************
    //input: an array of arrays, each containing mint addresses
    //output: an array of objects, each containing on-chain data and metadata
    //example usage:
    //const mintAddressBatches = chunkArray(mintAddresses, 32);
    //const results = await fetchDigitalAssetInBatches(mintAddressBatches);
    //***********************************************************
    let allResults = [];

    for (const batch of mintAddressBatches) {
        try {
            const batchResults = await fetchAllDigitalAsset(umi, batch);
            allResults.push(...batchResults);
        } catch (error) {
            console.error('Error fetching batch:', error);
        }
    }
    return allResults;
};


//the collection address here have to be verified, not hardcoded
const filterOutMetaprintNftsFromDigitalAssets = (digitalAssets) => {
    //***********************************************************
    //input: an array of objects, each containing on-chain data and metadata, which are digital assets
    //output: an array of objects, each containing on-chain data and metadata, which are nfts under our collection and verified
    //example usage:
    //const results = filterOutMetaprintNftsFromDigitalAssets(digitalAssets);
    //***********************************************************
    let results = digitalAssets.filter(asset => {
        const collection = asset?.metadata?.collection;
        const collectionValue = collection?.value;
        return (
            asset.metadata.tokenStandard.value === 0 &&
            asset.metadata.collectionDetails.value === undefined &&
            collectionValue && collectionValue.key == "EEgojeZwhAZrS4xH5sq82CQpG4nicvhz7fhJmmA6kZY4" //&& collectionValue.verified
        );
    });
    return results;
};


async function fetchUrisInBatch(uris) {
    //***********************************************************
    //input: an array of uris
    //output: an array of objects, each containing metadata
    //example usage:
    //const metadataArray = await fetchUrisInBatch(uris);
    //***********************************************************
    const fetchPromises = uris.map(uri =>
        fetch(uri)
            .then(res => res.json())
            .catch(error => {
                console.error(`Error fetching metadata for ${uri}:`, error);
                return null;
            })
    );
    const metadataArray = await Promise.all(fetchPromises);
    return metadataArray;
}


const getOwnedNfts = async (owner_address) => {
    //***********************************************************
    //input: owner_address, a string
    //output: an array of objects, each containing on-chain data and metadata
    //example usage:
    //const results = await getOwnedNfts(wallet.publicKey.toString());
    //***********************************************************
    try {
        const mintAddresses = await getNftMintAddressesByOwner(new PublicKey(owner_address));
        const mintAddressBatches = chunkArray(mintAddresses, 32);


        let results = await fetchDigitalAssetInBatches(mintAddressBatches);
        console.log(results);
        results = filterOutMetaprintNftsFromDigitalAssets(results);
        const combinedResults = [];

        const resultBatches = chunkArray(results, 16);

        for (const batch of resultBatches) {
            const uris = batch.map(asset => asset.metadata.uri);
            const metadataBatch = await fetchUrisInBatch(uris);
            for (let j = 0; j < batch.length; j++) {
                combinedResults.push({
                    onChainData: batch[j],
                    metadata: metadataBatch[j]
                });
            }
        }
        return combinedResults;
    } catch (error) {
        console.log(`Error: `, error);
    }
};


const apiCall = async (endpoint, method, body = null) => {
    const headers = {
        'Content-Type': 'application/json'
    };

    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    };

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        const data = await response.json();
        if (response.ok) {
            return data;
        } else {
            throw new Error(data.message || 'API call failed');
        }
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
};


const verifyNFT = async (mint_address) => {
    //***********************************************************
    //input: mint_address, a string
    //output: none
    //example usage:
    //await verifyNFT(mint_address);
    //***********************************************************
    try {
        const response = await apiCall('/api/nft/verify', 'POST', { mint: mint_address, userPublickey: wallet.publicKey.toString() });
        const deserializedTxAsU8 = base64.serialize(response.serializedTxAsString);
        const deserializedTx = umi.transactions.deserialize(deserializedTxAsU8);
        //console.log(deserializedTx);
        const signedDeserializedTx = await umi.identity.signTransaction(deserializedTx);
        const signature = await umi.rpc.sendTransaction(signedDeserializedTx);
        const confirmResult = await umi.rpc.confirmTransaction(signature, {
            strategy: { type: 'blockhash', ...(await umi.rpc.getLatestBlockhash()) },
        });
        //console.log("well done!");
        //console.log(confirmResult);
    } catch (error) {
        console.log('Error verifying NFT:', error);
    }
}


const ListNft = async (mint_address, price) => {
    //***********************************************************
    //input: mint_address, a string; price, a number
    //output: none
    //example usage:
    //await ListNft(mint_address, price);
    //***********************************************************
    const transactionBuilder = createListingBuilder(metaplex, {
        auctionHouse: AH,
        mintAccount: new PublicKey(mint_address),
        seller: metaplex.identity(),
        authority: AH.authority,
        price: sol(price)
    });
    const result2 = await transactionBuilder.sendAndConfirm(metaplex, { skipPreflight: true, commitment: 'finalized' });
    console.log(result2);
}


const getListingOfSeller = async (seller_address, mint_address) => {
    //***********************************************************
    //input: seller_address, a string; mint_address, a string
    //output: an array of listings
    //example usage:
    //const listings = await getListings(seller_address, mint_address);
    //***********************************************************
    const listings = await metaplex.auctionHouse().findListings({ auctionHouse: AH, seller: new PublicKey(seller_address), mint: new PublicKey(mint_address) });
    return listings;
}


const getBatchListingsOfSeller = async (seller_address, mint_addresses) => {
    //***********************************************************
    //input: seller_address, a string; mint_addresses, an array of strings
    //output: an array of arrays, each containing listings for the corresponding mint
    //example usage:
    //const listingsArray = await getBatchListings(seller_address, mint_addresses);
    //***********************************************************
    try {
        // Create an array of promises for fetching listings
        const listingPromises = mint_addresses.map(mint => getListingOfSeller(seller_address, mint));
        // Execute all promises concurrently
        const listingsArray = await Promise.all(listingPromises);
        return listingsArray;
    } catch (error) {
        console.error('Error fetching batch listings of seller:', error);
        throw error;
    }
};


// const getBatchListingsOfReceipts = async (receipt_addresses) => {
//     //***********************************************************
//     //input: receipt_addresses, an array of strings
//     //output: an array containing listings for the corresponding receipt
//     //example usage:
//     //const listingsArray = await getBatchListingsOfReceipts(receipt_addresses);
//     //***********************************************************
//     try {
//         console.log("Getting batch listings of receipts...");
//         console.log(receipt_addresses);
//         if (receipt_addresses.length == 0) { return []; }
//         //const listingsLazy = await metaplex.auctionHouse().findListings({ auctionHouse: AH });
//         //console.log(listingsLazy);
//         const listingPromises = receipt_addresses.map(receipt => metaplex.auctionHouse().findListingByReceipt({ auctionHouse: AH, receiptAddress: new PublicKey(receipt) }));
//         const listingsArray = await Promise.all(listingPromises);
//         return listingsArray;
//     } catch (error) {
//         console.error('Error fetching batch listings of receipts:', error);
//         throw error;
//     }
// }

const getBatchListingsOfReceipts = async (receipt_addresses) => {
    //***********************************************************
    //input: receipt_addresses, an array of strings
    //output: an array containing listings for the corresponding receipt
    //example usage:
    //const listingsArray = await getBatchListingsOfReceipts(receipt_addresses);
    //***********************************************************
    try {
        console.log("Getting batch listings of receipts...");
        const listingPromises = receipt_addresses.map(receipt => metaplex.auctionHouse().findListingByReceipt({ auctionHouse: AH, receiptAddress: new PublicKey(receipt) }));
        //const listingsArray = await Promise.all(listingPromises);

        const results = await Promise.allSettled(listingPromises);
        const listingsArray = results
            .filter(result => result.status === "fulfilled")
            .map(result => result.value); // Extract successful values

        console.log("Failed listings:", results.filter(result => result.status === "rejected"));

        return listingsArray;
    } catch (error) {
        console.error('Error fetching batch listings of receipts:', error);
        throw error;
    }
}


const unlistNft = async (receipt_address) => {
    //***********************************************************
    //input: receipt_address, a string
    //output: none
    //example usage:
    //await unlistNft(receipt_address);
    //***********************************************************
    const listing = await metaplex.auctionHouse().findListingByReceipt({ receiptAddress: new PublicKey(receipt_address), auctionHouse: AH });
    const result = await metaplex.auctionHouse().cancelListing({ auctionHouse: AH, listing: listing });
    console.log("The following is signature for unlist:");
    console.log(result.response.signature);
    console.log(result)
    //const listings = await metaplex.auctionHouse().findListings({ auctionHouse: AH, mint: new PublicKey(mint) });
}



const buyNft = async (receipt_address) => {
    //***********************************************************
    //input: receipt_address, a string
    //output: none
    //example usage:
    //await buyNft(receipt_address);
    //***********************************************************
    const metaplexListing = await metaplex.auctionHouse().findListingByReceipt({ receiptAddress: new PublicKey(receipt_address), auctionHouse: AH });
    const txBuilder = await metaplex.auctionHouse().builders().buy({ auctionHouse: AH, listing: metaplexListing, buyer: metaplex.identity() });
    const result = await txBuilder.sendAndConfirm(metaplex, { send: { skipPreflight: true }, confirm: { commitment: "finalized" } });
    console.log(result);
}





//document.getElementById('connectButton').addEventListener('click', connectPhantomWallet);





/*document.getElementById('estimateButton').addEventListener('click', async () => {
    console.log('Estimate button clicked');
    const stlInput = document.getElementById('stlInput').files[0];
    const objInput = document.getElementById('objInput').files[0];
    const threeMfInput = document.getElementById('3mfInput').files[0];
    const previewImageInput = document.getElementById('previewImageInput').files[0];
    const animationInput = document.getElementById('animationInput').files[0];

    const files = [stlInput, objInput, threeMfInput, previewImageInput, animationInput].filter(file => file);
    if (files.length > 0) {
        const cost = await estimateCost(files);
        alert(`Estimated cost to upload the files: ${cost / 1e9} SOL`);
    } else {
        alert('Please select at least one file to estimate the cost.');
    }
});

// this function can be modified, depending on the frontend design.
const loadNftDataFromForm = () => {
    const nftData = createNftDataObject();

    // Basic Info
    nftData.basicInfo.name = document.getElementById('nftName').value;
    nftData.basicInfo.description = document.getElementById('nftDescription').value;
    nftData.basicInfo.externalUrl = document.getElementById('externalUrl').value;
    nftData.basicInfo.sellerFee = document.getElementById('sellerFee').value;

    // Dimensions
    nftData.dimensions.width = document.getElementById('dimensionWidth').value;
    nftData.dimensions.height = document.getElementById('dimensionHeight').value;
    nftData.dimensions.depth = document.getElementById('dimensionDepth').value;

    // Print Specs
    nftData.printSpecs.recommendedMaterial = document.getElementById('recommendedMaterial').value;
    nftData.printSpecs.recommendedLayerHeight = document.getElementById('recommendedLayerHeight').value;

    // Files and Descriptions
    nftData.files.stl.file = document.getElementById('stlInput').files[0];
    nftData.files.stl.description = document.getElementById('stlDescription').value;

    nftData.files.obj.file = document.getElementById('objInput').files[0];
    nftData.files.obj.description = document.getElementById('objDescription').value;

    nftData.files.threeMf.file = document.getElementById('3mfInput').files[0];
    nftData.files.threeMf.description = document.getElementById('threeMfDescription').value;

    nftData.files.previewImage = document.getElementById('previewImageInput').files[0];
    nftData.files.animation = document.getElementById('animationInput').files[0];

    return nftData;
};

document.getElementById('uploadAndCreateNftButton').addEventListener('click', async () => {
    try {
        const nftData = loadNftDataFromForm();
        console.log(nftData);
        await uploadAndCreateNft(nftData);
        //alert('NFT created successfully.');
    } catch (error) {
        alert(`Failed to create NFT: ${error.message}`);
    }
});



*/
/*
document.getElementById('balanceButton').addEventListener('click', checkBalance);

document.getElementById('Verify').addEventListener('click', async () => {
    const mint_address = document.getElementById('mintInput').value;
    await verifyNFT(mint_address);
});

document.getElementById('displayNftsButton').addEventListener('click', async () => {
    const results = await getOwnedNfts(wallet.publicKey.toString());
    console.log(results);
    const mintAddresses = results.map(result => result.onChainData.publicKey.toString());
    const listingsArray = await getBatchListingsOfSeller(wallet.publicKey.toString(), mintAddresses);
    const isListedArray = listingsArray.map(listings => listings.length > 0 && listings[0].canceledAt === null && listings[0].purchaseReceiptAddress === null);
    console.log(isListedArray);
});

document.getElementById('ListDev').addEventListener('click', async () => {
    const mint_address = document.getElementById('MintToList').value;
    const list_price = document.getElementById('ListPrice').value;
    await ListNft(mint_address, list_price);
});

document.getElementById('displayListingDev').addEventListener('click', async () => {
    const seller_address = document.getElementById('listingSeller').value;
    const mint_address = document.getElementById('listingMint').value;
    const listings = await getListingOfSeller(seller_address, mint_address);
    console.log(listings);
    for (const listing of listings) {
        console.log(listing);
        console.log(listing.receiptAddress.toString());
    }
});

document.getElementById('unListDev').addEventListener('click', async () => {
    const receipt_address = document.getElementById('RecieptToCancel').value;
    await unlistNft(receipt_address);
});

document.getElementById('buyDev').addEventListener('click', async () => {
    const receipt_address = document.getElementById('RecieptToBuy').value;
    await buyNft(receipt_address);
});
*/



/*
document.getElementById('getActiveListingsDev').addEventListener('click', async () => {
    try {
        console.log("Getting active listings...");
        const response = await apiCall('/api/nft/activeListings', 'GET');
        console.log(response);
        const listings = await getBatchListingsOfReceipts(response.activeListings);
        console.log(listings);
    } catch (error) {
        console.error('Error fetching active listings:', error);
    }
});

*/
// document.getElementById('wallet').addEventListener('click', connectPhantomWallet);


function showCustomModal(message) {
    const successText = document.querySelector('.success-text');
    const prefix = "Connected to wallet:";
    if (message.startsWith(prefix)) {
        successText.innerHTML = '<span class="wallet-prefix">' + prefix + '</span> <span class="wallet-address">' + message.slice(prefix.length).trim() + '</span>';
    } else {
        successText.textContent = message;
    }
    modal.style.display = 'block';
}
// 弹窗相关逻辑
const modal = document.getElementById('walletModal');
const closeBtn = document.querySelector('.close');
closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});
// 连接 Phantom 钱包的函数
async function connectPhantomWallet() {
    try {
        if (!window.solana || !window.solana.isPhantom) {
            showCustomModal('Phantom wallet 未安装，请前往 https://phantom.app/ 安装。');
            //alert('Phantom wallet is not installed. Please install it from https://phantom.app/');
            return;
        }
        await wallet.connect();
        console.log('Connected to Phantom wallet:', wallet.publicKey.toString());
        showCustomModal(`Connected to wallet: ${wallet.publicKey.toString()}`);
    } catch (error) {
        console.error('Failed to connect to Phantom wallet:', error);
        alert('Failed to connect to Phantom wallet');
    }
}
document.getElementById('wallet').addEventListener('click', connectPhantomWallet);



// const connectPhantomWallet = async () => {
//     try {
//         if (!wallet.readyState === "Installed") {
//             alert('Phantom wallet is not installed. Please install it from https://phantom.app/');
//             return;
//         }
//         await wallet.connect();
//         console.log('Connected to Phantom wallet:', wallet.publicKey.toString());
//         alert(`Connected to wallet: ${wallet.publicKey.toString()}`);
//     } catch (error) {
//         console.error('Failed to connect to Phantom wallet:', error);
//     }
// };



















document.getElementById('getActiveListingsDev').addEventListener('click', async () => {
    try {
        console.log("Getting active listings...");
        const response = await apiCall('/api/nft/activeListings', 'GET');
        console.log(response);
        const listings = await getBatchListingsOfReceipts(response.activeListings);

        console.log(listings);

        // 清空展示容器
        const productContainer = document.getElementById('product-container');
        productContainer.innerHTML = '';

        // 遍历 listings 数组  
        // 注意：有些 listings 可能直接就是对象，也可能是数组，取第一个作为当前 NFT 的上架记录
        listings.forEach((listingElement, index) => {
            // 如果 listingElement 是数组，则取第一个元素；否则直接使用 listingElement
            const listing = Array.isArray(listingElement) ? listingElement[0] : listingElement;

            // 如果没有 asset 属性，则跳过此 listing
            if (!listing.asset) {
                console.warn("Skipping listing with no asset:", listing);
                return;
            }

            // 创建外层列容器
            const colDiv = document.createElement('div');
            colDiv.classList.add('col');

            // 创建卡片容器，并设置相对定位（方便内部绝对定位元素）
            const card = document.createElement('div');
            card.classList.add('card', 'h-100', 'shadow-sm', 'in-storage');
            card.style.position = 'relative';

            // 右上角徽章——显示“For Sale”
            const badge = document.createElement('div');
            badge.classList.add('badge', 'position-absolute');
            badge.style.top = '0.5rem';
            badge.style.right = '0.5rem';
            badge.style.zIndex = '10';
            badge.textContent = 'For Sale';
            badge.classList.add('bg-primary', 'text-white');
            card.appendChild(badge);

            // 图片部分：使用 listing.asset.json.image 作为图片地址
            const imgContainer = document.createElement('div');
            imgContainer.classList.add('card-img-container');
            const imageUrl = listing.asset?.json?.image;
            if (imageUrl) {
                const img = document.createElement('img');
                img.classList.add('card-img-top');
                img.src = imageUrl;
                // 使用 listing.asset.name 作为 alt 文本
                img.alt = listing.asset.name || 'NFT Image';
                imgContainer.appendChild(img);
            }
            card.appendChild(imgContainer);

            // 卡片主体内容：显示 NFT 名称和价格
            const cardBody = document.createElement('div');
            cardBody.classList.add('card-body', 'p-4');
            const textCenterDiv = document.createElement('div');
            textCenterDiv.classList.add('text-center');

            // 标题：使用 listing.asset.name
            const title = document.createElement('h5');
            title.classList.add('fw-bolder');
            title.textContent = listing.asset.name || 'NFT Card';
            textCenterDiv.appendChild(title);

            // 显示价格：获取原始价格并除以 1e9 去掉 9 个 0
            const priceDisplay = document.createElement('p');
            priceDisplay.classList.add('fw-bold');
            const rawPrice = listing.price && listing.price.basisPoints
                ? listing.price.basisPoints.toNumber()
                : undefined;
            if (rawPrice !== undefined) {
                const listingPrice = rawPrice / 1e9;
                priceDisplay.textContent = `Price: ${listingPrice}`;
            } else {
                priceDisplay.textContent = 'Price: N/A';
            }
            textCenterDiv.appendChild(priceDisplay);

            cardBody.appendChild(textCenterDiv);
            card.appendChild(cardBody);

            // 底部按钮区域：包含 Details 和 Buy 两个按钮
            const cardFooter = document.createElement('div');
            cardFooter.classList.add('card-footer', 'p-4', 'pt-0', 'border-top-0', 'bg-transparent');
            const footerDiv = document.createElement('div');
            footerDiv.classList.add('d-flex');

            // Details 按钮
            const detailsBtn = document.createElement('a');
            detailsBtn.classList.add('btn', 'action-btn-details', 'flex-fill', 'me-2');
            detailsBtn.href = '#';
            detailsBtn.textContent = 'Details';
            // 在点击 Details 按钮时调用 showNftDetails 并传入对应的 NFT 数据
            detailsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showNftDetails(listing.asset);
            });
            footerDiv.appendChild(detailsBtn);

            // Buy 按钮（仿照 cancel 按钮的写法）
            const buyBtn = document.createElement('a');
            buyBtn.classList.add('btn', 'action-btn-list', 'flex-fill', 'ms-2');
            buyBtn.href = '#';
            buyBtn.textContent = 'Buy';
            buyBtn.addEventListener('click', async () => {
                // 从当前 listing 中获取 receiptAddress
                const receiptAddress = listing.receiptAddress;
                if (receiptAddress) {
                    await buyNft(receiptAddress);
                } else {
                    console.error("未找到 receiptAddress，无法购买 NFT。", listing);
                }
            });
            footerDiv.appendChild(buyBtn);

            cardFooter.appendChild(footerDiv);
            card.appendChild(cardFooter);

            colDiv.appendChild(card);
            productContainer.appendChild(colDiv);
        });
    } catch (error) {
        console.error('Error fetching active listings:', error);
    }
});

function showNftDetails(asset) {
    // 检查是否已经存在弹窗容器
    let modalContainer = document.getElementById('nftDetailsModal');
    if (!modalContainer) {
        // 动态创建弹窗容器
        modalContainer = document.createElement('div');
        modalContainer.id = 'nftDetailsModal';
        modalContainer.style.position = 'fixed';
        modalContainer.style.top = '0';
        modalContainer.style.left = '0';
        modalContainer.style.width = '100%';
        modalContainer.style.height = '100%';
        modalContainer.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modalContainer.style.display = 'flex';
        modalContainer.style.justifyContent = 'center';
        modalContainer.style.alignItems = 'center';
        modalContainer.style.zIndex = '1000';

        // 弹窗内容（统一设置基础字体大小）
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = '#fff';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '5px';
        modalContent.style.position = 'relative';
        modalContent.style.maxWidth = '90%';
        modalContent.style.maxHeight = '90%';
        modalContent.style.overflowY = 'auto';
        modalContent.style.fontSize = '16px'; // 统一基础字体大小

        // 关闭按钮
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '10px';
        closeBtn.style.right = '15px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '24px';
        closeBtn.addEventListener('click', () => {
            modalContainer.style.display = 'none';
        });
        modalContent.appendChild(closeBtn);

        // 创建左右布局容器
        const contentContainer = document.createElement('div');
        contentContainer.style.display = 'flex';
        contentContainer.style.flexDirection = 'row';
        contentContainer.style.alignItems = 'flex-start';

        // 左侧：NFT 图片，设置容器宽度稍小
        const leftContainer = document.createElement('div');
        leftContainer.style.flex = '1';
        leftContainer.style.maxWidth = '40%';
        const nftImageElem = document.createElement('img');
        nftImageElem.id = 'nftImage';
        nftImageElem.style.width = '100%';
        nftImageElem.style.borderRadius = '5px';
        leftContainer.appendChild(nftImageElem);

        // 右侧：NFT 详细信息
        const rightContainer = document.createElement('div');
        rightContainer.style.flex = '1';
        rightContainer.style.marginLeft = '20px';
        rightContainer.style.display = 'flex';
        rightContainer.style.flexDirection = 'column';

        // NFT 名称（前面增加 “NFT NAME:”）
        const nftNameElem = document.createElement('h2');
        nftNameElem.id = 'nftName';
        nftNameElem.style.marginBottom = '10px';
        rightContainer.appendChild(nftNameElem);

        // NFT 描述（字体放大统一风格）
        const nftDescriptionElem = document.createElement('p');
        nftDescriptionElem.id = 'nftDescription';
        nftDescriptionElem.style.marginBottom = '10px';
        nftDescriptionElem.style.fontSize = '1.2em';
        rightContainer.appendChild(nftDescriptionElem);

        // 其他详细信息（排除 image、description、attributes、creators、model_files）
        const nftDetailsElem = document.createElement('div');
        nftDetailsElem.id = 'nftDetails';
        nftDetailsElem.style.lineHeight = '1.6';
        nftDetailsElem.style.marginBottom = '10px';
        rightContainer.appendChild(nftDetailsElem);

        // Attributes 信息容器（左右结构，统一字体）
        const attributesContainer = document.createElement('div');
        attributesContainer.id = 'nftAttributes';
        attributesContainer.style.marginBottom = '10px';
        rightContainer.appendChild(attributesContainer);

        // Creators 信息容器
        const creatorsContainer = document.createElement('div');
        creatorsContainer.id = 'nftCreators';
        creatorsContainer.style.marginBottom = '10px';
        rightContainer.appendChild(creatorsContainer);

        // Model Files 信息容器
        const modelFilesContainer = document.createElement('div');
        modelFilesContainer.id = 'nftModelFiles';
        rightContainer.appendChild(modelFilesContainer);

        // 组装左右布局
        contentContainer.appendChild(leftContainer);
        contentContainer.appendChild(rightContainer);
        modalContent.appendChild(contentContainer);
        modalContainer.appendChild(modalContent);
        document.body.appendChild(modalContainer);
    }

    // 更新数据
    const nftNameElem = modalContainer.querySelector('#nftName');
    // 名称前增加 "NFT NAME: "
    nftNameElem.textContent = 'NFT NAME: ' + (asset.name || 'NFT Name');

    const nftImageElem = modalContainer.querySelector('#nftImage');
    if (asset.json && asset.json.image) {
        nftImageElem.src = asset.json.image;
        nftImageElem.alt = asset.name || 'NFT Image';
    } else {
        nftImageElem.src = '';
        nftImageElem.alt = 'No image available';
    }

    const nftDescriptionElem = modalContainer.querySelector('#nftDescription');
    nftDescriptionElem.textContent = (asset.json && asset.json.description)
        ? asset.json.description
        : 'No description';

    // 输出其他详细信息：排除 name、image、description、attributes、creators、model_files
    const nftDetailsElem = modalContainer.querySelector('#nftDetails');
    nftDetailsElem.innerHTML = '';
    if (asset.json) {
        for (const key in asset.json) {
            if (['name', 'image', 'description', 'attributes', 'creators', 'model_files'].includes(key)) {
                continue;
            }
            const detailItem = document.createElement('p');
            detailItem.style.margin = '5px 0';
            detailItem.textContent = key + ': ' + asset.json[key];
            nftDetailsElem.appendChild(detailItem);
        }
    } else {
        nftDetailsElem.textContent = 'No additional information';
    }

    // Attributes 部分：每行显示 "trait_type: value"
    const attributesContainer = modalContainer.querySelector('#nftAttributes');
    attributesContainer.innerHTML = '';
    if (asset.json && Array.isArray(asset.json.attributes) && asset.json.attributes.length > 0) {
        const attributesTitle = document.createElement('h3');
        attributesTitle.textContent = 'Attributes';
        attributesContainer.appendChild(attributesTitle);

        asset.json.attributes.forEach(attr => {
            const traitType = attr.trait_type || 'Unknown trait';
            const traitValue = attr.value || 'N/A';
            // 单行输出 "名称: value"
            const attrLine = document.createElement('p');
            attrLine.style.margin = '4px 0';
            attrLine.textContent = `${traitType}: ${traitValue}`;
            attributesContainer.appendChild(attrLine);
        });
    } else {
        attributesContainer.textContent = 'No attribute information';
    }

    // Creators 部分：每个 creator 分两行显示
    const creatorsContainer = modalContainer.querySelector('#nftCreators');
    creatorsContainer.innerHTML = '';
    if (asset.json && Array.isArray(asset.json.creators) && asset.json.creators.length > 0) {
        const creatorsTitle = document.createElement('h3');
        creatorsTitle.textContent = 'Creators';
        creatorsContainer.appendChild(creatorsTitle);

        asset.json.creators.forEach(creator => {
            const address = creator.address || 'N/A';
            let share = creator.share || 0;
            // 转换为 Seller Fee 百分比（除以100后添加 %）
            const sellerFee = (Number(share) / 100) + '%';

            const addressElem = document.createElement('p');
            addressElem.textContent = `Address: ${address}`;
            creatorsContainer.appendChild(addressElem);

            const sellerFeeElem = document.createElement('p');
            sellerFeeElem.textContent = `Seller Fee: ${sellerFee}`;
            creatorsContainer.appendChild(sellerFeeElem);
        });
    } else {
        creatorsContainer.textContent = 'No creator information';
    }

    // Model Files 部分：判断 uri 后缀，仅显示纯文本提示
    const modelFilesContainer = modalContainer.querySelector('#nftModelFiles');
    modelFilesContainer.innerHTML = '';
    if (asset.json && Array.isArray(asset.json.model_files) && asset.json.model_files.length > 0) {
        const modelTitle = document.createElement('h3');
        modelTitle.textContent = 'Model Files';
        modelFilesContainer.appendChild(modelTitle);

        const fileTypes = { stl: false, obj: false, glb: false };
        asset.json.model_files.forEach(file => {
            if (!file.uri) return;
            const uriLower = file.uri.toLowerCase();
            if (uriLower.endsWith('.stl')) fileTypes.stl = true;
            else if (uriLower.endsWith('.obj')) fileTypes.obj = true;
            else if (uriLower.endsWith('.glb')) fileTypes.glb = true;
        });

        Object.keys(fileTypes).forEach(type => {
            const fileItem = document.createElement('p');
            fileItem.style.margin = '4px 0';
            fileItem.textContent = `${type.toUpperCase()}: ${fileTypes[type] ? 'Download Available' : 'Not Available'}`;
            modelFilesContainer.appendChild(fileItem);
        });
    } else {
        modelFilesContainer.textContent = 'No model file information';
    }

    // 显示弹窗
    modalContainer.style.display = 'flex';
}