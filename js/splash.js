document.addEventListener('DOMContentLoaded', function() {
    window.scrollTo(0, 0);
    history.scrollRestoration = 'manual';

    const splashScreen = document.getElementById('splash-screen');
    if (!splashScreen) return;

    // 入场动画时长计算：
    // splash-logo-in: 1.2s
    // splash-fade-up (副标题): 0.5s delay + 0.8s = 1.3s
    // splash-fade-scale orbit-3: 0.6s delay + 0.8s = 1.4s (最晚结束)
    const minDuration = 1500;
    const startTime = Date.now();

    function hideSplash() {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDuration - elapsed);

        setTimeout(function() {
            splashScreen.classList.add('hidden');
            setTimeout(function() {
                if (splashScreen.parentNode) {
                    splashScreen.parentNode.removeChild(splashScreen);
                }
            }, 800);
        }, remaining);
    }

    if (document.readyState === 'complete') {
        hideSplash();
    } else {
        window.addEventListener('load', hideSplash);
    }
});
