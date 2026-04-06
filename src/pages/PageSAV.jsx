import { useState } from 'react'

const STORAGE_KEY = 'pilotage_sav'

const STATUTS = [
  { id:'ouvert',    label:'Ouvert',    color:'#D4A853' },
  { id:'en_cours',  label:'En cours',  color:'#5BA3C7' },
  { id:'resolu',    label:'Résolu',    color:'#5BC78A' },
]

const SOURCES = ['WhatsApp','Email','LinkedIn','Discord','Facebook','Instagram','Autre']

function loadData() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : { messages: [] } }
  catch { return { messages: [] } }
}

const iS = { width:'100%', padding:'9px 12px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#EDE8DB', fontSize:12, outline:'none', fontFamily:"'Nunito Sans',sans-serif", boxSizing:'border-box' }

export default function PageSAV({ project }) {
  const [data,      setData]      = useState(loadData)
  const [showForm,  setShowForm]  = useState(false)
  const [filter,    setFilter]    = useState('tous')
  const [selected,  setSelected]  = useState(null)
  const [analyzing, setAnalyzing] = useState(null)
  const [response,  setResponse]  = useState('')
  const [form, setForm] = useState({ client:'', source:'WhatsApp', message:'', statut:'ouvert', date: new Date().toISOString().split('T')[0] })

  const save = (d) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); setData(d) }

  const messages = data.messages || []
  const filtered = filter === 'tous' ? messages : messages.filter(m => m.statut === filter)
  const nbPositif = messages.filter(m => m.sentiment === 'positif').length
  const nbNegatif = messages.filter(m => m.sentiment === 'negatif').length
  const nbOuvert  = messages.filter(m => m.statut === 'ouvert').length

  const analyserSentiment = async (msg) => {
    setAnalyzing(msg.id)
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`},
        body: JSON.stringify({
          model:'gpt-4o', max_tokens:200, response_format:{type:'json_object'},
          messages:[{role:'user',content:`Analyse ce message client et détecte le sentiment.
MESSAGE: "${msg.message}"
JSON: {"sentiment":"positif|negatif|neutre","score":8,"resume":"...","suggestion_reponse":"..."}`}]
        })
      })
      const data2 = await res.json()
      const result = JSON.parse(data2.choices[0].message.content)
      const updated = messages.map(m => m.id === msg.id ? { ...m, ...result } : m)
      save({ ...data, messages: updated })
    } catch(e) { console.error(e) }
    setAnalyzing(null)
  }

  const genererReponse = async (msg) => {
    setAnalyzing(`rep_${msg.id}`)
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`},
        body: JSON.stringify({
          model:'gpt-4o', max_tokens:300,
          messages:[{role:'user',content:`Tu es l'assistant SAV de ${project.label}.
Génère une réponse professionnelle, chaleureuse et utile pour ce message client.
CLIENT: ${msg.client}
MESSAGE: "${msg.message}"
${msg.sentiment?`Sentiment détecté: ${msg.sentiment}`:''}
UNIQUEMENT la réponse, sans explication.`}]
        })
      })
      const data2 = await res.json()
      setResponse(data2.choices[0].message.content.trim())
      setSelected(msg)
    } catch(e) { console.error(e) }
    setAnalyzing(null)
  }

  const ajouterMessage = () => {
    if (!form.client.trim() || !form.message.trim()) return
    const entry = { id: Date.now(), ...form }
    save({ ...data, messages: [entry, ...messages] })
    setShowForm(false)
    setForm({ client:'', source:'WhatsApp', message:'', statut:'ouvert', date: new Date().toISOString().split('T')[0] })
  }

  const updateStatut = (id, statut) => {
    save({ ...data, messages: messages.map(m => m.id === id ? { ...m, statut } : m) })
  }

  const supprimer = (id) => {
    if (!confirm('Supprimer ce message ?')) return
    save({ ...data, messages: messages.filter(m => m.id !== id) })
    if (selected?.id === id) setSelected(null)
  }

  const sentimentColor = (s) => s==='positif'?'#5BC78A':s==='negatif'?'#C75B4E':'#D4A853'
  const sentimentIcon  = (s) => s==='positif'?'😊':s==='negatif'?'😤':'😐'

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',gap:16}}>

      {/* FORMULAIRE */}
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>{if(e.target===e.currentTarget)setShowForm(false)}}>
          <div style={{background:'#1a1d24',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:'100%',maxWidth:480,padding:28}}>
            <h3 style={{fontSize:15,fontWeight:700,color:'#EDE8DB',marginBottom:20}}>💬 Nouveau message</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div>
                <label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Client *</label>
                <input value={form.client} onChange={e=>setForm(p=>({...p,client:e.target.value}))} placeholder="Nom du client" style={iS}/>
              </div>
              <div>
                <label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Source</label>
                <select value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))} style={{...iS,cursor:'pointer'}}>
                  {SOURCES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Message *</label>
              <textarea value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} placeholder="Contenu du message..." rows={4} style={{...iS,resize:'vertical'}}/>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={ajouterMessage} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:project.color,color:'#0D1B2A',fontSize:13,fontWeight:800,cursor:'pointer'}}>✅ Ajouter</button>
              <button onClick={()=>setShowForm(false)} style={{padding:'10px 16px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(237,232,219,0.5)',fontSize:12,cursor:'pointer'}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL RÉPONSE */}
      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>{if(e.target===e.currentTarget){setSelected(null);setResponse('')}}}>
          <div style={{background:'#1a1d24',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:'100%',maxWidth:520,padding:28}}>
            <h3 style={{fontSize:15,fontWeight:700,color:'#EDE8DB',marginBottom:16}}>💬 Réponse suggérée — {selected.client}</h3>
            <div style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:12,marginBottom:14,fontSize:12,color:'rgba(237,232,219,0.5)',lineHeight:1.6}}>
              <strong style={{color:'rgba(237,232,219,0.7)'}}>Message original :</strong><br/>{selected.message}
            </div>
            {response && <>
              <textarea value={response} onChange={e=>setResponse(e.target.value)} rows={6} style={{...iS,resize:'vertical',marginBottom:10,fontSize:13,lineHeight:1.6}}/>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>navigator.clipboard.writeText(response)} style={{flex:1,padding:'9px',borderRadius:9,border:'none',background:project.color,color:'#0D1B2A',fontSize:12,fontWeight:800,cursor:'pointer'}}>📋 Copier la réponse</button>
                <button onClick={()=>{setSelected(null);setResponse('')}} style={{padding:'9px 16px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(237,232,219,0.5)',fontSize:12,cursor:'pointer'}}>Fermer</button>
              </div>
            </>}
          </div>
        </div>
      )}

      {/* STATS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,flexShrink:0}}>
        {[
          {label:'Total',      value:messages.length,  color:'#EDE8DB'  },
          {label:'⚠️ Ouverts', value:nbOuvert,         color:'#D4A853'  },
          {label:'😊 Positifs',value:nbPositif,         color:'#5BC78A'  },
          {label:'😤 Négatifs',value:nbNegatif,         color:'#C75B4E'  },
        ].map(k=>(
          <div key={k.label} style={{padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <p style={{fontSize:10,color:'rgba(237,232,219,0.4)',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'0.06em'}}>{k.label}</p>
            <p style={{fontSize:24,fontWeight:800,color:k.color,margin:0}}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* FILTRES + AJOUT */}
      <div style={{display:'flex',gap:8,flexShrink:0,flexWrap:'wrap'}}>
        {['tous','ouvert','en_cours','resolu'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:'6px 14px',borderRadius:20,border:`1px solid ${filter===f?project.color:'rgba(255,255,255,0.1)'}`,background:filter===f?`${project.color}20`:'transparent',color:filter===f?project.color:'rgba(237,232,219,0.5)',fontSize:11,fontWeight:filter===f?700:400,cursor:'pointer',textTransform:'capitalize'}}>
            {f==='tous'?`Tous (${messages.length})`:f==='ouvert'?`Ouvert (${nbOuvert})`:f==='en_cours'?'En cours':'Résolu'}
          </button>
        ))}
        <button onClick={()=>setShowForm(true)} style={{marginLeft:'auto',padding:'6px 16px',borderRadius:20,border:'none',background:project.color,color:'#0D1B2A',fontSize:11,fontWeight:800,cursor:'pointer'}}>
          ➕ Nouveau message
        </button>
      </div>

      {/* LISTE MESSAGES */}
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
        {filtered.length === 0
          ? <div style={{padding:40,textAlign:'center',color:'rgba(237,232,219,0.3)',fontSize:13}}>
              {messages.length===0?<>Aucun message SAV.<br/>Clique sur ➕ pour en ajouter un.</>:'Aucun message pour ce filtre.'}
            </div>
          : filtered.map(m => {
            const statut = STATUTS.find(s=>s.id===m.statut)||STATUTS[0]
            return (
              <div key={m.id} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${m.sentiment==='negatif'?'rgba(199,91,78,0.25)':m.sentiment==='positif'?'rgba(91,199,138,0.15)':'rgba(255,255,255,0.07)'}`,borderRadius:12,padding:'14px 18px'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#EDE8DB'}}>{m.client}</span>
                      <span style={{fontSize:10,color:'rgba(237,232,219,0.4)',background:'rgba(255,255,255,0.06)',padding:'1px 8px',borderRadius:8}}>{m.source}</span>
                      <span style={{fontSize:10,color:statut.color,background:`${statut.color}15`,padding:'1px 8px',borderRadius:8,fontWeight:700}}>{statut.label}</span>
                      {m.sentiment && <span style={{fontSize:12}}>{sentimentIcon(m.sentiment)} <span style={{fontSize:10,color:sentimentColor(m.sentiment),fontWeight:700}}>{m.sentiment}</span></span>}
                      <span style={{fontSize:10,color:'rgba(237,232,219,0.3)',marginLeft:'auto'}}>{m.date}</span>
                    </div>
                    <p style={{fontSize:12,color:'rgba(237,232,219,0.65)',lineHeight:1.6,margin:'0 0 8px'}}>{m.message}</p>
                    {m.resume && <p style={{fontSize:11,color:'rgba(237,232,219,0.4)',fontStyle:'italic',margin:'0 0 8px'}}>💡 {m.resume}</p>}
                  </div>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  <select value={m.statut} onChange={e=>updateStatut(m.id,e.target.value)}
                    style={{padding:'5px 8px',borderRadius:7,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(237,232,219,0.6)',fontSize:11,cursor:'pointer',outline:'none'}}>
                    {STATUTS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <button onClick={()=>analyserSentiment(m)} disabled={!!analyzing}
                    style={{padding:'5px 10px',borderRadius:7,border:`1px solid ${project.color}40`,background:`${project.color}10`,color:project.color,fontSize:11,cursor:analyzing?'not-allowed':'pointer',fontWeight:700}}>
                    {analyzing===m.id?'⏳...':'🧠 Analyser'}
                  </button>
                  <button onClick={()=>genererReponse(m)} disabled={!!analyzing}
                    style={{padding:'5px 10px',borderRadius:7,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(237,232,219,0.5)',fontSize:11,cursor:analyzing?'not-allowed':'pointer'}}>
                    {analyzing===`rep_${m.id}`?'⏳...':'💬 Répondre'}
                  </button>
                  <button onClick={()=>navigator.clipboard.writeText(m.message)}
                    style={{padding:'5px 8px',borderRadius:7,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'rgba(237,232,219,0.3)',fontSize:11,cursor:'pointer'}}>📋</button>
                  <button onClick={()=>supprimer(m.id)}
                    style={{padding:'5px 8px',borderRadius:7,border:'1px solid rgba(199,91,78,0.2)',background:'transparent',color:'#C75B4E',fontSize:11,cursor:'pointer'}}>🗑️</button>
                </div>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}
