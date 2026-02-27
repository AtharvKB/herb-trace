import React, { useState } from 'react';
import axios from 'axios';
import { Upload, MapPin, Calendar, Sprout, Loader2, CheckCircle, ChevronDown } from 'lucide-react';
import { getContract } from '../utils/contract';
import { uploadBatchMetadata } from '../utils/pinata';
import { QRCodeCanvas } from 'qrcode.react';

const CROPS = ["Ashwagandha", "Tulsi (Holy Basil)", "Turmeric", "Brahmi", "Neem", "Giloy"];

const STEPS = ["Upload Image", "Store Metadata", "Sign Transaction", "Confirm on Chain"];

const Farmer = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [stepIndex, setStepIndex] = useState(-1);
  const [qrData, setQrData] = useState(null);

  const [formData, setFormData] = useState({
    cropName: 'Ashwagandha',
    location: '',
    harvestDate: '',
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return alert("Please select a crop image!");
    if (!formData.location) return alert("Please enter the farm location!");
    if (!formData.harvestDate) return alert("Please select a harvest date!");

    try {
      setLoading(true);
      setStepIndex(0);
      setStatus("Uploading image to IPFS...");

      const data = new FormData();
      data.append("image", image);
      data.append("name", formData.cropName);
      data.append("location", formData.location);
      data.append("farmerName", "Verified Farmer");

      const response = await axios.post(
        "https://alene-supergenual-inexpressibly.ngrok-free.dev/api/add-batch",
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "ngrok-skip-browser-warning": "true"
          }
        }
      );

      const imageCID = response.data.ipfsHash || response.data.hash || response.data.cid;
      if (!imageCID) throw new Error("Server did not return an IPFS Hash for the image!");

      setStepIndex(1);
      setStatus("Uploading batch metadata to IPFS...");
      const metadataCID = await uploadBatchMetadata({
        cropName: formData.cropName,
        location: formData.location,
        harvestDate: formData.harvestDate,
        imageCID,
        farmerName: "Verified Farmer"
      });

      setStepIndex(2);
      const contract = await getContract();
      if (!contract) throw new Error("Wallet not connected!");

      setStatus("Waiting for wallet signature...");
      const tx = await contract.createBatch(metadataCID);

      setStepIndex(3);
      setStatus("Writing to blockchain...");
      await tx.wait();

      const newContract = await getContract();
      const nextId = Number(await newContract.nextBatchId());
      const newBatchId = nextId - 1;

      const trackingLink = `${window.location.origin}/track?id=${newBatchId}`;
      setQrData({ batchId: newBatchId, trackingLink });

    } catch (error) {
      console.error("Error:", error);
      const msg = error.response?.data?.error || error.message || "Transaction failed";
      alert("❌ Error: " + msg);
    } finally {
      setLoading(false);
      setStatus("");
      setStepIndex(-1);
    }
  };

  const reset = () => {
    setQrData(null);
    setFormData({ cropName: 'Ashwagandha', location: '', harvestDate: '' });
    setImage(null);
    setImagePreview(null);
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (qrData) {
    return (
      <div className="page-enter max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 glow-success">
            <CheckCircle className="text-green-600" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-1">Batch Registered!</h2>
          <p className="text-stone-500 text-sm mb-1">
            Batch <span className="font-mono font-semibold text-stone-700">#{qrData.batchId}</span>
          </p>
          <p className="text-xs text-stone-400 mb-8">Crop data stored on IPFS · Recorded on Sepolia</p>

          <div className="bg-stone-50 rounded-xl p-4 inline-block mb-4 border border-stone-100">
            <QRCodeCanvas value={qrData.trackingLink} size={180} level="H" includeMargin={false} />
          </div>

          <p className="text-[11px] text-stone-400 break-all px-2 mb-8 font-mono">{qrData.trackingLink}</p>

          <div className="flex gap-3">
            <button
              onClick={() => window.open(qrData.trackingLink, '_blank')}
              className="flex-1 bg-green-700 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-green-800 transition"
            >
              Preview Tracking
            </button>
            <button
              onClick={reset}
              className="flex-1 bg-white text-stone-700 border border-stone-200 py-2.5 rounded-xl font-semibold text-sm hover:bg-stone-50 transition"
            >
              New Batch
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="page-enter max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Record New Harvest</h1>
        <p className="text-stone-500 text-sm mt-1">Register a batch on the blockchain — immutable and verifiable.</p>
      </div>

      <div className="grid md:grid-cols-5 gap-8">

        {/* Left — Form */}
        <form onSubmit={handleSubmit} className="md:col-span-3 space-y-5">

          {/* Crop select */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
              Crop
            </label>
            <div className="relative">
              <Sprout className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <select
                name="cropName"
                value={formData.cropName}
                onChange={handleChange}
                className="w-full pl-9 pr-9 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-800 text-sm appearance-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              >
                {CROPS.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={15} />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
              Farm Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input
                type="text"
                name="location"
                placeholder="e.g. Nagpur, Maharashtra"
                value={formData.location}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-800 text-sm placeholder-stone-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Harvest Date */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
              Harvest Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input
                type="date"
                name="harvestDate"
                value={formData.harvestDate}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-800 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
              Harvest Photo
            </label>
            <label className={`relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${image
                ? 'border-green-400 bg-green-50'
                : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
              }`}>
              <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
              {image ? (
                <>
                  <CheckCircle size={22} className="text-green-600 mb-2" />
                  <p className="text-sm font-medium text-green-700">{image.name}</p>
                  <p className="text-xs text-green-500 mt-0.5">Click to change</p>
                </>
              ) : (
                <>
                  <Upload size={22} className="text-stone-400 mb-2" />
                  <p className="text-sm font-medium text-stone-600">Click to upload photo</p>
                  <p className="text-xs text-stone-400 mt-0.5">JPG, PNG supported</p>
                </>
              )}
            </label>
          </div>

          {/* Progress steps (visible while loading) */}
          {loading && (
            <div className="bg-stone-50 rounded-xl border border-stone-100 p-4">
              <div className="flex flex-col gap-2">
                {STEPS.map((s, i) => (
                  <div key={s} className={`flex items-center gap-3 text-sm transition-all ${i < stepIndex ? 'text-green-700' : i === stepIndex ? 'text-stone-900 font-medium' : 'text-stone-400'
                    }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${i < stepIndex ? 'bg-green-100 text-green-700' :
                        i === stepIndex ? 'bg-green-700 text-white' : 'bg-stone-200 text-stone-400'
                      }`}>
                      {i < stepIndex ? '✓' : i + 1}
                    </div>
                    {s}
                    {i === stepIndex && <Loader2 size={13} className="animate-spin ml-auto text-green-600" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${loading
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-green-700 text-white hover:bg-green-800 hover:shadow-md'
              }`}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" />{status || "Processing..."}</>
            ) : (
              'Submit to Blockchain'
            )}
          </button>
        </form>

        {/* Right — Preview card */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
            <div className="h-44 bg-stone-100 relative">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Upload size={28} className="text-stone-300" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <span className="bg-white/80 backdrop-blur-sm text-stone-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-stone-200">
                  Preview
                </span>
              </div>
            </div>
            <div className="p-4">
              <p className="font-semibold text-stone-900 text-sm">{formData.cropName}</p>
              <p className="text-xs text-stone-500 mt-0.5">{formData.location || 'No location set'}</p>
              {formData.harvestDate && (
                <p className="text-xs text-stone-400 mt-0.5">{formData.harvestDate}</p>
              )}
            </div>
          </div>

          {/* Info blurb */}
          <div className="bg-green-50 rounded-xl border border-green-100 p-4">
            <p className="text-xs font-semibold text-green-800 mb-1">What happens next?</p>
            <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
              <li>Image uploaded to IPFS</li>
              <li>Metadata stored via Pinata</li>
              <li>Batch ID minted on Sepolia</li>
              <li>QR code generated for tracking</li>
            </ol>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Farmer;