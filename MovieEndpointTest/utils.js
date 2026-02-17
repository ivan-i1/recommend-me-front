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

const genres = ["Action", "Comedy", "Drama", "Fantasy", "Horror", "Sci-Fi", "Thriller", "Western"];

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
    // "Posters/01.png", "Posters/02.png", "Posters/03.png", "Posters/04.png",
    // "Posters/05.png", "Posters/06.png", "Posters/07.png", "Posters/08.png",
    // "Posters/09.png", "Posters/10.png", "Posters/11.png", "Posters/12.png",
    // "Posters/13.png", "Posters/14.png", "Posters/15.png", "Posters/16.png",
    // "Posters/17.png", "Posters/18.png", "Posters/19.png", "Posters/20.png"
];

// --- Helpers ---

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const createSingleDataPoint = (dFirst, dLast, aFirst, aLast) => {
    const movieTitle = `movie ${String(movieCounter).padStart(3, '0')}`;
    movieCounter++;

    return {
        id: `uid_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: movieTitle,
        year: getRandomInt(1950, 2025),
        genre: getRandomElement(genres),
        image: `${getRandomElement(localImages)}`,
        director: `${dFirst} ${dLast}`,
        mainActor: `${aFirst} ${aLast}`
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
    getDbSize
};