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
req.onupgradeneeded = e => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", { keyPath: "taskId" });
};
req.onsuccess = e => { 
    db = e.target.result; 
    runSystemCheck();
    if(teamName && startTime) renderHub(); else showWelcomeScreen();
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
    const name = document.getElementById('team-name-input').value.trim();
    const memberEntries = document.querySelectorAll('#member-inputs-container > div');
    teamMembers = Array.from(memberEntries).map(entry => ({
        name: entry.querySelector('.input-name').value.trim(),
        class: entry.querySelector('.input-class').value.trim()
    }));

    if (!name || teamMembers.some(m => !m.name)) {
        alert("Enter Team Name and all Members!"); return;
    }

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
                <span style="font-weight:bold;">${isDone ? '✅ DONE' : t.pts + ' PTS'}</span>
            </button>`;
    });

    document.getElementById('hub-score').innerText = `Score: ${score}`;
    const p = Math.round((completedTasks.length / allTasks.length) * 100);
    document.getElementById('progress-bar').style.width = p + "%";
    document.getElementById('progress-bar').innerText = p + "%";
    
    if (completedTasks.length === allTasks.length) document.getElementById('finish-btn').style.display = 'block';
    startLiveTimer();
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
            alert("WRONG CODE!"); 
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

function startLiveTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const diff = Math.floor((Date.now() - parseInt(startTime)) / 1000);
        const m = Math.floor(diff / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        const timeStr = `${m}:${s}`;
        if(document.getElementById('hub-timer')) document.getElementById('hub-timer').innerText = timeStr;
    }, 1000);
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
    clearInterval(timerInterval);
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

        html += `
            <div class="task-card completed" style="flex-direction:column; align-items:flex-start; margin-bottom: 15px;">
                <div style="font-weight:bold; margin-bottom:10px; width:100%; display:flex; justify-content:space-between;">
                    <span>${t.title}</span>
                    <span style="color:var(--gold);">${finalTaskScore} PTS</span>
                </div>
                ${photoData[t.id] ? `<img src="${photoData[t.id]}" style="width:100%; border-radius:8px; margin-bottom:10px;">` : '<div style="color:#888; font-style:italic; margin-bottom:10px;">No photo captured</div>'}
                <div style="font-size:0.75rem; color:#bbb;">
                    Base: ${t.pts} | Hints: -${h} | Errors: -${e}
                    | Time Spent: ${timeString}
                </div>
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
        allTasks.forEach(t => {
            if (completedTasks.includes(t.id)) {
                const h = hintsUsed.includes(t.id) ? (RACE_CONFIG.hintPenalty || 0) : 0;
                const e = (attempts[t.id] || 0) * (RACE_CONFIG.errorPenalty || 0);
                grandTotal += Math.max(0, t.pts - h - e);
            }
        });

        // --- 2. HEADER ---
        doc.setFillColor(30, 30, 30);
        doc.rect(0, 0, 210, 45, 'F');
        doc.setTextColor(255, 222, 0); 
        doc.setFontSize(22);
        doc.text("OFFICIAL MISSION REPORT", 20, 20);
        doc.setFontSize(14);
        doc.text(`TOTAL SCORE: ${grandTotal} PTS`, 20, 32);
        const timeVal = document.getElementById('final-time-display')?.innerText || "00:00";
        doc.text(`FINAL TIME: ${timeVal}`, 140, 32);

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
            doc.text(`${score} PTS`, 175, y + 17);
            
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

function runSystemCheck() {
    document.getElementById('db-indicator').style.background = db ? "#27ae60" : "#e74c3c";
    document.getElementById('storage-indicator').style.background = "#27ae60";
    document.getElementById('offline-indicator').innerText = navigator.onLine ? "LINK: ONLINE" : "LINK: OFFLINE";
    document.getElementById('offline-indicator').style.background = navigator.onLine ? "#3498db" : "#f39c12";
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
    // Check if a start time already exists in storage
    let startTime = localStorage.getItem('raceStartTime');
    
    if (!startTime) {
        startTime = Date.now();
        localStorage.setItem('raceStartTime', startTime);
    } else {
        startTime = parseInt(startTime);
    }

    // Update the UI every second
    setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        
        const h = Math.floor(elapsed / 3600000);
        const m = Math.floor((elapsed % 3600000) / 60000);
        const s = Math.floor((elapsed % 60000) / 1000);

        const timerDisplay = document.querySelector('.timer-mini');
        if (timerDisplay) {
            // Formats as 00:00 or 1:00:00 if over an hour
            const timeString = `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            timerDisplay.innerText = timeString;
            
            // Also update the hidden final-time-display for the PDF
            const finalDisplay = document.getElementById('final-time-display');
            if (finalDisplay) finalDisplay.innerText = timeString;
        }
    }, 1000);
}