import { AptosClient, AptosAccount, HexString } from 'aptos';
import { config } from 'dotenv';

// Load environment variables from pass.env
config({ path: 'pass.env' });

// Blockchain setup
const NODE_URL = 'https://fullnode.mainnet.aptoslabs.com'; // Update for Movement Chain RPC
const client = new AptosClient(NODE_URL);

// Contract details
const NFT_CONTRACT_ADDRESS = '0xYOUR_CONTRACT_ADDRESS';
const MINT_FUNCTION = 'mint';
const NFT_AMOUNT = 2; // Number of NFTs per wallet
const MAX_RETRIES = 3; // Max retries if minting fails
const BASE_GAS_AMOUNT = 1000; // Base gas fee
const MIN_DELAY = 500; // Minimum random delay (ms)
const MAX_DELAY = 3000; // Maximum random delay (ms)

// Load wallet private keys from pass.env
const PRIVATE_KEYS = process.env.PRIVATE_KEYS?.split(',') || [];

if (PRIVATE_KEYS.length !== 10) {
    console.error('Error: Exactly 10 private keys required.');
    process.exit(1);
}

// Function to generate random delay
function getRandomDelay() {
    return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
}

// Function to mint NFT
async function mintNFT(account, retryCount = 0, gasAmount = BASE_GAS_AMOUNT) {
    try {
        const payload = {
            function: `${NFT_CONTRACT_ADDRESS}::${MINT_FUNCTION}`,
            type_arguments: [],
            arguments: [NFT_AMOUNT],
        };

        const txnRequest = await client.generateTransaction(account.address(), payload, {
            max_gas_amount: gasAmount.toString(),
        });
        const signedTxn = await client.signTransaction(account, txnRequest);
        const txnHash = await client.submitTransaction(signedTxn);

        console.log(`Mint TX sent for ${account.address().hex()}: ${txnHash}`);
        await client.waitForTransaction(txnHash);
        console.log(`✅ Mint successful for ${account.address().hex()}`);
    } catch (error) {
        console.error(`❌ Minting failed for ${account.address().hex()} (Attempt ${retryCount + 1}):`, error);

        if (retryCount < MAX_RETRIES) {
            const newGasAmount = gasAmount * 1.2; // Increase gas by 20% per retry
            console.log(`🔁 Retrying mint for ${account.address().hex()} with gas: ${newGasAmount}`);
            await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
            await mintNFT(account, retryCount + 1, newGasAmount);
        } else {
            console.error(`⛔ Minting permanently failed for ${account.address().hex()} after ${MAX_RETRIES} attempts.`);
        }
    }
}

// Main function to run minting for all wallets
async function main() {
    console.log('🚀 Starting NFT mint bot...');

    const accounts = PRIVATE_KEYS.map(pk => new AptosAccount(new HexString(pk).toUint8Array()));

    for (const account of accounts) {
        await new Promise(resolve => setTimeout(resolve, getRandomDelay())); // Random delay before each mint
        mintNFT(account);
    }
}

main().catch(console.error);
