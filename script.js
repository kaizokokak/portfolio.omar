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

// ============================================
// FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyCRIsKEEPI0_7tAp3kaIgApDrMI1m_As-Y",
    authDomain: "adam-portfolio-52f04.firebaseapp.com",
    projectId: "adam-portfolio-52f04",
    storageBucket: "adam-portfolio-52f04.firebasestorage.app",
    messagingSenderId: "196368263531",
    appId: "1:196368263531:web:00b75d428a25b783cbc42e",
    measurementId: "G-0KH93VJG0M"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const ALBUM_COLLECTION = 'albumPhotos';
const OWNER_PASSWORD = 'adam2121';

// ============================================
// OWNER AUTHENTICATION
// ============================================
function isOwnerAuthenticated() {
    return sessionStorage.getItem('albumOwner') === 'true';
}

function authenticateOwner() {
    if (isOwnerAuthenticated()) return true;
    const pwd = prompt('🔒 Enter owner password to manage photos:');
    if (pwd === OWNER_PASSWORD) {
        sessionStorage.setItem('albumOwner', 'true');
        return true;
    } else if (pwd !== null) {
        alert('❌ Incorrect password.');
    }
    return false;
}

// ============================================
// IMAGE COMPRESSION
// ============================================
function compressImage(file, maxWidth = 600, quality = 0.5) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > maxWidth) {
                    h = (h * maxWidth) / w;
                    w = maxWidth;
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                
                // Try compressing, reduce quality further if still too large
                let result = canvas.toDataURL('image/jpeg', quality);
                if (result.length > 700000) {
                    result = canvas.toDataURL('image/jpeg', 0.3);
                }
                if (result.length > 700000) {
                    // Last resort: shrink dimensions by half
                    canvas.width = w / 2;
                    canvas.height = h / 2;
                    ctx.drawImage(img, 0, 0, w / 2, h / 2);
                    result = canvas.toDataURL('image/jpeg', 0.3);
                }
                console.log('Compressed image size:', Math.round(result.length / 1024) + 'KB');
                resolve(result);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ============================================
// FIRESTORE ALBUM FUNCTIONS
// ============================================
async function loadAlbumFromFirebase() {
    const grid = document.getElementById('albumGrid');
    if (!grid) return;

    // Show loading state
    grid.innerHTML = '<div class="album-loading">Loading photos...</div>';
    console.log('[Album] Starting to load photos from Firestore...');

    try {
        const snapshot = await db.collection(ALBUM_COLLECTION).get();
        console.log('[Album] Firestore responded. Documents found:', snapshot.size);

        grid.innerHTML = '';

        if (snapshot.empty) {
            console.log('[Album] No photos in Firestore collection.');
            return;
        }

        // Sort by timestamp client-side
        const docs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log('[Album] Doc:', doc.id, '| Has imageData:', !!data.imageData, '| Size:', data.imageData ? Math.round(data.imageData.length / 1024) + 'KB' : 'N/A');
            docs.push({ id: doc.id, data });
        });
        docs.sort((a, b) => {
            const ta = a.data.timestamp?.toMillis?.() || 0;
            const tb = b.data.timestamp?.toMillis?.() || 0;
            return tb - ta;
        });

        docs.forEach(doc => {
            if (doc.data.imageData) {
                createAlbumItem(doc.data.imageData, doc.id);
            }
        });
        console.log('[Album] Loaded', docs.length, 'photos successfully.');
    } catch (error) {
        console.error('[Album] ERROR loading:', error.code, error.message);
        grid.innerHTML = '<div class="album-loading">Failed to load photos</div>';
    }
}

async function uploadToFirebase(file) {
    try {
        console.log('[Album] Compressing', file.name, '(', Math.round(file.size / 1024), 'KB original)');
        const compressed = await compressImage(file);
        console.log('[Album] Compressed to', Math.round(compressed.length / 1024), 'KB');

        // Show uploading state
        const grid = document.getElementById('albumGrid');
        const placeholder = document.createElement('div');
        placeholder.className = 'album-item album-uploading';
        placeholder.innerHTML = '<div class="album-upload-spinner"></div>';
        if (grid) grid.prepend(placeholder);

        console.log('[Album] Saving to Firestore...');
        const docRef = await db.collection(ALBUM_COLLECTION).add({
            imageData: compressed,
            filename: file.name,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('[Album] ✅ Saved! Doc ID:', docRef.id);

        // Replace placeholder with actual image
        if (placeholder.parentNode) placeholder.remove();
        createAlbumItem(compressed, docRef.id, true);

    } catch (error) {
        console.error('[Album] ❌ Upload FAILED:', error.code, error.message);
        alert('Upload failed: ' + error.message);
        const uploading = document.querySelector('.album-uploading');
        if (uploading) uploading.remove();
    }
}

async function deleteFromFirebase(docId, itemElement) {
    try {
        itemElement.style.transform = 'scale(0.8)';
        itemElement.style.opacity = '0';
        await db.collection(ALBUM_COLLECTION).doc(docId).delete();
        setTimeout(() => itemElement.remove(), 250);
    } catch (error) {
        console.error('Error deleting photo:', error);
        alert('Failed to delete photo. Please try again.');
        itemElement.style.transform = '';
        itemElement.style.opacity = '';
    }
}

// ============================================
// ALBUM UI
// ============================================
function getAlbumImages() {
    return Array.from(document.querySelectorAll('#albumGrid .album-item img')).map(img => img.src);
}

function createAlbumItem(src, docId, prepend = false) {
    const grid = document.getElementById('albumGrid');
    if (!grid) return;
    const item = document.createElement('div');
    item.className = 'album-item';
    item.dataset.docId = docId;
    item.innerHTML = `
        <img src="${src}" alt="Album Photo" loading="lazy">
        <div class="album-item-overlay">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
        </div>
        <button class="album-delete-btn" aria-label="Delete photo">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    `;

    // Click to open lightbox
    item.addEventListener('click', (e) => {
        if (e.target.closest('.album-delete-btn')) return;
        const items = Array.from(grid.querySelectorAll('.album-item'));
        openAlbumModal(items.indexOf(item));
    });

    // Delete button handler
    const deleteBtn = item.querySelector('.album-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!authenticateOwner()) return;
        deleteFromFirebase(docId, item);
    });

    if (prepend) {
        grid.prepend(item);
    } else {
        grid.appendChild(item);
    }
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

// ============================================
// INIT ALBUM ON PAGE LOAD
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Load photos from Firebase
    loadAlbumFromFirebase();

    // Handle upload — requires owner password
    const uploadInput = document.getElementById('albumUpload');
    const uploadLabel = document.querySelector('.album-upload-btn');

    if (uploadLabel) {
        uploadLabel.addEventListener('click', (e) => {
            if (!authenticateOwner()) {
                e.preventDefault();
                return;
            }
        });
    }

    if (uploadInput) {
        uploadInput.addEventListener('change', (e) => {
            if (!isOwnerAuthenticated()) {
                e.target.value = '';
                return;
            }
            Array.from(e.target.files).forEach(file => {
                uploadToFirebase(file);
            });
            e.target.value = '';
        });
    }
});

