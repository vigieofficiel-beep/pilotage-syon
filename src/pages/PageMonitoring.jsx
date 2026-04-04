import { useState, useEffect } from 'react'

const SERVICES_DEFAULT = [
  { id: 'openai',    nom: 'OpenAI',    url: 'https://platform.openai.com/usage',           emoji: '🤖', couleur: '#10a37f', seuil: 20,  cout_actuel: 0  },
  { id: 'supabase',  nom: 'Supabase',  url: 'https://supabase.com/dashboard',              emoji: '🗄️', couleur: '#3ECF8E', seuil: 0,   cout_actuel: 0  },
  { id: 'vercel',    nom: 'Vercel',    url: 'https://vercel.com/dashboard',                emoji: '▲',  couleur: '#ffffff', seuil: 0,   cout_actuel: 0  },
  { id: 'resend',    nom: 'Resend',    url: 'https://resend.com/emails',                   emoji: '📧', couleur: '#5BA3C7', seuil: 10,  cout_actuel: 0  },
  { id: 'stripe',    nom: 'Stripe',    url: 'https://dashboard.stripe.com',                emoji: '💳', couleur: '#635BFF', seuil: 0,   cout_actuel: 0  },
  { id: 'ovh',       nom: 'OVH',       url: 'https://www.ovhcloud.com/fr/manager',         emoji: '🌐', couleur: '#123F6D', seuil: 0,   cout_actuel: 0  },
  { id: 'n8n',       nom: 'n8n Cloud', url: 'https://app.n8n.cloud',                       emoji: '⚡', couleur: '#EA4B71', seuil: 0,   cout_actuel: 20 },
  { id: 'anthropic', nom: 'Anthropic', url: 'https://console.anthropic.com/settings/usage',emoji: '🧠', couleur: '#D4A853', seuil: 20,  cout_actuel: 0  },
]

const STORAGE_KEY = 'pilotage_monitoring'

function loadData() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : { services: SERVICES_DEFAULT, alertes: [] } }
  catch { return { services: SERVICES_DEFAULT, alertes: [] } }
}

export default function PageMonitoring({ project }) {
  const [data,        setData]        = useState(loadData)
  const [editId,      setEditId]      = useState(null)
  const [showForm,    setShowForm]    = useState(false)
  const [editService, setEditService] = useState(null)
  const [msg,         setMsg]         = useState(null)

  const save = (newData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
    setData(newData)
  }

  const services  = data.services || SERVICES_DEFAULT
  const totalMois = services.reduce((acc, s) => acc + (parseFloat(s.cout_actuel) || 0), 0)
  const enAlerte  = services.filter(s => s.seuil > 0 && parseFloat(s.cout_actuel) >= parseFloat(s.seuil))

  const openEdit = (s) => { setEditService({ ...s }); setEditId(s.id); setShowForm(true) }
  const openNew  = () => {
    setEditService({ id: Date.now().toString(), nom: '', url: '', emoji: '🔧', couleur: '#5BA3C7', seuil: 0, cout_actuel: 0 })
    setEditId(null); setShowForm(true)
  }

  const sauvegarder = () => {
    if (!editService.nom.trim()) return
    let updated
    if (editId) {
      updated = services.map(s => s.id === editId ? editService : s)
    } else {
      updated = [...services, editService]
    }
    save({ ...data, services: updated })
    setShowForm(false)
    setMsg('✅ Service mis à jour !')
    setTimeout(() => setMsg(null), 2000)
  }

  const supprimer = (id) => {
    if (!confirm('Supprimer ce service ?')) return
    save({ ...data, services: services.filter(s => s.id !== id) })
  }

  const updateCout = (id, val) => {
    const updated = services.map(s => s.id === id ? { ...s, cout_actuel: val } : s)
    save({ ...data, services: updated })
  }

  const iS = { width:'100%', padding:'9px 12px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#EDE8DB', fontSize:12, outline:'none', fontFamily:"'Nunito Sans',sans-serif", boxSizing:'border-box' }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:16 }}>

      {/* FORMULAIRE */}
      {showForm && editService && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => { if(e.target===e.currentTarget) setShowForm(false) }}>
          <div style={{ background:'#1a1d24', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, width:'100%', maxWidth:480, padding:28 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#EDE8DB', marginBottom:20 }}>
              {editId ? '✏️ Modifier le service' : '➕ Nouveau service'}
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'60px 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'rgba(237,232,219,0.4)', display:'block', marginBottom:4 }}>Emoji</label>
                <input value={editService.emoji} onChange={e => setEditService(p=>({...p,emoji:e.target.value}))} style={{ ...iS, textAlign:'center', fontSize:20 }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'rgba(237,232,219,0.4)', display:'block', marginBottom:4 }}>Nom du service *</label>
                <input value={editService.nom} onChange={e => setEditService(p=>({...p,nom:e.target.value}))} placeholder="Ex: OpenAI" style={iS}/>
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'rgba(237,232,219,0.4)', display:'block', marginBottom:4 }}>🔗 URL de gestion</label>
              <input value={editService.url} onChange={e => setEditService(p=>({...p,url:e.target.value}))} placeholder="https://platform.openai.com/usage" style={iS}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:11, color:'rgba(237,232,219,0.4)', display:'block', marginBottom:4 }}>💰 Coût actuel (€)</label>
                <input type="number" value={editService.cout_actuel} onChange={e => setEditService(p=>({...p,cout_actuel:e.target.value}))} placeholder="0" style={iS}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'rgba(237,232,219,0.4)', display:'block', marginBottom:4 }}>🔔 Seuil d'alerte (€)</label>
                <input type="number" value={editService.seuil} onChange={e => setEditService(p=>({...p,seuil:e.target.value}))} placeholder="20" style={iS}/>
                <p style={{ fontSize:10, color:'rgba(237,232,219,0.3)', marginTop:4 }}>0 = pas d'alerte</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={sauvegarder}
                style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:project.color, color:'#0D1B2A', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                💾 Sauvegarder
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ padding:'10px 20px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(237,232,219,0.5)', fontSize:13, cursor:'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER STATS */}
      <div style={{ display:'flex', gap:12, flexShrink:0, flexWrap:'wrap' }}>
        <div style={{ padding:'12px 20px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', flex:1 }}>
          <p style={{ fontSize:11, color:'rgba(237,232,219,0.4)', margin:'0 0 4px' }}>Total outils / mois</p>
          <p style={{ fontSize:24, fontWeight:800, color: totalMois > 100 ? '#C75B4E' : '#5BC78A', margin:0 }}>{totalMois.toFixed(2)} €</p>
        </div>
        <div style={{ padding:'12px 20px', borderRadius:12, background: enAlerte.length > 0 ? 'rgba(199,91,78,0.08)' : 'rgba(255,255,255,0.03)', border:`1px solid ${enAlerte.length > 0 ? 'rgba(199,91,78,0.3)' : 'rgba(255,255,255,0.07)'}`, flex:1 }}>
          <p style={{ fontSize:11, color:'rgba(237,232,219,0.4)', margin:'0 0 4px' }}>⚠️ Alertes actives</p>
          <p style={{ fontSize:24, fontWeight:800, color: enAlerte.length > 0 ? '#C75B4E' : '#5BC78A', margin:0 }}>{enAlerte.length}</p>
        </div>
        <div style={{ padding:'12px 20px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', flex:1 }}>
          <p style={{ fontSize:11, color:'rgba(237,232,219,0.4)', margin:'0 0 4px' }}>Services surveillés</p>
          <p style={{ fontSize:24, fontWeight:800, color:'#EDE8DB', margin:0 }}>{services.length}</p>
        </div>
        <button onClick={openNew}
          style={{ padding:'12px 20px', borderRadius:12, border:'none', background:project.color, color:'#0D1B2A', fontSize:13, fontWeight:800, cursor:'pointer', whiteSpace:'nowrap' }}>
          ➕ Ajouter
        </button>
      </div>

      {msg && (
        <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(91,199,138,0.1)', border:'1px solid rgba(91,199,138,0.2)', fontSize:13, color:'#5BC78A', flexShrink:0 }}>
          {msg}
        </div>
      )}

      {/* ALERTES */}
      {enAlerte.length > 0 && (
        <div style={{ background:'rgba(199,91,78,0.06)', border:'1px solid rgba(199,91,78,0.2)', borderRadius:12, padding:16, flexShrink:0 }}>
          <h3 style={{ fontSize:13, fontWeight:700, color:'#C75B4E', marginBottom:10 }}>🚨 Seuils dépassés</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {enAlerte.map(s => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'rgba(199,91,78,0.08)', borderRadius:8 }}>
                <span style={{ fontSize:13, color:'#EDE8DB' }}>{s.emoji} {s.nom}</span>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:12, color:'#C75B4E', fontWeight:700 }}>{s.cout_actuel}€ / seuil {s.seuil}€</span>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer"
                      style={{ fontSize:11, color:'#5BA3C7', textDecoration:'none', background:'rgba(91,163,199,0.1)', padding:'3px 10px', borderRadius:8 }}>
                      🔗 Gérer
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LISTE SERVICES */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
        {services.map(s => {
          const pct = s.seuil > 0 ? Math.min((parseFloat(s.cout_actuel) / parseFloat(s.seuil)) * 100, 100) : 0
          const enAlert = s.seuil > 0 && parseFloat(s.cout_actuel) >= parseFloat(s.seuil)
          return (
            <div key={s.id} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${enAlert ? 'rgba(199,91,78,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius:12, padding:'14px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>

                {/* Icône */}
                <div style={{ width:40, height:40, borderRadius:10, background:`${s.couleur}20`, border:`1px solid ${s.couleur}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {s.emoji}
                </div>

                {/* Infos */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:'#EDE8DB' }}>{s.nom}</span>
                    {enAlert && <span style={{ fontSize:10, background:'rgba(199,91,78,0.15)', color:'#C75B4E', padding:'1px 8px', borderRadius:10, fontWeight:700 }}>⚠️ Seuil dépassé</span>}
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noreferrer"
                        style={{ fontSize:11, color:project.color, textDecoration:'none', background:`${project.color}15`, padding:'1px 8px', borderRadius:10 }}>
                        🔗 Gérer
                      </a>
                    )}
                  </div>

                  {/* Barre de progression si seuil défini */}
                  {s.seuil > 0 && (
                    <div style={{ marginBottom:6 }}>
                      <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background: pct >= 100 ? '#C75B4E' : pct >= 80 ? '#D4A853' : '#5BC78A', borderRadius:2, transition:'width 0.3s' }}/>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                        <span style={{ fontSize:10, color:'rgba(237,232,219,0.3)' }}>{pct.toFixed(0)}% du seuil</span>
                        <span style={{ fontSize:10, color:'rgba(237,232,219,0.3)' }}>Seuil : {s.seuil}€</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Coût éditable */}
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:10, color:'rgba(237,232,219,0.3)', margin:'0 0 4px' }}>Coût/mois</p>
                    <input
                      type="number"
                      value={s.cout_actuel}
                      onChange={e => updateCout(s.id, e.target.value)}
                      style={{ width:70, padding:'5px 8px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color: enAlert ? '#C75B4E' : '#5BC78A', fontSize:14, fontWeight:700, outline:'none', textAlign:'center', fontFamily:"'Nunito Sans',sans-serif" }}
                    />
                    <p style={{ fontSize:10, color:'rgba(237,232,219,0.3)', margin:'2px 0 0', textAlign:'center' }}>€</p>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <button onClick={() => openEdit(s)}
                      style={{ padding:'5px 8px', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(237,232,219,0.5)', fontSize:11, cursor:'pointer' }}>
                      ✏️
                    </button>
                    <button onClick={() => supprimer(s.id)}
                      style={{ padding:'5px 8px', borderRadius:7, border:'1px solid rgba(199,91,78,0.2)', background:'transparent', color:'#C75B4E', fontSize:11, cursor:'pointer' }}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
