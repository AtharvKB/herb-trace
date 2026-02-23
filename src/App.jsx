import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useSearchParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import Farmer from './pages/Farmer';
import Track from './pages/Track';
import Distributor from './pages/Distributor';
import LabDashboard from './pages/LabDashboard';

// Auto-fills batch ID when navigating via QR code (/track?id=5)
const TrackWrapper = () => {
  const [params] = useSearchParams();
  return <Track prefillId={params.get("id") || ""} />;
};

const Home = () => (
  <div className="flex flex-col items-center justify-center min-h-[85vh] text-center p-6 bg-gradient-to-b from-green-50 to-white">
    <div className="bg-green-100 p-6 rounded-full mb-6 shadow-sm">
      <span className="text-6xl">🌿</span>
    </div>
    <h1 className="text-5xl font-bold text-green-800 mb-4">HerbTrace</h1>
    <p className="text-xl text-gray-600 max-w-2xl mb-3">
      The blockchain-powered traceability platform for Ayurvedic herbs.
    </p>
    <p className="text-lg font-semibold text-green-600 mb-10">
      Ensuring purity from farm to pharmacy.
    </p>

    <div className="flex flex-wrap justify-center gap-4">
      <Link to="/farmer"
        className="bg-green-700 text-white px-8 py-4 rounded-xl font-bold hover:bg-green-800 transition shadow-lg">
        🌱 Record Harvest
      </Link>
      <Link to="/lab"
        className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg">
        🧪 Lab Portal
      </Link>
      <Link to="/distributor"
        className="bg-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-purple-700 transition shadow-lg">
        🚚 Distributor
      </Link>
      <Link to="/track"
        className="bg-white text-green-700 border-2 border-green-700 px-8 py-4 rounded-xl font-bold hover:bg-green-50 transition shadow-lg">
        🔍 Track Product
      </Link>
    </div>

    <div className="mt-16 grid grid-cols-3 gap-8 max-w-3xl text-center">
      <div className="p-4">
        <div className="text-3xl mb-2">⛓️</div>
        <h3 className="font-bold text-gray-800">Blockchain Verified</h3>
        <p className="text-sm text-gray-500 mt-1">Every batch & lab report recorded immutably on-chain</p>
      </div>
      <div className="p-4">
        <div className="text-3xl mb-2">📁</div>
        <h3 className="font-bold text-gray-800">IPFS Stored</h3>
        <p className="text-sm text-gray-500 mt-1">Images & metadata on decentralized storage</p>
      </div>
      <div className="p-4">
        <div className="text-3xl mb-2">📱</div>
        <h3 className="font-bold text-gray-800">QR Traceable</h3>
        <p className="text-sm text-gray-500 mt-1">Scan any package to verify authenticity</p>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/farmer" element={<Farmer />} />
          <Route path="/track" element={<TrackWrapper />} />
          <Route path="/distributor" element={<Distributor />} />
          <Route path="/lab" element={<LabDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;