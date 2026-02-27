import React, { useState, useEffect } from 'react';
import {
  Truck, CheckCircle, Package, RefreshCw,
  MapPin, Loader2, ImageOff, ShieldCheck, Calendar, Leaf, Beaker
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
    if (src?.includes("dweb.link")) setSrc(`https://ipfs.io/ipfs/${src.split("/ipfs/")[1]}`);
    else setErr(true);
  };

  if (err) return (
    <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400">
      <ImageOff size={32} className="opacity-40" />
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

      for (let i = BATCH_ID_START; i < nextId; i++) {
        try {
          const b = await contract.batches(i);
          if (!b[4]) continue;
          const stage = Number(b[3]);
          if (stage < 2) continue;

          const metadataCID = b[1];
          const meta = await fetchBatchMetadata(metadataCID);

          let labData = null;
          try {
            const report = await contract.getLabReport(i);
            if (report && report.purity) labData = { purity: report.purity, notes: report.notes };
          } catch (e) { }

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
        } catch (err) { }
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
      alert(`✅ Batch #${selectedBatch.id} dispatched!`);
      fetchBatches();
      setSelectedBatch(null);
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] bg-stone-50 overflow-hidden">

      {/* ── Sidebar ── */}
      <div className="w-72 bg-white border-r border-stone-200 flex flex-col">
        <div className="px-4 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
              <Truck size={15} className="text-purple-600" /> Logistics Hub
            </h2>
            <p className="text-[11px] text-stone-400 mt-0.5">Verified batches ready to ship</p>
          </div>
          <button
            onClick={fetchBatches}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isFetching ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-2">
              <Loader2 className="animate-spin" size={22} />
              <p className="text-xs">Loading from blockchain…</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-2">
              <Truck size={28} className="opacity-30" />
              <p className="text-xs">No verified batches ready</p>
            </div>
          ) : (
            batches.map((batch) => (
              <button
                key={batch.id}
                onClick={() => setSelectedBatch(batch)}
                className={`w-full text-left px-4 py-3 border-b border-stone-50 transition-colors ${selectedBatch?.id === batch.id
                    ? 'bg-purple-50 border-l-2 border-l-purple-500'
                    : 'hover:bg-stone-50'
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{batch.crop}</p>
                    <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                      #{batch.id}{batch.location ? ` · ${batch.location}` : ''}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${batch.stage >= 3
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                    {batch.stage >= 3 ? 'Shipped' : 'Ready'}
                  </span>
                </div>
                {batch.labData && (
                  <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
                    <ShieldCheck size={10} /> Purity: {batch.labData.purity}%
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedBatch ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-300 gap-3">
            <Truck size={48} className="opacity-20" />
            <p className="text-sm font-medium text-stone-400">Select a batch to manage</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">

            {/* Header */}
            <div className="bg-white rounded-2xl border border-stone-100 p-5 flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-stone-900">{selectedBatch.crop}</h1>
                <div className="flex flex-wrap gap-4 text-xs text-stone-500 mt-1">
                  {selectedBatch.location && (
                    <span className="flex items-center gap-1"><MapPin size={11} />{selectedBatch.location}</span>
                  )}
                  {selectedBatch.date && (
                    <span className="flex items-center gap-1"><Calendar size={11} />{selectedBatch.date}</span>
                  )}
                  <span className="font-mono">#{selectedBatch.id}</span>
                </div>
              </div>
              {selectedBatch.labData && (
                <div className="text-right">
                  <p className="text-[10px] text-stone-400 uppercase font-semibold tracking-wide">Purity</p>
                  <p className="text-3xl font-black text-green-600 leading-none">{selectedBatch.labData.purity}%</p>
                  {selectedBatch.labData.notes && (
                    <p className="text-xs text-stone-400 italic mt-0.5 max-w-[140px] text-right">{selectedBatch.labData.notes}</p>
                  )}
                </div>
              )}
            </div>

            {/* Image + Shipping */}
            <div className="grid grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden h-72">
                <ImageWithFallback ipfsHash={selectedBatch.imageCID} alt="Crop" />
              </div>

              <div className="bg-white rounded-2xl border border-stone-100 p-5 flex flex-col">
                <h3 className="text-sm font-semibold text-stone-900 mb-5 flex items-center gap-2">
                  <Truck size={14} className="text-purple-600" /> Shipping Status
                </h3>

                <div className="relative pl-5 border-l-2 border-stone-100 space-y-7 flex-1">
                  {[
                    { label: 'Lab Verification', sub: 'Purity stored on blockchain', done: true, Icon: Beaker, color: 'bg-blue-600' },
                    { label: 'Out for Delivery', sub: selectedBatch.stage >= 3 ? 'Dispatched' : 'Awaiting dispatch', done: selectedBatch.stage >= 3, Icon: Truck, color: 'bg-purple-600' },
                  ].map(({ label, sub, done, Icon, color }) => (
                    <div key={label} className="relative">
                      <div className={`absolute -left-[25px] p-1.5 rounded-full border-2 border-white shadow-sm ${done ? color : 'bg-stone-200'}`}>
                        <Icon size={11} className="text-white" />
                      </div>
                      <p className="text-sm font-semibold text-stone-800">{label}</p>
                      <p className={`text-xs mt-0.5 ${done ? 'text-green-600' : 'text-stone-400'}`}>{sub}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  {selectedBatch.stage < 3 ? (
                    <button
                      onClick={markAsShipped}
                      disabled={loading}
                      className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-purple-700 flex justify-center items-center gap-2 transition disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Truck size={15} />}
                      {loading ? 'Processing…' : 'Dispatch Shipment'}
                    </button>
                  ) : (
                    <div className="w-full bg-green-50 text-green-700 border border-green-200 py-3 rounded-xl font-semibold text-sm flex justify-center items-center gap-2">
                      <CheckCircle size={15} /> Shipment Completed
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default Distributor;