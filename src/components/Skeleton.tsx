import './Skeleton.css'

// 通用骨架屏占位，自带 Shimmer 微光
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer ${className}`} />
}

// 博客帖子卡片骨架占位：先展示内容结构，加载完成后原位渐显真实内容
export function BlogCardSkeleton() {
  return (
    <div className="bg-theme-card rounded-2xl overflow-hidden p-5 border border-theme-color">
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-5 w-2/3 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md flex-shrink-0" />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-10 rounded-md" />
          <Skeleton className="h-4 w-10 rounded-md" />
        </div>
      </div>
    </div>
  )
}