import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';

const JobsPage = () => {
    const { user } = useAuthStore();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resumeText, setResumeText] = useState({});
    const [busy, setBusy] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get('/recruitment/jobs');
                setJobs(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const apply = async (jobId) => {
        const text = String(resumeText[jobId] || '').trim();
        if (!text) return alert('Please add resume/profile summary first.');
        setBusy(jobId);
        try {
            await api.post(`/recruitment/jobs/${jobId}/apply`, {
                candidateName: `${user?.profile?.firstName || ''} ${user?.profile?.surname || user?.profile?.lastName || ''}`.trim(),
                email: user?.email,
                resumeText: text,
            });
            alert('Application submitted');
        } catch (error) {
            alert(error.response?.data?.message || 'Apply failed');
        } finally {
            setBusy('');
        }
    };

    return (
        <div className="space-y-5">
            <h1 className="text-3xl font-bold">Apply to Companies</h1>
            {loading ? (
                <p className="text-muted-foreground">Loading jobs...</p>
            ) : jobs.length === 0 ? (
                <p className="text-muted-foreground">No open jobs available.</p>
            ) : (
                <div className="grid gap-4">
                    {jobs.map((job) => (
                        <div key={job._id} className="glass-card rounded-xl p-4 space-y-3">
                            <div>
                                <h2 className="text-xl font-semibold">{job.title}</h2>
                                <p className="text-sm text-muted-foreground">{job.department || 'General'} | {job.location || 'Remote/Flexible'}</p>
                            </div>
                            <p className="text-sm">{job.description}</p>
                            <Input
                                placeholder="Write detailed profile summary/resume text for paperless application..."
                                value={resumeText[job._id] || ''}
                                onChange={(e) => setResumeText((s) => ({ ...s, [job._id]: e.target.value }))}
                            />
                            <Button isLoading={busy === job._id} disabled={Boolean(busy)} onClick={() => apply(job._id)}>
                                Apply
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default JobsPage;
