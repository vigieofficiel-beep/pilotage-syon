import { useState, useRef } from 'react'

const STORAGE_KEY = 'pilotage_calendrier'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const PLT_COLORS = {
  linkedin:'#0077B5', facebook:'#1877F2', discord:'#5865F2',
  youtube:'#FF0000', twitter:'#1DA1F2', instagram:'#E1306C',
  tiktok:'#000000', threads:'#101010',
}
const PLT_ICONS = {
  linkedin:'💼', facebook:'👥', discord:'🎮', youtube:'🎬',
  twitter:'🐦', instagram:'📸', tiktok:'🎵', threads:'🧵',
}

function loadData() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : { posts: [] } }
  catch { return { posts: [] } }
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  let day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Lundi = 0
}

const iS = {
  width:'100%', padding:'9px 12px', borderRadius:8,
  background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
  color:'#EDE8DB', fontSize:12, outline:'none',
  fontFamily:"'Nunito Sans',sans-serif", boxSizing:'border-box'
}

export default function PageCalendrier({ project, projects }) {
  const today  = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [data,  setData]  = useState(loadData)
  const [showForm,  setShowForm]  = useState(null) // date string 'YYYY-MM-DD'
  const [editPost,  setEditPost]  = useState(null)
  const [dragPost,  setDragPost]  = useState(null)
  const [form, setForm] = useState({ titre:'', plateforme:'linkedin', heure:'09:00', contenu:'', projet: project.id, statut:'planifie' })

  const save = (d) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); setData(d) }

  const posts = data.posts || []

  const daysInMonth   = getDaysInMonth(year, month)
  const firstDayOfMonth = getFirstDayOfMonth(year, month)

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y=>y-1) } else setMonth(m=>m-1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y=>y+1) } else setMonth(m=>m+1) }

  const dateStr = (day) => `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`

  const postsForDay = (day) => posts.filter(p => p.date === dateStr(day))

  const openForm = (day) => {
    setShowForm(dateStr(day))
    setEditPost(null)
    setForm({ titre:'', plateforme: project.reseaux?.[0]||'linkedin', heure:'09:00', contenu:'', projet:project.id, statut:'planifie' })
  }

  const openEdit = (post) => {
    setShowForm(post.date)
    setEditPost(post)
    setForm({ ...post })
  }

  const sauvegarder = () => {
    if (!form.titre.trim()) return
    let updated
    if (editPost) {
      updated = posts.map(p => p.id === editPost.id ? { ...form, id: editPost.id } : p)
    } else {
      updated = [...posts, { ...form, id: Date.now(), date: showForm }]
    }
    save({ ...data, posts: updated })
    setShowForm(null)
    setEditPost(null)
  }

  const supprimer = (id) => {
    save({ ...data, posts: posts.filter(p => p.id !== id) })
    setShowForm(null)
    setEditPost(null)
  }

  const toggleStatut = (id) => {
    const updated = posts.map(p => p.id === id ? {
      ...p, statut: p.statut === 'publie' ? 'planifie' : 'publie'
    } : p)
    save({ ...data, posts: updated })
  }

  // Drag & Drop
  const onDragStart = (post) => setDragPost(post)
  const onDragOver  = (e) => e.preventDefault()
  const onDrop      = (day) => {
    if (!dragPost) return
    const updated = posts.map(p => p.id === dragPost.id ? { ...p, date: dateStr(day) } : p)
    save({ ...data, posts: updated })
    setDragPost(null)
  }

  const proj = (id) => projects?.find(p => p.id === id) || project
  const statColor = (s) => s === 'publie' ? '#5BC78A' : s === 'brouillon' ? '#D4A853' : '#5BA3C7'

  // Stats du mois
  const postsMonth = posts.filter(p => p.date.startsWith(`${year}-${String(month+1).padStart(2,'0')}`))
  const publies    = postsMonth.filter(p => p.statut === 'publie').length
  const planifies  = postsMonth.filter(p => p.statut === 'planifie').length

  const platformsDisponibles = project.reseaux || ['linkedin','facebook','discord','youtube']

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:16 }}>

      {/* FORMULAIRE */}
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>{if(e.target===e.currentTarget){setShowForm(null);setEditPost(null)}}}>
          <div style={{background:'#1a1d24',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:'100%',maxWidth:500,padding:28,maxHeight:'90vh',overflowY:'auto'}}>
            <h3 style={{fontSize:15,fontWeight:700,color:'#EDE8DB',marginBottom:4}}>
              {editPost ? '✏️ Modifier le post' : '➕ Planifier un post'}
            </h3>
            <p style={{fontSize:12,color:'rgba(237,232,219,0.4)',marginBottom:18}}>📅 {showForm}</p>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Titre *</label>
              <input value={form.titre} onChange={e=>setForm(p=>({...p,titre:e.target.value}))} placeholder="Ex: Post lancement nouvelle feature" style={iS}/>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Plateforme</label>
                <select value={form.plateforme} onChange={e=>setForm(p=>({...p,plateforme:e.target.value}))} style={{...iS,cursor:'pointer'}}>
                  {platformsDisponibles.map(plt => (
                    <option key={plt} value={plt}>{PLT_ICONS[plt]||'📱'} {plt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Heure</label>
                <input type="time" value={form.heure} onChange={e=>setForm(p=>({...p,heure:e.target.value}))} style={iS}/>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div>
                <label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Projet</label>
                <select value={form.projet} onChange={e=>setForm(p=>({...p,projet:e.target.value}))} style={{...iS,cursor:'pointer'}}>
                  {(projects||[project]).map(pr => (
                    <option key={pr.id} value={pr.id}>{pr.emoji} {pr.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Statut</label>
                <select value={form.statut} onChange={e=>setForm(p=>({...p,statut:e.target.value}))} style={{...iS,cursor:'pointer'}}>
                  <option value="planifie">📅 Planifié</option>
                  <option value="brouillon">📝 Brouillon</option>
                  <option value="publie">✅ Publié</option>
                </select>
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'rgba(237,232,219,0.4)',display:'block',marginBottom:4}}>Contenu / Notes</label>
              <textarea value={form.contenu} onChange={e=>setForm(p=>({...p,contenu:e.target.value}))}
                placeholder="Colle ici ton post ou tes notes de rédaction..." rows={4} style={{...iS,resize:'vertical'}}/>
            </div>

            <div style={{display:'flex',gap:8}}>
              <button onClick={sauvegarder} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:project.color,color:'#0D1B2A',fontSize:13,fontWeight:800,cursor:'pointer'}}>💾 Sauvegarder</button>
              {editPost && <button onClick={()=>supprimer(editPost.id)} style={{padding:'10px 14px',borderRadius:10,border:'1px solid rgba(199,91,78,0.3)',background:'rgba(199,91,78,0.1)',color:'#C75B4E',fontSize:12,cursor:'pointer'}}>🗑️</button>}
              <button onClick={()=>{setShowForm(null);setEditPost(null)}} style={{padding:'10px 16px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(237,232,219,0.5)',fontSize:12,cursor:'pointer'}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={prevMonth} style={{padding:'6px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(237,232,219,0.6)',fontSize:14,cursor:'pointer'}}>‹</button>
            <h3 style={{fontSize:18,fontWeight:700,color:'#EDE8DB',margin:0,minWidth:160,textAlign:'center'}}>
              {MOIS[month]} {year}
            </h3>
            <button onClick={nextMonth} style={{padding:'6px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(237,232,219,0.6)',fontSize:14,cursor:'pointer'}}>›</button>
          </div>
          <button onClick={()=>{ setYear(today.getFullYear()); setMonth(today.getMonth()) }}
            style={{padding:'5px 12px',borderRadius:8,border:`1px solid ${project.color}40`,background:`${project.color}10`,color:project.color,fontSize:11,fontWeight:700,cursor:'pointer'}}>
            Aujourd'hui
          </button>
        </div>

        {/* Stats */}
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div style={{padding:'6px 14px',borderRadius:10,background:'rgba(91,199,138,0.1)',border:'1px solid rgba(91,199,138,0.2)'}}>
            <span style={{fontSize:11,color:'#5BC78A',fontWeight:700}}>✅ {publies} publié{publies>1?'s':''}</span>
          </div>
          <div style={{padding:'6px 14px',borderRadius:10,background:'rgba(91,163,199,0.1)',border:'1px solid rgba(91,163,199,0.2)'}}>
            <span style={{fontSize:11,color:'#5BA3C7',fontWeight:700}}>📅 {planifies} planifié{planifies>1?'s':''}</span>
          </div>
        </div>
      </div>

      {/* GRILLE CALENDRIER */}
      <div style={{flex:1,overflowY:'auto'}}>
        {/* Jours de la semaine */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:4}}>
          {JOURS.map(j => (
            <div key={j} style={{textAlign:'center',fontSize:11,fontWeight:700,color:'rgba(237,232,219,0.3)',padding:'6px 0',textTransform:'uppercase',letterSpacing:'0.06em'}}>
              {j}
            </div>
          ))}
        </div>

        {/* Cases du calendrier */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
          {/* Cases vides avant le 1er */}
          {Array.from({length:firstDayOfMonth}).map((_,i) => (
            <div key={`empty-${i}`} style={{minHeight:90,borderRadius:10,background:'rgba(255,255,255,0.01)',border:'1px solid rgba(255,255,255,0.04)'}}/>
          ))}

          {/* Cases des jours */}
          {Array.from({length:daysInMonth}).map((_,i) => {
            const day     = i + 1
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            const dayPosts = postsForDay(day)

            return (
              <div key={day}
                onDragOver={onDragOver}
                onDrop={()=>onDrop(day)}
                style={{
                  minHeight:90, borderRadius:10, padding:'6px 8px',
                  background: isToday ? `${project.color}10` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isToday ? project.color+'40' : 'rgba(255,255,255,0.06)'}`,
                  cursor:'pointer', transition:'all 0.15s',
                  display:'flex', flexDirection:'column', gap:3
                }}
                onMouseEnter={e=>{if(!isToday)e.currentTarget.style.background='rgba(255,255,255,0.04)'}}
                onMouseLeave={e=>{if(!isToday)e.currentTarget.style.background='rgba(255,255,255,0.02)'}}
                onClick={()=>openForm(day)}
              >
                {/* Numéro du jour */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                  <span style={{
                    fontSize:12, fontWeight: isToday ? 800 : 500,
                    color: isToday ? project.color : 'rgba(237,232,219,0.5)',
                    width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center',
                    borderRadius:'50%', background: isToday ? `${project.color}20` : 'transparent'
                  }}>{day}</span>
                  {dayPosts.length > 0 && (
                    <span style={{fontSize:9,color:'rgba(237,232,219,0.3)',fontWeight:600}}>{dayPosts.length}</span>
                  )}
                </div>

                {/* Posts du jour */}
                {dayPosts.slice(0,3).map(p => {
                  const pr = proj(p.projet)
                  return (
                    <div key={p.id}
                      draggable
                      onDragStart={(e)=>{ e.stopPropagation(); onDragStart(p) }}
                      onClick={(e)=>{ e.stopPropagation(); openEdit(p) }}
                      style={{
                        padding:'3px 6px', borderRadius:5, fontSize:10, fontWeight:600,
                        background: p.statut==='publie' ? 'rgba(91,199,138,0.15)' : `${pr.color}20`,
                        border: `1px solid ${p.statut==='publie' ? 'rgba(91,199,138,0.3)' : pr.color+'40'}`,
                        color: p.statut==='publie' ? '#5BC78A' : pr.color,
                        cursor:'grab', display:'flex', alignItems:'center', gap:4, lineHeight:1.3,
                        overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'
                      }}>
                      <span style={{fontSize:9}}>{PLT_ICONS[p.plateforme]||'📱'}</span>
                      <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.titre}</span>
                    </div>
                  )
                })}
                {dayPosts.length > 3 && (
                  <span style={{fontSize:9,color:'rgba(237,232,219,0.3)',paddingLeft:4}}>+{dayPosts.length-3} autres</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Légende */}
        <div style={{display:'flex',gap:16,marginTop:16,padding:'10px 0',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <p style={{fontSize:11,color:'rgba(237,232,219,0.3)',margin:0}}>💡 Clique sur un jour pour ajouter · Glisse un post pour le déplacer · Clique sur un post pour modifier</p>
        </div>
      </div>
    </div>
  )
}
