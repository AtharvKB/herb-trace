# 🌿 HerbTrace

> Blockchain-powered traceability platform for Ayurvedic herbs — ensuring purity from farm to pharmacy.

**Live on Sepolia Testnet** · Contract: `0x437B1696B0E67a1430f5486583971D4520af93e1`

---

## 🧑‍🤝‍🧑 Team Roles

| Member | Role |
|--------|------|
| Member 1 | Smart Contract (Solidity + Hardhat, Sepolia deployment) |
| **Member 2** | **Frontend (React + Vite) — this repo** |
| Member 3 | QR Code generation |
| Member 4 | IPFS & Backend (Java + Pinata) |

---

## ✨ Features

- 🌱 **Farmer Portal** — Register a herb batch; image uploaded to IPFS, metadata & batch ID written to blockchain
- 🧪 **Lab Portal** — Lab tech selects a batch, enters purity %, notes, uploads PDF report → all stored permanently on-chain via `verifyBatch()`
- 🚚 **Distributor Portal** — View verified batches with on-chain purity data, dispatch shipments
- 🔍 **Track Product** — Anyone (no wallet needed) can scan a QR code or enter a batch ID to see the full supply chain history and quality certificate

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 |
| Styling | Tailwind CSS v4 |
| Blockchain | Ethers.js v6, MetaMask |
| Network | Sepolia Testnet |
| IPFS | Pinata |
| Routing | React Router v7 |

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/AtharvKB/herb-trace.git
cd herb-trace
npm install
```

### 2. Set up environment variables
Create a `.env` file in the project root:
```bash
VITE_PINATA_JWT=your_pinata_jwt_here
```
Get your JWT from [app.pinata.cloud/developers/api-keys](https://app.pinata.cloud/developers/api-keys)

### 3. Run the dev server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173)

---

## 🔗 Smart Contract

| Property | Value |
|----------|-------|
| Network | Sepolia Testnet |
| Address | `0x437B1696B0E67a1430f5486583971D4520af93e1` |
| Current Batches | `#101` – `#105` |
| Next Batch ID | `#106` |

### Key Contract Functions
| Function | Description |
|----------|-------------|
| `createBatch(metadataCID)` | Farmer registers a new herb batch |
| `verifyBatch(id, pdfCID, purity, notes)` | Lab stores verification data on-chain |
| `updateStage(id, stage)` | Distributor marks batch as shipped |
| `batches(id)` | Read batch info |
| `getLabReport(id)` | Read lab purity + PDF CID |

---

## 📁 Project Structure

```
src/
├── pages/
│   ├── Farmer.jsx        # Farmer harvest registration
│   ├── Lab.jsx           # Lab batch overview
│   ├── LabDashboard.jsx  # Lab verification form (writes to blockchain)
│   ├── Distributor.jsx   # Distributor shipping portal
│   └── Track.jsx         # Public product tracking (no wallet needed)
├── utils/
│   ├── contract.js       # Ethers.js contract helpers (read-only + signed)
│   └── pinata.js         # IPFS upload/fetch helpers
└── components/
    └── Navbar.jsx
```

---

## 📝 Notes for Team

- **MetaMask** is only required for write actions (Lab verify, Distributor dispatch, Farmer submit). Tracking works without a wallet.
- Farmer image upload calls **Member 4's Java server** at the configured ngrok URL — update `Farmer.jsx` if the URL changes.
- Batch IDs start at **101** (seeded by Member 1 during deployment).
