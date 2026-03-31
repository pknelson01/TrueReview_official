(async () => {
    try {
        const res = await fetch('/api/admin/impersonating');
        if (!res.ok) return;
        const data = await res.json();
        if (!data.impersonating) return;

        const style = document.createElement('style');
        style.textContent = `
            .impersonate-banner {
                background: #f5c518;
                color: #1a1a1a;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 16px;
                padding: 8px 16px;
                font-family: 'Oswald', sans-serif;
                font-size: 13px;
                letter-spacing: 1px;
                text-transform: uppercase;
            }
            .impersonate-banner-text {
                font-weight: 600;
            }
            .impersonate-exit-btn {
                background: #1a1a1a;
                color: #f5c518;
                border: none;
                padding: 4px 14px;
                font-family: 'Oswald', sans-serif;
                font-size: 11px;
                letter-spacing: 1px;
                text-transform: uppercase;
                cursor: pointer;
                transition: opacity 0.3s ease;
            }
            .impersonate-exit-btn:hover {
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);

        const banner = document.createElement('div');
        banner.className = 'impersonate-banner';
        banner.innerHTML = `
            <span class="impersonate-banner-text">Viewing as ${data.viewing_as}</span>
            <button class="impersonate-exit-btn" id="stop-impersonate-btn">Back to Admin</button>
        `;
        document.body.prepend(banner);

        document.getElementById('stop-impersonate-btn').addEventListener('click', async () => {
            try {
                const r = await fetch('/api/admin/stop-impersonating', { method: 'POST' });
                const d = await r.json();
                if (d.success) {
                    window.location.href = '/admin/user-management';
                }
            } catch (err) {
                console.error('Failed to stop impersonating:', err);
            }
        });
    } catch (err) {
        // Not impersonating or not logged in
    }
})();
