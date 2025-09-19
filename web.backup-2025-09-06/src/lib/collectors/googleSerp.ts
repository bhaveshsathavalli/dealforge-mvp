export type SerpResult = { title: string; link: string; snippet?: string }

export async function fetchGoogleResults(query: string, num = 5): Promise<SerpResult[]> {
const key = process.env.SERP_API_KEY
if (!key) throw new Error('Missing SERP_API_KEY')
const url = new URL('https://serpapi.com/search.json')
url.searchParams.set('engine', 'google')
url.searchParams.set('q', query)
url.searchParams.set('num', String(num))
url.searchParams.set('api_key', key)

const res = await fetch(url.toString())
if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`)
const data = await res.json()
const items = (data.organic_results ?? []) as any[]
return items.map(i => ({ title: i.title, link: i.link, snippet: i.snippet }))
}