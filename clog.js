var fs = require("fs")
var util = require("util")

let first = true
const filename = "logs\\logs.txt"

exports.vclog = function clog(content) {
    console.log(content)
    if (first) {
        first = false
        const d = new Date()
        let date = ("0" + String(d.getDate())).slice(-2) + "/" + ("0" + String(d.getMonth() + 1)).slice(-2) + "/" + String(d.getFullYear()) + " " + 
        ("0" + String(d.getHours())).slice(-2) + ":" + ("0" + String(d.getMinutes())).slice(-2) + ":" + String(d.getSeconds())
        date = "\nNEW ENTRY\n" + date
        fs.appendFileSync(filename, date + "\n")
    }
    fs.appendFileSync(filename, util.format(content) + "\n")
}