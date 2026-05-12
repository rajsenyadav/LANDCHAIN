// frontend/src/App.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { ethers } from "ethers";

// Pages
import Dashboard      from "./pages/Dashboard";
import LandSearch     from "./pages/LandSearch";
import RegisterLand   from "./pages/RegisterLand";
import LandDetail     from "./pages/LandDetail";
import InitiateTransfer from "./pages/InitiateTransfer";
import RegistrarPortal from "./pages/RegistrarPortal";
import Valuation      from "./pages/Valuation";
import Login          from "./pages/Login";

// ── Web3 Context ─────────────────────────────────────────────────────────
export const Web3Context = createContext(null);

export const useWeb3 = () => useContext(Web3Context);

function Web3Provider({ children }) {
  const [account, setAccount]   = useState(null);
  const [provider, setProvider] = useState(null);
  const [user, setUser]         = useState(null);
  const [token, setToken]       = useState(localStorage.getItem("jwtToken"));

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", accounts => {
        if (accounts.length === 0) logout();
        else setAccount(accounts[0]);
      });
    }
    if (token) {
      fetchUser(token);
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask from https://metamask.io (free)");
      return;
    }
    const provider_ = new ethers.BrowserProvider(window.ethereum);
    const accounts  = await provider_.send("eth_requestAccounts", []);
    setProvider(provider_);
    setAccount(accounts[0]);
    return accounts[0];
  };

  const login = async (walletAddr) => {
    // 1. Get nonce from backend
    const nonceRes = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/nonce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddr })
    });
    const { message } = await nonceRes.json();

    // 2. Sign with MetaMask
    const signer    = await provider.getSigner();
    const signature = await signer.signMessage(message);

    // 3. Verify signature → get JWT
    const verifyRes = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddr, signature })
    });
    const data = await verifyRes.json();
    localStorage.setItem("jwtToken", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("jwtToken");
    setToken(null);
    setUser(null);
    setAccount(null);
  };

  const fetchUser = async (t) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) setUser(await res.json());
    } catch {}
  };

  const apiCall = async (path, options = {}) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });
    if (!res.ok) throw new Error((await res.json()).error || "API error");
    return res.json();
  };

  return (
    <Web3Context.Provider value={{ account, provider, user, token, connectWallet, login, logout, apiCall }}>
      {children}
    </Web3Context.Provider>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────
function Navbar() {
  const { account, user, connectWallet, logout } = useWeb3();

  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 24px", borderBottom: "1px solid #e5e7eb",
      background: "#fff", position: "sticky", top: 0, zIndex: 100
    }}>
      <Link to="/" style={{ fontWeight: 700, fontSize: 18, textDecoration: "none", color: "#1d4ed8" }}>
        LandChain AI
      </Link>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <Link to="/search"    style={{ textDecoration: "none", color: "#374151", fontSize: 14 }}>Search</Link>
        <Link to="/valuation" style={{ textDecoration: "none", color: "#374151", fontSize: 14 }}>Valuation</Link>
        {user?.role === "registrar" &&
          <Link to="/registrar" style={{ textDecoration: "none", color: "#7c3aed", fontSize: 14 }}>Registrar Portal</Link>
        }
        {account ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", padding: "4px 10px", borderRadius: 20 }}>
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
            <button onClick={logout} style={{ fontSize: 12, padding: "4px 12px", cursor: "pointer" }}>
              Logout
            </button>
          </div>
        ) : (
          <button onClick={connectWallet}
            style={{ background: "#1d4ed8", color: "#fff", border: "none",
                     padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <Navbar />
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/search"    element={<LandSearch />} />
          <Route path="/land/:id"  element={<LandDetail />} />
          <Route path="/register"  element={<RegisterLand />} />
          <Route path="/transfer/:tokenId" element={<InitiateTransfer />} />
          <Route path="/registrar" element={<RegistrarPortal />} />
          <Route path="/valuation" element={<Valuation />} />
          <Route path="*"          element={<Navigate to="/" />} />
        </Routes>
      </Web3Provider>
    </BrowserRouter>
  );
}
