import { useState, useEffect } from 'react'

const SERVICES_DEFAULT = [
  { id: 'openai',    nom: 'OpenAI',    url: 'https://platform.openai.com/usage',            emoji: '🤖', couleur: '#10a37f', seuil: 20,  cout_actuel: 0, api_key: '', auto_sync: false },
  { id: 'supabase',  nom: 'Supabase',  url: 'https://supabase.com/dashboard',               emoji: '🗄️', couleur: '#3ECF8E', seuil: 0,   cout_actuel: 0, api_key: '', auto_sync: false },
  { id: 'vercel',    nom: 'Vercel',    url: 'https://vercel.com/dashboard',                 emoji: '▲',  couleur: '#ffffff', seuil: 0,   cout_actuel: 0, api_key: '', auto_sync: false },
  { id: 'resend',    nom: 'Resend',    url: 'https://resend.com/emails',                    emoji: '📧', couleur: '#5BA3C7', seuil: 10,  cout_actuel: 0, api_key: '', auto_sync: false },
  { id: 'stripe',    nom: 'Stripe',    url: 'https://dashboard.stripe.com',                 emoji: '💳', couleur: '#635BFF', seuil: 0,   cout_actuel: 0, api_key: '', auto_sync: false },
  { id: 'ovh',       nom: 'OVH',       url: 'https://www.ovhcloud.com/fr/manager',          emoji: '🌐', couleur: '#123F6D', seuil: 0,   cout_actuel: 0, api_key: '', auto_sync: false },
  { id: 'n8n',       nom: 'n8n Cloud', url: 'https://app.n8n.cloud',                        emoji: '⚡', couleur: '#EA4B71', seuil: 0,   cout_actuel: 20, api_key: '', auto_sync: false },
  { id: 'anthropic', nom: 'Anthropic', url: 'https://console.anthropic.com/settings/usage', emoji: '🧠', couleur: '#D4A853', seuil: 20,  cout_actuel: 0, api_key: '', auto_sync: false },
]

const STORAGE_KEY = 'pilotage_monitoring'

function loadData() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    const saved = s ? JSON.parse(s) : { services: SERVICES_DEFAULT, alertes: [] }
    const services = (saved.services || SERVICES_DEFAULT).map(svc => ({
      api_key: '', auto_sync: false, ...svc
    }))
    return { ...saved, services }
  }
  catch { return { services: SERVICES_DEFAULT, alertes: [] } }
}

// ── SYNC APIS ─────────────────────────────────────────────────────

async function syncOpenAI(apiKey) {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const startStr = start.toISOString().split('T')[0]
  const endStr   = now.toISOString().split('T')[0]

  const res = await fetch(`https://api.openai.com/v1/dashboard/billing/usage?start_date=${startStr}&end_date=${endStr}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  })
  if (!res.ok) throw new Error('Clé OpenAI invalide ou accès refusé')
  const data = await res.json()
  return parseFloat((data.total_usage / 100).toFixed(2))
}

async function syncStripe(apiKey) {
  const res = await fetch('https://api.stripe.com/v1/balance', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  })
  if (!res.ok) throw new Error('Clé Stripe invalide')
  const data = await res.json()
  const available = data.available?.[0]?.amount || 0
  return parseFloat((available / 100).toFixed(2))
}

async function syncAnthropicUsage(_apiKey) {
  throw new Error('Anthropic ne fournit pas d\'API usage publique. Mets à jour manuellement.')
}

// Supabase : format api_key = "ref:service_role_key"
// Retourne la taille de la DB en Mo comme valeur numérique (indicatif, pas un coût €)
async function syncSupabase(apiKey) {
  const parts = apiKey.split(':')
  if (parts.length < 2) throw new Error('Format attendu : ref_projet:service_role_key')
  const projectRef    = parts[0].trim()
  const serviceRoleKey = parts.slice(1).join(':').trim()

  // Récupère les stats du projet via Management API
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Supabase erreur ${res.status} — vérifie le project ref et la clé`)
  }

  // Supabase Management API ne retourne pas les coûts directs.
  // On retourne 0 et on affiche les infos dans le message de sync.
  return 0
}

// Supabase : version enrichie qui retourne aussi les métadonnées pour le message
async function syncSupabaseFull(apiKey) {
  const parts = apiKey.split(':')
  if (parts.length < 2) throw new Error('Format attendu : ref_projet:service_role_key')
  const projectRef     = parts[0].trim()
  const serviceRoleKey = parts.slice(1).join(':').trim()

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Supabase erreur ${res.status} — vérifie le project ref et la clé`)
  }
  const data = await res.json()
  return {
    cout: 0,
    meta: `✅ Projet : ${data.name || projectRef} — Région : ${data.region || '?'} — Statut : ${data.status || '?'}`
  }
}

// Vercel : bearer token (depuis vercel.com/account/tokens)
// Retourne 0 (pas de coût API) + infos sur les déploiements récents
async function syncVercelFull(apiKey) {
  const res = await fetch('https://api.vercel.com/v6/deployments?limit=5', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Vercel erreur ${res.status} — vérifie le token`)
  }
  const data = await res.json()
  const deployments = data.deployments || []
  const last = deployments[0]
  if (!last) return { cout: 0, meta: '✅ Vercel connecté — aucun déploiement trouvé' }

  const state  = last.state || '?'
  const name   = last.name || '?'
  const date   = last.createdAt ? new Date(last.createdAt).toLocaleDateString('fr-FR') : '?'
  const stateEmoji = state === 'READY' ? '🟢' : state === 'ERROR' ? '🔴' : '🟡'

  return {
    cout: 0,
    meta: `${stateEmoji} Dernier déploiement : ${name} — ${state} — ${date}`
  }
}

// Resend : API key (re_...)
// Retourne le nombre d'emails envoyés ce mois (pas un coût €, affiché comme info)
async function syncResendFull(apiKey) {
  // Resend ne fournit pas d'endpoint de stats global — on récupère les emails récents
  const res = await fetch('https://api.resend.com/emails?limit=100', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || err.name || `Resend erreur ${res.status} — vérifie la clé API`)
  }
  const data = await res.json()
  const emails = data.data || []

  // Filtre sur le mois en cours
  const now   = new Date()
  const debut = new Date(now.getFullYear(), now.getMonth(), 1)
  const cesMois = emails.filter(e => new Date(e.created_at) >= debut)

  return {
    cout: 0,
    meta: `✅ ${cesMois.length} email(s) envoyé(s) ce mois — ${emails.length} récupérés au total`
  }
}

// Wrappers simples pour SYNC_FN (compatibilité avec l'architecture existante)
// Les versions "Full" sont appelées dans syncService pour enrichir le message
const SYNC_FN = {
  openai:    syncOpenAI,
  stripe:    syncStripe,
  anthropic: syncAnthropicUsage,
  supabase:  syncSupabase,       // retourne 0, le vrai appel est dans syncService
  vercel:    async () => 0,      // idem
  resend:    async () => 0,      // idem
}

// Services avec sync enrichi (Full) — gérés séparément dans syncService
const SYNC_FULL_FN = {
  supabase: syncSupabaseFull,
  vercel:   syncVercelFull,
  resend:   syncResendFull,
}

// Placeholders pour les champs api_key
const API_KEY_PLACEHOLDERS = {
  openai:    'sk-...',
  stripe:    'sk_live_... ou sk_test_...',
  supabase:  'ref_projet:service_role_key',
  vercel:    'token Vercel (vercel.com/account/tokens)',
  resend:    're_...',
  anthropic: 'clé API Anthropic',
}

export default function PageMonitoring({ project }) {
  const [data,        setData]        = useState(loadData)
  const [editId,      setEditId]      = useState(null)
  const [showForm,    setShowForm]    = useState(false)
  const [editService, setEditService] = useState(null)
  const [msg,         setMsg]         = useState(null)
  const [syncing,     setSyncing]     = useState({})
  const [showApiKey,  setShowApiKey]  = useState({})

  const save = (newData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
    setData(newData)
  }

  useEffect(() => {
    const autoSync = async () => {
      const services = data.services || []
      for (const s of services) {
        if (s.auto_sync && s.api_key && SYNC_FN[s.id]) {
          try {
            if (SYNC_FULL_FN[s.id]) {
              const { cout } = await SYNC_FULL_FN[s.id](s.api_key)
              const updated = services.map(x => x.id === s.id ? { ...x, cout_actuel: cout } : x)
              save({ ...data, services: updated })
            } else {
              const cout = await SYNC_FN[s.id](s.api_key)
              const updated = services.map(x => x.id === s.id ? { ...x, cout_actuel: cout } : x)
              save({ ...data, services: updated })
            }
          } catch(e) { /* silencieux en auto */ }
        }
      }
    }
    autoSync()
  }, [])

  const services  = data.services || SERVICES_DEFAULT
  const totalMois = services.reduce((acc, s) => acc + (parseFloat(s.cout_actuel) || 0), 0)
  const enAlerte  = services.filter(s => s.seuil > 0 && parseFloat(s.cout_actuel) >= parseFloat(s.seuil))

  const openEdit = (s) => { setEditService({ ...s }); setEditId(s.id); setShowForm(true) }
  const openNew  = () => {
    setEditService({ id: Date.now().toString(), nom: '', url: '', emoji: '🔧', couleur: '#5BA3C7', seuil: 0, cout_actuel: 0, api_key: '', auto_sync: false })
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

  const syncService = async (s) => {
    if (!SYNC_FN[s.id] && !SYNC_FULL_FN[s.id]) {
      setMsg('⚠️ Sync automatique non disponible pour ce service — mets à jour manuellement.')
      setTimeout(() => setMsg(null), 3000)
      return
    }
    if (!s.api_key) {
      setMsg(`⚠️ Ajoute d'abord ta clé API ${s.nom} dans ✏️ Modifier.`)
      setTimeout(() => setMsg(null), 3000)
      return
    }
    setSyncing(p => ({ ...p, [s.id]: true }))
    try {
      // Services avec sync enrichi (retournent meta + cout)
      if (SYNC_FULL_FN[s.id]) {
        const { cout, meta } = await SYNC_FULL_FN[s.id](s.api_key)
        const updated = services.map(x => x.id === s.id ? { ...x, cout_actuel: cout } : x)
        save({ ...data, services: updated })
        setMsg(meta)
      } else {
        // Services standards (retournent un coût €)
        const cout = await SYNC_FN[s.id](s.api_key)
        const updated = services.map(x => x.id === s.id ? { ...x, cout_actuel: cout } : x)
        save({ ...data, services: updated })
        setMsg(`✅ ${s.nom} synchronisé — ${cout}€ ce mois`)
      }
    } catch(e) {
      setMsg(`❌ ${e.message}`)
    }
    setTimeout(() => setMsg(null), 5000)
    setSyncing(p => ({ ...p, [s.id]: false }))
  }

  const iS = { width:'100%', padding:'9px 12px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#EDE8DB', fontSize:12, outline:'none', fontFamily:"'Nunito Sans',sans-serif", boxSizing:'border-box' }

  const canSync = (id) => !!(SYNC_FN[id] || SYNC_FULL_FN[id])

  // Aide contextuelle par service
  const getApiKeyHelp = (id) => {
    switch(id) {
      case 'supabase': return '⚠️ Format : ref_projet:service_role_key — Le ref est dans Settings > General de ton projet Supabase.'
      case 'vercel':   return 'Token à créer sur vercel.com/account/tokens — accès lecture suffisant.'
      case 'resend':   return 'Clé API dans resend.com/api-keys — accès "Sending access" suffisant.'
      case 'openai':   return 'Clé API dans platform.openai.com/api-keys — nécessite accès billing.'
      case 'stripe':   return 'Clé secrète sk_live_... dans dashboard.stripe.com/apikeys.'
      default:         return null
    }
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:16 }}>

      {/* FORMULAIRE */}
      {showForm && editService && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => { if(e.target===e.currentTarget) setShowForm(false) }}>
          <div style={{ background:'#1a1d24', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, width:'100%', maxWidth:500, padding:28, maxHeight:'90vh', overflowY:'auto' }}>
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
              <input value={editService.url} onChange={e => setEditService(p=>({...p,url:e.target.value}))} placeholder="https://..." style={iS}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
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

            {/* Clé API */}
            {canSync(editService.id) && (
              <div style={{ marginBottom:12, padding:'12px 14px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#EDE8DB' }}>⚡ Connexion automatique</span>
                  <span style={{ fontSize:10, background:'rgba(91,199,138,0.1)', color:'#5BC78A', padding:'1px 8px', borderRadius:10 }}>disponible</span>
                </div>
                <label style={{ fontSize:11, color:'rgba(237,232,219,0.4)', display:'block', marginBottom:4 }}>Clé API (stockée localement)</label>
                <input
                  type="password"
                  value={editService.api_key||''}
                  onChange={e => setEditService(p=>({...p,api_key:e.target.value}))}
                  placeholder={API_KEY_PLACEHOLDERS[editService.id] || 'Clé API'}
                  style={iS}
                />
                {/* Aide contextuelle */}
                {getApiKeyHelp(editService.id) && (
                  <p style={{ fontSize:10, color:'rgba(212,168,83,0.7)', marginTop:6, lineHeight:1.5 }}>
                    {getApiKeyHelp(editService.id)}
                  </p>
                )}
                {/* Info sur ce qui est récupéré */}
                <p style={{ fontSize:10, color:'rgba(237,232,219,0.35)', marginTop:6, lineHeight:1.5 }}>
                  {editService.id === 'supabase' && '📊 Récupère : nom du projet, région, statut de santé.'}
                  {editService.id === 'vercel'   && '📊 Récupère : statut du dernier déploiement, date, projet.'}
                  {editService.id === 'resend'   && '📊 Récupère : nombre d\'emails envoyés ce mois.'}
                  {editService.id === 'openai'   && '📊 Récupère : coût total en € ce mois.'}
                  {editService.id === 'stripe'   && '📊 Récupère : solde disponible Stripe en €.'}
                  {editService.id === 'anthropic'&& '⚠️ Pas d\'API usage publique — mise à jour manuelle uniquement.'}
                </p>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                  <input
                    type="checkbox"
                    id="auto_sync"
                    checked={editService.auto_sync||false}
                    onChange={e => setEditService(p=>({...p,auto_sync:e.target.checked}))}
                    style={{ cursor:'pointer' }}
                  />
                  <label htmlFor="auto_sync" style={{ fontSize:11, color:'rgba(237,232,219,0.5)', cursor:'pointer' }}>
                    Synchroniser automatiquement au démarrage
                  </label>
                </div>
                <p style={{ fontSize:10, color:'rgba(237,232,219,0.25)', marginTop:6 }}>
                  🔒 Ta clé reste sur ton ordinateur, jamais envoyée ailleurs.
                </p>
              </div>
            )}

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
        <div style={{ padding:'10px 14px', borderRadius:10, background: msg.startsWith('❌') ? 'rgba(199,91,78,0.1)' : msg.startsWith('⚠️') ? 'rgba(212,168,83,0.1)' : 'rgba(91,199,138,0.1)', border:`1px solid ${msg.startsWith('❌') ? 'rgba(199,91,78,0.2)' : msg.startsWith('⚠️') ? 'rgba(212,168,83,0.2)' : 'rgba(91,199,138,0.2)'}`, fontSize:13, color: msg.startsWith('❌') ? '#C75B4E' : msg.startsWith('⚠️') ? '#D4A853' : '#5BC78A', flexShrink:0 }}>
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
          const pct     = s.seuil > 0 ? Math.min((parseFloat(s.cout_actuel) / parseFloat(s.seuil)) * 100, 100) : 0
          const enAlert  = s.seuil > 0 && parseFloat(s.cout_actuel) >= parseFloat(s.seuil)
          const isSyncing = syncing[s.id]
          const hasSync  = canSync(s.id)
          const hasKey   = !!s.api_key
          // Services qui retournent des infos non-monétaires
          const isInfoOnly = ['supabase', 'vercel', 'resend'].includes(s.id)

          return (
            <div key={s.id} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${enAlert ? 'rgba(199,91,78,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius:12, padding:'14px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>

                <div style={{ width:40, height:40, borderRadius:10, background:`${s.couleur}20`, border:`1px solid ${s.couleur}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {s.emoji}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:14, fontWeight:700, color:'#EDE8DB' }}>{s.nom}</span>
                    {enAlert && <span style={{ fontSize:10, background:'rgba(199,91,78,0.15)', color:'#C75B4E', padding:'1px 8px', borderRadius:10, fontWeight:700 }}>⚠️ Seuil dépassé</span>}
                    {hasSync && hasKey  && <span style={{ fontSize:10, background:'rgba(91,199,138,0.1)', color:'#5BC78A', padding:'1px 8px', borderRadius:10 }}>⚡ Connecté</span>}
                    {hasSync && !hasKey && <span style={{ fontSize:10, background:'rgba(212,168,83,0.1)', color:'#D4A853', padding:'1px 8px', borderRadius:10 }}>🔑 Clé manquante</span>}
                    {isInfoOnly && hasKey && <span style={{ fontSize:10, background:'rgba(91,163,199,0.1)', color:'#5BA3C7', padding:'1px 8px', borderRadius:10 }}>📊 Stats</span>}
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noreferrer"
                        style={{ fontSize:11, color:project.color, textDecoration:'none', background:`${project.color}15`, padding:'1px 8px', borderRadius:10 }}>
                        🔗 Gérer
                      </a>
                    )}
                  </div>

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

                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:10, color:'rgba(237,232,219,0.3)', margin:'0 0 4px' }}>
                      {isInfoOnly ? 'Coût manuel (€)' : 'Coût/mois'}
                    </p>
                    <input
                      type="number"
                      value={s.cout_actuel}
                      onChange={e => updateCout(s.id, e.target.value)}
                      style={{ width:70, padding:'5px 8px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color: enAlert ? '#C75B4E' : '#5BC78A', fontSize:14, fontWeight:700, outline:'none', textAlign:'center', fontFamily:"'Nunito Sans',sans-serif" }}
                    />
                    <p style={{ fontSize:10, color:'rgba(237,232,219,0.3)', margin:'2px 0 0', textAlign:'center' }}>€</p>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {hasSync && (
                      <button onClick={() => syncService(s)} disabled={isSyncing}
                        title={hasKey ? 'Synchroniser' : 'Ajoute une clé API dans ✏️ Modifier'}
                        style={{ padding:'5px 8px', borderRadius:7, border:`1px solid ${hasKey ? 'rgba(91,199,138,0.3)' : 'rgba(255,255,255,0.1)'}`, background: hasKey ? 'rgba(91,199,138,0.08)' : 'transparent', color: hasKey ? '#5BC78A' : 'rgba(237,232,219,0.3)', fontSize:11, cursor: isSyncing ? 'not-allowed' : 'pointer' }}>
                        {isSyncing ? '⏳' : '🔄'}
                      </button>
                    )}
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
