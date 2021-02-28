const puppeteer = require('puppeteer');
const $ = require('cheerio');
// const _url = 'https://backpack.tf/stats/Strange%20Genuine/Foppish%20Physician/Tradable/Craftable';

class listing {
    static szPriceConv(szPrice) {
        let price = [0, 0, 0, 0]
        let ref_startidx = 0
        if (szPrice.includes("key")) {
            price[0] = parseInt(szPrice.substring(0, szPrice.indexOf("key") - 1))
            ref_startidx = szPrice.indexOf(",") + 1
        }
        if (szPrice.includes("ref")) {
            let refAmt = parseFloat(szPrice.substring(ref_startidx, szPrice.length))
            price[1] = Math.floor(refAmt)
            if (szPrice.includes(".")) {
                let scrapTwiceAmt = Math.round((refAmt % 1) * 2 / 0.11)
                if (scrapTwiceAmt % 2 == 1) {
                    price[3] = 1
                    scrapTwiceAmt -= 1
                }
                price[2] = parseInt(scrapTwiceAmt / 2)
            }
        }
        return price
    }

    static lightning(raw_typeoflistings) {
        if (raw_typeoflistings.attribs.class === "fa fa-sw fa-flash") {
            return true
        }
        return false
    }

    static painted(data) {
        if (data["data-paint_name"]) {
            console.log(data["data-paint_name"])
            return true
        } else {
            console.log(data["data-listing_comment"].toLowerCase())
            for (let word of ["paint", "pink", "black", "lime", "white"]) {
                if (data["data-listing_comment"].toLowerCase().includes(word)) {
                    return true
                }
            }
        }
        return false
    }

    constructor(data) {
        this.data = data
        this.list_price = listing.szPriceConv(this.data["data-listing_price"])
        this.painted = listing.painted(data)
    }
}

exports.scrape = async (url) => {
    return new Promise(async (resolve, reject) => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url);
        let html = await page.content()

        let raw_listings = $("div.listing-item > div", html)
        var sellorders = [], buyorders = []

        let typeoflistings = $("i.fa-sw", html)

        // let time_info = $("span.text-muted.click-data-toggle")

        let userinfo = $("span.text-muted.click-data-toggle > span.user-handle > a", html)

        // raw_listings.forEach((raw_listing, idx) => {
        let idx = 0
        for (raw_listing of raw_listings) {
            if (raw_listing.attribs["data-listing_intent"] === "sell") {
                sellorders.push(new listing(raw_listing.attribs))
                // sellorders[sellorders.length - 1].painted = listing.painted(raw_listing.attribs)
                sellorders[sellorders.length - 1].auto = listing.lightning(typeoflistings[idx])
                sellorders[sellorders.length - 1].suid = userinfo[idx].attribs["data-id"]
                sellorders[sellorders.length - 1].online = (userinfo[idx].attribs["data-online"] == "1")
                
            } else {
                buyorders.push(new listing(raw_listing.attribs))
                // buyorders[buyorders.length - 1].painted = listing.painted(raw_listing.attribs)
                buyorders[buyorders.length - 1].auto = listing.lightning(typeoflistings[idx])
                buyorders[buyorders.length - 1].suid = userinfo[idx].attribs["data-id"]
                buyorders[buyorders.length - 1].online = (userinfo[idx].attribs["data-online"] == "1")
            }
            idx += 1
        }

        resolve({
            buyorders: buyorders,
            sellorders: sellorders
        })
    })
}