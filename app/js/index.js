'use strict'
const GMR = require('../gmr.js')
const angular = require('angular')
const moment = require('moment')
const os = require('os')
const remote = require('electron').remote
const dialog = remote.dialog
const HomeFolder = remote.app.getPath('home')
const Menu = remote.Menu

// http://electron.atom.io/docs/v0.30.0/api/menu/
const template = [
  {
    label: 'Application',
    submenu: [
      {
        label: 'About Application',
        selector: 'orderFrontStandardAboutPanel:' //FIXME only works on OSX
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: function() {remote.app.exit(0);}
      }
    ]
  }, 
  {
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
      { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
      { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' }
    ]
  }, 
  {
    label: 'View',
    submenu: [
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: function() { remote.getCurrentWindow().reload(); }
      }, 
      { type: 'separator' },
      {
        label: 'Toggle DevTools',
        accelerator: 'Alt+CmdOrCtrl+I',
        click: function() { remote.getCurrentWindow().toggleDevTools(); }
      }
    ]
  }
]

Menu.setApplicationMenu(Menu.buildFromTemplate(template))



/* Here begins Angular */
let app = angular.module('eGMR', [])
let gmr = new GMR()

app.controller('GlobalController', function ($scope, $timeout) {
  // $scope.players = []
  // $scope.games = []
  $scope.selectedGame = {}
  $scope.playerId = -1
  $scope.isSettingsSelected = false

  $scope.settings = gmr.getSettings()

  $scope.loadFromGMR = function () {
    gmr.fetchInfo((err, infos) => {
      return $scope.$apply(() => {
        if (err) return showError(err)
        $scope.players = infos.players
        $scope.games = infos.games
        $scope.settings = gmr.getSettings()
        $scope.selectedGame = $scope.games[0]
        $scope.playerId = gmr.getPlayerId()
        $scope.$broadcast('selectedGameWasUpdated')
      })
    })
  }

  if (!$scope.settings.saveFile || !$scope.settings.authKey) {
    $scope.isSettingsSelected = true
  } else {
    $scope.loadFromGMR()
  }

  $scope.setSelectedGame = function (game) {
    $scope.selectedGame = game

    $scope.isSettingsSelected = false
    $scope.$broadcast('settingsTabWasExited')

    return $scope.$broadcast('selectedGameWasUpdated')
  }
  
  $scope.showSettings = function () {
    $scope.isSettingsSelected = true
  }

  function showError (err) {
    $scope.error = err
    return $timeout(() => {$scope.error=''}, 10000)
  }

  $scope.$on('error', (err) => {
    return showError(err)
  })

  $scope.filterPlayers = function filterPlayers (game) {
    return function (player) {
      return player.UserId !== '0' && player.UserId !== game.CurrentTurn.UserId
    }
  }

})

app.controller('GameInfoController', function ($scope, $timeout) {
  $scope.timeRemaining = '∞'

  $scope.$on('selectedGameWasUpdated', () => {
    const expires = $scope.selectedGame.CurrentTurn.Expires
    return $scope.timeRemaining = expires ? moment(expires).fromNow(true) : '∞'
  })

  $scope.downloadSave = function () {
    console.log(`Downloading...${$scope.selectedGame.GameId}`)
    $scope.isLoading = true 
    return gmr.getGameSave($scope.selectedGame.GameId, (err) => {
      if (err) return $scope.$emit('error', err)
      return $scope.$apply(() => { 
        $scope.downloaded = true
        $scope.isLoading = false 
        return $timeout(() => {$scope.downloaded = false}, 5000)
      })
    })
  }

  $scope.uploadSave = function () {
    $scope.isLoading = true 
    return gmr.uploadGameSave($scope.selectedGame.CurrentTurn.TurnId, (err) => {
      if (err) return $scope.$emit('error', err)
      return $scope.$apply(() => { 
        $scope.uploaded = true
        $scope.isLoading = false 
        return $timeout(() => {$scope.uploaded = false}, 5000)
      })
    })
  }

  $scope.launchCivilization = function () {
    const commands = {
      darwin:'open',
      windows:'cmd /c start', //TODO test
      linux:'xdg-open', //TODO check if xdg-open is installed (xdg-utils)
      openbsd:'xdg-open', //TODO test
      freebsd:'xdg-open', //TODO test
    }
    const runCommand = commands[os.platform()]

    const spawn = require('child_process').spawn;
    const child = spawn(runCommand, ['steam://run/8930'], {
      detached: true,
      stdio: [ 'ignore', 'ignore', 'ignore' ]
    })
    child.unref();
  }

})

app.controller('GameListController', function ($scope) {})

app.controller('SettingsController', function ($scope) {
  $scope.settings = gmr.getSettings()
  
  $scope.$on('settingsTabWasExited', () => {
    return $scope.cancelSettings()
  })

  $scope.changeSaveFile = function () {
    let defaultPath = HomeFolder
    if ($scope.settings.saveFile) {
      defaultPath = $scope.settings.saveFile
    }
    let newSave = dialog.showOpenDialog({defaultPath: defaultPath,  properties: ['openDirectory']})
    if (newSave) {
      $scope.settings.saveFile = newSave[0] + '/(GMR) Play this one!.Civ5Save'
    }
  }

  $scope.saveSettings = function () {
    gmr.setSettings($scope.settings)
    return $scope.loadFromGMR()
  }

  $scope.cancelSettings = function () {
    $scope.settings = gmr.getSettings()
  }
})
