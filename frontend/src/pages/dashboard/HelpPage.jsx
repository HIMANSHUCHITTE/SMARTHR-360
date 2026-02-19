import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeHelp, LifeBuoy, ShieldCheck, Mail, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const HelpPage = () => {
    const cards = [
        {
            icon: <BadgeHelp className="h-5 w-5 text-primary" />,
            title: 'Getting Started',
            body: 'Account setup, OTP verification, and panel access steps for SuperAdmin, Owner/Admin, and User.',
        },
        {
            icon: <LifeBuoy className="h-5 w-5 text-accent" />,
            title: 'Support & Tickets',
            body: 'For operational issues, raise a support request from your panel and track status updates.',
        },
        {
            icon: <ShieldCheck className="h-5 w-5 text-green-600" />,
            title: 'Security Guidance',
            body: 'Password hygiene, session security, role permissions and audit-safe usage patterns.',
        },
        {
            icon: <FileText className="h-5 w-5 text-violet-600" />,
            title: 'Feature Docs',
            body: 'HRMS, network feed, paperless vault, reputation model and subscription plan behavior.',
        },
    ];

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Help Center</h1>
                <p className="text-sm text-muted-foreground">
                    Everything you need to use SMARTHR-360 efficiently.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {cards.map((card) => (
                    <article key={card.title} className="glass-card rounded-xl p-5">
                        <div className="mb-3">{card.icon}</div>
                        <h2 className="text-lg font-semibold">{card.title}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
                    </article>
                ))}
            </div>

            <div className="glass-card rounded-xl p-5">
                <h2 className="text-lg font-semibold">Need direct support?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Reach out with your account email and issue summary for faster response.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline">
                        <Mail className="mr-2 h-4 w-4" />
                        support@smarthr360.com
                    </Button>
                    <Link to="/auth/login">
                        <Button>Open Dashboard</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default HelpPage;
