import React, { useState, useEffect } from 'react';
import {
  Truck, CheckCircle, Package, RefreshCw,
  MapPin, Loader2, ImageOff, ShieldCheck
} from 'lucide-react';
import { getContract, getReadOnlyContract, BATCH_ID_START } from '../utils/contract';
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
    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
      <ImageOff size={48} className="opacity-50" />
    </div>
  );
  return <img src={src} alt={alt} onError={handleError} className="w-full h-full object-cover" />;
};

const Distributor = () => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const fetchBatches = async () => {
    setIsFetching(true);
    try {
      const contract = await getReadOnlyContract();

      const nextId = Number(await contract.nextBatchId());
      const tempBatches = [];

      // Start from BATCH_ID_START (101); IDs 1–100 don't exist on this deployment
      for (let i = BATCH_ID_START; i < nextId; i++) {
        try {
          // batches(i) → (id, metadataCID, farmer, stage, exists)
          const b = await contract.batches(i);
          if (!b[4]) continue; // not exists
          const stage = Number(b[3]);
          if (stage < 2) continue; // only show Verified (2) or Shipped (3)

          const metadataCID = b[1];
          const meta = await fetchBatchMetadata(metadataCID);

          // Fetch lab data from blockchain
          let labData = null;
          try {
            const report = await contract.getLabReport(i);
            if (report && report.purity) {
              labData = { purity: report.purity, notes: report.notes };
            }
          } catch (e) { /* no lab data */ }

          tempBatches.push({
            id: Number(b[0]),
            metadataCID,
            farmer: b[2],
            stage,
            crop: meta?.name || meta?.cropName || `Batch #${i}`,
            location: meta?.location || meta?.farmLocation || null,
            date: meta?.harvestDate || meta?.date || null,
            imageCID: meta?.imageCID || meta?.imagehash || meta?.image || null,
            labData
          });
        } catch (err) { /* skip */ }
      }

      setBatches(tempBatches.reverse());
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  const markAsShipped = async () => {
    if (!selectedBatch) return;
    setLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.updateStage(selectedBatch.id, 3);
      await tx.wait();
      alert(`🚚 Batch #${selectedBatch.id} dispatched!`);
      fetchBatches();
      setSelectedBatch(null);
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-1/3 bg-white border-r flex flex-col shadow-lg">
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-purple-900 flex items-center">
              <Truck className="mr-2 text-purple-600" /> Logistics Hub
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Verified batches ready to ship</p>
          </div>
          <button
            onClick={fetchBatches}
            className="text-purple-600 hover:bg-purple-100 p-2 rounded-full transition"
          >
            <RefreshCw size={20} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {isFetching ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm">Loading batches...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Truck size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No verified batches ready.</p>
            </div>
          ) : (
            batches.map((batch) => (
              <div
                key={batch.id}
                onClick={() => setSelectedBatch(batch)}
                className={`p-4 rounded-xl cursor-pointer border transition ${selectedBatch?.id === batch.id
                  ? "bg-purple-50 border-purple-300 shadow-sm"
                  : "bg-white border-gray-100 hover:bg-gray-50"
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 ${batch.stage >= 3 ? "bg-green-500" : "bg-purple-500"
                      }`}>
                      {batch.stage >= 3 ? <CheckCircle size={18} /> : <Package size={18} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{batch.crop}</h4>
                      <p className="text-xs text-gray-500 font-mono">#{batch.id}{batch.location ? ` · ${batch.location}` : ""}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase whitespace-nowrap ${batch.stage >= 3 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                    {batch.stage >= 3 ? "Shipped" : "Ready"}
                  </span>
                </div>
                {batch.labData && (
                  <div className="mt-2 flex items-center gap-1 pl-13">
                    <ShieldCheck size={12} className="text-green-500 ml-13" />
                    <span className="text-xs text-green-600 font-medium ml-1">Purity: {batch.labData.purity}%</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="w-2/3 p-8 overflow-y-auto">
        {!selectedBatch ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <Truck size={64} className="mb-4" />
            <p className="text-lg font-medium">Select a batch to manage</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-extrabold mb-1 text-gray-800">{selectedBatch.crop}</h1>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {selectedBatch.location || <span className="italic text-gray-400">Location not specified</span>}
                  </span>
                  <span className="font-mono text-xs">Batch #{selectedBatch.id}</span>
                </div>
              </div>
              {selectedBatch.labData ? (
                <div className="text-right">
                  <div className="text-xs font-bold text-gray-400 uppercase">Quality Grade</div>
                  <div className="text-3xl font-black text-green-600">{selectedBatch.labData.purity}%</div>
                  <div className="text-xs text-gray-500 italic">{selectedBatch.labData.notes}</div>
                </div>
              ) : (
                <div className="text-right opacity-50">
                  <div className="text-xs font-bold text-gray-400 uppercase">Quality Grade</div>
                  <div className="text-xl font-bold text-gray-400">N/A</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden h-80 border">
                <ImageWithFallback ipfsHash={selectedBatch.imageCID} alt="Crop" />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Truck className="text-purple-600" /> Shipping Status
                  </h3>
                  <div className="relative pl-6 border-l-2 border-gray-200 space-y-8 my-6">
                    <div className="relative">
                      <div className="absolute -left-[29px] bg-green-500 p-1 rounded-full border-4 border-white">
                        <CheckCircle size={14} className="text-white" />
                      </div>
                      <p className="text-sm font-bold">Lab Verification</p>
                      <p className="text-xs text-green-600">✓ Purity stored on blockchain</p>
                    </div>
                    <div className="relative">
                      <div className={`absolute -left-[29px] p-1 rounded-full border-4 border-white ${selectedBatch.stage >= 3 ? "bg-green-500" : "bg-gray-300"
                        }`}>
                        {selectedBatch.stage >= 3
                          ? <CheckCircle size={14} className="text-white" />
                          : <div className="w-3.5 h-3.5" />
                        }
                      </div>
                      <p className="text-sm font-bold">Out for Delivery</p>
                      {selectedBatch.stage >= 3 && <p className="text-xs text-green-600">✓ Dispatched</p>}
                    </div>
                  </div>
                </div>

                {selectedBatch.stage < 3 ? (
                  <button
                    onClick={markAsShipped}
                    disabled={loading}
                    className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 flex justify-center items-center gap-2 transition disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Truck size={18} />}
                    {loading ? "Processing..." : "Dispatch Shipment"}
                  </button>
                ) : (
                  <div className="w-full bg-green-50 text-green-700 py-4 rounded-xl font-bold flex justify-center items-center gap-2 border border-green-200">
                    <CheckCircle size={18} /> Shipment Completed
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Distributor;