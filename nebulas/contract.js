'use strict';
'use strict';

var TransactionContent = function (text) {
    if (text) {
        var o = JSON.parse(text);
        this.amount = new BigNumber(o.amount);
        this.timestamp = new BigNumber(o.timestamp);
        this.message = o.message;
        this.from = o.from
    } else {
        this.amount = new BigNumber(0);
        this.timestamp = new BigNumber(0);
        this.message = "";
        this.from = ""
    }
};
TransactionContent.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var RollerContent = function() {
    this.from = "";
    this.timestamp = new BigNumber(0);
}
RollerContent.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var DiceRollContract = function () {
    LocalContractStorage.defineMapProperty(this, "rollers", {
        parse: function () {
            return new RollerContent();
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineMapProperty(this, "winners", {
        parse: function (text) {
            return new TransactionContent(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineMapProperty(this, "winnersList");
    LocalContractStorage.defineProperty(this, "winnersCount", {
        stringify: function (obj) {
            return obj.toString();
        },
        parse: function (str) {
            return new BigNumber(str);
        }
    });

    LocalContractStorage.defineMapProperty(this, "donors", {
        parse: function (text) {
            return new TransactionContent(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineMapProperty(this, "donorsList");
    LocalContractStorage.defineMapProperty(this, "donorsTopTen");
    LocalContractStorage.defineProperty(this, "donorsCount", {
        stringify: function (obj) {
            return obj.toString();
        },
        parse: function (str) {
            return new BigNumber(str);
        }
    });

    LocalContractStorage.defineProperty(this, "balance", {
        stringify: function (obj) {
            return obj.toString();
        },
        parse: function (str) {
            return new BigNumber(str);
        }
    });

};

// save value to contract, only after height of block, users can takeout
DiceRollContract.prototype = {
    init: function() {
        this.balance = new BigNumber(0)
        this.winnersCount = new BigNumber(0)
        this.donorsCount = new BigNumber(0)
    },
    getBalance: function () {
        return this.balance
    },

    donation: function(message) {
        var from = Blockchain.transaction.from;
        var value = Blockchain.transaction.value;
        var donor = new TransactionContent();
        donor.amount = value;
        donor.timestamp = Blockchain.transaction.timestamp;
        if (message) {
            donor.message = message
        } else {
            donor.message = " "
        }
        donor.from = from

        if (value > 0) {
            this.donorsCount = this.donorsCount.plus(1);
            this.donors.put(from, donor)
            this.donorsList.set(this.donorsCount, donor);
            this.balance = this.balance.plus(value)

            for (var i = 0; i < 10; i++) {
                var o_donor = this.donorsTopTen.get(i);
                if (o_donor) {
                    if (donor.amount > o_donor.amount) {
                        this.donorsTopTen.set(i, donor);
                        donor = o_donor;
                    }
                } else {
                    this.donorsTopTen.set(i, donor);
                    break;
                }
            }
        }
        return donor
    },

    getDonorsTopTen: function() {
        var rankList = [];
        for (var i = 0; i < 10; i++) {
            var donor = this.donorsTopTen.get(i);
            if (donor) {
                rankList.push(donor);
            } else {
                break;
            }
        }
        return rankList;
    },

    getRecentDonors: function(count) {
        var messages = []
        var messageCount = +this.donorsCount

        if (!count) count = 10
        if (count > messageCount) count = messageCount

        for (var i = 1; messageCount >= i && count >= i; i++) {
            messages.push(this.donorsList.get(messageCount - count + i))
        }

        return messages
    },

    diceRoll: function (address, guess) {
        if (!Blockchain.verifyAddress(address)) {
            return "0: Invalid Address - " + address
        }

        //var from = Blockchain.transaction.from;
        var timestamp = new BigNumber(Blockchain.transaction.timestamp)
        var lastTime = new BigNumber(0)
        var now = new BigNumber(timestamp)

        var roller = this.rollers.get(address);
        if ('undefined' == typeof (roller) || !roller) {
            roller = new RollerContent();
        } else {
            lastTime = new BigNumber(roller.timestamp)
        }

        var lastRollTime = now - lastTime;
        if (lastRollTime >= 60) {
            var roll = Math.floor(Math.random() * 6) + 1;
            if (roll != guess) {
                return "Sorry, you guessed " + guess + ", rolled " + roll;
            }

            // Guessed correctly! Pay out the reward.
            var value = new BigNumber(parseInt(this.balance / 500))
            var winner = this.winners.get(address);
            if ('undefined' == typeof (winner) || !winner) {
                winner = new TransactionContent();
            }

            var result = Blockchain.transfer(address, value)
            if (result) {
                winner.amount = value;
                winner.timestamp = timestamp
                winner.from = address
                this.balance = this.balance.sub(value)
                this.winners.set(address, winner);
                this.winnersCount = this.winnersCount.plus(1)
                this.winnersList.set(this.winnersCount, winner);
                Event.Trigger("diceRoll", {
                    Transfer: {
                        from: Blockchain.transaction.to,
                        to: address,
                        value: winner.amount.toString()
                    }
                });
            } 
            return winner
        } else {
            // lastRollTime < 60.
            var neededTime = 60 - lastRollTime;
            return "Wait another " + neededTime + " seconds to try again."
        }

        return "Blockchain.transaction.from:" + Blockchain.transaction.from + " value " + value
    },
    getRecentWinners: function (count) {
        var messages = []
        var messageCount =+ this.winnersCount

        if (!count) count = 10
        if (count > messageCount) count = messageCount

        for (var i = 1; messageCount >= i && count >= i; i++) {
            messages.push(this.winnersList.get(messageCount - count + i))
        }

        return messages
    }
};
module.exports = DiceRollContract;