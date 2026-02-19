import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ThumbsUp, MessageCircle, User, Loader2, Sparkles, Bell, ThumbsDown, UserPlus, UserCheck, Image, Video } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const FeedBrowsePage = () => {
    const { user, panel } = useAuthStore();
    const [posts, setPosts] = useState([]);
    const [followingUserIds, setFollowingUserIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [commentInputs, setCommentInputs] = useState({});

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/network/feed');
            setPosts(Array.isArray(data) ? data : data.posts || []);
            setFollowingUserIds(Array.isArray(data?.followingUserIds) ? data.followingUserIds : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleLike = async (postId) => {
        try {
            const { data } = await api.post(`/network/posts/${postId}/like`);
            setPosts((prev) => prev.map((post) => {
                if (post._id !== postId) return post;
                const likes = data.liked
                    ? [...(post.likes || []), user.id]
                    : (post.likes || []).filter((id) => String(id) !== String(user.id));
                const dislikes = (post.dislikes || []).filter((id) => String(id) !== String(user.id));
                return { ...post, likes, dislikes };
            }));
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to like');
        }
    };

    const toggleDislike = async (postId) => {
        try {
            const { data } = await api.post(`/network/posts/${postId}/dislike`);
            setPosts((prev) => prev.map((post) => {
                if (post._id !== postId) return post;
                const dislikes = data.disliked
                    ? [...(post.dislikes || []), user.id]
                    : (post.dislikes || []).filter((id) => String(id) !== String(user.id));
                const likes = (post.likes || []).filter((id) => String(id) !== String(user.id));
                return { ...post, likes, dislikes };
            }));
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to dislike');
        }
    };

    const addComment = async (postId) => {
        const text = String(commentInputs[postId] || '').trim();
        if (!text) return;
        try {
            const { data } = await api.post(`/network/posts/${postId}/comment`, { text });
            setPosts((prev) => prev.map((post) => (
                post._id === postId ? { ...post, comments: [...(post.comments || []), data] } : post
            )));
            setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to comment');
        }
    };

    const toggleFollow = async (authorId) => {
        try {
            const { data } = await api.post(`/network/follow/${authorId}`);
            setFollowingUserIds((prev) => {
                if (data.following) return [...new Set([...prev, authorId])];
                return prev.filter((id) => String(id) !== String(authorId));
            });
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to follow');
        }
    };

    const fullName = useMemo(
        () => `${user?.profile?.firstName || ''} ${user?.profile?.surname || user?.profile?.lastName || ''}`.trim() || 'User',
        [user]
    );

    const othersPosts = useMemo(
        () => posts.filter((post) => String(post?.authorId?._id || '') !== String(user?.id || user?._id || '')),
        [posts, user]
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
                    <Link to={panel === 'OWNER' ? '/owner/content-upload' : panel === 'SUBADMIN' ? '/subadmin/content-upload' : panel === 'EMPLOYEE' ? '/subadmin/content-upload' : '/user/content-upload'}>
                        <Button variant="outline" className="mt-4 w-full">Open Content Upload</Button>
                    </Link>
                </div>
            </aside>

            <main className="space-y-5">
                <div className="glass-card rounded-xl p-4">
                    <h1 className="mb-1 text-2xl font-bold">Feed</h1>
                    <p className="text-sm text-muted-foreground">Dusre members ki posts browse karein, like/comment karein aur follow karein.</p>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : othersPosts.length === 0 ? (
                        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">No feed posts from other users yet.</div>
                    ) : (
                        othersPosts.map((post) => {
                            const postAuthor = post.authorId?.profile || {};
                            const postName = `${postAuthor.firstName || ''} ${postAuthor.surname || postAuthor.lastName || ''}`.trim() || 'Member';
                            const headline = post.authorId?.professional?.headline || 'Professional Member';
                            const authorId = post.authorId?._id;
                            const isLiked = (post.likes || []).some((id) => String(id) === String(user.id));
                            const isDisliked = (post.dislikes || []).some((id) => String(id) === String(user.id));
                            const isFollowing = followingUserIds.some((id) => String(id) === String(authorId));

                            return (
                                <article key={post._id} className="glass-card rounded-xl p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
                                                <User className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">{postName}</p>
                                                <p className="text-xs text-muted-foreground">{headline}</p>
                                                <p className="text-[11px] text-muted-foreground">{new Date(post.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {authorId && String(authorId) !== String(user.id) && (
                                            <Button variant="outline" size="sm" onClick={() => toggleFollow(authorId)}>
                                                {isFollowing ? <UserCheck className="mr-1 h-4 w-4" /> : <UserPlus className="mr-1 h-4 w-4" />}
                                                {isFollowing ? 'Following' : 'Follow'}
                                            </Button>
                                        )}
                                    </div>

                                    {post.content && <p className="whitespace-pre-wrap text-sm leading-6">{post.content}</p>}

                                    {Array.isArray(post.attachments) && post.attachments.length > 0 && (
                                        <div className="mt-3 grid gap-2">
                                            {post.attachments.map((item, idx) => (
                                                <div key={`${post._id}-att-${idx}`} className="rounded-lg border bg-background/70 p-3 text-xs">
                                                    {item.type === 'IMAGE' ? (
                                                        <img src={item.url} alt="post attachment" className="mb-2 max-h-96 w-full rounded object-cover" />
                                                    ) : (
                                                        <video src={item.url} controls className="mb-2 max-h-96 w-full rounded" />
                                                    )}
                                                    <div className="flex items-center gap-1.5">
                                                        {item.type === 'IMAGE' ? <Image className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                                                        <a href={item.url} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">{item.url}</a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                                        <span>{post.likes?.length || 0} likes</span>
                                        <span>{post.dislikes?.length || 0} dislikes</span>
                                        <span>{post.comments?.length || 0} comments</span>
                                    </div>

                                    <div className="mt-2 grid grid-cols-3 gap-2">
                                        <Button variant="outline" onClick={() => toggleLike(post._id)} className={isLiked ? 'border-primary text-primary' : ''}>
                                            <ThumbsUp className="mr-2 h-4 w-4" />
                                            Like
                                        </Button>
                                        <Button variant="outline" onClick={() => toggleDislike(post._id)} className={isDisliked ? 'border-primary text-primary' : ''}>
                                            <ThumbsDown className="mr-2 h-4 w-4" />
                                            Dislike
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
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> Feed Highlights</h3>
                    <p className="text-sm text-muted-foreground">Is section me sirf dusre members ka content show hota hai.</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4 text-primary" /> Quick Tip</h3>
                    <p className="text-sm text-muted-foreground">
                        Aapka content upload section alag hai. Yahan discovery aur engagement focus hai.
                    </p>
                </div>
            </aside>
        </div>
    );
};

export default FeedBrowsePage;
