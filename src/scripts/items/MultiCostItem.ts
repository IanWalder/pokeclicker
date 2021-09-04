///<reference path="../shop/ShopHandler.ts"/>

/**
 * Source event for decreasing shop multipliers

enum MultiplierDecreaser {
    Battle = 0,
    Berry,
}

/**
 * Additional shop options for an item

interface ShopOptions {
    saveName?: string,
    maxAmount?: number,
    multiplier?: number,
    multiplierDecrease?: boolean,
    multiplierDecreaser?: MultiplierDecreaser,
}
*/

interface CostProfile {
    cost: number;
}

interface CurrencyCostProfile extends CostProfile {
    currency: GameConstants.Currency;
}

interface MineItemCostProfile extends CostProfile {
    itemType: string;
}

// Includes evo stones and battle items
interface PlayerItemCostProfile extends CostProfile {
    itemType: string;
}

interface BerryCostProfile extends CostProfile {
    berryType: BerryType;
}

interface PokeballCostProfile extends CostProfile {
    ballType: GameConstants.Pokeball;
}

/*
Names should be of type KnockoutObservable<string>
Numbers should be of type KnockoutObservable<number>

Currency types are in GameConstants.ts (WORKS)
if (App.game.wallet.hasAmount(new Amount(AMOUNT, CURRENCYTYPE))) {
    App.game.wallet.loseAmount(new Amount(AMOUNT, CURRENCYTYPE));
}

Underground items are in UndergroundItems.ts (WORKS)
let MINEITEM = "Smooth Rock";
let MINEPROFILE = player.mineInventory()[player.mineInventoryIndex(UndergroundItem.list.find(item => item.name == MINEITEM).id)];
if (MINEPROFILE.amount() >= AMOUNT)
    MINEPROFILE.amount(MINEPROFILE.amount()  - AMOUNT);

Stone Types in GameConstants.ts (WORKS)
if (player.itemList[STONENAME]() >= AMOUNT) {
    player.itemList[STONENAME](player.itemList[STONENAME]() - AMOUNT);
}

Battle items in GameConstants.ts (WORKS)
if (player.itemList[BATTLEITEMNAME]() >= AMOUNT) {
    player.itemList[BATTLEITEMNAME](player.itemList[BATTLEITEMNAME]() - AMOUNT);
}

Berry Types in BerryType.ts (WORKS)
if (App.game.farming.berryList[BERRYTYPE]() >= AMOUNT) {
    GameHelper.incrementObservable(App.game.farming.berryList[BERRYTYPE], -AMOUNT);
}

let BALLTYPE = GameConstants.Pokeball.Ultraball; (WORKS)
let BALLPROFILE = App.game.pokeballs.pokeballs.find(item => item.type == BALLTYPE);
if (BALLPROFILE.quantity() >= AMOUNT)
    GameHelper.incrementObservable(BALLPROFILE.quantity, -5);
*/

class MultiCostItem extends Item {
    private totalCurrencyCosts: CurrencyCostProfile[];
    private totalmineItemCosts: MineItemCostProfile[];
    private totalplayerItemCosts: PlayerItemCostProfile[];
    private totalberryCosts: BerryCostProfile[];
    private totalpokeballCosts: PokeballCostProfile[];

    constructor(
        public name: string,
        public maxMultiplier: number,
        public currencyCosts: CurrencyCostProfile[],
        public mineItemCosts: MineItemCostProfile[],
        public playerItemCosts: PlayerItemCostProfile[],
        public berryCosts: BerryCostProfile[],
        public pokeballCosts: PokeballCostProfile[],
        options: ShopOptions,
        displayName?: string,
        description?: string,
        imageDirectory?: string) {

        super(name, 1, GameConstants.Currency.money, { ...options }, displayName, description, imageDirectory);

        this.maxMultiplier = maxMultiplier;
        this.currencyCosts = currencyCosts;
        this.mineItemCosts = mineItemCosts;
        this.playerItemCosts = playerItemCosts;
        this.berryCosts = berryCosts;
        this.pokeballCosts = pokeballCosts;
    }

    findtotalPrice(amount: number) {
        // multiplier should be capped at 100, so work out how many to buy at increasing price and how many at max
        //    (m_start) * (m^k) = 100
        // => k = (2 - log(m_start)) / log(m)
        const mStart = Math.max(player.itemMultipliers[this.saveName] || 1, 1);
        const k = (mStart < this.maxMultiplier) ? Math.ceil((2 - Math.log10(mStart)) / Math.log10(this.multiplier)) : 0;
        const incAmount = Math.min(k, amount);

        this.totalCurrencyCosts = this.currencyCosts;
        this.totalCurrencyCosts.forEach(profile => {
            const incCost = (profile.cost * (1 - Math.pow(this.multiplier, incAmount))) / (1 - this.multiplier);
            const maxCost = (profile.cost * 100 * (amount - incAmount));
            profile.cost = incCost + maxCost;
        });
        
        this.totalmineItemCosts = this.mineItemCosts;
        this.totalmineItemCosts.forEach(profile => {
            const incCost = (profile.cost * (1 - Math.pow(this.multiplier, incAmount))) / (1 - this.multiplier);
            const maxCost = (profile.cost * 100 * (amount - incAmount));
            profile.cost = incCost + maxCost;
        });
        
        this.totalplayerItemCosts = this.playerItemCosts;
        this.totalplayerItemCosts.forEach(profile => {
            const incCost = (profile.cost * (1 - Math.pow(this.multiplier, incAmount))) / (1 - this.multiplier);
            const maxCost = (profile.cost * 100 * (amount - incAmount));
            profile.cost = incCost + maxCost;
        });
        
        this.totalberryCosts = this.berryCosts;
        this.totalberryCosts.forEach(profile => {
            const incCost = (profile.cost * (1 - Math.pow(this.multiplier, incAmount))) / (1 - this.multiplier);
            const maxCost = (profile.cost * 100 * (amount - incAmount));
            profile.cost = incCost + maxCost;
        });
        
        this.totalpokeballCosts = this.pokeballCosts;
        this.totalpokeballCosts.forEach(profile => {
            const incCost = (profile.cost * (1 - Math.pow(this.multiplier, incAmount))) / (1 - this.multiplier);
            const maxCost = (profile.cost * 100 * (amount - incAmount));
            profile.cost = incCost + maxCost;
        });
    }

    buy(n: number) {
        if (n <= 0) {
            return;
        }

        if (n > this.maxAmount) {
            Notifier.notify({
                message: `You can only buy ${this.maxAmount} &times; ${GameConstants.humanifyString(this.displayName)}!`,
                type: NotificationConstants.NotificationOption.danger,
            });
            n = this.maxAmount;
        }

        if (!this.isAvailable()) {
            Notifier.notify({
                message: `${GameConstants.humanifyString(this.displayName)} is sold out!`,
                type: NotificationConstants.NotificationOption.danger,
            });
            return;
        }

        const multiple = n > 1 ? 's' : '';

        let affordChecks = 0;

        this.totalCurrencyCosts.forEach(profile => {
            affordChecks += App.game.wallet.hasAmount(new Amount(profile.cost, profile.currency)) ? 1 : 0;
        });

        this.totalmineItemCosts.forEach(profile => {
            let mineItem = player.mineInventory()[player.mineInventoryIndex(UndergroundItem.list.find(item => item.name == profile.itemType).id)];
            affordChecks += (mineItem.amount() >= profile.cost) ? 1 : 0;
        });

        this.totalplayerItemCosts.forEach(profile => {
            affordChecks += (player.itemList[profile.itemType]() >= profile.cost) ? 1 : 0;
        });

        this.totalberryCosts.forEach(profile => {
            affordChecks += (App.game.farming.berryList[profile.berryType]() >= profile.cost) ? 1 : 0;
        });

        this.totalpokeballCosts.forEach(profile => {
            let ballAmt = App.game.pokeballs.pokeballs.find(item => item.type == profile.ballType);
            affordChecks += (ballAmt.quantity() >= profile.cost) ? 1 : 0;
        });

        if (affordChecks >= (this.totalCurrencyCosts.length + this.totalmineItemCosts.length +
                             this.totalplayerItemCosts.length + this.totalberryCosts.length + this.totalpokeballCosts.length)) {

            this.totalCurrencyCosts.forEach(profile => {
                App.game.wallet.loseAmount(new Amount(profile.cost, profile.currency));
            });

            this.totalmineItemCosts.forEach(profile => {
                let mineItem = player.mineInventory()[player.mineInventoryIndex(UndergroundItem.list.find(item => item.name == profile.itemType).id)];
                affordChecks += (mineItem.amount() >= profile.cost) ? 1 : 0;
            });

            this.totalplayerItemCosts.forEach(profile => {
                affordChecks += (player.itemList[profile.itemType]() >= profile.cost) ? 1 : 0;
            });

            this.totalberryCosts.forEach(profile => {
                affordChecks += (App.game.farming.berryList[profile.berryType]() >= profile.cost) ? 1 : 0;
            });

            this.totalpokeballCosts.forEach(profile => {
                let ballAmt = App.game.pokeballs.pokeballs.find(item => item.type == profile.ballType);
                affordChecks += (ballAmt.quantity() >= profile.cost) ? 1 : 0;
            });

            this.gain(n);
            this.increasePriceMultiplier(n);
            Notifier.notify({
                message: `You bought ${n} ${GameConstants.humanifyString(this.displayName)}${multiple}`,
                type: NotificationConstants.NotificationOption.success,
            });
        } else {
            let curr = GameConstants.camelCaseToString(GameConstants.Currency[this.currency]);
            switch (this.currency) {
                case GameConstants.Currency.money:
                    break;
                default:
                    curr += 's';
                    break;
            }
            Notifier.notify({
                message: `You don't have enough ${curr} to buy ${n} ${GameConstants.humanifyString(this.displayName) + multiple}`,
                type: NotificationConstants.NotificationOption.danger,
            });
        }
    }

    gain(n: number) {
        player.gainItem(this.name, n);
    }

    use(): boolean {
        return false;
    }

    isAvailable(): boolean {
        return true;
    }

    increasePriceMultiplier(amount = 1) {
        player.itemMultipliers[this.saveName] = Math.min(100, (player.itemMultipliers[this.saveName] || 1) * Math.pow(this.multiplier, amount));
        this.price(Math.round(this.basePrice * player.itemMultipliers[this.saveName]));
    }

    decreasePriceMultiplier(amount = 1, multiplierDecreaser: MultiplierDecreaser) {
        if (!this.multiplierDecrease) {
            return;
        }
        if (this.multiplierDecreaser !== multiplierDecreaser) {
            return;
        }
        player.itemMultipliers[this.saveName] = Math.max(1, (player.itemMultipliers[this.saveName] || 1) / Math.pow(this.multiplier, amount));
        this.price(Math.round(this.basePrice * player.itemMultipliers[this.saveName]));
    }

    get description() {
        return this._description;
    }

    get displayName() {
        return GameConstants.humanifyString(this._displayName);
    }

    get image() {
        const subDirectory = this.imageDirectory ? `${this.imageDirectory}/` : '';
        return `assets/images/items/${subDirectory}${this.name}.png`;
    }

}
