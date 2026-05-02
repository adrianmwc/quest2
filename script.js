// --- 1. PLACE IT HERE (TOP OF FILE) ---
let refreshing = false;
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload(); 
    });
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
        // Check if assets are already cached
        if (reg.active) {
            updateAssetStatus("READY");
        }

        reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            updateAssetStatus("CACHING...");
            
            installingWorker.onstatechange = () => {
                if (installingWorker.state === 'activated') {
                    updateAssetStatus("READY");
                }
            };
        });
    });
}

let db;
let teamName = localStorage.getItem('teamName') || "";
let startTime = localStorage.getItem('startTime') || null;
let teamMembers = JSON.parse(localStorage.getItem('teamMembers')) || [];
let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];
let hintsUsed = JSON.parse(localStorage.getItem('hintsUsed')) || [];
let attempts = JSON.parse(localStorage.getItem('attempts')) || {};
let lockouts = JSON.parse(localStorage.getItem('lockouts')) || {};
let lockoutCounts = JSON.parse(localStorage.getItem('lockoutCounts')) || {};
let taskCompletionTimes = JSON.parse(localStorage.getItem('taskCompletionTimes')) || {};
let currentTask = null;
let lockoutTimerInterval;
let timerInterval = null;
let sessionStart = 0; // Tracks the moment a task modal is opened

// --- DATABASE ---
const req = indexedDB.open("RacePhotoLog", 1);

// This runs if the DB needs to be created or version updated
req.onupgradeneeded = e => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("photos")) {
        db.createObjectStore("photos", { keyPath: "taskId" });
    }
};

// --- THE FIX: ADD THIS FOR THE INDICATOR ---
req.onsuccess = e => {
    db = e.target.result;
    console.log("IndexedDB: Photos Database Connected.");
    
    const photoInd = document.getElementById('photoDB-indicator');
    if (photoInd) {
        photoInd.innerText = "PHOTOS: LOCAL STORAGE READY";
        photoInd.style.background = "#27ae60"; // Turn Green
    }
    
    // Check if other systems are ready to enable the Start button
    if (typeof runSystemCheck === "function") runSystemCheck();
};

req.onerror = e => {
    console.error("IndexedDB Error:", e.target.error);
    const photoInd = document.getElementById('photoDB-indicator');
    if (photoInd) {
        photoInd.innerText = "PHOTOS: DATABASE ERROR";
        photoInd.style.background = "#e74c3c"; // Turn Red
    }
};

function showWelcomeScreen() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('welcome-screen').classList.add('active');
}

function generateMemberInputs() {
    const count = document.getElementById('member-count').value;
    const container = document.getElementById('member-inputs-container');
    container.innerHTML = "";
    for (let i = 1; i <= count; i++) {
        container.innerHTML += `
            <div style="display:flex; gap:10px;">
                <input type="text" class="input-name" placeholder="Member ${i} Name">
                <input type="text" class="input-class" placeholder="Class" style="width:100px;">
            </div>`;
    }
}

function startRace() {
    //1. Check input for team name, members name
    checkTeamMembers();

    //2. get the input values
    const name = document.getElementById('team-name-input').value.trim();
    const memberEntries = document.querySelectorAll('#member-inputs-container > div');

    teamMembers = Array.from(memberEntries).map(entry => ({
        name: entry.querySelector('.input-name').value.trim(),
        class: entry.querySelector('.input-class').value.trim()
    }));

    teamName = name;
    localStorage.setItem('teamName', teamName);
    localStorage.setItem('teamMembers', JSON.stringify(teamMembers));
    
    // 4. START THE CLOCK
    startTime = Date.now().toString();
    localStorage.setItem('startTime', startTime);
    startGlobalTimer();
    
    // 5. Build the task list
    renderHub();
}

function checkTeamMembers() {
    // 1. Check Team Name
    const teamName = document.getElementById('team-name-input').value.trim();
    if (!teamName) {
        alert("⚠️ MISSION ERROR: Team Name is required.");
        return;
    }

    // 2. Check if a number of racers was selected
    const count = parseInt(document.getElementById('member-count').value);
    if (count === 0) {
        alert("⚠️ MISSION ERROR: Please select the number of racers.");
        return;
    }

    // 3. Check if all generated member inputs are filled
    const memberInputs = document.querySelectorAll('.member-name-input');
    let allNamesFilled = true;
    let names = [];

    memberInputs.forEach((input, index) => {
        const name = input.value.trim();
        if (!name) {
            allNamesFilled = false;
        } else {
            names.push(name);
        }
    });

    if (!allNamesFilled) {
        alert("⚠️ MISSION ERROR: Please enter names for all selected racers.");
        return;
    }

    // 4. Success! Now proceed to Access Code
    const accessCode = prompt("ENTER MISSION ACCESS CODE:");
    if (accessCode === RACE_CONFIG.accessCode) {
    } else if (accessCode !== null) { // Don't alert if they hit 'Cancel'
        alert("ACCESS DENIED: Invalid Mission Code.");
    }
}

function renderHub() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('hub-screen').classList.add('active');
    document.getElementById('display-team-name').innerText = teamName;
    
    const memDiv = document.getElementById('display-team-members');
    memDiv.innerHTML = "";
    teamMembers.forEach(m => {
        memDiv.innerHTML += `<div class="member-pill">${m.name} <span>${m.class}</span></div>`;
    });

    const list = document.getElementById('task-list');
    list.innerHTML = "";
    let score = 0;

    allTasks.forEach(t => {
        const isDone = completedTasks.includes(t.id);
        if (isDone) {
            let s = t.pts - (hintsUsed.includes(t.id) ? RACE_CONFIG.hintPenalty : 0);
            s -= ((attempts[t.id] || 0) * RACE_CONFIG.errorPenalty);
            score += Math.max(0, s);
        }
        list.innerHTML += `
            <button class="task-card ${isDone ? 'completed' : ''}" onclick="openTask('${t.id}')">
                <span>${t.title}</span>
                <span style="font-weight:bold;">${isDone ? '✅ DONE' : t.pts + ' points'}</span>
            </button>`;
    });

    document.getElementById('hub-score').innerText = `Score: ${score}`;
    const p = Math.round((completedTasks.length / allTasks.length) * 100);
    document.getElementById('progress-bar').style.width = p + "%";
    document.getElementById('progress-bar').innerText = p + "%";
    
    if (completedTasks.length === allTasks.length) document.getElementById('finish-btn').style.display = 'block';
    startGlobalTimer();
}

function openTask(id) {
    if (completedTasks.includes(id)) return;
    
    currentTask = allTasks.find(t => t.id === id);
    
    // START the session timer
    sessionStart = Date.now();

    // 1. Reset Inputs
    document.getElementById('passcode-input').value = ""; // Clears the text field
    
    // 2. Reset Photo Preview
    document.getElementById('task-photo-preview').src = ""; // Clears the image
    document.getElementById('photo-preview-container').style.display = 'none'; // Hides the container
    
    // 3. Reset File Input (Important for iPad so they can take a new photo)
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = ""; 

    // 4. Update Content
    document.getElementById('modal-title').innerText = currentTask.title;
    document.getElementById('modal-desc').innerText = currentTask.desc;
    document.getElementById('modal-image').src = "images/" + currentTask.img;
    
    // 5. Show Modal and Check Lockout
    // Ensure the modal starts at the top so the X is visible
    document.querySelector('.modal-content').scrollTop = 0;
    document.getElementById('task-modal').style.display = 'block';

    // 6. Reset photo button
    const photoBtn = document.querySelector('.photo-upload-btn');
    photoBtn.classList.remove('has-photo');
    photoBtn.innerText = "📷 Take a Team Photo at this location";
    photoBtn.style.borderColor = "#555";
    photoBtn.style.color = "white";

    document.getElementById('task-modal').style.display = 'block';
    checkLockout();
}

function previewPhoto(event) {
    const file = event.target.files[0];
    if (!file) return; // User cancelled

    if (!db) {
        alert("System still initializing... please wait 2 seconds.");
        return;
    }

    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // iPad optimization: resize large photos to save memory
            const maxW = 1024;
            const scale = maxW / img.width;
            canvas.width = maxW;
            canvas.height = img.height * scale;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Watermark logic
            const fs = Math.floor(canvas.width / 25);
            ctx.font = `bold ${fs}px sans-serif`;
            ctx.fillStyle = "yellow";
            ctx.shadowBlur = 10; ctx.shadowColor = "black";
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
            ctx.fillText(`${teamName.toUpperCase()} | ${dateStr} | ${timeStr}`, fs, canvas.height - fs);
            
            const data = canvas.toDataURL('image/jpeg', 0.7);
            
            // UI Updates
            document.getElementById('task-photo-preview').src = data;
            document.getElementById('photo-preview-container').style.display = 'block';
            const photoBtn = document.querySelector('.photo-upload-btn');
            photoBtn.classList.add('has-photo');
            photoBtn.innerText = "✅ PHOTO CAPTURED";

            // Save to IndexedDB
            const transaction = db.transaction(["photos"], "readwrite");
            const store = transaction.objectStore("photos");
            store.put({ taskId: currentTask.id, data: data });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // At the very end of previewPhoto(event) logic
    event.target.value = ''; // Clears the input so the next click always triggers a change
}

async function submitPasscode() {

    console.log("Checking photo for task:", currentTask.id);
    //req.onsuccess = () => {console.log("Photo found in DB:", req.result);

    // 1. Check for Photo Evidence first
    const photoStore = db.transaction(["photos"], "readonly").objectStore("photos");
    const photoExists = await new Promise(res => {
        const req = photoStore.get(currentTask.id);
        req.onsuccess = () => res(req.result ? true : false);
    });

    if (!photoExists) {
        alert("⚠️ MISSION INCOMPLETE: You must capture photo evidence before submitting the code!");
        // Visual feedback: highlight the photo button
        const photoBtn = document.querySelector('.photo-upload-btn');
        photoBtn.style.borderColor = "var(--error-red)";
        photoBtn.style.color = "var(--error-red)";
        return; // Stop the function here
    }

    // 2. If photo exists, proceed with Passcode Check
    const val = document.getElementById('passcode-input').value.trim().toUpperCase();
    
    if(val === currentTask.code.toUpperCase()) {
        // 1. Capture the very last session time
        const finalSession = Math.floor((Date.now() - sessionStart) / 1000);
        taskCompletionTimes[currentTask.id] = (taskCompletionTimes[currentTask.id] || 0) + finalSession;
        localStorage.setItem('taskCompletionTimes', JSON.stringify(taskCompletionTimes));
        
        // 2. Mark as completed
        completedTasks.push(currentTask.id);
        localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
        
        // 3. Prevent closeModal from double-counting
        sessionStart = Date.now();

        // Cleanup for next task
        document.getElementById('passcode-input').value = "";
        document.getElementById('task-photo-preview').src = "";
        
        closeModal(); 
        renderHub();
    } else {
        // Wrong Code Logic...
        attempts[currentTask.id] = (attempts[currentTask.id]||0)+1;
        localStorage.setItem('attempts', JSON.stringify(attempts));
        
        if(attempts[currentTask.id] >= RACE_CONFIG.maxAttemptsBeforeLock) {
            lockoutCounts[currentTask.id] = (lockoutCounts[currentTask.id]||0)+1;
            lockouts[currentTask.id] = Date.now() + (RACE_CONFIG.lockoutBaseTime * lockoutCounts[currentTask.id]);
            localStorage.setItem('lockouts', JSON.stringify(lockouts));
            checkLockout();
        } else { 
            alert("WRONG CODE! " + attempts[currentTask.id] + " attempt(s)."); 
        }
    }
}

function checkLockout() {
    clearInterval(lockoutTimerInterval);
    const until = lockouts[currentTask.id];
    if(until && Date.now() < until) {
        document.getElementById('input-section').style.display='none';
        document.getElementById('lockout-section').style.display='block';
        lockoutTimerInterval = setInterval(() => {
            let left = Math.ceil((until - Date.now())/1000);
            if(left<=0) { clearInterval(lockoutTimerInterval); checkLockout(); }
            document.getElementById('timer-display').innerText = left + "s";
        }, 1000);
    } else {
        document.getElementById('input-section').style.display='block';
        document.getElementById('lockout-section').style.display='none';
    }
}

function closeModal() {
    // If a task was being viewed, calculate time spent and add to the total
    if (currentTask && !completedTasks.includes(currentTask.id)) {
        const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
        
        // Add elapsed seconds to the specific task's bucket
        taskCompletionTimes[currentTask.id] = (taskCompletionTimes[currentTask.id] || 0) + elapsed;
        
        // Save to local storage immediately
        localStorage.setItem('taskCompletionTimes', JSON.stringify(taskCompletionTimes));
    }

    document.getElementById('task-modal').style.display='none'; 
    clearInterval(lockoutTimerInterval); 
}

async function showPitStop() {
    // 1. Stop all timers
    
    // --- THE FIX: STOP THE CLOCK ---
    if (window.timerInterval) {
        clearInterval(window.timerInterval); //gobal timer variable
        clearInterval(timerInterval); //local timer variable
        console.log("Race Clock Frozen.");
    }
    // -------------------------------
    if(lockoutTimerInterval) clearInterval(lockoutTimerInterval);

    // 2. Switch screen visibility
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('pit-stop-screen').classList.add('active');
    
    // 3. Team Details
    document.getElementById('final-team-name').innerText = teamName;
    const finalMem = document.getElementById('final-member-list');
    finalMem.innerHTML = teamMembers.map(m => `<div class="member-pill">${m.name} <span>${m.class}</span></div>`).join("");

    // 4. Time Snapshot (Capture current text from Hub timer)
    const timeSnapshot = document.getElementById('hub-timer').innerText;
    document.getElementById('final-time-results').innerText = timeSnapshot;
    // Update the hidden div that the PDF generator uses
    document.getElementById('final-time-display').innerText = timeSnapshot;

    // 5. Calculate Score and Audit Penalties
    let photoData = {};
    const photos = await new Promise(res => {
        db.transaction(["photos"],"readonly").objectStore("photos").getAll().onsuccess = e => res(e.target.result);
    });
    photos.forEach(p => photoData[p.taskId] = p.data);

    let totalScore = 0;
    let totalHintPenalty = 0;
    let totalErrorPenalty = 0;
    let html = "";

    allTasks.forEach(t => {
        const isDone = completedTasks.includes(t.id);
        const h = hintsUsed.includes(t.id) ? (RACE_CONFIG.hintPenalty || 0) : 0;
        const e = (attempts[t.id] || 0) * (RACE_CONFIG.errorPenalty || 0);
        const finalTaskScore = isDone ? Math.max(0, t.pts - h - e) : 0;
        
        if(isDone) {
            totalScore += finalTaskScore;
            totalHintPenalty += h;
            totalErrorPenalty += e;
        }

        //time taken for each task
        const totalSecs = taskCompletionTimes[t.id] || 0;
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        const timeString = `${m}m ${s}s`;

          // Determine visual markers
        const statusClass = isDone ? "status-completed" : "status-incomplete";
        const statusText = isDone ? "COMPLETED" : "NOT FINISHED";
        const statusColor = isDone ? '#27ae60' : '#ff4d4d'; // Green vs Red

        // 3. DEBUG: Check the console on your iPad/Laptop to see the truth
        console.log(`Task ${t.id} - isDone: ${isDone} - class: ${statusClass}`);

        html += `
            <div class="task-card ${statusClass}" style="flex-direction:column; align-items:flex-start; margin-bottom: 15px;">
                <div style="font-weight:bold; margin-bottom:10px; width:100%; display:flex; justify-content:space-between;">
                    <span>${t.title}</span>
                    <span class="status-label" style="background:${statusColor}; color:white;">${statusText}</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: baseline; width: 100%;">
                    <span style="font-size: 0.9rem; color: #bbb;">
                        Base: ${t.pts} | Hints: -${h} | Errors: -${e}
                    </span>
                    <span style="color: var(--gold); font-weight: 800; font-size: 1.1rem; margin-left: 10px;">
                        ${finalTaskScore} points
                    </span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: baseline; width: 100%;">
                    Time Spent: ${timeString} <p>
                </div>

                 ${photoData[t.id] ? 
                    `<img src="${photoData[t.id]}" style="width:100%; border-radius:8px; margin-bottom:10px; border:1px solid #444;">` : 
                    (isDone ? '<div style="color:#888; font-size:0.8rem; margin-bottom:10px;">(No photo evidence provided)</div>' : '')
                }               
  
            </div>`;      

    });

    // 6. Inject Final Totals
    document.getElementById('final-total-points').innerText = totalScore;
    document.getElementById('penalty-hints').innerText = `-${totalHintPenalty}`;
    document.getElementById('penalty-lockouts').innerText = `-${totalErrorPenalty}`;
    document.getElementById('station-breakdown').innerHTML = html;
}

async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Safety check: Is teamName valid?
    const safeTeamName = (teamName || "Team").replace(/\s+/g, '_');

    try {
        // --- 1. CALCULATE TOTAL ---
        let grandTotal = 0;
        let totalHintPenalties = 0;  // NEW: Track total hint points lost
        let totalErrorPenalties = 0; // NEW: Track total error points lost

        allTasks.forEach(t => {
            if (completedTasks.includes(t.id)) {
                const h = hintsUsed.includes(t.id) ? (RACE_CONFIG.hintPenalty || 0) : 0;
                const e = (attempts[t.id] || 0) * (RACE_CONFIG.errorPenalty || 0);

                // Add to the Grand Totals
                totalHintPenalties += h;
                totalErrorPenalties += e;

                grandTotal += Math.max(0, t.pts - h - e);
            }
        });

        // --- 2. HEADER ---
        //doc.setFillColor(30, 30, 30);
        doc.setFillColor(211, 211, 211);
        doc.rect(0, 0, 210, 45, 'F');
        //doc.setTextColor(255, 222, 0); 
        doc.setTextColor(40);
        doc.setFontSize(22);
        doc.text("OFFICIAL MISSION REPORT", 20, 20);
        doc.setFontSize(14);
        doc.text(`TOTAL SCORE: ${grandTotal} points`, 20, 32);
        const timeVal = document.getElementById('final-time-display')?.innerText || "00:00";
        doc.text(`FINAL TIME: ${timeVal}`, 140, 32);

        doc.setFontSize(8);
        const potentialScore = grandTotal + totalHintPenalties + totalErrorPenalties;
        doc.setTextColor(0, 0, 150); // Reddish text for penalties
        doc.text(`Potential Score: ${potentialScore} points`, 20, 38);
        // In your UI:
        doc.text(`Efficiency: ${((grandTotal / potentialScore) * 100).toFixed(1)}%`, 20, 42);

        doc.setTextColor(150, 0, 0); // Reddish text for penalties
        doc.text(`Hint Deductions: -${totalHintPenalties} points`, 140, 38);
        doc.text(`Lockout/Error Penalties: -${totalErrorPenalties} points`, 140, 42);

        // --- 3. TEAM INFO ---
        doc.setTextColor(40);
        let y = 55;
        doc.setFont(undefined, 'bold');
        doc.text(`TEAM: ${teamName.toUpperCase()}`, 20, y);
        y += 7;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        const roster = teamMembers.map(m => `${m.name} (${m.class})`).join(", ");
        doc.text(`ROSTER: ${roster}`, 20, y);

        // --- 4. PHOTO DATA ---
        let photoData = {};
        const photos = await new Promise(res => {
            const tx = db.transaction(["photos"], "readonly");
            tx.objectStore("photos").getAll().onsuccess = e => res(e.target.result);
        });
        photos.forEach(p => photoData[p.taskId] = p.data);

        // --- 5. MISSION ROWS ---
        y += 15;
        // Headers
        doc.setFillColor(240, 240, 240);
        doc.rect(15, y, 180, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.text("MISSION", 20, y + 5);
        doc.text("PHOTO EVIDENCE", 65, y + 5);
        doc.text("BREAKDOWN", 130, y + 5);
        doc.text("TOTAL", 175, y + 5);
        y += 8;

        for (let t of allTasks) {
            const isDone = completedTasks.includes(t.id);
            const h = hintsUsed.includes(t.id) ? RACE_CONFIG.hintPenalty : 0;
            const e = (attempts[t.id] || 0) * RACE_CONFIG.errorPenalty;
            const score = isDone ? Math.max(0, t.pts - h - e) : 0;

            doc.setDrawColor(220);
            doc.line(15, y + 42, 195, y + 42);

            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(t.title, 20, y + 15);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            if (isDone) doc.setTextColor(46, 204, 113); else doc.setTextColor(231, 76, 60);
            doc.text(isDone ? "COMPLETED" : "INCOMPLETE", 20, y + 20);

            //time taken for each tasks
            const totalSecs = taskCompletionTimes[t.id] || 0;
            const timeString = `${Math.floor(totalSecs / 60)}m ${totalSecs % 60}s`;
            doc.setFontSize(8);
            doc.text(`Active Time: ${timeString}`, 20, y + 25);

            doc.setTextColor(40);

            if (photoData[t.id]) {
                try {
                    doc.addImage(photoData[t.id], 'JPEG', 65, y + 2, 50, 35);
                } catch (err) {
                    doc.text("[Image Error]", 65, y + 15);
                }
            } else {
                doc.setFont(undefined, 'italic');
                doc.text("NO PHOTO EVIDENCE", 65, y + 15);
                doc.setFont(undefined, 'normal');
            }

            doc.setFontSize(9);
            doc.text(`Base: ${t.pts}`, 130, y + 12);
            doc.text(`Hints: -${h}`, 130, y + 17);
            doc.text(`Errors: -${e}`, 130, y + 22);
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`${score} points`, 175, y + 17);
            
            y += 45;
            doc.setFont(undefined, 'normal');
            if (y > 230) { doc.addPage(); y = 20; }

        }

        // --- 6. FINAL SAVE / BLOB FOR IPAD ---
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        
        // This creates a temporary link and clicks it, which is the most 
        // reliable way to trigger a "Save to Files" prompt on iPad.
        const link = document.createElement('a');
        link.href = url;
        link.download = `Race_Report_${safeTeamName}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (err) {
        console.error("PDF Error:", err);
        alert("Failed to generate PDF. Make sure all photos are loaded.");
    }
}

function adminResetTrigger() {
    if(prompt("Code:") === RACE_CONFIG.masterCode) {
        localStorage.clear();
        db.transaction(["photos"],"readwrite").objectStore("photos").clear().onsuccess = () => location.reload();
    }
}

function revealHint() {
    if(confirm(`Use hint for -${RACE_CONFIG.hintPenalty} points?`)) {
        alert(currentTask.hint);
        if(!hintsUsed.includes(currentTask.id)) {
            hintsUsed.push(currentTask.id);
            localStorage.setItem('hintsUsed', JSON.stringify(hintsUsed));
        }
    }
}

function startGlobalTimer() {
    // 1. Consistency Check: Use the existing variable name 'startTime'
    let savedStart = localStorage.getItem('startTime');
    
    if (!savedStart) {
        // If no start time exists, set it now
        startTime = Date.now();
        localStorage.setItem('startTime', startTime);
    } else {
        // Parse the existing one
        startTime = parseInt(savedStart);
    }

    // 2. Clear any existing intervals to prevent double-speed ticking
    if (window.timerInterval) clearInterval(window.timerInterval);

    window.timerInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        
        // Prevent negative numbers during system lag
        if (elapsed < 0) return;

        // Calculate H : M : S
        const h = Math.floor(elapsed / 3600000);
        const m = Math.floor((elapsed % 3600000) / 60000);
        const s = Math.floor((elapsed % 60000) / 1000);

        // 3. Update the UI
        // We look for the ID 'hub-timer' used in your HTML
        const timerDisplay = document.getElementById('hub-timer');
        if (timerDisplay) {
            const timeString = `${h >= 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            timerDisplay.innerText = timeString;
            
            // 4. Update the hidden field for the PDF and Pit Stop screen
            const finalDisplay = document.getElementById('final-time-display');
            if (finalDisplay) finalDisplay.innerText = timeString;

            const finalResults = document.getElementById('final-time-results');
            if (finalResults) finalResults.innerText = timeString;
        }
    }, 1000);
}

function resumeRace() {
    console.log("Returning to Hub...");

    // 1. Switch Screen Visibility
    const pitStop = document.getElementById('pit-stop-screen');
    const hub = document.getElementById('hub-screen');

    if (pitStop && hub) {
        pitStop.classList.remove('active');
        hub.classList.add('active');
    }

    // 2. Restart the live ticking timer
    // This ensures the clock resumes from where it should be
    if (typeof startGlobalTimer === "function") {
        startGlobalTimer();
    }

    // 3. Refresh the Hub (Progress bar, task states, etc.)
    if (typeof renderHub === "function") {
        renderHub();
    }
}

function checkNetworkStatus() {
    const offlineInd = document.getElementById('offline-indicator');
    if (!offlineInd) return;

    if (navigator.onLine) {
        offlineInd.innerText = "LINK: ONLINE";
        offlineInd.style.background = "#27ae60"; // Green
    } else {
        // For an offline race, being offline is actually "Ready"
        offlineInd.innerText = "LINK: OFFLINE"; 
        offlineInd.style.background = "#e67e22"; // Orange
    }
}

// Check every time the connection changes
window.addEventListener('online', checkNetworkStatus);
window.addEventListener('offline', checkNetworkStatus);
// Initial check
checkNetworkStatus();

function updateAssetStatus(status) {
    const bar = document.getElementById('asset-status-bar');
    if (!bar) return;

    if (status === "READY") {
        bar.innerText = "ASSETS: CACHED (OFFLINE)";
        bar.style.background = "#27ae60"; // Green
        runSystemCheck(); // Allow the race to start
    } else {
        bar.innerText = "ASSETS: DOWNLOADING...";
        bar.style.background = "#f1c40f"; // Yellow
    }
}

function runSystemCheck() {
    const assetsReady = document.getElementById('asset-status-bar')?.innerText.includes("CACHED");
    const startBtn = document.getElementById('start-race-btn');
    
    if (assetsReady) {
        startBtn.disabled = false;
        startBtn.style.opacity = "1";
        document.getElementById('check-msg').innerText = "SYSTEMS SECURE. READY FOR TEAM REGISTRATION.";
    } else {
        startBtn.disabled = true;
        startBtn.style.opacity = "0.5";
    }
}