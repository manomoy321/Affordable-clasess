// Local Database Implementation (Replaces InsForge)
window.__db_status = 'INIT_START';

function createLocalDatabase() {
    console.log('📦 DB: Initializing Local Database...');
    const mock = window.__OFFLINE_MOCK_DATA__ || { semesters: [], chapters: [], units: [], videos: [], resources: [], notifications: [] };
    
    const loadFromStorage = (table) => {
        const stored = localStorage.getItem(`db_${table}`);
        if (stored) {
            return JSON.parse(stored);
        }
        return mock[table] || [];
    };

    const saveToStorage = (table, data) => {
        localStorage.setItem(`db_${table}`, JSON.stringify(data));
        mock[table] = data;
    };
    
    // Initialize storage with mock data if empty
    Object.keys(mock).forEach(table => {
        if (!localStorage.getItem(`db_${table}`)) {
            saveToStorage(table, mock[table]);
        } else {
            mock[table] = loadFromStorage(table);
        }
    });

    return {
        from: (table) => {
            return {
                select: (query = '*') => {
                    let data = mock[table] || [];
                    return {
                        eq: (col, val) => {
                            const filtered = data.filter(item => item[col] === val);
                            return {
                                order: () => Promise.resolve({ data: filtered, error: null }),
                                maybeSingle: () => Promise.resolve({ data: filtered[0] || null, error: null }),
                                single: () => Promise.resolve({ data: filtered[0] || null, error: null }),
                                then: (resolve) => resolve({ data: filtered, error: null })
                            }
                        },
                        order: () => Promise.resolve({ data, error: null }),
                        maybeSingle: () => Promise.resolve({ data: data[0] || null, error: null }),
                        single: () => Promise.resolve({ data: data[0] || null, error: null }),
                        then: (resolve) => resolve({ data, error: null })
                    };
                },
                insert: (rows) => {
                    if (!mock[table]) mock[table] = [];
                    const dataArray = Array.isArray(rows) ? rows : [rows];
                    mock[table].push(...dataArray);
                    saveToStorage(table, mock[table]);
                    return Promise.resolve({ data: dataArray, error: null });
                },
                update: (values) => ({
                    eq: (col, val) => {
                        if (mock[table]) {
                            mock[table] = mock[table].map(item => item[col] === val ? { ...item, ...values } : item);
                            saveToStorage(table, mock[table]);
                        }
                        return Promise.resolve({ data: values, error: null });
                    }
                }),
                delete: () => ({
                    eq: (col, val) => {
                        if (mock[table]) {
                            mock[table] = mock[table].filter(item => item[col] !== val);
                            saveToStorage(table, mock[table]);
                        }
                        return Promise.resolve({ data: true, error: null });
                    }
                })
            };
        },
        rpc: (fn, args) => {
            if (fn === 'login_user') {
                return Promise.resolve({
                    data: {
                        success: true,
                        session_token: 'local-session-' + Date.now(),
                        session: {
                            user: {
                                id: 'local-user-1',
                                user_id: (args && args.login_user_id) || 'admin',
                                name: (args && args.login_user_id) || 'Admin',
                                role: 'admin',
                                allowed_semesters: 'all'
                            }
                        }
                    },
                    error: null
                });
            }
            if (fn === 'verify_session') {
                return Promise.resolve({ data: { valid: true }, error: null });
            }
            if (fn === 'save_user') {
                return Promise.resolve({ data: { success: true }, error: null });
            }
            return Promise.resolve({ data: { success: true }, error: null });
        },
        channel: (name) => {
            return {
                on: () => {
                    return {
                        subscribe: () => {
                            console.log(`📡 DB: Subscribed to channel ${name}`);
                        }
                    }
                }
            }
        },
        auth: {
            getCurrentUser: () => Promise.resolve({ data: { user: mock.user }, error: null }),
            getUser: () => Promise.resolve({ data: { user: mock.user }, error: null }),
            signInWithPassword: ({ email }) => Promise.resolve({ data: { user: { ...mock.user, email } }, error: null }),
            signOut: () => Promise.resolve({ error: null })
        }
    };
}

window.db = createLocalDatabase();
window.__db_status = 'READY';
console.log('✅ DB: Local Database initialized successfully.');
