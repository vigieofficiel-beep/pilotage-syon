import { useState } from 'react'

export default function LicenceModal({ onActivated }) {
  const [code,    setCode]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const formatCode = (val) => {
    const clean = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    const parts  = []
    for (let i = 0; i < clean.length && i < 16; i += 4) {
      parts.push(clean.slice(i, i + 4))
    }
    return parts.join('-')
  }

  const handleChange = (e) => {
    setCode(formatCode(e.target.value))
    setError('')
  }

  const activer = async () => {
    if (code.length < 19) { setError('Code incomplet — format : PLTG-XXXX-XXXX-XXXX'); return }
    setLoading(true); setError('')
    try {
      // Mode Electron
      if (window.electronAPI?.activateLicence) {
        const ok = await window.electronAPI.activateLicence(code)
        if (ok) { setSuccess(true); setTimeout(onActivated, 1500) }
        else setError('Code invalide. Vérifie ta licence ou contacte le support.')
      } else {
        // Mode dev web — bypass
        setSuccess(true); setTimeout(onActivated, 800)
      }
    } catch(e) { setError('Erreur technique. Réessaie.') }
    setLoading(false)
  }

  return (
    <div style={{
      position:'fixed', inset:0, background:'#0D1B2A', zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:"'Nunito Sans',sans-serif",
    }}>
      {/* Grain */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',opacity:0.04,backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,backgroundRepeat:'repeat',backgroundSize:'128px'}}/>

      <div style={{
        background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:20, padding:'48px 52px', width:'100%', maxWidth:480,
        textAlign:'center', position:'relative', zIndex:1,
      }}>
        {/* Logo */}
        <div style={{
          width:56, height:56, borderRadius:16, margin:'0 auto 24px',
          background:'linear-gradient(135deg,#5BA3C7,#0D1B2A)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:28
        }}>🧭</div>

        <h1 style={{fontFamily:"'Georgia',serif",fontSize:24,fontWeight:700,color:'#EDE8DB',marginBottom:8}}>
          Pilotage
        </h1>
        <p style={{fontSize:13,color:'rgba(237,232,219,0.4)',marginBottom:32,lineHeight:1.6}}>
          Bienvenue ! Entre ton code de licence<br/>pour activer le logiciel.
        </p>

        {!success ? <>
          <input
            value={code}
            onChange={handleChange}
            onKeyDown={e=>{ if(e.key==='Enter') activer() }}
            placeholder="PLTG-XXXX-XXXX-XXXX"
            maxLength={19}
            style={{
              width:'100%', padding:'14px 18px', borderRadius:12, fontSize:16,
              fontFamily:'monospace', letterSpacing:'0.12em', textAlign:'center',
              background:'rgba(255,255,255,0.05)', border:`1px solid ${error?'rgba(199,91,78,0.5)':'rgba(255,255,255,0.12)'}`,
              color:'#EDE8DB', outline:'none', boxSizing:'border-box', marginBottom:12,
            }}
          />

          {error && (
            <p style={{fontSize:12,color:'#C75B4E',marginBottom:12,lineHeight:1.5}}>
              ⚠️ {error}
            </p>
          )}

          <button
            onClick={activer}
            disabled={loading||code.length<19}
            style={{
              width:'100%', padding:'13px', borderRadius:12, border:'none',
              background:loading||code.length<19?'rgba(91,163,199,0.3)':'#5BA3C7',
              color:'#0D1B2A', fontSize:14, fontWeight:800,
              cursor:loading||code.length<19?'not-allowed':'pointer', marginBottom:20,
              transition:'all 0.2s',
            }}>
            {loading ? '⏳ Vérification...' : '🔓 Activer Pilotage'}
          </button>

          <p style={{fontSize:11,color:'rgba(237,232,219,0.2)',lineHeight:1.6}}>
            Tu n'as pas de code ? Contacte<br/>
            <span style={{color:'rgba(237,232,219,0.4)'}}>vigie.officiel@vigie-officiel.com</span>
          </p>
        </> : (
          <div style={{padding:'20px 0'}}>
            <div style={{fontSize:52,marginBottom:16}}>✅</div>
            <p style={{fontSize:16,fontWeight:700,color:'#5BC78A',marginBottom:8}}>Licence activée !</p>
            <p style={{fontSize:13,color:'rgba(237,232,219,0.4)'}}>Lancement de Pilotage...</p>
          </div>
        )}
      </div>
    </div>
  )
}
