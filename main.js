'use strict'
const app = require('electron').app
const BrowserWindow = require('electron').BrowserWindow
const Menu = require('electron').Menu

// adds debug features like hotkeys for triggering dev tools and reload
//require('electron-debug')({showDevTools: true})

// prevent window being garbage collected
let mainWindow

function onClosed() {
  // dereference the window
  // for multiple windows store them in an array
  mainWindow = null
}

function createMainWindow() {
  const win = new BrowserWindow({
    minWidth : 800,
    minHeight: 600
  })

  win.loadURL(`file://${__dirname}/app/index.html`)
  win.on('closed', onClosed)

  return win
}

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate-with-no-open-windows', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow()
  }
})

app.on('ready', () => {
  mainWindow = createMainWindow()

  // http://electron.atom.io/docs/api/menu/
  const template = [
    {
      label: 'Edit',
      submenu: [
        {
          role: 'undo'
        },
        {
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          role: 'cut'
        },
        {
          role: 'copy'
        },
        {
          role: 'paste'
        },
        {
          role: 'pasteandmatchstyle'
        },
        {
          role: 'delete'
        },
        {
          role: 'selectall'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload()
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools()
          }
        },
        {
          type: 'separator'
        },
        {
          role: 'resetzoom'
        },
        {
          role: 'zoomin'
        },
        {
          role: 'zoomout'
        },
        {
          type: 'separator'
        },
        {
          role: 'togglefullscreen'
        }
      ]
    },
    {
      role: 'window',
      submenu: [
        {
          role: 'minimize'
        },
        {
          role: 'close'
        }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click () { require('electron').shell.openExternal('http://electron.atom.io') }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
})
