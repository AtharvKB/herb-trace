import React, { useState, useEffect } from 'react';
import {
  Search, CheckCircle, Clock, AlertTriangle, ImageOff,
  ExternalLink, Beaker, MapPin, Calendar, Leaf, ShieldCheck, Loader2, FileCheck, ArrowRight
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
    <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400">
      <ImageOff size={28} />
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
      const b = await contract.batches(id);
      if (!b[4]) {
        setError("Batch ID not found on blockchain. Please check the ID.");
        return;
      }

      const stage = Number(b[3]);
      const metadataCID = b[1];
      const farmer = b[2];
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

      if (stage >= 2) {
        try {
          const report = await contract.getLabReport(id);
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

  useEffect(() => { if (prefillId) doSearch(prefillId); }, [prefillId]);

  const handleSearch = (e) => {
    e.preventDefault();
    doSearch(searchId);
  };

  const stageLabel = (s) => ["Pending Lab", "Lab Processing", "Lab Verified", "Shipped"][Math.min(s, 3)] || "Unknown";
  const stageDot = (s) => s >= 2 ? 'bg-green-500' : 'bg-amber-400';
  const stageText = (s) => s >= 2 ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <div className="page-enter min-h-screen">
      {/* Top search bar area */}
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-bold text-stone-900 mb-1">Track Product</h1>
          <p className="text-stone-500 text-sm mb-6">Verify authenticity directly on the Sepolia blockchain.</p>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
              <input
                type="number"
                placeholder="Enter Batch ID (e.g. 101)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-sm placeholder-stone-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-xl font-semibold text-sm hover:bg-green-800 transition disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? "Tracing…" : "Trace"}
            </button>
          </form>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {productData && (
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid md:grid-cols-3 gap-6">

            {/* Card 1 — Product */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="h-48 relative bg-stone-100">
                <ImageWithFallback ipfsHash={productData.imageCID} alt={productData.name} />
                <div className="absolute top-3 left-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${stageText(productData.stage)}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${stageDot(productData.stage)}`} />
                    {stageLabel(productData.stage)}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h2 className="text-lg font-bold text-stone-900">{productData.name}</h2>
                <p className="text-xs font-mono text-stone-400 mb-4">Batch #{productData.id}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-stone-400 uppercase font-semibold tracking-wide">Farm Origin</p>
                      <p className="text-sm text-stone-700">{productData.location || <span className="italic text-stone-400">Not specified</span>}</p>
                    </div>
                  </div>
                  {productData.harvestDate && (
                    <div className="flex items-start gap-2.5">
                      <Calendar size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-stone-400 uppercase font-semibold tracking-wide">Harvest Date</p>
                        <p className="text-sm text-stone-700">{productData.harvestDate}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400 uppercase font-semibold tracking-wide">Farmer Wallet</p>
                      <p className="text-stone-600 font-mono text-[11px] break-all">{productData.farmer}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 — Journey timeline */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-stone-900 mb-6 flex items-center gap-2">
                <Clock size={15} className="text-stone-400" /> Supply Chain Journey
              </h3>
              <div className="relative pl-6 border-l-2 border-stone-100 space-y-8">
                {[
                  { label: 'Harvested', sub: productData.location, active: true, Icon: Leaf, color: 'bg-green-600' },
                  { label: 'Lab Verified', sub: productData.stage >= 2 ? 'Purity & report on blockchain' : 'Awaiting lab analysis', active: productData.stage >= 2, Icon: Beaker, color: 'bg-blue-600' },
                  { label: 'Distributed', sub: productData.stage >= 3 ? 'Shipped to market' : 'Awaiting dispatch', active: productData.stage >= 3, Icon: CheckCircle, color: 'bg-purple-600' },
                ].map(({ label, sub, active, Icon, color }) => (
                  <div key={label} className="relative">
                    <div className={`absolute -left-[29px] p-1.5 rounded-full border-2 border-white shadow-sm ${active ? color : 'bg-stone-200'}`}>
                      <Icon size={12} className="text-white" />
                    </div>
                    <div className={active ? '' : 'opacity-40'}>
                      <p className="text-sm font-semibold text-stone-800">{label}</p>
                      {sub && <p className={`text-xs mt-0.5 ${active ? 'text-green-600' : 'text-stone-400'}`}>{sub}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3 — Certificate */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm">
              {productData.stage >= 2 && labData ? (
                <div className="p-6 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <ShieldCheck size={18} className="text-green-600" />
                    <h3 className="text-sm font-semibold text-stone-900">Quality Certificate</h3>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center mb-6">
                    <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-2">Purity Score</p>
                    <div className="text-6xl font-black text-green-600 leading-none mb-3">{labData.purity}%</div>
                    <p className="text-sm text-stone-500 italic max-w-[200px]">"{labData.notes}"</p>
                    {labData.timestamp && (
                      <p className="text-xs text-stone-400 mt-2">Verified {labData.timestamp}</p>
                    )}
                  </div>
                  <div className="space-y-2 mt-auto">
                    <p className="text-[10px] text-center text-stone-400 uppercase font-semibold tracking-wide">
                      Stored on-chain · Immutable
                    </p>
                    {labData.reportIPFS && labData.reportIPFS !== "No_Report_Uploaded" && (
                      <a
                        href={ipfsUrl(labData.reportIPFS)}
                        target="_blank" rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-green-700 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-green-800 transition"
                      >
                        <FileCheck size={15} /> View Lab Report
                      </a>
                    )}
                  </div>
                </div>
              ) : productData.stage >= 2 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <Loader2 className="animate-spin text-green-600 mb-3" size={28} />
                  <p className="text-sm font-semibold text-stone-600">Loading Lab Data</p>
                  <p className="text-xs text-stone-400 mt-1">Reading from blockchain…</p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50">
                  <ShieldCheck size={32} className="text-stone-300 mb-3" />
                  <p className="text-sm font-semibold text-stone-500">Certificate Pending</p>
                  <p className="text-xs text-stone-400 mt-1">Awaiting lab verification</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Empty state */}
      {!productData && !loading && !error && (
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={20} className="text-stone-400" />
          </div>
          <p className="text-stone-500 text-sm">Enter a Batch ID above to trace a product</p>
        </div>
      )}
    </div>
  );
};

export default Track;