import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { MessageSquare, Plus, ChevronLeft, Search, User, CornerDownRight, Loader2, Award, Pin, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ForumViewProps {
  session: any
  onNavigate: (view: string) => void
}

export const ForumView: React.FC<ForumViewProps> = ({ session, onNavigate }) => {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCourseId, setActiveCourseId] = useState('wd101')
  
  // Post states
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [submittingPost, setSubmittingPost] = useState(false)

  // Reply states
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
  const [replies, setReplies] = useState<Record<string, any[]>>({})
  const [newReplyContent, setNewReplyContent] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({})
  const [userRole, setUserRole] = useState<string>('student')

  useEffect(() => {
    supabase.from('profiles').select('role').eq('id', session.user.id).single()
      .then(({ data }) => { if (data) setUserRole(data.role) })
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [activeCourseId])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select('*, profiles(full_name, role)')
        .eq('course_id', activeCourseId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setPosts(data || [])
    } catch (e) {
      console.error('Error fetching posts:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchReplies = async (postId: string) => {
    setLoadingReplies(prev => ({ ...prev, [postId]: true }))
    try {
      const { data, error } = await supabase
        .from('forum_replies')
        .select('*, profiles(full_name, role)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setReplies(prev => ({ ...prev, [postId]: data || [] }))
    } catch (e) {
      console.error('Error fetching replies:', e)
    } finally {
      setLoadingReplies(prev => ({ ...prev, [postId]: false }))
    }
  }

  const togglePost = (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null)
    } else {
      setExpandedPostId(postId)
      if (!replies[postId]) {
        fetchReplies(postId)
      }
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent.trim()) return
    setSubmittingPost(true)
    try {
      const { error } = await supabase
        .from('forum_posts')
        .insert({
          course_id: activeCourseId,
          student_id: session.user.id,
          content: newPostContent
        })
      if (error) throw error
      setNewPostContent('')
      setShowNewPostModal(false)
      fetchPosts()
    } catch (e) {
      console.error('Error creating post:', e)
      alert('Failed to post message.')
    } finally {
      setSubmittingPost(false)
    }
  }

  const handleCreateReply = async (e: React.FormEvent, postId: string) => {
    e.preventDefault()
    if (!newReplyContent.trim()) return
    setSubmittingReply(true)
    try {
      const { error } = await supabase
        .from('forum_replies')
        .insert({
          post_id: postId,
          user_id: session.user.id,
          content: newReplyContent
        })
      if (error) throw error
      setNewReplyContent('')
      fetchReplies(postId)
    } catch (e) {
      console.error('Error replying:', e)
      alert('Failed to post reply.')
    } finally {
      setSubmittingReply(false)
    }
  }

  const handlePinPost = async (postId: string, currentPinned: boolean) => {
    try {
      await supabase.from('forum_posts').update({ is_pinned: !currentPinned }).eq('id', postId)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_pinned: !currentPinned } : p))
    } catch (e) { console.error(e) }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post? This cannot be undone.')) return
    try {
      await supabase.from('forum_posts').update({ is_deleted: true, deleted_by: session.user.id }).eq('id', postId)
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch (e) { console.error(e) }
  }

  const filteredPosts = posts
    .filter(p =>
      !p.is_deleted &&
      (p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.profiles?.full_name && p.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase())))
    )
    .sort((a, b) => {
      // Pinned posts float to top
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return 0
    })

  const renderRoleBadge = (role: string) => {
    if (role === 'admin' || role === 'teacher') {
      return <span className="badge badge-purple" style={{ fontSize: '0.6rem', padding: '2px 6px' }}><Award size={10} style={{ marginRight: '2px' }}/> Instructor</span>
    }
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', gap: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => onNavigate('dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={24} />
        </button>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} style={{ color: 'var(--color-blue)' }} /> Community Forum
          </h4>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Discuss and learn with peers</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewPostModal(true)} style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Plus size={16} /> New Post
        </button>
      </div>

      <div className="app-content" style={{ padding: '20px' }}>
        
        {/* Filters & Search */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            <button className="badge" style={{ padding: '8px 16px', border: activeCourseId === 'wd101' ? '1px solid var(--color-blue)' : '1px solid transparent', backgroundColor: activeCourseId === 'wd101' ? 'rgba(12, 74, 140, 0.1)' : 'var(--bg-secondary)', color: activeCourseId === 'wd101' ? 'var(--color-blue)' : 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setActiveCourseId('wd101')}>WD101 (HTML)</button>
            <button className="badge" style={{ padding: '8px 16px', border: activeCourseId === 'js' ? '1px solid var(--color-blue)' : '1px solid transparent', backgroundColor: activeCourseId === 'js' ? 'rgba(12, 74, 140, 0.1)' : 'var(--bg-secondary)', color: activeCourseId === 'js' ? 'var(--color-blue)' : 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setActiveCourseId('js')}>JavaScript</button>
            <button className="badge" style={{ padding: '8px 16px', border: activeCourseId === 'backend' ? '1px solid var(--color-blue)' : '1px solid transparent', backgroundColor: activeCourseId === 'backend' ? 'rgba(12, 74, 140, 0.1)' : 'var(--bg-secondary)', color: activeCourseId === 'backend' ? 'var(--color-blue)' : 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setActiveCourseId('backend')}>Python</button>
          </div>
          
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search discussions..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px', minHeight: '40px' }}
            />
          </div>
        </div>

        {/* Posts List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
            <MessageSquare size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 10px auto' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No discussions found for this course yet.</p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: '4px' }}>Be the first to start a conversation!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredPosts.map(post => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={post.id} 
                className="card" 
                style={{ padding: 0, overflow: 'hidden' }}
              >
                {/* Post Header / Content */}
                <div 
                  style={{ padding: '16px', cursor: 'pointer' }}
                  onClick={() => togglePost(post.id)}
                >
                  {/* Pinned indicator */}
                  {post.is_pinned && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 700, color: '#F59E0B', marginBottom: '8px' }}>
                      <Pin size={12} /> Pinned by Instructor
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                      <User size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{post.profiles?.full_name || 'Anonymous Student'}</span>
                        {renderRoleBadge(post.profiles?.role)}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>{new Date(post.created_at).toLocaleString()}</span>
                    </div>

                    {/* Moderator actions — only for teacher/admin */}
                    {(userRole === 'admin' || userRole === 'teacher') && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handlePinPost(post.id, post.is_pinned)}
                          title={post.is_pinned ? 'Unpin post' : 'Pin post'}
                          style={{ background: post.is_pinned ? 'rgba(245,158,11,0.15)' : 'none', border: 'none', color: post.is_pinned ? '#F59E0B' : 'var(--text-tertiary)', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                        >
                          <Pin size={14} />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          title="Delete post"
                          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {post.content}
                  </p>
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-blue)', fontWeight: 600 }}>
                    <MessageSquare size={14} /> 
                    {expandedPostId === post.id ? 'Hide Replies' : 'View Replies'}
                  </div>
                </div>

                {/* Replies Section */}
                <AnimatePresence>
                  {expandedPostId === post.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
                    >
                      <div style={{ padding: '16px' }}>
                        {loadingReplies[post.id] ? (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}><Loader2 className="animate-spin" size={16} /></div>
                        ) : replies[post.id]?.length === 0 ? (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', fontStyle: 'italic', marginBottom: '16px' }}>No replies yet.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                            {replies[post.id]?.map(reply => (
                              <div key={reply.id} style={{ display: 'flex', gap: '10px', marginLeft: '12px' }}>
                                <CornerDownRight size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: '4px' }} />
                                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '12px', flex: 1, border: '1px solid var(--border-color)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{reply.profiles?.full_name || 'Anonymous'}</span>
                                    {renderRoleBadge(reply.profiles?.role)}
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{new Date(reply.created_at).toLocaleString()}</span>
                                  </div>
                                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{reply.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Form */}
                        <form onSubmit={(e) => handleCreateReply(e, post.id)} style={{ display: 'flex', gap: '8px', marginLeft: '38px' }}>
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Write a reply..." 
                            value={newReplyContent}
                            onChange={(e) => setNewReplyContent(e.target.value)}
                            style={{ height: '36px', minHeight: '36px', fontSize: '0.8rem' }}
                            required
                          />
                          <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', height: '36px', minHeight: '36px' }} disabled={submittingReply}>
                            {submittingReply ? <Loader2 className="animate-spin" size={14} /> : 'Reply'}
                          </button>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* New Post Modal */}
      {showNewPostModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-primary)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Start a Discussion</h3>
            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Course Context</label>
                <select className="input-field" value={activeCourseId} disabled style={{ backgroundColor: 'var(--bg-secondary)', opacity: 0.8 }}>
                  <option value="wd101">WD101: Web Dev 101 - HTML</option>
                  <option value="js">JavaScript Essentials</option>
                  <option value="backend">Python Backend</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Your Message</label>
                <textarea 
                  className="input-field" 
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Ask a question, share code, or discuss a topic..."
                  required
                  style={{ minHeight: '120px', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewPostModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submittingPost}>
                  {submittingPost ? <Loader2 className="animate-spin" size={18} /> : 'Post to Forum'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  )
}
