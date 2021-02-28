"use strict"

const ETradeOfferState = require("steam-tradeoffer-manager/resources/ETradeOfferState")

const EventEmitter = require('events');
class MyEmitter extends EventEmitter { }
const confMan = new MyEmitter();
const confManE = new MyEmitter()

let sentOffersMon = []

exports.sofrmon = sentOffersMon

exports.confMan = confMan
exports.confManE = confManE

exports.tradeMon = async (manager) => {
    manager.on("sentOfferChanged", (offer, oldstate) => {
        if (sentOffersMon.includes(offer.id)) {
            sentOffersMon.splice(sentOffersMon.indexOf(offer.id), 1)
            if (offer.state == ETradeOfferState["Accepted"]) {
                // Trade complete
                console.log(offer.id)
                confMan.emit("c" + offer.id.toString(), offer)
            } else if (offer.state != ETradeOfferState["Active"]) {
                // Decline trade
                confMan.emit("d" + offer.id.toString(), offer)
                offer.decline(err => {
                    if (err) confManE.emit("err", err) 
                    // throw err
                })

            }
        }
    })
}

exports.tradeResponse = async function (sentOffer_id, reject_value, bmonMan) {
    return new Promise((resolve, reject) => {
        let bmonMan_errorhandler = err => {
            reject(err)
            bmonMan.removeListener("error", bmonMan_errorhandler)
            return
        }
        bmonMan.on("error", bmonMan_errorhandler)

        let confMan_listeners = {}
        let confMan_decline = completedOfr => {
            // trade declined or some variant of cancellation/countering
            reject(["blacklist", reject_value, null, null])
            confMan.removeListener("d" + sentOffer_id.toString(), confMan_listeners["d"])
            confMan.removeListener("c" + sentOffer_id.toString(), confMan_listeners["c"])
            bmonMan.emit("bmonEnd")
            bmonMan.removeListener("error", bmonMan_errorhandler)
        }
        let confMan_accept = completedOfr => {
            resolve(completedOfr)
            confMan.removeListener("d" + sentOffer_id.toString(), confMan_listeners["d"])
            confMan.removeListener("c" + sentOffer_id.toString(), confMan_listeners["c"])
            bmonMan.emit("bmonEnd")
            bmonMan.removeListener("error", bmonMan_errorhandler)
        }
        confMan_listeners = {
            c: confMan_accept,
            d: confMan_decline
        }
        confMan.on("d" + sentOffer_id.toString(), confMan_decline)
        confMan.on("c" + sentOffer_id.toString(), confMan_accept)
    })
}

exports.trade = async function (creds, myItems, theirItems, tradeURL, error_id) {
    // TODO: make rejects follow error format of type, id, class_name, arg_list
    // console.log("lets bounce!")
    let manager = creds.manager, community = creds.community
    let identity_secret = creds.id_secret
    return new Promise(async (resolve, reject) => {
        let myTradeOffer = manager.createOffer(tradeURL)

        for (let asset_type of ["keys", "ref", "rec", "scrap", "custom"]) {
            if (myItems[asset_type]) {
                for (let asset of myItems[asset_type]) {
                    // add asset to trade
                    myTradeOffer.addMyItem({
                        assetid: asset.asset_id,
                        appid: 440,
                        contextid: 2,
                        amount: 1
                    })
                }
            }
            if (theirItems[asset_type]) {
                for (let asset of theirItems[asset_type]) {
                    // add asset to trade
                    myTradeOffer.addTheirItem({
                        assetid: asset.asset_id,
                        appid: 440,
                        contextid: 2,
                        amount: 1
                    })
                }
            }
        }

        // console.log("bouncing")
        myTradeOffer.send((err, status) => {
            // console.log("baaa")
            if (err) {
                const a = myTradeOffer, b = err, c = status
                reject("trade", error_id, "send", [a], [b, c])
                return
            } 
            // console.log("booo")
            // console.log(status)
            if (status == "pending") {
                // console.log("yaaa")
                community.acceptConfirmationForObject(identity_secret, myTradeOffer.id, err => {
                    if (err) {
                        const a = identity_secret, b = myTradeOffer.id, c = err
                        reject("trade", error_id + 1, "acceptConfirmationForObject", [a, b], [c])
                        return
                    }
                    // Trade successfully confirmed
                    sentOffersMon.push(myTradeOffer.id)
                    console.log(`a ${myTradeOffer.id}`)
                    resolve(myTradeOffer.id)
                })
            }
        })
    })
}

exports.trade1 = async function (manager, community, myItems, theirItems, tradeURL) {
    return new Promise(async (resolve, reject) => {
        let myTradeOffer = manager.createOffer(tradeURL)
        for (let currency_type of ["keys", "ref", "rec", "scrap"]) {
            for (let asset of myItems[currency_type]) {
                // add asset to trade
                myTradeOffer.addMyItem({
                    assetid: asset.asset_id,
                    appid: 440,
                    contextid: 2,
                    amount: 1
                })
            }
        }

        for (let asset of theirItems.custom) {
            myTradeOffer.addTheirItem({
                assetid: asset.asset_id,
                appid: 440,
                contextid: 2,
                amount: 1
            })
        }

        myTradeOffer.send((err, status) => {
            if (err) reject(err)
            if (status == "pending") {
                community.acceptConfirmationForObject(_identity_secret, myTradeOffer.id, err => {
                    if (err) reject(err)
                    // Trade successfully confirmed
                    sentOffersMon.push(myTradeOffer.id)
                    console.log(`a ${myTradeOffer.id}`)
                    resolve(myTradeOffer.id)
                    return myTradeOffer.id
                })
            }
        })
    })
}

exports.trade2 = async function (manager, community, myItems, theirItems, tradeURL) {
    return new Promise(async (resolve, reject) => {
        // let tradeURL = "https://steamcommunity.com/tradeoffer/new/?partner=318236971&token=ujQ1I_7K"
        let myTradeOffer = manager.createOffer(tradeURL)
        for (let currency_type of ["keys", "ref", "rec", "scrap"]) {
            for (let asset of theirItems[currency_type]) {
                // add asset to trade
                myTradeOffer.addTheirItem({
                    assetid: asset.asset_id,
                    appid: 440,
                    contextid: 2,
                    amount: 1
                })
            }
        }

        // console.log(theirItems.custom[0].asset_id)

        for (let asset of myItems.custom) {
            myTradeOffer.addMyItem({
                assetid: asset.asset_id,
                appid: 440,
                contextid: 2,
                amount: 1
            })
        }

        myTradeOffer.send((err, status) => {
            if (err) throw err
            if (status == "pending") {
                community.acceptConfirmationForObject(_identity_secret, myTradeOffer.id, err => {
                    if (err) throw err
                    // Trade successfully confirmed
                    sentOffersMon.push(myTradeOffer.id)
                    console.log(`a ${myTradeOffer.id}`)
                    resolve(myTradeOffer.id)
                    return myTradeOffer.id
                })
            }
        })
    })
}