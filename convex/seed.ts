import { mutation } from "./_generated/server";

// Simple password hashing (copied from auth.ts)
function hashPassword(password: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "proctai_salt_2024");
    return btoa(String.fromCharCode(...new Uint8Array(data)));
}

export const defaultData = mutation({
    handler: async (ctx) => {
        // Check if data exists
        const existing = await ctx.db.query("institutes").first();
        if (existing) return "Already seeded";

        // Create Institute
        const instId = await ctx.db.insert("institutes", {
            name: "Acme Institute of Technology",
            code: "AIT",
            address: "Silicon Valley, CA",
        });

        // Create Branches
        await ctx.db.insert("branches", {
            name: "Computer Science & Engineering",
            code: "CSE",
            institute_id: instId,
        });

        await ctx.db.insert("branches", {
            name: "Information Technology",
            code: "IT",
            institute_id: instId,
        });

        await ctx.db.insert("branches", {
            name: "Electronics & Communication",
            code: "ECE",
            institute_id: instId,
        });

        // Create Default Proctor/Admin

        // Create Default Admin
        await ctx.db.insert("user_profiles", {
            user_id: "admin-1",
            name: "Default Admin",
            email: "admin@test.com",
            password_hash: hashPassword("admin123"),
            role: "admin",
            created_at: new Date().toISOString(),
        });

        // Create Default Proctor
        await ctx.db.insert("user_profiles", {
            user_id: "proctor-1",
            name: "Default Proctor",
            email: "proctor@test.com",
            password_hash: hashPassword("proctai123"),
            role: "instructor",
            created_at: new Date().toISOString(),
        });

        return "Seeding successful! Added 'Acme Institute', branches, 'admin@test.com', and 'proctor@test.com'.";
    },
});

export const seedDemoExam = mutation({
    handler: async (ctx) => {
        // 1. Create a sample exam
        const examId = await ctx.db.insert("exams", {
            title: "🚀 Production Readiness Assessment",
            description: "Final verification exam for the ProctAI system.",
            duration_minutes: 60,
            questions: [
                {
                    text: "What is the primary goal of ProctAI?",
                    options: ["Gaming", "Remote Proctoring", "Social Media", "Video Editing"],
                    correctAnswer: 1
                },
                {
                    text: "Which database is used for real-time monitoring?",
                    options: ["MySQL", "PostgreSQL", "Convex", "MongoDB"],
                    correctAnswer: 2
                }
            ],
            is_active: true,
            created_by: "system",
            created_at: new Date().toISOString()
        });

        // 2. Create a demo student
        const studentId = await ctx.db.insert("user_profiles", {
            user_id: "demo-student-1",
            name: "Demo Student",
            email: "student@test.com",
            password_hash: hashPassword("student123"),
            role: "student",
            created_at: new Date().toISOString(),
        });

        return { examId, studentId, message: "Demo exam and student created!" };
    }
});

export const ensureCoreAccounts = mutation({
    handler: async (ctx) => {
        const accounts = [
            { email: "admin@test.com", name: "Default Admin", role: "admin", password: "admin123", id: "admin-1" },
            { email: "proctor@test.com", name: "Default Proctor", role: "instructor", password: "proctai123", id: "proctor-1" },
        ];

        let created = 0;
        let updated = 0;

        for (const acc of accounts) {
            const existing = await ctx.db
                .query("user_profiles")
                .withIndex("by_email", (q) => q.eq("email", acc.email))
                .first();

            const passwordHash = hashPassword(acc.password);

            if (existing) {
                await ctx.db.patch(existing._id, {
                    role: acc.role as any,
                    password_hash: passwordHash,
                    name: acc.name
                });
                updated++;
            } else {
                await ctx.db.insert("user_profiles", {
                    user_id: acc.id,
                    name: acc.name,
                    email: acc.email,
                    password_hash: passwordHash,
                    role: acc.role as any,
                    created_at: new Date().toISOString(),
                });
                created++;
            }
        }

    }
});

export const seedCSExams = mutation({
    handler: async (ctx) => {
        const exams = [
            {
                title: "Applied Data Structures & Algorithms",
                description: "Comprehensive assessment of data structures including arrays, linked lists, trees, and graphs, focusing on algorithmic efficiency and application.",
                duration_minutes: 90,
                questions: [
                    {
                        text: "What is the time complexity of searching in a balanced Binary Search Tree (BST)?",
                        options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
                        correctAnswer: 1
                    },
                    {
                        text: "Which data structure is best suited for implementing a FIFO queue?",
                        options: ["Stack", "Array", "Linked List", "Heap"],
                        correctAnswer: 2
                    },
                    {
                        text: "In a min-heap, where is the smallest element always located?",
                        options: ["At the root", "At the last leaf", "Anywhere", "At a random leaf"],
                        correctAnswer: 0
                    }
                ]
            },
            {
                title: "Operating Systems Fundamentals",
                description: "Exam covering core OS concepts: processes, threads, memory management, and file systems.",
                duration_minutes: 60,
                questions: [
                    {
                        text: "Which component of the OS is responsible for process management?",
                        options: ["Kernel", "Shell", "Compiler", "Driver"],
                        correctAnswer: 0
                    },
                    {
                        text: "What is 'thrashing' in the context of memory management?",
                        options: [" excessive swapping", "Disk fragmentation", "CPU overheating", "Network congestion"],
                        correctAnswer: 0
                    },
                    {
                        text: "Which scheduling algorithm can cause starvation?",
                        options: ["Round Robin", "FCFS", "Priority Scheduling", "SJF (Preemptive)"],
                        correctAnswer: 2
                    }
                ]
            },
            {
                title: "Database Management Systems",
                description: "Test on SQL, database normalization, ACID properties, and relational models.",
                duration_minutes: 45,
                questions: [
                    {
                        text: "What does ACID stand for in databases?",
                        options: ["Atomicity, Consistency, Isolation, Durability", "Association, Class, Inheritance, Design", "Access, Control, Identify, Delete", "None of the above"],
                        correctAnswer: 0
                    },
                    {
                        text: "Which normal form removes transitive dependencies?",
                        options: ["1NF", "2NF", "3NF", "BCNF"],
                        correctAnswer: 2
                    }
                ]
            },
            {
                title: "Computer Networks",
                description: "Covers the OSI model, TCP/IP capabilities, subnetting, and network security protocols.",
                duration_minutes: 75,
                questions: [
                    {
                        text: "Which layer of the OSI model does IP address belong to?",
                        options: ["Physical", "Data Link", "Network", "Transport"],
                        correctAnswer: 2
                    },
                    {
                        text: "What is the standard port for HTTP?",
                        options: ["80", "443", "21", "25"],
                        correctAnswer: 0
                    },
                    {
                        text: "Which protocol is connection-oriented?",
                        options: ["UDP", "TCP", "IP", "ICMP"],
                        correctAnswer: 1
                    }
                ]
            },
            {
                title: "Software Engineering Principles",
                description: "Evaluation of SDLC models, Agile methodologies, software testing, and design patterns.",
                duration_minutes: 30,
                questions: [
                    {
                        text: "Which model is also known as the 'Waterfall' model?",
                        options: ["Iterative", "Linear Sequential", "Spiral", "Big Bang"],
                        correctAnswer: 1
                    },
                    {
                        text: "What is the main focus of regression testing?",
                        options: ["Testing new features", "Ensuring new code didn't break old code", "Testing UI", "Load testing"],
                        correctAnswer: 1
                    }
                ]
            },
            {
                title: "Emerging Tech Trends",
                description: "Test your knowledge on the latest technology trends including AI, Quantum Computing, and more.",
                duration_minutes: 45,
                questions: [
                    {
                        text: "Which of the following best describes 'Generative AI'?",
                        options: [
                            "AI that classifies data into categories",
                            "AI that creates new content (text, images, audio) based on training data",
                            "AI used exclusively for robotics",
                            "AI that simply retrieves stored information"
                        ],
                        correctAnswer: 1
                    },
                    {
                        text: "What is the primary advantage of Quantum Computing over classical computing?",
                        options: [
                            "It uses less electricity",
                            "It is cheaper to build",
                            "It can solve certain complex problems exponentially faster using qubits",
                            "It has better graphics processing"
                        ],
                        correctAnswer: 2
                    },
                    {
                        text: "What is the concept of 'Edge Computing'?",
                        options: [
                            "Computing on the edge of the screen",
                            "Processing data closer to the source (e.g., IoT devices) rather than a central cloud",
                            "Using cutting-edge processors only",
                            "Computing done exclusively in space"
                        ],
                        correctAnswer: 1
                    },
                    {
                        text: "Which technology is key to enabling the 'Metaverse'?",
                        options: [
                            "AR and VR",
                            "Mainframe computers",
                            "Fax machines",
                            "3G Networks"
                        ],
                        correctAnswer: 0
                    }
                ]
            }
        ];

        let createdCount = 0;
        for (const exam of exams) {
            await ctx.db.insert("exams", {
                ...exam,
                is_active: true,
                created_by: "system",
                created_at: new Date().toISOString()
            });
            createdCount++;
        }

        return `Successfully created ${createdCount} CS exams.`;
    }
});

export const seedEmergingTechExam = mutation({
    handler: async (ctx) => {
        const exam = {
            title: "Emerging Tech Trends",
            description: "Test your knowledge on the latest technology trends including AI, Quantum Computing, and more.",
            duration_minutes: 45,
            questions: [
                {
                    text: "Which of the following best describes 'Generative AI'?",
                    options: [
                        "AI that classifies data into categories",
                        "AI that creates new content (text, images, audio) based on training data",
                        "AI used exclusively for robotics",
                        "AI that simply retrieves stored information"
                    ],
                    correctAnswer: 1
                },
                {
                    text: "What is the primary advantage of Quantum Computing over classical computing?",
                    options: [
                        "It uses less electricity",
                        "It is cheaper to build",
                        "It can solve certain complex problems exponentially faster using qubits",
                        "It has better graphics processing"
                    ],
                    correctAnswer: 2
                },
                {
                    text: "What is the concept of 'Edge Computing'?",
                    options: [
                        "Computing on the edge of the screen",
                        "Processing data closer to the source (e.g., IoT devices) rather than a central cloud",
                        "Using cutting-edge processors only",
                        "Computing done exclusively in space"
                    ],
                    correctAnswer: 1
                },
                {
                    text: "Which technology is key to enabling the 'Metaverse'?",
                    options: [
                        "AR and VR",
                        "Mainframe computers",
                        "Fax machines",
                        "3G Networks"
                    ],
                    correctAnswer: 0
                }
            ],
            is_active: true,
            created_by: "system",
            created_at: new Date().toISOString()
        };

        const existing = await ctx.db
            .query("exams")
            .withIndex("by_title", (q) => q.eq("title", exam.title))
            .first();

        if (existing) {
            return "Exam 'Emerging Tech Trends' already exists.";
        }

        const id = await ctx.db.insert("exams", exam);
        return `Successfully created exam 'Emerging Tech Trends' with ID: ${id}`;
    }
});

