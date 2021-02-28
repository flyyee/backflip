async function main() {
    const sudts = require("./steamuserlogin")
    let m_sudts = await sudts.details()
        .catch((err) => {
            throw err // problem with setting cookies
        })

    const TeamFortress2 = require('tf2');
    let user = m_sudts.client
    let tf2 = new TeamFortress2(user);
    user.gamesPlayed(440);

    function refToScrap(asset_ids) {

    }

    function init(bank, min_scrap) {
        let scrapMon = function() {
            if (bank.scrap.length < min_scrap) {
                let scrap_needed = min_scrap - bank.scrap.length
                let ref_needed = Math.ceil(scrap_needed / 9)
                if (bank.ref.length < ref_needed) {
                    console.log("Not enough ref")
                    console.log("Proceeding with all remaining ref")
                    ref_needed = bank.ref.length
                }
                let ref_assets = bank.ref.slice(Math.max(bank.ref.length - ref_needed, 0))
                let ref_asset_ids = ref_assets.map(asset => asset.asset_id)
                let scrap_asset_ids = refToScrap(ref_asset_ids)
                bank.verify(ref_asset_ids, scrap_asset_ids)
            }
        }
    }

    

    let x = new Promise((resolve, reject) => {
        tf2.on("connectedToGC", version => {
            console.log(`Connected to GC. Version: ${version}`)
            let refs = ["9767340234"]
            tf2.craft(refs)
            tf2.on("craftingComplete", (recipe, itemsGained) => {
                console.log(`Crafting complete with recipe ${recipe}`)
                console.log(`Items gained: ${itemsGained}`)
                resolve(1)
            })
        })
    })
    await x

    console.log("next")
}

main()