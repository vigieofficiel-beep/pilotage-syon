const { app, BrowserWindow, ipcMain, session } = require('electron')
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

// ── INJECTION NAVIGATEUR AVEC SESSION PERSISTANTE ─────────────────
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

  // Ferme la fenêtre existante si elle existe
  if (browserWindows[platform] && !browserWindows[platform].isDestroyed()) {
    browserWindows[platform].focus()
    // Réinjecte sur la page déjà ouverte
    try {
      await browserWindows[platform].webContents.executeJavaScript(buildScript(platform, contenu))
    } catch(e) { console.error(e) }
    return { success: true }
  }

  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    title: `Publier sur ${platform} — Pilotage`,
    backgroundColor: '#0D1B2A',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      webSecurity: false,
      // SESSION PERSISTANTE — les cookies sont gardés entre les sessions
      partition: `persist:pilotage_${platform}`,
    },
  })

  browserWindows[platform] = win
  win.on('closed', () => { delete browserWindows[platform] })

  await win.loadURL(url, {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  })

  win.webContents.on('did-finish-load', async () => {
    // Copie dans le presse-papier en fallback
    await win.webContents.executeJavaScript(`
      navigator.clipboard.writeText(${JSON.stringify(contenu)}).catch(()=>{})
    `).catch(() => {})

    // Attendre que la page soit prête
    await new Promise(resolve => setTimeout(resolve, 2500))

    try {
      await win.webContents.executeJavaScript(buildScript(platform, contenu))
    } catch(e) {
      console.error('Injection error:', e)
    }
  })

  return { success: true }
})

function buildScript(platform, contenu) {
  const escaped = JSON.stringify(contenu)

  const scripts = {
    linkedin: `
      (function() {
        // Essai 1 : bouton "Démarrer un post"
        const btn = document.querySelector(
          '[data-control-name="share.sharebox_prompt_button"], ' +
          '.share-box-feed-entry__trigger, ' +
          'button.artdeco-button--muted'
        );
        if (btn) btn.click();

        setTimeout(() => {
          const editor = document.querySelector(
            '.ql-editor[contenteditable="true"], ' +
            '[data-placeholder][contenteditable="true"], ' +
            '[role="textbox"][contenteditable="true"]'
          );
          if (editor) {
            editor.focus();
            editor.innerHTML = '';
            document.execCommand('insertText', false, ${escaped});
            // Notification React/Vue que le contenu a changé
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, 1800);
      })();
    `,

    facebook: `
      (function() {
        // Cherche la zone de création de post
        const btn = document.querySelector(
          '[aria-label="Créer une publication"], ' +
          '[data-testid="status-attachment-mentions-input"], ' +
          '[role="button"][tabindex="0"]'
        );
        if (btn) btn.click();

        setTimeout(() => {
          const editor = document.querySelector(
            '[contenteditable="true"][role="textbox"], ' +
            '[data-lexical-editor="true"]'
          );
          if (editor) {
            editor.focus();
            document.execCommand('insertText', false, ${escaped});
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, 1800);
      })();
    `,

    discord: `
      (function() {
        const editor = document.querySelector(
          '[data-slate-editor="true"], ' +
          '[role="textbox"][contenteditable="true"]'
        );
        if (editor) {
          editor.focus();
          document.execCommand('insertText', false, ${escaped});
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })();
    `,

    twitter: `
      (function() {
        const editor = document.querySelector(
          '[data-testid="tweetTextarea_0"], ' +
          '[contenteditable="true"][role="textbox"]'
        );
        if (editor) {
          editor.focus();
          document.execCommand('insertText', false, ${escaped});
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })();
    `,

    youtube: `
      (function() {
        // Studio YouTube — champ description
        const editor = document.querySelector(
          '#description-textarea, ' +
          'ytcp-mention-textbox [contenteditable="true"], ' +
          'textarea[aria-label]'
        );
        if (editor) {
          editor.focus();
          if (editor.tagName === 'TEXTAREA') {
            editor.value = ${escaped};
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            document.execCommand('insertText', false, ${escaped});
          }
        }
      })();
    `,

    instagram: `
      (function() {
        const editor = document.querySelector(
          'textarea[aria-label], ' +
          '[contenteditable="true"]'
        );
        if (editor) {
          editor.focus();
          if (editor.tagName === 'TEXTAREA') {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            nativeInputValueSetter.call(editor, ${escaped});
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            document.execCommand('insertText', false, ${escaped});
          }
        }
      })();
    `,

    tiktok: `
      (function() {
        const editor = document.querySelector(
          '[contenteditable="true"], ' +
          'textarea'
        );
        if (editor) {
          editor.focus();
          if (editor.tagName === 'TEXTAREA') {
            editor.value = ${escaped};
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            document.execCommand('insertText', false, ${escaped});
          }
        }
      })();
    `,

    threads: `
      (function() {
        const editor = document.querySelector(
          '[contenteditable="true"][role="textbox"], ' +
          'textarea'
        );
        if (editor) {
          editor.focus();
          document.execCommand('insertText', false, ${escaped});
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })();
    `,
  }

  return scripts[platform] || `
    (function() {
      const editor = document.querySelector('[contenteditable="true"], textarea');
      if (editor) {
        editor.focus();
        if (editor.tagName === 'TEXTAREA') {
          editor.value = ${escaped};
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          document.execCommand('insertText', false, ${escaped});
        }
      }
    })();
  `
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (mainWindow === null) createWindow() })
