export interface GainianPost {
  id: string
  title: {
    zh: string
    en: string
    ja: string
  }
  content: {
    zh: string
    en: string
    ja: string
  }
  date: string
}

const modules = import.meta.glob('/src/data/gainian-posts/*.json', { eager: true })

const gainianPosts: GainianPost[] = Object.values(modules).map((module) => {
  return (module as { default: GainianPost }).default
})

gainianPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

export default gainianPosts