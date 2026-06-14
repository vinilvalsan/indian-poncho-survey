// Flow engine: welcome → questions (one at a time, with branching) →
// contact capture → thank-you. Vanilla JS, no build step.

const AUTO_ADVANCE_DELAY_MS = 280;
const MIN_STORY_LENGTH = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INDIAN_PHONE_PATTERN = /^(\+?91)?[6-9]\d{9}$/;

const surveyState = {
  answers: {},
  stepIndex: -1, // -1 = welcome screen
  startedAt: null,
};

const screenEl = document.getElementById("screen");
const progressTrack = document.getElementById("progress-track");
const progressFill = document.getElementById("progress-fill");

// ── Helpers ──────────────────────────────────────────────────────────

function visibleQuestions() {
  return SURVEY_QUESTIONS.filter(
    (q) => !q.showIf || q.showIf(surveyState.answers)
  );
}

function totalSteps() {
  return visibleQuestions().length + 1; // +1 for the contact screen
}

function updateProgress() {
  if (surveyState.stepIndex < 0) {
    progressTrack.hidden = true;
    return;
  }
  progressTrack.hidden = false;
  const pct = Math.min(100, (surveyState.stepIndex / totalSteps()) * 100);
  progressFill.style.width = pct + "%";
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setScreen(...children) {
  screenEl.replaceChildren(...children);
  updateProgress();
  window.scrollTo({ top: 0 });
}

function sourceTag() {
  const params = new URLSearchParams(window.location.search);
  return params.get("src") || "direct";
}

// ── Screens ──────────────────────────────────────────────────────────

function renderWelcome() {
  surveyState.stepIndex = -1;

  const card = el("div", "card");
  card.append(
    el("div", "hero-mark", "🌧️"),
    el("h1", "hero-title card-title", "The Great Indian Monsoon Survey"),
    el(
      "p",
      "hero-sub",
      "3 minutes. We're studying how India actually deals with rain. " +
        "There are no right answers — tell us what you really do, not what sounds good. " +
        "There's a small thank-you at the end."
    )
  );
  card.querySelector(".hero-title").classList.add("question-title-hero");

  const startBtn = el("button", "btn-primary", "Start →");
  startBtn.addEventListener("click", () => {
    surveyState.startedAt = new Date().toISOString();
    goToStep(0);
  });
  card.append(startBtn);
  card.append(el("p", "meta-line", "NO LOGIN · NO SPAM · ~3 MIN"));
  setScreen(card);
}

function goToStep(index) {
  const questions = visibleQuestions();
  surveyState.stepIndex = index;

  if (index < 0) return renderWelcome();
  if (index < questions.length) return renderQuestion(questions[index], index);
  return renderContact();
}

function renderQuestion(question, index) {
  const card = el("div", "card");
  card.append(el("div", "kicker", question.section));
  card.append(el("h1", "question-title", question.title));
  if (question.hint) card.append(el("p", "question-hint", question.hint));

  if (question.type === "textarea") {
    renderTextarea(card, question, index);
  } else {
    renderOptions(card, question, index);
  }

  const nav = el("div", "nav-row");
  const backBtn = el("button", "btn-ghost", "← Back");
  backBtn.addEventListener("click", () => goToStep(index - 1));
  nav.append(backBtn);
  nav.append(
    el(
      "span",
      "step-counter",
      String(index + 1).padStart(2, "0") + " / " + totalSteps()
    )
  );
  card.append(nav);
  setScreen(card);
}

function renderOptions(card, question, index) {
  const isMulti = question.type === "multi";
  const wrap = el("div", "options" + (question.layout === "grid" ? " grid" : ""));
  const selected = new Set(
    isMulti ? surveyState.answers[question.id] || [] : []
  );

  question.options.forEach((option, i) => {
    const btn = el("button", "option-btn");
    const key = el("span", "option-key", String(i + 1));
    btn.append(key, document.createTextNode(option));

    const isCurrentSingle =
      !isMulti && surveyState.answers[question.id] === option;
    if (isCurrentSingle || selected.has(option)) btn.classList.add("selected");

    btn.addEventListener("click", () => {
      if (isMulti) {
        toggleMultiOption(btn, option, selected, question, card);
      } else {
        chooseSingleOption(btn, option, question, index, wrap, card);
      }
    });
    wrap.append(btn);
  });

  card.append(wrap);

  if (isMulti) {
    const error = el("p", "field-error", "");
    error.dataset.role = "multi-error";
    const continueBtn = el("button", "btn-primary", "Continue →");
    continueBtn.style.marginTop = "20px";
    continueBtn.addEventListener("click", () => {
      const picks = Array.from(selected);
      const validationError = validateMulti(question, picks);
      if (validationError) {
        error.textContent = validationError;
        return;
      }
      surveyState.answers[question.id] = picks;
      goToStep(index + 1);
    });
    card.append(error, continueBtn);
  }
}

function chooseSingleOption(btn, option, question, index, wrap, card) {
  wrap.querySelectorAll(".option-btn").forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");

  const needsOtherText =
    question.otherOption && option === question.otherOption;

  if (needsOtherText) {
    showOtherInput(card, question, index);
    return;
  }

  surveyState.answers[question.id] = option;
  delete surveyState.answers[question.id + "_other"];
  window.setTimeout(() => goToStep(index + 1), AUTO_ADVANCE_DELAY_MS);
}

function showOtherInput(card, question, index) {
  if (card.querySelector(".other-input-wrap")) return;

  const wrap = el("div", "other-input-wrap");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Which state?";
  input.maxLength = 60;

  const confirmBtn = el("button", "btn-primary", "Continue →");
  confirmBtn.style.marginTop = "10px";
  confirmBtn.addEventListener("click", () => {
    surveyState.answers[question.id] = question.otherOption;
    surveyState.answers[question.id + "_other"] = input.value.trim();
    goToStep(index + 1);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmBtn.click();
  });

  wrap.append(input, confirmBtn);
  card.querySelector(".options").after(wrap);
  input.focus();
}

function toggleMultiOption(btn, option, selected, question, card) {
  const max = question.exactSelect || question.maxSelect;
  if (selected.has(option)) {
    selected.delete(option);
    btn.classList.remove("selected");
  } else {
    if (max && selected.size >= max) {
      const error = card.querySelector('[data-role="multi-error"]');
      if (error) error.textContent = "Only " + max + " picks — unselect one first.";
      return;
    }
    selected.add(option);
    btn.classList.add("selected");
  }
  const error = card.querySelector('[data-role="multi-error"]');
  if (error) error.textContent = "";
}

function validateMulti(question, picks) {
  if (question.exactSelect && picks.length !== question.exactSelect) {
    return "Pick exactly " + question.exactSelect + " — that's the hard part.";
  }
  if (question.minSelect && picks.length < question.minSelect) {
    return "Pick at least " + question.minSelect + ".";
  }
  return "";
}

function renderTextarea(card, question, index) {
  const textarea = document.createElement("textarea");
  textarea.placeholder = question.placeholder || "";
  textarea.value = surveyState.answers[question.id] || "";

  const error = el("p", "field-error", "");
  const continueBtn = el("button", "btn-primary", "Continue →");
  continueBtn.style.marginTop = "16px";
  continueBtn.addEventListener("click", () => {
    const value = textarea.value.trim();
    if (question.required && value.length < MIN_STORY_LENGTH) {
      error.textContent = "A line or two, honestly — it really is the most useful answer.";
      return;
    }
    surveyState.answers[question.id] = value;
    goToStep(index + 1);
  });

  card.append(textarea, error, continueBtn);
  window.setTimeout(() => textarea.focus(), 350);
}

// ── Contact capture ──────────────────────────────────────────────────

function renderContact() {
  const card = el("div", "card");
  card.append(el("div", "kicker", "One last thing — optional"));
  card.append(
    el(
      "h1",
      "question-title",
      "We're building performance rainwear engineered for Indian monsoon AND Indian heat — launching around ₹1,500–3,000."
    )
  );
  card.append(
    el(
      "p",
      "question-hint",
      "Want early access and a launch discount? Leave either one — or skip."
    )
  );

  const emailLabel = el("label", "field-label", "Email");
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.placeholder = "you@example.com";
  emailInput.autocomplete = "email";

  const phoneLabel = el("label", "field-label", "WhatsApp number");
  const phoneInput = document.createElement("input");
  phoneInput.type = "tel";
  phoneInput.placeholder = "+91 98XXXXXXXX";
  phoneInput.autocomplete = "tel";

  // Honeypot: hidden from humans; bots that fill it get silently dropped.
  const honeypot = document.createElement("input");
  honeypot.type = "text";
  honeypot.name = "website";
  honeypot.className = "hp-field";
  honeypot.tabIndex = -1;
  honeypot.autocomplete = "off";

  const error = el("p", "field-error", "");

  const nav = el("div", "nav-row");
  const submitBtn = el("button", "btn-primary", "Finish ✓");
  const skipBtn = el("button", "btn-ghost", "Skip & finish");

  submitBtn.addEventListener("click", () =>
    finishSurvey({ emailInput, phoneInput, honeypot, error, submitBtn, skipBtn })
  );
  skipBtn.addEventListener("click", () => {
    emailInput.value = "";
    phoneInput.value = "";
    finishSurvey({ emailInput, phoneInput, honeypot, error, submitBtn, skipBtn });
  });

  nav.append(skipBtn, submitBtn);
  card.append(
    emailLabel,
    emailInput,
    phoneLabel,
    phoneInput,
    honeypot,
    error,
    el(
      "p",
      "privacy-note",
      "We'll only use this to share early access. No spam, no sharing with anyone else."
    ),
    nav
  );
  setScreen(card);
}

function validateContact(email, phone) {
  if (email && !EMAIL_PATTERN.test(email)) {
    return "That email doesn't look right — mind checking it?";
  }
  if (phone) {
    const digits = phone.replace(/[\s-]/g, "");
    if (!INDIAN_PHONE_PATTERN.test(digits)) {
      return "That number doesn't look like an Indian mobile — 10 digits starting 6–9.";
    }
  }
  return "";
}

async function finishSurvey(ui) {
  const email = ui.emailInput.value.trim();
  const phone = ui.phoneInput.value.trim();

  const validationError = validateContact(email, phone);
  if (validationError) {
    ui.error.textContent = validationError;
    return;
  }

  ui.submitBtn.disabled = true;
  ui.skipBtn.disabled = true;
  ui.submitBtn.textContent = "Saving…";

  const isBot = Boolean(ui.honeypot.value);
  const payload = {
    answers: surveyState.answers,
    email: email || null,
    phone: phone || null,
    source: sourceTag(),
    user_agent: navigator.userAgent.slice(0, 250),
    started_at: surveyState.startedAt,
  };

  const result = isBot ? { saved: "skipped-bot" } : await submitResponse(payload);
  console.info("[survey] submission result:", result.saved);
  renderThankYou(Boolean(email || phone));
}

function renderThankYou(leftContact) {
  surveyState.stepIndex = totalSteps();
  progressFill.style.width = "100%";

  const card = el("div", "card");
  card.append(
    el("div", "hero-mark", "🙏"),
    el("h1", "hero-title", "Thanks — this genuinely helps."),
    el(
      "p",
      "hero-sub",
      leftContact
        ? "You'll hear from us before anyone else does."
        : "If you know someone who battles the monsoon daily, send this their way."
    )
  );

  const shareBtn = el("button", "btn-primary", "Share with a friend");
  shareBtn.addEventListener("click", async () => {
    const shareUrl = window.location.origin + window.location.pathname + "?src=shared";
    try {
      if (navigator.share) {
        await navigator.share({
          title: "The Great Indian Monsoon Survey",
          text: "3 minutes — help build rainwear actually made for India.",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        shareBtn.textContent = "Link copied ✓";
      }
    } catch (err) {
      console.warn("[survey] share cancelled or failed:", err);
    }
  });

  card.append(shareBtn);
  card.append(el("p", "meta-line", "THE INDIAN PONCHO CO. · MONSOON 2026"));
  setScreen(card);
}

// ── Keyboard shortcuts (desktop nicety) ──────────────────────────────

document.addEventListener("keydown", (event) => {
  if (event.target.matches("textarea, input")) return;
  const digit = Number(event.key);
  if (!Number.isInteger(digit) || digit < 1 || digit > 9) return;
  const buttons = screenEl.querySelectorAll(".option-btn");
  if (buttons[digit - 1]) buttons[digit - 1].click();
});

renderWelcome();
