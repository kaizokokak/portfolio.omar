// ============================================
// PORTFOLIO — Script
// ============================================

// Smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';

document.addEventListener('DOMContentLoaded', () => {

    // --- Year auto-update ---
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // --- Dark Mode Toggle ---
    const toggle = document.getElementById('themeToggle');
    const sunIcon = toggle?.querySelector('.sun-icon');
    const moonIcon = toggle?.querySelector('.moon-icon');
    const root = document.documentElement;
    const metaTheme = document.querySelector('meta[name="theme-color"]');

    function setTheme(dark) {
        root.classList.toggle('dark', dark);
        if (sunIcon && moonIcon) {
            sunIcon.style.display = dark ? 'none' : '';
            moonIcon.style.display = dark ? '' : 'none';
        }
        if (metaTheme) {
            metaTheme.content = dark ? '#121212' : '#EDEAE4';
        }
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }

    // Check saved preference or system preference
    const saved = localStorage.getItem('theme');
    if (saved) {
        setTheme(saved === 'dark');
    } else {
        setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    if (toggle) {
        toggle.addEventListener('click', () => {
            setTheme(!root.classList.contains('dark'));
        });
    }

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches);
        }
    });

    // --- Scroll-Triggered Reveal Animations ---
    const cards = document.querySelectorAll('.anim-card');

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });

        cards.forEach(card => observer.observe(card));
    } else {
        // Fallback: reveal all immediately
        cards.forEach(card => card.classList.add('revealed'));
    }

});

// ============================================
// PROJECT MODAL
// ============================================
function openProjectModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeProjectModal(event) {
    // If called from overlay click, only close if clicking the overlay itself
    if (event && event.target !== event.currentTarget) return;

    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeProjectModal();
        closeAlbumModal();
    }
});

// ============================================
// ALBUM LIGHTBOX MODAL
// ============================================
let albumCurrentIndex = 0;

function getAlbumImages() {
    return Array.from(document.querySelectorAll('#albumGrid .album-item img')).map(img => img.src);
}

function openAlbumModal(index) {
    const images = getAlbumImages();
    if (index < 0 || index >= images.length) return;
    albumCurrentIndex = index;
    updateAlbumModal();
    const modal = document.getElementById('albumModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeAlbumModal() {
    const modal = document.getElementById('albumModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function albumNavigate(dir) {
    const images = getAlbumImages();
    albumCurrentIndex = (albumCurrentIndex + dir + images.length) % images.length;
    updateAlbumModal();
}

function updateAlbumModal() {
    const images = getAlbumImages();
    const img = document.getElementById('albumModalImg');
    const counter = document.getElementById('albumCounter');
    const download = document.getElementById('albumDownload');
    if (img) img.src = images[albumCurrentIndex];
    if (counter) counter.textContent = `${albumCurrentIndex + 1} / ${images.length}`;
    if (download) download.href = images[albumCurrentIndex];
}

// Create an album item element from a data URL
function createAlbumItem(src) {
    const grid = document.getElementById('albumGrid');
    if (!grid) return;
    const item = document.createElement('div');
    item.className = 'album-item';
    item.innerHTML = `
        <img src="${src}" alt="Album Photo" loading="lazy">
        <div class="album-item-overlay">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
        </div>
        <button class="album-delete-btn" onclick="deleteAlbumItem(event, this)" aria-label="Delete photo">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    `;
    item.addEventListener('click', (e) => {
        if (e.target.closest('.album-delete-btn')) return;
        const items = Array.from(grid.querySelectorAll('.album-item'));
        openAlbumModal(items.indexOf(item));
    });
    grid.appendChild(item);
}

// Save current album state to localStorage
function saveAlbumToStorage() {
    const images = Array.from(document.querySelectorAll('#albumGrid .album-item img')).map(img => img.src);
    try {
        localStorage.setItem('albumPhotos', JSON.stringify(images));
    } catch (e) {
        console.warn('Album storage full, could not save.');
    }
}

// Load saved album photos from localStorage
function loadAlbumFromStorage() {
    try {
        const saved = JSON.parse(localStorage.getItem('albumPhotos') || '[]');
        saved.forEach(src => createAlbumItem(src));
    } catch (e) {
        console.warn('Could not load album from storage.');
    }
}

// Delete album photo
function deleteAlbumItem(event, btn) {
    event.stopPropagation();
    const item = btn.closest('.album-item');
    if (!item) return;
    item.style.transform = 'scale(0.8)';
    item.style.opacity = '0';
    setTimeout(() => {
        item.remove();
        saveAlbumToStorage();
    }, 250);
}

// Close album modal on overlay click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('albumModal');
    if (e.target === modal) closeAlbumModal();
});

// Keyboard navigation for album
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('albumModal');
    if (!modal || !modal.classList.contains('active')) return;
    if (e.key === 'ArrowLeft') albumNavigate(-1);
    if (e.key === 'ArrowRight') albumNavigate(1);
});

// Upload photos & load saved ones on page ready
document.addEventListener('DOMContentLoaded', () => {
    // Load saved photos
    loadAlbumFromStorage();

    // Handle new uploads
    const uploadInput = document.getElementById('albumUpload');
    if (uploadInput) {
        uploadInput.addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    createAlbumItem(ev.target.result);
                    saveAlbumToStorage();
                };
                reader.readAsDataURL(file);
            });
            e.target.value = '';
        });
    }
});
