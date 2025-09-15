// main.js - extracted behavior for the reactor control UI
document.addEventListener('DOMContentLoaded', function () {
    // --- UTIL: mostrar notificaciones temporales ---
    function showNotice(message, timeout = 5000) {
        let existing = document.getElementById('global-notice');
        if (existing) existing.remove();
        const notice = document.createElement('div');
        notice.id = 'global-notice';
        // Accessible status region so screen readers announce notices
        notice.setAttribute('role', 'status');
        notice.setAttribute('aria-live', 'polite');
        notice.className = 'fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2 rounded shadow-lg';
        notice.textContent = message;
        document.body.appendChild(notice);
        setTimeout(() => { notice.classList.add('opacity-0'); setTimeout(() => notice.remove(), 400); }, timeout);
    }

    // Remove duplicate send buttons if any
    const sendBtnDuplicates = document.querySelectorAll('#send-btn');
    if (sendBtnDuplicates.length > 1) {
        for (let i = 1; i < sendBtnDuplicates.length; i++) {
            sendBtnDuplicates[i].parentNode && sendBtnDuplicates[i].parentNode.removeChild(sendBtnDuplicates[i]);
        }
        console.warn('Se encontraron y eliminaron duplicados del botón send-btn');
    }

    // THEME
    const themeToggleBtn = document.getElementById('theme-toggle');
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');
    // Chart initialization (moved from inline script)
    const ctx = document.getElementById('realtimeChart')?.getContext('2d');
    if (ctx) {
        window.realTimeChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'pH', data: [], borderColor: 'rgb(59, 130, 246)', yAxisID: 'y' }, { label: 'Temperatura (°C)', data: [], borderColor: 'rgb(249, 115, 22)', yAxisID: 'y1' }] },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { type: 'time', time: { unit: 'second', displayFormats: { second: 'HH:mm:ss' } }, title: { display: true, text: 'Tiempo' } },
                    y: { type: 'linear', position: 'left', title: { display: true, text: 'pH' }, min: 0, max: 14 },
                    y1: { type: 'linear', position: 'right', title: { display: true, text: 'Temperatura (°C)' }, grid: { drawOnChartArea: false } }
                },
                plugins: { legend: { position: 'top' } }
            }
        });
    }
    const updateChartTheme = (isDark) => {
        const tickColor = isDark ? '#9ca3af' : '#6b7280';
        const titleColor = isDark ? '#f9fafb' : '#1f2937';
        if (window.realTimeChart) {
            window.realTimeChart.options.scales.x.ticks.color = tickColor;
            window.realTimeChart.options.scales.y.ticks.color = 'rgb(59, 130, 246)';
            window.realTimeChart.options.scales.y1.ticks.color = 'rgb(249, 115, 22)';
            window.realTimeChart.options.scales.x.title.color = titleColor;
            window.realTimeChart.options.scales.y.title.color = titleColor;
            window.realTimeChart.options.scales.y1.title.color = titleColor;
            window.realTimeChart.options.plugins.legend.labels.color = titleColor;
            window.realTimeChart.update('none');
        }
    };
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            lightIcon.classList.remove('hidden');
            darkIcon.classList.add('hidden');
            updateChartTheme(true);
        } else {
            document.documentElement.classList.remove('dark');
            darkIcon.classList.remove('hidden');
            lightIcon.classList.add('hidden');
            updateChartTheme(false);
        }
    };
    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
    // Guard: only attach listener if the toggle exists
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            const newTheme = isDark ? 'dark' : 'light';
            localStorage.setItem('color-theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // TABS (ARIA + keyboard)
    const tabs = Array.from(document.querySelectorAll('.tab-btn'));
    const tabMap = { 'tab-protocolo': document.getElementById('content-protocolo'), 'tab-calculadora': document.getElementById('content-calculadora') };
    // setup ARIA on the existing parent element (do not replace DOM nodes)
    const tabList = tabs[0] && tabs[0].parentNode;
    if (tabList) tabList.setAttribute('role', 'tablist');
    // Note: keep existing visual structure, but ensure attributes per tab
    tabs.forEach((tab, idx) => {
        tab.setAttribute('role', 'tab');
        tab.setAttribute('tabindex', idx === 0 ? '0' : '-1');
        tab.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
        tab.setAttribute('aria-controls', Object.keys(tabMap)[idx]);
    });
    function activateTab(tab) {
        tabs.forEach(t => { t.classList.remove('tab-active'); t.classList.add('subtle-text'); t.setAttribute('aria-selected', 'false'); t.setAttribute('tabindex', '-1'); });
        Object.values(tabMap).forEach(c => c.classList.add('hidden'));
        tab.classList.add('tab-active');
        tab.classList.remove('subtle-text');
        tab.setAttribute('aria-selected', 'true');
        tab.setAttribute('tabindex', '0');
        tabMap[tab.id].classList.remove('hidden');
        tab.focus();
    }
    tabs.forEach(tab => {
        tab.addEventListener('click', () => activateTab(tab));
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const idx = tabs.indexOf(tab);
                const next = e.key === 'ArrowRight' ? tabs[(idx + 1) % tabs.length] : tabs[(idx - 1 + tabs.length) % tabs.length];
                activateTab(next);
            }
        });
    });

    // Chart data helper
    function addDataToChart(chart, data) {
        if (!chart) return;
        chart.data.labels.push(new Date());
        if (data.ph !== undefined) chart.data.datasets[0].data.push(data.ph);
        if (data.temp !== undefined) chart.data.datasets[1].data.push(data.temp);
        if (chart.data.labels.length > 20) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => dataset.data.shift());
        }
        chart.update('quiet');
    }

    // WebSocket connection (moved from inline)
    function connectWebSocket() {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        const livePh = document.getElementById('live-ph');
        const liveTemp = document.getElementById('live-temp');
        const errorMessage = document.getElementById('error-message');
        try {
            const ws = new WebSocket('wss://panel-reactor-servidor.onrender.com');
            ws.onopen = function() {
                statusDot.className = 'status-dot status-connected';
                statusText.textContent = 'Conectado al servidor';
                errorMessage.classList.add('hidden');
            };
            ws.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.error) { errorMessage.textContent = `Error del servidor: ${data.error}`; errorMessage.classList.remove('hidden'); return; }
                    if (data.ph !== undefined) livePh.textContent = data.ph.toFixed(2);
                    if (data.temp !== undefined) liveTemp.innerHTML = `${data.temp.toFixed(1)} <span class="text-2xl">&deg;C</span>`;
                    addDataToChart(window.realTimeChart, data);
                } catch (e) { console.error('Error al procesar el mensaje:', e); }
            };
            ws.onclose = function() {
                statusDot.className = 'status-dot status-disconnected';
                statusText.textContent = 'Desconectado. Intentando reconectar...';
                setTimeout(connectWebSocket, 5000);
            };
            ws.onerror = function() { ws.close(); };
        } catch (e) { console.error('WebSocket error', e); }
    }
    connectWebSocket();

    // ACCORDION keyboard + aria with roving tabindex and Tab navigation
    const accordionHeaders = Array.from(document.querySelectorAll('.accordion-header'));
    function setRovingTabindex(activeIndex) {
        accordionHeaders.forEach((h, idx) => {
            h.setAttribute('tabindex', idx === activeIndex ? '0' : '-1');
        });
    }
    function focusHeaderByIndex(idx) {
        const n = accordionHeaders.length;
        if (n === 0) return;
        const safe = ((idx % n) + n) % n;
        const h = accordionHeaders[safe];
        setRovingTabindex(safe);
        h.focus();
    }
    // initialize roving tabindex (first header focusable)
    setRovingTabindex(0);
    accordionHeaders.forEach((header, i) => {
        header.setAttribute('role', 'button');
        // ensure aria-expanded is present and consistent
        const panel = header.nextElementSibling;
        if (panel) {
            panel.setAttribute('role', 'region');
            panel.setAttribute('aria-hidden', 'true');
        }
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const isCurrentlyOpen = content && content.style.maxHeight && content.style.maxHeight !== '0px';
            // close all
            accordionHeaders.forEach(h => {
                const c = h.nextElementSibling;
                if (c) { c.style.maxHeight = null; c.setAttribute('aria-hidden', 'true'); }
                h.setAttribute('aria-expanded', 'false');
            });
            // If it was closed before click, open it; if it was open, leave closed (toggle)
            if (content && !isCurrentlyOpen) {
                content.style.maxHeight = content.scrollHeight + 'px';
                content.setAttribute('aria-hidden', 'false');
                header.setAttribute('aria-expanded', 'true');
            }
            // make this header the roving tabindex target
            setRovingTabindex(i);
        });
        header.addEventListener('keydown', (e) => {
            // Standard activation keys
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.click(); return; }
            // Arrow navigation
            if (e.key === 'ArrowDown') { e.preventDefault(); focusHeaderByIndex(i + 1); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); focusHeaderByIndex(i - 1); return; }
            if (e.key === 'Home') { e.preventDefault(); focusHeaderByIndex(0); return; }
            if (e.key === 'End') { e.preventDefault(); focusHeaderByIndex(accordionHeaders.length - 1); return; }
            // Tab navigation: move between headers instead of leaving widget
            if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) focusHeaderByIndex(i - 1); else focusHeaderByIndex(i + 1);
            }
        });
        // When a header receives focus by mouse or programmatically, ensure roving tabindex updated
        header.addEventListener('focus', () => setRovingTabindex(i));
    });

    // CHECKLIST persistence with schema versioning and semantic migration
    const checklistItems = Array.from(document.querySelectorAll('.checklist-item'));
    const CHECKLIST_STORAGE_KEY = 'struviteChecklistState_v1';
    function saveChecklistState(state) { try { localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state)); } catch(e) { console.error('saveChecklistState error', e); } }
    function loadChecklistState() {
        let raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
        let state = { version: 1, items: {} };
        try { state = raw ? JSON.parse(raw) : state; } catch (e) { console.error('Error parsing checklist state from localStorage:', e); state = { version: 1, items: {} }; }

        // If older format is detected (no version) try positional migration from older key
        if (!state.version) {
            // positional mapping fallback
            const oldState = state;
            const currentIds = checklistItems.map(cb => cb.id);
            const oldKeys = Object.keys(oldState).sort((a,b) => parseInt(a.replace(/\D/g,''),10)-parseInt(b.replace(/\D/g,''),10));
            const migrated = { version: 1, items: {} };
            for (let i = 0; i < Math.min(oldKeys.length, currentIds.length); i++) {
                const oldKey = oldKeys[i]; const newKey = currentIds[i]; migrated.items[newKey] = oldState[oldKey];
            }
            saveChecklistState(migrated);
            state = migrated;
            showNotice('Se migró el estado antiguo del checklist (posicional).');
        }

        // Semantic safety: ensure keys match current ids, otherwise try to map by label text similarity
        const currentIds = checklistItems.map(cb => cb.id);
        const existingKeys = Object.keys(state.items || {});
        const missing = existingKeys.filter(k => !currentIds.includes(k));
        if (missing.length) {
            // try to map by label text: for each old key, find li text and find closest current id by substring
            let mapped = 0;
            missing.forEach(oldKey => {
                const oldEntry = state.items[oldKey];
                const oldLabelText = (oldEntry && oldEntry.label) ? oldEntry.label : null;
                if (!oldLabelText) return;
                for (const cb of checklistItems) {
                    const liText = cb.closest('li')?.innerText || '';
                    if (liText.includes(oldLabelText) || oldLabelText.includes(liText.slice(0, Math.min(30, liText.length)))) {
                        state.items[cb.id] = state.items[oldKey];
                        delete state.items[oldKey];
                        mapped++;
                        break;
                    }
                }
            });
            if (mapped) { saveChecklistState(state); console.info(`Checklist: migradas ${mapped} entradas usando mapeo semántico.`); showNotice(`Migradas ${mapped} entradas del checklist.`); }
        }

        // Apply to DOM
        checklistItems.forEach(cb => {
            const entry = (state.items && state.items[cb.id]);
            if (entry) {
                cb.checked = true;
                const verificationInfo = cb.closest('li')?.querySelector('.verification-info');
                if (verificationInfo) {
                    verificationInfo.innerHTML = `<strong>Verificado por:</strong> ${entry.verifier || entry.name || ''} <br> <strong>Fecha y hora:</strong> ${entry.timestamp || ''}`;
                    verificationInfo.classList.remove('hidden');
                }
            }
        });
        return state;
    }
    let checklistState = loadChecklistState();

    // Modal verification handling
    const modal = document.getElementById('verification-modal');
    const verifierNameInput = document.getElementById('verifier-name');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    let currentCheckbox = null;
    function adjustAccordionHeight(element) {
        const accordionContent = element.closest('.accordion-content');
        if (accordionContent && accordionContent.style.maxHeight && accordionContent.style.maxHeight !== '0px') {
            accordionContent.style.maxHeight = accordionContent.scrollHeight + 'px';
        }
    }
    checklistItems.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                currentCheckbox = this;
                modal.style.display = 'flex';
                verifierNameInput.focus();
            } else {
                if (checklistState.items && checklistState.items[this.id]) delete checklistState.items[this.id];
                saveChecklistState(checklistState);
                const verificationInfo = this.closest('li')?.querySelector('.verification-info');
                if (verificationInfo) { verificationInfo.classList.add('hidden'); verificationInfo.innerHTML = ''; adjustAccordionHeight(this); }
            }
        });
    });
    modalConfirm.addEventListener('click', () => {
        const name = verifierNameInput.value.trim();
        if (name && currentCheckbox) {
            const now = new Date();
            const dateTime = `${now.toLocaleDateString()} - ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            checklistState.items = checklistState.items || {};
            checklistState.items[currentCheckbox.id] = { verifier: name, timestamp: dateTime };
            saveChecklistState(checklistState);
            const verificationInfo = currentCheckbox.closest('li')?.querySelector('.verification-info');
            if (verificationInfo) {
                verificationInfo.innerHTML = `<strong>Verificado por:</strong> ${name} <br> <strong>Fecha y hora:</strong> ${dateTime}`;
                verificationInfo.classList.remove('hidden');
                adjustAccordionHeight(currentCheckbox);
            }
            modal.style.display = 'none'; verifierNameInput.value = '';
        }
    });
    verifierNameInput.addEventListener('keydown', function(event) { if (event.key === 'Enter') { event.preventDefault(); modalConfirm.click(); } });
    modalCancel.addEventListener('click', () => { if (currentCheckbox) { currentCheckbox.checked = false; currentCheckbox.dispatchEvent(new Event('change')); } modal.style.display = 'none'; });

    // Calculadora logic: keep in HTML (small) - handlers remain in index.html for now
    // ---------------- Calculadora de MgO (implementación del usuario) ----------------
    const calculateBtn = document.getElementById('calculateBtn');
    const clearBtn = document.getElementById('clearBtn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const flowDigestate = parseFloat(document.getElementById('flow_digestate').value);
            const concPO4 = parseFloat(document.getElementById('po4_concentration').value);
            const flowMgO = parseFloat(document.getElementById('flow_mgo').value);
            const mgRatio = parseFloat(document.getElementById('mg_ratio').value);
            const prepVolume = parseFloat(document.getElementById('prep_volume').value);
            const mgoPurity = parseFloat(document.getElementById('mgo_purity').value);
            const resultConcEl = document.getElementById('result_conc');
            const resultMassEl = document.getElementById('result_mass');
            const stepsEl = document.getElementById('calculation_steps');
            const resultSection = document.getElementById('result-section');
            // handle po4 type conversion (PO4 as P -> PO4)
            const po4Type = document.getElementById('po4_type');
            let concPO4_used = concPO4;
            if (po4Type && po4Type.value === 'po4p') concPO4_used = concPO4 * 3.066;
            // handle efficiency
            const efficiencyInput = document.getElementById('efficiency');
            const efficiency_pct = efficiencyInput ? parseFloat(efficiencyInput.value) : 100;

            if ([flowDigestate, concPO4, flowMgO, mgRatio, prepVolume, mgoPurity].some(isNaN) || mgoPurity > 100 || mgoPurity <= 0) {
                if (resultConcEl) resultConcEl.textContent = 'Error';
                if (resultMassEl) resultMassEl.textContent = 'Error';
                if (stepsEl) stepsEl.innerHTML = '<p class="text-red-500">Revisa los valores.</p>';
                if (resultSection) resultSection.classList.remove('hidden');
                return;
            }
            const molarMassPO4 = 94.9714; const molarMassMgO = 40.3044;
            // molarFlowPO4 in mmol/min (user formula)
            const molarFlowPO4 = (concPO4_used / molarMassPO4) * (flowDigestate / 1000);
            const requiredMolarFlowMgO = molarFlowPO4 * mgRatio;
            const requiredConcMgO_mmolL = requiredMolarFlowMgO / (flowMgO / 1000);
            const requiredConcMgO_gL = (requiredConcMgO_mmolL * molarMassMgO) / 1000;
            const massMgO_pure = requiredConcMgO_gL * (prepVolume / 1000);
            // apply purity
            let finalMass = massMgO_pure / (mgoPurity / 100);
            // apply efficiency (if provided, reduce efficiency -> increase mass)
            const eff_frac = (isNaN(efficiency_pct) || efficiency_pct <= 0) ? 1 : (efficiency_pct / 100);
            if (eff_frac > 0 && eff_frac < 1) finalMass = finalMass / eff_frac;

            if (resultConcEl) resultConcEl.textContent = `${requiredConcMgO_gL.toFixed(4)} g/L`;
            if (resultMassEl) resultMassEl.textContent = `${finalMass.toFixed(4)} g`;
            if (stepsEl) {
                stepsEl.innerHTML = `<p>1. Flujo molar PO₄³⁻: <strong>${molarFlowPO4.toFixed(4)} mmol/min</strong></p><p>2. Flujo molar MgO req.: <strong>${requiredMolarFlowMgO.toFixed(4)} mmol/min</strong></p><p>3. Concentración MgO req.: <strong>${requiredConcMgO_gL.toFixed(4)} g/L</strong></p><p class="font-bold">4. Masa Final a Pesar: <strong>${finalMass.toFixed(4)} g</strong></p>`;
            }
            if (resultSection) resultSection.classList.remove('hidden');
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            const ids = ['flow_digestate','po4_concentration','flow_mgo','prep_volume'];
            ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            const mgRatioEl = document.getElementById('mg_ratio'); if (mgRatioEl) mgRatioEl.value = '1.2';
            const mgoPurityEl = document.getElementById('mgo_purity'); if (mgoPurityEl) mgoPurityEl.value = '98.3';
            const stepsEl = document.getElementById('calculation_steps'); if (stepsEl) { stepsEl.innerHTML = ''; stepsEl.classList.add('hidden'); }
            const resultSection = document.getElementById('result-section'); if (resultSection) resultSection.classList.add('hidden');
        });
    }
    // ---------------- end calculadora ----------------

    // Buttons: reset, print, send
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => {
        if (confirm('¿Reiniciar todas las verificaciones?')) {
            checklistItems.forEach(cb => { cb.checked = false; const info = cb.closest('li')?.querySelector('.verification-info'); if(info) info.classList.add('hidden'); });
            checklistState = { version: 1, items: {} }; saveChecklistState(checklistState);
        }
    });

    const printBtn = document.getElementById('print-btn'); if (printBtn) printBtn.addEventListener('click', () => window.print());

    const sendBtn = document.getElementById('send-btn');
    const checklistContainer = document.getElementById('checklist-container');
    function checkAllCompleted() {
        const allChecked = checklistItems.every(cb => cb.checked);
        if (allChecked && sendBtn) { sendBtn.disabled = false; sendBtn.classList.remove('opacity-50','cursor-not-allowed'); }
        else if (sendBtn) { sendBtn.disabled = true; sendBtn.classList.add('opacity-50','cursor-not-allowed'); }
    }
    checklistItems.forEach(cb => { cb.addEventListener('change', checkAllCompleted); });
    checkAllCompleted();

    if (sendBtn) sendBtn.addEventListener('click', async () => {
        sendBtn.disabled = true; sendBtn.textContent = 'Generando...';
        const cloneContainer = document.createElement('div'); cloneContainer.classList.add('pdf-clone-container');
        const clonedChecklist = checklistContainer.cloneNode(true);
        const elementsToStrip = clonedChecklist.querySelectorAll('button, .no-print');
        elementsToStrip.forEach(el => el.parentNode && el.parentNode.removeChild(el));
        cloneContainer.appendChild(clonedChecklist); document.body.appendChild(cloneContainer);
        try {
            await new Promise(resolve => setTimeout(resolve, 200));
            const canvas = await html2canvas(cloneContainer, { scale: 2 });
            document.body.removeChild(cloneContainer);
            sendBtn.textContent = 'Enviando...';
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            const pdfBlob = pdf.output('blob');
            // send as FormData
            const form = new FormData(); form.append('file', pdfBlob, 'checklist.pdf');
            const response = await fetch('https://panel-reactor-servidor.onrender.com/enviar-checklist', { method: 'POST', body: form });
            if (response.ok) { alert('¡Checklist enviado por correo exitosamente!'); } else { throw new Error('El servidor no respondió correctamente.'); }
        } catch (error) {
            console.error('Error al generar o enviar el PDF:', error); alert('Hubo un error al generar o enviar el PDF.');
            if (document.body.contains(cloneContainer)) document.body.removeChild(cloneContainer);
        } finally { sendBtn.textContent = 'Enviar PDF'; checkAllCompleted(); }
    });

    // WebSocket connection remains as inlined in index.html (unless moved later)
});
