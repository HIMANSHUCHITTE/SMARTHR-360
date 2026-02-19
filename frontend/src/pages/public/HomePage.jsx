import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Building2,
    Globe,
    FileSearch,
    ShieldCheck,
    Star,
    Bot,
    Layers,
    CheckCircle2,
    LifeBuoy,
    BadgeHelp,
    PhoneCall,
    Moon,
    Sun,
} from 'lucide-react';
import './HomePage.css';

const plans = [
    {
        id: 'FREE',
        title: 'Free',
        price: '$0/mo',
        subtitle: 'Launch with core workflows',
        features: ['Up to 5 employees', 'Profile + network', 'Basic HR records'],
    },
    {
        id: 'PRO',
        title: 'Pro',
        price: '$49/mo',
        subtitle: 'Automation for growth teams',
        features: ['Up to 50 employees', 'Payroll + recruitment', 'AI assistant + reports'],
        featured: true,
    },
    {
        id: 'ENTERPRISE',
        title: 'Enterprise',
        price: 'Custom',
        subtitle: 'Governance at scale',
        features: ['Unlimited seats', 'Advanced APIs', 'Dedicated support + security'],
    },
];

const featureBlocks = [
    {
        title: 'SuperAdmin Panel (Platform Governance)',
        points: [
            'Company approval/rejection and suspension controls',
            'Platform analytics: organizations, employees, sessions, API usage',
            'Read-only deep company monitoring: owner, jobs, subscription, login history',
            'Global audit log viewer, announcements, ticket monitoring, compliance checks',
        ],
    },
    {
        title: 'Owner/Admin Panel (Organization Control)',
        points: [
            'Company setup, employee onboarding, role and permission assignment',
            'Smart hiring dashboard with candidate comparison and skill match insights',
            'Auto org chart, performance heatmap, digital contract generation',
            'Employee digital vault: salary slips, letters, records, growth docs',
        ],
    },
    {
        title: 'User + Employee Unified Identity',
        points: [
            'Permanent base identity with profile, posts, network and career history',
            'Employee = User + organization access (attendance, leave, payroll view)',
            'Role switching: job join/leave without losing profile identity',
            'Paperless employment timeline and verified work history',
        ],
    },
];

const helpItems = [
    {
        title: 'Getting Started Help',
        text: 'Registration, OTP verification, panel access and first setup instructions for Owner/Admin/User.',
    },
    {
        title: 'Support Ticket Assistance',
        text: 'Raise issue with category and priority. SuperAdmin monitoring and status updates supported.',
    },
    {
        title: 'Security & Compliance Help',
        text: 'KYC status, suspicious login review, account protection and role-based access guidance.',
    },
];

const HomePage = () => {
    const [theme, setTheme] = useState(localStorage.getItem('ui-theme') || 'light');

    useEffect(() => {
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('ui-theme', theme);
    }, [theme]);

    return (
        <div className="home-container">
            <div className="home-theme-float">
                <button className="btn btn-outline home-theme-toggle" onClick={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
            </div>
            <section className="hero-section">
                <div className="hero-noise"></div>
                <div className="container">
                    <div className="home-theme-toggle-wrap">
                    <button className="btn btn-outline home-theme-toggle" onClick={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')}>
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>
                </div>
                <div className="hero-grid">
                    <div className="hero-content">
                        <span className="hero-badge">Identity + HRMS + Governance + AI</span>
                        <h1 className="hero-title">
                            SMARTHR-360
                            <span>Where Hiring, Work Identity and Company Control connect in one flow.</span>
                        </h1>
                        <p className="hero-subtitle">
                            A single platform for SuperAdmin governance, Owner operations, Employee productivity and User career identity.
                            Paperless records, social graph and enterprise workflows stay synchronized.
                        </p>
                        <div className="hero-cta">
                            <Link to="/auth/register?plan=FREE">
                                <button className="btn btn-primary">Create Workspace <ArrowRight size={16} /></button>
                            </Link>
                            <Link to="/auth/login">
                                <button className="btn btn-outline">Open Login</button>
                            </Link>
                        </div>
                    </div>

                    <div className="hero-stage">
                        <div className="hero-stage-card hero-stage-main">
                            <p className="hero-stage-kicker">Platform Pulse</p>
                            <h3>Everything in one intelligent dashboard</h3>
                            <div className="hero-stage-stats">
                                <div><span>Organizations</span><strong>128</strong></div>
                                <div><span>Active Users</span><strong>12.4k</strong></div>
                                <div><span>API Uptime</span><strong>99.9%</strong></div>
                            </div>
                        </div>
                        <div className="hero-stage-card hero-stage-float hero-stage-left">
                            <p>Owner</p>
                            <strong>Hiring + Payroll + Roles</strong>
                        </div>
                        <div className="hero-stage-card hero-stage-float hero-stage-right">
                            <p>User Identity</p>
                            <strong>Profile + Network + Career Timeline</strong>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section id="features" className="section section-soft">
            <div className="container">
                <div className="section-head">
                    <h2>Key Features Overview</h2>
                    <p>Every major block from your final blueprint is represented below.</p>
                </div>
                <div className="feature-grid">
                    <FeatureCard icon={<Building2 size={22} />} title="HRMS Core" text="Attendance, leave, payroll, recruitment, organization settings and role security." />
                    <FeatureCard icon={<Globe size={22} />} title="Professional Network" text="Profile, posts, connects, search, and identity continuity across organizations." />
                    <FeatureCard icon={<FileSearch size={22} />} title="Paperless Employment" text="Digital vault, verified work history, centralized timeline and no manual paperwork." />
                    <FeatureCard icon={<ShieldCheck size={22} />} title="Platform Governance" text="SuperAdmin analytics, compliance monitor, global logs, announcements and support." />
                    <FeatureCard icon={<Star size={22} />} title="Reputation Engine" text="Trust score based on skill verification, duration, completeness and activity signals." />
                    <FeatureCard icon={<Bot size={22} />} title="AI Engine" text="AI chat and hiring workflows for faster decisions and better operational productivity." />
                </div>
            </div>
        </section>

        <section className="section">
            <div className="container split">
                <div>
                    <h2>Reputation & Identity Model</h2>
                    <p>
                        User identity remains permanent. Employee access can be attached/removed by employment state,
                        while career profile, posts and history remain secure.
                    </p>
                    <ul className="check-list">
                        {[
                            'User: permanent professional identity',
                            'Employee: user + organization permissions',
                            'Smart role switching with employment status mapping',
                            'Reputation score maintained for both user and employee state',
                        ].map((item) => (
                            <li key={item}><CheckCircle2 size={16} /> {item}</li>
                        ))}
                    </ul>
                </div>
                <div className="score-card">
                    <div className="score-top">
                        <Star size={18} />
                        <span>Reputation Engine</span>
                    </div>
                    <p className="score-value">Skill + Work + Activity</p>
                    <p className="score-note">Trust is measurable and identity remains portable.</p>
                </div>
            </div>
        </section>

        <section className="section section-soft">
            <div className="container">
                <div className="section-head">
                    <h2>All Features Explained</h2>
                    <p>Detailed product modules as per your final structure.</p>
                </div>
                <div className="detail-grid">
                    {featureBlocks.map((block) => (
                        <article key={block.title} className="detail-card">
                            <h3>{block.title}</h3>
                            <ul>
                                {block.points.map((point) => <li key={point}>{point}</li>)}
                            </ul>
                        </article>
                    ))}
                </div>
            </div>
        </section>

        <section id="pricing" className="section section-soft">
            <div className="container">
                <div className="section-head">
                    <h2>Subscription Plans</h2>
                    <p>Choose plan and activate directly from registration.</p>
                </div>
                <div className="pricing-grid">
                    {plans.map((plan) => (
                        <div key={plan.id} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>
                            <h3>{plan.title}</h3>
                            <p className="price">{plan.price}</p>
                            <p className="subtitle">{plan.subtitle}</p>
                            <ul>
                                {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                            </ul>
                            <Link to={`/auth/register?plan=${plan.id}`}>
                                <button className="btn btn-block">{plan.featured ? 'Activate Pro' : 'Activate Plan'}</button>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        <section id="about" className="section">
            <div className="container about-card">
                <h2>About SMARTHR-360</h2>
                <p>
                    SMARTHR-360 is designed as a multi-tenant workforce platform with three separated control layers:
                    SuperAdmin (platform), Owner/Admin (organization), and User (identity + employee experience).
                    Security includes JWT + refresh token, OTP verification, RBAC, activity logs, and protected routing.
                </p>
                <div className="about-cta">
                    <Link to="/auth/register?plan=FREE"><button className="btn btn-primary">Create Workspace</button></Link>
                    <Link to="/auth/login"><button className="btn btn-outline">Open Login</button></Link>
                </div>
            </div>
        </section>

        <section className="section section-soft">
            <div className="container">
                <div className="section-head">
                    <h2>Help & Support</h2>
                    <p>Support-oriented modules and guidance blocks included.</p>
                </div>
                <div className="help-grid">
                    <HelpCard icon={<BadgeHelp size={18} />} title={helpItems[0].title} text={helpItems[0].text} />
                    <HelpCard icon={<LifeBuoy size={18} />} title={helpItems[1].title} text={helpItems[1].text} />
                    <HelpCard icon={<PhoneCall size={18} />} title={helpItems[2].title} text={helpItems[2].text} />
                </div>
                <div className="help-cta">
                    <Link to="/auth/login"><button className="btn btn-outline">Open Help via Login</button></Link>
                    <Link to="/auth/register?plan=FREE"><button className="btn btn-primary">Start with Guided Setup</button></Link>
                </div>
            </div>
        </section>
        </div>
    );
};

const FeatureCard = ({ icon, title, text }) => (
    <article className="feature-card">
        <div className="icon-wrap">{icon}</div>
        <h3>{title}</h3>
        <p>{text}</p>
    </article>
);

const HelpCard = ({ icon, title, text }) => (
    <article className="help-card">
        <div className="help-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{text}</p>
    </article>
);

export default HomePage;
