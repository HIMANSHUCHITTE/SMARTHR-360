const JobPosting = require('../models/JobPosting');
const Application = require('../models/Application');

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
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Apply for a Job
// @route   POST /api/recruitment/jobs/:id/apply
// @access  Public (Candidate)
exports.applyForJob = async (req, res) => {
    try {
        const { candidateName, email, resumeText } = req.body;
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

        res.status(201).json({ message: 'Application submitted successfully', applicationId: application._id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Applications for a Job
// @route   GET /api/recruitment/jobs/:id/applications
// @access  Owner, Admin, HR Manager
exports.getApplications = async (req, res) => {
    try {
        // Ensure user belongs to the org of the job
        const job = await JobPosting.findById(req.params.id);
        if (!job || job.organizationId.toString() !== req.organizationId) { // Basic check
            return res.status(404).json({ message: 'Job not found or access denied' });
        }

        const applications = await Application.find({ jobId: req.params.id }).sort('-aiScore'); // Sort by AI Score!
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
