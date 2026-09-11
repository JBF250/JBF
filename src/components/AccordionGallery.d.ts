import type { ReactNode } from 'react'

export interface AccordionGalleryItem {
  image?: string
  alt?: string
  label?: string
  link?: string
  /** Render an icon + optional subtitle instead of an image. */
  icon?: ReactNode
  subtitle?: string
  [key: string]: unknown
}

export interface AccordionGalleryProps {
  items?: AccordionGalleryItem[]
  defaultIndex?: number
  accentColor?: string
  overlayColor?: string
  textColor?: string
  height?: number
  gap?: number
  radius?: number
  expandRatio?: number
  orientation?: 'horizontal' | 'vertical'
  duration?: number
  ease?: string
  parallax?: number
  tilt?: number
  stagger?: number
  trigger?: 'hover' | 'click'
  showLabels?: boolean
  grayscale?: boolean
  className?: string
  onSelect?: (item: AccordionGalleryItem, index: number) => void
}

declare function AccordionGallery(props: AccordionGalleryProps): ReactNode

export default AccordionGallery