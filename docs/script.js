// ─── afCode Documentation Scripts ─── //

document.addEventListener('DOMContentLoaded', () => {
  // Sidebar toggle (mobile)
  const menuBtn = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.doc-sidebar');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    // Close on link click (mobile)
    sidebar.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => sidebar.classList.remove('open'));
    });
  }

  // Sidebar group collapse/expand
  document.querySelectorAll('.sidebar-group-title').forEach(title => {
    title.addEventListener('click', () => {
      title.parentElement.classList.toggle('collapsed');
    });
  });

  // Active sidebar link tracking on scroll
  const sections = document.querySelectorAll('.doc-section[id]');
  const sidebarLinks = document.querySelectorAll('.sidebar-links a');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        sidebarLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });

  sections.forEach(section => observer.observe(section));

  // Search
  const searchInput = document.querySelector('.search-box input');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      const q = e.target.value.toLowerCase().trim();
      sections.forEach(section => {
        const text = section.textContent.toLowerCase();
        section.style.display = !q || text.includes(q) ? '' : 'none';
      });
    });
  }

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.closest('.code-block').querySelector('pre').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = orig, 1500);
      });
    });
  });

  // Keyboard shortcut: Ctrl+K / Cmd+K to focus search
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput?.focus();
    }
  });
});
