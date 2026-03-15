import { useState } from "react";

const TIERS=[
  {name:'Bronze',min:0,max:499,bg:'linear-gradient(135deg,#8B4513,#CD7F32)'},
  {name:'Silver',min:500,max:1499,bg:'linear-gradient(135deg,#808080,#C0C0C0)'},
  {name:'Gold',min:1500,max:2999,bg:'linear-gradient(135deg,#B8860B,#FFD700)'},
  {name:'Platinum',min:3000,max:Infinity,bg:'linear-gradient(135deg,#6C6C6C,#E5E4E2)'},
];

const SHOPS=[
  {id:1,name:'BurgerLab',emoji:'🍔',category:'Fast-food',color:'#FF3D00',
   points:320,streak:2,orders:4,redeemedRewards:[],cart:[],earnedBadges:['first_order','big_fan'],
   menu:[
     {id:1,name:'Big Burger',price:8.90,points:89,emoji:'🍔'},
     {id:2,name:'Cheese Deluxe',price:10.50,points:105,emoji:'🧀'},
     {id:3,name:'Crispy Chicken',price:9.20,points:92,emoji:'🍗'},
     {id:4,name:'Frites Maison',price:3.50,points:35,emoji:'🍟'},
     {id:5,name:'Cola XL',price:2.90,points:29,emoji:'🥤'},
   ],
   rewards:[
     {id:1,name:'Frites Offertes',points:150,emoji:'🍟',color:'#FFD700'},
     {id:2,name:'Boisson Gratuite',points:200,emoji:'🥤',color:'#FF6B35'},
     {id:3,name:'Burger Gratuit',points:500,emoji:'🍔',color:'#E63946'},
   ],
   challenges:[
     {id:'c1',name:'Commander 3 burgers',target:3,progress:1,pts:150,emoji:'🍔'},
     {id:'c2',name:'Streak 5 jours',target:5,progress:2,pts:300,emoji:'🔥'},
   ]
  },
  {id:2,name:'Café Lumière',emoji:'☕',category:'Café & Brunch',color:'#8B6914',
   points:180,streak:1,orders:3,redeemedRewards:[],cart:[],earnedBadges:['first_order'],
   menu:[
     {id:1,name:'Espresso',price:2.50,points:25,emoji:'☕'},
     {id:2,name:'Cappuccino',price:4.20,points:42,emoji:'🥛'},
     {id:3,name:'Croissant',price:2.80,points:28,emoji:'🥐'},
     {id:4,name:'Avocado Toast',price:9.50,points:95,emoji:'🥑'},
   ],
   rewards:[
     {id:1,name:'Café offert',points:100,emoji:'☕',color:'#8B6914'},
     {id:2,name:'Brunch complet',points:400,emoji:'🍳',color:'#E8A020'},
   ],
   challenges:[
     {id:'c1',name:'5 cafés cette semaine',target:5,progress:2,pts:100,emoji:'☕'},
   ]
  },
];

const BADGES=[
  {id:'first_order',name:'1ère visite',emoji:'🌟'},
  {id:'big_fan',name:'Grand fan',emoji:'❤️'},
  {id:'streak_3',name:'Régulier',emoji:'🔥'},
  {id:'gold_member',name:'Gold',emoji:'🥇'},
];

function getTier(p){return TIERS.find(t=>p>=t.min&&p<=t.max)||TIERS[0];}

export default function App() {
  const [shops, setShops] = useState(JSON.parse(JSON.stringify(SHOPS)));
  const [activeShopId, setActiveShopId] = useState(1);
  const [view, setView] = useState('card');
  const [user, setUser] = useState(null);
  const [authTab, setAuthTab] = useState('login');
  const [loginEmail, setLoginEmail] = useState('demo@fidelity.fr');
  const [loginPwd, setLoginPwd] = useState('demo123');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPwd, setRegPwd] = useState('');
  const [notif, setNotif] = useState(null);
  const [shopDropdown, setShopDropdown] = useState(false);

  const shop = shops.find(s => s.id === activeShopId);
  const tier = getTier(shop.points);
  const nextTier = TIERS[TIERS.indexOf(tier)+1];
  const progress = nextTier ? Math.round(((shop.points-tier.min)/(nextTier.min-tier.min))*100) : 100;

  const showNotif = (msg, type='success') => {
    setNotif({msg,type});
    setTimeout(()=>setNotif(null), 2500);
  };

  const updateShop = (id, fn) => {
    setShops(prev => prev.map(s => s.id===id ? fn({...s}) : s));
  };

  const doLogin = () => {
    if(!loginEmail||!loginPwd){showNotif('Remplissez tous les champs','error');return;}
    const name = loginEmail.split('@')[0];
    setUser({name:name.charAt(0).toUpperCase()+name.slice(1), email:loginEmail});
    showNotif('Bienvenue !');
  };

  const doRegister = () => {
    if(!regName||!regEmail||!regPwd){showNotif('Remplissez tous les champs','error');return;}
    if(regPwd.length<6){showNotif('Mot de passe trop court','error');return;}
    setUser({name:regName, email:regEmail});
    showNotif('Compte créé !');
  };

  const addToCart = (itemId) => {
    updateShop(activeShopId, s => {
      const ex = s.cart.find(c=>c.id===itemId);
      if(ex) ex.qty++;
      else { const item=s.menu.find(m=>m.id===itemId); if(item) s.cart.push({...item,qty:1}); }
      return s;
    });
  };

  const checkout = () => {
    updateShop(activeShopId, s => {
      if(!s.cart.length) return s;
      const earned = s.cart.reduce((a,i)=>a+i.points*i.qty,0);
      s.points += earned; s.orders++; s.streak++; s.cart=[];
      if(s.orders>=5 && !s.earnedBadges.includes('big_fan')) s.earnedBadges.push('big_fan');
      if(s.streak>=3 && !s.earnedBadges.includes('streak_3')) s.earnedBadges.push('streak_3');
      showNotif('+'+earned+' pts gagnés !');
      return s;
    });
  };

  const redeemReward = (rewardId) => {
    updateShop(activeShopId, s => {
      const r = s.rewards.find(x=>x.id===rewardId);
      if(!r||s.points<r.points||s.redeemedRewards.includes(r.id)){showNotif('Pas assez de points !','error');return s;}
      s.points -= r.points; s.redeemedRewards.push(r.id);
      showNotif('🎉 '+r.name+' débloqué !');
      return s;
    });
  };

  const cartPts = shop.cart.reduce((a,i)=>a+i.points*i.qty,0);
  const cartTotal = shop.cart.reduce((a,i)=>a+i.price*i.qty,0);

  if(!user) return (
    <div style={{minHeight:'100vh',background:'#08080A',display:'flex',flexDirection:'column',justifyContent:'center',padding:'32px 24px',fontFamily:'sans-serif',color:'#fff',maxWidth:430,margin:'0 auto'}}>
      {notif && <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',background:notif.type==='error'?'#E63946':'#2DC653',color:'#fff',padding:'10px 22px',borderRadius:100,fontSize:13,fontWeight:700,zIndex:100}}>{notif.msg}</div>}
      <div style={{fontSize:32,fontWeight:800,marginBottom:4}}>Fidelity<span style={{color:'#FF3D00'}}>.</span></div>
      <div style={{fontSize:13,color:'#666',marginBottom:40}}>La carte de fidélité pour tous vos commerces</div>
      <div style={{display:'flex',background:'#1A1A1F',borderRadius:12,padding:4,marginBottom:24}}>
        {['login','register'].map((t,i)=>(
          <button key={t} onClick={()=>setAuthTab(t)} style={{flex:1,padding:10,border:'none',background:authTab===t?'#08080A':'none',color:authTab===t?'#fff':'#666',fontFamily:'sans-serif',fontSize:13,fontWeight:600,cursor:'pointer',borderRadius:9,transition:'all .2s'}}>{i===0?'Connexion':'Inscription'}</button>
        ))}
      </div>
      {authTab==='login' ? (
        <>
          <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,color:'#666',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>Email</label><input value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} style={{width:'100%',background:'#1A1A1F',border:'1px solid #2A2A32',color:'#fff',padding:'13px 14px',borderRadius:12,fontSize:14,fontFamily:'sans-serif',outline:'none'}} /></div>
          <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,color:'#666',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>Mot de passe</label><input type="password" value={loginPwd} onChange={e=>setLoginPwd(e.target.value)} style={{width:'100%',background:'#1A1A1F',border:'1px solid #2A2A32',color:'#fff',padding:'13px 14px',borderRadius:12,fontSize:14,fontFamily:'sans-serif',outline:'none'}} /></div>
          <button onClick={doLogin} style={{width:'100%',padding:15,background:'#FF3D00',border:'none',color:'#fff',fontFamily:'sans-serif',fontSize:15,fontWeight:700,borderRadius:14,cursor:'pointer',marginBottom:12}}>Se connecter</button>
          <button onClick={()=>setUser({name:'Marie',email:'demo@fidelity.fr'})} style={{width:'100%',padding:12,background:'#1A1A1F',border:'1px solid #2A2A32',color:'#666',fontFamily:'sans-serif',fontSize:13,borderRadius:12,cursor:'pointer'}}>Essayer sans compte →</button>
        </>
      ) : (
        <>
          <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,color:'#666',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>Prénom</label><input value={regName} onChange={e=>setRegName(e.target.value)} style={{width:'100%',background:'#1A1A1F',border:'1px solid #2A2A32',color:'#fff',padding:'13px 14px',borderRadius:12,fontSize:14,fontFamily:'sans-serif',outline:'none'}} /></div>
          <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,color:'#666',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>Email</label><input value={regEmail} onChange={e=>setRegEmail(e.target.value)} style={{width:'100%',background:'#1A1A1F',border:'1px solid #2A2A32',color:'#fff',padding:'13px 14px',borderRadius:12,fontSize:14,fontFamily:'sans-serif',outline:'none'}} /></div>
          <div style={{marginBottom:14}}><label style={{display:'block',fontSize:11,color:'#666',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>Mot de passe</label><input type="password" value={regPwd} onChange={e=>setRegPwd(e.target.value)} style={{width:'100%',background:'#1A1A1F',border:'1px solid #2A2A32',color:'#fff',padding:'13px 14px',borderRadius:12,fontSize:14,fontFamily:'sans-serif',outline:'none'}} /></div>
          <button onClick={doRegister} style={{width:'100%',padding:15,background:'#FF3D00',border:'none',color:'#fff',fontFamily:'sans-serif',fontSize:15,fontWeight:700,borderRadius:14,cursor:'pointer'}}>Créer mon compte</button>
        </>
      )}
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#08080A',color:'#fff',fontFamily:'sans-serif',maxWidth:430,margin:'0 auto',paddingBottom:80}}>
      {notif && <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',background:notif.type==='error'?'#E63946':'#2DC653',color:'#fff',padding:'10px 22px',borderRadius:100,fontSize:13,fontWeight:700,zIndex:100,whiteSpace:'nowrap'}}>{notif.msg}</div>}

      <div style={{padding:'16px 20px 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontSize:18,fontWeight:800}}>Fidelity<span style={{color:'#FF3D00'}}>.</span></div>
        <div onClick={()=>setUser(null)} style={{display:'flex',alignItems:'center',gap:8,background:'#1A1A1F',borderRadius:100,padding:'5px 12px 5px 5px',cursor:'pointer'}}>
          <div style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,61,0,.2)',color:'#FF3D00',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700}}>{user.name.charAt(0)}</div>
          <span style={{fontSize:12,fontWeight:600}}>{user.name.split(' ')[0]}</span>
        </div>
      </div>

      {view==='card' && (
        <div style={{padding:'0 20px'}}>
          <div style={{position:'relative',marginTop:16}}>
            <div onClick={()=>setShopDropdown(!shopDropdown)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#1A1A1F',border:'1px solid #2A2A32',borderRadius:14,padding:'12px 16px',cursor:'pointer'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:24}}>{shop.emoji}</span>
                <div><div style={{fontSize:15,fontWeight:700}}>{shop.name}</div><div style={{fontSize:11,color:'#666'}}>{shop.category} · {shop.points} pts</div></div>
              </div>
              <span style={{color:'#666'}}>{shopDropdown?'▴':'▾'}</span>
            </div>
            {shopDropdown && (
              <div style={{position:'absolute',top:'calc(100% + 8px)',left:0,right:0,background:'#1A1A1F',border:'1px solid #2A2A32',borderRadius:14,zIndex:50,overflow:'hidden'}}>
                {shops.map(s=>(
                  <div key={s.id} onClick={()=>{setActiveShopId(s.id);setShopDropdown(false);}} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 16px',cursor:'pointer',borderBottom:'1px solid #2A2A32'}}>
                    <span style={{fontSize:22}}>{s.emoji}</span>
                    <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{s.name}</div><div style={{fontSize:11,color:'#666'}}>{s.category}</div></div>
                    <span style={{fontSize:12,color:'#FF3D00',fontWeight:700}}>{s.points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{marginTop:16,borderRadius:22,padding:22,background:'linear-gradient(135deg,#14141A,#201810,#14141A)',border:'1px solid #2A2A32'}}>
            <div style={{fontSize:10,color:'#666',letterSpacing:3}}>TOTAL POINTS</div>
            <div style={{fontSize:52,fontWeight:800,lineHeight:1,fontFamily:'monospace',background:'linear-gradient(90deg,#FF3D00,#FFD700)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{shop.points.toLocaleString()}</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14}}>
              <div style={{borderRadius:100,padding:'4px 12px',fontSize:11,fontWeight:700,letterSpacing:1,background:tier.bg}}>{tier.name}</div>
              <span style={{fontSize:11,color:'#FF3D00',fontWeight:700}}>{nextTier?(nextTier.min-shop.points)+' pts → '+nextTier.name:'Max !'}</span>
            </div>
            <div style={{background:'#222',borderRadius:100,height:5,overflow:'hidden',marginTop:8}}><div style={{width:progress+'%',height:'100%',background:'linear-gradient(90deg,#FF3D00,#FFD700)',borderRadius:100,transition:'width 1s'}}></div></div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,margin:'12px 0'}}>
            {[{v:shop.orders,l:'Commandes'},{v:(shop.streak>0?'🔥':'')+shop.streak,l:'Streak'},{v:shop.earnedBadges.length,l:'Badges'}].map((s,i)=>(
              <div key={i} style={{background:'#1A1A1F',borderRadius:14,padding:'14px 10px',border:'1px solid #2A2A32',textAlign:'center'}}>
                <div style={{fontSize:24,fontWeight:800}}>{s.v}</div>
                <div style={{fontSize:10,color:'#666',textTransform:'uppercase',letterSpacing:1,marginTop:3}}>{s.l}</div>
              </div>
            ))}
          </div>

          <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#666',textTransform:'uppercase',margin:'16px 0 10px'}}>Badges</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
            {BADGES.map(b=>{
              const earned=shop.earnedBadges.includes(b.id);
              return <div key={b.id} style={{background:'#1A1A1F',border:'1px solid '+(earned?'rgba(255,215,0,.3)':'#2A2A32'),borderRadius:30,padding:'6px 12px',fontSize:12,opacity:earned?1:.3}}>{b.emoji} {b.name}</div>;
            })}
          </div>

          <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#666',textTransform:'uppercase',margin:'16px 0 10px'}}>Défis</div>
          {shop.challenges.map(ch=>{
            const pct=Math.min(100,Math.round((ch.progress/ch.target)*100));
            return <div key={ch.id} style={{background:'#1A1A1F',borderRadius:14,padding:14,border:'1px solid #2A2A32',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,fontWeight:600}}>{ch.emoji} {ch.name}</span><span style={{fontSize:12,color:'#FF3D00',fontWeight:700}}>+{ch.pts}pts</span></div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:11,color:'#666'}}>{ch.progress}/{ch.target}</span><span style={{fontSize:11,color:'#888'}}>{pct}%</span></div>
              <div style={{background:'#222',borderRadius:100,height:4,overflow:'hidden'}}><div style={{width:pct+'%',height:'100%',background:'linear-gradient(90deg,#FF3D00,#FFD700)',borderRadius:100}}></div></div>
            </div>;
          })}
        </div>
      )}

      {view==='order' && (
        <div style={{padding:'0 20px'}}>
          <div style={{marginTop:20,fontSize:20,fontWeight:800}}>Commander — {shop.name}</div>
          <div style={{fontSize:12,color:'#FF3D00',marginTop:4}}>+{cartPts} pts dans le panier</div>
          <div style={{marginTop:14}}>
            {shop.menu.map(item=>{
              const inCart=shop.cart.find(c=>c.id===item.id);
              return <div key={item.id} onClick={()=>addToCart(item.id)} style={{background:'#1A1A1F',borderRadius:14,padding:'13px 15px',border:'1px solid #2A2A32',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,cursor:'pointer'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontSize:28}}>{item.emoji}</span>
                  <div><div style={{fontSize:13,fontWeight:700}}>{item.name}</div><div style={{fontSize:11,color:'#FF3D00',fontWeight:600}}>+{item.points} pts</div></div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'monospace',fontSize:14,fontWeight:700}}>{item.price.toFixed(2)}€</div>
                  {inCart&&<div style={{background:'#FF3D00',borderRadius:100,width:20,height:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,marginLeft:'auto',marginTop:4}}>{inCart.qty}</div>}
                </div>
              </div>;
            })}
          </div>
          {shop.cart.length>0&&(
            <button onClick={checkout} style={{position:'sticky',bottom:90,width:'100%',padding:'15px 18px',background:'#FF3D00',border:'none',color:'#fff',fontFamily:'sans-serif',fontSize:14,fontWeight:700,borderRadius:16,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>Valider ({shop.cart.reduce((a,i)=>a+i.qty,0)})</span>
              <span style={{fontFamily:'monospace'}}>{cartTotal.toFixed(2)}€ · +{cartPts}pts</span>
            </button>
          )}
        </div>
      )}

      {view==='rewards' && (
        <div style={{padding:'0 20px'}}>
          <div style={{marginTop:20,fontSize:20,fontWeight:800}}>Récompenses</div>
          <div style={{fontSize:12,color:'#888',marginTop:4}}>Vous avez <span style={{color:'#FFD700',fontWeight:700}}>{shop.points} pts</span></div>
          <div style={{marginTop:16}}>
            {shop.rewards.map(r=>{
              const can=shop.points>=r.points;
              const done=shop.redeemedRewards.includes(r.id);
              const pct=Math.min(100,Math.round((shop.points/r.points)*100));
              return <div key={r.id} style={{background:'#1A1A1F',border:'1px solid '+(done?'rgba(45,198,83,.25)':can?r.color+'35':'#2A2A32'),borderRadius:18,padding:'16px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:50,height:50,borderRadius:13,background:r.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>{r.emoji}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700}}>{r.name}</div>
                    <div style={{fontSize:12,color:r.color,fontWeight:700,fontFamily:'monospace',marginTop:2}}>{r.points} pts</div>
                    <div style={{marginTop:6,background:'#1E1E1E',borderRadius:100,height:4,width:90,overflow:'hidden'}}><div style={{width:pct+'%',height:'100%',background:r.color,borderRadius:100}}></div></div>
                  </div>
                </div>
                <button onClick={()=>redeemReward(r.id)} style={{background:done?'#2DC653':can?'#FF3D00':'#222',border:'none',color:'#fff',padding:'9px 14px',borderRadius:10,fontSize:12,fontWeight:700,cursor:can&&!done?'pointer':'default',opacity:!can&&!done?.4:1,fontFamily:'sans-serif'}}>
                  {done?'✓ OK':can?'Utiliser':'Bientôt'}
                </button>
              </div>;
            })}
          </div>
        </div>
      )}

      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:430,background:'rgba(8,8,10,.95)',borderTop:'1px solid #2A2A32',display:'flex',justifyContent:'space-around',padding:'10px 0 16px'}}>
        {[{id:'card',icon:'💳',label:'Carte'},{id:'order',icon:'🛍️',label:'Commander'},{id:'rewards',icon:'🎁',label:'Cadeaux'}].map(tab=>(
          <button key={tab.id} onClick={()=>setView(tab.id)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,color:view===tab.id?'#FF3D00':'#444',transition:'color .2s'}}>
            <span style={{fontSize:20}}>{tab.icon}</span>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',fontFamily:'sans-serif'}}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}