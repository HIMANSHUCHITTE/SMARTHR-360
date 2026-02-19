import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { FileText, Upload, Filter, Download, Trash2, File, Loader2, Plus, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const DocumentsPage = () => {
    const { user } = useAuthStore();
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        type: 'OTHER',
        fileUrl: ''
    });

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const { data } = await api.get('/documents/me');
            setDocs(data);
        } catch (error) {
            console.error('Failed to fetch docs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        try {
            // Mock Upload
            const mockUrl = `https://fake-s3-bucket.com/${formData.title.replace(/\s/g, '_')}.pdf`;

            const payload = { ...formData, fileUrl: mockUrl };
            const { data } = await api.post('/documents', payload);

            setDocs([data, ...docs]);
            setIsUploading(false);
            setFormData({ title: '', type: 'OTHER', fileUrl: '' });
            alert('Document Uploaded Successfully!');
        } catch (error) {
            alert('Upload failed');
        }
    };

    const categories = ['PAYSLIP', 'CONTRACT', 'OFFER_LETTER', 'RELIEVING_LETTER', 'ID_PROOF', 'OTHER'];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Digital Vault</h1>
                    <p className="text-muted-foreground">Securely store and access your employment documents.</p>
                </div>
                <Button onClick={() => setIsUploading(!isUploading)}>
                    <Upload className="mr-2 h-4 w-4" /> Upload Document
                </Button>
            </div>

            {isUploading && (
                <div className="glass-card p-6 rounded-xl border border-primary/20 bg-primary/5">
                    <h3 className="font-semibold mb-4">Upload New Document</h3>
                    <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Document Title</Label>
                            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                {categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label>File (Mock Upload)</Label>
                            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                                <Plus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Click to select file (Simulated)</p>
                            </div>
                        </div>
                        <div className="col-span-2 flex justify-end mt-2">
                            <Button type="submit">Save to Vault</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {categories.map(cat => {
                    const catDocs = docs.filter(d => d.type === cat);
                    if (catDocs.length === 0 && !isUploading) return null;

                    return (
                        <div key={cat} className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
                            <div className="p-4 border-b bg-muted/40 flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2">
                                    {cat === 'PAYSLIP' ? <FileText className="h-4 w-4" /> : <File className="h-4 w-4" />}
                                    {cat.replace('_', ' ')}S
                                </h3>
                                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{catDocs.length}</span>
                            </div>
                            <div className="p-4 space-y-3">
                                {catDocs.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No documents.</p>
                                ) : (
                                    catDocs.map(doc => (
                                        <div key={doc._id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 rounded bg-primary/10 text-primary">
                                                    <Lock className="h-4 w-4" />
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-medium truncate">{doc.title}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
                {docs.length === 0 && !loading && !isUploading && (
                    <div className="col-span-full text-center p-12 text-muted-foreground">
                        Your vault is empty. Upload documents to keep them safe.
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentsPage;
