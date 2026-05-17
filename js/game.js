const KEY_MAP = {
    // Movement — WASD, Cyrillic, and arrows → canonical codes
    'w': 'up',    'ц': 'up',    'arrowup': 'up',
    's': 'down',  'ы': 'down',  'ь': 'down', 'arrowdown': 'down',
    'a': 'left',  'ф': 'left',  'arrowleft': 'left',
    'd': 'right', 'в': 'right', 'arrowright': 'right',
    // Actions
    'shift': 'boost',
    'f': 'fire',   'а': 'fire',
    'enter': 'fire',
    ' ': 'space',
    'm': 'map',    'ь': 'map',
    'tab': 'tab',
    'r': 'restart', 'к': 'restart',
    'h': 'hide',    'р': 'hide',
    'n': 'music',   'т': 'music',
    'escape': 'menu',
    '1': 'weapon1', '2': 'weapon2', '3': 'weapon3',
};

// Also handle by event.code for layout-independent physical keys
const CODE_MAP = {
    'KeyW': 'up',    'KeyS': 'down',   'KeyA': 'left',   'KeyD': 'right',
    'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
    'ShiftLeft': 'boost', 'ShiftRight': 'boost',
    'KeyF': 'fire',
    'Enter': 'fire',
    'Space': 'space',
    'KeyM': 'map',
    'Tab': 'tab',
    'KeyR': 'restart',
    'KeyH': 'hide',
    'KeyN': 'music',
    'Escape': 'menu',
    'Digit1': 'weapon1', 'Digit2': 'weapon2', 'Digit3': 'weapon3',
};

function normalizeKey(e) {
    // Prefer code-based mapping (layout-independent)
    if (CODE_MAP[e.code]) return CODE_MAP[e.code];
    // Fallback to key.toLowerCase() mapping
    return KEY_MAP[e.key ? e.key.toLowerCase() : ''] || null;
}

// ═══════════════════════════════════════════════════
//  CONSTANTS & CONFIG
// ═══════════════════════════════════════════════════
const WORLD = { width: 2400, height: 1600 };
let TIME_LIMIT = 120;
let currentLevelIndex = 0;
let currentLevelConfig = null;
let maxUnlockedLevel = 1;
let coins = 0;
let tutorialHidden = false;
let tutorialFlags = { moved:false, turned:false, boosted:false, map:false, bonus:false, drone:false, glitch:false, finish:false };
let levelCompletedOnce = false;
let musicEnabled = true;
let activeWeapon = 'gun';
let bestByLevel = {};
let shopReturnState = 'menu';
let shopWasPaused = false;
let bossSpawned = false;
let gpsRoutePoints = [];
let robots = [];
let robotBullets = [];
let shopZone = null;

const LEVELS = [
    {
        id: 1,
        type: 'tutorial',
        name: 'TRAINING BLOCK',
        world: { width: 2800, height: 1900 },
        timeLimit: 190,
        droneCount: 2,
        bonusCount: 14,
        glitchCount: 5,
        buildingStepX: 230,
        buildingStepY: 190,
        objective: 'LEARN CONTROLS · DELIVER CARTRIDGE',
        tutorial: true,
        start: { x: 170, y: 1700, angle: -Math.PI / 2 },
        dest: { x: 2350, y: 170, w: 190, h: 130 },
        visualDistricts: [
            { x: 60, y: 1500, w: 760, h: 310, color: '#00f5ff', label: 'START DOCK' },
            { x: 1180, y: 540, w: 900, h: 350, color: '#ff2bd6', label: 'GLITCH LESSON' },
            { x: 2140, y: 90, w: 560, h: 330, color: '#ffd166', label: 'ARCADE CLUB' }
        ],
        landmarks: [
            { x: 320, y: 1530, text: 'SHIFT BOOST TEST', color: '#00f5ff' },
            { x: 1390, y: 970, text: 'WATCH DRONES', color: '#ff2bd6' },
            { x: 2350, y: 140, text: 'ARCADE CLUB', color: '#ffd166' }
        ],
        roads: [
            { x: 90, y: 1620, w: 710, h: 200 },
            { x: 560, y: 1080, w: 200, h: 740 },
            { x: 560, y: 1080, w: 980, h: 200 },
            { x: 1340, y: 620, w: 200, h: 660 },
            { x: 1340, y: 620, w: 850, h: 200 },
            { x: 1980, y: 170, w: 200, h: 650 },
            { x: 1980, y: 170, w: 600, h: 200 },
            { x: 760, y: 1380, w: 720, h: 170 },
            { x: 1480, y: 820, w: 170, h: 730 },
            { x: 1650, y: 820, w: 470, h: 170 }
        ],
        // FIX #4: route waypoints snapped to road centers
        route: [
            { x: 310, y: 1720, label: '01' },
            { x: 660, y: 1720, label: '02' },
            { x: 660, y: 1180, label: '03' },
            { x: 1440, y: 1180, label: '04' },
            { x: 1440, y: 720, label: '05' },
            { x: 2080, y: 720, label: '06' },
            { x: 2080, y: 270, label: '07' },
            { x: 2445, y: 235, label: 'CLUB' }
        ],
        barricades: [
            { x: 850, y: 1170, w: 78, h: 34 },
            { x: 1560, y: 720, w: 78, h: 34 },
            { x: 1895, y: 270, w: 78, h: 34 }
        ]
    },
    {
        id: 2,
        type: 'delivery',
        name: 'NEON CLOVERLEAF',
        world: { width: 3900, height: 2800 },
        timeLimit: 205,
        droneCount: 10,
        bonusCount: 26,
        glitchCount: 18,
        buildingStepX: 170,
        buildingStepY: 150,
        objective: 'DELIVER CARTRIDGE · CHOOSE SAFE OR FAST ROUTE',
        tutorial: false,
        start: { x: 260, y: 2480, angle: 0 },
        dest: { x: 3340, y: 250, w: 230, h: 150 },
        visualDistricts: [
            { x: 90, y: 2260, w: 850, h: 380, color: '#00f5ff', label: 'COURIER DEPOT' },
            { x: 1160, y: 1600, w: 980, h: 420, color: '#ffd166', label: 'FAST LANE' },
            { x: 2300, y: 920, w: 940, h: 440, color: '#ff2bd6', label: 'DRONE NET' },
            { x: 3150, y: 120, w: 610, h: 360, color: '#ffd166', label: 'ARCADE CLUB' }
        ],
        landmarks: [
            { x: 540, y: 2280, text: 'DEPOT 7', color: '#00f5ff' },
            { x: 1630, y: 1580, text: 'RISK SHORTCUT', color: '#ffd166' },
            { x: 2780, y: 890, text: 'NEXACOM SCAN', color: '#ff2bd6' },
            { x: 3420, y: 220, text: 'ARCADE CLUB', color: '#ffd166' }
        ],
        roads: [
            { x: 120, y: 2380, w: 3320, h: 240 },
            { x: 120, y: 460,  w: 3320, h: 240 },
            { x: 120, y: 460,  w: 240, h: 2160 },
            { x: 3200, y: 250, w: 240, h: 2370 },
            { x: 820, y: 1820, w: 1900, h: 220 },
            { x: 820, y: 1160, w: 1900, h: 220 },
            { x: 820, y: 1820, w: 220, h: 880 },
            { x: 2500, y: 940,  w: 220, h: 1100 },
            { x: 1380, y: 680,  w: 220, h: 1360 },
            { x: 1940, y: 680,  w: 220, h: 1360 },
            { x: 1380, y: 680,  w: 1140, h: 220 },
            { x: 1040, y: 2060, w: 520, h: 170 },
            { x: 1450, y: 1900, w: 170, h: 330 },
            { x: 1450, y: 1900, w: 620, h: 170 },
            { x: 1960, y: 1580, w: 170, h: 490 },
            { x: 1960, y: 1580, w: 720, h: 170 },
            { x: 2570, y: 1260, w: 170, h: 490 },
            { x: 2570, y: 1260, w: 640, h: 170 },
            { x: 2700, y: 460, w: 740, h: 220 },
            { x: 3440, y: 250, w: 220, h: 430 }
        ],
        route: [
            { x: 300, y: 2500, label: '01' },
            { x: 920, y: 2500, label: '02' },
            { x: 920, y: 1930, label: '03' },
            { x: 1490, y: 1930, label: '04' },
            { x: 1490, y: 790, label: '05' },
            { x: 2050, y: 790, label: '06' },
            { x: 2050, y: 1270, label: '07' },
            { x: 2610, y: 1270, label: '08' },
            { x: 2610, y: 570, label: '09' },
            { x: 3330, y: 570, label: '10' },
            { x: 3445, y: 325, label: 'CLUB' }
        ],
        barricades: [
            { x: 710, y: 2500, w: 96, h: 36 },
            { x: 920, y: 2160, w: 36, h: 96 },
            { x: 1710, y: 1930, w: 96, h: 36 },
            { x: 1490, y: 1370, w: 36, h: 96 },
            { x: 2050, y: 990, w: 36, h: 96 },
            { x: 2320, y: 1270, w: 96, h: 36 },
            { x: 2610, y: 980, w: 36, h: 96 },
            { x: 3030, y: 570, w: 96, h: 36 }
        ]
    },
    {
        id: 3,
        type: 'delivery',
        name: 'MIDNIGHT CANALS',
        world: { width: 4800, height: 3400 },
        timeLimit: 245,
        droneCount: 16,
        bonusCount: 34,
        glitchCount: 32,
        buildingStepX: 178,
        buildingStepY: 148,
        objective: 'DELIVER CARTRIDGE · SURVIVE THE SWITCHBACKS',
        tutorial: false,
        start: { x: 240, y: 3070, angle: -Math.PI / 2 },
        dest: { x: 4160, y: 230, w: 240, h: 160 },
        visualDistricts: [
            { x: 120, y: 2820, w: 1180, h: 420, color: '#00f5ff', label: 'SOUTH DOCKS' },
            { x: 540, y: 1560, w: 1160, h: 520, color: '#ff2bd6', label: 'DARK ALLEYS' },
            { x: 2140, y: 1180, w: 1280, h: 520, color: '#ffd166', label: 'BOOST CANAL' },
            { x: 3560, y: 620, w: 850, h: 430, color: '#ff2bd6', label: 'GLITCH MARKET' },
            { x: 3920, y: 100, w: 650, h: 410, color: '#ffd166', label: 'ARCADE CLUB' }
        ],
        landmarks: [
            { x: 700, y: 2850, text: 'SOUTH DOCKS', color: '#00f5ff' },
            { x: 1050, y: 1510, text: 'NO SAFE TURNS', color: '#ff2bd6' },
            { x: 2700, y: 1130, text: 'BOOST CANAL', color: '#ffd166' },
            { x: 3900, y: 560, text: 'GLITCH MARKET', color: '#ff2bd6' },
            { x: 4280, y: 190, text: 'ARCADE CLUB', color: '#ffd166' }
        ],
        roads: [
            { x: 120, y: 2960, w: 1480, h: 250 },
            { x: 1360, y: 2420, w: 250, h: 790 },
            { x: 820, y: 2420, w: 790, h: 230 },
            { x: 820, y: 1880, w: 230, h: 770 },
            { x: 820, y: 1880, w: 1320, h: 230 },
            { x: 1910, y: 1420, w: 230, h: 690 },
            { x: 520, y: 1420, w: 1620, h: 230 },
            { x: 520, y: 860, w: 230, h: 790 },
            { x: 520, y: 860, w: 2280, h: 230 },
            { x: 2570, y: 620, w: 230, h: 470 },
            { x: 2570, y: 620, w: 1500, h: 230 },
            { x: 3840, y: 230, w: 230, h: 620 },
            { x: 3840, y: 230, w: 620, h: 230 },
            { x: 1600, y: 2420, w: 980, h: 230 },
            { x: 2350, y: 1860, w: 230, h: 790 },
            { x: 2350, y: 1860, w: 1320, h: 230 },
            { x: 3440, y: 1060, w: 230, h: 1030 },
            { x: 3440, y: 1060, w: 880, h: 230 },
            { x: 2140, y: 1240, w: 1640, h: 180 },
            { x: 3600, y: 760, w: 180, h: 660 },
            { x: 3120, y: 760, w: 660, h: 180 }
        ],
        route: [
            { x: 340, y: 3085, label: '01' },
            { x: 1485, y: 3085, label: '02' },
            { x: 1485, y: 2535, label: '03' },
            { x: 935, y: 2535, label: '04' },
            { x: 935, y: 1995, label: '05' },
            { x: 2025, y: 1995, label: '06' },
            { x: 2025, y: 1535, label: '07' },
            { x: 635, y: 1535, label: '08' },
            { x: 635, y: 975, label: '09' },
            { x: 2685, y: 975, label: '10' },
            { x: 2685, y: 735, label: '11' },
            { x: 3955, y: 735, label: '12' },
            { x: 3955, y: 315, label: '13' },
            { x: 4280, y: 310, label: 'CLUB' }
        ],
        barricades: [
            { x: 920, y: 3085, w: 104, h: 38 },
            { x: 1485, y: 2750, w: 38, h: 104 },
            { x: 1130, y: 2535, w: 104, h: 38 },
            { x: 935, y: 2210, w: 38, h: 104 },
            { x: 1510, y: 1995, w: 104, h: 38 },
            { x: 2025, y: 1750, w: 38, h: 104 },
            { x: 1300, y: 1535, w: 104, h: 38 },
            { x: 635, y: 1240, w: 38, h: 104 },
            { x: 1670, y: 975, w: 104, h: 38 },
            { x: 2685, y: 835, w: 38, h: 104 },
            { x: 3300, y: 735, w: 104, h: 38 },
            { x: 3955, y: 510, w: 38, h: 104 }
        ]
    },
    {
        id: 4,
        type: 'robot',
        name: 'NEXACOM SCRAPYARD',
        world: { width: 4100, height: 3000 },
        timeLimit: 220,
        droneCount: 14,
        bonusCount: 20,
        glitchCount: 26,
        buildingStepX: 210,
        buildingStepY: 170,
        objective: 'DESTROY ALL NEXACOM ROBOTS',
        tutorial: false,
        hasShop: true,
        start: { x: 360, y: 2600, angle: 0 },
        dest: { x: 3560, y: 310, w: 250, h: 160 },
        visualDistricts: [
            { x: 170, y: 2350, w: 820, h: 450, color: '#00f5ff', label: 'ARMED START' },
            { x: 1040, y: 1480, w: 1680, h: 820, color: '#ff2bd6', label: 'ROBOT ARENA' },
            { x: 2700, y: 590, w: 940, h: 620, color: '#ffd166', label: 'MINE FIELD' },
            { x: 3320, y: 180, w: 640, h: 420, color: '#00f5ff', label: 'EXTRACT' }
        ],
        landmarks: [
            { x: 510, y: 2360, text: 'FIRE: F / ENTER', color: '#ffd166' },
            { x: 1820, y: 1410, text: 'DESTROY ALL ROBOTS', color: '#ff2bd6' },
            { x: 3300, y: 540, text: 'MINES + GLITCH', color: '#ffd166' }
        ],
        roads: [
            { x: 180, y: 2460, w: 1320, h: 260 },
            { x: 1240, y: 1760, w: 260, h: 960 },
            { x: 1240, y: 1760, w: 1780, h: 260 },
            { x: 2760, y: 1120, w: 260, h: 900 },
            { x: 980, y: 1120, w: 2040, h: 260 },
            { x: 980, y: 620, w: 260, h: 760 },
            { x: 980, y: 620, w: 2680, h: 260 },
            { x: 3400, y: 310, w: 260, h: 570 },
            { x: 3400, y: 310, w: 470, h: 260 },
            { x: 1580, y: 1380, w: 1040, h: 600 },
            { x: 1680, y: 1520, w: 840, h: 320 },
            { x: 420, y: 1680, w: 1080, h: 210 },
            { x: 420, y: 1120, w: 210, h: 770 },
            { x: 3020, y: 1460, w: 760, h: 210 },
            { x: 3570, y: 860, w: 210, h: 810 }
        ],
        route: [
            { x: 360, y: 2590, label: 'LOAD' },
            { x: 1370, y: 2590, label: '01' },
            { x: 1370, y: 1890, label: '02' },
            { x: 1940, y: 1680, label: 'ARENA' },
            { x: 2460, y: 1680, label: 'KILL' },
            { x: 2890, y: 1250, label: '03' },
            { x: 1110, y: 750, label: '04' },
            { x: 3530, y: 750, label: '05' },
            { x: 3530, y: 390, label: 'EXTRACT' }
        ],
        barricades: [
            { x: 820, y: 2590, w: 108, h: 40 },
            { x: 1370, y: 2200, w: 40, h: 108 },
            { x: 1840, y: 1890, w: 108, h: 40 },
            { x: 2340, y: 1120, w: 108, h: 40 },
            { x: 2880, y: 1470, w: 40, h: 108 },
            { x: 3320, y: 750, w: 108, h: 40 },
            { x: 3530, y: 540, w: 40, h: 108 }
        ]
    },
    {
        id: 5,
        type: 'boss',
        name: 'PETYA · FINAL RUN',
        world: { width: 4300, height: 3100 },
        timeLimit: 310,
        droneCount: 7,
        bonusCount: 22,
        glitchCount: 28,
        buildingStepX: 200,
        buildingStepY: 165,
        objective: 'УНИЧТОЖЬ BOSСА PETYA',
        tutorial: false,
        hasBoss: true,
        hasShop: true,
        start: { x: 240, y: 2820, angle: -Math.PI / 2 },
        dest: { x: 3700, y: 190, w: 240, h: 160 },
        visualDistricts: [
            { x: 100, y: 2580, w: 900, h: 390, color: '#00f5ff', label: 'FINAL START' },
            { x: 1020, y: 1840, w: 1160, h: 450, color: '#ffd166', label: 'SPLIT ROUTE' },
            { x: 2180, y: 1040, w: 980, h: 470, color: '#ff2bd6', label: 'PETYA APPROACH' },
            { x: 2500, y: 120, w: 1600, h: 780, color: '#ff2bd6', label: 'BOSS ARENA' }
        ],
        landmarks: [
            { x: 480, y: 2600, text: 'FINAL RUN', color: '#00f5ff' },
            { x: 1600, y: 1750, text: 'SAFE ROUTE / FAST ROUTE', color: '#ffd166' },
            { x: 3000, y: 140, text: 'PETYA ARENA', color: '#ff2bd6' },
            { x: 3820, y: 150, text: 'ESCAPE ZONE', color: '#00f5ff' }
        ],
        roads: [
            { x: 120, y: 2660, w: 3860, h: 250 },
            { x: 120, y: 1940, w: 250, h: 970 },
            { x: 120, y: 1940, w: 2800, h: 250 },
            { x: 1080, y: 1160, w: 250, h: 1030 },
            { x: 1080, y: 1160, w: 2140, h: 250 },
            { x: 2970, y: 620, w: 250, h: 790 },
            { x: 1080, y: 620, w: 2140, h: 250 },
            { x: 2240, y: 140, w: 1780, h: 780 },
            { x: 3700, y: 190, w: 250, h: 2720 },
            { x: 620, y: 1380, w: 250, h: 810 },
            { x: 620, y: 1380, w: 860, h: 210 },
            { x: 1480, y: 840, w: 210, h: 750 },
            { x: 1480, y: 840, w: 900, h: 210 },
            { x: 2480, y: 300, w: 1260, h: 190 },
            { x: 2480, y: 590, w: 1260, h: 190 },
            { x: 2500, y: 280, w: 190, h: 520 },
            { x: 3550, y: 280, w: 190, h: 520 }
        ],
        route: [
            { x: 360, y: 2785, label: '01' },
            { x: 245, y: 2065, label: '02' },
            { x: 1205, y: 2065, label: '03' },
            { x: 1205, y: 1285, label: '04' },
            { x: 2100, y: 1285, label: '05' },
            { x: 3095, y: 1285, label: '06' },
            { x: 3095, y: 745, label: '07' },
            { x: 2480, y: 745, label: '08' },
            { x: 3040, y: 410, label: 'ARENA' },
            { x: 3820, y: 270, label: 'TARGET' }
        ],
        barricades: [
            { x: 760, y: 2785, w: 104, h: 38 },
            { x: 245, y: 2260, w: 38, h: 104 },
            { x: 1620, y: 2065, w: 104, h: 38 },
            { x: 1205, y: 1660, w: 38, h: 104 },
            { x: 1720, y: 1285, w: 104, h: 38 },
            { x: 2540, y: 1285, w: 104, h: 38 },
            { x: 3095, y: 980, w: 38, h: 104 },
            { x: 1830, y: 745, w: 104, h: 38 },
            { x: 2740, y: 410, w: 104, h: 38 },
            { x: 3340, y: 600, w: 104, h: 38 }
        ]
    }
];

const RADIO_MESSAGES = {
    start: [
        "⬡ ДИСПЕТЧЕР: Картридж в руках. Время пошло. Удачи, курьер.",
        "⬡ ДИСПЕТЧЕР: NEXACOM активировала патрули. Будь осторожен.",
    ],
    drone_hit: [
        "⚠ NEXACOM ДРОН: Цель обнаружена. Преследование начато.",
        "⚠ NEXACOM ДРОН: Сопротивление бесполезно, курьер.",
        "⚠ СИСТЕМА: Уровень угрозы повышен.",
    ],
    low_hp: [
        "⬡ ДИСПЕТЧЕР: Критическое повреждение! Найди ремкомплект!",
        "⬡ ДИСПЕТЧЕР: Машина горит — но не останавливайся!",
    ],
    low_time: [
        "⬡ ДИСПЕТЧЕР: 30 секунд! Жми гашетку!",
        "⬡ ДИСПЕТЧЕР: Мы закрываемся через полминуты!",
    ],
    critical_time: [
        "⬡ ДИСПЕТЧЕР: 15 СЕКУНД! ДЖИ-ИМ! ДАВАЙ!",
    ],
    boost_pad: [ "⬡ ДИСПЕТЧЕР: Буст-пад! Держись!" ],
    repair: [ "⬡ ДИСПЕТЧЕР: Броня восстановлена. Хорошая работа." ],
    time_bonus: [ "⬡ ДИСПЕТЧЕР: +10 секунд. Продолжай в том же духе!" ],
    boost_bonus: [ "⬡ ДИСПЕТЧЕР: Нитро заряжен. Жги!" ],
    near_finish: [
        "⬡ ДИСПЕТЧЕР: Вижу клуб! Финальный рывок!",
        "⬡ КЛУБ: Мы ждём тебя, курьер. Не подведи.",
    ],
    offroad: [ "⬡ ДИСПЕТЧЕР: Ты съехал с дороги! Назад на трассу!" ],
    boss_spawn: [
        "⬡ ДИСПЕТЧЕР: PETYA вышел на охоту! Это командующий NEXACOM!",
        "⚠ NEXACOM PETYA: Я уничтожу тебя, курьер!",
    ],
    boss_phase2: [
        "⚠ PETYA: ТЫ ЕЩЁ ЖИВОЙ?! СЕЙЧАС ИСПРАВИМ!",
        "⬡ ДИСПЕТЧЕР: Он разъярён! Максимальная угроза!",
    ],
    boss_hit: [
        "⬡ ДИСПЕТЧЕР: Попал! Продолжай!",
        "⚠ PETYA: ЖАЛКИЙ ВЫСТРЕЛ!",
    ],
    boss_low_hp: [
        "⚠ PETYA: Н-не может быть... ТЫ ЗА ЭТО ЗАПЛАТИШЬ!",
        "⬡ ДИСПЕТЧЕР: Ещё немного — и он готов!",
    ],
    boss_dead: [ "⬡ ДИСПЕТЧЕР: PETYA УНИЧТОЖЕН! Аркадная сцена спасена!!!" ],
    no_gun: [ "⬡ ДИСПЕТЧЕР: У тебя нет оружия! Купи пушку в магазине!" ],
};

// ═══════════════════════════════════════════════════
//  SHOP — Enhanced economy & more weapons (Fix #2 & #3)
// ═══════════════════════════════════════════════════
// Balanced economy:
//   Level completion gives coins = score/80 (so ~25-60 coins per level)
//   Prices adjusted so player needs 1-2 levels to afford basic gear
const SHOP_ITEMS = [
    {
        id: 'gun',
        name: 'ПЕРЕДНЯЯ ПУШКА',
        icon: '🔫',
        desc: 'Базовое оружие. Снаряды вперёд. Кулдаун 0.4 сек. Необходима для роботов и Petya.',
        price: 30,
        owned: false,
        category: 'weapon',
        tier: 1,
    },
    {
        id: 'shotgun',
        name: 'ДРОБОВИК',
        icon: '💥',
        desc: 'Выпускает 5 снарядов веером. Кулдаун 0.8 сек. Мощь на близкой дистанции.',
        price: 55,
        owned: false,
        category: 'weapon',
        tier: 2,
        requires: 'gun',
    },
    {
        id: 'missile',
        name: 'РАКЕТНИЦА',
        icon: '🚀',
        desc: 'Самонаводящаяся ракета. Медленная, но огромный урон. Кулдаун 1.8 сек.',
        price: 80,
        owned: false,
        category: 'weapon',
        tier: 3,
        requires: 'gun',
    },
    {
        id: 'armor',
        name: 'БРОНЯ +50',
        icon: '🛡️',
        desc: 'Добавляет +50 HP перед миссией. Стартуешь с 150 HP.',
        price: 45,
        owned: false,
        category: 'defense',
        tier: 1,
    },
    {
        id: 'armor2',
        name: 'ТЯЖЁЛАЯ БРОНЯ',
        icon: '⚙️',
        desc: 'Стартуешь с 200 HP и снижаешь входящий урон на 25%.',
        price: 75,
        owned: false,
        category: 'defense',
        tier: 2,
        requires: 'armor',
    },
    {
        id: 'nitro2',
        name: 'НИТРО ×2',
        icon: '⚡',
        desc: 'Двойной запас нитро. Восстановление в 2 раза быстрее.',
        price: 40,
        owned: false,
        category: 'engine',
        tier: 1,
    },
    {
        id: 'nitro3',
        name: 'НИТРО TURBO',
        icon: '🔥',
        desc: 'Тройной запас нитро + скорость буста +20%. Требует Нитро ×2.',
        price: 65,
        owned: false,
        category: 'engine',
        tier: 2,
        requires: 'nitro2',
    },
    {
        id: 'radar',
        name: 'РАДАР ДРОНОВ',
        icon: '📡',
        desc: 'Дроны отображаются на карте с радиусом обнаружения. Уменьшает их скорость на 15%.',
        price: 35,
        owned: false,
        category: 'tech',
        tier: 1,
    },
];

let playerWeapons = { gun:false, shotgun:false, missile:false, armor:false, armor2:false, nitro2:false, nitro3:false, radar:false };
const WEAPON_IDS = ['gun', 'shotgun', 'missile'];
let bullets = [];
let bossBullets = [];
let missiles = [];
let boss = null;
const BOSS_MAX_HP = 800;

// ═══════════════════════════════════════════════════
//  AUDIO ENGINE — with mute support (Fix #1)
// ═══════════════════════════════════════════════════
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.masterGain = null;
        this.musicNodes = [];
        this._muted = false;
    }

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 1.0;
            this.masterGain.connect(this.ctx.destination);
            this._startEngine();
            this._startMusic();
        } catch(e) { console.warn('Audio not available:', e); }
    }

    get muted() { return this._muted; }

    toggleMusic() {
        this._muted = !this._muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this._muted ? 0 : 1.0;
        }
        return this._muted;
    }

    _node(node) {
        // Connect to masterGain instead of destination
        return node;
    }

    _startEngine() {
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 50;
        this.engineGain.gain.value = 0.005;
        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);
        this.engineOsc.start();
    }

    _startMusic() {
        const notes = [65.4, 73.4, 82.4, 98.0, 65.4, 73.4, 110.0, 87.3];
        let noteIdx = 0;
        const playNextNote = () => {
            if (!this.ctx) return;
            const freq = notes[noteIdx % notes.length];
            noteIdx++;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 500;
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.018, this.ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
            osc.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.4);
            setTimeout(playNextNote, 320);
        };
        setTimeout(playNextNote, 500);

        const arpNotes = [523.3, 659.3, 784.0, 1046.5, 784.0, 659.3];
        let arpIdx = 0;
        const playArp = () => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = arpNotes[arpIdx % arpNotes.length];
            arpIdx++;
            gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.006, this.ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
            osc.connect(gain); gain.connect(this.masterGain);
            osc.start(); osc.stop(this.ctx.currentTime + 0.15);
            setTimeout(playArp, 160);
        };
        setTimeout(playArp, 200);
    }

    updateEngine(speed, boost) {
        if (!this.engineOsc || !this.engineGain) return;
        const s = Math.abs(speed);
        this.engineOsc.frequency.value = 44 + s * 0.08 + (boost ? 30 : 0);
        this.engineGain.gain.value = this._muted ? 0 : 0.003 + Math.min(0.012, s / 60000);
    }

    beep(freq = 440, duration = 0.05, volume = 0.025, type = 'square') {
        if (!this.ctx || this._muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = volume;
        osc.connect(gain); gain.connect(this.masterGain);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.stop(this.ctx.currentTime + duration);
    }

    playWin() {
        const melody = [523.3, 659.3, 784.0, 1046.5];
        melody.forEach((f, i) => { setTimeout(() => this.beep(f, 0.2, 0.03, 'triangle'), i * 140); });
        setTimeout(() => this.beep(1318.5, 0.4, 0.025, 'triangle'), 600);
    }

    playLose() {
        const notes = [220, 180, 150, 110];
        notes.forEach((f, i) => { setTimeout(() => this.beep(f, 0.25, 0.02, 'sawtooth'), i * 160); });
    }

    silence() {
        if (this.engineGain && !this._muted) this.engineGain.gain.value = 0.001;
    }
}

// ═══════════════════════════════════════════════════
//  RADIO & PARTICLE
// ═══════════════════════════════════════════════════
class RadioSystem {
    constructor() {
        this.el = document.getElementById('radio-log');
        this.queue = [];
        this.cooldowns = {};
        this.maxMessages = 3;
    }
    say(category, type = 'normal') {
        const now = performance.now();
        if (this.cooldowns[category] && now - this.cooldowns[category] < 4000) return;
        this.cooldowns[category] = now;
        const msgs = RADIO_MESSAGES[category];
        if (!msgs) return;
        const text = msgs[Math.floor(Math.random() * msgs.length)];
        const div = document.createElement('div');
        div.className = 'radio-msg' + (type === 'danger' ? ' danger' : type === 'good' ? ' good' : '');
        div.textContent = text;
        this.el.appendChild(div);
        const items = this.el.querySelectorAll('.radio-msg');
        if (items.length > this.maxMessages) items[0].remove();
        setTimeout(() => { if (div.parentNode) div.remove(); }, 5000);
    }
}

class Particle {
    constructor(x, y, opts = {}) {
        this.x = x; this.y = y;
        this.vx = opts.vx ?? (Math.random() - 0.5) * 80;
        this.vy = opts.vy ?? (Math.random() - 0.5) * 80;
        this.life = opts.life ?? 1.0;
        this.maxLife = this.life;
        this.size = opts.size ?? 3;
        this.color = opts.color ?? '#00f5ff';
        this.type = opts.type ?? 'circle';
        this.gravity = opts.gravity ?? 0;
        this.shrink = opts.shrink ?? true;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.life -= dt;
    }
    get alive() { return this.life > 0; }
    get alpha() { return Math.max(0, this.life / this.maxLife); }
}

// ═══════════════════════════════════════════════════
//  MAIN GAME
// ═══════════════════════════════════════════════════
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const menuEl = document.getElementById('menu');
const resultEl = document.getElementById('result');
const resultPanel = document.getElementById('result-panel');
const dangerBar = document.getElementById('danger-bar');
const dangerSegs = document.querySelectorAll('.dseg');
const comboDisplay = document.getElementById('comboDisplay');
const quickControls = document.getElementById('quick-controls');
const pauseToggleBtn = document.getElementById('pause-toggle');
const restartButton = document.getElementById('restart-button');
const mapToggleBtn = document.getElementById('map-toggle');
const routeToggleBtn = document.getElementById('route-toggle');
const musicToggleBtn = document.getElementById('music-toggle');
const tutorialBox = document.getElementById('tutorial-box');
const levelBadge = document.getElementById('level-badge');
const escConfirmEl = document.getElementById('esc-confirm');
const escConfirmStayBtn = document.getElementById('esc-confirm-stay');
const escConfirmLeaveBtn = document.getElementById('esc-confirm-leave');

const audio = new AudioEngine();
const radio = new RadioSystem();

// Keys stored by canonical action name
const keys = new Set();
let state = 'menu';
let lastTime = 0;

let shake = 0, flash = 0, flashColor = 'rgba(255,43,214,';
let minimapEnabled = true;
let recommendedRouteVisible = true;
let paused = false;
let combo = 0, comboTimer = 0, comboMultiplier = 1, comboShowTimer = 0;
let dangerLevel = 0;
let nearFinishRadioDone = false;
let offroadRadioCooldown = 0;
let lowHpRadioDone = false;
let lowTimeRadioDone = false, critTimeRadioDone = false;
let escConfirmOpen = false;
let escConfirmWasPaused = false;

const player = {
    x: 160, y: WORLD.height - 180,
    w: 34, h: 54,
    angle: -Math.PI / 2,
    speed: 0,
    maxSpeed: 440,
    boostMaxSpeed: 660,
    acceleration: 800,
    brake: 1050,
    friction: 0.968,
    turnSpeed: 5.1,
    lowSpeedTurnBoost: 1.6,
    hp: 100,
    boost: 100,
    score: 0,
    invincible: 0,
    damageReduction: 0, // 0-1, from armor2
};

const camera = { x: 0, y: 0 };
const dest = { x: WORLD.width - 260, y: 180, w: 170, h: 120 };

const roads = [
    { x: 80,   y: WORLD.height - 260, w: 2100, h: 150 },
    { x: 520,  y: 240,  w: 150, h: 1200 },
    { x: 1000, y: 120,  w: 150, h: 1260 },
    { x: 1500, y: 260,  w: 150, h: 1180 },
    { x: 1900, y: 120,  w: 150, h: 1250 },
    { x: 240,  y: 620,  w: 1850, h: 140 },
    { x: 320,  y: 1040, w: 1780, h: 140 },
    { x: 960,  y: 120,  w: 1120, h: 140 },
];

const routeBeacons = [
    { x: 580,  y: 1415, label: '01' },
    { x: 580,  y: 1110, label: '02' },
    { x: 1075, y: 1110, label: '03' },
    { x: 1075, y: 690,  label: '04' },
    { x: 1565, y: 690,  label: '05' },
    { x: 1565, y: 330,  label: '06' },
    { x: 1975, y: 190,  label: '07' },
    { x: dest.x + dest.w / 2, y: dest.y + dest.h / 2, label: 'CLUB' },
];

let buildings = [], drones = [], bonuses = [], glitches = [], barricades = [];
let neonSigns = [], roadLights = [], boostPads = [];
let districtZones = [], landmarkSigns = [];
let particles = [], carTrails = [], cityRainDrops = [];
let floatingTexts = [];
let timeLeft = TIME_LIMIT;
let gameClock = 0;

// ── HELPERS ──────────────────────────────────────
function inflate(r, a) { return { x:r.x-a, y:r.y-a, w:r.w+a*2, h:r.h+a*2 }; }
function rectsOverlap(a, b) {
    return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}
function circleRect(c, r) {
    const cx = Math.max(r.x, Math.min(c.x, r.x+r.w));
    const cy = Math.max(r.y, Math.min(c.y, r.y+r.h));
    return (c.x-cx)**2 + (c.y-cy)**2 < c.r**2;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax-bx, ay-by); }
function getPlayerRect() {
    return { x: player.x - player.w/2, y: player.y - player.h/2, w: player.w, h: player.h };
}
function getBarricadeRect(b) {
    return { x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h };
}
function randRange(lo, hi) { return lo + Math.random() * (hi - lo); }
function pickFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function updateDangerUI() {
    dangerSegs.forEach(seg => {
        seg.classList.toggle('active', parseInt(seg.dataset.i) < dangerLevel);
    });
}

function spawnExplosion(x, y, color = '#ff2bd6', count = 18) {
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 60 + Math.random() * 140;
        particles.push(new Particle(x, y, {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.5 + Math.random() * 0.4,
            size: 2 + Math.random() * 4,
            color, gravity: 60,
        }));
    }
}

function spawnPickup(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y, {
            vx: (Math.random()-0.5) * 120,
            vy: -80 - Math.random() * 80,
            life: 0.6, size: 3, color, gravity: 120,
        }));
    }
}

function addFloatingText(x, y, text, color = '#ffd166', size = 16) {
    floatingTexts.push({ x, y, text, color, size, life: 1.0, vy: -58 });
}

function addCombo(basePoints = 0) {
    combo++;
    comboTimer = 4.5;
    comboMultiplier = Math.min(4, 1 + Math.floor(combo / 3));
    comboShowTimer = 1.0;
    if (combo >= 2) {
        const suffix = basePoints > 0 ? ` · +${basePoints}` : '';
        addFloatingText(player.x, player.y - 52, `COMBO ×${comboMultiplier}${suffix}`, '#ff9900', 14);
    }
}

function resetCombo() {
    if (combo > 2) addFloatingText(player.x, player.y - 34, 'COMBO LOST', '#ff2bd6', 14);
    combo = 0; comboMultiplier = 1; comboTimer = 0; comboShowTimer = 0;
}

function updateComboDisplay() {
    if (!comboDisplay) return;
    if (comboShowTimer > 0 && combo >= 2) {
        comboDisplay.style.opacity = Math.min(1, comboShowTimer * 3);
        comboDisplay.textContent = `×${comboMultiplier} COMBO`;
        const hue = (performance.now() / 1000 * 60) % 360;
        comboDisplay.style.color = `hsl(${hue}, 100%, 60%)`;
        comboDisplay.style.textShadow = `0 0 30px hsl(${hue}, 100%, 60%)`;
        comboDisplay.style.transform = `translate(-50%, -50%) scale(${1 + (1 - comboShowTimer) * 0.35})`;
    } else {
        comboDisplay.style.opacity = 0;
    }
}

function updateQuickControls() {
    if (quickControls) quickControls.classList.toggle('hidden', state !== 'playing');
    if (pauseToggleBtn) pauseToggleBtn.textContent = paused ? '▶ Продолжить' : '⏸ Пауза';
    if (mapToggleBtn) mapToggleBtn.textContent = minimapEnabled ? '▣ Карта: ON' : '▣ Карта: OFF';
    if (routeToggleBtn) routeToggleBtn.textContent = recommendedRouteVisible ? '◇ Маршрут: ON' : '◇ Маршрут: OFF';
    if (musicToggleBtn) musicToggleBtn.textContent = audio.muted ? '🔇 Музыка: OFF' : '🔊 Музыка: ON';
}

function getShopDrivePad() {
    if (!shopZone) return null;
    return { x: shopZone.doorX - 120, y: shopZone.doorY - 120, w: 240, h: 240 };
}

function isPlayerAtShopEntrance() {
    const pad = getShopDrivePad();
    return !!pad && rectsOverlap(getPlayerRect(), pad);
}

function showEscConfirm() {
    if (!escConfirmEl || state !== 'playing') return;
    escConfirmOpen = true;
    escConfirmWasPaused = paused;
    paused = true;
    audio.silence();
    keys.clear();
    escConfirmEl.classList.remove('hidden');
    updateQuickControls();
}

function hideEscConfirm(restorePause = true) {
    if (!escConfirmEl) return;
    escConfirmEl.classList.add('hidden');
    escConfirmOpen = false;
    if (restorePause && state === 'playing') paused = escConfirmWasPaused;
    updateQuickControls();
}

function confirmEscToMenu() {
    hideEscConfirm(false);
    goToMenu();
}

function requestMainMenuFromEsc() {
    if (state === 'playing') {
        showEscConfirm();
        return;
    }
    if (state === 'shop') {
        goToMenu();
        return;
    }
    goToMenu();
}

function togglePause() {
    if (state !== 'playing') return;
    paused = !paused;
    if (paused) audio.silence();
    updateQuickControls();
}

function toggleMinimap() { minimapEnabled = !minimapEnabled; updateQuickControls(); }
function toggleRoute() { recommendedRouteVisible = !recommendedRouteVisible; updateQuickControls(); }
function toggleMusic() { audio.toggleMusic(); updateQuickControls(); }
function restartGame() { if (state !== 'menu') startGame(); }

function openLevelSelect() {
    const el = document.getElementById('level-select');
    const list = document.getElementById('level-list');
    if (!el || !list) return;
    state = 'levelSelect';
    menuEl.classList.add('hidden');
    resultEl.classList.add('hidden');
    shopOverlay.classList.add('hidden');
    list.innerHTML = '';
    LEVELS.forEach((lvl, idx) => {
        const unlocked = idx + 1 <= maxUnlockedLevel;
        const best = bestByLevel[lvl.id] || null;
        const completed = !!best?.completed;
        const card = document.createElement('div');
        card.className = 'level-card' + (!unlocked ? ' locked' : '') + (completed ? ' completed' : '');
        card.innerHTML = `
            <div class="level-num">${String(lvl.id).padStart(2, '0')}</div>
            <div><div class="level-name">${lvl.name}</div><div class="level-meta">${lvl.type.toUpperCase()} · ${lvl.objective}</div></div>
            <div class="level-best">${best ? `BEST ${best.bestRank || '-'}<br>${best.bestScore || 0}` : 'BEST —'}</div>
            <div class="level-status">${unlocked ? (completed ? 'COMPLETED' : 'UNLOCKED') : 'LOCKED'}</div>
        `;
        if (unlocked) {
            card.addEventListener('click', () => {
                currentLevelIndex = idx;
                saveProgress();
                el.classList.add('hidden');
                startGame();
            });
        }
        list.appendChild(card);
    });
    el.classList.remove('hidden');
}

function playLevel(index) {
    currentLevelIndex = clamp(index, 0, LEVELS.length - 1);
    saveProgress();
    startGame();
}

// ── LEVEL / PROGRESS / TUTORIAL ──────────────────
function loadProgress() {
    try {
        const raw = localStorage.getItem('synthwaveCourierProgress');
        if (!raw) return;
        const data = JSON.parse(raw);
        maxUnlockedLevel = Math.max(1, Math.min(LEVELS.length, data.maxUnlockedLevel || 1));
        coins = Math.max(0, data.coins || 0);
        tutorialHidden = !!data.tutorialHidden;
        const savedLevel = Math.max(1, Math.min(maxUnlockedLevel, data.currentLevel || 1));
        currentLevelIndex = savedLevel - 1;
        if (data.weapons) {
            playerWeapons = { ...playerWeapons, ...data.weapons };
            SHOP_ITEMS.forEach(it => { if (playerWeapons[it.id]) it.owned = true; });
        }
        if (data.activeWeapon && playerWeapons[data.activeWeapon]) activeWeapon = data.activeWeapon;
        else if (playerWeapons.gun) activeWeapon = 'gun';
        bestByLevel = data.bestByLevel || {};
    } catch(e) {}
}

function saveProgress() {
    try {
        localStorage.setItem('synthwaveCourierProgress', JSON.stringify({
            maxUnlockedLevel, coins, tutorialHidden,
            currentLevel: currentLevelIndex + 1,
            weapons: playerWeapons,
            activeWeapon,
            bestByLevel,
        }));
    } catch(e) {}
}

function resetProgress() {
    try { localStorage.removeItem('synthwaveCourierProgress'); } catch(e) {}
    maxUnlockedLevel = 1; coins = 0; tutorialHidden = false; currentLevelIndex = 0;
    playerWeapons = { gun:false, shotgun:false, missile:false, armor:false, armor2:false, nitro2:false, nitro3:false, radar:false };
    activeWeapon = 'gun';
    bestByLevel = {};
    SHOP_ITEMS.forEach(it => it.owned = false);
    saveProgress();
}

function resetTutorialFlags() {
    tutorialFlags = { moved:false, turned:false, boosted:false, map:false, bonus:false, drone:false, glitch:false, finish:false };
}

function setTutorialMessage(text) {
    if (!tutorialBox) return;
    if (!text || tutorialHidden || !currentLevelConfig || !currentLevelConfig.tutorial || state !== 'playing') {
        tutorialBox.classList.add('hidden'); tutorialBox.innerHTML = ''; return;
    }
    tutorialBox.classList.remove('hidden');
    tutorialBox.innerHTML = `${text}<div class="hint">H — скрыть обучение</div>`;
}

function updateTutorial() {
    if (!currentLevelConfig || !currentLevelConfig.tutorial || tutorialHidden || state !== 'playing') {
        setTutorialMessage(''); return;
    }
    const dToFinish = dist(player.x, player.y, dest.x + dest.w / 2, dest.y + dest.h / 2);
    const nearBonus = bonuses.some(b => !b.taken && dist(player.x, player.y, b.x, b.y) < 180);
    const nearDrone = drones.some(d => dist(player.x, player.y, d.x, d.y) < 280);
    const nearGlitch = glitches.some(g => rectsOverlap(inflate(getPlayerRect(), 130), g));
    const nearBarricade = barricades.some(b => rectsOverlap(inflate(getPlayerRect(), 130), getBarricadeRect(b)));

    if (!tutorialFlags.moved) return setTutorialMessage('<strong>W/S или ↑/↓</strong> — газ и тормоз. Работает на любой раскладке клавиатуры.');
    if (!tutorialFlags.turned) return setTutorialMessage('<strong>A/D или ←/→</strong> — поворот. На любой раскладке.');
    if (!tutorialFlags.boosted) return setTutorialMessage('<strong>SHIFT</strong> — нитро. Используй на прямых участках и после поворотов.');
    if (!tutorialFlags.map) return setTutorialMessage('<strong>Мини-карта справа</strong> показывает дороги, дронов, баррикады, цель и маршрут. Клавиша M скрывает карту.');
    if (nearBonus && !tutorialFlags.bonus) return setTutorialMessage('<strong>Бонусы:</strong> B — нитро, + — ремонт, T — время. Забирай их, когда маршрут становится опасным.');
    if (nearBarricade) return setTutorialMessage('<strong>Баррикады NEXACOM</strong> физически блокируют часть дороги. Объезжай видимый блок.');
    if (nearDrone && !tutorialFlags.drone) return setTutorialMessage('<strong>Дроны NEXACOM</strong> преследуют машину и ломают броню. Не тормози рядом с ними.');
    if (nearGlitch && !tutorialFlags.glitch) return setTutorialMessage('<strong>Glitch-зоны</strong> наносят урон. Лучше объехать, чем ехать насквозь.');
    if (dToFinish < 460 && !tutorialFlags.finish) return setTutorialMessage('<strong>ARCADE CLUB рядом.</strong> Заезжай в светящуюся зону, чтобы завершить уровень.');
    setTutorialMessage('<strong>Жёлтая линия</strong> — рекомендуемый маршрут. Доставь картридж!');
}

// FIX #3: Better coin economy — score/80, ensures meaningful rewards
function completeLevel(totalScore) {
    const earnedCoins = Math.max(5, Math.floor(totalScore / 80));
    coins += earnedCoins;
    const completedLevel = currentLevelIndex + 1;
    if (completedLevel >= maxUnlockedLevel && completedLevel < LEVELS.length) {
        maxUnlockedLevel = completedLevel + 1;
    }
    saveProgress();
    return earnedCoins;
}

// ── SHOP ─────────────────────────────────────────
const shopOverlay = document.getElementById('shop-overlay');
const shopCoinsDisplay = document.getElementById('shop-coins-display');
const shopItemsContainer = document.getElementById('shop-items-container');
const shopStartBtn = document.getElementById('shop-start-btn');
const fireBtnEl = document.getElementById('fire-btn');

function openShop(mode = 'mission') {
    shopReturnState = mode;
    shopWasPaused = paused;
    if (state === 'playing') paused = true;
    state = 'shop';
    menuEl.classList.add('hidden');
    resultEl.classList.add('hidden');
    const levelSelectEl = document.getElementById('level-select');
    if (levelSelectEl) levelSelectEl.classList.add('hidden');
    if (escConfirmEl) escConfirmEl.classList.add('hidden');
    escConfirmOpen = false;
    shopOverlay.classList.remove('hidden');
    if (shopStartBtn) shopStartBtn.textContent = mode === 'drive' ? '▶ ВЕРНУТЬСЯ В ИГРУ' : mode === 'menu' ? '◀ ГЛАВНОЕ МЕНЮ' : '▶ В БОЙ!';
    renderShopItems();
}

function openGarageFromMenu() { openShop('menu'); }
function openGarageFromDrive() { openShop('drive'); }

function renderShopItems() {
    if (!shopItemsContainer) return;
    shopCoinsDisplay.textContent = coins;
    shopItemsContainer.innerHTML = '';
    SHOP_ITEMS.forEach(item => {
        const reqOk = !item.requires || playerWeapons[item.requires];
        const locked = !reqOk;
        const equipped = item.category === 'weapon' && item.owned && activeWeapon === item.id;
        const div = document.createElement('div');
        div.className = 'shop-item' + (item.owned ? ' owned' : '') + (locked ? ' locked' : '') + (equipped ? ' equipped' : '');
        if (locked) {
            div.style.opacity = '0.45';
            div.style.cursor = 'not-allowed';
        }
        const categoryColor = item.category === 'weapon' ? '#ff2bd6' : item.category === 'defense' ? '#3cff7e' : item.category === 'engine' ? '#00f5ff' : '#ffd166';
        const actionLabel = locked
            ? `🔒 НУЖНО: ${SHOP_ITEMS.find(i=>i.id===item.requires)?.name || ''}`
            : item.category === 'weapon' && item.owned
                ? (equipped ? '★ ВЫБРАНО' : '▶ ВЫБРАТЬ')
                : item.owned
                    ? '✔ КУПЛЕНО'
                    : `💰 ${item.price} монет`;
        div.innerHTML = `
      <div style="font-size:9px;color:${categoryColor};letter-spacing:2px;margin-bottom:3px">${item.category.toUpperCase()} T${item.tier}</div>
      <div class="shop-item-icon">${item.icon}</div>
      <div class="shop-item-name">${item.name}</div>
      <div class="shop-item-desc">${item.desc}</div>
      <div class="shop-item-price" style="color:${locked ? '#ff2bd6' : equipped ? '#ffd166' : '#ffd166'}">${actionLabel}</div>
      ${item.owned ? '<div class="shop-item-owned-badge">✔</div>' : ''}
    `;
        if (!locked) {
            div.addEventListener('click', () => {
                if (item.category === 'weapon' && item.owned) equipWeapon(item.id);
                else if (!item.owned) buyItem(item.id);
            });
        }
        shopItemsContainer.appendChild(div);
    });
}

function equipWeapon(id) {
    if (!WEAPON_IDS.includes(id) || !playerWeapons[id]) return;
    activeWeapon = id;
    saveProgress();
    audio.beep(740, 0.09, 0.02, 'triangle');
    renderShopItems();
}
function buyItem(id) {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item || item.owned) return;
    if (item.requires && !playerWeapons[item.requires]) {
        addFloatingText(window.innerWidth/2, window.innerHeight/2, 'СНАЧАЛА КУПИ ' + (SHOP_ITEMS.find(i=>i.id===item.requires)?.name||''), '#ff2bd6', 16);
        audio.beep(120, 0.1, 0.02, 'sawtooth'); return;
    }
    if (coins < item.price) {
        addFloatingText(window.innerWidth/2, window.innerHeight/2, 'МАЛО МОНЕТ!', '#ff2bd6', 20);
        audio.beep(120, 0.1, 0.02, 'sawtooth'); return;
    }
    coins -= item.price;
    item.owned = true;
    playerWeapons[id] = true;
    if (item.category === 'weapon' && (!activeWeapon || !playerWeapons[activeWeapon])) activeWeapon = id;
    saveProgress();
    audio.beep(880, 0.12, 0.025, 'triangle');
    renderShopItems();
}

function goToMenu() {
    shopOverlay.classList.add('hidden');
    resultEl.classList.add('hidden');
    const levelSelectEl = document.getElementById('level-select');
    if (levelSelectEl) levelSelectEl.classList.add('hidden');
    if (escConfirmEl) escConfirmEl.classList.add('hidden');
    escConfirmOpen = false;
    dangerBar.classList.add('hidden');
    if (quickControls) quickControls.classList.add('hidden');
    if (levelBadge) levelBadge.classList.add('hidden');
    setTutorialMessage('');
    keys.clear();
    paused = false;
    state = 'menu';
    audio.silence();
    menuEl.classList.remove('hidden');
}

function closeShop() {
    shopOverlay.classList.add('hidden');
    if (shopReturnState === 'drive') {
        state = 'playing';
        paused = shopWasPaused;
        updateQuickControls();
        return;
    }
    if (shopReturnState === 'menu') {
        goToMenu();
        return;
    }
    startGameActual();
}

if (shopStartBtn) {
    shopStartBtn.addEventListener('click', closeShop);
}

// ── BOSS SYSTEM ───────────────────────────────────
function spawnBoss() {
    boss = {
        x: 2600, y: 480, r: 45,
        hp: BOSS_MAX_HP, maxHp: BOSS_MAX_HP,
        vx: 0, vy: 0, phase: 1, angle: 0,
        shootCooldown: 1.8, spawnCooldown: 8, dashCooldown: 3, alertPhase: 0,
        phaseSwitched: false, dead: false, lowHpRadioDone: false, spawnedRadio: false,
    };
    updateBossHUD();
    setTimeout(() => radio.say('boss_spawn', 'danger'), 400);
}

function updateBossHUD() {
    const bar = document.getElementById('boss-hp-bar');
    const fill = document.getElementById('boss-hp-fill');
    const label = document.getElementById('boss-name-label');
    if (!boss || boss.dead) {
        if (bar) bar.style.display = 'none';
        if (label) label.style.display = 'none';
        return;
    }
    if (bar) bar.style.display = 'block';
    if (label) label.style.display = 'block';
    const pct = Math.max(0, (boss.hp / boss.maxHp) * 100);
    if (fill) fill.style.width = pct + '%';
    if (fill) fill.style.background = boss.phase === 2
        ? 'linear-gradient(90deg, #ff0000, #ff6b00)'
        : 'linear-gradient(90deg, #ff2bd6, #ff6b6b)';
}

function updateBoss(dt) {
    if (!boss || boss.dead) return;
    boss.alertPhase += dt * (boss.phase === 2 ? 4 : 2.5);
    boss.shootCooldown -= dt;
    boss.dashCooldown -= dt;
    boss.spawnCooldown -= dt;

    const dx = player.x - boss.x, dy = player.y - boss.y;
    const dDist = Math.hypot(dx, dy);
    const chaseSpeed = boss.phase === 2 ? 200 : 110;

    if (dDist > 80) {
        boss.vx += (dx / dDist) * chaseSpeed * dt;
        boss.vy += (dy / dDist) * chaseSpeed * dt;
    } else {
        boss.vx += Math.cos(boss.alertPhase) * 120 * dt;
        boss.vy += Math.sin(boss.alertPhase) * 120 * dt;
    }

    if (boss.phase === 2 && boss.dashCooldown <= 0 && dDist < 600) {
        const spd = 480;
        boss.vx += (dx / dDist) * spd;
        boss.vy += (dy / dDist) * spd;
        boss.dashCooldown = 2.2;
        spawnExplosion(boss.x, boss.y, '#ff0000', 16);
        audio.beep(80, 0.15, 0.025, 'sawtooth');
    }

    const maxSpd = boss.phase === 2 ? 280 : 160;
    const spd = Math.hypot(boss.vx, boss.vy);
    if (spd > maxSpd) { boss.vx = boss.vx/spd*maxSpd; boss.vy = boss.vy/spd*maxSpd; }
    boss.vx *= Math.pow(0.92, dt*60);
    boss.vy *= Math.pow(0.92, dt*60);
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
    boss.x = clamp(boss.x, 50, WORLD.width-50);
    boss.y = clamp(boss.y, 50, WORLD.height-50);
    boss.angle = Math.atan2(dy, dx);

    if (boss.shootCooldown <= 0) {
        const numShots = boss.phase === 2 ? 5 : 3;
        const spread = boss.phase === 2 ? 0.45 : 0.25;
        const baseAngle = Math.atan2(dy, dx);
        for (let i = 0; i < numShots; i++) {
            const angle = baseAngle + (i - Math.floor(numShots/2)) * spread;
            bossBullets.push({ x:boss.x, y:boss.y, vx:Math.cos(angle)*340, vy:Math.sin(angle)*340, life:2.5, r:9 });
        }
        boss.shootCooldown = boss.phase === 2 ? 0.9 : 1.6;
        audio.beep(220, 0.08, 0.018, 'square');
    }

    if (boss.phase === 2 && boss.spawnCooldown <= 0 && drones.length < 12) {
        for (let i = 0; i < 2; i++) {
            drones.push({
                x: boss.x + (Math.random()-0.5)*180, y: boss.y + (Math.random()-0.5)*180,
                r: 18, vx: 0, vy: 0, phase: Math.random()*Math.PI*2, cooldown: 1, alertLevel: 1,
            });
        }
        boss.spawnCooldown = 6;
        radio.say('boss_phase2', 'danger');
    }

    if (!boss.phaseSwitched && boss.hp < boss.maxHp * 0.5) {
        boss.phase = 2; boss.phaseSwitched = true;
        boss.shootCooldown = 0.2; boss.dashCooldown = 0;
        shake = Math.max(shake, 22); flash = 0.35; flashColor = 'rgba(255,0,0,';
        radio.say('boss_phase2', 'danger');
        spawnExplosion(boss.x, boss.y, '#ff0000', 40);
        audio.beep(60, 0.4, 0.04, 'sawtooth');
    }

    if (!boss.lowHpRadioDone && boss.hp < boss.maxHp * 0.2) {
        boss.lowHpRadioDone = true; radio.say('boss_low_hp', 'danger');
    }

    if (dDist < boss.r + 28 && player.invincible <= 0) {
        const dmg = (boss.phase === 2 ? 35 : 22) * (1 - player.damageReduction);
        player.hp -= dmg * dt;
        shake = Math.max(shake, 16); flash = Math.max(flash, 0.18); flashColor = 'rgba(255,0,0,';
        player.invincible = 0.4; resetCombo();
    }

    updateBossHUD();
}

function updateBossBullets(dt) {
    for (let i = bossBullets.length - 1; i >= 0; i--) {
        const b = bossBullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD.width || b.y > WORLD.height) {
            bossBullets.splice(i, 1); continue;
        }
        const d = dist(b.x, b.y, player.x, player.y);
        if (d < b.r + 22 && player.invincible <= 0) {
            const dmg = 22 * (1 - player.damageReduction);
            player.hp -= dmg;
            player.invincible = 0.5;
            shake = Math.max(shake, 14); flash = Math.max(flash, 0.14); flashColor = 'rgba(255,43,214,';
            spawnExplosion(player.x, player.y, '#ff2bd6', 8);
            audio.beep(150, 0.06, 0.02, 'square');
            bossBullets.splice(i, 1);
        }
    }
}

// Update homing missiles
function updateMissiles(dt) {
    for (let i = missiles.length - 1; i >= 0; i--) {
        const m = missiles[i];
        m.life -= dt;
        if (m.life <= 0 || m.x < 0 || m.y < 0 || m.x > WORLD.width || m.y > WORLD.height) {
            spawnExplosion(m.x, m.y, '#ffd166', 8);
            missiles.splice(i, 1); continue;
        }

        // Find target (boss first, then drones)
        let tx = null, ty = null;
        if (boss && !boss.dead) { tx = boss.x; ty = boss.y; }
        else if (robots.length > 0) {
            let best = null, bd = Infinity;
            for (const r of robots) {
                const dd = dist(m.x, m.y, r.x, r.y);
                if (dd < bd) { bd = dd; best = r; }
            }
            if (best) { tx = best.x; ty = best.y; }
        }
        else if (drones.length > 0) {
            let best = null, bd = Infinity;
            for (const d of drones) {
                const dd = dist(m.x, m.y, d.x, d.y);
                if (dd < bd) { bd = dd; best = d; }
            }
            if (best) { tx = best.x; ty = best.y; }
        }

        if (tx !== null) {
            const ta = Math.atan2(ty - m.y, tx - m.x);
            const da = ta - m.angle;
            const wrapped = ((da + Math.PI) % (Math.PI*2)) - Math.PI;
            m.angle += wrapped * 3 * dt;
        }
        const speed = 380;
        m.vx = Math.cos(m.angle) * speed;
        m.vy = Math.sin(m.angle) * speed;
        m.x += m.vx * dt; m.y += m.vy * dt;

        // Collision with boss
        if (boss && !boss.dead && dist(m.x, m.y, boss.x, boss.y) < 50) {
            boss.hp = Math.max(0, boss.hp - 180);
            spawnExplosion(m.x, m.y, '#ffd166', 28);
            audio.beep(330, 0.1, 0.025, 'sawtooth');
            shake = Math.max(shake, 10);
            radio.say('boss_hit');
            missiles.splice(i, 1);
            updateBossHUD();
            if (boss.hp <= 0) killBoss();
            continue;
        }
        // Collision with robots
        for (let ri = robots.length - 1; ri >= 0; ri--) {
            const r = robots[ri];
            if (dist(m.x, m.y, r.x, r.y) < 36) {
                r.hp -= 180;
                spawnExplosion(m.x, m.y, '#ffd166', 20);
                if (r.hp <= 0) {
                    spawnExplosion(r.x, r.y, '#ff2bd6', 26);
                    robots.splice(ri, 1);
                    player.score += 450 * comboMultiplier;
                    addCombo(450);
                }
                missiles.splice(i, 1);
                break;
            }
        }
        if (!missiles[i]) continue;
        // Collision with drones
        for (let di = drones.length - 1; di >= 0; di--) {
            if (dist(m.x, m.y, drones[di].x, drones[di].y) < 30) {
                spawnExplosion(drones[di].x, drones[di].y, '#ff2bd6', 16);
                drones.splice(di, 1);
                player.score += 300 * comboMultiplier;
                addCombo(300);
                missiles.splice(i, 1);
                break;
            }
        }
    }
}

function fireBullet() {
    if (!playerWeapons.gun && !playerWeapons.shotgun && !playerWeapons.missile) {
        radio.say('no_gun', 'danger');
        audio.beep(80, 0.1, 0.015, 'sawtooth');
        return;
    }
    if (!playerWeapons[activeWeapon]) {
        activeWeapon = playerWeapons.gun ? 'gun' : playerWeapons.shotgun ? 'shotgun' : 'missile';
        saveProgress();
    }

    if (activeWeapon === 'missile') {
        if ((player._missileCooldown || 0) > 0) return;
        missiles.push({
            x: player.x + Math.cos(player.angle) * 36,
            y: player.y + Math.sin(player.angle) * 36,
            vx: Math.cos(player.angle) * 380,
            vy: Math.sin(player.angle) * 380,
            angle: player.angle,
            life: 5.0, r: 8,
        });
        player._missileCooldown = 1.8;
        audio.beep(280, 0.14, 0.025, 'sawtooth');
        spawnExplosion(player.x + Math.cos(player.angle)*30, player.y + Math.sin(player.angle)*30, '#ff9900', 6);
        return;
    }

    if (activeWeapon === 'shotgun') {
        if ((player._shotgunCooldown || 0) > 0) return;
        const spread = 0.22;
        for (let i = -2; i <= 2; i++) {
            const angle = player.angle + i * spread;
            bullets.push({
                x: player.x + Math.cos(angle) * 28,
                y: player.y + Math.sin(angle) * 28,
                vx: Math.cos(angle) * 520, vy: Math.sin(angle) * 520,
                life: 0.9, r: 5,
            });
        }
        player._shotgunCooldown = 0.8;
        audio.beep(520, 0.12, 0.028, 'square');
        spawnExplosion(player.x + Math.cos(player.angle)*24, player.y + Math.sin(player.angle)*24, '#ffd166', 8);
        return;
    }

    if ((player._gunCooldown || 0) > 0) return;
    bullets.push({
        x: player.x + Math.cos(player.angle) * 32,
        y: player.y + Math.sin(player.angle) * 32,
        vx: Math.cos(player.angle) * 620, vy: Math.sin(player.angle) * 620,
        life: 1.4, r: 6,
    });
    player._gunCooldown = 0.38;
    audio.beep(680, 0.07, 0.022, 'square');
    spawnExplosion(player.x + Math.cos(player.angle)*28, player.y + Math.sin(player.angle)*28, '#ffd166', 5);
}

function updatePlayerBullets(dt) {
    if ((player._gunCooldown||0) > 0) player._gunCooldown -= dt;
    if ((player._shotgunCooldown||0) > 0) player._shotgunCooldown -= dt;
    if ((player._missileCooldown||0) > 0) player._missileCooldown -= dt;

    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD.width || b.y > WORLD.height) {
            bullets.splice(i, 1); continue;
        }
        if (boss && !boss.dead) {
            const d = dist(b.x, b.y, boss.x, boss.y);
            if (d < b.r + boss.r) {
                boss.hp = Math.max(0, boss.hp - 55);
                bullets.splice(i, 1);
                spawnExplosion(b.x, b.y, '#ffd166', 12);
                audio.beep(440, 0.06, 0.02, 'triangle');
                shake = Math.max(shake, 6);
                radio.say('boss_hit');
                updateBossHUD();
                if (boss.hp <= 0) killBoss();
                continue;
            }
        }
        for (let ri = robots.length - 1; ri >= 0; ri--) {
            const r = robots[ri];
            if (dist(b.x, b.y, r.x, r.y) < b.r + 24) {
                r.hp = Math.max(0, r.hp - 55);
                bullets.splice(i, 1);
                spawnExplosion(b.x, b.y, '#ffd166', 10);
                audio.beep(500, 0.05, 0.016, 'triangle');
                if (r.hp <= 0) {
                    spawnExplosion(r.x, r.y, '#ff2bd6', 24);
                    robots.splice(ri, 1);
                    player.score += 350 * comboMultiplier;
                    addCombo(350);
                    addFloatingText(r.x, r.y, '+350 ROBOT', '#ff2bd6', 15);
                }
                continue;
            }
        }
        if (!bullets[i]) continue;
        for (let di = drones.length - 1; di >= 0; di--) {
            const d2 = dist(b.x, b.y, drones[di].x, drones[di].y);
            if (d2 < b.r + drones[di].r) {
                spawnExplosion(drones[di].x, drones[di].y, '#ff2bd6', 14);
                drones.splice(di, 1);
                bullets.splice(i, 1);
                player.score += 200 * comboMultiplier;
                addCombo(200);
                addFloatingText(b.x, b.y, '+200 DRONE', '#ff2bd6', 15);
                audio.beep(560, 0.08, 0.02, 'square');
                break;
            }
        }
    }
}

function killBoss() {
    if (!boss || boss.dead) return;
    boss.dead = true; boss.hp = 0;
    spawnExplosion(boss.x, boss.y, '#ff2bd6', 60);
    spawnExplosion(boss.x + 40, boss.y - 30, '#ffd166', 40);
    spawnExplosion(boss.x - 40, boss.y + 30, '#ff0000', 40);
    shake = 30; flash = 0.6; flashColor = 'rgba(255,255,255,';
    radio.say('boss_dead', 'good');
    audio.beep(880, 0.5, 0.04, 'triangle');
    setTimeout(() => audio.playWin(), 600);
    updateBossHUD();
    player.score += 5000;
    setTimeout(() => {
        if (state === 'playing') {
            const timeBonus = Math.floor(timeLeft * 28);
            const hpBonus = Math.floor(player.hp * 12);
            const scoreBonus = Math.floor(player.score);
            endGame(true, { timeBonus, hpBonus, scoreBonus, total: timeBonus + hpBonus + scoreBonus });
        }
    }, 2200);
}

// ── WORLD GENERATION ─────────────────────────────
function applyLevelConfig() {
    currentLevelConfig = LEVELS[currentLevelIndex] || LEVELS[LEVELS.length - 1];
    WORLD.width = currentLevelConfig.world.width;
    WORLD.height = currentLevelConfig.world.height;
    TIME_LIMIT = currentLevelConfig.timeLimit;
    dest.x = currentLevelConfig.dest.x;
    dest.y = currentLevelConfig.dest.y;
    dest.w = currentLevelConfig.dest.w;
    dest.h = currentLevelConfig.dest.h;
    roads.length = 0;
    currentLevelConfig.roads.forEach(r => roads.push({ ...r }));
    routeBeacons.length = 0;
    currentLevelConfig.route.forEach(r => routeBeacons.push({ ...r }));
}

function buildBarricades() {
    barricades.length = 0;
    for (const b of currentLevelConfig.barricades || []) {
        barricades.push({ ...b, phase: Math.random() * Math.PI * 2 });
    }
}

// FIX #4: Snap route waypoints to actual road surfaces
function snapRouteToRoads() {
    for (const beacon of routeBeacons) {
        // Find the road this beacon is closest to
        let bestRoad = null, bestDist = Infinity;
        for (const r of roads) {
            const cx = clamp(beacon.x, r.x, r.x + r.w);
            const cy = clamp(beacon.y, r.y, r.y + r.h);
            const d = Math.hypot(beacon.x - cx, beacon.y - cy);
            if (d < bestDist) { bestDist = d; bestRoad = r; }
        }
        if (bestRoad && bestDist > 0) {
            // Snap into road
            beacon.x = clamp(beacon.x, bestRoad.x + 10, bestRoad.x + bestRoad.w - 10);
            beacon.y = clamp(beacon.y, bestRoad.y + 10, bestRoad.y + bestRoad.h - 10);
        }
    }
}


function pointOnAnyRoad(x, y, margin = 0) {
    return roads.some(r => x >= r.x - margin && x <= r.x + r.w + margin && y >= r.y - margin && y <= r.y + r.h + margin);
}

function segmentOnRoad(a, b) {
    const steps = Math.max(2, Math.ceil(dist(a.x, a.y, b.x, b.y) / 45));
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        if (!pointOnAnyRoad(x, y, 8)) return false;
    }
    return true;
}

function buildGpsRoute() {
    gpsRoutePoints = [];
    if (!routeBeacons.length) return;
    gpsRoutePoints.push({ x: routeBeacons[0].x, y: routeBeacons[0].y, label: routeBeacons[0].label });
    for (let i = 1; i < routeBeacons.length; i++) {
        const a = gpsRoutePoints[gpsRoutePoints.length - 1];
        const b = routeBeacons[i];
        if (Math.abs(a.x - b.x) < 2 || Math.abs(a.y - b.y) < 2) {
            gpsRoutePoints.push({ ...b });
            continue;
        }
        const elbow1 = { x: b.x, y: a.y, label: '' };
        const elbow2 = { x: a.x, y: b.y, label: '' };
        const ok1 = pointOnAnyRoad(elbow1.x, elbow1.y, 10) && segmentOnRoad(a, elbow1) && segmentOnRoad(elbow1, b);
        const ok2 = pointOnAnyRoad(elbow2.x, elbow2.y, 10) && segmentOnRoad(a, elbow2) && segmentOnRoad(elbow2, b);
        if (ok1) gpsRoutePoints.push(elbow1, { ...b });
        else if (ok2) gpsRoutePoints.push(elbow2, { ...b });
        else {
            // last-resort: still draw Manhattan, never diagonal. Route remains visual GPS, not physics.
            gpsRoutePoints.push(elbow2, { ...b });
        }
    }
}

function buildShopZone() {
    const s = currentLevelConfig.start;
    let road = roads.find(r => s.x >= r.x && s.x <= r.x + r.w && s.y >= r.y && s.y <= r.y + r.h) || roads[0];
    const horiz = road.w >= road.h;
    const w = 190, h = 128;
    let x = horiz ? clamp(s.x + 190, road.x + 80, road.x + road.w - 260) : road.x + road.w + 34;
    let y = horiz ? road.y - h - 34 : clamp(s.y + 120, road.y + 70, road.y + road.h - 180);
    if (y < 40) y = road.y + road.h + 34;
    if (x + w > WORLD.width - 30) x = road.x - w - 34;
    if (x < 30) x = road.x + road.w + 34;
    shopZone = { x, y, w, h, doorX: horiz ? x + w / 2 : x, doorY: horiz ? road.y + 8 : y + h / 2, active: false, phase: 0 };
}

function getBossArenaRect() {
    if (!currentLevelConfig || !currentLevelConfig.hasBoss) return null;
    const zone = (currentLevelConfig.visualDistricts || []).find(z => /BOSS ARENA/i.test(z.label));
    return zone ? { x: zone.x, y: zone.y, w: zone.w, h: zone.h } : { x: 2240, y: 140, w: 1780, h: 780 };
}

function spawnRobots() {
    robots.length = 0;
    if (!currentLevelConfig || currentLevelConfig.type !== 'robot') return;
    const arena = (currentLevelConfig.visualDistricts || []).find(z => /ROBOT ARENA/i.test(z.label)) || { x: 1000, y: 1300, w: 1700, h: 900 };
    const count = Math.max(7, Math.floor(currentLevelConfig.droneCount * 0.65));
    for (let i = 0; i < count; i++) {
        robots.push({
            x: arena.x + 100 + Math.random() * Math.max(100, arena.w - 200),
            y: arena.y + 100 + Math.random() * Math.max(100, arena.h - 200),
            w: 46, h: 46, hp: 120, maxHp: 120,
            vx: 0, vy: 0, phase: Math.random() * Math.PI * 2,
            shootCooldown: 0.8 + Math.random() * 1.6,
            ramCooldown: 0,
        });
    }
}

function updateRobots(dt) {
    for (let i = robots.length - 1; i >= 0; i--) {
        const r = robots[i];
        r.phase += dt * 2.5;
        r.shootCooldown -= dt;
        r.ramCooldown -= dt;
        const dx = player.x - r.x, dy = player.y - r.y;
        const d = Math.hypot(dx, dy) || 1;
        const chase = d < 620;
        const force = chase ? 115 : 35;
        r.vx += (chase ? dx / d : Math.cos(r.phase)) * force * dt;
        r.vy += (chase ? dy / d : Math.sin(r.phase * 0.8)) * force * dt;
        const spd = Math.hypot(r.vx, r.vy);
        const maxSpd = chase ? 135 : 70;
        if (spd > maxSpd) { r.vx = r.vx / spd * maxSpd; r.vy = r.vy / spd * maxSpd; }
        r.vx *= Math.pow(0.965, dt * 60);
        r.vy *= Math.pow(0.965, dt * 60);
        r.x += r.vx * dt; r.y += r.vy * dt;
        const robotRect = { x: r.x - r.w/2, y: r.y - r.h/2, w: r.w, h: r.h };
        if (!roads.some(rd => rectsOverlap(robotRect, rd))) { r.x -= r.vx * dt; r.y -= r.vy * dt; r.vx *= -0.5; r.vy *= -0.5; }
        if (d < 46 && player.invincible <= 0 && r.ramCooldown <= 0) {
            const dmg = 18 * (1 - player.damageReduction);
            player.hp -= dmg;
            player.invincible = 0.45;
            r.ramCooldown = 1.0;
            shake = Math.max(shake, 12); flash = Math.max(flash, 0.10); flashColor = 'rgba(255,43,214,';
            spawnExplosion(player.x, player.y, '#ff2bd6', 10);
        }
        if (chase && d < 520 && r.shootCooldown <= 0) {
            const a = Math.atan2(dy, dx);
            robotBullets.push({ x: r.x, y: r.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 2.2, r: 6 });
            r.shootCooldown = 1.6 + Math.random() * 0.8;
            audio.beep(200, 0.04, 0.012, 'square');
        }
    }
}

function updateRobotBullets(dt) {
    for (let i = robotBullets.length - 1; i >= 0; i--) {
        const b = robotBullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD.width || b.y > WORLD.height) { robotBullets.splice(i, 1); continue; }
        if (dist(b.x, b.y, player.x, player.y) < b.r + 22 && player.invincible <= 0) {
            player.hp -= 16 * (1 - player.damageReduction);
            player.invincible = 0.45;
            shake = Math.max(shake, 10); flash = Math.max(flash, 0.10); flashColor = 'rgba(255,43,214,';
            robotBullets.splice(i, 1);
        }
    }
}
function createWorld() {
    applyLevelConfig();
    buildings.length = 0; drones.length = 0; robots.length = 0; robotBullets.length = 0;
    bonuses.length = 0; glitches.length = 0; barricades.length = 0;
    neonSigns.length = 0; roadLights.length = 0;
    districtZones.length = 0; landmarkSigns.length = 0;
    boostPads.length = 0; particles.length = 0;
    carTrails.length = 0; cityRainDrops.length = 0;
    missiles.length = 0;

    buildBarricades();
    snapRouteToRoads();
    buildGpsRoute();
    buildShopZone();

    for (const z of currentLevelConfig.visualDistricts || []) districtZones.push({ ...z, phase: Math.random() * Math.PI * 2 });
    for (const l of currentLevelConfig.landmarks || []) landmarkSigns.push({ ...l, phase: Math.random() * Math.PI * 2 });

    const blocked = [...roads, dest, ...(shopZone ? [shopZone] : []), ...barricades.map(getBarricadeRect)];

    for (let y = 80; y < WORLD.height - 80; y += currentLevelConfig.buildingStepY) {
        for (let x = 80; x < WORLD.width - 80; x += currentLevelConfig.buildingStepX) {
            const b = {
                x: x + Math.random()*40, y: y + Math.random()*40,
                w: 110 + Math.random()*80, h: 90 + Math.random()*80,
                glow: Math.random(), color: Math.random() > 0.5 ? '#00f5ff' : '#ff2bd6',
            };
            if (!blocked.some(r => rectsOverlap(inflate(b, 55), r))) buildings.push(b);
        }
    }

    // Drones — radar upgrade affects their detection
    const droneSpeedMod = playerWeapons.radar ? 0.85 : 1.0;
    const droneRoads = roads.slice(2);
    for (let i = 0; i < currentLevelConfig.droneCount; i++) {
        const road = droneRoads[i % droneRoads.length];
        if (currentLevelConfig.type === 'robot' && i > 5) continue;
        drones.push({
            x: road.x + 40 + Math.random() * Math.max(10, road.w - 80),
            y: road.y + 40 + Math.random() * Math.max(10, road.h - 80),
            r: 22, vx: (Math.random()-0.5)*100*droneSpeedMod, vy: (Math.random()-0.5)*100*droneSpeedMod,
            phase: Math.random()*Math.PI*2,
            cooldown: Math.random()*2,
            alertLevel: 0,
            speedMod: droneSpeedMod,
        });
    }
    spawnRobots();

    const bonusTypes = ['boost','repair','time'];
    for (let i = 0; i < currentLevelConfig.bonusCount; i++) {
        const road = pickFrom(roads);
        bonuses.push({
            x: road.x + 30 + Math.random() * Math.max(10, road.w-60),
            y: road.y + 30 + Math.random() * Math.max(10, road.h-60),
            r: 15, type: bonusTypes[i%bonusTypes.length],
            taken: false, pulse: Math.random()*Math.PI*2,
        });
    }

    for (let i = 0; i < currentLevelConfig.glitchCount; i++) {
        const road = pickFrom(roads);
        glitches.push({
            x: road.x + Math.random()*road.w, y: road.y + Math.random()*road.h,
            w: 38 + Math.random()*50, h: 20 + Math.random()*32,
            damage: 12, phase: Math.random()*Math.PI*2,
        });
    }

    // FIX #4: Boost pads must be ON roads
    const padRoads = roads.filter(r => r.w > r.h ? r.w > 300 : r.h > 300);
    for (let i = 1; i < routeBeacons.length - 1; i += 2) {
        const p = routeBeacons[i];
        // Find road that contains this beacon
        const road = padRoads.find(r => p.x >= r.x && p.x <= r.x+r.w && p.y >= r.y && p.y <= r.y+r.h)
            || padRoads[i % padRoads.length];
        if (!road) continue;
        const angle = road.w > road.h ? 0 : Math.PI / 2;
        boostPads.push({ x: p.x, y: p.y, w: 82, h: 38, angle, pulse: Math.random()*Math.PI*2, cooldown: 0 });
    }

    const signTexts = ['TARGEM','READY','1986','ARCADE','NEON','INSERT COIN','LEVEL UP','CRT','GAME OVER','HI SCORE','PLAY','REWIND'];
    for (let i = 0; i < 28; i++) {
        const b = buildings[Math.floor(Math.random()*buildings.length)];
        if (!b) continue;
        neonSigns.push({
            x: b.x + 8 + Math.random()*Math.max(8, b.w-70),
            y: b.y + 12 + Math.random()*Math.max(8, b.h-40),
            w: 44 + Math.random()*36, h: 14 + Math.random()*10,
            text: signTexts[i % signTexts.length],
            phase: Math.random()*Math.PI*2,
            color: i%2===0 ? '#00f5ff' : '#ff2bd6',
            flickerRate: 0.5 + Math.random()*2,
        });
    }

    for (const r of roads) {
        const horiz = r.w > r.h;
        const count = Math.floor((horiz ? r.w : r.h) / 170);
        for (let i = 1; i < count; i++) {
            roadLights.push({ x: horiz ? r.x + i*170 : r.x + r.w/2, y: horiz ? r.y + 18 : r.y + i*170, phase: Math.random()*Math.PI*2 });
            roadLights.push({ x: horiz ? r.x + i*170 : r.x + r.w/2, y: horiz ? r.y + r.h - 18 : r.y + i*170, phase: Math.random()*Math.PI*2 });
        }
    }

    for (let i = 0; i < 80; i++) cityRainDrops.push(makeRainDrop(true));
}

function makeRainDrop(randomY = false) {
    return {
        x: camera.x + Math.random() * window.innerWidth,
        y: randomY ? camera.y + Math.random() * window.innerHeight : camera.y - 20,
        vy: 260 + Math.random() * 160, vx: -18 + Math.random() * 8, life: 1.5,
    };
}

// ── RESIZE ───────────────────────────────────────
function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.floor(window.innerWidth  * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function handleFireAction() {
    if (state !== 'playing') return;
    if (isPlayerAtShopEntrance()) {
        openGarageFromDrive();
        keys.delete('fire');
        return;
    }
    fireBullet();
}

// ── INPUT — Fix #5: layout-independent key mapping ──
window.addEventListener('keydown', e => {
    const action = normalizeKey(e);
    if (!action) return;

    if (escConfirmOpen) {
        if (action === 'menu') { e.preventDefault(); hideEscConfirm(true); return; }
        if (action === 'space') { e.preventDefault(); hideEscConfirm(true); return; }
        if (action === 'fire') { e.preventDefault(); confirmEscToMenu(); return; }
        return;
    }

    if (action === 'menu') { e.preventDefault(); requestMainMenuFromEsc(); return; }
    if (action === 'weapon1') { if (playerWeapons.gun) equipWeapon('gun'); return; }
    if (action === 'weapon2') { if (playerWeapons.shotgun) equipWeapon('shotgun'); return; }
    if (action === 'weapon3') { if (playerWeapons.missile) equipWeapon('missile'); return; }
    if (action === 'space') {
        e.preventDefault();
        if (state === 'menu') startGame();
        else if (state === 'levelSelect') goToMenu();
        else if (state === 'win' || state === 'lose') startGame();
        else if (state === 'playing') togglePause();
        return;
    }
    if (action === 'tab') { e.preventDefault(); if (state === 'playing') toggleRoute(); return; }
    if (action === 'hide' && state === 'playing') { tutorialHidden = !tutorialHidden; saveProgress(); updateTutorial(); return; }
    if (action === 'fire' && state === 'playing') {
        e.preventDefault();
        if (isPlayerAtShopEntrance()) {
            openGarageFromDrive();
            keys.delete('fire');
            return;
        }
        fireBullet();
        return;
    }
    if (action === 'restart' && state !== 'menu') { restartGame(); return; }
    if (action === 'map' && state === 'playing') { toggleMinimap(); return; }
    if (action === 'music') { toggleMusic(); return; }

    keys.add(action);
});

window.addEventListener('keyup', e => {
    const action = normalizeKey(e);
    if (action) keys.delete(action);
});

// Touch buttons — use action names
document.querySelectorAll('.touch-btn').forEach(btn => {
    const rawKey = btn.dataset.key;
    const action = CODE_MAP[rawKey] || KEY_MAP[rawKey.toLowerCase()] || rawKey;
    btn.addEventListener('touchstart', e => { e.preventDefault(); keys.add(action); btn.classList.add('pressed'); }, { passive:false });
    btn.addEventListener('touchend',   e => { e.preventDefault(); keys.delete(action); btn.classList.remove('pressed'); }, { passive:false });
});

const boostBtn = document.getElementById('boost-btn');
boostBtn.addEventListener('touchstart', e => { e.preventDefault(); keys.add('boost'); boostBtn.classList.add('pressed'); }, { passive:false });
boostBtn.addEventListener('touchend',   e => { e.preventDefault(); keys.delete('boost'); boostBtn.classList.remove('pressed'); }, { passive:false });

if (fireBtnEl) {
    fireBtnEl.addEventListener('touchstart', e => { e.preventDefault(); handleFireAction(); fireBtnEl.classList.add('pressed'); }, { passive:false });
    fireBtnEl.addEventListener('touchend',   e => { e.preventDefault(); fireBtnEl.classList.remove('pressed'); }, { passive:false });
    fireBtnEl.addEventListener('click', () => handleFireAction());
}

if (pauseToggleBtn) pauseToggleBtn.addEventListener('click', togglePause);
if (restartButton) restartButton.addEventListener('click', restartGame);
if (mapToggleBtn) mapToggleBtn.addEventListener('click', toggleMinimap);
if (routeToggleBtn) routeToggleBtn.addEventListener('click', toggleRoute);
if (musicToggleBtn) musicToggleBtn.addEventListener('click', toggleMusic);
if (escConfirmStayBtn) escConfirmStayBtn.addEventListener('click', () => hideEscConfirm(true));
if (escConfirmLeaveBtn) escConfirmLeaveBtn.addEventListener('click', confirmEscToMenu);

// ── GAME LIFECYCLE ────────────────────────────────
function startGame() {
    audio.init();
    const lvlCfg = LEVELS[currentLevelIndex] || LEVELS[LEVELS.length - 1];
    if (lvlCfg.hasShop) openShop('mission');
    else startGameActual();
}

function startGameActual() {
    audio.init();
    state = 'playing'; paused = false;
    menuEl.classList.add('hidden');
    resultEl.classList.add('hidden');
    shopOverlay.classList.add('hidden');
    dangerBar.classList.remove('hidden');
    if (quickControls) quickControls.classList.remove('hidden');
    if (levelBadge) levelBadge.classList.remove('hidden');
    nearFinishRadioDone = false;
    lowHpRadioDone = false;
    lowTimeRadioDone = false; critTimeRadioDone = false;
    dangerLevel = 0; recommendedRouteVisible = true;
    combo = 0; comboTimer = 0; comboMultiplier = 1; comboShowTimer = 0;
    gameClock = 0; levelCompletedOnce = false; bossSpawned = false;
    resetTutorialFlags();
    applyLevelConfig();

    // Apply weapon bonuses
    const baseHp = playerWeapons.armor2 ? 200 : playerWeapons.armor ? 150 : 100;
    player.damageReduction = playerWeapons.armor2 ? 0.25 : 0;
    const boostMax = playerWeapons.nitro3 ? 300 : playerWeapons.nitro2 ? 200 : 100;
    const boostSpeedBonus = playerWeapons.nitro3 ? 1.2 : 1.0;

    Object.assign(player, {
        x: currentLevelConfig.start.x, y: currentLevelConfig.start.y, angle: currentLevelConfig.start.angle,
        speed: 0, hp: baseHp, boost: boostMax, score: 0, invincible: 0,
        _gunCooldown: 0, _shotgunCooldown: 0, _missileCooldown: 0,
        boostMaxSpeed: 660 * boostSpeedBonus,
    });

    timeLeft = TIME_LIMIT;
    shake = 0; flash = 0;
    floatingTexts.length = 0;
    bullets.length = 0; bossBullets.length = 0; missiles.length = 0;
    robots.length = 0; robotBullets.length = 0;
    boss = null;
    if (comboDisplay) comboDisplay.style.opacity = 0;
    createWorld();
    updateQuickControls();
    updateTutorial();
    saveProgress();

    const combatLevel = currentLevelConfig.hasBoss || currentLevelConfig.type === 'robot';
    if (currentLevelConfig.hasBoss) {
        document.getElementById('boss-hp-bar').style.display = 'none';
        document.getElementById('boss-name-label').style.display = 'none';
        if (fireBtnEl) fireBtnEl.classList.add('active');
    } else {
        updateBossHUD();
    }
    if (fireBtnEl) fireBtnEl.classList.toggle('active', combatLevel);
    setTimeout(() => radio.say('start'), 800);
}

function endGame(win, scores = {}) {
    state = win ? 'win' : 'lose'; paused = false;
    audio.silence();
    if (win) audio.playWin(); else audio.playLose();
    dangerBar.classList.add('hidden');
    if (quickControls) quickControls.classList.add('hidden');
    if (levelBadge) levelBadge.classList.add('hidden');
    setTutorialMessage('');
    if (comboDisplay) comboDisplay.style.opacity = 0;
    if (fireBtnEl) fireBtnEl.classList.remove('active');
    const bossBar = document.getElementById('boss-hp-bar');
    const bossLabel = document.getElementById('boss-name-label');
    if (bossBar) bossBar.style.display = 'none';
    if (bossLabel) bossLabel.style.display = 'none';

    const isBossLevel = currentLevelConfig && currentLevelConfig.hasBoss;
    const isRobotLevel = currentLevelConfig && currentLevelConfig.type === 'robot';

    if (win) {
        const { total, timeBonus, hpBonus, scoreBonus } = scores;
        const earnedCoins = levelCompletedOnce ? 0 : completeLevel(total);
        levelCompletedOnce = true;
        let rank = 'C';
        if (total > 4000) rank = 'B';
        if (total > 6500) rank = 'A';
        if (total > 9000) rank = 'S';
        const completedLevel = currentLevelIndex;
        const lvlId = currentLevelConfig.id;
        const prevBest = bestByLevel[lvlId] || {};
        bestByLevel[lvlId] = {
            completed: true,
            bestScore: Math.max(prevBest.bestScore || 0, total),
            bestRank: rank,
        };
        if (currentLevelIndex < LEVELS.length - 1) currentLevelIndex++;
        saveProgress();
        const nextButtonText = completedLevel < LEVELS.length - 1 ? '▶ СЛЕДУЮЩИЙ УРОВЕНЬ' : '▶ ИГРАТЬ СНОВА';
        const winTitle = isBossLevel ? 'PETYA ПОВЕРЖЕН!' : isRobotLevel ? 'ROBOTS DESTROYED' : 'DELIVERED';
        const winSub = isBossLevel
            ? '<span style="color:#ffd166">Bosс NEXACOM уничтожен. Последний картридж свободен!</span>'
            : isRobotLevel
                ? '<span style="color:#ffd166">Все роботы NEXACOM уничтожены.</span>'
                : 'Картридж доставлен. Аркадная сцена спасена.';
        resultPanel.innerHTML = `
      <div class="version-tag">▸ ${isBossLevel ? 'BOSС УНИЧТОЖЕН' : isRobotLevel ? 'РОБОТЫ УНИЧТОЖЕНЫ' : 'МИССИЯ ВЫПОЛНЕНА'} ◂</div>
      <h1 class="title" style="color:#ffd166">${winTitle}</h1>
      <div class="win-rank">${rank}</div>
      <p class="subtitle" style="color:#3cff7e;margin:0 0 16px">${winSub}</p>
      <div style="max-width:380px;margin:0 auto 20px">
        <div class="score-row"><span>БОНУС ВРЕМЕНИ</span><span>+${timeBonus}</span></div>
        <div class="score-row"><span>БОНУС БРОНИ</span><span>+${hpBonus}</span></div>
        <div class="score-row"><span>ОЧКИ МАРШРУТА</span><span>+${scoreBonus}</span></div>
        ${isBossLevel ? '<div class="score-row"><span>БОНУС BOSСА</span><span style="color:#ff2bd6">+5000</span></div>' : isRobotLevel ? '<div class="score-row"><span>БОЕВОЙ БОНУС</span><span style="color:#ff2bd6">+1500</span></div>' : ''}
        <div class="score-row" style="border-color:#ffd166;margin-top:8px"><span style="color:#ffd166;font-size:16px">ИТОГО</span><span style="color:#ffd166;font-size:16px">${total}</span></div>
        <div class="score-row coin-row"><span>ПОЛУЧЕНО МОНЕТ</span><span>+${earnedCoins}</span></div>
        <div class="score-row coin-row"><span>МОНЕТ ВСЕГО</span><span>${coins}</span></div>
      </div>
      <p style="color:#7ae8f0;font-size:12px;margin:0 0 16px">ARCADE SCENE SAVED · 1987</p>
      <button class="btn" onclick="startGame()">${nextButtonText}</button>
      <button class="btn" style="margin-left:10px;border-color:#ffd166;color:#ffd166" onclick="playLevel(${completedLevel})">↻ ПОВТОРИТЬ</button>
      <button class="btn" style="margin-left:10px;border-color:#00f5ff;color:#00f5ff" onclick="openGarageFromMenu()">▸ ГАРАЖ</button>
      <button class="btn" style="margin-left:10px;border-color:#ff2bd6;color:#ff2bd6" onclick="goToMenu()">◀ МЕНЮ</button>
    `;
    } else {
        resultPanel.innerHTML = `
      <div class="version-tag">▸ МИССИЯ ПРОВАЛЕНА ◂</div>
      <h1 class="title" style="color:#ff2bd6">GAME OVER</h1>
      <p class="subtitle" style="color:#ff8ad6">
        ${scores.reason || 'Картридж потерян в неоновом шуме.'}<br><br>ARCADE SCENE LOST · 1987
      </p>
      ${(isBossLevel || isRobotLevel) ? '<button class="btn" style="border-color:#ff2bd6;color:#ff2bd6" onclick="openShop(&quot;mission&quot;)">🔫 В МАГАЗИН</button> ' : ''}
      <button class="btn" style="border-color:#ff2bd6;color:#ff2bd6;box-shadow:0 0 20px rgba(255,43,214,0.5)" onclick="startGame()">▶ ПОПРОБОВАТЬ СНОВА</button>
      <button class="btn" style="margin-left:10px;border-color:#ffd166;color:#ffd166" onclick="openGarageFromMenu()">▸ ГАРАЖ</button>
      <button class="btn" style="margin-left:10px;border-color:#00f5ff;color:#00f5ff" onclick="goToMenu()">◀ МЕНЮ</button>
    `;
    }
    resultEl.classList.remove('hidden');
}

// ── UPDATE ────────────────────────────────────────
function update(dt) {
    if (state !== 'playing') return;
    if (paused) { audio.silence(); updateComboDisplay(); return; }
    gameClock += dt;

    timeLeft -= dt;
    if (timeLeft <= 0) {
        endGame(false, { reason: 'Время вышло. Последний аркадный клуб погас.' });
        return;
    }

    if (!lowTimeRadioDone && timeLeft < 30) { radio.say('low_time'); lowTimeRadioDone = true; }
    if (!critTimeRadioDone && timeLeft < 15) { radio.say('critical_time', 'danger'); critTimeRadioDone = true; }

    // FIX #5: use canonical action names
    const fwd     = keys.has('up');
    const back    = keys.has('down');
    const left    = keys.has('left');
    const right   = keys.has('right');
    const boosting = keys.has('boost') && player.boost > 0 && player.speed > 60;

    if (Math.abs(player.speed) > 80) tutorialFlags.moved = true;
    if (left || right) tutorialFlags.turned = true;
    if (boosting || keys.has('boost')) tutorialFlags.boosted = true;
    if (gameClock > 5) tutorialFlags.map = true;

    const maxSpd = boosting ? player.boostMaxSpeed : player.maxSpeed;
    if (fwd)  player.speed += player.acceleration * dt;
    else if (back) player.speed -= player.brake * dt;
    else player.speed *= Math.pow(player.friction, dt * 60);
    player.speed = clamp(player.speed, -200, maxSpd);

    const boostMax = playerWeapons.nitro3 ? 300 : playerWeapons.nitro2 ? 200 : 100;
    const boostRegen = playerWeapons.nitro3 ? 28 : playerWeapons.nitro2 ? 22 : 14;
    if (boosting) player.boost = Math.max(0, player.boost - 36 * dt);
    else player.boost = Math.min(boostMax, player.boost + boostRegen * dt);

    const sAbs = Math.abs(player.speed);
    const turnFactor = clamp(sAbs / 260, 0.45, 1.1);
    const lsBoost = sAbs < 130 ? player.lowSpeedTurnBoost : 1;

    // FIX #6: turn direction does NOT invert when reversing
    // Use player.speed sign to determine if going forward or backward
    // But turn input always maps: left = counterclockwise, right = clockwise (absolute)
    const turnDir = 1;
    if (left)  player.angle -= player.turnSpeed * turnFactor * lsBoost * dt * turnDir;
    if (right) player.angle += player.turnSpeed * turnFactor * lsBoost * dt * turnDir;

    if (sAbs > 60) {
        carTrails.push({
            x: player.x - Math.cos(player.angle)*28,
            y: player.y - Math.sin(player.angle)*28,
            life: 0.4,
            size: 4 + Math.min(8, sAbs/90),
        });
    }

    const oldX = player.x, oldY = player.y;
    player.x += Math.cos(player.angle) * player.speed * dt;
    player.y += Math.sin(player.angle) * player.speed * dt;
    player.x = clamp(player.x, 30, WORLD.width - 30);
    player.y = clamp(player.y, 30, WORLD.height - 30);

    if (player.invincible > 0) player.invincible -= dt;

    const pRect = getPlayerRect();

    if (shopZone) {
        const drivePad = getShopDrivePad();
        shopZone.active = !!drivePad && rectsOverlap(pRect, drivePad);
        if (shopZone.active && keys.has('fire')) {
            openGarageFromDrive();
            keys.delete('fire');
            return;
        }
    }

    const onRoad = roads.some(r => rectsOverlap(pRect, r));
    if (!onRoad) {
        player.x = oldX; player.y = oldY;
        player.speed = 0;
        player.hp -= 4 * dt;
        resetCombo();
        offroadRadioCooldown -= dt;
        if (offroadRadioCooldown <= 0) { radio.say('offroad', 'danger'); offroadRadioCooldown = 8; }
    }

    if (shopZone && rectsOverlap(pRect, shopZone)) {
        player.x = oldX; player.y = oldY;
        player.speed = 0;
        shake = Math.max(shake, 5);
    }

    for (const b of buildings) {
        if (rectsOverlap(pRect, b)) {
            player.x = oldX; player.y = oldY;
            player.speed = 0;
            if (player.invincible <= 0) {
                const dmg = 18 * (1 - player.damageReduction);
                player.hp -= dmg * dt;
                shake = Math.max(shake, 8);
                audio.beep(95, 0.04, 0.015, 'sawtooth');
                resetCombo();
            }
        }
    }

    for (const b of barricades) {
        if (rectsOverlap(pRect, getBarricadeRect(b))) {
            player.x = oldX; player.y = oldY;
            player.speed = 0;
            if (player.invincible <= 0) {
                const dmg = 18 * (1 - player.damageReduction);
                player.hp -= dmg * dt;
                shake = Math.max(shake, 12); flash = Math.max(flash, 0.10); flashColor = 'rgba(255,209,102,';
                audio.beep(120, 0.05, 0.02, 'sawtooth');
                resetCombo();
                spawnExplosion(player.x, player.y, '#ffd166', 12);
            }
        }
    }

    for (const g of glitches) {
        g.phase += 0.09;
        if (rectsOverlap(pRect, g)) {
            tutorialFlags.glitch = true;
            if (player.invincible <= 0) {
                const dmg = g.damage * (1 - player.damageReduction);
                player.hp -= dmg * dt;
                flash = Math.max(flash, 0.06); flashColor = 'rgba(255,43,214,';
                player.speed *= 0.987;
                resetCombo();
            }
        }
    }

    for (const d of drones) {
        d.phase += dt * 3.2;
        d.cooldown -= dt;
        const dx = player.x - d.x, dy = player.y - d.y;
        const dDist = Math.hypot(dx, dy);
        const chaseRange = 350 + dangerLevel * 60;

        // Radar: show wider on minimap already, also slightly reduce chase range
        const effectiveRange = playerWeapons.radar ? chaseRange * 0.8 : chaseRange;

        if (dDist < effectiveRange) {
            tutorialFlags.drone = true;
            d.alertLevel = 1;
            const chaseSpeed = (85 + dangerLevel * 20) * (d.speedMod || 1);
            d.vx += (dx / Math.max(1,dDist)) * chaseSpeed * dt;
            d.vy += (dy / Math.max(1,dDist)) * chaseSpeed * dt;
        } else {
            d.alertLevel = 0;
            d.vx += Math.cos(d.phase * 0.3) * 15 * dt;
            d.vy += Math.sin(d.phase * 0.4) * 15 * dt;
        }

        const dSpd = Math.hypot(d.vx, d.vy);
        const maxDSpd = (d.alertLevel ? 160 + dangerLevel*25 : 80) * (d.speedMod || 1);
        if (dSpd > maxDSpd) { d.vx = d.vx/dSpd*maxDSpd; d.vy = d.vy/dSpd*maxDSpd; }
        d.vx *= Math.pow(0.986, dt*60);
        d.vy *= Math.pow(0.986, dt*60);
        d.x += d.vx * dt; d.y += d.vy * dt;

        const dOnRoad = roads.find(r => circleRect(d, r));
        if (!dOnRoad) { d.vx *= -0.7; d.vy *= -0.7; }
        d.x = clamp(d.x, 40, WORLD.width-40);
        d.y = clamp(d.y, 40, WORLD.height-40);

        if (circleRect(d, pRect) && player.invincible <= 0) {
            const dmg = 20 * (1 - player.damageReduction);
            player.hp -= dmg * dt;
            player.speed *= 0.96;
            shake = Math.max(shake, 10); flash = Math.max(flash, 0.08); flashColor = 'rgba(255,43,214,';
            dangerLevel = Math.min(5, dangerLevel + dt * 0.4);
            resetCombo();
            updateDangerUI();
            if (d.cooldown <= 0) {
                audio.beep(160, 0.04, 0.015, 'square');
                radio.say('drone_hit', 'danger');
                d.cooldown = 0.6;
                spawnExplosion(player.x, player.y, '#ff2bd6', 10);
            }
        }
    }

    dangerLevel = Math.max(0, dangerLevel - dt * 0.08);
    updateDangerUI();

    for (const pad of boostPads) {
        pad.pulse += dt * 5;
        if (pad.cooldown > 0) pad.cooldown -= dt;
        const pdx = player.x - pad.x, pdy = player.y - pad.y;
        if (Math.abs(pdx) < 58 && Math.abs(pdy) < 42 && pad.cooldown <= 0) {
            const dir = Math.sign(player.speed || 1);
            player.speed = dir * Math.max(Math.abs(player.speed), player.boostMaxSpeed * 0.85);
            player.boost = Math.min(boostMax, player.boost + 25);
            pad.cooldown = 1.4;
            shake = Math.max(shake, 6); flash = Math.max(flash, 0.12); flashColor = 'rgba(0,245,255,';
            audio.beep(940, 0.06, 0.02, 'triangle');
            radio.say('boost_pad');
            addCombo(50);
            addFloatingText(player.x, player.y - 42, `BOOST ×${comboMultiplier}`, '#00f5ff', 15);
            spawnExplosion(player.x, player.y, '#00f5ff', 14);
        }
    }

    for (const b of bonuses) {
        if (b.taken) continue;
        b.pulse += dt * 5;
        if (dist(player.x, player.y, b.x, b.y) < 38) {
            b.taken = true;
            tutorialFlags.bonus = true;
            const bonusColor = b.type==='boost' ? '#00f5ff' : b.type==='repair' ? '#3cff7e' : '#ffd166';
            const bonusPoints = 150 * comboMultiplier;
            player.score += bonusPoints;
            addCombo(150);
            addFloatingText(b.x, b.y - 30, `+${Math.floor(bonusPoints)} ×${comboMultiplier}`, bonusColor, 15);
            spawnPickup(b.x, b.y, bonusColor);
            if (b.type === 'boost') {
                player.boost = boostMax;
                audio.beep(800, 0.05, 0.018, 'triangle');
                radio.say('boost_bonus', 'good');
            }
            if (b.type === 'repair') {
                const maxHp = playerWeapons.armor2 ? 200 : playerWeapons.armor ? 150 : 100;
                player.hp = Math.min(maxHp, player.hp + 30);
                audio.beep(660, 0.06, 0.018, 'triangle');
                radio.say('repair', 'good');
            }
            if (b.type === 'time') {
                timeLeft = Math.min(TIME_LIMIT+15, timeLeft+10);
                audio.beep(520, 0.05, 0.016, 'triangle');
                radio.say('time_bonus', 'good');
            }
            flash = Math.max(flash, 0.16);
            flashColor = b.type==='boost' ? 'rgba(0,245,255,' : b.type==='repair' ? 'rgba(60,255,126,' : 'rgba(255,209,102,';
        }
    }

    if (combo > 0) { comboTimer -= dt; if (comboTimer <= 0) resetCombo(); }
    if (comboShowTimer > 0) comboShowTimer -= dt;
    updateComboDisplay();

    if (!lowHpRadioDone && player.hp < 30) { radio.say('low_hp', 'danger'); lowHpRadioDone = true; }
    if (player.hp <= 0) {
        spawnExplosion(player.x, player.y, '#ff2bd6', 40);
        endGame(false, { reason: 'Машина уничтожена. Последний картридж потерян в неоновом шуме.' });
        return;
    }

    if (currentLevelConfig && currentLevelConfig.hasBoss && !bossSpawned) {
        const arena = getBossArenaRect();
        if (arena && rectsOverlap(pRect, arena)) {
            bossSpawned = true;
            spawnBoss();
            shake = Math.max(shake, 18);
            flash = Math.max(flash, 0.25); flashColor = 'rgba(255,43,214,';
        }
    }

    if (currentLevelConfig && (currentLevelConfig.hasBoss || currentLevelConfig.type === 'robot')) {
        updatePlayerBullets(dt);
        updateBossBullets(dt);
        updateRobotBullets(dt);
        updateMissiles(dt);
        updateRobots(dt);
        updateBoss(dt);
        if (keys.has('fire')) fireBullet();
    }

    const dToFinish = dist(player.x, player.y, dest.x+dest.w/2, dest.y+dest.h/2);
    if (dToFinish < 500) tutorialFlags.finish = true;
    if (!nearFinishRadioDone && dToFinish < 500) { radio.say('near_finish', 'good'); nearFinishRadioDone = true; }
    if (dToFinish < 420 && Math.random() < 0.5) {
        particles.push(new Particle(dest.x + Math.random()*dest.w, dest.y + dest.h + Math.random()*30,
            { vx:(Math.random()-0.5)*100, vy:-100-Math.random()*130, life:0.7, size:3, color:'#ffd166', gravity:80 }));
    }

    const bossAlive = currentLevelConfig && currentLevelConfig.hasBoss && boss && !boss.dead;
    if (currentLevelConfig && currentLevelConfig.type === 'robot' && robots.length === 0) {
        const timeBonus = Math.floor(timeLeft * 28);
        const hpBonus   = Math.floor(player.hp * 12);
        const scoreBonus = Math.floor(player.score + 1500);
        endGame(true, { timeBonus, hpBonus, scoreBonus, total: timeBonus + hpBonus + scoreBonus });
        return;
    }
    if (currentLevelConfig && currentLevelConfig.type !== 'robot' && rectsOverlap(pRect, dest) && !bossAlive) {
        const timeBonus  = Math.floor(timeLeft * 28);
        const hpBonus    = Math.floor(player.hp * 12);
        const scoreBonus = Math.floor(player.score);
        endGame(true, { timeBonus, hpBonus, scoreBonus, total: timeBonus + hpBonus + scoreBonus });
        return;
    }

    player.score += dt * Math.max(0, player.speed) * 0.045;
    camera.x = clamp(player.x - window.innerWidth/2,  0, WORLD.width  - window.innerWidth);
    camera.y = clamp(player.y - window.innerHeight/2, 0, WORLD.height - window.innerHeight);

    for (let i = particles.length-1; i >= 0; i--) {
        particles[i].update(dt);
        if (!particles[i].alive) particles.splice(i, 1);
    }
    for (let i = carTrails.length-1; i >= 0; i--) {
        carTrails[i].life -= dt;
        if (carTrails[i].life <= 0) carTrails.splice(i, 1);
    }
    for (let i = floatingTexts.length-1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy * dt; ft.life -= dt * 1.35;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
    for (let i = cityRainDrops.length-1; i >= 0; i--) {
        const r = cityRainDrops[i];
        r.x += r.vx * dt; r.y += r.vy * dt; r.life -= dt;
        if (r.life <= 0) cityRainDrops[i] = makeRainDrop();
    }
    while (cityRainDrops.length < 100) cityRainDrops.push(makeRainDrop());

    updateTutorial();
    audio.updateEngine(player.speed, boosting);
    shake *= Math.pow(0.80, dt*60);
    flash = Math.max(0, flash - dt * 2.2);
}

// ── DRAW ─────────────────────────────────────────
function draw() {
    const W = window.innerWidth, H = window.innerHeight;
    ctx.clearRect(0, 0, W, H);
    const sx = (Math.random()-0.5) * shake;
    const sy = (Math.random()-0.5) * shake;
    ctx.save();
    ctx.translate(-camera.x + sx, -camera.y + sy);
    drawBackground();
    drawDistrictZones();
    drawRain();
    drawRoads();
    drawRoadMarkings();
    drawRoadLights();
    drawRouteBeacons();
    drawDestination();
    drawShopZone();
    drawBuildings();
    drawNeonSigns();
    drawLandmarkSigns();
    drawGlitches();
    drawBarricades();
    drawBoostPads();
    drawBonuses();
    drawDrones();
    drawRobots();
    drawCarTrails();
    drawPlayer();
    drawPlayerBullets();
    drawMissiles();
    drawBossBullets();
    drawRobotBullets();
    drawBoss();
    drawParticles();
    drawFloatingTexts();
    ctx.restore();
    drawDirectionArrow();
    drawHUD();
    if (minimapEnabled) drawMinimap();
    drawVignette();
    if (paused) drawPauseOverlay();
    if (flash > 0.005) {
        ctx.fillStyle = flashColor + flash + ')';
        ctx.fillRect(0, 0, W, H);
    }
}

// ── DRAW FUNCTIONS ────────────────────────────────
function drawBackground() {
    ctx.fillStyle = '#06000f';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.strokeStyle = 'rgba(0,245,255,0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < WORLD.width; x += 80) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, WORLD.height); ctx.stroke();
    }
    for (let y = 0; y < WORLD.height; y += 80) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(WORLD.width, y); ctx.stroke();
    }
    const baseY = WORLD.height - 60;
    for (let i = 0; i < 40; i++) {
        const bx = (i * 173) % WORLD.width;
        const bh = 60 + ((i*47)%160);
        const bw = 40 + ((i*29)%90);
        ctx.fillStyle = i%2===0 ? 'rgba(10,0,28,0.7)' : 'rgba(18,0,40,0.55)';
        ctx.fillRect(bx, baseY-bh, bw, bh);
        ctx.strokeStyle = i%3===0 ? 'rgba(0,245,255,0.22)' : 'rgba(255,43,214,0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, baseY-bh, bw, bh);
    }
}

function drawDistrictZones() {
    ctx.save();
    for (const z of districtZones) {
        z.phase += 0.015;
        const rgb = z.color === '#ffd166' ? '255,209,102' : z.color === '#ff2bd6' ? '255,43,214' : '0,245,255';
        const pulse = 0.45 + Math.sin(z.phase) * 0.12;
        ctx.fillStyle = `rgba(${rgb},0.045)`;
        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.strokeStyle = `rgba(${rgb},${0.22 + pulse * 0.18})`;
        ctx.lineWidth = 2; ctx.setLineDash([22, 16]);
        ctx.shadowColor = z.color; ctx.shadowBlur = 14;
        ctx.strokeRect(z.x, z.y, z.w, z.h);
        ctx.setLineDash([]);
        ctx.shadowBlur = 12;
        ctx.fillStyle = `rgba(${rgb},0.5)`;
        ctx.font = 'bold 15px Courier New';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(z.label, z.x + 18, z.y + 16);
    }
    ctx.shadowBlur = 0; ctx.restore();
}

function drawLandmarkSigns() {
    ctx.save();
    for (const s of landmarkSigns) {
        s.phase += 0.04;
        const color = s.color || '#00f5ff';
        const rgb = color === '#ffd166' ? '255,209,102' : color === '#ff2bd6' ? '255,43,214' : '0,245,255';
        const w = Math.max(120, s.text.length * 10 + 26), h = 32;
        const a = 0.62 + Math.sin(s.phase) * 0.18;
        ctx.shadowColor = color; ctx.shadowBlur = 22;
        ctx.fillStyle = 'rgba(4,0,12,0.82)';
        ctx.fillRect(s.x - w/2, s.y - h/2, w, h);
        ctx.strokeStyle = `rgba(${rgb},${a})`; ctx.lineWidth = 2;
        ctx.strokeRect(s.x - w/2, s.y - h/2, w, h);
        ctx.fillStyle = color; ctx.font = 'bold 13px Courier New';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(s.text, s.x, s.y + 1);
        ctx.beginPath();
        ctx.moveTo(s.x - 14, s.y + h/2); ctx.lineTo(s.x, s.y + h/2 + 18); ctx.lineTo(s.x + 14, s.y + h/2);
        ctx.closePath();
        ctx.fillStyle = `rgba(${rgb},0.45)`; ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.restore();
}

function drawRain() {
    ctx.save(); ctx.strokeStyle = 'rgba(0,245,255,0.13)'; ctx.lineWidth = 1;
    for (const r of cityRainDrops) {
        ctx.globalAlpha = Math.min(1, r.life) * 0.5;
        ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 10, r.y + 24); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
}

function drawRoads() {
    for (const r of roads) {
        ctx.fillStyle = '#100820'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 3;
        ctx.shadowColor = '#ff2bd6'; ctx.shadowBlur = 14;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.shadowBlur = 0;
    }
}

function drawRoadMarkings() {
    ctx.setLineDash([22, 18]); ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,209,102,0.5)';
    for (const r of roads) {
        ctx.beginPath();
        if (r.w > r.h) { ctx.moveTo(r.x+20, r.y+r.h/2); ctx.lineTo(r.x+r.w-20, r.y+r.h/2); }
        else { ctx.moveTo(r.x+r.w/2, r.y+20); ctx.lineTo(r.x+r.w/2, r.y+r.h-20); }
        ctx.stroke();
    }
    ctx.setLineDash([]);
}

function drawRoadLights() {
    ctx.save();
    for (const l of roadLights) {
        l.phase += 0.038;
        const pulse = 0.5 + Math.sin(l.phase) * 0.28;
        ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 8 + pulse * 12;
        ctx.fillStyle = `rgba(255,209,102,${0.4 + pulse * 0.4})`;
        ctx.beginPath(); ctx.arc(l.x, l.y, 4, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.restore();
}

function drawRouteBeacons() {
    if (!recommendedRouteVisible) return;
    const pts = gpsRoutePoints.length > 1 ? gpsRoutePoints : routeBeacons;
    ctx.save();
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(255,209,102,0.65)';
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
    const t = performance.now() / 1000;
    for (const b of routeBeacons) {
        const d = dist(player.x, player.y, b.x, b.y);
        const near = d < 130;
        const pulse = 0.7 + Math.sin(t*3) * 0.3;
        ctx.shadowColor = near ? '#ffd166' : '#00f5ff'; ctx.shadowBlur = near ? 20 : 10;
        ctx.fillStyle = near ? `rgba(255,209,102,${pulse})` : 'rgba(0,245,255,0.3)';
        ctx.beginPath(); ctx.arc(b.x, b.y, near ? 14 : 9, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

function drawDestination() {
    ctx.save();
    const pulse = 0.75 + Math.sin(performance.now()/220) * 0.25;
    ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 28 + pulse * 20;
    ctx.fillStyle = 'rgba(0,245,255,0.15)'; ctx.fillRect(dest.x, dest.y, dest.w, dest.h);
    ctx.strokeStyle = '#00f5ff'; ctx.lineWidth = 4; ctx.strokeRect(dest.x, dest.y, dest.w, dest.h);
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(dest.x-40, dest.y+dest.h+8); ctx.lineTo(dest.x+dest.w+40, dest.y+dest.h+8); ctx.stroke();
    ctx.shadowBlur = 0;
    const isBossLvl = currentLevelConfig && currentLevelConfig.hasBoss;
    const bossStillAlive = isBossLvl && boss && !boss.dead;
    const isRobotLvl = currentLevelConfig && currentLevelConfig.type === 'robot';
    ctx.fillStyle = bossStillAlive ? 'rgba(0,245,255,0.4)' : '#00f5ff';
    ctx.font = 'bold 18px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(isBossLvl ? 'ESCAPE ZONE' : isRobotLvl ? 'EXTRACT ZONE' : 'ARCADE CLUB', dest.x+dest.w/2, dest.y+55);
    ctx.fillStyle = bossStillAlive || (isRobotLvl && drones.length > 0) ? '#ff2bd6' : '#ffd166';
    ctx.font = '11px Courier New';
    ctx.fillText(bossStillAlive ? '⚠ СНАЧАЛА УБЕЙ BOSСА!' : isRobotLvl && robots.length > 0 ? `ROBOTS LEFT: ${robots.length}` : 'INSERT CARTRIDGE HERE', dest.x+dest.w/2, dest.y+76);
    ctx.restore();
}

function drawShopZone() {
    if (!shopZone) return;
    shopZone.phase += 0.035;
    const active = shopZone.active;
    ctx.save();
    ctx.shadowColor = active ? '#ffd166' : '#00f5ff';
    ctx.shadowBlur = active ? 34 : 20;
    ctx.fillStyle = 'rgba(8,0,20,0.95)';
    ctx.fillRect(shopZone.x, shopZone.y, shopZone.w, shopZone.h);
    ctx.strokeStyle = active ? '#ffd166' : '#00f5ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(shopZone.x, shopZone.y, shopZone.w, shopZone.h);
    ctx.fillStyle = 'rgba(255,43,214,0.16)';
    ctx.fillRect(shopZone.x + 12, shopZone.y + 18, shopZone.w - 24, 30);
    ctx.fillStyle = active ? '#ffd166' : '#ff2bd6';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GARAGE', shopZone.x + shopZone.w/2, shopZone.y + 34);
    ctx.font = 'bold 10px Courier New';
    ctx.fillStyle = '#00f5ff';
    ctx.fillText(active ? 'F / ENTER — SHOP' : 'UPGRADES', shopZone.x + shopZone.w/2, shopZone.y + 72);
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < 5; i++) ctx.fillRect(shopZone.x + 28 + i*28, shopZone.y + 96, 15, 12);
    ctx.beginPath();
    ctx.arc(shopZone.doorX, shopZone.doorY, active ? 18 : 12, 0, Math.PI*2);
    ctx.fillStyle = active ? 'rgba(255,209,102,0.45)' : 'rgba(0,245,255,0.25)';
    ctx.fill();
    ctx.strokeStyle = active ? '#ffd166' : '#00f5ff';
    ctx.stroke();
    ctx.restore();
}

function drawBuildings() {
    for (const b of buildings) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(b.x+6, b.y+6, b.w, b.h);
        ctx.fillStyle = '#0e001e'; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = b.color; ctx.lineWidth = 2;
        ctx.shadowColor = b.color; ctx.shadowBlur = 10;
        ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,209,102,0.55)';
        for (let yy = b.y+16; yy < b.y+b.h-10; yy += 22) {
            for (let xx = b.x+14; xx < b.x+b.w-10; xx += 24) {
                if (((Math.floor(xx+yy+b.x)*17) % 11) !== 0) ctx.fillRect(xx, yy, 8, 10);
            }
        }
    }
}

function drawNeonSigns() {
    ctx.save();
    for (const s of neonSigns) {
        s.phase += 0.042;
        const flicker = Math.sin(s.phase * s.flickerRate) > -0.85 ? 1 : 0.1;
        const alpha = (0.55 + Math.sin(s.phase) * 0.3) * flicker;
        ctx.shadowColor = s.color; ctx.shadowBlur = 12 + alpha * 10;
        ctx.fillStyle = `rgba(${s.color==='#00f5ff' ? '0,245,255' : '255,43,214'},${alpha})`;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.strokeStyle = s.color; ctx.lineWidth = 1; ctx.strokeRect(s.x, s.y, s.w, s.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#06000f'; ctx.font = 'bold 7px Courier New';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(s.text.slice(0,8), s.x + s.w/2, s.y + s.h/2 + 1);
    }
    ctx.restore();
}

function drawGlitches() {
    for (const g of glitches) {
        const jitter = Math.sin(g.phase) * 3;
        ctx.fillStyle = 'rgba(255,43,214,0.18)'; ctx.fillRect(g.x+jitter, g.y, g.w, g.h);
        ctx.fillStyle = 'rgba(0,245,255,0.1)'; ctx.fillRect(g.x-jitter, g.y+5, g.w*0.7, g.h*0.45);
        ctx.strokeStyle = 'rgba(255,43,214,0.65)'; ctx.lineWidth = 1; ctx.strokeRect(g.x, g.y, g.w, g.h);
    }
}

function drawBarricades() {
    ctx.save();
    for (const b of barricades) {
        const pulse = 0.75 + Math.sin(performance.now() / 220 + (b.x + b.y) * 0.01) * 0.18;
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(b.angle || 0);
        ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 14;
        ctx.fillStyle = 'rgba(255,209,102,0.22)'; ctx.fillRect(-b.w/2, -b.h/2, b.w, b.h);
        ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.strokeRect(-b.w/2, -b.h/2, b.w, b.h);
        ctx.strokeStyle = `rgba(255,43,214,${0.55 + pulse * 0.25})`; ctx.lineWidth = 2;
        for (let x = -b.w/2 + 10; x < b.w/2; x += 18) {
            ctx.beginPath(); ctx.moveTo(x-10, -b.h/2); ctx.lineTo(x+10, b.h/2); ctx.stroke();
        }
        ctx.fillStyle = '#06000f'; ctx.font = 'bold 8px Courier New';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BLOCK', 0, 1);
        ctx.restore();
    }
    ctx.restore();
}

function drawBoostPads() {
    ctx.save();
    for (const pad of boostPads) {
        const alpha = pad.cooldown > 0 ? 0.22 : 0.65 + Math.sin(pad.pulse) * 0.25;
        ctx.save();
        ctx.translate(pad.x, pad.y); ctx.rotate(pad.angle);
        ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = pad.cooldown > 0 ? 6 : 24;
        ctx.fillStyle = `rgba(0,245,255,${alpha*0.2})`; ctx.fillRect(-pad.w/2, -pad.h/2, pad.w, pad.h);
        ctx.strokeStyle = `rgba(0,245,255,${alpha})`; ctx.lineWidth = 3; ctx.strokeRect(-pad.w/2, -pad.h/2, pad.w, pad.h);
        ctx.fillStyle = `rgba(255,209,102,${alpha})`;
        ctx.beginPath(); ctx.moveTo(22,0); ctx.lineTo(-8,-13); ctx.lineTo(-2,0); ctx.lineTo(-8,13); ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

function drawBonuses() {
    for (const b of bonuses) {
        if (b.taken) continue;
        const pulse = 1 + Math.sin(b.pulse) * 0.22;
        ctx.save();
        ctx.translate(b.x, b.y); ctx.scale(pulse, pulse);
        const color = b.type==='boost' ? '#00f5ff' : b.type==='repair' ? '#3cff7e' : '#ffd166';
        ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#06000f'; ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.type==='boost' ? 'B' : b.type==='repair' ? '+' : 'T', 0, 1);
        ctx.restore();
    }
}

function drawDrones() {
    for (const d of drones) {
        ctx.save();
        ctx.translate(d.x, d.y); ctx.rotate(d.phase);
        if (d.alertLevel) {
            ctx.strokeStyle = 'rgba(255,43,214,0.35)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, 0, d.r+10+Math.sin(d.phase*2)*5, 0, Math.PI*2); ctx.stroke();
        }
        // Radar shows detection ring
        if (playerWeapons.radar && d.alertLevel === 0) {
            ctx.strokeStyle = 'rgba(255,209,102,0.18)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, 0, d.r+30, 0, Math.PI*2); ctx.stroke();
        }
        ctx.shadowColor = '#ff2bd6'; ctx.shadowBlur = d.alertLevel ? 24 : 14;
        ctx.fillStyle = '#1a0028'; ctx.strokeStyle = d.alertLevel ? '#ff6b6b' : '#ff2bd6'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0,-d.r); ctx.lineTo(d.r,0); ctx.lineTo(0,d.r); ctx.lineTo(-d.r,0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = d.alertLevel ? '#ff6b6b' : '#ff2bd6';
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

function drawRobots() {
    for (const r of robots) {
        ctx.save();
        ctx.translate(r.x, r.y);
        const pulse = 0.75 + Math.sin(r.phase * 3) * 0.15;
        ctx.shadowColor = '#ff2bd6'; ctx.shadowBlur = 18;
        ctx.fillStyle = '#1a0028';
        ctx.strokeStyle = '#ff2bd6';
        ctx.lineWidth = 3;
        ctx.fillRect(-r.w/2, -r.h/2, r.w, r.h);
        ctx.strokeRect(-r.w/2, -r.h/2, r.w, r.h);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-13, -10, 9, 8);
        ctx.fillRect(4, -10, 9, 8);
        ctx.fillStyle = '#00f5ff';
        ctx.fillRect(-16, 8, 32, 8);
        ctx.strokeStyle = `rgba(255,209,102,${pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-38, -14); ctx.moveTo(26, 0); ctx.lineTo(38, -14); ctx.stroke();
        const pct = r.hp / r.maxHp;
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(-28, -36, 56, 6);
        ctx.fillStyle = pct > 0.45 ? '#ff2bd6' : '#ff6b6b'; ctx.fillRect(-28, -36, 56 * pct, 6);
        ctx.restore();
    }
}

function drawRobotBullets() {
    ctx.save();
    for (const b of robotBullets) {
        ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 14; ctx.fillStyle = '#ffd166';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

function drawCarTrails() {
    ctx.save();
    for (const t of carTrails) {
        const alpha = Math.max(0, t.life / 0.4);
        ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(0,245,255,${alpha * 0.24})`;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.size * alpha, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.restore();
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle + Math.PI/2);
    const maxHp = playerWeapons.armor2 ? 200 : playerWeapons.armor ? 150 : 100;
    const hpRatio = player.hp / maxHp;
    const carColor = hpRatio > 0.5 ? '#00f5ff' : hpRatio > 0.25 ? '#ffd166' : '#ff6b6b';
    ctx.shadowColor = carColor; ctx.shadowBlur = 20;
    ctx.fillStyle = carColor; ctx.fillRect(-player.w/2, -player.h/2, player.w, player.h);
    ctx.fillStyle = '#06000f';
    ctx.fillRect(-player.w/2+6, -player.h/2+8, player.w-12, 16);
    ctx.fillRect(-player.w/2+5, player.h/2-14, player.w-10, 7);
    ctx.shadowBlur = 0;
    // Armor plating visual
    if (playerWeapons.armor2) {
        ctx.strokeStyle = '#3cff7e'; ctx.lineWidth = 2; ctx.shadowColor = '#3cff7e'; ctx.shadowBlur = 6;
        ctx.strokeRect(-player.w/2-2, -player.h/2-2, player.w+4, player.h+4);
        ctx.shadowBlur = 0;
    }
    ctx.fillStyle = '#ff2bd6';
    ctx.fillRect(-player.w/2-5, -player.h/2+6, 5, 14);
    ctx.fillRect(player.w/2, -player.h/2+6, 5, 14);
    ctx.fillRect(-player.w/2-5, player.h/2-20, 5, 14);
    ctx.fillRect(player.w/2, player.h/2-20, 5, 14);
    if (player.speed > 180) {
        const flame = 28 + Math.random() * 22;
        ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 18;
        ctx.fillStyle = 'rgba(255,209,102,0.9)';
        ctx.beginPath(); ctx.moveTo(-9, player.h/2); ctx.lineTo(0, player.h/2+flame); ctx.lineTo(9, player.h/2); ctx.fill();
    }
    const boosting = keys.has('boost') && player.boost > 0;
    if (boosting) {
        ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 30;
        ctx.fillStyle = 'rgba(0,245,255,0.6)';
        ctx.beginPath(); ctx.moveTo(-8, player.h/2); ctx.lineTo(0, player.h/2+42+Math.random()*18); ctx.lineTo(8, player.h/2); ctx.fill();
    }
    // Weapon indicators
    if (activeWeapon === 'missile' && playerWeapons.missile) {
        ctx.shadowColor = '#ff9900'; ctx.shadowBlur = 10; ctx.fillStyle = '#ff9900';
        ctx.fillRect(-10, -player.h/2-20, 6, 22); ctx.fillRect(4, -player.h/2-20, 6, 22);
        ctx.shadowBlur = 0;
    } else if (activeWeapon === 'shotgun' && playerWeapons.shotgun) {
        ctx.shadowColor = '#ff2bd6'; ctx.shadowBlur = 10; ctx.fillStyle = '#ff2bd6';
        ctx.fillRect(-8, -player.h/2-14, 16, 16); ctx.fillRect(-10, -player.h/2-18, 6, 6); ctx.fillRect(4, -player.h/2-18, 6, 6);
        ctx.shadowBlur = 0;
    } else if (activeWeapon === 'gun' && playerWeapons.gun) {
        ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 10; ctx.fillStyle = '#ffd166';
        ctx.fillRect(-5, -player.h/2-18, 10, 20); ctx.fillRect(-8, -player.h/2-8, 16, 8);
        ctx.shadowBlur = 0;
    }
    ctx.restore();
}

function drawPlayerBullets() {
    ctx.save();
    for (const b of bullets) {
        ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 18; ctx.fillStyle = '#ffd166';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,209,102,0.4)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x-b.vx*0.04, b.y-b.vy*0.04); ctx.stroke();
    }
    ctx.restore();
}

function drawMissiles() {
    ctx.save();
    for (const m of missiles) {
        ctx.save();
        ctx.translate(m.x, m.y); ctx.rotate(m.angle);
        ctx.shadowColor = '#ff9900'; ctx.shadowBlur = 24;
        ctx.fillStyle = '#ff9900';
        ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(-6,-7); ctx.lineTo(-2,0); ctx.lineTo(-6,7); ctx.closePath(); ctx.fill();
        // Trail
        ctx.fillStyle = 'rgba(255,153,0,0.4)';
        ctx.beginPath(); ctx.moveTo(-6,-4); ctx.lineTo(-22,0); ctx.lineTo(-6,4); ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

function drawBossBullets() {
    ctx.save();
    const bossColor = boss && boss.phase === 2 ? '#ff6b00' : '#ff2bd6';
    for (const b of bossBullets) {
        ctx.shadowColor = bossColor; ctx.shadowBlur = 16; ctx.fillStyle = bossColor;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

function drawBoss() {
    if (!boss || boss.dead) return;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    const t = performance.now() / 1000;
    const pulse = 0.7 + Math.sin(t * (boss.phase === 2 ? 6 : 3)) * 0.3;
    const bossColor = boss.phase === 2 ? '#ff0000' : '#ff2bd6';
    const bossColor2 = boss.phase === 2 ? '#ff6b00' : '#ff6b6b';
    ctx.rotate(t * (boss.phase === 2 ? 2.5 : 1));
    ctx.strokeStyle = bossColor; ctx.lineWidth = 4;
    ctx.shadowColor = bossColor; ctx.shadowBlur = 28;
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(Math.cos(angle)*55, Math.sin(angle)*55, 8, 0, Math.PI*2); ctx.stroke();
    }
    ctx.rotate(-(t * (boss.phase === 2 ? 2.5 : 1)));
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 - Math.PI / 6, r = boss.r * pulse;
        if (i === 0) ctx.moveTo(Math.cos(ang)*r, Math.sin(ang)*r);
        else ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r);
    }
    ctx.closePath();
    ctx.fillStyle = '#1a0028'; ctx.fill();
    ctx.strokeStyle = bossColor; ctx.lineWidth = 5; ctx.shadowBlur = 30; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0,-24); ctx.lineTo(24,0); ctx.lineTo(0,24); ctx.lineTo(-24,0); ctx.closePath();
    ctx.fillStyle = bossColor2; ctx.shadowColor = bossColor2; ctx.shadowBlur = 20; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('PETYA', 0, 0);
    if (boss.phase === 2) { ctx.fillStyle = '#ff0000'; ctx.font = 'bold 7px Courier New'; ctx.fillText('PHASE II', 0, 12); }
    ctx.restore();
    const barW = 100, pct = boss.hp / boss.maxHp;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(boss.x-barW/2, boss.y-boss.r-22, barW, 10);
    ctx.fillStyle = boss.phase===2 ? '#ff0000' : '#ff2bd6';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
    ctx.fillRect(boss.x-barW/2, boss.y-boss.r-22, barW*pct, 10);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(boss.x-barW/2, boss.y-boss.r-22, barW, 10);
    ctx.restore();
}

function drawParticles() {
    ctx.save();
    for (const p of particles) {
        ctx.globalAlpha = p.alpha; ctx.shadowColor = p.color; ctx.shadowBlur = 10; ctx.fillStyle = p.color;
        const s = p.shrink ? p.size * p.alpha : p.size;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, s), 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();
}

function drawDirectionArrow() {
    if (state !== 'playing') return;
    const tx = dest.x + dest.w/2, ty = dest.y + dest.h/2;
    const dx = tx - player.x, dy = ty - player.y;
    const angle = Math.atan2(dy, dx);
    const dMeters = Math.floor(Math.hypot(dx, dy));
    const cx = window.innerWidth/2, cy = 76;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(angle);
    ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 22; ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.moveTo(40,0); ctx.lineTo(-18,-16); ctx.lineTo(-7,0); ctx.lineTo(-18,16); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 13px Courier New'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166'; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 10;
    const targetLabel = currentLevelConfig && currentLevelConfig.type === 'robot' ? `ROBOTS · ${robots.length}` : `CLUB · ${dMeters}m`;
    ctx.fillText(targetLabel, cx, cy + 38);
    ctx.restore();
}

function drawHUD() {
    if (state === 'menu') return;
    const W = window.innerWidth;
    ctx.save();
    ctx.font = 'bold 20px Courier New'; ctx.textAlign = 'left';
    ctx.fillStyle = timeLeft < 20 ? '#ff6b6b' : '#00f5ff';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
    ctx.fillText(`TIME ${Math.max(0, Math.ceil(timeLeft)).toString().padStart(3,'0')}`, 24, 36);
    ctx.fillStyle = '#00f5ff'; ctx.shadowColor = '#00f5ff';
    ctx.fillText(`SCORE ${Math.floor(player.score)}`, 24, 64);
    ctx.fillStyle = '#ffd166'; ctx.shadowColor = '#ffd166';
    ctx.fillText(`COINS ${coins}`, 24, 92);
    ctx.shadowBlur = 0;
    const maxHp = playerWeapons.armor2 ? 200 : playerWeapons.armor ? 150 : 100;
    const boostMax = playerWeapons.nitro3 ? 300 : playerWeapons.nitro2 ? 200 : 100;
    drawBar(24, 112, 220, 16, player.hp/maxHp, player.hp/maxHp > 0.5 ? '#ff2bd6' : player.hp/maxHp > 0.25 ? '#ffd166' : '#ff4444', 'HP');
    drawBar(24, 136, 220, 16, player.boost/boostMax, '#00f5ff', 'BOOST');
    if (combo >= 2) {
        ctx.font = 'bold 14px Courier New'; ctx.fillStyle = '#ff9900'; ctx.shadowColor = '#ff9900'; ctx.shadowBlur = 10;
        ctx.fillText(`COMBO ×${comboMultiplier}`, 24, 168); ctx.shadowBlur = 0;
    }
    ctx.font = 'bold 11px Courier New'; ctx.fillStyle = 'rgba(0,245,255,0.7)'; ctx.textAlign = 'left';
    ctx.fillText(`${Math.floor(Math.abs(player.speed))} km/h`, 24, 188);
    if (currentLevelConfig) {
        ctx.fillStyle = '#ffd166'; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 6;
        ctx.fillText(`LEVEL ${currentLevelConfig.id} · ${currentLevelConfig.name}`, 24, 210);
        ctx.shadowBlur = 0;
    }
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(0,245,255,0.45)'; ctx.font = '11px Courier New';
    const musicHint = audio.muted ? ' N=MUSIC:OFF' : ' N=MUSIC:ON';
    const fireHint = (currentLevelConfig && (currentLevelConfig.hasBoss || currentLevelConfig.type === 'robot')) ? '  F=FIRE' : '';
    ctx.fillText(`TAB=ROUTE  M=MAP  R=RESTART  ESC=MENU  SPACE=PAUSE${fireHint}${musicHint}`, W - 28, 36);
    if (currentLevelConfig && (currentLevelConfig.hasBoss || currentLevelConfig.type === 'robot')) {
        ctx.textAlign = 'left'; ctx.font = 'bold 12px Courier New';
        const hasAnyWeapon = playerWeapons.gun || playerWeapons.shotgun || playerWeapons.missile;
        const activeOk = hasAnyWeapon && playerWeapons[activeWeapon];
        const weaponLabel = activeWeapon === 'missile' && playerWeapons.missile ? '🚀 РАКЕТНИЦА' : activeWeapon === 'shotgun' && playerWeapons.shotgun ? '💥 ДРОБОВИК' : activeWeapon === 'gun' && playerWeapons.gun ? '🔫 ПУШКА' : '⚠ НЕТ ОРУЖИЯ';
        const cdMax = activeWeapon === 'missile' ? 1.8 : activeWeapon === 'shotgun' ? 0.8 : 0.38;
        const cdVal = activeWeapon === 'missile' ? (player._missileCooldown||0) : activeWeapon === 'shotgun' ? (player._shotgunCooldown||0) : (player._gunCooldown||0);
        const onCooldown = cdVal > 0;
        ctx.fillStyle = activeOk ? (onCooldown ? '#ffd166' : '#3cff7e') : '#ff2bd6';
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
        ctx.fillText(weaponLabel + (activeOk ? (onCooldown ? ' · COOLDOWN' : ' · READY') : '') + '  [1/2/3]', 24, 232);
        ctx.shadowBlur = 0;
        if (activeOk && onCooldown) drawBar(24, 238, 120, 8, 1 - cdVal/cdMax, '#ff9900', '');
    }
    if (levelBadge) levelBadge.textContent = `LEVEL ${currentLevelConfig?.id} · ${currentLevelConfig?.name} · COINS ${coins}`;
    ctx.restore();
}

function drawBar(x, y, w, h, value, color, label) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.fillRect(x, y, w * clamp(value, 0, 1), h); ctx.shadowBlur = 0;
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Courier New';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w/2, y + h/2 + 1);
    ctx.restore();
}

function drawMinimap() {
    if (state !== 'playing') return;
    const mW = Math.min(340, Math.max(280, window.innerWidth * 0.22));
    const mH = Math.min(230, Math.max(190, window.innerHeight * 0.22));
    const mx = window.innerWidth - mW - 24;
    const my = window.innerHeight - mH - 24;
    const sx = mW / WORLD.width, sy = mH / WORLD.height;
    ctx.save();
    ctx.fillStyle = 'rgba(4,0,12,0.82)'; ctx.fillRect(mx, my, mW, mH);
    ctx.strokeStyle = '#00f5ff'; ctx.lineWidth = 2;
    ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 8;
    ctx.strokeRect(mx, my, mW, mH); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,43,214,0.38)';
    for (const r of roads) ctx.fillRect(mx+r.x*sx, my+r.y*sy, r.w*sx, r.h*sy);
    ctx.fillStyle = '#ffd166';
    for (const b of barricades) ctx.fillRect(mx+(b.x-b.w/2)*sx, my+(b.y-b.h/2)*sy, Math.max(2,b.w*sx), Math.max(2,b.h*sy));
    if (recommendedRouteVisible && (gpsRoutePoints.length > 1 || routeBeacons.length > 1)) {
        const pts = gpsRoutePoints.length > 1 ? gpsRoutePoints : routeBeacons;
        ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(mx+pts[0].x*sx, my+pts[0].y*sy);
        for (let i=1; i<pts.length; i++) ctx.lineTo(mx+pts[i].x*sx, my+pts[i].y*sy);
        ctx.stroke();
    }
    ctx.fillStyle = '#00f5ff'; ctx.fillRect(mx+dest.x*sx, my+dest.y*sy, dest.w*sx, dest.h*sy);
    if (shopZone) { ctx.fillStyle = '#ffd166'; ctx.fillRect(mx+shopZone.x*sx, my+shopZone.y*sy, Math.max(3,shopZone.w*sx), Math.max(3,shopZone.h*sy)); }
    // Radar: show larger detection circles around drones
    if (playerWeapons.radar) {
        for (const d of drones) {
            ctx.strokeStyle = 'rgba(255,43,214,0.3)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(mx+d.x*sx, my+d.y*sy, 14, 0, Math.PI*2); ctx.stroke();
        }
    }
    ctx.fillStyle = '#ff2bd6';
    for (const d of drones) ctx.fillRect(mx+d.x*sx-2, my+d.y*sy-2, 4, 4);
    ctx.fillStyle = '#ffd166';
    for (const r of robots) ctx.fillRect(mx+r.x*sx-3, my+r.y*sy-3, 6, 6);
    if (boss && !boss.dead) {
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10; ctx.fillStyle = '#ff0000';
        ctx.beginPath(); ctx.arc(mx+boss.x*sx, my+boss.y*sy, 7, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 6px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('P', mx+boss.x*sx, my+boss.y*sy+2); ctx.shadowBlur = 0;
    }
    ctx.fillStyle = '#ffd166'; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 6;
    ctx.fillRect(mx+player.x*sx-3, my+player.y*sy-3, 6, 6); ctx.shadowBlur = 0;
    ctx.font = 'bold 10px Courier New'; ctx.fillStyle = '#00f5ff'; ctx.textAlign = 'left';
    ctx.fillText('MINIMAP [M]', mx+7, my+14);
    ctx.restore();
}

function drawFloatingTexts() {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const ft of floatingTexts) {
        ctx.globalAlpha = clamp(ft.life, 0, 1);
        ctx.font = `bold ${ft.size}px Courier New`;
        ctx.fillStyle = ft.color; ctx.shadowColor = ft.color; ctx.shadowBlur = 12;
        ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.restore();
}

function drawPauseOverlay() {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.52)'; ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 48px Courier New'; ctx.fillStyle = '#00f5ff';
    ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 30;
    ctx.fillText('PAUSE', window.innerWidth/2, window.innerHeight/2);
    ctx.font = '16px Courier New'; ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.shadowBlur = 0;
    ctx.fillText('SPACE или кнопка «Продолжить» — продолжить игру', window.innerWidth/2, window.innerHeight/2+48);
    ctx.restore();
}

function drawVignette() {
    const W = window.innerWidth, H = window.innerHeight;
    const g = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.08, W/2, H/2, Math.max(W,H)*0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ── GAME LOOP ─────────────────────────────────────
function loop(ts) {
    const dt = Math.min(0.033, (ts - lastTime) / 1000 || 0);
    lastTime = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}

createWorld();
updateQuickControls();
loadProgress();
requestAnimationFrame(loop);