'use strict'
const request      = require('request').defaults({forever: true})
const async        = require('async')
const JSONbig      = require('json-bigint');
const _            = require('lodash')
const util         = require('util')
const fs           = require('fs')
const Config       = require('./config/gmr.json')

module.exports = GMR

let host = 'http://multiplayerrobot.com/api/Diplomacy/'

function GMR () {
  let self = this

  this.authKey = Config.authKey
  this.saveFile = Config.saveFile

  this.playerId 
  this.games
  this.players

  this.authenticateUser = function (authKey, callback) {
    let uri = `${host}AuthenticateUser?authKey=${self.authKey}`
    return request.get(uri, {timeout: 5000}, (err, res, body) => {
      if (err) return callback(err)
      return callback(null, body)
    })
  }

  this.getGamesAndPlayers = function (playerIds, authKey, callback) {
    if (false === _.isArray(playerIds)) {
      playerIds = [playerIds]
    }
    let uri = `${host}GetGamesAndPlayers?playerIDText=${playerIds.join('_')}&authKey=${self.authKey}`
    return request.get(uri, {timeout: 5000}, (err, res, body) => {
      if (err) return callback(err)
      return callback(null, body)
    })
  } 

}


GMR.prototype.fetchInfo = function (callback) {
  let self = this
  return async.series([
    function auth (callback) {
      self.authenticateUser(self.authKey, (err, id) => {
        if (err) return callback (err)
        self.playerId = id
        return callback(null)
      })
    }, 
    function getGames (callback) {
      self.getGamesAndPlayers(self.playerId, self.authKey, (err, gamesAndPlayers) => {
        if (err) return callback (err)
        self.games = JSONbig.parse(gamesAndPlayers).Games
        _.forEach(self.games, game => {
          game.CurrentTurn.UserId = game.CurrentTurn.UserId.toString()
          _.forEach(game.Players, player => {
            player.UserId = player.UserId.toString()
            // Normalize TurnOrder such that current player's turn order is 0, second is 1, etc.
            player.TurnOrder = (player.TurnOrder - game.CurrentTurn.PlayerNumber + game.Players.length ) % game.Players.length 
          })
        })

        return callback(null)
      })
    }, 
    function getPlayers (callback) {
      let playerIds = _(self.games).map('Players').flatten()
        .map('UserId').uniq().filter(n => n !== 0)
        .value()
      self.getGamesAndPlayers(playerIds, self.authKey, (err, gamesAndPlayers) => {
        if (err) return callback (err)

        self.players = _.reduce(JSONbig.parse(gamesAndPlayers).Players, (ps, p) => {
          p.SteamID = p.SteamID.toString()
          p.AvatarUrl = p.AvatarUrl.split('.jpg')[0]+'_full.jpg' // better picture
          ps[p.SteamID] = p
          return ps
        }, {})
        return callback(null)
      })
    }
  ], (err) => {
    if (err) return callback(err)
    return callback(null, {
      players: self.players, 
      games: self.games
    })
  })
}

GMR.prototype.getPlayerId = function () {
  console.log(this.playerId)
  return this.playerId
}

GMR.prototype.getPlayers = function () {
  console.log(this.players)
  return this.players
}

GMR.prototype.getGames = function () {
  console.log(this.games)
  return this.games
}

GMR.prototype.getGameSave = function (gameId, callback) {
  let uri = `${host}GetLatestSaveFileBytes?authKey=${this.authKey}&gameId=${gameId}`

  return request(uri, {timeout: 30000}).pipe(fs.createWriteStream(this.saveFile))
    .on('error', (err) => callback(err))
    .on('finish', callback)
}

GMR.prototype.uploadGameSave = function (turnId, callback) {
  let uri = `${host}SubmitTurn?authKey=${this.authKey}&turnId=${turnId}`
  return fs.createReadStream(this.saveFile)
    .pipe(request.post(uri, {timeout: 30000}))
    .on('error', (err) => callback(err))
    .on('response', function(response) {
      console.log(response.statusCode)
      console.log(response)
    })
    .on('end', callback)
}

GMR.prototype.getSettings = function () {
  return {
    saveFile: this.saveFile,
    authKey: this.authKey
  }
}

GMR.prototype.setSettings = function (settings) {
  this.saveFile = settings.saveFile
  this.authKey = settings.authKey
  return fs.writeFileSync(__dirname + '/config/gmr.json', JSON.stringify(settings, null, 2))
}
