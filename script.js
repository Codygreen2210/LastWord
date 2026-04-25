// Last Word — frontend logic

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  conversation: $("#conversation"),
  screenshot: $("#screenshot"),
  screenshotPreview: $("#screenshot-preview"),
  generate: $("#generate"),
  reset: $("#reset"),
  results: $("#results"),
  loading: $("#loading"),
  composer: $(".composer"),
  error: $("#error"),
  chips: $$(".chip"),
};

let selectedContext = null;
let imageDataUrl = null;

// ---- Chip selector ----
els.chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const ctx = chip.dataset.context;
    if (selectedContext === ctx) {
      // toggle off
      chip.classList.remove("active");
      selectedContext = null;
    } else {
      els.chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      selectedContext = ctx;
    }
  });
});

// ---- Screenshot upload ----
els.screenshot.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 8 * 1024 * 1024) {
    showError("Image too big — keep it under 8MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (evt) => {
    imageDataUrl = evt.target.result;
    renderPreview(file.name);
  };
  reader.readAsDataURL(file);
});

function renderPreview(filename) {
  els.screenshotPreview.innerHTML = `
    <img src="${imageDataUrl}" alt="screenshot preview" />
    <span>${escapeHtml(filename)}</span>
    <button type="button" id="remove-screenshot">remove</button>
  `;
  els.screenshotPreview.classList.add("shown");
  $("#remove-screenshot").addEventListener("click", clearScreenshot);
}

function clearScreenshot() {
  imageDataUrl = null;
  els.screenshot.value = "";
  els.screenshotPreview.innerHTML = "";
  els.screenshotPreview.classList.remove("shown");
}

// ---- Generate ----
els.generate.addEventListener("click", async () => {
  hideError();
  const text = els.conversation.value.trim();

  if (!text && !imageDataUrl) {
    showError("Paste the text fight or upload a screenshot.");
    return;
  }

  setLoading(true);

  try {
    const payload = {
      conversation: text || null,
      context: selectedContext,
      image: imageDataUrl,
    };

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Server returned ${res.status}`);
    }

    const replies = await res.json();

    if (!replies.savage || !replies.mature || !replies.petty) {
      throw new Error("AI returned an incomplete verdict — try again.");
    }

    renderResults(replies);
  } catch (err) {
    console.error(err);
    showError(err.message || "Something went sideways. Try again.");
    setLoading(false);
  }
});

function setLoading(loading) {
  els.generate.disabled = loading;
  if (loading) {
    els.loading.classList.remove("hidden");
    els.results.classList.add("hidden");
    // smooth scroll to loading
    setTimeout(() => {
      els.loading.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  } else {
    els.loading.classList.add("hidden");
  }
}

function renderResults(replies) {
  setLoading(false);

  $$('.reply-card').forEach((card) => {
    const tone = card.dataset.tone;
    const textEl = card.querySelector(".reply-text");
    textEl.textContent = replies[tone];
  });

  els.results.classList.remove("hidden");

  // wire up copy + share for each card
  $$(".action.copy").forEach((btn) => {
    btn.onclick = () => {
      const text = btn
        .closest(".reply-card")
        .querySelector(".reply-text").textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.classList.add("copied");
        const original = btn.textContent;
        btn.textContent = "Copied ✓";
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.textContent = original;
        }, 1600);
      });
    };
  });

  $$(".action.share").forEach((btn) => {
    btn.onclick = async () => {
      const card = btn.closest(".reply-card");
      const tone = card.dataset.tone;
      const text = card.querySelector(".reply-text").textContent;
      const shareData = {
        title: "Last Word",
        text: `${tone.toUpperCase()}: "${text}"\n\nvia Last Word`,
        url: window.location.origin,
      };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(
            `${shareData.text}\n${shareData.url}`,
          );
          btn.textContent = "Copied to share";
          setTimeout(() => (btn.textContent = "Share"), 1600);
        }
      } catch (e) {
        /* user cancelled */
      }
    };
  });

  setTimeout(() => {
    els.results.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}

els.reset.addEventListener("click", () => {
  els.conversation.value = "";
  clearScreenshot();
  els.chips.forEach((c) => c.classList.remove("active"));
  selectedContext = null;
  els.results.classList.add("hidden");
  hideError();
  els.composer.scrollIntoView({ behavior: "smooth", block: "start" });
});

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
}
function hideError() {
  els.error.hidden = true;
  els.error.textContent = "";
}

function escapeHtml(s) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}
