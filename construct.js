exports.trade = function trade(buyerMon, completedOfr, tradecount_idx, scrape_res, buy_idx,
     m_sudts, blacklist, my_bank, smelt_instance) {
    return new Promise((resolve, reject) => {
        console.log("Accepted!")
        clearInterval(buyerMon)
        completedOfr.getReceivedItems(async (err, items_received) => {
            // find items to be used based on list of instance, class ids
            console.log("Yay!")
            tradecount_idx += 1
            if (err) {
                const a = completedOfr
                reject("debug", "zz", "getReceiveditems", [a])
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
                    blacklist.push1(scrape_res.buyorders[buy_idx].data["data-listing_account_id"])
                    continue
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
                } else {
                    const a = their_bank, b = my_sellprice, c = tradecount_idx
                    reject(["debug", "a", "allocateMetal", [a, b, c]])
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
                    // throw err // error with getting inventory
                })
            console.log("indic4")
            console.log(my_bank)
    
            try {
                metal.allocateItems(my_bank, 1, tradecount_idx, tradecount_idx)
            } catch (err) {
                const a = my_bank, b = 1, c = tradecount_idx, d = tradecount_idx
                reject(["debug", "c", "allocateItems", [a, b, c, d]])
                // throw err // might be Unknown error: 042x4
            }
    
            if (raw_change_theyneed > 0) {
                try {
                    metal.allocateMetal(my_bank, [0, 0, raw_change_theyneed, 0], tradecount_idx)
                } catch (err) {
                    if (err == "Insufficient currency: 042x11") {
                        // smelt metal, however may not have enough metal
                        await new Promise((resolve, reject) => {
                            smelt.Man.on("smeltComplete", () => {
                                resolve(false)
                            })
                        })
                        try {
                            metal.allocateMetal(my_bank, [0, 0, raw_change_theyneed, 0], tradecount_idx)
                        } catch (err) {
                            if (err == "Insufficient currency: 042x11") {
                                // legit insufficient metal
                                reject(reject(["blacklist", 5, null, null]))
                                // pool()
                            } else {
                                const a = my_bank, b = [0, 0, raw_change_theyneed, 0], c = tradecount_idx
                                reject(["debug", "d", "allocateMetal", [a, b, c, d]])
                            }
                            // throw err // might be Unknown error: 042x4
                        }
                    } else {
                        const a = my_bank, b = [0, 0, raw_change_theyneed, 0], c = tradecount_idx
                        reject(["debug", "e", "allocateMetal", [a, b, c, d]])
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
        })
    
        resolve(false)
    })
}