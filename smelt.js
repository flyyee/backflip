const EventEmitter = require("events")
class MyEmitter extends EventEmitter { }
let smeltMan = new MyEmitter(), smeltManE = new MyEmitter(), smeltMan_internal = new MyEmitter()
exports.Man = smeltMan, exports.ManE = smeltManE

const TeamFortress2 = require('tf2');
let tf2

function refToScrap(asset_ids) {
    return new Promise(async (resolve, reject) => {
        let refs = asset_ids
        let recs = []

        let ref_crafts_complete = 0
        let waitForRefCrafts = new Promise((resolve, reject) => {
            // TODO: add time limit
            tf2.on("craftingComplete", (recipe, itemsGained) => {
                recs.push(...itemsGained)
                ref_crafts_complete += 1
                if (ref_crafts_complete == refs.length) {
                    resolve(false)
                }
            })
        })

        for (let ref of refs) {
            tf2.craft([ref])
        }

        await waitForRefCrafts

        let scraps = []

        let rec_crafts_complete = 0
        let waitForRecCrafts = new Promise((resolve, reject) => {
            // TODO: add time limit
            tf2.on("craftingComplete", (recipe, itemsGained) => {
                scraps.push(...itemsGained)
                rec_crafts_complete += 1
                if (rec_crafts_complete == recs.length) {
                    resolve(false)
                }
            })
        })

        for (let rec of recs) {
            tf2.craft([rec])
        }

        await waitForRecCrafts

        if (scraps.length < refs.length * 3) {
            reject("Error: Lost scrap metals when smelting metal")
        }

        resolve({
            old_assets: refs.concat(recs),
            new_assets: scraps
        })
    })

}

let connected = false, pause = false

exports.launch = function (user) {
    tf2 = new TeamFortress2(user);
    user.gamesPlayed(440);
    return new Promise(async (resolve, reject) => {
        await new Promise((resolve, reject) => {
            tf2.on("connectedToGC", version => {
                console.log(`Connected to GC. Version: ${version}`)
                connected = true
                resolve(false)
            })
        })
        resolve(false)
    })
}

exports.stop = () => {
    return new Promise((resolve, reject) => {
        pause = true
        smeltMan_internal.on("paused", () => {
            resolve(false)
        })
    })
}

async function scrapMon(bank, min_scrap, freq) {
    if (bank.scrap.length < min_scrap) {
        let scrap_needed = min_scrap - bank.scrap.length
        let ref_needed = Math.ceil(scrap_needed / 9)
        if (bank.ref.length < ref_needed) {
            console.log("ScrapMon: Not enough ref")
            console.log("ScrapMon: Proceeding with all remaining ref")
            ref_needed = bank.ref.length
        }
        let ref_assets = bank.ref.slice(Math.max(bank.ref.length - ref_needed, 0))
        let ref_asset_ids = ref_assets.map(asset => asset.asset_id)
        let res = await refToScrap(ref_asset_ids)
            .catch((err) => {
                smeltManE.emit("error", err)
                // throw err // lost metal when smelting
            })
        bank.verify(res.old_assets, res.new_assets)
    }
    smeltMan.emit("smeltComplete")
    if (pause) {
        smeltMan_internal.emit("paused")
        return false
    } else {
        setTimeout(scrapMon.bind(null, bank, min_scrap, freq), freq)
    }
}

exports.init = function (bank, min_scrap, max_scrap, freq) {
    pause = false
    if (!connected) {
        throw "Not connected to GC yet. Remember to await launch()"
    }
    scrapMon(bank, min_scrap, freq)
    return false
}