import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ThumbsUp, MessageCircle, Send, User, Loader2, Sparkles, Bell, ThumbsDown, UserPlus, UserCheck, Image, Video, Upload, FolderOpen } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const FeedPage = () => {
    const { user, panel } = useAuthStore();
    const [posts, setPosts] = useState([]);
    const [followingUserIds, setFollowingUserIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPost, setNewPost] = useState('');
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [attachmentType, setAttachmentType] = useState('IMAGE');
    const [attachments, setAttachments] = useState([]);
    const [commentInputs, setCommentInputs] = useState({});
    const [posting, setPosting] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

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

    const handleAddAttachment = () => {
        const url = String(attachmentUrl || '').trim();
        if (!url) return;
        setAttachments((prev) => [...prev, { type: attachmentType, url }]);
        setAttachmentUrl('');
    };

    const handlePickMedia = async (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        setUploadingMedia(true);
        try {
            const uploaded = [];
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                const { data } = await api.post('/network/upload-media', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                if (data?.url && data?.type) {
                    uploaded.push({ type: data.type, url: data.url });
                }
            }
            if (uploaded.length > 0) {
                setAttachments((prev) => [...prev, ...uploaded]);
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to upload media');
        } finally {
            setUploadingMedia(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handlePost = async (event) => {
        event.preventDefault();
        if (!newPost.trim() && attachments.length === 0) return;
        setPosting(true);
        try {
            const { data } = await api.post('/network/posts', {
                content: newPost.trim(),
                attachments,
            });
            setPosts((prev) => [data, ...prev]);
            setNewPost('');
            setAttachments([]);
            setAttachmentUrl('');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to post');
        } finally {
            setPosting(false);
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

    const myPosts = useMemo(
        () => posts.filter((post) => String(post?.authorId?._id || '') === String(user?.id || user?._id || '')),
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
                    <h1 className="mb-1 text-2xl font-bold">Content Upload</h1>
                    <p className="mb-3 text-sm text-muted-foreground">Yahan se sirf naya content upload karo. Niche aapka previous content history bhi dikhega.</p>
                    <form onSubmit={handlePost} className="space-y-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            onChange={handlePickMedia}
                        />
                        <input
                            ref={folderInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            onChange={handlePickMedia}
                            webkitdirectory="true"
                            directory=""
                        />
                        <textarea
                            className="min-h-[96px] w-full rounded-xl border bg-background p-3 text-sm outline-none"
                            placeholder="Share an update, hiring note, insight, or achievement..."
                            value={newPost}
                            onChange={(event) => setNewPost(event.target.value)}
                        />
                        <div className="grid gap-2 md:grid-cols-[1fr_140px_auto]">
                            <Input value={attachmentUrl} onChange={(event) => setAttachmentUrl(event.target.value)} placeholder="Attachment URL (image/video)" />
                            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={attachmentType} onChange={(e) => setAttachmentType(e.target.value)}>
                                <option value="IMAGE">Image</option>
                                <option value="VIDEO">Video</option>
                            </select>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={handleAddAttachment}>Add URL</Button>
                                <Button type="button" variant="outline" isLoading={uploadingMedia} disabled={uploadingMedia} onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Gallery
                                </Button>
                                <Button type="button" variant="outline" isLoading={uploadingMedia} disabled={uploadingMedia} onClick={() => folderInputRef.current?.click()}>
                                    <FolderOpen className="mr-2 h-4 w-4" />
                                    Folder
                                </Button>
                            </div>
                        </div>

                        {attachments.length > 0 && (
                            <div className="rounded-lg border bg-background/60 p-3 text-xs text-muted-foreground">
                                {attachments.map((item, idx) => (
                                    <div key={`${item.url}-${idx}`} className="mb-2 rounded-md border bg-background/70 p-2 last:mb-0">
                                        {item.type === 'IMAGE' ? (
                                            <img src={item.url} alt="attachment preview" className="mb-1 max-h-48 w-full rounded object-cover" />
                                        ) : (
                                            <video src={item.url} controls className="mb-1 max-h-56 w-full rounded" />
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span className="truncate">{item.type}: {item.url}</span>
                                            <button type="button" className="ml-2 text-red-500" onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Gallery/folder se image-video select karke direct feed me post kar sakte ho.</p>
                            <Button type="submit" isLoading={posting} disabled={posting || uploadingMedia || (!newPost.trim() && attachments.length === 0)}>
                                <Send className="mr-2 h-4 w-4" />
                                Publish
                            </Button>
                        </div>
                    </form>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : myPosts.length === 0 ? (
                        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">Aapka koi content abhi tak upload nahi hua.</div>
                    ) : (
                        myPosts.map((post) => {
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
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> Content Tips</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>Image/video ke saath post karo</li>
                        <li>Clear caption likho</li>
                        <li>Regular updates trust badhata hai</li>
                        <li>Achievements share karte raho</li>
                    </ul>
                </div>
                <div className="glass-card rounded-xl p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4 text-primary" /> History View</h3>
                    <p className="text-sm text-muted-foreground">
                        Is page par aap apna pehle upload kiya hua content, likes, comments aur engagement dekh sakte ho.
                    </p>
                </div>
            </aside>
        </div>
    );
};

export default FeedPage;
