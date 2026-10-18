import { FAQ_DATA } from './data/faq.js';
import { TIMELINE_DATA } from './data/timeline.js';
import { ELECTION_DATA } from './data/elections.js';
import { MistralService, sanitizeInput } from './services/mistral.js';
import { GeminiService } from './services/gemini.js';
import { MapsService } from './services/maps.js';
import { CalendarService } from './services/calendar.js';

// App State
const state = {
  aiService: null,
  activeAiProvider: 'mistral',
  mapsService: null,
  calendarService: new CalendarService(),
  isProcessing: false,
  currentWizardStep: 1,
  totalWizardSteps: 5,
  isTimelineRendered: false,
  isFAQRendered: false,
};

// DOM Elements
const els = {
  settingsProviderMistral: document.getElementById('settings-provider-mistral'),
  settingsProviderGemini: document.getElementById('settings-provider-gemini'),
  settingsMistralKey: document.getElementById('settings-mistral-key'),
  settingsGeminiKey: document.getElementById('settings-gemini-key'),
  settingsMapsKey: document.getElementById('settings-maps-key'),
  settingsSaveBtn: document.getElementById('settings-save-btn'),
  
  navItems: document.querySelectorAll('.nav-item[data-view]'),
  viewContents: document.querySelectorAll('.view-content'),
  
  // Copilot Elements
  copilotToggle: document.getElementById('chatbot-toggle'),
  copilotClose: document.getElementById('chatbot-close'),
  copilotWindow: document.getElementById('chatbot-window'),
  chatInput: document.getElementById('chat-input'),
  sendBtn: document.getElementById('send-btn'),
  chatMessages: document.getElementById('chat-messages'),
  homeAskBtn: document.getElementById('home-ask-btn'),
  
  timelineArea: document.getElementById('timeline-render-area'),
  faqArea: document.getElementById('faq-render-area'),
  faqSearch: document.getElementById('faq-search'),
  quickStatsArea: document.getElementById('quick-stats-area'),
  
  locationInput: document.getElementById('location-input'),
  searchBoothBtn: document.getElementById('search-booth-btn'),
  
  // Wizard Elements
  wizardContentArea: document.getElementById('wizard-content-area'),
  wizardPrevBtn: document.getElementById('wizard-prev-btn'),
  wizardNextBtn: document.getElementById('wizard-next-btn'),
  wizardProgressBar: document.getElementById('wizard-progress-bar'),
  wizardStepLabel: document.getElementById('wizard-step-label'),
  wizardProgressText: document.getElementById('wizard-progress-text'),

  toast: document.getElementById('toast'),
  toastMsg: document.getElementById('toast-msg'),

  // Mobile Menu
  mobileMenuBtn: document.getElementById('mobile-menu-btn'),
  mobileMenuOverlay: document.getElementById('mobile-menu-overlay'),
  mobileMenuPanel: document.getElementById('mobile-menu-panel'),
  mobileMenuClose: document.getElementById('mobile-menu-close'),
  mobileNavBtns: document.querySelectorAll('.mobile-nav-btn[data-view]'),
};

// Wizard Step Content
const wizardSteps = [
  {
    title: "Eligibility Check",
    content: "To register as a voter in India, you must be an Indian citizen, 18 years of age or older on the qualifying date, and a resident of the polling area where you wish to enroll. <br><br><strong>Checklist:</strong><ul class='list-disc list-inside mt-2 text-muted'><li>Indian Citizenship</li><li>Age 18 or above</li></ul>"
  },
  {
    title: "Gather Your Documents",
    content: "Keep scanned copies of the following documents ready before starting your application:<br><br><strong>Required Documents:</strong><ul class='list-disc list-inside mt-2 text-muted'><li>Passport size photograph</li><li>Identity proof (Aadhaar, PAN, Passport)</li><li>Address proof (Electricity bill, Passport, Bank Passbook)</li></ul>"
  },
  {
    title: "Choose Application Method",
    content: "You can apply online or offline. We recommend the online method for faster processing.<br><br><strong>Options:</strong><ul class='list-disc list-inside mt-2 text-muted'><li><strong>Online:</strong> Use the Voter Helpline App or the NVSP portal.</li><li><strong>Offline:</strong> Fill Form 6 and submit it to the Electoral Registration Officer.</li></ul>"
  },
  {
    title: "Fill Form 6",
    content: "Fill out Form 6 carefully. Ensure your name matches your ID proof exactly. Upload your photograph and documents clearly.<br><br><a href='#' class='text-primary font-bold hover:underline'>Open Form 6 on NVSP Portal &rarr;</a>"
  },
  {
    title: "Submit and Track",
    content: "After submission, you will receive a reference number. Use this number to track your application status. Your EPIC (Voter ID) card will be delivered to your address once approved.<br><br><p class='text-secondary font-bold'>🎉 You're all set! Keep track of your reference number.</p>"
  }
];

// --- Initialization ---
function init() {
  // API keys are configured by the user via the Settings panel.
  // No keys are hardcoded — they are stored in localStorage per-session.
  let savedGeminiKey = localStorage.getItem('electassist_gemini_key') || '';
  let savedMapsKey = localStorage.getItem('electassist_maps_key') || '';
  let savedProvider = localStorage.getItem('electassist_ai_provider') || 'gemini';
  let savedMistralKey = localStorage.getItem('electassist_mistral_key') || '';
  
  if (savedMistralKey) localStorage.setItem('electassist_mistral_key', savedMistralKey);
  if (savedGeminiKey) localStorage.setItem('electassist_gemini_key', savedGeminiKey);
  if (savedMapsKey) localStorage.setItem('electassist_maps_key', savedMapsKey);
  localStorage.setItem('electassist_ai_provider', savedProvider);
  
  els.settingsMistralKey.value = savedMistralKey;
  els.settingsGeminiKey.value = savedGeminiKey;
  els.settingsMapsKey.value = savedMapsKey;
  if (savedProvider === 'gemini') {
    els.settingsProviderGemini.checked = true;
  } else {
    els.settingsProviderMistral.checked = true;
  }
  
  els.settingsSaveBtn.addEventListener('click', saveSettings);
  
  els.navItems.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Mobile Menu Logic
  const openMobileMenu = () => {
    els.mobileMenuOverlay.classList.add('open');
    els.mobileMenuPanel.classList.add('open');
  };
  const closeMobileMenu = () => {
    els.mobileMenuOverlay.classList.remove('open');
    els.mobileMenuPanel.classList.remove('open');
  };
  if (els.mobileMenuBtn) els.mobileMenuBtn.addEventListener('click', openMobileMenu);
  if (els.mobileMenuClose) els.mobileMenuClose.addEventListener('click', closeMobileMenu);
  if (els.mobileMenuOverlay) els.mobileMenuOverlay.addEventListener('click', closeMobileMenu);
  els.mobileNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
      els.mobileNavBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      closeMobileMenu();
    });
  });
  
  els.copilotToggle.addEventListener('click', () => {
    els.copilotWindow.classList.toggle('open');
    if(els.copilotWindow.classList.contains('open')) {
      els.chatInput.focus();
    }
  });
  els.copilotClose.addEventListener('click', () => {
    els.copilotWindow.classList.remove('open');
  });
  if (els.homeAskBtn) {
    els.homeAskBtn.addEventListener('click', () => {
      els.copilotWindow.classList.add('open');
      els.chatInput.focus();
    });
  }
  
  els.sendBtn.addEventListener('click', handleChatSubmit);
  els.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSubmit();
  });
  
  els.faqSearch.addEventListener('input', (e) => renderFAQ(e.target.value));
  
  els.searchBoothBtn.addEventListener('click', handleBoothSearch);
  els.locationInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleBoothSearch();
  });

  els.wizardNextBtn.addEventListener('click', () => {
    if (state.currentWizardStep < state.totalWizardSteps) {
      state.currentWizardStep++;
      renderWizard();
    }
  });

  els.wizardPrevBtn.addEventListener('click', () => {
    if (state.currentWizardStep > 1) {
      state.currentWizardStep--;
      renderWizard();
    }
  });
  
  renderWizard();
  renderQuickStats();
  
  const initDeferred = () => {
    initAnimations();
    bootSystem();
  };
  
  if ('requestIdleCallback' in window) {
    requestIdleCallback(initDeferred);
  } else {
    setTimeout(initDeferred, 1);
  }
}

function bootSystem() {
  const mistralKey = localStorage.getItem('electassist_mistral_key');
  const geminiKey = localStorage.getItem('electassist_gemini_key');
  const mapsKey = localStorage.getItem('electassist_maps_key');
  const provider = localStorage.getItem('electassist_ai_provider') || 'mistral';
  
  state.activeAiProvider = provider;
  if (provider === 'gemini') {
    state.aiService = new GeminiService(geminiKey);
  } else {
    state.aiService = new MistralService(mistralKey);
  }

  const copilotLabel = document.querySelector('#chatbot-window p.text-xs');
  if (copilotLabel) {
    copilotLabel.textContent = provider === 'gemini' ? 'Powered by Google Gemini' : 'Powered by Trickle AI (Mistral)';
  }
  
  if (mapsKey && !state.mapsService) {
    state.mapsService = new MapsService(mapsKey);
    state.mapsService.initMap('map-container').catch(e => console.warn('Map init issue:', e));
  } else if (mapsKey && state.mapsService) {
      state.mapsService.apiKey = mapsKey;
  }
  
  showToast('ElectAssist Systems Online');
}

function saveSettings() {
  const mistralKey = els.settingsMistralKey.value.trim();
  const geminiKey = els.settingsGeminiKey.value.trim();
  const mapsKey = els.settingsMapsKey.value.trim();
  const provider = els.settingsProviderGemini.checked ? 'gemini' : 'mistral';
  
  if (mistralKey) localStorage.setItem('electassist_mistral_key', mistralKey);
  if (geminiKey) localStorage.setItem('electassist_gemini_key', geminiKey);
  if (mapsKey) localStorage.setItem('electassist_maps_key', mapsKey);
  localStorage.setItem('electassist_ai_provider', provider);
  
  bootSystem();
  showToast('Configuration Saved');
}

function switchView(viewId) {
  if (!viewId) return;
  els.navItems.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewId));
  els.mobileNavBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewId));
  els.viewContents.forEach(content => content.classList.toggle('active', content.id === viewId));
  
  if (viewId === 'timeline' && !state.isTimelineRendered) {
    renderTimeline();
    state.isTimelineRendered = true;
  }
  if (viewId === 'faq' && !state.isFAQRendered) {
    renderFAQ();
    state.isFAQRendered = true;
  }
  
  // Scroll main content area to top on view switch
  const main = document.querySelector('main');
  if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Re-observe any new .reveal elements in the switched view
  document.querySelectorAll(`#${viewId} .reveal:not(.active)`).forEach(el => {
    setTimeout(() => el.classList.add('active'), 100);
  });
}

// --- Chat Assistant ---
async function handleChatSubmit() {
  const text = els.chatInput.value.trim();
  if (!text || state.isProcessing) return;
  
  const cleanText = sanitizeInput(text);
  if (!cleanText) return;
  
  appendMessage('user', cleanText);
  els.chatInput.value = '';
  
  state.isProcessing = true;
  const typingId = showTypingIndicator();
  scrollToBottom();
  
  try {
    if (!state.aiService) throw new Error('API Key not configured');
    
    const response = await state.aiService.sendMessage(cleanText);
    
    removeMessage(typingId);
    appendMessage('bot', formatBotResponse(response.text));
    handleIntentActions(response.intent);
    
  } catch (error) {
    removeMessage(typingId);
    appendMessage('bot', `<p class="text-accent">Error: ${error.message}</p>`);
  } finally {
    state.isProcessing = false;
    scrollToBottom();
  }
}

function appendMessage(role, htmlContent) {
  const div = document.createElement('div');
  if (role === 'user') {
    div.className = `self-end max-w-[85%] fade-in-up`;
    div.innerHTML = `<div class="bg-primary rounded-2xl rounded-tr-sm p-4 text-sm text-white shadow-sm">${htmlContent}</div>`;
  } else {
    div.className = `self-start max-w-[85%] fade-in-up`;
    div.innerHTML = `<div class="bg-surface border border-white/5 rounded-2xl rounded-tl-sm p-4 text-sm text-white shadow-sm relative overflow-hidden">
      <div class="absolute top-0 left-0 w-1 h-full bg-primary"></div>
      ${htmlContent}
    </div>`;
  }
  els.chatMessages.appendChild(div);
  return div.id = 'msg_' + Date.now();
}

function showTypingIndicator() {
  const id = 'typing_' + Date.now();
  const html = `
    <div id="${id}" class="self-start max-w-[85%] fade-in-up">
      <div class="bg-surface border border-white/5 rounded-2xl rounded-tl-sm p-4 text-sm shadow-sm relative overflow-hidden flex items-center gap-1.5 h-[50px]">
        <div class="absolute top-0 left-0 w-1 h-full bg-primary"></div>
        <div class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
        <div class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style="animation-delay: 150ms"></div>
        <div class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style="animation-delay: 300ms"></div>
      </div>
    </div>
  `;
  els.chatMessages.insertAdjacentHTML('beforeend', html);
  return id;
}

function removeMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function formatBotResponse(text) {
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\*\s+(.*)/gm, '<li>$1</li>')
    .replace(/^\d+\.\s+(.*)/gm, '<li>$1</li>')
    .split(/\n\n+/)
    .map(p => p.includes('<li>') ? `<ul class="list-disc list-inside mt-2 text-muted">${p}</ul>` : `<p class="mb-2 last:mb-0">${p}</p>`)
    .join('');
  html = html.replace(/<\/li>\n<li>/g, '</li><li>');
  return html;
}

function handleIntentActions(intent) {
  if (intent === 'TIMELINE') {
    appendMessage('bot', `<p class="mt-2 text-xs text-muted"><i>💡 Tip: Navigate to <strong>Election Timeline</strong> for details.</i></p>
      <button onclick="document.querySelector('[data-view=\\'timeline\\']').click()" class="mt-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg font-bold text-xs hover:bg-primary/20 transition-colors">Open Timeline</button>`);
  } else if (intent === 'BOOTH' || intent === 'VOTING') {
    appendMessage('bot', `<p class="mt-2 text-xs text-muted"><i>💡 Tip: Check <strong>Booth Locator</strong> for location details.</i></p>
      <button onclick="document.querySelector('[data-view=\\'locator\\']').click()" class="mt-2 px-4 py-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg font-bold text-xs hover:bg-secondary/20 transition-colors">Find Booth</button>`);
  } else if (intent === 'REGISTRATION') {
    appendMessage('bot', `<p class="mt-2 text-xs text-muted"><i>💡 Tip: See the <strong>Registration Guide</strong> for step-by-step help.</i></p>
      <button onclick="document.querySelector('[data-view=\\'registration\\']').click()" class="mt-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg font-bold text-xs hover:bg-primary/20 transition-colors">Open Registration Guide</button>`);
  }
}

// --- Render Logic (Wizard, Timeline, FAQ) ---

function renderWizard() {
  const stepData = wizardSteps[state.currentWizardStep - 1];
  const progressPercent = Math.round((state.currentWizardStep / state.totalWizardSteps) * 100);

  els.wizardStepLabel.textContent = `Phase ${state.currentWizardStep} of ${state.totalWizardSteps}`;
  els.wizardProgressText.textContent = `${progressPercent}%`;
  els.wizardProgressBar.style.width = `${progressPercent}%`;

  els.wizardContentArea.innerHTML = `
    <div class="w-full fade-in-up">
      <h3 class="font-headline font-bold text-2xl text-white mb-4">${stepData.title}</h3>
      <div class="text-white/80 text-sm leading-relaxed">${stepData.content}</div>
    </div>
  `;

  els.wizardPrevBtn.disabled = state.currentWizardStep === 1;
  if (state.currentWizardStep === state.totalWizardSteps) {
      els.wizardNextBtn.innerHTML = `Finish <span class="material-symbols-outlined text-[18px]">check_circle</span>`;
      els.wizardNextBtn.className = 'px-6 py-3 rounded-xl bg-secondary text-white font-bold hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 magnetic';
  } else {
      els.wizardNextBtn.innerHTML = `Continue <span class="material-symbols-outlined text-[18px]">arrow_forward</span>`;
      els.wizardNextBtn.className = 'px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all flex items-center gap-2 magnetic';
  }
}

function renderQuickStats() {
  if (!els.quickStatsArea || !ELECTION_DATA.quickStats) return;
  
  const fragment = document.createDocumentFragment();
  ELECTION_DATA.quickStats.forEach((stat, index) => {
    const div = document.createElement('div');
    div.className = "glass p-4 rounded-xl flex flex-col items-center justify-center text-center stagger-fade";
    div.style.animationDelay = `${index * 0.1}s`;
    div.innerHTML = `
      <span class="text-3xl mb-2">${stat.icon}</span>
      <span class="font-headline font-black text-2xl text-white tracking-tight">${stat.value}</span>
      <span class="text-[10px] text-muted font-bold uppercase tracking-wider mt-1">${stat.label}</span>
    `;
    fragment.appendChild(div);
  });
  els.quickStatsArea.innerHTML = '';
  els.quickStatsArea.appendChild(fragment);
}

function renderTimeline() {
  const fragment = document.createDocumentFragment();
  TIMELINE_DATA.phases.forEach((phase, index) => {
    const pointsHtml = phase.keyPoints.map(p => `<li>${p}</li>`).join('');
    const div = document.createElement('div');
    div.className = "timeline-entry relative pl-10 mb-10 stagger-fade";
    div.style.animationDelay = `${index * 0.08}s`;
    div.innerHTML = `
        <div class="timeline-dot absolute left-[-7px] top-6 w-3.5 h-3.5 rounded-full border-[3px] bg-background z-10" style="border-color: ${phase.color}; box-shadow: 0 0 10px ${phase.color}40;"></div>
        <div class="glass glass-hover rounded-2xl p-8" style="border-left: 3px solid ${phase.color}">
          <span class="inline-block px-3 py-1 rounded-md text-[11px] font-bold tracking-widest mb-4 uppercase" style="color: ${phase.color}; background: ${phase.color}15;">${phase.date}</span>
          <div class="flex items-center gap-4 mb-3">
            <span class="text-3xl">${phase.icon}</span>
            <h3 class="font-headline font-bold text-2xl text-white tracking-tight">${phase.title}</h3>
          </div>
          <p class="font-bold text-sm mb-4 tracking-wide uppercase" style="color: ${phase.color}">${phase.subtitle}</p>
          <p class="text-sm text-muted mb-5 leading-relaxed">${phase.details}</p>
          <ul class="list-disc list-inside text-sm text-muted mb-6 space-y-2 ml-2">${pointsHtml}</ul>
          <button class="px-5 py-2.5 rounded-xl border border-white/10 text-white text-xs font-bold hover:bg-white/5 transition-colors flex items-center gap-2" onclick="window.addToCalendar('${phase.title}', '${phase.subtitle}')">
            <span class="material-symbols-outlined text-[18px]">calendar_add_on</span> ADD REMINDER
          </button>
        </div>
    `;
    fragment.appendChild(div);
  });
  els.timelineArea.innerHTML = '';
  els.timelineArea.appendChild(fragment);
}

window.addToCalendar = async function(title, description) {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  showToast('Creating calendar event...');
  const result = await state.calendarService.createCalendarEvent(title, description, date);
  if (result.method === 'ics') showToast('Calendar file downloaded!');
  else if (result.eventLink) { showToast('Added to Google Calendar!'); window.open(result.eventLink, '_blank'); }
};

function renderFAQ(searchQuery = '') {
  const query = searchQuery.toLowerCase();
  const filteredFaqs = FAQ_DATA.filter(faq => 
    faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query) || faq.tags.some(tag => tag.toLowerCase().includes(query))
  );
  
  if (filteredFaqs.length === 0) {
    els.faqArea.innerHTML = `<p class="text-center text-muted p-8">No matching records found.</p>`;
    return;
  }
  
  const fragment = document.createDocumentFragment();
  filteredFaqs.forEach((faq, index) => {
    const div = document.createElement('div');
    div.className = "faq-card glass rounded-xl overflow-hidden stagger-fade";
    div.style.animationDelay = `${(index * 0.04).toFixed(2)}s`;
    div.innerHTML = `
        <div class="p-5 cursor-pointer flex justify-between items-center hover:bg-white/5 transition-colors" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.faq-icon').classList.toggle('rotate-180')">
          <span class="font-semibold text-white text-[15px]">${faq.question}</span>
          <div class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-muted faq-icon">expand_more</span>
          </div>
        </div>
        <div class="hidden p-5 pt-2 border-t border-white/5 bg-black/20">
          <p class="text-sm text-muted leading-relaxed">${faq.answer}</p>
          <div class="mt-4 flex gap-2 flex-wrap">
            ${faq.tags.map(t => `<span class="text-[10px] uppercase tracking-widest font-bold px-2 py-1 bg-white/5 border border-white/10 text-muted rounded-lg">#${t}</span>`).join('')}
          </div>
        </div>
    `;
    fragment.appendChild(div);
  });
  els.faqArea.innerHTML = '';
  els.faqArea.appendChild(fragment);
}

// --- Booth Locator ---
async function handleBoothSearch() {
  const address = els.locationInput.value.trim();
  if (!address) return;
  if (!state.mapsService) {
    showToast('Maps API Key required', true);
    return;
  }
  
  const originalText = els.searchBoothBtn.innerHTML;
  els.searchBoothBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-xl">refresh</span>';
  els.searchBoothBtn.disabled = true;
  
  const boothList = document.getElementById('booth-list');
  boothList.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-secondary space-y-4 fade-in-up">
    <span class="material-symbols-outlined text-4xl animate-spin">radar</span>
    <p class="text-xs font-bold uppercase tracking-widest">Locating Stations...</p>
  </div>`;
  
  try {
    const booths = await state.mapsService.findNearbyBoothsText(address);
    showToast(`Found ${booths.length} stations`);
    
    let html = '';
    booths.forEach((booth, i) => {
      html += `
        <div class="booth-card glass rounded-xl p-5 cursor-pointer group flex gap-4 border border-white/5" onclick="window.focusBooth(${i})">
          <div class="w-10 h-10 rounded-lg bg-secondary/10 text-secondary font-black flex items-center justify-center text-lg shrink-0">${i+1}</div>
          <div class="flex-1">
            <h4 class="font-bold text-white text-[15px] mb-1 group-hover:text-secondary transition-colors tracking-tight">${booth.name}</h4>
            <p class="text-xs text-muted mb-3 leading-relaxed">${booth.address}</p>
            <div class="flex justify-between items-center">
              <span class="text-[10px] font-bold tracking-widest text-secondary bg-secondary/10 px-2 py-1 rounded-md border border-secondary/20">${booth.distance.toFixed(1)} KM AWAY</span>
            </div>
          </div>
        </div>
      `;
    });
    boothList.innerHTML = html;
  } catch (error) {
    showToast(error.message, true);
    boothList.innerHTML = `<div class="text-accent text-center mt-10 text-sm font-medium px-4">${error.message}</div>`;
  } finally {
    els.searchBoothBtn.innerHTML = originalText;
    els.searchBoothBtn.disabled = false;
  }
}

window.focusBooth = function(index) {
  if (state.mapsService && state.mapsService.markers[index]) {
    state.mapsService.map.setCenter(state.mapsService.markers[index].getPosition());
    state.mapsService.map.setZoom(16);
    google.maps.event.trigger(state.mapsService.markers[index], 'click');
  }
};

// --- Utils ---
let toastTimeout;
function showToast(message, isError = false) {
  if(els.toastMsg) els.toastMsg.textContent = message;
  
  const icon = els.toast.querySelector('.material-symbols-outlined');
  if (isError) {
    icon.textContent = 'error';
    icon.classList.replace('text-secondary', 'text-accent');
  } else {
    icon.textContent = 'check_circle';
    icon.classList.replace('text-accent', 'text-secondary');
  }
  
  els.toast.classList.remove('opacity-0', 'translate-y-[150%]');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    els.toast.classList.add('opacity-0', 'translate-y-[150%]');
  }, 4000);
}

// --- Animations & UI Interactions ---
function initAnimations() {
  // Intersection Observer for scroll reveals
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // 3D Tilt Effect
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg
      const rotateY = ((x - centerX) / centerX) * 10;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });

  // Magnetic Buttons
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0px, 0px)';
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
