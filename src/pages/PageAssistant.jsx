import { useState, useRef, useEffect } from 'react'

const N8N_WEBHOOK = 'https://vigieofficiel.app.n8n.cloud/webhook/assistant-calendar'
const OPENAI_KEY  = import.meta.env.VITE_OPENAI_API_KEY

const iS = {
  flex: 1, padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#EDE8DB', fontSize: 13, outline: 'none',
  fontFamily: "'Nunito Sans', sans-serif",
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      <div style={{
        maxWidth: '75%', padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'rgba(91,163,199,0.2)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isUser ? 'rgba(91,163,199,0.3)' : 'rgba(255,255,255,0.08)'}`,
        fontSize: 13, color: '#EDE8DB', lineHeight: 1.6, whiteSpace: 'pre-wrap',
      }}>
        {msg.content}
        {msg.event && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(91,199,138,0.1)', border: '1px solid rgba(91,199,138,0.25)',
            fontSize: 12, color: '#5BC78A',
          }}>
            ✅ Événement créé : <strong>{msg.event.summary}</strong><br/>
            📅 {msg.event.date} à {msg.event.heure}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PageAssistant({ project }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Bonjour ! Dis-moi ce que tu veux ajouter à ton agenda.\n\nExemples :\n• "Réunion client lundi 14h"\n• "Appel comptable jeudi 10h30"\n• "Deadline Vigie Pro vendredi soir"' }
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const envoyer = async () => {
    if (!input.trim() || loading) return
    const texte = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: texte }])
    setLoading(true)

    try {
      // 1. GPT détecte la date/heure et le titre
      const today = new Date().toISOString().split('T')[0]
      const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 200,
          response_format: { type: 'json_object' },
          messages: [{
            role: 'user',
            content: `Aujourd'hui : ${today}. Analyse ce message et extrais les informations d'agenda.
Message : "${texte}"
Réponds UNIQUEMENT en JSON :
{"titre":"titre court de l'événement","date_rdv":"2026-04-14T10:00:00","detected":true}
Si aucune date/heure détectée : {"detected":false,"question":"question pour préciser"}
"demain" = ${new Date(Date.now()+86400000).toISOString().split('T')[0]}, "lundi" = prochain lundi, "soir" = 18h00`
          }]
        })
      })
      const gptData = await gptRes.json()
      const parsed = JSON.parse(gptData.choices[0].message.content)

      if (!parsed.detected) {
        setMessages(prev => [...prev, { role: 'assistant', content: `🤔 ${parsed.question || 'Peux-tu préciser la date et l\'heure ?'}` }])
        setLoading(false)
        return
      }

      // 2. Appelle n8n pour créer l'événement Google Calendar
      const n8nRes = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: parsed.titre, date_rdv: parsed.date_rdv })
      })

      if (!n8nRes.ok) throw new Error('Erreur n8n')
      const n8nData = await n8nRes.json()

      // 3. Formate la réponse
      const d = new Date(parsed.date_rdv)
      const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      const heureStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Parfait ! J'ai ajouté "${parsed.titre}" à ton Google Calendar.`,
        event: { summary: parsed.titre, date: dateStr, heure: heureStr }
      }])

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Erreur : ${err.message}. Vérifie que le workflow n8n est actif.`
      }])
    }
    setLoading(false)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header info */}
      <div style={{
        padding: '12px 16px', borderRadius: 12,
        background: 'rgba(91,163,199,0.06)', border: '1px solid rgba(91,163,199,0.15)',
        fontSize: 12, color: '#5BA3C7', flexShrink: 0,
      }}>
        🗓️ <strong>Assistant Agenda</strong> — Tape en langage naturel pour créer des événements dans ton Google Calendar.
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        gap: 4, paddingRight: 4,
      }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
            <div style={{
              padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              fontSize: 13, color: 'rgba(237,232,219,0.4)',
            }}>
              ⏳ Création de l'événement...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && envoyer()}
          placeholder='Ex: "Réunion client lundi 14h" ou "Deadline vendredi soir"'
          style={iS}
          disabled={loading}
        />
        <button
          onClick={envoyer}
          disabled={loading || !input.trim()}
          style={{
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: loading || !input.trim() ? `${project.color}40` : project.color,
            color: '#0D1B2A', fontSize: 13, fontWeight: 800,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? '⏳' : '➕ Ajouter'}
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'rgba(237,232,219,0.2)', textAlign: 'center', flexShrink: 0 }}>
        Connecté à Google Calendar via n8n · Les événements sont créés instantanément
      </p>
    </div>
  )
}
