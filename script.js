// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDWMFRile3Dvx6-6KBQhjD9eq7QNT5lWpI",
    authDomain: "trip-planner-3fc16.firebaseapp.com",
    projectId: "trip-planner-3fc16",
    storageBucket: "trip-planner-3fc16.firebasestorage.app",
    messagingSenderId: "495197632213",
    appId: "1:495197632213:web:614c08e5c68b1a0116145c"
};

let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} catch (e) {
    console.warn("Firebase not configured. Using local mock data.");
}

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        currentView: 'timeline', // timeline, expenses
        currentDay: '1',
        isAdmin: false,
        expenses: [],
        editingExpenseId: null,
        rooms: {},
        itinerary: null
    };

    const PIN_CODE = '1111';
    const ADMIN_PIN_CODE = '1111';

    // DOM Elements
    const elements = {
        app: document.getElementById('app'),
        pinScreen: document.getElementById('pin-screen'),
        accessPinInput: document.getElementById('access-pin'),
        btnAccess: document.getElementById('btn-access'),
        pinError: document.getElementById('pin-error'),
        
        tabBtns: document.querySelectorAll('.tab-btn'),
        viewSections: document.querySelectorAll('.view-section'),
        dayBtns: document.querySelectorAll('.day-btn'),
        timelineContainer: document.getElementById('timeline-container'),
        
        dayTabs: document.getElementById('day-tabs'),
        tripStatusBadge: document.getElementById('trip-status-badge'),
        
        btnAdminToggle: document.getElementById('btn-admin-toggle'),
        adminModal: document.getElementById('admin-modal'),
        adminPinInput: document.getElementById('admin-pin'),
        btnAdminLogin: document.getElementById('btn-admin-login'),
        btnCancelAdmin: document.querySelector('.btn-cancel'),
        
        // Expenses
        expenseList: document.getElementById('expense-list'),
        totalExpense: document.getElementById('total-expense'),
        btnAddExpense: document.getElementById('btn-add-expense'),
        expenseModal: document.getElementById('expense-modal'),
        expenseForm: document.getElementById('expense-form'),
        btnCancelExpense: document.querySelector('.btn-cancel-expense'),

        // Theme Toggle
        btnThemeToggle: document.getElementById('btn-theme-toggle'),
        iconMoon: document.getElementById('icon-moon'),
        iconSun: document.getElementById('icon-sun'),

        // Rooms
        roomsContainer: document.getElementById('rooms-container'),
        roomModal: document.getElementById('room-modal'),
        roomForm: document.getElementById('room-form'),
        btnCancelRoom: document.querySelector('.btn-cancel-room'),

        // Custom Schedule
        btnAddSchedule: document.getElementById('btn-add-schedule'),
        scheduleModal: document.getElementById('schedule-modal'),
        scheduleForm: document.getElementById('schedule-form'),
        btnCancelSchedule: document.querySelector('.btn-cancel-schedule')
    };

    // --- Theme Control ---
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('trip_theme', theme);
        if (theme === 'dark') {
            elements.iconMoon.classList.add('hidden');
            elements.iconSun.classList.remove('hidden');
        } else {
            elements.iconMoon.classList.remove('hidden');
            elements.iconSun.classList.add('hidden');
        }
    }

    const savedTheme = localStorage.getItem('trip_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);

    elements.btnThemeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    // --- Access Control ---
    function checkAccess() {
        const hasAccess = sessionStorage.getItem('trip_access_granted') === 'true';
        if (hasAccess) {
            elements.pinScreen.classList.add('hidden');
            elements.app.classList.remove('hidden');
            renderTimeline();
        }
    }

    // Initialize 24-hour time selects
    const hourSelect = document.getElementById('schedule-time-hour');
    const minuteSelect = document.getElementById('schedule-time-minute');
    if (hourSelect && minuteSelect) {
        for (let i = 0; i < 24; i++) {
            const val = i.toString().padStart(2, '0');
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val + '시';
            hourSelect.appendChild(opt);
        }
        for (let i = 0; i < 60; i += 5) {
            const val = i.toString().padStart(2, '0');
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val + '분';
            minuteSelect.appendChild(opt);
        }
    }

    elements.btnAccess.addEventListener('click', () => {
        if (elements.accessPinInput.value === PIN_CODE) {
            sessionStorage.setItem('trip_access_granted', 'true');
            elements.pinScreen.classList.add('hidden');
            elements.app.classList.remove('hidden');
            renderTimeline();
        } else {
            elements.pinError.classList.remove('hidden');
            elements.accessPinInput.value = '';
            elements.accessPinInput.focus();
        }
    });

    // --- Navigation ---
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetView = e.target.dataset.target;
            
            // Update Tab UI
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update View
            elements.viewSections.forEach(section => section.classList.add('hidden'));
            document.getElementById(`view-${targetView}`).classList.remove('hidden');
            document.getElementById(`view-${targetView}`).classList.add('active');
            
            state.currentView = targetView;
            
            if (targetView === 'timeline') {
                renderTimeline();
                if (state.isAdmin) elements.btnAddSchedule.classList.remove('hidden');
            } else {
                elements.btnAddSchedule.classList.add('hidden');
            }
            
            if (targetView === 'map') renderMap();
            if (targetView === 'rooms') renderRooms();
            if (targetView === 'expenses') renderExpenses();
        });
    });

    // --- D-day / Status Chip ---
    function renderStatusChip() {
        const block = elements.tripStatusBadge;
        if (!block) return;
        const startDate = new Date('2026-08-14T00:00:00+09:00');
        const endDate = new Date('2026-08-16T23:59:59+09:00');
        const now = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;

        const labelEl = block.querySelector('.dday-label');
        const numberEl = block.querySelector('.dday-number');

        if (now < startDate) {
            const dDays = Math.ceil((startDate - now) / msPerDay);
            if (labelEl) labelEl.style.display = 'none';
            if (numberEl) {
                numberEl.textContent = `D-${dDays}`;
                numberEl.style.fontSize = '1.3rem';
            }
            block.className = 'trip-dday-block';
        } else if (now <= endDate) {
            const dayNum = Math.floor((now - startDate) / msPerDay) + 1;
            if (dayNum === 1) {
                if (labelEl) labelEl.style.display = 'none';
                if (numberEl) {
                    numberEl.textContent = 'D-DAY';
                    numberEl.style.fontSize = '1rem';
                }
            } else {
                if (labelEl) {
                    labelEl.style.display = 'block';
                    labelEl.textContent = `DAY ${dayNum}`;
                }
                if (numberEl) {
                    numberEl.textContent = `/ 3`;
                    numberEl.style.fontSize = '';
                }
            }
            block.className = 'trip-dday-block ongoing';
        } else {
            if (labelEl) {
                labelEl.style.display = 'block';
                labelEl.textContent = '여행';
            }
            if (numberEl) {
                numberEl.textContent = '완료';
                numberEl.style.fontSize = '';
            }
            block.className = 'trip-dday-block done';
        }
    }

    renderStatusChip();
    setInterval(renderStatusChip, 60000);

    // --- Timeline Day Tabs ---
    function renderDayTabs() {
        elements.dayTabs.innerHTML = '';
        const days = Object.keys(state.itinerary).sort((a,b) => parseInt(a) - parseInt(b));
        
        const startDate = new Date('2026-08-14T00:00:00+09:00');
        const msPerDay = 1000 * 60 * 60 * 24;
        
        if (!days.includes(state.currentDay) && days.length > 0) {
            state.currentDay = days[0];
        }

        days.forEach(day => {
            const btn = document.createElement('button');
            btn.className = `day-btn ${state.currentDay === day ? 'active' : ''}`;
            btn.dataset.day = day;
            
            const dayDate = new Date(startDate.getTime() + (parseInt(day) - 1) * msPerDay);
            const month = dayDate.getMonth() + 1;
            const date = dayDate.getDate();
            const weekday = ['일', '월', '화', '수', '목', '금', '토'][dayDate.getDay()];
            
            btn.textContent = `${month}.${date}(${weekday})`;
            
            btn.addEventListener('click', () => {
                state.currentDay = day;
                renderDayTabs();
                if (state.currentView === 'timeline') renderTimeline();
                if (state.currentView === 'map') renderMap();
                if (state.currentView === 'rooms') renderRooms();
                if (state.currentView === 'expenses') renderExpenses();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            elements.dayTabs.appendChild(btn);
        });

        if (state.isAdmin) {
            const adminControls = document.createElement('div');
            adminControls.style.display = 'flex';
            adminControls.style.gap = '4px';

            const addBtn = document.createElement('button');
            addBtn.className = 'day-btn add-day-btn';
            addBtn.textContent = '+';
            addBtn.addEventListener('click', async () => {
                const maxDay = Math.max(...days.map(d => parseInt(d)), 0);
                const nextDay = (maxDay + 1).toString();
                const newItinerary = JSON.parse(JSON.stringify(state.itinerary));
                newItinerary[nextDay] = [];
                
                if (db) {
                    try {
                        await db.collection('tripExpenses').doc('trip-2026-gangwon').set(
                            { itinerary: newItinerary }, 
                            { merge: true }
                        );
                        state.currentDay = nextDay;
                    } catch (err) {
                        console.error(err);
                        alert('추가에 실패했습니다.');
                    }
                } else {
                    state.itinerary = newItinerary;
                    localStorage.setItem('mock_itinerary', JSON.stringify(state.itinerary));
                    state.currentDay = nextDay;
                    renderDayTabs();
                    if (state.currentView === 'timeline') renderTimeline();
                    if (state.currentView === 'map') renderMap();
                    if (state.currentView === 'rooms') renderRooms();
                    if (state.currentView === 'expenses') renderExpenses();
                }
            });
            adminControls.appendChild(addBtn);

            const delBtn = document.createElement('button');
            delBtn.className = 'day-btn add-day-btn';
            delBtn.style.color = '#ff3b30';
            delBtn.textContent = '-';
            delBtn.addEventListener('click', async () => {
                const daysKeys = Object.keys(state.itinerary);
                if (daysKeys.length <= 1) {
                    alert('최소 1개의 일정은 있어야 합니다.');
                    return;
                }
                if (!confirm(`DAY ${state.currentDay} 전체 일정을 삭제하시겠습니까?`)) return;
                
                const newItinerary = JSON.parse(JSON.stringify(state.itinerary));
                delete newItinerary[state.currentDay];
                
                const sortedKeys = Object.keys(newItinerary).sort((a,b)=>parseInt(a)-parseInt(b));
                const rekeyedItinerary = {};
                sortedKeys.forEach((k, idx) => {
                    rekeyedItinerary[(idx+1).toString()] = newItinerary[k];
                });
                
                if (db) {
                    try {
                        await db.collection('tripExpenses').doc('trip-2026-gangwon').update({
                            itinerary: rekeyedItinerary
                        });
                        state.currentDay = '1';
                    } catch (err) {
                        console.error(err);
                        alert('삭제에 실패했습니다.');
                    }
                } else {
                    state.itinerary = rekeyedItinerary;
                    localStorage.setItem('mock_itinerary', JSON.stringify(state.itinerary));
                    state.currentDay = '1';
                    renderDayTabs();
                    if (state.currentView === 'timeline') renderTimeline();
                    if (state.currentView === 'map') renderMap();
                    if (state.currentView === 'rooms') renderRooms();
                    if (state.currentView === 'expenses') renderExpenses();
                }
            });
            adminControls.appendChild(delBtn);

            elements.dayTabs.appendChild(adminControls);
        }
    }

    window.deleteTimelineItem = async function(index) {
        if (!confirm('해당 일정을 삭제하시겠습니까?')) return;
        const newItinerary = JSON.parse(JSON.stringify(state.itinerary));
        newItinerary[state.currentDay].splice(index, 1);
        
        if (db) {
            try {
                await db.collection('tripExpenses').doc('trip-2026-gangwon').update({
                    itinerary: newItinerary
                });
            } catch (err) {
                console.error(err);
                alert('삭제에 실패했습니다.');
            }
        } else {
            state.itinerary = newItinerary;
            localStorage.setItem('mock_itinerary', JSON.stringify(state.itinerary));
            renderTimeline();
            if (state.currentView === 'map') renderMap();
        }
    };

    // --- Timeline Rendering ---
    const tripDates = {
        "1": "2026-08-14",
        "2": "2026-08-15",
        "3": "2026-08-16"
    };

    function renderTimeline() {
        const dayData = (state.itinerary && state.itinerary[state.currentDay]) ? state.itinerary[state.currentDay] : (itineraryData[state.currentDay] || []);
        elements.timelineContainer.innerHTML = '';
        
        const now = new Date();
        const dateStr = tripDates[state.currentDay];
        
        // Parse times and determine status
        const parsedItems = dayData.map((item, index) => {
            const [hours, minutes] = item.time.split(':');
            const itemDate = new Date(`${dateStr}T${hours}:${minutes}:00+09:00`);
            
            let endTime;
            if (index < dayData.length - 1) {
                const [nextH, nextM] = dayData[index+1].time.split(':');
                endTime = new Date(`${dateStr}T${nextH}:${nextM}:00+09:00`);
            } else {
                endTime = new Date(`${dateStr}T23:59:59+09:00`);
            }
            
            let status = 'future';
            if (now >= itemDate && now < endTime) {
                status = 'current';
            } else if (now >= endTime) {
                status = 'past';
            }
            return { ...item, status };
        });

        parsedItems.forEach(item => {
            if (item.type === 'dinner-options') {
                elements.timelineContainer.appendChild(createDinnerOptionsCard(item));
            } else {
                elements.timelineContainer.appendChild(createTimelineCard(item));
            }
        });

        // Auto-scroll to current item (delay slightly for DOM render)
        setTimeout(() => {
            const currentEl = document.querySelector('.timeline-card.current');
            if (currentEl) {
                currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    function createTimelineCard(item, itemIndex) {
        const card = document.createElement('div');
        card.className = `timeline-card glass-panel ${item.status}`;
        
        let badgeHtml = item.status === 'current' ? '<div class="current-badge">현재 진행 중</div>' : '';
        
        let adminBtn = state.isAdmin ? `
            <div style="position: absolute; top: 16px; right: 16px; display: flex; gap: 8px;">
                <button class="timeline-edit-btn" onclick="alert('일정 수정은 현재 소스 코드(data.js)에서 직접 수정해야 합니다. 추후 업데이트 예정입니다.')">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button class="timeline-edit-btn" onclick="deleteTimelineItem(${itemIndex})">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ff3b30" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        ` : '';

        card.innerHTML = `
            ${badgeHtml}
            ${adminBtn}
            <div class="card-content">
                <div class="card-time">${item.time}</div>
                <h3 class="card-title">${item.title}</h3>
                ${item.briefIntro ? `<p class="card-brief">${item.briefIntro}</p>` : ''}
                ${item.memo ? `<div class="card-memo">📝 ${item.memo}</div>` : ''}
                ${(item.title || item.location) ? `
                <div class="card-actions">
                    <a href="${item.location?.naverMap || `https://map.naver.com/v5/search/${encodeURIComponent(item.title)}`}" target="_blank" class="map-pill">
                        <div class="map-icon naver">N</div><span>네이버</span>
                    </a>
                    <a href="tmap://search?name=${encodeURIComponent(item.title)}" class="map-pill">
                        <div class="map-icon tmap">T</div><span>Tmap</span>
                    </a>
                    <a href="${item.location?.kakaoMap || `https://map.kakao.com/link/search/${encodeURIComponent(item.title)}`}" target="_blank" class="map-pill">
                        <div class="map-icon kakao">K</div><span>카카오</span>
                    </a>
                </div>
                ` : ''}
            </div>
        `;
        return card;
    }

    function createDinnerOptionsCard(item, itemIndex) {
        const card = document.createElement('div');
        card.className = `timeline-card glass-panel options-card ${item.status}`;
        
        let badgeHtml = item.status === 'current' ? '<div class="current-badge">현재 진행 중</div>' : '';
        
        let adminBtn = state.isAdmin ? `
            <div style="position: absolute; top: 16px; right: 16px; display: flex; gap: 8px;">
                <button class="timeline-edit-btn" onclick="alert('일정 수정은 현재 소스 코드(data.js)에서 직접 수정해야 합니다. 추후 업데이트 예정입니다.')">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button class="timeline-edit-btn" onclick="deleteTimelineItem(${itemIndex})">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ff3b30" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        ` : '';

        let optionsHtml = item.options.map(opt => `
            <div class="option-item">
                <h4 class="option-title">${opt.title}</h4>
                <p class="option-desc">${opt.desc}</p>
                <div class="card-actions">
                    <a href="${opt.location1?.naverMap || `https://map.naver.com/v5/search/${encodeURIComponent(opt.title)}`}" target="_blank" class="map-pill">
                        <div class="map-icon naver">N</div><span>네이버</span>
                    </a>
                    <a href="tmap://search?name=${encodeURIComponent(opt.title)}" class="map-pill">
                        <div class="map-icon tmap">T</div><span>Tmap</span>
                    </a>
                    <a href="${opt.location1?.kakaoMap || `https://map.kakao.com/link/search/${encodeURIComponent(opt.title)}`}" target="_blank" class="map-pill">
                        <div class="map-icon kakao">K</div><span>카카오</span>
                    </a>
                </div>
            </div>
        `).join('');

        card.innerHTML = `
            ${badgeHtml}
            ${adminBtn}
            <div class="card-content">
                <div class="card-time">${item.time}</div>
                <h3 class="card-title">${item.title}</h3>
                ${item.briefIntro ? `<p class="card-brief">${item.briefIntro}</p>` : ''}
                ${item.memo ? `<div class="card-memo">📝 ${item.memo}</div>` : ''}
                <div class="options-container">
                    ${optionsHtml}
                </div>
            </div>
        `;
        return card;
    }

    // --- Map Logic ---
    let map = null;
    let mapMarkers = [];
    let routeLine = null;

    function initMap() {
        if (!map) {
            map = L.map('map-container').setView([38.2045, 128.5303], 10);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(map);
        }
    }

    function renderMap() {
        if (!map) initMap();
        
        setTimeout(() => {
            map.invalidateSize();
            
            // Clear existing
            mapMarkers.forEach(m => map.removeLayer(m));
            mapMarkers = [];
            if (routeLine) map.removeLayer(routeLine);
            
            const dayData = (state.itinerary && state.itinerary[state.currentDay]) ? state.itinerary[state.currentDay] : (itineraryData[state.currentDay] || []);
            const points = [];
            
            let index = 1;
            dayData.forEach(item => {
                if (item.lat && item.lng) {
                    points.push([item.lat, item.lng]);
                    
                    const customIcon = L.divIcon({
                        className: 'custom-map-marker',
                        html: `
                            <div class="marker-badge">${index}</div>
                            <div class="marker-label">${item.time}</div>
                        `,
                        iconSize: [60, 50],
                        iconAnchor: [30, 50]
                    });

                    const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(map)
                        .bindPopup(`<b>${item.title}</b><br>${item.time}`);
                    mapMarkers.push(marker);
                    index++;
                }
            });
            
            if (points.length > 0) {
                routeLine = L.polyline(points, {color: '#007AFF', weight: 4}).addTo(map);
                map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
            }
        }, 100);
    }

    // --- Admin Mode ---
    elements.btnAdminToggle.addEventListener('click', () => {
        if (state.isAdmin) {
            // Logout
            state.isAdmin = false;
            elements.btnAdminToggle.style.color = 'var(--text-main)';
            elements.btnAddSchedule.classList.add('hidden');
            elements.adminModal.classList.add('hidden');
            elements.adminPinInput.value = '';
            renderTimeline();
            renderDayTabs();
            if (state.currentView === 'expenses') renderExpenses();
            return;
        }
        
        elements.adminModal.classList.remove('hidden');
        elements.adminPinInput.value = '';
        elements.adminPinInput.focus();
    });

    elements.btnCancelAdmin.addEventListener('click', () => {
        elements.adminModal.classList.add('hidden');
    });

    elements.btnAdminLogin.addEventListener('click', () => {
        if (elements.adminPinInput.value === ADMIN_PIN_CODE) {
            state.isAdmin = true;
            elements.adminModal.classList.add('hidden');
            elements.btnAdminToggle.style.color = 'var(--primary-color)';
            elements.btnAddSchedule.classList.remove('hidden');
            alert('관리자 모드로 전환되었습니다.');
            renderDayTabs(); // Re-render tabs to show add/delete buttons
            renderExpenses();
            renderTimeline();
            renderRooms();
        } else {
            alert('암호가 올바르지 않습니다.');
        }
    });

    // --- Expenses & Data Logic ---
    function initExpenses() {
        if (db) {
            db.collection('tripExpenses').doc('trip-2026-gangwon').onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    state.expenses = data.expenses || [];
                    state.rooms = data.rooms || {};
                    if (data.itinerary) {
                        state.itinerary = data.itinerary;
                    } else {
                        state.itinerary = itineraryData; // Fallback to data.js
                        // Seed Firebase
                        db.collection('tripExpenses').doc('trip-2026-gangwon').set({ itinerary: itineraryData }, { merge: true });
                    }
                } else {
                    state.expenses = [];
                    state.rooms = {};
                    state.itinerary = itineraryData;
                    // Seed Firebase
                    db.collection('tripExpenses').doc('trip-2026-gangwon').set({ itinerary: itineraryData, expenses: [], rooms: {} });
                }
                renderDayTabs();
                renderTimeline();
                renderExpenses();
                if (state.currentView === 'rooms') renderRooms();
                if (state.currentView === 'map') renderMap();
            }, (error) => {
                console.error("Firestore error:", error);
            });
        } else {
            // Local fallback for testing without Firebase
            const localData = localStorage.getItem('mock_expenses');
            if (localData) state.expenses = JSON.parse(localData);
            const localRooms = localStorage.getItem('mock_rooms');
            if (localRooms) state.rooms = JSON.parse(localRooms);
            const localItin = localStorage.getItem('mock_itinerary');
            if (localItin) state.itinerary = JSON.parse(localItin);
            else state.itinerary = itineraryData;
            
            renderDayTabs();
            renderTimeline();
            renderExpenses();
            if (state.currentView === 'rooms') renderRooms();
            if (state.currentView === 'map') renderMap();
        }
    }

    function switchDay(day) {
        state.currentDay = day;
        if (state.currentView === 'timeline') {
            renderTimeline();
        } else {
            renderTimeline(); // keep it synced
        }
        if (state.currentView === 'expenses') renderExpenses();
        if (state.currentView === 'rooms') renderRooms();
        if (state.currentView === 'map') renderMap();
    }

    function renderExpenses() {
        elements.expenseList.innerHTML = '';
        const day = state.currentDay;
        let dayTotal = 0;
        let overallTotal = 0;

        // Calculate overall total
        state.expenses.forEach(exp => {
            overallTotal += Number(exp.amount);
        });

        // Filter by day (backwards compatible for old ones without day)
        const filteredExpenses = state.expenses.filter(e => e.day === day || (!e.day && day === "1"));

        // Sort by timestamp descending
        const sorted = [...filteredExpenses].sort((a, b) => b.timestamp - a.timestamp);

        sorted.forEach(exp => {
            dayTotal += Number(exp.amount);
            const li = document.createElement('li');
            li.className = 'expense-item';
            li.innerHTML = `
                <div class="expense-info">
                    <div class="expense-title">${exp.category} - ${exp.memo}</div>
                    <div class="expense-meta">
                        ${exp.author ? `<span>${exp.author}</span>` : ''}
                        <span>${new Date(exp.timestamp).toLocaleDateString()} ${new Date(exp.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>
                <div class="expense-amount">₩${Number(exp.amount).toLocaleString()}</div>
                ${state.isAdmin ? `
                <div class="expense-actions">
                    <button class="expense-action-btn expense-edit-btn" data-id="${exp.id}">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button class="expense-action-btn expense-delete-btn" data-id="${exp.id}">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>` : ''}
            `;
            elements.expenseList.appendChild(li);
        });

        document.getElementById('expense-day-title').textContent = `${day}일차 경비`;
        document.getElementById('day-expense').textContent = `₩${dayTotal.toLocaleString()}`;
        document.getElementById('total-expense').textContent = `₩${overallTotal.toLocaleString()}`;

        // Bind buttons
        if (state.isAdmin) {
            document.querySelectorAll('.expense-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if(confirm('정말 삭제하시겠습니까?')) {
                        deleteExpense(e.currentTarget.dataset.id);
                    }
                });
            });
            document.querySelectorAll('.expense-edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    editExpense(e.currentTarget.dataset.id);
                });
            });
        }
    }

    elements.btnAddExpense.addEventListener('click', () => {
        state.editingExpenseId = null;
        document.getElementById('expense-modal-title').textContent = '경비 추가';
        elements.expenseForm.reset();
        elements.expenseModal.classList.remove('hidden');
    });

    elements.btnCancelExpense.addEventListener('click', () => {
        elements.expenseModal.classList.add('hidden');
        elements.expenseForm.reset();
        state.editingExpenseId = null;
    });

    function editExpense(id) {
        const exp = state.expenses.find(e => e.id === id);
        if (!exp) return;
        
        state.editingExpenseId = id;
        document.getElementById('expense-modal-title').textContent = '경비 수정';
        document.getElementById('expense-category').value = exp.category;
        document.getElementById('expense-memo').value = exp.memo;
        document.getElementById('expense-amount').value = exp.amount;
        document.getElementById('expense-author').value = exp.author;
        
        elements.expenseModal.classList.remove('hidden');
    }

    elements.expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const expenseData = {
            id: state.editingExpenseId || Date.now().toString(),
            category: document.getElementById('expense-category').value,
            memo: document.getElementById('expense-memo').value,
            amount: document.getElementById('expense-amount').value,
            author: document.getElementById('expense-author').value,
            day: state.currentDay,
            timestamp: Date.now()
        };

        if (db) {
            const docRef = db.collection('tripExpenses').doc('trip-2026-gangwon');
            docRef.get().then(doc => {
                if(doc.exists) {
                    let newExpenses = [...(doc.data().expenses || [])];
                    if (state.editingExpenseId) {
                        const index = newExpenses.findIndex(e => e.id === state.editingExpenseId);
                        if (index !== -1) {
                            // Preserve original timestamp if editing
                            expenseData.timestamp = newExpenses[index].timestamp;
                            newExpenses[index] = expenseData;
                        }
                    } else {
                        newExpenses.push(expenseData);
                    }
                    docRef.update({ expenses: newExpenses });
                } else {
                    docRef.set({ expenses: [expenseData] });
                }
            });
        } else {
            // Local fallback
            if (state.editingExpenseId) {
                const index = state.expenses.findIndex(e => e.id === state.editingExpenseId);
                if (index !== -1) {
                    expenseData.timestamp = state.expenses[index].timestamp;
                    state.expenses[index] = expenseData;
                }
            } else {
                state.expenses.push(expenseData);
            }
            localStorage.setItem('mock_expenses', JSON.stringify(state.expenses));
            renderExpenses();
        }

        elements.expenseModal.classList.add('hidden');
        elements.expenseForm.reset();
        state.editingExpenseId = null;
    });

    function deleteExpense(id) {
        if (db) {
            const newExpenses = state.expenses.filter(e => e.id !== id);
            db.collection('tripExpenses').doc('trip-2026-gangwon').update({
                expenses: newExpenses
            });
        } else {
            state.expenses = state.expenses.filter(e => e.id !== id);
            localStorage.setItem('mock_expenses', JSON.stringify(state.expenses));
            renderExpenses();
        }
    }

    // --- Rooms Logic ---
    function renderRooms() {
        elements.roomsContainer.innerHTML = '';
        const day = state.currentDay;
        
        // Only show room for days 1 and 2
        if (day === '3') {
            elements.roomsContainer.innerHTML = `<div class="glass-panel" style="padding: 24px; text-align: center; color: var(--text-muted);">집으로 돌아가는 날입니다.</div>`;
            return;
        }

        const room = state.rooms[day] || {
            name: "미정",
            type: "미정",
            roomNumber: "미정",
            entryMethod: "미정"
        };

        const card = document.createElement('div');
        card.className = 'room-card glass-panel';
        card.innerHTML = `
            <div class="room-header">
                <h3>${day}일차 숙소</h3>
                ${state.isAdmin ? `<button class="icon-btn room-edit-btn" data-day="${day}"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>` : ''}
            </div>
            <div class="room-details">
                <div class="detail-item">
                    <span class="detail-label">숙소명</span>
                    <span class="detail-value">${room.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">룸형태</span>
                    <span class="detail-value">${room.type}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">배정호실</span>
                    <span class="detail-value">${room.roomNumber}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">출입방법</span>
                    <span class="detail-value">${room.entryMethod}</span>
                </div>
            </div>
        `;
        elements.roomsContainer.appendChild(card);

        if (state.isAdmin) {
            card.querySelector('.room-edit-btn').addEventListener('click', (e) => {
                const targetDay = e.currentTarget.dataset.day;
                const r = state.rooms[targetDay] || { name: "", type: "", roomNumber: "", entryMethod: "" };
                
                document.getElementById('room-day').value = targetDay;
                document.getElementById('room-name').value = r.name;
                document.getElementById('room-type').value = r.type;
                document.getElementById('room-number').value = r.roomNumber;
                document.getElementById('room-entry').value = r.entryMethod;
                
                elements.roomModal.classList.remove('hidden');
            });
        }
    }

    elements.btnCancelRoom.addEventListener('click', () => {
        elements.roomModal.classList.add('hidden');
        elements.roomForm.reset();
    });

    elements.roomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const day = document.getElementById('room-day').value;
        const updatedRoom = {
            name: document.getElementById('room-name').value,
            type: document.getElementById('room-type').value,
            roomNumber: document.getElementById('room-number').value,
            entryMethod: document.getElementById('room-entry').value
        };

        const newRooms = { ...state.rooms, [day]: updatedRoom };

        if (db) {
            try {
                await db.collection('tripExpenses').doc('trip-2026-gangwon').set(
                    { rooms: newRooms }, 
                    { merge: true }
                );
                elements.roomModal.classList.add('hidden');
                elements.roomForm.reset();
            } catch (err) {
                console.error(err);
                alert('저장에 실패했습니다.');
            }
        } else {
            state.rooms = newRooms;
            localStorage.setItem('mock_rooms', JSON.stringify(state.rooms));
            elements.roomModal.classList.add('hidden');
            elements.roomForm.reset();
            if (state.currentView === 'rooms') renderRooms();
        }
    });

    // --- Custom Schedule Logic ---
    elements.btnAddSchedule.addEventListener('click', () => {
        elements.scheduleForm.reset();
        document.getElementById('search-results').classList.add('hidden');
        elements.scheduleModal.classList.remove('hidden');
    });

    elements.btnCancelSchedule.addEventListener('click', () => {
        elements.scheduleModal.classList.add('hidden');
    });

    elements.scheduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const latVal = document.getElementById('schedule-lat').value;
        const lngVal = document.getElementById('schedule-lng').value;
        
        const newItem = {
            time: `${document.getElementById('schedule-time-hour').value}:${document.getElementById('schedule-time-minute').value}`,
            title: document.getElementById('schedule-title').value,
            briefIntro: document.getElementById('schedule-intro').value,
            memo: document.getElementById('schedule-memo').value,
            type: document.getElementById('schedule-type').value,
        };
        
        if (latVal && lngVal) {
            newItem.lat = parseFloat(latVal);
            newItem.lng = parseFloat(lngVal);
        }

        const day = state.currentDay;
        
        // Deep clone itinerary
        const newItinerary = JSON.parse(JSON.stringify(state.itinerary));
        
        if (!newItinerary[day]) newItinerary[day] = [];
        
        newItinerary[day].push(newItem);
        newItinerary[day].sort((a, b) => a.time.localeCompare(b.time));

        if (db) {
            try {
                await db.collection('tripExpenses').doc('trip-2026-gangwon').set(
                    { itinerary: newItinerary }, 
                    { merge: true }
                );
                elements.scheduleModal.classList.add('hidden');
            } catch (err) {
                console.error(err);
                alert('저장에 실패했습니다.');
            }
        } else {
            state.itinerary = newItinerary;
            localStorage.setItem('mock_itinerary', JSON.stringify(state.itinerary));
            elements.scheduleModal.classList.add('hidden');
            renderTimeline();
            if (state.currentView === 'map') renderMap();
        }
    });
    
    // --- Map Search Logic ---
    const searchInput = document.getElementById('schedule-search');
    const btnSearchPlace = document.getElementById('btn-search-place');
    const searchResults = document.getElementById('search-results');
    const inputLat = document.getElementById('schedule-lat');
    const inputLng = document.getElementById('schedule-lng');

    btnSearchPlace.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        if (!query) return;
        
        btnSearchPlace.textContent = '검색중...';
        btnSearchPlace.disabled = true;
        searchResults.innerHTML = '';
        
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=kr`);
            const data = await res.json();
            
            if (data.length === 0) {
                searchResults.innerHTML = '<li style="color:var(--text-muted); cursor:default;">결과가 없습니다. 도로명 주소로 검색해보세요.</li>';
                searchResults.classList.remove('hidden');
            } else {
                data.forEach(place => {
                    const li = document.createElement('li');
                    li.textContent = place.display_name;
                    li.addEventListener('click', () => {
                        inputLat.value = place.lat;
                        inputLng.value = place.lon;
                        searchInput.value = place.name || place.display_name.split(',')[0];
                        
                        // Auto-fill title if empty
                        const titleInput = document.getElementById('schedule-title');
                        if (!titleInput.value) {
                            titleInput.value = searchInput.value;
                        }
                        searchResults.classList.add('hidden');
                    });
                    searchResults.appendChild(li);
                });
                searchResults.classList.remove('hidden');
            }
        } catch (e) {
            console.error(e);
            alert('검색 중 오류가 발생했습니다.');
        } finally {
            btnSearchPlace.textContent = '검색';
            btnSearchPlace.disabled = false;
        }
    });

    // Initial Check
    checkAccess();
    initExpenses();
});
