class ErrorToast extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._queue = [];
        this._showing = false;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: none;
                    position: fixed;
                    bottom: 1rem;
                    right: 1rem;
                    background: #f44336;
                    color: white;
                    padding: 1rem;
                    border-radius: 4px;
                    z-index: 9999;
                }
                :host(.visible) {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                button {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 1rem;
                    padding: 0;
                    line-height: 1;
                }
            </style>
            <span id="message"></span>
            <button id="dismiss">✖</button>
        `;
    }

    connectedCallback() {
        this._onDismiss = () => {
            this._hide();
            this._showNext();
        };
        this._onShowError = (e) => {
            this._queue.push(e.detail.message);
            this._showNext();
        };
        this.shadowRoot.getElementById('dismiss').addEventListener('click', this._onDismiss);
        document.addEventListener('show-error', this._onShowError);
    }

    disconnectedCallback() {
        this.shadowRoot.getElementById('dismiss').removeEventListener('click', this._onDismiss);
        document.removeEventListener('show-error', this._onShowError);
    }

    _showNext() {
        if (this._showing || this._queue.length === 0) return;
        this._showing = true;
        this.shadowRoot.getElementById('message').textContent = this._queue.shift();
        this.classList.add('visible');
    }

    _hide() {
        this._showing = false;
        this.classList.remove('visible');
    }
}

customElements.define('error-toast', ErrorToast);
