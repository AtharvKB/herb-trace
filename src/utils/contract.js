import { ethers } from 'ethers';

// ✅ Deployed contract address on Sepolia
const CONTRACT_ADDRESS = "0x437B1696B0E67a1430f5486583971D4520af93e1";

// ✅ Batches on this contract start from 101 (Member 1 deployed with initial seed data)
// All pages must loop from this value, NOT from 1
export const BATCH_ID_START = 101;

/**
 * ABI matches the ACTUAL deployed contract (message__1_.txt / old HerbChain).
 *
 * KEY DIFFERENCES from what we had before:
 *  - batches() returns ONLY 5 fields: (id, metadataCID, farmer, stage, exists)
 *    → No name/location/date/imageCID in the mapping; those live in the IPFS metadata JSON
 *  - createBatch() takes ONLY 1 param: the IPFS CID of the full metadata JSON
 *  - verifyBatch() and getLabReport() ARE available → lab data stored on-chain ✅
 */
const CONTRACT_ABI = [
  // ── EVENTS ──────────────────────────────────────────────────────────────────
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "metadataCID", "type": "string" },
      { "indexed": true, "internalType": "address", "name": "farmer", "type": "address" }
    ],
    "name": "BatchCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "labTech", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "purity", "type": "string" }
    ],
    "name": "BatchVerified",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
      { "indexed": false, "internalType": "uint8", "name": "newStage", "type": "uint8" }
    ],
    "name": "StageUpdated",
    "type": "event"
  },

  // ── nextBatchId ─────────────────────────────────────────────────────────────
  {
    "inputs": [],
    "name": "nextBatchId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },

  // ── batches(uint256) → (id, metadataCID, farmer, stage, exists) ─────────────
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "batches",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "string", "name": "metadataCID", "type": "string" },
      { "internalType": "address", "name": "farmer", "type": "address" },
      { "internalType": "uint8", "name": "stage", "type": "uint8" },
      { "internalType": "bool", "name": "exists", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // ── getBatch(uint256) → struct tuple ─────────────────────────────────────────
  {
    "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
    "name": "getBatch",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "string", "name": "metadataCID", "type": "string" },
          { "internalType": "address", "name": "farmer", "type": "address" },
          { "internalType": "uint8", "name": "stage", "type": "uint8" },
          { "internalType": "bool", "name": "exists", "type": "bool" }
        ],
        "internalType": "struct HerbChain.HerbBatch",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // ── labReports(uint256) → flat fields ────────────────────────────────────────
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "labReports",
    "outputs": [
      { "internalType": "string", "name": "reportIPFS", "type": "string" },
      { "internalType": "string", "name": "purity", "type": "string" },
      { "internalType": "string", "name": "notes", "type": "string" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "internalType": "address", "name": "labTech", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // ── getLabReport(uint256) → struct tuple ─────────────────────────────────────
  {
    "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
    "name": "getLabReport",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "reportIPFS", "type": "string" },
          { "internalType": "string", "name": "purity", "type": "string" },
          { "internalType": "string", "name": "notes", "type": "string" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "internalType": "address", "name": "labTech", "type": "address" }
        ],
        "internalType": "struct HerbChain.LabData",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // ── createBatch(string _metadataCID) ─────────────────────────────────────────
  // IMPORTANT: Only takes 1 param — the CID of a JSON stored on IPFS
  // That JSON must contain: { name, location, harvestDate, imageCID, farmerName }
  {
    "inputs": [
      { "internalType": "string", "name": "_metadataCID", "type": "string" }
    ],
    "name": "createBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ── verifyBatch(id, reportIPFS, purity, notes) ───────────────────────────────
  // Stores lab data ON-CHAIN and sets stage to Verified ✅
  {
    "inputs": [
      { "internalType": "uint256", "name": "_id", "type": "uint256" },
      { "internalType": "string", "name": "_reportIPFS", "type": "string" },
      { "internalType": "string", "name": "_purity", "type": "string" },
      { "internalType": "string", "name": "_notes", "type": "string" }
    ],
    "name": "verifyBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ── updateStage(id, newStage) ────────────────────────────────────────────────
  {
    "inputs": [
      { "internalType": "uint256", "name": "_id", "type": "uint256" },
      { "internalType": "uint8", "name": "_newStage", "type": "uint8" }
    ],
    "name": "updateStage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// ─── Read-Only contract (no MetaMask needed) ────────────────────────────────
// Used by Track page so consumers can verify products without a wallet.
// Falls back through multiple public Sepolia RPC endpoints.
// CORS-compatible Sepolia RPC endpoints (browser-safe)
const SEPOLIA_RPC_URLS = [
  "https://sepolia.drpc.org",
  "https://1rpc.io/sepolia",
  "https://ethereum-sepolia.blockpi.network/v1/rpc/public",
  "https://ethereum-sepolia-rpc.publicnode.com",
];

export const getReadOnlyContract = async () => {
  for (const rpc of SEPOLIA_RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    } catch (e) {
      console.warn(`RPC ${rpc} failed, trying next...`);
    }
  }
  throw new Error("All Sepolia RPC endpoints failed. Check your internet connection.");
};

// ─── Write contract (MetaMask required) ─────────────────────────────────────
// Used by Lab, Farmer, Distributor pages that need to sign transactions.
export const getContract = async () => {
  if (!window.ethereum) {
    alert("MetaMask not detected! Please install MetaMask to perform this action.");
    return null;
  }
  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  } catch (error) {
    console.error("Contract connection error:", error);
    return null;
  }
};
