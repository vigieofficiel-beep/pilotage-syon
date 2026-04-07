import { useState, useRef } from 'react'

const STORAGE_KEY = 'pilotage_prospects'

const COLONNES = [
  { id:'prospect',  label:'Prospect',  color:'#5BA3C7', emoji:'👁️' },
  { id:'contact',   label:'Contact',   color:'#D4A853', emoji:'📞' },
  { id:'devis',     label:'Devis',     color:'#A85BC7', emoji:'📄' },
  { id:'client',    label:'Client',    color:'#5BC78A', emoji:'✅' },
  { id:'perdu',     label:'Perdu',     color:'#C75B4E', emoji:'❌' },
]

const SOURCES = ['LinkedIn','Facebook','Bouche à oreille','Site web','Discord','Email','Autre']

function loadData() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : { prospects: [] } }
  catch { return { prospects: [] } }
}

// ── IMPORT CSV ────────────────────────────────────────────────────
// Colonnes supportées (insensible à la casse et aux espaces) :
// nom, email, entreprise, source, budget, notes
// La colonne "nom" est obligatoire — les autres sont optionnelles.

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(/[;,]/).map(v => v.trim().replace(/^["']|["']$/g, ''))
    const row = {}
    headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
    if (row.nom && row.nom.trim()) rows.push(row)
  }
  return rows
}

function csvToProspects(rows, existingNoms) {
  const today = new Date().toISOString().split('T')[0]
  const nouveaux = []

  for (const row of rows) {
    const nom = row.nom?.trim()
    if (!nom) continue
    // Ignore les doublons (comparaison insensible à la casse)
    if (existingNoms.has(nom.toLowerCase())) continue

    // Normalise la source
    const sourceRaw = row.source?.trim() || ''
    const source = SOURCES.find(s => s.toLowerCase() === sourceRaw.toLowerCase()) || 'Autre'

    nouveaux.push({
      id:         Date.now() + Math.random(),
      nom,
      email:      row.email?.trim()      || '',
      entreprise: row.entreprise?.trim() || '',
      source,
      budget:     row.budget?.trim()     || '',
      notes:      row.notes?.trim()      || '',
      colonne:    'prospect',
      date:       today,
    })
  }
  return nouveaux
}

const iS = { width:'100%', padding:'9px 12px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#EDE8DB', fontSize:12, outline:'none', fontFamily:"'Nunito Sans',sans-serif", boxSizing:'border-box' }

export default function PageProspects({ project }) {
  const [data,     setData]     = useState(loadData)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [scoring,  setScoring]  = useState(null)
  const [view,     setView]     = useState('kanban')
  const [msg,      setMsg]      = useState(null)
  const [form, setForm] = useState({ nom:'', email:'', entreprise:'', source:'LinkedIn', colonne:'prospect', budget:'', notes:'', date: new Date().toISOString().split('T')[0] })

  const csvRef = useRef(null)

  const save = (d) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); setData(d) }
  const prospects = data.prospects || []

  const showMsg = (text, duration = 3500) => {
    setMsg(text)
    setTimeout(() => setMsg(null), duration)
  }

  // ── IMPORT CSV ─────────────────────────────────────────────────
  const handleCSV = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const rows = parseCSV(text)
      if (rows.length === 0) {
        showMsg('❌ Fichier vide ou format invalide. Colonnes attendues : nom, email, entreprise, source, budget, notes')
        return
      }
      const existingNoms = new Set(prospects.map(p => p.nom.toLowerCase()))
      const nouveaux = csvToProspects(rows, existingNoms)
      const doublons = rows.length - nouveaux.length

      if (nouveaux.length === 0) {
        showMsg(`⚠️ ${rows.length} ligne(s) ignorée(s) — tous les noms existent déjà.`)
        return
      }

      save({ ...data, prospects: [...nouveaux, ...prospects] })
      showMsg(`✅ ${nouveaux.length} prospect(s) importé(s)${doublons > 0 ? ` · ${doublons} doublon(s) ignoré(s)` : ''}`)
    }
    reader.readAsText(file, 'UTF-8')
    // Reset input pour permettre re-import du même fichier
    e.target.value = ''
  }

  // ── SCORING IA ─────────────────────────────────────────────────
  const scorerProspect = async (p) => {
    setScoring(p.id)
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`},
        body: JSON.stringify({
          model:'gpt-4o', max_tokens:200, response_format:{type:'json_object'},
          messages:[{role:'user',content:`Score ce prospect pour ${project.label}.
Nom: ${p.nom}, Entreprise: ${p.entreprise||'NC'}, Source: ${p.source}, Budget: ${p.budget||'NC'}, Statut: ${p.colonne}, Notes: ${p.notes||'NC'}
JSON: {"score":7,"potentiel":"haut|moyen|faible","resume":"...","action_suivante":"..."}`}]
        })
      })
      const data2 = await res.json()
      const result = JSON.parse(data2.choices[0].message.content)
      const updated = prospects.map(x => x.id===p.id ? {...x,...result} : x)
      save({...data, prospects:updated})
    } catch(e) { console.error(e) }
    setScoring(null)
  }

  const ajouter = () => {
    if (!form.nom.trim()) return
    save({...data, prospects:[{id:Date.now(),...form},...prospects]})
    setShowForm(false)
    setForm({nom:'',email:'',entreprise:'',source:'LinkedIn',colonne:'prospect',budget:'',notes:'',date:new Date().toISOString().split('T')[0]})
  }

  const moveColonne = (id, colonne) => save({...data, prospects:prospects.map(p=>p.id===id?{...p,colonne}:p)})
  const supprimer   = (id) => { if(!confirm('Supprimer ?')) return; save({...data,prospects:prospects.filter(p=>p.id!==id)}); if(selected?.id===id)setSelected(null) }

  const scoreColor = (s) => !s?'rgba(237,232,219,0.3)':s>=7?'#5BC78A':s>=4?'#D4A853':'#C75B4E'
  const potColor   = (p) => p==='haut'?'#5BC78A':p==='moyen'?'#D4A853':'#C75B4E'

  const totalBudget = prospects.filter(p=>p.colonne!=='perdu'&&p.budget).reduce((a,p)=>a+parseFloat(p.budget||0),0)

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',gap:16}}>

      {/* INPUT CSV CACHÉ */}
      <input ref={csvRef} type="file" accept=".csv" onChange={handleCSV} style={{display:'none'}}/>

      {/* FORMULAIRE */}
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>{if(e.target===e.currentTarget)setShowForm(false)}}>
          <div style={{background:'#1a1d24',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:'100%',maxWidth:480,padding:28,maxHeight:'90vh',overflowY:'auto'}}>
            <h3 style={{fontSize:15,fontWeight:700,color:'#EDE8DB',marginBottom:20}}>🎯 Nouveau prospect</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Nom *</label><input value={form.nom} onChange={e=>setForm(p=>({...p,nom:e.target.value}))} placeholder="Prénom Nom" style={iS}/></div>
              <div><label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Email</label><input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="email@..." style={iS}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Entreprise</label><input value={form.entreprise} onChange={e=>setForm(p=>({...p,entreprise:e.target.value}))} placeholder="Nom société" style={iS}/></div>
              <div><label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Budget (€)</label><input type="number" value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))} placeholder="0" style={iS}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Source</label>
                <select value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))} style={{...iS,cursor:'pointer'}}>
                  {SOURCES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Statut</label>
                <select value={form.colonne} onChange={e=>setForm(p=>({...p,colonne:e.target.value}))} style={{...iS,cursor:'pointer'}}>
                  {COLONNES.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:14}}><label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3} placeholder="Informations utiles..." style={{...iS,resize:'vertical'}}/></div>

            {/* Info format CSV */}
            <div style={{marginBottom:14,padding:'10px 12px',background:'rgba(91,163,199,0.06)',border:'1px solid rgba(91,163,199,0.15)',borderRadius:8}}>
              <p style={{fontSize:10,color:'rgba(91,163,199,0.8)',margin:0,lineHeight:1.6}}>
                💡 Tu peux aussi importer plusieurs prospects d'un coup via <strong>📥 Import CSV</strong> dans l'en-tête.<br/>
                Colonnes supportées : <code style={{background:'rgba(255,255,255,0.06)',padding:'1px 4px',borderRadius:4}}>nom, email, entreprise, source, budget, notes</code>
              </p>
            </div>

            <div style={{display:'flex',gap:8}}>
              <button onClick={ajouter} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:project.color,color:'#0D1B2A',fontSize:13,fontWeight:800,cursor:'pointer'}}>✅ Ajouter</button>
              <button onClick={()=>setShowForm(false)} style={{padding:'10px 16px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(237,232,219,0.5)',fontSize:12,cursor:'pointer'}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* DÉTAIL PROSPECT */}
      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
          <div style={{background:'#1a1d24',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:'100%',maxWidth:480,padding:28}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{fontSize:16,fontWeight:700,color:'#EDE8DB',margin:0}}>{selected.nom}</h3>
              <button onClick={()=>setSelected(null)} style={{background:'rgba(255,255,255,0.06)',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer',color:'rgba(237,232,219,0.6)',fontSize:12}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {selected.entreprise && <p style={{fontSize:13,color:'rgba(237,232,219,0.6)',margin:0}}>🏢 {selected.entreprise}</p>}
              {selected.email && <p style={{fontSize:13,color:'rgba(237,232,219,0.6)',margin:0}}>📧 {selected.email}</p>}
              {selected.budget && <p style={{fontSize:13,color:'#5BC78A',margin:0,fontWeight:700}}>💰 Budget : {selected.budget}€</p>}
              <p style={{fontSize:12,color:'rgba(237,232,219,0.4)',margin:0}}>📍 Source : {selected.source} · {selected.date}</p>
              {selected.notes && <p style={{fontSize:12,color:'rgba(237,232,219,0.5)',margin:0,fontStyle:'italic'}}>{selected.notes}</p>}
            </div>
            {selected.score && (
              <div style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:14,marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:700,color:'#EDE8DB'}}>Score IA</span>
                  <span style={{fontSize:20,fontWeight:900,color:scoreColor(selected.score)}}>{selected.score}/10</span>
                </div>
                {selected.potentiel && <span style={{fontSize:11,color:potColor(selected.potentiel),background:`${potColor(selected.potentiel)}15`,padding:'2px 10px',borderRadius:10,fontWeight:700}}>Potentiel {selected.potentiel}</span>}
                {selected.resume && <p style={{fontSize:11,color:'rgba(237,232,219,0.5)',margin:'8px 0 4px'}}>{selected.resume}</p>}
                {selected.action_suivante && <p style={{fontSize:11,color:project.color,margin:0,fontWeight:700}}>→ {selected.action_suivante}</p>}
              </div>
            )}
            <div style={{display:'flex',gap:8}}>
              <select value={selected.colonne} onChange={e=>{moveColonne(selected.id,e.target.value);setSelected(p=>({...p,colonne:e.target.value}))}}
                style={{flex:1,padding:'8px',borderRadius:9,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(237,232,219,0.7)',fontSize:12,cursor:'pointer',outline:'none'}}>
                {COLONNES.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
              <button onClick={()=>scorerProspect(selected)} disabled={!!scoring}
                style={{padding:'8px 14px',borderRadius:9,border:`1px solid ${project.color}`,background:'transparent',color:project.color,fontSize:12,fontWeight:700,cursor:scoring?'not-allowed':'pointer'}}>
                {scoring===selected.id?'⏳...':'🧠 Scorer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{display:'flex',gap:12,flexShrink:0,flexWrap:'wrap'}}>
        <div style={{padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',flex:1}}>
          <p style={{fontSize:10,color:'rgba(237,232,219,0.4)',margin:'0 0 4px'}}>Total prospects</p>
          <p style={{fontSize:22,fontWeight:800,color:'#EDE8DB',margin:0}}>{prospects.filter(p=>p.colonne!=='perdu').length}</p>
        </div>
        <div style={{padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',flex:1}}>
          <p style={{fontSize:10,color:'rgba(237,232,219,0.4)',margin:'0 0 4px'}}>Clients actifs</p>
          <p style={{fontSize:22,fontWeight:800,color:'#5BC78A',margin:0}}>{prospects.filter(p=>p.colonne==='client').length}</p>
        </div>
        <div style={{padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',flex:1}}>
          <p style={{fontSize:10,color:'rgba(237,232,219,0.4)',margin:'0 0 4px'}}>Pipeline €</p>
          <p style={{fontSize:22,fontWeight:800,color:'#D4A853',margin:0}}>{totalBudget.toFixed(0)}€</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={()=>csvRef.current?.click()}
            style={{padding:'10px 14px',borderRadius:10,border:'1px solid rgba(91,163,199,0.3)',background:'rgba(91,163,199,0.06)',color:'#5BA3C7',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
            📥 Import CSV
          </button>
          <button onClick={()=>setView(v=>v==='kanban'?'liste':'kanban')}
            style={{padding:'10px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(237,232,219,0.5)',fontSize:12,cursor:'pointer'}}>
            {view==='kanban'?'📋 Liste':'🗂️ Kanban'}
          </button>
          <button onClick={()=>setShowForm(true)} style={{padding:'10px 16px',borderRadius:10,border:'none',background:project.color,color:'#0D1B2A',fontSize:12,fontWeight:800,cursor:'pointer'}}>➕ Ajouter</button>
        </div>
      </div>

      {/* MESSAGE */}
      {msg && (
        <div style={{padding:'10px 14px',borderRadius:10,background:msg.startsWith('❌')?'rgba(199,91,78,0.1)':msg.startsWith('⚠️')?'rgba(212,168,83,0.1)':'rgba(91,199,138,0.1)',border:`1px solid ${msg.startsWith('❌')?'rgba(199,91,78,0.2)':msg.startsWith('⚠️')?'rgba(212,168,83,0.2)':'rgba(91,199,138,0.2)'}`,fontSize:13,color:msg.startsWith('❌')?'#C75B4E':msg.startsWith('⚠️')?'#D4A853':'#5BC78A',flexShrink:0}}>
          {msg}
        </div>
      )}

      {/* KANBAN */}
      {view==='kanban' && (
        <div style={{flex:1,overflowX:'auto',display:'flex',gap:12,paddingBottom:8}}>
          {COLONNES.map(col=>{
            const items = prospects.filter(p=>p.colonne===col.id)
            return (
              <div key={col.id} style={{width:220,flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
                <div style={{padding:'8px 12px',borderRadius:10,background:`${col.color}15`,border:`1px solid ${col.color}30`,display:'flex',alignItems:'center',gap:6}}>
                  <span>{col.emoji}</span>
                  <span style={{fontSize:12,fontWeight:700,color:col.color}}>{col.label}</span>
                  <span style={{marginLeft:'auto',fontSize:11,color:'rgba(237,232,219,0.4)'}}>{items.length}</span>
                </div>
                <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
                  {items.map(p=>(
                    <div key={p.id} onClick={()=>setSelected(p)}
                      style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 12px',cursor:'pointer',transition:'all 0.15s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}
                      onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}>
                      <p style={{fontSize:12,fontWeight:700,color:'#EDE8DB',margin:'0 0 3px'}}>{p.nom}</p>
                      {p.entreprise && <p style={{fontSize:11,color:'rgba(237,232,219,0.4)',margin:'0 0 4px'}}>{p.entreprise}</p>}
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:10,color:'rgba(237,232,219,0.3)'}}>{p.source}</span>
                        {p.score && <span style={{fontSize:11,fontWeight:800,color:scoreColor(p.score)}}>{p.score}/10</span>}
                        {p.budget && <span style={{fontSize:10,color:'#D4A853',fontWeight:700}}>{p.budget}€</span>}
                      </div>
                    </div>
                  ))}
                  {items.length===0 && <div style={{padding:16,textAlign:'center',color:'rgba(237,232,219,0.2)',fontSize:11,border:'1px dashed rgba(255,255,255,0.06)',borderRadius:10}}>Vide</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* LISTE */}
      {view==='liste' && (
        <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
          {prospects.length===0
            ?<div style={{padding:40,textAlign:'center',color:'rgba(237,232,219,0.3)',fontSize:13}}>Aucun prospect. Clique sur ➕ pour commencer.</div>
            :prospects.map(p=>{
              const col = COLONNES.find(c=>c.id===p.colonne)||COLONNES[0]
              return (
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,cursor:'pointer'}} onClick={()=>setSelected(p)}>
                  <div style={{flex:1}}>
                    <span style={{fontSize:13,fontWeight:600,color:'#EDE8DB'}}>{p.nom}</span>
                    {p.entreprise && <span style={{fontSize:11,color:'rgba(237,232,219,0.4)',marginLeft:8}}>{p.entreprise}</span>}
                  </div>
                  <span style={{fontSize:10,color:col.color,background:`${col.color}15`,padding:'2px 8px',borderRadius:8,fontWeight:700,whiteSpace:'nowrap'}}>{col.emoji} {col.label}</span>
                  {p.budget && <span style={{fontSize:12,color:'#D4A853',fontWeight:700,whiteSpace:'nowrap'}}>{p.budget}€</span>}
                  {p.score && <span style={{fontSize:12,fontWeight:800,color:scoreColor(p.score)}}>{p.score}/10</span>}
                  <button onClick={e=>{e.stopPropagation();supprimer(p.id)}} style={{background:'transparent',border:'none',cursor:'pointer',color:'rgba(237,232,219,0.2)',fontSize:14,padding:4}} onMouseEnter={e=>e.currentTarget.style.color='#C75B4E'} onMouseLeave={e=>e.currentTarget.style.color='rgba(237,232,219,0.2)'}>🗑️</button>
                </div>
              )
            })
          }
        </div>
      )}
    </div>
  )
}
