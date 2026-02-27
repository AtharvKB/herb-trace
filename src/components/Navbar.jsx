import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Leaf, Wallet, ChevronDown } from 'lucide-react';

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

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-150 ${isActive
      ? 'text-green-700'
      : 'text-stone-500 hover:text-stone-900'
    }`;

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-semibold text-stone-900 hover:text-green-700 transition-colors">
          <div className="w-7 h-7 bg-green-700 rounded-lg flex items-center justify-center">
            <Leaf size={14} className="text-white" />
          </div>
          <span className="tracking-tight">HerbTrace</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink to="/" end className={navLinkClass}>Home</NavLink>
          <NavLink to="/farmer" className={navLinkClass}>Farmer Portal</NavLink>
          <NavLink to="/lab" className={navLinkClass}>Lab Portal</NavLink>
          <NavLink to="/distributor" className={navLinkClass}>Distributor</NavLink>
          <NavLink to="/track" className={navLinkClass}>Track</NavLink>
        </div>

        {/* Wallet */}
        <button
          onClick={connectWallet}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${walletAddress
              ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
              : 'bg-green-700 text-white hover:bg-green-800 shadow-sm'
            }`}
        >
          <Wallet size={14} />
          {walletAddress
            ? `${walletAddress.substring(0, 6)}…${walletAddress.slice(-4)}`
            : 'Connect Wallet'}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;