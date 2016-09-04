'use strict'
const app = require('electron').app
const BrowserWindow = require('electron').BrowserWindow

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
})
