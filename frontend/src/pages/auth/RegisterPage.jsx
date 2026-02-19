import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const REGISTER_VERIFICATION_ID_KEY = 'register_verification_id';

const stepOneSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    middleName: z.string().optional(),
    surname: z.string().min(2, 'Surname is required'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    email: z.string().email('Valid email is required'),
    mobile: z.string().regex(/^\d{10,15}$/, 'Mobile must be 10-15 digits'),
    avatarUrl: z.string().optional(),
    password: z.string().regex(
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/,
        'Password must include A-Z, a-z, 0-9 and symbol'
    ),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((value) => value.password === value.confirmPassword, {
    message: 'Password and confirm password do not match',
    path: ['confirmPassword'],
});

const RegisterPage = () => {
    const navigate = useNavigate();
    const logout = useAuthStore((state) => state.logout);
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1);
    const [verificationId, setVerificationId] = useState('');
    const [purpose, setPurpose] = useState('USER');
    const [emailOtp, setEmailOtp] = useState('');
    const [mobileOtp, setMobileOtp] = useState('');
    const [serverMessage, setServerMessage] = useState('');
    const [debugOtp, setDebugOtp] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState('');
    const selectedPlan = (searchParams.get('plan') || 'FREE').toUpperCase();

    const {
        register,
        watch,
        getValues,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(stepOneSchema),
        defaultValues: {
            firstName: '',
            middleName: '',
            surname: '',
            dateOfBirth: '',
            email: '',
            mobile: '',
            avatarUrl: '',
            password: '',
            confirmPassword: '',
        },
    });

    const progressLabel = useMemo(() => `Step ${step} of 4`, [step]);
    const avatarUrl = watch('avatarUrl');

    useEffect(() => {
        // Prevent stale session from forcing panel redirect while opening registration.
        logout();

        const storedVerificationId = sessionStorage.getItem(REGISTER_VERIFICATION_ID_KEY);
        if (storedVerificationId) {
            setVerificationId(storedVerificationId);
        }
    }, [logout]);

    const submitStepOne = async (formData) => {
        setIsLoading(true);
        setServerMessage('');
        sessionStorage.removeItem(REGISTER_VERIFICATION_ID_KEY);
        try {
            const { data } = await api.post('/auth/register/start', formData);
            setVerificationId(data.verificationId);
            sessionStorage.setItem(REGISTER_VERIFICATION_ID_KEY, data.verificationId);
            setDebugOtp(data.debugOtp || null);
            setServerMessage(data.message || 'OTP sent to email and mobile.');
            setStep(2);
        } catch (error) {
            if (error.response?.status === 404) {
                setServerMessage('Registration API not found. Backend restart required (run backend again).');
            } else {
                setServerMessage(error.response?.data?.message || 'Failed to start registration');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOtp = async () => {
        setIsLoading(true);
        setServerMessage('');
        const currentVerificationId = verificationId || sessionStorage.getItem(REGISTER_VERIFICATION_ID_KEY) || '';

        if (!currentVerificationId) {
            setIsLoading(false);
            setServerMessage('Verification session missing. Please restart registration.');
            setStep(1);
            return;
        }

        try {
            const { data } = await api.post('/auth/register/verify', {
                verificationId: currentVerificationId,
                emailOtp,
                mobileOtp,
            });
            setServerMessage(data.message || 'OTP verified');
            setStep(3);
        } catch (error) {
            const message = error.response?.data?.message || 'OTP verification failed';
            if (message.includes('Invalid verification session') || message.includes('OTP expired')) {
                sessionStorage.removeItem(REGISTER_VERIFICATION_ID_KEY);
                setStep(1);
            }
            setServerMessage(error.response?.data?.message || 'OTP verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    const resendOtp = async () => {
        setIsLoading(true);
        setServerMessage('');
        try {
            const formData = getValues();
            const { data } = await api.post('/auth/register/start', formData);
            setVerificationId(data.verificationId);
            sessionStorage.setItem(REGISTER_VERIFICATION_ID_KEY, data.verificationId);
            setDebugOtp(data.debugOtp || null);
            setServerMessage(data.message || 'New OTP sent successfully');
        } catch (error) {
            setServerMessage(error.response?.data?.message || 'Failed to resend OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const completeRegistration = async () => {
        setIsLoading(true);
        setServerMessage('');
        const currentVerificationId = verificationId || sessionStorage.getItem(REGISTER_VERIFICATION_ID_KEY) || '';

        if (!currentVerificationId) {
            setIsLoading(false);
            setServerMessage('Verification session missing. Please restart registration.');
            setStep(1);
            return;
        }

        try {
            const { data } = await api.post('/auth/register/complete', {
                verificationId: currentVerificationId,
                purpose,
                preferredPlan: selectedPlan,
            });
            setServerMessage(data.message || 'Registration completed');
            sessionStorage.removeItem(REGISTER_VERIFICATION_ID_KEY);
            setStep(4);
        } catch (error) {
            const message = error.response?.data?.message || 'Could not complete registration';
            if (message.includes('Invalid verification session') || message.includes('Session expired')) {
                sessionStorage.removeItem(REGISTER_VERIFICATION_ID_KEY);
                setStep(1);
            }
            setServerMessage(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="space-y-1 text-center">
                <p className="text-xs font-semibold tracking-wide text-primary">{progressLabel}</p>
                <h1 className="text-2xl font-semibold tracking-tight">Create Account</h1>
                <p className="text-sm text-muted-foreground">
                    Complete all steps to activate your account.
                </p>
                <div className="pt-1">
                    <Link to="/">
                        <Button variant="outline" size="sm">Back to Home</Button>
                    </Link>
                </div>
            </div>

            <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${step * 25}%` }} />
            </div>

            {step === 1 && (
                <form className="grid gap-3" onSubmit={handleSubmit(submitStepOne)}>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="grid gap-1">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" placeholder="First name" {...register('firstName')} />
                            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor="middleName">Middle Name</Label>
                            <Input id="middleName" placeholder="Middle name" {...register('middleName')} />
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor="surname">Surname</Label>
                            <Input id="surname" placeholder="Surname" {...register('surname')} />
                            {errors.surname && <p className="text-xs text-red-500">{errors.surname.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="grid gap-1">
                            <Label htmlFor="dateOfBirth">Date of Birth</Label>
                            <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                            {errors.dateOfBirth && <p className="text-xs text-red-500">{errors.dateOfBirth.message}</p>}
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor="mobile">Mobile</Label>
                            <Input id="mobile" placeholder="10-15 digit mobile" {...register('mobile')} />
                            {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
                        </div>
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="name@example.com" {...register('email')} />
                        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="avatarUrl">Profile Photo (Optional)</Label>
                        <Input id="avatarUrl" placeholder="Paste image URL (optional)" {...register('avatarUrl')} />
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const value = typeof reader.result === 'string' ? reader.result : '';
                                    setAvatarPreview(value);
                                    // We only preview local image here; sending base64 in registration can break payload limit.
                                    // User can upload final DP in profile after account creation.
                                };
                                reader.readAsDataURL(file);
                            }}
                        />
                        {(avatarPreview || avatarUrl) && (
                            <img src={avatarPreview || avatarUrl} alt="Profile preview" className="h-16 w-16 rounded-full border object-cover" />
                        )}
                        <p className="text-[11px] text-muted-foreground">Aap abhi add kar sakte ho ya baad me profile se update kar sakte ho.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="grid gap-1">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" placeholder="Create password" {...register('password')} />
                            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input id="confirmPassword" type="password" placeholder="Confirm password" {...register('confirmPassword')} />
                            {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                        </div>
                    </div>

                    <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                        Note: Password must contain A-Z, a-z, 0-9 and at least one symbol.
                    </p>

                    <Button isLoading={isLoading} disabled={isLoading} className="w-full">
                        Continue to Verification
                    </Button>
                </form>
            )}

            {step === 2 && (
                <div className="grid gap-3">
                    <div className="grid gap-1">
                        <Label htmlFor="emailOtp">Email OTP (6 digits)</Label>
                        <Input
                            id="emailOtp"
                            value={emailOtp}
                            maxLength={6}
                            onChange={(event) => setEmailOtp(event.target.value.replace(/\D/g, ''))}
                            placeholder="Enter email OTP"
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="mobileOtp">Mobile OTP (6 digits)</Label>
                        <Input
                            id="mobileOtp"
                            value={mobileOtp}
                            maxLength={6}
                            onChange={(event) => setMobileOtp(event.target.value.replace(/\D/g, ''))}
                            placeholder="Enter mobile OTP"
                        />
                    </div>

                    {debugOtp && (
                        <p className="rounded-md border border-blue-500/30 bg-blue-500/10 p-2 text-xs text-blue-200">
                            Dev OTP: email {debugOtp.emailOtp} | mobile {debugOtp.mobileOtp}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                        <Button onClick={verifyOtp} isLoading={isLoading} disabled={isLoading || emailOtp.length !== 6 || mobileOtp.length !== 6}>
                            Verify OTP
                        </Button>
                    </div>

                    <Button variant="ghost" onClick={resendOtp} disabled={isLoading}>
                        Resend OTP
                    </Button>
                </div>
            )}

            {step === 3 && (
                <div className="grid gap-4">
                    <div className="rounded-lg border p-3">
                        <p className="text-sm font-medium">Select Purpose</p>
                        <p className="text-xs text-muted-foreground">Choose how you want to start.</p>
                        <p className="mt-1 text-xs text-muted-foreground">Selected subscription plan: <span className="font-semibold text-foreground">{selectedPlan}</span></p>
                        <div className="mt-3 grid gap-2">
                            <label className={`cursor-pointer rounded-md border p-3 ${purpose === 'OWNER' ? 'border-primary bg-primary/10' : ''}`}>
                                <input
                                    type="radio"
                                    className="mr-2"
                                    checked={purpose === 'OWNER'}
                                    onChange={() => setPurpose('OWNER')}
                                />
                                Owner
                            </label>
                            <label className={`cursor-pointer rounded-md border p-3 ${purpose === 'USER' ? 'border-primary bg-primary/10' : ''}`}>
                                <input
                                    type="radio"
                                    className="mr-2"
                                    checked={purpose === 'USER'}
                                    onChange={() => setPurpose('USER')}
                                />
                                User
                            </label>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                        <Button onClick={completeRegistration} isLoading={isLoading} disabled={isLoading}>
                            Finish Registration
                        </Button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="space-y-4 text-center">
                    <p className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
                        Registration successful. You can now login.
                    </p>
                    <Button className="w-full" onClick={() => navigate('/auth/login')}>
                        Go to Login
                    </Button>
                </div>
            )}

            {serverMessage && (
                <p className="text-center text-xs text-muted-foreground">{serverMessage}</p>
            )}

            <p className="text-center text-sm">
                Already registered?{' '}
                <Link to="/auth/login" className="underline hover:text-primary">
                    Login
                </Link>
            </p>
        </div>
    );
};

export default RegisterPage;
