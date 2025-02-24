// Github:	 https://github.com/Roll20/roll20-api-scripts/tree/master/TreasureGenerator/
// By:		 Boli (Steven Wrighton): Professional Software Developer, Enthusiatic D&D Player since 1993.
// Contact:	 https://app.roll20.net/users/3714078/boli
// Readme	 https://github.com/boli32/TreasureGenerator/blob/main/README.md 


var TreasureGenerator = TreasureGenerator || (function () {
	'use strict';
	
	const TreasureGenerator_Version = 1.0;

	const getTreasureData = () => {
		let TDATA = {};
		if (state.TreasureData) {
			if (state.TreasureData.TDATA) TDATA = state.TreasureData.TDATA;
		}
		return TDATA;
	};
	const TDATA = getTreasureData();

	let TREASURE_GENERATOR = {
		version: TreasureGenerator_Version,
		verboseErrorLogging: true,
		readableJSON: true,
		DnDVersion: 2014
	};
	const loadTreasureGeneratorData = () => {
		initializeTreasureGeneratorState();
		TREASURE_GENERATOR.version = state.TREASURE_GENERATOR.version || TreasureGenerator_Version;
		TREASURE_GENERATOR.verboseErrorLogging = state.TREASURE_GENERATOR.verboseErrorLogging || true;
		TREASURE_GENERATOR.DnDVersion = state.TREASURE_GENERATOR.DnDVersion || 2014;
	};
	const saveTreasureGeneratorData = () => {
		state.TREASURE_GENERATOR.version = TREASURE_GENERATOR.version;
		state.TREASURE_GENERATOR.verboseErrorLogging = TREASURE_GENERATOR.verboseErrorLogging;
		state.TREASURE_GENERATOR.DnDVersion = TREASURE_GENERATOR.DnDVersion;
		
	};
	const initializeTreasureGeneratorState = (forced = false) => {
		if (!state.TREASURE_GENERATOR || Object.keys(state.TREASURE_GENERATOR).length === 0 || forced) {
			state.TREASURE_GENERATOR = {
				version: TreasureGenerator_Version,
				verboseErrorLogging: true,
				DnDVersion: 2014
			}
			Utils.sendGMMessage("TreasureGenerator has been initialized.");
		}
	};
	const checkVersion = () => {
		if (TREASURE_GENERATOR.version === 1.0) return true;
	};
	const Utils = (() => {
		const sendGMMessage = (message) => {
			sendChat('Treasure Generator', `/w gm ${message}`, null, { noarchive: true });
		};
		const sendMessage = (message) => {
			sendChat('Treasure Generator', `${message}`);
		};
		const toggleVerboseError = (value) => {
			TREASURE_GENERATOR.verboseErrorLogging = (value === 'true');
			saveQuestTrackerData();
		};
		const inputAlias = (command) => {
			const aliases = {
				'!treasure': '!treasure-menu action=main'
			};
			return aliases[command] || command;
		};
		return {
			sendGMMessage,
			sendMessage,
			toggleVerboseError,
			inputAlias
		};
	})(); 

const Generate = (() => {
	const H = {
		weightedRandom: (items) => {
			const weights = {
				"common": 625,
				"uncommon": 125,
				"rare": 25,
				"very rare": 5,
				"legendary": 1
			};
			const weightedList = items.reduce((acc, item) => {
				const weight = weights[item.rarity] || 1;
				return acc.concat(Array(weight).fill(item));
			}, []);
			return weightedList.length > 0
				? weightedList[Math.floor(Math.random() * weightedList.length)]
				: null;
		},
		getAllSpellIDs: () => {
			return Object.keys(TDATA.spells);
		},
		getValidSpells: (maxLevel) => {
			return Object.values(TDATA.spells)
			.filter(spell => spell.level <= maxLevel && spell.spellbook);
		},
		getWeightedSpells: (maxLevel, minSpells, maxSpells) => {
			const allSpells = H.getValidSpells(maxLevel);
			if (!allSpells || allSpells.length === 0) return []; 
			const requiredSpells = [];
			for (let level = 1; level <= maxLevel; level++) {
				const levelSpells = allSpells.filter(spell => spell.level === level);
				if (levelSpells.length > 0) {
					requiredSpells.push(H.weightedRandom(levelSpells));
				}
			}
			const extraSpells = [];
			const totalSpells = Math.floor(Math.random() * (maxSpells - minSpells + 1)) + minSpells;
			while (extraSpells.length + requiredSpells.length < totalSpells) {
				const randomSpell = H.weightedRandom(allSpells);
				if (!requiredSpells.includes(randomSpell) && !extraSpells.includes(randomSpell)) {
					extraSpells.push(randomSpell);
				}
			}
			return [...requiredSpells, ...extraSpells];
		}
	};
	const getSpellScroll = (level, spellID = null) => {
		if (spellID) {
			if (!H.getAllSpellIDs().includes(spellID)) return null;
			const spell = TDATA.spells[spellID];
			const scrollDescriptions = Object.values(TDATA.descriptions.scrolls);
			const scrollDescription = scrollDescriptions[Math.floor(Math.random() * scrollDescriptions.length)];
			return {
				name: scrollDescription.name,
				spell: spell.name,
				level: spell.level,
				rarity: spell.rarity
			};
		}
		if (![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(level)) level = 1;
		const matchingSpells = Object.values(TDATA.spells).filter(spell =>
			spell.level === level && spell.version.includes(TREASURE_GENERATOR.DnDVersion)
		);
		const spell = matchingSpells[Math.floor(Math.random() * matchingSpells.length)];
		const scrollDescriptions = Object.values(TDATA.descriptions.scrolls);
		const scrollDescription = scrollDescriptions[Math.floor(Math.random() * scrollDescriptions.length)];
		return {
			name: scrollDescription.name,
			spell: spell.name
		};
	};
	const getSpellBook = (tier, spellIDs = []) => {
		const tierSettings = {
			1: { maxLevel: 2, minSpells: 4, maxSpells: 8 },
			2: { maxLevel: 4, minSpells: 8, maxSpells: 16 },
			3: { maxLevel: 6, minSpells: 16, maxSpells: 20 },
			4: { maxLevel: 8, minSpells: 20, maxSpells: 24 },
			5: { maxLevel: 9, minSpells: 24, maxSpells: 32 }
		};
		const integrityModifiers = {
			"complete": 1,
			"well_worn": 0.75,
			"damaged": 0.5,
			"fragments": 0.25
		};
		const integrityLevels = Object.keys(integrityModifiers);
		const integrity = integrityLevels[Math.floor(Math.random() * integrityLevels.length)];
		const { maxLevel, minSpells, maxSpells } = tierSettings[tier] || tierSettings[1];
		const adjustedMinSpells = Math.max(1, Math.floor(minSpells * integrityModifiers[integrity]));
		const adjustedMaxSpells = Math.max(adjustedMinSpells, Math.floor(maxSpells * integrityModifiers[integrity]));
		let spells = H.getWeightedSpells(maxLevel, adjustedMinSpells, adjustedMaxSpells);
		const validSpellIDs = H.getAllSpellIDs();
		const specifiedSpells = spellIDs
			.filter(id => validSpellIDs.includes(id))
			.map(id => TDATA.spells[id])
			.filter(spell => spell.level <= maxLevel && spell.spellbook);
		spells = [...new Set([...spells, ...specifiedSpells])];
		const spellbookDescriptions = Object.values(TDATA.descriptions.spellbooks).filter(
			desc => desc.integrity === integrity
		);
		const spellbookDescription = spellbookDescriptions[Math.floor(Math.random() * spellbookDescriptions.length)];
		return {
			name: spellbookDescription.name,
			linkingtext: spellbookDescription.linkingtext,
			spells: spells.map(spell => spell.name)
		};
	};
	return {
		getSpellScroll,
		getSpellBook
	};
})();




	const Menu = (() => {
		const mainMenu = () => {
			log(Generate.getSpellScroll(1));
			Utils.sendGMMessage("Hello World");
			log(Generate.getSpellBook(1));
			log(Generate.getSpellBook(1));
			log(Generate.getSpellBook(2));
			log(Generate.getSpellBook(2));
			log(Generate.getSpellBook(3));
			log(Generate.getSpellBook(3));
			log(Generate.getSpellBook(4));
			log(Generate.getSpellBook(4));
			log(Generate.getSpellBook(5));
			log(Generate.getSpellBook(6));
			
		};
		return {
			mainMenu
		}
	})(); 
	

	const handleInput = (msg) => {
		if (msg.type !== 'api' || !playerIsGM(msg.playerid) || !msg.content.startsWith('!treasure')) {
			return;
		}
		msg.content = Utils.inputAlias(msg.content);
		const args = msg.content.split(' ');
		const command = args.shift();
		const params = args.join(' ').split('|').reduce((acc, param) => {
			const [key, value] = param.split('=');
			if (key && value) {
				acc[key.trim()] = value.trim();
			}
			return acc;
		}, {});
		if (errorCheck(1, 'exists', command,'command')) return;
		if (command === '!treasure-menu') {
			const { action, field, current, old = '', new: newItem = '', id, confirmation, key } = params;
			if (errorCheck(2, 'exists', action,'action')) return;
			switch (action) {
				case "main":
					Menu.mainMenu();
					break;
			}
		}
		else if (command === '!treasure-reset') {
			initializeTreasureGeneratorState(true);
			loadTreasureGeneratorData();
		}
		else errorCheck(3, 'msg', null,`Unknown command: ${command}`);
	};
	const errorCheck = (id = 0, type = null, data = null, check = null) => {
		switch (type) {
			case 'confirmation':
				if (data === check) return true;
				else {
					switch (check) {
						case 'CONFIRM':
							Utils.sendGMMessage(`Error ${id}: Confirmation required to reset all data. Please type CONFIRM when prompted.`);
							break;
						case 'DELETE':
							Utils.sendGMMessage(`Error ${id}: Confirmation required to delete location. Please type DELETE to confirm.`);
							break;
					}
				}
				break;
			case 'date':
				if (!/^\d+-\d+-\d+$/.test(data)) {
					Utils.sendGMMessage(`Error ${id}: Invalid date format: ${data}. Must be digits separated by dashes (e.g., YYYY-MM-DD or similar).`);
					return true
				}
				break;
			case 'exists':
				if (data === null) {
					if (TREASURE_GENERATOR.verboseErrorLogging) Utils.sendGMMessage(`Error ${id}: The variable ${check} does not exist.`);
					return true;
				}
				break;
			case 'msg':
				Utils.sendGMMessage(`Error ${id}: ${check}`);
				break;
			case 'number':
				if (isNaN(data)) {
					if (TREASURE_GENERATOR.verboseErrorLogging) Utils.sendGMMessage(`Error ${id}: ${check} is not a number.`);
					return true;
				}
				break;
		}
		return false;
	};
	return {
		getTreasureData,
		Utils,
		loadTreasureGeneratorData,
		saveTreasureGeneratorData,
		initializeTreasureGeneratorState,
		handleInput,
		errorCheck,
		checkVersion,
		Menu,
		Generate
	};
})();


on('ready', function () {
	'use strict';
	const TDATA = TreasureGenerator.getTreasureData();
	if (!TDATA) return;
	TreasureGenerator.initializeTreasureGeneratorState();
	TreasureGenerator.loadTreasureGeneratorData();
	TreasureGenerator.checkVersion();
	on('chat:message', function(msg) {
		TreasureGenerator.handleInput(msg);
	});
});