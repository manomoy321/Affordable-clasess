// InsForge SDK Wrapper with Local Fallback, CDN Redundancy & Offline Mock Support
window.__insforge_status = 'INIT_START';

async function initInsForge() {
    console.log('🔄 InsForge: Starting initialization...');

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const SOURCES = isLocal ? [
        '/node_modules/@insforge/sdk/dist/index.js',
        'https://cdn.jsdelivr.net/npm/@insforge/sdk@latest/+esm',
        'https://esm.sh/@insforge/sdk@latest'
    ] : [
        'https://cdn.jsdelivr.net/npm/@insforge/sdk@latest/+esm',
        'https://esm.sh/@insforge/sdk@latest',
        '/node_modules/@insforge/sdk/dist/index.js'
    ];

    let sdk = null;
    for (const url of SOURCES) {
        try {
            console.log(`📡 InsForge: Attempting SDK load from: ${url}`);
            const module = await import(url);
            if (module && module.createClient) {
                sdk = module;
                console.log(`✅ InsForge: Successfully loaded SDK from ${url}`);
                break;
            }
        } catch (e) {
            console.warn(`⚠️ InsForge: Failed to load from ${url}`);
        }
    }

    const baseUrl = 'https://6jk42w7h.us-east.insforge.app';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTM3NTR9.57SlsXaxdL9fX_SQMrdMtJ2ZBINjBw4NzdA5DMVWTqQ';

    if (sdk) {
        try {
            const client = sdk.createClient({ baseUrl, anonKey });
            if (!client.from && client.database) client.from = (table) => client.database.from(table);
            if (!client.rpc && client.database) client.rpc = (fn, args) => client.database.rpc(fn, args);
            window.insforge = client;
            window.__insforge_status = 'READY';
            console.log('✅ InsForge: SDK client initialized successfully.');
            return;
        } catch (err) {
            console.warn('⚠️ InsForge: Online client creation failed, activating offline mock mode.', err);
        }
    }

    // Fallback Offline Mock Client for Offline Development
    console.log('📦 InsForge: Initializing Offline Mock Client for local development...');
    window.insforge = createOfflineClient();
    window.__insforge_status = 'READY_OFFLINE_MOCK';
}

function createOfflineClient() {
    const mock = window.__OFFLINE_MOCK_DATA__ || { semesters: [], chapters: [], notifications: [] };
    
    return {
        from: (table) => {
            return {
                select: (query = '*') => {
                    let data = mock[table] || [];
                    return {
                        eq: (col, val) => Promise.resolve({ data: data.filter(item => item[col] === val), error: null }),
                        single: () => Promise.resolve({ data: data[0] || null, error: null }),
                        then: (resolve) => resolve({ data, error: null })
                    };
                },
                insert: (rows) => {
                    if (!mock[table]) mock[table] = [];
                    mock[table].push(...rows);
                    return Promise.resolve({ data: rows, error: null });
                },
                update: (values) => ({
                    eq: (col, val) => {
                        if (mock[table]) {
                            mock[table] = mock[table].map(item => item[col] === val ? { ...item, ...values } : item);
                        }
                        return Promise.resolve({ data: values, error: null });
                    }
                }),
                delete: () => ({
                    eq: (col, val) => {
                        if (mock[table]) {
                            mock[table] = mock[table].filter(item => item[col] !== val);
                        }
                        return Promise.resolve({ data: true, error: null });
                    }
                })
            };
        },
        auth: {
            getCurrentUser: () => Promise.resolve({ data: { user: mock.user }, error: null }),
            getUser: () => Promise.resolve({ data: { user: mock.user }, error: null }),
            signInWithPassword: ({ email }) => Promise.resolve({ data: { user: { ...mock.user, email } }, error: null }),
            signOut: () => Promise.resolve({ error: null })
        }
    };
}

initInsForge();
