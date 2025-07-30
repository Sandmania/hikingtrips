class PhotoGallery extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.photosPath = this.getAttribute('photos-path') || './photos';
    this.thumbsPath = `${this.photosPath}/thumbs`;
    this.images = [];
    this.currentIndex = -1;
  }

  connectedCallback() {
    this.renderSkeleton();
    this.loadImages().then(() => {
      this.renderGallery();
      this.setupEvents();
      this.checkInitialHash();
    });
  }

  renderSkeleton() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="../assets/components/gallery/gallery.css">
      <div class="gallery"></div>
      <div class="modal" id="modal">
        <div class="nav left" id="prev">&lt;</div>
        <img id="modal-img" src="" alt="">
        <div class="nav right" id="next">&gt;</div>
      </div>
    `;
  }

  async loadImages() {
    try {
      const [thumbs, full] = await Promise.all([
        fetch(`${this.thumbsPath}/`).then(r => r.text()),
        fetch(`${this.photosPath}/`).then(r => r.text()),
      ]);

      const parseFilenames = html => {
        const matches = [...html.matchAll(/href="([^"]+\.jpeg)"/gi)];
        return matches.map(m => m[1]);
      };

      const thumbsFiles = parseFilenames(thumbs);
      const fullFiles = parseFilenames(full);
      const matched = thumbsFiles.filter(name => fullFiles.includes(name));

      this.images = matched.map(name => ({
        name,
        thumb: `${this.thumbsPath}/${name}`,
        full: `${this.photosPath}/${name}`,
      }));
    } catch (err) {
      console.error('Error loading image list:', err);
      this.shadowRoot.querySelector('.gallery').innerHTML = `<p>Error loading gallery.</p>`;
    }
  }

  renderGallery() {
    const gallery = this.shadowRoot.querySelector('.gallery');
    gallery.innerHTML = this.images.map((img, i) => `
      <img src="${img.thumb}" 
           data-full="${img.full}" 
           data-index="${i}" 
           data-name="${img.name}" 
           alt="${img.name}">
    `).join('');
  }

  setupEvents() {
    this.setupHashEvents();
    this.setupNavigationEvents();
    this.setupSwipeEvents();
    this.setupEscEvent();
  }

  setupNavigationEvents() {
    const modal = this.shadowRoot.getElementById('modal');
    const images = Array.from(this.shadowRoot.querySelectorAll('.gallery img'));
    images.forEach((img, i) => {
      img.addEventListener('click', () => this.showModal(i));
    });
    this.shadowRoot.getElementById('prev').addEventListener('click', e => {
      e.stopPropagation();
      this.navigate(-1);
    });
    this.shadowRoot.getElementById('next').addEventListener('click', e => {
      e.stopPropagation();
      this.navigate(1);
    });
    modal.addEventListener('click', () => this.hideModal());
  }

  setupSwipeEvents() {
    const modal = this.shadowRoot.getElementById('modal');
    let touchX = 0;
    modal.addEventListener('touchstart', e => {
      touchX = e.changedTouches[0].screenX;
    });
    modal.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].screenX - touchX;
      if (dx > 50) this.navigate(-1);
      else if (dx < -50) this.navigate(1);
    });
  }

  setupHashEvents() {
    window.addEventListener('hashchange', () => this.checkInitialHash());
  }

  setupEscEvent() {
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.shadowRoot.getElementById('modal').classList.contains('show')) {
        this.hideModal();
      }
    });
  }

  navigate(offset) {
    const newIndex = (this.currentIndex + offset + this.images.length) % this.images.length;
    this.showModal(newIndex);
  }

  showModal(index, push = true) {
    if (index < 0 || index >= this.images.length) return;
    this.currentIndex = index;
    const modal = this.shadowRoot.getElementById('modal');
    const modalImg = this.shadowRoot.getElementById('modal-img');
    const img = this.images[index];

    modalImg.src = img.full;
    modal.classList.add('show');
    document.body.classList.add('no-scroll');

    if (push) {
      history.pushState(null, '', `#!${encodeURIComponent(img.name)}`);
    }
  }

  hideModal(push = true) {
    const modal = this.shadowRoot.getElementById('modal');
    modal.classList.remove('show');
    const modalImg = this.shadowRoot.getElementById('modal-img');
    modalImg.src = '';
    document.body.classList.remove('no-scroll');
    this.currentIndex = -1;

    if (push) {
      history.replaceState(null, '', location.pathname);
    }
  }
  checkInitialHash() {
    if (!this.images.length) return;

    const hash = location.hash;
    if (hash.startsWith('#!')) {
      const name = decodeURIComponent(hash.slice(2));
      const index = this.images.findIndex(img => img.name === name);
      if (index !== -1) {
        this.showModal(index, false); // Show modal without pushing history
        return;
      }
    }

    // If hash is empty or invalid, close the modal
    this.hideModal(false);
  }
}

customElements.define('photo-gallery', PhotoGallery);