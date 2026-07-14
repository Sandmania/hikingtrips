export function showError(err) {
  document.dispatchEvent(new CustomEvent('show-error', {
    detail: { message: err?.message || String(err) }
  }));
}
