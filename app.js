const imageInput = document.querySelector('#image-input');
const avatar = document.querySelector('#avatar');
const placeholder = document.querySelector('#placeholder');
const imageStatus = document.querySelector('#image-status');
const removeButton = document.querySelector('#remove-button');
let currentImageUrl;
let selectionVersion = 0;

document.querySelector('#upload-button').addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', async () => {
  const file = imageInput.files[0];
  imageInput.value = '';
  if (!file) return;

  const version = ++selectionVersion;
  const url = URL.createObjectURL(file);
  const preview = new Image();
  preview.src = url;
  try {
    await preview.decode();
  } catch {
    URL.revokeObjectURL(url);
    if (version === selectionVersion) {
      imageStatus.textContent = 'تعذّر عرض الملف. اختر صورة صالحة مثل PNG أو JPEG.';
    }
    return;
  }

  if (version !== selectionVersion) {
    URL.revokeObjectURL(url);
    return;
  }

  if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
  currentImageUrl = url;
  avatar.src = url;
  avatar.hidden = false;
  placeholder.hidden = true;
  removeButton.hidden = false;
  imageStatus.textContent = 'تم عرض الصورة من جهازك.';
});

removeButton.addEventListener('click', () => {
  selectionVersion++;
  avatar.hidden = true;
  avatar.removeAttribute('src');
  URL.revokeObjectURL(currentImageUrl);
  currentImageUrl = undefined;
  placeholder.hidden = false;
  removeButton.hidden = true;
  imageStatus.textContent = 'اختر صورة من جهازك.';
  document.querySelector('#upload-button').focus();
});

const form = document.querySelector('#chat-form');
const messageInput = document.querySelector('#message-input');
const messages = document.querySelector('#messages');
const emptyChat = document.querySelector('#empty-chat');
const clearButton = document.querySelector('#clear-button');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = messageInput.value.trim();
  if (!value) return;

  const message = document.createElement('p');
  message.className = 'message';
  message.dir = 'auto';
  message.textContent = value;
  emptyChat.hidden = true;
  messages.append(message);
  messages.scrollTop = messages.scrollHeight;
  clearButton.disabled = false;
  messageInput.value = '';
  messageInput.focus();
});

clearButton.addEventListener('click', () => {
  messages.replaceChildren(emptyChat);
  emptyChat.hidden = false;
  clearButton.disabled = true;
  messageInput.focus();
});

document.querySelector('#mic-button').addEventListener('click', () => {
  document.querySelector('#voice-status').textContent =
    'زر المايك جاهز للربط. التسجيل والمحادثة الصوتية غير مفعّلين حاليًا.';
});

const speakButton = document.querySelector('#speak-button');
const stopSpeechButton = document.querySelector('#stop-speech-button');
const speechStatus = document.querySelector('#speech-status');
const avatarStage = document.querySelector('#avatar-stage');
const motionButton = document.querySelector('#motion-button');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const synthesis = window.speechSynthesis;
const Utterance = window.SpeechSynthesisUtterance;
const speechHint = speechStatus.textContent;
const noArabicVoice = 'لا يوجد صوت عربي متاح في المتصفح. تحقّق من أصوات النطق في إعدادات جهازك ثم حاول مجددًا.';
let activeSpeech = null;

function setMotion(enabled) {
  avatarStage.dataset.motion = enabled ? 'on' : 'off';
  motionButton.setAttribute('aria-pressed', String(enabled));
}

setMotion(!reducedMotion.matches);
motionButton.addEventListener('click', () => {
  setMotion(avatarStage.dataset.motion !== 'on');
});

function getArabicVoice() {
  return synthesis.getVoices().find((voice) => /^ar(?:[-_]|$)/i.test(voice.lang));
}

function finishSpeech(status) {
  activeSpeech = null;
  avatarStage.classList.remove('is-speaking');
  speakButton.disabled = false;
  stopSpeechButton.disabled = true;
  speechStatus.textContent = status;
}

if (!synthesis || typeof Utterance !== 'function') {
  speakButton.disabled = true;
  speechStatus.textContent = 'هذا المتصفح لا يدعم تحويل النص إلى كلام.';
} else {
  function updateVoiceStatus() {
    if (!activeSpeech) {
      speechStatus.textContent = getArabicVoice() ? speechHint : noArabicVoice;
    }
  }

  synthesis.addEventListener('voiceschanged', updateVoiceStatus);
  updateVoiceStatus();

  speakButton.addEventListener('click', () => {
    const voice = getArabicVoice();
    if (!voice) {
      speechStatus.textContent = noArabicVoice;
      return;
    }

    const text = messageInput.value.trim();
    if (!text) {
      speechStatus.textContent = 'اكتب رسالة أولًا لسماعها.';
      messageInput.focus();
      return;
    }

    const utterance = new Utterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang.replace(/_/g, '-');
    utterance.onstart = () => {
      if (activeSpeech !== utterance) return;
      avatarStage.classList.add('is-speaking');
      speechStatus.textContent = 'الشخصية تتكلم';
    };
    utterance.onend = () => {
      if (activeSpeech === utterance) finishSpeech('انتهى الكلام.');
    };
    utterance.onerror = (event) => {
      if (activeSpeech !== utterance) return;
      const voiceUnavailable = ['language-unavailable', 'voice-unavailable'].includes(event.error);
      finishSpeech(voiceUnavailable ? noArabicVoice : 'تعذّر تشغيل الصوت. حاول مجددًا.');
    };

    activeSpeech = utterance;
    speakButton.disabled = true;
    stopSpeechButton.disabled = false;
    speechStatus.textContent = 'جارٍ بدء النطق…';
    try {
      synthesis.speak(utterance);
    } catch {
      finishSpeech('تعذّر تشغيل الصوت. حاول مجددًا.');
    }
  });

  stopSpeechButton.addEventListener('click', () => {
    if (!activeSpeech) return;
    finishSpeech('تم إيقاف الكلام.');
    synthesis.cancel();
    speakButton.focus();
  });
}
