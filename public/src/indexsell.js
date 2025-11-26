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

//////////////
const checkBalance = async () => {
    try {
        const balance = await connection.getBalance(wallet.publicKey);
        console.log(`Wallet balance: ${balance / 1e9} SOL`);
        alert(`Wallet balance: ${balance / 1e9} SOL`);
    } catch (error) {
        console.error('Failed to get wallet balance:', error);
    }
};

//////////////
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

//////////////
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
            ],  // Filters out null entries
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
            collection: { key: new PublicKey("EEgojeZwhAZrS4xH5sq82CQpG4nicvhz7fhJmmA6kZY4"), verified: false },
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

/////////
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

//////////// getOwnedNfts()[i].onChainData.publicKey
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

////////////
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

//////////
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
        const listingsArray = await Promise.all(listingPromises);
        return listingsArray;
    } catch (error) {
        console.error('Error fetching batch listings of receipts:', error);
        throw error;
    }
}

//////////
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

/////////
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






if (window.location.pathname.indexOf("modal.html") !== -1) {
    console.log("hahahahahahha");
    document.getElementById('estimateButton').addEventListener('click', async () => {
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
}





////// this function can be modified, depending on the frontend design.
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


if (window.location.pathname.indexOf("modal.html") !== -1) {
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
}



// function showCustomModal(message) {
//     const successText = document.querySelector('.success-text');
//     const prefix = "Connected to wallet:";
//     if (message.startsWith(prefix)) {
//         successText.innerHTML =
//             '<span class="wallet-prefix">' +
//             prefix +
//             '</span> <span class="wallet-address">' +
//             message.slice(prefix.length).trim() +
//             '</span>';
//     } else {
//         successText.textContent = message;
//     }
//     modal.style.display = 'block';
// }

// const modal = document.getElementById('walletModal');
// const closeBtn = document.querySelector('.close');
// closeBtn.addEventListener('click', () => {
//     modal.style.display = 'none';
// });
// window.addEventListener('click', (event) => {
//     if (event.target === modal) {
//         modal.style.display = 'none';
//     }
// });

// 弹窗展示 NFT 详情的函数






function showNftDetails(nft) {
    // 输出 NFT 信息到控制台
    console.log("NFT Name:", nft.metadata.name || 'NFT Name');
    if (nft.metadata.description) {
        console.log("Description:", nft.metadata.description);
    }
    if (nft.metadata.image) {
        console.log("Image URL:", nft.metadata.image);
    }
    if (nft.metadata.model_files && Array.isArray(nft.metadata.model_files)) {
        nft.metadata.model_files.forEach((file, index) => {
            console.log(`File ${index + 1} URI:`, file.uri);
        });
    }
    if (nft.metadata.attributes && Array.isArray(nft.metadata.attributes)) {
        nft.metadata.attributes.forEach(attr => {
            console.log(`${attr.trait_type || 'Property'}: ${attr.value}`);
        });
    }

    // 输出 sellerFeeBasisPoints 到控制台，并计算百分比
    if (nft.onChainData && nft.onChainData.metadata && nft.onChainData.metadata.sellerFeeBasisPoints) {
        const feePercentage = nft.onChainData.metadata.sellerFeeBasisPoints / 100;
        console.log("sellerFeePercentage:", feePercentage);
    }

    // 定义下载文件的函数（通过 fetch 获取 Blob 并触发下载）
    function downloadFile(fileUrl) {
        fetch(fileUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response error');
                }
                return response.blob();
            })
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = fileUrl.split('/').pop(); // 取文件名
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            })
            .catch(error => {
                console.error('Download error:', error);
            });
    }

    // 创建遮罩层，并将上下左右留白调大
    const modalOverlay = document.createElement('div');
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100vw';
    modalOverlay.style.height = '100vh';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '1000';
    modalOverlay.style.padding = '100px 100px';

    // 创建弹窗容器，宽度自动根据内容调整
    const modalContainer = document.createElement('div');
    modalContainer.style.position = 'relative';
    modalContainer.style.backgroundColor = '#fff';
    modalContainer.style.borderRadius = '10px';
    modalContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    // 宽度自动调整（如有需要可设置 minWidth 和 maxWidth）
    modalContainer.style.width = 'auto';
    // 可选：设置最小宽度，保证内容不会过窄
    modalContainer.style.minWidth = '300px';
    modalContainer.style.overflow = 'hidden';
    modalContainer.style.animation = 'fadeIn 0.3s ease-out';

    // 创建关闭按钮，放置在容器内部右上角（方形按钮）
    const closeIcon = document.createElement('span');
    closeIcon.textContent = '✕';
    closeIcon.style.position = 'absolute';
    closeIcon.style.top = '10px';
    closeIcon.style.right = '10px';
    closeIcon.style.background = '#fff';
    closeIcon.style.border = '1px solid #ced4da';
    closeIcon.style.width = '30px';
    closeIcon.style.height = '30px';
    closeIcon.style.display = 'flex';
    closeIcon.style.justifyContent = 'center';
    closeIcon.style.alignItems = 'center';
    closeIcon.style.cursor = 'pointer';
    closeIcon.style.fontSize = '18px';
    closeIcon.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    closeIcon.style.borderRadius = '0'; // 方形按钮
    closeIcon.addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    modalContainer.appendChild(closeIcon);

    // 弹窗主体部分左右分栏布局，并整体向下移动一些
    const modalBody = document.createElement('div');
    modalBody.style.display = 'flex';
    modalBody.style.flexDirection = 'row';
    modalBody.style.padding = '20px';
    modalBody.style.gap = '20px';
    modalBody.style.marginTop = '40px'; // 整体内容向下移动

    // 左侧：3D 模型预览（查找扩展名为 glb 的文件）
    const leftColumn = document.createElement('div');
    leftColumn.style.flex = '1';
    leftColumn.style.display = 'flex';
    leftColumn.style.justifyContent = 'center';
    leftColumn.style.alignItems = 'center';

    let glbFile = null;
    if (nft.metadata.model_files && Array.isArray(nft.metadata.model_files)) {
        glbFile = nft.metadata.model_files.find(file => {
            const ext = file.uri.split('.').pop().toLowerCase();
            return ext === 'glb';
        });
    }
    if (glbFile) {
        const modelViewer = document.createElement('model-viewer');
        modelViewer.setAttribute('src', glbFile.uri);
        modelViewer.setAttribute('alt', nft.metadata.name || '3D Model');
        modelViewer.setAttribute('camera-controls', '');
        modelViewer.setAttribute('auto-rotate', '');
        modelViewer.style.width = '100%';
        modelViewer.style.height = '400px';
        leftColumn.appendChild(modelViewer);
    } else if (nft.metadata.image) {
        // 如果没有 GLB 文件则回退到图片展示
        const img = document.createElement('img');
        img.src = nft.metadata.image;
        img.alt = nft.metadata.name || 'NFT Image';
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        leftColumn.appendChild(img);
    }

    // 右侧：信息展示
    const rightColumn = document.createElement('div');
    rightColumn.style.flex = '1';
    rightColumn.style.display = 'flex';
    rightColumn.style.flexDirection = 'column';
    rightColumn.style.justifyContent = 'flex-start';

    // NFT 名称
    const nameEl = document.createElement('h3');
    nameEl.textContent = nft.metadata.name || 'NFT Name';
    nameEl.style.marginBottom = '10px';
    rightColumn.appendChild(nameEl);

    // NFT 描述（如果有）
    if (nft.metadata.description) {
        const descriptionEl = document.createElement('p');
        descriptionEl.textContent = nft.metadata.description;
        descriptionEl.style.marginBottom = '15px';
        rightColumn.appendChild(descriptionEl);
    }

    // 如果存在 sellerFeeBasisPoints，则显示 Seller Fee 信息
    if (nft.onChainData && nft.onChainData.metadata && nft.onChainData.metadata.sellerFeeBasisPoints) {
        const feePercentage = nft.onChainData.metadata.sellerFeeBasisPoints / 100;
        const feeEl = document.createElement('p');
        feeEl.textContent = `Seller Fee: ${feePercentage}%`;
        feeEl.style.marginBottom = '15px';
        rightColumn.appendChild(feeEl);
    }

    // 展示 NFT 属性（如果有）
    if (nft.metadata.attributes && Array.isArray(nft.metadata.attributes)) {
        const attrTitle = document.createElement('h4');
        attrTitle.textContent = 'Attributes';
        attrTitle.style.marginBottom = '10px';
        rightColumn.appendChild(attrTitle);

        const attrList = document.createElement('ul');
        attrList.style.listStyle = 'none';
        attrList.style.padding = '0';
        attrList.style.margin = '0';
        nft.metadata.attributes.forEach(attr => {
            const li = document.createElement('li');
            li.style.marginBottom = '5px';
            li.textContent = `${attr.trait_type || 'Property'}: ${attr.value}`;
            attrList.appendChild(li);
        });
        rightColumn.appendChild(attrList);
    }

    // 在右侧底部始终展示三个下载按钮（STL, OBJ, GLB）
    const filesContainer = document.createElement('div');
    filesContainer.style.marginTop = '20px';
    filesContainer.style.display = 'flex';
    filesContainer.style.flexDirection = 'row';
    filesContainer.style.gap = '10px';
    filesContainer.style.flexWrap = 'wrap';

    // 按钮样式公共部分
    function createButtonStyle(btn) {
        btn.style.padding = '8px 16px';
        btn.style.backgroundColor = '#f8f9fa';
        btn.style.color = '#343a40';
        btn.style.border = '1px solid #ced4da';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '14px';
        btn.style.transition = 'background-color 0.3s ease, transform 0.3s ease';
    }

    // 预设的三个文件类型
    const fileTypes = ['stl', 'obj', 'glb'];
    fileTypes.forEach(type => {
        const btn = document.createElement('button');
        // 查找对应类型的文件
        const file = (nft.metadata.model_files && Array.isArray(nft.metadata.model_files)) ?
            nft.metadata.model_files.find(f => f.uri.split('.').pop().toLowerCase() === type) : null;

        if (file) {
            btn.textContent = `Download ${type.toUpperCase()}`;
            createButtonStyle(btn);
            btn.addEventListener('mouseover', () => {
                btn.style.backgroundColor = '#dee2e6';
                btn.style.transform = 'scale(1.05)';
            });
            btn.addEventListener('mouseout', () => {
                btn.style.backgroundColor = '#f8f9fa';
                btn.style.transform = 'scale(1)';
            });
            btn.addEventListener('click', () => {
                downloadFile(file.uri);
            });
        } else {
            btn.textContent = `Download ${type.toUpperCase()} (Unavailable)`;
            createButtonStyle(btn);
            btn.style.backgroundColor = '#e9ecef';
            btn.style.color = '#6c757d';
            btn.style.border = '1px solid #adb5bd';
            btn.style.cursor = 'not-allowed';
            btn.disabled = true;
        }
        filesContainer.appendChild(btn);
    });

    // 添加标题（可选）
    const filesTitle = document.createElement('h4');
    filesTitle.textContent = 'Model Files';
    filesTitle.style.width = '100%';
    filesTitle.style.marginBottom = '10px';
    filesContainer.insertBefore(filesTitle, filesContainer.firstChild);

    rightColumn.appendChild(filesContainer);

    modalBody.appendChild(leftColumn);
    modalBody.appendChild(rightColumn);
    modalContainer.appendChild(modalBody);

    modalOverlay.appendChild(modalContainer);
    document.body.appendChild(modalOverlay);
}

// 绑定 displayNftsButton 的点击事件
document.getElementById('displayNftsButton').addEventListener('click', async () => {
    // 显示 loading 界面（假设你已有 showLoading 和 hideLoading 的实现）
    showLoading();

    try {
        console.log('displayNftsButton clicked'); // 检查按钮点击

        await connectPhantomWallet();

        // 获取 NFT 数据（假设你已有 getOwnedNfts 方法）
        const results = await getOwnedNfts(wallet.publicKey.toString());
        console.log(results);

        // 获取展示容器并清空内容
        const productContainer = document.getElementById('product-container');
        productContainer.innerHTML = ''; // 清空容器

        // 先插入 “Create New NFT” 卡片（假设你已有 createNewNFTCard 方法）
        productContainer.appendChild(createNewNFTCard());

        // 获取上架信息，生成 isListedArray
        const mintAddresses = results.map(result => result.onChainData.publicKey.toString());
        const listingsArray = await getBatchListingsOfSeller(wallet.publicKey.toString(), mintAddresses);
        console.log(listingsArray);

        const isListedArray = listingsArray.map(listings =>
            listings.length > 0 &&
            listings[0].canceledAt === null &&
            listings[0].purchaseReceiptAddress === null
        );
        console.log(isListedArray);

        // 遍历每个 NFT 数据并生成对应卡片
        results.forEach((result, index) => {
            // 创建外层 col 容器
            const colDiv = document.createElement('div');
            colDiv.classList.add('col');

            if (isListedArray[index]) {
                // 已上架的 NFT 卡片：显示上架价格等信息
                const card = document.createElement('div');
                card.classList.add('card', 'h-100', 'shadow-sm', 'in-storage');
                card.style.position = 'relative';

                // 右上角徽章
                const badge = document.createElement('div');
                badge.classList.add('badge', 'position-absolute');
                badge.style.top = '0.5rem';
                badge.style.right = '0.5rem';
                badge.style.zIndex = '10';
                badge.textContent = 'Listed';
                badge.classList.add('bg-primary', 'text-white');
                card.appendChild(badge);

                // 图片部分
                const imgContainer = document.createElement('div');
                imgContainer.classList.add('card-img-container');
                if (result.metadata.image) {
                    const img = document.createElement('img');
                    img.classList.add('card-img-top');
                    img.src = result.metadata.image;
                    img.alt = result.metadata.name || 'NFT Image';
                    imgContainer.appendChild(img);
                }
                card.appendChild(imgContainer);

                // 卡片主体内容
                const cardBody = document.createElement('div');
                cardBody.classList.add('card-body', 'p-4');
                const textCenterDiv = document.createElement('div');
                textCenterDiv.classList.add('text-center');

                // 标题
                const title = document.createElement('h5');
                title.classList.add('fw-bolder');
                title.textContent = result.metadata.name || 'NFT Card';
                textCenterDiv.appendChild(title);

                // 状态信息
                const status = document.createElement('p');
                status.classList.add('text-muted');
                status.textContent = 'Status: Listed';
                textCenterDiv.appendChild(status);

                // 显示上架价格（除以 1e9 去掉9个0）
                const priceDisplay = document.createElement('p');
                priceDisplay.classList.add('fw-bold');
                const rawPrice = listingsArray[index]?.[0]?.price?.basisPoints?.toNumber();
                if (rawPrice !== undefined) {
                    const listingPrice = rawPrice / 1e9;
                    priceDisplay.textContent = `Price: ${listingPrice}`;
                } else {
                    priceDisplay.textContent = `Price: N/A`;
                }
                textCenterDiv.appendChild(priceDisplay);

                cardBody.appendChild(textCenterDiv);
                card.appendChild(cardBody);

                // 底部按钮区域
                const cardFooter = document.createElement('div');
                cardFooter.classList.add('card-footer', 'p-4', 'pt-0', 'border-top-0', 'bg-transparent');
                const footerDiv = document.createElement('div');
                footerDiv.classList.add('d-flex');

                // Details 按钮
                const detailsBtn = document.createElement('a');
                detailsBtn.classList.add('btn', 'action-btn-details', 'flex-fill', 'me-2');
                detailsBtn.href = '#';
                detailsBtn.textContent = 'Details';
                detailsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showNftDetails(result);
                });
                footerDiv.appendChild(detailsBtn);

                // Cancel 按钮
                const cancelBtn = document.createElement('a');
                cancelBtn.classList.add('btn', 'action-btn-remove', 'flex-fill', 'ms-2');
                cancelBtn.href = '#';
                cancelBtn.textContent = 'Cancel';
                cancelBtn.addEventListener('click', async () => {
                    // 从 listingsArray 中获取对应的 receiptAddress
                    const receiptAddress = listingsArray[index]?.[0]?.receiptAddress;
                    if (receiptAddress) {
                        await unlistNft(receiptAddress);
                    } else {
                        console.error("未找到 receiptAddress，无法取消上架。", result);
                    }
                });
                footerDiv.appendChild(cancelBtn);

                cardFooter.appendChild(footerDiv);
                card.appendChild(cardFooter);

                colDiv.appendChild(card);
                productContainer.appendChild(colDiv);
            } else {
                // 未上架的 NFT 卡片：包含验证状态、价格输入框、Sell/Verify 按钮等
                const card = document.createElement('div');
                card.classList.add('card', 'h-100', 'shadow-sm', 'in-storage');
                card.style.position = 'relative';

                // 右上角徽章，根据 verified 值显示
                const badge = document.createElement('div');
                badge.classList.add('badge', 'position-absolute');
                badge.style.top = '0.5rem';
                badge.style.right = '0.5rem';
                badge.style.zIndex = '10';
                const isVerified = result.onChainData.metadata.collection.value.verified;
                if (isVerified) {
                    badge.textContent = 'Verified';
                    badge.classList.add('bg-success', 'text-white');
                } else {
                    badge.textContent = 'Unverified';
                    badge.classList.add('bg-warning', 'text-dark');
                }
                card.appendChild(badge);

                // 图片部分
                const imgContainer = document.createElement('div');
                imgContainer.classList.add('card-img-container');
                if (result.metadata.image) {
                    const img = document.createElement('img');
                    img.classList.add('card-img-top');
                    img.src = result.metadata.image;
                    img.alt = result.metadata.name || 'NFT Image';
                    imgContainer.appendChild(img);
                }
                card.appendChild(imgContainer);

                // 卡片主体内容
                const cardBody = document.createElement('div');
                cardBody.classList.add('card-body', 'p-4');
                const textCenterDiv = document.createElement('div');
                textCenterDiv.classList.add('text-center');
                const title = document.createElement('h5');
                title.classList.add('fw-bolder');
                title.textContent = result.metadata.name || 'NFT Card';
                textCenterDiv.appendChild(title);

                const status = document.createElement('p');
                status.classList.add('text-muted');
                status.textContent = 'Status: Unlisted';
                textCenterDiv.appendChild(status);
                cardBody.appendChild(textCenterDiv);
                card.appendChild(cardBody);

                // 如果已验证，则添加价格输入框
                let priceInput;
                if (isVerified) {
                    priceInput = document.createElement('input');
                    priceInput.type = 'text';
                    priceInput.classList.add('form-control', 'price-setting-input');
                    priceInput.placeholder = 'Price';
                    card.appendChild(priceInput);
                }

                // 底部按钮区域
                const cardFooter = document.createElement('div');
                cardFooter.classList.add('card-footer', 'p-4', 'pt-0', 'border-top-0', 'bg-transparent');
                const footerDiv = document.createElement('div');
                footerDiv.classList.add('d-flex');

                // Details 按钮
                const detailsBtn = document.createElement('a');
                detailsBtn.classList.add('btn', 'action-btn-details', 'flex-fill', 'me-2');
                detailsBtn.href = '#';
                detailsBtn.textContent = 'Details';
                detailsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showNftDetails(result);
                });
                footerDiv.appendChild(detailsBtn);

                if (isVerified) {
                    // Sell 按钮
                    const sellBtn = document.createElement('a');
                    sellBtn.classList.add('btn', 'action-btn-list', 'flex-fill', 'ms-2');
                    sellBtn.href = '#';
                    sellBtn.textContent = 'Sell';
                    sellBtn.addEventListener('click', async () => {
                        const priceValue = parseFloat(priceInput.value);
                        if (isNaN(priceValue)) {
                            alert("请输入正确的价格");
                            return;
                        }
                        await ListNft(result.onChainData.mint.publicKey, priceValue);
                    });
                    footerDiv.appendChild(sellBtn);
                } else {
                    // Verify 按钮
                    const verifyBtn = document.createElement('a');
                    verifyBtn.classList.add('btn', 'action-btn-remove', 'flex-fill', 'ms-2');
                    verifyBtn.href = '#';
                    verifyBtn.textContent = 'Verify';
                    verifyBtn.addEventListener('click', async () => {
                        await verifyNFT(result.onChainData.mint.publicKey);
                    });
                    footerDiv.appendChild(verifyBtn);
                }
                cardFooter.appendChild(footerDiv);
                card.appendChild(cardFooter);

                colDiv.appendChild(card);
                productContainer.appendChild(colDiv);
            }
        });

    } catch (error) {
        console.error('操作过程中发生错误:', error);
    } finally {
        // 隐藏 loading 界面（假设你已有 hideLoading 方法）
        hideLoading();
    }
});









/*
document.getElementById('displayNftsButton').addEventListener('click', async () => {
    //productContainer.innerHTML = '';
    // 显示 loading 界面


    // 1. 获取 NFT 数据

    console.log('displayNftsButton clicked');  // 检查按钮点击
    showLoading();



    /*
        try {
            // 检查是否安装了 Phantom 钱包
            if (!window.solana || !window.solana.isPhantom) {
                showCustomModal('Phantom wallet 未安装，请前往 https://phantom.app/ 安装。');
                return;
            }
    
            const wallet = window.solana; // 使用全局的 Phantom 钱包对象
    
            // 尝试连接钱包
            if (!wallet.publicKey) {
                const resp = await wallet.connect();
                console.log('Connected to Phantom wallet:', resp.publicKey.toString());
                showCustomModal(`Connected to wallet: ${resp.publicKey.toString()}`);
            } else {
                showCustomModal(`Connected to wallet: ${wallet.publicKey.toString()}`);
            }
            
    try {
        // 0. 尝试连接 Phantom 钱包
        if (wallet.readyState !== "Installed") {
            alert('Phantom wallet 未安装，请前往 https://phantom.app/ 安装。');
            return;
        }
        if (!wallet.publicKey) {
            await wallet.connect();
            console.log('Connected to Phantom wallet:', wallet.publicKey.toString());
            alert(`Connected to wallet: ${wallet.publicKey.toString()}`);
        }
        else {
            alert(`Connected to wallet: ${wallet.publicKey.toString()}`);
        }








        const results = await getOwnedNfts(wallet.publicKey.toString());
        console.log(results);

        // 2. 获取展示容器并清空内容

        const productContainer = document.getElementById('product-container');
        productContainer.innerHTML = ''; // 清空容器

        // 插入 “Create New NFT” 卡片到最前面


        // 3. 获取上架信息，生成 isListedArray
        const mintAddresses = results.map(result => result.onChainData.publicKey.toString());
        const listingsArray = await getBatchListingsOfSeller(wallet.publicKey.toString(), mintAddresses);



        console.log(listingsArray);



        const isListedArray = listingsArray.map(listings =>
            listings.length > 0 &&
            listings[0].canceledAt === null &&
            listings[0].purchaseReceiptAddress === null
        );
        console.log(isListedArray);

        productContainer.innerHTML = '';
        // 4. 遍历每个 NFT 数据（使用 index 保证与 isListedArray 对应）
        results.forEach((result, index) => {
            // 创建外层 col 容器
            const colDiv = document.createElement('div');
            colDiv.classList.add('col');

            if (isListedArray[index]) {
                // ---------------------------
                // 已上架的 NFT 卡片：显示上架价格等信息
                // ---------------------------
                const card = document.createElement('div');
                card.classList.add('card', 'h-100', 'shadow-sm', 'in-storage');
                card.style.position = 'relative';

                // 右上角徽章
                const badge = document.createElement('div');
                badge.classList.add('badge', 'position-absolute');
                badge.style.top = '0.5rem';
                badge.style.right = '0.5rem';
                badge.style.zIndex = '10';
                badge.textContent = 'Listed';
                badge.classList.add('bg-primary', 'text-white');
                card.appendChild(badge);

                // 图片部分
                const imgContainer = document.createElement('div');
                imgContainer.classList.add('card-img-container');
                if (result.metadata.image) {
                    const img = document.createElement('img');
                    img.classList.add('card-img-top');
                    img.src = result.metadata.image;
                    img.alt = result.metadata.name || 'NFT Image';
                    imgContainer.appendChild(img);
                }
                card.appendChild(imgContainer);

                // 卡片主体内容
                const cardBody = document.createElement('div');
                cardBody.classList.add('card-body', 'p-4');
                const textCenterDiv = document.createElement('div');
                textCenterDiv.classList.add('text-center');

                // 标题
                const title = document.createElement('h5');
                title.classList.add('fw-bolder');
                title.textContent = result.metadata.name || 'NFT Card';
                textCenterDiv.appendChild(title);

                // 状态信息
                const status = document.createElement('p');
                status.classList.add('text-muted');
                status.textContent = 'Status: Listed';
                textCenterDiv.appendChild(status);

                // 显示上架价格（除以 1e9 去掉9个0）
                const priceDisplay = document.createElement('p');
                priceDisplay.classList.add('fw-bold');
                const rawPrice = listingsArray[index]?.[0]?.price?.basisPoints?.toNumber();
                if (rawPrice !== undefined) {
                    const listingPrice = rawPrice / 1e9;
                    priceDisplay.textContent = `Price: ${listingPrice}`;
                } else {
                    priceDisplay.textContent = `Price: N/A`;
                }
                textCenterDiv.appendChild(priceDisplay);

                cardBody.appendChild(textCenterDiv);
                card.appendChild(cardBody);

                // 底部按钮区域
                const cardFooter = document.createElement('div');
                cardFooter.classList.add('card-footer', 'p-4', 'pt-0', 'border-top-0', 'bg-transparent');
                const footerDiv = document.createElement('div');
                footerDiv.classList.add('d-flex');

                // Details 按钮
                const detailsBtn = document.createElement('a');
                detailsBtn.classList.add('btn', 'action-btn-details', 'flex-fill', 'me-2');
                detailsBtn.href = '#';
                detailsBtn.textContent = 'Details';
                footerDiv.appendChild(detailsBtn);

                // Cancel 按钮
                const cancelBtn = document.createElement('a');
                cancelBtn.classList.add('btn', 'action-btn-remove', 'flex-fill', 'ms-2');
                cancelBtn.href = '#';
                cancelBtn.textContent = 'Cancel';
                cancelBtn.addEventListener('click', async () => {
                    // 从 listingsArray 中获取对应的 receiptAddress
                    const receiptAddress = listingsArray[index]?.[0]?.receiptAddress;
                    if (receiptAddress) {
                        await unlistNft(receiptAddress);
                    } else {
                        console.error("未找到 receiptAddress，无法取消上架。", result);
                    }
                });
                footerDiv.appendChild(cancelBtn);

                cardFooter.appendChild(footerDiv);
                card.appendChild(cardFooter);

                colDiv.appendChild(card);
                productContainer.appendChild(colDiv);
            } else {
                // ---------------------------
                // 未上架的 NFT 卡片：包含验证状态、价格输入框、Sell/Verify 按钮等
                // ---------------------------
                const card = document.createElement('div');
                card.classList.add('card', 'h-100', 'shadow-sm', 'in-storage');
                card.style.position = 'relative';

                // 右上角徽章，根据 verified 值显示
                const badge = document.createElement('div');
                badge.classList.add('badge', 'position-absolute');
                badge.style.top = '0.5rem';
                badge.style.right = '0.5rem';
                badge.style.zIndex = '10';
                const isVerified = result.onChainData.metadata.collection.value.verified;
                if (isVerified) {
                    badge.textContent = 'Verified';
                    badge.classList.add('bg-success', 'text-white');
                } else {
                    badge.textContent = 'Unverified';
                    badge.classList.add('bg-warning', 'text-dark');
                }
                card.appendChild(badge);

                // 图片部分
                const imgContainer = document.createElement('div');
                imgContainer.classList.add('card-img-container');
                if (result.metadata.image) {
                    const img = document.createElement('img');
                    img.classList.add('card-img-top');
                    img.src = result.metadata.image;
                    img.alt = result.metadata.name || 'NFT Image';
                    imgContainer.appendChild(img);
                }
                card.appendChild(imgContainer);

                // 卡片主体内容
                const cardBody = document.createElement('div');
                cardBody.classList.add('card-body', 'p-4');
                const textCenterDiv = document.createElement('div');
                textCenterDiv.classList.add('text-center');
                const title = document.createElement('h5');
                title.classList.add('fw-bolder');
                title.textContent = result.metadata.name || 'NFT Card';
                textCenterDiv.appendChild(title);

                const status = document.createElement('p');
                status.classList.add('text-muted');
                status.textContent = 'Status: Unlisted';
                textCenterDiv.appendChild(status);
                cardBody.appendChild(textCenterDiv);
                card.appendChild(cardBody);

                // 如果已验证，则添加价格输入框
                let priceInput;
                if (isVerified) {
                    priceInput = document.createElement('input');
                    priceInput.type = 'text';
                    priceInput.classList.add('form-control', 'price-setting-input');
                    priceInput.placeholder = 'Price';
                    card.appendChild(priceInput);
                }

                // 底部按钮区域
                const cardFooter = document.createElement('div');
                cardFooter.classList.add('card-footer', 'p-4', 'pt-0', 'border-top-0', 'bg-transparent');
                const footerDiv = document.createElement('div');
                footerDiv.classList.add('d-flex');

                // Details 按钮
                const detailsBtn = document.createElement('a');
                detailsBtn.classList.add('btn', 'action-btn-details', 'flex-fill', 'me-2');
                detailsBtn.href = '#';
                detailsBtn.textContent = 'Details';
                footerDiv.appendChild(detailsBtn);

                if (isVerified) {
                    // Sell 按钮
                    const sellBtn = document.createElement('a');
                    sellBtn.classList.add('btn', 'action-btn-list', 'flex-fill', 'ms-2');
                    sellBtn.href = '#';
                    sellBtn.textContent = 'Sell';
                    sellBtn.addEventListener('click', async () => {
                        const priceValue = parseFloat(priceInput.value);
                        if (isNaN(priceValue)) {
                            alert("请输入正确的价格");
                            return;
                        }
                        await ListNft(result.onChainData.mint.publicKey, priceValue);
                    });
                    footerDiv.appendChild(sellBtn);
                } else {
                    // Verify 按钮
                    const verifyBtn = document.createElement('a');
                    verifyBtn.classList.add('btn', 'action-btn-remove', 'flex-fill', 'ms-2');
                    verifyBtn.href = '#';
                    verifyBtn.textContent = 'Verify';
                    verifyBtn.addEventListener('click', async () => {
                    
                        await verifyNFT(result.onChainData.mint.publicKey);
                    });
                    footerDiv.appendChild(verifyBtn);
                }
                cardFooter.appendChild(footerDiv);
                card.appendChild(cardFooter);

                colDiv.appendChild(card);
                productContainer.appendChild(colDiv);
            }
        });

        productContainer.prepend(createNewNFTCard());
    } catch (error) {
        console.error('操作过程中发生错误:', error);
    } finally {
        // 隐藏 loading 界面
        hideLoading();
    }
});

*/

// 创建 "Create New NFT" 卡片的函数
function createNewNFTCard() {
    // 创建外层 col 容器
    const colDiv = document.createElement('div');
    colDiv.classList.add('col');

    // 创建卡片
    const card = document.createElement('div');
    card.classList.add('card', 'h-100', 'shadow-sm', 'border-0');
    card.style.cursor = 'pointer';
    card.style.position = 'relative';
    card.style.borderRadius = '10px';
    card.style.transition = 'transform 0.2s ease';

    // 鼠标悬停时轻微放大效果
    card.addEventListener('mouseover', () => {
        card.style.transform = 'scale(1.03)';
    });
    card.addEventListener('mouseout', () => {
        card.style.transform = 'scale(1)';
    });

    // 创建卡片主体内容区域，并使用 Flexbox 垂直水平居中
    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body', 'p-4', 'd-flex', 'flex-column', 'justify-content-center', 'align-items-center');

    // 创建加号图标（这里示例使用 Font Awesome）
    const plusIcon = document.createElement('i');
    plusIcon.classList.add('fa', 'fa-plus');
    plusIcon.style.fontSize = '3rem';
    plusIcon.style.color = '#007bff'; // 使用主色调
    plusIcon.style.marginBottom = '0.5rem';

    // 创建标题文字
    const title = document.createElement('h5');
    title.classList.add('fw-bold', 'mb-0');
    title.textContent = 'Create New NFT';

    // 将图标和标题添加到卡片主体中
    cardBody.appendChild(plusIcon);
    cardBody.appendChild(title);
    card.appendChild(cardBody);
    colDiv.appendChild(card);

    // 点击卡片后打开预定义的 NFT 铸造窗口
    card.addEventListener('click', () => {
        openMintWindow();
    });

    return colDiv;
}





function showLoading() {
    document.getElementById('loading1').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading1').style.display = 'none';
}


function openMintWindow() {
    window.open('createNFT.html', 'MintNFTWindow', 'width=1000,height=1000');
}

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