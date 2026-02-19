import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ThumbsUp, MessageCircle, Send, User, Loader2, Sparkles, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const FeedPage = () => {
    const { user, panel } = useAuthStore();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPost, setNewPost] = useState('');
    const [commentInputs, setCommentInputs] = useState({});
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/network/feed');
            setPosts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePost = async (event) => {
        event.preventDefault();
        if (!newPost.trim()) return;
        setPosting(true);
        try {
            const { data } = await api.post('/network/posts', { content: newPost.trim() });
            setPosts((prev) => [data, ...prev]);
            setNewPost('');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to post');
        } finally {
            setPosting(false);
        }
    };

    const toggleLike = async (postId) => {
        try {
            const { data } = await api.post(`/network/posts/${postId}/like`);
            setPosts((prev) => prev.map((post) => (
                post._id === postId
                    ? {
                        ...post,
                        likes: data.liked
                            ? [...post.likes, user.id]
                            : post.likes.filter((id) => id !== user.id),
                    }
                    : post
            )));
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to like');
        }
    };

    const addComment = async (postId) => {
        const text = String(commentInputs[postId] || '').trim();
        if (!text) return;
        try {
            const { data } = await api.post(`/network/posts/${postId}/comment`, { text });
            setPosts((prev) => prev.map((post) => (
                post._id === postId ? { ...post, comments: [...post.comments, data] } : post
            )));
            setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to comment');
        }
    };

    const fullName = useMemo(
        () => `${user?.profile?.firstName || ''} ${user?.profile?.surname || user?.profile?.lastName || ''}`.trim() || 'User',
        [user]
    );

    return (
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
            <aside className="hidden space-y-4 lg:block">
                <div className="glass-card rounded-xl p-4">
                    <div className="mb-3 h-20 rounded-lg bg-gradient-to-r from-primary/40 via-accent/35 to-pink-400/35"></div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-semibold">{fullName}</p>
                            <p className="text-xs text-muted-foreground">{user?.professional?.headline || 'Complete your headline'}</p>
                        </div>
                    </div>
                    <div className="mt-4 space-y-2 text-xs">
                        <p className="flex items-center justify-between"><span className="text-muted-foreground">Panel</span><span className="font-semibold">{panel || 'USER'}</span></p>
                        <p className="flex items-center justify-between"><span className="text-muted-foreground">Profile Score</span><span className="font-semibold">{user?.professional?.profileScore || 0}</span></p>
                    </div>
                    <Link to={panel === 'OWNER' ? '/owner/profile' : panel === 'SUBADMIN' ? '/subadmin/profile' : panel === 'EMPLOYEE' ? '/subadmin/profile' : panel === 'SUPERADMIN' ? '/superadmin/settings' : '/user/profile'}>
                        <Button variant="outline" className="mt-4 w-full">Open Profile</Button>
                    </Link>
                </div>
            </aside>

            <main className="space-y-5">
                <div className="glass-card rounded-xl p-4">
                    <h1 className="mb-3 text-2xl font-bold">Social Feed</h1>
                    <form onSubmit={handlePost} className="space-y-3">
                        <textarea
                            className="min-h-[96px] w-full rounded-xl border bg-background p-3 text-sm outline-none"
                            placeholder="Share an update, hiring note, insight, or achievement..."
                            value={newPost}
                            onChange={(event) => setNewPost(event.target.value)}
                        />
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Your post appears in network feed instantly.</p>
                            <Button type="submit" isLoading={posting} disabled={posting || !newPost.trim()}>
                                <Send className="mr-2 h-4 w-4" />
                                Publish
                            </Button>
                        </div>
                    </form>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : posts.length === 0 ? (
                        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">No posts yet. Start the conversation.</div>
                    ) : (
                        posts.map((post) => {
                            const postAuthor = post.authorId?.profile || {};
                            const postName = `${postAuthor.firstName || ''} ${postAuthor.surname || postAuthor.lastName || ''}`.trim() || 'Member';
                            const headline = post.authorId?.professional?.headline || 'Professional Member';
                            const isLiked = post.likes?.includes(user.id);

                            return (
                                <article key={post._id} className="glass-card rounded-xl p-4">
                                    <div className="mb-3 flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{postName}</p>
                                            <p className="text-xs text-muted-foreground">{headline}</p>
                                            <p className="text-[11px] text-muted-foreground">{new Date(post.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <p className="whitespace-pre-wrap text-sm leading-6">{post.content}</p>

                                    <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                                        <span>{post.likes?.length || 0} likes</span>
                                        <span>{post.comments?.length || 0} comments</span>
                                    </div>

                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <Button variant="outline" onClick={() => toggleLike(post._id)} className={isLiked ? 'border-primary text-primary' : ''}>
                                            <ThumbsUp className="mr-2 h-4 w-4" />
                                            {isLiked ? 'Liked' : 'Like'}
                                        </Button>
                                        <Button variant="outline">
                                            <MessageCircle className="mr-2 h-4 w-4" />
                                            Comment
                                        </Button>
                                    </div>

                                    <div className="mt-3 flex gap-2">
                                        <Input
                                            placeholder="Write a comment..."
                                            value={commentInputs[post._id] || ''}
                                            onChange={(event) => setCommentInputs((prev) => ({ ...prev, [post._id]: event.target.value }))}
                                        />
                                        <Button onClick={() => addComment(post._id)}>Send</Button>
                                    </div>

                                    {post.comments?.length > 0 && (
                                        <div className="mt-3 space-y-2 rounded-lg bg-muted/40 p-3">
                                            {post.comments.slice(-3).map((comment, idx) => {
                                                const cp = comment.userId?.profile || {};
                                                const cname = `${cp.firstName || ''} ${cp.surname || cp.lastName || ''}`.trim() || 'User';
                                                return (
                                                    <div key={`${post._id}-c-${idx}`} className="text-sm">
                                                        <span className="font-semibold">{cname}</span>
                                                        <span className="text-muted-foreground"> {comment.text}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </article>
                            );
                        })
                    )}
                </div>
            </main>

            <aside className="hidden space-y-4 xl:block">
                <div className="glass-card rounded-xl p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> Trending Topics</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>#Hiring2026</li>
                        <li>#PaperlessHR</li>
                        <li>#VerifiedProfile</li>
                        <li>#WorkReputation</li>
                    </ul>
                </div>
                <div className="glass-card rounded-xl p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4 text-primary" /> Feed Tips</h3>
                    <p className="text-sm text-muted-foreground">
                        Post updates, mention role changes, and maintain clean professional history for better reputation score.
                    </p>
                </div>
            </aside>
        </div>
    );
};

export default FeedPage;
