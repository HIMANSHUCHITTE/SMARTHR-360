import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import api from '../../services/api';
import { Briefcase, MapPin, Users, Plus, BrainCircuit, X, Loader2 } from 'lucide-react';

const RecruitmentDashboard = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        department: '',
        location: 'Remote',
        type: 'FULL_TIME',
        description: '',
        requirements: '' // Comma separated
    });

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const { data } = await api.get('/recruitment/jobs');
            setJobs(data);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                requirements: formData.requirements.split(',').map(r => r.trim())
            };
            const { data } = await api.post('/recruitment/jobs', payload);
            setJobs([data, ...jobs]);
            setIsCreating(false);
            setFormData({ title: '', department: '', location: 'Remote', type: 'FULL_TIME', description: '', requirements: '' });
            alert('Job Posting Created!');
        } catch (error) {
            console.error(error);
            alert('Failed to create job');
        }
    };

    // Mock Apply for demo purposes (Since we don't have a public candidate portal yet)
    const mockApply = async (jobId) => {
        const name = prompt("Candidate Name:");
        if (!name) return;
        const resumeText = prompt("Paste Resume Text (Keywords: React, Node, Leadership...):");
        if (!resumeText) return;

        try {
            const { data } = await api.post(`/recruitment/jobs/${jobId}/apply`, {
                candidateName: name,
                email: `${name.toLowerCase().replace(/\s/g, '.')}@example.com`,
                resumeText
            });
            alert(`Application Submitted! AI Analysis: ${data.aiAnalysis || 'Pending'}`);
            // Ideally fetch applications for this job to show count update
        } catch (error) {
            alert('Failed to apply: ' + (error.response?.data?.message || error.message));
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AI Recruitment</h1>
                    <p className="text-muted-foreground">Smart hiring with AI-powered resume screening.</p>
                </div>
                <Button onClick={() => setIsCreating(!isCreating)}>
                    {isCreating ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    Post Job
                </Button>
            </div>

            {isCreating && (
                <div className="glass-card p-6 rounded-xl border border-primary/20 bg-primary/5">
                    <h3 className="font-semibold mb-4">Create New Job Posting</h3>
                    <form onSubmit={handleCreateJob} className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Job Title</Label>
                            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Input value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="FULL_TIME">Full Time</option>
                                <option value="PART_TIME">Part Time</option>
                                <option value="CONTRACT">Contract</option>
                            </select>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label>Description</Label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label>Requirements (Comma separated keywords for AI)</Label>
                            <Input
                                placeholder="e.g. React, Python, AWS, Team Player"
                                value={formData.requirements}
                                onChange={e => setFormData({ ...formData, requirements: e.target.value })}
                                required
                            />
                        </div>
                        <div className="col-span-2 flex justify-end mt-2">
                            <Button type="submit">Publish Job</Button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {jobs.map(job => (
                        <div key={job._id} className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow hover:shadow-lg transition-all">
                            <div className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-lg leading-none">{job.title}</h3>
                                        <p className="text-sm text-muted-foreground">{job.department}</p>
                                    </div>
                                    <div className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                                        {job.type.replace('_', ' ')}
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {job.location}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {job.status}
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {job.requirements.slice(0, 3).map((req, i) => (
                                        <span key={i} className="inline-flex items-center rounded-md border border-transparent bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
                                            {req}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-muted/50 p-4 flex items-center justify-between border-t gap-2">
                                <Button variant="outline" size="sm" className="w-full" onClick={() => mockApply(job._id)}>
                                    <BrainCircuit className="mr-2 h-3 w-3" />
                                    Test Apply with AI
                                </Button>
                                {/* <Button size="sm" className="w-full">View Applicants</Button> */}
                            </div>
                        </div>
                    ))}
                    {jobs.length === 0 && (
                        <div className="col-span-full text-center p-12 text-muted-foreground border rounded-xl border-dashed">
                            No job postings yet. Create one to start hiring!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RecruitmentDashboard;
