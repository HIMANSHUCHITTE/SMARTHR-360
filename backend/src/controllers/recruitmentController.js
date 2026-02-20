const JobPosting = require('../models/JobPosting');
const Application = require('../models/Application');
const User = require('../models/User');

// --- AI Mock Service (Internal for MVP) ---
const analyzeCandidate = (resumeText, jobRequirements) => {
    // Simple keyword matching
    const resumeLower = resumeText.toLowerCase();
    let matches = 0;
    let missing = [];

    jobRequirements.forEach(req => {
        if (resumeLower.includes(req.toLowerCase())) {
            matches++;
        } else {
            missing.push(req);
        }
    });

    const score = Math.round((matches / (jobRequirements.length || 1)) * 100);

    let analysis = `Matched ${matches}/${jobRequirements.length} requirements.`;
    if (score > 80) analysis += " Strong candidate!";
    else if (score > 50) analysis += " Potential fit.";
    else analysis += ` Missing key skills: ${missing.slice(0, 3).join(', ')}.`;

    return { score, analysis };
};

const buildResumeTextFromUser = (user) => {
    const profile = user?.profile || {};
    const professional = user?.professional || {};
    const docs = Array.isArray(user?.personalDocuments) ? user.personalDocuments : [];
    const previousEmployments = Array.isArray(professional.previousEmployments)
        ? professional.previousEmployments
        : [];

    const lines = [
        `${profile.firstName || ''} ${profile.surname || profile.lastName || ''}`.trim(),
        professional.headline || '',
        `Skills: ${(professional.skills || []).join(', ')}`,
        `Detailed Skills: ${(professional.skillsDetailed || []).join(', ')}`,
        `Certifications: ${(professional.certifications || []).join(', ')}`,
        `Languages: ${(professional.languages || []).join(', ')}`,
        `Education: ${professional.highestEducation || ''} ${professional.institutionName || ''}`.trim(),
        `Experience Years: ${professional.totalExperienceYears || 0}`,
        `Preferred Location: ${professional.preferredLocation || ''}`,
        `Bio: ${profile.bio || ''}`,
        `Previous Employments: ${previousEmployments.map((item) => `${item.companyName || ''} ${item.role || ''} ${item.description || ''}`.trim()).join(' | ')}`,
        `Documents: ${docs.map((doc) => `${doc.title || ''} ${doc.type || ''}`).join(', ')}`,
    ];

    return lines.filter(Boolean).join('\n');
};


// @desc    Get All Job Postings (Public + Internal)
// @route   GET /api/recruitment/jobs
// @access  Public (or Private based on implementation)
exports.getJobs = async (req, res) => {
    try {
        const query = { status: 'OPEN' };
        if (req.query.organizationId) {
            query.organizationId = req.query.organizationId;
        } else if (req.organizationId) {
            // If logged in and scoped
            query.organizationId = req.organizationId;
            // Admins can see CLOSED/DRAFT too?
            if (['Owner', 'Admin', 'HR Manager'].includes(req.userRole)) {
                delete query.status;
            }
        }

        const jobs = await JobPosting.find(query).sort('-createdAt');
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create Job Posting
// @route   POST /api/recruitment/jobs
// @access  Owner, Admin, HR Manager
exports.createJob = async (req, res) => {
    try {
        const { title, description, department, location, type, requirements } = req.body;

        const job = await JobPosting.create({
            organizationId: req.organizationId,
            title,
            description,
            department,
            location,
            type,
            requirements: requirements || [], // Ensure array
            status: 'OPEN'
        });

        res.status(201).json(job);
    } catch (error) {
        console.error('Recruitment createJob error', error);
        res.status(400).json({ message: error.message || 'Could not create job posting' });
    }
};

// @desc    Apply registered app user to job (auto profile resume + AI screening)
// @route   POST /api/recruitment/jobs/:id/apply-user
// @access  Owner, Admin, HR Manager, CEO
exports.applyRegisteredUserToJob = async (req, res) => {
    try {
        const userId = String(req.body.userId || '').trim();
        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        const job = await JobPosting.findById(req.params.id);
        if (!job || String(job.organizationId) !== String(req.organizationId)) {
            return res.status(404).json({ message: 'Job not found or access denied' });
        }
        if (job.status !== 'OPEN') {
            return res.status(400).json({ message: 'Job is no longer accepting applications' });
        }

        const user = await User.findById(userId).select('email profile professional personalDocuments');
        if (!user) {
            return res.status(404).json({ message: 'Candidate user not found' });
        }

        const existing = await Application.findOne({
            jobId: job._id,
            $or: [
                { candidateUserId: user._id },
                { email: user.email },
            ],
        }).select('_id');
        if (existing) {
            return res.status(409).json({ message: 'Candidate already applied to this job' });
        }

        const candidateName = `${user.profile?.firstName || ''} ${user.profile?.surname || user.profile?.lastName || ''}`.trim() || user.email;
        const resumeText = buildResumeTextFromUser(user);
        const { score, analysis } = analyzeCandidate(resumeText, job.requirements || []);

        const application = await Application.create({
            jobId: job._id,
            organizationId: job.organizationId,
            candidateUserId: user._id,
            candidateName,
            email: user.email,
            resumeText,
            aiScore: score,
            aiAnalysis: analysis,
            status: 'APPLIED'
        });

        res.status(201).json({
            message: 'Candidate added from app profile and screened by AI',
            applicationId: application._id,
            aiScore: score,
            aiAnalysis: analysis,
            candidate: {
                userId: user._id,
                name: candidateName,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Recruitment applyRegisteredUserToJob error', error);
        res.status(400).json({ message: error.message || 'Could not add candidate from app profile' });
    }
};

// @desc    Apply for a Job
// @route   POST /api/recruitment/jobs/:id/apply
// @access  Public (Candidate)
exports.applyForJob = async (req, res) => {
    try {
        const { candidateName, email, resumeText } = req.body;
        if (!candidateName || !email || !resumeText) {
            return res.status(400).json({ message: 'candidateName, email, and resumeText are required' });
        }
        const job = await JobPosting.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        if (job.status !== 'OPEN') {
            return res.status(400).json({ message: 'Job is no longer accepting applications' });
        }

        // AI Analysis
        const { score, analysis } = analyzeCandidate(resumeText, job.requirements);

        const application = await Application.create({
            jobId: job._id,
            organizationId: job.organizationId,
            candidateName,
            email,
            resumeText,
            aiScore: score,
            aiAnalysis: analysis,
            status: 'APPLIED'
        });

        res.status(201).json({
            message: 'Application submitted successfully',
            applicationId: application._id,
            aiScore: score,
            aiAnalysis: analysis,
        });

    } catch (error) {
        console.error('Recruitment applyForJob error', error);
        res.status(400).json({ message: error.message || 'Could not submit application' });
    }
};

// @desc    Get Applications for a Job
// @route   GET /api/recruitment/jobs/:id/applications
// @access  Owner, Admin, HR Manager
exports.getApplications = async (req, res) => {
    try {
        // Ensure user belongs to the org of the job
        const job = await JobPosting.findById(req.params.id);
        if (!job || String(job.organizationId) !== String(req.organizationId)) { // Basic check
            return res.status(404).json({ message: 'Job not found or access denied' });
        }

        const applications = await Application.find({ jobId: req.params.id }).sort('-aiScore'); // Sort by AI Score!
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
