/**
 * Security script to prevent non-admin users from accessing Developer Tools
 * and inspecting embedded YouTube keys.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Check user role from localStorage
    const userStr = localStorage.getItem('user');
    let isAdmin = false;

    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.role === 'admin') {
                isAdmin = true;
            }
        } catch (e) {
            console.error("Error parsing user data for security check");
        }
    }

    if (isAdmin) {
        console.log("Admin privileges recognized. DevTools unlocked.");
        return;
    }

    // Load disable-devtool library dynamically if online
    if (navigator.onLine) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/disable-devtool';
        script.onload = () => {
            if (window.DisableDevtool) {
                DisableDevtool({
                    ondevtoolopen: (type, next) => {
                        document.body.innerHTML = `
                            <div style="display:flex; height:100vh; width:100vw; background:black; color:red; justify-content:center; align-items:center; flex-direction:column; font-family:sans-serif;">
                                <h1 style="font-size:3rem; margin:0; text-align:center;">SECURITY VIOLATION</h1>
                                <p style="font-size:1.5rem; color:white; text-align:center;">Developer Tools Detected. Session locked to protect video assets.</p>
                            </div>
                        `;
                        if (window.ytPlayer) window.ytPlayer = null;
                        next();
                    }
                });
            }
        };
        document.head.appendChild(script);
    }
});
