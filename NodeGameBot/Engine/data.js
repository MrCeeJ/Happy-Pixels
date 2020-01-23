const robot = require("robotjs")
robot.setKeyboardDelay(0)
const path = require("path")
const fs = require("fs")

let screenSize = robot.getScreenSize()
// Ability to run macro '/script EXIT_PROCESS_STATUS = 1' in order to stop DataToColor script
const ALLOW_PROCESS_EXIT_TRIGGER = false
// Dependency used for configuring bitmap dimensions, data coordinates, etc.
const configureData = require('../lib/DataStructures/ConfigureBitmapCoords.js')

global.__basedir = path.resolve(__dirname, "../../")

let beginDataProcessing = () => {
    // Frame coordinate array
    let f = JSON.parse(fs.readFileSync(path.resolve(__basedir, './Database/lib/frameCoordinates.json')))
    let readerMapXMin = Infinity
    let readerMapYMin = Infinity
    let readerMapXMax = 0
    let readerMapYMax = 0

    // Finds the dimensions of our bitmap we pull data from
    for (let i = 0; i < f.length; i++) {
        if (f[i].x > readerMapXMax) {
            readerMapXMax = f[i].x + 1
        }
        if (f[i].y > readerMapYMax) {
            readerMapYMax = f[i].y + 1
        }
        if (readerMapXMin > f[i].x) {
            readerMapXMin = f[i].x - 1
        }
        if (readerMapYMin > f[i].y) {
            readerMapYMin = f[i].y - 1
        }
    }
    // Used to check if we program is configuring bitmap information
    let configuringNewDataMapCoords = false

    // Variable names that will be stored in the info object
    let xcoord, ycoord, direction, needWater, needFood, needManaGem, targetIsDead, target, targetInCombat, playerInCombat, health, healtlhMax, healthCurrent, mana, manaMax, manaCurrent, level, range, gold, targetFrozen, targetHealth
    let deadStatus, talentPoints, skinning, gossipWindowOpen, itemsAreBroken, bagIsFull, bindingWindowOpen, metaData, zone, flying, frameCols, dataWidth, gossipOptions, corpseX, corpseY, fishing, gameTime, playerClass, unskinnable,
        hearthZone, targetOfTargetIsPlayer, processExitStatus, bitmask

    let spell = {
        melee: {},
        fireball: {}, // Slot 2
        frostbolt: {}, // Slot 3
        fireBlast: {}, // Slot 4
        frostNova: {}, // Slot 5
        eatFood: {}, // Slot 6
        drinkWater: {}, // Slot 7
        slot8: {},
        evocation: {}, // Slot 9
        manaShield: {}, // Slot 10
        counterspell: {}, // Slot 11
        slot12: {},
        conjureFood: {}, // Slot 61
        conjureWater: {}, // Slot 62
        frostArmor: {}, // Slot 63
        arcaneIntellect: {}, // Slot 64
        blink: {}, // Slot 65
        conjureGem: {}, // Slot 66
        consumeGem: {}, // Slot 67
        iceBarrier: {}, // Slot 68
        slot69: {},
        hearthstone: {},
        slot71: {},
        slot72: {}
    }
    let item = []
    let equip = []
    let bags = []

    // Fills item array with blank values on init
    for (let i = 0; i < 80; i++) {
        item[i] = {
            itemID: 0,
            itemCount: 0,
        }
    }

    // Fills item array with blank values on init
    for (let i = 0; i < 16; i++) {
        equip[i] = i
    }
    setInterval(() => {
        this.info = {
            metaData: metaData,
            xcoord: xcoord,
            ycoord: ycoord,
            direction: direction,
            target: target,
            needWater: needWater,
            needFood: needFood,
            needManaGem: needManaGem,
            playerInCombat: playerInCombat,
            targetInCombat: targetInCombat,
            targetIsDead: targetIsDead,
            health: health,
            healthCurrent: healthCurrent,
            mana: mana,
            manaCurrent: manaCurrent,
            range: range,
            level: level,
            gold: gold,
            deadStatus: deadStatus,
            talentPoints: talentPoints,
            skinning: skinning,
            item: item,
            equip: equip,
            bags: bags,
            spell: spell,
            gossipWindowOpen: gossipWindowOpen,
            itemsAreBroken: itemsAreBroken,
            bagIsFull: bagIsFull,
            bindingWindowOpen: bindingWindowOpen,
            zone: zone,
            fishing: fishing,
            gameTime: gameTime,
            gossipOptions: gossipOptions,
            corpseX: corpseX,
            corpseY: corpseY,
            playerClass: playerClass,
            targetHealth: targetHealth,
            flying: flying,
            hearthZone: hearthZone,
            targetOfTargetIsPlayer: targetOfTargetIsPlayer,
            bitmask: bitmask
        }
    })

    class SquareReader {
        constructor(pixels) {
            this.pixels = pixels;
        }

        getColorAtCell(cell) {
            return this.pixels.colorAt(cell.x, cell.y)
        }

        getIntAtCell(cell) {
            let color = this.getColorAtCell(cell)
            return parseInt(color, 16)
        }

        getFixedPointAtCell(cell) {
            return this.getIntAtCell(cell) / 100000
        }
        getStringAtCell(cell) {
            let color = this.getIntAtCell(cell)
            if (color && color !== 0) {
                color = color.toString()
                let word = ''
                // Iterates through each ASCII code and sets it equal to relevant character
                for (let i = 0; i < 3; i++) {
                    let char = color.slice(i * 2, (i + 1) * 2)
                    word = word + String.fromCharCode(char)
                }
                // Removes null bytes if any, but leaves spaces
                word = word.replace('\0', '')
                return word
                // If data input is 0, outputs empty string. e.g. no target
            } else {
                return ''
            }
        }


    }

    // Locates the pixels, records their hex, translates values into decimal.
    // xcoord, ycoord, and radians are returned for each respective variable.
    setInterval(() => {
        let dataBitmap = robot.screen.capture(readerMapXMin, readerMapYMin, readerMapXMax, readerMapYMax) // Takes a bitmap of the hex encoded variables
        let reader = new SquareReader(dataBitmap)

        xcoord = reader.getFixedPointAtCell(f[1]) * 10
        ycoord = reader.getFixedPointAtCell(f[2]) * 10
        direction = reader.getFixedPointAtCell(f[3])
        zone = reader.getStringAtCell(f[4]).concat(reader.getStringAtCell(f[5])) // Checks current geographic zone
        // gets the position of your corpse where you died
        corpseX = reader.getFixedPointAtCell(f[6])
        corpseY = reader.getFixedPointAtCell(f[7])
        // Boolean values stored in one block
        assignBinaryVariables(reader.getIntAtCell(f[8])) // Grabs all boolean values
        // Player health and mana
        healthMax = reader.getIntAtCell(f[10]) // Maximum amount of health of player
        healthCurrent = reader.getIntAtCell(f[11]) // Current amount of health of player
        health = (healthCurrent / healthMax) * 100 // Health in terms of a percentage
        manaMax = reader.getIntAtCell(f[12]) // Maximum amount of mana
        manaCurrent = reader.getIntAtCell(f[13]) // Current amount of mana
        mana = (manaCurrent / manaMax) * 100 // Mana in terms of a percentage
        // Level is our character's exact level ranging from 1-60
        level = reader.getIntAtCell(f[14])
        // range detects if a target range. Bases information off of action slot 2, 3, and 4. Outputs: 50, 35, 30, or 20
        range = reader.getIntAtCell(f[15])
        // Grabs the target ID, whether we are in combat, how much food and potions we have left, and if our target is kill
        target = reader.getStringAtCell(f[16]) + (reader.getStringAtCell(f[17]))
        // Targets current percentage of health
        targetHealth = (reader.getIntAtCell(f[19]))
        // Gold is the amount of money that we currently have in coppers
        // First pixel position of items
        let itemDataStart = 20
        for (let i = 0; i < 5; i++) {
            let itemValue = reader.getIntAtCell(f[itemDataStart + (i * 2)])
            let itemId = parseInt(itemValue.toString().slice(-5))
            let itemCount = itemId == 0 ? 0 : parseInt(itemValue.toString().slice(0, -5))
            item[reader.getIntAtCell(f[itemDataStart + (i * 2) + 1]) - 1] = { "ItemID": itemId, "ItemCount": itemCount }
        }
        item.length = 80
        // Fills equipped items array
        equip[reader.getIntAtCell(f[31]) - 1] = reader.getIntAtCell(f[30])
        equip.length = 18
        gold = reader.getIntAtCell(f[32]) + reader.getIntAtCell(f[33]) * 1000000

        let spellObj = Object.keys(spell)
        // Assigns each spell slot up to three statuses: Is there a spell equipped, is it on cooldown (can we cast it or not), and do we have enough mana to cast it
        let castableBinary = reader.getIntAtCell(f[34])
        let equippedBinary = reader.getIntAtCell(f[35])
        let notEnoughManaBinary = reader.getIntAtCell(f[36])
        // Loops through binaries of three pixels. Currently does 24 slots. 1-12 and 61-72.
        for (let i = 23; i >= 0; i--) {
            // Checks if the spell is currently castable, is it not on cooldown, are we not stunned, are we out of mana, etc.
            if (castableBinary - Math.pow(2, i) >= 0) {
                spell[spellObj[i]].castable = true
                castableBinary = castableBinary - Math.pow(2, i)
            } else {
                spell[spellObj[i]].castable = false
            }
            // Checks if there is a spell equipped in this slot
            if (equippedBinary - Math.pow(2, i) >= 0) {
                spell[spellObj[i]].equipped = true
                equippedBinary = equippedBinary - Math.pow(2, i)
            } else {
                spell[spellObj[i]].equipped = false
            }
            // Checks if the reason we can't cast a spell is due to not having enough mana. castable also checks if we are out of mana, but is used for more specific instances such as switching to wand/melee.
            if (notEnoughManaBinary - Math.pow(2, i) >= 0) {
                spell[spellObj[i]].notEnoughMana = true
                notEnoughManaBinary = notEnoughManaBinary - Math.pow(2, i)

            } else {
                spell[spellObj[i]].notEnoughMana = false
            }
        }
        targetFrozen = (reader.getIntAtCell(f[43]) !== 0)
        if (screenSize.width = 1366) {
            gossipWindowOpen = (robot.getPixelColor(171, 285) !== "801acc") // 1366 x 768
            bindingWindowOpen = (robot.getPixelColor(773, 184) !== "801acc") // 1366 x 768
        } else if (screenSize.width = 1074) {
            gossipWindowOpen = (robot.getPixelColor(114, 208) !== "801acc") // 1074 x 479
            bindingWindowOpen = (robot.getPixelColor(587, 180) !== "801acc") // 1074 x 479
        } else if (screenSize.width = 1920) {
            gossipWindowOpen = (robot.getPixelColor(123, 205) !== "801acc") // true if the Gossip Window is open else false
            bindingWindowOpen = (robot.getPixelColor(1086, 257) !== "801acc") // true if the binding window is open else false
        }
        // gossipOptions provides data about the gossip options available. 0 = no options. 1 = non quest options, 2 = only quest options, 3 = non-quest and quest options
        gossipOptions = reader.getIntAtCell(f[45])
        // Returns 1 if our target is unskinnable (Therefore returns 1 if we have no target). Else returns 0
        unskinnable = (reader.getIntAtCell(f[47]) !== 0)
        hearthZone = reader.getIntAtCell(f[48])
        // Exits node process if command is triggered
        processExitStatus && ALLOW_PROCESS_EXIT_TRIGGER ? process.exit() : false
    });

    // Calculates less urgent variables using the same formula as above
    setInterval(() => {
        let dataBitmap = robot.screen.capture(readerMapXMin, readerMapYMin, readerMapXMax, readerMapYMax)
        let reader = new SquareReader(dataBitmap)
        bitmask = reader.getIntAtCell(f[8])
        // Finds N Data Points, N Frame Rows, and Approximate Cell Size
        metaData = parseInt(dataBitmap.colorAt(1, 1), 16)
        // Finds new bitmap coordinates. Skips over this section if metaData is not in figure mode (metaData == 0) or configuration is already taking place
        setTimeout(async () => {
            if (metaData > 0 && !configuringNewDataMapCoords) {
                configuringNewDataMapCoords = true
                await configureData.configureDataCoords(metaData)
                configuringNewDataMapCoords = false
            }
        })

        // Number of bag slots in each individual bag. Numbers returned should range from 0 to 14
        bags[0] = 16 // Our first bag will always contain 16 slots by default
        for (let i = 1; i < 5; i++) {
            bags[i] = reader.getIntAtCell(f[i + 36])
        }
        try {
            let flag = false
            let item = this.info.item
            let slot = this.info.bags
            for (let i = 0; i < slot.length; i++) {
                let min = i * 16
                let max = i * 16 + slot[i]
                for (let j = min; j < max; j++) {
                    if (item[j]["ItemID"] != 0) {
                        // console.log("found item at: ", j)
                        flag = true
                    } else {
                        flag = false
                        // console.log("bag is not full yet!")
                        break
                    }
                }
                if (flag == false) {
                    break
                }
            }
            bagIsFull = flag
        } catch (err) {
            bagIsFull = false
        }
        skinning = reader.getIntAtCell(f[41])
        fishing = reader.getIntAtCell(f[42])
        gameTime = reader.getIntAtCell(f[44])
        // Returns class ID e.g. 128 represents the ID for mages.
        playerClass = reader.getIntAtCell(f[46])
    }, 4000)
    // Defines number of boolean variables contaained in base2Operation.
    let assignBinaryVariables = (base2Operation) => {
        for (let i = 17; i >= 0; i--) {
            let active = (base2Operation - Math.pow(2, i)) >= 0 ? true : false
            switch (i) {
                case 17:
                    processExitStatus = active
                    break;
                case 16:
                    needManaGem = active
                    break;
                case 15:
                    targetOfTargetIsPlayer = active
                    break;
                case 14:
                    playerInCombat = active
                    break;
                case 13:
                    spell.drinkWater.active = active
                    break;
                case 12:
                    spell.evocation.active = active
                    break;
                case 11:
                    needFood = active
                    break;
                case 10:
                    flying = active
                    break;
                case 9:
                    itemsAreBroken = active
                    break;
                case 8:
                    spell.iceBarrier.active = active
                    break;
                case 7:
                    spell.arcaneIntellect.active = active
                    break;
                case 6:
                    spell.frostArmor.active = active
                    break;
                case 5:
                    spell.eatFood.active = active
                    break;
                case 4:
                    needWater = active
                    break;
                case 3:
                    talentPoints = active
                    break;
                case 2:
                    deadStatus = active
                    break;
                case 1:
                    targetIsDead = active
                    break;
                case 0:
                    targetInCombat = active
                    break;
            }
            if (active) {
                base2Operation = base2Operation - Math.pow(2, i)
            }
        }
    }
}

// In the case that frameCoordinates file does not exist, creates a new one
if (!fs.existsSync(path.resolve(__basedir, './Database/lib/frameCoordinates.json'))) {
    configureData.configureDataCoords(null, true).then(() => {
        console.log('Starting Data.js')
        beginDataProcessing()
    })
} else {
    console.log('Starting Data.js')
    beginDataProcessing()
}