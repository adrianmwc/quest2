const RACE_CONFIG = {
    // ADMIN SETTINGS
    masterCode: "1854",         // Code to reset game or bypass tasks
    
    // PENALTY SETTINGS (Points deducted)
    hintPenalty: 25,            // Cost to reveal the hint (subtracted from task base pts)
    errorPenalty: 10,           // Points deducted for EVERY wrong guess
    
    accessCode: "1234",               //access code to start the race

    // LOCKOUT SETTINGS
    maxAttemptsBeforeLock: 3,   // Number of wrong guesses before they get locked out
    lockoutBaseTime: 60000      // 60 seconds for the first lockout (in milliseconds) // 1 minute in milliseconds

};

// ====== ADD THIS CONFIGURATION TO THE TOP OF YOUR SCRIPT FILE ======
//maps the categories to specific colors.
const CATEGORY_COLORS = {
    "Physical": "#e74c3c",   // Red
    "Mental": "#3498db",     // Blue
    "Creative": "#f1c40f",   // Yellow
    "Mystery": "#9b59b6",    // Purple
    "Default": "#2ecc71"     // Green (fallback if empty or unmatched)
};
// ==================================================================