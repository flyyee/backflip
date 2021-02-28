const min_flips_elapsed1 = 2
const max_offences1 = 2
const min_time_elapsed1 = 0//3600000 //69

exports.blacklist = class blacklist {
    verifyState = {
        ExcessAndAvoidCurrent: 4,
        Permaban: 3,
        OnlyTradeWithExcessCurrency: 2,
        AvoidForCurrentFlip: 1
    }

    constructor() {
        this.offenders1 = []
        this.offenders2 = []
        this.offenders3 = []
    }

    check1(specific_id = null, removeZero = false) {
        let idx = 0
        let remove1 = []
        for (let offender of this.offenders1) {
            if (specific_id) {
                if (offender.id != specific_id) continue
            }
            if (offender.flips_elapsed >= min_flips_elapsed1
                && (Date.now() - offender.offence_time[offender.offence_time.length - 1]) >= min_time_elapsed1) { // 1hr
                offender.offence_count = Math.max(0, offender.offence_count - 1)
            }

            if (offender.offence_count >= max_offences1) {
                if (offender.flips_elapsed < min_flips_elapsed1
                    || (Date.now() - offender.offence_time[offender.offence_time.length - 1]) < min_time_elapsed1) { // 1hr
                    this.push3(offender.id)
                    remove1.push(idx)
                }
            }
            if (removeZero && offender.offence_count == 0) {
                
                remove1.push(idx)
            }

            idx += 1
        }
        for (let x of remove1.reverse()) {
            this.offenders1.splice(x, 1)
        }
    }

    update(id = null) {
        this.update1()
        if (id) this.update2(id)
    }

    update1() {
        for (let o of this.offenders1) {
            o.flips_elapsed += 1
        }
        this.check1(null, true)
    }

    update2(ids) {
        if (!ids[0]) ids = [ids]
        let prev_idxs = []
        for (let id of ids) {
            let prev_idx = this.offenders2.findIndex(offender => offender.id == id)
            if (prev_idx != -1) { // previously offended
                prev_idxs.push(prev_idx)
            }
        }
        prev_idxs.sort((a, b) => b - a)
        for (let prev_idx of prev_idxs) {
            this.offenders2.splice(prev_idx, 1)
        }
    }

    push1(id, offence_count = null) {
        if (offence_count === null) {
            offence_count = 1
        }
        let prev_idx = this.offenders1.findIndex(offender => offender.id == id)
        if (prev_idx != -1) { // previously offended
            if (offence_count != 0) {
                this.offenders1[prev_idx].offence_time.push(Date.now())
                this.offenders1[prev_idx].offence_count += 1
            }
        } else {
            this.offenders1.push({
                id: id,
                flips_elapsed: 0,
                offence_time: [Date.now()],
                offence_count: offence_count
            })
        }
        setTimeout(this.check1.bind(null, id), 4000000) // 70mins
        this.check1()
    }

    push2(id) {
        let prev_idx = this.offenders2.findIndex(offender => offender.id == id)
        if (prev_idx == -1) { // previously offended
            this.offenders2.push({
                id: id
            })
        }
        this.push1(id, 0)
    }

    push3(id) {
        let prev_idx = this.offenders3.findIndex(offender => offender.id == id)
        if (prev_idx == -1) { // previously offended
            this.offenders3.push({
                id: id
            })
        }
    }

    verify(id) {
        if (this.offenders3.filter(o => o.id == id).length > 0) {
            return 3
        } else if (this.offenders2.filter(o => o.id == id).length > 0 &&
            this.offenders1.filter(o => o.id == id).length > 0) {
            return 4
        } else if (this.offenders2.filter(o => o.id == id).length > 0) {
            return 2
        } else if (this.offenders1.filter(o => o.id == id).length > 0) {
            return 1
        } else {
            return 0
        }
    }
}