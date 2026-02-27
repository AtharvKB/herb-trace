import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useSearchParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import Farmer from './pages/Farmer';
import Track from './pages/Track';
import Distributor from './pages/Distributor';
import LabDashboard from './pages/LabDashboard';
import {
  Leaf, FlaskConical, Truck, Search,
  ShieldCheck, HardDrive, QrCode,
  ArrowRight, Github
} from 'lucide-react';
import heroBotanical from './assets/hero_botanical.png';
import './App.css';

const TrackWrapper = () => {
  const [params] = useSearchParams();
  return <Track prefillId={params.get("id") || ""} />;
};

/* ── Portals data ─────────────────────────────── */
const PORTALS = [
  {
    to: '/farmer',
    icon: Leaf,
    label: 'Farmer Portal',
    desc: 'Register a new herb batch. Upload a harvest photo, enter location and date, then mint the batch on-chain.',
    accent: 'text-green-700 bg-green-50 border-green-100',
    cta: 'Create batch',
    ctaCls: 'bg-green-700 text-white hover:bg-green-800',
  },
  {
    to: '/lab',
    icon: FlaskConical,
    label: 'Lab Portal',
    desc: 'Review pending batches, run quality analysis, record purity % and notes, and optionally attach a PDF report — all written to the smart contract.',
    accent: 'text-blue-700 bg-blue-50 border-blue-100',
    cta: 'Open dashboard',
    ctaCls: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  {
    to: '/distributor',
    icon: Truck,
    label: 'Distributor',
    desc: 'View lab-verified batches ready for dispatch. Mark a shipment as sent, updating the on-chain stage to "Shipped".',
    accent: 'text-purple-700 bg-purple-50 border-purple-100',
    cta: 'Manage shipments',
    ctaCls: 'bg-purple-600 text-white hover:bg-purple-700',
  },
  {
    to: '/track',
    icon: Search,
    label: 'Track a Product',
    desc: 'Enter any batch ID to read its full history from the blockchain — farmer origin, lab report, purity score, and current stage.',
    accent: 'text-stone-700 bg-stone-50 border-stone-200',
    cta: 'Trace now',
    ctaCls: 'bg-stone-800 text-white hover:bg-stone-900',
  },
];

/* ── Tech stack items ─────────────────────────── */
const TECH = [
  { icon: ShieldCheck, label: 'Ethereum', sub: 'Sepolia testnet · Smart contract stores all batch & lab data on-chain' },
  { icon: HardDrive, label: 'IPFS via Pinata', sub: 'Crop images and JSON metadata stored on a decentralised content-addressed network' },
  { icon: QrCode, label: 'QR Codes', sub: 'Each registered batch generates a scannable link to its public tracking page' },
];

const Home = () => (
  <div className="page-enter">

    {/* ── Hero ─────────────────────────────────────────────────── */}
    <section className="relative overflow-hidden bg-white border-b border-stone-100 min-h-[80vh] flex items-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_70%_40%,_rgba(134,_239,_172,_0.18),_transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_20%_80%,_rgba(187,_247,_208,_0.1),_transparent)]" />

      <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 relative z-10 w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* Text */}
          <div>
            <div className="inline-flex items-center gap-2 bg-stone-100 border border-stone-200 text-stone-600 text-xs font-semibold px-3 py-1 rounded-full mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Academic / Demo project · Ethereum Sepolia testnet
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-stone-900 tracking-tight leading-[1.1] mb-5">
              Herb supply chain
              <span className="text-green-700"> on the blockchain</span>
            </h1>

            <p className="text-lg text-stone-500 leading-relaxed mb-3 max-w-lg">
              HerbTrace is a prototype system for recording and verifying Ayurvedic herb batches
              across the supply chain — from farm registration through lab testing to distribution.
            </p>
            <p className="text-sm text-stone-400 leading-relaxed mb-10 max-w-lg">
              Each step is written to a smart contract on the Ethereum Sepolia testnet.
              Data is public, immutable, and readable by anyone with the batch ID.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link to="/farmer"
                className="flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-800 transition-all shadow-sm hover:shadow-md text-sm">
                <Leaf size={16} /> Record a Batch
              </Link>
              <Link to="/track"
                className="flex items-center gap-2 bg-white text-stone-700 border border-stone-200 px-5 py-2.5 rounded-xl font-semibold hover:bg-stone-50 transition-all text-sm">
                <Search size={16} /> Track a Product
              </Link>
            </div>
          </div>

          {/* Botanical image in glass card */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-green-200/30 via-emerald-100/20 to-transparent blur-3xl scale-110" />
            <div className="relative w-full max-w-md rounded-3xl overflow-hidden border border-white/60 shadow-xl"
              style={{
                background: 'rgba(255,255,255,0.45)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}>
              <img
                src={heroBotanical}
                alt="Illustration of Ayurvedic herbs — Ashwagandha, Tulsi, Turmeric"
                className="w-full h-full object-cover mix-blend-multiply"
                style={{ opacity: 0.9 }}
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 bg-white/70 backdrop-blur-sm border border-white/80 text-stone-500 text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
                  Illustration · Ashwagandha · Tulsi · Turmeric
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    {/* ── Portals ──────────────────────────────────────────────── */}
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-10">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Portals</p>
        <h2 className="text-2xl font-bold text-stone-900">Four roles, one shared ledger</h2>
        <p className="text-stone-500 text-sm mt-1 max-w-xl">
          Each portal is a separate interface for a different participant in the supply chain.
          All data is read from and written to the same smart contract.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {PORTALS.map(({ to, icon: Icon, label, desc, accent, cta, ctaCls }) => (
          <div key={to} className="bg-white rounded-2xl border border-stone-100 p-6 flex flex-col hover:border-stone-200 hover:shadow-sm transition-all">
            <div className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-xl border w-fit mb-4 ${accent}`}>
              <Icon size={15} /> {label}
            </div>
            <p className="text-sm text-stone-500 leading-relaxed flex-1 mb-5">{desc}</p>
            <Link to={to}
              className={`inline-flex items-center gap-2 self-start text-sm font-semibold px-4 py-2 rounded-xl transition ${ctaCls}`}>
              {cta} <ArrowRight size={14} />
            </Link>
          </div>
        ))}
      </div>
    </section>

    {/* ── How it works ─────────────────────────────────────────── */}
    <section className="border-t border-stone-100 bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Workflow</p>
          <h2 className="text-2xl font-bold text-stone-900">How a batch moves through the system</h2>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Farmer registers batch',
              body: 'Uploads a crop photo (stored on IPFS), enters harvest location and date, and calls createBatch() on the smart contract.',
            },
            {
              step: '02',
              title: 'Lab analyses sample',
              body: 'A lab technician records purity %, analysis notes, and optionally a PDF report CID by calling verifyBatch(), advancing the stage on-chain.',
            },
            {
              step: '03',
              title: 'Distributor dispatches',
              body: 'Once lab-verified, the distributor marks the batch as shipped via updateStage(), updating the on-chain status to "Shipped".',
            },
            {
              step: '04',
              title: 'Anyone can verify',
              body: 'Scan the QR code or enter a batch ID on the Track page to read all on-chain data — no wallet or login required.',
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="bg-white rounded-2xl border border-stone-100 p-5">
              <div className="text-3xl font-black text-stone-100 mb-3 select-none">{step}</div>
              <h3 className="text-sm font-semibold text-stone-800 mb-2">{title}</h3>
              <p className="text-xs text-stone-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Tech stack ───────────────────────────────────────────── */}
    <section className="border-t border-stone-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-8">Technology stack</p>
        <div className="grid md:grid-cols-3 gap-6">
          {TECH.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex gap-4 items-start">
              <div className="p-2 bg-stone-50 border border-stone-100 rounded-xl flex-shrink-0">
                <Icon size={18} className="text-stone-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-800">{label}</p>
                <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Footer ───────────────────────────────────────────────── */}
    <footer className="border-t border-stone-100 bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-green-700 rounded-md flex items-center justify-center">
            <Leaf size={11} className="text-white" />
          </div>
          <span className="font-medium text-stone-500">HerbTrace</span>
          <span>· Prototype / Academic project</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Smart contract on Ethereum Sepolia testnet</span>
          <span>·</span>
          <span>No production use · No real transactions</span>
        </div>
      </div>
    </footer>

  </div>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-stone-50 text-stone-900">
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