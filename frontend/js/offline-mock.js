// Offline Mock Data for Local Offline Development
window.__OFFLINE_MOCK_DATA__ = {
    user: {
        id: "offline-user-1",
        email: "student@example.com",
        role: "admin",
        allowed_semesters: "Semester 1, Semester 2, Semester 3, Semester 4"
    },
    semesters: [
        { id: "s1", name: "Semester 1", thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60" },
        { id: "s2", name: "Semester 2", thumbnail: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&auto=format&fit=crop&q=60" },
        { id: "s3", name: "Semester 3", thumbnail: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop&q=60" },
        { id: "s4", name: "Semester 4", thumbnail: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500&auto=format&fit=crop&q=60" }
    ],
    chapters: [
        { nid: "ch-101", name: "Mathematics & Linear Algebra", semester: "Semester 1", description: "Vectors, Matrices, Eigenvalues and Differential Equations." },
        { nid: "ch-102", name: "Computer Organization", semester: "Semester 1", description: "CPU architecture, memory hierarchy, instruction sets." },
        { nid: "ch-103", name: "Data Structures & Algorithms", semester: "Semester 2", description: "Arrays, Linked Lists, Trees, Graphs, Sorting & Searching." },
        { nid: "ch-104", name: "Database Management Systems", semester: "Semester 2", description: "Relational algebra, SQL, Normalization, Transactions." },
        { nid: "ch-105", name: "Operating Systems", semester: "Semester 3", description: "Processes, Threads, Memory management, File systems." },
        { nid: "ch-106", name: "Computer Networks", semester: "Semester 3", description: "OSI Model, TCP/IP, Routing, Socket Programming." },
        { nid: "ch-107", name: "Software Engineering", semester: "Semester 4", description: "Agile, SDLC, System Design, Testing & DevOps." },
        { nid: "ch-108", name: "Artificial Intelligence", semester: "Semester 4", description: "Search algorithms, Machine Learning basics, Neural networks." }
    ],
    notifications: [
        { id: "n1", title: "Welcome to Offline Mode!", message: "You are currently running in local offline development mode.", created_at: new Date().toISOString() }
    ]
};

console.log("📦 Offline Mock Data loaded for local development.");
