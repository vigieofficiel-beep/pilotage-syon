import { useState, useEffect } from 'react'

const STORAGE_KEY = 'pilotage_finances'

const DEFAULT_DATA = {
  mrr: 0,
  objectif_mrr: 5000,
  depenses: [],
  revenus: [],
}

function loadData() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? { ...DEFAULT_DATA, ...JSON.parse(s) } : DEFAULT_DATA }
  catch { return DEFAULT_DATA }
}

const iS = { width:'100%', padding:'9px 12px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#EDE8DB', fontSize:12, outline:'none', fontFamily:"'Nunito Sans',sans-serif", boxSizing:'border-box' }

export default function PageFinances({ project }) {
  const [data,       setData]       = useState(loadData)
  const [tab,        setTab]        = useState('dashboard')
  const [showForm,   setShowForm]   = useState(null) // 'depense' | 'revenu'
  const [form,       setForm]       = useState({ label:'', montant:'', date: new Date().toISOString().split('T')[0], categorie:'outil', recurrent:false })

  const save = (d) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); setData(d) }

  const totalDepenses = data.depenses.reduce((a, d) => a + parseFloat(d.montant||0), 0)
  const totalRevenus  = data.revenus.reduce((a, r) => a + parseFloat(r.montant||0), 0)
  const marge         = totalRevenus - totalDepenses
  const pctObjectif   = data.objectif_mrr > 0 ? Math.min((data.mrr / data.objectif_mrr) * 100, 100) : 0

  const ajouterEntree = () => {
    if (!form.label.trim() || !form.montant) return
    const entry = { id: Date.now(), ...form, montant: parseFloat(form.montant) }
    if (showForm === 'depense') {
      save({ ...data, depenses: [entry, ...data.depenses] })
    } else {
      save({ ...data, revenus: [entry, ...data.revenus] })
    }
    setShowForm(null)
    setForm({ label:'', montant:'', date: new Date().toISOString().split('T')[0], categorie:'outil', recurrent:false })
  }

  const supprimer = (type, id) => {
    if (type === 'depense') save({ ...data, depenses: data.depenses.filter(d => d.id !== id) })
    else save({ ...data, revenus: data.revenus.filter(r => r.id !== id) })
  }

  const mColor = marge >= 0 ? '#5BC78A' : '#C75B4E'

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:16 }}>

      {/* FORMULAIRE */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => { if(e.target===e.currentTarget) setShowForm(null) }}>
          <div style={{ background:'#1a1d24', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, width:'100%', maxWidth:420, padding:24 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#EDE8DB', marginBottom:16 }}>
              {showForm === 'depense' ? '💸 Nouvelle dépense' : '💰 Nouveau revenu'}
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input value={form.label} onChange={e => setForm(p=>({...p,label:e.target.value}))} placeholder="Libellé (ex: Vercel, Stripe MRR...)" style={iS}/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <input type="number" value={form.montant} onChange={e => setForm(p=>({...p,montant:e.target.value}))} placeholder="Montant (€)" style={iS}/>
                <input type="date" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} style={iS}/>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="checkbox" id="recurrent" checked={form.recurrent} onChange={e => setForm(p=>({...p,recurrent:e.target.checked}))} style={{ cursor:'pointer' }}/>
                <label htmlFor="recurrent" style={{ fontSize:12, color:'rgba(237,232,219,0.5)', cursor:'pointer' }}>Récurrent (mensuel)</label>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <button onClick={ajouterEntree}
                  style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:project.color, color:'#0D1B2A', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                  ✅ Ajouter
                </button>
                <button onClick={() => setShowForm(null)}
                  style={{ padding:'10px 16px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(237,232,219,0.5)', fontSize:12, cursor:'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, flexShrink:0 }}>
        {[
          { label:'MRR', value:`${data.mrr}€`, color:'#5BC78A', sub:'Revenus récurrents' },
          { label:'Dépenses', value:`${totalDepenses.toFixed(0)}€`, color:'#C75B4E', sub:`${data.depenses.length} entrées` },
          { label:'Revenus', value:`${totalRevenus.toFixed(0)}€`, color:'#5BA3C7', sub:`${data.revenus.length} entrées` },
          { label:'Marge', value:`${marge.toFixed(0)}€`, color:mColor, sub: marge >= 0 ? '✅ Positif' : '⚠️ Négatif' },
        ].map(k => (
          <div key={k.label} style={{ padding:'14px 16px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize:10, color:'rgba(237,232,219,0.4)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</p>
            <p style={{ fontSize:22, fontWeight:800, color:k.color, margin:'0 0 2px' }}>{k.value}</p>
            <p style={{ fontSize:10, color:'rgba(237,232,219,0.3)', margin:0 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* OBJECTIF MRR */}
      <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 18px', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#EDE8DB' }}>🎯 Objectif MRR</span>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:12, color:project.color, fontWeight:700 }}>{pctObjectif.toFixed(0)}%</span>
            <span style={{ fontSize:11, color:'rgba(237,232,219,0.3)' }}>{data.mrr}€ / {data.objectif_mrr}€</span>
          </div>
        </div>
        <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3 }}>
          <div style={{ width:`${pctObjectif}%`, height:'100%', background:`linear-gradient(90deg,${project.color},#5BC78A)`, borderRadius:3, transition:'width 0.3s' }}/>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:10 }}>
          <div>
            <label style={{ fontSize:10, color:'rgba(237,232,219,0.3)', display:'block', marginBottom:4 }}>MRR actuel (€)</label>
            <input type="number" value={data.mrr} onChange={e => save({...data, mrr: parseFloat(e.target.value)||0})}
              style={{ ...iS, width:120, padding:'6px 10px' }}/>
          </div>
          <div>
            <label style={{ fontSize:10, color:'rgba(237,232,219,0.3)', display:'block', marginBottom:4 }}>Objectif (€)</label>
            <input type="number" value={data.objectif_mrr} onChange={e => save({...data, objectif_mrr: parseFloat(e.target.value)||0})}
              style={{ ...iS, width:120, padding:'6px 10px' }}/>
          </div>
        </div>
      </div>

      {/* TABS + LISTES */}
      <div style={{ display:'flex', gap:8, flexShrink:0 }}>
        {[{ id:'depenses', label:'💸 Dépenses' },{ id:'revenus', label:'💰 Revenus' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'7px 16px', borderRadius:20, border:`1px solid ${tab===t.id?project.color:'rgba(255,255,255,0.1)'}`, background:tab===t.id?`${project.color}20`:'transparent', color:tab===t.id?project.color:'rgba(237,232,219,0.5)', fontSize:12, fontWeight:tab===t.id?700:400, cursor:'pointer' }}>
            {t.label}
          </button>
        ))}
        <button onClick={() => setShowForm(tab === 'depenses' ? 'depense' : 'revenu')}
          style={{ marginLeft:'auto', padding:'7px 16px', borderRadius:20, border:'none', background:project.color, color:'#0D1B2A', fontSize:12, fontWeight:800, cursor:'pointer' }}>
          ➕ Ajouter
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
        {(tab === 'depenses' ? data.depenses : data.revenus).length === 0
          ? <div style={{ padding:32, textAlign:'center', color:'rgba(237,232,219,0.3)', fontSize:13 }}>
              Aucune entrée. Clique sur ➕ pour ajouter.
            </div>
          : (tab === 'depenses' ? data.depenses : data.revenus).map(e => (
            <div key={e.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10 }}>
              <div style={{ flex:1 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#EDE8DB' }}>{e.label}</span>
                {e.recurrent && <span style={{ fontSize:10, color:project.color, background:`${project.color}15`, padding:'1px 6px', borderRadius:8, marginLeft:8 }}>↻ Récurrent</span>}
                <p style={{ fontSize:11, color:'rgba(237,232,219,0.3)', margin:'2px 0 0' }}>{e.date}</p>
              </div>
              <span style={{ fontSize:16, fontWeight:800, color: tab==='depenses'?'#C75B4E':'#5BC78A' }}>
                {tab==='depenses'?'-':'+'}€{parseFloat(e.montant).toFixed(2)}
              </span>
              <button onClick={() => supprimer(tab==='depenses'?'depense':'revenu', e.id)}
                style={{ background:'transparent', border:'none', cursor:'pointer', color:'rgba(237,232,219,0.2)', fontSize:14, padding:4 }}
                onMouseEnter={ev => ev.currentTarget.style.color='#C75B4E'}
                onMouseLeave={ev => ev.currentTarget.style.color='rgba(237,232,219,0.2)'}>
                🗑️
              </button>
            </div>
          ))
        }
      </div>
    </div>
  )
}
