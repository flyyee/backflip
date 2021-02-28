const { start } = require("repl")

exports.start = function start(bmonMan, sellprice, m_sudts, buyer_suid, buyerMonDelay = null) {
    if (buyerMonDelay === null) buyerMonDelay = 15000
    let buyerMon = setInterval(() => {
        let buyer_bank = new metal.Bank()
        await buyer_bank.refreshInvR(3, m_sudts.manager, buyer_suid, null)
            .catch((err) => {
                console.log(err) // error with getting inventory
                const a = buyer_bank, b = m_sudts.manager, c = buyer_suid, d = null
                bmonMan.emit("error", ["debug", "zx", "refreshInv", [a, b, c, d]])
                clearInterval(buyerMon)
                // reject(["debug", "zx", "refreshInv", [a, b, c, d]])
                return
                // blacklist.push1(scrape_res.buyorders[buy_idx].data["data-listing_account_id"])
                // gotoman = true
            })

        try {
            metal.allocateMetal(buyer_bank, sellprice, tradecount_idx)
        } catch (err) {
            if (err == "Insufficient currency: 042x11") {
                bmonMan.emit("error", ["blacklist", 2, null, null])
                clearInterval(buyerMon)
                // reject(["blacklist", 2, null, null])
                return
            } else {
                const a = buyer_bank, b = sellprice, c = tradecount_idx
                bmonMan.emit("error", ["debug", "a", "allocateMetal", [a, b, c]])
                clearInterval(buyerMon)
                // reject(["debug", "a", "allocateMetal", [a, b, c]])
                return
                // throw err // might be Unknown error: 042x4
            }
        }
        bmonMan.emit("enoughMetal")
    }, buyerMonDelay)

    bmonMan.on("bmonEnd", () => {
        clearInterval(buyerMon)
    })
}

exports.check = async function check(bmonMan, sellprice, m_sudts, buyer_suid, max_wait_time = 0) {
    return new Promise((resolve, reject) => {
        start(bmonMan, sellprice, m_sudts, buyer_suid, 0)
        await new Promise((resolve, reject) => {
            let bmonMan_handlers = {}

            let max_wait_timeout
            if (max_wait_time) {
                max_wait_timeout = setTimeout(() => {
                    reject(false)
                    bmonMan.removeListener("error", bmonMan_handlers.error)
                    bmonMan.removeListener("enoughMetal", bmonMan_handlers.res)
                    return
                }, max_wait_time)
            }

            let bmonMan_errorhandler = err => {
                if (max_wait_time) clearTimeout(max_wait_timeout)
                reject(err)
                bmonMan.removeListener("error", bmonMan_handlers.error)
                bmonMan.removeListener("enoughMetal", bmonMan_handlers.res)
                return
            }

            let bmonMan_reshandler = () => {
                if (max_wait_time) clearTimeout(max_wait_timeout)
                resolve(false)
                bmonMan.removeListener("error", bmonMan_handlers.error)
                bmonMan.removeListener("enoughMetal", bmonMan_handlers.res)
                return
            }

            bmonMan_handlers = {
                error: bmonMan_errorhandler,
                res: bmonMan_reshandler
            }

            bmonMan.on("enoughMetal", bmonMan_reshandler)
            bmonMan.on("error", bmonMan_errorhandler)
        })
            .then(res => {
                resolve(false)
            })
            .catch(err => {
                if (err) {
                    reject(err)
                } else {
                    let a = bmonMan, b = sellprice, c = m_sudts, d = buyer_suid, e = max_wait_time
                    reject(["timeout", "tm1", "bmon-check", [a, b, c, d, e]])
                }
            })
    })
}