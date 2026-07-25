import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Image, X, ArrowLeft, ThumbsUp, MessageCircle, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { supabase, type CommunityPost } from '@/lib/supabase'
import gainianPosts from '@/lib/gainianPosts'
import { useNavigate, useSearchParams } from 'react-router-dom'

export type CommunityPostWithAuthor = CommunityPost & {
  author?: { display_name: string; avatar_url: string | null; username: string } | null
}

const getPostLikes = (postId: string): number => {
  const likes = JSON.parse(localStorage.getItem('blog_likes') || '{}')
  return likes[postId] || 0
}

const getPostComments = (postId: string): number => {
  const comments = JSON.parse(localStorage.getItem('blog_comments') || '{}')
  return comments[postId]?.length || 0
}

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'community' | 'gainian'>(
    (searchParams.get('tab') as 'community' | 'gainian') || 'community'
  )
  const [posts, setPosts] = useState<CommunityPostWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [postStats, setPostStats] = useState<Record<string, { likes: number; comments: number }>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null)
  const [newPost, setNewPost] = useState({ title: '', content: '' })
  const [uploadingImages, setUploadingImages] = useState(false)
  const [postImages, setPostImages] = useState<string[]>([])
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const navigate = useNavigate()

  useEffect(() => {
    setSearchParams({ tab: activeTab })
  }, [activeTab, setSearchParams])

  useEffect(() => {
    if (activeTab === 'community') {
      fetchCommunityPosts()
    }
  }, [activeTab])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  const loadPostStats = (postIds: string[]) => {
    const stats: Record<string, { likes: number; comments: number }> = {}
    postIds.forEach(id => {
      stats[id] = {
        likes: getPostLikes(id),
        comments: getPostComments(id)
      }
    })
    setPostStats(stats)
  }

  const fetchCommunityPosts = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      const postsWithAuthor = data.map(post => ({
        ...post,
        author: {
          display_name: post.author_display_name || '匿名用户',
          avatar_url: post.author_avatar_url || null,
          username: post.author_display_name || 'anonymous'
        }
      }))
      
      setPosts(postsWithAuthor)
      loadPostStats(postsWithAuthor.map(p => p.id))
    }
    setIsLoading(false)
  }

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim() || !user) return
    
    setUploadingImages(true)
    
    try {
      await supabase.from('community_posts').insert({
        user_id: user.id,
        title: newPost.title,
        content: newPost.content,
        images: postImages,
        author_display_name: user.display_name || user.username,
        author_avatar_url: user.avatar_url
      })
      
      setShowCreateModal(false)
      setNewPost({ title: '', content: '' })
      setPostImages([])
      fetchCommunityPosts()
    } catch (error) {
      console.error('Failed to create post:', error)
    } finally {
      setUploadingImages(false)
    }
  }

  const handleUpdatePost = async () => {
    if (!editingPost || !newPost.title.trim() || !newPost.content.trim() || !user) return
    
    try {
      await supabase
        .from('community_posts')
        .update({
          title: newPost.title,
          content: newPost.content,
          images: postImages,
          author_display_name: user.display_name || user.username,
          author_avatar_url: user.avatar_url
        })
        .eq('id', editingPost.id)
      
      setShowEditModal(false)
      setEditingPost(null)
      setNewPost({ title: '', content: '' })
      setPostImages([])
      fetchCommunityPosts()
    } catch (error) {
      console.error('Failed to update post:', error)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm(t('blog.confirmDelete'))) return
    
    try {
      await supabase.from('community_posts').delete().eq('id', postId)
      fetchCommunityPosts()
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !user) return
    
    setUploadingImages(true)
    
    try {
      for (const file of Array.from(files)) {
        const fileName = `blog/${user.id}_${Date.now()}_${file.name}`
        const { error } = await supabase.storage
          .from('blog-images')
          .upload(fileName, file)
        
        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('blog-images')
            .getPublicUrl(fileName)
          
          setPostImages(prev => [...prev, publicUrl])
        }
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
    } finally {
      setUploadingImages(false)
    }
  }

  const openEditModal = (post: CommunityPost) => {
    setEditingPost(post)
    setNewPost({ title: post.title, content: post.content })
    setPostImages(post.images || [])
    setShowEditModal(true)
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('detail.back')}
            </button>
            <div className="text-center">
              <h1 className="font-display font-bold text-4xl text-theme-primary mb-2">{t('blog.title')}</h1>
              <p className="text-theme-secondary">{t('blog.community')} / {t('blog.gainian')}</p>
            </div>
            <div className="w-32" />
          </div>

          <div className="flex gap-8">
            <div className="hidden lg:block w-56 flex-shrink-0">
              <div className="sticky top-24 space-y-2">
                <button
                  onClick={() => setActiveTab('community')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${
                    activeTab === 'community'
                      ? 'bg-gradient-primary btn-primary-text'
                      : 'bg-theme-card/50 backdrop-blur-sm border border-theme-color text-theme-secondary hover:text-theme-primary hover:bg-theme-card/70'
                  }`}
                >
                  {t('blog.community')}
                </button>
                <button
                  onClick={() => setActiveTab('gainian')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${
                    activeTab === 'gainian'
                      ? 'bg-gradient-primary btn-primary-text'
                      : 'bg-theme-card/50 backdrop-blur-sm border border-theme-color text-theme-secondary hover:text-theme-primary hover:bg-theme-card/70'
                  }`}
                >
                  {t('blog.gainian')}
                </button>
              </div>
            </div>

            <div className="lg:hidden flex gap-4 mb-8">
              <button
                onClick={() => setActiveTab('community')}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'community'
                    ? 'bg-gradient-primary btn-primary-text'
                    : 'bg-theme-tertiary text-theme-secondary hover:text-theme-primary'
                }`}
              >
                {t('blog.community')}
              </button>
              <button
                onClick={() => setActiveTab('gainian')}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'gainian'
                    ? 'bg-gradient-primary btn-primary-text'
                    : 'bg-theme-tertiary text-theme-secondary hover:text-theme-primary'
                }`}
              >
                {t('blog.gainian')}
              </button>
            </div>

            <div className="flex-1">
              {activeTab === 'community' && (
                <>
                  <div className="flex justify-end mb-6">
                    <button
                      onClick={() => {
                        if (!user) {
                          navigate('/login')
                          return
                        }
                        setShowCreateModal(true)
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-primary btn-primary-text font-medium rounded-xl hover:opacity-90 transition-opacity"
                    >
                      <Plus className="w-5 h-5" />
                      {t('blog.newPost')}
                    </button>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-theme-secondary">{t('blog.contentPlaceholder')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => navigate(`/blog/community/${post.id}`)}
                          className="bg-theme-card/50 backdrop-blur-sm rounded-2xl p-5 border border-theme-color cursor-pointer hover:border-primary/50 hover:bg-theme-card/70 transition-all group"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-display font-bold text-lg text-theme-primary group-hover:text-primary transition-colors">
                              {post.title}
                            </h3>
                            {post.user_id === user?.id && (
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => openEditModal(post)}
                                  className="p-1.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-hover rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  className="p-1.5 text-theme-secondary hover:text-red-400 hover:bg-theme-hover rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-theme-secondary text-sm">
                              <span className="flex items-center gap-2">
                                {post.author?.avatar_url ? (
                                  <img
                                    src={post.author.avatar_url}
                                    alt={post.author.display_name}
                                    className="w-5 h-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center text-white text-[10px] font-bold">
                                    {(post.author?.display_name || post.author?.username || '?').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                {post.author?.display_name || post.author?.username || '匿名用户'}
                              </span>
                              <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-4 text-theme-secondary text-sm">
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="w-4 h-4" />
                                {postStats[post.id]?.likes || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-4 h-4" />
                                {postStats[post.id]?.comments || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'gainian' && (
                <div className="space-y-4">
                  {gainianPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => navigate(`/blog/gainian/${post.id}`)}
                      className="bg-theme-card/50 backdrop-blur-sm rounded-2xl p-5 border border-theme-color cursor-pointer hover:border-primary/50 hover:bg-theme-card/70 transition-all group"
                    >
                      <h3 className="font-display font-bold text-lg text-theme-primary mb-3 group-hover:text-primary transition-colors">
                        {post.title[lang]}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-theme-secondary text-sm">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            概念1
                          </span>
                          <span>{post.date}</span>
                        </div>
                        <div className="flex items-center gap-4 text-theme-secondary text-sm">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            {getPostLikes(post.id)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {getPostComments(post.id)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-theme-color">
            <div className="flex justify-between items-center p-6 border-b border-theme-color">
              <h2 className="font-display font-bold text-xl text-theme-primary">{t('blog.newPost')}</h2>
              <button
                onClick={() => { setShowCreateModal(false); setNewPost({ title: '', content: '' }); setPostImages([]) }}
                className="text-theme-secondary hover:text-theme-primary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder={t('blog.titlePlaceholder')}
                className="w-full px-4 py-3 bg-theme-tertiary border border-theme-color rounded-xl text-theme-primary placeholder-theme-secondary focus:outline-none focus:border-primary"
              />
              <textarea
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                placeholder={t('blog.contentPlaceholder')}
                rows={8}
                className="w-full px-4 py-3 bg-theme-tertiary border border-theme-color rounded-xl text-theme-primary placeholder-theme-secondary focus:outline-none focus:border-primary resize-none"
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-theme-tertiary text-theme-primary rounded-lg cursor-pointer hover:bg-theme-hover transition-colors">
                  <Image className="w-5 h-5" />
                  <span>上传图片</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {postImages.length > 0 && (
                  <span className="text-theme-secondary text-sm">{postImages.length} 张图片</span>
                )}
              </div>
              {postImages.map((img, index) => (
                <div key={index} className="relative inline-block mr-2">
                  <img src={img} alt={`Uploaded ${index}`} className="w-20 h-20 object-cover rounded-lg" />
                  <button
                    onClick={() => setPostImages(prev => prev.filter((_, i) => i !== index))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-theme-color flex justify-end gap-4">
              <button
                onClick={() => { setShowCreateModal(false); setNewPost({ title: '', content: '' }); setPostImages([]) }}
                className="px-6 py-3 bg-theme-tertiary text-theme-primary rounded-xl hover:bg-theme-hover transition-colors"
              >
                {t('blog.cancel')}
              </button>
              <button
                onClick={handleCreatePost}
                disabled={uploadingImages || !newPost.title.trim() || !newPost.content.trim()}
                className="px-6 py-3 bg-gradient-primary btn-primary-text rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {uploadingImages ? t('blog.submit') + '...' : t('blog.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingPost && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-theme-color">
            <div className="flex justify-between items-center p-6 border-b border-theme-color">
              <h2 className="font-display font-bold text-xl text-theme-primary">{t('blog.edit')}</h2>
              <button
                onClick={() => { setShowEditModal(false); setEditingPost(null); setNewPost({ title: '', content: '' }); setPostImages([]) }}
                className="text-theme-secondary hover:text-theme-primary transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder={t('blog.titlePlaceholder')}
                className="w-full px-4 py-3 bg-theme-tertiary border border-theme-color rounded-xl text-theme-primary placeholder-theme-secondary focus:outline-none focus:border-primary"
              />
              <textarea
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                placeholder={t('blog.contentPlaceholder')}
                rows={8}
                className="w-full px-4 py-3 bg-theme-tertiary border border-theme-color rounded-xl text-theme-primary placeholder-theme-secondary focus:outline-none focus:border-primary resize-none"
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-theme-tertiary text-theme-primary rounded-lg cursor-pointer hover:bg-theme-hover transition-colors">
                  <Image className="w-5 h-5" />
                  <span>上传图片</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {postImages.map((img, index) => (
                <div key={index} className="relative inline-block mr-2">
                  <img src={img} alt={`Uploaded ${index}`} className="w-20 h-20 object-cover rounded-lg" />
                  <button
                    onClick={() => setPostImages(prev => prev.filter((_, i) => i !== index))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-theme-color flex justify-end gap-4">
              <button
                onClick={() => { setShowEditModal(false); setEditingPost(null); setNewPost({ title: '', content: '' }); setPostImages([]) }}
                className="px-6 py-3 bg-theme-tertiary text-theme-primary rounded-xl hover:bg-theme-hover transition-colors"
              >
                {t('blog.cancel')}
              </button>
              <button
                onClick={handleUpdatePost}
                disabled={!newPost.title.trim() || !newPost.content.trim()}
                className="px-6 py-3 bg-gradient-primary btn-primary-text rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {t('blog.update')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}