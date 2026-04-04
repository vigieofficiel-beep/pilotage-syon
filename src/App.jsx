import { useState } from 'react'
import PagePersonnalisation from './pages/PagePersonnalisation'
import PageVault from './pages/PageVault'
import PageMonitoring from './pages/PageMonitoring'
import PageFinances from './pages/PageFinances'

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

// ── SCORE QUALITÉ ─────────────────────────────────────────────────
function ScorePanel({ post, project, onClose, onRewrite }) {
  const [score,      setScore]      = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [rewrite,    setRewrite]    = useState(null)
  const [rewLoading, setRewLoading] = useState(false)

  const analyser = async () => {
    setLoading(true)
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`},
        body: JSON.stringify({ model:'gpt-4o', max_tokens:400, response_format:{type:'json_object'},
          messages:[{ role:'user', content:`Tu es un expert en marketing de contenu.
Analyse ce post ${post.platform} et donne un score détaillé.
POST : ${post.contenu}
Réponds en JSON :
{"score_global":8,"accroche":{"note":8,"ok":true,"commentaire":"..."},"longueur":{"note":9,"ok":true,"commentaire":"..."},"cta":{"note":7,"ok":true,"commentaire":"..."},"ton":{"note":8,"ok":true,"commentaire":"..."},"originalite":{"note":7,"ok":true,"commentaire":"..."},"suggestion_globale":"..."}`
          }]
        })
      })
      const data = await res.json()
      setScore(JSON.parse(data.choices[0].message.content))
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const ameliorer = async () => {
    setRewLoading(true)
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`},
        body: JSON.stringify({ model:'gpt-4o', max_tokens:600,
          messages:[{ role:'user', content:`Expert copywriting ${post.platform}.
Réécris en améliorant accroche, CTA, impact émotionnel. Garde le même sens.
ORIGINAL : ${post.contenu}
${score?.suggestion_globale?`Points à améliorer : ${score.suggestion_globale}`:''}
UNIQUEMENT le post réécrit, sans explication.`
          }]
        })
      })
      const data = await res.json()
      setRewrite(data.choices[0].message.content.trim())
    } catch(e) { console.error(e) }
    setRewLoading(false)
  }

  const sc = (n) => n>=8?'#5BC78A':n>=6?'#D4A853':'#C75B4E'
  const criterias = score ? [
    {label:'Accroche',data:score.accroche},{label:'Longueur',data:score.longueur},
    {label:'CTA',data:score.cta},{label:'Ton',data:score.ton},{label:'Originalité',data:score.originalite}
  ] : []

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'#1a1d24',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:'100%',maxWidth:560,padding:28,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{fontSize:16,fontWeight:700,color:'#EDE8DB',margin:0}}>🎯 Score — {post.platform}</h3>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'none',borderRadius:8,padding:'5px 10px',cursor:'pointer',color:'rgba(237,232,219,0.6)',fontSize:12}}>✕</button>
        </div>
        <div style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:14,marginBottom:16,fontSize:12,color:'rgba(237,232,219,0.6)',lineHeight:1.6,whiteSpace:'pre-wrap',maxHeight:100,overflow:'hidden'}}>
          {post.contenu}
        </div>
        {!score && <button onClick={analyser} disabled={loading}
          style={{width:'100%',padding:'11px',borderRadius:10,border:'none',background:loading?`${project.color}40`:project.color,color:'#0D1B2A',fontSize:13,fontWeight:800,cursor:loading?'not-allowed':'pointer',marginBottom:16}}>
          {loading?'⏳ Analyse...':'🔍 Analyser ce post'}
        </button>}
        {score && <>
          <div style={{textAlign:'center',marginBottom:16,padding:'14px',background:`${sc(score.score_global)}15`,border:`1px solid ${sc(score.score_global)}30`,borderRadius:12}}>
            <div style={{fontSize:48,fontWeight:900,color:sc(score.score_global),lineHeight:1}}>{score.score_global}</div>
            <div style={{fontSize:12,color:'rgba(237,232,219,0.5)',marginTop:4}}>Score global / 10</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
            {criterias.map(({label,data})=>data&&(
              <div key={label} style={{background:'rgba(255,255,255,0.02)',borderRadius:10,padding:'10px 14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:'#EDE8DB'}}>{data.ok?'✅':'⚠️'} {label}</span>
                  <span style={{fontSize:13,fontWeight:800,color:sc(data.note)}}>{data.note}/10</span>
                </div>
                <div style={{height:3,background:'rgba(255,255,255,0.06)',borderRadius:2,marginBottom:6}}>
                  <div style={{width:`${data.note*10}%`,height:'100%',background:sc(data.note),borderRadius:2}}/>
                </div>
                <p style={{fontSize:11,color:'rgba(237,232,219,0.4)',margin:0}}>{data.commentaire}</p>
              </div>
            ))}
          </div>
          {score.suggestion_globale && <div style={{background:'rgba(212,168,83,0.08)',border:'1px solid rgba(212,168,83,0.2)',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#D4A853'}}>💡 {score.suggestion_globale}</div>}
          {!rewrite && <button onClick={ameliorer} disabled={rewLoading}
            style={{width:'100%',padding:'10px',borderRadius:10,border:`1px solid ${project.color}`,background:'transparent',color:project.color,fontSize:12,fontWeight:700,cursor:rewLoading?'not-allowed':'pointer',marginBottom:8}}>
            {rewLoading?'⏳ Réécriture...':'✨ Améliorer automatiquement'}
          </button>}
          {rewrite && <div style={{background:'rgba(91,199,138,0.05)',border:'1px solid rgba(91,199,138,0.2)',borderRadius:10,padding:14}}>
            <p style={{fontSize:11,fontWeight:700,color:'#5BC78A',marginBottom:8}}>✨ Version améliorée :</p>
            <p style={{fontSize:12,color:'rgba(237,232,219,0.8)',lineHeight:1.6,margin:'0 0 10px',whiteSpace:'pre-wrap'}}>{rewrite}</p>
            <button onClick={()=>{onRewrite(rewrite);onClose()}}
              style={{width:'100%',padding:'8px',borderRadius:8,border:'none',background:'#5BC78A',color:'#0D1B2A',fontSize:12,fontWeight:800,cursor:'pointer'}}>
              ✅ Utiliser cette version
            </button>
          </div>}
        </>}
      </div>
    </div>
  )
}

// ── MODE REPURPOSE ────────────────────────────────────────────────
function RepurposePanel({ project, onClose, onAddPosts }) {
  const [source,  setSource]  = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])

  const repurposer = async () => {
    if (!source.trim()) return
    setLoading(true)
    setResults([])
    try {
      const cfg = getConfig(project.id)
      for (const plt of PLATFORMS) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`},
          body: JSON.stringify({ model:'gpt-4o', max_tokens:600,
            messages:[{ role:'user', content:`Tu es expert en repurposing de contenu pour ${plt}.
Projet : ${project.label} ${project.emoji}
${cfg.contexte_global?`Contexte : ${cfg.contexte_global}`:''}
${cfg.nom?`Auteur : ${cfg.nom}`:''}

Transforme ce contenu source en post ${plt} percutant.
Extrait les points clés, adapte le format et le ton à ${plt}.

CONTENU SOURCE :
${source}

Règles ${plt} :
${plt==='linkedin'?`Professionnel, flèches →, paragraphes courts, termine par "— ${cfg.nom||'Lucien Doppler'}"`:
  plt==='facebook'?'Accessible, emojis, storytelling humain':
  plt==='discord'?'Communauté, **gras**, technique si pertinent':
  'Script YouTube, accroche 5 sec, structure AIDA'}

UNIQUEMENT le post, sans explication.`
            }]
          })
        })
        const data = await res.json()
        const contenu = data.choices[0].message.content.trim()
        setResults(prev => [...prev, { id:Date.now()+Math.random(), platform:plt, contenu, date:new Date().toLocaleDateString('fr-FR'), statut:'brouillon' }])
      }
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const plt_icon = { linkedin:'💼', facebook:'👥', discord:'🎮', youtube:'🎬' }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:20,overflowY:'auto'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'#1a1d24',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:'100%',maxWidth:760,padding:28,marginTop:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <h3 style={{fontSize:16,fontWeight:700,color:'#EDE8DB',margin:'0 0 4px'}}>♻️ Mode Repurpose</h3>
            <p style={{fontSize:12,color:'rgba(237,232,219,0.4)',margin:0}}>Colle un article, une vidéo, un PDF → 4 posts générés automatiquement</p>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'none',borderRadius:8,padding:'5px 10px',cursor:'pointer',color:'rgba(237,232,219,0.6)',fontSize:12}}>✕</button>
        </div>

        <textarea value={source} onChange={e=>setSource(e.target.value)}
          placeholder="Colle ici ton contenu source : article de blog, transcript YouTube, notes, PDF, thread Twitter..."
          rows={7} style={{width:'100%',padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#EDE8DB',fontSize:13,outline:'none',resize:'vertical',fontFamily:"'Nunito Sans',sans-serif",boxSizing:'border-box',lineHeight:1.6,marginBottom:12}}/>

        <button onClick={repurposer} disabled={loading||!source.trim()}
          style={{width:'100%',padding:'12px',borderRadius:10,border:'none',background:loading||!source.trim()?`${project.color}40`:project.color,color:'#0D1B2A',fontSize:14,fontWeight:800,cursor:loading||!source.trim()?'not-allowed':'pointer',marginBottom:20}}>
          {loading?'⏳ Génération en cours (4 posts)...':'♻️ Générer 4 posts depuis ce contenu'}
        </button>

        {results.length > 0 && (
          <>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              {results.map(r => (
                <div key={r.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:14}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                    <span style={{fontSize:14}}>{plt_icon[r.platform]}</span>
                    <span style={{fontSize:11,fontWeight:700,color:project.color,textTransform:'uppercase'}}>{r.platform}</span>
                  </div>
                  <p style={{fontSize:12,color:'rgba(237,232,219,0.7)',lineHeight:1.6,margin:'0 0 10px',whiteSpace:'pre-wrap',maxHeight:120,overflow:'hidden'}}>{r.contenu}</p>
                  <button onClick={()=>navigator.clipboard.writeText(r.contenu)}
                    style={{width:'100%',padding:'6px',borderRadius:7,border:'none',background:project.color,color:'#0D1B2A',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                    📋 Copier
                  </button>
                </div>
              ))}
            </div>
            <button onClick={()=>{onAddPosts(results);onClose()}}
              style={{width:'100%',padding:'11px',borderRadius:10,border:'none',background:'#5BC78A',color:'#0D1B2A',fontSize:13,fontWeight:800,cursor:'pointer'}}>
              ✅ Ajouter tous les posts à ma liste
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── TAB CONTENU ───────────────────────────────────────────────────
function TabContenu({ project }) {
  const [prompt,     setPrompt]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [genAll,     setGenAll]     = useState(false)
  const [posts,      setPosts]      = useState([])
  const [platform,   setPlatform]   = useState('linkedin')
  const [analysing,  setAnalysing]  = useState(null)
  const [repurpose,  setRepurpose]  = useState(false)

  const generer = async (plt = platform, clearPrompt = true) => {
    if (!prompt.trim()) return
    setLoading(true)
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`},
        body: JSON.stringify({ model:'gpt-4o', max_tokens:800, messages:[{role:'user',content:buildPrompt(project,plt,prompt)}] })
      })
      const data = await res.json()
      const contenu = data.choices[0].message.content.trim()
      setPosts(prev => [{id:Date.now()+Math.random(),platform:plt,contenu,date:new Date().toLocaleDateString('fr-FR'),statut:'brouillon'},...prev])
      if (clearPrompt) setPrompt('')
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const genererTout = async () => {
    if (!prompt.trim()) return
    setGenAll(true)
    for (const plt of PLATFORMS) await generer(plt, false)
    setPrompt(''); setGenAll(false)
  }

  const copier    = (c) => navigator.clipboard.writeText(c)
  const supprimer = (id) => setPosts(prev => prev.filter(p => p.id !== id))
  const rewrite   = (id, c) => setPosts(prev => prev.map(p => p.id===id?{...p,contenu:c}:p))
  const addPosts  = (newPosts) => setPosts(prev => [...newPosts, ...prev])
  const plt_icon  = {linkedin:'💼',facebook:'👥',discord:'🎮',youtube:'🎬'}

  return (
    <div style={{display:'flex',gap:24,height:'100%'}}>
      {analysing && <ScorePanel post={analysing} project={project} onClose={()=>setAnalysing(null)} onRewrite={(c)=>rewrite(analysing.id,c)}/>}
      {repurpose && <RepurposePanel project={project} onClose={()=>setRepurpose(false)} onAddPosts={addPosts}/>}

      <div style={{flex:1,display:'flex',flexDirection:'column',gap:14}}>
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{fontSize:14,fontWeight:700,color:'#EDE8DB',margin:0}}>🤖 Génération IA</h3>
            <button onClick={()=>setRepurpose(true)}
              style={{padding:'6px 14px',borderRadius:20,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.04)',color:'rgba(237,232,219,0.6)',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              ♻️ Repurpose
            </button>
          </div>
          <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
            {PLATFORMS.map(p => (
              <button key={p} onClick={()=>setPlatform(p)}
                style={{padding:'5px 14px',borderRadius:20,border:`1px solid ${platform===p?project.color:'rgba(255,255,255,0.1)'}`,background:platform===p?`${project.color}20`:'transparent',color:platform===p?project.color:'rgba(237,232,219,0.5)',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                {plt_icon[p]} {p}
              </button>
            ))}
          </div>
          <textarea value={prompt} onChange={e=>setPrompt(e.target.value)}
            placeholder={`Décris ton idée pour ${project.label}...\nEx: "Je viens de lancer une nouvelle fonctionnalité"`}
            rows={5} style={{width:'100%',padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#EDE8DB',fontSize:13,outline:'none',resize:'vertical',fontFamily:"'Nunito Sans',sans-serif",boxSizing:'border-box',lineHeight:1.6}}/>
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <button onClick={()=>generer(platform,true)} disabled={loading||!prompt.trim()}
              style={{flex:1,padding:'11px',borderRadius:10,border:'none',background:loading||!prompt.trim()?`${project.color}40`:project.color,color:'#0D1B2A',fontSize:13,fontWeight:800,cursor:loading||!prompt.trim()?'not-allowed':'pointer'}}>
              {loading?'⏳ Génération...':`✨ Générer ${platform}`}
            </button>
            <button onClick={genererTout} disabled={genAll||!prompt.trim()}
              style={{padding:'11px 16px',borderRadius:10,border:`1px solid ${project.color}`,background:'transparent',color:project.color,fontSize:12,fontWeight:700,cursor:genAll||!prompt.trim()?'not-allowed':'pointer',whiteSpace:'nowrap'}}>
              {genAll?'⏳...':'🌐 Tout générer'}
            </button>
          </div>
        </div>

        <div style={{background:'rgba(255,255,255,0.02)',border:'2px dashed rgba(255,255,255,0.08)',borderRadius:14,padding:20,textAlign:'center',cursor:'pointer'}}
          onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.2)'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}>
          <div style={{fontSize:28,marginBottom:6}}>📎</div>
          <p style={{fontSize:13,color:'rgba(237,232,219,0.4)',margin:0}}>Glisse tes fichiers ici</p>
          <p style={{fontSize:11,color:'rgba(237,232,219,0.2)',margin:'4px 0 0'}}>Images · Vidéos · PDF · Documents</p>
        </div>
      </div>

      <div style={{width:340,display:'flex',flexDirection:'column',gap:10,overflowY:'auto'}}>
        <h3 style={{fontSize:11,fontWeight:700,color:'rgba(237,232,219,0.4)',textTransform:'uppercase',letterSpacing:'0.08em',flexShrink:0}}>
          Posts générés {posts.length>0&&`(${posts.length})`}
        </h3>
        {posts.length===0
          ?<div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:24,textAlign:'center',color:'rgba(237,232,219,0.3)',fontSize:13}}>
            Aucun post encore.<br/>Génère ton premier post ✨
          </div>
          :posts.map(p=>(
            <div key={p.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:14,flexShrink:0}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:10,fontWeight:700,color:project.color,textTransform:'uppercase'}}>{plt_icon[p.platform]} {p.platform}</span>
                <span style={{fontSize:10,color:'rgba(237,232,219,0.3)'}}>{p.date}</span>
              </div>
              <p style={{fontSize:12,color:'rgba(237,232,219,0.75)',lineHeight:1.6,margin:'0 0 10px',whiteSpace:'pre-wrap',maxHeight:140,overflow:'hidden'}}>{p.contenu}</p>
              <div style={{display:'flex',gap:5}}>
                <button onClick={()=>copier(p.contenu)}
                  style={{flex:1,padding:'6px',borderRadius:7,border:'none',background:project.color,color:'#0D1B2A',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  📋 Copier
                </button>
                <button onClick={()=>setAnalysing(p)}
                  style={{padding:'6px 8px',borderRadius:7,border:`1px solid ${project.color}40`,background:`${project.color}10`,color:project.color,fontSize:11,cursor:'pointer'}}
                  title="Score qualité">🎯</button>
                <button style={{padding:'6px 10px',borderRadius:7,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(237,232,219,0.5)',fontSize:11,cursor:'pointer'}}>
                  Publier
                </button>
                <button onClick={()=>supprimer(p.id)}
                  style={{padding:'6px 8px',borderRadius:7,border:'1px solid rgba(199,91,78,0.2)',background:'transparent',color:'#C75B4E',fontSize:11,cursor:'pointer'}}>
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
    sav:       {icon:'💬',titre:'SAV',       desc:'Messages entrants · Tickets · Historique client'},
    prospects: {icon:'🎯',titre:'Prospects', desc:'CRM · Pipeline · Séquences email · Scoring IA'},
  }[tab] || {icon:'🔧',titre:tab,desc:'En construction'}
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:16,opacity:0.5}}>
      <div style={{fontSize:56}}>{m.icon}</div>
      <h2 style={{fontFamily:"'Georgia',serif",fontSize:24,fontWeight:700,color:'#EDE8DB',margin:0}}>{m.titre}</h2>
      <p style={{fontSize:14,color:'rgba(237,232,219,0.5)',margin:0}}>{m.desc}</p>
      <div style={{padding:'6px 16px',borderRadius:20,background:`${project.color}20`,border:`1px solid ${project.color}40`,fontSize:12,color:project.color,fontWeight:700}}>Prochaine session</div>
    </div>
  )
}

export default function App() {
  const [projects,      setProjects]      = useState(PROJECTS_DEFAULT)
  const [activeProject, setActiveProject] = useState('vigie')
  const [activeTab,     setActiveTab]     = useState('contenu')

  const project = projects.find(p => p.id === activeProject)
  const ACTIVE_TABS = ['contenu','personnalisation','vault','monitoring','finances']

  return (
    <div style={{fontFamily:"'Nunito Sans',sans-serif",background:'#0D1B2A',color:'#EDE8DB',height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>

      <div style={{height:52,background:'rgba(0,0,0,0.3)',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${project.color},#0D1B2A)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{project.emoji}</div>
          <span style={{fontFamily:"'Georgia',serif",fontSize:16,fontWeight:700,color:'#EDE8DB'}}>Pilotage</span>
          <span style={{fontSize:11,color:'rgba(237,232,219,0.3)',background:'rgba(255,255,255,0.05)',padding:'2px 8px',borderRadius:10}}>Syon</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:'#5BC78A'}}/>
          <span style={{fontSize:11,color:'rgba(237,232,219,0.3)'}}>v0.3.0</span>
        </div>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        <div style={{width:200,background:'rgba(0,0,0,0.2)',borderRight:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',padding:'16px 10px',gap:4,flexShrink:0,overflowY:'auto'}}>
          <p style={{fontSize:9,fontWeight:700,color:'rgba(237,232,219,0.25)',textTransform:'uppercase',letterSpacing:'0.1em',padding:'0 8px',marginBottom:8}}>Projets</p>
          {projects.map(p=>(
            <button key={p.id} onClick={()=>setActiveProject(p.id)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:'none',background:activeProject===p.id?`${p.color}18`:'transparent',cursor:'pointer',textAlign:'left',borderLeft:activeProject===p.id?`3px solid ${p.color}`:'3px solid transparent',transition:'all 0.15s'}}>
              <span style={{fontSize:16}}>{p.emoji}</span>
              <span style={{fontSize:13,fontWeight:activeProject===p.id?700:500,color:activeProject===p.id?p.color:'rgba(237,232,219,0.5)'}}>{p.label}</span>
            </button>
          ))}
          <div style={{height:1,background:'rgba(255,255,255,0.06)',margin:'12px 0'}}/>
          <p style={{fontSize:9,fontWeight:700,color:'rgba(237,232,219,0.25)',textTransform:'uppercase',letterSpacing:'0.1em',padding:'0 8px',marginBottom:8}}>Modules</p>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:10,border:'none',background:activeTab===t.id?'rgba(255,255,255,0.07)':'transparent',cursor:'pointer',textAlign:'left',transition:'all 0.15s',borderLeft:activeTab===t.id&&ACTIVE_TABS.includes(t.id)?`3px solid ${project.color}`:'3px solid transparent'}}>
              <span style={{fontSize:14}}>{t.emoji}</span>
              <span style={{fontSize:12,fontWeight:activeTab===t.id?700:400,color:activeTab===t.id?'#EDE8DB':'rgba(237,232,219,0.4)'}}>{t.label}</span>
            </button>
          ))}
          <div style={{marginTop:'auto',padding:'12px 8px 0'}}>
            <div style={{padding:'10px 12px',borderRadius:10,background:`${project.color}10`,border:`1px solid ${project.color}20`}}>
              <p style={{fontSize:10,color:project.color,fontWeight:700,margin:'0 0 2px'}}>{project.emoji} {project.label}</p>
              <p style={{fontSize:10,color:'rgba(237,232,219,0.3)',margin:0}}>Projet actif</p>
            </div>
          </div>
        </div>

        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'16px 24px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0,display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:20}}>{TABS.find(t=>t.id===activeTab)?.emoji}</span>
            <h2 style={{fontFamily:"'Georgia',serif",fontSize:20,fontWeight:700,color:'#EDE8DB',margin:0}}>{TABS.find(t=>t.id===activeTab)?.label}</h2>
            <span style={{fontSize:11,background:`${project.color}15`,border:`1px solid ${project.color}30`,padding:'2px 10px',borderRadius:20,color:project.color}}>
              {project.emoji} {project.label}
            </span>
          </div>
          <div style={{flex:1,padding:24,overflowY:'auto'}}>
            {activeTab==='contenu'          && <TabContenu project={project}/>}
            {activeTab==='personnalisation' && <PagePersonnalisation project={project}/>}
            {activeTab==='vault'            && <PageVault project={project} projects={projects}/>}
            {activeTab==='monitoring'       && <PageMonitoring project={project}/>}
            {activeTab==='finances'         && <PageFinances project={project}/>}
            {!ACTIVE_TABS.includes(activeTab) && <TabPlaceholder tab={activeTab} project={project}/>}
          </div>
        </div>
      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{overflow:hidden;}
        ::-webkit-scrollbar{width:6px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px;}
        button,textarea,input{font-family:'Nunito Sans',sans-serif;}
      `}</style>
    </div>
  )
}
