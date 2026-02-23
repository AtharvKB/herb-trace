import React, { useState, useEffect } from 'react';
import {
  Search, CheckCircle, Clock, AlertTriangle, ImageOff,
  ExternalLink, Beaker, MapPin, Calendar, Leaf, ShieldCheck, Loader2, FileCheck
} from 'lucide-react';
import { getReadOnlyContract } from '../utils/contract';
import { fetchBatchMetadata, ipfsUrl } from '../utils/pinata';

const ImageWithFallback = ({ ipfsHash, alt }) => {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!ipfsHash) { setErr(true); return; }
    const clean = String(ipfsHash).replace("ipfs://", "").trim();
    setSrc(clean.startsWith("http") ? clean : `https://dweb.link/ipfs/${clean}`);
  }, [ipfsHash]);

  const handleError = () => {
    if (src?.includes("dweb.link")) {
      setSrc(`https://ipfs.io/ipfs/${src.split("/ipfs/")[1]}`);
    } else setErr(true);
  };

  if (err) return (
    <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center text-gray-300">
      <ImageOff size={32} />
    </div>
  );
  return <img src={src} alt={alt} onError={handleError} className="w-full h-full object-cover" />;
};

const Track = ({ prefillId }) => {
  const [searchId, setSearchId] = useState(prefillId || '');
  const [productData, setProductData] = useState(null);
  const [labData, setLabData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doSearch = async (id) => {
    if (!id) return;
    setLoading(true); setError(""); setProductData(null); setLabData(null);

    try {
      const contract = await getReadOnlyContract();

      // batches(id) → (uint256 id, string metadataCID, address farmer, uint8 stage, bool exists)
      const b = await contract.batches(id);
      if (!b[4]) { // exists = false
        setError("Batch ID not found on blockchain. Please check the ID.");
        return;
      }

      const stage = Number(b[3]);
      const metadataCID = b[1];
      const farmer = b[2];

      // Fetch crop details from IPFS JSON
      const meta = await fetchBatchMetadata(metadataCID);

      setProductData({
        id,
        metadataCID,
        farmer,
        stage,
        name: meta?.name || meta?.cropName || `Batch #${id}`,
        location: meta?.location || meta?.farmLocation || null,
        harvestDate: meta?.harvestDate || meta?.date || null,
        imageCID: meta?.imageCID || meta?.imagehash || meta?.image || null,
      });

      // Fetch lab report from blockchain if verified
      if (stage >= 2) {
        try {
          const report = await contract.getLabReport(id);
          // report = { reportIPFS, purity, notes, timestamp, labTech }
          if (report && report.purity) {
            setLabData({
              purity: report.purity,
              notes: report.notes,
              reportIPFS: report.reportIPFS,
              timestamp: Number(report.timestamp) > 0
                ? new Date(Number(report.timestamp) * 1000).toLocaleDateString()
                : null,
              labTech: report.labTech
            });
          }
        } catch (e) {
          console.warn("getLabReport failed:", e);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to Sepolia network. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (prefillId) doSearch(prefillId);
  }, [prefillId]);

  const handleSearch = (e) => {
    e.preventDefault();
    doSearch(searchId);
  };

  const stageLabel = (s) =>
    ["Pending Lab", "Lab Processing", "Lab Verified", "Shipped"][Math.min(s, 3)] || "Unknown";
  const stageColor = (s) =>
    s >= 2 ? "bg-green-500 text-white" : "bg-yellow-400 text-yellow-900";

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero */}
      <div className="bg-gradient-to-r from-green-800 to-emerald-600 pb-32 pt-16 px-6 text-center text-white shadow-xl">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3">Track Your Product</h1>
        <p className="text-green-200 text-lg">Verify authenticity directly on the blockchain</p>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-20">
        {/* Search */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-10">
          <form onSubmit={handleSearch} className="flex gap-4 max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-4 text-gray-400" size={20} />
              <input
                type="number"
                placeholder="Enter Batch ID (e.g. 101)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              {loading ? "Tracing..." : "Trace"}
            </button>
          </form>
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center justify-center gap-2 border border-red-100">
              <AlertTriangle size={20} /> {error}
            </div>
          )}
        </div>

        {/* Results */}
        {productData && (
          <div className="grid md:grid-cols-12 gap-8">

            {/* Product Card */}
            <div className="md:col-span-4">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border">
                <div className="h-56 relative">
                  <ImageWithFallback ipfsHash={productData.imageCID} alt={productData.name} />
                  <div className="absolute top-3 right-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-bold ${stageColor(productData.stage)}`}>
                      {stageLabel(productData.stage)}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">{productData.name}</h2>
                  <p className="text-green-600 text-sm font-mono mb-5">Batch #{productData.id}</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 uppercase">Farm Origin</p>
                        {productData.location
                          ? <p className="text-gray-800 font-medium">{productData.location}</p>
                          : <p className="text-gray-400 text-sm italic">Not specified</p>
                        }
                      </div>
                    </div>
                    {productData.harvestDate && (
                      <div className="flex items-start gap-3">
                        <Calendar size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400 uppercase">Harvest Date</p>
                          <p className="text-gray-800 font-medium">{productData.harvestDate}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="w-4.5 flex-shrink-0 mt-0.5">
                        <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase">Farmer Wallet</p>
                        <p className="text-gray-700 font-mono text-xs break-all">{productData.farmer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Journey Timeline */}
            <div className="md:col-span-4">
              <div className="bg-white rounded-2xl shadow-lg p-8 border h-full">
                <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                  <Clock className="text-green-600" /> Supply Chain Journey
                </h3>
                <div className="relative pl-8 border-l-2 border-gray-100 space-y-10">

                  <div className="relative">
                    <div className="absolute -left-[41px] bg-green-500 p-2 rounded-full border-4 border-white text-white shadow">
                      <Leaf size={16} />
                    </div>
                    <h4 className="font-bold text-gray-800">Harvested</h4>
                    {productData.location && <p className="text-sm text-gray-500">{productData.location}</p>}
                    <span className="text-xs text-green-600 font-semibold">✓ Recorded on Blockchain</span>
                  </div>

                  <div className="relative">
                    <div className={`absolute -left-[41px] p-2 rounded-full border-4 border-white text-white shadow ${productData.stage >= 2 ? 'bg-blue-500' : 'bg-gray-200'
                      }`}>
                      <Beaker size={16} />
                    </div>
                    <div className={productData.stage >= 2 ? "" : "opacity-40"}>
                      <h4 className="font-bold text-gray-800">Lab Verified</h4>
                      {productData.stage >= 2
                        ? <span className="text-xs text-blue-600 font-semibold">✓ Purity & report on blockchain</span>
                        : <p className="text-sm text-gray-400">Awaiting lab analysis</p>}
                    </div>
                  </div>

                  <div className="relative">
                    <div className={`absolute -left-[41px] p-2 rounded-full border-4 border-white text-white shadow ${productData.stage >= 3 ? 'bg-purple-500' : 'bg-gray-200'
                      }`}>
                      <CheckCircle size={16} />
                    </div>
                    <div className={productData.stage >= 3 ? "" : "opacity-40"}>
                      <h4 className="font-bold text-gray-800">Distributed</h4>
                      {productData.stage >= 3
                        ? <span className="text-xs text-purple-600 font-semibold">✓ Shipped to market</span>
                        : <p className="text-sm text-gray-400">Awaiting dispatch</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Certificate */}
            <div className="md:col-span-4">
              {productData.stage >= 2 && labData ? (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg border border-green-100 p-6 h-full flex flex-col">
                  <div className="flex items-center mb-5 gap-2">
                    <ShieldCheck className="text-green-600" size={26} />
                    <h3 className="font-bold text-green-900 text-lg">Quality Certificate</h3>
                  </div>
                  <div className="flex-1 flex flex-col justify-center items-center text-center mb-6">
                    <p className="text-xs font-bold text-green-700 uppercase mb-1">Purity Score</p>
                    <div className="text-6xl font-extrabold text-green-600 mb-2">{labData.purity}%</div>
                    <p className="text-sm text-gray-600 italic">"{labData.notes}"</p>
                    {labData.timestamp && (
                      <p className="text-xs text-gray-400 mt-2">Verified: {labData.timestamp}</p>
                    )}
                  </div>
                  <div className="space-y-2 mt-auto">
                    <p className="text-[10px] text-center text-gray-400 uppercase font-medium">
                      ⛓ Data stored directly on blockchain
                    </p>
                    {labData.reportIPFS && labData.reportIPFS !== "No_Report_Uploaded" && (
                      <a
                        href={ipfsUrl(labData.reportIPFS)}
                        target="_blank" rel="noreferrer"
                        className="flex items-center justify-center w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition"
                      >
                        <FileCheck size={18} className="mr-2" /> View Lab Report PDF
                      </a>
                    )}
                  </div>
                </div>
              ) : productData.stage >= 2 ? (
                <div className="bg-white rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center border">
                  <Loader2 className="animate-spin text-green-600 mb-3" size={32} />
                  <h4 className="font-bold text-gray-600">Loading Lab Data</h4>
                  <p className="text-xs text-gray-400 mt-1">Reading from blockchain...</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center border opacity-60">
                  <ShieldCheck size={36} className="text-gray-300 mb-3" />
                  <h4 className="font-bold text-gray-500">Certificate Pending</h4>
                  <p className="text-sm text-gray-400 mt-1">Awaiting lab verification</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Track;