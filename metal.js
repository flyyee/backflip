let SteamUser = require("steam-user")
// let client = new SteamUser()

const EventEmitter = require('events');
class MyEmitter extends EventEmitter { }
const invman = new MyEmitter();

class currency {

    static v_ref = 1
    static v_rec = 2
    static v_scrap = 3
    static v_key = 4

    static raw_ref = 9
    static raw_rec = 3
    static raw_scrap = 1
    static raw_key = 53 * 9 + 1

    static typeCheck(check, currency_type) {
        if (!check) return true

        switch (currency_type) {
            case currency.v_ref:
                if (check.instance_id != 11040547 || check.class_id != 2674) {
                    return false
                }
                break
            case currency.v_rec:
                if (check.instance_id != 11040547 || check.class_id != 5564) {
                    return false
                }
                break
            case currency.v_scrap:
                if (check.instance_id != 11040547 || check.class_id != 2675) {
                    return false
                }
                break
            case currency.v_key:
                // TODO: add check for key
                break
        }
        return true
    }

    constructor(currency_type, asset_id, check = false) {
        if (!currency.typeCheck(check, currency_type)) {
            console.log(check)
            console.log(currency_type)
            throw "Type of currency specified is incorrect: 042x2"
        }

        if (currency_type === currency.v_ref) {
            this.value = currency.raw_ref
        } else if (currency_type === currency.v_rec) {
            this.value = currency.raw_rec
        } else if (currency_type === currency.v_scrap) {
            this.value = currency.raw_scrap
        } else if (currency_type === currency.v_key) {
            this.value = currency.raw_key
        } else {
            throw "Invalid currency: 042x1"
        }

        this.asset_id = asset_id
    }
}

exports.Bank = class Bank {
    constructor() {
        this.keys = []
        this.ref = []
        this.rec = [],
            this.scrap = [],
            this.custom = new Map(),
            this.trades = new Map(),
            this.trades_setup = new Map()
    }
    
    free_setup(tradecount_idx) {
        let staged_inv = this.trades_setup.get(tradecount_idx)
        if (!staged_inv) return true
        this.trades_setup.delete(tradecount_idx)
        for (let asset_type of ["keys", "ref", "rec", "scrap"/*, "custom"*/]) {
            if (staged_inv[asset_type]) {
                this[asset_type].push(...staged_inv[asset_type])
            }
        }
        return false
    }
    
    verify(old_assets = null, new_assets = null) {
        if (old_assets && old_assets[0].asset_id) {
            old_assets = old_assets.map(asset => asset.asset_id)
        }
        if (new_assets && new_assets[0].asset_id) {
            new_assets = new_assets.map(asset => asset.asset_id)
        }

    }

    //TODO: combine all retry functions as a parser that redirects to the actual functions
    async refreshInvR(retryCount, manager, suid = null, custom_selector = null) {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let exitFlag = false
            while (!exitFlag) {
                await refreshInv(this, manager, suid, custom_selector)
                .then(res => {
                    exitFlag = true
                    resolve(res)
                })
                .catch(err => {
                    if (count++ >= retryCount) {
                        exitFlag = true
                        reject(err)
                    }
                })
            }
        })
    }
}

exports.parseMyInv = async function (manager, old_bank = null) {
    return new Promise(async (resolve, reject) => {
        let bank = new Bank()
        await manager.getInventoryContents(440, 2, true, (err, inventory, currencies) => {
            for (let asset of inventory) {
                check = {
                    instance_id: asset.instanceid,
                    class_id: asset.classid
                }
                try {
                    if (asset.market_name === "Scrap Metal") {
                        // console.log("Scrap metal:")
                        if (old_bank) {
                            old_bank.scrap.push(new currency(currency.v_scrap, asset.assetid, check))
                        } else {
                            bank.scrap.push(new currency(currency.v_scrap, asset.assetid, check))
                        }
                        /*
                        instance id: 11040547
                        classid: 2675
                        */
                    } else if (asset.market_name === "Reclaimed Metal") {
                        // console.log("Reclaimed metal:")
                        if (old_bank) {
                            old_bank.rec.push(new currency(currency.v_rec, asset.assetid, check))
                        } else {
                            bank.rec.push(new currency(currency.v_rec, asset.assetid, check))
                        }
                        /*
                        instance id: 23967827
                        classid: 5564
                        */
                    } else if (asset.market_name === "Refined Metal") {
                        // console.log("Refined metal:")
                        if (old_bank) {
                            old_bank.ref.push(new currency(currency.v_ref, asset.assetid, check))
                        } else {
                            bank.ref.push(new currency(currency.v_ref, asset.assetid, check))
                        }
                        /*
                        instance id: 11040547
                        classid: 2674
                        */
                    } else {
                        continue
                    }
                }
                catch (err) {
                    // TODO: gracefully (redirect?) log any errors from populating bank
                    console.log(err)
                    continue
                }
                // console.log(`Classid: ${asset.classid} ; Instanceid: ${asset.instanceid}`)
            }
            if (old_bank) {
                resolve(old_bank)
                return old_bank
            } else {
                resolve(bank)
                return bank
            }
        })
    })
}

exports.parseTheirInv = async function (their_suid, manager, customSelector = null, old_bank = null) {
    return new Promise(async (resolve, reject) => {
        let bank = new Bank()
        let custom_assets = []
        await manager.getUserInventoryContents(their_suid, 440, 2, true, (err, inventory, currencies) => {
            for (let asset of inventory) {
                if (customSelector) {
                    let constructedName = customSelector.name
                    // if (customSelector.quality == "Unique") {
                    //     constructedName = customSelector.name
                    // } else {
                    //     constructedName = customSelector.quality + " " + customSelector.name
                    // }
                    // console.log(asset.market_hash_name)
                    if (asset.market_hash_name == constructedName) {
                        let custom_asset_obj = {
                            asset_id: asset.assetid,
                            class_id: asset.classid,
                            instance_id: asset.instanceid,
                            name: customSelector.name,
                            constructedName: asset.market_hash_name,
                            custom_id: customSelector.custom_id
                        }
                        custom_assets.push(custom_asset_obj)
                        // if (old_bank) {
                        //     old_bank.custom.push(custom_asset_obj)
                        // } else {
                        //     bank.custom.push(custom_asset_obj)
                        // }
                    }
                    continue
                }
                check = {
                    instance_id: asset.instanceid,
                    class_id: asset.classid
                }
                try {
                    if (asset.market_name === "Scrap Metal") {
                        if (old_bank) {
                            old_bank.scrap.push(new currency(currency.v_scrap, asset.assetid, check))
                        } else {
                            bank.scrap.push(new currency(currency.v_scrap, asset.assetid, check))
                        }
                    } else if (asset.market_name === "Reclaimed Metal") {
                        if (old_bank) {
                            old_bank.rec.push(new currency(currency.v_rec, asset.assetid, check))
                        } else {
                            bank.rec.push(new currency(currency.v_rec, asset.assetid, check))
                        }
                    } else if (asset.market_name === "Refined Metal") {
                        if (old_bank) {
                            old_bank.ref.push(new currency(currency.v_ref, asset.assetid, check))
                        } else {
                            bank.ref.push(new currency(currency.v_ref, asset.assetid, check))
                        }
                    } else {
                        continue
                    }
                }
                catch (err) {
                    // gracefully log any errors from populating bank
                    console.log(err)
                    continue
                }
            }

            if (customSelector) {
                if (old_bank) {
                    old_bank.custom.set(customSelector.custom_id, custom_assets)
                } else {
                    bank.custom.set(customSelector.custom_id, custom_assets)
                }
            }

            if (old_bank) {
                resolve(old_bank)
                return old_bank
            } else {
                resolve(bank)
                return bank
            }
        })
    })
}

let refreshInv = exports.refreshInv = async function (old_bank, manager, their_suid = null, customSelector = null) {
    return new Promise(async (resolve, reject) => {
        let custom_assets = []
        let getInvCallback = function (err, inventory, currencies) {
            if (err) reject(err) // error with getting inventory
            // TODO: sometimes undefined
            for (let asset of inventory) {
                if (customSelector) {
                    // TODO: check if object already exists in classid+instanceid custom id list
                    let asset_ok = false
                    if (customSelector.asset_ids && customSelector.asset_ids.length > 0) {
                        if (customSelector.asset_ids.includes(asset.assetid)) {
                            asset_ok = true
                        }
                    }
                    let constructedName = customSelector.name
                    if (asset.market_hash_name == constructedName) {
                        asset_ok = true
                    }
                    if (asset_ok) {
                        let custom_asset_obj = {
                            asset_id: asset.assetid,
                            class_id: asset.classid,
                            instance_id: asset.instanceid,
                            name: customSelector.name,
                            constructedName: asset.market_hash_name,
                            custom_id: customSelector.custom_id
                        }
                        custom_assets.push(custom_asset_obj)
                    }
                    if (customSelector.skipMetal) {
                        continue
                    }
                }
                check = {
                    instance_id: asset.instanceid,
                    class_id: asset.classid
                }
                try {
                    if (asset.market_name === "Scrap Metal") {
                        if (old_bank.scrap.filter(el => el.asset_id == asset.assetid).length == 0) {
                            old_bank.scrap.push(new currency(currency.v_scrap, asset.assetid, check))
                        }
                    } else if (asset.market_name === "Reclaimed Metal") {
                        if (old_bank.rec.filter(el => el.asset_id == asset.assetid).length == 0) {
                            old_bank.rec.push(new currency(currency.v_rec, asset.assetid, check))
                        }
                    } else if (asset.market_name === "Refined Metal") {
                        if (old_bank.ref.filter(el => el.asset_id == asset.assetid).length == 0) {
                            old_bank.ref.push(new currency(currency.v_ref, asset.assetid, check))
                        }
                    } else {
                        continue
                    }
                }
                catch (err) {
                    // gracefully log any errors from populating bank
                    console.log("Graceful error log:")
                    console.log(err)
                    continue
                }
            }

            if (customSelector) {
                old_bank.custom.set(customSelector.custom_id, custom_assets)
            }

            resolve(true)
        }
        if (their_suid) {
            await manager.getUserInventoryContents(their_suid, 440, 2, true, getInvCallback)
        } else {
            await manager.getInventoryContents(440, 2, true, getInvCallback)
        }
    })
}

exports.refreshMyInv = async function (old_bank, manager, customSelector = null) {
    return new Promise(async (resolve, reject) => {
        let custom_assets = []
        await manager.getInventoryContents(440, 2, true, (err, inventory, currencies) => {
            for (let asset of inventory) {
                if (customSelector) {
                    // TODO: check if object already exists in classid+instanceid custom id list
                    let asset_ok = false
                    if (customSelector.asset_ids && customSelector.asset_ids.length > 0) {
                        if (customSelector.asset_ids.includes(asset.assetid)) {
                            asset_ok = true
                        }
                    }
                    let constructedName = customSelector.name
                    if (asset.market_hash_name == constructedName) {
                        asset_ok = true
                    }
                    if (asset_ok) {
                        let custom_asset_obj = {
                            asset_id: asset.assetid,
                            class_id: asset.classid,
                            instance_id: asset.instanceid,
                            name: customSelector.name,
                            constructedName: asset.market_hash_name,
                            custom_id: customSelector.custom_id
                        }
                        custom_assets.push(custom_asset_obj)
                    }
                    if (customSelector.skipNonCustom) {
                        continue
                    }
                }
                check = {
                    instance_id: asset.instanceid,
                    class_id: asset.classid
                }
                try {
                    if (asset.market_name === "Scrap Metal") {
                        if (old_bank.scrap.filter(el => el.asset_id == asset.assetid).length == 0) {
                            old_bank.scrap.push(new currency(currency.v_scrap, asset.assetid, check))
                        }
                    } else if (asset.market_name === "Reclaimed Metal") {
                        if (old_bank.rec.filter(el => el.asset_id == asset.assetid).length == 0) {
                            old_bank.rec.push(new currency(currency.v_rec, asset.assetid, check))
                        }
                    } else if (asset.market_name === "Refined Metal") {
                        if (old_bank.ref.filter(el => el.asset_id == asset.assetid).length == 0) {
                            old_bank.ref.push(new currency(currency.v_ref, asset.assetid, check))
                        }
                    } else {
                        continue
                    }
                }
                catch (err) {
                    // gracefully log any errors from populating bank
                    console.log(err)
                    continue
                }
            }

            if (customSelector) {
                if (old_bank) {
                    old_bank.custom.set(customSelector.custom_id, custom_assets)
                } else {
                    bank.custom.set(customSelector.custom_id, custom_assets)
                }
            }

            resolve(old_bank)
        })
    })
}

exports.allocateMetal = function (bank, price, tradecount_idx) {
    // let all_metal = bank.ref.concat(bank.rec).concat(bank.scrap).concat(bank.keys)
    // let all_metal_amt = 0
    let price_raw = price[0] * currency.raw_key + price[1] * currency.raw_ref + price[2] * currency.raw_scrap + price[3] * currency.raw_scrap
    // let enough_metal = false

    let all_metal_amt = bank.ref.length * currency.raw_ref + bank.rec.length * currency.raw_rec
        + bank.scrap.length * currency.raw_scrap + bank.keys.length * currency.raw_key

    // for (let metal of all_metal) { // TODO: use list size
    //     all_metal_amt += metal.value
    //     if (all_metal_amt >= price_raw) {
    //         enough_metal = true
    //         break
    //     }
    // }

    if (all_metal_amt >= price_raw) {
        // begin allocating metal
        let price_left = price_raw
        let prep_inv = { ref: [], rec: [], scrap: [], keys: [], custom: [] }

        let pre_prep_inv = bank.trades_setup.get(tradecount_idx)
        if (pre_prep_inv) {
            prep_inv = pre_prep_inv
        }
        
        for (let [currency_type, currency_rawtype] of [
            ["keys", "raw_key"],
            ["ref", "raw_ref"],
            ["rec", "raw_rec"],
            ["scrap", "raw_scrap"]
        ]) {
            if (price_left >= currency[currency_rawtype]) {
                let crcy_needed = Math.min(Math.floor(price_left / currency[currency_rawtype]), bank[currency_type].length)
                for (x = 0; x < crcy_needed; x++) {
                    if (bank[currency_type].length == 0) {
                        break
                    }
                    prep_inv[currency_type].push(bank[currency_type].pop())
                    bank.trades_setup.set(tradecount_idx, prep_inv)
                    price_left -= currency[currency_rawtype]
                }
            }
        }

        if (price_left == 0) {
            // metal allocation successful
            return 0
        } else if (price_left <= 2) {
            // probably an issue with metal not being smelted -> eg you have 1 ref, but item is 0.88 ref
            if (bank.rec.length > 0) {
                prep_inv.rec.push(bank.rec.pop())
                bank.trades_setup.set(tradecount_idx, prep_inv)
                price_left -= currency.raw_rec
            } else if (bank.ref.length > 0) {
                prep_inv.ref.push(bank.ref.pop())
                bank.trades_setup.set(tradecount_idx, prep_inv)
                price_left -= currency.raw_ref
            } else {
                bank.free_setup(tradecount_idx)
                throw "Unknown error: 042x7"
            }
        } else if (price_left <= 8) {
            if (bank.ref.length > 0) {
                prep_inv.ref.push(bank.ref.pop())
                bank.trades_setup.set(tradecount_idx, prep_inv)
                price_left -= currency.raw_ref
            } else {
                bank.free_setup(tradecount_idx)
                throw "Unknown error: 042x8"
            }
        } else {
            // allocated metal incorrectly, proceed to free up metal
            bank.free_setup(tradecount_idx)
            throw "Unknown error: 042x9"
        }
        if (price_left > 0) {
            bank.free_setup(tradecount_idx)
            throw "Unknown error: 042x10"
        }
        return price_left * -1
    } else {
        bank.free_setup(tradecount_idx)
        throw "Insufficient currency: 042x11"
    }
}

exports.allocateMyMetal = function (bank, price, tradecount_idx) {
    // TODO: start loop based on bank
    // let price = [0, 2, 1, 0]  // 2.11 ref
    let all_metal = bank.ref.concat(bank.rec).concat(bank.scrap).concat(bank.keys)
    let all_metal_amt = 0
    let price_raw = price[0] * currency.raw_key + price[1] * currency.raw_ref + price[2] * currency.raw_scrap + price[3] * currency.raw_scrap
    let enough_metal = false
    for (let metal of all_metal) { // TODO: use list size
        all_metal_amt += metal.value
        if (all_metal_amt >= price_raw) {
            enough_metal = true
            break
        }
    }

    if (enough_metal) {
        // begin allocating metal
        let price_left = price_raw
        // bank.trades_setup.set(tradecount_idx, {ref: [], rec: [], scrap: [], keys: []})
        let prep_ref = [], prep_rec = [], prep_scrap = [], prep_keys = []
        let prep_inv = { ref: [], rec: [], scrap: [], keys: [] }

        for (let [currency_type, currency_rawtype] of [
            ["keys", "raw_key"],
            ["ref", "raw_ref"],
            ["rec", "raw_rec"],
            ["scrap", "raw_scrap"]
        ]) {
            if (price_left >= currency[currency_rawtype]) {
                let crcy_needed = Math.min(Math.floor(price_left / currency[currency_rawtype]), bank[currency_type].length)
                for (x = 0; x < crcy_needed; x++) {
                    prep_inv[currency_type].push(bank[currency_type].pop())
                    bank.trades_setup.set(tradecount_idx, prep_inv)
                    price_left -= currency[currency_rawtype]
                }
            }
        }

        if (price_left == 0) {
            // metal allocation successful
            return {
                bank: bank,
                err: null
            }
        } else if (price_left > 0 && price_left < 1) {
            // probably an issue with metal not being smelted -> eg you have 1 ref, but item is 0.88 ref
        } else if (price_left >= 1) {
            // allocated metal incorrectly, proceed to free up metal
        } else {
            // unknown error
        }
    }
    return {
        err: "Unknown error"
    }
    // throw "Unknown error: 042x3"
}


exports.allocateTheirMetal = function (bank, price, tradecount_idx) {
    let all_metal = bank.ref.concat(bank.rec).concat(bank.scrap).concat(bank.keys)
    let all_metal_amt = 0
    let price_raw = price[0] * currency.raw_key + price[1] * currency.raw_ref + price[2] * currency.raw_scrap + price[3] * currency.raw_scrap
    let enough_metal = false
    for (let metal of all_metal) { // TODO: use list size
        all_metal_amt += metal.value
        if (all_metal_amt >= price_raw) {
            enough_metal = true
            break
        }
    }

    if (enough_metal) {
        // begin allocating metal
        let price_left = price_raw
        // bank.trades_setup.set(tradecount_idx, {ref: [], rec: [], scrap: [], keys: []})
        let prep_ref = [], prep_rec = [], prep_scrap = [], prep_keys = []
        let prep_inv = { ref: [], rec: [], scrap: [], keys: [] }

        for (let [currency_type, currency_rawtype] of [
            ["keys", "raw_key"],
            ["ref", "raw_ref"],
            ["rec", "raw_rec"],
            ["scrap", "raw_scrap"]
        ]) {
            if (price_left >= currency[currency_rawtype]) {
                let crcy_needed = Math.min(Math.floor(price_left / currency[currency_rawtype]), bank[currency_type].length)
                for (x = 0; x < crcy_needed; x++) {
                    prep_inv[currency_type].push(bank[currency_type].pop())
                    bank.trades_setup.set(tradecount_idx, prep_inv)
                    price_left -= currency[currency_rawtype]
                }
            }
        }

        if (price_left == 0) {
            // metal allocation successful
            return {
                bank: bank,
                err: null
            }
        } else if (price_left > 0 && price_left < 1) {
            // probably an issue with metal not being smelted -> eg you have 1 ref, but item is 0.88 ref
        } else if (price_left >= 1) {
            // allocated metal incorrectly, proceed to free up metal
        } else {
            // unknown error
        }
    }
    return {
        err: "Unknown error"
    }
    // throw "Unknown error: 042x3"
}

exports.allocateItems = function (bank, amount, custom_id, tradecount_idx) {
    if (bank.custom.get(custom_id).length >= amount) { // enough items
        let prep_inv = { ref: [], rec: [], scrap: [], keys: [], custom: [] }
        let pre_prep_inv = bank.trades_setup.get(tradecount_idx)
        if (pre_prep_inv) {
            prep_inv = pre_prep_inv
        }
        for (let x = 0; x < amount; x++) {
            prep_inv.custom.push(bank.custom.get(custom_id).pop())
            bank.trades_setup.set(tradecount_idx, prep_inv)
        }

        if (prep_inv.custom.length == amount) {
            // item allocation successful
            return true
        } else {
            throw "Unknown error"
        }
    } else {
        throw "Insufficient items."
    }
}

exports.allocateMyItems = function (bank, amount, custom_id, tradecount_idx) { // TODO: transfer this and allocatetheiritems to the same allocateitems function
    if (bank.custom.get(custom_id).length >= amount) { // enough items
        let prep_inv = { custom: [] }
        for (let x = 0; x < amount; x++) {
            prep_inv.custom.push(bank.custom.get(custom_id).pop())
            bank.trades_setup.set(tradecount_idx, prep_inv)
        }

        if (prep_inv.custom.length == amount) {
            // item allocation successful
            return {
                bank: bank,
                err: null
            }
        } else {
            // unknown error
            return {
                err: "Unknown error"
            }
        }
    } else {
        return {
            err: "Insufficient items."
        }
    }
}

exports.allocateTheirItems = function (bank, amount, custom_id, tradecount_idx) {
    if (bank.custom.get(custom_id).length >= amount) { // enough items
        let prep_inv = { custom: [] }
        for (let x = 0; x < amount; x++) {
            prep_inv.custom.push(bank.custom.get(custom_id).pop())
            bank.trades_setup.set(tradecount_idx, prep_inv)
        }

        if (prep_inv.custom.length == amount) {
            // item allocation successful
            return {
                bank: bank,
                err: null
            }
        } else {
            // unknown error
            return {
                err: "Unknown error"
            }
        }
    } else {
        return {
            err: "Insufficient items."
        }
    }
}