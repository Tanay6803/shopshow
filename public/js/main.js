// ── Share Modal ───────────────────────────────────────────────────────────────
let currentShareUrl  = '';
let currentShareTitle = '';

function openShare(itemId, itemTitle) {
  const base = window.location.origin;
  currentShareUrl   = `${base}/item/${itemId}`;
  currentShareTitle = itemTitle;

  document.getElementById('shareItemTitle').textContent = `Share "${itemTitle}"`;
  document.getElementById('shareLinkInput').value = currentShareUrl;
  document.getElementById('shareModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeShare() {
  document.getElementById('shareModal').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  // Close modal on overlay click
  const overlay = document.getElementById('shareModal');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeShare();
    });
  }

  // ESC key closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeShare();
  });
});

function shareOn(platform) {
  const url   = encodeURIComponent(currentShareUrl);
  const text  = encodeURIComponent(`Check out this item: ${currentShareTitle} - ${currentShareUrl}`);
  const title = encodeURIComponent(currentShareTitle);

  const urls = {
    whatsapp:  `https://wa.me/?text=${text}`,
    instagram: null, // Instagram doesn't support direct URL sharing; fallback
    facebook:  `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    twitter:   `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
    telegram:  `https://t.me/share/url?url=${url}&text=${title}`,
  };

  if (platform === 'instagram') {
    copyLink();
    showToast('Link copied! Paste it in your Instagram story or bio.');
    return;
  }

  if (urls[platform]) {
    window.open(urls[platform], '_blank', 'width=600,height=400,noopener');
  }
}

function copyLink() {
  const input = document.getElementById('shareLinkInput');
  if (!input) {
    // If called from item page directly
    navigator.clipboard.writeText(currentShareUrl || window.location.href)
      .then(() => showToast('Link copied to clipboard!'));
    return;
  }
  navigator.clipboard.writeText(input.value)
    .then(() => showToast('Link copied to clipboard!'))
    .catch(() => {
      input.select();
      document.execCommand('copy');
      showToast('Link copied!');
    });
}

// Share from item detail page directly
function shareOnPage(platform, url, title) {
  currentShareUrl   = url;
  currentShareTitle = title;
  shareOn(platform);
}
function copyPageLink(url) {
  navigator.clipboard.writeText(url)
    .then(() => showToast('Link copied to clipboard!'));
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Search & Filter ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const searchInput  = document.getElementById('searchInput');
  const filterSelect = document.getElementById('filterCategory');
  const cards        = document.querySelectorAll('.card[data-title]');
  const emptyState   = document.getElementById('emptyState');
  const countBadge   = document.getElementById('visibleCount');

  function filterCards() {
    if (!searchInput || !cards.length) return;
    const q   = searchInput.value.toLowerCase();
    const cat = filterSelect ? filterSelect.value.toLowerCase() : '';
    let visible = 0;

    cards.forEach((card, i) => {
      const title = card.dataset.title.toLowerCase();
      const desc  = (card.dataset.desc  || '').toLowerCase();
      const cardCat = (card.dataset.cat || '').toLowerCase();

      const matchSearch = !q || title.includes(q) || desc.includes(q);
      const matchCat    = !cat || cardCat === cat;

      const show = matchSearch && matchCat;
      card.style.display = show ? '' : 'none';
      if (show) {
        visible++;
        card.style.animationDelay = (visible * 0.06) + 's';
      }
    });

    if (emptyState)  emptyState.style.display = visible === 0 ? 'block' : 'none';
    if (countBadge)  countBadge.textContent = visible + ' item' + (visible !== 1 ? 's' : '');
  }

  if (searchInput)  searchInput.addEventListener('input', filterCards);
  if (filterSelect) filterSelect.addEventListener('change', filterCards);
});

// ── Admin: delete confirm ─────────────────────────────────────────────────────
function confirmDelete(form) {
  if (confirm('Delete this item? This cannot be undone.')) form.submit();
}

// ── Admin: image preview ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('imageInput');
  const preview   = document.getElementById('imagePreview');
  if (fileInput && preview) {
    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
          preview.src = ev.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }
});
