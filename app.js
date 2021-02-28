"use strict"

const sudts = require("./steamuserlogin")
let m_sudts = await sudts.details()

const scrape = require("./scrapewebsite")
const metal = require("./metal")
const trade = require("./trade")
const { None } = require("steam-user/resources/EClientUIMode")

let my_bank = await metal.parseMyInv(m_sudts.manager) // TODO: centralise all operations to bank

let tradecount_idx = 0
let prev_run_time = Date.now()

async function man(itemName, itemURL) {
    let itemLoop = true
    const minWaitBtwReq = 5000 //ms
    while (itemLoop) {
        let elapsed_time = Date.now() - prev_run_time
        // TODO: what if both reach this command at the same time? -> use a queue
        if (elapsed_time < minWaitBtwReq) {
            console.log(`Delaying scrape request for ${minWaitBtwReq - elapsed_time}`)
            setTimeout(() => { }, minWaitBtwReq - elapsed_time)
        }
        prev_run_time = Date.now()
        // scrape url, get info
        let scrape_res = await scrape.scrape(itemURL)
        // check if trade criteria is met
        let tradecriteria_met
        if (scrape_res.sellorders.length > 0 && scrape_res.buyorders.length > 0) {
            if (scrape_res.sellorders[0].list_price < scrape_res.buyorders[0].list_price) {
                if (scrape_res.sellorders[0].auto && scrape_res.buyorders[0].auto) {
                    // TODO: trade requirement met
                    tradecriteria_met = true
                }
            }
        }
        if (!tradecriteria_met) continue
        // allocate our metal and buyer's metal
        let my_buyprice = scrape_res.sellorders[0].list_price
        // TODO: if second man function calls parseMyInv, it will not take into account the metal being used by first man function
        let allo_res = await metal.allocateMyMetal(my_bank, my_buyprice, tradecount_idx)
        if (allo_res.err) {
            throw "Unknown error: 042x3"
        }
        // my_bank = allo_res.bank // contains staged trade
        let their_custom_selector = {
            quality: scrape_res.sellorders[0]["data-q_name"],
            name: scrape_res.sellorders[0]["data-name"], // TODO: when to use data-base_name
            killstreak: null,
            wear: null,
            craftable: null,
            craft: null,
            custom_id: tradecount_idx
        }
        let their_suid = scrape_res.sellorders[0].suid
        let their_bank = await metal.parseTheirInv(their_suid, m_sudts.manager, their_custom_selector) // TODO: only parse until sufficient items/metal is found
        // TODO: run parsing/allocating of my and their inventory concurrently

        let allo_res = await metal.allocateTheirItems(their_bank, 1, tradecount_idx, tradecount_idx)
        if (allo_res.err) {
            throw "Unknown error: 042x4"
        }

        let my_items = my_bank.trades_setup.get(tradecount_idx)
        let their_items = their_bank.trades_setup.get(tradecount_idx)
        let their_tradeURL = scrape_res.sellorders[0]["data-listing_offers_url"]
        trade.tradeMon(m_sudts.manager) // TODO: run separately outside of function
        trade.trade1(my_items, their_items, their_tradeURL) // TODO: store their items/metal in trade setup too
            .then(sentOffer_id => {
                // offer sent and confirmed, waiting for buyer to accept
                let stopBuyerMon = false, buyerMonDelay = 5000
                trade.confman.on("c" + sentOffer_id.toString(), (completedOfr) => {
                    console.log("Accepted!")
                    stopBuyerMon = true
                    completedOfr.getReceivedItems((err, items) => {
                        // find items to be used based on list of instance, class ids
                        trade.trade2()
                    })
                })
                while (!stopBuyerMon) {
                    setTimeout(() => {
                        // constantly monitor if buyer still has enough metal while offer sent to seller is still pending
                    }, buyerMonDelay)
                }
            })
    }
}
await man("test", "testURL")