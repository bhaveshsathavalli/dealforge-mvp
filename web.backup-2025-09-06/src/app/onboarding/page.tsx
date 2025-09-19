'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Onboarding() {
const router = useRouter()
const [step, setStep] = useState(1)
const [product, setProduct] = useState('')
const [category, setCategory] = useState('')
const [competitors, setCompetitors] = useState([{ name: '', url: '', aliases: '' }])
const [helpUrl, setHelpUrl] = useState('')
const [sources, setSources] = useState({ google: true, reddit: true, g2: false })

return (
<div className="max-w-2xl mx-auto p-6 space-y-6">
<h1 className="text-2xl font-semibold">Onboarding</h1>
{step === 1 && (
<div className="space-y-3">
<label className="block">Product name
<input className="w-full border rounded px-3 py-2" value={product} onChange={e=>setProduct(e.target.value)} placeholder="HelpdeskCo"/>
</label>
<label className="block">Category
<input className="w-full border rounded px-3 py-2" value={category} onChange={e=>setCategory(e.target.value)} placeholder="Customer support software"/>
</label>
<div className="flex gap-2">
<button className="px-3 py-2 bg-black text-white rounded" onClick={()=>setStep(2)}>Next</button>
</div>
</div>
)}

{step === 2 && (
<div className="space-y-3">
<p className="text-sm text-gray-600">Add up to 5 competitors.</p>
{competitors.map((c, i) => (
<div key={i} className="grid grid-cols-3 gap-2">
<input className="border rounded px-2 py-2" placeholder="Name" value={c.name} onChange={e=>{
const arr=[...competitors]; arr[i].name=e.target.value; setCompetitors(arr)
}}/>
<input className="border rounded px-2 py-2" placeholder="Website (optional)" value={c.url} onChange={e=>{
const arr=[...competitors]; arr[i].url=e.target.value; setCompetitors(arr)
}}/>
<input className="border rounded px-2 py-2" placeholder="Aliases (comma‑sep)" value={c.aliases} onChange={e=>{
const arr=[...competitors]; arr[i].aliases=e.target.value; setCompetitors(arr)
}}/>
</div>
))}
<button className="text-sm underline" onClick={()=>setCompetitors([...competitors, {name:'', url:'', aliases:''}])}>+ Add another</button>
<div className="flex gap-2">
<button className="px-3 py-2 border rounded" onClick={()=>setStep(1)}>Back</button>
<button className="px-3 py-2 bg-black text-white rounded" onClick={()=>setStep(3)}>Next</button>
</div>
</div>
)}

{step === 3 && (
<div className="space-y-3">
<label className="block">Help‑center URL (optional)
<input className="w-full border rounded px-3 py-2" value={helpUrl} onChange={e=>setHelpUrl(e.target.value)} placeholder="https://docs.yourbrand.com"/>
</label>
<div className="flex gap-2">
<button className="px-3 py-2 border rounded" onClick={()=>setStep(2)}>Back</button>
<button className="px-3 py-2 bg-black text-white rounded" onClick={()=>setStep(4)}>Next</button>
</div>
</div>
)}

{step === 4 && (
<div className="space-y-3">
<p className="text-sm">Pick sources</p>
<label className="block"><input type="checkbox" checked={sources.google} onChange={e=>setSources({...sources, google:e.target.checked})}/> Google</label>
<label className="block"><input type="checkbox" checked={sources.reddit} onChange={e=>setSources({...sources, reddit:e.target.checked})}/> Reddit</label>
<label className="block"><input type="checkbox" checked={sources.g2} onChange={e=>setSources({...sources, g2:e.target.checked})}/> G2</label>
<div className="flex gap-2">
<button className="px-3 py-2 border rounded" onClick={()=>setStep(3)}>Back</button>
<button className="px-3 py-2 bg-black text-white rounded" onClick={()=>router.replace('/overview')}>Start first analysis</button>
</div>
</div>
)}
</div>
)
}