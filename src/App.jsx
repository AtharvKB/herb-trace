import React, { useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { BrowserRouter as Router, Routes, Route, Link, useSearchParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import Farmer from './pages/Farmer';
import Track from './pages/Track';
import Distributor from './pages/Distributor';
import LabDashboard from './pages/LabDashboard';
import { getReadOnlyContract, BATCH_ID_START } from './utils/contract';
import herbHeroBg from './assets/herb_hero_bg.png';
import './App.css';
import './landing.css';

/* ─── Google Fonts ─────────────────────────────────────── */
const FontLoader = () => (
  <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;500;600;700;800;900&display=swap');`}</style>
);

const TrackWrapper = () => {
  const [params] = useSearchParams();
  return <Track prefillId={params.get("id") || ""} />;
};

/* ═══════════════════════════════════════════════════════════
   Canvas network animation (blockchain node graph)
═══════════════════════════════════════════════════════════ */
const HeroCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const nodes = [];
    const NODE_COUNT = 55;
    const MAX_DIST = 160;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    /* Seed nodes */
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1.5,
        gold: Math.random() < 0.3,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* Update positions */
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });

      /* Draw edges */
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.35;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            const grad = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
            grad.addColorStop(0, `rgba(16,163,74,${alpha})`);
            grad.addColorStop(1, `rgba(13,148,136,${alpha})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      /* Draw nodes */
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        if (n.gold) {
          ctx.fillStyle = 'rgba(217,119,6,0.7)';
          ctx.shadowBlur = 6;
          ctx.shadowColor = 'rgba(217,119,6,0.5)';
        } else {
          ctx.fillStyle = 'rgba(22,163,74,0.55)';
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-hero-canvas" />;
};

/* ═══════════════════════════════════════════════════════════
   Animated counter hook
═══════════════════════════════════════════════════════════ */
const useCounter = (target, duration = 1800) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(ease * target));
        if (progress < 1) requestAnimationFrame(tick);
        else setCount(target);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);
  return [count, ref];
};

/* ═══════════════════════════════════════════════════════════
   Stat card with counter + progress bar
═══════════════════════════════════════════════════════════ */
const StatCard = ({ emoji, target, suffix, label, cls, barCls, fillCls, loading }) => {
  // Compute fill % proportionally (capped at 99% visually)
  const fillPct = target > 0 ? `${Math.min(99, Math.round((target / (target * 1.1)) * 100))}%` : '10%';
  const [count, ref] = useCounter(loading ? 0 : target);
  const barFillRef = useRef(null);
  useEffect(() => {
    if (loading) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (barFillRef.current) {
        barFillRef.current.style.setProperty('--fill', fillPct);
        barFillRef.current.classList.add('animated');
      }
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fillPct, ref, loading]);

  return (
    <div ref={ref} className={`lp-stat-card ${cls} lp-reveal`}>
      <div className="lp-stat-icon">{emoji}</div>
      <div className="lp-stat-number" style={{ minHeight: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading
          ? <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 400 }}>—</span>
          : <>{count}{suffix}</>}
      </div>
      <p className="lp-stat-label">{label}</p>
      <div className={`lp-stat-bar ${barCls}`}>
        <div ref={barFillRef} className={`lp-stat-bar-fill ${fillCls}`} />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Hook — fetch real on-chain stats
═══════════════════════════════════════════════════════════ */
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const useChainStats = () => {
  const [stats, setStats] = useState(null); // null = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const contract = await getReadOnlyContract();

        // 1) Get total batch count
        const nextId = await contract.nextBatchId();
        const total = Number(nextId) - BATCH_ID_START;

        if (total <= 0) {
          if (!cancelled) setStats({ total: 0, verified: 0, farmers: 0, shipped: 0 });
          return;
        }

        // Show total immediately so user sees a number right away
        if (!cancelled) setStats({ total, verified: 0, farmers: 0, shipped: 0 });

        // 2) Fetch each batch sequentially with a tiny delay to avoid RPC rate-limits
        const farmerSet = new Set();
        let verifiedCount = 0;
        let shippedCount = 0;

        for (let i = BATCH_ID_START; i < Number(nextId); i++) {
          if (cancelled) return;
          try {
            const b = await contract.batches(i);
            if (b && b.exists) {
              if (b.farmer && b.farmer !== ethers.ZeroAddress)
                farmerSet.add(b.farmer.toLowerCase());
              // stage: 0=Registered, 1=Verified, 2=Shipped, 3=Delivered
              if (Number(b.stage) >= 1) verifiedCount++;
              if (Number(b.stage) >= 2) shippedCount++;
            }
          } catch (_) { /* skip failed individual fetch */ }
          await sleep(120); // ~120ms between calls → stays under typical rate limit
        }

        if (!cancelled)
          setStats({ total, verified: verifiedCount, farmers: farmerSet.size, shipped: shippedCount });

      } catch (e) {
        console.error('Chain stats error:', e);
        if (!cancelled) setError(true);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return { stats, error };
};

/* ═══════════════════════════════════════════════════════════
   LiveStats component — reads real on-chain data
═══════════════════════════════════════════════════════════ */
const LiveStats = ({ chainStats, chainError }) => {
  // Accept pre-fetched stats from parent, or fetch internally as fallback
  const internal = useChainStats();
  const stats = chainStats !== undefined ? chainStats : internal.stats;
  const error = chainError !== undefined ? chainError : internal.error;
  const loading = stats === null && !error;

  const items = [
    {
      emoji: '🌿',
      target: stats?.total ?? 0,
      suffix: '',
      label: 'Batches Registered',
      sub: 'Total herb batches created on-chain',
      cls: 'lp-stat-green', barCls: '', fillCls: '',
    },
    {
      emoji: '🔬',
      target: stats?.verified ?? 0,
      suffix: '',
      label: 'Lab Verified',
      sub: 'Batches that passed lab verification',
      cls: 'lp-stat-purple', barCls: 'lp-bar-purple', fillCls: 'lp-fill-purple',
    },
    {
      emoji: '👨‍🌾',
      target: stats?.farmers ?? 0,
      suffix: '',
      label: 'Unique Farmers',
      sub: 'Distinct wallet addresses that registered batches',
      cls: 'lp-stat-gold', barCls: 'lp-bar-gold', fillCls: 'lp-fill-gold',
    },
    {
      emoji: '🚚',
      target: stats?.shipped ?? 0,
      suffix: '',
      label: 'Batches Shipped',
      sub: 'Verified batches dispatched by distributors',
      cls: 'lp-stat-teal', barCls: 'lp-bar-teal', fillCls: 'lp-fill-teal',
    },
  ];

  return (
    <section className="lp-stats" id="impact">
      <div className="lp-container">
        <div className="lp-section-header">
          <p className="lp-section-tag lp-reveal">Live On-Chain Data</p>
          <h2 className="lp-section-title lp-reveal">
            Numbers That <span className="lp-text-gradient">Speak</span>
          </h2>
          <p className="lp-section-desc lp-reveal" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {loading ? 'Fetching live data from Ethereum Sepolia…'
              : error ? 'Could not reach Sepolia RPC — figures may be unavailable'
                : `Live data · Contract ${import.meta.env.VITE_CONTRACT_ADDRESS ?? '0x437B…93e1'} · Sepolia testnet`}
          </p>
        </div>
        <div className="lp-stats-grid">
          {items.map(({ emoji, target, suffix, label, cls, barCls, fillCls }) => (
            <StatCard
              key={label}
              emoji={emoji}
              target={target}
              suffix={suffix}
              label={label}
              cls={cls}
              barCls={barCls}
              fillCls={fillCls}
              loading={loading}
            />
          ))}
        </div>
        {error && (
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ⚠️ Could not reach Sepolia RPC. Please check your connection.
          </p>
        )}
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════
   Scroll reveal hook
═══════════════════════════════════════════════════════════ */
const useReveal = () => {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal');
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); }),
      { threshold: 0.12 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
};

/* ═══════════════════════════════════════════════════════════
   Timeline progress
═══════════════════════════════════════════════════════════ */
const TimelineProgress = () => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.closest('.lp-timeline')?.getBoundingClientRect();
      if (!rect) return;
      const visible = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / rect.height));
      el.style.width = `${visible * 100}%`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div ref={ref} className="lp-timeline-progress" />;
};

/* ═══════════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════════ */
const Home = () => {
  useReveal();
  // Fetch on-chain stats once and share with both hero strip and LiveStats
  const { stats: chainStats, error: chainError } = useChainStats();
  const heroTotal = chainStats ? chainStats.total : null;
  const heroVerified = chainStats ? chainStats.verified : null;
  const heroFarmers = chainStats ? chainStats.farmers : null;

  return (
    <div className="lp-root">
      <FontLoader />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="lp-hero" id="hero">
        <HeroCanvas />
        <div className="lp-hero-bg-image" style={{ backgroundImage: `url(${herbHeroBg})` }} />
        <div className="lp-hero-overlay" />
        <div className="lp-hero-grid" />

        {/* Ambient orbs */}
        <div className="lp-ambient-orbs" aria-hidden="true">
          <div className="lp-orb lp-orb-1" />
          <div className="lp-orb lp-orb-2" />
          <div className="lp-orb lp-orb-3" />
          <div className="lp-orb lp-orb-4" />
        </div>

        <div className="lp-hero-content">
          <div className="lp-hero-badge lp-reveal">
            <div className="lp-badge-dot" />
            <span>Powered by Ethereum Blockchain</span>
          </div>

          <h1 className="lp-hero-title lp-reveal">
            <span className="lp-hero-line">Traceability</span>
            <span className="lp-hero-line">
              You Can <span className="lp-shimmer-text">Trust.</span>
            </span>
          </h1>

          <p className="lp-hero-subtitle lp-reveal">
            HerbChain brings end-to-end transparency to herbal supply chains — from seed to shelf — secured on an
            immutable blockchain ledger.
          </p>

          <div className="lp-hero-buttons lp-reveal">
            <Link to="/farmer" className="lp-btn lp-btn-primary lp-btn-lg">
              <span>Explore Features</span>
              <div className="lp-btn-glow" />
            </Link>
            <Link to="/track" className="lp-btn lp-btn-glass lp-btn-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Track a Batch</span>
            </Link>
          </div>

          <div className="lp-hero-metrics lp-reveal">
            <div className="lp-hero-metric">
              <strong>{heroTotal !== null ? heroTotal : '—'}</strong>
              <span>Batches Registered</span>
            </div>
            <div className="lp-hero-metric-divider" />
            <div className="lp-hero-metric">
              <strong>{heroVerified !== null ? heroVerified : '—'}</strong>
              <span>Lab Verified</span>
            </div>
            <div className="lp-hero-metric-divider" />
            <div className="lp-hero-metric">
              <strong>{heroFarmers !== null ? heroFarmers : '—'}</strong>
              <span>Unique Farmers</span>
            </div>
          </div>
        </div>

        <div className="lp-scroll-indicator">
          <div className="lp-scroll-line" />
        </div>
      </section>

      {/* ── TRUSTED BY ───────────────────────────────────── */}
      <section className="lp-trusted" id="trusted">
        <div className="lp-container">
          <p className="lp-trusted-label lp-reveal">Trusted by industry partners</p>
          <div className="lp-trusted-logos lp-reveal">
            {['🏛️ AyurGov India', '🌍 Global Herb Alliance', '🔬 BioLab International', '🏥 MediTrace', '🌱 PureLeaf Organics'].map(p => (
              <div key={p} className="lp-trusted-logo">{p}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section className="lp-features" id="features">
        <div className="lp-container">
          <div className="lp-section-header">
            <p className="lp-section-tag lp-reveal">Core Ecosystem</p>
            <h2 className="lp-section-title lp-reveal">
              Features Built for <span className="lp-text-gradient">Integrity</span>
            </h2>
            <p className="lp-section-desc lp-reveal">
              Every component designed to ensure verifiable trust across the entire herbal supply chain.
            </p>
          </div>

          <div className="lp-features-grid">
            {[
              { emoji: '🔗', cls: 'lp-card-green', iconCls: '', ringCls: '', glowCls: '', tag: 'green', tagLabel: 'Core', title: 'Full Traceability', desc: 'Track every herb batch from farm cultivation through processing, packaging, and retail distribution — all on-chain.' },
              { emoji: '🔍', cls: 'lp-card-purple', iconCls: 'lp-icon-purple', ringCls: 'lp-ring-purple', glowCls: 'lp-glow-purple', tag: 'purple', tagLabel: 'Visibility', title: 'Radical Transparency', desc: 'Every participant in the supply chain can verify the origin, handling, and quality of products in real time.' },
              { emoji: '📜', cls: 'lp-card-gold', iconCls: 'lp-icon-gold', ringCls: 'lp-ring-gold', glowCls: 'lp-glow-gold', tag: 'gold', tagLabel: 'Automation', title: 'Smart Contracts', desc: 'Automated compliance checks and role-based access control ensure tamper-proof operations at every stage.', popular: true },
              { emoji: '🧪', cls: 'lp-card-teal', iconCls: 'lp-icon-teal', ringCls: 'lp-ring-teal', glowCls: 'lp-glow-teal', tag: 'teal', tagLabel: 'Verification', title: 'Lab Verified', desc: 'On-chain lab reports provide immutable proof of quality, safety, and authenticity for every batch.' },
            ].map(({ emoji, cls, iconCls, ringCls, glowCls, tag, tagLabel, title, desc, popular }) => (
              <div key={title} className={`lp-feature-card ${cls} lp-reveal`}>
                <div className={`lp-card-border-glow ${glowCls}`} />
                {popular && <div className="lp-popular-badge">⭐ Popular</div>}
                <div className="lp-feature-icon-wrap">
                  <div className={`lp-feature-icon ${iconCls}`}>{emoji}</div>
                  <div className={`lp-icon-ring ${ringCls}`} />
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
                <div className={`lp-feature-tag ${tag}`}>{tagLabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="lp-how" id="how-it-works">
        <div className="lp-container">
          <div className="lp-section-header">
            <p className="lp-section-tag lp-reveal">The Journey</p>
            <h2 className="lp-section-title lp-reveal">
              From Seed to <span className="lp-text-gradient">Shelf</span>
            </h2>
            <p className="lp-section-desc lp-reveal">
              A seamless four-step journey ensuring every herb's story is told with integrity.
            </p>
          </div>

          <div className="lp-timeline">
            <div className="lp-timeline-track">
              <TimelineProgress />
            </div>
            <div className="lp-timeline-steps">
              {[
                { icon: '🌱', num: 'Step 01', title: 'Farm Registration', desc: "Farmers register each batch with origin details, organic certifications, and harvest data." },
                { icon: '🏭', num: 'Step 02', title: 'Processing & QC', desc: 'Processors record handling steps while quality control checks are logged immutably.' },
                { icon: '🔬', num: 'Step 03', title: 'Lab Certification', desc: 'Independent labs submit tamper-proof test results and safety certifications on-chain.' },
                { icon: '📱', num: 'Step 04', title: 'Consumer Scan', desc: "End consumers scan a QR code to see the complete verified journey of their product." },
              ].map(({ icon, num, title, desc }) => (
                <div key={num} className="lp-timeline-step lp-reveal">
                  <div className="lp-step-dot">
                    <div className="lp-step-dot-inner" />
                    <div className="lp-step-dot-pulse" />
                  </div>
                  <div className="lp-step-content">
                    <div className="lp-step-number">{num}</div>
                    <div className="lp-step-icon-card">{icon}</div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────── */}
      <LiveStats chainStats={chainStats} chainError={chainError} />

      {/* ── TECH STACK ───────────────────────────────────── */}
      <section className="lp-tech" id="technology">
        <div className="lp-container">
          <div className="lp-section-header">
            <p className="lp-section-tag lp-reveal">Under the Hood</p>
            <h2 className="lp-section-title lp-reveal">
              Built With <span className="lp-text-gradient">Best-in-Class</span> Tech
            </h2>
            <p className="lp-section-desc lp-reveal">
              A robust technology stack designed for security, scalability, and speed.
            </p>
          </div>
          <div className="lp-tech-grid">
            {[
              { logo: '⟠', cls: 'lp-ti-green', tag: 'green', tagLabel: 'Smart Contracts', title: 'Solidity', desc: 'Smart contracts governing batch lifecycle, access roles, and compliance logic.' },
              { logo: '⬡', cls: 'lp-ti-purple', tag: 'purple', tagLabel: 'Blockchain', title: 'Ethereum', desc: 'Decentralised, battle-tested blockchain securing all supply chain records.' },
              { logo: '⚛️', cls: 'lp-ti-teal', tag: 'teal', tagLabel: 'Frontend', title: 'React', desc: 'Modern, responsive front-end powering dashboards for every supply chain role.' },
              { logo: '◆', cls: 'lp-ti-gold', tag: 'gold', tagLabel: 'Storage', title: 'IPFS', desc: 'Distributed file storage for lab reports, certificates, and batch documentation.' },
            ].map(({ logo, cls, tag, tagLabel, title, desc }) => (
              <div key={title} className="lp-tech-card lp-reveal">
                <div className={`lp-tech-card-inner ${cls}`}>
                  <div className="lp-tech-logo-wrap">
                    <div className="lp-tech-logo">{logo}</div>
                  </div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  <div className={`lp-tech-tag ${tag}`}>{tagLabel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ──────────────────────────────────── */}
      <section className="lp-testimonial" id="testimonial">
        <div className="lp-container">
          <div className="lp-testimonial-card lp-reveal">
            <div className="lp-testimonial-quote">"</div>
            <blockquote>
              HerbChain has completely transformed how we track our supply chain. The on-chain lab reports give our
              customers real confidence in our products. It's the future of herbal product integrity.
            </blockquote>
            <div className="lp-testimonial-author">
              <div className="lp-author-avatar">RS</div>
              <div className="lp-author-info">
                <strong>Dr. Rajesh Sharma</strong>
                <span>Director, AyurVeda Research Institute</span>
              </div>
            </div>
            <div className="lp-testimonial-stars">★★★★★</div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="lp-cta-section" id="cta">
        <div className="lp-container">
          <div className="lp-cta-card lp-reveal">
            <div className="lp-cta-bg-pattern" />
            <div className="lp-cta-content">
              <div className="lp-cta-icon">🌿</div>
              <h2>Ready to Build Trust<br />in Your Supply Chain?</h2>
              <p>
                Join organizations using HerbChain to ensure transparency, quality, and authenticity
                across every step of the herbal supply chain.
              </p>
              <div className="lp-cta-buttons">
                <Link to="/farmer" className="lp-btn lp-btn-primary lp-btn-lg">
                  <span>Register a Batch</span>
                  <div className="lp-btn-glow" />
                </Link>
                <Link to="/track" className="lp-btn lp-btn-glass lp-btn-lg">
                  <span>Track a Product</span>
                </Link>
              </div>
              <p className="lp-cta-note">Academic prototype · Ethereum Sepolia testnet · No real transactions</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="lp-footer" id="footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <div className="lp-footer-logo-row">
                <div className="lp-footer-logo-icon">🌿</div>
                Herb<span style={{ color: 'var(--green-mid)' }}>Chain</span>
              </div>
              <p>Building trust in herbal supply chains through blockchain transparency. Every herb, verified. Every step, recorded.</p>
              <div className="lp-footer-socials">
                <a href="#" className="lp-social-link" aria-label="GitHub">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </a>
                <a href="#" className="lp-social-link" aria-label="Twitter">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="lp-footer-links">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><Link to="/farmer">Farmer Portal</Link></li>
                <li><Link to="/lab">Lab Portal</Link></li>
              </ul>
            </div>
            <div className="lp-footer-links">
              <h4>Portals</h4>
              <ul>
                <li><Link to="/farmer">Farmer</Link></li>
                <li><Link to="/lab">Lab</Link></li>
                <li><Link to="/distributor">Distributor</Link></li>
                <li><Link to="/track">Track</Link></li>
              </ul>
            </div>
            <div className="lp-footer-links">
              <h4>Technology</h4>
              <ul>
                <li><a href="#technology">Solidity</a></li>
                <li><a href="#technology">Ethereum</a></li>
                <li><a href="#technology">IPFS</a></li>
                <li><a href="#technology">React</a></li>
              </ul>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <p>© 2026 HerbChain · Academic Prototype · Ethereum Sepolia testnet</p>
            <div className="lp-footer-bottom-links">
              <a href="#">No real transactions</a>
              <a href="#">No production use</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   APP
═══════════════════════════════════════════════════════════ */
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