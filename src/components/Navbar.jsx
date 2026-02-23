import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

const Navbar = () => {
  const [walletAddress, setWalletAddress] = useState("");

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error("Error connecting wallet", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  return (
    <nav className="bg-green-700 p-4 shadow-lg text-white sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo Section */}
        <Link to="/" className="flex items-center space-x-2 font-bold text-xl hover:text-green-200 transition">
          <Leaf className="w-8 h-8" />
          <span>HerbTrace</span>
        </Link>

        {/* Navigation Links - Now includes Lab */}
        <div className="hidden md:flex space-x-8 font-medium">
          <Link to="/" className="hover:text-green-200 transition">Home</Link>
          <Link to="/farmer" className="hover:text-green-200 transition">Farmer Portal</Link>
          <Link to="/lab" className="hover:text-green-200 transition">Lab Portal</Link>
          {/* Inside the links div */}
<Link to="/distributor" className="hover:text-green-200 transition">Distributor</Link>
          <Link to="/track" className="hover:text-green-200 transition">Track Product</Link>
        </div>

        {/* Connect Wallet Button */}
        <button 
          onClick={connectWallet}
          className={`px-4 py-2 rounded-full font-semibold transition shadow-md ${
            walletAddress 
              ? "bg-green-900 text-green-100 cursor-default border border-green-600" 
              : "bg-white text-green-700 hover:bg-green-50"
          }`}
        >
          {walletAddress 
            ? `Connected: ${walletAddress.substring(0, 6)}...` 
            : "Connect Wallet"}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;