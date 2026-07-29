import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ThumbsUp, MessageCircle, Send, ArrowUp, Trash2 } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import { useAuth } from '@/context/AuthContext'
import { supabase, type CommunityPost } from '@/lib/supabase'
import gainianPosts, { type GainianPost } from '@/lib/gainianPosts'
import { useResetScroll } from '@/hooks/useResetScroll'

interface Comment {
  id: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  content: string
  created_at: string
}

export default function BlogDetail() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  const { lang, t } = useI18n()
  const { user } = useAuth()
  const currentLang = lang
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  useResetScroll()

  const [post, setPost] = useState<CommunityPost | null>(null)
  const [gainianPost, setGainianPost] = useState<GainianPost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const loadPost = async () => {
      setIsLoading(true)
      
      if (type === 'community' && id) {
        const { data, error } = await supabase
          .from('community_posts')
          .select('*')
          .eq('id', id)
          .single()
        
        if (!error && data) {
          const authorData = {
            display_name: data.author_display_name || '匿名用户',
            avatar_url: data.author_avatar_url || null,
            username: data.author_display_name || 'anonymous'
          }
          
          setPost({
            ...data,
            author: authorData
          } as any)
        }
      } else if (type === 'gainian' && id) {
        const found = gainianPosts.find(p => p.id === id)
        if (found) {
          setGainianPost(found)
        }
      }
      
      loadLikesAndComments()
      setIsLoading(false)
    }
    
    loadPost()
  }, [type, id])

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 当用户状态变化时，重新加载点赞状态
  useEffect(() => {
    if (id) {
      loadLikesAndComments()
    }
  }, [user, id])

  const loadLikesAndComments = async () => {
    const postId = id || ''
    const postType = type || 'community'
    
    try {
      // 查询点赞数
      const { count, error: countError } = await supabase
        .from('community_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('post_type', postType)
      
      if (!countError) {
        setLikes(count || 0)
      }
      
      // 查询当前用户是否已点赞
      if (user) {
        const { data: likeData } = await supabase
          .from('community_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('post_type', postType)
          .eq('user_id', user.id)
          .maybeSingle()
        
        setIsLiked(!!likeData)
      }
      
      // 查询评论
      const { data: commentsData, error: commentsError } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('post_type', postType)
        .order('created_at', { ascending: false })
      
      if (!commentsError && commentsData) {
        const postComments: Comment[] = commentsData.map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          username: c.display_name || c.username || '用户',
          display_name: c.display_name || c.username || '用户',
          avatar_url: c.avatar_url || null,
          content: c.content,
          created_at: c.created_at
        }))
        setComments(postComments)
      }
    } catch (error) {
      console.error('Failed to load likes and comments:', error)
    }
  }

  const handleLike = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    
    const postId = id || ''
    const postType = type || 'community'
    
    try {
      if (isLiked) {
        // 取消点赞
        const { error } = await supabase
          .from('community_likes')
          .delete()
          .eq('post_id', postId)
          .eq('post_type', postType)
          .eq('user_id', user.id)
        
        if (!error) {
          setLikes(likes - 1)
          setIsLiked(false)
        }
      } else {
        // 添加点赞
        const { error } = await supabase
          .from('community_likes')
          .insert({
            post_id: postId,
            post_type: postType,
            user_id: user.id
          })
        
        if (!error) {
          setLikes(likes + 1)
          setIsLiked(true)
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return

    if (!confirm(t('blog.confirmDeleteComment'))) return

    try {
      const { error } = await supabase
        .from('community_comments')
        .delete()
        .eq('id', commentId)
        .eq('post_type', type || 'community')
        .eq('user_id', user.id)
      
      if (!error) {
        setComments(comments.filter(c => c.id !== commentId))
      }
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return
    
    const postId = id || ''
    const postType = type || 'community'
    
    try {
      const { data, error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          post_type: postType,
          user_id: user.id,
          content: newComment.trim(),
          display_name: user.display_name || user.username,
          avatar_url: user.avatar_url || null
        })
        .select()
      
      if (!error && data) {
        const newCommentData: Comment = {
          id: data[0].id,
          user_id: data[0].user_id,
          username: data[0].display_name || '用户',
          display_name: data[0].display_name || '用户',
          avatar_url: data[0].avatar_url || null,
          content: data[0].content,
          created_at: data[0].created_at
        }
        setComments([newCommentData, ...comments])
        setNewComment('')
      }
    } catch (error) {
      console.error('Failed to submit comment:', error)
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToComments = () => {
    commentInputRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const postTitle = type === 'community' 
    ? post?.title 
    : gainianPost?.title[currentLang as keyof typeof gainianPost.title]
  
  const postDate = type === 'community'
    ? post ? new Date(post.created_at).toLocaleDateString() : ''
    : gainianPost?.date || ''
  
  const postAuthor = type === 'community'
    ? (post ? (post as any).author?.display_name || (post as any).author?.username || '匿名用户' : '')
    : '概念1'

  const renderPostContent = () => {
    if (type === 'community' && post) {
      const parts = post.content.split(/\[图片调用指令：(\S+)\]/g)
      const images = post.images || []
      const usedImages = new Set<string>()

      const contentElements = parts.map((part, index) => {
        if (index % 2 === 1) {
          const matched = images.find(img => img.includes(part))
          const imageUrl = matched || `/pictures/${part}`
          if (matched) usedImages.add(matched)
          return (
            <img
              key={index}
              src={imageUrl}
              alt={part}
              className="max-w-full h-auto rounded-xl my-6"
            />
          )
        }
        return (
          <p key={index} className="text-theme-secondary leading-relaxed mb-4 text-base">
            {part}
          </p>
        )
      })

      // 渲染未在内容中引用的上传图片
      const extraImages = images
        .filter(img => !usedImages.has(img))
        .map((img, index) => (
          <img
            key={`extra-${index}`}
            src={img}
            alt={`Image ${index + 1}`}
            className="max-w-full h-auto rounded-xl my-6"
          />
        ))

      return [...contentElements, ...extraImages]
    }

    if (type === 'gainian' && gainianPost) {
      const content = gainianPost.content[currentLang as keyof typeof gainianPost.content]
      const parts = content.split(/\[图片调用指令：(\S+)\]/g)

      return parts.map((part, index) => {
        if (index % 2 === 1) {
          return (
            <img
              key={index}
              src={`/pictures/${part}`}
              alt={part}
              className="max-w-full h-auto rounded-xl my-6"
            />
          )
        }
        return part.split('\n').map((paragraph, pIndex) => {
          if (!paragraph.trim()) return null
          return (
            <p key={`${index}-${pIndex}`} className="text-theme-secondary leading-relaxed mb-4 text-base">
              {paragraph}
            </p>
          )
        })
      })
    }

    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primary">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!post && !gainianPost) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primary">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-theme-primary mb-4">404</h1>
          <p className="text-theme-secondary mb-6">帖子未找到</p>
          <button
            onClick={() => navigate('/blog')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary btn-primary-text font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            返回博客
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <button
        onClick={() => navigate(`/blog?tab=${type}`)}
        className="fixed top-20 left-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-theme-card/80 backdrop-blur-md border border-theme-color rounded-xl text-theme-secondary hover:text-theme-primary hover:bg-theme-card transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">返回</span>
      </button>

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-3 bg-theme-card/80 backdrop-blur-md border border-theme-color rounded-full text-theme-secondary hover:text-theme-primary hover:bg-theme-card transition-all"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      <article className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-theme-primary mb-6">
              {postTitle}
            </h1>
            <div className="flex items-center justify-center gap-6 text-theme-secondary text-sm">
              <span className="flex items-center gap-2">
                {type === 'community' && (post as any)?.author?.avatar_url ? (
                  <img
                    src={(post as any).author.avatar_url}
                    alt={postAuthor}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center text-white text-[10px] font-bold">
                    {postAuthor.charAt(0).toUpperCase()}
                  </div>
                )}
                {postAuthor}
              </span>
              <span>{postDate}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 mb-12 pb-8 border-b border-theme-color">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
                isLiked
                  ? 'bg-gradient-primary btn-primary-text'
                  : 'bg-theme-card text-theme-secondary hover:text-theme-primary border border-theme-color'
              }`}
            >
              <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="font-medium">{likes}</span>
            </button>
            <button
              onClick={scrollToComments}
              className="flex items-center gap-2 px-6 py-3 bg-theme-card text-theme-secondary hover:text-theme-primary border border-theme-color rounded-xl transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">{comments.length}</span>
            </button>
          </div>

          <div className="prose max-w-none mb-16">
            {renderPostContent()}
          </div>

          <div className="border-t border-theme-color pt-12">
            <h2 className="font-display font-bold text-2xl text-theme-primary mb-8">
              评论 ({comments.length})
            </h2>

            {user ? (
              <div className="bg-theme-card/50 backdrop-blur-sm rounded-2xl p-4 border border-theme-color mb-8">
                <textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="写下你的评论..."
                  rows={3}
                  className="w-full px-4 py-3 bg-theme-tertiary border border-theme-color rounded-xl text-theme-primary placeholder-theme-secondary focus:outline-none focus:border-primary resize-none mb-3"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-primary btn-primary-text rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm font-medium"
                  >
                    <Send className="w-4 h-4" />
                    发布评论
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-theme-card/50 backdrop-blur-sm rounded-2xl p-6 border border-theme-color mb-8 text-center">
                <p className="text-theme-secondary mb-4">登录后可以发表评论</p>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 bg-gradient-primary btn-primary-text rounded-xl hover:opacity-90 transition-opacity text-sm font-medium"
                >
                  去登录
                </button>
              </div>
            )}

            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-theme-secondary/30 mx-auto mb-4" />
                  <p className="text-theme-secondary">暂无评论，快来发表第一条评论吧</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-theme-card/30 rounded-2xl p-5 border border-theme-color"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {comment.avatar_url ? (
                        <img
                          src={comment.avatar_url}
                          alt={comment.display_name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold">
                          {comment.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-theme-primary font-medium text-sm">
                          {comment.display_name}
                        </p>
                        <p className="text-theme-secondary text-xs">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      </div>
                      {user && user.id === comment.user_id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1.5 text-theme-secondary hover:text-red-400 hover:bg-theme-hover rounded-lg transition-colors"
                          title={t('blog.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-theme-secondary leading-relaxed text-sm pl-12">
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
