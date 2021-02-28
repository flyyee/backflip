const scrape = require("./scrapewebsite")
scrape.scrape("https://backpack.tf/stats/Unique/Hermes/Tradable/Craftable")
.then(res => {
    for (let x of res.buyorders) {
        console.log(x.painted)
    }
})