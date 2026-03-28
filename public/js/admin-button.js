(async () => {
    try {
        const res = await fetch('/api/user/is-admin');
        if (!res.ok) return;
        const data = await res.json();
        if (!data.is_admin) return;

        // Inject style for admin button
        const style = document.createElement('style');
        style.textContent = `
            .admin-btn {
                background: transparent;
                border: 1px solid #f5c518;
                color: #f5c518;
                padding: 6px 12px;
                font-family: 'Oswald', sans-serif;
                font-size: 10px;
                letter-spacing: 1px;
                text-transform: uppercase;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-block;
                margin-left: 8px;
            }
            .admin-btn:hover {
                background: #f5c518;
                color: #2B2B2B;
            }
        `;
        document.head.appendChild(style);

        // Desktop: inject after search button
        const headerSearch = document.querySelector('.header-search');
        if (headerSearch) {
            const adminBtn = document.createElement('a');
            adminBtn.href = '/admin/user-management';
            adminBtn.className = 'admin-btn';
            adminBtn.textContent = 'Admin';
            headerSearch.appendChild(adminBtn);
        }

        // Mobile: inject into mobile menu after first link
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) {
            const adminLink = document.createElement('a');
            adminLink.href = '/admin/user-management';
            adminLink.textContent = 'Admin Panel';
            adminLink.style.cssText = 'padding:14px 24px;font-family:Oswald,sans-serif;font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#f5c518;text-decoration:none;border-bottom:1px solid rgba(255,255,255,0.15);display:block;';
            mobileMenu.insertBefore(adminLink, mobileMenu.firstChild);
        }
    } catch (err) {
        // Not admin or not logged in — silently do nothing
    }
})();
