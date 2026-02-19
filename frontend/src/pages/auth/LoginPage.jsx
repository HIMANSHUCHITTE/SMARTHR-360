import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const loginStepOneSchema = z.object({
    identifier: z.string().min(3, 'Enter email or mobile number'),
    password: z.string().min(1, 'Password is required'),
});

const LoginPage = () => {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.login);
    const logout = useAuthStore((state) => state.logout);
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [serverMessage, setServerMessage] = useState('');
    const [loginSessionId, setLoginSessionId] = useState('');
    const [emailOtp, setEmailOtp] = useState('');
    const [debugOtp, setDebugOtp] = useState(null);
    const [redirectInfo, setRedirectInfo] = useState(null);

    useEffect(() => {
        // Ensure stale persisted session does not force wrong panel behavior on login screen.
        logout();
    }, [logout]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginStepOneSchema),
        defaultValues: {
            identifier: '',
            password: '',
        },
    });

    const startLogin = async (formData) => {
        setIsLoading(true);
        setServerMessage('');
        try {
            const { data } = await api.post('/auth/login/start', formData);
            setLoginSessionId(data.loginSessionId);
            setDebugOtp(data.debugOtp || null);
            setServerMessage(data.message || 'Email OTP sent');
            setStep(2);
        } catch (error) {
            if (error.response?.status === 404) {
                setServerMessage('Login API not found. Backend restart required (run backend again).');
            } else {
                setServerMessage(error.response?.data?.message || 'Login failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOtp = async () => {
        setIsLoading(true);
        setServerMessage('');
        try {
            const { data } = await api.post('/auth/login/verify', {
                loginSessionId,
                emailOtp,
            });

            setAuth(data.user, data.accessToken, data.organization || null, data.panel || null);
            setRedirectInfo({ panel: data.panel, path: data.redirectPath || '/dashboard' });
            setStep(3);

            setTimeout(() => {
                navigate(data.redirectPath || '/dashboard');
            }, 800);
        } catch (error) {
            setServerMessage(error.response?.data?.message || 'OTP verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="space-y-1 text-center">
                <p className="text-xs font-semibold tracking-wide text-primary">Step {step} of 3</p>
                <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
                <p className="text-sm text-muted-foreground">
                    Secure sign-in with OTP verification.
                </p>
                <div className="pt-1">
                    <Link to="/">
                        <Button variant="outline" size="sm">Back to Home</Button>
                    </Link>
                </div>
            </div>

            <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
            </div>

            {step === 1 && (
                <form className="grid gap-3" onSubmit={handleSubmit(startLogin)}>
                    <div className="grid gap-1">
                        <Label htmlFor="identifier">Email / Mobile No.</Label>
                        <Input id="identifier" placeholder="Email or mobile" {...register('identifier')} />
                        {errors.identifier && <p className="text-xs text-red-500">{errors.identifier.message}</p>}
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="Password" {...register('password')} />
                        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                    </div>
                    <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading}>
                        Continue
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
                            placeholder="Enter OTP"
                        />
                    </div>

                    {debugOtp && (
                        <p className="rounded-md border border-blue-500/30 bg-blue-500/10 p-2 text-xs text-blue-200">
                            Dev OTP: {debugOtp.emailOtp}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                        <Button onClick={verifyOtp} isLoading={isLoading} disabled={isLoading || emailOtp.length !== 6}>
                            Verify OTP
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-3 text-center">
                    <p className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
                        Login successful
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Redirecting to {redirectInfo?.panel?.toLowerCase() || 'dashboard'} panel...
                    </p>
                </div>
            )}

            {serverMessage && (
                <p className="text-center text-xs text-muted-foreground">{serverMessage}</p>
            )}

            <p className="text-center text-sm">
                Don&apos;t have an account?{' '}
                <Link to="/auth/register" className="underline hover:text-primary">
                    Register
                </Link>
            </p>
        </div>
    );
};

export default LoginPage;
