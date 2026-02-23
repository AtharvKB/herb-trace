import React, { useState, useEffect } from 'react';
import {
  FileText, CheckCircle, Beaker, Loader2, RefreshCw,
  MapPin, Upload, FileCheck, ExternalLink, ImageOff, ShieldCheck
} from 'lucide-react';
import { getContract, getReadOnlyContract, BATCH_ID_START } from '../utils/contract';
import { uploadPdfToPinata, fetchBatchMetadata, ipfsUrl } from '../utils/pinata';

// ─── Image with IPFS fallback ─────────────────────────────────────────────────
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

// ─── Main Lab Dashboard ───────────────────────────────────────────────────────
const LabDashboard = () => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [statusText, setStatusText] = useState("");

  const [purity, setPurity] = useState("");
  const [notes, setNotes] = useState("");
  const [reportFile, setReportFile] = useState(null);

  // ── Fetch all batches from blockchain + IPFS metadata ──
  const fetchBatches = async () => {
    setIsFetching(true);
    try {
      const contract = await getReadOnlyContract();

      const nextId = Number(await contract.nextBatchId());
      const tempBatches = [];

      // Start from BATCH_ID_START (101), not 1 — batches 1–100 do not exist on this deployment
      for (let i = BATCH_ID_START; i < nextId; i++) {
        try {
          // batches() returns: (id, metadataCID, farmer, stage, exists)
          const b = await contract.batches(i);
          if (!b[4]) continue; // exists = false

          const stage = Number(b[3]);
          const metadataCID = b[1];

          // Fetch crop details from IPFS JSON
          const meta = await fetchBatchMetadata(metadataCID);

          // If already verified, fetch lab report from blockchain
          let labDetails = null;
          if (stage >= 2) {
            try {
              const report = await contract.getLabReport(i);
              // report is a tuple: { reportIPFS, purity, notes, timestamp, labTech }
              if (report && report.purity) {
                labDetails = {
                  reportIPFS: report.reportIPFS,
                  purity: report.purity,
                  notes: report.notes,
                  timestamp: Number(report.timestamp) > 0
                    ? new Date(Number(report.timestamp) * 1000).toLocaleString()
                    : null,
                  labTech: report.labTech
                };
              }
            } catch (e) { /* no report yet */ }
          }

          tempBatches.push({
            id: Number(b[0]),
            metadataCID,
            farmer: b[2],
            stage,
            // From IPFS metadata JSON:
            crop: meta?.name || `Batch #${i}`,
            location: meta?.location || meta?.farmLocation || null,
            date: meta?.harvestDate || "",
            imageCID: meta?.imageCID || null,
            labDetails
          });
        } catch (err) { /* skip bad batches */ }
      }

      setBatches(tempBatches.reverse());
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  // ── Submit lab verification — stores on BLOCKCHAIN via verifyBatch() ──
  const submitVerification = async () => {
    if (!selectedBatch) return;
    if (!purity || !notes) return alert("⚠️ Please fill in Purity % and Analysis Notes.");

    try {
      setLoading(true);
      const contract = await getContract();
      if (!contract) throw new Error("Wallet not connected!");

      // Step 1: Upload PDF to IPFS if provided
      let reportIPFS = "No_Report_Uploaded";
      if (reportFile) {
        setStatusText("Uploading PDF to IPFS...");
        reportIPFS = await uploadPdfToPinata(reportFile, selectedBatch.id);
        console.log("✅ PDF CID:", reportIPFS);
      }

      // Step 2: Call verifyBatch() → stores purity, notes, PDF CID ON-CHAIN
      setStatusText("Storing lab data on blockchain...");
      const tx = await contract.verifyBatch(
        selectedBatch.id,
        reportIPFS,
        purity,
        notes
      );
      await tx.wait();

      alert(`✅ Batch #${selectedBatch.id} verified!\nPurity, notes & PDF CID stored on blockchain.`);

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
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-5 border-b bg-green-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-green-800 flex items-center">
            <Beaker className="mr-2" /> Lab Queue
          </h2>
          <button
            onClick={fetchBatches}
            className="text-green-700 hover:text-green-900 p-2 rounded-full hover:bg-green-100 transition"
          >
            <RefreshCw size={20} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isFetching ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm">Loading batches...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Beaker size={32} className="mx-auto mb-2 opacity-30" />
              <p>No batches found.</p>
            </div>
          ) : (
            batches.map((batch) => (
              <div
                key={batch.id}
                onClick={() => {
                  setSelectedBatch(batch);
                  setPurity(""); setNotes(""); setReportFile(null);
                }}
                className={`p-4 border-b cursor-pointer transition hover:bg-green-50 ${selectedBatch?.id === batch.id ? "bg-green-100 border-l-4 border-l-green-600" : ""
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-800">{batch.crop}</h4>
                    <p className="text-xs text-gray-500 font-mono">ID: #{batch.id}{batch.location ? ` · ${batch.location}` : ""}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold whitespace-nowrap ${batch.stage < 2
                    ? "bg-yellow-100 text-yellow-800"
                    : batch.stage >= 3
                      ? "bg-purple-100 text-purple-800"
                      : "bg-green-100 text-green-800"
                    }`}>
                    {batch.stage < 2 ? "Pending" : batch.stage >= 3 ? "Shipped" : "Verified ✓"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="w-2/3 p-8 overflow-y-auto">
        {!selectedBatch ? (
          <div className="h-full flex flex-col justify-center items-center text-gray-300">
            <Beaker size={80} className="mb-4 opacity-20" />
            <p className="text-xl font-semibold">Select a batch to review</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 p-8">

            {/* Header */}
            <div className="mb-6 border-b pb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-1">{selectedBatch.crop}</h1>
                  <div className="flex gap-4 text-gray-500 text-sm">
                    <span className="flex items-center">
                      <MapPin size={14} className="mr-1" />
                      {selectedBatch.location || <span className="italic text-gray-400">Location not specified</span>}
                    </span>
                    {selectedBatch.date && (
                      <span className="flex items-center"><FileText size={14} className="mr-1" />{selectedBatch.date}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-mono bg-gray-100 px-3 py-1 rounded-full">Batch #{selectedBatch.id}</span>
              </div>
            </div>

            {/* Crop Image */}
            <div className="bg-gray-100 rounded-xl overflow-hidden border mb-6 h-64">
              <ImageWithFallback ipfsHash={selectedBatch.imageCID} alt="Crop" />
            </div>

            {/* ── PENDING: Verification form ── */}
            {selectedBatch.stage < 2 ? (
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-lg font-bold text-blue-900 mb-5 flex items-center">
                  <Beaker size={20} className="mr-2" /> Lab Verification
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Purity %</label>
                    <input
                      type="number" min="0" max="100" step="0.1"
                      placeholder="e.g. 98.5"
                      value={purity}
                      onChange={(e) => setPurity(e.target.value)}
                      className="w-full p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Analysis Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. No contaminants found"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-bold text-blue-800 uppercase mb-2">
                    Lab Report PDF <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <label className="cursor-pointer inline-flex items-center bg-white border border-blue-300 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition text-sm font-medium">
                    <Upload size={16} className="mr-2" />
                    {reportFile ? reportFile.name : "Select PDF File"}
                    <input
                      type="file" accept="application/pdf" className="hidden"
                      onChange={(e) => setReportFile(e.target.files[0])}
                    />
                  </label>
                  {reportFile && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle size={12} /> {reportFile.name} ready to upload
                    </p>
                  )}
                </div>

                <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 mb-5 text-xs text-blue-800">
                  <strong>Blockchain storage:</strong> Purity %, notes, and PDF CID will be written
                  directly to the smart contract via <code>verifyBatch()</code>. This is permanent and
                  publicly verifiable by anyone.
                </div>

                <button
                  onClick={submitVerification}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 flex justify-center items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? <><Loader2 className="animate-spin" />{statusText || "Processing..."}</>
                    : <><CheckCircle size={20} />Approve &amp; Write to Blockchain</>
                  }
                </button>
              </div>

            ) : (
              /* ── VERIFIED: Show on-chain lab data ── */
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center justify-center mb-6 text-green-800">
                  <ShieldCheck size={32} className="mr-2" />
                  <h3 className="text-2xl font-bold">Verified on Blockchain</h3>
                </div>

                {selectedBatch.labDetails ? (
                  <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm">
                    <h4 className="font-bold text-gray-700 border-b pb-2 mb-4 text-sm uppercase tracking-wide">
                      On-Chain Lab Data
                    </h4>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div>
                        <p className="text-gray-400 uppercase text-xs mb-1">Purity Score</p>
                        <p className="font-black text-green-600 text-4xl">{selectedBatch.labDetails.purity}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400 uppercase text-xs mb-1">Analysis Notes</p>
                        <p className="font-medium text-gray-800">{selectedBatch.labDetails.notes}</p>
                        {selectedBatch.labDetails.timestamp && (
                          <p className="text-xs text-gray-400 mt-1">{selectedBatch.labDetails.timestamp}</p>
                        )}
                      </div>

                      {selectedBatch.labDetails.reportIPFS &&
                        selectedBatch.labDetails.reportIPFS !== "No_Report_Uploaded" && (
                          <div className="col-span-2">
                            <a
                              href={ipfsUrl(selectedBatch.labDetails.reportIPFS)}
                              target="_blank" rel="noreferrer"
                              className="flex items-center justify-center bg-blue-50 text-blue-700 p-3 rounded-lg hover:bg-blue-100 transition border border-blue-200 font-bold text-sm"
                            >
                              <FileCheck size={18} className="mr-2" /> View Lab Report PDF
                              <ExternalLink size={14} className="ml-2 opacity-50" />
                            </a>
                          </div>
                        )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <p className="text-sm">Lab report data is on-chain but could not be fetched.</p>
                    <p className="text-xs text-gray-400 mt-1">Check network / MetaMask connection.</p>
                  </div>
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