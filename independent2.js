"use strict"

const { reject } = require("async")
const { RespawnPostLoadoutChange } = require("tf2/language")
const clog = require("./clog")
const console = {
    log: clog.vclog
}

async function main() {

    const sudts = require("./steamuserlogin")
    let m_sudts = await sudts.details()
        .catch((err) => {
            throw err // problem with setting cookies
        })

    const bll = require("./blacklist")
    let blacklist = new bll.blacklist()

    const scrape = require("./scrapewebsite")
    const metal = require("./metal")
    const trade = require("./trade")
    const smelt = require("./smelt")
    trade.tradeMon(m_sudts.manager) // TODO: run separately outside of function
    // const { None } = require("steam-user/resources/EClientUIMode")

    let my_bank = new metal.Bank()
    await metal.refreshInv(my_bank, m_sudts.manager, null, null)
        .catch((err) => {
            throw err // error with getting inventory
        })
    let tradecount_idx = 0 // TODO: tie to my_bank
    let prev_run_time = Date.now()
    let itemLoop = true
    const minWaitBtwReq = 0 //ms

    async function pool() {
        console.log("pooled")
    }

    async function man(itemName, itemURL) {
        // TODO: extract item URL from item name
        do {
            let gotoman = false, gotopool = false
            itemLoop = false //69

            let elapsed_time = Date.now() - prev_run_time
            // TODO: what if both reach this command at the same time? -> use a queue
            if (elapsed_time < minWaitBtwReq) {
                console.log(`Delaying scrape request for ${minWaitBtwReq - elapsed_time}`)
                setTimeout(() => { }, minWaitBtwReq - elapsed_time)
            }
            prev_run_time = Date.now()

            // scrape url, get info
            let scrape_res = await scrape.scrape(itemURL)
                .catch((err) => {
                    throw err // unknown issue, should not arise
                })

            // check if trade criteria is met
            let tradecriteria_met = false
            let sell_idx, buy_idx
            if (scrape_res.sellorders.length > 0 && scrape_res.buyorders.length > 0) {
                console.log("Hello") //69
                for (let x = 0; x < scrape_res.sellorders.length; x++) {
                    if (scrape_res.sellorders[x].auto) {
                        sell_idx = x
                        break
                    }
                }
                for (let x = 0; x < scrape_res.buyorders.length; x++) {
                    if (scrape_res.buyorders[x].auto) {
                        buy_idx = x
                        break
                    }
                }
                if (sell_idx && buy_idx) { // both are set
                    console.log("ym")
                    if (scrape_res.sellorders[sell_idx].list_price < scrape_res.buyorders[buy_idx].list_price) {
                        console.log("Hey") //69
                        tradecriteria_met = true
                    }
                }
            }

            // if (scrape_res.sellorders[0].data["data-listing_offers_url"] == "") {
            //     scrape_res.sellorders.shift() //69
            // }
            // scrape_res.buyorders.shift() //69

            // console.log(scrape_res.sellorders.length) //69
            // console.log(scrape_res.buyorders.length) //69
            // console.log(scrape_res.sellorders[0].list_price) //69
            // console.log(scrape_res.buyorders[0].list_price) //69
            // console.log(scrape_res.sellorders[0].auto) //69
            // console.log(scrape_res.buyorders[0].auto) //69
            tradecriteria_met = true //69

            if (!tradecriteria_met) continue

            // allocate our metal and buyer's metal
            let my_buyprice = scrape_res.sellorders[sell_idx].list_price
            let raw_change_weneed = 0
            // TODO: if second man function calls parseMyInv, it will not take into account the metal being used by first man function
            try {
                raw_change_weneed = metal.allocateMetal(my_bank, my_buyprice, tradecount_idx)
            } catch (err) {
                throw err // Unknown error: 042x3
            }

            let their_custom_selector = { // TODO: create standard custom selector class
                quality: scrape_res.sellorders[sell_idx].data["data-q_name"],
                name: scrape_res.sellorders[sell_idx].data["title"], // TODO: when to use data-base_name
                killstreak: null,
                wear: null,
                craftable: null,
                craft: null,
                custom_id: tradecount_idx,
                skipMetal: raw_change_weneed == 0
            }
            let their_suid = scrape_res.sellorders[sell_idx].suid
            let their_bank = new metal.Bank()
            await their_bank.refreshInvR(3, m_sudts.manager, their_suid, their_custom_selector)
                .catch((err) => {
                    console.log(err) // error with getting inventory
                    blacklist.push1(scrape_res.sellorders[sell_idx].data["data-listing_account_id"])
                    gotoman = true
                })
            if (gotoman) continue

            // TODO: run parsing/allocating of my and their inventory concurrently
            try {
                metal.allocateItems(their_bank, 1, tradecount_idx, tradecount_idx)
            } catch (err) {
                console.log(err) // error with getting inventory
                blacklist.push1(scrape_res.sellorders[sell_idx].data["data-listing_account_id"])
                gotoman = true
                // throw err // might be Unknown error: 042x4
            }
            if (gotoman) continue

            if (raw_change_weneed > 0) {
                // TODO: clean up logic here
                try {
                    metal.allocateMetal(their_bank, [0, 0, raw_change_weneed, 0], tradecount_idx)
                } catch (err) {
                    if (err == "Insufficient currency: 042x11") {
                        await new Promise((resolve, reject) => {
                            smelt.Man.on("smeltComplete", () => {
                                resolve(false)
                            })
                        })
                        try {
                            metal.allocateMetal(their_bank, [0, 0, raw_change_weneed, 0], tradecount_idx)
                        } catch (err) {
                            if (err == "Insufficient currency: 042x11") {
                                // legit insufficient currency
                                gotoman = true // redirect to man start
                            } else {
                                throw err // might be Unknown error: 042x4
                            }

                        }
                    } else {
                        throw err // might be Unknown error: 042x4
                    }
                }
            }

            if (gotoman) continue

            let my_items = my_bank.trades_setup.get(tradecount_idx)
            let their_items = their_bank.trades_setup.get(tradecount_idx)
            let their_tradeURL = scrape_res.sellorders[sell_idx].data["data-listing_offers_url"]
            // TODO: check that tradeurl is not empty, and belongs to owner
            console.log("indic2") //69
            console.log(my_items) //69
            console.log(their_items) //69
            console.log(their_tradeURL) //69

            let sentOffer_id = await trade.trade(m_sudts, my_items, their_items, their_tradeURL) // TODO: store their items/metal in trade setup too
                .catch(err => {
                    console.log(err) // error with getting inventory
                    blacklist.push1(scrape_res.sellorders[sell_idx].data["data-listing_account_id"])
                    gotoman = true
                    // throw err // some error with sending the trade
                })
            if (gotoman) continue
            console.log(my_bank)
            my_bank.free_setup(tradecount_idx) //TypeError: Cannot read property 'keys' of undefined, line 84 of metal
            console.log(sentOffer_id)

            // offer sent and confirmed, waiting for buyer to accept
            const buyerMonDelay = 5000
            const buyerMon = setInterval(() => {
                // TODO: constantly monitor if buyer still has enough metal while offer sent to seller is still pending
            }, buyerMonDelay)

            await trade.tradeResponse(sentOffer_id, 1)
                .then(completedOfr => {
                    return new Promise(async (resolve, reject) => {
                        console.log("Accepted!")
                        clearInterval(buyerMon)
                        completedOfr.getReceivedItems(async (err, items_received) => {
                            // find items to be used based on list of instance, class ids
                            console.log("Yay!")
                            tradecount_idx += 1
                            if (err) {
                                const a = completedOfr
                                reject("debug", "zz", "getReceiveditems", [a])
                                return
                                // throw err
                            }
                            my_items = [], their_items = []
                            let items_received_ids = []
                            for (let item of items_received) {
                                items_received_ids.push(item.assetid)
                            }

                            // construct trade where I sell the item
                            let my_sellprice = scrape_res.buyorders[buy_idx].list_price

                            their_suid = scrape_res.buyorders[buy_idx].suid
                            their_bank = new metal.Bank()
                            await their_bank.refreshInvR(3, m_sudts.manager, their_suid, null)
                                .catch((err) => {
                                    console.log(err) // error with getting inventory
                                    const a = their_bank, b = m_sudts.manager, c = their_suid, d = null
                                    reject(["debug", "zy", "refreshInv", [a, b, c, d]])
                                    return
                                    // blacklist.push1(scrape_res.buyorders[buy_idx].data["data-listing_account_id"])
                                    // gotoman = true
                                })


                            // their_bank.scrap = [] //69
                            console.log("indic3")
                            console.log(their_bank)
                            let raw_change_theyneed = 0

                            try {
                                raw_change_theyneed = metal.allocateMetal(their_bank, my_sellprice, tradecount_idx)
                            } catch (err) {
                                if (err == "Insufficient currency: 042x11") {
                                    reject(["blacklist", 2, null, null])
                                    return
                                } else {
                                    const a = their_bank, b = my_sellprice, c = tradecount_idx
                                    reject(["debug", "a", "allocateMetal", [a, b, c]])
                                    return
                                    // throw err // might be Unknown error: 042x4
                                }
                            }

                            console.log(their_bank)

                            let my_custom_selector = {
                                asset_ids: null, //items_received_ids,
                                quality: scrape_res.sellorders[buy_idx].data["data-q_name"],
                                name: scrape_res.sellorders[buy_idx].data["title"],
                                killstreak: null,
                                wear: null,
                                craftable: null,
                                craft: null,
                                custom_id: tradecount_idx,
                                skipMetal: raw_change_theyneed == 0
                            }

                            await metal.refreshInv(my_bank, m_sudts.manager, null, my_custom_selector)
                                .catch((err) => {
                                    const a = my_bank, b = m_sudts.manager, c = null, d = my_custom_selector
                                    reject(["debug", "b", "refreshInv", [a, b, c, d]])
                                    return
                                    // throw err // error with getting inventory
                                })
                            console.log("indic4")
                            console.log(my_bank)

                            try {
                                metal.allocateItems(my_bank, 1, tradecount_idx, tradecount_idx)
                            } catch (err) {
                                const a = my_bank, b = 1, c = tradecount_idx, d = tradecount_idx
                                reject(["debug", "c", "allocateItems", [a, b, c, d]])
                                return
                                // throw err // might be Unknown error: 042x4
                            }

                            if (raw_change_theyneed > 0) {
                                try {
                                    metal.allocateMetal(my_bank, [0, 0, raw_change_theyneed, 0], tradecount_idx)
                                } catch (err) {
                                    if (err == "Insufficient currency: 042x11") {
                                        // smelt metal, however may not have enough metal
                                        await new Promise((resolve2, reject) => {
                                            smelt.Man.on("smeltComplete", () => {
                                                resolve2(false)
                                                return
                                            })
                                        })
                                        try {
                                            metal.allocateMetal(my_bank, [0, 0, raw_change_theyneed, 0], tradecount_idx)
                                        } catch (err) {
                                            if (err == "Insufficient currency: 042x11") {
                                                // legit insufficient metal
                                                reject(["blacklist", 5, null, null])
                                                return
                                                // pool()
                                            } else {
                                                const a = my_bank, b = [0, 0, raw_change_theyneed, 0], c = tradecount_idx
                                                reject(["debug", "d", "allocateMetal", [a, b, c, d]])
                                                return
                                            }
                                            // throw err // might be Unknown error: 042x4
                                        }
                                    } else {
                                        const a = my_bank, b = [0, 0, raw_change_theyneed, 0], c = tradecount_idx
                                        reject(["debug", "e", "allocateMetal", [a, b, c, d]])
                                        return
                                    }
                                    // throw err // might be Unknown error: 042x4
                                }
                            }

                            console.log(my_bank)

                            my_items = my_bank.trades_setup.get(tradecount_idx)
                            their_items = their_bank.trades_setup.get(tradecount_idx)
                            their_tradeURL = scrape_res.buyorders[buy_idx].data["data-listing_offers_url"]

                            console.log("indic5")
                            console.log(my_items)
                            console.log(their_items)
                            console.log(their_tradeURL)
                            resolve({
                                my_items: my_items,
                                their_items: their_items,
                                their_tradeURL: their_tradeURL
                            })
                            return
                        })
                    })
                })
                .then(res => {
                    console.log("yooo")
                    console.log(res)
                    // console.log(m_sudts) 
                    // console.log(res.my_items) 
                    // console.log(res.their_items)
                    // console.log(res.their_tradeURL)
                    return trade.trade(m_sudts, res.my_items, res.their_items, res.their_tradeURL) // TODO: store their items/metal in trade setup too
                        .catch(err => {
                            reject(["blacklist", 3, null, null])
                            // throw err // some error with sending the trade
                        })
                })
                .then(sentOffer2_id => {
                    console.log("banger clanger")
                    console.log(sentOffer2_id)
                    my_bank.free_setup(tradecount_idx)
                    return trade.tradeResponse(sentOffer2_id, 4)
                })
                .then(completedOfr => {
                    console.log("TWICE Accepted!")
                })
                .catch(err => {
                    let type = err[0], id = err[1], class_name = err[2], args = err[3]
                    if (id === 1) {
                        blacklist.push1(scrape_res.sellorders[sell_idx].data["data-listing_account_id"])
                        gotoman = true
                    } else if (id === 2) {
                        blacklist.push2(scrape_res.buyorders[buy_idx].data["data-listing_account_id"])
                        gotopool = true
                    } else if (id === 3 || id === 4) {
                        blacklist.push3(scrape_res.buyorders[buy_idx].data["data-listing_account_id"])
                        gotopool = true
                    } else if (id === 5) {
                        gotopool = true
                    }
                    console.log(`ARGH: ${err}`)
                })

            if (gotoman) {
                continue
            }
            if (gotopool) {
                pool()
            }

            // trade.confMan.on("d" + sentOffer_id.toString(), confMan_decline)

            // trade.confMan.on("c" + sentOffer_id.toString(), (completedOfr) => {
            //     console.log("Accepted!")
            //     clearInterval(buyerMon)
            //     completedOfr.getReceivedItems(async (err, items_received) => {
            //         // find items to be used based on list of instance, class ids
            //         console.log("Yay!")
            //         tradecount_idx += 1
            //         if (err) throw err
            //         my_items = [], their_items = []
            //         let items_received_ids = []
            //         for (let item of items_received) {
            //             items_received_ids.push(item.assetid)
            //         }

            //         // construct trade where I sell the item
            //         let my_sellprice = scrape_res.buyorders[buy_idx].list_price

            //         their_suid = scrape_res.buyorders[buy_idx].suid
            //         their_bank = new metal.Bank()
            //         await their_bank.refreshInvR(3, m_sudts.manager, their_suid, null)
            //             .catch((err) => {
            //                 console.log(err) // error with getting inventory
            //                 blacklist.push1(scrape_res.buyorders[buy_idx].data["data-listing_account_id"])
            //                 continue
            //             })

            //         // their_bank.scrap = [] //69
            //         console.log("indic3")
            //         console.log(their_bank)
            //         let raw_change_theyneed = 0
            //         try {
            //             raw_change_theyneed = metal.allocateMetal(their_bank, my_sellprice, tradecount_idx)
            //         } catch (err) {
            //             throw err // Unknown error: 042x6
            //         }
            //         console.log(their_bank)

            //         let my_custom_selector = {
            //             asset_ids: null, //items_received_ids,
            //             quality: scrape_res.sellorders[buy_idx].data["data-q_name"],
            //             name: scrape_res.sellorders[buy_idx].data["title"],
            //             killstreak: null,
            //             wear: null,
            //             craftable: null,
            //             craft: null,
            //             custom_id: tradecount_idx,
            //             skipMetal: raw_change_theyneed == 0
            //         }

            //         await metal.refreshInv(my_bank, m_sudts.manager, null, my_custom_selector)
            //             .catch((err) => {
            //                 throw err // error with getting inventory
            //             })
            //         console.log("indic4")
            //         console.log(my_bank)

            //         try {
            //             metal.allocateItems(my_bank, 1, tradecount_idx, tradecount_idx)
            //         } catch (err) {
            //             throw err // might be Unknown error: 042x4
            //         }

            //         if (raw_change_theyneed > 0) {
            //             try {
            //                 metal.allocateMetal(my_bank, [0, 0, raw_change_theyneed, 0], tradecount_idx)
            //             } catch (err) {
            //                 if (err == "Insufficient currency: 042x11") {
            //                     // smelt metal, however may not have enough metal
            //                     await new Promise((resolve, reject) => {
            //                         smelt.Man.on("smeltComplete", () => {
            //                             resolve(false)
            //                         })
            //                     })
            //                     try {
            //                         metal.allocateMetal(my_bank, [0, 0, raw_change_theyneed, 0], tradecount_idx)
            //                     } catch (err) {
            //                         if (err == "Insufficient currency: 042x11") {
            //                             // legit insufficient metal
            //                             pool()
            //                         }
            //                         throw err // might be Unknown error: 042x4
            //                     }
            //                 }
            //                 throw err // might be Unknown error: 042x4
            //             }
            //         }

            //         console.log(my_bank)

            //         my_items = my_bank.trades_setup.get(tradecount_idx)
            //         their_items = their_bank.trades_setup.get(tradecount_idx)
            //         their_tradeURL = scrape_res.buyorders[buy_idx].data["data-listing_offers_url"]

            //         console.log("indic5")
            //         console.log(my_items)
            //         console.log(their_items)
            //         console.log(their_tradeURL)

            //         let sentOffer2_id = await trade.trade(m_sudts, my_items, their_items, their_tradeURL) // TODO: store their items/metal in trade setup too
            //             .catch(err => {
            //                 throw err // some error with sending the trade
            //             })
            //         my_bank.free_setup(tradecount_idx)
            //         trade.confMan.on("c" + sentOffer2_id.toString(), (completedOfr) => {
            //             console.log("TWICE Accepted!")
            //         })
            //     })
            // })
        } while (itemLoop)
    }
    await man("test name", "https://backpack.tf/stats/Unique/Hermes/Tradable/Craftable")
    // for (let x = 0; x < namelist.length; x++) {
    //     man(namelist[x], null) // do not await to run concurrently
    // }
}

main()