// server.js
const express = require('express');
const { generateBigStack, getPickedPair, getDbSize } = require('./utils');

const app = express();
const PORT = 3000;

app.use(express.json());
const cors = require('cors');
app.use(cors());

// --- Endpoints ---

/**
 * GET /generate-stack
 * Generates data and saves it to the "dbData" variable in utils.js
 */
app.get('/generate-stack', (req, res) => {
    let prob = parseFloat(req.query.prob);
    if (isNaN(prob)) prob = 0.001; 
    if (prob > 0.5) return res.status(400).json({ error: "Probability too high." });

    console.log(`Generating and saving stack (prob: ${prob})...`);
    
    const start = Date.now();
    const stack = generateBigStack(prob); // This updates dbData internally
    const duration = Date.now() - start;

    console.log(`DB updated. Total items: ${stack.length}. Time: ${duration}ms`);

    res.json({
        success: true,
        count: stack.length,
        generationTimeMs: duration,
        data: stack
    });
});

/**
 * GET /pair
 * Picks 2 existing items from the generated stack.
 */
app.get('/pair', (req, res) => {
    const pair = getPickedPair();

    if (!pair) {
        return res.status(404).json({
            success: false,
            message: "Not enough data. Please call /generate-stack first.",
            currentDbSize: getDbSize()
        });
    }
    console.log(`Picked a pair from DB of size ${getDbSize()}.`);
    res.json({
        success: true,
        data: pair
    });
});

/**
 * POST /stack
 */
app.post('/stack', (req, res) => {
    const stack = req.body.stack;
    if (!stack || !Array.isArray(stack)) {
        return res.status(400).json({ success: false, message: "Invalid stack" });
    }
    
    console.log(`Received stack of ${stack.length} items.`);
    res.json({ success: true, count: stack.length, message: "Stack received." });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});