// Mock AI Service until external API (OpenAI/Gemini) keys are provided

class AIService {
    constructor() {
        this.modelEndpoint = process.env.AI_MODEL_ENDPOINT || 'mock';
    }

    hasAny(text, keywords = []) {
        return keywords.some((keyword) => text.includes(keyword));
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
        const isOwnerPanel = role === 'owner' || role === 'admin';

        if (!text) {
            return {
                reply: isOwnerPanel
                    ? 'Owner panel help: organization, employees, roles, payroll, recruitment, performance, settings. Inme se koi bhi puchhiye.'
                    : 'Please type your question. I can help with leave, attendance, payroll, documents, and settings.',
                suggestedActions: isOwnerPanel
                    ? [
                        { label: 'Organization', action: '/organization' },
                        { label: 'Employees', action: '/employees' },
                        { label: 'Payroll', action: '/payroll' },
                    ]
                    : [
                        { label: 'Help', action: '/help' },
                        { label: 'Settings', action: '/settings' },
                    ],
            };
        }

        if (isOwnerPanel) {
            if (this.hasAny(text, ['hi', 'hello', 'hey', 'start', 'help'])) {
                return {
                    reply: 'Basic Owner Q&A active hai. Aap puchh sakte hain: organization, employees, roles, payroll, recruitment, org chart, performance, settings.',
                    suggestedActions: [
                        { label: 'Organization', action: '/organization' },
                        { label: 'Employees', action: '/employees' },
                        { label: 'Help', action: '/help' },
                    ],
                };
            }

            if (this.hasAny(text, ['organization', 'company', 'org'])) {
                return {
                    reply: 'Organization module me profile, hierarchy aur subscription settings manage hoti hain.',
                    suggestedActions: [
                        { label: 'Organization', action: '/organization' },
                        { label: 'Settings', action: '/settings' },
                    ],
                };
            }

            if (this.hasAny(text, ['employee', 'staff', 'team'])) {
                return {
                    reply: 'Employees module me members add/update/terminate kar sakte hain aur overview dekh sakte hain.',
                    suggestedActions: [
                        { label: 'Employees', action: '/employees' },
                        { label: 'Organization', action: '/organization' },
                    ],
                };
            }

            if (this.hasAny(text, ['role', 'permission', 'access'])) {
                return {
                    reply: 'Roles module me hierarchy, access controls aur limits define kiye jaate hain.',
                    suggestedActions: [
                        { label: 'Roles', action: '/roles' },
                        { label: 'Settings', action: '/settings' },
                    ],
                };
            }

            if (this.hasAny(text, ['payroll', 'salary', 'payslip', 'payment'])) {
                return {
                    reply: 'Payroll module me payroll records, run payroll aur payment history track kar sakte hain.',
                    suggestedActions: [
                        { label: 'Payroll', action: '/payroll' },
                        { label: 'Settings', action: '/settings' },
                    ],
                };
            }

            if (this.hasAny(text, ['recruit', 'hiring', 'candidate', 'resume', 'job'])) {
                return {
                    reply: 'Recruitment module me jobs create, applications review aur AI screening use kar sakte hain.',
                    suggestedActions: [
                        { label: 'Recruitment', action: '/recruitment' },
                        { label: 'Performance', action: '/performance' },
                    ],
                };
            }

            if (this.hasAny(text, ['org chart', 'hierarchy', 'reporting'])) {
                return {
                    reply: 'Org Chart module se reporting structure aur team hierarchy visualize hoti hai.',
                    suggestedActions: [
                        { label: 'Org Chart', action: '/org-chart' },
                        { label: 'Organization', action: '/organization' },
                    ],
                };
            }

            if (this.hasAny(text, ['performance', 'appraisal', 'rating', 'kpi'])) {
                return {
                    reply: 'Performance module me appraisal readiness aur team performance trends monitor kar sakte hain.',
                    suggestedActions: [
                        { label: 'Performance', action: '/performance' },
                        { label: 'Employees', action: '/employees' },
                    ],
                };
            }

            if (this.hasAny(text, ['setting', 'config'])) {
                return {
                    reply: 'Settings me account, panel preferences aur workspace controls manage kar sakte hain.',
                    suggestedActions: [
                        { label: 'Settings', action: '/settings' },
                        { label: 'Help', action: '/help' },
                    ],
                };
            }

            return {
                reply: 'Owner chatbot ab basic app Q&A mode me hai. Sirf app-related sawal puchhiye: organization, employees, roles, payroll, recruitment, org chart, performance, settings.',
                suggestedActions: [
                    { label: 'Help', action: '/help' },
                    { label: 'Organization', action: '/organization' },
                    { label: 'Dashboard', action: '/dashboard' },
                ],
            };
        }

        if (this.hasAny(text, ['leave', 'time off', 'vacation'])) {
            return {
                reply: 'Leave request ke liye leave page open karke dates aur reason submit karein. Manager approval ke baad status update ho jayega.',
                suggestedActions: [
                    { label: 'Open Leave', action: '/leaves' },
                    { label: 'Attendance', action: '/attendance' },
                ],
            };
        }

        if (this.hasAny(text, ['payroll', 'salary', 'payslip'])) {
            return {
                reply: 'Payroll section me aap payment records, status aur monthly summary dekh sakte hain.',
                suggestedActions: [
                    { label: 'Open Payroll', action: '/payroll' },
                    { label: 'Settings', action: '/settings' },
                ],
            };
        }

        if (this.hasAny(text, ['recruit', 'hiring', 'candidate', 'resume'])) {
            return {
                reply: 'Recruitment dashboard me jobs create karke candidates ke applications aur AI analysis dekh sakte hain.',
                suggestedActions: [
                    { label: 'Open Recruitment', action: '/recruitment' },
                    { label: 'Help', action: '/help' },
                ],
            };
        }

        if (this.hasAny(text, ['document', 'policy'])) {
            return {
                reply: 'Documents section me policies aur files manage kar sakte hain. Agar kuch missing ho to admin se share karein.',
                suggestedActions: [
                    { label: 'Open Documents', action: '/documents' },
                    { label: 'Help', action: '/help' },
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
