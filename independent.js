"use strict"

async function main() {
    
    const sudts = require("./steamuserlogin")
    // console.log(sudts.b())
    // return
    let m_sudts = await sudts.details()

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    await sleep(10000)
    console.log(sudts.are_details_loaded())
    m_sudts = sudts.creds()
    // console.log(sudts.creds())

    const scrape = require("./scrapewebsite")
    const metal = require("./metal")
    const trade = require("./trade")
    const { None } = require("steam-user/resources/EClientUIMode")

    let my_bank = await metal.parseMyInv(m_sudts.manager) // TODO: centralise all operations to bank
    let tradecount_idx = 0
    let prev_run_time = Date.now()

    async function man(itemName, itemURL) {
        let itemLoop = true
        const minWaitBtwReq = 1000 //ms
        while (itemLoop) {
            itemLoop = false
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
            let tradecriteria_met = false
            if (scrape_res.sellorders.length > 0 && scrape_res.buyorders.length > 0) {
                console.log("Hello") //69
                if (scrape_res.sellorders[0].list_price < scrape_res.buyorders[0].list_price) {
                    console.log("Hey") //69
                    if (scrape_res.sellorders[0].auto && scrape_res.buyorders[0].auto) {
                        console.log("Hi") //69
                        // TODO: trade requirement met
                        tradecriteria_met = true
                    }
                }
            }

            if (scrape_res.sellorders[0].data["data-listing_offers_url"] == "") {
                scrape_res.sellorders.shift() //69
            }
            scrape_res.buyorders.shift() //69

            // console.log(scrape_res.sellorders.length) //69
            // console.log(scrape_res.buyorders.length) //69
            // console.log(scrape_res.sellorders[0].list_price) //69
            // console.log(scrape_res.buyorders[0].list_price) //69
            // console.log(scrape_res.sellorders[0].auto) //69
            // console.log(scrape_res.buyorders[0].auto) //69
            tradecriteria_met = true //69

            if (!tradecriteria_met) continue
            // allocate our metal and buyer's metal
            let my_buyprice = scrape_res.sellorders[0].list_price
            // TODO: if second man function calls parseMyInv, it will not take into account the metal being used by first man function
            let allo_res = metal.allocateMyMetal(my_bank, my_buyprice, tradecount_idx)
            if (allo_res.err) {
                throw "Unknown error: 042x3"
            }
            // console.log(my_bank)
            // my_bank = allo_res.bank // contains staged trade
            let their_custom_selector = {
                quality: scrape_res.sellorders[0].data["data-q_name"],
                name: scrape_res.sellorders[0].data["title"], // TODO: when to use data-base_name
                killstreak: null,
                wear: null,
                craftable: null,
                craft: null,
                custom_id: tradecount_idx
            }
            let their_suid = scrape_res.sellorders[0].suid
            let their_bank = await metal.parseTheirInv(their_suid, m_sudts.manager, their_custom_selector) // TODO: only parse until sufficient items/metal is found
            // TODO: run parsing/allocating of my and their inventory concurrently

            allo_res = metal.allocateTheirItems(their_bank, 1, tradecount_idx, tradecount_idx)
            if (allo_res.err) {
                throw "Unknown error: 042x4"
            }
            // console.log(their_bank.trades_setup.get(0).custom[0])

            let my_items = my_bank.trades_setup.get(tradecount_idx)
            let their_items = their_bank.trades_setup.get(tradecount_idx)
            let their_tradeURL = scrape_res.sellorders[0].data["data-listing_offers_url"]
            // TODO: check that tradeurl is not empty, and belongs to owner
            console.log("indic2") //69
            console.log(my_items) //69
            console.log(their_items) //69
            console.log(their_tradeURL) //69

            trade.tradeMon(m_sudts.manager) // TODO: run separately outside of function
            let sentOffer_id = await trade.trade1(m_sudts.manager, m_sudts.community, my_items, their_items, their_tradeURL) // TODO: store their items/metal in trade setup too
            console.log(sentOffer_id)

            // offer sent and confirmed, waiting for buyer to accept
            let buyerMonDelay = 5000
            const buyerMon = setInterval(() => {
                // constantly monitor if buyer still has enough metal while offer sent to seller is still pending
            }, buyerMonDelay)
            trade.confman.on("c" + sentOffer_id.toString(), (completedOfr) => {
                console.log("Accepted!")
                clearInterval(buyerMon)
                completedOfr.getReceivedItems(async (err, items_received) => {
                    // find items to be used based on list of instance, class ids
                    console.log("Yay!")
                    tradecount_idx += 1
                    if (err) throw err
                    my_items = [], their_items = []
                    let items_received_ids = []
                    for (let item of items_received) {
                        items_received_ids.push(item.assetid)
                    }

                    // construct trade where I sell the item
                    let my_sellprice = scrape_res.buyorders[0].list_price
                    let my_custom_selector = {
                        asset_ids: items_received_ids,
                        quality: scrape_res.sellorders[0].data["data-q_name"],
                        name: scrape_res.sellorders[0].data["title"],
                        killstreak: null,
                        wear: null,
                        craftable: null,
                        craft: null,
                        custom_id: tradecount_idx,
                        skipNonCustom: false
                    }

                    await metal.refreshMyInv(my_bank, m_sudts.manager, my_custom_selector)
                    console.log("indic3")
                    console.log(my_bank)

                    allo_res = metal.allocateMyItems(my_bank, 1, tradecount_idx, tradecount_idx)
                    if (allo_res.err) {
                        throw "Unknown error: 042x5"
                    }
                    console.log(my_bank)

                    their_suid = scrape_res.buyorders[0].suid
                    their_bank = await metal.parseTheirInv(their_suid, m_sudts.manager)
                    console.log("indic4")
                    console.log(their_bank)

                    allo_res = metal.allocateTheirMetal(their_bank, my_sellprice, tradecount_idx)
                    if (allo_res.err) {
                        throw "Unknown error: 042x6"
                    }
                    console.log(their_bank)
                    // console.log(their_bank.trades_setup.get(0).custom[0])


                    my_items = my_bank.trades_setup.get(tradecount_idx)
                    their_items = their_bank.trades_setup.get(tradecount_idx)
                    their_tradeURL = scrape_res.buyorders[0].data["data-listing_offers_url"]
                    console.log("indic5")
                    console.log(my_items)
                    console.log(their_items)
                    let sentOffer2_id = await trade.trade2(m_sudts.manager, m_sudts.community, my_items, their_items, their_tradeURL)
                    trade.confman.on("c" + sentOffer2_id.toString(), (completedOfr) => {
                        console.log("TWICE Accepted!")
                    })
                })
            })
        }
    }
    await man("test", "https://backpack.tf/stats/Unique/Hermes/Tradable/Craftable")
}

main()