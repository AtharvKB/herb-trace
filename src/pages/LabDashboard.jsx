import React, { useState, useEffect } from 'react';
import {
  FileText, CheckCircle, Beaker, Loader2, RefreshCw,
  MapPin, Upload, FileCheck, ExternalLink, ImageOff, ShieldCheck, Calendar
} from 'lucide-react';
import { getContract, getReadOnlyContract, BATCH_ID_START } from '../utils/contract';
import { uploadPdfToPinata, fetchBatchMetadata, ipfsUrl } from '../utils/pinata';

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

const StagePill = ({ stage }) => {
  const cfg = stage < 2
    ? { text: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    : stage >= 3
      ? { text: 'Shipped', cls: 'bg-purple-50 text-purple-700 border-purple-200' }
      : { text: 'Verified ✓', cls: 'bg-green-50 text-green-700 border-green-200' };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${cfg.cls}`}>
      {cfg.text}
    </span>
  );
};

const LabDashboard = () => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [statusText, setStatusText] = useState("");

  const [purity, setPurity] = useState("");
  const [notes, setNotes] = useState("");
  const [reportFile, setReportFile] = useState(null);

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
          const metadataCID = b[1];
          const meta = await fetchBatchMetadata(metadataCID);

          let labDetails = null;
          if (stage >= 2) {
            try {
              const report = await contract.getLabReport(i);
              if (report && report.purity) {
                labDetails = {
                  reportIPFS: report.reportIPFS,
                  purity: report.purity,
                  notes: report.notes,
                  timestamp: Number(report.timestamp) > 0
                    ? new Date(Number(report.timestamp) * 1000).toLocaleString() : null,
                  labTech: report.labTech
                };
              }
            } catch (e) { }
          }

          tempBatches.push({
            id: Number(b[0]),
            metadataCID,
            farmer: b[2],
            stage,
            crop: meta?.name || `Batch #${i}`,
            location: meta?.location || meta?.farmLocation || null,
            date: meta?.harvestDate || "",
            imageCID: meta?.imageCID || null,
            labDetails
          });
        } catch (err) { }
      }

      setBatches(tempBatches.reverse());
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  const submitVerification = async () => {
    if (!selectedBatch) return;
    if (!purity || !notes) return alert("⚠️ Please fill in Purity % and Analysis Notes.");

    try {
      setLoading(true);
      const contract = await getContract();
      if (!contract) throw new Error("Wallet not connected!");

      let reportIPFS = "No_Report_Uploaded";
      if (reportFile) {
        setStatusText("Uploading PDF to IPFS...");
        reportIPFS = await uploadPdfToPinata(reportFile, selectedBatch.id);
      }

      setStatusText("Storing on blockchain...");
      const tx = await contract.verifyBatch(selectedBatch.id, reportIPFS, purity, notes);
      await tx.wait();

      alert(`✅ Batch #${selectedBatch.id} verified! Purity, notes & PDF CID stored on blockchain.`);
      setPurity(""); setNotes(""); setReportFile(null); setSelectedBatch(null);
      fetchBatches();
    } catch (error) {
      console.error(error);
      alert("❌ Failed: " + error.message);
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] bg-stone-50 overflow-hidden">

      {/* ── Sidebar ── */}
      <div className="w-72 bg-white border-r border-stone-200 flex flex-col">
        <div className="px-4 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
              <Beaker size={15} className="text-green-600" /> Lab Queue
            </h2>
            <p className="text-[11px] text-stone-400 mt-0.5">{batches.length} batch{batches.length !== 1 ? 'es' : ''} loaded</p>
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
              <Beaker size={28} className="opacity-30" />
              <p className="text-xs">No batches found</p>
            </div>
          ) : (
            batches.map((batch) => (
              <button
                key={batch.id}
                onClick={() => { setSelectedBatch(batch); setPurity(""); setNotes(""); setReportFile(null); }}
                className={`w-full text-left px-4 py-3 border-b border-stone-50 transition-colors ${selectedBatch?.id === batch.id
                    ? 'bg-green-50 border-l-2 border-l-green-600'
                    : 'hover:bg-stone-50'
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{batch.crop}</p>
                    <p className="text-[11px] text-stone-400 font-mono mt-0.5">#{batch.id}{batch.location ? ` · ${batch.location}` : ''}</p>
                  </div>
                  <StagePill stage={batch.stage} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedBatch ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-300 gap-3">
            <Beaker size={48} className="opacity-20" />
            <p className="text-sm font-medium text-stone-400">Select a batch to review</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-5">

            {/* Header */}
            <div className="bg-white rounded-2xl border border-stone-100 p-5">
              <div className="flex items-start justify-between mb-1">
                <h1 className="text-xl font-bold text-stone-900">{selectedBatch.crop}</h1>
                <span className="text-[11px] font-mono bg-stone-100 text-stone-500 px-2 py-0.5 rounded-lg">
                  #{selectedBatch.id}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-stone-500">
                {selectedBatch.location && (
                  <span className="flex items-center gap-1"><MapPin size={11} />{selectedBatch.location}</span>
                )}
                {selectedBatch.date && (
                  <span className="flex items-center gap-1"><Calendar size={11} />{selectedBatch.date}</span>
                )}
              </div>
            </div>

            {/* Image */}
            <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden h-56">
              <ImageWithFallback ipfsHash={selectedBatch.imageCID} alt="Crop" />
            </div>

            {/* Pending: Verification form */}
            {selectedBatch.stage < 2 ? (
              <div className="bg-white rounded-2xl border border-stone-100 p-5">
                <h3 className="text-sm font-semibold text-stone-900 mb-4 flex items-center gap-2">
                  <Beaker size={15} className="text-blue-600" /> Lab Verification
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Purity %</label>
                    <input
                      type="number" min="0" max="100" step="0.1"
                      placeholder="e.g. 98.5"
                      value={purity}
                      onChange={(e) => setPurity(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Analysis Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. No contaminants"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                    Lab Report PDF <span className="text-stone-300 font-normal">(optional)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer bg-stone-50 border border-stone-200 text-stone-600 px-4 py-2 rounded-xl text-sm hover:bg-stone-100 transition font-medium">
                    <Upload size={14} />
                    {reportFile ? reportFile.name : "Select PDF"}
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setReportFile(e.target.files[0])} />
                  </label>
                  {reportFile && (
                    <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                      <CheckCircle size={11} /> {reportFile.name} ready
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-xs text-blue-700">
                  <strong>On-chain storage:</strong> Purity %, notes, and PDF CID are written permanently via <code className="bg-blue-100 px-1 rounded">verifyBatch()</code>.
                </div>

                <button
                  onClick={submitVerification}
                  disabled={loading}
                  className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-800 flex justify-center items-center gap-2 transition disabled:opacity-50"
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" />{statusText || "Processing…"}</>
                    : <><CheckCircle size={16} />Approve & Write to Blockchain</>
                  }
                </button>
              </div>
            ) : (
              /* Verified — show on-chain lab data */
              <div className="bg-white rounded-2xl border border-stone-100 p-5">
                <div className="flex items-center gap-2 mb-5">
                  <ShieldCheck size={18} className="text-green-600" />
                  <h3 className="text-sm font-semibold text-stone-900">Verified on Blockchain</h3>
                </div>

                {selectedBatch.labDetails ? (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                        <p className="text-[10px] uppercase font-semibold text-stone-400 mb-1">Purity Score</p>
                        <p className="text-4xl font-black text-green-600">{selectedBatch.labDetails.purity}%</p>
                      </div>
                      <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                        <p className="text-[10px] uppercase font-semibold text-stone-400 mb-1">Notes</p>
                        <p className="text-sm font-medium text-stone-800">{selectedBatch.labDetails.notes}</p>
                        {selectedBatch.labDetails.timestamp && (
                          <p className="text-xs text-stone-400 mt-1">{selectedBatch.labDetails.timestamp}</p>
                        )}
                      </div>
                    </div>

                    {selectedBatch.labDetails.reportIPFS &&
                      selectedBatch.labDetails.reportIPFS !== "No_Report_Uploaded" && (
                        <a
                          href={ipfsUrl(selectedBatch.labDetails.reportIPFS)}
                          target="_blank" rel="noreferrer"
                          className="flex items-center justify-center gap-2 bg-stone-50 text-stone-700 border border-stone-200 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-100 transition"
                        >
                          <FileCheck size={15} /> View Lab Report PDF
                          <ExternalLink size={12} className="opacity-40" />
                        </a>
                      )}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500 text-center py-4">
                    Lab data is on-chain but could not be fetched. Check MetaMask.
                  </p>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default LabDashboard;