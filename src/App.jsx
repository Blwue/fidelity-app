import { useState, useEffect, useRef } from "react";
import { supabase, loadUserPoints, saveUserPoints, saveTransaction, createProfile } from './supabase'
import { QRCodeSVG } from 'qrcode.react'

const THEMES = {
  1: { accent: "#FF3D00", bg: "linear-gradient(135deg,#1A0800,#2A1200)", light: "rgba(255,61,0,0.12)" },
  2: { accent: "#6B4226", bg: "linear-gradient(135deg,#0F0800,#1A1000)", light: "rgba(107,66,38,0.12)" },
  3: { accent: "#1D9E75", bg: "linear-gradient(135deg,#001A12,#002A1C)", light: "rgba(29,158,117,0.12)" },
};

const INIT_SHOPS = [
  {
    id: 1, name: "BurgerLab", emoji: "🍔", category: "Fast-food",
    pointsPerEuro: 1,
    rewards: [
      { id: 1, type: "fixed", name: "Frites Offertes", points: 150, emoji: "🍟", desc: "Une portion de frites offerte" },
      { id: 2, type: "percent", name: "Réduction 10%", points: 200, emoji: "💸", desc: "10% sur votre prochaine commande", value: 10 },
      { id: 3, type: "fixed", name: "Burger Gratuit", points: 500, emoji: "🍔", desc: "Un burger au choix offert" },
    ],
  },
  {
    id: 2, name: "Café Lumière", emoji: "☕", category: "Café & Brunch",
    pointsPerEuro: 2,
    rewards: [
      { id: 1, type: "fixed", name: "Café offert", points: 100, emoji: "☕", desc: "Un café au choix offert" },
      { id: 2, type: "percent", name: "Réduction 15%", points: 250, emoji: "💸", desc: "15% sur l'addition", value: 15 },
    ],
  },
  {
    id: 3, name: "FitZone", emoji: "💪", category: "Sport & Bien-être",
    pointsPerEuro: 1,
    rewards: [
      { id: 1, type: "fixed", name: "Séance offerte", points: 500, emoji: "🎫", desc: "Une séance au choix offerte" },
      { id: 2, type: "percent", name: "Réduction 20%", points: 300, emoji: "💸", desc: "20% sur votre prochain achat", value: 20 },
    ],
  },
];

const TIERS = [
  { name: "Bronze", min: 0, max: 499, bg: "linear-gradient(135deg,#8B4513,#CD7F32)" },
  { name: "Silver", min: 500, max: 1499, bg: "linear-gradient(135deg,#808080,#C0C0C0)" },
  { name: "Gold", min: 1500, max: 2999, bg: "linear-gradient(135deg,#B8860B,#FFD700)" },
  { name: "Platinum", min: 3000, max: Infinity, bg: "linear-gradient(135deg,#6C6C6C,#E5E4E2)" },
];

const BADGES = [
  { id: "first_visit", name: "1ère visite", emoji: "🌟", condition: (u) => u.totalVisits >= 1 },
  { id: "loyal", name: "Fidèle", emoji: "❤️", condition: (u) => u.totalVisits >= 5 },
  { id: "big_spender", name: "Grand client", emoji: "💎", condition: (u) => u.totalSpent >= 100 },
  { id: "gold_member", name: "Gold", emoji: "🥇", condition: (u) => u.totalPoints >= 1500 },
];

function getTier(p) { return TIERS.find(t => p >= t.min && p <= t.max) || TIERS[0]; }

function generateQR(userId, shopId) {
  return `FID-${userId}-${shopId}`;
}


export default function App() {
  const [shops] = useState(INIT_SHOPS);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeShopId, setActiveShopId] = useState(1);
  const [view, setView] = useState("card");
  const [authTab, setAuthTab] = useState("login");
  const [form, setForm] = useState({ email: "", pwd: "", name: "", regEmail: "", regPwd: "" });
  const [notif, setNotif] = useState(null);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [cashierMode, setCashierMode] = useState(false);
  const [cashierStep, setCashierStep] = useState("scan");
  const [cashierInput, setCashierInput] = useState("");
  const [cashierAmount, setCashierAmount] = useState("");
  const [cashierFoundUser, setCashierFoundUser] = useState(null);
  const [adminShopId, setAdminShopId] = useState(1);
  const [adminShops, setAdminShops] = useState(JSON.parse(JSON.stringify(INIT_SHOPS)));
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [newReward, setNewReward] = useState({ type: "fixed", name: "", points: 100, emoji: "🎁", desc: "", value: 10 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        const pointsData = await loadUserPoints(user.id);
        const shopData = {
          1: { points: 0, redeemedRewards: [], history: [] },
          2: { points: 0, redeemedRewards: [], history: [] },
          3: { points: 0, redeemedRewards: [], history: [] }
        };
        let totalPoints = 0, totalVisits = 0, totalSpent = 0;
        if (pointsData) {
          pointsData.forEach(row => {
            shopData[row.shop_id] = { points: row.points, redeemedRewards: [], history: [] };
            totalPoints += row.points;
            totalVisits += row.total_visits || 0;
            totalSpent += row.total_spent || 0;
          });
        }
        setCurrentUser({
          name: user.user_metadata?.name || user.email.split('@')[0],
          email: user.email,
          id: user.id,
          totalPoints, totalSpent, totalVisits, shopData
        });
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  });
}, []);
useEffect(() => {
  if (!currentUser?.id) return;

  const refreshPoints = async () => {
    const pointsData = await loadUserPoints(currentUser.id);
    if (!pointsData) return;

    const shopData = {
      1: { points: 0, redeemedRewards: [], history: [] },
      2: { points: 0, redeemedRewards: [], history: [] },
      3: { points: 0, redeemedRewards: [], history: [] }
    };

    let totalPoints = 0;
    let totalVisits = 0;
    let totalSpent = 0;

    pointsData.forEach(row => {
      shopData[row.shop_id] = { points: row.points, redeemedRewards: [], history: [] };
      totalPoints += row.points;
      totalVisits += row.total_visits || 0;
      totalSpent += row.total_spent || 0;
    });

    setCurrentUser(prev => ({
      ...prev,
      shopData,
      totalPoints,
      totalVisits,
      totalSpent
    }));
  };

  refreshPoints();
  const interval = setInterval(refreshPoints, 10000);

  return () => clearInterval(interval);
}, [currentUser?.id]);
  const shop = shops.find(s => s.id === activeShopId);
  const adminShop = adminShops.find(s => s.id === adminShopId);
  const theme = THEMES[activeShopId] || THEMES[1];
  const userShopData = currentUser?.shopData[activeShopId] || { points: 0, redeemedRewards: [], history: [] };
  const tier = getTier(userShopData.points);
  const nextTier = TIERS[TIERS.indexOf(tier) + 1];
  const progress = nextTier ? Math.round(((userShopData.points - tier.min) / (nextTier.min - tier.min)) * 100) : 100;
  const earnedBadges = BADGES.filter(b => b.condition(currentUser || {}));
  const qrValue = currentUser ? generateQR(currentUser.id, activeShopId) : "";

  const showNotif = (msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 2800);
  };

const doLogin = async () => {
  if(!form.email||!form.pwd){showNotif('Remplissez tous les champs','error');return;}
  const {data, error} = await supabase.auth.signInWithPassword({
    email: form.email,
    password: form.pwd
  });
  if(error){showNotif('Email ou mot de passe incorrect','error');return;}
  
  // Charger les points depuis Supabase
  const pointsData = await loadUserPoints(data.user.id);
  
  // Construire le shopData depuis la base
  const shopData = {
    1: { points: 0, redeemedRewards: [], history: [] },
    2: { points: 0, redeemedRewards: [], history: [] },
    3: { points: 0, redeemedRewards: [], history: [] }
  };
  
  let totalPoints = 0;
  let totalVisits = 0;
  let totalSpent = 0;
  
  if(pointsData) {
    pointsData.forEach(row => {
      shopData[row.shop_id] = {
        points: row.points,
        redeemedRewards: [],
        history: []
      };
      totalPoints += row.points;
      totalVisits += row.total_visits || 0;
      totalSpent += row.total_spent || 0;
    });
  }
  
  setCurrentUser({
    name: data.user.user_metadata?.name || data.user.email.split('@')[0],
    email: data.user.email,
    id: data.user.id,
    totalPoints,
    totalSpent,
    totalVisits,
    shopData
  });
  showNotif('Bienvenue !');
};

 const doRegister = async () => {
  if(!form.name||!form.regEmail||!form.regPwd){showNotif('Remplissez tout','error');return;}
  if(form.regPwd.length<6){showNotif('Mot de passe trop court','error');return;}
  const {data, error} = await supabase.auth.signUp({
    email: form.regEmail,
    password: form.regPwd,
    options: { data: { name: form.name } }
  });
  if(error){showNotif(error.message,'error');return;}
  
  // Créer le profil dans Supabase
  await createProfile(data.user.id, form.name, form.regEmail);
  
  setCurrentUser({
    name: form.name,
    email: form.regEmail,
    id: data.user.id,
    totalPoints: 0,
    totalSpent: 0,
    totalVisits: 0,
    shopData: {
      1: { points: 0, redeemedRewards: [], history: [] },
      2: { points: 0, redeemedRewards: [], history: [] },
      3: { points: 0, redeemedRewards: [], history: [] }
    }
  });
  showNotif('Compte créé !');
};

  // Caissier scan QR
  const cashierScan = async () => {
  const parts = cashierInput.split("-");
  if (parts.length < 3) { showNotif("QR invalide", "error"); return; }
  
  // Récupérer l'ID depuis le QR (format: FID-userId-shopId)
  const userId = parts.slice(1, -1).join("-");
  const shopIdFromQR = parseInt(parts[parts.length - 1]);
  
  // Chercher dans Supabase
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  
  if (error || !data) {
    // Chercher dans les profils
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError || !profile) { showNotif("Client introuvable", "error"); return; }
    
    // Charger ses points
    const pointsData = await loadUserPoints(userId);
    const shopData = {
      1: { points: 0, redeemedRewards: [], history: [] },
      2: { points: 0, redeemedRewards: [], history: [] },
      3: { points: 0, redeemedRewards: [], history: [] }
    };
    if (pointsData) {
      pointsData.forEach(row => {
        shopData[row.shop_id] = { points: row.points, redeemedRewards: [], history: [] };
      });
    }
    
    setCashierFoundUser({ 
      id: userId, 
      name: profile.name, 
      email: profile.email,
      totalVisits: 0,
      shopData
    });
    setCashierStep("amount");
    return;
  }
};

  const cashierAddPoints = async () => {
  const amount = parseFloat(cashierAmount);
  if (!amount || amount <= 0) { showNotif("Montant invalide", "error"); return; }
  const sh = adminShops.find(s => s.id === adminShopId);
  const pts = Math.round(amount * sh.pointsPerEuro);
  
  // Récupérer les points actuels du client
  const currentShopData = cashierFoundUser.shopData?.[adminShopId] || { points: 0, total_visits: 0, total_spent: 0 };
  const newPoints = (currentShopData.points || 0) + pts;
  const newVisits = (cashierFoundUser.totalVisits || 0) + 1;
  const newSpent = (cashierFoundUser.totalSpent || 0) + amount;

  // Sauvegarder dans Supabase
  await saveUserPoints(cashierFoundUser.id, adminShopId, newPoints, newSpent, newVisits);
  await saveTransaction(cashierFoundUser.id, adminShopId, amount, pts);

  // Mettre à jour l'état local
  setUsers(prev => prev.map(u => {
    if (u.id !== cashierFoundUser.id) return u;
    const updated = { ...u };
    updated.totalPoints = (updated.totalPoints || 0) + pts;
    updated.totalSpent = newSpent;
    updated.totalVisits = newVisits;
    updated.shopData = { ...updated.shopData };
    updated.shopData[adminShopId] = {
      points: newPoints,
      redeemedRewards: updated.shopData?.[adminShopId]?.redeemedRewards || [],
      history: [{ date: new Date().toLocaleDateString("fr"), amount, pts }, ...(updated.shopData?.[adminShopId]?.history || [])],
    };
    if (updated.id === currentUser?.id) setCurrentUser(updated);
    return updated;
  }));
  
  showNotif(`✅ +${pts} pts ajoutés à ${cashierFoundUser.name} !`);
  setCashierStep("done");
  setCashierAmount("");
};

 const redeemReward = async (rewardId) => {
  const r = adminShops.find(s => s.id === activeShopId)?.rewards.find(r => r.id === rewardId);
  if (!r) return;
  if (userShopData.points < r.points) { showNotif("Pas assez de points !", "error"); return; }
  
  const newPoints = userShopData.points - r.points;
  
  // Sauvegarder dans Supabase
  await saveUserPoints(
    currentUser.id,
    activeShopId,
    newPoints,
    currentUser.totalSpent || 0,
    currentUser.totalVisits || 0
  );

  // Mettre à jour l'état local
  setUsers(prev => prev.map(u => {
    if (u.id !== currentUser.id) return u;
    const updated = { ...u, shopData: { ...u.shopData } };
    updated.shopData[activeShopId] = {
      ...updated.shopData[activeShopId],
      points: newPoints,
      redeemedRewards: [...(updated.shopData[activeShopId].redeemedRewards || []), { rewardId, date: new Date().toLocaleDateString("fr") }],
    };
    updated.totalPoints = (updated.totalPoints || 0) - r.points;
    setCurrentUser(updated);
    return updated;
  }));
  
  showNotif("🎉 " + r.name + " débloqué !");
};

  const s = (prop) => ({ style: prop });

  if (!currentUser && !cashierMode) return (
    <div style={{ minHeight: "100vh", background: "#07070A", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px", fontFamily: "'Outfit',sans-serif", color: "#F2F2F2", maxWidth: 430, margin: "0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}input{font-family:'Outfit',sans-serif;}@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}.slide{animation:slideUp .3s ease}`}</style>
      {notif && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: notif.type === "error" ? "#E63946" : "#2DC653", color: "#fff", padding: "10px 24px", borderRadius: 100, fontSize: 13, fontWeight: 700, zIndex: 100, whiteSpace: "nowrap" }}>{notif.msg}</div>}
      <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, marginBottom: 4 }}>Fidelity<span style={{ color: "#FF3D00" }}>.</span></div>
      <div style={{ fontSize: 14, color: "#666", marginBottom: 48 }}>La carte de fidélité intelligente</div>
      <div style={{ display: "flex", background: "#16161D", borderRadius: 16, padding: 4, marginBottom: 28, border: "1px solid rgba(255,255,255,0.06)" }}>
        {["login", "register"].map((t, i) => (
          <button key={t} onClick={() => setAuthTab(t)} style={{ flex: 1, padding: "11px", border: "none", background: authTab === t ? "#1E1E27" : "none", color: authTab === t ? "#F2F2F2" : "#666", fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", borderRadius: 13, transition: "all .2s" }}>{i === 0 ? "Connexion" : "Inscription"}</button>
        ))}
      </div>
      {authTab === "login" ? (
        <>
          {[["Email", "email", "email", ""], ["Mot de passe", "", "pwd", ""]].map(([label, type, key, ph]) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "#888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>{label}</label>
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={{ width: "100%", background: "#16161D", border: "1px solid rgba(255,255,255,0.06)", color: "#F2F2F2", padding: "14px 16px", borderRadius: 14, fontSize: 15, outline: "none" }} />
            </div>
          ))}
          <button onClick={doLogin} style={{ width: "100%", padding: 16, background: "#FF3D00", border: "none", color: "#fff", fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, borderRadius: 16, cursor: "pointer", marginBottom: 10 }}>Se connecter</button>
          <button onClick={() => { setCurrentUser(users[0]); showNotif("Bienvenue Marie !"); }} style={{ width: "100%", padding: 14, background: "#16161D", border: "1px solid rgba(255,255,255,0.06)", color: "#888", fontFamily: "'Outfit',sans-serif", fontSize: 14, borderRadius: 16, cursor: "pointer", marginBottom: 10 }}>Essayer sans compte →</button>
          <button onClick={() => setCashierMode(true)} style={{ width: "100%", padding: 14, background: "none", border: "1px solid rgba(255,255,255,0.06)", color: "#555", fontFamily: "'Outfit',sans-serif", fontSize: 13, borderRadius: 16, cursor: "pointer" }}>Mode caissier 🏪</button>
        </>
      ) : (
        <>
          {[["Prénom", "text", "name", "Marie"], ["Email", "email", "regEmail", "vous@email.com"], ["Mot de passe", "password", "regPwd", "Min. 6 caractères"]].map(([label, type, key, ph]) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "#888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>{label}</label>
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={{ width: "100%", background: "#16161D", border: "1px solid rgba(255,255,255,0.06)", color: "#F2F2F2", padding: "14px 16px", borderRadius: 14, fontSize: 15, outline: "none" }} />
            </div>
          ))}
          <button onClick={doRegister} style={{ width: "100%", padding: 16, background: "#FF3D00", border: "none", color: "#fff", fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, borderRadius: 16, cursor: "pointer" }}>Créer mon compte</button>
        </>
      )}
    </div>
  );

  // MODE CAISSIER
  if (cashierMode) return (
    <div style={{ minHeight: "100vh", background: "#07070A", fontFamily: "'Outfit',sans-serif", color: "#F2F2F2", maxWidth: 430, margin: "0 auto", padding: "24px 20px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Space+Mono:wght@700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}input{font-family:'Outfit',sans-serif;}`}</style>
      {notif && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: notif.type === "error" ? "#E63946" : "#2DC653", color: "#fff", padding: "10px 24px", borderRadius: 100, fontSize: 13, fontWeight: 700, zIndex: 100 }}>{notif.msg}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Mode Caissier</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>Ajout de points clients</div>
        </div>
        <button onClick={() => { setCashierMode(false); setCashierStep("scan"); setCashierFoundUser(null); setCashierInput(""); }} style={{ background: "#16161D", border: "1px solid rgba(255,255,255,0.08)", color: "#888", padding: "8px 14px", borderRadius: 12, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13 }}>✕ Fermer</button>
      </div>

      {/* Sélecteur boutique caissier */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 11, color: "#666", letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Boutique</label>
        <div style={{ display: "flex", gap: 8 }}>
          {adminShops.map(sh => (
            <button key={sh.id} onClick={() => setAdminShopId(sh.id)} style={{ flex: 1, padding: "10px 8px", background: adminShopId === sh.id ? THEMES[sh.id].accent : "#16161D", border: "1px solid rgba(255,255,255,0.06)", color: "#fff", borderRadius: 12, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, transition: "all .2s" }}>{sh.emoji} {sh.name}</button>
          ))}
        </div>
      </div>

      <div style={{ background: "#16161D", borderRadius: 20, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
        {cashierStep === "scan" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Scanner le QR client</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Ou entrez le code manuellement</div>
            </div>
            <input value={cashierInput} onChange={e => setCashierInput(e.target.value)} placeholder="Ex: FID-U001-1-ABC123" style={{ width: "100%", background: "#0F0F14", border: "1px solid rgba(255,255,255,0.08)", color: "#F2F2F2", padding: "14px 16px", borderRadius: 14, fontSize: 14, outline: "none", marginBottom: 12, fontFamily: "'Outfit',sans-serif" }} />
            <button onClick={cashierScan} style={{ width: "100%", padding: 14, background: THEMES[adminShopId].accent, border: "none", color: "#fff", fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, borderRadius: 14, cursor: "pointer" }}>Valider le QR</button>
            <div style={{ marginTop: 16, padding: 14, background: "#0F0F14", borderRadius: 12, fontSize: 12, color: "#555" }}>
              💡 Tip : Pour tester, utilisez <span style={{ color: THEMES[adminShopId].accent, fontWeight: 600 }}>FID-U001-1-TEST</span>
            </div>
          </>
        )}

        {cashierStep === "amount" && cashierFoundUser && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, padding: 16, background: "#0F0F14", borderRadius: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: THEMES[adminShopId].accent + "22", color: THEMES[adminShopId].accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>{cashierFoundUser.name.charAt(0)}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{cashierFoundUser.name}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{cashierFoundUser.shopData[adminShopId]?.points || 0} pts actuels</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#555" }}>Niveau</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#FFD700" }}>{getTier(cashierFoundUser.shopData[adminShopId]?.points || 0).name}</div>
              </div>
            </div>
            <label style={{ fontSize: 11, color: "#666", letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Montant de l'achat (€)</label>
            <input type="number" value={cashierAmount} onChange={e => setCashierAmount(e.target.value)} placeholder="Ex: 25.50" style={{ width: "100%", background: "#0F0F14", border: "1px solid rgba(255,255,255,0.08)", color: "#F2F2F2", padding: "14px 16px", borderRadius: 14, fontSize: 18, fontFamily: "'Space Mono',monospace", outline: "none", marginBottom: 8 }} />
            {cashierAmount && (
              <div style={{ textAlign: "center", padding: 12, background: THEMES[adminShopId].accent + "15", borderRadius: 12, marginBottom: 12, fontSize: 14, color: THEMES[adminShopId].accent, fontWeight: 700 }}>
                = +{Math.round(parseFloat(cashierAmount || 0) * (adminShops.find(s => s.id === adminShopId)?.pointsPerEuro || 1))} points
              </div>
            )}
            <button onClick={cashierAddPoints} style={{ width: "100%", padding: 14, background: THEMES[adminShopId].accent, border: "none", color: "#fff", fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, borderRadius: 14, cursor: "pointer", marginBottom: 8 }}>Ajouter les points ✓</button>
            <button onClick={() => { setCashierStep("scan"); setCashierFoundUser(null); setCashierInput(""); }} style={{ width: "100%", padding: 12, background: "none", border: "1px solid rgba(255,255,255,0.06)", color: "#666", fontFamily: "'Outfit',sans-serif", fontSize: 13, borderRadius: 14, cursor: "pointer" }}>← Retour</button>
          </>
        )}

        {cashierStep === "done" && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Points ajoutés !</div>
            <div style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>{cashierFoundUser?.name} a bien reçu ses points</div>
            <button onClick={() => { setCashierStep("scan"); setCashierFoundUser(null); setCashierInput(""); }} style={{ width: "100%", padding: 14, background: THEMES[adminShopId].accent, border: "none", color: "#fff", fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, borderRadius: 14, cursor: "pointer" }}>Nouveau client →</button>
          </div>
        )}
      </div>
    </div>
  );

  // APP CLIENT
  return (
    <div style={{ minHeight: "100vh", background: "#07070A", color: "#F2F2F2", fontFamily: "'Outfit',sans-serif", maxWidth: 430, margin: "0 auto", paddingBottom: 80 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}input,select,textarea{font-family:'Outfit',sans-serif;}@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}.su{animation:slideUp .3s ease}`}</style>

      {notif && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: notif.type === "error" ? "#E63946" : "#2DC653", color: "#fff", padding: "10px 24px", borderRadius: 100, fontSize: 13, fontWeight: 700, zIndex: 500, whiteSpace: "nowrap" }}>{notif.msg}</div>}

      {/* HEADER */}
      <div style={{ padding: "18px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "rgba(7,7,10,0.95)", backdropFilter: "blur(20px)", zIndex: 40 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Fidelity<span style={{ color: theme.accent }}>.</span></div>
        <div onClick={() => setView("profile")} style={{ display: "flex", alignItems: "center", gap: 8, background: "#16161D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 100, padding: "5px 12px 5px 5px", cursor: "pointer" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: theme.accent + "22", color: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{currentUser.name.charAt(0)}</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.name.split(" ")[0]}</span>
        </div>
      </div>

      {/* SHOP SWITCHER MODAL */}
      {showSwitcher && (
        <div onClick={() => setShowSwitcher(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end", backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0F0F14", borderRadius: "28px 28px 0 0", padding: "24px 20px 40px", animation: "slideUp .3s ease" }}>
            <div style={{ fontSize: 12, color: "#555", textAlign: "center", marginBottom: 20, letterSpacing: 1, textTransform: "uppercase" }}>Choisir une boutique</div>
            {shops.map(sh => {
              const t2 = THEMES[sh.id] || THEMES[1];
              const pts = currentUser.shopData[sh.id]?.points || 0;
              return (
                <div key={sh.id} onClick={() => { setActiveShopId(sh.id); setShowSwitcher(false); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 16, cursor: "pointer", marginBottom: 8, background: sh.id === activeShopId ? "#16161D" : "none", border: "1px solid " + (sh.id === activeShopId ? "rgba(255,255,255,0.08)" : "transparent"), transition: "all .2s" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: t2.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{sh.emoji}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{sh.name}</div><div style={{ fontSize: 12, color: "#666" }}>{sh.category}</div></div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono',monospace", color: t2.accent }}>{pts} pts</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CARTE */}
      {view === "card" && (
        <div className="su" style={{ padding: "0 20px" }}>
          {/* Shop hero */}
          <div style={{ marginTop: 16, borderRadius: 22, padding: 24, background: theme.bg, border: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle,${theme.accent} 0%,transparent 70%)`, opacity: 0.12 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{shop.emoji}</div>
                <div><div style={{ fontSize: 17, fontWeight: 800 }}>{shop.name}</div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{shop.category}</div></div>
              </div>
              <button onClick={() => setShowSwitcher(true)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "rgba(255,255,255,0.8)", fontFamily: "'Outfit',sans-serif" }}>Changer ▾</button>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: 3, textTransform: "uppercase" }}>Total points</div>
            <div style={{ fontSize: 54, fontWeight: 900, lineHeight: 1, letterSpacing: -2, fontFamily: "'Space Mono',monospace", background: `linear-gradient(90deg,#fff,${theme.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200% auto" }}>{userShopData.points.toLocaleString()}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
              <div style={{ padding: "5px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, letterSpacing: 1, background: "rgba(255,255,255,0.15)", color: "#fff" }}>{tier.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{nextTier ? (nextTier.min - userShopData.points) + " pts → " + nextTier.name : "Niveau max !"}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 100, height: 4, overflow: "hidden", marginTop: 10 }}>
              <div style={{ width: progress + "%", height: "100%", background: "rgba(255,255,255,0.7)", borderRadius: 100, transition: "width 1.2s ease" }} />
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 12 }}>
            {[{ v: currentUser.totalVisits, l: "Visites" }, { v: currentUser.totalPoints, l: "Pts total" }, { v: earnedBadges.length, l: "Badges" }].map((x, i) => (
              <div key={i} style={{ background: "#16161D", borderRadius: 14, padding: "14px 10px", border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{x.v}</div>
                <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginTop: 4, fontWeight: 500 }}>{x.l}</div>
              </div>
            ))}
          </div>

          {/* Badges */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 2, textTransform: "uppercase", margin: "20px 0 10px" }}>Badges</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {BADGES.map(b => {
              const earned = earnedBadges.find(e => e.id === b.id);
              return <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 100, fontSize: 13, fontWeight: 600, border: "1px solid " + (earned ? "rgba(255,215,0,0.25)" : "rgba(255,255,255,0.05)"), background: earned ? "rgba(255,215,0,0.06)" : "#16161D", color: earned ? "#FFD700" : "#fff", opacity: earned ? 1 : 0.3 }}>{b.emoji} {b.name}</div>;
            })}
          </div>

          {/* Historique */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Dernières visites</div>
          {(userShopData.history || []).slice(0, 4).length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "#444", fontSize: 13 }}>Aucune visite encore — montrez votre QR au caissier !</div>
          ) : (
            (userShopData.history || []).slice(0, 4).map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(45,198,83,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛒</div>
                  <div><div style={{ fontSize: 13, fontWeight: 600 }}>{h.amount?.toFixed(2)}€ dépensés</div><div style={{ fontSize: 11, color: "#555" }}>{h.date}</div></div>
                </div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color: "#2DC653" }}>+{h.pts}pts</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* QR CODE */}
      {view === "qr" && (
        <div className="su" style={{ padding: "0 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ marginTop: 24, fontSize: 22, fontWeight: 800, textAlign: "center" }}>Mon QR Code</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 4, textAlign: "center" }}>Présentez-le au caissier pour gagner des points</div>

          <div style={{ marginTop: 32, background: "#fff", borderRadius: 24, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <QRCodeSVG value={qrValue} size={200} bgColor="#ffffff" fgColor="#000000" level="H" />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#999", letterSpacing: 2, textTransform: "uppercase" }}>Votre code</div>
              <div style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: "#333", marginTop: 4, wordBreak: "break-all", textAlign: "center" }}>{qrValue}</div>
            </div>
          </div>

          <div style={{ marginTop: 24, background: "#16161D", borderRadius: 20, padding: 20, border: "1px solid rgba(255,255,255,0.06)", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{shop.name}</span>
              <span style={{ fontSize: 14, fontFamily: "'Space Mono',monospace", color: theme.accent, fontWeight: 700 }}>{userShopData.points} pts</span>
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>1 pt = 1€ dépensé · {shop.pointsPerEuro} pts/€</div>
          </div>

          <div style={{ marginTop: 12, width: "100%", display: "flex", gap: 10 }}>
            {shops.map(sh => (
              <button key={sh.id} onClick={() => setActiveShopId(sh.id)} style={{ flex: 1, padding: "10px 8px", background: activeShopId === sh.id ? THEMES[sh.id].accent : "#16161D", border: "1px solid rgba(255,255,255,0.06)", color: "#fff", borderRadius: 12, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, transition: "all .2s" }}>{sh.emoji}</button>
            ))}
          </div>
        </div>
      )}

      {/* RÉCOMPENSES */}
      {view === "rewards" && (
        <div className="su" style={{ padding: "0 20px" }}>
          <div style={{ marginTop: 24, fontSize: 22, fontWeight: 800 }}>Récompenses</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Vous avez <span style={{ color: "#FFD700", fontWeight: 700 }}>{userShopData.points} pts</span> chez {shop.name}</div>
          <div style={{ marginTop: 16 }}>
            {(adminShops.find(s => s.id === activeShopId)?.rewards || []).map(r => {
              const can = userShopData.points >= r.points;
              const done = (userShopData.redeemedRewards || []).find(rd => rd.rewardId === r.id);
              const pct = Math.min(100, Math.round((userShopData.points / r.points) * 100));
              return (
                <div key={r.id} style={{ background: "#16161D", border: "1px solid " + (done ? "rgba(45,198,83,0.2)" : can ? theme.accent + "30" : "rgba(255,255,255,0.05)"), borderRadius: 20, padding: "18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 54, height: 54, borderRadius: 16, background: theme.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{r.emoji}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</div>
                      <div style={{ fontSize: 12, fontFamily: "'Space Mono',monospace", color: theme.accent, fontWeight: 700, marginTop: 2 }}>{r.points} pts</div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{r.type === "percent" ? `-${r.value}% sur l'addition` : r.desc}</div>
                      <div style={{ marginTop: 8, background: "#0F0F14", borderRadius: 100, height: 3, width: 100, overflow: "hidden" }}>
                        <div style={{ width: pct + "%", height: "100%", background: theme.accent, borderRadius: 100, transition: "width .8s ease" }} />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => !done && redeemReward(r.id)} style={{ padding: "10px 14px", borderRadius: 12, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: can && !done ? "pointer" : "default", background: done ? "#2DC653" : can ? theme.accent : "#1E1E27", opacity: !can && !done ? 0.4 : 1, fontFamily: "'Outfit',sans-serif", flexShrink: 0 }}>
                    {done ? "✓ Utilisé" : can ? "Utiliser" : "Bientôt"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PROFIL */}
      {view === "profile" && (
        <div className="su" style={{ padding: "0 20px" }}>
          <div style={{ marginTop: 20, background: "#16161D", borderRadius: 22, padding: 24, border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: theme.accent + "20", color: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, margin: "0 auto 12px" }}>{currentUser.name.charAt(0)}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{currentUser.name}</div>
            <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{currentUser.email}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
              <div style={{ background: "#0F0F14", borderRadius: 12, padding: 14 }}><div style={{ fontSize: 22, fontWeight: 800 }}>{currentUser.totalPoints}</div><div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>Pts cumulés</div></div>
              <div style={{ background: "#0F0F14", borderRadius: 12, padding: 14 }}><div style={{ fontSize: 22, fontWeight: 800 }}>{currentUser.totalVisits}</div><div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>Visites</div></div>
            </div>
            <button onClick={() => { setCurrentUser(null); setView("card"); }} style={{ width: "100%", padding: 13, background: "none", border: "1px solid rgba(255,255,255,0.06)", color: "#666", fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, borderRadius: 14, cursor: "pointer", marginTop: 12, transition: "all .2s" }}>Se déconnecter</button>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 2, textTransform: "uppercase", margin: "20px 0 10px" }}>Mes boutiques</div>
          {shops.map(sh => (
            <div key={sh.id} onClick={() => { setActiveShopId(sh.id); setView("card"); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#16161D", borderRadius: 14, border: "1px solid rgba(255,255,255,0.05)", marginBottom: 8, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{sh.emoji}</span>
                <div><div style={{ fontSize: 14, fontWeight: 700 }}>{sh.name}</div><div style={{ fontSize: 12, color: "#555" }}>{sh.category}</div></div>
              </div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: "#FFD700" }}>{currentUser.shopData[sh.id]?.points || 0} pts</div>
            </div>
          ))}

          <button onClick={() => setCashierMode(true)} style={{ width: "100%", padding: 14, background: "#16161D", border: "1px solid rgba(255,255,255,0.06)", color: "#888", fontFamily: "'Outfit',sans-serif", fontSize: 13, borderRadius: 14, cursor: "pointer", marginTop: 8 }}>🏪 Accéder au mode caissier</button>
        </div>
      )}

      {/* NAV */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(7,7,10,0.92)", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-around", padding: "10px 0 18px", backdropFilter: "blur(20px)", zIndex: 100 }}>
        {[{ id: "card", icon: "💳", lbl: "Carte" }, { id: "qr", icon: "📱", lbl: "Mon QR" }, { id: "rewards", icon: "🎁", lbl: "Offres" }, { id: "profile", icon: "👤", lbl: "Profil" }].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 10px" }}>
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif", color: view === tab.id ? theme.accent : "#444", transition: "color .2s" }}>{tab.lbl}</span>
          </button>
        ))}
      </div>
    </div>
  );
}