/**
 * JanSetu AI - Citizen Reporting Module
 * Features:
 * - Guided 3-step workflow
 * - Realistic microphone interaction (timer, audio waveform, clear/reset)
 * - Geolocation detection & reverse geocoding
 * - Stepped Gemini AI NLU processing checklist animation
 * - Confirmation receipt card with tracking reference
 */

document.addEventListener('DOMContentLoaded', () => {
    initCitizenPortal();
});

function initCitizenPortal() {
    const form = document.getElementById('citizenReportForm');
    const descriptionInput = document.getElementById('problemDescription');
    const charCount = document.getElementById('charCount');
    const languageSelect = document.getElementById('reportLanguage');
    
    // Voice Components
    const voiceToggleBtn = document.getElementById('voiceToggleBtn');
    const micIcon = document.getElementById('micIcon');
    const voiceStatusText = document.getElementById('voiceStatusText');
    const voiceSubLabel = document.getElementById('voiceSubLabel');
    const audioWaveform = document.getElementById('audioWaveform');
    const recordingTimer = document.getElementById('recordingTimer');
    const clearVoiceBtn = document.getElementById('clearVoiceBtn');
    
    // Location Components
    const locationBtn = document.getElementById('detectLocationBtn');
    const districtInput = document.getElementById('districtInput');
    const latInput = document.getElementById('latitudeInput');
    const lonInput = document.getElementById('longitudeInput');
    const latDisplay = document.getElementById('latDisplay');
    const lonDisplay = document.getElementById('lonDisplay');

    // Stepper & Submit
    const categorySelect = document.getElementById('categorySelect');
    const autoDetectBtn = document.getElementById('autoDetectCategoryBtn');
    const autoDetectBtnText = document.getElementById('autoDetectBtnText');
    const autoDetectBtnIcon = document.getElementById('autoDetectBtnIcon');
    const aiCategoryBadge = document.getElementById('aiCategoryBadge');
    const aiCategoryBadgeText = document.getElementById('aiCategoryBadgeText');
    const aiCategorySourceTag = document.getElementById('aiCategorySourceTag');
    const submitBtn = document.getElementById('submitReportBtn');
    const submitBtnText = document.getElementById('submitBtnText');
    const formAlert = document.getElementById('formAlert');
    const formAlertText = document.getElementById('formAlertText');

    // AI Processing Overlay & Checklist
    const aiProcessingOverlay = document.getElementById('aiProcessingOverlay');
    const aiStep1 = document.getElementById('aiStep1');
    const aiStep2 = document.getElementById('aiStep2');
    const aiStep3 = document.getElementById('aiStep3');
    const aiStep4 = document.getElementById('aiStep4');
    const aiStep5 = document.getElementById('aiStep5');

    // Receipt Card Components
    const successCard = document.getElementById('submissionSuccessCard');
    const receiptReportId = document.getElementById('receiptReportId');
    const receiptCategory = document.getElementById('receiptCategory');
    const receiptSeverity = document.getElementById('receiptSeverity');
    const receiptDistrict = document.getElementById('receiptDistrict');
    const receiptMeta = document.getElementById('receiptMeta');
    const receiptSummary = document.getElementById('receiptSummary');
    const receiptViewBtn = document.getElementById('receiptViewBtn');
    const submitAnotherBtn = document.getElementById('submitAnotherBtn');

    if (!form) return;

    // -------------------------------------------------------------------------
    // 1. Character Counter & Dynamic Placeholders
    // -------------------------------------------------------------------------
    const placeholders = {
        Hindi: 'उदाहरण: हमारे गांव में मुख्य सड़क पूरी तरह टूट गई है। बारिश के समय गड्ढों में पानी भरने से एम्बुलेंस और स्कूल बसें नहीं आ पातीं...',
        English: 'e.g. The main drinking water pipeline has been broken for 5 days in Sector 4. Contaminated drainage water is mixing with the supply line...'
    };

    if (descriptionInput) {
        descriptionInput.addEventListener('input', () => {
            const count = descriptionInput.value.length;
            if (charCount) {
                charCount.textContent = `${count} characters`;
            }

            // Debounced real-time category detection if set to Auto-detect
            if (categorySelect && categorySelect.value === 'auto' && count >= 12) {
                clearTimeout(autoDetectDebounceTimer);
                autoDetectDebounceTimer = setTimeout(() => {
                    triggerAiCategoryDetection(false);
                }, 1100);
            }
        });
    }

    if (languageSelect && descriptionInput) {
        languageSelect.addEventListener('change', () => {
            const lang = languageSelect.value;
            descriptionInput.placeholder = placeholders[lang] || placeholders.Hindi;
        });
    }

    // -------------------------------------------------------------------------
    // 2. Realistic Microphone Recording with Timer & Waveform
    // -------------------------------------------------------------------------
    let recognition = null;
    let isRecording = false;
    let timerInterval = null;
    let timerSeconds = 0;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
            isRecording = true;
            timerSeconds = 0;
            updateTimerDisplay();

            if (micIcon) {
                micIcon.textContent = 'stop';
                micIcon.style.color = 'var(--accent-red)';
            }
            if (voiceToggleBtn) {
                voiceToggleBtn.classList.add('btn-danger');
                voiceToggleBtn.style.boxShadow = '0 0 0 6px rgba(220, 38, 38, 0.15)';
            }
            if (voiceStatusText) {
                const lang = languageSelect ? languageSelect.value : 'Hindi';
                voiceStatusText.textContent = lang === 'Hindi' ? 'Listening... बोलिए' : 'Listening... speak clearly';
                voiceStatusText.style.color = 'var(--accent-red)';
            }
            if (voiceSubLabel) {
                voiceSubLabel.textContent = 'Microphone active • Speak into your device';
            }
            if (audioWaveform) {
                audioWaveform.style.display = 'flex';
                audioWaveform.classList.add('active');
            }
            if (recordingTimer) {
                recordingTimer.style.display = 'block';
            }
            if (clearVoiceBtn) {
                clearVoiceBtn.style.display = 'inline-flex';
            }

            timerInterval = setInterval(() => {
                timerSeconds++;
                updateTimerDisplay();
            }, 1000);
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            if (transcript.trim()) {
                descriptionInput.value = transcript;
                if (charCount) charCount.textContent = `${descriptionInput.value.length} characters`;
            }
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition warning:', event.error);
            stopRecordingUI();
            if (event.error === 'not-allowed') {
                showToast('Microphone permission was denied. Please allow access or type.', 'warning');
            } else if (event.error === 'no-speech') {
                showToast('No speech was detected. Please try speaking again.', 'info');
            } else {
                showToast(`Voice input: ${event.error}`, 'info');
            }
        };

        recognition.onend = () => {
            stopRecordingUI();
            if (descriptionInput.value.trim().length > 0) {
                if (voiceStatusText) {
                    voiceStatusText.textContent = 'Voice captured successfully ✓';
                    voiceStatusText.style.color = 'var(--accent-green)';
                }
                if (voiceSubLabel) {
                    voiceSubLabel.textContent = 'Speech converted to text. You can edit the description above.';
                }
                showToast('Voice transcribed successfully!', 'success');

                // Trigger auto-detect immediately after voice capture
                if (categorySelect && categorySelect.value === 'auto' && descriptionInput.value.trim().length >= 8) {
                    setTimeout(() => triggerAiCategoryDetection(false), 400);
                }
            }
        };

        if (voiceToggleBtn) {
            voiceToggleBtn.addEventListener('click', () => {
                if (isRecording) {
                    recognition.stop();
                } else {
                    const currentLang = languageSelect ? languageSelect.value : 'Hindi';
                    recognition.lang = currentLang === 'Hindi' ? 'hi-IN' : 'en-IN';
                    try {
                        recognition.start();
                    } catch (err) {
                        console.error('Failed to start speech recognition:', err);
                    }
                }
            });
        }
    } else {
        if (voiceToggleBtn) {
            voiceToggleBtn.addEventListener('click', () => {
                showToast('Speech recognition is not supported in this browser. Please type your problem.', 'info');
            });
        }
    }

    function updateTimerDisplay() {
        if (!recordingTimer) return;
        const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
        const secs = (timerSeconds % 60).toString().padStart(2, '0');
        recordingTimer.textContent = `${mins}:${secs}`;
    }

    function stopRecordingUI() {
        isRecording = false;
        clearInterval(timerInterval);
        if (micIcon) {
            micIcon.textContent = 'mic';
            micIcon.style.color = 'var(--primary-blue)';
        }
        if (voiceToggleBtn) {
            voiceToggleBtn.classList.remove('btn-danger');
            voiceToggleBtn.style.boxShadow = 'none';
        }
        if (audioWaveform) {
            audioWaveform.classList.remove('active');
            audioWaveform.style.display = 'none';
        }
        if (recordingTimer) {
            recordingTimer.style.display = 'none';
        }
        if (!descriptionInput.value.trim()) {
            if (voiceStatusText) {
                voiceStatusText.textContent = 'Click microphone to speak (बोलकर बताएं)';
                voiceStatusText.style.color = 'var(--text-secondary)';
            }
            if (voiceSubLabel) {
                voiceSubLabel.textContent = 'Browser Web Speech API • No typing required';
            }
            if (clearVoiceBtn) {
                clearVoiceBtn.style.display = 'none';
            }
        }
    }

    if (clearVoiceBtn) {
        clearVoiceBtn.addEventListener('click', () => {
            descriptionInput.value = '';
            if (charCount) charCount.textContent = '0 characters';
            stopRecordingUI();
            clearVoiceBtn.style.display = 'none';
            if (voiceStatusText) {
                voiceStatusText.textContent = 'Click microphone to speak (बोलकर बताएं)';
                voiceStatusText.style.color = 'var(--text-secondary)';
            }
            showToast('Voice transcription cleared.', 'info');
        });
    }

    // -------------------------------------------------------------------------
    // 3. HTML5 Geolocation Detection
    // -------------------------------------------------------------------------
    if (locationBtn) {
        locationBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                showToast('Geolocation is not supported by your browser.', 'warning');
                return;
            }

            const originalBtnHtml = locationBtn.innerHTML;
            locationBtn.disabled = true;
            locationBtn.innerHTML = `
                <span class="material-symbols-outlined icon-16">hourglass_top</span>
                <span>Locating...</span>
            `;

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;

                    if (latInput) latInput.value = lat.toFixed(4);
                    if (lonInput) lonInput.value = lon.toFixed(4);
                    if (latDisplay) latDisplay.textContent = `${lat.toFixed(4)}° N`;
                    if (lonDisplay) lonDisplay.textContent = `${lon.toFixed(4)}° E`;

                    // Reverse geocoding via Nominatim
                    try {
                        const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
                        const res = await fetch(reverseUrl, { headers: { 'Accept': 'application/json' } });
                        if (res.ok) {
                            const data = await res.json();
                            const addr = data.address || {};
                            const detectedDistrict = addr.state_district || addr.county || addr.city || addr.town;
                            if (detectedDistrict && districtInput) {
                                districtInput.value = detectedDistrict.replace(' District', '');
                            }
                        }
                    } catch (err) {
                        console.warn('Reverse geocode error:', err);
                    }

                    locationBtn.disabled = false;
                    locationBtn.innerHTML = `
                        <span class="material-symbols-outlined icon-16" style="color: var(--accent-green);">check</span>
                        <span>Location Set</span>
                    `;
                    showToast('Coordinates successfully detected via GPS.', 'success');

                    setTimeout(() => {
                        locationBtn.innerHTML = originalBtnHtml;
                    }, 3000);
                },
                (err) => {
                    locationBtn.disabled = false;
                    locationBtn.innerHTML = originalBtnHtml;
                    showToast('Location permission denied. Please enter your district name manually.', 'info');
                    if (districtInput) districtInput.focus();
                },
                { timeout: 8000, enableHighAccuracy: true }
            );
        });
    }

    // -------------------------------------------------------------------------
    // 3b. Interactive Gemini AI Category Auto-Detection Engine
    // -------------------------------------------------------------------------
    let isDetectingCategory = false;
    let autoDetectDebounceTimer = null;

    async function triggerAiCategoryDetection(showNotice = false) {
        if (isDetectingCategory) return;
        const text = (descriptionInput ? descriptionInput.value : '').trim();
        if (text.length < 8) {
            if (showNotice) {
                showToast('Please type or speak your problem description first (at least 8 characters).', 'warning');
                if (descriptionInput) descriptionInput.focus();
            }
            return;
        }

        isDetectingCategory = true;
        if (autoDetectBtn) {
            autoDetectBtn.disabled = true;
            if (autoDetectBtnText) autoDetectBtnText.textContent = 'Detecting...';
            if (autoDetectBtnIcon) {
                autoDetectBtnIcon.textContent = 'sync';
                autoDetectBtnIcon.style.animation = 'spin 1s infinite linear';
            }
        }

        try {
            const lang = languageSelect ? languageSelect.value : 'Hindi';
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, language: lang })
            });

            const result = await res.json();
            if (result.success && result.data) {
                const analysis = result.data;
                const detectedCat = analysis.category || 'Roads';

                // Automatically select the option in the dropdown
                if (categorySelect) {
                    categorySelect.value = detectedCat;
                    // Visual feedback highlight
                    categorySelect.style.borderColor = 'var(--primary-blue)';
                    categorySelect.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.25)';
                    setTimeout(() => {
                        categorySelect.style.borderColor = '';
                        categorySelect.style.boxShadow = '';
                    }, 2500);
                }

                // Show dynamic AI category badge
                if (aiCategoryBadge && aiCategoryBadgeText) {
                    aiCategoryBadge.style.display = 'flex';
                    const sev = analysis.severity || 'Medium';
                    const urg = analysis.urgency || sev;
                    aiCategoryBadgeText.innerHTML = `✨ Gemini AI classified as: <strong>${detectedCat}</strong> &bull; Severity: <strong>${sev}</strong> (${urg} Urgency)`;
                    if (aiCategorySourceTag) {
                        aiCategorySourceTag.textContent = analysis.source === 'gemini_ai' ? 'Gemini NLU' : 'AI Heuristic';
                    }
                }

                if (showNotice) {
                    showToast(`✨ Category auto-detected: ${detectedCat}`, 'success');
                }
            } else {
                if (showNotice) {
                    showToast(result.error || 'Could not auto-detect category.', 'warning');
                }
            }
        } catch (err) {
            console.error('AI Auto-detect error:', err);
            if (showNotice) {
                showToast('AI analysis service temporarily unavailable.', 'error');
            }
        } finally {
            isDetectingCategory = false;
            if (autoDetectBtn) {
                autoDetectBtn.disabled = false;
                if (autoDetectBtnText) autoDetectBtnText.textContent = 'Auto-Detect with AI';
                if (autoDetectBtnIcon) {
                    autoDetectBtnIcon.textContent = 'auto_awesome';
                    autoDetectBtnIcon.style.animation = 'none';
                }
            }
        }
    }

    if (autoDetectBtn) {
        autoDetectBtn.addEventListener('click', (e) => {
            e.preventDefault();
            triggerAiCategoryDetection(true);
        });
    }

    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            if (categorySelect.value === 'auto') {
                triggerAiCategoryDetection(true);
            } else {
                if (aiCategoryBadge) {
                    aiCategoryBadge.style.display = 'none';
                }
            }
        });
    }

    // -------------------------------------------------------------------------
    // 4. Stepped Gemini AI Submission & Async Backend Call
    // -------------------------------------------------------------------------
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const description = (descriptionInput.value || '').trim();
        if (description.length < 10) {
            showAlert('Please describe the problem in more detail (at least 10 characters).');
            descriptionInput.focus();
            return;
        }

        const language = languageSelect ? languageSelect.value : 'Hindi';
        const category = categorySelect ? categorySelect.value : 'auto';
        const district = (districtInput && districtInput.value.trim()) ? districtInput.value.trim() : 'Prayagraj';
        const latitude = latInput && latInput.value ? parseFloat(latInput.value) : 25.4358;
        const longitude = lonInput && lonInput.value ? parseFloat(lonInput.value) : 81.8463;

        const payload = {
            description,
            language,
            category,
            district,
            latitude,
            longitude,
            state: 'Uttar Pradesh'
        };

        // Reveal Stepped Gemini AI Processing Checklist
        form.style.display = 'none';
        if (aiProcessingOverlay) {
            aiProcessingOverlay.style.display = 'block';
            resetAiChecklist();
        }

        // Animate Step 1: Language Detection
        await delay(400);
        setStepStatus(aiStep1, 'active', 'sync', '1. Detecting language & dialect (Hindi/English)...');
        await delay(500);
        setStepStatus(aiStep1, 'done', 'check_circle', `✓ Language identified: ${language}`);

        // Animate Step 2: Problem Synthesis
        await delay(300);
        setStepStatus(aiStep2, 'active', 'sync', '2. Synthesizing core infrastructure problem...');
        
        // Start backend request in parallel
        let apiResult = null;
        let apiError = null;

        const apiPromise = fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(async res => {
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Submission failed');
            apiResult = data.data;
            return data.data;
        })
        .catch(err => { apiError = err; });

        await delay(600);
        setStepStatus(aiStep2, 'done', 'check_circle', '✓ Core problem extracted and summarized');

        // Animate Step 3: Infrastructure Domain Classification
        await delay(300);
        setStepStatus(aiStep3, 'active', 'sync', '3. Classifying infrastructure domain & department...');
        await delay(600);
        setStepStatus(aiStep3, 'done', 'check_circle', '✓ Infrastructure category mapped');

        // Animate Step 4: Urgency & Societal Impact
        await delay(300);
        setStepStatus(aiStep4, 'active', 'sync', '4. Evaluating urgency & community societal impact...');
        await delay(500);
        setStepStatus(aiStep4, 'done', 'check_circle', '✓ Urgency & severity ratings determined');

        // Animate Step 5: Persistence to Database
        await delay(300);
        setStepStatus(aiStep5, 'active', 'sync', '5. Persisting structured record to government database...');

        // Await API completion
        await apiPromise;
        await delay(400);

        if (apiError) {
            if (aiProcessingOverlay) aiProcessingOverlay.style.display = 'none';
            form.style.display = 'block';
            showAlert(`Failed to submit grievance: ${apiError.message}`);
            showToast('Submission error. Please verify input and try again.', 'error');
            return;
        }

        setStepStatus(aiStep5, 'done', 'check_circle', '✓ Grievance registered & reference issued');
        await delay(600);

        // Transition to Confirmation Receipt Card
        if (aiProcessingOverlay) aiProcessingOverlay.style.display = 'none';
        renderReceiptCard(payload, apiResult || payload);
    });

    function setStepStatus(elem, state, iconName, text) {
        if (!elem) return;
        elem.className = `ai-step-item ${state}`;
        const iconElem = elem.querySelector('.material-symbols-outlined');
        const textElem = elem.querySelector('span:last-child');
        if (iconElem) {
            iconElem.textContent = iconName;
            if (state === 'active') {
                iconElem.style.animation = 'spin 1.2s infinite linear';
            } else {
                iconElem.style.animation = 'none';
            }
        }
        if (textElem && text) {
            textElem.textContent = text;
        }
    }

    function resetAiChecklist() {
        setStepStatus(aiStep1, 'pending', 'pending', '1. Detecting language & dialect (Hindi/English)');
        setStepStatus(aiStep2, 'pending', 'pending', '2. Synthesizing core infrastructure problem');
        setStepStatus(aiStep3, 'pending', 'pending', '3. Classifying infrastructure domain & department');
        setStepStatus(aiStep4, 'pending', 'pending', '4. Evaluating urgency & community societal impact');
        setStepStatus(aiStep5, 'pending', 'pending', '5. Persisting structured record to government database');
    }

    function renderReceiptCard(payload, reportData) {
        if (successCard) {
            successCard.style.display = 'block';
            const repId = reportData.report_id || `JS-${Math.floor(1000 + Math.random() * 9000)}`;
            const finalCat = (reportData.category && reportData.category !== 'auto')
                ? reportData.category
                : (payload.category !== 'auto' ? payload.category : 'Roads');

            if (receiptReportId) receiptReportId.textContent = `#${repId}`;
            if (receiptCategory) receiptCategory.textContent = finalCat;
            if (receiptSeverity) receiptSeverity.textContent = `${reportData.severity || 'High'} (${reportData.urgency || 'High'} Urgency)`;
            if (receiptDistrict) receiptDistrict.textContent = `${reportData.district || 'Prayagraj'}, Uttar Pradesh`;
            if (receiptMeta) {
                const lang = reportData.language || 'Hindi';
                let timeDisplay = 'Just now';
                if (reportData.created_at) {
                    try {
                        const d = new Date(reportData.created_at);
                        if (!isNaN(d.getTime())) {
                            timeDisplay = d.toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            });
                        }
                    } catch (e) {}
                }
                receiptMeta.innerHTML = `${lang} &bull; ${timeDisplay}`;
            }
            if (receiptSummary) receiptSummary.textContent = `"${reportData.problem_summary || reportData.description || payload.description}"`;
            if (receiptViewBtn) receiptViewBtn.href = `/reports/${repId}`;

            window.scrollTo({ top: 0, behavior: 'smooth' });
            showToast(`Grievance recorded with ID #${repId}!`, 'success');
        }
    }

    // -------------------------------------------------------------------------
    // 5. Submit Another Grievance Handler
    // -------------------------------------------------------------------------
    if (submitAnotherBtn) {
        submitAnotherBtn.addEventListener('click', () => {
            form.reset();
            if (charCount) charCount.textContent = '0 characters';
            if (latInput) latInput.value = '25.4358';
            if (lonInput) lonInput.value = '81.8463';
            if (latDisplay) latDisplay.textContent = '25.4358° N';
            if (lonDisplay) lonDisplay.textContent = '81.8463° E';
            if (successCard) successCard.style.display = 'none';
            if (aiCategoryBadge) aiCategoryBadge.style.display = 'none';
            form.style.display = 'block';
            hideAlert();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    function showAlert(msg) {
        if (formAlert && formAlertText) {
            formAlertText.textContent = msg;
            formAlert.style.display = 'flex';
        }
    }

    function hideAlert() {
        if (formAlert) formAlert.style.display = 'none';
    }

    function delay(ms) {
        return new Promise(res => setTimeout(res, ms));
    }
}
