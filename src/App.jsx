import { useState, useEffect } from 'react'
import PagePersonnalisation from './pages/PagePersonnalisation'

const PROJECTS_DEFAULT = [
  { id:'vigie',        label:'Vigie',        color:'#5BA3C7', emoji:'🛡️' },
  { id:'dimensyon',    label:'DimenSyon',    color:'#00BCD4', emoji:'🎬' },
  { id:'evolusyon',    label:'EvoluSyon',    color:'#5BC78A', emoji:'🎮' },
  { id:'alimentasyon', label:'AlimentaSyon', color:'#D4A853', emoji:'🍽️' },
]

const TABS = [
  { id:'contenu',          label:'Contenu',          emoji:'✍️' },
  { id:'monitoring',       label:'Monitoring',        emoji:'📊' },
  { id:'vault',            label:'Vault',             emoji:'🔐' },
  { id:'finances',         label:'Finances',          emoji:'💰' },
  { id:'sav',              label:'SAV',               emoji:'💬' },
  { id:'prospects',        label:'Prospects',         emoji:'🎯' },
  { id:'personnalisation', label:'Personnalisation',  emoji:'⚙️' },
]

const PLATFORMS = ['linkedin', 'facebook', 'discord', 'youtube']

function getConfig(projectId) {
  try { const s = localStorage.getItem(`pilotage_config_${projectId}`); return s ? JSON.parse(s) : {} }
  catch { return {} }
}

function buildPrompt(project, platform, idea) {
  const cfg = getConfig(project.id)
  const parts = [
    cfg.contexte_global && `Contexte : ${cfg.contexte_global}`,
    cfg.nom             && `Nom/marque : ${cfg.nom}`,
    cfg.activite        && `Activité : ${cfg.activite}`,
    cfg.audience        && `Audience : ${cfg.audience}`,
    cfg.ton             && `Ton : ${cfg.ton}`,
    cfg.mots_inclure    && `Mots à utiliser : ${cfg.mots_inclure}`,
    cfg.mots_exclure    && `Mots à éviter : ${cfg.mots_exclure}`,
    cfg.bio_publique    && `Bio publique : ${cfg.bio_publique}`,
  ].filter(Boolean).join('\n')

  const defaultRules = {
    linkedin: `Ton professionnel, flèches →, paragraphes courts, termine par "— ${cfg.nom||'Lucien Doppler'}"`,
    facebook: 'Ton accessible, quelques emojis, storytelling humain',
    discord:  'Ton communauté, **gras** pour les points clés, technique si pertinent',
    youtube:  'Script court, accroche forte en 5 secondes, structure AIDA',
  }

  return `Tu es un expert en création de contenu pour réseaux sociaux.
Projet : ${project.label} ${project.emoji}
${parts}

Plateforme : ${platform.toUpperCase()}
${cfg[`prompt_${platform}`] || defaultRules[platform]}

Idée : "${idea}"

Génère un post ${platform} percutant et authentique.
Réponds UNIQUEMENT avec le post final, sans explication.`
}

// ── TAB CONTENU ───────────────────────────────────────────────────
function TabContenu({ project }) {
  const [prompt,   setPrompt]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [genAll,   setGenAll]   = useState(false)
  const [posts,    setPosts]    = useState([])
  const [platform, setPlatform] = useState('linkedin')

  const generer = async (plt = platform, clearPrompt = true) => {
    if (!prompt.trim()) return
    setLoading(true)
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
        body: JSON.stringify({ model:'gpt-4o', max_tokens:800, messages:[{ role:'user', content:buildPrompt(project, plt, prompt) }] })
      })
      const data = await res.json()
      const contenu = data.choices[0].message.content.trim()
      setPosts(prev => [{ id: Date.now()+Math.random(), platform:plt, contenu, date: new Date().toLocaleDateString('fr-FR'), statut:'brouillon' }, ...prev])
      if (clearPrompt) setPrompt('')
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const genererTout = async () => {
    if (!prompt.trim()) return
    setGenAll(true)
    for (const plt of PLATFORMS) await generer(plt, false)
    setPrompt('')
    setGenAll(false)
  }

  const copier    = (contenu) => navigator.clipboard.writeText(contenu)
  const supprimer = (id)      => setPosts(prev => prev.filter(p => p.id !== id))

  const plt_icon = { linkedin:'💼', facebook:'👥', discord:'🎮', youtube:'🎬' }

  return (
    <div style={{ display:'flex', gap:24, height:'100%' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:20 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#EDE8DB', marginBottom:14 }}>🤖 Génération IA</h3>
          <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
            {PLATFORMS.map(p => (
              <button key={p} onClick={() => setPlatform(p)}
                style={{ padding:'5px 14px', borderRadius:20, border:`1px solid ${platform===p?project.color:'rgba(255,255,255,0.1)'}`, background:platform===p?`${project.color}20`:'transparent', color:platform===p?project.color:'rgba(237,232,219,0.5)', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                {plt_icon[p]} {p}
              </button>
            ))}
          </div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder={`Décris ton idée pour ${project.label}...\nEx: "Je viens de lancer une nouvelle fonctionnalité"`}
            rows={5} style={{ width:'100%', padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#EDE8DB', fontSize:13, outline:'none', resize:'vertical', fontFamily:"'Nunito Sans',sans-serif", boxSizing:'border-box', lineHeight:1.6 }}/>
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            <button onClick={() => generer(platform, true)} disabled={loading||!prompt.trim()}
              style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:loading||!prompt.trim()?`${project.color}40`:project.color, color:'#0D1B2A', fontSize:13, fontWeight:800, cursor:loading||!prompt.trim()?'not-allowed':'pointer' }}>
              {loading ? '⏳ Génération...' : `✨ Générer ${platform}`}
            </button>
            <button onClick={genererTout} disabled={genAll||!prompt.trim()}
              style={{ padding:'11px 16px', borderRadius:10, border:`1px solid ${project.color}`, background:'transparent', color:project.color, fontSize:12, fontWeight:700, cursor:genAll||!prompt.trim()?'not-allowed':'pointer', whiteSpace:'nowrap' }}>
              {genAll ? '⏳...' : '🌐 Tout générer'}
            </button>
          </div>
        </div>

        <div style={{ background:'rgba(255,255,255,0.02)', border:'2px dashed rgba(255,255,255,0.08)', borderRadius:14, padding:20, textAlign:'center', cursor:'pointer' }}
          onMouseEnter={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}>
          <div style={{ fontSize:28, marginBottom:6 }}>📎</div>
          <p style={{ fontSize:13, color:'rgba(237,232,219,0.4)', margin:0 }}>Glisse tes fichiers ici</p>
          <p style={{ fontSize:11, color:'rgba(237,232,219,0.2)', margin:'4px 0 0' }}>Images · Vidéos · PDF · Documents</p>
        </div>
      </div>

      <div style={{ width:340, display:'flex', flexDirection:'column', gap:10, overflowY:'auto' }}>
        <h3 style={{ fontSize:11, fontWeight:700, color:'rgba(237,232,219,0.4)', textTransform:'uppercase', letterSpacing:'0.08em', flexShrink:0 }}>
          Posts générés {posts.length > 0 && `(${posts.length})`}
        </h3>
        {posts.length === 0
          ? <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:24, textAlign:'center', color:'rgba(237,232,219,0.3)', fontSize:13 }}>
              Aucun post encore.<br/>Génère ton premier post ✨
            </div>
          : posts.map(p => (
            <div key={p.id} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:14, flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:10, fontWeight:700, color:project.color, textTransform:'uppercase' }}>{plt_icon[p.platform]} {p.platform}</span>
                <span style={{ fontSize:10, color:'rgba(237,232,219,0.3)' }}>{p.date}</span>
              </div>
              <p style={{ fontSize:12, color:'rgba(237,232,219,0.75)', lineHeight:1.6, margin:'0 0 10px', whiteSpace:'pre-wrap', maxHeight:140, overflow:'hidden' }}>{p.contenu}</p>
              <div style={{ display:'flex', gap:5 }}>
                <button onClick={() => copier(p.contenu)}
                  style={{ flex:1, padding:'6px', borderRadius:7, border:'none', background:project.color, color:'#0D1B2A', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                  📋 Copier
                </button>
                <button style={{ padding:'6px 10px', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(237,232,219,0.5)', fontSize:11, cursor:'pointer' }}>
                  Publier
                </button>
                <button onClick={() => supprimer(p.id)}
                  style={{ padding:'6px 8px', borderRadius:7, border:'1px solid rgba(199,91,78,0.2)', background:'transparent', color:'#C75B4E', fontSize:11, cursor:'pointer' }}>
                  🗑️
                </button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

function TabPlaceholder({ tab, project }) {
  const m = {
    monitoring: { icon:'📊', titre:'Monitoring',  desc:'Coûts OpenAI · Alertes RGPD · Sécurité · Uptime' },
    vault:      { icon:'🔐', titre:'Vault',        desc:'Tous tes comptes · Clés API · Outils · Abonnements' },
    finances:   { icon:'💰', titre:'Finances',     desc:'MRR · Dépenses · Marge nette · Projections' },
    sav:        { icon:'💬', titre:'SAV',           desc:'Messages entrants · Tickets · Historique client' },
    prospects:  { icon:'🎯', titre:'Prospects',    desc:'CRM · Pipeline · Séquences email · Scoring IA' },
  }[tab] || { icon:'🔧', titre:tab, desc:'En construction' }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:16, opacity:0.5 }}>
      <div style={{ fontSize:56 }}>{m.icon}</div>
      <h2 style={{ fontFamily:"'Georgia',serif", fontSize:24, fontWeight:700, color:'#EDE8DB', margin:0 }}>{m.titre}</h2>
      <p style={{ fontSize:14, color:'rgba(237,232,219,0.5)', margin:0 }}>{m.desc}</p>
      <div style={{ padding:'6px 16px', borderRadius:20, background:`${project.color}20`, border:`1px solid ${project.color}40`, fontSize:12, color:project.color, fontWeight:700 }}>
        Prochaine session
      </div>
    </div>
  )
}

// ── APP ───────────────────────────────────────────────────────────
export default function App() {
  const [projects,      setProjects]      = useState(PROJECTS_DEFAULT)
  const [activeProject, setActiveProject] = useState('vigie')
  const [activeTab,     setActiveTab]     = useState('contenu')

  const project = projects.find(p => p.id === activeProject)

  return (
    <div style={{ fontFamily:"'Nunito Sans',sans-serif", background:'#0D1B2A', color:'#EDE8DB', height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* TOPBAR */}
      <div style={{ height:52, background:'rgba(0,0,0,0.3)', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg,${project.color},#0D1B2A)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{project.emoji}</div>
          <span style={{ fontFamily:"'Georgia',serif", fontSize:16, fontWeight:700, color:'#EDE8DB' }}>Pilotage</span>
          <span style={{ fontSize:11, color:'rgba(237,232,219,0.3)', background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:10 }}>Syon</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#5BC78A' }}/>
          <span style={{ fontSize:11, color:'rgba(237,232,219,0.3)' }}>v0.1.0</span>
        </div>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* SIDEBAR */}
        <div style={{ width:200, background:'rgba(0,0,0,0.2)', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', padding:'16px 10px', gap:4, flexShrink:0, overflowY:'auto' }}>
          <p style={{ fontSize:9, fontWeight:700, color:'rgba(237,232,219,0.25)', textTransform:'uppercase', letterSpacing:'0.1em', padding:'0 8px', marginBottom:8 }}>Projets</p>
          {projects.map(p => (
            <button key={p.id} onClick={() => setActiveProject(p.id)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, border:'none', background:activeProject===p.id?`${p.color}18`:'transparent', cursor:'pointer', textAlign:'left', borderLeft:activeProject===p.id?`3px solid ${p.color}`:'3px solid transparent', transition:'all 0.15s' }}>
              <span style={{ fontSize:16 }}>{p.emoji}</span>
              <span style={{ fontSize:13, fontWeight:activeProject===p.id?700:500, color:activeProject===p.id?p.color:'rgba(237,232,219,0.5)' }}>{p.label}</span>
            </button>
          ))}

          <div style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'12px 0' }}/>

          <p style={{ fontSize:9, fontWeight:700, color:'rgba(237,232,219,0.25)', textTransform:'uppercase', letterSpacing:'0.1em', padding:'0 8px', marginBottom:8 }}>Modules</p>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, border:'none', background:activeTab===t.id?'rgba(255,255,255,0.07)':'transparent', cursor:'pointer', textAlign:'left', transition:'all 0.15s', borderLeft:activeTab===t.id&&t.id==='personnalisation'?`3px solid ${project.color}`:'3px solid transparent' }}>
              <span style={{ fontSize:14 }}>{t.emoji}</span>
              <span style={{ fontSize:12, fontWeight:activeTab===t.id?700:400, color:activeTab===t.id?'#EDE8DB':'rgba(237,232,219,0.4)' }}>{t.label}</span>
            </button>
          ))}

          <div style={{ marginTop:'auto', padding:'12px 8px 0' }}>
            <div style={{ padding:'10px 12px', borderRadius:10, background:`${project.color}10`, border:`1px solid ${project.color}20` }}>
              <p style={{ fontSize:10, color:project.color, fontWeight:700, margin:'0 0 2px' }}>{project.emoji} {project.label}</p>
              <p style={{ fontSize:10, color:'rgba(237,232,219,0.3)', margin:0 }}>Projet actif</p>
            </div>
          </div>
        </div>

        {/* CONTENU */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'16px 24px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>{TABS.find(t => t.id===activeTab)?.emoji}</span>
            <h2 style={{ fontFamily:"'Georgia',serif", fontSize:20, fontWeight:700, color:'#EDE8DB', margin:0 }}>{TABS.find(t => t.id===activeTab)?.label}</h2>
            <span style={{ fontSize:11, background:`${project.color}15`, border:`1px solid ${project.color}30`, padding:'2px 10px', borderRadius:20, color:project.color }}>
              {project.emoji} {project.label}
            </span>
          </div>

          <div style={{ flex:1, padding:24, overflowY:'auto' }}>
            {activeTab === 'contenu'          && <TabContenu project={project}/>}
            {activeTab === 'personnalisation' && <PagePersonnalisation project={project}/>}
            {!['contenu','personnalisation'].includes(activeTab) && <TabPlaceholder tab={activeTab} project={project}/>}
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        body { overflow:hidden; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:3px; }
        button, textarea, input { font-family:'Nunito Sans',sans-serif; }
      `}</style>
    </div>
  )
}
