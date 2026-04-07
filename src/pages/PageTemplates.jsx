import { useState } from 'react'

const STORAGE_KEY = 'pilotage_templates'

const ALL_PLATFORMS = [
  { id:'linkedin',  label:'LinkedIn',    icon:'💼' },
  { id:'facebook',  label:'Facebook',    icon:'👥' },
  { id:'discord',   label:'Discord',     icon:'🎮' },
  { id:'youtube',   label:'YouTube',     icon:'🎬' },
  { id:'twitter',   label:'X / Twitter', icon:'🐦' },
  { id:'instagram', label:'Instagram',   icon:'📸' },
  { id:'tiktok',    label:'TikTok',      icon:'🎵' },
  { id:'threads',   label:'Threads',     icon:'🧵' },
]

const plt_icon = ALL_PLATFORMS.reduce((acc, p) => ({ ...acc, [p.id]: p.icon }), {})

export function loadTemplates() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : [] }
  catch { return [] }
}

export function saveTemplate({ platform, contenu, label, projectId, projectLabel }) {
  const templates = loadTemplates()
  const entry = {
    id:           Date.now(),
    platform,
    contenu,
    label:        label || `${platform} — ${new Date().toLocaleDateString('fr-FR')}`,
    projectId,
    projectLabel,
    date:         new Date().toLocaleDateString('fr-FR'),
    utilisations: 0,
  }
  const updated = [entry, ...templates]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return entry
}

const iS = { width:'100%', padding:'9px 12px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#EDE8DB', fontSize:12, outline:'none', fontFamily:"'Nunito Sans',sans-serif", boxSizing:'border-box' }

export default function PageTemplates({ project, onUseTemplate }) {
  const [templates, setTemplates] = useState(loadTemplates)
  const [filter,    setFilter]    = useState('tous')
  const [search,    setSearch]    = useState('')
  const [editId,    setEditId]    = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [msg,       setMsg]       = useState(null)

  const saveAll = (updated) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setTemplates(updated)
  }

  const showMsg = (text) => { setMsg(text); setTimeout(() => setMsg(null), 2500) }

  const supprimer = (id) => {
    if (!confirm('Supprimer ce template ?')) return
    saveAll(templates.filter(t => t.id !== id))
  }

  const renommer = (id) => {
    saveAll(templates.map(t => t.id === id ? { ...t, label: editLabel } : t))
    setEditId(null)
    setEditLabel('')
  }

  const utiliser = (t) => {
    // Incrémente le compteur d'utilisations
    saveAll(templates.map(x => x.id === t.id ? { ...x, utilisations: (x.utilisations || 0) + 1 } : x))
    navigator.clipboard.writeText(t.contenu)
    showMsg(`✅ "${t.label}" copié dans le presse-papier`)
    // Callback optionnel pour pré-remplir TabContenu
    if (onUseTemplate) onUseTemplate(t)
  }

  // Plateformes présentes dans les templates
  const platformes = [...new Set(templates.map(t => t.platform))]

  const filtered = templates.filter(t => {
    const matchPlat   = filter === 'tous' || t.platform === filter
    const matchSearch = !search || t.label.toLowerCase().includes(search.toLowerCase()) || t.contenu.toLowerCase().includes(search.toLowerCase())
    return matchPlat && matchSearch
  })

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:16 }}>

      {/* STATS */}
      <div style={{ display:'flex', gap:12, flexShrink:0, flexWrap:'wrap' }}>
        <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', flex:1 }}>
          <p style={{ fontSize:10, color:'rgba(237,232,219,0.4)', margin:'0 0 4px' }}>Templates sauvegardés</p>
          <p style={{ fontSize:22, fontWeight:800, color:'#EDE8DB', margin:0 }}>{templates.length}</p>
        </div>
        <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', flex:1 }}>
          <p style={{ fontSize:10, color:'rgba(237,232,219,0.4)', margin:'0 0 4px' }}>Plateformes couvertes</p>
          <p style={{ fontSize:22, fontWeight:800, color:project.color, margin:0 }}>{platformes.length}</p>
        </div>
        <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', flex:1 }}>
          <p style={{ fontSize:10, color:'rgba(237,232,219,0.4)', margin:'0 0 4px' }}>Utilisations totales</p>
          <p style={{ fontSize:22, fontWeight:800, color:'#5BC78A', margin:0 }}>{templates.reduce((a, t) => a + (t.utilisations || 0), 0)}</p>
        </div>
      </div>

      {/* RECHERCHE + FILTRES */}
      <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap', alignItems:'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher..."
          style={{ ...iS, width:180, flex:'none' }}
        />
        <button onClick={() => setFilter('tous')}
          style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${filter==='tous'?project.color:'rgba(255,255,255,0.1)'}`, background:filter==='tous'?`${project.color}20`:'transparent', color:filter==='tous'?project.color:'rgba(237,232,219,0.5)', fontSize:11, fontWeight:filter==='tous'?700:400, cursor:'pointer' }}>
          Tous ({templates.length})
        </button>
        {platformes.map(p => (
          <button key={p} onClick={() => setFilter(p)}
            style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${filter===p?project.color:'rgba(255,255,255,0.1)'}`, background:filter===p?`${project.color}20`:'transparent', color:filter===p?project.color:'rgba(237,232,219,0.5)', fontSize:11, fontWeight:filter===p?700:400, cursor:'pointer' }}>
            {plt_icon[p]||'📱'} {p} ({templates.filter(t=>t.platform===p).length})
          </button>
        ))}
      </div>

      {/* MESSAGE */}
      {msg && (
        <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(91,199,138,0.1)', border:'1px solid rgba(91,199,138,0.2)', fontSize:13, color:'#5BC78A', flexShrink:0 }}>
          {msg}
        </div>
      )}

      {/* LISTE */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
        {templates.length === 0 ? (
          <div style={{ padding:60, textAlign:'center', color:'rgba(237,232,219,0.3)', fontSize:13, lineHeight:2 }}>
            Aucun template sauvegardé.<br/>
            <span style={{ fontSize:12, color:'rgba(237,232,219,0.2)' }}>
              Dans l'onglet Contenu, clique sur 💾 sur un post généré pour le sauvegarder ici.
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'rgba(237,232,219,0.3)', fontSize:13 }}>
            Aucun template pour ce filtre.
          </div>
        ) : filtered.map(t => (
          <div key={t.id} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 18px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>

                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:project.color, background:`${project.color}15`, padding:'2px 8px', borderRadius:8, textTransform:'uppercase' }}>
                    {plt_icon[t.platform]||'📱'} {t.platform}
                  </span>
                  {t.projectLabel && (
                    <span style={{ fontSize:10, color:'rgba(237,232,219,0.3)', background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:8 }}>
                      {t.projectLabel}
                    </span>
                  )}
                  {t.utilisations > 0 && (
                    <span style={{ fontSize:10, color:'#5BC78A', background:'rgba(91,199,138,0.08)', padding:'2px 8px', borderRadius:8 }}>
                      ✅ Utilisé {t.utilisations}×
                    </span>
                  )}
                  <span style={{ fontSize:10, color:'rgba(237,232,219,0.25)', marginLeft:'auto' }}>{t.date}</span>
                </div>

                {/* Label éditable */}
                {editId === t.id ? (
                  <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                    <input
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      onKeyDown={e => { if(e.key==='Enter') renommer(t.id); if(e.key==='Escape') setEditId(null) }}
                      autoFocus
                      style={{ ...iS, fontSize:13, fontWeight:700 }}
                    />
                    <button onClick={() => renommer(t.id)}
                      style={{ padding:'6px 12px', borderRadius:8, border:'none', background:project.color, color:'#0D1B2A', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                      ✓
                    </button>
                    <button onClick={() => setEditId(null)}
                      style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(237,232,219,0.4)', fontSize:11, cursor:'pointer' }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize:13, fontWeight:700, color:'#EDE8DB', margin:'0 0 8px', cursor:'pointer' }}
                    onClick={() => { setEditId(t.id); setEditLabel(t.label) }}
                    title="Cliquer pour renommer">
                    {t.label} <span style={{ fontSize:10, color:'rgba(237,232,219,0.2)', fontWeight:400 }}>✏️</span>
                  </p>
                )}

                {/* Contenu */}
                <p style={{ fontSize:12, color:'rgba(237,232,219,0.6)', lineHeight:1.6, margin:0, whiteSpace:'pre-wrap', maxHeight:100, overflow:'hidden', maskImage:'linear-gradient(to bottom, black 60%, transparent 100%)' }}>
                  {t.contenu}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:6, marginTop:12, flexWrap:'wrap' }}>
              <button onClick={() => utiliser(t)}
                style={{ flex:1, padding:'7px', borderRadius:8, border:'none', background:project.color, color:'#0D1B2A', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                📋 Copier & Utiliser
              </button>
              <button onClick={() => navigator.clipboard.writeText(t.contenu).then(() => showMsg('📋 Copié !'))}
                style={{ padding:'7px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(237,232,219,0.5)', fontSize:11, cursor:'pointer' }}>
                📋
              </button>
              <button onClick={() => supprimer(t.id)}
                style={{ padding:'7px 10px', borderRadius:8, border:'1px solid rgba(199,91,78,0.2)', background:'transparent', color:'#C75B4E', fontSize:11, cursor:'pointer' }}>
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
