import React, { useState, useEffect } from 'react';
import { FlaskConical, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { getReadOnlyContract, BATCH_ID_START } from '../utils/contract';
import { fetchBatchMetadata } from '../utils/pinata';
import { useNavigate } from 'react-router-dom';

const STAGE_LABELS = ["Pending Lab", "Lab Processing", "Verified ✓", "Shipped", "Sold"];
const STAGE_COLORS = [
  "bg-yellow-100 text-yellow-800",
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-purple-100 text-purple-800",
  "bg-gray-100 text-gray-600",
];

const Lab = () => {
  const [batches, setBatches] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [nextIdDisplay, setNextIdDisplay] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingBatches();
  }, []);

  const fetchPendingBatches = async () => {
    setIsFetching(true);
    try {
      const contract = await getReadOnlyContract();

      const nextIdBigInt = await contract.nextBatchId();
      const nextId = Number(nextIdBigInt);
      setNextIdDisplay(nextId);

      const tempBatches = [];

      // Loop from BATCH_ID_START (101), not from 1
      for (let i = BATCH_ID_START; i < nextId; i++) {
        try {
          // batches(i) → (id, metadataCID, farmer, stage, exists)
          const b = await contract.batches(i);
          if (!b[4]) continue; // skip if exists=false

          const stage = Number(b[3]);
          const metadataCID = b[1];

          // Fetch crop name from IPFS metadata
          const meta = await fetchBatchMetadata(metadataCID);

          tempBatches.push({
            id: Number(b[0]),
            crop: meta?.name || `Batch #${i}`,
            location: meta?.location || null,
            farmer: b[2],
            stage,
          });
        } catch (innerError) {
          // Skip failed batches silently
        }
      }

      setBatches(tempBatches);
    } catch (err) {
      console.error("fetchPendingBatches error:", err);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-green-800 flex items-center">
          <FlaskConical className="mr-2" /> Lab Quality Control
        </h2>
        <div className="flex items-center gap-3">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            Next Batch ID: #{nextIdDisplay}
          </span>
          <button
            onClick={fetchPendingBatches}
            disabled={isFetching}
            className="text-green-700 hover:text-green-900 p-2 rounded-full hover:bg-green-100 transition"
            title="Refresh"
          >
            <RefreshCw size={20} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-green-50 text-green-800">
              <th className="p-4 border-b">ID</th>
              <th className="p-4 border-b">Crop</th>
              <th className="p-4 border-b">Location</th>
              <th className="p-4 border-b">Stage</th>
              <th className="p-4 border-b text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {isFetching ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin h-8 w-8 text-green-600 mb-2" />
                    <p>Loading batches from Blockchain...</p>
                    <p className="text-xs text-gray-400">(Fetching IDs {BATCH_ID_START}–{nextIdDisplay > 0 ? nextIdDisplay - 1 : "..."})</p>
                  </div>
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">No batches found.</td>
              </tr>
            ) : (
              batches.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-4 border-b font-mono text-sm">#{item.id}</td>
                  <td className="p-4 border-b font-medium">{item.crop}</td>
                  <td className="p-4 border-b text-sm text-gray-500">{item.location || <span className="italic text-gray-300">—</span>}</td>
                  <td className="p-4 border-b">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${STAGE_COLORS[Math.min(item.stage, 4)]}`}>
                      {STAGE_LABELS[Math.min(item.stage, 4)]}
                    </span>
                  </td>
                  <td className="p-4 border-b text-center">
                    {item.stage < 2 ? (
                      // Navigate to LabDashboard where they fill in purity + PDF properly
                      <button
                        onClick={() => navigate('/lab')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold flex items-center gap-1 mx-auto"
                      >
                        <ExternalLink size={14} /> Open Lab Dashboard
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">Done</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Lab;