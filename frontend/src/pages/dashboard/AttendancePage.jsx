import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Clock, CheckCircle2, XCircle, MapPin, Calendar, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const AttendancePage = () => {
    const { user } = useAuthStore();
    const [logs, setLogs] = useState([]);
    const [todayLog, setTodayLog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        fetchAttendance();
        return () => clearInterval(timer);
    }, []);

    const fetchAttendance = async () => {
        try {
            const { data } = await api.get('/attendance/me');
            setLogs(data);

            // Check if clocked in today
            const today = new Date().toDateString();
            const found = data.find(l => new Date(l.date).toDateString() === today);
            setTodayLog(found);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleClockIn = async () => {
        try {
            const { data } = await api.post('/attendance/clock-in');
            setTodayLog(data);
            setLogs([data, ...logs]);
        } catch (error) {
            alert(error.response?.data?.message || 'Clock In Failed');
        }
    };

    const handleClockOut = async () => {
        try {
            const { data } = await api.post('/attendance/clock-out');
            setTodayLog(data);
            // Update logs list
            setLogs(logs.map(l => l._id === data._id ? data : l));
        } catch (error) {
            alert(error.response?.data?.message || 'Clock Out Failed');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
                    <p className="text-muted-foreground">{currentTime.toDateString()}</p>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-mono font-bold tracking-widest">
                        {currentTime.toLocaleTimeString()}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Clock In/Out Section */}
                <div className="rounded-xl border bg-card text-card-foreground shadow p-8 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="relative">
                        <div className={`h-40 w-40 rounded-full flex items-center justify-center border-4 ${todayLog?.clockIn && !todayLog?.clockOut ? 'border-green-500 bg-green-500/10' : 'border-muted bg-muted/20'}`}>
                            <Clock className={`h-16 w-16 ${todayLog?.clockIn && !todayLog?.clockOut ? 'text-green-600' : 'text-muted-foreground'}`} />
                        </div>
                        {todayLog?.clockIn && !todayLog?.clockOut && (
                            <span className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                        )}
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold mb-2">
                            {todayLog?.clockIn && !todayLog?.clockOut ? 'You are Clocked In' : 'Ready to Work?'}
                        </h3>
                        <p className="text-muted-foreground">
                            {todayLog?.clockIn
                                ? `Started at ${new Date(todayLog.clockIn).toLocaleTimeString()}`
                                : 'Mark your attendance for today'}
                        </p>
                    </div>

                    <div className="flex gap-4 w-full px-8">
                        {!todayLog ? (
                            <Button size="lg" className="w-full h-12 text-lg" onClick={handleClockIn}>
                                Clock In
                            </Button>
                        ) : !todayLog.clockOut ? (
                            <Button size="lg" variant="destructive" className="w-full h-12 text-lg" onClick={handleClockOut}>
                                Clock Out
                            </Button>
                        ) : (
                            <Button size="lg" variant="outline" className="w-full h-12 text-lg" disabled>
                                Shift Completed <CheckCircle2 className="ml-2 h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-xl border bg-card text-card-foreground shadow flex flex-col">
                    <div className="p-6 border-b">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Recent Activity
                        </h3>
                    </div>
                    <div className="flex-1 overflow-auto max-h-[400px] p-6 pt-0">
                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                        ) : logs.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No attendance records found.</p>
                        ) : (
                            <div className="space-y-4 pt-6">
                                {logs.map(log => (
                                    <div key={log._id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2 w-2 rounded-full ${log.status === 'PRESENT' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <div>
                                                <p className="font-medium">{new Date(log.date).toDateString()}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {log.duration > 0 ? `${Math.floor(log.duration / 60)}h ${log.duration % 60}m` : 'In Progress'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right text-sm">
                                            <div className="text-green-600 font-medium">In: {new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            {log.clockOut && (
                                                <div className="text-red-600 font-medium">Out: {new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendancePage;
