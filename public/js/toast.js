// ============================================================
// TOAST NOTIFICATION
// ============================================================
(function () {
    // Create toast element once
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div class="toast-text" id="toast-text"></div>
        <div class="toast-progress-track">
            <div class="toast-progress-bar" id="toast-progress-bar"></div>
        </div>
    `;
    document.body.appendChild(toast);

    let toastTimeout = null;
    let fadeTimeout = null;

    window.showToast = function (message, duration = 3000) {
        clearTimeout(toastTimeout);
        clearTimeout(fadeTimeout);

        const textEl = document.getElementById('toast-text');
        const bar = document.getElementById('toast-progress-bar');

        textEl.textContent = message;

        // Reset bar
        bar.classList.remove('animating');
        bar.style.width = '0%';

        // Show toast
        toast.classList.remove('fade-out');
        toast.classList.add('active');

        // Start progress animation on next frame
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                bar.style.transition = `width ${duration}ms linear`;
                bar.classList.add('animating');
            });
        });

        // Fade out and remove
        toastTimeout = setTimeout(() => {
            toast.classList.add('fade-out');
            fadeTimeout = setTimeout(() => {
                toast.classList.remove('active', 'fade-out');
                bar.classList.remove('animating');
                bar.style.width = '0%';
            }, 300);
        }, duration);
    };
})();
