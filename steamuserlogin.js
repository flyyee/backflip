

let SteamUser = require("steam-user")
let client = new SteamUser()

const SteamCommunity = require('steamcommunity');
let community = new SteamCommunity();
let manager = null

if (!_loginKey) {
    try {
        client.logOn({
            accountName: _username,
            loginKey: _loginKey
        })
    }
    catch (err) {  // TODO: check if works when loginkey expires/incorrect <- caused by another login
        client.logOn({
            accountName: _username,
            password: _password,
            rememberPassword: true
        })
    }
} else {
    client.logOn({
        accountName: _username,
        password: _password,
        rememberPassword: true
    })
}


client.on("loginKey", (key) => {
    console.log(`New login key: ${key}`)
})

let details_loaded = false

exports.are_details_loaded = function() {
    return details_loaded
}

exports.creds = function() {
    return {
        community: community,
        manager: manager
    }
}

exports.details = async function () {
    return new Promise((resolve, reject) => {
        client.on("webSession", (sessionID, cookies) => {
            var TradeOfferManager = require('steam-tradeoffer-manager');
            manager = new TradeOfferManager({
                "steam": client,
                "domain": "example.com", // Fill this in with your own domain
                "language": "en"
            });
            
            community.setCookies(cookies)
    
            manager.setCookies(cookies, (err) => {
                if (err) reject(err)
            })
    
            details_loaded = true
    
            resolve ({
                client: client,
                community: community,
                manager: manager,
                id_secret: _identity_secret
            })
        })
    })
    
}