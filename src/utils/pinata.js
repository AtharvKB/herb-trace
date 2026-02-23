// src/utils/pinata.js
// All IPFS operations. The contract only stores a metadataCID on-chain.
// Full batch details (name, location, date, imageCID) live in that JSON on IPFS.

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
export const IPFS_GATEWAY = "https://dweb.link/ipfs";

// ─── Upload an image file → returns CID ────────────────────────────────────
export const uploadImageToPinata = async (file, label = "herb-image") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("pinataMetadata", JSON.stringify({ name: label }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData
  });
  if (!res.ok) throw new Error(`Image upload failed: ${res.statusText}`);
  return (await res.json()).IpfsHash;
};

// ─── Upload a PDF file → returns CID ───────────────────────────────────────
export const uploadPdfToPinata = async (file, batchId) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("pinataMetadata", JSON.stringify({
    name: `HerbTrace_LabReport_Batch_${batchId}`,
    keyvalues: { batchId: String(batchId), type: "lab_pdf" }
  }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData
  });
  if (!res.ok) throw new Error(`PDF upload failed: ${res.statusText}`);
  return (await res.json()).IpfsHash;
};

// ─── Upload batch metadata JSON → returns CID ──────────────────────────────
// This is what gets stored on-chain via createBatch(metadataCID)
export const uploadBatchMetadata = async ({ cropName, location, harvestDate, imageCID, farmerName }) => {
  const payload = {
    // Primary field names (used by our fetchBatchMetadata)
    name: cropName,
    cropName,          // redundant alias for compatibility
    location,
    farmLocation: location,  // alias for compatibility
    harvestDate,
    date: harvestDate,       // alias for compatibility
    imageCID,
    farmerName,
    createdAt: new Date().toISOString()
  };

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      pinataContent: payload,
      pinataMetadata: { name: `HerbTrace_Batch_${cropName}_${Date.now()}` }
    })
  });
  if (!res.ok) throw new Error(`Metadata upload failed: ${res.statusText}`);
  return (await res.json()).IpfsHash;
};

// ─── Fetch batch metadata JSON from IPFS by CID ────────────────────────────
// Handles multiple metadata formats (our Pinata JSON, Member 4's Java server JSON, etc.)
// Always returns a normalized object with: { name, location, harvestDate, imageCID, farmerName }
export const fetchBatchMetadata = async (metadataCID) => {
  if (!metadataCID || metadataCID === "") return null;
  try {
    const clean = metadataCID.replace("ipfs://", "").trim();
    const res = await fetch(`${IPFS_GATEWAY}/${clean}`);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    // If the CID points to an image (not JSON), return null — no metadata available
    if (contentType.includes("image") || contentType.includes("octet-stream")) {
      return null;
    }

    let raw;
    try {
      raw = await res.json();
    } catch {
      return null; // Not valid JSON (e.g. raw image)
    }

    // 🔍 DEBUG: log raw IPFS JSON so we can see actual field names from Member 1/4
    console.log("📦 IPFS Metadata raw:", JSON.stringify(raw, null, 2));

    // Member 1's IPFS JSON format: { image, name, description: "Harvested at {location} by {farmer}" }
    // Extract location and farmerName from description if no dedicated fields exist
    let parsedLocation = null;
    let parsedFarmer = null;
    if (raw.description) {
      const match = raw.description.match(/harvested at (.+?) by (.+)/i);
      if (match) {
        parsedLocation = match[1].trim();
        parsedFarmer = match[2].trim();
      }
    }

    // Normalize fields — handle different naming conventions from different team members
    return {
      name: raw.name || raw.cropName || raw.crop || raw.herbName || null,
      location: raw.location || raw.farmLocation || raw.farm_location
        || raw.farmAddress || raw.farm_address || raw.address
        || raw.village || raw.district || raw.state
        || raw.region || raw.place || raw.area
        || raw.city || raw.origin || parsedLocation || null,
      harvestDate: raw.harvestDate || raw.date || raw.harvest_date || raw.harvestdate || null,
      imageCID: raw.imageCID || raw.imagehash || raw.image_cid || raw.image || raw.imageHash || null,
      farmerName: raw.farmerName || raw.farmer_name || raw.farmer || parsedFarmer || null,
    };

  } catch (e) {
    console.warn("fetchBatchMetadata failed for CID:", metadataCID, e);
    return null;
  }
};

// ─── Resolve an IPFS hash to a full URL ────────────────────────────────────
export const ipfsUrl = (cid) => {
  if (!cid || cid === "null" || cid === "") return null;
  const clean = String(cid).replace("ipfs://", "").trim();
  if (clean.startsWith("http")) return clean;
  return `${IPFS_GATEWAY}/${clean}`;
};