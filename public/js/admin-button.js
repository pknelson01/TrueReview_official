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
