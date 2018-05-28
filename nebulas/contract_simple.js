'use strict';
'use strict';

var WinnerContent = function (text) {
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
WinnerContent.prototype = {
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
            return new WinnerContent(text);
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
    },
    getBalance: function () {
        return this.balance
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
                winner = new WinnerContent();
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
    }
    
};
module.exports = DiceRollContract;