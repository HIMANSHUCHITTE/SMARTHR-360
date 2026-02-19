// Mock AI Service until external API (OpenAI/Gemini) keys are provided

class AIService {
    constructor() {
        this.modelEndpoint = process.env.AI_MODEL_ENDPOINT || 'mock';
    }

    async screenResume(resumeText, jobDescription) {
        // Mock latency
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simple keyword matching mock
        const keywords = ['react', 'node', 'leadership', 'communication'];
        const score = Math.floor(Math.random() * 40) + 60; // 60-100 random score

        return {
            matchScore: score,
            summary: "Candidate shows strong potential based on initial screening.",
            missingSkills: ["Kubernetes", "GraphQL"],
            interviewQuestions: [
                "Explain your experience with Microservices.",
                "How do you handle conflict in a team?"
            ]
        };
    }

    async getRecommendations(candidateProfile, jobPostings) {
        // Return mock matching jobs
        return jobPostings.map(job => ({
            jobId: job._id,
            matchScore: Math.floor(Math.random() * 30) + 70, // 70-100
            reason: "High overlap in skills."
        })).sort((a, b) => b.matchScore - a.matchScore);
    }

    async chat(message, context = {}) {
        const text = String(message || '').trim().toLowerCase();
        const role = String(context.role || '').toLowerCase();

        if (!text) {
            return {
                reply: 'Please type your question. I can help with leave, attendance, payroll, documents, and settings.',
                suggestedActions: [
                    { label: 'Help', action: '/help' },
                    { label: 'Settings', action: '/settings' },
                ],
            };
        }

        if (text.includes('leave') || text.includes('time off') || text.includes('vacation')) {
            return {
                reply: 'Leave request ke liye leave page open karke dates aur reason submit karein. Manager approval ke baad status update ho jayega.',
                suggestedActions: [
                    { label: 'Open Leave', action: '/leaves' },
                    { label: 'Attendance', action: '/attendance' },
                ],
            };
        }

        if (text.includes('payroll') || text.includes('salary') || text.includes('payslip')) {
            return {
                reply: 'Payroll section me aap payment records, status aur monthly summary dekh sakte hain.',
                suggestedActions: [
                    { label: 'Open Payroll', action: '/payroll' },
                    { label: 'Settings', action: '/settings' },
                ],
            };
        }

        if (text.includes('recruit') || text.includes('hiring') || text.includes('candidate') || text.includes('resume')) {
            return {
                reply: 'Recruitment dashboard me jobs create karke candidates ke applications aur AI analysis dekh sakte hain.',
                suggestedActions: [
                    { label: 'Open Recruitment', action: '/recruitment' },
                    { label: 'Help', action: '/help' },
                ],
            };
        }

        if (text.includes('document') || text.includes('policy')) {
            return {
                reply: 'Documents section me policies aur files manage kar sakte hain. Agar kuch missing ho to admin se share karein.',
                suggestedActions: [
                    { label: 'Open Documents', action: '/documents' },
                    { label: 'Help', action: '/help' },
                ],
            };
        }

        if (role === 'owner' || role === 'admin') {
            return {
                reply: 'Owner/Admin actions ke liye organization, employees, roles, payroll aur recruitment modules available hain.',
                suggestedActions: [
                    { label: 'Organization', action: '/organization' },
                    { label: 'Employees', action: '/employees' },
                    { label: 'Roles', action: '/roles' },
                ],
            };
        }

        return {
            reply: 'Main aapko dashboard features me guide kar sakta hoon. Specific task type karein: leave, attendance, payroll, documents, recruitment, settings.',
            suggestedActions: [
                { label: 'Help', action: '/help' },
                { label: 'Chat', action: '/chat' },
                { label: 'Settings', action: '/settings' },
            ],
        };
    }
}

module.exports = new AIService();
