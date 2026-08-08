
// Notifications Logic
(function () {
    // 1. Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        .notification-wrapper {
            position: relative;
            display: inline-block;
        }
        
        /* Fallback for fixed positioning if no header found */
        .notification-fixed {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
        }

        .notification-bell {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            transition: all 0.2s;
            border: 1px solid #e2e8f0;
        }

        .notification-bell:hover {
            background: #f8fafc;
            transform: translateY(-1px);
        }

        .notification-badge {
            position: absolute;
            top: -2px;
            right: -2px;
            background: #ef4444;
            color: white;
            font-size: 11px;
            font-weight: bold;
            height: 18px;
            min-width: 18px;
            padding: 0 5px;
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
        }

        .notification-dropdown {
            position: absolute;
            top: 50px;
            right: 0;
            width: 320px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            display: none;
            z-index: 1001;
            overflow: hidden;
            animation: slideIn 0.2s ease;
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .notification-header {
            padding: 12px 16px;
            border-bottom: 1px solid #f1f5f9;
            font-weight: 600;
            color: #334155;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .mark-all-read {
            font-size: 12px;
            color: #3b82f6;
            cursor: pointer;
        }

        .notification-list {
            max-height: 300px;
            overflow-y: auto;
        }

        .notification-item {
            padding: 12px 16px;
            border-bottom: 1px solid #f1f5f9;
            cursor: pointer;
            transition: background 0.1s;
            display: flex;
            gap: 10px;
            align-items: start;
        }

        .notification-item:last-child {
            border-bottom: none;
        }

        .notification-item:hover {
            background: #f8fafc;
        }

        .notification-item.unread {
            background: #eff6ff;
        }

        .notification-item.unread:hover {
            background: #e0f2fe;
        }

        .notification-content {
            flex: 1;
        }

        .notification-message {
            font-size: 13px;
            color: #334155;
            margin-bottom: 4px;
            line-height: 1.4;
        }

        .notification-time {
            font-size: 11px;
            color: #94a3b8;
        }

        .notification-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #3b82f6;
            margin-top: 6px;
        }
        
        /* Empty state */
        .notification-empty {
            padding: 20px;
            text-align: center;
            color: #64748b;
            font-size: 13px;
        }
    `;
    document.head.appendChild(style);

    // 2. State
    let notifications = [];
    let isOpen = false;

    // 3. Init Function
    async function init() {
        // Find container
        let container = document.querySelector('.header-right');
        let isFixed = false;

        if (!container) {
            // For pages without proper header structure (chapter.html, unit.html)
            container = document.body;
            isFixed = true;
        }

        // Create Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = isFixed ? 'notification-wrapper notification-fixed' : 'notification-wrapper';

        // Bell Icon
        const bell = document.createElement('div');
        bell.className = 'notification-bell';
        bell.innerHTML = '🔔';
        bell.onclick = toggleDropdown;

        // Badge
        const badge = document.createElement('div');
        badge.className = 'notification-badge';
        badge.style.display = 'none'; // Hide initially

        // Dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'notification-dropdown';
        dropdown.innerHTML = `
            <div class="notification-header">
                <span>Notifications</span>
                <span class="mark-all-read" onclick="markAllRead()">Mark all read</span>
            </div>
            <div class="notification-list" id="notificationList"></div>
        `;

        wrapper.appendChild(bell);
        wrapper.appendChild(badge);
        wrapper.appendChild(dropdown);
        container.appendChild(wrapper);

        // Fetch Data
        await fetchNotifications();
        updateUI();

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                isOpen = false;
                dropdown.style.display = 'none';
            }
        });

        // Make functions globally available for inline onclicks
        window.markAllRead = markAllRead;
        // notification click handler is added dynamically
    }

    async function fetchNotifications() {
        try {
            // Wait for insforge to be available (max 5 seconds)
            let attempts = 0;
            while (typeof db === 'undefined' && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (typeof db === 'undefined') {
                console.warn('InsForge SDK not loaded within timeout');
                return;
            }

            const { data: fetchedNotifications, error } = await insforge
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (fetchedNotifications) {
                let allowedSemesters = [];
                let isAdmin = false;
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const userObj = JSON.parse(userStr);
                        if (userObj.role === 'admin') isAdmin = true;
                        if (!isAdmin) {
                            const { data: freshUser } = await db.from('app_users').select('allowed_semesters').eq('user_id', userObj.user_id).maybeSingle();
                            if (freshUser && freshUser.allowed_semesters) {
                                allowedSemesters = freshUser.allowed_semesters.split(',').map(s => s.trim());
                            }
                        }
                    } catch(e) {}
                }
                
                let filtered = fetchedNotifications;
                if (!isAdmin) {
                    filtered = fetchedNotifications.filter(n => !n.semester || allowedSemesters.includes(n.semester));
                }
                notifications = filtered;
            }
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        }
    }

    function getReadIds() {
        try {
            return JSON.parse(localStorage.getItem('readNotifications') || '[]');
        } catch {
            return [];
        }
    }

    function isRead(id) {
        return getReadIds().includes(id);
    }

    function markAsRead(id) {
        const readIds = getReadIds();
        if (!readIds.includes(id)) {
            readIds.push(id);
            localStorage.setItem('readNotifications', JSON.stringify(readIds));
            updateUI();
        }
    }

    function markAllRead() {
        const readIds = getReadIds();
        notifications.forEach(n => {
            if (!readIds.includes(n.id)) {
                readIds.push(n.id);
            }
        });
        localStorage.setItem('readNotifications', JSON.stringify(readIds));
        updateUI();
    }

    function toggleDropdown() {
        isOpen = !isOpen;
        const dropdown = document.querySelector('.notification-dropdown');
        dropdown.style.display = isOpen ? 'block' : 'none';
    }

    function updateUI() {
        const readIds = getReadIds();
        const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

        // Update Badge
        const badge = document.querySelector('.notification-badge');
        if (unreadCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        } else {
            badge.style.display = 'none';
        }

        // Update List
        const list = document.getElementById('notificationList');
        if (notifications.length === 0) {
            list.innerHTML = '<div class="notification-empty">No notifications</div>';
            return;
        }

        list.innerHTML = notifications.map(n => {
            const isUnread = !readIds.includes(n.id);
            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" onclick="handleNotificationClick(${n.id}, '${n.link}')">
                    ${isUnread ? '<div class="notification-dot"></div>' : ''}
                    <div class="notification-content">
                        <div class="notification-message">${n.message}</div>
                        <div class="notification-time">${new Date(n.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Global handler
    window.handleNotificationClick = function (id, link) {
        markAsRead(id);
        window.location.href = link;
    };

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Poll every 30 seconds for new notifications
    setInterval(async () => {
        const prevCount = notifications.length;
        await fetchNotifications();
        // Only update UI if count changed (new notifications arrived)
        if (notifications.length !== prevCount) {
            updateUI();
        }
    }, 30000);
})();

