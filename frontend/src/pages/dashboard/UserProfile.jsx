import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const toCsv = (arr) => (Array.isArray(arr) ? arr.join(', ') : '');
const fromCsv = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);

const UserProfile = () => {
    const updateUser = useAuthStore((state) => state.updateUser);
    const [profile, setProfile] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const photoInputRef = useRef(null);
    const [docForm, setDocForm] = useState({ title: '', type: 'OTHER', fileUrl: '' });
    const [formData, setFormData] = useState({
        firstName: '',
        middleName: '',
        surname: '',
        gender: 'PREFER_NOT_TO_SAY',
        dateOfBirth: '',
        phone: '',
        alternatePhone: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
        currentAddress: '',
        permanentAddress: '',
        nationality: '',
        maritalStatus: '',
        bio: '',
        avatarUrl: '',
        linkedinUrl: '',
        portfolioUrl: '',
        githubUrl: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        headline: '',
        skillsCsv: '',
        skillsDetailedCsv: '',
        certificationsCsv: '',
        languagesCsv: '',
        highestEducation: '',
        institutionName: '',
        graduationYear: '',
        totalExperienceYears: '',
        expectedSalary: '',
        preferredLocation: '',
        noticePeriodDays: '',
        previousCompany: '',
        previousRole: '',
        previousFrom: '',
        previousTo: '',
        previousDescription: '',
        personalDocuments: [],
    });

    const fetchProfile = useCallback(async () => {
        try {
            const { data } = await api.get('/user/profile');
            setProfile(data);
            setFormData({
                firstName: data.profile?.firstName || '',
                middleName: data.profile?.middleName || '',
                surname: data.profile?.surname || data.profile?.lastName || '',
                gender: data.profile?.gender || 'PREFER_NOT_TO_SAY',
                dateOfBirth: data.profile?.dateOfBirth ? String(data.profile.dateOfBirth).slice(0, 10) : '',
                phone: data.profile?.phone || '',
                alternatePhone: data.profile?.alternatePhone || '',
                city: data.profile?.city || '',
                state: data.profile?.state || '',
                country: data.profile?.country || '',
                postalCode: data.profile?.postalCode || '',
                currentAddress: data.profile?.currentAddress || '',
                permanentAddress: data.profile?.permanentAddress || '',
                nationality: data.profile?.nationality || '',
                maritalStatus: data.profile?.maritalStatus || '',
                bio: data.profile?.bio || '',
                avatarUrl: data.profile?.avatarUrl || '',
                linkedinUrl: data.profile?.linkedinUrl || '',
                portfolioUrl: data.profile?.portfolioUrl || '',
                githubUrl: data.profile?.githubUrl || '',
                emergencyContactName: data.profile?.emergencyContactName || '',
                emergencyContactPhone: data.profile?.emergencyContactPhone || '',
                headline: data.professional?.headline || '',
                skillsCsv: toCsv(data.professional?.skills),
                skillsDetailedCsv: toCsv(data.professional?.skillsDetailed),
                certificationsCsv: toCsv(data.professional?.certifications),
                languagesCsv: toCsv(data.professional?.languages),
                highestEducation: data.professional?.highestEducation || '',
                institutionName: data.professional?.institutionName || '',
                graduationYear: data.professional?.graduationYear ? String(data.professional.graduationYear) : '',
                totalExperienceYears: data.professional?.totalExperienceYears ? String(data.professional.totalExperienceYears) : '',
                expectedSalary: data.professional?.expectedSalary ? String(data.professional.expectedSalary) : '',
                preferredLocation: data.professional?.preferredLocation || '',
                noticePeriodDays: data.professional?.noticePeriodDays ? String(data.professional.noticePeriodDays) : '',
                previousCompany: data.professional?.previousEmployments?.[0]?.companyName || '',
                previousRole: data.professional?.previousEmployments?.[0]?.role || '',
                previousFrom: data.professional?.previousEmployments?.[0]?.from ? String(data.professional.previousEmployments[0].from).slice(0, 10) : '',
                previousTo: data.professional?.previousEmployments?.[0]?.to ? String(data.professional.previousEmployments[0].to).slice(0, 10) : '',
                previousDescription: data.professional?.previousEmployments?.[0]?.description || '',
                personalDocuments: data.personalDocuments || [],
            });
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const payload = {
                firstName: formData.firstName,
                middleName: formData.middleName,
                surname: formData.surname,
                gender: formData.gender,
                dateOfBirth: formData.dateOfBirth || null,
                phone: formData.phone,
                alternatePhone: formData.alternatePhone,
                city: formData.city,
                state: formData.state,
                country: formData.country,
                postalCode: formData.postalCode,
                currentAddress: formData.currentAddress,
                permanentAddress: formData.permanentAddress,
                nationality: formData.nationality,
                maritalStatus: formData.maritalStatus,
                bio: formData.bio,
                avatarUrl: formData.avatarUrl,
                linkedinUrl: formData.linkedinUrl,
                portfolioUrl: formData.portfolioUrl,
                githubUrl: formData.githubUrl,
                emergencyContactName: formData.emergencyContactName,
                emergencyContactPhone: formData.emergencyContactPhone,
                headline: formData.headline,
                skills: fromCsv(formData.skillsCsv),
                skillsDetailed: fromCsv(formData.skillsDetailedCsv),
                certifications: fromCsv(formData.certificationsCsv),
                languages: fromCsv(formData.languagesCsv),
                highestEducation: formData.highestEducation,
                institutionName: formData.institutionName,
                graduationYear: formData.graduationYear ? Number(formData.graduationYear) : null,
                totalExperienceYears: formData.totalExperienceYears ? Number(formData.totalExperienceYears) : 0,
                expectedSalary: formData.expectedSalary ? Number(formData.expectedSalary) : null,
                preferredLocation: formData.preferredLocation,
                noticePeriodDays: formData.noticePeriodDays ? Number(formData.noticePeriodDays) : null,
                previousEmployments: formData.previousCompany || formData.previousRole || formData.previousDescription
                    ? [{
                        companyName: formData.previousCompany,
                        role: formData.previousRole,
                        from: formData.previousFrom || null,
                        to: formData.previousTo || null,
                        description: formData.previousDescription,
                    }]
                    : [],
                personalDocuments: formData.personalDocuments || [],
            };

            const { data } = await api.patch('/user/profile', payload);
            setProfile(data);
            setIsEditing(false);
            updateUser({ profile: data.profile, professional: data.professional });
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const initials = useMemo(() => {
        const f = profile?.profile?.firstName?.[0] || '';
        const s = (profile?.profile?.surname || profile?.profile?.lastName || '')[0] || '';
        return `${f}${s}`.toUpperCase() || 'U';
    }, [profile]);

    const addPersonalDocument = () => {
        if (!docForm.title.trim() || !docForm.fileUrl.trim()) return;
        setFormData((prev) => ({
            ...prev,
            personalDocuments: [
                ...prev.personalDocuments,
                {
                    title: docForm.title.trim(),
                    type: docForm.type,
                    fileUrl: docForm.fileUrl.trim(),
                    uploadedAt: new Date().toISOString(),
                },
            ],
        }));
        setDocForm({ title: '', type: 'OTHER', fileUrl: '' });
    };

    const removePersonalDocument = (index) => {
        setFormData((prev) => ({
            ...prev,
            personalDocuments: prev.personalDocuments.filter((_, i) => i !== index),
        }));
    };

    const updatePhotoFromFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const value = typeof reader.result === 'string' ? reader.result : '';
            setFormData((s) => ({ ...s, avatarUrl: value }));
        };
        reader.readAsDataURL(file);
    };

    if (!profile) return <div>Loading profile...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">My Paperless Profile</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditing((v) => !v)}>
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                    </Button>
                    {isEditing && (
                        <Button onClick={handleUpdate} isLoading={loading} disabled={loading}>
                            Save
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-4">
                    {formData.avatarUrl ? (
                        <img src={formData.avatarUrl} alt="Profile" className="h-16 w-16 rounded-full border object-cover" />
                    ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">{initials}</div>
                    )}
                    <div>
                        <h2 className="text-xl font-bold">{profile.profile?.firstName} {profile.profile?.surname || profile.profile?.lastName}</h2>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                        {isEditing && (
                            <div className="mt-2 flex gap-2">
                                <Button type="button" variant="outline" onClick={() => photoInputRef.current?.click()}>
                                    Edit Photo
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setFormData((s) => ({ ...s, avatarUrl: '' }))}>
                                    Remove
                                </Button>
                                <input
                                    ref={photoInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => updatePhotoFromFile(e.target.files?.[0])}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card title="Personal Details">
                    <Field label="First Name"><Input disabled={!isEditing} value={formData.firstName} onChange={(e) => setFormData((s) => ({ ...s, firstName: e.target.value }))} /></Field>
                    <Field label="Middle Name"><Input disabled={!isEditing} value={formData.middleName} onChange={(e) => setFormData((s) => ({ ...s, middleName: e.target.value }))} /></Field>
                    <Field label="Surname"><Input disabled={!isEditing} value={formData.surname} onChange={(e) => setFormData((s) => ({ ...s, surname: e.target.value }))} /></Field>
                    <Field label="Date Of Birth"><Input type="date" disabled={!isEditing} value={formData.dateOfBirth} onChange={(e) => setFormData((s) => ({ ...s, dateOfBirth: e.target.value }))} /></Field>
                    <Field label="Gender">
                        <select className="h-10 rounded-md border bg-background px-3 text-sm" disabled={!isEditing} value={formData.gender} onChange={(e) => setFormData((s) => ({ ...s, gender: e.target.value }))}>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                        </select>
                    </Field>
                    <Field label="Nationality"><Input disabled={!isEditing} value={formData.nationality} onChange={(e) => setFormData((s) => ({ ...s, nationality: e.target.value }))} /></Field>
                    <Field label="Marital Status"><Input disabled={!isEditing} value={formData.maritalStatus} onChange={(e) => setFormData((s) => ({ ...s, maritalStatus: e.target.value }))} /></Field>
                </Card>

                <Card title="Contact & Address">
                    <Field label="Primary Phone"><Input disabled={!isEditing} value={formData.phone} onChange={(e) => setFormData((s) => ({ ...s, phone: e.target.value }))} /></Field>
                    <Field label="Alternate Phone"><Input disabled={!isEditing} value={formData.alternatePhone} onChange={(e) => setFormData((s) => ({ ...s, alternatePhone: e.target.value }))} /></Field>
                    <Field label="City"><Input disabled={!isEditing} value={formData.city} onChange={(e) => setFormData((s) => ({ ...s, city: e.target.value }))} /></Field>
                    <Field label="State"><Input disabled={!isEditing} value={formData.state} onChange={(e) => setFormData((s) => ({ ...s, state: e.target.value }))} /></Field>
                    <Field label="Country"><Input disabled={!isEditing} value={formData.country} onChange={(e) => setFormData((s) => ({ ...s, country: e.target.value }))} /></Field>
                    <Field label="Postal Code"><Input disabled={!isEditing} value={formData.postalCode} onChange={(e) => setFormData((s) => ({ ...s, postalCode: e.target.value }))} /></Field>
                    <Field label="Current Address"><Input disabled={!isEditing} value={formData.currentAddress} onChange={(e) => setFormData((s) => ({ ...s, currentAddress: e.target.value }))} /></Field>
                    <Field label="Permanent Address"><Input disabled={!isEditing} value={formData.permanentAddress} onChange={(e) => setFormData((s) => ({ ...s, permanentAddress: e.target.value }))} /></Field>
                    <Field label="Emergency Contact Name"><Input disabled={!isEditing} value={formData.emergencyContactName} onChange={(e) => setFormData((s) => ({ ...s, emergencyContactName: e.target.value }))} /></Field>
                    <Field label="Emergency Contact Phone"><Input disabled={!isEditing} value={formData.emergencyContactPhone} onChange={(e) => setFormData((s) => ({ ...s, emergencyContactPhone: e.target.value }))} /></Field>
                </Card>

                <Card title="Professional & Social">
                    <Field label="Headline"><Input disabled={!isEditing} value={formData.headline} onChange={(e) => setFormData((s) => ({ ...s, headline: e.target.value }))} /></Field>
                    <Field label="Bio"><textarea className="min-h-[80px] w-full rounded-md border bg-background p-2 text-sm" disabled={!isEditing} value={formData.bio} onChange={(e) => setFormData((s) => ({ ...s, bio: e.target.value }))} /></Field>
                    <Field label="LinkedIn URL"><Input disabled={!isEditing} value={formData.linkedinUrl} onChange={(e) => setFormData((s) => ({ ...s, linkedinUrl: e.target.value }))} /></Field>
                    <Field label="Portfolio URL"><Input disabled={!isEditing} value={formData.portfolioUrl} onChange={(e) => setFormData((s) => ({ ...s, portfolioUrl: e.target.value }))} /></Field>
                    <Field label="Github URL"><Input disabled={!isEditing} value={formData.githubUrl} onChange={(e) => setFormData((s) => ({ ...s, githubUrl: e.target.value }))} /></Field>
                    <Field label="Avatar URL"><Input disabled={!isEditing} value={formData.avatarUrl} onChange={(e) => setFormData((s) => ({ ...s, avatarUrl: e.target.value }))} /></Field>
                    {isEditing && (
                        <Field label="Upload DP">
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => updatePhotoFromFile(e.target.files?.[0])}
                            />
                        </Field>
                    )}
                    <Field label="Skills (comma separated)"><Input disabled={!isEditing} value={formData.skillsCsv} onChange={(e) => setFormData((s) => ({ ...s, skillsCsv: e.target.value }))} /></Field>
                    <Field label="Detailed Skills (comma separated)"><Input disabled={!isEditing} value={formData.skillsDetailedCsv} onChange={(e) => setFormData((s) => ({ ...s, skillsDetailedCsv: e.target.value }))} /></Field>
                    <Field label="Certifications (comma separated)"><Input disabled={!isEditing} value={formData.certificationsCsv} onChange={(e) => setFormData((s) => ({ ...s, certificationsCsv: e.target.value }))} /></Field>
                    <Field label="Languages (comma separated)"><Input disabled={!isEditing} value={formData.languagesCsv} onChange={(e) => setFormData((s) => ({ ...s, languagesCsv: e.target.value }))} /></Field>
                </Card>

                <Card title="Education & Employment">
                    <Field label="Highest Education"><Input disabled={!isEditing} value={formData.highestEducation} onChange={(e) => setFormData((s) => ({ ...s, highestEducation: e.target.value }))} /></Field>
                    <Field label="Institution Name"><Input disabled={!isEditing} value={formData.institutionName} onChange={(e) => setFormData((s) => ({ ...s, institutionName: e.target.value }))} /></Field>
                    <Field label="Graduation Year"><Input type="number" disabled={!isEditing} value={formData.graduationYear} onChange={(e) => setFormData((s) => ({ ...s, graduationYear: e.target.value }))} /></Field>
                    <Field label="Total Experience (years)"><Input type="number" step="0.1" disabled={!isEditing} value={formData.totalExperienceYears} onChange={(e) => setFormData((s) => ({ ...s, totalExperienceYears: e.target.value }))} /></Field>
                    <Field label="Expected Salary"><Input type="number" disabled={!isEditing} value={formData.expectedSalary} onChange={(e) => setFormData((s) => ({ ...s, expectedSalary: e.target.value }))} /></Field>
                    <Field label="Preferred Location"><Input disabled={!isEditing} value={formData.preferredLocation} onChange={(e) => setFormData((s) => ({ ...s, preferredLocation: e.target.value }))} /></Field>
                    <Field label="Notice Period (days)"><Input type="number" disabled={!isEditing} value={formData.noticePeriodDays} onChange={(e) => setFormData((s) => ({ ...s, noticePeriodDays: e.target.value }))} /></Field>
                    <Field label="Previous Company"><Input disabled={!isEditing} value={formData.previousCompany} onChange={(e) => setFormData((s) => ({ ...s, previousCompany: e.target.value }))} /></Field>
                    <Field label="Previous Role"><Input disabled={!isEditing} value={formData.previousRole} onChange={(e) => setFormData((s) => ({ ...s, previousRole: e.target.value }))} /></Field>
                    <Field label="From"><Input type="date" disabled={!isEditing} value={formData.previousFrom} onChange={(e) => setFormData((s) => ({ ...s, previousFrom: e.target.value }))} /></Field>
                    <Field label="To"><Input type="date" disabled={!isEditing} value={formData.previousTo} onChange={(e) => setFormData((s) => ({ ...s, previousTo: e.target.value }))} /></Field>
                    <Field label="Work Description"><textarea className="min-h-[80px] w-full rounded-md border bg-background p-2 text-sm" disabled={!isEditing} value={formData.previousDescription} onChange={(e) => setFormData((s) => ({ ...s, previousDescription: e.target.value }))} /></Field>
                </Card>

                <Card title="Personal Documents">
                    <p className="text-xs text-muted-foreground">ID proofs, certificates, and personal paperless records yahan add kar sakte ho.</p>
                    {isEditing && (
                        <div className="grid gap-2 rounded-md border p-3">
                            <Input placeholder="Document title" value={docForm.title} onChange={(e) => setDocForm((s) => ({ ...s, title: e.target.value }))} />
                            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={docForm.type} onChange={(e) => setDocForm((s) => ({ ...s, type: e.target.value }))}>
                                <option value="ID_PROOF">ID Proof</option>
                                <option value="EDUCATION">Education</option>
                                <option value="CERTIFICATION">Certification</option>
                                <option value="OTHER">Other</option>
                            </select>
                            <Input placeholder="File URL or cloud link" value={docForm.fileUrl} onChange={(e) => setDocForm((s) => ({ ...s, fileUrl: e.target.value }))} />
                            <Button type="button" onClick={addPersonalDocument}>Add Document</Button>
                        </div>
                    )}
                    <div className="space-y-2">
                        {formData.personalDocuments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No personal documents added yet.</p>
                        ) : (
                            formData.personalDocuments.map((doc, index) => (
                                <div key={`${doc.title}-${index}`} className="flex items-center justify-between rounded-md border bg-background/60 px-3 py-2 text-sm">
                                    <div>
                                        <p className="font-medium">{doc.title} <span className="text-xs text-muted-foreground">({doc.type})</span></p>
                                        <p className="text-xs text-muted-foreground">{doc.fileUrl}</p>
                                    </div>
                                    {isEditing && (
                                        <Button type="button" variant="outline" onClick={() => removePersonalDocument(index)}>Remove</Button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

const Card = ({ title, children }) => (
    <div className="space-y-3 rounded-xl border bg-card p-5">
        <h3 className="text-base font-semibold">{title}</h3>
        <div className="grid gap-3">{children}</div>
    </div>
);

const Field = ({ label, children }) => (
    <label className="grid gap-1 text-sm">
        <Label>{label}</Label>
        {children}
    </label>
);

export default UserProfile;
