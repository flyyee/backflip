"use strict"

const clog = require("./clog")
const console = {
    log: clog.vclog
}

const smelt = require("./smelt")

async function main() {

    const sudts = require("./steamuserlogin")
    let m_sudts = await sudts.details()
        .catch((err) => {
            throw err // problem with setting cookies
        })
    const metal = require("./metal")
    let my_bank = new metal.Bank()
    await metal.refreshInv(my_bank, m_sudts.manager)

    await smelt.launch(m_sudts.client)
        .catch(err => {
            throw err
        })

    try {
        smelt.init(my_bank, 10, null, 2000)
    } catch (err) {
        throw err
    }

    await new Promise ((resolve, reject) => {
        smelt.Man.on("smeltComplete", () => {
            resolve(false)
        })
    })
    smelt.Man.on("error", err => {
        throw err // lost metal when smelting
    })

    console.log("here")

    setTimeout(async () => {
        await smelt.stop()
    }, 5000)
}

main()