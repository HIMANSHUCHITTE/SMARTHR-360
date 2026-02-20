import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Building2,
    Users,
    Shield,
    DollarSign,
    BrainCircuit,
    Network,
    TrendingUp,
    Clock,
    Calendar,
    FileText,
    ArrowRight,
    BadgeCheck,
    BarChart3,
    Activity,
    UserCircle2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const WORK_AREAS = [
    {
        key: 'organization',
        title: 'Organization',
        description: 'Company setup, policy and workspace controls.',
        path: '/subadmin/organization',
        icon: Building2,
    },
    {
        key: 'employees',
        title: 'Employees',
        description: 'Hire, map reporting, and manage active team records.',
        path: '/subadmin/employees',
        icon: Users,
    },
    {
        key: 'roles',
        title: 'Roles',
        description: 'Role matrix, access rules and permission structure.',
        path: '/subadmin/roles',
        icon: Shield,
    },
    {
        key: 'payroll',
        title: 'Payroll',
        description: 'Compensation details, salary records and payouts.',
        path: '/subadmin/payroll',
        icon: DollarSign,
    },
    {
        key: 'recruitment',
        title: 'Recruitment',
        description: 'Jobs, applications and hiring pipeline operations.',
        path: '/subadmin/recruitment',
        icon: BrainCircuit,
    },
    {
        key: 'org-chart',
        title: 'Org Chart',
        description: 'Visual hierarchy and reporting relationships.',
        path: '/subadmin/org-chart',
        icon: Network,
    },
    {
        key: 'performance',
        title: 'Performance',
        description: 'KPI progress, review and growth tracking.',
        path: '/subadmin/performance',
        icon: TrendingUp,
    },
    {
        key: 'attendance',
        title: 'Attendance',
        description: 'Daily attendance records and monitoring.',
        path: '/subadmin/attendance',
        icon: Clock,
    },
    {
        key: 'leaves',
        title: 'Leaves',
        description: 'Leave requests, approvals and leave balance flow.',
        path: '/subadmin/leaves',
        icon: Calendar,
    },
    {
        key: 'documents',
        title: 'Documents',
        description: 'Internal docs, compliance files and records.',
        path: '/subadmin/documents',
        icon: FileText,
    },
];

const sumObjectValues = (obj) =>
    Object.values(obj || {}).reduce((sum, value) => {
        const n = Number(value || 0);
        return Number.isFinite(n) ? sum + n : sum;
    }, 0);

const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

const getInitials = (firstName, surname, lastName) => {
    const one = String(firstName || '').trim().charAt(0);
    const two = String(surname || lastName || '').trim().charAt(0);
    return `${one}${two}`.toUpperCase() || 'U';
};

const createSvgPoints = (items, width, height, padding = 12) => {
    if (!Array.isArray(items) || items.length === 0) return '';
    const values = items.map((item) => Number(item.value || 0));
    const max = Math.max(...values, 1);
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    return items
        .map((item, idx) => {
            const x = padding + (idx / Math.max(items.length - 1, 1)) * chartWidth;
            const y = padding + chartHeight - ((Number(item.value || 0) / max) * chartHeight);
            return `${x},${y}`;
        })
        .join(' ');
};

const getMonthKey = (dateLike) => {
    const d = new Date(dateLike);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const daysInRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.max(1, Math.round((end - start) / dayMs) + 1);
};

const WorkAreaPage = () => {
    const { user, organization } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [leaveLogs, setLeaveLogs] = useState([]);
    const [payrollRows, setPayrollRows] = useState([]);
    const [employeeRows, setEmployeeRows] = useState([]);
    const [payrollAccessDenied, setPayrollAccessDenied] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [attendanceRes, leaveRes, payrollRes, employeesRes] = await Promise.allSettled([
                    api.get('/attendance/me'),
                    api.get('/leaves/me'),
                    api.get('/payroll'),
                    api.get('/organization/employees'),
                ]);

                if (attendanceRes.status === 'fulfilled') {
                    setAttendanceLogs(Array.isArray(attendanceRes.value?.data) ? attendanceRes.value.data : []);
                }
                if (leaveRes.status === 'fulfilled') {
                    setLeaveLogs(Array.isArray(leaveRes.value?.data) ? leaveRes.value.data : []);
                }
                if (employeesRes.status === 'fulfilled') {
                    setEmployeeRows(Array.isArray(employeesRes.value?.data) ? employeesRes.value.data : []);
                }
                if (payrollRes.status === 'fulfilled') {
                    setPayrollRows(Array.isArray(payrollRes.value?.data) ? payrollRes.value.data : []);
                } else if (Number(payrollRes.reason?.response?.status) === 403) {
                    setPayrollAccessDenied(true);
                }
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const attendanceTrend = useMemo(() => {
        const labels = [];
        for (let i = 6; i >= 0; i -= 1) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push({
                key: d.toDateString(),
                label: d.toLocaleDateString('en-US', { weekday: 'short' }),
            });
        }

        return labels.map((row) => {
            const hit = attendanceLogs.find((item) => new Date(item.date).toDateString() === row.key);
            const minutes = Number(hit?.duration || 0);
            return {
                label: row.label,
                value: Number((minutes / 60).toFixed(1)),
            };
        });
    }, [attendanceLogs]);

    const leaveUsage = useMemo(() => {
        const monthRows = [];
        for (let i = 5; i >= 0; i -= 1) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            monthRows.push({
                key: getMonthKey(d),
                label: d.toLocaleDateString('en-US', { month: 'short' }),
                value: 0,
            });
        }

        leaveLogs.forEach((leave) => {
            const key = getMonthKey(leave.startDate);
            const month = monthRows.find((item) => item.key === key);
            if (!month) return;
            month.value += daysInRange(leave.startDate, leave.endDate);
        });

        return monthRows;
    }, [leaveLogs]);

    const salaryBreakdown = useMemo(() => {
        const latest = payrollRows[0];
        if (!latest) {
            return {
                estimated: true,
                slices: [
                    { name: 'Basic', value: 70, color: '#2563eb' },
                    { name: 'Allowances', value: 20, color: '#16a34a' },
                    { name: 'Deductions', value: 10, color: '#f97316' },
                ],
                total: 100,
            };
        }

        const basic = Number(latest.basicSalary || 0);
        const allowances = sumObjectValues(latest.allowances);
        const deductions = sumObjectValues(latest.deductions);
        const total = Math.max(basic + allowances + deductions, 1);

        return {
            estimated: false,
            slices: [
                { name: 'Basic', value: basic, color: '#2563eb' },
                { name: 'Allowances', value: allowances, color: '#16a34a' },
                { name: 'Deductions', value: deductions, color: '#f97316' },
            ],
            total,
        };
    }, [payrollRows]);

    const salaryConic = useMemo(() => {
        let current = 0;
        const segments = salaryBreakdown.slices.map((slice) => {
            const start = current;
            const pct = (slice.value / salaryBreakdown.total) * 100;
            current += pct;
            return `${slice.color} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
        });
        return `conic-gradient(${segments.join(', ')})`;
    }, [salaryBreakdown]);

    const presentDays = attendanceLogs.filter((item) => String(item.status || '').toUpperCase() === 'PRESENT').length;
    const approvedLeaves = leaveLogs.filter((item) => String(item.status || '').toUpperCase() === 'APPROVED').length;

    const profile = user?.profile || {};
    const fullName = `${profile.firstName || ''} ${profile.surname || profile.lastName || ''}`.trim() || 'User';
    const initials = getInitials(profile.firstName, profile.surname, profile.lastName);

    const linePoints = createSvgPoints(attendanceTrend, 520, 210, 16);
    const leaveMax = Math.max(...leaveUsage.map((item) => item.value), 1);

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Workarea</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Subadmin control center with profile summary, analytics, and module management.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
                        <BadgeCheck className="h-4 w-4 text-emerald-600" />
                        Active Organization: {organization?.name || 'Not selected'}
                    </div>
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                            {initials}
                        </div>
                        <div>
                            <p className="text-lg font-semibold">{fullName}</p>
                            <p className="text-sm text-muted-foreground">{user?.email || 'No email'}</p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border bg-background p-3">
                            <p className="text-xs text-muted-foreground">Visible Team</p>
                            <p className="mt-1 text-xl font-semibold">{employeeRows.length}</p>
                        </div>
                        <div className="rounded-lg border bg-background p-3">
                            <p className="text-xs text-muted-foreground">Present Days</p>
                            <p className="mt-1 text-xl font-semibold">{presentDays}</p>
                        </div>
                        <div className="rounded-lg border bg-background p-3">
                            <p className="text-xs text-muted-foreground">Approved Leaves</p>
                            <p className="mt-1 text-xl font-semibold">{approvedLeaves}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <UserCircle2 className="h-4 w-4 text-primary" />
                        Profile Summary
                    </div>
                    <div className="space-y-2 text-sm">
                        <p className="flex items-center justify-between">
                            <span className="text-muted-foreground">Role</span>
                            <span className="font-medium">SubAdmin</span>
                        </p>
                        <p className="flex items-center justify-between">
                            <span className="text-muted-foreground">Department</span>
                            <span className="font-medium">{user?.professional?.currentDepartment || 'General'}</span>
                        </p>
                        <p className="flex items-center justify-between">
                            <span className="text-muted-foreground">Experience</span>
                            <span className="font-medium">{user?.professional?.totalExperienceYears || 0} yrs</span>
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-xl border bg-card p-4 shadow-sm xl:col-span-2">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-sm font-semibold">
                            <Activity className="h-4 w-4 text-primary" />
                            Attendance Graph (Last 7 Days)
                        </h2>
                        {loading && <span className="text-xs text-muted-foreground">Loading...</span>}
                    </div>
                    <div className="rounded-lg border bg-background p-3">
                        <svg viewBox="0 0 520 210" className="h-52 w-full">
                            <polyline fill="none" stroke="#94a3b8" strokeWidth="1" points="16,190 504,190" />
                            <polyline fill="none" stroke="#2563eb" strokeWidth="3" points={linePoints} />
                            {attendanceTrend.map((item, idx) => {
                                const x = 16 + (idx / Math.max(attendanceTrend.length - 1, 1)) * (520 - 32);
                                const y = 16 + (210 - 32) - ((Number(item.value || 0) / Math.max(...attendanceTrend.map((r) => r.value), 1)) * (210 - 32));
                                return <circle key={item.label} cx={x} cy={y} r="3.5" fill="#1d4ed8" />;
                            })}
                        </svg>
                        <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-muted-foreground">
                            {attendanceTrend.map((item) => <span key={item.label}>{item.label}</span>)}
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Leave Usage Chart
                    </div>
                    <div className="space-y-2">
                        {leaveUsage.map((item) => (
                            <div key={item.key}>
                                <div className="mb-1 flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{item.label}</span>
                                    <span className="font-medium">{item.value} days</span>
                                </div>
                                <div className="h-2 rounded bg-muted">
                                    <div
                                        className="h-2 rounded bg-emerald-500"
                                        style={{ width: `${Math.max((item.value / leaveMax) * 100, item.value > 0 ? 6 : 0)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-xl border bg-card p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Salary Breakdown Piechart
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-center">
                        <div className="relative h-44 w-44 rounded-full" style={{ background: salaryConic }}>
                            <div className="absolute inset-10 rounded-full bg-card" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        {salaryBreakdown.slices.map((slice) => (
                            <div key={slice.name} className="flex items-center justify-between rounded border bg-background p-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                                    <span>{slice.name}</span>
                                </div>
                                <span className="font-medium">
                                    {salaryBreakdown.estimated ? `${Math.round((slice.value / salaryBreakdown.total) * 100)}%` : formatCurrency(slice.value)}
                                </span>
                            </div>
                        ))}
                        {salaryBreakdown.estimated && (
                            <p className="text-xs text-muted-foreground">
                                Payroll access unavailable, showing estimated split.
                            </p>
                        )}
                        {!salaryBreakdown.estimated && payrollRows[0] && (
                            <p className="text-xs text-muted-foreground">
                                Latest cycle net payable: {formatCurrency(payrollRows[0].netPayable)}
                            </p>
                        )}
                        {payrollAccessDenied && (
                            <p className="text-xs text-amber-600">
                                Payroll endpoint is role-restricted for non-owner accounts.
                            </p>
                        )}
                    </div>
                </div>
            </section>

            <section>
                <h2 className="mb-3 text-sm font-semibold">Workarea Modules</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {WORK_AREAS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.key} className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-base font-semibold">{item.title}</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                                    </div>
                                    <div className="rounded-md border bg-background p-2">
                                        <Icon className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <Link to={item.path}>
                                        <Button variant="outline" className="w-full justify-between">
                                            Manage {item.title}
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default WorkAreaPage;
