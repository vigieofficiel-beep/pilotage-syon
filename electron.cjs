const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

let mainWindow
let browserWindows = {}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Pilotage Syon',
    backgroundColor: '#0D1B2A',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    titleBarStyle: 'default',
  })

  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── INJECTION NAVIGATEUR ─────────────────────────────────────────
ipcMain.handle('publish-post', async (event, { platform, contenu }) => {
  const urls = {
    linkedin:  'https://www.linkedin.com/feed/',
    facebook:  'https://www.facebook.com/',
    discord:   'https://discord.com/channels/@me',
    youtube:   'https://studio.youtube.com/',
    twitter:   'https://twitter.com/compose/tweet',
    instagram: 'https://www.instagram.com/',
    tiktok:    'https://www.tiktok.com/upload',
    threads:   'https://www.threads.net/',
  }

  const url = urls[platform] || urls.linkedin

  if (browserWindows[platform] && !browserWindows[platform].isDestroyed()) {
    browserWindows[platform].close()
  }

  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    title: `Publier sur ${platform}`,
    backgroundColor: '#0D1B2A',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      webSecurity: false,
    },
  })

  browserWindows[platform] = win

  await win.loadURL(url, {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  })

  win.webContents.on('did-finish-load', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))

    const scripts = {
      linkedin: `
        (function() {
          const btn = document.querySelector('[data-control-name="share.sharebox_prompt_button"], .share-box-feed-entry__trigger');
          if (btn) { btn.click(); }
          setTimeout(() => {
            const editor = document.querySelector('.ql-editor, [contenteditable="true"], [role="textbox"]');
            if (editor) {
              editor.focus();
              editor.innerHTML = '';
              document.execCommand('insertText', false, ${JSON.stringify(contenu)});
            }
          }, 1500);
        })();
      `,
      twitter: `
        (function() {
          const editor = document.querySelector('[data-testid="tweetTextarea_0"], [contenteditable="true"]');
          if (editor) { editor.focus(); document.execCommand('insertText', false, ${JSON.stringify(contenu)}); }
        })();
      `,
      discord: `
        (function() {
          const editor = document.querySelector('[data-slate-editor="true"], [contenteditable="true"]');
          if (editor) { editor.focus(); document.execCommand('insertText', false, ${JSON.stringify(contenu)}); }
        })();
      `,
    }

    const script = scripts[platform] || `
      (function() {
        const editor = document.querySelector('[contenteditable="true"], textarea');
        if (editor) {
          editor.focus();
          if (editor.tagName === 'TEXTAREA') { editor.value = ${JSON.stringify(contenu)}; }
          else { document.execCommand('insertText', false, ${JSON.stringify(contenu)}); }
        }
      })();
    `

    try { await win.webContents.executeJavaScript(script) }
    catch(e) { console.error('Injection error:', e) }
  })

  return { success: true }
})

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (mainWindow === null) createWindow() })
