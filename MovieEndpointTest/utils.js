// utils.js

// --- Configuration Data ---
// This variable acts as your "Database"
let dbData = []; 

let movieCounter = 0;

const firstNames = [
    "Adam", "Beatrice", "Charles", "Diana", "Edward", "Fiona", "George",
    "Hannah", "Ian", "Julia", "Kevin", "Laura", "Michael", "Nina",
    "Oscar", "Paula", "Quinn", "Rachel", "Steve", "Tina",
    "Umberto", "Victoria", "William", "Xena", "Yusuf", "Zoe"
];

const familyNames = [
    "Anderson", "Baker", "Clark", "Davis", "Evans", "Foster", "Green",
    "Harris", "Irwin", "Jones", "King", "Lewis", "Martin", "Nelson",
    "Owens", "Parker", "Quigley", "Roberts", "Smith", "Taylor",
    "Underwood", "Vance", "White", "Xavier", "Young", "Zimmerman"
];
const genres = [
        {
            "id": 1,
            "name": "Action"
        },
        {
            "id": 2,
            "name": "Adventure"
        },
        {
            "id": 3,
            "name": "Animation"
        },
        {
            "id": 4,
            "name": "Comedy"
        },
        {
            "id": 5,
            "name": "Crime"
        },
        {
            "id": 6,
            "name": "Documentary"
        },
        {
            "id": 7,
            "name": "Drama"
        },
        {
            "id": 8,
            "name": "Family"
        },
        {
            "id": 9,
            "name": "Fantasy"
        },
        {
            "id": 10,
            "name": "History"
        },
        {
            "id": 11,
            "name": "Horror"
        },
        {
            "id": 12,
            "name": "Music"
        },
        {
            "id": 13,
            "name": "Mystery"
        },
        {
            "id": 14,
            "name": "Romance"
        },
        {
            "id": 15,
            "name": "Science Fiction"
        },
        {
            "id": 16,
            "name": "TV Movie"
        },
        {
            "id": 17,
            "name": "Thriller"
        },
        {
            "id": 18,
            "name": "War"
        },
        {
            "id": 19,
            "name": "Western"
        }
    ];
const genresList = genres.map(g => g.name);

const localImages = [
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/20%20the%20truman%20show.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/19%20Goodfellas.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/01%20Jaws.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/02%20Raiders%20of%20the%20Lost%20Ark.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/03%20star%20wars.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/04%20E.T.%202.jpeg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/05%20Vertigo.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/06%20Alien.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/07%20Jurassic%20Park.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/08%20The%20Silence%20of%20the%20Lambs.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/09%20American%20Beauty.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/10%20Back%20to%20the%20Future.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/11%20Chinatown.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/12%20The%20Godfather.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/13%20Airplane.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/14%20Pulp%20Fiction.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/15%20Ghostbusters.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/16%20The%20Usual%20Suspects.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/17%20the%20people%20vs%20larry%20flynt.jpg?auto=format&w=1200&q=80",
    "https://images.bauerhosting.com/legacy/empire-images/features/59e8d795405a5c6805947751/18%20Trainspotting.jpg?auto=format&w=1200&q=80",
];

// --- Helpers ---
const getGenresList = () => genresList;
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomSentence = (wordCount) => {
    wordCount = wordCount || getRandomInt(12, 60);
    const sentence = [];
    const loremIpsumParagraph = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
    const words = loremIpsumParagraph.split(' ');

    for (let i = 0; i < wordCount; i++) {
        sentence.push(getRandomElement(words));
    }
    return sentence.join(' ');
};

const createSingleDataPoint = (dFirst, dLast, aFirst, aLast) => {
    const movieTitle = `movie ${String(movieCounter).padStart(3, '0')}`;
    movieCounter++;

    return {
        id: `uid_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        id_tmdb: getRandomInt(100000, 999999),
        adult: getRandomInt(0, 1) === 1,
        original_language: "en",
        overview: getRandomSentence(),
        release_date: `${getRandomInt(1950, 2025)}-${getRandomInt(1, 12)}-${getRandomInt(1, 30)}`,
        title: movieTitle,
        director: `${dFirst} ${dLast}`,
        actors: [`${aFirst} ${aLast}`, `${getRandomElement(firstNames)} ${getRandomElement(familyNames)}`, `${getRandomElement(firstNames)} ${getRandomElement(familyNames)}`],
        vote_average: parseFloat((Math.random() * 9 + 1).toFixed(1)),
        vote_count: getRandomInt(0, 10000),
        image: `${getRandomElement(localImages)}`,
        genre: getRandomElement(genresList),
        mainActor: `${aFirst} ${aLast}`,
        vector: Array.from({ length: 128 }, () => Math.random()) // Example vector for similarity calculations
    };
};

// --- Main Logic ---

/**
 * 1. Generates the stack
 * 2. SAVES it to dbData
 * 3. Returns the new stack
 */
const generateBigStack = (probability) => {
    // Reset the DB (optional: remove this line if you want to append instead of replace)
    dbData = []; 
    
    // Loop through all 26^4 combinations
    for (let dFirst of firstNames) {
        for (let dLast of familyNames) {
            for (let aFirst of firstNames) {
                for (let aLast of familyNames) {
                    if (Math.random() < probability) {
                        dbData.push(createSingleDataPoint(dFirst, dLast, aFirst, aLast));
                    }
                }
            }
        }
    }
    return dbData;
};

/**
 * Picks 2 DISTINCT items from the existing dbData
 */
const getPickedPair = () => {
    if (dbData.length < 2) {
        return null; // Not enough data to pick a pair
    }

    // Pick first index
    let idx1 = Math.floor(Math.random() * dbData.length);
    let idx2 = Math.floor(Math.random() * dbData.length);

    // Ensure they are different
    while (idx1 === idx2) {
        idx2 = Math.floor(Math.random() * dbData.length);
    }

    return [dbData[idx1], dbData[idx2]];
};

// Getter to check DB size from server.js if needed
const getDbSize = () => dbData.length;

module.exports = {
    generateBigStack,
    getPickedPair,
    getDbSize,
    getGenresList
};