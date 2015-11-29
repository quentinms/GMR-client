'use strict'
let GMR = require('../gmr.js')
let angular = require('angular')
let moment = require('moment')
let remote = require('remote')
let dialog = remote.require('dialog')
const HomeFolder = remote.require('app').getPath('home')

let app = angular.module("eGMR", [])
let gmr = new GMR()

let placeholder = [{
  "Name":"Loading",
  "GameId":0,
  "Players":[],
  "CurrentTurn":{
    "TurnId":1921429,
    "Number":80,
    "UserId":"76561198001984842",
    "Started":"1970-01-29T22:36:19.11",
    "Expires":"1970-01-03T02:36:19.11",
    "Skipped":false,
    "PlayerNumber":2,
    "IsFirstTurn":false
  },
  "Type":0
}, {
  "Name":"...",
  "GameId":-1,
  "Players":[],
  "CurrentTurn":{
    "TurnId":1921429,
    "Number":80,
    "UserId":"76561198001984842",
    "Started":"2015-10-29T22:36:19.11",
    "Expires":"2015-11-03T02:36:19.11",
    "Skipped":false,
    "PlayerNumber":2,
    "IsFirstTurn":false
  },
  "Type":0
}
]

app.controller('GlobalController', function ($scope, $timeout) {
  $scope.players = []
  $scope.games = placeholder
  $scope.selectedGame = $scope.games[0]
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
    return $timeout(() => {$scope.error=''}, 5000)
  }

  $scope.$on('error', (err) => {
    return showError(err)
  })

})

app.controller('GameInfoController', function ($scope, $timeout) {
  $scope.timeRemaining = '9000 years'

  $scope.filterPlayers = filterPlayers($scope.selectedGame)

  $scope.$on('selectedGameWasUpdated', () => {
    return $scope.timeRemaining = moment($scope.selectedGame.CurrentTurn.Expires).fromNow(true)
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

})

app.controller('GameListController', function ($scope) {
  return $scope.filterPlayers = filterPlayers
})

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

function filterPlayers (game) {
  return function (player) {
    return player.UserId !== '0' && player.UserId !== game.CurrentTurn.UserId
  }
}
