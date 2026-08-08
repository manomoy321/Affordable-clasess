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

    // If admin, abort security lockdown so they can still inspect/debug
    if (isAdmin) {
        console.log("Admin privileges recognized. DevTools unlocked.");
        // TEMPORARY: Alert the user so they realize they are an Admin and that's why security isn't triggering.
        // Feel free to delete this alert once you verify it!
        // alert("SECURITY NOTE: You are logged in as an Admin. The DevTools Anti-Theft system is disabled for you. Log in as a student to see the Self-Destruct trigger!");
        return;
    }

    /* =========================================================================
       STUDENT LOCKDOWN PROCEDURES
       ========================================================================= */

    // Load the industry-standard "disable-devtool" library dynamically.
    // This library is virtually impossible to bypass and detects DevTools based on memory, 
    // element IDs, timing, and resize events—destroying the Elements tab instantly.
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/disable-devtool';
    script.onload = () => {
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
    };
    document.head.appendChild(script);

    // Override console output just in case
    ['log', 'info', 'warn', 'error', 'debug', 'table', 'dir'].forEach(method => {
        console[method] = function () { };
    });
});
