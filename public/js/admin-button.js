(async () => {
    try {
        // --- Username caching (eliminates flash on dashboard tab) ---
        const cachedName = sessionStorage.getItem('tr_display_name');
        const dashTab = document.getElementById('dashboard-tab');
        const mobileDashTab = document.getElementById('mobile-dashboard-tab');
        if (cachedName) {
            if (dashTab) dashTab.textContent = cachedName.toUpperCase();
            if (mobileDashTab) mobileDashTab.textContent = cachedName;
        }

        // --- Admin button caching (eliminates flash on admin button) ---
        const cachedAdmin = sessionStorage.getItem('tr_is_admin');
        if (cachedAdmin === '1') {
            injectAdminButton();
        }

        // --- Re-validate both in background ---
        const [adminRes, userRes] = await Promise.all([
            fetch('/api/user/is-admin'),
            fetch('/api/user/username')
        ]);

        if (adminRes.ok) {
            const adminData = await adminRes.json();
            sessionStorage.setItem('tr_is_admin', adminData.is_admin ? '1' : '0');
            if (adminData.is_admin && cachedAdmin !== '1') {
                injectAdminButton();
            } else if (!adminData.is_admin && cachedAdmin === '1') {
                // Admin was revoked — remove button and clear cache
                document.querySelector('.admin-btn')?.remove();
                document.querySelector('#mobile-menu a[href="/admin/user-management"]')?.remove();
            }
        }

        if (userRes.ok) {
            const userData = await userRes.json();
            sessionStorage.setItem('tr_display_name', userData.display_name);
            if (dashTab) dashTab.textContent = userData.display_name.toUpperCase();
            if (mobileDashTab) mobileDashTab.textContent = userData.display_name;
        }
    } catch (err) {
        // Not logged in or network error — silently do nothing
    }
})();

// Clear sessionStorage on logout so cached data doesn't persist
document.querySelectorAll('form[action="/logout"]').forEach(form => {
    form.addEventListener('submit', () => sessionStorage.clear());
});

function injectAdminButton() {
    // Don't double-inject
    if (document.querySelector('.admin-btn')) return;

    // Inject style
    if (!document.getElementById('admin-btn-style')) {
        const style = document.createElement('style');
        style.id = 'admin-btn-style';
        style.textContent = `
            .admin-btn {
                background: #1a1a1a;
                border: 2px solid #f5c518;
                color: #f5c518;
                padding: 8px 80px;
                font-family: 'Oswald', sans-serif;
                font-size: 13px;
                letter-spacing: 2px;
                text-transform: uppercase;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-block;
            }
            .admin-btn:hover {
                background: #f5c518;
                color: #1a1a1a;
            }
        `;
        document.head.appendChild(style);
    }

    // Desktop: inject into header-bar, absolutely centered
    const headerBar = document.querySelector('.header-bar');
    if (headerBar) {
        headerBar.style.position = 'relative';
        const adminBtn = document.createElement('a');
        adminBtn.href = '/admin/user-management';
        adminBtn.className = 'admin-btn';
        adminBtn.textContent = 'Admin';
        adminBtn.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10;';
        headerBar.appendChild(adminBtn);
    }

    // Mobile: inject into mobile menu
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
        const adminLink = document.createElement('a');
        adminLink.href = '/admin/user-management';
        adminLink.textContent = 'Admin Panel';
        adminLink.style.cssText = 'padding:14px 24px;font-family:Oswald,sans-serif;font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#f5c518;text-decoration:none;border-bottom:1px solid rgba(255,255,255,0.15);display:block;';
        mobileMenu.insertBefore(adminLink, mobileMenu.firstChild);
    }
}
