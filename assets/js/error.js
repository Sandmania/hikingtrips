const toast = document.getElementById("errorToast");
const toastText = document.getElementById("toastText");
const dismiss = document.getElementById("dismissToast");

const errorQueue = [];
let showing = false;

export function showError(err) {
  errorQueue.push(err);
  showNextError();
}

function showNextError() {
  if (showing || errorQueue.length === 0) return;

  showing = true;
  const err = errorQueue.shift();
  toastText.textContent = err?.message || String(err);
  toast.hidden = false;
}

dismiss.onclick = () => {
  toast.hidden = true;
  showing = false;
  showNextError();
};