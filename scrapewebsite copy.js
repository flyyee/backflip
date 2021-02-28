const puppeteer = require('puppeteer');
const $ = require('cheerio');
const _url = 'https://backpack.tf/stats/Unique/Hermes/Tradable/Craftable';

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

    constructor(data) {
        this.data = data
        this.list_price = listing.szPriceConv(this.data["data-listing_price"])
    }
}

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(_url);
    let html = await page.content()

    let raw_listings = $("div.listing-item > div", html)
    var sellorders = [], buyorders = []

    let typeoflistings = $("i.fa-sw", html)
    // console.log(typeoflistings[0])
    let suids = $("span.text-muted.click-data-toggle > span.user-handle > a", html)

    // raw_listings.forEach((raw_listing, idx) => {
    let idx = 0
    for (raw_listing of raw_listings) {
        if (raw_listing.attribs["data-listing_intent"] === "sell") {
            sellorders.push(new listing(raw_listing.attribs))
            sellorders[sellorders.length - 1].auto = listing.lightning(typeoflistings[idx])
        } else {
            buyorders.push(new listing(raw_listing.attribs))
            buyorders[buyorders.length - 1].auto = listing.lightning(typeoflistings[idx])
        }
        idx += 1
    }

    console.log(sellorders[0].data["title"])

    if (sellorders.length > 0 && buyorders.length > 0) {
        if (sellorders[0].list_price < buyorders[0].list_price) {
            if (sellorders[0].auto && buyorders[0].auto) {
                // TODO: trade requirement met

            }
        }
    }

})()