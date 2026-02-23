import React, { useState } from 'react';
import axios from 'axios';
import { Upload, MapPin, Calendar, Sprout, Loader2, CheckCircle } from 'lucide-react';
import { getContract } from '../utils/contract';
import { uploadBatchMetadata } from '../utils/pinata';
import { QRCodeCanvas } from 'qrcode.react';

const CROPS = ["Ashwagandha", "Tulsi (Holy Basil)", "Turmeric", "Brahmi", "Neem", "Giloy"];

const Farmer = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [qrData, setQrData] = useState(null);

  const [formData, setFormData] = useState({
    cropName: 'Ashwagandha',
    location: '',
    harvestDate: '',
  });
  const [image, setImage] = useState(null);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleImageChange = (e) => { if (e.target.files[0]) setImage(e.target.files[0]); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return alert("Please select a crop image!");
    if (!formData.location) return alert("Please enter the farm location!");
    if (!formData.harvestDate) return alert("Please select a harvest date!");

    try {
      setLoading(true);

      // Step 1: Upload image to IPFS via Member 4's Java server
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
      console.log("✅ Image CID:", imageCID);

      // Step 2: Upload full batch metadata JSON to IPFS (via Pinata)
      // This JSON will be stored on-chain as metadataCID
      setStatus("Uploading batch metadata to IPFS...");
      const metadataCID = await uploadBatchMetadata({
        cropName: formData.cropName,
        location: formData.location,
        harvestDate: formData.harvestDate,
        imageCID: imageCID,
        farmerName: "Verified Farmer"
      });
      console.log("✅ Metadata CID:", metadataCID);

      // Step 3: Write metadataCID to blockchain (contract only takes 1 param)
      const contract = await getContract();
      if (!contract) throw new Error("Wallet not connected!");

      setStatus("Waiting for wallet signature...");
      const tx = await contract.createBatch(metadataCID);

      setStatus("Writing to blockchain...");
      await tx.wait();

      // Step 4: Get the new batch ID
      const newContract = await getContract();
      const nextId = Number(await newContract.nextBatchId());
      const newBatchId = nextId - 1;
      console.log("✅ Batch ID:", newBatchId);

      const trackingLink = `${window.location.origin}/track?id=${newBatchId}`;
      setQrData({ batchId: newBatchId, trackingLink });

    } catch (error) {
      console.error("Error:", error);
      const msg = error.response?.data?.error || error.message || "Transaction failed";
      alert("❌ Error: " + msg);
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  const reset = () => {
    setQrData(null);
    setFormData({ cropName: 'Ashwagandha', location: '', harvestDate: '' });
    setImage(null);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-xl border border-green-100">
      <h2 className="text-3xl font-bold text-green-800 mb-6 flex items-center">
        <Sprout className="mr-2" /> Record New Harvest
      </h2>

      {qrData ? (
        <div className="bg-green-50 border-2 border-green-400 rounded-xl p-8 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h3 className="text-2xl font-bold text-green-800 mb-1">Batch Registered!</h3>
          <p className="text-gray-600 mb-1">
            Batch ID: <span className="font-mono font-bold text-green-700">#{qrData.batchId}</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Crop data stored on IPFS · Batch recorded on Blockchain
          </p>

          <div className="bg-white p-4 rounded-xl shadow-md inline-block mb-4">
            <QRCodeCanvas value={qrData.trackingLink} size={200} level="H" includeMargin={true} />
          </div>

          <p className="text-xs text-gray-400 break-all px-4 mb-6">{qrData.trackingLink}</p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.open(qrData.trackingLink, '_blank')}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow"
            >
              🔍 Preview Tracking Page
            </button>
            <button
              onClick={reset}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-200 transition"
            >
              🔄 New Batch
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Select Crop</label>
            <select
              name="cropName"
              value={formData.cropName}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            >
              {CROPS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Farm Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type="text"
                name="location"
                placeholder="e.g. Nagpur, Maharashtra"
                value={formData.location}
                onChange={handleChange}
                required
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Harvest Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                type="date"
                name="harvestDate"
                value={formData.harvestDate}
                onChange={handleChange}
                required
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div className="border-2 border-dashed border-green-300 rounded-xl p-6 text-center bg-green-50 hover:bg-green-100 transition cursor-pointer relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="mx-auto text-green-600 mb-2" size={36} />
            {image ? (
              <p className="text-green-700 font-medium flex items-center justify-center gap-2">
                <CheckCircle size={16} /> {image.name}
              </p>
            ) : (
              <p className="text-green-800 font-medium">Click to Upload Harvest Photo</p>
            )}
            <p className="text-xs text-gray-400 mt-1">JPG, PNG supported</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold py-4 rounded-xl shadow-lg flex justify-center items-center text-white transition text-lg ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-700 hover:bg-green-800"
            }`}
          >
            {loading ? (
              <><Loader2 className="animate-spin mr-2" />{status || "Processing..."}</>
            ) : (
              "Submit to Blockchain"
            )}
          </button>

        </form>
      )}
    </div>
  );
};

export default Farmer;